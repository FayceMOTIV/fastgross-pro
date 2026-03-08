/**
 * Facebook Pro Scraper — Intent Hunter Pro
 *
 * Scrapes Facebook group posts for B2B intent signals via Apify.
 * Targets French business groups where professionals ask for recommendations,
 * share pain points, or request service providers.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 10 req/min
 *
 * @module intentHunter/pro/scrapers/facebookProScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~facebook-groups-scraper'

const RATE_LIMIT_MS = 6000 // ~10 req/min

/** Default French B2B groups to monitor */
const DEFAULT_GROUP_URLS = [
  'https://www.facebook.com/groups/entrepreneursfrance',
  'https://www.facebook.com/groups/startupfrancaise',
  'https://www.facebook.com/groups/freelancesfrance',
  'https://www.facebook.com/groups/marketingdigitalfrance',
  'https://www.facebook.com/groups/pmefrance'
]

/**
 * Sleep with jitter to avoid thundering herd
 * @param {number} baseMs - Base delay in ms
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Run an Apify actor and wait for results
 * @param {string} actorId - Apify actor ID
 * @param {object} input - Actor input payload
 * @returns {Promise<Array>} Dataset items
 */
const runActor = async (actorId, input) => {
  const response = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { timeout: 120000 }
  )
  const runId = response.data?.data?.id
  if (!runId) throw new Error('No run ID returned')

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    if (statusRes.data?.data?.status === 'SUCCEEDED') {
      const datasetId = statusRes.data?.data?.defaultDatasetId
      const itemsRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
      )
      return itemsRes.data || []
    }
    if (statusRes.data?.data?.status === 'FAILED') throw new Error('Actor run failed')
  }
  throw new Error('Actor run timeout')
}

/** B2B request patterns indicating buying intent */
const REQUEST_PATTERNS = [
  'cherche un', 'cherche une', 'qui connait', 'recommandation',
  'vous conseillez', 'besoin de', 'quelqu\'un connait',
  'recherche prestataire', 'recherche agence', 'avez-vous',
  'quel outil', 'quelle solution', 'comparatif'
]

const URGENCY_PATTERNS = [
  'urgent', 'rapidement', 'des que possible', 'cette semaine',
  'au plus vite', 'asap', 'immediatement'
]

const BUDGET_PATTERNS = [
  'budget', 'tarif', 'prix', 'devis', 'combien', 'euros',
  'investir', 'cout', 'gratuit'
]

/**
 * Analyze B2B intent in Facebook group post
 * @param {string} text - Post content
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, isRequest: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const requestMatch = REQUEST_PATTERNS.filter((p) => lower.includes(p))

  const urgency = URGENCY_PATTERNS.some((p) => lower.includes(p))
  const budget = BUDGET_PATTERNS.some((p) => lower.includes(p))
  const isRequest = requestMatch.length > 0

  const parts = []
  if (isRequest) parts.push(`Demande detectee: ${requestMatch.slice(0, 2).join(', ')}`)
  if (matched.length > 0) parts.push(`Mots-cles: ${matched.join(', ')}`)
  if (urgency) parts.push('[URGENT]')
  if (budget) parts.push('[BUDGET]')

  return {
    matchCount: matched.length + requestMatch.length,
    urgency,
    budget,
    isRequest,
    signal: parts.join(' — ')
  }
}

/**
 * Extract name parts from full name string
 * @param {string} fullName
 * @returns {{ firstName: string|null, lastName: string|null }}
 */
const parseName = (fullName) => {
  if (!fullName) return { firstName: null, lastName: null }
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  }
}

/**
 * Scrape Facebook groups for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.groupUrls] - Override default group URLs
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, groupUrls = DEFAULT_GROUP_URLS } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'facebook_pro_scraper_start',
    clientId,
    keywords,
    maxResults,
    groupCount: groupUrls.length,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'facebook_pro_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const items = await runActor(ACTOR_ID, {
      startUrls: groupUrls.map((url) => ({ url })),
      maxPosts: Math.min(maxResults * 2, 100),
      maxPostComments: 0,
      resultsType: 'posts'
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const postText = item.text || item.message || item.description || ''
        const intent = analyzeIntent(postText, keywords)

        if (intent.matchCount === 0) continue

        const name = parseName(item.authorName || item.user?.name || null)

        leads.push({
          source: 'facebook_group',
          sourceUrl: item.postUrl || item.url || 'https://www.facebook.com',
          sourcePublicStatement: postText.slice(0, 500),
          platform: 'facebook',
          firstName: name.firstName,
          lastName: name.lastName,
          email: null,
          phone: null,
          company: null,
          linkedinUrl: null,
          nativeContactId: item.authorId || item.userId || item.user?.id || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: intent.budget,
          postedAt: item.time
            ? new Date(item.time).getTime()
            : item.timestamp || Date.now(),
          rawData: {
            groupName: item.groupName || item.group?.name || null,
            groupUrl: item.groupUrl || null,
            likes: item.likes || item.reactions || 0,
            comments: item.commentsCount || item.comments || 0,
            shares: item.shares || 0,
            isRequest: intent.isRequest,
            postId: item.id || item.postId || null
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'facebook_pro_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'facebook_pro_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'facebook_pro_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
