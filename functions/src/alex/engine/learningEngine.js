/**
 * Learning Engine — Alex apprend de ses resultats (Alex V4)
 *
 * Quand un prospect passe en "closed" ou "lost", Alex analyse :
 *  - Quel signal l'a trouve (reddit_intent, job_posting, new_domain, etc.)
 *  - Quel template email a ete utilise
 *  - Quel canal a declenche la reponse
 *  - Combien de touchpoints avant la reponse
 *  - Quel score il avait au depart
 *
 * Stocke les metriques dans organizations/{orgId}/learningData
 * Recalcule les poids du scoring engine chaque semaine.
 *
 * Le scoring s'ameliore tout seul avec le temps.
 */
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// Status that trigger learning
const OUTCOME_STATUSES = ['closed', 'won', 'lost', 'disqualified']
const POSITIVE_STATUSES = ['closed', 'won']

// ─── Trigger: prospect status change ─────────────────────────────────

export const onProspectOutcome = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()
    if (!before || !after) return

    // Only trigger on status change to outcome status
    if (before.status === after.status) return
    if (!OUTCOME_STATUSES.includes(after.status)) return

    const orgId = event.params.orgId
    const prospectId = event.params.prospectId
    const db = getDb()

    try {
      await recordOutcome(db, orgId, prospectId, before, after)
      logger.info(`Learning Engine: outcome recorded for ${prospectId} in org ${orgId} (${after.status})`)
    } catch (error) {
      logger.error(`Learning Engine error:`, error.message)
    }
  }
)

// ─── Record outcome data ─────────────────────────────────────────────

async function recordOutcome(db, orgId, prospectId, before, after) {
  const isPositive = POSITIVE_STATUSES.includes(after.status)

  // Get interaction history for this prospect
  const interSnap = await db.collection(`organizations/${orgId}/interactions`)
    .where('prospectId', '==', prospectId)
    .orderBy('createdAt', 'asc')
    .limit(50)
    .get()

  const interactions = interSnap.docs.map(d => d.data())

  // Analyze interactions
  const firstContact = interactions.find(i => i.direction === 'outbound')
  const firstReply = interactions.find(i => i.direction === 'inbound')
  const touchpointsBeforeReply = firstReply
    ? interactions.filter(i => i.direction === 'outbound' && i.createdAt < firstReply.createdAt).length
    : interactions.filter(i => i.direction === 'outbound').length

  // Extract key data
  const outcomeData = {
    prospectId,
    outcome: after.status,
    isPositive,

    // Signal that found this prospect
    signalType: after.signal_type || after.source || 'unknown',
    source: after.source || 'unknown',

    // Score at discovery
    initialScore: before.score || after.score || 0,
    scoreTier: before.scoreTier || after.scoreTier || 'unknown',

    // Channel data
    firstContactChannel: firstContact?.channel || 'unknown',
    replyChannel: firstReply?.channel || 'unknown',

    // Template data
    templateUsed: firstContact?.templateId || firstContact?.template || 'unknown',
    templateName: firstContact?.templateName || '',

    // Engagement metrics
    totalTouchpoints: interactions.filter(i => i.direction === 'outbound').length,
    touchpointsBeforeReply,
    totalReplies: interactions.filter(i => i.direction === 'inbound').length,
    daysToFirstReply: firstReply && firstContact
      ? Math.round((toDate(firstReply.createdAt) - toDate(firstContact.createdAt)) / 86400000)
      : null,
    daysToOutcome: firstContact
      ? Math.round((Date.now() - toDate(firstContact.createdAt)) / 86400000)
      : null,

    // Prospect metadata
    sector: after.sector || after.niche || 'unknown',
    zone: after.zone || '',
    company: after.company || after.companyName || '',

    // Tech signals
    techSignals: (after.techSignals || []).map(s => s.type || s).slice(0, 5),

    recordedAt: FieldValue.serverTimestamp(),
  }

  // Save individual outcome
  await db.collection(`organizations/${orgId}/learningData`).add(outcomeData)

  // Update aggregate counters
  await updateAggregates(db, orgId, outcomeData)
}

// ─── Update aggregate learning data ──────────────────────────────────

async function updateAggregates(db, orgId, outcome) {
  const aggRef = db.doc(`organizations/${orgId}/learningAggregates/current`)

  await db.runTransaction(async (t) => {
    const doc = await t.get(aggRef)
    const agg = doc.exists ? doc.data() : {
      totalOutcomes: 0,
      wins: 0,
      losses: 0,
      bySignalType: {},
      byChannel: {},
      byTemplate: {},
      bySector: {},
      byScoreTier: {},
      avgTouchpointsToReply: { sum: 0, count: 0 },
      avgDaysToReply: { sum: 0, count: 0 },
      updatedAt: null,
    }

    agg.totalOutcomes++
    if (outcome.isPositive) agg.wins++
    else agg.losses++

    // By signal type
    const sig = outcome.signalType
    if (!agg.bySignalType[sig]) agg.bySignalType[sig] = { total: 0, wins: 0, losses: 0 }
    agg.bySignalType[sig].total++
    if (outcome.isPositive) agg.bySignalType[sig].wins++
    else agg.bySignalType[sig].losses++

    // By channel
    const ch = outcome.firstContactChannel
    if (!agg.byChannel[ch]) agg.byChannel[ch] = { total: 0, wins: 0, losses: 0 }
    agg.byChannel[ch].total++
    if (outcome.isPositive) agg.byChannel[ch].wins++
    else agg.byChannel[ch].losses++

    // By template
    const tpl = outcome.templateUsed
    if (tpl !== 'unknown') {
      if (!agg.byTemplate[tpl]) agg.byTemplate[tpl] = { total: 0, wins: 0, losses: 0, name: outcome.templateName }
      agg.byTemplate[tpl].total++
      if (outcome.isPositive) agg.byTemplate[tpl].wins++
      else agg.byTemplate[tpl].losses++
    }

    // By sector
    const sec = outcome.sector
    if (!agg.bySector[sec]) agg.bySector[sec] = { total: 0, wins: 0, losses: 0 }
    agg.bySector[sec].total++
    if (outcome.isPositive) agg.bySector[sec].wins++
    else agg.bySector[sec].losses++

    // By score tier
    const tier = outcome.scoreTier
    if (!agg.byScoreTier[tier]) agg.byScoreTier[tier] = { total: 0, wins: 0, losses: 0 }
    agg.byScoreTier[tier].total++
    if (outcome.isPositive) agg.byScoreTier[tier].wins++
    else agg.byScoreTier[tier].losses++

    // Averages
    if (outcome.touchpointsBeforeReply != null) {
      agg.avgTouchpointsToReply.sum += outcome.touchpointsBeforeReply
      agg.avgTouchpointsToReply.count++
    }
    if (outcome.daysToFirstReply != null) {
      agg.avgDaysToReply.sum += outcome.daysToFirstReply
      agg.avgDaysToReply.count++
    }

    agg.updatedAt = FieldValue.serverTimestamp()
    t.set(aggRef, agg)
  })
}

// ─── Weekly: recalculate scoring weights ─────────────────────────────

export const weeklyLearningRecalc = onSchedule({
  schedule: 'every sunday 03:00',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  const db = getDb()

  const orgsSnap = await db.collection('organizations')
    .where('prospectionEnabled', '==', true)
    .get()

  for (const orgDoc of orgsSnap.docs) {
    try {
      await recalculateWeights(db, orgDoc.id)
    } catch (error) {
      logger.error(`Learning recalc error for ${orgDoc.id}:`, error.message)
    }
  }
})

async function recalculateWeights(db, orgId) {
  const aggDoc = await db.doc(`organizations/${orgId}/learningAggregates/current`).get()
  if (!aggDoc.exists) return

  const agg = aggDoc.data()
  if (agg.totalOutcomes < 10) return // Need minimum data

  // Calculate conversion rates by signal type
  const signalWeights = {}
  for (const [signal, data] of Object.entries(agg.bySignalType || {})) {
    if (data.total < 3) continue // Minimum sample
    const convRate = data.wins / data.total
    signalWeights[signal] = {
      conversionRate: Math.round(convRate * 100),
      totalSample: data.total,
      suggestedWeight: Math.round(convRate * 30), // Max 30 for signal weights
    }
  }

  // Calculate best channels
  const channelPerformance = {}
  for (const [channel, data] of Object.entries(agg.byChannel || {})) {
    if (data.total < 3) continue
    const convRate = data.wins / data.total
    channelPerformance[channel] = {
      conversionRate: Math.round(convRate * 100),
      totalSample: data.total,
      wins: data.wins,
    }
  }

  // Calculate best templates
  const templatePerformance = {}
  for (const [tpl, data] of Object.entries(agg.byTemplate || {})) {
    if (data.total < 2) continue
    const convRate = data.wins / data.total
    templatePerformance[tpl] = {
      name: data.name,
      conversionRate: Math.round(convRate * 100),
      totalSample: data.total,
      wins: data.wins,
    }
  }

  // Average metrics
  const avgTouchpoints = agg.avgTouchpointsToReply.count > 0
    ? Math.round(agg.avgTouchpointsToReply.sum / agg.avgTouchpointsToReply.count * 10) / 10
    : null
  const avgDaysToReply = agg.avgDaysToReply.count > 0
    ? Math.round(agg.avgDaysToReply.sum / agg.avgDaysToReply.count * 10) / 10
    : null

  // Store learned weights
  const learnedWeights = {
    signalWeights,
    channelPerformance,
    templatePerformance,
    overallConversionRate: agg.totalOutcomes > 0 ? Math.round((agg.wins / agg.totalOutcomes) * 100) : 0,
    avgTouchpointsToReply: avgTouchpoints,
    avgDaysToReply: avgDaysToReply,
    totalOutcomes: agg.totalOutcomes,
    wins: agg.wins,
    losses: agg.losses,
    recalculatedAt: FieldValue.serverTimestamp(),
  }

  await db.doc(`organizations/${orgId}/learningAggregates/weights`).set(learnedWeights)

  // Store history
  const dateKey = new Date().toISOString().split('T')[0]
  await db.doc(`organizations/${orgId}/learningHistory/${dateKey}`).set(learnedWeights)

  logger.info(`Learning weights recalculated for org ${orgId}: ${agg.totalOutcomes} outcomes, ${agg.wins} wins`)
}

// ─── Callable: get learning insights ─────────────────────────────────

export const getLearningInsights = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  const [aggDoc, weightsDoc] = await Promise.all([
    db.doc(`organizations/${orgId}/learningAggregates/current`).get(),
    db.doc(`organizations/${orgId}/learningAggregates/weights`).get(),
  ])

  const agg = aggDoc.exists ? aggDoc.data() : null
  const weights = weightsDoc.exists ? weightsDoc.data() : null

  if (!agg) return { success: true, hasData: false, message: 'Pas encore de donnees. Marquez des prospects comme "closed" ou "lost".' }

  return {
    success: true,
    hasData: true,
    aggregates: {
      totalOutcomes: agg.totalOutcomes,
      wins: agg.wins,
      losses: agg.losses,
      conversionRate: agg.totalOutcomes > 0 ? Math.round((agg.wins / agg.totalOutcomes) * 100) : 0,
    },
    weights,
    topSignals: weights?.signalWeights
      ? Object.entries(weights.signalWeights)
          .sort(([,a], [,b]) => b.conversionRate - a.conversionRate)
          .slice(0, 5)
          .map(([signal, data]) => ({ signal, ...data }))
      : [],
    topChannels: weights?.channelPerformance
      ? Object.entries(weights.channelPerformance)
          .sort(([,a], [,b]) => b.conversionRate - a.conversionRate)
          .slice(0, 5)
          .map(([channel, data]) => ({ channel, ...data }))
      : [],
    topTemplates: weights?.templatePerformance
      ? Object.entries(weights.templatePerformance)
          .sort(([,a], [,b]) => b.conversionRate - a.conversionRate)
          .slice(0, 5)
          .map(([tpl, data]) => ({ templateId: tpl, ...data }))
      : [],
  }
})

// ─── Callable: force recalculate weights ─────────────────────────────

export const forceRecalculateWeights = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  await recalculateWeights(db, orgId)
  return { success: true }
})

// ─── Helper ──────────────────────────────────────────────────────────

function toDate(val) {
  if (!val) return new Date(0)
  if (val.toDate) return val.toDate()
  if (val._seconds) return new Date(val._seconds * 1000)
  return new Date(val)
}
