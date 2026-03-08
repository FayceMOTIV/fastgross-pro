/**
 * Crunchbase Scraper — Intent Hunter Pro
 *
 * Finds recently funded French companies via Crunchbase API (free tier).
 * Companies that just raised funds are actively investing in growth tools.
 *
 * Auth: CRUNCHBASE_API_KEY
 * Rate limit: 200 req/month (free tier) — use sparingly
 * Filters: France, funding < 6 months, amount > 500K EUR
 *
 * @module intentHunter/pro/scrapers/crunchbaseScraper
 */

import axios from 'axios'

const CRUNCHBASE_API_KEY = process.env.CRUNCHBASE_API_KEY || ''
const CRUNCHBASE_SEARCH_URL = 'https://api.crunchbase.com/api/v4/searches/organizations'

const RATE_LIMIT_MS = 30000 // ~2 req/min — very conservative for 200/month quota
const MIN_FUNDING_EUR = 500000
const FUNDING_WINDOW_MONTHS = 6

/**
 * Sleep with jitter
 * @param {number} baseMs
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.2)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Build date string for N months ago (YYYY-MM-DD)
 * @param {number} months
 * @returns {string}
 */
const monthsAgo = (months) => {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0]
}

/**
 * Detect intent from company description and funding context
 * @param {object} org - Organization data
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, signal: string }}
 */
const analyzeFundingIntent = (org, keywords) => {
  const text = [
    org.short_description || '',
    org.categories?.join(' ') || ''
  ].join(' ').toLowerCase()

  const matched = keywords.filter((kw) => text.includes(kw.toLowerCase()))
  const amount = org.last_funding_total?.value_usd || org.funding_total?.value_usd || 0
  const amountStr = amount > 1000000
    ? `${(amount / 1000000).toFixed(1)}M`
    : `${(amount / 1000).toFixed(0)}K`

  const signal = [
    `Levee recente: ${amountStr} USD`,
    org.last_funding_type ? `Type: ${org.last_funding_type}` : '',
    matched.length > 0 ? `Mots-cles: ${matched.join(', ')}` : ''
  ].filter(Boolean).join(' — ')

  return { matchCount: Math.max(matched.length, 1), signal }
}

/**
 * Scrape Crunchbase for recently funded French companies
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to filter companies
 * @param {number} [config.maxResults=20] - Max results (keep low for free tier)
 * @param {number} [config.minFundingEur=500000] - Minimum funding amount EUR
 * @param {number} [config.fundingWindowMonths=6] - How recent the funding should be
 * @returns {Promise<Array>} Standardized leads with recentFunding: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 20,
    minFundingEur = MIN_FUNDING_EUR,
    fundingWindowMonths = FUNDING_WINDOW_MONTHS
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'crunchbase_scraper_start',
    clientId,
    keywords,
    maxResults,
    minFundingEur,
    fundingWindowMonths,
    timestamp: Date.now()
  }))

  if (!CRUNCHBASE_API_KEY) {
    console.log(JSON.stringify({
      event: 'crunchbase_scraper_skip',
      reason: 'Missing CRUNCHBASE_API_KEY',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const sinceDate = monthsAgo(fundingWindowMonths)
    // Approximate EUR to USD (1 EUR ~ 1.08 USD)
    const minFundingUsd = Math.round(minFundingEur * 1.08)

    const requestBody = {
      field_ids: [
        'identifier', 'short_description', 'location_identifiers',
        'categories', 'founded_on', 'num_employees_enum',
        'last_funding_at', 'last_funding_total', 'last_funding_type',
        'funding_total', 'linkedin', 'website_url', 'contact_email'
      ],
      query: [
        { type: 'predicate', field_id: 'location_identifiers', operator_id: 'includes', values: ['france'] },
        { type: 'predicate', field_id: 'last_funding_at', operator_id: 'gte', values: [sinceDate] },
        { type: 'predicate', field_id: 'funding_total', operator_id: 'gte', values: [minFundingUsd] }
      ],
      order: [{ field_id: 'last_funding_at', sort: 'desc' }],
      limit: Math.min(maxResults, 25)
    }

    const response = await axios.post(CRUNCHBASE_SEARCH_URL, requestBody, {
      headers: {
        'X-cb-user-key': CRUNCHBASE_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })

    const entities = response.data?.entities || []

    for (const entity of entities) {
      if (leads.length >= maxResults) break

      const props = entity.properties || {}
      const identifier = props.identifier || {}
      const intent = analyzeFundingIntent(props, keywords)

      const companyName = identifier.value || null
      const permalink = identifier.permalink || ''

      leads.push({
        source: 'crunchbase',
        sourceUrl: permalink
          ? `https://www.crunchbase.com/organization/${permalink}`
          : 'https://www.crunchbase.com',
        sourcePublicStatement: [
          props.short_description || '',
          props.last_funding_type ? `Derniere levee: ${props.last_funding_type}` : ''
        ].filter(Boolean).join(' — ').slice(0, 500),
        platform: 'crunchbase',
        firstName: null,
        lastName: null,
        email: props.contact_email || null,
        phone: null,
        company: companyName,
        linkedinUrl: props.linkedin?.value
          ? `https://www.linkedin.com/${props.linkedin.value}`
          : null,
        nativeContactId: permalink || entity.uuid || null,
        intentSignal: intent.signal,
        intentKeywordsCount: intent.matchCount,
        urgencyDetected: false,
        budgetMentioned: true,
        recentFunding: true,
        postedAt: props.last_funding_at
          ? new Date(props.last_funding_at).getTime()
          : Date.now(),
        rawData: {
          uuid: entity.uuid,
          permalink,
          categories: props.categories || [],
          numEmployees: props.num_employees_enum || null,
          foundedOn: props.founded_on || null,
          lastFundingType: props.last_funding_type || null,
          lastFundingTotal: props.last_funding_total || null,
          fundingTotal: props.funding_total || null,
          websiteUrl: props.website_url || null,
          location: props.location_identifiers?.[0]?.value || 'France'
        }
      })
    }

    await sleepWithJitter(RATE_LIMIT_MS)

    console.log(JSON.stringify({
      event: 'crunchbase_scraper_complete',
      clientId,
      leadsFound: leads.length,
      apiCallsMade: 1,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    const isRateLimit = error.response?.status === 429
    console.log(JSON.stringify({
      event: 'crunchbase_scraper_fatal_error',
      clientId,
      error: error.message,
      isRateLimit,
      status: error.response?.status || null,
      timestamp: Date.now()
    }))
    return []
  }
}
