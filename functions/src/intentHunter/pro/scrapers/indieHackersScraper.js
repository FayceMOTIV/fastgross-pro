/**
 * IndieHackers Scraper — Intent Hunter Pro
 *
 * Scrapes IndieHackers posts via Apify to find indie makers discussing
 * tools, services, and business needs. IndieHackers is a high-quality
 * source for B2B leads — makers actively building and buying tools.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 10 req/min (Apify Actor execution rate)
 * API: Apify API — runs a web scraper actor on indiehackers.com
 *
 * @module intentHunter/pro/scrapers/indieHackersScraper
 */

import axios from 'axios'

const APIFY_API_URL = 'https://api.apify.com/v2'
const RATE_LIMIT_MS = 6500 // ~9 req/min to stay safe under 10

/** Apify generic web scraper actor ID */
const WEB_SCRAPER_ACTOR_ID = 'apify~web-scraper'

/** IndieHackers search URL template */
const IH_SEARCH_URL = 'https://www.indiehackers.com/search'

/** Max wait time for Apify actor run (ms) */
const MAX_WAIT_MS = 120000

/** Poll interval for actor status (ms) */
const POLL_INTERVAL_MS = 5000

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
 * Start an Apify actor run to scrape IndieHackers
 * @param {string} token - Apify API token
 * @param {Array<string>} keywords - Keywords to search
 * @param {number} maxItems - Max items to scrape
 * @returns {Promise<string>} Run ID
 */
const startActorRun = async (token, keywords, maxItems) => {
  const searchUrls = keywords.map((kw) =>
    `${IH_SEARCH_URL}?q=${encodeURIComponent(kw)}`
  )

  const input = {
    startUrls: searchUrls.map((url) => ({ url })),
    pageFunction: `
      async function pageFunction(context) {
        const { $, request, log } = context;
        const results = [];

        // Parse search results page
        $('article, .feed-item, [class*="post"], [class*="result"]').each((i, el) => {
          const $el = $(el);
          const title = $el.find('h2, h3, [class*="title"]').first().text().trim();
          const body = $el.find('p, [class*="body"], [class*="content"], [class*="description"]').first().text().trim();
          const link = $el.find('a[href*="/post/"]').first().attr('href') || $el.find('a').first().attr('href') || '';
          const author = $el.find('[class*="author"], [class*="user"]').first().text().trim();
          const date = $el.find('time, [class*="date"], [class*="ago"]').first().attr('datetime') || $el.find('time, [class*="date"], [class*="ago"]').first().text().trim();
          const votes = parseInt($el.find('[class*="vote"], [class*="upvote"]').first().text().trim()) || 0;

          if (title || body) {
            results.push({
              title: title || '',
              body: body || '',
              url: link.startsWith('http') ? link : 'https://www.indiehackers.com' + link,
              author: author || '',
              date: date || '',
              votes
            });
          }
        });

        return results;
      }
    `,
    maxPagesPerCrawl: Math.min(keywords.length * 3, 20),
    maxResultsPerPage: Math.ceil(maxItems / keywords.length)
  }

  const response = await axios.post(
    `${APIFY_API_URL}/acts/${WEB_SCRAPER_ACTOR_ID}/runs`,
    input,
    {
      params: { token },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  )

  return response.data?.data?.id || null
}

/**
 * Wait for an Apify actor run to complete and get results
 * @param {string} token - Apify API token
 * @param {string} runId - Actor run ID
 * @returns {Promise<Array>} Scraped items
 */
const waitForResults = async (token, runId) => {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const statusResponse = await axios.get(
      `${APIFY_API_URL}/actor-runs/${runId}`,
      {
        params: { token },
        timeout: 10000
      }
    )

    const status = statusResponse.data?.data?.status
    if (status === 'SUCCEEDED') break
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${runId} ended with status: ${status}`)
    }

    await sleepWithJitter(POLL_INTERVAL_MS)
  }

  // Fetch dataset items
  const datasetResponse = await axios.get(
    `${APIFY_API_URL}/actor-runs/${runId}/dataset/items`,
    {
      params: { token, format: 'json' },
      timeout: 15000
    }
  )

  // Flatten nested arrays (pageFunction returns arrays per page)
  const rawItems = datasetResponse.data || []
  const items = []
  for (const item of rawItems) {
    if (Array.isArray(item)) {
      items.push(...item)
    } else {
      items.push(item)
    }
  }

  return items
}

/**
 * Detect intent signals in IndieHackers post
 * @param {string} text - Post title + body
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'looking for', 'need', 'recommend', 'alternative',
    'cherche', 'besoin', 'quel outil', 'help',
    'struggling', 'advice', 'suggestion', 'how do you'
  ]
  const budgetPatterns = [
    'budget', 'pricing', 'cost', 'revenue', 'mrr', 'arr',
    'paying', 'subscription', 'saas', 'b2b', 'plan',
    'tarif', 'euros', 'dollars', 'investment'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Post IndieHackers — mots-cles: ${matched.join(', ')}${urgency ? ' [BESOIN]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Parse author name
 * @param {string} authorStr - Author string from scraping
 * @returns {{ firstName: string|null, lastName: string|null }}
 */
const parseAuthor = (authorStr) => {
  if (!authorStr) return { firstName: null, lastName: null }
  const cleaned = authorStr.replace(/@/g, '').trim()
  const parts = cleaned.split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  }
}

/**
 * Scrape IndieHackers for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=30] - Max total results
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 30 } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'indiehackers_scraper_start',
    clientId,
    keywords,
    maxResults,
    timestamp: Date.now()
  }))

  const apiToken = process.env.APIFY_API_TOKEN || ''

  if (!apiToken) {
    console.log(JSON.stringify({
      event: 'indiehackers_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const runId = await startActorRun(apiToken, keywords, maxResults * 2)

    if (!runId) {
      console.log(JSON.stringify({
        event: 'indiehackers_scraper_error',
        reason: 'Failed to start Apify actor run',
        timestamp: Date.now()
      }))
      return []
    }

    console.log(JSON.stringify({
      event: 'indiehackers_scraper_run_started',
      runId,
      timestamp: Date.now()
    }))

    const items = await waitForResults(apiToken, runId)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const fullText = `${item.title || ''} ${item.body || ''}`
        const intent = analyzeIntent(fullText, keywords)
        if (intent.matchCount === 0) continue

        const author = parseAuthor(item.author)
        const postUrl = item.url || ''

        leads.push({
          source: 'indiehackers',
          sourceUrl: postUrl.startsWith('http')
            ? postUrl
            : `https://www.indiehackers.com${postUrl}`,
          sourcePublicStatement: fullText.slice(0, 500),
          platform: 'indiehackers',
          firstName: author.firstName,
          lastName: author.lastName,
          email: null,
          phone: null,
          company: null,
          linkedinUrl: null,
          nativeContactId: item.author || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: intent.budget,
          postedAt: item.date
            ? new Date(item.date).getTime() || Date.now()
            : Date.now(),
          rawData: {
            title: item.title || null,
            body: (item.body || '').slice(0, 1000),
            votes: item.votes || 0,
            author: item.author || null,
            apifyRunId: runId
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'indiehackers_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'indiehackers_scraper_complete',
      clientId,
      leadsFound: leads.length,
      totalItemsScraped: items.length,
      apifyRunId: runId,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'indiehackers_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
