/**
 * Source Orchestrator — Single scheduled function that dispatches all 22 sources
 *
 * Runs every 2 hours. For each org with prospecting enabled:
 * 1. Check which sources are due for execution
 * 2. Light sources (< 100 expected leads) → execute inline
 * 3. Heavy sources → enqueue to Cloud Tasks fmf-prospecting queue
 * 4. After collection → enqueue pipeline processing
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { getEnabledSources, isDueForRun, SOURCE_REGISTRY } from '../sources/_sourceRegistry.js'
import { getProspectingConfig } from './sourceConfig.js'
import { enqueueTask } from '../../queues/taskQueue.js'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── SCHEDULED: Every 2 hours ───────────────────────────────────────────────

export const sourceOrchestrator = onSchedule(
  {
    schedule: 'every 2 hours',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    logger.info('[sourceOrchestrator] Starting scheduled run')
    await runOrchestrator()
  }
)

// ─── MAIN ORCHESTRATOR LOGIC ────────────────────────────────────────────────

async function runOrchestrator() {
  const db = getDb()
  const startTime = Date.now()

  const globalStats = {
    orgsProcessed: 0,
    orgsSkipped: 0,
    sourcesTriggered: 0,
    sourcesInline: 0,
    sourcesQueued: 0,
    errors: 0,
  }

  // Get all orgs with prospecting enabled
  const orgsSnapshot = await db
    .collection('organizations')
    .where('prospectionEnabled', '==', true)
    .get()

  if (orgsSnapshot.empty) {
    logger.info('[sourceOrchestrator] No orgs with prospecting enabled')
    return globalStats
  }

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id

    try {
      const orgStats = await processOrg(orgId)
      globalStats.orgsProcessed++
      globalStats.sourcesTriggered += orgStats.triggered
      globalStats.sourcesInline += orgStats.inline
      globalStats.sourcesQueued += orgStats.queued
    } catch (error) {
      logger.error(`[sourceOrchestrator] Error processing org ${orgId}:`, error)
      globalStats.errors++
      globalStats.orgsSkipped++
    }
  }

  const duration = Date.now() - startTime
  logger.info(`[sourceOrchestrator] Completed in ${duration}ms:`, globalStats)

  return globalStats
}

async function processOrg(orgId) {
  const db = getDb()
  const config = await getProspectingConfig(orgId)

  if (!config.enabled) {
    return { triggered: 0, inline: 0, queued: 0 }
  }

  const stats = { triggered: 0, inline: 0, queued: 0 }
  const enabledSources = getEnabledSources(config)

  for (const { sourceId, config: sourceConfig, registryEntry } of enabledSources) {
    // Check if API key is available
    if (registryEntry.requiresApiKey && !process.env[registryEntry.requiresApiKey]) {
      continue
    }

    // Check if due for run
    const lastRun = await getLastRunTime(orgId, sourceId)
    if (!isDueForRun(sourceId, lastRun, registryEntry.frequency)) {
      continue
    }

    stats.triggered++

    // Light source (< 100 expected) → inline execution
    if (registryEntry.estimatedLeadsPerRun < 100) {
      try {
        await executeSourceInline(orgId, sourceId, sourceConfig)
        stats.inline++
      } catch (error) {
        logger.error(`[sourceOrchestrator] Inline source ${sourceId} failed:`, error)
      }
    } else {
      // Heavy source → Cloud Tasks
      try {
        await enqueueTask('prospecting', {
          action: 'collectSource',
          orgId,
          sourceId,
          config: sourceConfig,
        })
        stats.queued++
      } catch (error) {
        logger.error(`[sourceOrchestrator] Failed to enqueue source ${sourceId}:`, error)
      }
    }
  }

  // Enqueue pipeline processing if any sources were triggered
  if (stats.triggered > 0) {
    try {
      await enqueueTask('prospecting', {
        action: 'processPipeline',
        orgId,
        batchSize: 100,
      }, { delaySeconds: 300 })  // 5min delay to let sources finish
    } catch (error) {
      logger.error(`[sourceOrchestrator] Failed to enqueue pipeline processing:`, error)
    }
  }

  return stats
}

// ─── INLINE SOURCE EXECUTION ────────────────────────────────────────────────

async function executeSourceInline(orgId, sourceId, sourceConfig) {
  const registryEntry = SOURCE_REGISTRY[sourceId]
  if (!registryEntry) {
    throw new Error(`Unknown source: ${sourceId}`)
  }

  logger.info(`[sourceOrchestrator] Executing inline: ${sourceId} for org ${orgId}`)

  const module = await registryEntry.module()
  const { collect } = module

  if (typeof collect !== 'function') {
    throw new Error(`Source ${sourceId} does not export a collect() function`)
  }

  const result = await collect(orgId, sourceConfig)

  logger.info(`[sourceOrchestrator] Inline ${sourceId}: collected ${result?.leads?.length || 0} leads`)
  return result
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function getLastRunTime(orgId, sourceId) {
  const db = getDb()
  const snapshot = await db
    .collection('organizations').doc(orgId)
    .collection('sourceRuns')
    .where('sourceId', '==', sourceId)
    .where('status', 'in', ['completed', 'running'])
    .orderBy('startedAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const data = snapshot.docs[0].data()
  return data.startedAt?.toDate?.() || data.startedAt || null
}

// ─── CALLABLE: Manual Source Trigger ────────────────────────────────────────

export const runSourceManual = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, sourceId } = request.data
    if (!orgId || !sourceId) {
      throw new HttpsError('invalid-argument', 'orgId and sourceId are required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const registryEntry = SOURCE_REGISTRY[sourceId]
    if (!registryEntry) {
      throw new HttpsError('invalid-argument', `Unknown source: ${sourceId}`)
    }

    logger.info(`[sourceOrchestrator] Manual trigger: ${sourceId} for org ${orgId}`)

    const config = await getProspectingConfig(orgId)
    const sourceConfig = config.sources?.[sourceId]?.config || registryEntry.defaultConfig

    try {
      const result = await executeSourceInline(orgId, sourceId, sourceConfig)

      // Also enqueue pipeline processing
      await enqueueTask('prospecting', {
        action: 'processPipeline',
        orgId,
        batchSize: 100,
      }, { delaySeconds: 30 })

      return { success: true, result }
    } catch (error) {
      logger.error(`[sourceOrchestrator] Manual trigger failed:`, error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ─── CALLABLE: Source Stats ─────────────────────────────────────────────────

export const getSourceStats = onCall(
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

    // Aggregate stats per source
    const runsSnapshot = await orgRef
      .collection('sourceRuns')
      .orderBy('startedAt', 'desc')
      .limit(100)
      .get()

    const sourceStats = {}
    for (const doc of runsSnapshot.docs) {
      const run = doc.data()
      const sid = run.sourceId

      if (!sourceStats[sid]) {
        sourceStats[sid] = {
          totalRuns: 0,
          totalCollected: 0,
          totalPromoted: 0,
          lastRunAt: null,
          lastStatus: null,
          avgLeadsPerRun: 0,
          errors: 0,
        }
      }

      const s = sourceStats[sid]
      s.totalRuns++
      s.totalCollected += run.stats?.collected || 0
      s.totalPromoted += run.stats?.promoted || 0
      if (run.status === 'failed') s.errors++
      if (!s.lastRunAt) {
        s.lastRunAt = run.startedAt
        s.lastStatus = run.status
      }
    }

    // Calculate averages
    for (const s of Object.values(sourceStats)) {
      s.avgLeadsPerRun = s.totalRuns > 0 ? Math.round(s.totalCollected / s.totalRuns) : 0
    }

    // Global totals
    const rawLeadsCount = await orgRef.collection('rawLeads').count().get()
    const prospectsCount = await orgRef.collection('prospects').count().get()

    return {
      success: true,
      sourceStats,
      totals: {
        rawLeads: rawLeadsCount.data().count,
        prospects: prospectsCount.data().count,
        totalSources: Object.keys(sourceStats).length,
      },
    }
  }
)
