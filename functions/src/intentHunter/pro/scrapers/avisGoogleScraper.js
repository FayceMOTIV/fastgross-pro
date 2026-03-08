/**
 * Avis Google Scraper — Intent Hunter Pro
 *
 * Finds unhappy customers of competitor businesses via Google Places API.
 * Filters reviews rated 1-3 stars — these users are ready to switch providers.
 *
 * Auth: GOOGLE_PLACES_API_KEY
 * Rate limit: ~5 req/min (respectful usage of Places API quota)
 *
 * @module intentHunter/pro/scrapers/avisGoogleScraper
 */

import axios from 'axios'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const PLACES_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
const PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'

const RATE_LIMIT_MS = 12000 // ~5 req/min
const MAX_REVIEW_RATING = 3 // Only 1-3 star reviews

/** Keywords in negative reviews that signal switching intent */
const SWITCHING_SIGNALS = [
  'cherche alternative', 'changer', 'quitter', 'decu', 'arnaque',
  'mauvais service', 'ne recommande pas', 'horrible', 'nul',
  'incompetent', 'trop cher', 'pas fiable', 'probleme',
  'jamais plus', 'eviter', 'scandaleux', 'inacceptable'
]

/**
 * Sleep with jitter
 * @param {number} baseMs
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.25)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Search Google Places for competitor businesses
 * @param {string} query - Search query (e.g., "agence marketing Paris")
 * @param {string} [location] - Location bias
 * @returns {Promise<Array>} Place results
 */
const searchPlaces = async (query, location) => {
  const params = {
    query,
    key: GOOGLE_PLACES_API_KEY,
    language: 'fr',
    region: 'fr'
  }

  if (location) {
    params.query = `${query} ${location}`
  }

  const response = await axios.get(PLACES_SEARCH_URL, { params, timeout: 10000 })
  return response.data?.results || []
}

/**
 * Get reviews for a specific place
 * @param {string} placeId - Google Place ID
 * @returns {Promise<{ reviews: Array, name: string, rating: number }>}
 */
const getPlaceReviews = async (placeId) => {
  const response = await axios.get(PLACE_DETAILS_URL, {
    params: {
      place_id: placeId,
      fields: 'name,rating,reviews,formatted_phone_number,website,url',
      key: GOOGLE_PLACES_API_KEY,
      language: 'fr'
    },
    timeout: 10000
  })

  const result = response.data?.result || {}
  return {
    reviews: result.reviews || [],
    name: result.name || null,
    rating: result.rating || null,
    phone: result.formatted_phone_number || null,
    website: result.website || null,
    mapsUrl: result.url || null
  }
}

/**
 * Analyze negative review for switching intent
 * @param {string} text - Review text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, signal: string, switchingIntent: boolean }}
 */
const analyzeReview = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedSignals = SWITCHING_SIGNALS.filter((s) => lower.includes(s))

  const switchingIntent = matchedSignals.length > 0
  const signal = [
    switchingIntent ? `Insatisfaction detectee: ${matchedSignals.slice(0, 3).join(', ')}` : 'Avis negatif',
    matchedKeywords.length > 0 ? `Mots-cles: ${matchedKeywords.join(', ')}` : ''
  ].filter(Boolean).join(' — ')

  return {
    matchCount: matchedKeywords.length + matchedSignals.length,
    signal,
    switchingIntent
  }
}

/**
 * Scrape Google Places reviews for unhappy competitor customers
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords / competitor types to search
 * @param {number} [config.maxResults=30] - Max total leads
 * @param {string} [config.location] - Location filter (e.g., "Paris")
 * @param {number} [config.maxPlaces=10] - Max places to scan reviews
 * @returns {Promise<Array>} Standardized leads with competitorRating
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 30, location, maxPlaces = 10 } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'avis_google_scraper_start',
    clientId,
    keywords,
    maxResults,
    location: location || 'France',
    maxPlaces,
    timestamp: Date.now()
  }))

  if (!GOOGLE_PLACES_API_KEY) {
    console.log(JSON.stringify({
      event: 'avis_google_scraper_skip',
      reason: 'Missing GOOGLE_PLACES_API_KEY',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const query = keywords.join(' ')
    const places = await searchPlaces(query, location)
    const placesToScan = places.slice(0, maxPlaces)

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const place of placesToScan) {
      if (leads.length >= maxResults) break

      try {
        const details = await getPlaceReviews(place.place_id)
        const negativeReviews = details.reviews.filter((r) => r.rating <= MAX_REVIEW_RATING)

        for (const review of negativeReviews) {
          if (leads.length >= maxResults) break

          const intent = analyzeReview(review.text, keywords)

          leads.push({
            source: 'avis_google',
            sourceUrl: details.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            sourcePublicStatement: (review.text || '').slice(0, 500),
            platform: 'google_maps',
            firstName: review.author_name?.split(' ')[0] || null,
            lastName: review.author_name?.split(' ').slice(1).join(' ') || null,
            email: null,
            phone: null,
            company: details.name,
            linkedinUrl: null,
            nativeContactId: review.author_url || review.author_name || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.switchingIntent,
            budgetMentioned: false,
            competitorRating: review.rating,
            postedAt: review.time ? review.time * 1000 : Date.now(),
            rawData: {
              placeId: place.place_id,
              competitorName: details.name,
              competitorOverallRating: details.rating,
              reviewRating: review.rating,
              reviewerName: review.author_name,
              competitorWebsite: details.website,
              competitorPhone: details.phone
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (placeError) {
        console.log(JSON.stringify({
          event: 'avis_google_scraper_place_error',
          placeId: place.place_id,
          error: placeError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'avis_google_scraper_complete',
      clientId,
      leadsFound: leads.length,
      placesScanned: placesToScan.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'avis_google_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
