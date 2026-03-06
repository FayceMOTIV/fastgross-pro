/**
 * AI Personalization Cloud Functions
 * Face Media Factory
 *
 * Exports:
 * - personalizeMessage: Generate personalization angles for a prospect
 * - getAIStatus: Get status of all AI providers
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getLoadBalancer } from './loadBalancer.js'
import { getCountryProfile } from '../engine/countryProfiles.js'

/**
 * Cloud Function : Genere des angles de personnalisation pour un prospect
 *
 * Input : {
 *   prospectName: string,
 *   prospectBio: string,
 *   prospectCategory: string,
 *   prospectFollowers: string,
 *   businessType: string,
 *   targetService: string,
 *   strategy?: 'speed' | 'balanced' (default: 'speed')
 * }
 *
 * Output : {
 *   angles: string[],
 *   provider: string,
 *   model: string,
 *   tokensUsed: number,
 *   latency: number
 * }
 */
export const personalizeMessage = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  async (request) => {
    try {
      // Validate input
      const {
        prospectName,
        prospectBio,
        prospectCategory,
        prospectFollowers,
        businessType,
        targetService,
        strategy = 'speed',
        country,
        language,
      } = request.data

      if (!prospectName || !prospectBio) {
        throw new HttpsError('invalid-argument', 'prospectName and prospectBio are required')
      }

      // Contexte pays (Module 7)
      const countryProfile = country ? getCountryProfile({ country }) : null
      const targetLanguage = language || countryProfile?.language || 'fr'

      // Get load balancer
      const loadBalancer = getLoadBalancer()

      // Generate personalization
      const result = await loadBalancer.generatePersonalization(
        {
          prospectName,
          prospectBio,
          prospectCategory: prospectCategory || 'Unknown',
          prospectFollowers: prospectFollowers || '0',
          businessType: businessType || 'Generic',
          targetService: targetService || 'Services de creation de contenu video',
          language: targetLanguage,
          countryContext: countryProfile
            ? `Prospect base en ${countryProfile.name}. Utilise les salutations locales: "${countryProfile.greetings.formal}". Reponds en ${targetLanguage === 'fr' ? 'francais' : 'anglais'}.`
            : null,
        },
        strategy
      )

      logger.info(`[personalizeMessage] Success: ${result.provider} in ${result.latency}ms`)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      logger.error('[personalizeMessage] Error:', error)

      throw new HttpsError('internal', error.message || 'Failed to generate personalization')
    }
  }
)

/**
 * Cloud Function : Obtient le statut de tous les providers
 */
export const getAIStatus = onCall(
  {
    region: 'europe-west1'
  },
  async (request) => {
    try {
      const loadBalancer = getLoadBalancer()
      const statuses = loadBalancer.getAllStatus()
      const stats = loadBalancer.getStats()

      return {
        success: true,
        providers: statuses,
        stats: stats
      }
    } catch (error) {
      logger.error('[getAIStatus] Error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)
