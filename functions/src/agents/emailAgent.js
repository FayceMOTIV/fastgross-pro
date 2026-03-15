/**
 * Email Agent — Cloud Function HTTP handler (remplace BullMQ email worker)
 *
 * Appele par Cloud Tasks via la queue fmf-email.
 * Actions : sendEmail, sendFollowUp
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

export const emailAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 10,
  },
  async (req, res) => {
    // Verifier methode
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const startTime = Date.now()
    const payload = req.body
    const { orgId, prospectId, action, prospect: prospectData, template } = payload

    if (!orgId || !prospectId || !action) {
      res.status(400).json({ error: 'Missing required fields: orgId, prospectId, action' })
      return
    }

    logger.info(`[emailAgent] Processing ${action} for prospect ${prospectId} in org ${orgId}`)

    try {
      const db = getDb()

      // Charger le prospect depuis Firestore (plus frais que le payload)
      const prospectDoc = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()

      if (!prospectDoc.exists) {
        logger.warn(`[emailAgent] Prospect ${prospectId} not found`)
        res.status(200).json({ skipped: true, reason: 'prospect_not_found' })
        return
      }

      const prospect = { id: prospectId, ...prospectDoc.data() }

      if (!prospect.email) {
        res.status(200).json({ skipped: true, reason: 'no_email' })
        return
      }

      // Dispatcher via le channelDispatcher existant
      const { dispatchMessage } = await import('../engine/channelDispatcher.js')

      let content = {}
      if (action === 'sendEmail') {
        content = {
          subject: template?.subject || prospectData?.subject || 'Message',
          html: template?.html || template?.body || '',
          text: template?.text || template?.body || '',
          from: template?.fromName,
          replyTo: template?.replyTo,
        }
      } else if (action === 'sendFollowUp') {
        const followUpType = payload.followUpType || 'followup'
        content = {
          subject: template?.subject || `Re: ${followUpType === 'breakup' ? 'Dernier message' : 'Suivi'}`,
          html: template?.html || template?.body || '',
          text: template?.text || template?.body || '',
          from: template?.fromName,
          replyTo: template?.replyTo,
        }
      }

      const result = await dispatchMessage(orgId, prospectId, {
        channel: 'email',
        content,
        fallbackChannels: [],
      })

      // Mettre a jour engagement
      if (result.success) {
        const updates = {
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
          'engagement.activeChannel': 'email',
          lastContactedAt: FieldValue.serverTimestamp(),
        }

        if (action === 'sendEmail') {
          updates['engagement.emailSentAt'] = new Date().toISOString()
        }

        await prospectDoc.ref.update(updates)

        logAlexActivity(orgId, {
          type: 'email_sent',
          title: `Email envoye — ${prospect.email}`,
          details: `Action: ${action}. Sujet: ${template?.subject || 'non specifie'}`,
          status: 'success',
          prospectId,
          channel: 'email',
        });
      }

      const duration = Date.now() - startTime
      logger.info(`[emailAgent] ${action} for ${prospectId}: success=${result.success} duration=${duration}ms`)

      res.status(200).json({
        success: result.success,
        action,
        prospectId,
        duration,
        error: result.error || null,
      })
    } catch (error) {
      logger.error(`[emailAgent] Error processing ${action}:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)
