/**
 * Serper.dev Search - Prospect Discovery
 * Face Media Factory
 *
 * Replaces Google CSE (too many restrictions).
 * Serper.dev: 2500 free searches/month, no credit card required.
 *
 * Features:
 * - Paginated search (up to 100 results)
 * - 24h Firestore cache to avoid duplicate queries
 * - Prospect extraction and deduplication by domain
 * - Relevance scoring
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Search for prospects using Serper.dev
 * @param {string} query - Search query
 * @param {Object} options
 * @param {number} [options.maxResults=10] - Max results (10-100)
 * @param {string} [options.orgId] - Org ID for caching
 * @param {boolean} [options.useCache=true] - Whether to use 24h cache
 * @param {string} [options.gl='fr'] - Country code
 * @param {string} [options.hl='fr'] - Language code
 * @returns {Promise<Array>} Search results
 */
export async function searchProspects(query, options = {}) {
  const { maxResults = 10, orgId, useCache = true, gl = 'fr', hl = 'fr' } = options
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    console.warn('[Search] Serper not configured (SERPER_API_KEY missing)')
    return []
  }

  // Check cache first
  if (useCache && orgId) {
    const cached = await getCachedResults(query, orgId)
    if (cached) {
      console.log(`[Search] Cache hit for query: "${query}"`)
      return cached
    }
  }

  const { cachedSerperFetch } = await import('../utils/serperCache.js')
  const allResults = []
  const pages = Math.min(Math.ceil(maxResults / 10), 10)

  for (let page = 0; page < pages; page++) {
    try {
      const data = await cachedSerperFetch('search', { q: query, gl, hl, num: 10, page: page + 1 })

      if (data.error) {
        console.error('[Search] Serper API error:', data.error)
        break
      }

      const items = data.organic || []
      if (items.length === 0) break

      allResults.push(...items)

      if (allResults.length >= maxResults) break
      if (items.length < 10) break
    } catch (error) {
      console.error(`[Search] Request failed (page ${page + 1}):`, error.message)
      break
    }
  }

  // Extract prospect data from results
  const prospects = extractProspectsFromResults(allResults.slice(0, maxResults))

  // Cache results
  if (useCache && orgId && prospects.length > 0) {
    await cacheResults(query, orgId, prospects)
  }

  return prospects
}

/**
 * Extract structured prospect data from search results
 */
function extractProspectsFromResults(results) {
  const seen = new Set()
  const prospects = []

  for (const item of results) {
    const domain = extractDomain(item.link)
    if (seen.has(domain)) continue
    seen.add(domain)

    prospects.push({
      name: cleanBusinessName(item.title),
      url: item.link,
      domain,
      snippet: item.snippet || '',
      sector: detectSector(item.title, item.snippet),
      source: 'serper',
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
    .replace(/\s*[-|]\s*.*/g, '')
    .replace(/\s*·\s*.*/g, '')
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

  if (item.snippet && item.snippet.length > 50) score += 10
  if (item.sitelinks) score += 5
  if (item.snippet && /\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/.test(item.snippet)) score += 10
  if (item.snippet && /@/.test(item.snippet)) score += 10
  if (item.snippet && /instagram|facebook|linkedin/.test(item.snippet?.toLowerCase())) score += 5

  const domain = extractDomain(item.link)
  if (/facebook\.com|instagram\.com|linkedin\.com|twitter\.com|yelp|tripadvisor|pagesjaunes/.test(domain)) {
    score -= 20
  }

  return Math.max(0, Math.min(100, score))
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
      await doc.ref.delete()
      return null
    }

    return data.results
  } catch (error) {
    console.warn('[Search] Cache read error:', error.message)
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
    console.warn('[Search] Cache write error:', error.message)
  }
}

/**
 * Get search configuration status
 */
export function getCSEStatus() {
  return {
    configured: !!process.env.SERPER_API_KEY,
    provider: 'serper.dev',
    apiKey: process.env.SERPER_API_KEY ? 'configured' : 'missing'
  }
}
