/**
 * Sunset Policy Engine — Nettoie les prospects inactifs
 *
 * Scheduled weekly (dimanche 4h) :
 * - Prospect sans interaction (open, click, reply) depuis 60 jours → status 'sunset'
 * - Retire de toutes les sequences actives
 * - Log dans sunsetLog
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const SUNSET_DAYS = 60
const BATCH_SIZE = 100

// ============================================
// SCHEDULED — weeklySunsetCleanup
// ============================================

export const weeklySunsetCleanup = onSchedule({
  schedule: 'every sunday 04:00',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  console.log('[Sunset] Demarrage nettoyage hebdomadaire...')
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()

  let totalSunset = 0

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id
    try {
      const count = await sunsetOrgProspects(db, orgId)
      totalSunset += count
    } catch (err) {
      console.error(`[Sunset] Erreur org ${orgId}:`, err.message)
    }
  }

  console.log(`[Sunset] Termine. ${totalSunset} prospects mis en sunset.`)
})

// ============================================
// CORE — sunsetOrgProspects
// ============================================

async function sunsetOrgProspects(db, orgId) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - SUNSET_DAYS)
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate)

  // Prospects actifs (ni sunset, ni converted, ni replied)
  const prospectsSnap = await db.collection(`organizations/${orgId}/prospects`)
    .where('status', 'in', ['new', 'contacted', 'sequence_active'])
    .limit(500)
    .get()

  let sunsetCount = 0
  const batch = db.batch()
  let batchCount = 0

  for (const doc of prospectsSnap.docs) {
    const data = doc.data()

    // Verifier la derniere interaction
    const lastActivity = data.lastInteractionAt || data.lastOpenAt || data.lastClickAt ||
      data.lastReplyAt || data.contactedAt || data.createdAt

    if (!lastActivity) {
      // Pas d'activite du tout — sunset si cree il y a plus de 60j
      const createdAt = data.createdAt?.toDate?.() || new Date(0)
      if (createdAt < cutoffDate) {
        batch.update(doc.ref, {
          status: 'sunset',
          sunsetAt: FieldValue.serverTimestamp(),
          sunsetReason: 'no_activity_60d',
          previousStatus: data.status,
        })
        batchCount++
        sunsetCount++
      }
    } else {
      const activityDate = lastActivity.toDate ? lastActivity.toDate() : new Date(lastActivity)
      if (activityDate < cutoffDate) {
        batch.update(doc.ref, {
          status: 'sunset',
          sunsetAt: FieldValue.serverTimestamp(),
          sunsetReason: 'inactive_60d',
          previousStatus: data.status,
        })
        batchCount++
        sunsetCount++
      }
    }

    // Commit par batch
    if (batchCount >= BATCH_SIZE) {
      await batch.commit()
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
  }

  // Log
  if (sunsetCount > 0) {
    await db.collection(`organizations/${orgId}/sunsetLog`).add({
      date: FieldValue.serverTimestamp(),
      count: sunsetCount,
      cutoffDays: SUNSET_DAYS,
    })
  }

  return sunsetCount
}

// ============================================
// CALLABLE — manualSunsetProspect
// ============================================

export const manualSunsetProspect = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId, prospectId, reactivate } = request.data || {}
  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  }

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const prospectRef = db.doc(`organizations/${orgId}/prospects/${prospectId}`)
  const prospectDoc = await prospectRef.get()

  if (!prospectDoc.exists) {
    throw new HttpsError('not-found', 'Prospect non trouve')
  }

  const data = prospectDoc.data()

  if (reactivate) {
    // Reactivation
    if (data.status !== 'sunset') {
      throw new HttpsError('failed-precondition', 'Prospect non en sunset')
    }
    await prospectRef.update({
      status: data.previousStatus || 'new',
      sunsetAt: FieldValue.delete(),
      sunsetReason: FieldValue.delete(),
      reactivatedAt: FieldValue.serverTimestamp(),
    })
    return { status: 'reactivated', prospectId }
  }

  // Sunset manuel
  await prospectRef.update({
    status: 'sunset',
    sunsetAt: FieldValue.serverTimestamp(),
    sunsetReason: 'manual',
    previousStatus: data.status,
  })

  return { status: 'sunset', prospectId }
})

// ============================================
// CALLABLE — getSunsetStats
// ============================================

export const getSunsetStats = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  const [sunsetSnap, logSnap] = await Promise.all([
    db.collection(`organizations/${orgId}/prospects`)
      .where('status', '==', 'sunset')
      .count()
      .get(),
    db.collection(`organizations/${orgId}/sunsetLog`)
      .orderBy('date', 'desc')
      .limit(10)
      .get(),
  ])

  return {
    totalSunset: sunsetSnap.data().count,
    recentCleanups: logSnap.docs.map(d => ({
      date: d.data().date?.toDate?.()?.toISOString() || null,
      count: d.data().count,
    })),
    cutoffDays: SUNSET_DAYS,
  }
})
