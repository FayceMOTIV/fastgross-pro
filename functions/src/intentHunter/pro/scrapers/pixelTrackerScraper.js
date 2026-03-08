/**
 * Pixel Tracker Scraper — Intent Hunter Pro
 *
 * Identifies website visitors via reverse IP lookup using the Snitcher API.
 * Companies visiting the client's website have demonstrated intent by
 * actively researching the client's product/service. This is one of
 * the strongest intent signals available.
 *
 * Auth: SNITCHER_API_KEY
 * Rate limit: 100 req/min (Snitcher standard tier)
 * API: https://api.snitcher.com/v2/
 *
 * Note: Requires Snitcher tracking pixel installed on client website.
 * Returns company-level data (not individual visitor data — RGPD compliant).
 *
 * @module intentHunter/pro/scrapers/pixelTrackerScraper
 */

import axios from 'axios'

const SNITCHER_API_URL = 'https://api.snitcher.com/v2'
const RATE_LIMIT_MS = 650 // ~92 req/min to stay safe under 100

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
 * Fetch identified website visitors from Snitcher
 * @param {string} apiKey - Snitcher API key
 * @param {number} limit - Results per page
 * @param {number} offset - Pagination offset
 * @param {string|null} from - Start date (YYYY-MM-DD)
 * @param {string|null} to - End date (YYYY-MM-DD)
 * @returns {Promise<{ leads: Array, total: number }>}
 */
const getVisitors = async (apiKey, limit, offset, from, to) => {
  const params = {
    limit: Math.min(limit, 100),
    offset
  }

  if (from) params.from = from
  if (to) params.to = to

  const response = await axios.get(`${SNITCHER_API_URL}/leads`, {
    params,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
    timeout: 15000
  })

  return {
    leads: response.data?.data || response.data || [],
    total: response.data?.meta?.total || response.data?.total || 0
  }
}

/**
 * Get detailed visitor info
 * @param {string} apiKey - Snitcher API key
 * @param {string} leadId - Snitcher lead ID
 * @returns {Promise<object|null>} Detailed lead data
 */
const getVisitorDetails = async (apiKey, leadId) => {
  try {
    const response = await axios.get(`${SNITCHER_API_URL}/leads/${leadId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      },
      timeout: 10000
    })
    return response.data?.data || response.data || null
  } catch {
    return null
  }
}

/**
 * Analyze visit patterns for intent strength
 * @param {object} visitor - Snitcher visitor data
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string, visitScore: number }}
 */
const analyzeVisitIntent = (visitor, keywords) => {
  const company = (visitor.company_name || visitor.name || '').toLowerCase()
  const industry = (visitor.industry || '').toLowerCase()
  const pageViews = visitor.page_views || visitor.pageviews || []
  const visitCount = visitor.visit_count || visitor.sessions || 1
  const pagesViewed = Array.isArray(pageViews) ? pageViews.length : (visitor.pages_viewed || 0)

  // Check if company/industry matches keywords
  const companyText = `${company} ${industry}`
  const matchedKeywords = keywords.filter((kw) => companyText.includes(kw.toLowerCase()))

  // Check visited pages for keyword matches
  const pageUrls = Array.isArray(pageViews)
    ? pageViews.map((p) => (typeof p === 'string' ? p : p.url || p.path || '')).join(' ')
    : ''
  const pageMatches = keywords.filter((kw) => pageUrls.toLowerCase().includes(kw.toLowerCase()))
  const allMatched = [...new Set([...matchedKeywords, ...pageMatches])]

  // Visit score based on engagement
  let visitScore = 0
  if (visitCount >= 3) visitScore += 30
  else if (visitCount >= 2) visitScore += 15

  if (pagesViewed >= 5) visitScore += 30
  else if (pagesViewed >= 3) visitScore += 15

  // Check for high-intent pages (pricing, contact, demo, etc.)
  const highIntentPages = ['pricing', 'tarif', 'contact', 'demo', 'essai', 'trial', 'signup', 'inscription']
  const visitedHighIntent = highIntentPages.some((p) => pageUrls.toLowerCase().includes(p))
  if (visitedHighIntent) visitScore += 40

  const urgency = visitCount >= 3 || visitedHighIntent
  const budget = pageUrls.toLowerCase().includes('pricing') || pageUrls.toLowerCase().includes('tarif')

  const signalParts = [
    `Visiteur site web identifie — ${visitCount} visite(s), ${pagesViewed} page(s)`,
    visitedHighIntent ? '[PAGE HAUTE INTENTION]' : '',
    allMatched.length > 0 ? `Mots-cles: ${allMatched.join(', ')}` : ''
  ].filter(Boolean)

  return {
    matchCount: Math.max(allMatched.length, 1),
    urgency,
    budget,
    signal: signalParts.join(' — '),
    visitScore
  }
}

/**
 * Build date string for N days ago (YYYY-MM-DD)
 * @param {number} days
 * @returns {string}
 */
const daysAgoStr = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

/**
 * Scrape Snitcher for identified website visitors
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to match against visitor data
 * @param {number} [config.maxResults=50] - Max total results
 * @param {number} [config.daysBack=7] - Days to look back
 * @param {number} [config.minVisitScore=0] - Minimum visit score to include
 * @param {boolean} [config.enrichDetails=false] - Fetch detailed visitor info
 * @returns {Promise<Array>} Standardized leads with websiteVisitor: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    daysBack = 7,
    minVisitScore = 0,
    enrichDetails = false
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'pixel_tracker_scraper_start',
    clientId,
    keywords,
    maxResults,
    daysBack,
    minVisitScore,
    enrichDetails,
    timestamp: Date.now()
  }))

  const apiKey = process.env.SNITCHER_API_KEY || ''

  if (!apiKey) {
    console.log(JSON.stringify({
      event: 'pixel_tracker_scraper_skip',
      reason: 'Missing SNITCHER_API_KEY',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const fromDate = daysAgoStr(daysBack)
    const toDate = new Date().toISOString().split('T')[0]
    const batchSize = 50
    const seenCompanies = new Set()

    for (let offset = 0; leads.length < maxResults; offset += batchSize) {
      try {
        const result = await getVisitors(apiKey, batchSize, offset, fromDate, toDate)
        const visitors = result.leads

        if (visitors.length === 0) break

        for (const visitor of visitors) {
          if (leads.length >= maxResults) break

          const companyName = visitor.company_name || visitor.name || null
          if (!companyName) continue

          // Deduplicate by company name
          const companyKey = companyName.toLowerCase().trim()
          if (seenCompanies.has(companyKey)) continue
          seenCompanies.add(companyKey)

          const intent = analyzeVisitIntent(visitor, keywords)

          // Filter by minimum visit score
          if (intent.visitScore < minVisitScore) continue

          // Optionally enrich with detailed data
          let details = null
          if (enrichDetails && (visitor.id || visitor.lead_id)) {
            details = await getVisitorDetails(apiKey, visitor.id || visitor.lead_id)
            await sleepWithJitter(RATE_LIMIT_MS)
          }

          const enrichedData = details || visitor
          const pageViews = enrichedData.page_views || enrichedData.pageviews || []
          const pagesVisited = Array.isArray(pageViews)
            ? pageViews.map((p) => (typeof p === 'string' ? p : p.url || p.path || ''))
            : []

          leads.push({
            source: 'pixel_tracker',
            sourceUrl: enrichedData.website || enrichedData.domain
              ? `https://${enrichedData.domain || ''}`
              : null,
            sourcePublicStatement: [
              `Entreprise ${companyName} a visite votre site web`,
              enrichedData.industry ? `Secteur: ${enrichedData.industry}` : '',
              pagesVisited.length > 0 ? `Pages: ${pagesVisited.slice(0, 3).join(', ')}` : ''
            ].filter(Boolean).join(' — ').slice(0, 500),
            platform: 'website',
            firstName: enrichedData.contact_name?.split(' ')[0] || null,
            lastName: enrichedData.contact_name?.split(' ').slice(1).join(' ') || null,
            email: enrichedData.contact_email || enrichedData.email || null,
            phone: enrichedData.phone || null,
            company: companyName,
            linkedinUrl: enrichedData.linkedin_url || enrichedData.linkedin || null,
            nativeContactId: visitor.id || visitor.lead_id || companyKey,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            websiteVisitor: true,
            visitScore: intent.visitScore,
            postedAt: enrichedData.last_seen || enrichedData.last_visit
              ? new Date(enrichedData.last_seen || enrichedData.last_visit).getTime()
              : Date.now(),
            rawData: {
              snitcherId: visitor.id || visitor.lead_id || null,
              domain: enrichedData.domain || null,
              industry: enrichedData.industry || null,
              employeeCount: enrichedData.employee_count || enrichedData.employees || null,
              city: enrichedData.city || null,
              country: enrichedData.country || null,
              visitCount: enrichedData.visit_count || enrichedData.sessions || 1,
              pagesViewed: pagesVisited.length,
              topPages: pagesVisited.slice(0, 5),
              firstSeen: enrichedData.first_seen || enrichedData.first_visit || null,
              lastSeen: enrichedData.last_seen || enrichedData.last_visit || null,
              referrer: enrichedData.referrer || null,
              visitScore: intent.visitScore
            }
          })
        }

        // If we got fewer items than batch size, no more pages
        if (visitors.length < batchSize) break

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'pixel_tracker_scraper_page_error',
          offset,
          error: pageError.message,
          status: pageError.response?.status || null,
          timestamp: Date.now()
        }))
        if (pageError.response?.status === 429) {
          await sleepWithJitter(RATE_LIMIT_MS * 5)
        } else {
          break
        }
      }
    }

    console.log(JSON.stringify({
      event: 'pixel_tracker_scraper_complete',
      clientId,
      leadsFound: leads.length,
      uniqueCompanies: seenCompanies.size,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pixel_tracker_scraper_fatal_error',
      clientId,
      error: error.message,
      status: error.response?.status || null,
      timestamp: Date.now()
    }))
    return []
  }
}
