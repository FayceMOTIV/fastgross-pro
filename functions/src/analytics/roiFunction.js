/**
 * ROI Dashboard — Cloud Functions
 *
 * 1. getROIMetrics   — onCall, returns ROI metrics for the authenticated user
 * 2. computeNightlyROI — onSchedule '0 3 * * *' Europe/Paris, caches ROI for all active users
 *
 * NOTE: exports are named to avoid conflicts with alexAnalytics.js / dailyAnalytics.js
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { calculateROIMetrics } from './roiEngine.js'

const getDb = () => getFirestore()

// ============================================
// 1. getROIMetrics — Callable
// ============================================

export const getROIMetrics = onCall(
  {
    region: 'europe-west1',
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const { periodDays = 30 } = request.data || {}

    // Validate periodDays
    const days = Math.min(Math.max(Number(periodDays) || 30, 1), 365)

    try {
      // Check cache first (< 1 hour old)
      const cacheRef = getDb().collection('roiCache').doc(`${userId}_${days}`)
      const cacheSnap = await cacheRef.get()

      if (cacheSnap.exists) {
        const cached = cacheSnap.data()
        const cacheAge = Date.now() - (cached.cachedAt?.toMillis?.() || 0)
        const ONE_HOUR = 3_600_000

        if (cacheAge < ONE_HOUR) {
          logger.info('getROIMetrics: cache hit', { userId, days, cacheAgeMs: cacheAge })
          return { success: true, data: cached.metrics, cached: true }
        }
      }

      // Calculate fresh metrics
      const metrics = await calculateROIMetrics(userId, days)

      // Update cache
      await cacheRef.set({
        userId,
        periodDays: days,
        metrics,
        cachedAt: FieldValue.serverTimestamp(),
      })

      logger.info('getROIMetrics: computed', {
        userId,
        days,
        contacted: metrics.funnel.totalContacted,
        roi: metrics.financial.roi,
      })

      return { success: true, data: metrics, cached: false }
    } catch (error) {
      logger.error('getROIMetrics error:', { userId, error: error.message, stack: error.stack })
      throw new HttpsError('internal', `Erreur calcul ROI: ${error.message}`)
    }
  }
)

// ============================================
// 2. computeNightlyROI — Scheduled (03:00 Europe/Paris)
// ============================================

export const computeNightlyROI = onSchedule(
  {
    schedule: '0 3 * * *',
    region: 'europe-west1',
    timeZone: 'Europe/Paris',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    const db = getDb()
    const startTime = Date.now()

    logger.info('computeNightlyROI: starting nightly ROI computation')

    // Find all users with an active subscription plan
    const usersSnap = await db
      .collection('users')
      .where('subscription.plan', 'in', ['starter', 'essentiel', 'pro', 'business', 'enterprise'])
      .get()

    if (usersSnap.empty) {
      logger.info('computeNightlyROI: no users with active plans found')
      return
    }

    let successCount = 0
    let errorCount = 0
    const PERIODS = [7, 30, 90]

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id

      for (const days of PERIODS) {
        try {
          const metrics = await calculateROIMetrics(userId, days)

          // Cache in roiCache collection
          const cacheRef = db.collection('roiCache').doc(`${userId}_${days}`)
          await cacheRef.set({
            userId,
            periodDays: days,
            metrics,
            cachedAt: FieldValue.serverTimestamp(),
          })

          successCount += 1
        } catch (error) {
          errorCount += 1
          logger.error('computeNightlyROI: user error', {
            userId,
            days,
            error: error.message,
          })
        }
      }
    }

    const elapsed = Date.now() - startTime

    logger.info('computeNightlyROI: completed', {
      totalUsers: usersSnap.size,
      periodsPerUser: PERIODS.length,
      successCount,
      errorCount,
      elapsedMs: elapsed,
    })
  }
)
