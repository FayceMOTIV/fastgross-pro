/**
 * War Room Stats — Cloud Functions pour le dashboard admin
 *
 * - getWarRoomStats: stats globales cross-org
 * - getWarRoomOrgList: liste des orgs avec status prospection
 * - toggleOrgProspection: activer/desactiver prospection par org
 * - emergencyPauseAll: arret d'urgence global
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ============================================
// GET WAR ROOM STATS (cross-org)
// ============================================
export const getWarRoomStats = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    // Verifier super admin
    await requireSuperAdmin(request.auth.uid)

    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    try {
      // Orgs actives
      const orgsSnap = await db.collection('organizations').where('prospectionEnabled', '==', true).get()
      const activeOrgs = orgsSnap.size

      // Stats globales du jour
      let totalSent = 0
      let totalFailed = 0
      let totalReplies = 0
      const channelStats = {}

      for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id

        // Budget du jour
        const budgetSnap = await db
          .collection('organizations')
          .doc(orgId)
          .collection('dailyBudgets')
          .doc(today)
          .get()

        if (budgetSnap.exists) {
          const budget = budgetSnap.data()
          for (const [channel, count] of Object.entries(budget)) {
            if (channel.endsWith('_sent')) {
              const ch = channel.replace('_sent', '')
              if (!channelStats[ch]) channelStats[ch] = { sent: 0, failed: 0, replies: 0 }
              channelStats[ch].sent += count || 0
              totalSent += count || 0
            }
          }
        }

        // Dernier run
        const lastResults = orgDoc.data().lastOrchestratorResults
        if (lastResults) {
          totalFailed += lastResults.failed || 0
        }

        // Replies du jour
        const repliesSnap = await db
          .collection('organizations')
          .doc(orgId)
          .collection('replyFeeds')
          .where('aggregatedAt', '>=', new Date(today))
          .get()

        totalReplies += repliesSnap.size
      }

      // Alertes actives
      let activeAlerts = 0
      try {
        const alertsSnap = await db
          .collection('channelAlerts')
          .where('resolved', '==', false)
          .get()
        activeAlerts = alertsSnap.size
      } catch {
        // Collection might not exist
      }

      return {
        activeOrgs,
        totalSent,
        totalFailed,
        totalReplies,
        channelStats,
        activeAlerts,
        date: today,
        responseRate: totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : '0',
      }
    } catch (error) {
      logger.error('[getWarRoomStats] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// GET WAR ROOM ORG LIST
// ============================================
export const getWarRoomOrgList = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    await requireSuperAdmin(request.auth.uid)

    const db = getDb()

    try {
      const orgsSnap = await db.collection('organizations').get()

      const orgs = orgsSnap.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || data.companyName || 'Sans nom',
          plan: data.plan || 'starter',
          prospectionEnabled: data.prospectionEnabled || false,
          prospectionState: data.prospectionState || 'idle',
          channels: data.channels || {},
          dailyBudget: data.dailyBudget || { total: 0 },
          lastOrchestratorRun: data.lastOrchestratorRun || null,
          lastOrchestratorResults: data.lastOrchestratorResults || null,
          membersCount: data.membersCount || 0,
        }
      })

      return { orgs }
    } catch (error) {
      logger.error('[getWarRoomOrgList] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// TOGGLE ORG PROSPECTION
// ============================================
export const toggleOrgProspection = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    await requireSuperAdmin(request.auth.uid)

    const { orgId, enabled } = request.data || {}
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()

    try {
      await db.collection('organizations').doc(orgId).update({
        prospectionEnabled: !!enabled,
        prospectionState: enabled ? 'idle' : 'paused',
        [`prospectionToggledAt`]: FieldValue.serverTimestamp(),
        [`prospectionToggledBy`]: request.auth.uid,
      })

      logger.info(`[toggleOrgProspection] org=${orgId} enabled=${enabled} by ${request.auth.uid}`)
      return { success: true, orgId, enabled: !!enabled }
    } catch (error) {
      logger.error('[toggleOrgProspection] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// EMERGENCY PAUSE ALL
// ============================================
export const emergencyPauseAll = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    await requireSuperAdmin(request.auth.uid)

    const db = getDb()
    const reason = request.data?.reason || 'Emergency pause'

    try {
      const orgsSnap = await db.collection('organizations').where('prospectionEnabled', '==', true).get()

      const batch = db.batch()
      let count = 0

      for (const doc of orgsSnap.docs) {
        batch.update(doc.ref, {
          prospectionEnabled: false,
          prospectionState: 'paused',
          emergencyPausedAt: FieldValue.serverTimestamp(),
          emergencyPausedBy: request.auth.uid,
          emergencyPauseReason: reason,
        })
        count++
      }

      await batch.commit()

      // Logger l'evenement
      await db.collection('orchestratorGlobalLogs').add({
        type: 'emergencyPause',
        orgsPaused: count,
        reason,
        pausedBy: request.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      })

      logger.warn(`[emergencyPauseAll] ${count} orgs paused by ${request.auth.uid} — reason: ${reason}`)
      return { success: true, orgsPaused: count }
    } catch (error) {
      logger.error('[emergencyPauseAll] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// HELPER: Verifier super admin
// ============================================
async function requireSuperAdmin(uid) {
  const db = getDb()

  try {
    // Verifier dans la collection superAdmins
    const adminDoc = await db.collection('superAdmins').doc(uid).get()
    if (adminDoc.exists) return true

    // Fallback: verifier le profil utilisateur
    const userDoc = await db.collection('users').doc(uid).get()
    if (userDoc.exists && userDoc.data().isSuperAdmin) return true

    throw new HttpsError('permission-denied', 'Acces super admin requis')
  } catch (error) {
    if (error.code === 'permission-denied') throw error
    throw new HttpsError('permission-denied', 'Acces super admin requis')
  }
}
