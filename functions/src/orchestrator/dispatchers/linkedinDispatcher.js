/**
 * LinkedIn Dispatcher — Orchestrator
 * Wrapper autour de linkedinService (HeyReach API)
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher LinkedIn pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, linkedinUrl, ... }]
 * @param {Object} config - { message, action, warmupDay }
 *   action: 'connect' | 'message' (default 'connect')
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchLinkedIn(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'linkedin')
    if (budget.remaining <= 0) {
      logger.info(`[linkedinDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 1
    const { batchSize } = calculateBatchSize('linkedin', warmupDay, budget.remaining)

    if (batchSize <= 0) {
      results.skipped = prospects.length
      return results
    }

    const eligible = prospects.slice(0, Math.min(prospects.length, budget.remaining))
    const batches = splitIntoBatches(eligible, batchSize)

    // Import dynamique du service LinkedIn
    let linkedinService
    try {
      linkedinService = await import('../../hunters/linkedin/linkedinService.js')
    } catch {
      logger.warn('[linkedinDispatcher] linkedinService not available')
      results.skipped = prospects.length
      return results
    }

    const action = config.action || 'connect'

    for (const batch of batches) {
      for (const prospect of batch) {
        try {
          const linkedinUrl = prospect.linkedinUrl || prospect.channels?.linkedin?.profileUrl
          if (!linkedinUrl) {
            results.skipped++
            results.details.push({ prospectId: prospect.id, success: false, error: 'no_linkedin_url' })
            continue
          }

          let result

          if (action === 'message') {
            result = await linkedinService.sendMessage(
              orgId,
              linkedinUrl,
              config.message || ''
            )
          } else {
            result = await linkedinService.sendConnectionRequest(
              orgId,
              linkedinUrl,
              config.message || ''
            )
          }

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'linkedin')
          } else {
            results.failed++
          }

          results.details.push({
            prospectId: prospect.id,
            success: result.success,
            error: result.error || null,
          })
        } catch (error) {
          results.failed++
          results.details.push({ prospectId: prospect.id, success: false, error: error.message })
        }

        // LinkedIn has strict rate limits
        const delay = calculateDelay('linkedin')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped += prospects.length - eligible.length

    logger.info(`[linkedinDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[linkedinDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
