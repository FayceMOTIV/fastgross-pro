/**
 * hotQueueManager — Gestion file d'attente leads chauds
 * Quand score >= 80, le prospect entre en hot queue avec timer 15 min
 */

import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { sendNotification } from './notificationSender.js'
import { NOTIFICATION_TYPES } from './notificationTemplates.js'

const getDb = () => getFirestore()

const HOT_QUEUE_EXPIRY_MINUTES = 15

/**
 * Ajoute un prospect a la hot queue
 */
export async function addToHotQueue({ orgId, prospectId, prospect, score, scoring, channel }) {
  if (!orgId || !prospectId) return { success: false, error: 'missing_params' }

  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + HOT_QUEUE_EXPIRY_MINUTES)

  try {
    await getDb()
      .collection('organizations').doc(orgId)
      .collection('hotQueue').doc(prospectId)
      .set({
        prospectId,
        prospectName: prospect?.name || prospect?.firstName || 'Inconnu',
        company: prospect?.company || null,
        phone: prospect?.phone || null,
        email: prospect?.email || null,
        score,
        scoring: scoring || null,
        channel: channel || null,
        status: 'pending',
        addedAt: FieldValue.serverTimestamp(),
        expiresAt,
      })

    logger.info(`Added ${prospectId} to hot queue (score ${score}, expires in ${HOT_QUEUE_EXPIRY_MINUTES}min)`)

    // Notification au commercial
    try {
      await sendNotification({
        orgId,
        type: NOTIFICATION_TYPES.HOT_LEAD,
        data: {
          prospect: prospect || { name: 'Inconnu' },
          score,
          scoring,
          interactions: [],
          orgName: '',
          channel,
        },
      })
    } catch (err) {
      logger.warn('Hot queue notification failed:', err.message)
    }

    return { success: true, expiresAt }
  } catch (err) {
    logger.error('addToHotQueue error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Prendre en charge un prospect de la hot queue (commercial humain)
 */
export async function claimFromHotQueue({ orgId, prospectId, claimedBy }) {
  if (!orgId || !prospectId) return { success: false, error: 'missing_params' }

  const ref = getDb()
    .collection('organizations').doc(orgId)
    .collection('hotQueue').doc(prospectId)

  try {
    const snap = await ref.get()
    if (!snap.exists) return { success: false, error: 'not_in_queue' }
    if (snap.data().status === 'claimed') return { success: false, error: 'already_claimed' }

    await ref.update({
      status: 'claimed',
      claimedBy,
      claimedAt: FieldValue.serverTimestamp(),
    })

    // Pause Alex sur ce prospect
    await getDb()
      .collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({ alexPaused: true })

    logger.info(`Prospect ${prospectId} claimed from hot queue by ${claimedBy}`)
    return { success: true }
  } catch (err) {
    logger.error('claimFromHotQueue error:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Expire les items de la hot queue dont le timer est depasse
 * Appelee par un cron ou dans scoreAndReply
 */
export async function expireHotQueueItems(orgId) {
  const now = new Date()

  try {
    const snapshot = await getDb()
      .collection('organizations').doc(orgId)
      .collection('hotQueue')
      .where('status', '==', 'pending')
      .where('expiresAt', '<=', now)
      .get()

    if (snapshot.empty) return { expired: 0 }

    const batch = getDb().batch()
    let count = 0

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: FieldValue.serverTimestamp(),
      })
      count++
    })

    await batch.commit()
    logger.info(`Expired ${count} hot queue items for org ${orgId}`)
    return { expired: count }
  } catch (err) {
    logger.error('expireHotQueueItems error:', err.message)
    return { expired: 0, error: err.message }
  }
}

/**
 * Obtenir les items de la hot queue actifs
 */
export async function getHotQueueItems(orgId) {
  try {
    const snapshot = await getDb()
      .collection('organizations').doc(orgId)
      .collection('hotQueue')
      .where('status', '==', 'pending')
      .orderBy('addedAt', 'desc')
      .limit(20)
      .get()

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    logger.error('getHotQueueItems error:', err.message)
    return []
  }
}
