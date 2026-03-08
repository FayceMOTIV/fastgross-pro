/**
 * Upwork Scraper — Intent Hunter Pro
 *
 * Scrapes Upwork job postings via Apify to find companies actively
 * looking for services. These companies have confirmed budgets
 * and immediate needs — high-intent B2B leads.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 6 req/min
 *
 * @module intentHunter/pro/scrapers/upworkScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~upwork-scraper'

const RATE_LIMIT_MS = 10000 // ~6 req/min

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

/** Service categories that indicate specific needs */
const SERVICE_CATEGORIES = {
  'marketing': 'Cherche marketing — besoin outils/strategies',
  'seo': 'Cherche SEO — besoin visibilite',
  'web development': 'Cherche dev web — projet en cours',
  'mobile app': 'Cherche dev mobile — projet en cours',
  'design': 'Cherche design — refonte visuelle',
  'data entry': 'Cherche data entry — besoin automatisation',
  'lead generation': 'Cherche lead gen — besoin prospection',
  'sales': 'Cherche sales — besoin commerciaux',
  'crm': 'Cherche CRM — besoin outil gestion',
  'automation': 'Cherche automatisation — besoin outils',
  'consulting': 'Cherche consultant — besoin expertise',
  'copywriting': 'Cherche copywriting — besoin contenu'
}

const URGENCY_PATTERNS = [
  'urgent', 'asap', 'immediately', 'right away', 'start today',
  'need now', 'rapidement', 'des que possible', 'rush'
]

/**
 * Parse budget from Upwork job data
 * @param {object} item - Job posting data
 * @returns {{ hasBudget: boolean, budgetStr: string|null, budgetMin: number|null, budgetMax: number|null }}
 */
const parseBudget = (item) => {
  const budget = item.budget || item.amount || null
  const budgetMin = item.budgetMin || item.hourlyBudgetMin || null
  const budgetMax = item.budgetMax || item.hourlyBudgetMax || null

  if (budget) {
    return { hasBudget: true, budgetStr: `$${budget}`, budgetMin: null, budgetMax: null }
  }
  if (budgetMin || budgetMax) {
    const str = budgetMin && budgetMax
      ? `$${budgetMin}-$${budgetMax}/h`
      : budgetMax
        ? `< $${budgetMax}/h`
        : `> $${budgetMin}/h`
    return { hasBudget: true, budgetStr: str, budgetMin, budgetMax }
  }
  return { hasBudget: false, budgetStr: null, budgetMin: null, budgetMax: null }
}

/**
 * Analyze B2B intent from Upwork job posting
 * @param {object} item - Job posting data
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, category: string|null, signal: string }}
 */
const analyzeJobIntent = (item, keywords) => {
  const text = [
    item.title || '',
    item.description || item.snippet || '',
    item.skills?.join(' ') || '',
    item.category || ''
  ].join(' ').toLowerCase()

  const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()))
  const urgency = URGENCY_PATTERNS.some((p) => text.includes(p))

  let category = null
  for (const [cat, signalText] of Object.entries(SERVICE_CATEGORIES)) {
    if (text.includes(cat)) {
      category = signalText
      break
    }
  }

  const budget = parseBudget(item)

  const parts = []
  if (category) parts.push(category)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)
  if (budget.hasBudget) parts.push(`Budget: ${budget.budgetStr}`)
  if (urgency) parts.push('[URGENT]')

  return {
    matchCount: matchedKeywords.length + (category ? 1 : 0),
    urgency,
    category,
    signal: parts.join(' — ') || 'Job Upwork pertinent'
  }
}

/**
 * Scrape Upwork job postings for B2B intent
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {string} [config.category] - Upwork category filter
 * @returns {Promise<Array>} Standardized leads with isActivelyBuying: true
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, category } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'upwork_scraper_start',
    clientId,
    keywords,
    maxResults,
    category: category || 'all',
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'upwork_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const searchQuery = keywords.join(' ')

    const actorInput = {
      searchQuery,
      maxItems: Math.min(maxResults * 2, 100),
      searchType: 'jobs'
    }

    if (category) {
      actorInput.category = category
    }

    const items = await runActor(ACTOR_ID, actorInput)

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const intent = analyzeJobIntent(item, keywords)

        if (intent.matchCount === 0) continue

        const budget = parseBudget(item)
        const clientName = item.clientName || item.client?.name || null
        const clientCountry = item.clientCountry || item.client?.country || null

        leads.push({
          source: 'upwork',
          sourceUrl: item.url || item.jobUrl || 'https://www.upwork.com',
          sourcePublicStatement: [
            item.title || '',
            (item.description || item.snippet || '').slice(0, 400)
          ].filter(Boolean).join(' — ').slice(0, 500),
          platform: 'upwork',
          firstName: null,
          lastName: null,
          email: null,
          phone: null,
          company: clientName,
          linkedinUrl: null,
          nativeContactId: item.jobId || item.id || item.url || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: intent.urgency,
          budgetMentioned: budget.hasBudget,
          isActivelyBuying: true,
          postedAt: item.postedDate
            ? new Date(item.postedDate).getTime()
            : item.createdAt
              ? new Date(item.createdAt).getTime()
              : Date.now(),
          rawData: {
            jobId: item.jobId || item.id || null,
            title: item.title || null,
            budget: budget.budgetStr,
            budgetMin: budget.budgetMin,
            budgetMax: budget.budgetMax,
            skills: item.skills || [],
            category: item.category || null,
            experienceLevel: item.experienceLevel || item.contractorTier || null,
            clientCountry,
            clientRating: item.clientRating || item.client?.rating || null,
            clientSpent: item.clientTotalSpent || item.client?.totalSpent || null,
            proposals: item.proposals || item.applicants || null,
            jobType: item.jobType || item.engagementType || null
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'upwork_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'upwork_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'upwork_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
