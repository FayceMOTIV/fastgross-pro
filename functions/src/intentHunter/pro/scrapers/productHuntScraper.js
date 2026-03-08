/**
 * Product Hunt Scraper — Intent Hunter Pro
 *
 * Searches recent Product Hunt launches via the GraphQL API.
 * Targets makers and early adopters discussing tools/services
 * that match client keywords. Makers launching products are
 * high-intent leads for complementary B2B services.
 *
 * Auth: PRODUCTHUNT_API_TOKEN (Developer token)
 * Rate limit: 20 req/min (900 req/day on free tier)
 * API: Product Hunt GraphQL API v2
 *
 * @module intentHunter/pro/scrapers/productHuntScraper
 */

import axios from 'axios'

const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql'
const RATE_LIMIT_MS = 3200 // ~18 req/min to stay safe under 20

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
 * Execute a GraphQL query against Product Hunt API
 * @param {string} token - PH API token
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @returns {Promise<object>} Response data
 */
const graphqlQuery = async (token, query, variables = {}) => {
  const response = await axios.post(
    PH_API_URL,
    { query, variables },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 15000
    }
  )

  if (response.data?.errors) {
    throw new Error(`PH GraphQL error: ${response.data.errors[0]?.message || 'unknown'}`)
  }

  return response.data?.data || {}
}

/**
 * Search recent Product Hunt posts by topic
 * @param {string} token - PH API token
 * @param {string} searchQuery - Topic/keyword to search
 * @param {number} count - Number of results
 * @param {string|null} cursor - Pagination cursor
 * @returns {Promise<{ posts: Array, endCursor: string|null, hasNextPage: boolean }>}
 */
const searchPosts = async (token, searchQuery, count, cursor) => {
  const query = `
    query SearchPosts($query: String!, $first: Int!, $after: String) {
      posts(search: $query, first: $first, after: $after, order: NEWEST) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            website
            slug
            votesCount
            commentsCount
            createdAt
            featuredAt
            topics(first: 5) {
              edges {
                node {
                  name
                  slug
                }
              }
            }
            makers {
              id
              name
              username
              headline
              twitterUsername
              websiteUrl
            }
            thumbnail {
              url
            }
          }
          cursor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  `

  const variables = {
    query: searchQuery,
    first: Math.min(count, 20),
    after: cursor || undefined
  }

  const data = await graphqlQuery(token, query, variables)
  const edges = data.posts?.edges || []
  const pageInfo = data.posts?.pageInfo || {}

  return {
    posts: edges.map((e) => e.node),
    endCursor: pageInfo.endCursor || null,
    hasNextPage: pageInfo.hasNextPage || false
  }
}

/**
 * Detect intent signals in Product Hunt post
 * @param {object} post - PH post data
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (post, keywords) => {
  const text = [
    post.name || '',
    post.tagline || '',
    post.description || '',
    (post.topics?.edges || []).map((e) => e.node?.name || '').join(' ')
  ].join(' ').toLowerCase()

  const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'launch', 'beta', 'early access', 'just launched',
    'new', 'introducing', 'live now', 'available today'
  ]
  const budgetPatterns = [
    'pricing', 'free', 'plan', 'enterprise', 'subscription',
    'saas', 'b2b', 'startup', 'business'
  ]

  const urgency = urgencyPatterns.some((p) => text.includes(p))
  const budget = budgetPatterns.some((p) => text.includes(p))

  const signal = matched.length > 0
    ? `Lancement Product Hunt — mots-cles: ${matched.join(', ')}${urgency ? ' [NOUVEAU]' : ''}${budget ? ' [B2B]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Extract maker info (first maker as primary contact)
 * @param {Array} makers - PH makers array
 * @returns {{ firstName: string|null, lastName: string|null, twitterUsername: string|null, websiteUrl: string|null }}
 */
const extractMaker = (makers) => {
  const maker = (makers || [])[0]
  if (!maker) return { firstName: null, lastName: null, twitterUsername: null, websiteUrl: null }

  const parts = (maker.name || '').trim().split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null,
    twitterUsername: maker.twitterUsername || null,
    websiteUrl: maker.websiteUrl || null
  }
}

/**
 * Scrape Product Hunt for B2B intent signals
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
    event: 'producthunt_scraper_start',
    clientId,
    keywords,
    maxResults,
    timestamp: Date.now()
  }))

  const apiToken = process.env.PRODUCTHUNT_API_TOKEN || ''

  if (!apiToken) {
    console.log(JSON.stringify({
      event: 'producthunt_scraper_skip',
      reason: 'Missing PRODUCTHUNT_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    // Search by each keyword separately for better coverage
    const perKeyword = Math.ceil(maxResults / Math.max(keywords.length, 1))

    for (const keyword of keywords) {
      if (leads.length >= maxResults) break

      let cursor = null

      for (let page = 0; page < 3 && leads.length < maxResults; page++) {
        try {
          const result = await searchPosts(apiToken, keyword, perKeyword, cursor)

          if (result.posts.length === 0) break

          for (const post of result.posts) {
            if (leads.length >= maxResults) break

            const intent = analyzeIntent(post, keywords)
            if (intent.matchCount === 0) continue

            const maker = extractMaker(post.makers)
            const topics = (post.topics?.edges || []).map((e) => e.node?.name).filter(Boolean)

            leads.push({
              source: 'producthunt',
              sourceUrl: post.url || `https://www.producthunt.com/posts/${post.slug}`,
              sourcePublicStatement: [
                post.name || '',
                post.tagline || '',
                (post.description || '').slice(0, 300)
              ].filter(Boolean).join(' — ').slice(0, 500),
              platform: 'producthunt',
              firstName: maker.firstName,
              lastName: maker.lastName,
              email: null,
              phone: null,
              company: post.name || null,
              linkedinUrl: null,
              nativeContactId: post.makers?.[0]?.username || post.slug || null,
              intentSignal: intent.signal,
              intentKeywordsCount: intent.matchCount,
              urgencyDetected: intent.urgency,
              budgetMentioned: intent.budget,
              postedAt: post.createdAt
                ? new Date(post.createdAt).getTime()
                : Date.now(),
              rawData: {
                phId: post.id,
                slug: post.slug,
                votesCount: post.votesCount || 0,
                commentsCount: post.commentsCount || 0,
                topics,
                website: post.website || null,
                makers: (post.makers || []).map((m) => ({
                  name: m.name,
                  username: m.username,
                  headline: m.headline,
                  twitter: m.twitterUsername,
                  website: m.websiteUrl
                })),
                featuredAt: post.featuredAt || null,
                makerTwitter: maker.twitterUsername,
                makerWebsite: maker.websiteUrl
              }
            })
          }

          cursor = result.endCursor
          if (!result.hasNextPage) break

          await sleepWithJitter(RATE_LIMIT_MS)
        } catch (pageError) {
          console.log(JSON.stringify({
            event: 'producthunt_scraper_page_error',
            keyword,
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
      event: 'producthunt_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'producthunt_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
