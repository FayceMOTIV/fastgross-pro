/**
 * Source Monitor — Dashboard & health monitoring for lead sources
 *
 * Provides:
 * - getProspectingDashboard: Global stats + per-source breakdown
 * - getSourceHealthStatus: Health status of each source
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { SOURCE_REGISTRY, SOURCE_GROUPS } from '../sources/_sourceRegistry.js'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

/**
 * Get comprehensive prospecting dashboard data
 */
export const getProspectingDashboard = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const orgRef = db.collection('organizations').doc(orgId)

    // ═══ Pipeline funnel counts ═══
    const statuses = ['collected', 'normalized', 'deduped', 'enriched', 'scored', 'promoted', 'rejected', 'duplicate']
    const funnel = {}

    for (const status of statuses) {
      const snap = await orgRef.collection('rawLeads')
        .where('pipeline.status', '==', status)
        .count().get()
      funnel[status] = snap.data().count
    }

    // ═══ Per-source stats (last 30 days) ═══
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const runsSnapshot = await orgRef
      .collection('sourceRuns')
      .where('startedAt', '>', thirtyDaysAgo)
      .orderBy('startedAt', 'desc')
      .get()

    const sourceBreakdown = {}
    const dailyTotals = {}

    for (const doc of runsSnapshot.docs) {
      const run = doc.data()
      const sid = run.sourceId

      if (!sourceBreakdown[sid]) {
        sourceBreakdown[sid] = {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          totalCollected: 0,
          totalPromoted: 0,
          lastRunAt: null,
          lastStatus: null,
          group: SOURCE_REGISTRY[sid]?.group || 'unknown',
        }
      }

      const s = sourceBreakdown[sid]
      s.totalRuns++
      if (run.status === 'completed') s.successfulRuns++
      if (run.status === 'failed') s.failedRuns++
      s.totalCollected += run.stats?.collected || 0
      s.totalPromoted += run.stats?.promoted || 0

      if (!s.lastRunAt) {
        s.lastRunAt = run.startedAt
        s.lastStatus = run.status
      }

      // Daily aggregation
      const date = run.startedAt?.toDate?.()
        ? run.startedAt.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      if (!dailyTotals[date]) {
        dailyTotals[date] = { collected: 0, promoted: 0, sources: {} }
      }
      dailyTotals[date].collected += run.stats?.collected || 0
      dailyTotals[date].promoted += run.stats?.promoted || 0
      dailyTotals[date].sources[sid] = (dailyTotals[date].sources[sid] || 0) + (run.stats?.collected || 0)
    }

    // ═══ Group totals ═══
    const groupTotals = {}
    for (const [sid, stats] of Object.entries(sourceBreakdown)) {
      const group = stats.group
      if (!groupTotals[group]) {
        groupTotals[group] = { collected: 0, promoted: 0, sources: 0 }
      }
      groupTotals[group].collected += stats.totalCollected
      groupTotals[group].promoted += stats.totalPromoted
      groupTotals[group].sources++
    }

    // ═══ KPIs ═══
    const totalCollected = Object.values(sourceBreakdown).reduce((s, v) => s + v.totalCollected, 0)
    const totalPromoted = Object.values(sourceBreakdown).reduce((s, v) => s + v.totalPromoted, 0)
    const conversionRate = totalCollected > 0 ? Math.round((totalPromoted / totalCollected) * 100) : 0
    const costPerLead = totalPromoted > 0 ? (totalPromoted * 0.001).toFixed(2) : '0.00'

    return {
      success: true,
      kpis: {
        totalCollected,
        totalPromoted,
        conversionRate,
        estimatedCostPerLead: costPerLead,
        activeSources: Object.keys(sourceBreakdown).length,
      },
      funnel,
      sourceBreakdown,
      groupTotals,
      dailyTotals: Object.entries(dailyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, data]) => ({ date, ...data })),
    }
  }
)

// ─── SOURCE HEALTH ──────────────────────────────────────────────────────────

/**
 * Get health status for each source
 */
export const getSourceHealthStatus = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const orgRef = db.collection('organizations').doc(orgId)

    const healthStatuses = {}

    for (const [sourceId, entry] of Object.entries(SOURCE_REGISTRY)) {
      if (entry.phase > 1) continue

      // Get last 5 runs for this source
      const runsSnapshot = await orgRef
        .collection('sourceRuns')
        .where('sourceId', '==', sourceId)
        .orderBy('startedAt', 'desc')
        .limit(5)
        .get()

      const runs = runsSnapshot.docs.map(d => d.data())
      const lastRun = runs[0] || null
      const recentFailures = runs.filter(r => r.status === 'failed').length

      let health = 'healthy'
      if (runs.length === 0) health = 'never_run'
      else if (recentFailures >= 3) health = 'critical'
      else if (recentFailures >= 1) health = 'degraded'
      else if (lastRun?.status === 'failed') health = 'degraded'

      // Check if API key available
      const hasApiKey = entry.requiresApiKey ? !!process.env[entry.requiresApiKey] : true

      healthStatuses[sourceId] = {
        health,
        hasApiKey,
        lastRunAt: lastRun?.startedAt || null,
        lastStatus: lastRun?.status || null,
        lastCollected: lastRun?.stats?.collected || 0,
        recentFailureRate: runs.length > 0 ? Math.round((recentFailures / runs.length) * 100) : 0,
        group: entry.group,
        frequency: entry.frequency,
        estimatedLeadsPerMonth: entry.estimatedLeadsPerMonth,
      }
    }

    return { success: true, healthStatuses }
  }
)
