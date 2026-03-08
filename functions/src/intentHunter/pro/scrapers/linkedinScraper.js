/**
 * LinkedIn Scraper — Intent Hunter Pro
 *
 * Searches LinkedIn posts matching client keywords via Apify actor.
 * Detects B2B intent signals from LinkedIn post content.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 5 req/min
 * Actor: apify/linkedin-scraper
 *
 * @module intentHunter/pro/scrapers/linkedinScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~linkedin-scraper'

const RATE_LIMIT_MS = 12000 // ~5 req/min

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

/** Intent patterns for LinkedIn B2B posts */
const URGENCY_PATTERNS = [
  'urgent', 'rapidement', 'asap', 'des que possible', 'immediatement',
  'recherche activement', 'besoin immediat', 'au plus vite'
]

const BUDGET_PATTERNS = [
  'budget', 'euros', 'tarif', 'devis', 'prix', 'combien', 'investir',
  'financement', 'levee de fonds', 'roi'
]

/**
 * Analyze intent signals in LinkedIn post text
 * @param {string} text - Post content
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgency = URGENCY_PATTERNS.some((p) => lower.includes(p))
  const budget = BUDGET_PATTERNS.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `LinkedIn: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
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
 * Scrape LinkedIn posts for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50 } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'linkedin_scraper_start',
    clientId,
    keywords,
    maxResults,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'linkedin_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const searchQuery = keywords.join(' OR ')

    const items = await runActor(ACTOR_ID, {
      searchKeyword: searchQuery,
      deepScrape: false,
      maxItems: Math.min(maxResults * 2, 100),
      searchType: 'posts'
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const postText = item.text || item.description || item.title || ''
        const intent = analyzeIntent(postText, keywords)

        if (intent.matchCount === 0) continue

        const name = parseName(item.authorName || item.name || null)
        const profileUrl = item.authorProfileUrl || item.profileUrl || item.url || null

        leads.push({
          source: 'linkedin',
          sourceUrl: item.postUrl || item.url || 'https://www.linkedin.com',
          sourcePublicStatement: postText.slice(0, 500),
          platform: 'linkedin',
          firstName: name.firstName,
          lastName: name.lastName,
          email: item.email || null,
          phone: item.phone || null,
          company: item.company || item.companyName || item.organization || null,
          linkedinUrl: profileUrl,
          nativeContactId: item.authorId || item.profileId || profileUrl || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: intent.budget,
          postedAt: item.postedAt
            ? new Date(item.postedAt).getTime()
            : item.timestamp || Date.now(),
          rawData: {
            likes: item.likes || item.numLikes || 0,
            comments: item.comments || item.numComments || 0,
            shares: item.shares || item.numShares || 0,
            authorHeadline: item.headline || item.authorHeadline || null,
            authorLocation: item.location || null,
            postId: item.id || item.postId || null
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'linkedin_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'linkedin_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'linkedin_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
