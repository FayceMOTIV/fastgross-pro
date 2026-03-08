/**
 * DScore Cloud Functions — Callable + Firestore Triggers
 * Face Media Factory
 *
 * 1. calculateLeadDScore — onCall, callable from frontend
 * 2. onLeadCreatedCalculateDScore — onDocumentCreated trigger (intentLeadsPro)
 * 3. onLeadParticuliersCalculateDScore — onDocumentCreated trigger (intentLeadsParticuliers)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { calculateDScore } from './dScoreEngine.js'

const getDb = () => getFirestore()

// ============================================
// 1. calculateLeadDScore — onCall
// ============================================

/**
 * Calcule le DScore d'un lead depuis le frontend
 * Input: { leadId, collectionName }
 * Output: { dScore, urgency, strategy, alexTone, summary, dimensions, topSignals, calculatedAt }
 */
export const calculateLeadDScore = onCall(
  {
    region: 'europe-west1',
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // --- Auth check ---
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { leadId, collectionName } = request.data || {}

    if (!leadId) {
      throw new HttpsError('invalid-argument', 'leadId est requis')
    }

    // Collection par defaut
    const collection = collectionName || 'intentLeadsPro'
    const allowedCollections = ['intentLeadsPro', 'intentLeadsParticuliers', 'prospects']

    if (!allowedCollections.includes(collection)) {
      throw new HttpsError('invalid-argument', `Collection non autorisee: ${collection}`)
    }

    const db = getDb()

    try {
      // --- Recuperer le lead ---
      const leadRef = db.collection(collection).doc(leadId)
      const leadSnap = await leadRef.get()

      if (!leadSnap.exists) {
        throw new HttpsError('not-found', `Lead ${leadId} introuvable dans ${collection}`)
      }

      const leadData = leadSnap.data()

      logger.info(`[DScore] Calculating for lead ${leadId} in ${collection}`, {
        companyName: leadData.companyName || leadData.name,
        website: leadData.website,
      })

      // --- Preparer les donnees pour le DScore ---
      const dScoreInput = buildDScoreInput(leadData)

      // --- Calculer le DScore ---
      const result = await calculateDScore(dScoreInput)

      // --- Sauvegarder dans Firestore ---
      await leadRef.update({
        dScore: result.dScore,
        dScoreUrgency: result.urgency,
        dScoreStrategy: result.strategy,
        dScoreAlexTone: result.alexTone,
        dScoreSummary: result.summary,
        dScoreDimensions: result.dimensions,
        dScoreTopSignals: result.topSignals,
        dScoreCalculatedAt: FieldValue.serverTimestamp(),
        dScoreComputeTimeMs: result.computeTimeMs,
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.info(`[DScore] Lead ${leadId} scored: ${result.dScore}/100 (${result.urgency})`, {
        dScore: result.dScore,
        urgency: result.urgency,
        computeTimeMs: result.computeTimeMs,
      })

      return result
    } catch (err) {
      if (err instanceof HttpsError) throw err

      logger.error(`[DScore] Error calculating for lead ${leadId}:`, err)
      throw new HttpsError('internal', `Erreur calcul DScore: ${err.message}`)
    }
  }
)

// ============================================
// 2. onLeadCreatedCalculateDScore — Trigger intentLeadsPro
// ============================================

/**
 * Calcul automatique du DScore a la creation d'un lead Pro
 */
export const onLeadCreatedCalculateDScore = onDocumentCreated(
  {
    document: 'intentLeadsPro/{leadId}',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('[DScore] No data in created document event')
      return null
    }

    const leadId = event.params.leadId
    const leadData = snapshot.data()

    logger.info(`[DScore] Auto-calculating for new intentLeadsPro/${leadId}`, {
      companyName: leadData.companyName || leadData.name,
    })

    try {
      const dScoreInput = buildDScoreInput(leadData)
      const result = await calculateDScore(dScoreInput)

      const db = getDb()
      await db.collection('intentLeadsPro').doc(leadId).update({
        dScore: result.dScore,
        dScoreUrgency: result.urgency,
        dScoreStrategy: result.strategy,
        dScoreAlexTone: result.alexTone,
        dScoreSummary: result.summary,
        dScoreDimensions: result.dimensions,
        dScoreTopSignals: result.topSignals,
        dScoreCalculatedAt: FieldValue.serverTimestamp(),
        dScoreComputeTimeMs: result.computeTimeMs,
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.info(`[DScore] intentLeadsPro/${leadId} scored: ${result.dScore}/100 (${result.urgency})`)
      return result
    } catch (err) {
      logger.error(`[DScore] Error auto-calculating for intentLeadsPro/${leadId}:`, err)

      // Sauvegarder l'erreur pour ne pas retenter indefiniment
      const db = getDb()
      await db.collection('intentLeadsPro').doc(leadId).update({
        dScoreError: err.message,
        dScoreCalculatedAt: FieldValue.serverTimestamp(),
      })

      return null
    }
  }
)

// ============================================
// 3. onLeadParticuliersCalculateDScore — Trigger intentLeadsParticuliers
// ============================================

/**
 * Calcul automatique du DScore a la creation d'un lead Particulier
 */
export const onLeadParticuliersCalculateDScore = onDocumentCreated(
  {
    document: 'intentLeadsParticuliers/{leadId}',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('[DScore] No data in created document event')
      return null
    }

    const leadId = event.params.leadId
    const leadData = snapshot.data()

    logger.info(`[DScore] Auto-calculating for new intentLeadsParticuliers/${leadId}`, {
      companyName: leadData.companyName || leadData.name,
    })

    try {
      const dScoreInput = buildDScoreInput(leadData)
      const result = await calculateDScore(dScoreInput)

      const db = getDb()
      await db.collection('intentLeadsParticuliers').doc(leadId).update({
        dScore: result.dScore,
        dScoreUrgency: result.urgency,
        dScoreStrategy: result.strategy,
        dScoreAlexTone: result.alexTone,
        dScoreSummary: result.summary,
        dScoreDimensions: result.dimensions,
        dScoreTopSignals: result.topSignals,
        dScoreCalculatedAt: FieldValue.serverTimestamp(),
        dScoreComputeTimeMs: result.computeTimeMs,
        updatedAt: FieldValue.serverTimestamp(),
      })

      logger.info(`[DScore] intentLeadsParticuliers/${leadId} scored: ${result.dScore}/100 (${result.urgency})`)
      return result
    } catch (err) {
      logger.error(`[DScore] Error auto-calculating for intentLeadsParticuliers/${leadId}:`, err)

      const db = getDb()
      await db.collection('intentLeadsParticuliers').doc(leadId).update({
        dScoreError: err.message,
        dScoreCalculatedAt: FieldValue.serverTimestamp(),
      })

      return null
    }
  }
)

// ============================================
// HELPERS
// ============================================

/**
 * Construit l'input DScore a partir des donnees Firestore du lead
 * Normalise les champs quel que soit le format du document
 */
function buildDScoreInput(leadData) {
  return {
    // Website
    website: leadData.website || leadData.siteWeb || leadData.url || null,

    // Google Maps
    googleMaps: leadData.googleMaps || leadData.maps || {
      rating: leadData.rating || leadData.note || null,
      totalReviews: leadData.totalReviews || leadData.reviewCount || leadData.avis || null,
      photos: leadData.photoCount || leadData.photos || null,
      responseRate: leadData.responseRate || null,
      claimed: leadData.claimed,
    },

    // Social
    social: leadData.social || leadData.socialLinks || {
      facebook: leadData.facebook ? { url: leadData.facebook, exists: true } : null,
      instagram: leadData.instagram ? { url: leadData.instagram, exists: true, username: leadData.instagramUsername } : null,
      linkedin: leadData.linkedin ? { url: leadData.linkedin, exists: true } : null,
    },

    // Company info pour France Travail
    company: {
      name: leadData.companyName || leadData.name || leadData.entreprise || null,
      siret: leadData.siret || null,
      city: leadData.city || leadData.ville || leadData.commune || null,
    },

    // Reviews
    reviews: leadData.reviews || {
      trustpilot: leadData.trustpilot || null,
      google: leadData.googleReviews || (leadData.rating ? {
        rating: leadData.rating,
        totalReviews: leadData.totalReviews || leadData.reviewCount,
      } : null),
      unrepliedNegative: leadData.unrepliedNegativeReviews || 0,
    },

    // Meta (pour le resume IA)
    companyName: leadData.companyName || leadData.name || leadData.entreprise,
    name: leadData.name,
    sector: leadData.sector || leadData.industry || leadData.secteur || leadData.niche,
  }
}
