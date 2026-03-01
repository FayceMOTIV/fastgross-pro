/**
 * Prospecting Agent — Cloud Tasks HTTP handler for lead collection & pipeline
 *
 * Pattern identical to emailAgent.js (onRequest, POST, payload JSON).
 * Actions: collectSource, processPipeline, cleanupRawLeads
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { SOURCE_REGISTRY } from '../sources/_sourceRegistry.js'
import { processUnprocessed } from '../pipeline/pipelineProcessor.js'

const getDb = () => getFirestore()

export const prospectingAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const startTime = Date.now()
    const payload = req.body
    const { action, orgId } = payload

    if (!orgId || !action) {
      res.status(400).json({ error: 'Missing required fields: orgId, action' })
      return
    }

    logger.info(`[prospectingAgent] Processing ${action} for org ${orgId}`)

    try {
      let result

      switch (action) {
        case 'collectSource':
          result = await handleCollectSource(payload)
          break

        case 'processPipeline':
          result = await handleProcessPipeline(payload)
          break

        case 'cleanupRawLeads':
          result = await handleCleanupRawLeads(payload)
          break

        default:
          res.status(400).json({ error: `Unknown action: ${action}` })
          return
      }

      const duration = Date.now() - startTime
      logger.info(`[prospectingAgent] ${action} completed in ${duration}ms:`, result)

      res.status(200).json({ success: true, action, duration, ...result })
    } catch (error) {
      logger.error(`[prospectingAgent] Error processing ${action}:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ─── ACTION HANDLERS ────────────────────────────────────────────────────────

async function handleCollectSource({ orgId, sourceId, config }) {
  const registryEntry = SOURCE_REGISTRY[sourceId]
  if (!registryEntry) {
    throw new Error(`Unknown source: ${sourceId}`)
  }

  logger.info(`[prospectingAgent] Collecting from source: ${sourceId}`)

  const module = await registryEntry.module()
  const { collect } = module

  if (typeof collect !== 'function') {
    throw new Error(`Source ${sourceId} does not export collect()`)
  }

  const result = await collect(orgId, config || registryEntry.defaultConfig)

  return {
    sourceId,
    leadsCollected: result?.leads?.length || 0,
    isMock: result?.isMock || false,
  }
}

async function handleProcessPipeline({ orgId, batchSize }) {
  logger.info(`[prospectingAgent] Processing pipeline for org ${orgId}`)

  const stats = await processUnprocessed(orgId, batchSize || 100)

  return { pipelineStats: stats }
}

async function handleCleanupRawLeads({ orgId, ttlDays }) {
  const db = getDb()
  const ttl = ttlDays || 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - ttl)

  logger.info(`[prospectingAgent] Cleaning rawLeads older than ${ttl} days`)

  // Delete promoted/rejected rawLeads older than TTL
  const snapshot = await db
    .collection('organizations').doc(orgId)
    .collection('rawLeads')
    .where('pipeline.status', 'in', ['promoted', 'rejected'])
    .where('collectedAt', '<', cutoff)
    .limit(500)
    .get()

  let deleted = 0
  const batch = db.batch()
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref)
    deleted++
  }

  if (deleted > 0) {
    await batch.commit()
  }

  logger.info(`[prospectingAgent] Cleaned up ${deleted} old rawLeads`)
  return { deleted }
}
