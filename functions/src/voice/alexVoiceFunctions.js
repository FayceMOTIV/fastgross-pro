/**
 * alexVoiceFunctions.js — Cloud Functions for Alex Voice
 *
 * Exports:
 *   - initiateAlexCallFn         (onCall)    — Manual call trigger from UI
 *   - alexVoiceWebhook           (onRequest) — Vapi webhook handler
 *   - scheduleVoiceCampaignFn    (onCall)    — Schedule batch voice campaign
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { initiateAlexCall } from './alexVoiceEngine.js'
import { handleVapiWebhook } from './vapiWebhookHandler.js'
import { isCallAllowed, getNextLegalWindow } from './callScheduler.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ============================================
// 1. initiateAlexCallFn — Manual trigger from UI
// ============================================
export const initiateAlexCallFn = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { leadId, orgId, collection = 'prospects' } = request.data || {}

    if (!leadId || !orgId) {
      throw new HttpsError('invalid-argument', 'leadId et orgId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    // Load lead data
    const db = getDb()
    const leadDoc = await db
      .collection('organizations').doc(orgId)
      .collection(collection).doc(leadId)
      .get()

    if (!leadDoc.exists) {
      throw new HttpsError('not-found', `Lead ${leadId} introuvable`)
    }

    const lead = { id: leadDoc.id, ...leadDoc.data() }

    logger.info(`[AlexVoice] Manual call by ${request.auth.uid} for lead ${leadId}`)

    const result = await initiateAlexCall(lead, {
      orgId,
      leadId,
      trigger: 'manual',
      collection,
    })

    if (!result.success) {
      throw new HttpsError('failed-precondition', result.error, {
        reason: result.reason,
        nextWindow: result.nextWindow,
      })
    }

    return result
  }
)

// ============================================
// 2. alexVoiceWebhook — Vapi webhook handler
// ============================================
export const alexVoiceWebhook = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      const result = await handleVapiWebhook(req.body, process.env.VAPI_WEBHOOK_SECRET)
      res.status(200).json(result)
    } catch (err) {
      logger.error('[AlexVoiceWebhook] Error:', err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

// ============================================
// 3. scheduleVoiceCampaignFn — Batch campaign scheduling
// ============================================
export const scheduleVoiceCampaignFn = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId, leadIds, collection = 'prospects' } = request.data || {}

    if (!orgId || !Array.isArray(leadIds) || leadIds.length === 0) {
      throw new HttpsError('invalid-argument', 'orgId et leadIds[] requis')
    }

    if (leadIds.length > 50) {
      throw new HttpsError('invalid-argument', 'Maximum 50 leads par campagne vocale')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    logger.info(`[AlexVoice] Campaign scheduled by ${request.auth.uid}: ${leadIds.length} leads`)

    const db = getDb()
    const batch = db.batch()
    let scheduledCount = 0

    // Schedule each lead with staggered timing
    const nextWindow = getNextLegalWindow()
    const intervalMinutes = 5 // 5 min between calls

    for (let i = 0; i < leadIds.length; i++) {
      const scheduledTime = new Date(nextWindow.getTime() + i * intervalMinutes * 60000)

      // Check if still in legal window
      const check = isCallAllowed(scheduledTime)
      if (!check.allowed) {
        // Get next legal window from this point
        const adjusted = getNextLegalWindow(scheduledTime)
        scheduledTime.setTime(adjusted.getTime())
      }

      const ref = db.collection('scheduledCalls').doc()
      batch.set(ref, {
        leadId: leadIds[i],
        orgId,
        collection,
        trigger: 'campaign',
        scheduledFor: scheduledTime,
        status: 'pending',
        scheduledBy: request.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      })
      scheduledCount++
    }

    await batch.commit()

    return {
      success: true,
      scheduledCount,
      firstCallAt: nextWindow.toISOString(),
    }
  }
)
