/**
 * SMS Dispatcher — Orchestrator
 * Wrapper autour de sendSMS (OVH/Twilio) pour l'orchestrateur
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher SMS pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, phone, ... }]
 * @param {Object} config - { message, provider, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchSMS(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'sms')
    if (budget.remaining <= 0) {
      logger.info(`[smsDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 30
    const { batchSize } = calculateBatchSize('sms', warmupDay, budget.remaining)

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
            channel: 'sms',
            content: {
              text: config.message || '',
              customVariables: config.customVariables,
            },
            fallbackChannels: [],
          }, {
            smsProvider: config.provider || 'ovh',
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'sms')
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

        const delay = calculateDelay('sms')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[smsDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[smsDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
