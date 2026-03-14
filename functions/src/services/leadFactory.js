/**
 * Lead Factory — Decouverte et qualification automatique de leads
 * Utilise Serper.dev Maps API + scoring IA (callAI)
 * Alimente le pipeline de chaque organisation quand le seuil est bas
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { callAI, extractJSON } from '../ai/callAI.js'

const getDb = () => getFirestore()

// --- Config par defaut ---
const DEFAULT_ICP = {
  queries: ['restaurant', 'salon coiffure', 'agence immobiliere', 'commerce'],
  locations: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse'],
  minRating: 3.5,
  minReviews: 5,
  maxPerQuery: 20,
}

// --- Recherche Google Maps via Serper.dev ---

async function searchGoogleMaps(query, location, limit = 20) {
  try {
    const { cachedSerperFetch } = await import('../utils/serperCache.js')
    const data = await cachedSerperFetch('maps', {
      q: `${query} ${location}`,
      num: limit,
      gl: 'fr',
      hl: 'fr',
    })

    if (data.error) {
      logger.warn(`[LeadFactory] Serper error for "${query} ${location}": ${data.error}`)
      return getMockResults(query, location)
    }

    return (data.places || []).map(place => ({
      name: place.title || '',
      address: place.address || '',
      phone: place.phoneNumber || '',
      website: place.website || '',
      googleRating: place.rating || 0,
      reviewCount: place.ratingCount || 0,
      cid: place.cid || '',
      category: place.category || query,
      latitude: place.latitude,
      longitude: place.longitude,
      source: 'serper_maps',
      sourceQuery: query,
      sourceLocation: location,
    }))
  } catch (error) {
    logger.error(`[LeadFactory] Serper search failed for "${query} ${location}":`, error.message)
    return []
  }
}

// --- Qualification IA ---

async function qualifyLead(lead) {
  const prompt = `Tu es un expert en qualification de leads B2B pour une agence digitale.
Analyse ce prospect et donne un score de 0 a 100.

Prospect:
- Nom: ${lead.name}
- Secteur: ${lead.category}
- Note Google: ${lead.googleRating}/5 (${lead.reviewCount} avis)
- A un site web: ${lead.website ? 'Oui' : 'Non'}
- Telephone: ${lead.phone ? 'Oui' : 'Non'}

Criteres de scoring:
- Note Google 4+ = +20pts
- Plus de 50 avis = +15pts
- Pas de site web = +25pts (besoin digital evident)
- A un site web ancien/basique = +15pts
- Secteur a forte demande digitale = +15pts
- Telephone disponible = +10pts

Retourne UNIQUEMENT ce JSON:
{"score": <number>, "qualification": "hot|warm|cold", "reason": "<raison principale>", "intentLabel": "<signal detecte>"}`

  try {
    const text = await callAI(prompt, 200)
    const result = extractJSON(text)
    if (result && typeof result.score === 'number') {
      return result
    }
  } catch (error) {
    logger.warn('[LeadFactory] AI qualification failed, using heuristic:', error.message)
  }

  // Fallback heuristique
  let score = 30
  if (lead.googleRating >= 4) score += 20
  if (lead.reviewCount >= 50) score += 15
  if (!lead.website) score += 25
  if (lead.phone) score += 10

  return {
    score,
    qualification: score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold',
    reason: !lead.website ? 'Pas de site web - besoin digital evident' : 'Prospect standard',
    intentLabel: !lead.website ? 'need_website' : 'general_prospect',
  }
}

// --- Dedup et sauvegarde ---

async function saveWithDedup(db, orgId, lead, qualification) {
  const prospectsRef = db.collection(`organizations/${orgId}/prospects`)

  // Verifier par CID Google
  if (lead.cid) {
    const byCid = await prospectsRef.where('cid', '==', lead.cid).limit(1).get()
    if (!byCid.empty) return { saved: false, reason: 'duplicate_cid' }
  }

  // Verifier par telephone
  if (lead.phone) {
    const cleanPhone = lead.phone.replace(/[^\d+]/g, '')
    if (cleanPhone.length >= 8) {
      const byPhone = await prospectsRef.where('phone', '==', cleanPhone).limit(1).get()
      if (!byPhone.empty) return { saved: false, reason: 'duplicate_phone' }
    }
  }

  // Verifier par site web
  if (lead.website) {
    const domain = lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '')
    const byWebsite = await prospectsRef
      .where('websiteDomain', '==', domain)
      .limit(1)
      .get()
    if (!byWebsite.empty) return { saved: false, reason: 'duplicate_website' }
  }

  // Sauvegarder
  const prospect = {
    name: lead.name,
    address: lead.address,
    phone: lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '',
    website: lead.website || '',
    websiteDomain: lead.website
      ? lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '')
      : '',
    googleRating: lead.googleRating,
    reviewCount: lead.reviewCount,
    cid: lead.cid || '',
    industry: lead.category,
    score: qualification.score,
    qualification: qualification.qualification,
    intentLabel: qualification.intentLabel || '',
    alexStatus: 'new',
    source: 'lead_factory',
    sourceQuery: lead.sourceQuery,
    sourceLocation: lead.sourceLocation,
    blacklisted: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const docRef = await prospectsRef.add(prospect)
  return { saved: true, id: docRef.id }
}

// --- Fonction principale ---

/**
 * Decouvre et sauvegarde des leads pour une organisation
 * @param {string} orgId - ID de l'organisation
 * @param {number} deficit - Nombre de leads a trouver
 * @returns {Object} Resultats du sourcing
 */
export async function discoverLeads(orgId, deficit) {
  const db = getDb()

  // Lire la config ICP de l'org
  const icpDoc = await db
    .collection('organizations').doc(orgId)
    .collection('settings').doc('icp')
    .get()
  const icpConfig = icpDoc.exists ? icpDoc.data() : {}

  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const orgData = orgDoc.exists ? orgDoc.data() : {}

  const queries = icpConfig.queries?.length > 0
    ? icpConfig.queries
    : (orgData.leadFactory?.queries || DEFAULT_ICP.queries)

  const locations = icpConfig.locations?.length > 0
    ? icpConfig.locations
    : (orgData.leadFactory?.locations || DEFAULT_ICP.locations)

  const minRating = icpConfig.minRating || orgData.leadFactory?.minRating || DEFAULT_ICP.minRating
  const minReviews = icpConfig.minReviews || orgData.leadFactory?.minReviews || DEFAULT_ICP.minReviews

  const results = {
    orgId,
    requested: deficit,
    found: 0,
    qualified: 0,
    saved: 0,
    duplicates: 0,
    errors: 0,
    queries: [],
  }

  let totalSaved = 0
  const targetPerQuery = Math.ceil(deficit / Math.max(queries.length, 1))

  for (const query of queries) {
    if (totalSaved >= deficit) break

    // Choisir une ville aleatoire
    const location = locations[Math.floor(Math.random() * locations.length)]

    logger.info(`[LeadFactory] Searching "${query}" in ${location} for org ${orgId}`)

    const leads = await searchGoogleMaps(query, location, DEFAULT_ICP.maxPerQuery)
    results.found += leads.length

    const queryResult = { query, location, found: leads.length, saved: 0, filtered: 0 }

    for (const lead of leads) {
      if (totalSaved >= deficit) break

      // Filtre minimum
      if (lead.googleRating > 0 && lead.googleRating < minRating) {
        queryResult.filtered++
        continue
      }
      if (lead.reviewCount > 0 && lead.reviewCount < minReviews) {
        queryResult.filtered++
        continue
      }

      try {
        const qualification = await qualifyLead(lead)
        results.qualified++

        // Ne sauvegarder que les leads avec score >= 30
        if (qualification.score < 30) {
          queryResult.filtered++
          continue
        }

        const saveResult = await saveWithDedup(db, orgId, lead, qualification)
        if (saveResult.saved) {
          totalSaved++
          queryResult.saved++
          results.saved++
        } else {
          results.duplicates++
        }
      } catch (error) {
        results.errors++
        logger.error(`[LeadFactory] Error processing lead ${lead.name}:`, error.message)
      }
    }

    results.queries.push(queryResult)

    // Pause entre les queries pour eviter rate limits
    if (totalSaved < deficit) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Logger les resultats
  await db.collection(`organizations/${orgId}/analytics`).doc('lead_factory').set({
    lastRun: FieldValue.serverTimestamp(),
    lastResults: results,
    totalDiscovered: FieldValue.increment(results.saved),
  }, { merge: true })

  logger.info(`[LeadFactory] org:${orgId} — ${results.saved}/${deficit} leads discovered`, results)

  return results
}

/**
 * Compte les prospects actifs dans le pipeline
 */
export async function countActivePipeline(orgId) {
  const db = getDb()
  const activeStatuses = ['new', 'in_sequence', 'contacted']

  let total = 0
  for (const status of activeStatuses) {
    const snap = await db
      .collection(`organizations/${orgId}/prospects`)
      .where('alexStatus', '==', status)
      .count()
      .get()
    total += snap.data().count
  }

  return total
}

// --- Mock data pour dev/test ---

function getMockResults(query, location) {
  const mockNames = [
    `${query} Le Gourmet`, `${query} Central`, `${query} des Halles`,
    `Chez Marcel - ${query}`, `La Maison du ${query}`,
    `${query} Premium`, `${query} Express`, `Au Bon ${query}`,
  ]

  return mockNames.slice(0, 5).map((name, i) => ({
    name: `${name} (${location})`,
    address: `${10 + i} Rue de la Paix, ${location}`,
    phone: `+3361234${String(i).padStart(4, '0')}`,
    website: i % 3 === 0 ? '' : `https://www.${name.toLowerCase().replace(/\s+/g, '-')}.fr`,
    googleRating: 3.5 + Math.random() * 1.5,
    reviewCount: Math.floor(10 + Math.random() * 200),
    cid: `mock_${Date.now()}_${i}`,
    category: query,
    source: 'mock',
    sourceQuery: query,
    sourceLocation: location,
  }))
}
