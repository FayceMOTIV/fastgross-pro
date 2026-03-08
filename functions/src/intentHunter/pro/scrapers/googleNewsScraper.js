/**
 * Google News Scraper — Intent Hunter Pro
 *
 * Searches B2B news via Serper.dev news API for high-intent events:
 * fundraising (levees de fonds), executive nominations, expansions,
 * acquisitions, and office openings. These signals indicate companies
 * with budget and immediate needs.
 *
 * Auth: SERPER_API_KEY
 * Rate limit: 10 req/min (conservative to respect Serper quota)
 * API: https://google.serper.dev/news
 *
 * @module intentHunter/pro/scrapers/googleNewsScraper
 */

import axios from 'axios'

const SERPER_NEWS_URL = 'https://google.serper.dev/news'
const RATE_LIMIT_MS = 6500 // ~9 req/min to stay safe under 10

/** B2B news categories with search suffixes and intent classification */
const NEWS_CATEGORIES = [
  {
    id: 'fundraising',
    suffix: 'levee de fonds OR financement OR serie',
    intentLabel: 'Levee de fonds detectee',
    budgetLikely: true
  },
  {
    id: 'nomination',
    suffix: 'nomination OR nomme OR rejoint OR CDO OR CTO OR CMO OR CEO',
    intentLabel: 'Nomination detectee — decision maker',
    budgetLikely: false
  },
  {
    id: 'expansion',
    suffix: 'expansion OR ouverture bureau OR croissance OR recrute OR embauche',
    intentLabel: 'Expansion detectee — entreprise en croissance',
    budgetLikely: true
  },
  {
    id: 'acquisition',
    suffix: 'acquisition OR rachat OR fusionne OR partenariat strategique',
    intentLabel: 'Acquisition/partenariat detecte',
    budgetLikely: true
  },
  {
    id: 'product_launch',
    suffix: 'lance OR nouveau produit OR nouvelle offre OR plateforme',
    intentLabel: 'Lancement produit — besoin marketing/outils',
    budgetLikely: true
  }
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
 * Search Serper news API
 * @param {string} query - Search query
 * @param {number} num - Number of results
 * @param {string} tbs - Time filter ('qdr:d'=day, 'qdr:w'=week, 'qdr:m'=month)
 * @returns {Promise<Array>} News results
 */
const searchNews = async (query, num = 10, tbs = 'qdr:w') => {
  const apiKey = process.env.SERPER_API_KEY || ''

  if (!apiKey) {
    throw new Error('Missing SERPER_API_KEY')
  }

  const response = await axios.post(
    SERPER_NEWS_URL,
    { q: query, gl: 'fr', hl: 'fr', num, tbs },
    {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  )

  return response.data?.news || []
}

/**
 * Detect intent signals in news article
 * @param {string} text - Title + snippet
 * @param {Array<string>} keywords - Client keywords
 * @param {object} category - News category metadata
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords, category) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'urgent', 'imminent', 'des maintenant', 'cette semaine',
    'aujourd\'hui', 'annonce', 'confirme', 'officiel'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = category.budgetLikely

  const signal = [
    category.intentLabel,
    matched.length > 0 ? `Mots-cles: ${matched.join(', ')}` : ''
  ].filter(Boolean).join(' — ')

  return { matchCount: Math.max(matched.length, 1), urgency, budget, signal }
}

/**
 * Extract company name from news title
 * @param {string} title - News article title
 * @returns {string|null}
 */
const extractCompanyFromTitle = (title) => {
  if (!title) return null

  // Pattern: "Company : action" or "Company lance" or "Company leve"
  const colonMatch = title.match(/^([A-Z][\w\s&.'-]+?)\s*[:\u2014\u2013-]\s/i)
  if (colonMatch) return colonMatch[1].trim()

  // Pattern: "La startup Company ..."
  const startupMatch = title.match(/(?:startup|societe|entreprise|groupe|fintech)\s+([A-Z][\w\s&.'-]+?)(?:\s+(?:leve|lance|annonce|nomme|ouvre|recrute|acquiert))/i)
  if (startupMatch) return startupMatch[1].trim()

  return null
}

/**
 * Scrape Google News for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.categories] - Category IDs to search (default: all)
 * @param {string} [config.timeRange='qdr:w'] - Time range filter
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    categories: categoryFilter,
    timeRange = 'qdr:w'
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'google_news_scraper_start',
    clientId,
    keywords,
    maxResults,
    timeRange,
    categories: categoryFilter || 'all',
    timestamp: Date.now()
  }))

  const apiKey = process.env.SERPER_API_KEY || ''

  if (!apiKey) {
    console.log(JSON.stringify({
      event: 'google_news_scraper_skip',
      reason: 'Missing SERPER_API_KEY',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const categoriesToSearch = categoryFilter
      ? NEWS_CATEGORIES.filter((c) => categoryFilter.includes(c.id))
      : NEWS_CATEGORIES

    const perCategory = Math.ceil(maxResults / categoriesToSearch.length)
    const seenUrls = new Set()

    for (const category of categoriesToSearch) {
      if (leads.length >= maxResults) break

      try {
        const query = `${keywords.join(' OR ')} ${category.suffix}`
        const results = await searchNews(query, perCategory, timeRange)

        for (const article of results) {
          if (leads.length >= maxResults) break

          // Deduplicate by URL
          const articleUrl = article.link || ''
          if (articleUrl && seenUrls.has(articleUrl)) continue
          if (articleUrl) seenUrls.add(articleUrl)

          const fullText = `${article.title || ''} ${article.snippet || ''}`
          const intent = analyzeIntent(fullText, keywords, category)

          const company = extractCompanyFromTitle(article.title)

          leads.push({
            source: 'google_news',
            sourceUrl: articleUrl,
            sourcePublicStatement: fullText.slice(0, 500),
            platform: 'google_news',
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            company,
            linkedinUrl: null,
            nativeContactId: articleUrl || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            postedAt: article.date
              ? new Date(article.date).getTime()
              : Date.now(),
            rawData: {
              category: category.id,
              title: article.title || null,
              snippet: article.snippet || null,
              newsSource: article.source || null,
              imageUrl: article.imageUrl || null,
              position: article.position || null
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (categoryError) {
        console.log(JSON.stringify({
          event: 'google_news_scraper_category_error',
          category: category.id,
          error: categoryError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'google_news_scraper_complete',
      clientId,
      leadsFound: leads.length,
      categoriesSearched: categoriesToSearch.map((c) => c.id),
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'google_news_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
