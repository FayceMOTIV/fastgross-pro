/**
 * Email Dispatcher — Orchestrator
 * Wrapper autour du channelDispatcher existant pour l'orchestrateur
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

const getDb = () => getFirestore()

/**
 * Dispatcher email pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, email, firstName, lastName, company, ... }]
 * @param {Object} config - { subject, htmlTemplate, textTemplate, fromName, replyTo, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchEmail(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  try {
    // 1. Verifier budget
    const budget = await getRemainingBudget(orgId, 'email')
    if (budget.remaining <= 0) {
      logger.info(`[emailDispatcher] Budget epuise pour org ${orgId}`)
      results.skipped = prospects.length
      return results
    }

    // 2. Calculer batch
    const warmupDay = config.warmupDay || 30
    const { batchSize } = calculateBatchSize('email', warmupDay, budget.remaining)

    if (batchSize <= 0) {
      results.skipped = prospects.length
      return results
    }

    // 3. Limiter aux prospects dans le budget
    const eligible = prospects.slice(0, Math.min(prospects.length, budget.remaining))
    const batches = splitIntoBatches(eligible, batchSize)

    // 4. Envoyer par batch via channelDispatcher
    const { dispatchMessage } = await import('../../engine/channelDispatcher.js')

    for (const batch of batches) {
      for (const prospect of batch) {
        try {
          const result = await dispatchMessage(orgId, prospect.id, {
            channel: 'email',
            content: {
              subject: config.subject || 'Message',
              html: config.htmlTemplate || config.textTemplate || '',
              text: config.textTemplate || '',
              from: config.fromName,
              replyTo: config.replyTo,
            },
            fallbackChannels: [],
          })

          if (result.success) {
            results.sent++
            await recordBudgetUsage(orgId, 'email')
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

        // Delai inter-messages
        const delay = calculateDelay('email')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    results.skipped = prospects.length - eligible.length

    logger.info(`[emailDispatcher] org=${orgId} sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`)
    return results
  } catch (error) {
    logger.error('[emailDispatcher] error:', error)
    results.failed = prospects.length
    return results
  }
}
