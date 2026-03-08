/**
 * Lead Scoring Engine — Intent Hunter
 *
 * Score unifie B2B + B2C avec parametre systemType.
 *
 * Deux phases :
 *   1. Score initial (a la detection du lead) → computeInitialScore()
 *   2. Score dynamique (post-contact, via webhooks) → computeDynamicScoreDelta()
 *
 * Le scoring coexiste avec l'advancedScoring.js existant (moteur orchestrateur)
 * sans le remplacer. Ce module est specifique a Intent Hunter.
 */

// ============================================
// INITIAL SCORING (a la detection)
// ============================================

/**
 * Score initial 0-100+ a la detection du lead.
 * Le parametre systemType dirige vers les bonus specifiques B2B ou B2C.
 *
 * @param {Object} lead - Lead brut detecte par un scraper
 * @param {'B2B'|'B2C'} systemType
 * @returns {number} Score 0-100
 */
export function computeInitialScore(lead, systemType) {
  let score = 0

  // === INTENTION EXPRIMEE (max 30 pts) ===
  const keywordsCount = lead.intentKeywordsCount || 0
  score += Math.min(keywordsCount * 8, 20)
  score += lead.urgencyDetected ? 10 : 0
  score += lead.budgetMentioned ? 10 : 0

  // === FRAICHEUR DU SIGNAL (max 30 pts) ===
  const postedAt = lead.postedAt instanceof Date
    ? lead.postedAt.getTime()
    : (typeof lead.postedAt === 'number' ? lead.postedAt : Date.now())
  const ageHours = (Date.now() - postedAt) / 3_600_000

  if (ageHours < 1) score += 30
  else if (ageHours < 6) score += 25
  else if (ageHours < 24) score += 18
  else if (ageHours < 72) score += 10
  else if (ageHours < 168) score += 5

  // === ACCESSIBILITE CONTACT (max 25 pts) ===
  if (lead.email) score += 12
  if (lead.phone) score += 10
  if (lead.whatsapp) score += 8
  if (lead.linkedinUrl) score += 6
  if (lead.nativeChannel || lead.nativeContactId) score += 5

  // === BONUS B2B (pts supplementaires) ===
  if (systemType === 'B2B') {
    if (lead.boampMarket) score += 35
    if (lead.competitorRating !== undefined && lead.competitorRating <= 2) score += 30
    if (lead.recentFunding) score += 25
    if (lead.newDirector) score += 20
    if (lead.companyGrowth > 0.3) score += 15
    if (lead.isRecruiting) score += 10
    if (lead.sectorMatch) score += 10
    if (lead.companySizeMatch) score += 8
  }

  // === BONUS B2C (pts supplementaires) ===
  if (systemType === 'B2C') {
    if (lead.lifeEvent) score += 20
    if (lead.urgencyLevel === 'critical') score += 20
    if (lead.locationMatch) score += 10
    if (lead.budgetMentioned) score += 10
    if (lead.competitorRating !== undefined && lead.competitorRating <= 2) score += 15
  }

  return Math.min(100, score)
}

// ============================================
// FORCED SCORES (ecrasent le calcul normal)
// ============================================

/**
 * Scores forges B2B — signaux a intention maximale
 */
export const B2B_FORCED_SCORES = {
  boamp: 100,
  avis_concurrent_negative: 95,
  competitor_switch: 95,
  recent_funding: 90,
  pixel_high_intent: 90,
  new_director: 85
}

/**
 * Scores forges B2C — signaux a intention maximale
 */
export const B2C_FORCED_SCORES = {
  leboncoin_tel_visible: 95,
  permis_construire: 90,
  avis_concurrent_negative: 90,
  life_event_confirmed: 85,
  urgency_critical: 85
}

/**
 * Applique un score force si le signal correspond
 * @param {Object} lead
 * @param {'B2B'|'B2C'} systemType
 * @returns {number|null} Score force ou null si pas applicable
 */
export function getForcedScore(lead, systemType) {
  const scores = systemType === 'B2B' ? B2B_FORCED_SCORES : B2C_FORCED_SCORES

  // Verifier chaque signal force
  if (systemType === 'B2B') {
    if (lead.boampMarket) return scores.boamp
    if (lead.competitorSwitcher) return scores.competitor_switch
    if (lead.competitorRating !== undefined && lead.competitorRating <= 2) return scores.avis_concurrent_negative
    if (lead.recentFunding && lead.fundingAge < 30) return scores.recent_funding
    if (lead.pixelHighIntent) return scores.pixel_high_intent
    if (lead.newDirector) return scores.new_director
  }

  if (systemType === 'B2C') {
    if (lead.phoneVisible && lead.source === 'leboncoin') return scores.leboncoin_tel_visible
    if (lead.source === 'permis_construire') return scores.permis_construire
    if (lead.competitorRating !== undefined && lead.competitorRating <= 2) return scores.avis_concurrent_negative
    if (lead.lifeEvent && lead.lifeEventConfirmed) return scores.life_event_confirmed
    if (lead.urgencyLevel === 'critical') return scores.urgency_critical
  }

  return null
}

/**
 * Calcule le score final (force ou calcule)
 */
export function computeFinalScore(lead, systemType) {
  const forced = getForcedScore(lead, systemType)
  if (forced !== null) return forced
  return computeInitialScore(lead, systemType)
}

// ============================================
// DYNAMIC SCORING (post-contact)
// ============================================

/**
 * Delta de score apres un evenement post-contact.
 * Appele par la Cloud Function updateDynamicScore.
 *
 * @param {string} event - Type d'evenement
 * @returns {number} Delta positif ou negatif
 */
export function computeDynamicScoreDelta(event) {
  const deltas = {
    EMAIL_SENT: 0,
    EMAIL_OPENED: 10,
    EMAIL_LINK_CLICKED: 25,
    LINKEDIN_VISITED: 15,
    WEBSITE_VISITED: 30,
    REPLIED_NEUTRAL: 20,
    REPLIED_POSITIVELY: 50,
    REPLIED_NEGATIVELY: -30,
    MEETING_BOOKED: 75,
    UNSUBSCRIBED: -100,
    VIDEO_WATCHED: 20,
    VOICE_CALL_COMPLETED: 15,
    REFERRAL_GENERATED: 30
  }
  return deltas[event] ?? 0
}

/**
 * Applique le delta au score dynamique avec bornes [0, 100]
 * @param {number} currentScore
 * @param {string} event
 * @returns {number} Nouveau score
 */
export function applyDynamicDelta(currentScore, event) {
  const delta = computeDynamicScoreDelta(event)
  return Math.max(0, Math.min(100, currentScore + delta))
}

// ============================================
// PRIORITY MAPPING
// ============================================

/**
 * Determine la priorite selon le score
 * @param {number} score
 * @returns {'ultra_hot'|'hot'|'warm'|'cold'}
 */
export function getPriority(score) {
  if (score >= 80) return 'ultra_hot'
  if (score >= 60) return 'hot'
  if (score >= 40) return 'warm'
  return 'cold'
}

/**
 * Verifie si un score necessite une action immediate
 * @param {number} score
 * @returns {boolean}
 */
export function requiresImmediateAction(score) {
  return score >= 80
}

/**
 * Verifie si un score necessite une notification HITL
 * @param {number} dynamicScore
 * @returns {boolean}
 */
export function requiresHITL(dynamicScore) {
  return dynamicScore >= 70
}
