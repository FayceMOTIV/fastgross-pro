/**
 * Voicemail Dispatcher — Orchestrator
 * Wrapper autour de sendVoicemailDrop (Drop Cowboy)
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher Voicemail pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, phone, ... }]
 * @param {Object} config - { scriptId, voiceId, text, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchVoicemail(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'voicemail')
    if (budget.remaining <= 0) {
      logger.info(`[voicemailDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 30
    const { batchSize } = calculateBatchSize('voicemail', warmupDay, budget.remaining)

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
            channel: 'voicemail',
            content: {
              text: config.text || '',
              scriptId: config.scriptId,
              voiceId: config.voiceId,
              templateId: config.templateId,
            },
            fallbackChannels: [],
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'voicemail')
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

        const delay = calculateDelay('voicemail')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[voicemailDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[voicemailDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
