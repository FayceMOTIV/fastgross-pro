import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'

const db = getFirestore()

/**
 * Cloud Function: sendCampaignEmail
 * Envoie un email individuel via Resend
 */
export const sendCampaignEmail = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez être connecté')
    }

    const { leadId, campaignId, emailIndex } = request.data

    try {
      // Get lead data
      const leadDoc = await db.collection('leads').doc(leadId).get()
      if (!leadDoc.exists) throw new HttpsError('not-found', 'Lead non trouvé')
      const lead = leadDoc.data()

      // Get campaign and email template
      const campaignDoc = await db.collection('campaigns').doc(campaignId).get()
      if (!campaignDoc.exists) throw new HttpsError('not-found', 'Campagne non trouvée')
      const campaign = campaignDoc.data()
      const emailTemplate = campaign.emails[emailIndex]

      if (!emailTemplate) throw new HttpsError('not-found', 'Email non trouvé dans la séquence')

      // Get org settings for sender config
      const orgDoc = await db.collection('organizations').doc(campaign.orgId).get()
      const org = orgDoc.data()

      // Personalize email
      const subject = personalizeTemplate(emailTemplate.subject, lead)
      const body = personalizeTemplate(emailTemplate.body, lead)

      // Send via Resend
      const resend = new Resend(process.env.RESEND_API_KEY)
      const { data, error } = await resend.emails.send({
        from: `${org.senderName || org.name} <${org.senderEmail || 'noreply@facemedia.app'}>`,
        to: [lead.email],
        subject,
        html: formatEmailHtml(body),
        headers: {
          'X-FMF-Lead-Id': leadId,
          'X-FMF-Campaign-Id': campaignId,
          'X-FMF-Org-Id': campaign.orgId,
        },
      })

      if (error) throw new Error(error.message)

      // Log the event
      await db.collection('emailEvents').add({
        type: 'sent',
        leadId,
        campaignId,
        emailIndex,
        orgId: campaign.orgId,
        resendId: data.id,
        timestamp: FieldValue.serverTimestamp(),
      })

      // Update lead status
      await db.collection('leads').doc(leadId).update({
        status: 'contacted',
        lastContactedAt: FieldValue.serverTimestamp(),
        emailsSent: FieldValue.increment(1),
      })

      return { success: true, resendId: data.id }
    } catch (error) {
      console.error('Send email error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Webhook: handleEmailWebhook
 * Reçoit les événements de Resend (open, click, bounce, etc.)
 */
export const handleEmailWebhook = onRequest(
  { region: 'europe-west1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const event = req.body

      // Map Resend events to our types
      const eventTypeMap = {
        'email.delivered': 'delivered',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.bounced': 'bounced',
        'email.complained': 'complained',
      }

      const eventType = eventTypeMap[event.type]
      if (!eventType) {
        res.status(200).send('Event type not tracked')
        return
      }

      // Extract our custom headers
      const headers = event.data?.headers || {}
      const leadId = headers['X-FMF-Lead-Id']
      const campaignId = headers['X-FMF-Campaign-Id']
      const orgId = headers['X-FMF-Org-Id']

      if (!leadId || !orgId) {
        res.status(200).send('Missing tracking headers')
        return
      }

      // Log event
      await db.collection('emailEvents').add({
        type: eventType,
        leadId,
        campaignId,
        orgId,
        resendId: event.data?.email_id,
        timestamp: FieldValue.serverTimestamp(),
        raw: event,
      })

      // Update lead score based on event
      const scoreMap = {
        opened: 1,
        clicked: 3,
        replied: 10,
        bounced: -5,
      }

      if (scoreMap[eventType]) {
        await db.collection('leads').doc(leadId).update({
          score: FieldValue.increment(scoreMap[eventType]),
          lastActivity: eventType,
          lastActivityAt: FieldValue.serverTimestamp(),
          ...(eventType === 'opened' && { status: 'opened' }),
        })
      }

      res.status(200).send('OK')
    } catch (error) {
      console.error('Webhook error:', error)
      res.status(500).send('Internal error')
    }
  }
)

/**
 * Replace les variables dans le template
 */
function personalizeTemplate(template, lead) {
  return template
    .replace(/\{prénom\}/g, lead.firstName || '')
    .replace(/\{nom\}/g, lead.lastName || '')
    .replace(/\{entreprise\}/g, lead.company || '')
    .replace(/\{poste\}/g, lead.jobTitle || '')
    .replace(/\{email\}/g, lead.email || '')
    .replace(/\{signature\}/g, '') // Will be added in HTML
}

/**
 * Formate le body text en HTML email propre
 */
function formatEmailHtml(body) {
  const paragraphs = body
    .split('\n')
    .filter((p) => p.trim())
    .map((p) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p}</p>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs}
</body>
</html>`
}
