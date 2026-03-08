/**
 * vapiWebhookHandler.js — Handles Vapi webhook events for Alex Voice
 *
 * Events handled:
 *   - call-started     → Log call start
 *   - call-ended       → Process transcript, update status, route pipeline
 *   - tool-calls       → Execute custom tools (scheduleCallback, markAsInterested, etc.)
 *   - status-update    → Track call progress
 *
 * This handler is called by the alexVoiceWebhook Cloud Function (onRequest).
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

/**
 * Main webhook dispatcher.
 *
 * @param {Object} body - Vapi webhook body
 * @param {string} secret - Expected webhook secret for validation
 * @returns {Promise<Object>} Response to send back to Vapi
 */
export async function handleVapiWebhook(body, secret) {
  const { message } = body || {}

  if (!message || !message.type) {
    logger.warn('[AlexVoiceWH] Invalid webhook body — no message.type')
    return { error: 'invalid_body' }
  }

  const callId = message.call?.id || message.callId || null

  switch (message.type) {
    case 'tool-calls':
      return handleToolCalls(message, callId)

    case 'end-of-call-report':
      return handleCallEnded(message, callId)

    case 'status-update':
      return handleStatusUpdate(message, callId)

    case 'speech-update':
    case 'transcript':
    case 'hang':
    case 'conversation-update':
      // Acknowledged but not processed
      return { ok: true }

    default:
      logger.info(`[AlexVoiceWH] Unhandled event: ${message.type}`)
      return { ok: true }
  }
}

/**
 * Handle Vapi tool-calls — execute custom tools and return results.
 *
 * @param {Object} message
 * @param {string} callId
 * @returns {Promise<Object>} Tool results for Vapi
 */
async function handleToolCalls(message, callId) {
  const toolCalls = message.toolCalls || message.toolCallList || []
  const results = []

  for (const toolCall of toolCalls) {
    const { id: toolCallId, function: fn } = toolCall
    const toolName = fn?.name
    const args = fn?.arguments || {}

    logger.info(`[AlexVoiceWH] Tool call: ${toolName}`, { callId, args })

    let result
    try {
      switch (toolName) {
        case 'scheduleCallback':
          result = await executeScheduleCallback(callId, args)
          break
        case 'markAsInterested':
          result = await executeMarkAsInterested(callId, args)
          break
        case 'markAsDisqualified':
          result = await executeMarkAsDisqualified(callId, args)
          break
        case 'transferToHuman':
          result = await executeTransferToHuman(callId, args)
          break
        default:
          result = { success: false, error: `Unknown tool: ${toolName}` }
      }
    } catch (err) {
      logger.error(`[AlexVoiceWH] Tool ${toolName} failed:`, err.message)
      result = { success: false, error: err.message }
    }

    results.push({
      toolCallId,
      result: JSON.stringify(result),
    })
  }

  return { results }
}

/**
 * Handle end-of-call-report — update Firestore, route to pipeline.
 *
 * @param {Object} message
 * @param {string} callId
 */
async function handleCallEnded(message, callId) {
  if (!callId) {
    logger.warn('[AlexVoiceWH] end-of-call-report without callId')
    return { ok: true }
  }

  const db = getDb()
  const callRef = db.collection('voiceCalls').doc(callId)
  const callDoc = await callRef.get()

  if (!callDoc.exists) {
    logger.warn(`[AlexVoiceWH] Call ${callId} not found in Firestore`)
    return { ok: true }
  }

  const callData = callDoc.data()
  const { leadId, orgId, collection = 'prospects' } = callData

  // Extract data from Vapi report
  const endedReason = message.endedReason || message.call?.endedReason || 'unknown'
  const duration = message.call?.duration || message.durationSeconds || 0
  const transcript = message.transcript || message.artifact?.transcript || ''
  const summary = message.analysis?.summary || message.artifact?.summary || ''
  const structuredData = message.analysis?.structuredData || {}
  const successEval = message.analysis?.successEvaluation || null
  const recordingUrl = message.recordingUrl || message.artifact?.recordingUrl || null

  // Determine lead status from call result
  const leadStatus = determineLeadStatus(endedReason, structuredData, duration)

  // Update voiceCalls document
  try {
    await callRef.update({
      status: 'completed',
      endedReason,
      duration,
      transcript,
      summary,
      structuredData,
      successEvaluation: successEval,
      recordingUrl,
      leadStatus,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    logger.error(`[AlexVoiceWH] Failed to update call ${callId}:`, err.message)
  }

  // Update lead document
  if (leadId && orgId) {
    try {
      const leadRef = db
        .collection('organizations').doc(orgId)
        .collection(collection).doc(leadId)

      const leadUpdate = {
        lastVoiceCallStatus: leadStatus,
        lastVoiceCallDuration: duration,
        lastVoiceCallSummary: summary || null,
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (leadStatus === 'interested' || leadStatus === 'hot') {
        leadUpdate.alexStatus = 'hot'
        leadUpdate.alexCategory = 'hot'
      } else if (leadStatus === 'callback') {
        leadUpdate.alexStatus = 'warm'
      } else if (leadStatus === 'not_interested' || leadStatus === 'disqualified') {
        leadUpdate.alexStatus = 'ice'
      }

      await leadRef.update(leadUpdate)
    } catch (err) {
      logger.warn(`[AlexVoiceWH] Lead update failed for ${leadId}:`, err.message)
    }
  }

  // Add to pipeline if interested
  if (leadStatus === 'interested' || leadStatus === 'hot') {
    try {
      await db.collection('organizations').doc(orgId)
        .collection('pipeline').add({
          leadId,
          source: 'alex_voice',
          callId,
          status: 'qualified',
          summary,
          structuredData,
          createdAt: FieldValue.serverTimestamp(),
        })
      logger.info(`[AlexVoiceWH] Lead ${leadId} added to pipeline (${leadStatus})`)
    } catch (err) {
      logger.warn('[AlexVoiceWH] Pipeline add failed:', err.message)
    }
  }

  // Schedule retry if no answer
  if (leadStatus === 'no_answer' && callData.trigger !== 'retry') {
    try {
      await db.collection('scheduledCalls').add({
        leadId,
        orgId,
        collection: collection,
        trigger: 'retry',
        scheduledFor: getRetryDate(),
        status: 'pending',
        previousCallId: callId,
        createdAt: FieldValue.serverTimestamp(),
      })
      logger.info(`[AlexVoiceWH] Retry scheduled for lead ${leadId}`)
    } catch (err) {
      logger.warn('[AlexVoiceWH] Retry scheduling failed:', err.message)
    }
  }

  return { ok: true }
}

/**
 * Handle status-update — track call progress.
 */
async function handleStatusUpdate(message, callId) {
  if (!callId) return { ok: true }

  const status = message.status || 'unknown'
  const db = getDb()

  try {
    await db.collection('voiceCalls').doc(callId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    // Non-blocking — doc may not exist yet
    logger.debug(`[AlexVoiceWH] Status update for ${callId}: ${status}`)
  }

  return { ok: true }
}

// ============================================
// Tool Executors
// ============================================

async function executeScheduleCallback(callId, args) {
  const db = getDb()
  const callDoc = await db.collection('voiceCalls').doc(callId).get()
  if (!callDoc.exists) return { success: false, error: 'call_not_found' }

  const { leadId, orgId, collection = 'prospects' } = callDoc.data()

  await db.collection('scheduledCalls').add({
    leadId,
    orgId,
    collection,
    trigger: 'callback',
    scheduledFor: args.callbackDate ? new Date(args.callbackDate) : getRetryDate(),
    reason: args.reason || 'prospect_requested',
    status: 'pending',
    previousCallId: callId,
    createdAt: FieldValue.serverTimestamp(),
  })

  await db.collection('voiceCalls').doc(callId).update({
    callbackScheduled: true,
    callbackReason: args.reason,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`[AlexVoiceWH] Callback scheduled for lead ${leadId}`)
  return { success: true, message: 'Rappel programme' }
}

async function executeMarkAsInterested(callId, args) {
  const db = getDb()
  const callDoc = await db.collection('voiceCalls').doc(callId).get()
  if (!callDoc.exists) return { success: false, error: 'call_not_found' }

  const { leadId, orgId, collection = 'prospects' } = callDoc.data()

  await db.collection('voiceCalls').doc(callId).update({
    leadStatus: args.interestLevel || 'warm',
    interestNotes: args.notes || null,
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (leadId && orgId) {
    await db.collection('organizations').doc(orgId)
      .collection(collection).doc(leadId)
      .update({
        alexStatus: args.interestLevel === 'hot' ? 'hot' : 'warm',
        alexCategory: args.interestLevel === 'hot' ? 'hot' : 'warm',
        voiceInterestLevel: args.interestLevel,
        updatedAt: FieldValue.serverTimestamp(),
      })
  }

  logger.info(`[AlexVoiceWH] Lead ${leadId} marked as ${args.interestLevel}`)
  return { success: true, message: 'Interet note' }
}

async function executeMarkAsDisqualified(callId, args) {
  const db = getDb()
  const callDoc = await db.collection('voiceCalls').doc(callId).get()
  if (!callDoc.exists) return { success: false, error: 'call_not_found' }

  const { leadId, orgId, collection = 'prospects' } = callDoc.data()

  await db.collection('voiceCalls').doc(callId).update({
    leadStatus: 'disqualified',
    disqualifyReason: args.reason,
    disqualifyDetails: args.details || null,
    updatedAt: FieldValue.serverTimestamp(),
  })

  if (leadId && orgId) {
    const updateData = {
      alexStatus: 'disqualified',
      voiceDisqualifyReason: args.reason,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (args.reason === 'do_not_call') {
      updateData.doNotCall = true
    }
    await db.collection('organizations').doc(orgId)
      .collection(collection).doc(leadId)
      .update(updateData)
  }

  logger.info(`[AlexVoiceWH] Lead ${leadId} disqualified: ${args.reason}`)
  return { success: true, message: 'Note, merci' }
}

async function executeTransferToHuman(callId, args) {
  const db = getDb()
  const callDoc = await db.collection('voiceCalls').doc(callId).get()
  if (!callDoc.exists) return { success: false, error: 'call_not_found' }

  const { leadId, orgId, collection = 'prospects' } = callDoc.data()

  await db.collection('voiceCalls').doc(callId).update({
    transferRequested: true,
    transferReason: args.reason,
    transferUrgency: args.urgency || 'normal',
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add escalation to pipeline
  if (leadId && orgId) {
    await db.collection('organizations').doc(orgId)
      .collection('pipeline').add({
        leadId,
        source: 'alex_voice_transfer',
        callId,
        status: 'escalated',
        reason: args.reason,
        urgency: args.urgency || 'normal',
        createdAt: FieldValue.serverTimestamp(),
      })
  }

  logger.info(`[AlexVoiceWH] Transfer requested for lead ${leadId}: ${args.reason}`)
  return { success: true, message: 'Transfert en cours' }
}

// ============================================
// Helpers
// ============================================

/**
 * Determine lead status from call result.
 */
function determineLeadStatus(endedReason, structuredData, duration) {
  // No answer / voicemail
  if (['no-answer', 'voicemail', 'busy'].includes(endedReason)) {
    return 'no_answer'
  }

  // Very short call (< 10s) = likely hung up
  if (duration < 10) {
    return 'hung_up'
  }

  // Use structured data if available
  if (structuredData?.interested === true) {
    return 'interested'
  }
  if (structuredData?.interested === false) {
    return 'not_interested'
  }
  if (structuredData?.callbackRequested) {
    return 'callback'
  }

  // Default based on duration
  if (duration > 120) return 'engaged' // 2+ min conversation
  if (duration > 30) return 'talked'

  return 'short_call'
}

/**
 * Calculate retry date (next business day, random morning slot).
 */
function getRetryDate() {
  const d = new Date()
  // Add 1-3 business days
  const daysToAdd = 1 + Math.floor(Math.random() * 3)
  d.setDate(d.getDate() + daysToAdd)

  // Skip weekends
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }

  // Random morning slot 9h-11h30
  d.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0)
  return d
}
