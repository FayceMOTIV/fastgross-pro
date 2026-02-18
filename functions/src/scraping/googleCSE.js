/**
 * Google Custom Search Engine - Prospect Discovery
 * Face Media Factory
 *
 * Features:
 * - Paginated search (up to 100 results via CSE API)
 * - 24h Firestore cache to avoid duplicate queries
 * - Rate limiting (1 req/sec to respect Google API limits)
 * - Prospect extraction and deduplication
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const RATE_LIMIT_MS = 1100 // 1.1 seconds between requests
let lastRequestTime = 0

/**
 * Search for prospects using Google Custom Search Engine
 * @param {string} query - Search query
 * @param {Object} options
 * @param {number} [options.maxResults=10] - Max results (10-100, in increments of 10)
 * @param {string} [options.orgId] - Org ID for caching
 * @param {boolean} [options.useCache=true] - Whether to use 24h cache
 * @returns {Promise<Array>} Search results
 */
export async function searchProspects(query, options = {}) {
  const { maxResults = 10, orgId, useCache = true } = options
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cxId = process.env.GOOGLE_CSE_ENGINE_ID || process.env.GOOGLE_CSE_CX_ID

  if (!apiKey || !cxId) {
    console.warn('[CSE] Google CSE not configured (GOOGLE_CSE_API_KEY or GOOGLE_CSE_ENGINE_ID missing)')
    return []
  }

  // Check cache first
  if (useCache && orgId) {
    const cached = await getCachedResults(query, orgId)
    if (cached) {
      console.log(`[CSE] Cache hit for query: "${query}"`)
      return cached
    }
  }

  const allResults = []
  const pages = Math.min(Math.ceil(maxResults / 10), 10) // CSE max 100 results (10 pages of 10)

  for (let page = 0; page < pages; page++) {
    // Rate limiting
    await enforceRateLimit()

    const start = page * 10 + 1
    const num = Math.min(10, maxResults - allResults.length)

    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1')
      url.searchParams.set('key', apiKey)
      url.searchParams.set('cx', cxId)
      url.searchParams.set('q', query)
      url.searchParams.set('num', num.toString())
      url.searchParams.set('start', start.toString())

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.error) {
        console.error('[CSE] API error:', data.error.message)
        break
      }

      if (!data.items || data.items.length === 0) break

      allResults.push(...data.items)

      // Stop if we got fewer results than requested (no more available)
      if (data.items.length < num) break
    } catch (error) {
      console.error(`[CSE] Request failed (page ${page + 1}):`, error.message)
      break
    }
  }

  // Extract prospect data from results
  const prospects = extractProspectsFromResults(allResults)

  // Cache results
  if (useCache && orgId && prospects.length > 0) {
    await cacheResults(query, orgId, prospects)
  }

  return prospects
}

/**
 * Extract structured prospect data from CSE results
 */
function extractProspectsFromResults(results) {
  const seen = new Set()
  const prospects = []

  for (const item of results) {
    // Deduplicate by domain
    const domain = extractDomain(item.link)
    if (seen.has(domain)) continue
    seen.add(domain)

    prospects.push({
      name: cleanBusinessName(item.title),
      url: item.link,
      domain,
      snippet: item.snippet || '',
      sector: detectSector(item.title, item.snippet),
      source: 'google_cse',
      discoveredAt: new Date().toISOString(),
      relevanceScore: calculateRelevance(item)
    })
  }

  return prospects.sort((a, b) => b.relevanceScore - a.relevanceScore)
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Clean business name from search title
 */
function cleanBusinessName(title) {
  return title
    .replace(/\s*[-|]\s*.*/g, '') // Remove everything after - or |
    .replace(/\s*·\s*.*/g, '') // Remove after ·
    .trim()
    .slice(0, 100)
}

/**
 * Detect sector from title and snippet
 */
function detectSector(title, snippet) {
  const text = `${title} ${snippet}`.toLowerCase()
  const sectors = {
    'restaurant': /restaurant|bistro|brasserie|gastronomie|chef|cuisine/,
    'commerce': /boutique|magasin|shop|commerce|vente/,
    'sante': /medecin|dentiste|kine|cabinet|sante|clinique|pharmacie/,
    'beaute': /coiffeur|salon|beaute|esthetique|spa|barbier/,
    'immobilier': /immobilier|agence|location|vente|appartement/,
    'tech': /agence web|developpeur|startup|saas|digital/,
    'education': /ecole|formation|cours|coaching|coach/,
    'fitness': /fitness|sport|gym|salle|musculation|yoga/,
    'marketing': /marketing|agence|communication|pub|publicite/
  }

  for (const [sector, regex] of Object.entries(sectors)) {
    if (regex.test(text)) return sector
  }
  return 'other'
}

/**
 * Calculate relevance score (0-100) for a search result
 */
function calculateRelevance(item) {
  let score = 50

  // Has a snippet (more information)
  if (item.snippet && item.snippet.length > 50) score += 10

  // Has structured data
  if (item.pagemap?.metatags) score += 5

  // Has phone/email indicators in snippet
  if (item.snippet && /\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/.test(item.snippet)) score += 10
  if (item.snippet && /@/.test(item.snippet)) score += 10

  // Has social media
  if (item.snippet && /instagram|facebook|linkedin/.test(item.snippet?.toLowerCase())) score += 5

  // Website (not social media or directory)
  const domain = extractDomain(item.link)
  if (/facebook\.com|instagram\.com|linkedin\.com|twitter\.com|yelp|tripadvisor|pagesjaunes/.test(domain)) {
    score -= 20 // Penalize social/directory listings
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Enforce rate limiting
 */
async function enforceRateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

/**
 * Get cached results from Firestore (24h TTL)
 */
async function getCachedResults(query, orgId) {
  try {
    const db = getDb()
    const cacheRef = db.collection('cse_cache')
    const cacheKey = `${orgId}_${query.toLowerCase().replace(/\s+/g, '_').slice(0, 100)}`

    const doc = await cacheRef.doc(cacheKey).get()
    if (!doc.exists) return null

    const data = doc.data()
    const age = Date.now() - data.cachedAt.toMillis()
    const TTL_24H = 24 * 60 * 60 * 1000

    if (age > TTL_24H) {
      // Expired, delete it
      await doc.ref.delete()
      return null
    }

    return data.results
  } catch (error) {
    console.warn('[CSE] Cache read error:', error.message)
    return null
  }
}

/**
 * Cache results in Firestore
 */
async function cacheResults(query, orgId, results) {
  try {
    const db = getDb()
    const cacheKey = `${orgId}_${query.toLowerCase().replace(/\s+/g, '_').slice(0, 100)}`

    await db.collection('cse_cache').doc(cacheKey).set({
      query,
      orgId,
      results,
      resultCount: results.length,
      cachedAt: FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.warn('[CSE] Cache write error:', error.message)
  }
}

/**
 * Get CSE configuration status
 */
export function getCSEStatus() {
  return {
    configured: !!(process.env.GOOGLE_CSE_API_KEY && (process.env.GOOGLE_CSE_ENGINE_ID || process.env.GOOGLE_CSE_CX_ID)),
    apiKey: process.env.GOOGLE_CSE_API_KEY ? 'configured' : 'missing',
    engineId: (process.env.GOOGLE_CSE_ENGINE_ID || process.env.GOOGLE_CSE_CX_ID) ? 'configured' : 'missing'
  }
}
