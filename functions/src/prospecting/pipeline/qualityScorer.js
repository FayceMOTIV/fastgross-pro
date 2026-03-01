/**
 * Quality Scorer — Extends advancedScoring with source-specific bonuses
 *
 * Reuses advancedScoring() from engine/advancedScoring.js
 * Adds bonus points based on lead source and intent signals.
 */

import { advancedScoring } from '../../engine/advancedScoring.js'
import { logger } from 'firebase-functions/v2'

// ─── SOURCE BONUSES ─────────────────────────────────────────────────────────

const SOURCE_BONUSES = {
  // Registries
  sirene: { base: 10, recentCreation: 25 },
  bodacc: { base: 10, creation: 20, modification: 10 },
  france_travail: { base: 5, recruiting: 15 },

  // Intent signals
  serp_hunting: { base: 15, highIntent: 30 },
  new_domains: { base: 10, proSite: 25 },
  competitor_reviews: { base: 20, activelySearching: 35 },
}

// ─── MAIN SCORER ────────────────────────────────────────────────────────────

/**
 * Score a normalized lead using advancedScoring + source bonuses
 * @param {Object} lead - Normalized lead
 * @param {Object} icp - Ideal Customer Profile
 * @returns {Object} { score, priority, category, breakdown }
 */
export function scoreLead(lead, icp) {
  // Build a prospect-like object for advancedScoring
  const prospectLike = {
    enrichment: {
      industry: lead.nafLabel || '',
      sector: lead.naf || '',
      nafLabel: lead.nafLabel || '',
      city: lead.city,
      address: `${lead.postalCode} ${lead.city}`,
      employeeCount: lead.employeeCount,
      revenue: lead.revenue,
      emails: lead.email ? [lead.email] : [],
      phones: lead.phone ? [lead.phone] : [],
      ceo: lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : null,
      linkedinUrl: lead.linkedinUrl,
      domain: lead.domain,
      siret: lead.siret,
    },
  }

  // Run base scoring
  let baseResult
  try {
    baseResult = advancedScoring(prospectLike, icp || {})
  } catch (error) {
    logger.warn(`[qualityScorer] advancedScoring failed, using fallback:`, error.message)
    baseResult = {
      total: 30,
      priority: 'C',
      category: 'cold',
      fit: { score: 15, maxScore: 50, breakdown: {}, matches: [], mismatches: [] },
      intent: { score: 5, maxScore: 30, signals: [], signalCount: 0 },
      data: { score: 10, maxScore: 20, breakdown: {}, completeness: 0, missing: [] },
    }
  }

  // Calculate source bonus
  const sourceBonus = calculateSourceBonus(lead)

  // Combined score (capped at 100)
  const totalScore = Math.min(100, baseResult.total + sourceBonus.points)

  // Recalculate priority with bonus
  const priority = calculatePriority(totalScore, baseResult.fit?.score || 0, baseResult.intent?.score || 0, sourceBonus.points)

  const categoryMap = { A: 'hot', B: 'warm', C: 'cold', D: 'nurture' }

  return {
    score: totalScore,
    priority,
    category: categoryMap[priority],
    breakdown: {
      baseScore: baseResult.total,
      sourceBonus: sourceBonus.points,
      sourceBonusReasons: sourceBonus.reasons,
      fit: baseResult.fit,
      intent: baseResult.intent,
      data: baseResult.data,
    },
  }
}

/**
 * Score a batch of leads
 * @param {Array} leads
 * @param {Object} icp
 * @returns {Array} Scored leads sorted by score desc
 */
export function scoreLeadsBatch(leads, icp) {
  return leads
    .map(lead => ({
      ...lead,
      scoring: scoreLead(lead, icp),
    }))
    .sort((a, b) => b.scoring.score - a.scoring.score)
}

// ─── SOURCE BONUS CALCULATOR ────────────────────────────────────────────────

function calculateSourceBonus(lead) {
  const bonus = SOURCE_BONUSES[lead.sourceId]
  if (!bonus) return { points: 0, reasons: [] }

  let points = bonus.base || 0
  const reasons = [`Source ${lead.sourceId}: +${points}`]

  const signals = lead.intentSignals || []

  switch (lead.sourceId) {
    case 'sirene': {
      // Recent creation bonus (< 6 months)
      const hasRecent = signals.some(s => s.type === 'recent_creation')
      if (hasRecent) {
        points += bonus.recentCreation
        reasons.push(`Creation recente: +${bonus.recentCreation}`)
      }
      break
    }

    case 'bodacc': {
      const hasCreation = signals.some(s => s.type === 'creation')
      const hasModification = signals.some(s => s.type === 'modification')
      if (hasCreation) {
        points += bonus.creation
        reasons.push(`Annonce creation: +${bonus.creation}`)
      } else if (hasModification) {
        points += bonus.modification
        reasons.push(`Annonce modification: +${bonus.modification}`)
      }
      break
    }

    case 'france_travail': {
      const isRecruiting = signals.some(s => s.type === 'recruiting')
      if (isRecruiting) {
        points += bonus.recruiting
        reasons.push(`Recrute activement: +${bonus.recruiting}`)
      }
      break
    }

    case 'serp_hunting': {
      const highIntent = signals.some(s => s.type === 'high_intent')
      if (highIntent) {
        points += bonus.highIntent
        reasons.push(`Intent SERP eleve: +${bonus.highIntent}`)
      }
      break
    }

    case 'new_domains': {
      const proSite = signals.some(s => s.type === 'professional_site')
      if (proSite) {
        points += bonus.proSite
        reasons.push(`Site pro detecte: +${bonus.proSite}`)
      }
      break
    }

    case 'competitor_reviews': {
      const searching = signals.some(s => s.type === 'actively_searching')
      if (searching) {
        points += bonus.activelySearching
        reasons.push(`Cherche alternative: +${bonus.activelySearching}`)
      }
      break
    }
  }

  return { points, reasons }
}

// ─── PRIORITY CALCULATOR ────────────────────────────────────────────────────

function calculatePriority(totalScore, fitScore, intentScore, sourceBonus) {
  // Hot: high total with good fit or strong intent
  if (totalScore >= 75 && (fitScore >= 30 || intentScore >= 20 || sourceBonus >= 25)) {
    return 'A'
  }

  // Warm: decent total
  if (totalScore >= 55) {
    return 'B'
  }

  // Cold: below average but some potential
  if (totalScore >= 35) {
    return 'C'
  }

  // Nurture: low score
  return 'D'
}
