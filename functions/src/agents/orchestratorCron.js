/**
 * Orchestrator Cron — Cloud Function scheduled handler
 *
 * Remplace le `setInterval(scanAllProspects, 30 * 60 * 1000)` de BullMQ.
 * S'execute toutes les 30 minutes via Cloud Scheduler.
 *
 * Pour chaque org avec prospectionEnabled=true :
 *   1. Verifie business hours
 *   2. Recupere prospects eligibles (in_sequence, qualified)
 *   3. Enqueue chaque prospect dans la queue orchestrator via Cloud Tasks
 *
 * Ce cron alimente l'orchestratorAgent qui decide ensuite l'action
 * par prospect via orchestratorEngine.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { enqueueTask } from '../queues/taskQueue.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// Statuts prospect eligibles pour l'orchestrateur
const ELIGIBLE_STATUSES = ['in_sequence', 'qualified', 'new']

// Max prospects par org par cycle (evite surcharge)
const MAX_PROSPECTS_PER_ORG = 100

// ─── BUSINESS HOURS CHECK ──────────────────────────────────────────────────

function isWithinBusinessHours(timezone = 'Europe/Paris', customHours = {}) {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    })
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const weekday = parts.find(p => p.type === 'weekday')?.value

    // Pas d'envoi le weekend
    if (['Sat', 'Sun'].includes(weekday)) return false

    const start = customHours.start || 8
    const end = customHours.end || 20
    return hour >= start && hour < end
  } catch {
    // Timezone invalide — default OK
    return true
  }
}

// ─── SCAN SINGLE ORG ───────────────────────────────────────────────────────

async function scanOrgProspects(db, orgId, orgConfig) {
  const stats = { scanned: 0, enqueued: 0, skipped: 0, errors: 0 }

  // Business hours check
  if (!isWithinBusinessHours(orgConfig.timezone, orgConfig.businessHours)) {
    logger.info(`[orchestratorCron] Org ${orgId}: outside business hours, skipping`)
    return { ...stats, skippedReason: 'outside_business_hours' }
  }

  // Query prospects eligibles
  const prospectsQuery = db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('engagement.status', 'in', ELIGIBLE_STATUSES)
    .limit(MAX_PROSPECTS_PER_ORG)

  let prospectsSnap
  try {
    prospectsSnap = await prospectsQuery.get()
  } catch {
    // Si le champ engagement.status n'existe pas, fallback sans filtre
    const fallbackQuery = db
      .collection('organizations').doc(orgId)
      .collection('prospects')
      .limit(MAX_PROSPECTS_PER_ORG)

    prospectsSnap = await fallbackQuery.get()
  }

  if (prospectsSnap.empty) {
    logger.info(`[orchestratorCron] Org ${orgId}: no eligible prospects`)
    return stats
  }

  stats.scanned = prospectsSnap.size

  // Enqueue chaque prospect dans la queue orchestrator
  for (const doc of prospectsSnap.docs) {
    const prospect = doc.data()

    // Skip si deja repondu ou sequence terminee
    if (prospect.engagement?.whatsappRepliedAt ||
        prospect.engagement?.emailRepliedAt ||
        prospect.engagement?.instagramRepliedAt) {
      stats.skipped++
      continue
    }

    // Skip si sequence terminee (> 14 jours et touchpoints >= 5)
    const start = prospect.engagement?.sequenceStartAt || prospect.createdAt
    if (start) {
      const daysSinceStart = Math.floor((Date.now() - new Date(start).getTime()) / (24 * 60 * 60 * 1000))
      const touchpoints = prospect.engagement?.touchpoints || 0
      if (daysSinceStart > 14 && touchpoints >= 5) {
        stats.skipped++
        continue
      }
    }

    try {
      const taskId = `orch-${orgId}-${doc.id}-${Date.now()}`
      await enqueueTask('orchestrator', {
        orgId,
        prospectId: doc.id,
        trigger: 'cron',
      }, { taskId })

      stats.enqueued++
    } catch (error) {
      stats.errors++
      logger.warn(`[orchestratorCron] Failed to enqueue prospect ${doc.id}:`, error.message)
    }
  }

  return stats
}

// ─── MAIN CRON FUNCTION ────────────────────────────────────────────────────

export const orchestratorCron = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    timeoutSeconds: 540,  // 9 min max
    memory: '512MiB',
  },
  async () => {
    const startTime = Date.now()
    logger.info('[orchestratorCron] Starting scan cycle')

    const db = getDb()
    const totalStats = { orgsScanned: 0, orgsSkipped: 0, totalEnqueued: 0, totalErrors: 0 }

    try {
      // Recuperer toutes les orgs avec prospection active
      const orgsSnap = await db
        .collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      if (orgsSnap.empty) {
        logger.info('[orchestratorCron] No orgs with prospection enabled')
        return
      }

      logger.info(`[orchestratorCron] Found ${orgsSnap.size} active orgs`)

      // Traiter les orgs en batches de 5 pour eviter surcharge
      const orgDocs = orgsSnap.docs
      const batchSize = 5

      for (let i = 0; i < orgDocs.length; i += batchSize) {
        const batch = orgDocs.slice(i, i + batchSize)

        const results = await Promise.allSettled(
          batch.map(async (orgDoc) => {
            const orgId = orgDoc.id
            const orgConfig = orgDoc.data()

            try {
              const stats = await scanOrgProspects(db, orgId, orgConfig)
              totalStats.orgsScanned++
              totalStats.totalEnqueued += stats.enqueued
              totalStats.totalErrors += stats.errors

              if (stats.skippedReason) {
                totalStats.orgsSkipped++
              }

              return { orgId, stats }
            } catch (error) {
              totalStats.totalErrors++
              logger.error(`[orchestratorCron] Org ${orgId} failed:`, error)
              return { orgId, error: error.message }
            }
          })
        )

        // Log resultats du batch
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.stats) {
            const { orgId, stats } = result.value
            if (stats.enqueued > 0) {
              logger.info(`[orchestratorCron] Org ${orgId}: enqueued=${stats.enqueued} skipped=${stats.skipped} errors=${stats.errors}`)
            }
          }
        }
      }

      // Logger le run dans orchestratorLogs (premier org pour le log global)
      const duration = Date.now() - startTime
      logger.info(`[orchestratorCron] Cycle complete`, {
        ...totalStats,
        duration,
      })

    } catch (error) {
      logger.error('[orchestratorCron] Fatal error:', error)
      throw error  // Let Cloud Scheduler retry
    }
  }
)

// ─── MANUAL TRIGGER (for testing) ─────────────────────────────────────────

export const runOrchestratorCronManual = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    const { orgId } = request.data || {}
    const db = getDb()

    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    if (orgId) {
      await verifyOrgMembership(request.auth.uid, orgId)
    }

    if (orgId) {
      // Scan une seule org
      const orgDoc = await db.collection('organizations').doc(orgId).get()
      if (!orgDoc.exists) {
        return { error: 'Organization not found' }
      }

      const stats = await scanOrgProspects(db, orgId, orgDoc.data())
      return { orgId, stats }
    }

    // Scan toutes les orgs actives
    const orgsSnap = await db
      .collection('organizations')
      .where('prospectionEnabled', '==', true)
      .get()

    const results = []
    for (const orgDoc of orgsSnap.docs) {
      const stats = await scanOrgProspects(db, orgDoc.id, orgDoc.data())
      results.push({ orgId: orgDoc.id, stats })
    }

    return { orgsProcessed: results.length, results }
  }
)
