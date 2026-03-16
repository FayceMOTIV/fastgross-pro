/**
 * alexEmailApproval.js — Auto-reply approval flow for email
 *
 * When a prospect replies by email:
 * 1. Alex generates a reply (via replyHandler → scoreAndReply)
 * 2. The reply is queued in pendingAlexReplies
 * 3. Client is notified via WhatsApp: "Prospect X replied. My suggested reply: '...'. Approve?"
 * 4. If client approves → Alex sends
 * 5. If no response after 2h → Alex sends anyway (autopilot, configurable)
 *
 * Collections:
 *   organizations/{orgId}/pendingAlexReplies/{replyId}
 *     - prospectId, replyFeedId, channel, status, autoSendAt, approvedAt, sentAt
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { sendMessage } from './sendMessage.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

/**
 * Generate and queue an Alex email reply for client approval
 * Called after handleIncomingReply() processes an email reply
 */
export async function generateAndQueueEmailReply(orgId, prospectId, replyFeedId, inboundText) {
  const db = getDb()

  // Load prospect data
  const prospectSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .doc(prospectId)
    .get()

  if (!prospectSnap.exists) {
    logger.warn(`[EmailApproval] Prospect ${prospectId} not found`)
    return
  }

  const prospect = { id: prospectId, ...prospectSnap.data() }

  // Load the reply feed (contains AI-generated scripts)
  const replyFeedSnap = await db
    .collection(`organizations/${orgId}/replyFeeds`)
    .doc(replyFeedId)
    .get()

  if (!replyFeedSnap.exists) {
    logger.warn(`[EmailApproval] ReplyFeed ${replyFeedId} not found`)
    return
  }

  const replyFeed = replyFeedSnap.data()
  const suggestedReply = replyFeed.scripts?.script1?.text || ''
  const classification = replyFeed.classification?.category || 'NEUTRAL'

  if (!suggestedReply) {
    logger.warn('[EmailApproval] No suggested reply text')
    return
  }

  // Don't queue for UNSUBSCRIBE or hard NEGATIVE
  if (['UNSUBSCRIBE'].includes(classification)) return

  // Load org config for autopilot settings
  const orgSnap = await db.collection('organizations').doc(orgId).get()
  const orgData = orgSnap.exists ? orgSnap.data() : {}
  const autopilotDelay = orgData.alexAutopilotDelay || 2 // hours
  const autopilotEnabled = orgData.alexEmailAutopilot !== false // default: true

  const autoSendAt = autopilotEnabled
    ? new Date(Date.now() + autopilotDelay * 60 * 60 * 1000)
    : null

  // Queue the pending reply
  const pendingRef = await db.collection(`organizations/${orgId}/pendingAlexReplies`).add({
    prospectId,
    replyFeedId,
    channel: 'email',
    prospectName: prospect.company || prospect.name || prospect.email || 'Prospect',
    prospectEmail: prospect.email || null,
    inboundText: inboundText.slice(0, 500),
    suggestedReply,
    suggestedReplyAlt: replyFeed.scripts?.script2?.text || '',
    classification,
    status: 'pending_approval',
    autoSendAt,
    autopilotEnabled,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Notify client via WhatsApp
  await notifyClientForApproval(orgId, prospect, inboundText, suggestedReply, classification, pendingRef.id)

  logger.info(`[EmailApproval] Queued reply for approval: ${pendingRef.id}`, {
    orgId, prospectId, classification, autoSendAt: autoSendAt?.toISOString(),
  })

  return pendingRef.id
}

/**
 * Notify client via WhatsApp about pending reply
 */
async function notifyClientForApproval(orgId, prospect, inboundText, suggestedReply, classification, pendingId) {
  const db = getDb()

  const orgDoc = await db.collection('organizations').doc(orgId).get()
  if (!orgDoc.exists) return

  const orgData = orgDoc.data()
  const notifyPhone = orgData.notificationPhone || orgData.ownerPhone
  if (!notifyPhone) return

  const prospectName = prospect.company || prospect.name || prospect.email || 'Prospect'
  const inboundPreview = inboundText.length > 150 ? inboundText.slice(0, 150) + '...' : inboundText
  const replyPreview = suggestedReply.length > 200 ? suggestedReply.slice(0, 200) + '...' : suggestedReply

  const emoji = classification === 'POSITIVE' ? '🟢' : classification === 'OBJECTION' ? '🟠' : '📩'

  const message = [
    `${emoji} *REPONSE EMAIL — ${prospectName}*`,
    '',
    `💬 "${inboundPreview}"`,
    '',
    `✍️ *Ma reponse suggeree:*`,
    `"${replyPreview}"`,
    '',
    `⏰ Envoi auto dans 2h si pas de reponse.`,
    `Repondez OUI pour approuver ou NON pour bloquer.`,
  ].join('\n')

  await db.collection(`organizations/${orgId}/notificationQueue`).add({
    type: 'email_approval',
    channel: 'whatsapp',
    to: notifyPhone,
    message,
    pendingReplyId: pendingId,
    priority: classification === 'POSITIVE' ? 'urgent' : 'normal',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Callable: Client approves or rejects a pending email reply
 */
export const approveAlexEmailReply = onCall(
  { region: 'europe-west1', timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required')

    const { orgId, pendingReplyId, approved, customReply } = request.data || {}

    if (!orgId || !pendingReplyId) {
      throw new HttpsError('invalid-argument', 'orgId and pendingReplyId required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const pendingRef = db.collection(`organizations/${orgId}/pendingAlexReplies`).doc(pendingReplyId)
    const pendingSnap = await pendingRef.get()

    if (!pendingSnap.exists) {
      throw new HttpsError('not-found', 'Pending reply not found')
    }

    const pending = pendingSnap.data()

    if (pending.status !== 'pending_approval') {
      throw new HttpsError('failed-precondition', `Reply already ${pending.status}`)
    }

    if (approved === false) {
      // Client rejected — don't send
      await pendingRef.update({
        status: 'rejected',
        rejectedAt: FieldValue.serverTimestamp(),
      })
      return { success: true, status: 'rejected' }
    }

    // Client approved — send the reply
    const replyText = customReply || pending.suggestedReply

    const sendResult = await sendMessage({
      orgId,
      prospectId: pending.prospectId,
      channel: 'email',
      message: replyText,
      to: pending.prospectEmail,
      metadata: { source: 'alex_approved', subject: 'Re: ' },
    })

    await pendingRef.update({
      status: sendResult.success ? 'sent' : 'send_failed',
      sentReply: replyText,
      sentAt: FieldValue.serverTimestamp(),
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
    })

    return { success: sendResult.success, status: 'sent' }
  }
)

/**
 * Scheduled: Auto-send pending replies after timeout (autopilot mode)
 * Runs every 15 minutes
 */
export const processAlexPendingReplies = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async () => {
    const db = getDb()
    const now = new Date()

    // Find all pending replies where autoSendAt has passed
    // We need to query across all orgs, so use collectionGroup
    const pendingSnap = await db
      .collectionGroup('pendingAlexReplies')
      .where('status', '==', 'pending_approval')
      .where('autopilotEnabled', '==', true)
      .where('autoSendAt', '<=', now)
      .limit(50)
      .get()

    if (pendingSnap.empty) return

    logger.info(`[EmailApproval] Processing ${pendingSnap.size} expired pending replies`)

    for (const doc of pendingSnap.docs) {
      const pending = doc.data()
      // Extract orgId from doc path: organizations/{orgId}/pendingAlexReplies/{replyId}
      const orgId = doc.ref.parent.parent.id

      try {
        const sendResult = await sendMessage({
          orgId,
          prospectId: pending.prospectId,
          channel: 'email',
          message: pending.suggestedReply,
          to: pending.prospectEmail,
          metadata: { source: 'alex_autopilot', subject: 'Re: ' },
        })

        await doc.ref.update({
          status: sendResult.success ? 'auto_sent' : 'send_failed',
          sentReply: pending.suggestedReply,
          sentAt: FieldValue.serverTimestamp(),
          sentBy: 'autopilot',
        })

        logger.info(`[EmailApproval] Auto-sent reply for prospect ${pending.prospectId} in org ${orgId}`)
      } catch (error) {
        logger.error(`[EmailApproval] Auto-send failed for ${doc.id}:`, error.message)
        await doc.ref.update({
          status: 'send_failed',
          error: error.message,
        })
      }
    }
  }
)
