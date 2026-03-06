/**
 * Calendly Webhook — Handles booking events
 * Matches invitees to prospects and updates CRM
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import crypto from 'crypto'

const getDb = () => getFirestore()

/**
 * Verify Calendly webhook signature
 */
function verifySignature(body, signature, secret) {
  if (!secret || !signature) return false
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
}

/**
 * HTTP Webhook: Calendly Event
 */
export const calendlyWebhook = onRequest({
  region: 'europe-west1',
  cors: true,
  timeoutSeconds: 30,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const secret = process.env.CALENDLY_WEBHOOK_SECRET
  const signature = req.headers['calendly-webhook-signature']

  // Verify signature if secret configured
  if (secret && signature) {
    const rawBody = JSON.stringify(req.body)
    if (!verifySignature(rawBody, signature, secret)) {
      console.error(JSON.stringify({ event: 'calendly_invalid_signature' }))
      res.status(401).send('Invalid signature')
      return
    }
  }

  const { event: eventType, payload } = req.body

  if (eventType !== 'invitee.created') {
    res.status(200).send('OK')
    return
  }

  const invitee = payload?.invitee || payload
  const email = invitee?.email?.toLowerCase()
  const name = invitee?.name || ''
  const eventUrl = payload?.event?.uri || payload?.uri || ''
  const scheduledAt = invitee?.scheduled_event?.start_time || payload?.event?.start_time

  if (!email) {
    res.status(400).send('Missing email')
    return
  }

  const db = getDb()

  try {
    // Find prospect by email across all orgs
    const orgsSnapshot = await db.collection('organizations').get()

    let matched = false
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const prospectsSnap = await db
        .collection('organizations').doc(orgId).collection('prospects')
        .where('email', '==', email)
        .limit(1)
        .get()

      if (prospectsSnap.empty) continue

      const prospectDoc = prospectsSnap.docs[0]
      const prospect = prospectDoc.data()

      // Update prospect CRM
      await prospectDoc.ref.update({
        crmColumn: 'MEETING',
        meetingDate: scheduledAt || null,
        meetingUrl: eventUrl || null,
        meetingSource: 'calendly',
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Log interaction
      await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
        prospectId: prospectDoc.id,
        type: 'meeting_booked',
        content: `RDV confirme via Calendly le ${scheduledAt || 'date inconnue'}`,
        channel: 'calendly',
        createdAt: FieldValue.serverTimestamp(),
      })

      // Notify tenant
      await db.collection('organizations').doc(orgId).collection('notifications').add({
        type: 'meeting_booked',
        prospectId: prospectDoc.id,
        prospectName: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim() || name,
        message: `RDV confirme avec ${prospect.firstName || name}`,
        priority: 'high',
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      })

      matched = true

      console.log(JSON.stringify({
        event: 'calendly_meeting_booked',
        orgId,
        prospectId: prospectDoc.id,
        email,
        scheduledAt,
      }))

      break // First match only
    }

    if (!matched) {
      console.log(JSON.stringify({
        event: 'calendly_no_match',
        email,
        name,
      }))
    }

    res.status(200).json({ success: true, matched })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'calendly_webhook_error',
      error: error.message,
    }))
    res.status(500).json({ error: error.message })
  }
})
