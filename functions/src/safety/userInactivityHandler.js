/**
 * User Inactivity Handler — Protege contre le gaspillage quand l'user est absent
 *
 * Scheduled daily a 10h :
 * 1. Call booke + user pas confirme 2h avant → WhatsApp rappel
 * 2. User pas connecte 3 jours + prospects chauds → WhatsApp alerte
 * 3. User pas connecte 7 jours → pause sequences
 * 4. User pas connecte 14 jours → pause complete Alex
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const getDb = () => getFirestore()

const THRESHOLDS = {
  REMINDER_HOURS: 2,        // Rappel call 2h avant
  ALERT_DAYS: 3,            // Alerte prospects chauds
  PAUSE_SEQUENCES_DAYS: 7,  // Pause sequences
  PAUSE_ALEX_DAYS: 14,      // Pause complete
}

// ============================================
// SCHEDULED — userInactivityCheck
// ============================================

export const userInactivityCheck = onSchedule({
  schedule: 'every day 10:00',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  console.log('[Inactivity] Verification quotidienne...')
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()

  const stats = { reminders: 0, alerts: 0, paused: 0, fullPause: 0 }

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id
    const orgData = orgDoc.data()

    try {
      const result = await checkOrgInactivity(db, orgId, orgData)
      stats.reminders += result.reminders
      stats.alerts += result.alerts
      stats.paused += result.paused
      stats.fullPause += result.fullPause
    } catch (err) {
      console.error(`[Inactivity] Erreur org ${orgId}:`, err.message)
    }
  }

  console.log(`[Inactivity] Termine.`, stats)
})

// ============================================
// CORE — checkOrgInactivity
// ============================================

async function checkOrgInactivity(db, orgId, orgData) {
  const result = { reminders: 0, alerts: 0, paused: 0, fullPause: 0 }
  const now = new Date()

  // Determiner la derniere activite de l'org
  const lastActive = orgData.lastActiveAt?.toDate?.() ||
    orgData.lastLoginAt?.toDate?.() ||
    orgData.updatedAt?.toDate?.() ||
    null

  if (!lastActive) return result

  const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24))

  // 1. Rappel calls (2h avant) — check bookings du jour
  try {
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const bookingsSnap = await db.collection(`organizations/${orgId}/pipeline`)
      .where('type', '==', 'booking')
      .where('scheduledAt', '>=', todayStart)
      .where('scheduledAt', '<=', todayEnd)
      .where('status', '==', 'scheduled')
      .limit(10)
      .get()

    for (const bookingDoc of bookingsSnap.docs) {
      const booking = bookingDoc.data()
      const scheduledAt = booking.scheduledAt?.toDate?.()
      if (!scheduledAt) continue

      const hoursUntil = (scheduledAt - now) / (1000 * 60 * 60)
      if (hoursUntil > 0 && hoursUntil <= THRESHOLDS.REMINDER_HOURS && !booking.reminderSent) {
        await sendInactivityAlert(db, orgId, orgData, 'call_reminder', {
          prospectName: booking.prospectName || 'Un prospect',
          scheduledAt: scheduledAt.toISOString(),
          hoursUntil: Math.round(hoursUntil * 10) / 10,
        })
        await bookingDoc.ref.update({ reminderSent: true })
        result.reminders++
      }
    }
  } catch {
    // pipeline/bookings may not exist
  }

  // 2. Alerte prospects chauds (3 jours inactif)
  if (daysSinceActive >= THRESHOLDS.ALERT_DAYS && daysSinceActive < THRESHOLDS.PAUSE_SEQUENCES_DAYS) {
    try {
      const hotProspectsSnap = await db.collection(`organizations/${orgId}/prospects`)
        .where('status', '==', 'hot')
        .limit(5)
        .get()

      if (!hotProspectsSnap.empty) {
        const alreadyAlerted = orgData._inactivityAlertSentAt?.toDate?.()
        const alertCooldown = alreadyAlerted && (now - alreadyAlerted) < 24 * 60 * 60 * 1000

        if (!alertCooldown) {
          await sendInactivityAlert(db, orgId, orgData, 'hot_prospects_waiting', {
            hotCount: hotProspectsSnap.size,
            daysSinceActive,
          })
          await db.doc(`organizations/${orgId}`).update({
            _inactivityAlertSentAt: FieldValue.serverTimestamp(),
          })
          result.alerts++
        }
      }
    } catch {
      // prospects may not exist
    }
  }

  // 3. Pause sequences (7 jours inactif)
  if (daysSinceActive >= THRESHOLDS.PAUSE_SEQUENCES_DAYS && daysSinceActive < THRESHOLDS.PAUSE_ALEX_DAYS) {
    if (orgData.prospectionEnabled !== false) {
      await db.doc(`organizations/${orgId}`).update({
        prospectionEnabled: false,
        prospectionPausedReason: 'user_inactivity_7d',
        prospectionPausedAt: FieldValue.serverTimestamp(),
      })
      await sendInactivityAlert(db, orgId, orgData, 'sequences_paused', { daysSinceActive })
      result.paused++
    }
  }

  // 4. Pause complete Alex (14 jours inactif)
  if (daysSinceActive >= THRESHOLDS.PAUSE_ALEX_DAYS) {
    const alexConfigRef = db.doc(`organizations/${orgId}/alexConfig/moduleStatus`)
    const alexConfigDoc = await alexConfigRef.get()
    const alexConfig = alexConfigDoc.exists ? alexConfigDoc.data() : {}

    if (!alexConfig._fullPauseAt) {
      await alexConfigRef.set({
        ...alexConfig,
        globalPause: true,
        _fullPauseAt: FieldValue.serverTimestamp(),
        _fullPauseReason: 'user_inactivity_14d',
      }, { merge: true })

      await db.doc(`organizations/${orgId}`).update({
        prospectionEnabled: false,
        prospectionPausedReason: 'user_inactivity_14d',
      })

      await sendInactivityAlert(db, orgId, orgData, 'alex_full_pause', { daysSinceActive })
      result.fullPause++
    }
  }

  return result
}

// ============================================
// ALERT SENDER
// ============================================

async function sendInactivityAlert(db, orgId, orgData, alertType, details) {
  const ownerPhone = orgData.ownerPhone || orgData.whatsappPhone
  const ownerName = orgData.ownerName || orgData.name || 'Boss'

  const messages = {
    call_reminder: `Rappel : Tu as un call avec ${details.prospectName} dans ${details.hoursUntil}h. Connecte-toi pour preparer le brief !`,
    hot_prospects_waiting: `${details.hotCount} prospect(s) chaud(s) t'attendent ! Ca fait ${details.daysSinceActive}j que tu ne t'es pas connecte. Ils vont refroidir...`,
    sequences_paused: `J'ai mis en pause tes sequences de prospection (${details.daysSinceActive}j d'inactivite). Reconnecte-toi pour les relancer.`,
    alex_full_pause: `ALERTE : Pause complete d'Alex apres ${details.daysSinceActive}j d'inactivite. Toutes les operations sont en pause. Reconnecte-toi pour relancer.`,
  }

  const message = messages[alertType] || `Alerte inactivite: ${alertType}`

  // Log l'alerte
  await db.collection(`organizations/${orgId}/inactivityAlerts`).add({
    type: alertType,
    message,
    details,
    sentAt: FieldValue.serverTimestamp(),
    ownerPhone: ownerPhone || null,
  })

  // Envoyer via WhatsApp si numero disponible
  if (ownerPhone) {
    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js')
      await sendWhatsAppMessage(orgId, null, {
        type: 'text',
        text: `[Alex] ${message}`,
        phone: ownerPhone,
      })
    } catch (err) {
      console.warn(`[Inactivity] WhatsApp failed for org ${orgId}:`, err.message)
    }
  }

  console.log(`[Inactivity] Alert ${alertType} for org ${orgId}: ${message}`)
}

// ============================================
// CALLABLE — getUserActivityStatus
// ============================================

export const getUserActivityStatus = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  if (!orgDoc.exists) throw new HttpsError('not-found', 'Org non trouvee')

  const orgData = orgDoc.data()
  const now = new Date()
  const lastActive = orgData.lastActiveAt?.toDate?.() || orgData.lastLoginAt?.toDate?.() || null
  const daysSinceActive = lastActive ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24)) : null

  return {
    lastActiveAt: lastActive?.toISOString() || null,
    daysSinceActive,
    prospectionEnabled: orgData.prospectionEnabled ?? true,
    prospectionPausedReason: orgData.prospectionPausedReason || null,
    thresholds: THRESHOLDS,
  }
})
