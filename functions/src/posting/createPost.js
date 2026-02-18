/**
 * Multi-Platform Posting Cloud Functions
 * Face Media Factory
 *
 * Exports:
 * - createMultiPlatformPost: Create a post on multiple platforms
 * - getPostStatus: Get status of a post
 * - cancelPost: Cancel a scheduled post
 * - getPostingStatus: Get status of all posting providers
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getMultiPlatformPoster } from './multiPlatform.js'

/**
 * Cloud Function: Create a post on multiple platforms
 *
 * Input: {
 *   content: string,
 *   platforms: string[],
 *   mediaUrls?: string[],
 *   scheduledAt?: string (ISO date)
 * }
 * Output: {
 *   success: boolean,
 *   provider: string,
 *   postId: string,
 *   platforms: string[],
 *   status: 'published' | 'scheduled',
 *   latency: number
 * }
 */
export const createMultiPlatformPost = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (request) => {
    try {
      const { content, platforms, mediaUrls = [], scheduledAt = null } = request.data

      if (!content) {
        throw new HttpsError('invalid-argument', 'content is required')
      }

      if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
        throw new HttpsError('invalid-argument', 'platforms array is required')
      }

      if (platforms.length > 10) {
        throw new HttpsError('invalid-argument', 'Maximum 10 platforms per post')
      }

      // Parse scheduled date if provided
      let scheduleDate = null
      if (scheduledAt) {
        scheduleDate = new Date(scheduledAt)
        if (isNaN(scheduleDate.getTime())) {
          throw new HttpsError('invalid-argument', 'Invalid scheduledAt date format')
        }
        if (scheduleDate <= new Date()) {
          throw new HttpsError('invalid-argument', 'scheduledAt must be in the future')
        }
      }

      const poster = getMultiPlatformPoster()
      const result = await poster.createPost({
        content,
        platforms,
        mediaUrls,
        scheduledAt: scheduleDate
      })

      logger.info(
        `[createMultiPlatformPost] Success: ${result.provider} - ${platforms.join(', ')}`
      )

      return result
    } catch (error) {
      logger.error('[createMultiPlatformPost] Error:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Failed to create post')
    }
  }
)

/**
 * Cloud Function: Get status of a post
 *
 * Input: { postId: string, provider?: string }
 */
export const getPostStatus = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    try {
      const { postId, provider = null } = request.data

      if (!postId) {
        throw new HttpsError('invalid-argument', 'postId is required')
      }

      const poster = getMultiPlatformPoster()
      const status = await poster.getPostStatus(postId, provider)

      return {
        success: true,
        data: status
      }
    } catch (error) {
      logger.error('[getPostStatus] Error:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Failed to get post status')
    }
  }
)

/**
 * Cloud Function: Cancel a scheduled post
 *
 * Input: { postId: string, provider?: string }
 */
export const cancelPost = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    try {
      const { postId, provider = null } = request.data

      if (!postId) {
        throw new HttpsError('invalid-argument', 'postId is required')
      }

      const poster = getMultiPlatformPoster()
      const result = await poster.cancelPost(postId, provider)

      logger.info(`[cancelPost] Post ${postId} cancelled`)

      return result
    } catch (error) {
      logger.error('[cancelPost] Error:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Failed to cancel post')
    }
  }
)

/**
 * Cloud Function: Get status of all posting providers
 */
export const getPostingStatus = onCall(
  {
    region: 'europe-west1'
  },
  async () => {
    try {
      const poster = getMultiPlatformPoster()
      const statuses = poster.getAllStatus()
      const stats = poster.getStats()

      return {
        success: true,
        providers: statuses,
        stats: stats
      }
    } catch (error) {
      logger.error('[getPostingStatus] Error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)
