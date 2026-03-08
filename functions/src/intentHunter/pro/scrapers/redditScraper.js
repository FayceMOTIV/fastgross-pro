/**
 * Reddit Scraper — Intent Hunter Pro
 *
 * Searches French-speaking subreddits for posts matching client keywords.
 * Uses Reddit OAuth2 API (script-type app credentials).
 *
 * Rate limit: 60 req/min (Reddit API hard limit)
 * Auth: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 *
 * @module intentHunter/pro/scrapers/redditScraper
 */

import axios from 'axios'

const SUBREDDITS = [
  'france', 'entrepreneurFR', 'freelance', 'PME',
  'marketing', 'webdev', 'informatique'
]

const RATE_LIMIT_MS = 1100 // ~55 req/min to stay safe under 60
const MAX_RETRIES = 2

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
 * Authenticate with Reddit OAuth2 (script app flow)
 * @returns {Promise<string>} Bearer access token
 */
const authenticate = async () => {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD } = process.env

  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new Error('Missing Reddit API credentials')
  }

  const response = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    new URLSearchParams({
      grant_type: 'password',
      username: REDDIT_USERNAME || '',
      password: REDDIT_PASSWORD || ''
    }),
    {
      auth: { username: REDDIT_CLIENT_ID, password: REDDIT_CLIENT_SECRET },
      headers: { 'User-Agent': 'FMF-IntentHunter/1.0' }
    }
  )

  return response.data.access_token
}

/**
 * Search a single subreddit for matching posts
 * @param {string} token - Reddit access token
 * @param {string} subreddit - Subreddit name (without r/)
 * @param {string} query - Search query string
 * @param {number} limit - Max results per subreddit
 * @returns {Promise<Array>} Raw Reddit post objects
 */
const searchSubreddit = async (token, subreddit, query, limit) => {
  const response = await axios.get(
    `https://oauth.reddit.com/r/${subreddit}/search.json`,
    {
      params: { q: query, restrict_sr: true, sort: 'new', limit, t: 'week' },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'FMF-IntentHunter/1.0'
      },
      timeout: 10000
    }
  )

  return response.data?.data?.children?.map((c) => c.data) || []
}

/**
 * Detect intent signals in post text
 * @param {string} text - Post title + body
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = text.toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = ['urgent', 'rapidement', 'asap', 'des que possible', 'tout de suite', 'immediatement']
  const budgetPatterns = ['budget', 'euros', 'tarif', 'devis', 'prix', 'combien', 'cout']

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Mots-cles detectes: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Scrape Reddit for intent signals matching client keywords
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.subreddits] - Override default subreddits
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, subreddits = SUBREDDITS } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'reddit_scraper_start',
    clientId,
    keywords,
    subreddits,
    maxResults,
    timestamp: Date.now()
  }))

  try {
    const token = await authenticate()
    const query = keywords.join(' OR ')
    const perSubreddit = Math.ceil(maxResults / subreddits.length)

    for (const sub of subreddits) {
      if (leads.length >= maxResults) break

      try {
        const posts = await searchSubreddit(token, sub, query, perSubreddit)

        for (const post of posts) {
          if (leads.length >= maxResults) break

          const fullText = `${post.title || ''} ${post.selftext || ''}`
          const intent = analyzeIntent(fullText, keywords)

          if (intent.matchCount === 0) continue

          leads.push({
            source: 'reddit',
            sourceUrl: `https://www.reddit.com${post.permalink}`,
            sourcePublicStatement: fullText.slice(0, 500),
            platform: 'reddit',
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            company: null,
            linkedinUrl: null,
            nativeContactId: post.author || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            postedAt: (post.created_utc || 0) * 1000,
            rawData: {
              subreddit: sub,
              score: post.score,
              numComments: post.num_comments,
              id: post.id
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (subError) {
        console.log(JSON.stringify({
          event: 'reddit_scraper_subreddit_error',
          subreddit: sub,
          error: subError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'reddit_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'reddit_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
