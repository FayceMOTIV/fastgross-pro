/**
 * Cloud Function: dailyAutoPilot
 * Cron quotidien qui execute le pipeline de prospection pour chaque organisation
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as cheerio from 'cheerio'

const getDb = () => getFirestore()

// Configuration
const WARMUP_LIMITS = { 1: 5, 4: 15, 8: 30, 15: 60, 22: 100, 31: null }

function getEffectiveLimit(account) {
  const day = account.warmupDay || 1
  let limit = 5
  for (const [startDay, dayLimit] of Object.entries(WARMUP_LIMITS)) {
    if (day >= parseInt(startDay)) {
      limit = dayLimit !== null ? dayLimit : account.dailyLimit
    }
  }
  return Math.min(limit, account.dailyLimit || 500)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

// Domaines de plateformes et patterns d'emails invalides
const INVALID_EMAIL_DOMAINS = [
  'example.com', 'domain.com', 'domain.fr', 'test.com', 'doe.com',
  'treatwell.fr', 'planity.com', 'doctolib.fr', 'pagesjaunes.fr',
  'sortlist.fr', 'sortlist.com', 'threebestrated.fr', 'threebestrated.com',
  'tripadvisor.fr', 'tripadvisor.com', 'yelp.fr', 'yelp.com',
  'facebook.com', 'google.com', 'twitter.com', 'instagram.com',
  'wavy.co', 'resend.dev', 'acme.com'
]
const INVALID_EMAIL_PREFIXES = [
  'noreply', 'no-reply', 'unsubscribe', 'postmaster', 'mailer-daemon',
  'test', 'user', 'nom', 'email', 'your', 'name', 'john', 'jane.doe',
  'support', 'abuse', 'spam', 'root', 'webmaster'
]

function isValidProspectEmail(email, companyDomain = '') {
  if (!email || typeof email !== 'string') return false
  const lower = email.toLowerCase().trim()
  const domain = lower.split('@')[1] || ''
  const prefix = lower.split('@')[0] || ''
  if (INVALID_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return false
  if (INVALID_EMAIL_PREFIXES.some(p => prefix === p || prefix.startsWith(p + '.'))) return false
  if (/^u003e/.test(prefix)) return false
  // Rejeter prefixe trop court (< 4 chars) — souvent des placeholders
  if (prefix.length < 4) return false
  // Rejeter si le domaine email == domaine entreprise (auto-email du site)
  if (companyDomain && domain === companyDomain.toLowerCase().replace(/^www\./, '')) return false
  return true
}

function getBestEmail(emails, companyDomain = '') {
  if (!emails || emails.length === 0) return null
  const valid = emails.filter(e => isValidProspectEmail(e, companyDomain))
  if (valid.length === 0) return null
  // Prefer personal emails over generic
  const personal = valid.find(e => {
    const prefix = e.split('@')[0]
    return !['contact', 'info', 'hello', 'admin', 'commercial'].includes(prefix)
  })
  return personal || valid[0]
}

/**
 * Filtrer les prospects deja contactes (par email OU par domain)
 */
async function filterAlreadyContacted(orgId, prospects) {
  const db = getDb()
  const filtered = []

  for (const prospect of prospects) {
    // Verifier par domain
    const byDomain = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('domain', '==', prospect.domain)
      .where('contactedAt', '!=', null)
      .limit(1)
      .get()

    if (!byDomain.empty) continue

    // Verifier par email si disponible
    if (prospect.emails?.length > 0) {
      const byEmail = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .where('emails', 'array-contains-any', prospect.emails)
        .where('contactedAt', '!=', null)
        .limit(1)
        .get()

      if (!byEmail.empty) continue
    }

    filtered.push(prospect)
  }

  return filtered
}

/**
 * Reinitialiser les compteurs quotidiens de tous les comptes
 */
async function resetDailyCounters() {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const accountsSnapshot = await db
      .collection('organizations')
      .doc(orgDoc.id)
      .collection('emailAccounts')
      .get()

    const batch = db.batch()
    accountsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { sentToday: 0 })
    })
    await batch.commit()
  }

  console.log('Daily counters reset')
}

/**
 * Incrementer le jour de warmup pour tous les comptes
 */
async function incrementWarmupDays() {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const accountsSnapshot = await db
      .collection('organizations')
      .doc(orgDoc.id)
      .collection('emailAccounts')
      .where('status', '==', 'warming_up')
      .get()

    const batch = db.batch()
    accountsSnapshot.docs.forEach(doc => {
      const account = doc.data()
      const newDay = (account.warmupDay || 1) + 1
      const updates = {
        warmupDay: newDay,
        ...(newDay > 30 && { status: 'active' })
      }
      batch.update(doc.ref, updates)
    })
    await batch.commit()
  }

  console.log('Warmup days incremented')
}

/**
 * Obtenir les organisations avec autopilot actif
 */
async function getActiveAutopilotOrgs() {
  const db = getDb()
  const configsSnapshot = await db
    .collectionGroup('autopilotConfig')
    .where('enabled', '==', true)
    .get()

  const orgs = []
  for (const doc of configsSnapshot.docs) {
    const orgId = doc.ref.parent.parent.id
    orgs.push({
      id: orgId,
      config: doc.data()
    })
  }

  return orgs
}

/**
 * Rechercher des prospects via Serper.dev
 */
async function searchProspects(config, orgId) {
  const db = getDb()
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    console.log(`Org ${orgId}: SERPER_API_KEY manquante, skip recherche`)
    return []
  }

  const results = []
  const seenDomains = new Set()

  // Support multi-niches OU fallback sur keywords plat
  const niches = config.niches || []
  const searchQueries = []

  if (niches.length > 0) {
    // Mode multi-niches: chaque niche a ses propres keywords + location
    for (const niche of niches) {
      const nicheKeywords = niche.keywords || []
      const nicheLocation = niche.location || config.location || 'France'
      for (const kw of nicheKeywords.slice(0, 2)) {
        searchQueries.push({ query: `${kw} ${nicheLocation} contact`, niche: niche.name || kw })
      }
    }
  } else {
    // Fallback: mode plat (backward compat)
    const keywords = config.keywords || []
    const location = config.location || 'France'
    for (const keyword of keywords.slice(0, 3)) {
      searchQueries.push({ query: `${keyword} ${location} contact`, niche: keyword })
    }
  }

  for (const { query, niche } of searchQueries) {
    console.log(`[${orgId}] Serper search [${niche}]: "${query}"`)

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          gl: 'fr',
          hl: 'fr',
          num: 10
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.warn('Serper API error:', data.message || response.statusText)
        continue
      }

      for (const item of (data.organic || [])) {
        try {
          const url = new URL(item.link)
          const domain = url.hostname.replace(/^www\./, '')

          // Dedup intra-run
          if (seenDomains.has(domain)) continue
          seenDomains.add(domain)

          // Verifier doublon en base
          const existing = await db
            .collection('organizations')
            .doc(orgId)
            .collection('prospects')
            .where('domain', '==', domain)
            .limit(1)
            .get()

          if (!existing.empty) continue

          results.push({
            name: item.title?.replace(/\s*[-|].*/g, '').substring(0, 100) || domain,
            url: item.link,
            domain,
            snippet: item.snippet || '',
            niche,
            source: 'serper',
            status: 'found',
            foundAt: FieldValue.serverTimestamp()
          })
        } catch (e) {
          console.warn('Invalid URL:', item.link)
        }
      }

      await sleep(500)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  return results
}

/**
 * Sauvegarder les prospects trouves
 */
async function saveProspects(orgId, prospects) {
  const db = getDb()
  const batch = db.batch()
  const saved = []

  for (const prospect of prospects) {
    const ref = db.collection('organizations').doc(orgId).collection('prospects').doc()
    batch.set(ref, {
      ...prospect,
      emails: [],
      contactName: '',
      phone: '',
      score: 0,
      scoreDetails: {},
      generatedEmail: { subject: '', body: '' },
      sentVia: null,
      orgId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    saved.push(ref.id)
  }

  await batch.commit()
  return saved
}

/**
 * Extraire les emails d'un site web
 */
async function extractEmails(url) {
  const baseUrl = new URL(url).origin
  const pages = [
    url,
    `${baseUrl}/contact`,
    `${baseUrl}/contactez-nous`,
    `${baseUrl}/a-propos`,
    `${baseUrl}/mentions-legales`
  ]

  const emails = new Set()
  let contactName = ''
  let phone = ''

  for (const pageUrl of pages) {
    try {
      const response = await fetch(pageUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)' }
      })

      if (!response.ok) continue

      const html = await response.text()

      // Extraire emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const found = html.match(emailRegex) || []

      const junkPatterns = [
        'noreply', 'no-reply', 'unsubscribe', 'example.com', 'wix', 'wordpress', '.png', '.jpg',
        'sentry', 'webpack', 'cloudflare', 'placeholder', 'test@', 'user@', 'nom@domain',
        'email@domain', 'your@email', 'name@domain', 'john@doe', 'jane.doe@',
        'treatwell.fr', 'planity.com', 'doctolib.fr', 'pagesjaunes.fr',
        'sortlist.', 'threebestrated.', 'tripadvisor.', 'yelp.',
        'facebook.com', 'google.com', 'twitter.com', 'instagram.com'
      ]
      found.forEach(e => {
        const lower = e.toLowerCase()
        if (!junkPatterns.some(p => lower.includes(p))) {
          emails.add(lower)
        }
      })

      // Extraire telephone
      if (!phone) {
        const phoneMatch = html.match(/(?:(?:\+33|0033|0)\s*[1-9])(?:[\s.-]*\d{2}){4}/)
        if (phoneMatch) phone = phoneMatch[0].replace(/[\s.-]/g, '')
      }

      // Extraire nom contact
      if (!contactName) {
        const nameMatch = html.match(/(?:fondateur|gerant|directeur)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
        if (nameMatch) contactName = nameMatch[1]
      }

      await sleep(1000)
    } catch (e) {
      continue
    }
  }

  // Prioriser les emails
  const emailList = [...emails].sort((a, b) => {
    const scoreA = a.includes('.') ? 100 : (a.startsWith('contact') ? 60 : 30)
    const scoreB = b.includes('.') ? 100 : (b.startsWith('contact') ? 60 : 30)
    return scoreB - scoreA
  })

  return { emails: emailList, contactName, phone }
}

/**
 * Scorer un prospect
 */
async function scoreProspect(prospect) {
  let score = 0
  const details = {}

  // A un site (+10)
  if (prospect.url) {
    score += 10
    details.hasWebsite = true
  }

  // A un email (+20-30)
  if (prospect.emails?.length > 0) {
    const hasPersonal = prospect.emails.some(e => {
      const prefix = e.split('@')[0]
      return !['contact', 'info', 'hello', 'admin'].includes(prefix)
    })
    score += hasPersonal ? 30 : 20
    details.emailType = hasPersonal ? 'personal' : 'generic'
  } else {
    return { score: 0, details, status: 'no_email' }
  }

  // Analyser le site
  try {
    const response = await fetch(prospect.url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await response.text()

    // Pas de video (+25)
    if (!/<video|youtube\.com\/embed|vimeo\.com/i.test(html)) {
      score += 25
      details.hasVideo = false
    }

    // Site vieillot (+15)
    if (/dreamweaver|frontpage|<table.*bgcolor|<font/i.test(html)) {
      score += 15
      details.siteModernity = 'old'
    }

    // Pas YouTube (+10)
    if (!/youtube\.com\/(channel|c|@)/i.test(html)) {
      score += 10
      details.hasYouTube = false
    }

    // A Instagram (+5)
    if (/instagram\.com\//i.test(html)) {
      score += 5
      details.hasInstagram = true
    }
  } catch (e) {
    // Pas grave si on ne peut pas analyser
  }

  // Nom contact (+5)
  if (prospect.contactName) {
    score += 5
    details.hasContactName = true
  }

  // Generer le texte pour l'email
  const issues = []
  if (details.hasVideo === false) issues.push('pas de video sur votre site')
  if (details.hasYouTube === false) issues.push('pas de chaine YouTube')
  if (details.siteModernity === 'old') issues.push('un site qui meriterait une modernisation')
  details.scoreVideoText = issues.length > 0 ? issues.join(' et ') : 'peu de contenu video engageant'

  return { score: Math.min(score, 100), details, status: 'scored' }
}

/**
 * Generer un email personnalise
 */
function generateEmail(prospect, config, account) {
  const template = config.emailTemplate || {
    subject: '{entreprise} -- une idee pour booster votre visibilite',
    body: `Bonjour {prenom},

Je m'appelle {sender_name} et je realise des videos courtes pour les professionnels du secteur {secteur} a {ville}.

En visitant votre site, j'ai remarque que vous n'aviez {score_video}. La video est aujourd'hui le format le plus engageant : +80% de visibilite en ligne en moyenne.

Je pourrais realiser pour {entreprise} :
- Une video de presentation courte (30-60s)
- Des stories/reels pour vos reseaux sociaux
- Un temoignage client filme

Seriez-vous disponible pour un appel de 15 minutes ?

Bonne journee,
{sender_name}`
  }

  // Extraire prenom — fix: "Bonjour" sans virgule quand prenom vide
  const greeting = prospect.contactName?.trim()
    ? `Bonjour ${prospect.contactName.trim().split(' ')[0].charAt(0).toUpperCase() + prospect.contactName.trim().split(' ')[0].slice(1).toLowerCase()}`
    : 'Bonjour'

  // Nom entreprise
  const entreprise = prospect.name || prospect.domain?.replace(/\.[a-z]+$/i, '').replace(/-/g, ' ') || 'votre entreprise'

  const variables = {
    '{entreprise}': entreprise,
    '{secteur}': prospect.niche || config.sector || 'votre secteur',
    '{ville}': config.location || 'votre region',
    '{score_video}': prospect.scoreDetails?.scoreVideoText || 'peu de contenu video',
    '{sender_name}': account?.displayName || config.senderName || 'Face Media',
    '{sender_email}': account?.email || ''
  }

  let subject = template.subject
  let body = template.body

  // Remplacer le greeting complet "Bonjour {prenom}," par le greeting propre
  body = body.replace(/Bonjour\s*\{prenom\}\s*,?/g, greeting)

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  }

  return { to: prospect.emails[0], subject, body }
}

/**
 * Executer le pipeline pour une organisation
 */
async function runPipeline(orgId, config) {
  const db = getDb()
  const stats = { found: 0, scraped: 0, scored: 0, ready: 0, sent: 0, errors: [] }

  try {
    // PHASE 1: Rechercher des prospects + deduplication
    console.log(`[${orgId}] Phase 1: Recherche de prospects...`)
    const found = await searchProspects(config, orgId)
    if (found.length > 0) {
      const deduped = await filterAlreadyContacted(orgId, found)
      console.log(`[${orgId}] Dedup: ${found.length} trouves → ${deduped.length} nouveaux`)
      if (deduped.length > 0) {
        await saveProspects(orgId, deduped)
      }
      stats.found = deduped.length
    }

    // PHASE 2: Extraire les emails (max 30)
    console.log(`[${orgId}] Phase 2: Extraction emails...`)
    const toScrape = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('status', '==', 'found')
      .limit(30)
      .get()

    for (const doc of toScrape.docs) {
      const prospect = doc.data()
      try {
        const { emails, contactName, phone } = await extractEmails(prospect.url)
        await doc.ref.update({
          emails,
          contactName,
          phone,
          status: emails.length > 0 ? 'scraped' : 'no_email',
          scrapedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        })
        if (emails.length > 0) stats.scraped++
        await sleep(2000)
      } catch (e) {
        console.error(`Error scraping ${prospect.url}:`, e.message)
      }
    }

    // PHASE 3: Scorer (max 50)
    console.log(`[${orgId}] Phase 3: Scoring...`)
    const toScore = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('status', '==', 'scraped')
      .limit(50)
      .get()

    for (const doc of toScore.docs) {
      const prospect = { id: doc.id, ...doc.data() }
      const { score, details, status } = await scoreProspect(prospect)
      // Enrichissement conditionnel: marquer low_score si < 50
      const finalStatus = (status === 'scored' && score <= 50) ? 'low_score' : status
      await doc.ref.update({
        score,
        scoreDetails: details,
        status: finalStatus,
        updatedAt: FieldValue.serverTimestamp()
      })
      if (finalStatus === 'scored') stats.scored++
    }

    // PHASE 4: Generer les emails (score > 50 uniquement)
    console.log(`[${orgId}] Phase 4: Generation emails (score > 50)...`)
    const emailsPerDay = config.emailsPerDay || 20
    const topProspects = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('status', '==', 'scored')
      .where('score', '>', 50)
      .orderBy('score', 'desc')
      .limit(emailsPerDay)
      .get()

    // Recuperer un compte disponible
    const accountsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('emailAccounts')
      .where('status', 'in', ['active', 'warming_up'])
      .get()

    if (accountsSnapshot.empty) {
      console.log(`[${orgId}] Aucun compte email disponible`)
      stats.errors.push('Aucun compte email disponible')
      return stats
    }

    // Trier par utilisation (round-robin)
    const accounts = accountsSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.sentToday < getEffectiveLimit(a))
      .sort((a, b) => a.sentToday - b.sentToday)

    if (accounts.length === 0) {
      console.log(`[${orgId}] Tous les comptes ont atteint leur quota`)
      stats.errors.push('Quota atteint sur tous les comptes')
      return stats
    }

    for (const doc of topProspects.docs) {
      const prospect = { id: doc.id, ...doc.data() }

      // Verifier si pas deja contacte
      if (prospect.emails?.length === 0) continue

      // Filtrer les emails invalides (placeholders, plateformes, domaine entreprise)
      const bestEmail = getBestEmail(prospect.emails, prospect.domain)
      if (!bestEmail) {
        console.log(`[${orgId}] Skip ${prospect.domain}: aucun email valide`)
        await doc.ref.update({ status: 'no_email', updatedAt: FieldValue.serverTimestamp() })
        continue
      }

      const account = accounts.find(a => a.sentToday < getEffectiveLimit(a))
      if (!account) break

      const email = generateEmail({ ...prospect, emails: [bestEmail] }, config, account)
      await doc.ref.update({
        generatedEmail: email,
        status: 'ready',
        contactedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
      stats.ready++
    }

    // PHASE 5: Logger les stats
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('autopilotLogs')
      .add({
        ...stats,
        runAt: FieldValue.serverTimestamp()
      })

    console.log(`[${orgId}] Pipeline termine:`, stats)

  } catch (error) {
    console.error(`[${orgId}] Pipeline error:`, error)
    stats.errors.push(error.message)
  }

  return stats
}

/**
 * Cron quotidien - se declenche a 9h Paris
 */
export const dailyAutoPilot = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async (event) => {
    console.log('Daily AutoPilot starting...')

    // Reset compteurs
    await resetDailyCounters()
    await incrementWarmupDays()

    // Recuperer les orgs avec autopilot actif
    const orgs = await getActiveAutopilotOrgs()
    console.log(`Found ${orgs.length} active organizations`)

    for (const org of orgs) {
      // Skip weekends si configure
      if (org.config.pauseWeekends && isWeekend()) {
        console.log(`[${org.id}] Skipping (weekend)`)
        continue
      }

      try {
        await runPipeline(org.id, org.config)
      } catch (error) {
        console.error(`[${org.id}] Error:`, error)
      }
    }

    console.log('Daily AutoPilot completed')
  }
)

/**
 * Execution manuelle du pipeline (pour tests)
 */
export const runAutoPilotManual = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async (request) => {
    const db = getDb()
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId } = request.data

    // Verifier que l'user est admin de l'org
    const memberDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('members')
      .doc(request.auth.uid)
      .get()

    if (!memberDoc.exists || memberDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', 'Acces refuse')
    }

    // Recuperer la config
    const configDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('autopilotConfig')
      .doc('settings')
      .get()

    if (!configDoc.exists) {
      throw new HttpsError('not-found', 'Configuration autopilot non trouvee')
    }

    const config = configDoc.data()
    const stats = await runPipeline(orgId, config)

    return stats
  }
)
