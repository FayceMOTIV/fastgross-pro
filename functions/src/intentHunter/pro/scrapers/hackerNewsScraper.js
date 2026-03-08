/**
 * Hacker News Scraper — Intent Hunter Pro
 *
 * Searches Hacker News stories and comments via the Algolia API
 * for B2B intent signals. Free API, no authentication required.
 * Targets "Ask HN", "Show HN", and comment threads discussing tools,
 * services, and vendor selection.
 *
 * API: https://hn.algolia.com/api/v1/search (free, no auth)
 * Rate limit: 30 req/min (10,000 req/hour on free tier)
 *
 * @module intentHunter/pro/scrapers/hackerNewsScraper
 */

import axios from 'axios'

const ALGOLIA_SEARCH_URL = 'https://hn.algolia.com/api/v1/search'
const ALGOLIA_SEARCH_BY_DATE_URL = 'https://hn.algolia.com/api/v1/search_by_date'
const RATE_LIMIT_MS = 2100 // ~28 req/min to stay safe under 30

/** Content types to search */
const SEARCH_TYPES = ['story', 'comment']

/** Tags that indicate high-intent Ask HN / Show HN posts */
const HIGH_INTENT_PREFIXES = [
  'ask hn:', 'ask hn', 'show hn:', 'show hn',
  'tell hn:', 'tell hn', 'who is hiring'
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
 * Search Hacker News Algolia API
 * @param {string} query - Search query
 * @param {string} type - Content type: 'story' or 'comment'
 * @param {number} hitsPerPage - Results per page
 * @param {number} page - Page number (0-indexed)
 * @param {number} [daysBack=7] - Number of days to look back
 * @returns {Promise<{ hits: Array, nbPages: number }>}
 */
const searchHN = async (query, type, hitsPerPage, page, daysBack = 7) => {
  const numericFilters = `created_at_i>${Math.floor((Date.now() - daysBack * 24 * 3600 * 1000) / 1000)}`

  const response = await axios.get(ALGOLIA_SEARCH_BY_DATE_URL, {
    params: {
      query,
      tags: type,
      hitsPerPage: Math.min(hitsPerPage, 50),
      page,
      numericFilters
    },
    timeout: 10000
  })

  return {
    hits: response.data?.hits || [],
    nbPages: response.data?.nbPages || 0
  }
}

/**
 * Detect intent signals in HN post/comment text
 * @param {string} text - Post title or comment text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string, isAskHN: boolean }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const isAskHN = HIGH_INTENT_PREFIXES.some((p) => lower.startsWith(p))

  const urgencyPatterns = [
    'urgent', 'asap', 'need', 'looking for', 'recommend',
    'alternative', 'replace', 'migrate', 'switch from',
    'help me', 'advice', 'suggestion', 'cherche'
  ]
  const budgetPatterns = [
    'budget', 'pricing', 'cost', 'price', 'pay',
    'subscription', 'plan', 'enterprise', 'quote',
    'tarif', 'devis', 'euros', 'dollars'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const prefix = isAskHN ? 'Ask HN detecte' : 'Discussion HN'
  const signal = matched.length > 0
    ? `${prefix} — mots-cles: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal, isAskHN }
}

/**
 * Strip HTML tags from HN comment text
 * @param {string} html - Raw HTML comment
 * @returns {string} Plain text
 */
const stripHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Scrape Hacker News for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {number} [config.daysBack=7] - Days to look back
 * @param {boolean} [config.includeComments=true] - Also search comments
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    daysBack = 7,
    includeComments = true
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'hackernews_scraper_start',
    clientId,
    keywords,
    maxResults,
    daysBack,
    includeComments,
    timestamp: Date.now()
  }))

  try {
    const query = keywords.join(' OR ')
    const typesToSearch = includeComments ? SEARCH_TYPES : ['story']
    const perType = Math.ceil(maxResults / typesToSearch.length)

    for (const type of typesToSearch) {
      if (leads.length >= maxResults) break

      for (let page = 0; page < 3 && leads.length < maxResults; page++) {
        try {
          const result = await searchHN(query, type, perType, page, daysBack)

          if (result.hits.length === 0) break

          for (const hit of result.hits) {
            if (leads.length >= maxResults) break

            const isStory = type === 'story'
            const textContent = isStory
              ? (hit.title || '') + ' ' + stripHtml(hit.story_text || '')
              : stripHtml(hit.comment_text || '')

            const intent = analyzeIntent(textContent, keywords)
            if (intent.matchCount === 0) continue

            const objectID = hit.objectID || ''
            const storyId = hit.story_id || objectID
            const author = hit.author || null

            leads.push({
              source: 'hackernews',
              sourceUrl: isStory
                ? `https://news.ycombinator.com/item?id=${objectID}`
                : `https://news.ycombinator.com/item?id=${objectID}`,
              sourcePublicStatement: textContent.slice(0, 500),
              platform: 'hackernews',
              firstName: null,
              lastName: null,
              email: null,
              phone: null,
              company: null,
              linkedinUrl: null,
              nativeContactId: author,
              intentSignal: intent.signal,
              intentKeywordsCount: intent.matchCount,
              urgencyDetected: intent.urgency,
              budgetMentioned: intent.budget,
              postedAt: hit.created_at
                ? new Date(hit.created_at).getTime()
                : hit.created_at_i
                  ? hit.created_at_i * 1000
                  : Date.now(),
              rawData: {
                objectID,
                type,
                storyId,
                storyTitle: hit.story_title || hit.title || null,
                storyUrl: hit.story_url || hit.url || null,
                author,
                points: hit.points || 0,
                numComments: hit.num_comments || 0,
                isAskHN: intent.isAskHN,
                parentId: hit.parent_id || null
              }
            })
          }

          if (page + 1 >= result.nbPages) break

          await sleepWithJitter(RATE_LIMIT_MS)
        } catch (pageError) {
          console.log(JSON.stringify({
            event: 'hackernews_scraper_page_error',
            type,
            page,
            error: pageError.message,
            timestamp: Date.now()
          }))
          break
        }
      }

      await sleepWithJitter(RATE_LIMIT_MS)
    }

    console.log(JSON.stringify({
      event: 'hackernews_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'hackernews_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
