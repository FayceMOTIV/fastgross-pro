/**
 * A/B Testing Cloud Functions
 * Face Media Factory v5
 *
 * Exposes the A/B testing engine via onCall functions
 * and a weekly scheduled rotation for stale concluded tests.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

import {
  createABTest,
  recordABTestResult,
  getVariantForLead,
  getABTestStats,
  generateABVariants,
} from './abTestingEngine.js'

const getDb = () => getFirestore()

// Constants (mirrored from abTestingEngine — not exported there)
const MIN_SAMPLE_SIZE = 50
const WINNER_LIFT_THRESHOLD = 0.20

// ── 1. runABTest — Create a new A/B test ────────────────────────

export const runABTest = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { niche, channel, icpContext } = request.data || {}

    if (!niche || !channel) {
      throw new HttpsError('invalid-argument', 'niche et channel sont requis')
    }

    const userId = request.auth.uid

    // Resolve orgId from user profile
    const db = getDb()
    const userDoc = await db.doc(`users/${userId}`).get()
    const orgId = userDoc.exists ? userDoc.data().currentOrgId || userId : userId

    try {
      const result = await createABTest(orgId, niche, channel, icpContext || {})

      if (result.alreadyExists) {
        logger.info(`runABTest: existing test returned for ${niche}/${channel}`, { orgId })
      } else {
        logger.info(`runABTest: new test created for ${niche}/${channel}`, { orgId, testId: result.id })
      }

      return {
        success: true,
        testId: result.id,
        variants: result.variants,
        alreadyExists: result.alreadyExists || false,
      }
    } catch (error) {
      logger.error('runABTest: error', { error: error.message, orgId })
      throw new HttpsError('internal', `Erreur creation test A/B : ${error.message}`)
    }
  }
)

// ── 2. recordABTestResultCallable — Record a result ─────────────

export const recordABTestResultCallable = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { testId, variantId, replied, interested } = request.data || {}

    if (!testId || !variantId) {
      throw new HttpsError('invalid-argument', 'testId et variantId sont requis')
    }

    try {
      const result = await recordABTestResult(
        testId,
        variantId,
        replied === true,
        interested === true
      )

      if (!result.success) {
        throw new HttpsError('not-found', result.error || 'Test introuvable')
      }

      if (result.concluded) {
        logger.info('recordABTestResultCallable: test concluded', { testId, winner: result.winner })
      }

      return result
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('recordABTestResultCallable: error', { error: error.message, testId })
      throw new HttpsError('internal', `Erreur enregistrement resultat : ${error.message}`)
    }
  }
)

// ── 3. getWinningVariant — Get variant for a lead ───────────────

export const getWinningVariant = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { niche, channel } = request.data || {}

    if (!niche || !channel) {
      throw new HttpsError('invalid-argument', 'niche et channel sont requis')
    }

    const userId = request.auth.uid
    const db = getDb()
    const userDoc = await db.doc(`users/${userId}`).get()
    const orgId = userDoc.exists ? userDoc.data().currentOrgId || userId : userId

    try {
      const result = await getVariantForLead(orgId, niche, channel)

      if (!result) {
        return {
          success: true,
          found: false,
          message: 'Aucun test A/B actif pour cette combinaison niche/canal',
        }
      }

      return {
        success: true,
        found: true,
        variant: result.variant,
        source: result.source,
        testId: result.testId,
      }
    } catch (error) {
      logger.error('getWinningVariant: error', { error: error.message, orgId })
      throw new HttpsError('internal', `Erreur recuperation variante : ${error.message}`)
    }
  }
)

// ── 4. getABTestDashboard — Dashboard stats ─────────────────────

export const getABTestDashboard = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { niche } = request.data || {}

    const userId = request.auth.uid
    const db = getDb()
    const userDoc = await db.doc(`users/${userId}`).get()
    const orgId = userDoc.exists ? userDoc.data().currentOrgId || userId : userId

    try {
      const stats = await getABTestStats(orgId, niche || null)

      return {
        success: true,
        ...stats,
      }
    } catch (error) {
      logger.error('getABTestDashboard: error', { error: error.message, orgId })
      throw new HttpsError('internal', `Erreur dashboard A/B : ${error.message}`)
    }
  }
)

// ── 5. rotateAbVariants — Weekly rotation of stale concluded tests

export const rotateAbVariants = onSchedule(
  {
    schedule: '0 4 * * 1', // Every Monday at 04:00
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
    retryCount: 1,
  },
  async () => {
    logger.info('rotateAbVariants: starting weekly A/B rotation')

    const db = getDb()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Find all organizations
    let orgsSnap
    try {
      orgsSnap = await db.collection('organizations').select().get()
    } catch (err) {
      logger.error('rotateAbVariants: failed to fetch organizations', { error: err.message })
      return
    }

    if (orgsSnap.empty) {
      logger.info('rotateAbVariants: no organizations found')
      return
    }

    let rotatedCount = 0
    let errorCount = 0

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id

      try {
        // Find concluded tests older than 30 days
        const staleSnap = await db
          .collection(`organizations/${orgId}/abTests`)
          .where('status', '==', 'concluded')
          .where('concludedAt', '<=', thirtyDaysAgo)
          .get()

        if (staleSnap.empty) continue

        for (const testDoc of staleSnap.docs) {
          const test = testDoc.data()

          try {
            // Generate fresh variants for the same niche/channel
            const newVariants = await generateABVariants(test.niche, test.channel, {})

            const enrichedVariants = newVariants.map((v) => ({
              ...v,
              sent: 0,
              replied: 0,
              interested: 0,
              alpha: 1,
              beta: 1,
            }))

            // Archive the old test
            await testDoc.ref.update({
              status: 'archived',
              archivedAt: FieldValue.serverTimestamp(),
            })

            // Create a fresh test
            await db.collection(`organizations/${orgId}/abTests`).add({
              userId: orgId,
              niche: test.niche,
              channel: test.channel,
              status: 'running',
              variants: enrichedVariants,
              minSampleSize: MIN_SAMPLE_SIZE,
              winnerLiftThreshold: WINNER_LIFT_THRESHOLD,
              winner: null,
              concludedAt: null,
              previousTestId: testDoc.id,
              previousWinner: test.winner,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            })

            rotatedCount++
            logger.info('rotateAbVariants: rotated test', {
              orgId,
              oldTestId: testDoc.id,
              niche: test.niche,
              channel: test.channel,
            })
          } catch (innerErr) {
            errorCount++
            logger.warn('rotateAbVariants: failed to rotate test', {
              orgId,
              testId: testDoc.id,
              error: innerErr.message,
            })
          }
        }
      } catch (orgErr) {
        errorCount++
        logger.warn('rotateAbVariants: failed to process org', {
          orgId,
          error: orgErr.message,
        })
      }
    }

    logger.info('rotateAbVariants: completed', { rotatedCount, errorCount })
  }
)

// Re-export constants for reference
export const AB_MIN_SAMPLE_SIZE = MIN_SAMPLE_SIZE
export const AB_WINNER_LIFT_THRESHOLD = WINNER_LIFT_THRESHOLD
