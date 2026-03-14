/**
 * PhantomBuster Hunter
 * Automated scraping orchestrator using PhantomBuster cloud phantoms
 *
 * PhantomBuster provides pre-built scrapers ("phantoms") for:
 * - LinkedIn Profile Scraper
 * - LinkedIn Search Export
 * - Instagram Profile Scraper
 * - Google Maps Scraper
 * - Facebook Page Scraper
 *
 * Free tier: 14-day trial, then ~$69/month for 5 phantoms
 * API: https://api.phantombuster.com/api/v2
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../../ai/callAI.js'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const PHANTOM_API_KEY = process.env.PHANTOMBUSTER_API_KEY || ''
const BASE_URL = 'https://api.phantombuster.com/api/v2'

/**
 * Launch a PhantomBuster phantom and retrieve results
 */
async function launchPhantom(phantomId, args = {}) {
  if (!PHANTOM_API_KEY) {
    console.warn('PhantomBuster API key not configured, using mock data')
    return getMockPhantomResults(args)
  }

  try {
    // Launch the phantom
    const launchResponse = await fetch(`${BASE_URL}/agents/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Phantombuster-Key': PHANTOM_API_KEY
      },
      body: JSON.stringify({
        id: phantomId,
        argument: args
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!launchResponse.ok) {
      const err = await launchResponse.json().catch(() => ({}))
      throw new Error(err.error || `PhantomBuster launch error: ${launchResponse.status}`)
    }

    const launchData = await launchResponse.json()
    const containerId = launchData.containerId

    // Poll for results (max 60s, check every 5s)
    for (let i = 0; i < 12; i++) {
      await sleep(5000)

      const statusResponse = await fetch(`${BASE_URL}/agents/fetch-output?id=${phantomId}`, {
        method: 'GET',
        headers: { 'X-Phantombuster-Key': PHANTOM_API_KEY },
        signal: AbortSignal.timeout(15000)
      })

      if (!statusResponse.ok) continue

      const statusData = await statusResponse.json()

      if (statusData.status === 'finished') {
        // Fetch the result CSV/JSON
        if (statusData.output) {
          return parsePhantomOutput(statusData.output)
        }
        // Try fetching result object
        if (statusData.resultObject) {
          return JSON.parse(statusData.resultObject)
        }
        return []
      }

      if (statusData.status === 'error') {
        throw new Error(`Phantom execution failed: ${statusData.output || 'unknown error'}`)
      }
    }

    throw new Error('PhantomBuster timeout: phantom did not complete within 60s')

  } catch (error) {
    console.error('[PhantomBuster] Error:', error.message)
    throw error
  }
}

/**
 * Parse PhantomBuster output (JSON lines or array)
 */
function parsePhantomOutput(output) {
  if (typeof output !== 'string') return output

  // Try JSON array
  try {
    return JSON.parse(output)
  } catch {
    // Try JSON lines
    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) } catch { return null }
      })
      .filter(Boolean)
  }
}

/**
 * Scrape Google Maps businesses using PhantomBuster phantom
 */
export async function scrapeGoogleMaps(query, location, phantomId) {
  const results = await launchPhantom(phantomId, {
    searchUrl: `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + location)}`,
    numberOfResults: 20
  })

  return results.map(r => ({
    businessName: r.name || r.title || '',
    address: r.address || r.location || '',
    phone: r.phone || r.phoneNumber || '',
    website: r.website || r.url || '',
    rating: parseFloat(r.rating) || null,
    reviewCount: parseInt(r.reviewCount || r.reviews) || 0,
    category: r.category || r.type || '',
    email: r.email || '',
    source: 'phantombuster_maps'
  }))
}

/**
 * Scrape Instagram profiles using PhantomBuster phantom
 */
export async function scrapeInstagramProfiles(usernames, phantomId) {
  const results = await launchPhantom(phantomId, {
    profileUrls: usernames.map(u => `https://instagram.com/${u}`)
  })

  return results.map(r => ({
    username: r.profileUrl?.split('/').pop() || r.username || '',
    fullName: r.fullName || r.name || '',
    bio: r.biography || r.bio || '',
    followers: parseInt(r.followersCount || r.followers) || 0,
    following: parseInt(r.followingCount || r.following) || 0,
    posts: parseInt(r.postsCount || r.posts) || 0,
    email: r.email || extractEmailFromBio(r.biography || r.bio || ''),
    website: r.externalUrl || r.website || '',
    isVerified: r.verified || false,
    isBusiness: r.isBusinessAccount || r.isBusiness || false,
    category: r.businessCategory || r.category || '',
    source: 'phantombuster_instagram'
  }))
}

/**
 * Scrape LinkedIn profiles using PhantomBuster phantom
 */
export async function scrapeLinkedInProfiles(urls, phantomId) {
  const results = await launchPhantom(phantomId, {
    profileUrls: urls
  })

  return results.map(r => ({
    fullName: r.fullName || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
    firstName: r.firstName || '',
    lastName: r.lastName || '',
    headline: r.headline || r.title || '',
    company: r.companyName || r.company || '',
    location: r.location || '',
    email: r.email || '',
    phone: r.phone || '',
    linkedinUrl: r.linkedInProfileUrl || r.profileUrl || '',
    connectionDegree: r.connectionDegree || '',
    source: 'phantombuster_linkedin'
  }))
}

/**
 * Extract email from Instagram bio text
 */
function extractEmailFromBio(bio) {
  if (!bio) return ''
  const match = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  return match ? match[0].toLowerCase() : ''
}

/**
 * Cloud Function: Run a PhantomBuster scraping job
 */
export const runPhantomScrape = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '1GiB',
  timeoutSeconds: 120
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated')

  const { orgId, type, phantomId, query, location, targets } = data
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId is required')
  if (!type) throw new HttpsError('invalid-argument', 'type is required (maps, instagram, linkedin)')

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  const stats = { scraped: 0, qualified: 0, saved: 0 }

  try {
    let results = []

    switch (type) {
      case 'maps':
        results = await scrapeGoogleMaps(query || 'agence marketing', location || 'Paris', phantomId)
        break
      case 'instagram':
        results = await scrapeInstagramProfiles(targets || [], phantomId)
        break
      case 'linkedin':
        results = await scrapeLinkedInProfiles(targets || [], phantomId)
        break
      default:
        throw new HttpsError('invalid-argument', `Unknown scrape type: ${type}`)
    }

    stats.scraped = results.length

    // Qualify and save each result
    const icpSnapshot = await db
      .collection('organizations').doc(orgId)
      .collection('settings').doc('icp')
      .get()
    const icp = icpSnapshot.exists ? icpSnapshot.data() : {}

    for (const result of results) {
      const qualification = await qualifyPhantomProspect(result, icp, type)
      if (qualification.score >= 60) {
        stats.qualified++
        await savePhantomProspect(db, orgId, result, qualification, type)
        stats.saved++
      }
    }

    // Log analytics
    await db.collection('organizations').doc(orgId).collection('analytics').doc('phantom_hunter').set({
      lastRun: FieldValue.serverTimestamp(),
      lastType: type,
      lastStats: stats,
      totalScraped: FieldValue.increment(stats.scraped),
      totalSaved: FieldValue.increment(stats.saved)
    }, { merge: true })

    return {
      success: true,
      message: `PhantomBuster ${type}: ${stats.scraped} scraped, ${stats.qualified} qualified, ${stats.saved} saved`,
      stats,
      results: results.slice(0, 10) // Return first 10 for preview
    }
  } catch (error) {
    console.error('PhantomBuster scrape failed:', error)
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: List available PhantomBuster agents
 */
export const listPhantoms = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated')

  if (!PHANTOM_API_KEY) {
    return { success: true, agents: [], message: 'PhantomBuster API key not configured' }
  }

  try {
    const response = await fetch(`${BASE_URL}/agents/fetch-all`, {
      method: 'GET',
      headers: { 'X-Phantombuster-Key': PHANTOM_API_KEY },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const agents = await response.json()

    return {
      success: true,
      agents: (agents || []).map(a => ({
        id: a.id,
        name: a.name,
        scriptName: a.scriptName,
        lastEndMessage: a.lastEndMessage,
        lastEndStatus: a.lastEndStatus,
        launchType: a.launchType
      }))
    }
  } catch (error) {
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Qualify prospect from PhantomBuster using AI
 */
async function qualifyPhantomProspect(prospect, icp, type) {
  try {
    const prompt = `Tu es un expert en qualification de prospects B2B. Score ce prospect (0-100).

PROSPECT (source: PhantomBuster ${type}):
${JSON.stringify(prospect, null, 2)}

ICP:
- Secteur: ${icp.industry || 'Tous'}
- Taille: ${icp.companySize || 'PME'}
- Mots-cles: ${icp.keywords?.join(', ') || 'business'}

Reponds UNIQUEMENT avec ce JSON:
{"score": <0-100>, "reason": "<raison>", "approach": "<approche>"}`

    const text = await callAI(prompt, 300)
    const analysis = extractJSON(text)
    if (!analysis) throw new Error('No JSON')

    return {
      score: Math.min(100, Math.max(0, analysis.score || 0)),
      reason: analysis.reason || 'Score IA',
      approach: analysis.approach || 'Approche standard'
    }
  } catch {
    // Heuristic fallback
    let score = 40
    if (prospect.email) score += 15
    if (prospect.phone) score += 10
    if (prospect.website) score += 10
    return { score, reason: 'Score heuristique', approach: 'Approche standard' }
  }
}

/**
 * Save PhantomBuster prospect to Firestore
 */
async function savePhantomProspect(db, orgId, prospect, qualification, type) {
  const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')

  // Dedup by email
  if (prospect.email) {
    const existing = await prospectsRef.where('email', '==', prospect.email).limit(1).get()
    if (!existing.empty) {
      await existing.docs[0].ref.update({
        phantomSource: type,
        platforms: FieldValue.arrayUnion(`phantom_${type}`),
        updatedAt: FieldValue.serverTimestamp()
      })
      return 'merged'
    }
  }

  await prospectsRef.add({
    source: `phantom_${type}`,
    platform: `phantom_${type}`,
    fullName: prospect.fullName || prospect.businessName || prospect.username || '',
    businessName: prospect.businessName || prospect.company || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    websiteUrl: prospect.website || '',
    address: prospect.address || '',
    linkedinUrl: prospect.linkedinUrl || '',
    bio: prospect.bio || prospect.headline || prospect.category || '',
    isBusiness: true,
    platforms: [`phantom_${type}`],
    phantomSource: type,
    score: qualification.score,
    qualificationReason: qualification.reason,
    suggestedApproach: qualification.approach,
    status: 'new',
    hunterStatus: 'qualified',
    scannedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  })

  return 'saved'
}

/**
 * Mock PhantomBuster results for testing
 */
function getMockPhantomResults(args) {
  return [
    {
      name: 'Agence Digitale Paris',
      address: '10 Rue de la Paix, 75002 Paris',
      phone: '+33142360001',
      website: 'https://agence-digitale-paris.fr',
      email: 'contact@agence-digitale-paris.fr',
      rating: '4.5',
      reviewCount: '89',
      category: 'Agence de marketing digital',
      fullName: 'Agence Digitale Paris',
      bio: 'Experts en marketing digital depuis 2015'
    },
    {
      name: 'Studio Web Lyon',
      address: '25 Cours Charlemagne, 69002 Lyon',
      phone: '+33478900002',
      website: 'https://studio-web-lyon.com',
      email: 'hello@studio-web-lyon.com',
      rating: '4.2',
      reviewCount: '45',
      category: 'Developpement web',
      fullName: 'Studio Web Lyon',
      bio: 'Creation de sites web et applications'
    },
    {
      name: 'Consulting Group Bordeaux',
      address: '5 Place des Quinconces, 33000 Bordeaux',
      phone: '',
      website: 'https://consulting-bordeaux.fr',
      email: 'info@consulting-bordeaux.fr',
      rating: '4.7',
      reviewCount: '156',
      category: 'Conseil en entreprise',
      fullName: 'Consulting Group Bordeaux',
      bio: 'Conseil strategique pour PME'
    }
  ]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
