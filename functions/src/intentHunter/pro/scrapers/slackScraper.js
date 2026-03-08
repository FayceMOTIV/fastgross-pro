/**
 * Slack Scraper — Intent Hunter Pro
 *
 * Searches messages in Slack Connect / public shared channels using
 * the Slack Web API. Targets B2B communities where professionals
 * discuss needs, tools, and vendor selection.
 *
 * Auth: SLACK_BOT_TOKEN (xoxb-... with search:read scope)
 * Rate limit: 20 req/min (Slack Tier 2 rate limit)
 * API: Slack Web API — search.messages
 *
 * Note: Bot must be installed in workspace with search:read,
 * channels:read, and users:read scopes.
 *
 * @module intentHunter/pro/scrapers/slackScraper
 */

import axios from 'axios'

const SLACK_API_URL = 'https://slack.com/api'
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
 * Search Slack messages via search.messages API
 * @param {string} token - Slack bot token
 * @param {string} query - Search query
 * @param {number} count - Results per page (max 100)
 * @param {number} page - Page number (1-indexed)
 * @returns {Promise<{ messages: Array, total: number, paging: object }>}
 */
const searchMessages = async (token, query, count = 20, page = 1) => {
  const response = await axios.get(`${SLACK_API_URL}/search.messages`, {
    params: {
      query,
      count: Math.min(count, 100),
      page,
      sort: 'timestamp',
      sort_dir: 'desc',
      highlight: false
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  })

  const data = response.data || {}

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || 'unknown'}`)
  }

  return {
    messages: data.messages?.matches || [],
    total: data.messages?.total || 0,
    paging: data.messages?.paging || {}
  }
}

/**
 * Get user profile info by user ID
 * @param {string} token - Slack bot token
 * @param {string} userId - Slack user ID
 * @returns {Promise<object|null>} User profile
 */
const getUserProfile = async (token, userId) => {
  try {
    const response = await axios.get(`${SLACK_API_URL}/users.info`, {
      params: { user: userId },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    })

    if (!response.data?.ok) return null
    return response.data.user || null
  } catch {
    return null
  }
}

/**
 * Detect intent signals in message text
 * @param {string} text - Message text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'urgent', 'rapidement', 'asap', 'des que possible',
    'besoin', 'cherche', 'recommandation', 'quelqu\'un utilise',
    'quel outil', 'alternative a', 'migration'
  ]
  const budgetPatterns = [
    'budget', 'euros', 'tarif', 'devis', 'prix',
    'combien', 'cout', 'abonnement', 'licence', 'plan'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Message Slack B2B — mots-cles: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Extract name parts from Slack user profile
 * @param {object|null} user - Slack user object
 * @returns {{ firstName: string|null, lastName: string|null, company: string|null }}
 */
const extractUserInfo = (user) => {
  if (!user) return { firstName: null, lastName: null, company: null }

  const profile = user.profile || {}
  const realName = profile.real_name || user.real_name || ''
  const parts = realName.trim().split(/\s+/)

  return {
    firstName: profile.first_name || parts[0] || null,
    lastName: profile.last_name || parts.slice(1).join(' ') || null,
    company: profile.title || null
  }
}

/**
 * Scrape Slack workspaces for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {boolean} [config.enrichUsers=true] - Fetch user profiles for enrichment
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, enrichUsers = true } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'slack_scraper_start',
    clientId,
    keywords,
    maxResults,
    enrichUsers,
    timestamp: Date.now()
  }))

  const botToken = process.env.SLACK_BOT_TOKEN || ''

  if (!botToken) {
    console.log(JSON.stringify({
      event: 'slack_scraper_skip',
      reason: 'Missing SLACK_BOT_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const query = keywords.map((kw) => `"${kw}"`).join(' OR ')
    const seenUsers = new Set()

    for (let page = 1; page <= 5 && leads.length < maxResults; page++) {
      try {
        const perPage = Math.min(maxResults - leads.length, 50)
        const result = await searchMessages(botToken, query, perPage, page)

        if (result.messages.length === 0) break

        for (const msg of result.messages) {
          if (leads.length >= maxResults) break

          const intent = analyzeIntent(msg.text, keywords)
          if (intent.matchCount === 0) continue

          // Deduplicate by user
          const userId = msg.user || msg.username || null
          if (userId && seenUsers.has(userId)) continue
          if (userId) seenUsers.add(userId)

          let userInfo = { firstName: null, lastName: null, company: null }

          if (enrichUsers && userId && !userId.startsWith('B')) {
            userInfo = extractUserInfo(await getUserProfile(botToken, userId))
            await sleepWithJitter(RATE_LIMIT_MS)
          }

          const channelName = msg.channel?.name || null
          const teamDomain = msg.team || null
          const permalink = msg.permalink || null

          leads.push({
            source: 'slack',
            sourceUrl: permalink || `https://app.slack.com/client/${teamDomain || ''}`,
            sourcePublicStatement: (msg.text || '').slice(0, 500),
            platform: 'slack',
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: null,
            phone: null,
            company: userInfo.company,
            linkedinUrl: null,
            nativeContactId: userId,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            postedAt: msg.ts
              ? Math.floor(parseFloat(msg.ts) * 1000)
              : Date.now(),
            rawData: {
              messageTs: msg.ts || null,
              channelId: msg.channel?.id || null,
              channelName,
              teamDomain,
              username: msg.username || null,
              userId,
              permalink
            }
          })
        }

        const totalPages = result.paging?.pages || 1
        if (page >= totalPages) break

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'slack_scraper_page_error',
          page,
          error: pageError.message,
          timestamp: Date.now()
        }))
        if (pageError.message?.includes('ratelimited')) break
      }
    }

    console.log(JSON.stringify({
      event: 'slack_scraper_complete',
      clientId,
      leadsFound: leads.length,
      uniqueUsers: seenUsers.size,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'slack_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
