/**
 * Instagram Dispatcher — Orchestrator
 * Wrapper autour de multiAccountDmSender / sendInstagramDM
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher Instagram pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, channels: { instagram: { handle } } }]
 * @param {Object} config - { message, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchInstagram(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'instagram')
    if (budget.remaining <= 0) {
      logger.info(`[instagramDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 1
    const { batchSize } = calculateBatchSize('instagram', warmupDay, budget.remaining)

    if (batchSize <= 0) {
      results.skipped = prospects.length
      return results
    }

    const eligible = prospects.slice(0, Math.min(prospects.length, budget.remaining))
    const batches = splitIntoBatches(eligible, batchSize)

    const { dispatchMessage } = await import('../../engine/channelDispatcher.js')

    for (const batch of batches) {
      for (const prospect of batch) {
        try {
          const result = await dispatchMessage(orgId, prospect.id, {
            channel: 'instagram',
            content: {
              text: config.message || '',
              quickReplies: config.quickReplies,
              mediaUrl: config.mediaUrl,
            },
            fallbackChannels: [],
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'instagram')
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

        // Instagram needs long delays to avoid rate limits
        const delay = calculateDelay('instagram')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[instagramDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[instagramDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
