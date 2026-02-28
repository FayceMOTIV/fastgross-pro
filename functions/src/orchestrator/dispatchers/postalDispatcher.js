/**
 * Postal Dispatcher — Orchestrator
 * Wrapper autour de sendLetterMF / sendLetter (Merci Facteur / PostGrid)
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher Postal pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, address, ... }]
 * @param {Object} config - { templateId, pdfUrl, mode, provider, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchPostal(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    const budget = await getRemainingBudget(orgId, 'postal')
    if (budget.remaining <= 0) {
      logger.info(`[postalDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    const warmupDay = config.warmupDay || 30
    const { batchSize } = calculateBatchSize('postal', warmupDay, budget.remaining)

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
            channel: 'postal',
            content: {
              pdfUrl: config.pdfUrl,
              templateId: config.templateId,
              mode: config.mode || 'normal',
              type: config.mailType || 'letter',
            },
            fallbackChannels: [],
          }, {
            postalProvider: config.provider || 'mercifacteur',
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'postal')
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

        const delay = calculateDelay('postal')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[postalDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[postalDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
