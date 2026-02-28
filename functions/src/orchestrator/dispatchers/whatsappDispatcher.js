/**
 * WhatsApp Dispatcher — Orchestrator
 * Wrapper autour de whatsappSender avec warmup anti-ban
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher WhatsApp pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, phone, ... }]
 * @param {Object} config - { message, templateName, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchWhatsApp(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'whatsapp')
    if (budget.remaining <= 0) {
      logger.info(`[whatsappDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 1
    const { batchSize } = calculateBatchSize('whatsapp', warmupDay, budget.remaining)

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
            channel: 'whatsapp',
            content: {
              text: config.message || '',
              templateName: config.templateName,
              templateLanguage: config.templateLanguage || 'fr',
              templateVariables: config.templateVariables,
            },
            fallbackChannels: [],
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'whatsapp')
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

        // WhatsApp needs longer delays for anti-ban
        const delay = calculateDelay('whatsapp')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[whatsappDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[whatsappDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
