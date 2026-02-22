/**
 * Facebook Hunter
 * Automated prospect discovery via Serper.dev (site:facebook.com)
 * Scrapes public Facebook page info with cheerio
 *
 * Cost: $0 (uses existing Serper quota - 2500 free/month)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../../ai/callAI.js'
import axios from 'axios'
import * as cheerio from 'cheerio'

const getDb = () => getFirestore()

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

// Rate limits
const RATE_LIMITS = {
  maxResultsPerSearch: 10,
  maxSearchesPerRun: 3,
  delayBetweenScrapes: 3000 // 3 seconds
}

/**
 * Scheduled Facebook Hunter
 * Runs daily at 11AM Paris time (offset from Instagram 9AM, TikTok 10AM)
 */
export const facebookHunter = onSchedule({
  schedule: '0 11 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540
}, async (event) => {
  console.log('🎯 Facebook Hunter: Starting daily scan...')

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0, errors: 0, merged: 0 }

  try {
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.facebookEnabled) continue

      const icpSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('icp')
        .get()

      const icp = icpSnapshot.exists ? icpSnapshot.data() : {}
      const keywords = icp.facebookKeywords || icp.targetKeywords || ['agence marketing']
      const location = icp.targetLocation || 'Paris'

      console.log(`📍 Processing org: ${orgId}, keywords: ${keywords.join(', ')}, location: ${location}`)

      for (const keyword of keywords.slice(0, RATE_LIMITS.maxSearchesPerRun)) {
        try {
          const prospects = await searchFacebookPages(keyword, location)
          stats.scanned += prospects.length

          for (const prospect of prospects) {
            try {
              const qualification = await qualifyFacebookProspectWithAI(prospect, icp)

              if (qualification.score >= 70) {
                stats.qualified++
                const saveResult = await saveWithDedup(db, orgId, prospect, qualification, keyword)
                if (saveResult === 'saved') stats.saved++
                else if (saveResult === 'merged') stats.merged++
              }
            } catch (err) {
              console.error(`Error qualifying Facebook prospect ${prospect.pageName}:`, err)
              stats.errors++
            }
          }
        } catch (err) {
          console.error(`Error searching Facebook for "${keyword}":`, err)
          stats.errors++
        }
      }

      await db.collection('organizations').doc(orgId).collection('notifications').add({
        type: 'facebook_hunter_complete',
        title: '🎯 Facebook Hunter: Scan termine',
        message: `${stats.scanned} pages scannees, ${stats.qualified} qualifiees, ${stats.saved} nouveaux, ${stats.merged} fusionnes`,
        data: stats,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      })

      await db.collection('organizations').doc(orgId).collection('analytics').doc('facebook_hunter').set({
        lastRun: FieldValue.serverTimestamp(),
        lastStats: stats,
        totalScanned: FieldValue.increment(stats.scanned),
        totalQualified: FieldValue.increment(stats.qualified),
        totalSaved: FieldValue.increment(stats.saved)
      }, { merge: true })
    }

    console.log('✅ Facebook Hunter complete:', stats)
    return stats
  } catch (error) {
    console.error('❌ Facebook Hunter failed:', error)
    throw error
  }
})

/**
 * Manual trigger for Facebook Hunter (callable)
 */
export const runFacebookHunterManual = onCall({
  region: 'europe-west1',
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 300
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, keyword, location } = data

  if (!orgId || !keyword) {
    throw new HttpsError('invalid-argument', 'orgId and keyword are required')
  }

  console.log(`🎯 Manual Facebook Hunt: org=${orgId}, keyword=${keyword}, location=${location || 'France'}`)

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0, merged: 0 }

  try {
    const icpSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('settings')
      .doc('icp')
      .get()

    const icp = icpSnapshot.exists ? icpSnapshot.data() : {}

    const prospects = await searchFacebookPages(keyword, location || 'France')
    stats.scanned = prospects.length

    for (const prospect of prospects) {
      const qualification = await qualifyFacebookProspectWithAI(prospect, icp)

      if (qualification.score >= 70) {
        stats.qualified++
        const saveResult = await saveWithDedup(db, orgId, prospect, qualification, keyword)
        if (saveResult === 'saved') stats.saved++
        else if (saveResult === 'merged') stats.merged++
      }
    }

    return {
      success: true,
      message: `Scan termine: ${stats.scanned} scannees, ${stats.qualified} qualifiees, ${stats.saved} sauvegardees, ${stats.merged} fusionnees`,
      stats
    }
  } catch (error) {
    console.error('Manual Facebook Hunt failed:', error)
    throw new HttpsError('internal', `Scan failed: ${error.message}`)
  }
})

/**
 * Search Facebook pages via Serper.dev
 */
async function searchFacebookPages(keyword, location) {
  if (!SERPER_API_KEY) {
    console.warn('Serper API key not configured, using mock data')
    return getMockFacebookProspects(keyword)
  }

  try {
    const query = `site:facebook.com ${keyword} ${location}`
    console.log(`🔍 Serper query: "${query}"`)

    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num: RATE_LIMITS.maxResultsPerSearch, gl: 'fr', hl: 'fr' },
      {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const results = response.data?.organic || []
    const prospects = []

    for (const result of results) {
      // Only keep facebook.com page results
      if (!result.link || !result.link.includes('facebook.com')) continue
      // Skip groups, events, posts — only pages
      if (/\/(groups|events|posts|photo|story|watch|reel)\//i.test(result.link)) continue

      const prospect = {
        pageName: result.title?.replace(/ \| Facebook$/i, '').replace(/ - Facebook$/i, '').trim() || '',
        facebookUrl: result.link,
        snippet: result.snippet || '',
        domain: extractDomainFromFacebookUrl(result.link),
        category: '',
        email: '',
        phone: '',
        websiteUrl: ''
      }

      // Try to scrape the public Facebook page for contact info
      try {
        const pageInfo = await scrapeFacebookPage(result.link)
        prospect.email = pageInfo.email || ''
        prospect.phone = pageInfo.phone || ''
        prospect.websiteUrl = pageInfo.website || ''
        prospect.category = pageInfo.category || ''
        prospect.about = pageInfo.about || ''
      } catch (scrapeErr) {
        console.warn(`Could not scrape ${result.link}:`, scrapeErr.message)
        // Extract what we can from the Serper snippet
        const snippetInfo = extractContactFromText(result.snippet || '')
        prospect.email = snippetInfo.email
        prospect.phone = snippetInfo.phone
      }

      prospects.push(prospect)

      await sleep(RATE_LIMITS.delayBetweenScrapes)
    }

    console.log(`✅ Found ${prospects.length} Facebook pages for "${keyword} ${location}"`)
    return prospects

  } catch (error) {
    console.error('Serper search error:', error.message)
    return getMockFacebookProspects(keyword)
  }
}

/**
 * Scrape public Facebook page for contact info
 */
async function scrapeFacebookPage(url) {
  const result = { email: '', phone: '', website: '', category: '', about: '' }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      },
      timeout: 10000,
      maxRedirects: 3
    })

    const html = response.data
    const $ = cheerio.load(html)

    // Extract email from page HTML
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const pageText = $('body').text()
    const emails = pageText.match(emailRegex) || []
    // Filter out Facebook internal emails
    const validEmails = emails.filter(e =>
      !e.includes('facebook.com') &&
      !e.includes('fbcdn.') &&
      !e.includes('example.com')
    )
    if (validEmails.length > 0) {
      result.email = validEmails[0].toLowerCase()
    }

    // Extract phone from tel: links or text
    const telLinks = $('a[href^="tel:"]')
    if (telLinks.length > 0) {
      result.phone = telLinks.first().attr('href').replace('tel:', '').trim()
    } else {
      const phoneRegex = /(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g
      const phones = pageText.match(phoneRegex) || []
      if (phones.length > 0) {
        result.phone = phones[0].replace(/[\s.-]/g, '')
      }
    }

    // Extract external website links
    const externalLinks = $('a[href]').filter((_, el) => {
      const href = $(el).attr('href') || ''
      return href.startsWith('http') &&
        !href.includes('facebook.com') &&
        !href.includes('fbcdn.') &&
        !href.includes('instagram.com') &&
        !href.includes('whatsapp.com')
    })
    if (externalLinks.length > 0) {
      result.website = externalLinks.first().attr('href')
    }

    // Extract category from meta tags or structured data
    const ogDescription = $('meta[property="og:description"]').attr('content') || ''
    if (ogDescription) {
      result.about = ogDescription.slice(0, 500)
    }

    const categoryMeta = $('meta[name="description"]').attr('content') || ''
    const categoryMatch = categoryMeta.match(/^([^.]+)\./)
    if (categoryMatch) {
      result.category = categoryMatch[1].trim()
    }

  } catch (err) {
    // Silently fail — Facebook may block scraping
  }

  return result
}

/**
 * Extract contact info from any text (snippet fallback)
 */
function extractContactFromText(text) {
  const result = { email: '', phone: '' }
  if (!text) return result

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase()
  }

  const phoneMatch = text.match(/(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/)
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[\s.-]/g, '')
  }

  return result
}

/**
 * Extract domain slug from a Facebook URL
 */
function extractDomainFromFacebookUrl(url) {
  try {
    const match = url.match(/facebook\.com\/([^/?#]+)/)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

/**
 * Save prospect with cross-platform deduplication
 */
async function saveWithDedup(db, orgId, prospect, qualification, keyword) {
  const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')

  // Check if same Facebook page already exists
  const fbCheck = await prospectsRef
    .where('platform', '==', 'facebook')
    .where('facebookUrl', '==', prospect.facebookUrl)
    .limit(1)
    .get()

  if (!fbCheck.empty) return 'exists'

  // Cross-platform dedup: check by email
  let crossPlatformDoc = null
  if (prospect.email) {
    const emailCheck = await prospectsRef
      .where('email', '==', prospect.email)
      .limit(1)
      .get()
    if (!emailCheck.empty) crossPlatformDoc = emailCheck.docs[0]
  }

  // Cross-platform dedup: check by phone
  if (!crossPlatformDoc && prospect.phone) {
    const phoneCheck = await prospectsRef
      .where('phone', '==', prospect.phone)
      .limit(1)
      .get()
    if (!phoneCheck.empty) crossPlatformDoc = phoneCheck.docs[0]
  }

  // Cross-platform dedup: check by website domain
  if (!crossPlatformDoc && prospect.websiteUrl) {
    const websiteCheck = await prospectsRef
      .where('websiteUrl', '==', prospect.websiteUrl)
      .limit(1)
      .get()
    if (!websiteCheck.empty) crossPlatformDoc = websiteCheck.docs[0]
  }

  if (crossPlatformDoc) {
    // Merge Facebook data into existing prospect
    const updateData = {
      facebookUrl: prospect.facebookUrl,
      facebookPageName: prospect.pageName,
      facebookCategory: prospect.category || '',
      platforms: FieldValue.arrayUnion('facebook'),
      updatedAt: FieldValue.serverTimestamp()
    }
    // Fill in missing contact fields
    const existing = crossPlatformDoc.data()
    if (!existing.email && prospect.email) updateData.email = prospect.email
    if (!existing.phone && prospect.phone) updateData.phone = prospect.phone
    if (!existing.websiteUrl && prospect.websiteUrl) updateData.websiteUrl = prospect.websiteUrl

    await crossPlatformDoc.ref.update(updateData)
    return 'merged'
  }

  // Save new prospect
  await prospectsRef.add({
    source: 'facebook_hunter',
    platform: 'facebook',
    platformId: prospect.domain || prospect.facebookUrl,
    pageName: prospect.pageName,
    fullName: prospect.pageName,
    bio: prospect.about || prospect.snippet || '',
    facebookUrl: prospect.facebookUrl,
    profileUrl: prospect.facebookUrl,

    // Contact info
    email: prospect.email || '',
    phone: prospect.phone || '',
    websiteUrl: prospect.websiteUrl || '',
    businessCategory: prospect.category || '',
    whatsappNumber: prospect.phone || '',
    isBusiness: true,

    // Multi-platform tracking
    platforms: ['facebook'],

    // AI Qualification
    score: qualification.score,
    qualificationReason: qualification.reason,
    suggestedApproach: qualification.approach,

    // Status
    status: 'new',
    hunterStatus: 'qualified',

    // Metadata
    keyword,
    scannedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  })

  return 'saved'
}

/**
 * Qualify Facebook prospect using Gemini AI
 */
async function qualifyFacebookProspectWithAI(prospect, icp) {
  try {
    const prompt = `Tu es un expert en qualification de prospects B2B. Analyse cette page Facebook et donne un score de 0 a 100.

PAGE FACEBOOK:
- Nom: ${prospect.pageName}
- URL: ${prospect.facebookUrl}
- Categorie: ${prospect.category || 'Non specifie'}
- Description: "${prospect.about || prospect.snippet || 'Pas de description'}"
- Email: ${prospect.email || 'Non trouve'}
- Telephone: ${prospect.phone || 'Non trouve'}
- Site web: ${prospect.websiteUrl || 'Non trouve'}

PROFIL CLIENT IDEAL (ICP):
- Secteur cible: ${icp.industry || 'Tous secteurs'}
- Roles cibles: ${icp.targetRoles?.join(', ') || 'Entrepreneurs, Dirigeants'}
- Taille entreprise: ${icp.companySize || 'PME'}
- Mots-cles: ${icp.keywords?.join(', ') || 'business, agence, marketing'}

CRITERES DE SCORING:
- 80-100: Page business active avec contact direct (email+tel), secteur pertinent
- 60-79: Page pro avec quelques infos de contact, bon potentiel
- 40-59: Page pro mais peu d'infos exploitables
- 0-39: Page personnelle ou pas de fit

BONUS:
- Email trouve: +15 points
- Telephone trouve: +10 points
- Site web: +10 points
- Categorie business claire: +5 points

Reponds UNIQUEMENT avec ce JSON:
{
  "score": <number 0-100>,
  "reason": "<explication courte>",
  "approach": "<suggestion d'approche personnalisee>"
}`

    const text = await callAI(prompt, 500)
    const analysis = extractJSON(text)
    if (!analysis) throw new Error('No JSON in response')

    return {
      score: Math.min(100, Math.max(0, analysis.score || 0)),
      reason: analysis.reason || 'Score calcule par IA',
      approach: analysis.approach || 'Message de prospection standard'
    }
  } catch (error) {
    console.error('AI qualification error:', error.message)
    return {
      score: prospect.email ? 65 : 45,
      reason: 'Erreur IA - score base sur les infos disponibles',
      approach: 'Message generique de prospection'
    }
  }
}

/**
 * Get Facebook hunter statistics
 */
export const getFacebookHunterStats = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  const db = getDb()

  try {
    const analyticsDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('analytics')
      .doc('facebook_hunter')
      .get()

    const analytics = analyticsDoc.exists ? analyticsDoc.data() : {}

    const prospectsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('platform', '==', 'facebook')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const prospects = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      scannedAt: doc.data().scannedAt?.toDate?.()?.toISOString() || null
    }))

    const withEmail = prospects.filter(p => p.email).length
    const withPhone = prospects.filter(p => p.phone).length
    const withWebsite = prospects.filter(p => p.websiteUrl).length

    return {
      success: true,
      stats: {
        totalScanned: analytics.totalScanned || 0,
        totalQualified: analytics.totalQualified || 0,
        totalSaved: analytics.totalSaved || 0,
        lastRun: analytics.lastRun?.toDate?.()?.toISOString() || null,
        lastStats: analytics.lastStats || {}
      },
      contactInfo: { withEmail, withPhone, withWebsite },
      recentProspects: prospects
    }
  } catch (error) {
    console.error('Failed to get Facebook hunter stats:', error)
    throw new HttpsError('internal', 'Failed to get stats')
  }
})

/**
 * Mock Facebook prospects for testing
 */
function getMockFacebookProspects(keyword) {
  return [
    {
      pageName: `Agence ${keyword} Paris`,
      facebookUrl: `https://facebook.com/agence-${keyword.replace(/\s/g, '-')}-paris`,
      snippet: `Agence ${keyword} a Paris - Specialiste en communication digitale et marketing`,
      domain: `agence-${keyword.replace(/\s/g, '-')}-paris`,
      category: 'Agence de marketing',
      email: `contact@agence-${keyword.replace(/\s/g, '')}.fr`,
      phone: '0142360000',
      websiteUrl: `https://agence-${keyword.replace(/\s/g, '')}.fr`,
      about: `Nous sommes une agence de ${keyword} basee a Paris, specialisee dans le digital.`
    },
    {
      pageName: `Studio Creatif ${keyword}`,
      facebookUrl: `https://facebook.com/studio-creatif-${keyword.replace(/\s/g, '-')}`,
      snippet: `Studio creatif specialise en ${keyword} - Paris et Ile-de-France`,
      domain: `studio-creatif-${keyword.replace(/\s/g, '-')}`,
      category: 'Studio creatif',
      email: `hello@studio-creatif.fr`,
      phone: '+33698765432',
      websiteUrl: 'https://studio-creatif.fr',
      about: `Studio creatif independant, expert en ${keyword} depuis 2018.`
    },
    {
      pageName: `${keyword} Consulting Group`,
      facebookUrl: `https://facebook.com/${keyword.replace(/\s/g, '')}consulting`,
      snippet: `Cabinet de conseil en ${keyword} pour PME et startups`,
      domain: `${keyword.replace(/\s/g, '')}consulting`,
      category: 'Conseil en entreprise',
      email: '',
      phone: '',
      websiteUrl: `https://${keyword.replace(/\s/g, '')}consulting.com`,
      about: `Conseil strategique en ${keyword} pour entreprises ambitieuses.`
    }
  ]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
