/**
 * Twitter Dispatcher — Orchestrator
 * Placeholder pour future integration Twitter/X DM
 */

import { logger } from 'firebase-functions/v2'
import { getRemainingBudget, recordBudgetUsage } from '../helpers/budgetCalculator.js'
import { calculateBatchSize, calculateDelay, splitIntoBatches } from '../helpers/batchCalculator.js'

/**
 * Dispatcher Twitter pour l'orchestrateur
 * @param {string} orgId
 * @param {Array} prospects - [{ id, channels: { twitter: { handle } } }]
 * @param {Object} config - { message, warmupDay }
 * @returns {{ sent: number, failed: number, skipped: number, details: Array }}
 */
export async function dispatchTwitter(orgId, prospects, config = {}) {
  const results = { sent: 0, failed: 0, skipped: 0, details: [] }

  // Twitter n'est pas encore implemente
  // Retourner tous les prospects comme skipped
  logger.info(`[twitterDispatcher] Twitter pas encore disponible, ${prospects.length} prospects skipped`)

  results.skipped = prospects.length
  results.details = prospects.map((p) => ({
    prospectId: p.id,
    success: false,
    error: 'twitter_not_implemented',
  }))

  return results
}
