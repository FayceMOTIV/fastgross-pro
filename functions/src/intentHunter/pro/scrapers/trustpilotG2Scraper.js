/**
 * Trustpilot & G2 Scraper — Intent Hunter Pro
 *
 * Scrapes 1-2 star reviews on competitor products from Trustpilot and G2.
 * Unhappy competitor customers are the highest-intent leads —
 * they are actively looking for alternatives.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 8 req/min
 *
 * @module intentHunter/pro/scrapers/trustpilotG2Scraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const TRUSTPILOT_ACTOR_ID = 'apify~trustpilot-scraper'
const G2_ACTOR_ID = 'apify~g2-scraper'

const RATE_LIMIT_MS = 7500 // ~8 req/min
const MAX_REVIEW_RATING = 2 // Only 1-2 star reviews

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

/** Switching intent patterns found in negative reviews */
const SWITCHING_SIGNALS = [
  'alternative', 'changer', 'quitter', 'migrer', 'passer a',
  'cherche autre', 'en ai marre', 'decu', 'arnaque',
  'switch', 'looking for', 'moved to', 'leaving',
  'terrible', 'worst', 'horrible', 'scam', 'avoid',
  'ne recommande pas', 'a fuir', 'regret'
]

const PAIN_POINT_PATTERNS = [
  'bug', 'plante', 'crash', 'lent', 'indisponible',
  'support inexistant', 'pas de reponse', 'service client',
  'trop cher', 'augmentation prix', 'cache', 'opaque',
  'complique', 'pas intuitif', 'difficile', 'interface'
]

/**
 * Analyze switching intent in negative review
 * @param {string} text - Review text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, hasSwitchingIntent: boolean, painPoints: Array<string>, signal: string }}
 */
const analyzeReviewIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const switchingMatches = SWITCHING_SIGNALS.filter((s) => lower.includes(s))
  const painMatches = PAIN_POINT_PATTERNS.filter((p) => lower.includes(p))

  const hasSwitchingIntent = switchingMatches.length > 0

  const parts = []
  if (hasSwitchingIntent) parts.push(`Intent de switch: ${switchingMatches.slice(0, 3).join(', ')}`)
  if (painMatches.length > 0) parts.push(`Pain points: ${painMatches.slice(0, 3).join(', ')}`)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)

  return {
    matchCount: matchedKeywords.length + switchingMatches.length + painMatches.length,
    hasSwitchingIntent,
    painPoints: painMatches,
    signal: parts.join(' — ') || 'Avis negatif concurrent'
  }
}

/**
 * Extract name parts from reviewer name
 * @param {string} name
 * @returns {{ firstName: string|null, lastName: string|null }}
 */
const parseName = (name) => {
  if (!name) return { firstName: null, lastName: null }
  const parts = name.trim().split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  }
}

/**
 * Scrape Trustpilot reviews for a competitor
 * @param {string} competitorSlug - Trustpilot URL slug
 * @param {number} maxReviews - Max reviews to fetch
 * @returns {Promise<Array>} Review items
 */
const scrapeTrustpilot = async (competitorSlug, maxReviews) => {
  const items = await runActor(TRUSTPILOT_ACTOR_ID, {
    startUrls: [{ url: `https://www.trustpilot.com/review/${competitorSlug}` }],
    maxItems: maxReviews,
    filterByStars: '1,2'
  })
  return items.map((item) => ({
    ...item,
    _platform: 'trustpilot',
    _competitorSlug: competitorSlug
  }))
}

/**
 * Scrape G2 reviews for a competitor
 * @param {string} competitorSlug - G2 URL slug
 * @param {number} maxReviews - Max reviews to fetch
 * @returns {Promise<Array>} Review items
 */
const scrapeG2 = async (competitorSlug, maxReviews) => {
  const items = await runActor(G2_ACTOR_ID, {
    startUrls: [{ url: `https://www.g2.com/products/${competitorSlug}/reviews` }],
    maxItems: maxReviews,
    filterByStars: '1,2'
  })
  return items.map((item) => ({
    ...item,
    _platform: 'g2',
    _competitorSlug: competitorSlug
  }))
}

/**
 * Scrape Trustpilot and G2 for unhappy competitor customers
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to match in reviews
 * @param {number} [config.maxResults=30] - Max total results
 * @param {Array<object>} config.competitors - Competitor definitions
 * @param {string} config.competitors[].name - Competitor display name
 * @param {string} [config.competitors[].trustpilot] - Trustpilot URL slug
 * @param {string} [config.competitors[].g2] - G2 URL slug
 * @returns {Promise<Array>} Standardized leads with competitorName
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 30, competitors = [] } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'trustpilot_g2_scraper_start',
    clientId,
    keywords,
    maxResults,
    competitorCount: competitors.length,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'trustpilot_g2_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  if (competitors.length === 0) {
    console.log(JSON.stringify({
      event: 'trustpilot_g2_scraper_skip',
      reason: 'No competitors provided in config',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const reviewsPerCompetitor = Math.ceil(maxResults / competitors.length)

    for (const competitor of competitors) {
      if (leads.length >= maxResults) break

      try {
        let reviews = []

        if (competitor.trustpilot) {
          try {
            const tpReviews = await scrapeTrustpilot(competitor.trustpilot, reviewsPerCompetitor)
            reviews = reviews.concat(tpReviews)
            await sleepWithJitter(RATE_LIMIT_MS)
          } catch (tpError) {
            console.log(JSON.stringify({
              event: 'trustpilot_g2_scraper_trustpilot_error',
              competitor: competitor.name,
              error: tpError.message,
              timestamp: Date.now()
            }))
          }
        }

        if (competitor.g2) {
          try {
            const g2Reviews = await scrapeG2(competitor.g2, reviewsPerCompetitor)
            reviews = reviews.concat(g2Reviews)
            await sleepWithJitter(RATE_LIMIT_MS)
          } catch (g2Error) {
            console.log(JSON.stringify({
              event: 'trustpilot_g2_scraper_g2_error',
              competitor: competitor.name,
              error: g2Error.message,
              timestamp: Date.now()
            }))
          }
        }

        const negativeReviews = reviews.filter((r) => {
          const rating = r.rating || r.stars || r.score || 5
          return rating <= MAX_REVIEW_RATING
        })

        for (const review of negativeReviews) {
          if (leads.length >= maxResults) break

          try {
            const reviewText = review.text || review.body || review.content || review.title || ''
            const intent = analyzeReviewIntent(reviewText, keywords)
            const name = parseName(review.authorName || review.reviewer || review.name || null)
            const platform = review._platform || 'trustpilot'

            const reviewUrl = platform === 'g2'
              ? `https://www.g2.com/products/${review._competitorSlug}/reviews`
              : review.url || `https://www.trustpilot.com/review/${review._competitorSlug}`

            leads.push({
              source: `review_${platform}`,
              sourceUrl: reviewUrl,
              sourcePublicStatement: reviewText.slice(0, 500),
              platform,
              firstName: name.firstName,
              lastName: name.lastName,
              email: null,
              phone: null,
              company: review.companyName || review.company || null,
              linkedinUrl: null,
              nativeContactId: review.authorId || review.reviewerId || name.firstName || null,
              intentSignal: intent.signal,
              intentKeywordsCount: intent.matchCount,
              urgencyDetected: intent.hasSwitchingIntent,
              budgetMentioned: false,
              competitorName: competitor.name,
              competitorRating: review.rating || review.stars || review.score || null,
              postedAt: review.date
                ? new Date(review.date).getTime()
                : review.createdAt
                  ? new Date(review.createdAt).getTime()
                  : Date.now(),
              rawData: {
                platform,
                competitorSlug: review._competitorSlug,
                rating: review.rating || review.stars || review.score || null,
                title: review.title || null,
                hasSwitchingIntent: intent.hasSwitchingIntent,
                painPoints: intent.painPoints,
                reviewerLocation: review.location || review.country || null,
                isVerified: review.verified || review.isVerified || false
              }
            })
          } catch (reviewError) {
            console.log(JSON.stringify({
              event: 'trustpilot_g2_scraper_review_error',
              competitor: competitor.name,
              error: reviewError.message,
              timestamp: Date.now()
            }))
          }
        }
      } catch (compError) {
        console.log(JSON.stringify({
          event: 'trustpilot_g2_scraper_competitor_error',
          competitor: competitor.name,
          error: compError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'trustpilot_g2_scraper_complete',
      clientId,
      leadsFound: leads.length,
      competitorsScanned: competitors.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'trustpilot_g2_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
