/**
 * Scoring Particuliers (B2C) — Intent Hunter
 *
 * Utilise le leadScoringEngine unifie avec systemType='B2C'
 * + scores forces specifiques B2C.
 *
 * Scoring B2C specifique :
 *   - Urgence detectee : +25 points
 *   - Zone geoloc match : +15 points
 *   - Evenement de vie (mariage, demenagement, naissance) : +20 points
 *   - Telephone visible : +10 points (contact direct possible)
 *   - Budget mentionne : +15 points
 */

import {
  computeFinalScore,
  getPriority,
  B2C_FORCED_SCORES,
  computeDynamicScoreDelta,
  applyDynamicDelta,
  requiresImmediateAction
} from '../../scoring/leadScoringEngine.js'

/**
 * Score un lead B2C
 * @param {Object} lead
 * @returns {{ score: number, priority: string, immediate: boolean }}
 */
export function scoreLead(lead) {
  const score = computeFinalScore(lead, 'B2C')
  const priority = getPriority(score)
  const immediate = requiresImmediateAction(score)

  console.log(JSON.stringify({
    function: 'scoringParticuliers.scoreLead',
    score,
    priority,
    immediate,
    source: lead.source || 'unknown',
    hasPhone: Boolean(lead.phone),
    zone: lead.zone || null
  }))

  return { score, priority, immediate }
}

/**
 * Score un batch de leads B2C et les trie par score decroissant
 * @param {Object[]} leads
 * @returns {Array<{ lead: Object, score: number, priority: string, immediate: boolean }>}
 */
export function scoreLeadsBatch(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return []

  const scored = leads.map(lead => {
    const { score, priority, immediate } = scoreLead(lead)
    return { lead, score, priority, immediate }
  })

  scored.sort((a, b) => b.score - a.score)

  console.log(JSON.stringify({
    function: 'scoringParticuliers.scoreLeadsBatch',
    total: scored.length,
    hot: scored.filter(s => s.priority === 'ultra_hot' || s.priority === 'hot').length,
    warm: scored.filter(s => s.priority === 'warm').length,
    cold: scored.filter(s => s.priority === 'cold').length
  }))

  return scored
}

/**
 * Met a jour le score apres un evenement post-contact
 * @param {number} currentScore
 * @param {string} event
 * @returns {{ newScore: number, delta: number, newPriority: string }}
 */
export function updateLeadScore(currentScore, event) {
  const delta = computeDynamicScoreDelta(event)
  const newScore = applyDynamicDelta(currentScore, event)
  const newPriority = getPriority(newScore)
  return { newScore, delta, newPriority }
}

export { B2C_FORCED_SCORES, getPriority }
