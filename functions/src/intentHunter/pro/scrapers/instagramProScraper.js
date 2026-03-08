/**
 * Instagram Pro Scraper — Intent Hunter Pro
 *
 * Searches Instagram business hashtags for B2B intent signals via Apify.
 * Targets business-related hashtags where professionals share needs,
 * showcase projects, or request services.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 6 req/min
 *
 * @module intentHunter/pro/scrapers/instagramProScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~instagram-hashtag-scraper'

const RATE_LIMIT_MS = 10000 // ~6 req/min

/** Default B2B hashtags to monitor */
const DEFAULT_HASHTAGS = [
  'entrepreneurfrance', 'startupfrance', 'businessfrance',
  'freelancefrance', 'pme', 'tpe', 'marketingdigital',
  'agencemarketing', 'saas', 'b2bfrance'
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

/** Business signals in Instagram captions */
const BUSINESS_SIGNALS = [
  'cherche prestataire', 'besoin agence', 'recherche freelance',
  'qui peut m\'aider', 'recommandation', 'collaboration',
  'appel a candidatures', 'recrutement', 'partenariat',
  'lancement', 'nouveau projet', 'ouverture'
]

const URGENCY_PATTERNS = [
  'urgent', 'rapidement', 'asap', 'des que possible',
  'cette semaine', 'au plus vite'
]

const BUDGET_PATTERNS = [
  'budget', 'tarif', 'devis', 'prix', 'investissement',
  'financement', 'levee'
]

/**
 * Analyze B2B intent in Instagram caption
 * @param {string} text - Caption text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedSignals = BUSINESS_SIGNALS.filter((s) => lower.includes(s))

  const urgency = URGENCY_PATTERNS.some((p) => lower.includes(p))
  const budget = BUDGET_PATTERNS.some((p) => lower.includes(p))

  const parts = []
  if (matchedSignals.length > 0) parts.push(`Signal business: ${matchedSignals.slice(0, 2).join(', ')}`)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)
  if (urgency) parts.push('[URGENT]')
  if (budget) parts.push('[BUDGET]')

  return {
    matchCount: matchedKeywords.length + matchedSignals.length,
    urgency,
    budget,
    signal: parts.join(' — ')
  }
}

/**
 * Check if an Instagram account looks like a business profile
 * @param {object} item - Apify result item
 * @returns {boolean}
 */
const isBusinessProfile = (item) => {
  const bio = (item.ownerBio || item.biography || '').toLowerCase()
  const businessIndicators = [
    'ceo', 'founder', 'co-founder', 'directeur', 'gerant',
    'agence', 'consultant', 'freelance', 'entrepreneur',
    'saas', 'startup', '@', 'www.', '.fr', '.com'
  ]
  return businessIndicators.some((ind) => bio.includes(ind))
}

/**
 * Scrape Instagram business hashtags for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.hashtags] - Override default hashtags
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, hashtags = DEFAULT_HASHTAGS } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'instagram_pro_scraper_start',
    clientId,
    keywords,
    maxResults,
    hashtagCount: hashtags.length,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'instagram_pro_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const items = await runActor(ACTOR_ID, {
      hashtags,
      resultsLimit: Math.min(maxResults * 2, 100),
      resultsType: 'posts'
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const caption = item.caption || item.text || item.description || ''
        const intent = analyzeIntent(caption, keywords)

        if (intent.matchCount === 0) continue

        const isBusiness = isBusinessProfile(item)
        const username = item.ownerUsername || item.username || null

        leads.push({
          source: 'instagram_hashtag',
          sourceUrl: item.url || item.postUrl
            || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : 'https://www.instagram.com'),
          sourcePublicStatement: caption.slice(0, 500),
          platform: 'instagram',
          firstName: item.ownerFullName?.split(' ')[0] || null,
          lastName: item.ownerFullName?.split(' ').slice(1).join(' ') || null,
          email: null,
          phone: null,
          company: isBusiness ? (item.ownerFullName || username) : null,
          linkedinUrl: null,
          nativeContactId: username || item.ownerId || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: intent.budget,
          postedAt: item.timestamp
            ? new Date(item.timestamp).getTime()
            : Date.now(),
          rawData: {
            username,
            likes: item.likesCount || item.likes || 0,
            comments: item.commentsCount || item.comments || 0,
            hashtags: item.hashtags || [],
            isBusinessProfile: isBusiness,
            shortCode: item.shortCode || null,
            ownerBio: (item.ownerBio || '').slice(0, 200)
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'instagram_pro_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'instagram_pro_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'instagram_pro_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
