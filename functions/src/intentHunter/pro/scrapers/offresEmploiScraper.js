/**
 * Offres Emploi Scraper — Intent Hunter Pro
 *
 * Detects companies actively hiring — a strong buy signal.
 * If a company recruits for a role, they likely need related tools/services.
 * Example: "recrute commercial" = needs sales tools / CRM / prospection.
 *
 * Sources:
 *   - Indeed (HTML scraping via Serper)
 *   - Welcome To The Jungle (via Serper)
 *   - LinkedIn Jobs (via Serper site:linkedin.com/jobs)
 *
 * Auth: SERPER_API_KEY
 * Rate limit: ~5 req/min to respect Serper quota
 *
 * @module intentHunter/pro/scrapers/offresEmploiScraper
 */

import axios from 'axios'

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''
const SERPER_URL = 'https://google.serper.dev/search'

const RATE_LIMIT_MS = 12000 // ~5 req/min

/** Job platforms to search via Serper */
const PLATFORMS = [
  { id: 'linkedin_jobs', siteFilter: 'site:linkedin.com/jobs', name: 'LinkedIn Jobs' },
  { id: 'indeed', siteFilter: 'site:indeed.fr OR site:indeed.com', name: 'Indeed' },
  { id: 'wttj', siteFilter: 'site:welcometothejungle.com', name: 'Welcome To The Jungle' }
]

/** Hiring signals mapped to likely needs */
const HIRING_SIGNALS = {
  'commercial': 'Recrute commercial — besoin CRM/prospection',
  'marketing': 'Recrute marketing — besoin outils marketing',
  'developpeur': 'Recrute dev — en croissance tech',
  'growth': 'Recrute growth — besoin acquisition',
  'sdr': 'Recrute SDR — besoin prospection',
  'account manager': 'Recrute AM — base clients en croissance',
  'responsable': 'Recrute manager — restructuration/croissance',
  'directeur': 'Recrute directeur — transformation',
  'chef de projet': 'Recrute CDP — nouveaux projets en cours'
}

/**
 * Sleep with jitter
 * @param {number} baseMs
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Search Serper for job listings
 * @param {string} query - Search query
 * @param {number} num - Number of results
 * @returns {Promise<Array>} Serper organic results
 */
const searchSerper = async (query, num = 10) => {
  if (!SERPER_API_KEY) {
    throw new Error('Missing SERPER_API_KEY')
  }

  const response = await axios.post(
    SERPER_URL,
    { q: query, gl: 'fr', hl: 'fr', num },
    {
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  )

  return response.data?.organic || []
}

/**
 * Detect hiring signal type from job listing text
 * @param {string} text - Title + snippet
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, signal: string, hiringType: string|null }}
 */
const analyzeHiringIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  let hiringType = null
  let hiringSignal = ''

  for (const [role, signalText] of Object.entries(HIRING_SIGNALS)) {
    if (lower.includes(role)) {
      hiringType = role
      hiringSignal = signalText
      break
    }
  }

  const totalMatches = matchedKeywords.length + (hiringType ? 1 : 0)
  const signal = [
    hiringSignal,
    matchedKeywords.length > 0 ? `Mots-cles: ${matchedKeywords.join(', ')}` : ''
  ].filter(Boolean).join(' — ')

  return { matchCount: totalMatches, signal, hiringType }
}

/**
 * Extract company name from job listing title/snippet
 * @param {string} title - Job listing title
 * @param {string} snippet - Listing snippet
 * @returns {string|null}
 */
const extractCompanyName = (title, snippet) => {
  // Common pattern: "Poste - Company - Location"
  const dashParts = (title || '').split(/\s[-–|]\s/)
  if (dashParts.length >= 2) return dashParts[1].trim()

  // Fallback: look for "chez Company" in snippet
  const chezMatch = (snippet || '').match(/chez\s+([A-Z][\w\s&]+)/i)
  if (chezMatch) return chezMatch[1].trim()

  return null
}

/**
 * Scrape job listings for hiring intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=30] - Max total results
 * @param {string} [config.location] - Location filter (e.g., "Paris")
 * @returns {Promise<Array>} Standardized leads with isRecruiting: true
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 30, location } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'offres_emploi_scraper_start',
    clientId,
    keywords,
    maxResults,
    location: location || 'France',
    timestamp: Date.now()
  }))

  try {
    const perPlatform = Math.ceil(maxResults / PLATFORMS.length)
    const locationStr = location ? ` ${location}` : ' France'

    for (const platform of PLATFORMS) {
      if (leads.length >= maxResults) break

      try {
        const query = `${platform.siteFilter} ${keywords.join(' OR ')} recrute${locationStr}`
        const results = await searchSerper(query, perPlatform)

        for (const result of results) {
          if (leads.length >= maxResults) break

          const fullText = `${result.title || ''} ${result.snippet || ''}`
          const intent = analyzeHiringIntent(fullText, keywords)

          if (intent.matchCount === 0) continue

          const company = extractCompanyName(result.title, result.snippet)

          leads.push({
            source: 'offres_emploi',
            sourceUrl: result.link || '',
            sourcePublicStatement: fullText.slice(0, 500),
            platform: platform.id,
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            company,
            linkedinUrl: platform.id === 'linkedin_jobs' ? result.link : null,
            nativeContactId: result.link || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: false,
            budgetMentioned: false,
            isRecruiting: true,
            postedAt: result.date ? new Date(result.date).getTime() : Date.now(),
            rawData: {
              platformName: platform.name,
              title: result.title,
              snippet: result.snippet,
              hiringType: intent.hiringType,
              position: result.position || null
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (platformError) {
        console.log(JSON.stringify({
          event: 'offres_emploi_scraper_platform_error',
          platform: platform.id,
          error: platformError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'offres_emploi_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'offres_emploi_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
