/**
 * Serper Cache — Centralized cached Serper.dev API client
 *
 * Firestore-backed 24h cache to avoid duplicate API calls.
 * Collection: serper_cache (root-level)
 * Key: SHA-256 hash of endpoint + body (truncated 40 chars)
 * TTL: 24h by default, auto-cleanup on read
 *
 * Usage:
 *   const { cachedSerperFetch } = await import('../utils/serperCache.js')
 *   const data = await cachedSerperFetch('search', { q: 'query', gl: 'fr', hl: 'fr' })
 */

import { getFirestore } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

const getDb = () => getFirestore()
const SERPER_BASE_URL = 'https://google.serper.dev'
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const CACHE_COLLECTION = 'serper_cache'

/**
 * Generate a cache key from endpoint + body
 */
function cacheKey(endpoint, body) {
  const raw = JSON.stringify({ endpoint, body })
  return createHash('sha256').update(raw).digest('hex').slice(0, 40)
}

/**
 * Cached Serper fetch — checks Firestore cache first, falls back to API
 *
 * @param {string} endpoint - Serper endpoint ('search', 'maps', 'news', etc.)
 * @param {Object} body - Request body (q, gl, hl, num, etc.)
 * @param {Object} [options]
 * @param {number} [options.ttlMs] - Cache TTL in ms (default 24h)
 * @param {number} [options.timeoutMs] - Fetch timeout in ms (default 10000)
 * @param {boolean} [options.skipCache] - Force fresh fetch
 * @returns {Promise<Object>} Serper API response data
 */
export async function cachedSerperFetch(endpoint, body, options = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    timeoutMs = 10000,
    skipCache = false,
  } = options

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    console.warn('[SerperCache] SERPER_API_KEY not configured')
    return { organic: [], error: 'SERPER_API_KEY not set' }
  }

  const key = cacheKey(endpoint, body)
  const db = getDb()
  const cacheRef = db.collection(CACHE_COLLECTION).doc(key)

  // Check cache
  if (!skipCache) {
    try {
      const cached = await cacheRef.get()
      if (cached.exists) {
        const data = cached.data()
        const age = Date.now() - (data.cachedAt?.toMillis?.() || 0)
        if (age < ttlMs) {
          return data.response
        }
        // Expired — delete async (non-blocking)
        cacheRef.delete().catch(() => {})
      }
    } catch {
      // Cache read failure — proceed to API
    }
  }

  // Fetch from Serper
  const url = `${SERPER_BASE_URL}/${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error(`[SerperCache] API error ${response.status}: ${errText}`)
    return { organic: [], error: `Serper ${response.status}` }
  }

  const data = await response.json()

  // Save to cache (non-blocking)
  cacheRef.set({
    response: data,
    endpoint,
    query: body.q || '',
    cachedAt: new Date(),
  }).catch(() => {})

  return data
}
