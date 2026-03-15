/**
 * WhatsApp Agent — Cloud Function HTTP handler (remplace BullMQ whatsapp worker)
 *
 * Appele par Cloud Tasks via la queue fmf-whatsapp.
 * Rate limit : 1 msg / 4s (gere par Cloud Tasks queue config)
 * Actions : sendDM
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

export const whatsappAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 3,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const startTime = Date.now()
    const payload = req.body
    const { orgId, prospectId, action, template, instanceName } = payload

    if (!orgId || !prospectId || !action) {
      res.status(400).json({ error: 'Missing required fields: orgId, prospectId, action' })
      return
    }

    logger.info(`[whatsappAgent] Processing ${action} for prospect ${prospectId} in org ${orgId}`)

    try {
      const db = getDb()

      // Charger prospect
      const prospectDoc = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()

      if (!prospectDoc.exists) {
        res.status(200).json({ skipped: true, reason: 'prospect_not_found' })
        return
      }

      const prospect = { id: prospectId, ...prospectDoc.data() }
      const phone = prospect.phone || prospect.mobile

      if (!phone) {
        res.status(200).json({ skipped: true, reason: 'no_phone' })
        return
      }

      // Verifier limite quotidienne
      const today = new Date().toISOString().split('T')[0]
      const dailyLimitDoc = await db
        .collection('organizations').doc(orgId)
        .collection('dailyBudgets').doc(today)
        .get()

      const dailyData = dailyLimitDoc.data() || {}
      const waUsed = dailyData.usage?.whatsapp || 0
      const waLimit = dailyData.budgets?.whatsapp || 60

      if (waUsed >= waLimit) {
        logger.info(`[whatsappAgent] Daily limit reached for org ${orgId}`)
        res.status(200).json({ skipped: true, reason: 'daily_limit_reached' })
        return
      }

      // Dispatcher via channelDispatcher
      const { dispatchMessage } = await import('../engine/channelDispatcher.js')

      const content = {
        text: template?.message || template?.text || '',
        templateName: template?.templateName,
        templateLanguage: template?.templateLanguage || 'fr',
        templateVariables: template?.templateVariables,
      }

      const result = await dispatchMessage(orgId, prospectId, {
        channel: 'whatsapp',
        content,
        fallbackChannels: [],
      })

      // Mettre a jour engagement + daily usage
      if (result.success) {
        await prospectDoc.ref.update({
          'engagement.whatsappSentAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
          'engagement.activeChannel': 'whatsapp',
          lastContactedAt: FieldValue.serverTimestamp(),
        })

        // Incrementer usage quotidien
        await db
          .collection('organizations').doc(orgId)
          .collection('dailyBudgets').doc(today)
          .set({ usage: { whatsapp: FieldValue.increment(1) } }, { merge: true })

        logAlexActivity(orgId, {
          type: 'whatsapp_sent',
          title: `WhatsApp envoye — ${prospect.phone || prospect.mobile}`,
          details: `Action: ${action}. Instance: ${instanceName || 'default'}`,
          status: 'success',
          prospectId,
          channel: 'whatsapp',
        });
      }

      const duration = Date.now() - startTime
      logger.info(`[whatsappAgent] ${action} for ${prospectId}: success=${result.success} duration=${duration}ms`)

      res.status(200).json({
        success: result.success,
        action,
        prospectId,
        duration,
        error: result.error || null,
      })
    } catch (error) {
      logger.error(`[whatsappAgent] Error:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)
