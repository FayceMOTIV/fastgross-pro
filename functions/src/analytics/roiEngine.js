/**
 * ROI Engine — Calculates ROI metrics for a user over a given period
 *
 * Queries campaigns and intentLeadsPro by userId/contactedAt,
 * computes funnel metrics, channel breakdown, top sources,
 * day-of-week / hour heatmap, pipeline value, ROI vs subscription cost,
 * growth vs previous period, and auto-generated insights.
 *
 * Export: calculateROIMetrics(userId, periodDays)
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'roiEngine', event, ...data, ts: new Date().toISOString() }))

// ============================================
// Subscription costs (EUR/month) by plan
// ============================================

const PLAN_COSTS = {
  starter: 97,
  essentiel: 97,
  pro: 297,
  business: 697,
  enterprise: 697,
}

// ============================================
// Lead statuses considered at each funnel step
// ============================================

const STATUS_REPLIED = ['replied', 'interested', 'meeting', 'devis', 'converted', 'client']
const STATUS_INTERESTED = ['interested', 'meeting', 'devis', 'converted', 'client']
const STATUS_MEETING = ['meeting', 'devis', 'converted', 'client']
const STATUS_DEVIS = ['devis', 'converted', 'client']

// ============================================
// Main export
// ============================================

/**
 * Calculate full ROI metrics for a given user over periodDays.
 *
 * @param {string} userId  - Firebase Auth uid
 * @param {number} periodDays - Number of days to look back (default 30)
 * @returns {object} ROI metrics payload
 */
export async function calculateROIMetrics(userId, periodDays = 30) {
  const db = getDb()

  // ---- date boundaries ----
  const now = new Date()
  const periodStart = new Date(now.getTime() - periodDays * 86_400_000)
  const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 86_400_000)

  const tsNow = Timestamp.fromDate(now)
  const tsPeriodStart = Timestamp.fromDate(periodStart)
  const tsPrevStart = Timestamp.fromDate(prevPeriodStart)

  // ---- load user doc ----
  const userSnap = await db.collection('users').doc(userId).get()
  const userData = userSnap.exists ? userSnap.data() : {}
  const plan = userData.subscription?.plan || 'starter'
  const avgLeadValue = userData.avgLeadValue ?? 500
  const subscriptionCost = PLAN_COSTS[plan] ?? PLAN_COSTS.starter

  // ---- query current-period leads ----
  const currentLeadsSnap = await db
    .collection('intentLeadsPro')
    .where('userId', '==', userId)
    .where('contactedAt', '>=', tsPeriodStart)
    .where('contactedAt', '<=', tsNow)
    .get()

  const currentLeads = currentLeadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // ---- query previous-period leads (for growth) ----
  const prevLeadsSnap = await db
    .collection('intentLeadsPro')
    .where('userId', '==', userId)
    .where('contactedAt', '>=', tsPrevStart)
    .where('contactedAt', '<', tsPeriodStart)
    .get()

  const prevLeads = prevLeadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // ---- query campaigns for the period ----
  const campaignsSnap = await db
    .collection('campaigns')
    .where('userId', '==', userId)
    .where('createdAt', '>=', tsPeriodStart)
    .where('createdAt', '<=', tsNow)
    .get()

  const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // ---- funnel counters ----
  const totalContacted = currentLeads.length
  const replied = currentLeads.filter((l) => STATUS_REPLIED.includes(l.status)).length
  const interested = currentLeads.filter((l) => STATUS_INTERESTED.includes(l.status)).length
  const meetings = currentLeads.filter((l) => STATUS_MEETING.includes(l.status)).length
  const devis = currentLeads.filter((l) => STATUS_DEVIS.includes(l.status)).length

  const replyRate = totalContacted > 0 ? Math.round((replied / totalContacted) * 1000) / 10 : 0
  const conversionRate = totalContacted > 0 ? Math.round((meetings / totalContacted) * 1000) / 10 : 0

  // ---- channel breakdown ----
  const channelBreakdown = buildChannelBreakdown(currentLeads)

  // ---- top 5 sources ----
  const topSources = buildTopSources(currentLeads, 5)

  // ---- day-of-week breakdown ----
  const dayOfWeekBreakdown = buildDayOfWeekBreakdown(currentLeads)

  // ---- hour breakdown ----
  const hourBreakdown = buildHourBreakdown(currentLeads)

  // ---- pipeline value ----
  const pipelineValue = meetings * avgLeadValue
  const projectedRevenue = devis * avgLeadValue

  // ---- ROI ----
  const roi = subscriptionCost > 0
    ? Math.round(((pipelineValue - subscriptionCost) / subscriptionCost) * 100)
    : 0

  // ---- growth vs previous period ----
  const growth = buildGrowth(currentLeads, prevLeads)

  // ---- auto-generated insights ----
  const insights = generateInsights({
    totalContacted,
    replied,
    interested,
    meetings,
    devis,
    replyRate,
    conversionRate,
    channelBreakdown,
    topSources,
    pipelineValue,
    roi,
    subscriptionCost,
    growth,
    campaigns,
  })

  log('calculated', { userId, periodDays, totalContacted, replied, meetings, roi })

  return {
    period: {
      days: periodDays,
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    funnel: {
      totalContacted,
      replied,
      interested,
      meetings,
      devis,
      replyRate,
      conversionRate,
    },
    channelBreakdown,
    topSources,
    dayOfWeekBreakdown,
    hourBreakdown,
    financial: {
      avgLeadValue,
      pipelineValue,
      projectedRevenue,
      subscriptionCost,
      plan,
      roi,
    },
    growth,
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
    },
    insights,
    generatedAt: now.toISOString(),
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Build per-channel stats: { whatsapp: { contacted, replied, ... }, email: ... }
 */
function buildChannelBreakdown(leads) {
  const channels = {}
  const TRACKED = ['whatsapp', 'email', 'sms', 'voice', 'instagram', 'linkedin', 'postal']

  for (const lead of leads) {
    const ch = (lead.channel || 'email').toLowerCase()
    const key = TRACKED.includes(ch) ? ch : 'other'
    if (!channels[key]) {
      channels[key] = { contacted: 0, replied: 0, interested: 0, meetings: 0, devis: 0 }
    }
    channels[key].contacted += 1
    if (STATUS_REPLIED.includes(lead.status)) channels[key].replied += 1
    if (STATUS_INTERESTED.includes(lead.status)) channels[key].interested += 1
    if (STATUS_MEETING.includes(lead.status)) channels[key].meetings += 1
    if (STATUS_DEVIS.includes(lead.status)) channels[key].devis += 1
  }

  // Add reply rate per channel
  for (const key of Object.keys(channels)) {
    const c = channels[key]
    c.replyRate = c.contacted > 0 ? Math.round((c.replied / c.contacted) * 1000) / 10 : 0
  }

  return channels
}

/**
 * Top N sources by contacted count
 */
function buildTopSources(leads, limit = 5) {
  const counts = {}
  for (const lead of leads) {
    const src = lead.source || 'unknown'
    if (!counts[src]) counts[src] = { source: src, contacted: 0, replied: 0, meetings: 0 }
    counts[src].contacted += 1
    if (STATUS_REPLIED.includes(lead.status)) counts[src].replied += 1
    if (STATUS_MEETING.includes(lead.status)) counts[src].meetings += 1
  }

  return Object.values(counts)
    .sort((a, b) => b.contacted - a.contacted)
    .slice(0, limit)
    .map((s) => ({
      ...s,
      replyRate: s.contacted > 0 ? Math.round((s.replied / s.contacted) * 1000) / 10 : 0,
    }))
}

/**
 * Breakdown by day of week (0=Sunday .. 6=Saturday)
 */
function buildDayOfWeekBreakdown(leads) {
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const buckets = DAYS.map((name, index) => ({ day: index, name, contacted: 0, replied: 0 }))

  for (const lead of leads) {
    const date = toDate(lead.contactedAt)
    if (!date) continue
    const dow = date.getDay()
    buckets[dow].contacted += 1
    if (STATUS_REPLIED.includes(lead.status)) buckets[dow].replied += 1
  }

  return buckets
}

/**
 * Breakdown by hour (0-23)
 */
function buildHourBreakdown(leads) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, contacted: 0, replied: 0 }))

  for (const lead of leads) {
    const date = toDate(lead.contactedAt)
    if (!date) continue
    const h = date.getHours()
    buckets[h].contacted += 1
    if (STATUS_REPLIED.includes(lead.status)) buckets[h].replied += 1
  }

  return buckets
}

/**
 * Growth percentages vs previous period
 */
function buildGrowth(currentLeads, prevLeads) {
  const curr = {
    contacted: currentLeads.length,
    replied: currentLeads.filter((l) => STATUS_REPLIED.includes(l.status)).length,
    meetings: currentLeads.filter((l) => STATUS_MEETING.includes(l.status)).length,
  }
  const prev = {
    contacted: prevLeads.length,
    replied: prevLeads.filter((l) => STATUS_REPLIED.includes(l.status)).length,
    meetings: prevLeads.filter((l) => STATUS_MEETING.includes(l.status)).length,
  }

  const pct = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 100) : c > 0 ? 100 : 0)

  return {
    contactedGrowth: pct(curr.contacted, prev.contacted),
    repliedGrowth: pct(curr.replied, prev.replied),
    meetingsGrowth: pct(curr.meetings, prev.meetings),
    previous: prev,
    current: curr,
  }
}

/**
 * Auto-generate insights array: { type, message }
 * Types: success | warning | action | info
 */
function generateInsights(data) {
  const insights = []

  // --- Success insights ---
  if (data.replyRate >= 15) {
    insights.push({
      type: 'success',
      message: `Taux de reponse excellent : ${data.replyRate}% (moyenne secteur ~5-8%)`,
    })
  }
  if (data.roi > 200) {
    insights.push({
      type: 'success',
      message: `ROI de ${data.roi}% — votre investissement est largement rentabilise`,
    })
  }
  if (data.growth.contactedGrowth > 20) {
    insights.push({
      type: 'success',
      message: `Volume en hausse de ${data.growth.contactedGrowth}% vs periode precedente`,
    })
  }
  if (data.meetings > 0 && data.conversionRate >= 5) {
    insights.push({
      type: 'success',
      message: `${data.meetings} RDV obtenus avec un taux de conversion de ${data.conversionRate}%`,
    })
  }

  // --- Warning insights ---
  if (data.replyRate > 0 && data.replyRate < 3) {
    insights.push({
      type: 'warning',
      message: `Taux de reponse faible (${data.replyRate}%). Verifiez vos messages et votre ciblage.`,
    })
  }
  if (data.roi < 0) {
    insights.push({
      type: 'warning',
      message: `ROI negatif (${data.roi}%). Votre abonnement coute ${data.subscriptionCost} EUR mais le pipeline genere ne couvre pas encore ce montant.`,
    })
  }
  if (data.growth.contactedGrowth < -20) {
    insights.push({
      type: 'warning',
      message: `Volume en baisse de ${Math.abs(data.growth.contactedGrowth)}% vs periode precedente`,
    })
  }

  // --- Action insights ---
  const bestChannel = findBestChannel(data.channelBreakdown)
  if (bestChannel) {
    insights.push({
      type: 'action',
      message: `Le canal "${bestChannel.name}" a le meilleur taux de reponse (${bestChannel.replyRate}%). Augmentez le budget sur ce canal.`,
    })
  }

  if (data.topSources.length > 0) {
    const bestSource = data.topSources[0]
    insights.push({
      type: 'action',
      message: `Source la plus performante : "${bestSource.source}" (${bestSource.contacted} contacts, ${bestSource.replyRate}% reponse)`,
    })
  }

  if (data.totalContacted > 0 && data.meetings === 0) {
    insights.push({
      type: 'action',
      message: `${data.totalContacted} prospects contactes mais aucun RDV. Revoyez votre sequence de relance.`,
    })
  }

  if (data.campaigns.total === 0) {
    insights.push({
      type: 'action',
      message: 'Aucune campagne lancee sur cette periode. Creez votre premiere campagne pour demarrer.',
    })
  }

  // --- Info insights ---
  insights.push({
    type: 'info',
    message: `${data.totalContacted} prospects contactes, ${data.replied} reponses, ${data.meetings} RDV sur ${data.funnel?.periodDays || 30} jours`,
  })

  if (data.pipelineValue > 0) {
    insights.push({
      type: 'info',
      message: `Valeur pipeline estimee : ${data.pipelineValue.toLocaleString('fr-FR')} EUR (basee sur ${data.meetings} RDV x ${data.financial?.avgLeadValue || 500} EUR)`,
    })
  }

  return insights
}

/**
 * Find channel with highest reply rate (min 3 contacts to be significant)
 */
function findBestChannel(channelBreakdown) {
  let best = null
  for (const [name, stats] of Object.entries(channelBreakdown)) {
    if (stats.contacted < 3) continue
    if (!best || stats.replyRate > best.replyRate) {
      best = { name, ...stats }
    }
  }
  return best
}

/**
 * Convert Firestore Timestamp or Date or millis to JS Date
 */
function toDate(val) {
  if (!val) return null
  if (val.toDate) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'number') return new Date(val)
  if (typeof val === 'string') return new Date(val)
  return null
}
