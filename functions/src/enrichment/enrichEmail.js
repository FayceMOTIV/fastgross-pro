/**
 * Email Enrichment Cloud Functions
 * Face Media Factory
 *
 * Exports:
 * - enrichEmail: Enrich a single email address
 * - enrichEmailsBatch: Enrich multiple emails
 * - getEnrichmentStatus: Get status of all providers
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getEmailWaterfall } from './emailWaterfall.js'

/**
 * Cloud Function: Enrich a single email address
 *
 * Input: { email: string }
 * Output: {
 *   success: boolean,
 *   data: {
 *     email: string,
 *     firstName: string,
 *     lastName: string,
 *     fullName: string,
 *     company: string,
 *     title: string,
 *     linkedinUrl: string,
 *     phone: string,
 *     location: string,
 *     confidence: number
 *   },
 *   provider: string,
 *   latency: number
 * }
 */
export const enrichEmail = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    try {
      const { email } = request.data

      if (!email) {
        throw new HttpsError('invalid-argument', 'email is required')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new HttpsError('invalid-argument', 'Invalid email format')
      }

      const waterfall = getEmailWaterfall()
      const result = await waterfall.enrichEmail(email)

      logger.info(`[enrichEmail] Success: ${result.provider} in ${result.latency}ms`)

      return {
        success: true,
        data: result.data,
        provider: result.provider,
        latency: result.latency
      }
    } catch (error) {
      logger.error('[enrichEmail] Error:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Failed to enrich email')
    }
  }
)

/**
 * Cloud Function: Enrich multiple emails in batch
 *
 * Input: {
 *   emails: string[],
 *   concurrency?: number (default: 3),
 *   continueOnError?: boolean (default: true)
 * }
 * Output: {
 *   success: boolean,
 *   results: array,
 *   errors: array,
 *   stats: { total, enriched, failed }
 * }
 */
export const enrichEmailsBatch = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB'
  },
  async (request) => {
    try {
      const { emails, concurrency = 3, continueOnError = true } = request.data

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new HttpsError('invalid-argument', 'emails array is required')
      }

      if (emails.length > 50) {
        throw new HttpsError('invalid-argument', 'Maximum 50 emails per batch')
      }

      // Validate all emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          throw new HttpsError('invalid-argument', `Invalid email format: ${email}`)
        }
      }

      const waterfall = getEmailWaterfall()
      const result = await waterfall.enrichEmailsBatch(emails, {
        concurrency: Math.min(concurrency, 5),
        continueOnError
      })

      logger.info(
        `[enrichEmailsBatch] Completed: ${result.stats.enriched}/${result.stats.total} enriched`
      )

      return result
    } catch (error) {
      logger.error('[enrichEmailsBatch] Error:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Failed to enrich emails')
    }
  }
)

/**
 * Cloud Function: Get status of all enrichment providers
 */
export const getEnrichmentStatus = onCall(
  {
    region: 'europe-west1'
  },
  async () => {
    try {
      const waterfall = getEmailWaterfall()
      const statuses = waterfall.getAllStatus()
      const stats = waterfall.getStats()

      return {
        success: true,
        providers: statuses,
        stats: stats
      }
    } catch (error) {
      logger.error('[getEnrichmentStatus] Error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)
