/**
 * Prospect Scorer — Scoring Engine (Alex V4)
 * Complete unified scoring function with all weights from the Alex V4 spec.
 *
 * Categories:
 *  - Contact info (email, phone, linkedin)         max 55
 *  - Signal type (new_domain, reddit, job, etc.)   max 30
 *  - Enrichment quality (company_size, title, etc) max 20
 *  - Funding/hiring/frustration signals            max 15
 *  - Tech stack signals bonus                      max 25
 *
 * Total capped at 100.
 *
 * Priority tiers:
 *  > 80 = BRULANT  — action immediate
 *  > 60 = CHAUD    — priorite haute
 *  > 40 = TIEDE    — nurture
 *  < 40 = FROID    — pipeline long terme
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Score weights ──────────────────────────────────────────────────

const WEIGHTS = {
  // Contact info
  email: 30,
  phone: 15,
  linkedin: 10,

  // Signal types (HUNTER)
  reddit_intent: 25,
  job_posting: 20,
  new_domain_fresh: 20,     // < 7 days
  new_domain_recent: 10,    // 7-30 days
  competitor_user: 25,
  no_website: 15,
  low_reviews: 15,
  missing_tech: 10,

  // Enrichment quality
  company_size: 5,
  title_found: 10,
  website: 5,

  // Funding / growth signals
  funding: 10,
  hiring: 5,
  frustration: 15,

  // Tech signals bonus
  uses_competitor_tool: 25,
  critical_tool_missing: 15,
  no_analytics: 10,
  wordpress_no_seo: 10,

  // Engagement signals
  multiple_signals: 10,
  fresh_signal: 10,         // < 24h
  high_engagement: 5        // Reddit ups > 50
}

// ─── Priority tiers ─────────────────────────────────────────────────

const TIERS = [
  { min: 80, tier: 'burning', label: 'Brulant', color: '#EF4444', action: 'Contact immediat' },
  { min: 60, tier: 'hot', label: 'Chaud', color: '#F59E0B', action: 'Priorite haute' },
  { min: 40, tier: 'warm', label: 'Tiede', color: '#3B82F6', action: 'Nurture' },
  { min: 0, tier: 'cold', label: 'Froid', color: '#6B7280', action: 'Pipeline long terme' }
]

// ─── Callable: score prospects ──────────────────────────────────────

export const scoreProspects = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '256MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectIds, applyToAll } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  const db = getDb()
  const stats = await batchScoreProspects(db, orgId, prospectIds, applyToAll)

  return { success: true, stats }
})

// ─── Core scoring function ──────────────────────────────────────────

export function scoreProspect(prospect) {
  let score = 0
  const breakdown = []

  // ── Contact info ──────────────────────────────────────
  if (prospect.email) {
    score += WEIGHTS.email
    breakdown.push({ category: 'contact', signal: 'Email trouve', points: WEIGHTS.email })
  }
  if (prospect.phone) {
    score += WEIGHTS.phone
    breakdown.push({ category: 'contact', signal: 'Telephone trouve', points: WEIGHTS.phone })
  }
  if (prospect.linkedin || prospect.linkedinUrl) {
    score += WEIGHTS.linkedin
    breakdown.push({ category: 'contact', signal: 'LinkedIn trouve', points: WEIGHTS.linkedin })
  }

  // ── Signal type (HUNTER) ──────────────────────────────
  const signalType = prospect.signal_type || ''

  if (signalType === 'reddit_intent') {
    score += WEIGHTS.reddit_intent
    breakdown.push({ category: 'signal', signal: 'Intent Reddit detecte', points: WEIGHTS.reddit_intent })
  }

  if (signalType === 'job_posting') {
    score += WEIGHTS.job_posting
    breakdown.push({ category: 'signal', signal: 'Offre d\'emploi detectee', points: WEIGHTS.job_posting })
  }

  if (signalType === 'new_domain') {
    const ageDays = prospect.domainAge || prospect.domainAgeDays || 30
    if (ageDays <= 7) {
      score += WEIGHTS.new_domain_fresh
      breakdown.push({ category: 'signal', signal: 'Domaine < 7 jours', points: WEIGHTS.new_domain_fresh })
    } else if (ageDays <= 30) {
      score += WEIGHTS.new_domain_recent
      breakdown.push({ category: 'signal', signal: 'Domaine < 30 jours', points: WEIGHTS.new_domain_recent })
    }
  }

  if (signalType === 'competitor_user') {
    score += WEIGHTS.competitor_user
    breakdown.push({ category: 'signal', signal: 'Utilise un concurrent', points: WEIGHTS.competitor_user })
  }

  if (signalType === 'no_website') {
    score += WEIGHTS.no_website
    breakdown.push({ category: 'signal', signal: 'Pas de site web', points: WEIGHTS.no_website })
  }

  if (signalType === 'low_reviews') {
    const reviewCount = prospect.googleMapsReviews || prospect.reviewCount || 0
    if (reviewCount < 10) {
      score += WEIGHTS.low_reviews
      breakdown.push({ category: 'signal', signal: `< 10 avis (${reviewCount})`, points: WEIGHTS.low_reviews })
    }
  }

  if (signalType === 'missing_tech') {
    score += WEIGHTS.missing_tech
    breakdown.push({ category: 'signal', signal: 'Stack technique incomplete', points: WEIGHTS.missing_tech })
  }

  // ── Enrichment quality ────────────────────────────────
  if (prospect.company_size || prospect.effectif) {
    score += WEIGHTS.company_size
    breakdown.push({ category: 'enrichment', signal: 'Taille entreprise connue', points: WEIGHTS.company_size })
  }

  if (prospect.title || prospect.jobTitle) {
    score += WEIGHTS.title_found
    breakdown.push({ category: 'enrichment', signal: 'Titre/poste identifie', points: WEIGHTS.title_found })
  }

  if (prospect.website || prospect.websiteUrl) {
    score += WEIGHTS.website
    breakdown.push({ category: 'enrichment', signal: 'Site web connu', points: WEIGHTS.website })
  }

  // ── Funding / growth signals ──────────────────────────
  const signalDetail = (prospect.signal_detail || prospect.signal || '').toLowerCase()

  if (/fund|rais|series|invest|levee/i.test(signalDetail)) {
    score += WEIGHTS.funding
    breakdown.push({ category: 'growth', signal: 'Signal financement', points: WEIGHTS.funding })
  }

  if (/hiring|recruit|growing|recrute|embauche/i.test(signalDetail)) {
    score += WEIGHTS.hiring
    breakdown.push({ category: 'growth', signal: 'Signal recrutement', points: WEIGHTS.hiring })
  }

  if (/frustrat|switch|hate|alternative|mecontent|quitt/i.test(signalDetail)) {
    score += WEIGHTS.frustration
    breakdown.push({ category: 'growth', signal: 'Signal frustration/changement', points: WEIGHTS.frustration })
  }

  // ── Tech stack signals bonus ──────────────────────────
  if (prospect.techSignals?.length > 0) {
    for (const signal of prospect.techSignals) {
      if (signal.type === 'uses_competitor' && score < 100) {
        score += WEIGHTS.uses_competitor_tool
        breakdown.push({ category: 'tech', signal: `Utilise outil concurrent: ${signal.competitor}`, points: WEIGHTS.uses_competitor_tool })
        break // Only count once
      }
    }

    const hasCritical = prospect.techSignals.some(s => s.severity === 'critical')
    if (hasCritical) {
      score += WEIGHTS.critical_tool_missing
      breakdown.push({ category: 'tech', signal: 'Outil critique manquant', points: WEIGHTS.critical_tool_missing })
    }

    if (prospect.techSignals.some(s => s.type === 'no_analytics')) {
      score += WEIGHTS.no_analytics
      breakdown.push({ category: 'tech', signal: 'Aucun analytics', points: WEIGHTS.no_analytics })
    }

    if (prospect.techSignals.some(s => s.type === 'wordpress_no_seo')) {
      score += WEIGHTS.wordpress_no_seo
      breakdown.push({ category: 'tech', signal: 'WordPress sans SEO', points: WEIGHTS.wordpress_no_seo })
    }
  }

  // ── Engagement / freshness bonus ──────────────────────
  if (prospect.redditScore > 50 || prospect.ups > 50) {
    score += WEIGHTS.high_engagement
    breakdown.push({ category: 'engagement', signal: 'Fort engagement Reddit', points: WEIGHTS.high_engagement })
  }

  if (prospect.intentFreshness === 'very_fresh') {
    score += WEIGHTS.fresh_signal
    breakdown.push({ category: 'engagement', signal: 'Signal tres recent (< 3h)', points: WEIGHTS.fresh_signal })
  }

  const matchedTactics = prospect.matchedTactics || []
  if (matchedTactics.length >= 2) {
    score += WEIGHTS.multiple_signals
    breakdown.push({ category: 'engagement', signal: 'Signaux multiples', points: WEIGHTS.multiple_signals })
  }

  // ── Cap + tier ────────────────────────────────────────
  const finalScore = Math.min(score, 100)
  const tier = TIERS.find(t => finalScore >= t.min)

  return {
    score: finalScore,
    tier: tier.tier,
    tierLabel: tier.label,
    tierColor: tier.color,
    action: tier.action,
    breakdown,
    totalSignals: breakdown.length
  }
}

// ─── Batch scoring ──────────────────────────────────────────────────

export async function batchScoreProspects(db, orgId, prospectIds, applyToAll) {
  const stats = { scored: 0, updated: 0, tiers: { burning: 0, hot: 0, warm: 0, cold: 0 } }

  let prospectsSnap
  if (prospectIds?.length) {
    const prospects = []
    for (const id of prospectIds) {
      const snap = await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(id).get()
      if (snap.exists) prospects.push({ id: snap.id, ...snap.data() })
    }
    prospectsSnap = prospects
  } else if (applyToAll) {
    const snap = await db.collection('organizations').doc(orgId)
      .collection('prospects')
      .where('status', 'in', ['new', 'warming'])
      .limit(200)
      .get()
    prospectsSnap = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } else {
    // Score only unscored or recently updated
    const snap = await db.collection('organizations').doc(orgId)
      .collection('prospects')
      .where('scoredAt', '==', null)
      .limit(100)
      .get()
    prospectsSnap = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  // Process in batches of 50 (Firestore batch limit: 500)
  const batchSize = 50
  for (let i = 0; i < prospectsSnap.length; i += batchSize) {
    const chunk = prospectsSnap.slice(i, i + batchSize)
    const writeBatch = db.batch()

    for (const prospect of chunk) {
      const result = scoreProspect(prospect)
      stats.scored++
      stats.tiers[result.tier]++

      const ref = db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospect.id)

      writeBatch.update(ref, {
        score: result.score,
        scoreTier: result.tier,
        scoreTierLabel: result.tierLabel,
        scoreBreakdown: result.breakdown,
        scoredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
      stats.updated++
    }

    await writeBatch.commit()
  }

  logger.info(`Scored ${stats.scored} prospects for org ${orgId}`, stats.tiers)
  return stats
}
