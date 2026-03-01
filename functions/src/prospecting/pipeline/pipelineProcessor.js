/**
 * Pipeline Processor — Orchestrates the 5-stage lead processing pipeline
 *
 * Pipeline: normalize → dedup → enrich → score → promote
 *
 * Each stage updates pipeline.status on the rawLead document.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { normalizeLeadsBatch } from './leadNormalizer.js'
import { deduplicateBatch } from './deduplicator.js'
import { scoreLeadsBatch } from './qualityScorer.js'
import { promoteToProspect } from './outreachRouter.js'

const getDb = () => getFirestore()

// ─── BATCH PROCESSOR ────────────────────────────────────────────────────────

/**
 * Process a batch of rawLeads through the full pipeline
 * @param {string} orgId
 * @param {Array<string>} rawLeadIds - IDs of rawLeads to process
 * @returns {Object} Pipeline stats
 */
export async function processBatch(orgId, rawLeadIds) {
  const db = getDb()
  const orgRef = db.collection('organizations').doc(orgId)
  const startTime = Date.now()

  const stats = {
    total: rawLeadIds.length,
    normalized: 0,
    normalizeErrors: 0,
    unique: 0,
    duplicates: 0,
    enriched: 0,
    scored: 0,
    promoted: 0,
    rejected: 0,
    errors: 0,
  }

  logger.info(`[pipelineProcessor] Starting batch: ${rawLeadIds.length} leads for org ${orgId}`)

  // ═══ STAGE 1: Load rawLeads ═══
  const rawLeads = []
  for (const id of rawLeadIds) {
    const doc = await orgRef.collection('rawLeads').doc(id).get()
    if (doc.exists) {
      rawLeads.push({ id: doc.id, ...doc.data() })
    }
  }

  if (rawLeads.length === 0) {
    logger.warn(`[pipelineProcessor] No rawLeads found for batch`)
    return stats
  }

  // ═══ STAGE 2: Normalize ═══
  const { normalized, errors: normalizeErrors } = normalizeLeadsBatch(rawLeads)
  stats.normalized = normalized.length
  stats.normalizeErrors = normalizeErrors.length

  // Update status to 'normalized'
  await updateBatchStatus(orgRef, normalized.map(l => l.rawLeadId), 'normalized')

  if (normalized.length === 0) {
    logger.warn(`[pipelineProcessor] All leads failed normalization`)
    return stats
  }

  // ═══ STAGE 3: Dedup ═══
  const { unique, duplicates, stats: dedupStats } = await deduplicateBatch(orgId, normalized)
  stats.unique = dedupStats.unique
  stats.duplicates = dedupStats.duplicates

  // Update duplicates status
  const duplicateIds = duplicates.map(d => d.rawLeadId).filter(Boolean)
  if (duplicateIds.length > 0) {
    await updateBatchStatus(orgRef, duplicateIds, 'duplicate')
  }

  // Update unique status
  await updateBatchStatus(orgRef, unique.map(l => l.rawLeadId), 'deduped')

  if (unique.length === 0) {
    logger.info(`[pipelineProcessor] All leads are duplicates`)
    return stats
  }

  // ═══ STAGE 4: Enrich (lightweight — full enrichment via waterfall later) ═══
  // For now, mark as enriched — the real enrichment happens via enrichEmail waterfall
  // which is triggered post-promotion
  stats.enriched = unique.length
  await updateBatchStatus(orgRef, unique.map(l => l.rawLeadId), 'enriched')

  // ═══ STAGE 5: Score ═══
  const icpDoc = await orgRef.collection('settings').doc('icp').get()
  const icp = icpDoc.exists ? icpDoc.data() : {}

  const scored = scoreLeadsBatch(unique, icp)
  stats.scored = scored.length

  // Update scores on rawLead docs
  for (const lead of scored) {
    if (lead.rawLeadId) {
      await orgRef.collection('rawLeads').doc(lead.rawLeadId).update({
        'pipeline.score': lead.scoring.score,
        'pipeline.priority': lead.scoring.priority,
        'pipeline.status': 'scored',
      })
    }
  }

  // ═══ STAGE 6: Promote (score >= threshold) ═══
  const configDoc = await orgRef.collection('settings').doc('prospecting').get()
  const prospectingConfig = configDoc.exists ? configDoc.data() : {}
  const minScore = prospectingConfig?.scoring?.minScoreToPromote ?? 40

  const toPromote = scored.filter(l => l.scoring.score >= minScore)
  const toReject = scored.filter(l => l.scoring.score < minScore)

  for (const lead of toPromote) {
    try {
      const prospectId = await promoteToProspect(orgId, lead)
      if (prospectId && lead.rawLeadId) {
        await orgRef.collection('rawLeads').doc(lead.rawLeadId).update({
          'pipeline.status': 'promoted',
          'pipeline.promotedToProspectId': prospectId,
          processedAt: FieldValue.serverTimestamp(),
        })
        stats.promoted++
      }
    } catch (error) {
      logger.error(`[pipelineProcessor] Promotion error:`, error)
      stats.errors++
    }
  }

  // Mark rejected leads
  const rejectedIds = toReject.map(l => l.rawLeadId).filter(Boolean)
  if (rejectedIds.length > 0) {
    await updateBatchStatus(orgRef, rejectedIds, 'rejected')
    stats.rejected = rejectedIds.length
  }

  const duration = Date.now() - startTime
  logger.info(`[pipelineProcessor] Batch complete in ${duration}ms:`, stats)

  return stats
}

// ─── PROCESS UNPROCESSED RAW LEADS ──────────────────────────────────────────

/**
 * Process all unprocessed rawLeads for an org
 * @param {string} orgId
 * @param {number} batchSize - Max leads to process
 * @returns {Object} Pipeline stats
 */
export async function processUnprocessed(orgId, batchSize = 100) {
  const db = getDb()
  const snapshot = await db
    .collection('organizations').doc(orgId)
    .collection('rawLeads')
    .where('pipeline.status', '==', 'collected')
    .orderBy('collectedAt', 'asc')
    .limit(batchSize)
    .get()

  if (snapshot.empty) {
    return { total: 0, message: 'No unprocessed leads' }
  }

  const rawLeadIds = snapshot.docs.map(doc => doc.id)
  return processBatch(orgId, rawLeadIds)
}

// ─── CALLABLE FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Manually trigger pipeline processing
 */
export const runPipelineManual = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, batchSize } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    const stats = await processUnprocessed(orgId, batchSize || 100)
    return { success: true, stats }
  }
)

/**
 * Get pipeline funnel stats
 */
export const getPipelineFunnelStats = onCall(
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

    const db = getDb()
    const orgRef = db.collection('organizations').doc(orgId)

    // Count by pipeline status
    const statuses = ['collected', 'normalized', 'deduped', 'enriched', 'scored', 'promoted', 'rejected', 'duplicate']
    const counts = {}

    for (const status of statuses) {
      const snapshot = await orgRef
        .collection('rawLeads')
        .where('pipeline.status', '==', status)
        .count()
        .get()
      counts[status] = snapshot.data().count
    }

    // Recent source runs
    const runsSnapshot = await orgRef
      .collection('sourceRuns')
      .orderBy('startedAt', 'desc')
      .limit(10)
      .get()

    const recentRuns = runsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return {
      success: true,
      funnel: counts,
      total: Object.values(counts).reduce((sum, c) => sum + c, 0),
      recentRuns,
    }
  }
)

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function updateBatchStatus(orgRef, ids, status) {
  const db = getFirestore()
  const batches = []
  let currentBatch = db.batch()
  let count = 0

  for (const id of ids) {
    if (!id) continue
    currentBatch.update(orgRef.collection('rawLeads').doc(id), { 'pipeline.status': status })
    count++
    if (count % 450 === 0) {
      batches.push(currentBatch)
      currentBatch = db.batch()
    }
  }

  batches.push(currentBatch)

  for (const batch of batches) {
    await batch.commit()
  }
}
