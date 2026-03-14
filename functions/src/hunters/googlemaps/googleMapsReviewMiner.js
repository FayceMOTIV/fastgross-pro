/**
 * Google Maps Review Miner — Module 5 (Alex V4)
 * Extends the existing Google Maps Hunter with 4 targeted tactics:
 *
 *  A) Bad reviews mining: find competitor clients leaving 1-2 star reviews
 *  B) Low review count: businesses < 10 reviews = no marketing
 *  C) No website: urgent need for web presence
 *  D) Low rating: < 3.5 stars = operational problems, need solutions
 *
 * Uses existing Serper Maps API (same as googleMapsHunter) with post-filter scoring.
 * Cost: 0€ (uses existing Serper quota)
 *
 * Schedule: daily 7:30AM (after main Maps hunter at 7AM)
 * Storage: organizations/{orgId}/prospects (source = 'google_maps_miner')
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

const RATE_LIMITS = {
  maxSearches: 8,
  maxResultsPerSearch: 20,
  delayBetweenSearches: 500
}

// ─── Tactic definitions ─────────────────────────────────────────────

const TACTICS = {
  no_website: {
    label: 'Pas de site web',
    baseScore: 15,
    filter: (place) => !place.website && !place.websiteUrl,
    signal: 'Pas de site web liste sur Google Maps — besoin urgent de presence digitale'
  },
  low_reviews: {
    label: 'Peu d\'avis (< 10)',
    baseScore: 15,
    filter: (place) => (place.reviewCount || 0) < 10,
    signal: 'Moins de 10 avis Google — pas de strategie marketing/reputation'
  },
  low_rating: {
    label: 'Note faible (< 3.5)',
    baseScore: 20,
    filter: (place) => place.rating && place.rating < 3.5,
    signal: 'Note < 3.5/5 sur Google Maps — problemes operationnels, besoin d\'amelioration'
  },
  bad_reviews: {
    label: 'Concurrent mal note',
    baseScore: 25,
    filter: (place) => place.rating && place.rating < 3.0,
    signal: 'Concurrent tres mal note — clients potentiels mecontents a recuperer'
  }
}

// ─── Scheduled: daily 7:30AM ────────────────────────────────────────

export const googleMapsReviewMiner = onSchedule({
  schedule: '30 7 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  logger.info('📍 Maps Review Miner: starting daily scan')

  const db = getDb()
  const globalStats = { orgsProcessed: 0, scanned: 0, qualified: 0, saved: 0, errors: 0 }

  try {
    const orgsSnap = await db.collection('organizations').get()

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      if (!orgData.hunterConfig?.mapsReviewMinerEnabled) continue

      try {
        const stats = await runReviewMinerScan(db, orgId)
        globalStats.orgsProcessed++
        globalStats.scanned += stats.scanned
        globalStats.qualified += stats.qualified
        globalStats.saved += stats.saved
        globalStats.errors += stats.errors
      } catch (err) {
        logger.error(`Error processing org ${orgId}:`, err)
        globalStats.errors++
      }
    }
  } catch (err) {
    logger.error('Maps Review Miner fatal error:', err)
  }

  logger.info('📍 Maps Review Miner: done', globalStats)
})

// ─── Manual trigger ─────────────────────────────────────────────────

export const runGoogleMapsReviewMinerManual = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, keywords, location, tactics } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const stats = await runReviewMinerScan(db, orgId, keywords, location, tactics)

  return { success: true, stats }
})

// ─── Stats ──────────────────────────────────────────────────────────

export const getGoogleMapsReviewMinerStats = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const prospectsSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'google_maps_miner')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  const prospects = prospectsSnap.docs.map(d => d.data())

  const byTactic = {}
  for (const p of prospects) {
    for (const tactic of (p.matchedTactics || [])) {
      byTactic[tactic] = (byTactic[tactic] || 0) + 1
    }
  }

  return {
    success: true,
    stats: {
      total: prospects.length,
      byTactic,
      avgRating: prospects.length > 0
        ? (prospects.reduce((s, p) => s + (p.googleMapsRating || 0), 0) / prospects.length).toFixed(1)
        : 0,
      noWebsite: prospects.filter(p => !p.websiteUrl).length
    }
  }
})

// ─── Core scan logic ────────────────────────────────────────────────

export async function runReviewMinerScan(db, orgId, overrideKeywords, overrideLocation, enabledTactics) {
  const stats = { scanned: 0, qualified: 0, saved: 0, errors: 0 }

  if (!SERPER_API_KEY) {
    logger.error('SERPER_API_KEY not configured')
    return stats
  }

  // Load org context
  const context = await loadMinerContext(db, orgId)
  const keywords = overrideKeywords || context.keywords
  const location = overrideLocation || context.location
  const activeTactics = enabledTactics || Object.keys(TACTICS)

  if (!keywords.length) {
    logger.warn(`Org ${orgId}: no keywords configured for Maps Review Miner`)
    return stats
  }

  logger.info(`📍 Org ${orgId}: mining reviews for "${keywords.join(', ')}" in ${location}`)

  // Search Google Maps via Serper
  const allPlaces = []
  for (const keyword of keywords.slice(0, RATE_LIMITS.maxSearches)) {
    try {
      const places = await searchSerperMaps(keyword, location)
      allPlaces.push(...places.map(p => ({ ...p, searchKeyword: keyword })))
    } catch (err) {
      logger.warn(`Serper Maps error for "${keyword}":`, err.message)
      stats.errors++
    }

    if (keywords.indexOf(keyword) < keywords.length - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMITS.delayBetweenSearches))
    }
  }

  // Dedup by CID or place name + address
  const uniquePlaces = dedupPlaces(allPlaces)
  stats.scanned = uniquePlaces.length

  logger.info(`📍 Org ${orgId}: ${uniquePlaces.length} unique places to analyze`)

  // Apply tactics and score
  const qualified = []
  for (const place of uniquePlaces) {
    const { score, matchedTactics, signals } = applyTactics(place, activeTactics, context.competitors)

    if (score >= 15 && matchedTactics.length > 0) {
      qualified.push({ ...place, score, matchedTactics, signals })
    }
  }

  stats.qualified = qualified.length
  qualified.sort((a, b) => b.score - a.score)

  // Dedup against existing prospects (by phone, CID, or business name + address)
  const existingSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('platform', '==', 'googlemaps')
    .get()

  const existingKeys = new Set()
  for (const doc of existingSnap.docs) {
    const d = doc.data()
    if (d.googleMapsCid) existingKeys.add(`cid:${d.googleMapsCid}`)
    if (d.phone) existingKeys.add(`phone:${normalizePhone(d.phone)}`)
    if (d.businessName && d.address) existingKeys.add(`name:${d.businessName}:${d.address}`)
  }

  const newProspects = qualified.filter(p => {
    if (p.cid && existingKeys.has(`cid:${p.cid}`)) return false
    if (p.phone && existingKeys.has(`phone:${normalizePhone(p.phone)}`)) return false
    if (p.title && p.address && existingKeys.has(`name:${p.title}:${p.address}`)) return false
    return true
  })

  // Save to Firestore
  const batch = db.batch()
  for (const place of newProspects.slice(0, 50)) {
    const ref = db.collection('organizations').doc(orgId).collection('prospects').doc()
    batch.set(ref, {
      companyName: place.title || place.businessName || '',
      businessName: place.title || '',
      fullName: place.title || '',
      source: 'google_maps_miner',
      platform: 'googlemaps',
      platformId: place.cid || place.placeId || '',
      signal_type: place.matchedTactics.includes('bad_reviews') ? 'competitor_user'
        : place.matchedTactics.includes('no_website') ? 'no_website'
          : place.matchedTactics.includes('low_reviews') ? 'low_reviews'
            : 'low_rating',
      signal_detail: place.signals.join('. '),
      score: place.score,
      status: 'new',
      foundByAlex: true,
      isBusiness: true,

      // Google Maps fields
      googleMapsUrl: place.link || '',
      googleMapsCid: place.cid || '',
      googleMapsRating: place.rating || null,
      googleMapsReviews: place.reviewCount || 0,
      googleMapsCategory: place.category || '',
      address: place.address || '',
      latitude: place.latitude || null,
      longitude: place.longitude || null,
      phone: place.phone || '',
      websiteUrl: place.website || '',

      // Tactic-specific fields
      matchedTactics: place.matchedTactics,
      searchKeyword: place.searchKeyword,

      platforms: ['googlemaps'],
      channels: {
        email: false,
        phone: !!place.phone,
        linkedin: false
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    stats.saved++
  }

  if (stats.saved > 0) {
    await batch.commit()

    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'maps_review_miner_complete',
      title: 'Google Maps Mining: Scan termine',
      message: `${stats.scanned} lieux analyses, ${stats.qualified} avec signaux, ${stats.saved} nouveaux prospects`,
      data: stats,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  }

  // Log run
  await db.collection('organizations').doc(orgId).collection('hunterLogs').add({
    hunter: 'google_maps_review_miner',
    stats,
    keywords,
    location,
    activeTactics,
    runAt: FieldValue.serverTimestamp()
  })

  logger.info(`📍 Org ${orgId}: done`, stats)
  return stats
}

// ─── Serper Maps API ────────────────────────────────────────────────

async function searchSerperMaps(keyword, location) {
  const response = await axios.post('https://google.serper.dev/maps', {
    q: keyword,
    location: location,
    gl: 'fr',
    hl: 'fr',
    num: RATE_LIMITS.maxResultsPerSearch
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  })

  return (response.data?.places || []).map(place => ({
    title: place.title || '',
    address: place.address || '',
    phone: place.phoneNumber || '',
    website: place.website || '',
    rating: place.rating || null,
    reviewCount: place.ratingCount || 0,
    category: place.category || '',
    cid: place.cid || '',
    placeId: place.placeId || '',
    link: place.link || '',
    latitude: place.latitude || null,
    longitude: place.longitude || null
  }))
}

// ─── Tactic scoring ─────────────────────────────────────────────────

function applyTactics(place, activeTactics, competitors) {
  let score = 0
  const matchedTactics = []
  const signals = []

  // Apply each active tactic
  for (const tacticKey of activeTactics) {
    const tactic = TACTICS[tacticKey]
    if (!tactic) continue

    if (tactic.filter(place)) {
      score += tactic.baseScore
      matchedTactics.push(tacticKey)
      signals.push(tactic.signal)
    }
  }

  // Bonus: has phone number (+15)
  if (place.phone) {
    score += 15
    signals.push('Telephone disponible')
  }

  // Bonus: competitor category match (+10)
  if (competitors.length > 0 && place.category) {
    const categoryLower = place.category.toLowerCase()
    for (const competitor of competitors) {
      if (categoryLower.includes(competitor.toLowerCase())) {
        score += 10
        signals.push(`Categorie match concurrent: ${competitor}`)
        break
      }
    }
  }

  // Bonus: multiple tactics matched (+10)
  if (matchedTactics.length >= 2) {
    score += 10
    signals.push('Signaux multiples — prospect prioritaire')
  }

  // Bonus: very low rating + low reviews = distressed business (+15)
  if (place.rating && place.rating < 3.0 && (place.reviewCount || 0) < 5) {
    score += 15
    signals.push('Entreprise en difficulte — peu d\'avis et note tres basse')
  }

  return {
    score: Math.min(score, 100),
    matchedTactics,
    signals
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function loadMinerContext(db, orgId) {
  const result = { keywords: [], location: 'Paris', competitors: [] }

  const profileSnap = await db
    .collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile')
    .get()

  if (profileSnap.exists) {
    const profile = profileSnap.data()
    if (profile.niche) result.keywords.push(profile.niche)
    if (profile.keywords) result.keywords.push(...profile.keywords)
    if (profile.sector) result.keywords.push(profile.sector)
    if (profile.zone || profile.city) result.location = profile.zone || profile.city
    if (profile.competitors) result.competitors.push(...profile.competitors)
  }

  // Fallback to ICP
  if (!result.keywords.length) {
    const icpSnap = await db
      .collection('organizations').doc(orgId)
      .collection('settings').doc('icp')
      .get()

    if (icpSnap.exists) {
      const icp = icpSnap.data()
      if (icp.mapsKeywords || icp.targetKeywords) {
        result.keywords = icp.mapsKeywords || icp.targetKeywords
      }
      if (icp.targetLocation) result.location = icp.targetLocation
    }
  }

  result.keywords = [...new Set(result.keywords.map(k => k.trim()).filter(Boolean))]
  result.competitors = [...new Set(result.competitors.map(c => c.trim()).filter(Boolean))]

  return result
}

function dedupPlaces(places) {
  const seen = new Set()
  return places.filter(p => {
    const key = p.cid || `${p.title}:${p.address}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizePhone(phone) {
  return (phone || '').replace(/[\s.\-()]/g, '')
}
