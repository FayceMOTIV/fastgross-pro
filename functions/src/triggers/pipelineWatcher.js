/**
 * Pipeline Watcher — Surveillance et auto-recharge du pipeline de leads
 * Schedule: chaque nuit a 01:00 Europe/Paris
 * Pour chaque org active : verifie le stock de prospects, declenche leadFactory si deficit
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { discoverLeads, countActivePipeline } from '../services/leadFactory.js'

const getDb = () => getFirestore()
const DEFAULT_THRESHOLD = 50

// --- Scheduled Function: Nightly Pipeline Check ---

export const pipelineWatcher = onSchedule(
  {
    schedule: '0 1 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb()
    logger.info('[PipelineWatcher] Starting nightly pipeline check')

    const orgsSnap = await db.collection('organizations')
      .where('prospectionEnabled', '==', true)
      .get()

    if (orgsSnap.empty) {
      logger.info('[PipelineWatcher] No active organizations found')
      return
    }

    const results = []
    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      // Lire le seuil de l'org ou utiliser le defaut
      const threshold = orgData.leadFactory?.threshold || DEFAULT_THRESHOLD
      const autoRefill = orgData.leadFactory?.autoRefill !== false // default true

      if (!autoRefill) {
        logger.info(`[PipelineWatcher] org:${orgId} — auto-refill disabled, skipping`)
        results.push({ orgId, skipped: true, reason: 'auto_refill_disabled' })
        continue
      }

      try {
        const activeCount = await countActivePipeline(orgId)

        logger.info(`[PipelineWatcher] org:${orgId} — ${activeCount}/${threshold} active prospects`)

        if (activeCount >= threshold) {
          results.push({ orgId, activeCount, threshold, refilled: false })
          continue
        }

        // Deficit detecte — lancer le sourcing
        const deficit = threshold - activeCount
        logger.info(`[PipelineWatcher] org:${orgId} — deficit de ${deficit} leads, lancement leadFactory`)

        const factoryResults = await discoverLeads(orgId, deficit)

        // Creer une notification
        await db.collection(`organizations/${orgId}/notifications`).add({
          type: 'pipeline_refill',
          message: `Pipeline recharge : ${factoryResults.saved} nouveaux leads decouverts (${activeCount} → ${activeCount + factoryResults.saved})`,
          priority: 'low',
          createdAt: FieldValue.serverTimestamp(),
          read: false,
          data: {
            previousCount: activeCount,
            newCount: activeCount + factoryResults.saved,
            threshold,
            details: factoryResults,
          },
        })

        results.push({
          orgId,
          activeCount,
          threshold,
          deficit,
          refilled: true,
          saved: factoryResults.saved,
        })
      } catch (error) {
        logger.error(`[PipelineWatcher] Error for org ${orgId}:`, error.message)
        results.push({ orgId, error: error.message })
      }
    }

    // Sauvegarder le log global
    await db.collection('system').doc('pipelineWatcher').set({
      lastRun: FieldValue.serverTimestamp(),
      orgsProcessed: results.length,
      orgsRefilled: results.filter(r => r.refilled).length,
      totalLeadsAdded: results.reduce((sum, r) => sum + (r.saved || 0), 0),
      details: results,
    }, { merge: true })

    logger.info(`[PipelineWatcher] Completed — ${results.length} orgs processed`, {
      refilled: results.filter(r => r.refilled).length,
      totalAdded: results.reduce((sum, r) => sum + (r.saved || 0), 0),
    })
  }
)

// --- Manual Trigger (pour le frontend) ---

export const runPipelineRefill = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    const { orgId, forceCount } = request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    const db = getDb()
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    if (!orgDoc.exists) {
      throw new HttpsError('not-found', 'Organization not found')
    }

    const orgData = orgDoc.data()
    const threshold = orgData.leadFactory?.threshold || DEFAULT_THRESHOLD
    const activeCount = await countActivePipeline(orgId)
    const deficit = forceCount || Math.max(threshold - activeCount, 10)

    logger.info(`[PipelineWatcher] Manual refill for org:${orgId} — ${deficit} leads requested`)

    const results = await discoverLeads(orgId, deficit)

    // Notification
    await db.collection(`organizations/${orgId}/notifications`).add({
      type: 'pipeline_refill',
      message: `Recharge manuelle : ${results.saved} nouveaux leads ajoutes au pipeline`,
      priority: 'low',
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    })

    return {
      success: true,
      activeCount,
      deficit,
      results,
    }
  }
)

// --- Stats du pipeline (pour le frontend) ---

export const getPipelineStats = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    const { orgId } = request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    const db = getDb()

    // Compter par status
    const statusCounts = {}
    const statuses = ['new', 'in_sequence', 'contacted', 'replied', 'converted', 'lost']

    for (const status of statuses) {
      const snap = await db
        .collection(`organizations/${orgId}/prospects`)
        .where('alexStatus', '==', status)
        .count()
        .get()
      statusCounts[status] = snap.data().count
    }

    // Lire les settings
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    const orgData = orgDoc.exists ? orgDoc.data() : {}
    const threshold = orgData.leadFactory?.threshold || DEFAULT_THRESHOLD
    const autoRefill = orgData.leadFactory?.autoRefill !== false

    // Lire les analytics lead_factory
    const analyticsDoc = await db
      .collection(`organizations/${orgId}/analytics`)
      .doc('lead_factory')
      .get()
    const analytics = analyticsDoc.exists ? analyticsDoc.data() : {}

    const activeCount = (statusCounts.new || 0) + (statusCounts.in_sequence || 0) + (statusCounts.contacted || 0)

    return {
      activeCount,
      threshold,
      autoRefill,
      fillPercentage: Math.min(100, Math.round((activeCount / threshold) * 100)),
      statusCounts,
      lastRun: analytics.lastRun || null,
      lastResults: analytics.lastResults || null,
      totalDiscovered: analytics.totalDiscovered || 0,
    }
  }
)

// --- Update Pipeline Settings ---

export const updatePipelineSettings = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    const { orgId, settings } = request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    const db = getDb()
    const validFields = ['threshold', 'autoRefill', 'queries', 'locations', 'minRating', 'minReviews']
    const update = {}

    for (const key of validFields) {
      if (settings?.[key] !== undefined) {
        update[`leadFactory.${key}`] = settings[key]
      }
    }

    if (Object.keys(update).length === 0) {
      throw new HttpsError('invalid-argument', 'No valid settings provided')
    }

    update.updatedAt = FieldValue.serverTimestamp()
    await db.collection('organizations').doc(orgId).update(update)

    return { success: true, updated: Object.keys(update) }
  }
)
