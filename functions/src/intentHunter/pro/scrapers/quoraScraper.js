/**
 * Quora Scraper — Intent Hunter Pro
 *
 * Scrapes Quora questions in French B2B topics via Apify.
 * People asking questions on Quora about business tools, services,
 * or solutions have strong buying intent.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 10 req/min
 *
 * @module intentHunter/pro/scrapers/quoraScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~quora-scraper'

const RATE_LIMIT_MS = 6000 // ~10 req/min

/** Default Quora topics for French B2B */
const DEFAULT_TOPICS = [
  'logiciel-de-gestion', 'marketing-digital', 'crm',
  'prospection-commerciale', 'saas', 'freelance',
  'creation-entreprise', 'startup', 'automatisation',
  'gestion-de-projet'
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

/** Intent patterns in Quora questions */
const QUESTION_INTENT_PATTERNS = [
  'quel est le meilleur', 'recommandez-vous', 'que pensez-vous de',
  'alternative a', 'comment choisir', 'comparaison',
  'avez-vous utilise', 'experience avec', 'avis sur',
  'which is the best', 'recommend', 'looking for',
  'best tool', 'best software', 'how to find'
]

const URGENCY_PATTERNS = [
  'urgent', 'rapidement', 'des que possible', 'maintenant',
  'immediately', 'asap', 'need now'
]

const BUDGET_PATTERNS = [
  'budget', 'prix', 'tarif', 'gratuit', 'cout', 'combien',
  'price', 'cost', 'free', 'pricing', 'affordable'
]

/**
 * Analyze buying intent in Quora question/answer
 * @param {string} text - Question or answer text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, isQuestion: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedIntents = QUESTION_INTENT_PATTERNS.filter((p) => lower.includes(p))

  const urgency = URGENCY_PATTERNS.some((p) => lower.includes(p))
  const budget = BUDGET_PATTERNS.some((p) => lower.includes(p))
  const isQuestion = lower.includes('?') || matchedIntents.length > 0

  const parts = []
  if (matchedIntents.length > 0) parts.push(`Question B2B: ${matchedIntents.slice(0, 2).join(', ')}`)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)
  if (urgency) parts.push('[URGENT]')
  if (budget) parts.push('[BUDGET]')

  return {
    matchCount: matchedKeywords.length + matchedIntents.length,
    urgency,
    budget,
    isQuestion,
    signal: parts.join(' — ')
  }
}

/**
 * Extract profile info from Quora item
 * @param {object} item - Quora scraper result
 * @returns {{ firstName: string|null, lastName: string|null, credentials: string|null }}
 */
const extractProfile = (item) => {
  const authorName = item.authorName || item.author?.name || null
  if (!authorName) return { firstName: null, lastName: null, credentials: null }

  const parts = authorName.trim().split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null,
    credentials: item.authorCredentials || item.author?.credentials || null
  }
}

/**
 * Scrape Quora for B2B intent signals in French topics
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.topics] - Override default topics
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, topics = DEFAULT_TOPICS } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'quora_scraper_start',
    clientId,
    keywords,
    maxResults,
    topicCount: topics.length,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'quora_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const searchUrls = keywords.map((kw) => ({
      url: `https://fr.quora.com/search?q=${encodeURIComponent(kw)}`
    }))

    const items = await runActor(ACTOR_ID, {
      startUrls: searchUrls,
      maxItems: Math.min(maxResults * 2, 100),
      searchType: 'questions'
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const questionText = item.question || item.title || ''
        const answerText = item.answer || item.text || ''
        const fullText = `${questionText} ${answerText}`
        const intent = analyzeIntent(fullText, keywords)

        if (intent.matchCount === 0) continue

        const profile = extractProfile(item)

        leads.push({
          source: 'quora',
          sourceUrl: item.url || item.questionUrl || 'https://fr.quora.com',
          sourcePublicStatement: fullText.slice(0, 500),
          platform: 'quora',
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: null,
          phone: null,
          company: null,
          linkedinUrl: null,
          nativeContactId: item.authorId || item.author?.id || profile.firstName || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: intent.budget,
          postedAt: item.createdAt
            ? new Date(item.createdAt).getTime()
            : item.timestamp || Date.now(),
          rawData: {
            questionTitle: questionText.slice(0, 200),
            answerCount: item.answerCount || item.answers || 0,
            upvotes: item.upvotes || item.upvoteCount || 0,
            views: item.views || item.viewCount || 0,
            topic: item.topic || item.topics?.[0] || null,
            isQuestion: intent.isQuestion,
            authorCredentials: profile.credentials
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'quora_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'quora_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'quora_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
