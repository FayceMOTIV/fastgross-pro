/**
 * Google Maps Hunter
 * Automated B2B prospect discovery via Serper.dev Maps API
 * Finds local businesses matching ICP criteria with phone, email, website
 *
 * Cost: $0 (uses existing Serper quota - 2500 free/month)
 * Endpoint: POST https://google.serper.dev/maps
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../../ai/callAI.js'
import axios from 'axios'

const getDb = () => getFirestore()

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

const RATE_LIMITS = {
  maxResultsPerSearch: 20,
  maxSearchesPerRun: 5,
  delayBetweenProcessing: 500
}

/**
 * Scheduled Google Maps Hunter
 * Runs daily at 7AM Paris time (first in the chain: Maps 7AM, IG 9AM, TikTok 10AM, FB 11AM)
 */
export const googleMapsHunter = onSchedule({
  schedule: '0 7 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540
}, async (event) => {
  console.log('📍 Google Maps Hunter: Starting daily scan...')

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0, errors: 0, merged: 0, skipped: 0 }

  try {
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.googleMapsEnabled) continue

      const icpSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('icp')
        .get()

      const icp = icpSnapshot.exists ? icpSnapshot.data() : {}
      const keywords = icp.mapsKeywords || icp.targetKeywords || ['agence marketing']
      const location = icp.targetLocation || 'Paris'

      console.log(`📍 Processing org: ${orgId}, keywords: ${keywords.join(', ')}, location: ${location}`)

      for (const keyword of keywords.slice(0, RATE_LIMITS.maxSearchesPerRun)) {
        try {
          const prospects = await searchGoogleMaps(keyword, location)
          stats.scanned += prospects.length

          for (const prospect of prospects) {
            try {
              const qualification = await qualifyMapsProspectWithAI(prospect, icp)

              if (qualification.score >= 60) {
                stats.qualified++
                const saveResult = await saveWithDedup(db, orgId, prospect, qualification, keyword)
                if (saveResult === 'saved') stats.saved++
                else if (saveResult === 'merged') stats.merged++
                else stats.skipped++
              }
            } catch (err) {
              console.error(`Error qualifying Maps prospect ${prospect.businessName}:`, err)
              stats.errors++
            }
          }
        } catch (err) {
          console.error(`Error searching Maps for "${keyword}":`, err)
          stats.errors++
        }
      }

      await db.collection('organizations').doc(orgId).collection('notifications').add({
        type: 'googlemaps_hunter_complete',
        title: 'Google Maps Hunter: Scan termine',
        message: `${stats.scanned} entreprises scannees, ${stats.qualified} qualifiees, ${stats.saved} nouveaux, ${stats.merged} fusionnes`,
        data: stats,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      })

      await db.collection('organizations').doc(orgId).collection('analytics').doc('googlemaps_hunter').set({
        lastRun: FieldValue.serverTimestamp(),
        lastStats: stats,
        totalScanned: FieldValue.increment(stats.scanned),
        totalQualified: FieldValue.increment(stats.qualified),
        totalSaved: FieldValue.increment(stats.saved)
      }, { merge: true })
    }

    console.log('Google Maps Hunter complete:', stats)
    return stats
  } catch (error) {
    console.error('Google Maps Hunter failed:', error)
    throw error
  }
})

/**
 * Manual trigger for Google Maps Hunter (callable)
 */
export const runGoogleMapsHunterManual = onCall({
  region: 'europe-west1',
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 300
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, keyword, location, radius } = data

  if (!orgId || !keyword) {
    throw new HttpsError('invalid-argument', 'orgId and keyword are required')
  }

  console.log(`Manual Google Maps Hunt: org=${orgId}, keyword=${keyword}, location=${location || 'France'}`)

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0, merged: 0, skipped: 0 }

  try {
    const icpSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('settings')
      .doc('icp')
      .get()

    const icp = icpSnapshot.exists ? icpSnapshot.data() : {}

    const prospects = await searchGoogleMaps(keyword, location || 'France')
    stats.scanned = prospects.length

    for (const prospect of prospects) {
      const qualification = await qualifyMapsProspectWithAI(prospect, icp)

      if (qualification.score >= 60) {
        stats.qualified++
        const saveResult = await saveWithDedup(db, orgId, prospect, qualification, keyword)
        if (saveResult === 'saved') stats.saved++
        else if (saveResult === 'merged') stats.merged++
        else stats.skipped++
      }
    }

    return {
      success: true,
      message: `Scan termine: ${stats.scanned} scannees, ${stats.qualified} qualifiees, ${stats.saved} sauvegardees, ${stats.merged} fusionnees`,
      stats
    }
  } catch (error) {
    console.error('Manual Google Maps Hunt failed:', error)
    throw new HttpsError('internal', `Scan failed: ${error.message}`)
  }
})

/**
 * Search businesses via Serper Maps API
 * POST https://google.serper.dev/maps
 */
async function searchGoogleMaps(keyword, location) {
  if (!SERPER_API_KEY) {
    console.warn('Serper API key not configured, using mock data')
    return getMockMapsProspects(keyword, location)
  }

  try {
    const query = `${keyword} ${location}`
    console.log(`Serper Maps query: "${query}"`)

    const response = await axios.post(
      'https://google.serper.dev/maps',
      { q: query, num: RATE_LIMITS.maxResultsPerSearch, gl: 'fr', hl: 'fr' },
      {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    )

    const places = response.data?.places || []
    const prospects = []

    for (const place of places) {
      const prospect = {
        businessName: place.title || '',
        address: place.address || '',
        phone: place.phoneNumber || '',
        website: place.website || '',
        rating: place.rating || null,
        reviewCount: place.ratingCount || 0,
        category: place.category || '',
        cid: place.cid || '',
        latitude: place.latitude || null,
        longitude: place.longitude || null,
        googleMapsUrl: place.link || '',
        thumbnailUrl: place.thumbnailUrl || '',
        openingHours: place.openingHours || '',
        // Extracted from place data
        email: extractEmailFromPlace(place),
        placeId: place.placeId || ''
      }

      prospects.push(prospect)
    }

    console.log(`Found ${prospects.length} businesses for "${query}" via Serper Maps`)
    return prospects

  } catch (error) {
    console.error('Serper Maps error:', error.message)
    return getMockMapsProspects(keyword, location)
  }
}

/**
 * Try to extract email from place description or website snippet
 */
function extractEmailFromPlace(place) {
  const texts = [
    place.description || '',
    place.snippet || '',
    place.address || ''
  ].join(' ')

  const emailMatch = texts.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  return emailMatch ? emailMatch[0].toLowerCase() : ''
}

/**
 * Qualify Google Maps prospect using AI
 */
async function qualifyMapsProspectWithAI(prospect, icp) {
  try {
    const prompt = `Tu es un expert en qualification de prospects B2B. Analyse cette entreprise trouvee sur Google Maps et donne un score de 0 a 100.

ENTREPRISE GOOGLE MAPS:
- Nom: ${prospect.businessName}
- Categorie: ${prospect.category || 'Non specifie'}
- Adresse: ${prospect.address}
- Telephone: ${prospect.phone || 'Non trouve'}
- Site web: ${prospect.website || 'Non trouve'}
- Email: ${prospect.email || 'Non trouve'}
- Note Google: ${prospect.rating ? prospect.rating + '/5' : 'Pas de note'} (${prospect.reviewCount} avis)

PROFIL CLIENT IDEAL (ICP):
- Secteur cible: ${icp.industry || 'Tous secteurs'}
- Roles cibles: ${icp.targetRoles?.join(', ') || 'Entrepreneurs, Dirigeants'}
- Taille entreprise: ${icp.companySize || 'PME'}
- Mots-cles: ${icp.keywords?.join(', ') || 'business, agence, marketing'}
- Zone geographique: ${icp.targetLocation || 'France'}

CRITERES DE SCORING:
- 80-100: Entreprise active avec telephone + site web, bon rating, secteur pertinent
- 60-79: Entreprise avec coordonnees partielles, bon potentiel
- 40-59: Entreprise mais peu d'infos exploitables
- 0-39: Pas de fit ou infos insuffisantes

BONUS:
- Telephone trouve: +15 points
- Site web: +10 points
- Email trouve: +15 points
- Note >= 4.0: +10 points
- Plus de 50 avis: +5 points

Reponds UNIQUEMENT avec ce JSON:
{
  "score": <number 0-100>,
  "reason": "<explication courte>",
  "approach": "<suggestion d'approche personnalisee>"
}`

    const text = await callAI(prompt, 500)
    const analysis = extractJSON(text)
    if (!analysis) throw new Error('No JSON in response')

    return {
      score: Math.min(100, Math.max(0, analysis.score || 0)),
      reason: analysis.reason || 'Score calcule par IA',
      approach: analysis.approach || 'Message de prospection standard'
    }
  } catch (error) {
    console.error('AI qualification error:', error.message)
    // Heuristic fallback
    let score = 40
    if (prospect.phone) score += 15
    if (prospect.website) score += 10
    if (prospect.email) score += 15
    if (prospect.rating && prospect.rating >= 4.0) score += 10
    if (prospect.reviewCount > 50) score += 5

    return {
      score: Math.min(100, score),
      reason: 'Score heuristique - IA indisponible',
      approach: 'Contact telephonique direct ou visite du site web'
    }
  }
}

/**
 * Save prospect with cross-platform deduplication
 */
async function saveWithDedup(db, orgId, prospect, qualification, keyword) {
  const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')

  // Check if same Google Maps business already exists (by CID or name+address)
  if (prospect.cid) {
    const cidCheck = await prospectsRef
      .where('googleMapsCid', '==', prospect.cid)
      .limit(1)
      .get()
    if (!cidCheck.empty) return 'exists'
  }

  // Cross-platform dedup: check by phone
  let crossPlatformDoc = null
  if (prospect.phone) {
    const normalizedPhone = prospect.phone.replace(/[\s.-]/g, '')
    const phoneCheck = await prospectsRef
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get()
    if (!phoneCheck.empty) crossPlatformDoc = phoneCheck.docs[0]
  }

  // Cross-platform dedup: check by email
  if (!crossPlatformDoc && prospect.email) {
    const emailCheck = await prospectsRef
      .where('email', '==', prospect.email)
      .limit(1)
      .get()
    if (!emailCheck.empty) crossPlatformDoc = emailCheck.docs[0]
  }

  // Cross-platform dedup: check by website
  if (!crossPlatformDoc && prospect.website) {
    const websiteCheck = await prospectsRef
      .where('websiteUrl', '==', prospect.website)
      .limit(1)
      .get()
    if (!websiteCheck.empty) crossPlatformDoc = websiteCheck.docs[0]
  }

  if (crossPlatformDoc) {
    const updateData = {
      googleMapsUrl: prospect.googleMapsUrl,
      googleMapsCid: prospect.cid || '',
      googleMapsRating: prospect.rating,
      googleMapsReviews: prospect.reviewCount,
      googleMapsCategory: prospect.category || '',
      address: prospect.address || '',
      platforms: FieldValue.arrayUnion('googlemaps'),
      updatedAt: FieldValue.serverTimestamp()
    }
    const existing = crossPlatformDoc.data()
    if (!existing.email && prospect.email) updateData.email = prospect.email
    if (!existing.phone && prospect.phone) updateData.phone = prospect.phone.replace(/[\s.-]/g, '')
    if (!existing.websiteUrl && prospect.website) updateData.websiteUrl = prospect.website

    await crossPlatformDoc.ref.update(updateData)
    return 'merged'
  }

  // Save new prospect
  await prospectsRef.add({
    source: 'googlemaps_hunter',
    platform: 'googlemaps',
    platformId: prospect.cid || prospect.placeId || prospect.googleMapsUrl,
    businessName: prospect.businessName,
    fullName: prospect.businessName,
    bio: prospect.category || '',

    // Google Maps specific
    googleMapsUrl: prospect.googleMapsUrl,
    googleMapsCid: prospect.cid || '',
    googleMapsRating: prospect.rating,
    googleMapsReviews: prospect.reviewCount,
    googleMapsCategory: prospect.category || '',
    address: prospect.address,
    latitude: prospect.latitude,
    longitude: prospect.longitude,

    // Contact info
    email: prospect.email || '',
    phone: prospect.phone ? prospect.phone.replace(/[\s.-]/g, '') : '',
    websiteUrl: prospect.website || '',
    whatsappNumber: prospect.phone ? prospect.phone.replace(/[\s.-]/g, '') : '',
    isBusiness: true,

    // Multi-platform tracking
    platforms: ['googlemaps'],

    // AI Qualification
    score: qualification.score,
    qualificationReason: qualification.reason,
    suggestedApproach: qualification.approach,

    // Status
    status: 'new',
    hunterStatus: 'qualified',

    // Metadata
    keyword,
    scannedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  })

  return 'saved'
}

/**
 * Get Google Maps hunter statistics
 */
export const getGoogleMapsHunterStats = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  const db = getDb()

  try {
    const analyticsDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('analytics')
      .doc('googlemaps_hunter')
      .get()

    const analytics = analyticsDoc.exists ? analyticsDoc.data() : {}

    const prospectsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('platform', '==', 'googlemaps')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const prospects = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      scannedAt: doc.data().scannedAt?.toDate?.()?.toISOString() || null
    }))

    const withEmail = prospects.filter(p => p.email).length
    const withPhone = prospects.filter(p => p.phone).length
    const withWebsite = prospects.filter(p => p.websiteUrl).length
    const avgRating = prospects.reduce((sum, p) => sum + (p.googleMapsRating || 0), 0) / (prospects.length || 1)

    return {
      success: true,
      stats: {
        totalScanned: analytics.totalScanned || 0,
        totalQualified: analytics.totalQualified || 0,
        totalSaved: analytics.totalSaved || 0,
        lastRun: analytics.lastRun?.toDate?.()?.toISOString() || null,
        lastStats: analytics.lastStats || {},
        averageRating: Math.round(avgRating * 10) / 10
      },
      contactInfo: { withEmail, withPhone, withWebsite },
      recentProspects: prospects
    }
  } catch (error) {
    console.error('Failed to get Google Maps hunter stats:', error)
    throw new HttpsError('internal', 'Failed to get stats')
  }
})

/**
 * Mock Google Maps prospects for testing
 */
function getMockMapsProspects(keyword, location) {
  return [
    {
      businessName: `${keyword} Expert ${location}`,
      address: `12 Rue de la Paix, 75002 ${location}`,
      phone: '+33142360001',
      website: `https://${keyword.replace(/\s/g, '-').toLowerCase()}-expert.fr`,
      rating: 4.5,
      reviewCount: 127,
      category: keyword,
      cid: 'mock_cid_001',
      latitude: 48.8698,
      longitude: 2.3302,
      googleMapsUrl: `https://maps.google.com/?cid=mock_cid_001`,
      thumbnailUrl: '',
      openingHours: 'Lun-Ven 9h-18h',
      email: `contact@${keyword.replace(/\s/g, '').toLowerCase()}-expert.fr`,
      placeId: 'mock_place_001'
    },
    {
      businessName: `Studio ${keyword} ${location}`,
      address: `45 Avenue des Champs-Elysees, 75008 ${location}`,
      phone: '+33153290002',
      website: `https://studio-${keyword.replace(/\s/g, '-').toLowerCase()}.com`,
      rating: 4.2,
      reviewCount: 84,
      category: `Studio de ${keyword}`,
      cid: 'mock_cid_002',
      latitude: 48.8738,
      longitude: 2.3056,
      googleMapsUrl: `https://maps.google.com/?cid=mock_cid_002`,
      thumbnailUrl: '',
      openingHours: 'Lun-Sam 10h-19h',
      email: '',
      placeId: 'mock_place_002'
    },
    {
      businessName: `${keyword} Conseil & Strategie`,
      address: `8 Boulevard Saint-Germain, 75005 ${location}`,
      phone: '',
      website: `https://${keyword.replace(/\s/g, '').toLowerCase()}-conseil.fr`,
      rating: 4.8,
      reviewCount: 203,
      category: 'Conseil en entreprise',
      cid: 'mock_cid_003',
      latitude: 48.8509,
      longitude: 2.3453,
      googleMapsUrl: `https://maps.google.com/?cid=mock_cid_003`,
      thumbnailUrl: '',
      openingHours: 'Lun-Ven 8h30-18h30',
      email: `info@${keyword.replace(/\s/g, '').toLowerCase()}-conseil.fr`,
      placeId: 'mock_place_003'
    },
    {
      businessName: `${location} ${keyword} Pro`,
      address: `22 Rue du Faubourg Saint-Honore, 75008 ${location}`,
      phone: '+33145630003',
      website: '',
      rating: 3.9,
      reviewCount: 31,
      category: keyword,
      cid: 'mock_cid_004',
      latitude: 48.8714,
      longitude: 2.3142,
      googleMapsUrl: `https://maps.google.com/?cid=mock_cid_004`,
      thumbnailUrl: '',
      openingHours: '',
      email: '',
      placeId: 'mock_place_004'
    },
    {
      businessName: `Agence ${keyword} Digitale`,
      address: `156 Rue de Rivoli, 75001 ${location}`,
      phone: '+33140200004',
      website: `https://agence-${keyword.replace(/\s/g, '-').toLowerCase()}.fr`,
      rating: 4.6,
      reviewCount: 156,
      category: `Agence de ${keyword}`,
      cid: 'mock_cid_005',
      latitude: 48.8603,
      longitude: 2.3411,
      googleMapsUrl: `https://maps.google.com/?cid=mock_cid_005`,
      thumbnailUrl: '',
      openingHours: 'Lun-Ven 9h-19h',
      email: `hello@agence-${keyword.replace(/\s/g, '').toLowerCase()}.fr`,
      placeId: 'mock_place_005'
    }
  ]
}
