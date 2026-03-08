/**
 * Twitter/X Scraper — Intent Hunter Pro
 *
 * Searches tweets via Twitter API v2 for B2B intent signals
 * in French-speaking contexts. Focuses on recent tweets matching
 * client keywords that indicate buying intent.
 *
 * Auth: TWITTER_BEARER_TOKEN
 * Rate limit: 30 req/min (450 req/15min on Basic tier)
 * API: Twitter API v2 — /tweets/search/recent
 *
 * @module intentHunter/pro/scrapers/twitterScraper
 */

import axios from 'axios'

const TWITTER_SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent'
const RATE_LIMIT_MS = 2100 // ~28 req/min to stay safe under 30

/** French B2B hashtags and terms to boost relevance */
const B2B_BOOSTERS = [
  '#startup', '#SaaS', '#B2B', '#entrepreneur', '#PME',
  '#marketing', '#digital', '#croissance', '#business'
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
 * Search Twitter API v2 for recent tweets
 * @param {string} bearerToken - Twitter Bearer token
 * @param {string} query - Search query
 * @param {number} maxResults - Max results per request (10-100)
 * @param {string|null} nextToken - Pagination token
 * @returns {Promise<{ tweets: Array, nextToken: string|null }>}
 */
const searchTweets = async (bearerToken, query, maxResults, nextToken) => {
  const params = {
    query,
    max_results: Math.min(Math.max(maxResults, 10), 100),
    'tweet.fields': 'created_at,author_id,public_metrics,entities,lang',
    'user.fields': 'name,username,description,location,public_metrics,url',
    expansions: 'author_id'
  }

  if (nextToken) {
    params.next_token = nextToken
  }

  const response = await axios.get(TWITTER_SEARCH_URL, {
    params,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'User-Agent': 'FMF-IntentHunter/1.0'
    },
    timeout: 10000
  })

  const data = response.data || {}
  const tweets = data.data || []
  const users = data.includes?.users || []

  const userMap = new Map()
  for (const user of users) {
    userMap.set(user.id, user)
  }

  const enrichedTweets = tweets.map((tweet) => ({
    ...tweet,
    author: userMap.get(tweet.author_id) || null
  }))

  return {
    tweets: enrichedTweets,
    nextToken: data.meta?.next_token || null
  }
}

/**
 * Detect intent signals in tweet text
 * @param {string} text - Tweet text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'urgent', 'rapidement', 'asap', 'des que possible',
    'tout de suite', 'immediatement', 'besoin maintenant',
    'cherche en urgence', 'qui connait un'
  ]
  const budgetPatterns = [
    'budget', 'euros', 'tarif', 'devis', 'prix',
    'combien', 'cout', 'investir', 'payer', 'facturer'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Tweet B2B detecte — mots-cles: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Parse author name into first/last
 * @param {string|null} name
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
 * Scrape Twitter for B2B intent signals matching client keywords
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {string} [config.lang='fr'] - Language filter
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, lang = 'fr' } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'twitter_scraper_start',
    clientId,
    keywords,
    maxResults,
    lang,
    timestamp: Date.now()
  }))

  const bearerToken = process.env.TWITTER_BEARER_TOKEN || ''

  if (!bearerToken) {
    console.log(JSON.stringify({
      event: 'twitter_scraper_skip',
      reason: 'Missing TWITTER_BEARER_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    // Build query: keywords OR'd, filtered to language, excluding retweets
    const keywordQuery = keywords.map((kw) => `"${kw}"`).join(' OR ')
    const query = `(${keywordQuery}) lang:${lang} -is:retweet`

    let nextToken = null
    const perPage = Math.min(maxResults, 100)

    for (let page = 0; page < 5 && leads.length < maxResults; page++) {
      try {
        const result = await searchTweets(bearerToken, query, perPage, nextToken)

        for (const tweet of result.tweets) {
          if (leads.length >= maxResults) break

          const intent = analyzeIntent(tweet.text, keywords)
          if (intent.matchCount === 0) continue

          const author = tweet.author || {}
          const name = parseName(author.name)
          const metrics = tweet.public_metrics || {}

          leads.push({
            source: 'twitter',
            sourceUrl: `https://twitter.com/${author.username || 'i'}/status/${tweet.id}`,
            sourcePublicStatement: (tweet.text || '').slice(0, 500),
            platform: 'twitter',
            firstName: name.firstName,
            lastName: name.lastName,
            email: null,
            phone: null,
            company: null,
            linkedinUrl: null,
            nativeContactId: author.username || tweet.author_id || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            postedAt: tweet.created_at
              ? new Date(tweet.created_at).getTime()
              : Date.now(),
            rawData: {
              tweetId: tweet.id,
              authorId: tweet.author_id,
              username: author.username || null,
              authorBio: author.description || null,
              authorLocation: author.location || null,
              authorFollowers: author.public_metrics?.followers_count || 0,
              authorUrl: author.url || null,
              likeCount: metrics.like_count || 0,
              retweetCount: metrics.retweet_count || 0,
              replyCount: metrics.reply_count || 0,
              lang: tweet.lang || lang
            }
          })
        }

        nextToken = result.nextToken
        if (!nextToken) break

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'twitter_scraper_page_error',
          page,
          error: pageError.message,
          status: pageError.response?.status || null,
          timestamp: Date.now()
        }))
        if (pageError.response?.status === 429) break
      }
    }

    console.log(JSON.stringify({
      event: 'twitter_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'twitter_scraper_fatal_error',
      clientId,
      error: error.message,
      status: error.response?.status || null,
      timestamp: Date.now()
    }))
    return []
  }
}
