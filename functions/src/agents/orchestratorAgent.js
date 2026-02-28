/**
 * Orchestrator Agent — Cloud Function HTTP handler (remplace BullMQ orchestrator worker)
 *
 * Appele par Cloud Tasks via la queue fmf-orchestrator.
 * Decide la prochaine action pour un prospect et enqueue dans la bonne queue canal.
 *
 * Ce handler est le pont entre orchestratorEngine (logique comportementale)
 * et les agents canal (email, whatsapp, instagram, linkedin).
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { getNextAction } from './orchestratorEngine.js'
import { enqueueTask } from '../queues/taskQueue.js'

const getDb = () => getFirestore()

// Map canal orchestrator → canal Cloud Tasks queue
const CHANNEL_TO_QUEUE = {
  email: 'email',
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  linkedin: 'linkedin',
}

export const orchestratorAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const startTime = Date.now()
    const payload = req.body
    const { orgId, prospectId, trigger } = payload

    if (!orgId || !prospectId) {
      res.status(400).json({ error: 'Missing required fields: orgId, prospectId' })
      return
    }

    logger.info(`[orchestratorAgent] Processing prospect ${prospectId} in org ${orgId} (trigger: ${trigger || 'manual'})`)

    try {
      const db = getDb()

      // 1. Charger le prospect
      const prospectDoc = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()

      if (!prospectDoc.exists) {
        res.status(200).json({ skipped: true, reason: 'prospect_not_found' })
        return
      }

      const prospect = { id: prospectId, ...prospectDoc.data() }

      // 2. Decider la prochaine action
      const nextAction = await getNextAction(prospect)

      if (!nextAction) {
        // Rien a faire — peut-etre marquer comme sequence_done si > 14 jours
        logger.info(`[orchestratorAgent] No action needed for ${prospectId}`)
        res.status(200).json({ skipped: true, reason: 'no_action_needed' })
        return
      }

      // 3. Charger config org (templates, comptes, etc.)
      const orgDoc = await db.collection('organizations').doc(orgId).get()
      const orgConfig = orgDoc.exists ? orgDoc.data() : {}

      // 4. Determiner la queue cible
      const targetQueue = CHANNEL_TO_QUEUE[nextAction.channel]

      if (!targetQueue) {
        logger.warn(`[orchestratorAgent] No queue mapping for channel: ${nextAction.channel}`)
        res.status(200).json({ skipped: true, reason: `no_queue_for_channel: ${nextAction.channel}` })
        return
      }

      // 5. Construire le payload pour l'agent canal
      const taskPayload = {
        orgId,
        prospectId,
        action: nextAction.action,
        template: orgConfig.templates?.[nextAction.channel] || null,
        instanceName: orgConfig.waInstances?.[0] || null,
        accountId: orgConfig.socialAccounts?.[nextAction.channel] || null,
        followUpType: nextAction.followUpType || null,
        reason: nextAction.reason,
      }

      // 6. Enqueue dans la queue canal via Cloud Tasks
      const delaySeconds = nextAction.delay ? Math.floor(nextAction.delay / 1000) : 0
      const taskId = `${orgId}-${prospectId}-${nextAction.action}-${Date.now()}`

      const enqueueResult = await enqueueTask(targetQueue, taskPayload, {
        delaySeconds,
        taskId,
      })

      // 7. Mettre a jour l'etat du prospect
      await prospectDoc.ref.update({
        'engagement.lastTouchAt': new Date().toISOString(),
        'engagement.activeChannel': nextAction.channel,
        'engagement.nextAction': nextAction.action,
        'engagement.nextActionReason': nextAction.reason,
        'engagement.nextActionAt': new Date(Date.now() + (nextAction.delay || 0)).toISOString(),
      })

      const duration = Date.now() - startTime
      logger.info(`[orchestratorAgent] Dispatched ${nextAction.action} on ${nextAction.channel} for ${prospectId} (reason: ${nextAction.reason}) duration=${duration}ms`)

      res.status(200).json({
        dispatched: true,
        channel: nextAction.channel,
        action: nextAction.action,
        reason: nextAction.reason,
        taskName: enqueueResult.taskName,
        delay: delaySeconds,
        duration,
      })
    } catch (error) {
      logger.error(`[orchestratorAgent] Error:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)
