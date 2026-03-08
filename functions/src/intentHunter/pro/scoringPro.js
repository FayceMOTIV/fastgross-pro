/**
 * Intent Hunter Pro — Scoring B2B
 *
 * Couche scoring specifique au systeme B2B Pro.
 * Delegue le calcul au leadScoringEngine central et y ajoute
 * la gestion des priorites pour le systeme de sequences.
 *
 * Imports depuis ../../scoring/leadScoringEngine.js
 */

import {
  computeFinalScore,
  getPriority,
  B2B_FORCED_SCORES,
  computeInitialScore,
  computeDynamicScoreDelta,
  applyDynamicDelta,
  requiresImmediateAction,
  requiresHITL
} from '../../scoring/leadScoringEngine.js'

// ============================================
// SCORE + PRIORITY
// ============================================

/**
 * Calcule le score B2B d'un lead et determine sa priorite.
 * Utilise le moteur central avec systemType = 'B2B'.
 *
 * @param {Object} lead - Lead brut detecte par un scraper
 * @param {string} [lead.email] - Email du lead
 * @param {string} [lead.phone] - Telephone du lead
 * @param {boolean} [lead.boampMarket] - Signal marche public
 * @param {boolean} [lead.recentFunding] - Levee de fonds recente
 * @param {boolean} [lead.newDirector] - Nouveau dirigeant
 * @param {number} [lead.competitorRating] - Note concurrent (1-5)
 * @param {boolean} [lead.sectorMatch] - Correspondance secteur
 * @param {boolean} [lead.companySizeMatch] - Correspondance taille entreprise
 * @param {number} [lead.intentKeywordsCount] - Nombre de mots-cles d'intention
 * @param {boolean} [lead.urgencyDetected] - Urgence detectee
 * @param {boolean} [lead.budgetMentioned] - Budget mentionne
 * @param {Date|number} [lead.postedAt] - Date de publication du signal
 * @returns {{ score: number, priority: 'ultra_hot'|'hot'|'warm'|'cold', immediate: boolean, hitl: boolean }}
 */
export function scoreLead(lead) {
  const score = computeFinalScore(lead, 'B2B')
  const priority = getPriority(score)
  const immediate = requiresImmediateAction(score)
  const hitl = requiresHITL(score)

  console.log(JSON.stringify({
    function: 'scoringPro.scoreLead',
    step: 'scored',
    score,
    priority,
    immediate,
    hitl,
    source: lead.source || 'unknown',
    hasEmail: Boolean(lead.email),
    hasPhone: Boolean(lead.phone)
  }))

  return { score, priority, immediate, hitl }
}

// ============================================
// INITIAL SCORE (avant forced scores)
// ============================================

/**
 * Calcule le score initial brut sans forced scores (debug / analytics)
 * @param {Object} lead
 * @returns {number} Score 0-100
 */
export function scoreLeadRaw(lead) {
  return computeInitialScore(lead, 'B2B')
}

// ============================================
// DYNAMIC SCORING (post-contact)
// ============================================

/**
 * Met a jour le score apres un evenement post-contact.
 *
 * @param {number} currentScore - Score actuel du lead
 * @param {string} event - Type d'evenement (EMAIL_OPENED, REPLIED_POSITIVELY, etc.)
 * @returns {{ newScore: number, delta: number, newPriority: 'ultra_hot'|'hot'|'warm'|'cold' }}
 */
export function updateLeadScore(currentScore, event) {
  const delta = computeDynamicScoreDelta(event)
  const newScore = applyDynamicDelta(currentScore, event)
  const newPriority = getPriority(newScore)

  console.log(JSON.stringify({
    function: 'scoringPro.updateLeadScore',
    step: 'dynamic_update',
    event,
    previousScore: currentScore,
    delta,
    newScore,
    newPriority
  }))

  return { newScore, delta, newPriority }
}

// ============================================
// BATCH SCORING
// ============================================

/**
 * Score un batch de leads et les trie par priorite decroissante.
 *
 * @param {Object[]} leads - Tableau de leads bruts
 * @returns {Array<{ lead: Object, score: number, priority: string, immediate: boolean }>}
 */
export function scoreLeadsBatch(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return []

  const scored = leads.map(lead => {
    const { score, priority, immediate, hitl } = scoreLead(lead)
    return { lead, score, priority, immediate, hitl }
  })

  // Tri par score decroissant
  scored.sort((a, b) => b.score - a.score)

  console.log(JSON.stringify({
    function: 'scoringPro.scoreLeadsBatch',
    step: 'batch_complete',
    total: scored.length,
    ultra_hot: scored.filter(s => s.priority === 'ultra_hot').length,
    hot: scored.filter(s => s.priority === 'hot').length,
    warm: scored.filter(s => s.priority === 'warm').length,
    cold: scored.filter(s => s.priority === 'cold').length
  }))

  return scored
}

// ============================================
// RE-EXPORTS
// ============================================

export { B2B_FORCED_SCORES, getPriority, requiresImmediateAction, requiresHITL }
