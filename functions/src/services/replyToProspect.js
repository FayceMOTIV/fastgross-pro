/**
 * replyToProspect — Unified Inbox reply callable
 *
 * Sends a reply to a prospect on the specified channel.
 * Logs interaction + activity feed.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

export const replyToProspect = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '512MiB',
  timeoutSeconds: 60,
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication requise')

  const { orgId, prospectId, channel, message } = data || {}
  if (!orgId || !prospectId || !channel || !message) {
    throw new HttpsError('invalid-argument', 'orgId, prospectId, channel et message requis')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!prospectDoc.exists) throw new HttpsError('not-found', 'Prospect introuvable')
  const prospect = prospectDoc.data()

  let sendResult = { success: false }

  try {
    switch (channel) {
      case 'email': {
        const { sendEmail } = await import('../email/emailRouter.js')
        const email = prospect.email
        if (!email) throw new Error('Pas d\'email pour ce prospect')
        sendResult = await sendEmail({
          to: email,
          subject: `Re: ${prospect.companyName || prospect.contactName || 'Votre demande'}`,
          html: message.replace(/\n/g, '<br>'),
          orgId,
        })
        sendResult = { success: true, ...sendResult }
        break
      }

      case 'sms': {
        const { sendSMS } = await import('../channels/sms/sender.js')
        const phone = prospect.phone || prospect.mobile
        if (!phone) throw new Error('Pas de numero de telephone pour ce prospect')
        sendResult = await sendSMS(orgId, prospectId, message)
        break
      }

      case 'whatsapp': {
        const { sendTextMessage } = await import('../alex/alexWhatsAppSender.js')
        const phone = prospect.whatsappPhone || prospect.phone || prospect.mobile
        if (!phone) throw new Error('Pas de numero WhatsApp pour ce prospect')
        await sendTextMessage(phone, message, orgId)
        sendResult = { success: true }
        break
      }

      case 'instagram': {
        // Instagram DM uses internal sender from channels
        const { sendInstagramDM: sendIG } = await import('../channels/instagram/sender.js').catch(() => ({}))
        if (!sendIG) throw new Error('Module Instagram DM non disponible')
        const igHandle = prospect.instagramHandle || prospect.username
        if (!igHandle) throw new Error('Pas de handle Instagram pour ce prospect')
        await sendIG(orgId, igHandle, message)
        sendResult = { success: true }
        break
      }

      default:
        throw new Error(`Canal non supporte: ${channel}`)
    }
  } catch (e) {
    // Log the error but still save interaction as attempted
    console.error(`[ReplyToProspect] Send failed on ${channel}:`, e.message)

    await logAlexActivity(orgId, {
      type: 'reply_sent',
      title: `Echec envoi ${channel}: ${prospect.companyName || prospectId}`,
      details: e.message,
      status: 'error',
      prospectId,
      channel,
    })

    throw new HttpsError('internal', `Envoi echoue: ${e.message}`)
  }

  // Log interaction
  await db.collection(`organizations/${orgId}/interactions`).add({
    prospectId,
    type: `${channel}_sent`,
    direction: 'outbound',
    channel,
    message: message.substring(0, 1000),
    sentBy: auth.uid,
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  })

  // Update prospect lastContactedAt
  await prospectDoc.ref.update({
    lastContactedAt: FieldValue.serverTimestamp(),
    lastContactChannel: channel,
  })

  await logAlexActivity(orgId, {
    type: 'reply_sent',
    title: `Reponse ${channel} envoyee: ${prospect.companyName || prospectId}`,
    details: message.substring(0, 200),
    status: 'success',
    prospectId,
    channel,
  })

  return { success: true, channel, prospectId }
})
