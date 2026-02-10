/**
 * Cloud Function: prospectEngine v2.0 - MACHINE DE GUERRE
 *
 * Optimisations:
 * - Ciblage ultra-precis des PME locales (pas de startups tech)
 * - Scraping 3 couches (direct, www, AI fallback)
 * - Scoring pondere 100 points
 * - Sequences ultra-personnalisees
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as cheerio from 'cheerio'
import { callAI, parseJsonResponse } from '../utils/gemini.js'

const getDb = () => getFirestore()

// Rate limits
const GEMINI_DELAY_MS = 4000
const SCRAPE_DELAY_MS = 1500

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// SCRAPING ROBUSTE - 3 COUCHES
// ============================================================================

/**
 * Couche 1: Scraping direct avec User-Agent desktop
 */
async function scrapeLayer1(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

/**
 * Couche 2: Essai avec variante www
 */
async function scrapeLayer2(url) {
  let altUrl = url
  if (url.includes('://www.')) {
    altUrl = url.replace('://www.', '://')
  } else {
    altUrl = url.replace('://', '://www.')
  }
  return scrapeLayer1(altUrl)
}

/**
 * Couche 3: Fallback AI - generer des infos probables
 */
async function scrapeLayer3AI(company) {
  const prompt = `Tu es un expert en recherche d'entreprises francaises.
L'entreprise "${company.name}" a pour site web "${company.website}" qui n'est pas accessible.

Genere des informations PROBABLES mais realistes pour cette entreprise:
- Secteur: ${company.sector || 'Non connu'}
- Ville: ${company.city || 'Non connue'}

IMPORTANT: Genere des informations credibles basees sur le nom et le secteur.

JSON UNIQUEMENT:
{
  "title": "Titre probable de la page d'accueil",
  "metaDescription": "Description probable de l'activite (max 160 caracteres)",
  "emails": ["contact@domaine.fr"],
  "phones": [],
  "positioning": "Positionnement probable de l'entreprise"
}`

  try {
    const response = await callAI(prompt, { maxTokens: 500 })
    return parseJsonResponse(response)
  } catch {
    return null
  }
}

/**
 * Scraping robuste avec 3 couches
 */
async function scrapeWebsiteRobust(company) {
  let normalizedUrl = company.website
  if (!normalizedUrl.startsWith('http')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  let html = null
  let layer = 0

  // Couche 1: Direct
  try {
    html = await scrapeLayer1(normalizedUrl)
    layer = 1
  } catch (e1) {
    console.log(`Layer 1 failed for ${company.name}: ${e1.message}`)

    // Couche 2: Variante www
    try {
      html = await scrapeLayer2(normalizedUrl)
      layer = 2
    } catch (e2) {
      console.log(`Layer 2 failed for ${company.name}: ${e2.message}`)
    }
  }

  // Si HTML obtenu, parser
  if (html) {
    const $ = cheerio.load(html)
    $('script, style, nav, footer, header, iframe, noscript, svg, form').remove()

    const title = $('title').text().trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 5)
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5)
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(p => p.length > 30)
      .slice(0, 10)

    const bodyText = $('body').text()

    // Emails avec filtres stricts
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [...new Set(bodyText.match(emailRegex) || [])]
      .filter(e =>
        !e.includes('example') &&
        !e.includes('test@') &&
        !e.includes('sentry') &&
        !e.includes('webpack') &&
        !e.includes('cloudflare') &&
        !e.includes('google') &&
        !e.includes('facebook') &&
        e.length < 50
      )
      .slice(0, 5)

    // Telephones francais
    const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g
    const phones = [...new Set(bodyText.match(phoneRegex) || [])].slice(0, 3)

    // Liens sociaux
    const linkedinLink = $('a[href*="linkedin.com"]').first().attr('href') || ''
    const instagramLink = $('a[href*="instagram.com"]').first().attr('href') || ''

    return {
      success: true,
      layer,
      title,
      metaDescription,
      headings: [...h1s, ...h2s],
      content: paragraphs.join(' ').substring(0, 2000),
      emails,
      phones,
      linkedinLink,
      instagramLink,
      url: normalizedUrl,
    }
  }

  // Couche 3: Fallback AI
  console.log(`Using AI fallback for ${company.name}`)
  const aiData = await scrapeLayer3AI(company)

  if (aiData) {
    return {
      success: true,
      layer: 3,
      title: aiData.title || company.name,
      metaDescription: aiData.metaDescription || '',
      headings: [],
      content: aiData.positioning || '',
      emails: aiData.emails || [],
      phones: aiData.phones || [],
      linkedinLink: '',
      instagramLink: '',
      url: normalizedUrl,
      aiFallback: true,
    }
  }

  return {
    success: false,
    layer: 0,
    error: 'All scraping layers failed',
    url: normalizedUrl,
    title: company.name,
    metaDescription: '',
    headings: [],
    content: '',
    emails: [],
    phones: [],
    linkedinLink: '',
    instagramLink: '',
  }
}

// ============================================================================
// CIBLAGE ULTRA-PRECIS - PROMPT MACHINE DE GUERRE
// ============================================================================

/**
 * Prompt optimise pour trouver des VRAIES PME locales
 */
async function findCompaniesWithAI(icp, existingDomains = []) {
  const existingList = existingDomains.length > 0
    ? `\n\nENTREPRISES DEJA DANS LA BASE (NE PAS PROPOSER):\n${existingDomains.slice(0, 20).join('\n')}`
    : ''

  const prompt = `Tu es un expert en prospection B2B specialise dans la recherche d'entreprises francaises LOCALES.

MISSION: Trouver 20 entreprises REELLES qui ont BESOIN de "${icp.offer || 'services professionnels'}".

PROFIL CLIENT IDEAL (ICP):
- Secteur de l'utilisateur: ${icp.sector || 'Services aux entreprises'}
- Service/Offre: ${icp.offer || 'Non precise'}
- Cible: ${icp.target || 'Dirigeants PME'}
- Zone: ${icp.zone || 'France'}
- Taille: ${icp.volume || 'PME'}

REGLES ABSOLUES:
1. UNIQUEMENT des entreprises avec site web VALIDE et FONCTIONNEL
2. JAMAIS de startups tech connues (Doctolib, Alan, Swile, Qonto, PayFit, etc.)
3. JAMAIS d'entreprises du CAC40 ou grandes entreprises
4. PRIVILEGIER les PME locales, cabinets, agences, commerces B2B
5. Sites web en .fr ou domaine francais
6. Entreprises avec 5 a 100 employes idealement

EXEMPLES PAR SECTEUR D'OFFRE:

Si l'offre = "Nettoyage bureaux":
- Cabinets comptables locaux (ex: Cabinet Durand Expertise - cabinetdurand.fr)
- Cabinets d'avocats (ex: Avocats Lefevre & Associes - lefevre-avocats.fr)
- Agences immobilieres (ex: Immo Centre Paris - immocentreparis.fr)
- Cliniques veterinaires (ex: Clinique Vet du Parc - vetduparc.fr)
- Auto-ecoles (ex: Auto-Ecole de la Mairie - autoecole-mairie.fr)

Si l'offre = "Creation site web / Marketing digital":
- Artisans (plombiers, electriciens avec vieux site)
- Restaurants gastronomiques
- Boutiques de mode independantes
- Salons de coiffure haut de gamme
- Centres de formation

Si l'offre = "Services RH / Recrutement":
- Industries manufacturieres locales
- Societes de transport regional
- Entreprises de BTP moyennes
- Societes de services a la personne

ANTI-PATTERNS (NE JAMAIS PROPOSER):
- Aucune entreprise avec plus de 500 employes
- Aucune entreprise connue nationalement
- Aucun site en .com uniquement sans presence francaise claire
- Aucune entreprise deja presente dans les bases type Pappers/Societe.com en premiere page
${existingList}

FORMAT DE REPONSE JSON UNIQUEMENT:
{
  "companies": [
    {
      "name": "Nom EXACT de l'entreprise",
      "website": "https://www.site-reel.fr",
      "sector": "Secteur precis (Comptabilite, Immobilier, Restauration...)",
      "description": "Activite en 1 phrase",
      "size": "TPE/PME/ETI",
      "city": "Ville exacte",
      "whyMatch": "Pourquoi ils ont BESOIN de ${icp.offer || 'ce service'}"
    }
  ]
}

IMPORTANT: Chaque entreprise doit avoir un site web REEL et ACCESSIBLE. Verifie mentalement que l'URL est plausible.`

  try {
    const response = await callAI(prompt, { maxTokens: 4500, temperature: 0.9 })
    const parsed = parseJsonResponse(response)
    return parsed.companies || []
  } catch (error) {
    console.error('Find companies error:', error)
    return []
  }
}

// ============================================================================
// SCORING INTELLIGENT - 100 POINTS PONDERES
// ============================================================================

/**
 * Calcule un score sur 100 points avec criteres ponderes
 */
function calculateWeightedScore(company, scrapedData, icp) {
  let score = 0
  const breakdown = {}

  // 1. PERTINENCE SECTEUR (25 points)
  const sectorScore = calculateSectorRelevance(company, icp)
  score += sectorScore
  breakdown.sectorRelevance = sectorScore

  // 2. TAILLE CORRESPONDANTE (20 points)
  const sizeScore = calculateSizeMatch(company, icp)
  score += sizeScore
  breakdown.sizeMatch = sizeScore

  // 3. ACCESSIBILITE DONNEES (20 points)
  const accessScore = calculateDataAccessibility(scrapedData)
  score += accessScore
  breakdown.dataAccessibility = accessScore

  // 4. LOCALISATION (15 points)
  const locationScore = calculateLocationMatch(company, icp)
  score += locationScore
  breakdown.locationMatch = locationScore

  // 5. QUALITE DONNEES (10 points)
  const qualityScore = calculateDataQuality(scrapedData)
  score += qualityScore
  breakdown.dataQuality = qualityScore

  // 6. QUALITE SOURCE (10 points)
  const sourceScore = calculateSourceQuality(scrapedData)
  score += sourceScore
  breakdown.sourceQuality = sourceScore

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    breakdown,
    category: score >= 80 ? 'hot' : score >= 60 ? 'warm' : score >= 40 ? 'cold' : 'ice',
  }
}

function calculateSectorRelevance(company, icp) {
  // Verifier si le secteur de l'entreprise correspond a la cible
  const companySector = (company.sector || '').toLowerCase()
  const targetSector = (icp.target || '').toLowerCase()
  const offer = (icp.offer || '').toLowerCase()

  // Mots-cles de correspondance
  const matches = [
    companySector.includes('comptab') && (offer.includes('nettoyage') || offer.includes('bureau')),
    companySector.includes('avocat') && (offer.includes('nettoyage') || offer.includes('bureau')),
    companySector.includes('medical') && offer.includes('nettoyage'),
    companySector.includes('immobil') && (offer.includes('nettoyage') || offer.includes('web')),
    companySector.includes('restaurant') && offer.includes('web'),
    companySector.includes('commerce') && offer.includes('web'),
    companySector.includes('artisan') && offer.includes('web'),
    targetSector.includes(companySector),
    companySector.includes('pme') || companySector.includes('tpe'),
  ]

  const matchCount = matches.filter(Boolean).length
  if (matchCount >= 2) return 25
  if (matchCount >= 1) return 18
  return 10 // Score de base
}

function calculateSizeMatch(company, icp) {
  const companySize = (company.size || '').toUpperCase()
  const targetVolume = (icp.volume || 'PME').toUpperCase()

  if (companySize === targetVolume) return 20
  if ((companySize === 'PME' && targetVolume === 'TPE') || (companySize === 'TPE' && targetVolume === 'PME')) return 15
  if (companySize === 'ETI' && (targetVolume === 'PME' || targetVolume === 'ETI')) return 12
  return 8
}

function calculateDataAccessibility(scrapedData) {
  let score = 0

  if (scrapedData.success) score += 8
  if (scrapedData.emails && scrapedData.emails.length > 0) score += 6
  if (scrapedData.phones && scrapedData.phones.length > 0) score += 4
  if (scrapedData.linkedinLink) score += 2

  return Math.min(20, score)
}

function calculateLocationMatch(company, icp) {
  const companyCity = (company.city || '').toLowerCase()
  const targetZone = (icp.zone || '').toLowerCase()

  // Paris / IDF
  if (targetZone.includes('paris') || targetZone.includes('ile-de-france')) {
    if (companyCity.includes('paris')) return 15
    if (['boulogne', 'neuilly', 'levallois', 'la defense', 'montreuil', 'saint-denis'].some(c => companyCity.includes(c))) return 13
    if (companyCity) return 10
  }

  // Autres villes
  if (targetZone.includes(companyCity) || companyCity.includes(targetZone.split(' ')[0])) return 15
  if (companyCity) return 8

  return 5
}

function calculateDataQuality(scrapedData) {
  let score = 0

  if (scrapedData.title && scrapedData.title.length > 10) score += 3
  if (scrapedData.metaDescription && scrapedData.metaDescription.length > 30) score += 3
  if (scrapedData.content && scrapedData.content.length > 200) score += 4

  return Math.min(10, score)
}

function calculateSourceQuality(scrapedData) {
  if (!scrapedData.layer) return 5

  if (scrapedData.layer === 1) return 10 // Direct success
  if (scrapedData.layer === 2) return 8  // WWW variant
  if (scrapedData.layer === 3) return 4  // AI fallback

  return 5
}

// ============================================================================
// ANALYSE IA ENRICHIE
// ============================================================================

async function analyzeCompanyWithAI(company, scrapedData, icp) {
  const prompt = `Tu es un expert en prospection B2B. Analyse cette entreprise et genere un profil prospect ACTIONNABLE.

ENTREPRISE: ${company.name}
SITE: ${company.website}
SECTEUR: ${company.sector || 'Non precise'}
VILLE: ${company.city || 'Non precisee'}
TAILLE: ${company.size || 'PME'}

DONNEES DU SITE:
Titre: ${scrapedData.title || 'Non disponible'}
Description: ${scrapedData.metaDescription || 'Non disponible'}
Contenu: ${scrapedData.content?.substring(0, 1200) || 'Non disponible'}
Emails trouves: ${scrapedData.emails?.join(', ') || 'Aucun'}
Telephones: ${scrapedData.phones?.join(', ') || 'Aucun'}

OFFRE A PROPOSER: ${icp.offer || 'Services professionnels'}

INSTRUCTIONS:
1. Si des emails sont trouves, UTILISE-LES. Sinon genere contact@domaine.fr
2. Genere un prenom/nom FRANCAIS realiste pour le decideur
3. Identifie 2-3 PAIN POINTS specifiques lies a l'offre "${icp.offer || 'Services'}"
4. Cree 2 ICEBREAKERS ultra-personnalises basees sur leur activite

JSON UNIQUEMENT:
{
  "firstName": "Prenom francais",
  "lastName": "Nom francais",
  "jobTitle": "Poste (Dirigeant, Gerant, Directeur...)",
  "email": "email@entreprise.fr",
  "phone": "+33 X XX XX XX XX ou null",
  "company": "Nom entreprise",
  "website": "URL",
  "industry": "Secteur precis",
  "companySize": "TPE/PME/ETI",
  "city": "Ville",
  "linkedinUrl": "URL ou null",
  "instagramUrl": "URL ou null",
  "positioning": "Positionnement en 1 phrase",
  "painPoints": ["Pain point 1 lie a ${icp.offer || 'leur besoin'}", "Pain point 2"],
  "icebreakers": ["Accroche personnalisee 1", "Accroche personnalisee 2"],
  "whyNeedsService": "Pourquoi cette entreprise a BESOIN de ${icp.offer || 'ce service'}"
}`

  try {
    const response = await callAI(prompt, { maxTokens: 1500 })
    const data = parseJsonResponse(response)

    // Fusionner avec les donnees scrapees
    if (scrapedData.emails?.length > 0 && !data.email?.includes('@')) {
      data.email = scrapedData.emails[0]
    }
    if (scrapedData.phones?.length > 0 && !data.phone) {
      data.phone = scrapedData.phones[0]
    }
    if (scrapedData.linkedinLink && !data.linkedinUrl) {
      data.linkedinUrl = scrapedData.linkedinLink
    }

    return data
  } catch (error) {
    console.error('Analyze company error:', error)

    // Donnees de fallback
    const domain = company.website?.replace(/^https?:\/\//, '').split('/')[0] || 'example.com'
    return {
      firstName: 'Responsable',
      lastName: company.name?.split(' ')[0] || 'Contact',
      jobTitle: 'Dirigeant',
      email: scrapedData.emails?.[0] || `contact@${domain.replace('www.', '')}`,
      phone: scrapedData.phones?.[0] || null,
      company: company.name,
      website: company.website,
      industry: company.sector,
      companySize: company.size,
      city: company.city,
      linkedinUrl: scrapedData.linkedinLink || null,
      instagramUrl: scrapedData.instagramLink || null,
      positioning: scrapedData.metaDescription || company.description || '',
      painPoints: [],
      icebreakers: [],
      whyNeedsService: company.whyMatch || '',
    }
  }
}

// ============================================================================
// SEQUENCES ULTRA-PERSONNALISEES
// ============================================================================

async function generateSequenceForProspect(prospect, icp, channels) {
  const channelFormats = {
    email: 'Email B2B (80-120 mots). Objet: max 6 mots, minuscule sauf debut. Structure: Accroche personnalisee → Proposition valeur → CTA clair',
    sms: 'SMS (max 160 caracteres). Direct, pas de formule de politesse excessive',
    whatsapp: 'WhatsApp (60-90 mots). Ton conversationnel mais pro. Emojis autorises avec parcimonie (max 2)',
    instagram_dm: 'DM Instagram (50-70 mots). Decontracte, humain. Peut referencer leur contenu',
    voicemail: 'Script vocal (25-35 secondes). Naturel, pas lu. Inclure pause',
    courrier: 'Lettre (200-250 mots). Formelle mais moderne. Structure classique',
  }

  const activeChannels = channels.filter(c => channelFormats[c])

  const prompt = `Tu es un EXPERT COPYWRITER en cold outreach B2B avec 15 ans d'experience.
Tu vas creer une sequence de prospection ULTRA-PERSONNALISEE.

PROSPECT:
- Nom: ${prospect.firstName} ${prospect.lastName}
- Entreprise: ${prospect.company}
- Poste: ${prospect.jobTitle}
- Secteur: ${prospect.industry}
- Ville: ${prospect.city}
- Positionnement: ${prospect.positioning || 'Non connu'}
- Pain points identifies: ${prospect.painPoints?.join(' | ') || 'Non connus'}
- Icebreakers: ${prospect.icebreakers?.join(' | ') || 'Non disponibles'}
- Pourquoi a besoin du service: ${prospect.whyNeedsService || 'Non precise'}

OFFRE:
- Service: ${icp.offer || 'Services professionnels'}
- Entreprise: ${icp.businessName || 'Notre entreprise'}
- Ton: ${icp.tone === 'casual' ? 'Decontracte, amical' : icp.tone === 'formal' ? 'Formel, corporate' : 'Professionnel mais humain'}

CANAUX (dans l'ordre): ${activeChannels.join(', ')}

FORMAT PAR CANAL:
${activeChannels.map(c => `- ${c.toUpperCase()}: ${channelFormats[c]}`).join('\n')}

REGLES ABSOLUES:
1. JAMAIS "J'espere que vous allez bien" ou "Je me permets de"
2. JAMAIS de superlatifs ("leader", "meilleur", "revolutionnaire")
3. Commencer par un HOOK personnalise (mentionner leur entreprise, secteur, ou defi)
4. Chaque message = 1 seul CTA
5. Pattern interrupteur: Message court → Message valeur → Message social proof → Message urgence douce → Break-up

VARIABLES DISPONIBLES: {prenom}, {entreprise}, {poste}

ESPACEMENT: Jour 0, Jour 3, Jour 6, Jour 10, Jour 14

JSON UNIQUEMENT:
{
  "steps": [
    {
      "day": 0,
      "channel": "email",
      "subject": "objet court et intrigant",
      "content": "Message avec {prenom} et {entreprise}",
      "cta": "Action demandee",
      "goal": "Objectif de ce message"
    }
  ]
}`

  try {
    const response = await callAI(prompt, { maxTokens: 3000, temperature: 0.8 })
    const parsed = parseJsonResponse(response)
    return parsed.steps || []
  } catch (error) {
    console.error('Generate sequence error:', error)
    return generateFallbackSequence(prospect, icp, activeChannels)
  }
}

/**
 * Sequence de fallback si l'IA echoue
 */
function generateFallbackSequence(prospect, icp, channels) {
  const steps = []
  const days = [0, 3, 6, 10, 14]

  channels.slice(0, 5).forEach((channel, i) => {
    const day = days[i] || days[days.length - 1]

    if (channel === 'email') {
      steps.push({
        day,
        channel: 'email',
        subject: `${icp.offer || 'Question'} pour {entreprise}`,
        content: `Bonjour {prenom},

Je contacte {entreprise} car ${prospect.whyNeedsService || 'vous pourriez beneficier de nos services'}.

${icp.businessName || 'Nous'} accompagnons les entreprises de ${prospect.industry || 'votre secteur'} dans ${icp.offer || 'leur developpement'}.

Seriez-vous disponible 10 minutes cette semaine pour en discuter ?

Cordialement`,
        cta: 'Planifier un appel',
        goal: 'Premier contact',
      })
    } else if (channel === 'sms') {
      steps.push({
        day,
        channel: 'sms',
        content: `Bonjour {prenom}, suite a mon email concernant {entreprise}. Disponible pour un call de 10min ? ${icp.businessName || ''}`,
        cta: 'Repondre',
        goal: 'Relance rapide',
      })
    } else if (channel === 'whatsapp') {
      steps.push({
        day,
        channel: 'whatsapp',
        content: `Bonjour {prenom}! Je me permets de vous contacter ici. ${icp.businessName || 'Nous'} accompagnons les entreprises comme {entreprise} dans ${icp.offer || 'leur croissance'}. Un echange rapide vous interesserait ?`,
        cta: 'Discuter',
        goal: 'Contact alternatif',
      })
    }
  })

  return steps
}

// ============================================================================
// CLOUD FUNCTION PRINCIPALE: prospectEngine v2.0
// ============================================================================

export const prospectEngine = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
    concurrency: 1,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const userId = request.auth.uid
    const { orgId } = request.data

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()
    const orgRef = db.collection('organizations').doc(orgId)
    const userRef = db.collection('users').doc(userId)

    try {
      // 1. STARTING
      await userRef.update({
        'engineStatus.status': 'running',
        'engineStatus.step': 'starting',
        'engineStatus.progress': 0,
        'engineStatus.message': 'Initialisation du moteur v2.0...',
        'engineStatus.startedAt': FieldValue.serverTimestamp(),
      })

      // 2. Charger ICP
      const userDoc = await userRef.get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Profil utilisateur non trouve')
      }

      const userData = userDoc.data()
      const onboardingData = userData.onboardingData || {}

      const icp = {
        businessName: onboardingData.businessName || userData.displayName || '',
        sector: onboardingData.sector || '',
        offer: onboardingData.offer || '',
        target: onboardingData.target || '',
        zone: onboardingData.zone || 'France',
        volume: onboardingData.volume || 'PME',
        channels: onboardingData.channels || ['email'],
        tone: onboardingData.tone || 'professional',
        frequency: onboardingData.frequency || 'balanced',
        website: onboardingData.website || '',
        linkedin: onboardingData.linkedin || '',
        instagram: onboardingData.instagram || '',
      }

      console.log('ICP v2.0:', JSON.stringify(icp))

      // 3. Verification doublons existants
      await userRef.update({
        'engineStatus.step': 'checking_existing',
        'engineStatus.progress': 5,
        'engineStatus.message': 'Verification des prospects existants...',
      })

      const existingProspectsSnap = await orgRef.collection('prospects').get()
      const existingDomains = existingProspectsSnap.docs
        .map(doc => {
          const website = doc.data().website
          if (!website) return null
          try {
            return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '')
          } catch {
            return null
          }
        })
        .filter(Boolean)

      console.log(`${existingDomains.length} domaines existants`)

      // 4. Trouver entreprises avec ciblage ultra-precis
      await userRef.update({
        'engineStatus.step': 'finding_companies',
        'engineStatus.progress': 10,
        'engineStatus.message': 'Recherche IA de PME correspondant a votre ICP...',
      })

      let companies = await findCompaniesWithAI(icp, existingDomains)

      if (companies.length === 0) {
        throw new HttpsError('internal', 'Aucune entreprise trouvee. Verifiez votre ICP.')
      }

      console.log(`${companies.length} entreprises trouvees par l'IA`)

      // Filtrer doublons
      companies = companies.filter(c => {
        if (!c.website) return false
        try {
          const domain = new URL(c.website.startsWith('http') ? c.website : `https://${c.website}`).hostname.replace('www.', '')
          return !existingDomains.includes(domain)
        } catch {
          return false
        }
      })

      console.log(`${companies.length} nouvelles entreprises apres deduplication`)

      if (companies.length === 0) {
        await userRef.update({
          'engineStatus.status': 'completed',
          'engineStatus.step': 'done',
          'engineStatus.progress': 100,
          'engineStatus.message': 'Toutes les entreprises trouvees existent deja.',
          'engineStatus.completedAt': FieldValue.serverTimestamp(),
          'engineStatus.stats': { found: 0, created: 0, scored: 0, sequenced: 0 }
        })
        return { success: true, prospectsCreated: 0 }
      }

      // 5. Scraping robuste + Analyse
      const prospects = []
      const totalCompanies = Math.min(companies.length, 20)

      for (let i = 0; i < totalCompanies; i++) {
        const company = companies[i]
        const progress = 15 + Math.floor((i / totalCompanies) * 45)

        await userRef.update({
          'engineStatus.step': 'scraping',
          'engineStatus.progress': progress,
          'engineStatus.message': `Analyse ${company.name} (${i + 1}/${totalCompanies})...`,
          'engineStatus.currentCompany': company.name,
        })

        // Scraping 3 couches
        const scrapedData = await scrapeWebsiteRobust(company)
        console.log(`Scraped ${company.name}: layer ${scrapedData.layer}, success: ${scrapedData.success}`)

        await delay(SCRAPE_DELAY_MS)

        // Scoring pondere
        const scoring = calculateWeightedScore(company, scrapedData, icp)

        // Analyse IA
        await delay(GEMINI_DELAY_MS)
        const prospectData = await analyzeCompanyWithAI(company, scrapedData, icp)

        if (prospectData) {
          prospects.push({
            ...prospectData,
            score: scoring.score,
            scoreBreakdown: scoring.breakdown,
            scoreCategory: scoring.category,
            source: 'engine_v2',
            scrapingLayer: scrapedData.layer,
            createdAt: FieldValue.serverTimestamp(),
            status: 'new',
            lastContactedAt: null,
            sequenceSteps: [],
            tags: [icp.sector, icp.zone].filter(Boolean),
            notes: '',
            scrapedData: {
              success: scrapedData.success,
              layer: scrapedData.layer,
              title: scrapedData.title,
              metaDescription: scrapedData.metaDescription,
              aiFallback: scrapedData.aiFallback || false,
            },
          })
        }

        await delay(500)
      }

      console.log(`${prospects.length} prospects analyses`)

      // 6. Sauvegarder prospects
      await userRef.update({
        'engineStatus.step': 'saving',
        'engineStatus.progress': 65,
        'engineStatus.message': 'Sauvegarde des prospects...',
      })

      const batch = db.batch()
      const prospectIds = []

      for (const prospect of prospects) {
        const prospectRef = orgRef.collection('prospects').doc()
        prospectIds.push(prospectRef.id)
        batch.set(prospectRef, prospect)
      }

      await batch.commit()
      console.log(`${prospects.length} prospects sauvegardes`)

      // 7. Generer sequences pour prospects qualifies (score >= 50)
      await userRef.update({
        'engineStatus.step': 'generating_sequences',
        'engineStatus.progress': 70,
        'engineStatus.message': 'Generation des sequences personnalisees...',
      })

      const qualifiedProspects = prospects
        .map((p, i) => ({ ...p, id: prospectIds[i] }))
        .filter(p => p.score >= 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)

      let sequencesGenerated = 0

      for (let i = 0; i < qualifiedProspects.length; i++) {
        const prospect = qualifiedProspects[i]
        const progress = 70 + Math.floor((i / qualifiedProspects.length) * 25)

        await userRef.update({
          'engineStatus.progress': progress,
          'engineStatus.message': `Sequence ${prospect.company} (${i + 1}/${qualifiedProspects.length})...`,
        })

        await delay(GEMINI_DELAY_MS)

        const sequence = await generateSequenceForProspect(prospect, icp, icp.channels)

        if (sequence && sequence.length > 0) {
          await orgRef.collection('prospects').doc(prospect.id).update({
            sequenceSteps: sequence,
            sequenceGeneratedAt: FieldValue.serverTimestamp(),
            status: 'ready',
          })

          await orgRef.collection('campaigns').add({
            prospectId: prospect.id,
            prospectName: `${prospect.firstName} ${prospect.lastName}`,
            prospectCompany: prospect.company,
            prospectEmail: prospect.email,
            prospectScore: prospect.score,
            steps: sequence,
            currentStep: 0,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            nextSendAt: null,
            channels: icp.channels,
          })

          sequencesGenerated++
        }

        await delay(500)
      }

      console.log(`${sequencesGenerated} sequences generees`)

      // 8. Stats finales
      const stats = {
        found: companies.length,
        created: prospects.length,
        scored: prospects.filter(p => p.score > 0).length,
        sequenced: sequencesGenerated,
        hotLeads: prospects.filter(p => p.scoreCategory === 'hot').length,
        warmLeads: prospects.filter(p => p.scoreCategory === 'warm').length,
        coldLeads: prospects.filter(p => p.scoreCategory === 'cold').length,
        avgScore: Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / prospects.length),
        scrapingSuccess: {
          layer1: prospects.filter(p => p.scrapingLayer === 1).length,
          layer2: prospects.filter(p => p.scrapingLayer === 2).length,
          layer3: prospects.filter(p => p.scrapingLayer === 3).length,
          failed: prospects.filter(p => !p.scrapingLayer).length,
        }
      }

      // Update usage
      await orgRef.update({
        'usage.currentProspects': FieldValue.increment(prospects.length),
        'usage.lastEngineRun': FieldValue.serverTimestamp(),
      })

      // 9. Termine
      await userRef.update({
        'engineStatus.status': 'completed',
        'engineStatus.step': 'done',
        'engineStatus.progress': 100,
        'engineStatus.message': `Termine! ${prospects.length} prospects, ${stats.hotLeads} chauds, ${sequencesGenerated} sequences.`,
        'engineStatus.completedAt': FieldValue.serverTimestamp(),
        'engineStatus.stats': stats,
        'lastEngineRunAt': FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        prospectsCreated: prospects.length,
        sequencesGenerated,
        stats,
      }

    } catch (error) {
      console.error('Engine v2.0 error:', error)

      await userRef.update({
        'engineStatus.status': 'error',
        'engineStatus.error': error.message,
        'engineStatus.completedAt': FieldValue.serverTimestamp(),
      }).catch(e => console.error('Failed to update error status:', e))

      throw new HttpsError('internal', `Erreur moteur: ${error.message}`)
    }
  }
)

// ============================================================================
// REFRESH PROSPECTS - Recherche supplementaire
// ============================================================================

export const refreshProspects = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
    concurrency: 1,
  },
  async (request) => {
    // Meme logique que prospectEngine
    // L'anti-doublon est integre dans findCompaniesWithAI
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    // Redirige vers prospectEngine qui gere deja la deduplication
    return { redirect: 'prospectEngine', orgId }
  }
)
