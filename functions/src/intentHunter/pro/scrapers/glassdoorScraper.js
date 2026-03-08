/**
 * Glassdoor Scraper — Intent Hunter Pro
 *
 * Finds companies hiring heavily via Glassdoor — a strong growth signal.
 * Companies with many open positions are actively investing in growth,
 * making them ideal B2B prospects for tools and services.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 6 req/min
 *
 * @module intentHunter/pro/scrapers/glassdoorScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~glassdoor-scraper'

const RATE_LIMIT_MS = 10000 // ~6 req/min
const MIN_OPEN_POSITIONS = 3 // Minimum open positions to qualify as "hiring heavily"

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

/** Role categories that map to specific tool/service needs */
const HIRING_CATEGORIES = {
  'commercial': 'Recrute commerciaux — besoin CRM/prospection',
  'sales': 'Recrute sales — besoin outils vente',
  'marketing': 'Recrute marketing — besoin outils marketing',
  'developer': 'Recrute dev — croissance tech',
  'developpeur': 'Recrute dev — croissance tech',
  'growth': 'Recrute growth — besoin acquisition',
  'data': 'Recrute data — en structuration',
  'product': 'Recrute product — croissance produit',
  'customer success': 'Recrute CS — base clients croissante',
  'support': 'Recrute support — base clients croissante',
  'rh': 'Recrute RH — structuration equipe',
  'finance': 'Recrute finance — besoin outils gestion'
}

/**
 * Analyze growth intent from Glassdoor company/job data
 * @param {object} item - Glassdoor scraper result
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, hiringCategories: Array<string>, signal: string }}
 */
const analyzeGrowthIntent = (item, keywords) => {
  const text = [
    item.companyName || '',
    item.description || item.companyDescription || '',
    item.industry || '',
    item.jobTitle || ''
  ].join(' ').toLowerCase()

  const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()))
  const matchedCategories = []

  for (const [role, signalText] of Object.entries(HIRING_CATEGORIES)) {
    if (text.includes(role)) {
      matchedCategories.push(signalText)
    }
  }

  const openJobs = item.openJobs || item.jobCount || item.numberOfJobs || 0
  const growthLevel = openJobs >= 20 ? 'FORTE' : openJobs >= 10 ? 'MOYENNE' : 'MODEREE'

  const parts = [
    `Croissance ${growthLevel}: ${openJobs} postes ouverts`
  ]
  if (matchedCategories.length > 0) parts.push(matchedCategories[0])
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)

  return {
    matchCount: Math.max(matchedKeywords.length + matchedCategories.length, 1),
    hiringCategories: matchedCategories,
    signal: parts.join(' — ')
  }
}

/**
 * Scrape Glassdoor for companies hiring heavily (growth signal)
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to filter companies/roles
 * @param {number} [config.maxResults=30] - Max total results
 * @param {string} [config.location] - Location filter (e.g., "Paris, France")
 * @param {number} [config.minOpenPositions=3] - Minimum open positions to qualify
 * @returns {Promise<Array>} Standardized leads with isHiringHeavily: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 30,
    location = 'France',
    minOpenPositions = MIN_OPEN_POSITIONS
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'glassdoor_scraper_start',
    clientId,
    keywords,
    maxResults,
    location,
    minOpenPositions,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'glassdoor_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const searchQuery = keywords.length > 0
      ? keywords.join(' ')
      : 'startup scaleup'

    const items = await runActor(ACTOR_ID, {
      startUrls: [{
        url: `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(searchQuery)}&locT=N&locId=86&locKeyword=${encodeURIComponent(location)}`
      }],
      maxItems: Math.min(maxResults * 2, 100),
      searchType: 'companies'
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const item of items) {
      if (leads.length >= maxResults) break

      try {
        const openJobs = item.openJobs || item.jobCount || item.numberOfJobs || 0
        if (openJobs < minOpenPositions) continue

        const intent = analyzeGrowthIntent(item, keywords)
        const companyName = item.companyName || item.name || null

        leads.push({
          source: 'glassdoor',
          sourceUrl: item.url || item.companyUrl
            || (companyName ? `https://www.glassdoor.com/Overview/${encodeURIComponent(companyName)}` : 'https://www.glassdoor.com'),
          sourcePublicStatement: [
            item.description || item.companyDescription || '',
            `${openJobs} postes ouverts`
          ].filter(Boolean).join(' — ').slice(0, 500),
          platform: 'glassdoor',
          firstName: null,
          lastName: null,
          email: null,
          phone: null,
          company: companyName,
          linkedinUrl: null,
          nativeContactId: item.companyId || item.id || companyName || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: openJobs >= 20,
          budgetMentioned: false,
          isHiringHeavily: true,
          postedAt: Date.now(),
          rawData: {
            companyId: item.companyId || item.id || null,
            openJobs,
            overallRating: item.rating || item.overallRating || null,
            industry: item.industry || item.sector || null,
            size: item.size || item.companySize || item.employees || null,
            revenue: item.revenue || null,
            founded: item.founded || null,
            headquarters: item.headquarters || item.location || null,
            website: item.website || item.companyWebsite || null,
            hiringCategories: intent.hiringCategories
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'glassdoor_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'glassdoor_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: items.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'glassdoor_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
