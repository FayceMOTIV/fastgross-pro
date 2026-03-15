/**
 * Voice Cloud Functions — initiateVoiceCall, vapiCallbackWebhook, autoVoiceCallTrigger
 *
 * IMPORTANT: These use DIFFERENT names from the existing vapiOutbound/vapiWebhook
 * to avoid conflicts in index.js exports.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { launchVoiceCall, processVapiWebhookEvent } from './voiceEngine.js'
import { callAI } from '../ai/callAI.js'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

// ---------------------------------------------------------------------------
// 1. initiateVoiceCall — onCall (manual trigger from UI)
// ---------------------------------------------------------------------------

/**
 * Launch a voice call for a specific lead
 *
 * @param {string} data.leadId - Lead document ID
 * @param {string} data.collectionName - Firestore collection ('prospects' default)
 * @param {string} [data.orgId] - Organization ID (from auth context)
 */
export const initiateVoiceCall = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { leadId, collectionName = 'prospects' } = request.data || {}

  if (!leadId) {
    throw new HttpsError('invalid-argument', 'leadId est requis')
  }

  const db = getDb()
  const uid = request.auth.uid

  // Get user profile to find orgId
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Profil utilisateur introuvable')
  }

  const orgId = userDoc.data().currentOrgId || userDoc.data().orgId
  if (!orgId) {
    throw new HttpsError('failed-precondition', 'Organisation non configuree')
  }

  // Fetch lead
  const leadRef = db.collection('organizations').doc(orgId).collection(collectionName).doc(leadId)
  const leadDoc = await leadRef.get()
  if (!leadDoc.exists) {
    throw new HttpsError('not-found', 'Lead introuvable')
  }

  const leadData = { id: leadDoc.id, ...leadDoc.data() }

  if (!leadData.phone) {
    throw new HttpsError('failed-precondition', 'Ce lead n\'a pas de numero de telephone')
  }

  // Check calling hours (Europe/Paris, weekdays 9h-18h)
  const now = new Date()
  const parisHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }))
  const day = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'Europe/Paris' })

  if (['Sat', 'Sun'].includes(day) || parisHour < 9 || parisHour > 18) {
    throw new HttpsError('failed-precondition', 'Appels uniquement en heures ouvrables (lun-ven, 9h-18h)')
  }

  // Get org data for context
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const orgData = orgDoc.data() || {}

  const campaignContext = {
    orgId,
    orgName: orgData.name || 'FaceMedia',
    offer: orgData.voiceScript?.offer || orgData.description || 'solutions de prospection digitale',
    tone: orgData.voiceScript?.tone || 'professionnel et chaleureux',
    niche: leadData.niche || orgData.niche || '',
    collectionName,
    webhookUrl: `https://europe-west1-face-media-factory.cloudfunctions.net/vapiCallbackWebhook`,
  }

  // Launch the call
  const result = await launchVoiceCall(leadData, campaignContext)

  // Update lead with call info
  await leadRef.update({
    lastCallId: result.callId,
    lastCallAt: FieldValue.serverTimestamp(),
    lastCallStatus: result.status,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Log call initiation to lead subcollection
  await leadRef.collection('calls').doc(result.callId).set({
    callId: result.callId,
    provider: 'vapi',
    phone: result.phone,
    status: result.status,
    initiatedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Log interaction
  await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
    prospectId: leadId,
    type: 'voice_call_initiated',
    content: `Appel vocal IA initie vers ${result.phone}`,
    channel: 'voice',
    callId: result.callId,
    initiatedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  })

  return {
    success: true,
    callId: result.callId,
    status: result.status,
    phone: result.phone,
  }
})

// ---------------------------------------------------------------------------
// 2. vapiCallbackWebhook — onRequest (HTTP webhook from Vapi)
// ---------------------------------------------------------------------------

/**
 * Receives Vapi webhook callbacks after calls complete.
 * Parses results, updates lead, creates call record, detects interest.
 *
 * Different from existing `vapiWebhook` — this one:
 * - Uses voiceEngine.processVapiWebhookEvent for normalization
 * - Writes to lead subcollection `calls/{callId}`
 * - Detects interest via AI analysis and moves lead in CRM
 */
export const vapiCallbackWebhook = onRequest({
  region: 'europe-west1',
  cors: true,
  timeoutSeconds: 120,
  memory: '512MiB',
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  // Normalize the event
  const callData = processVapiWebhookEvent(req.body)

  if (!callData) {
    res.status(200).send('OK - ignored event')
    return
  }

  // Only fully process completed calls
  if (!callData.callId) {
    res.status(200).send('OK - no callId')
    return
  }

  const db = getDb()
  const { metadata } = callData
  const orgId = metadata?.orgId
  const leadId = metadata?.leadId
  const collectionName = metadata?.collectionName || 'prospects'

  // If we have orgId + leadId from metadata, go direct
  if (orgId && leadId) {
    try {
      await processCallResult(db, orgId, leadId, collectionName, callData)
      res.status(200).json({ success: true, callId: callData.callId })
      return
    } catch (err) {
      console.error(JSON.stringify({
        event: 'vapi_callback_error',
        callId: callData.callId,
        orgId,
        leadId,
        error: err.message,
      }))
      res.status(500).json({ error: err.message })
      return
    }
  }

  // Fallback: find lead by callId across organizations
  if (callData.phone || callData.callId) {
    try {
      const orgsSnap = await db.collection('organizations').get()

      for (const orgDoc of orgsSnap.docs) {
        const foundOrgId = orgDoc.id

        // Try match by lastCallId
        let prospectsSnap = await db
          .collection('organizations').doc(foundOrgId).collection('prospects')
          .where('lastCallId', '==', callData.callId)
          .limit(1)
          .get()

        // Fallback: match by phone
        if (prospectsSnap.empty && callData.phone) {
          prospectsSnap = await db
            .collection('organizations').doc(foundOrgId).collection('prospects')
            .where('phone', '==', callData.phone)
            .limit(1)
            .get()
        }

        if (!prospectsSnap.empty) {
          const foundLeadId = prospectsSnap.docs[0].id
          await processCallResult(db, foundOrgId, foundLeadId, 'prospects', callData)
          res.status(200).json({ success: true, callId: callData.callId })
          return
        }
      }

      // No lead found — log but don't error
      console.warn(JSON.stringify({
        event: 'vapi_callback_no_lead_found',
        callId: callData.callId,
        phone: callData.phone,
      }))

      res.status(200).json({ success: true, message: 'no matching lead' })
    } catch (err) {
      console.error(JSON.stringify({
        event: 'vapi_callback_search_error',
        callId: callData.callId,
        error: err.message,
      }))
      res.status(500).json({ error: err.message })
    }
    return
  }

  res.status(200).send('OK')
})

// ---------------------------------------------------------------------------
// Helper: process a completed call result
// ---------------------------------------------------------------------------

async function processCallResult(db, orgId, leadId, collectionName, callData) {
  const leadRef = db.collection('organizations').doc(orgId).collection(collectionName).doc(leadId)

  // Analyze transcript with AI if available
  let analysis = {
    intent: 'unknown',
    objections: [],
    nextAction: 'follow_up',
    keyInsight: null,
    callbackDate: null,
  }

  if (callData.transcript && callData.status === 'completed') {
    try {
      const aiResponse = await callAI(
        `Analyse ce transcript d'appel commercial et reponds en JSON strict:
{
  "intent": "interested|not_interested|callback|meeting|undecided",
  "objections": ["liste des objections mentionnees"],
  "nextAction": "schedule_meeting|send_info|callback_later|close|nurture",
  "callbackDate": "date si mentionnee ou null",
  "keyInsight": "insight principal en 1 phrase"
}

Transcript:
${callData.transcript.slice(0, 3000)}`,
        400
      )

      const cleaned = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
      analysis = safeParseLLMJson(cleaned)
    } catch {
      // Keep default analysis
    }
  }

  const isInterested = analysis.intent === 'interested' || analysis.intent === 'meeting'

  // Update lead document
  const leadUpdate = {
    lastCallId: callData.callId,
    lastCallStatus: callData.status,
    lastCallDuration: callData.duration,
    lastCallOutcome: analysis.intent,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (callData.transcript) {
    leadUpdate.callTranscript = callData.transcript.slice(0, 5000)
  }

  if (callData.recordingUrl) {
    leadUpdate.callRecordingUrl = callData.recordingUrl
  }

  if (isInterested) {
    leadUpdate.crmColumn = 'INTERESTED'
  }

  await leadRef.update(leadUpdate)

  // Write to calls subcollection
  await leadRef.collection('calls').doc(callData.callId).set({
    callId: callData.callId,
    provider: callData.provider,
    phone: callData.phone,
    status: callData.status,
    endedReason: callData.endedReason,
    duration: callData.duration,
    transcript: callData.transcript?.slice(0, 5000) || '',
    summary: callData.summary || '',
    recordingUrl: callData.recordingUrl || null,
    cost: callData.cost,
    analysis,
    completedAt: callData.completedAt || new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // Log interaction
  await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
    prospectId: leadId,
    type: 'voice_call_complete',
    content: callData.summary || `Appel ${callData.duration}s — ${analysis.intent}`,
    channel: 'voice',
    callId: callData.callId,
    duration: callData.duration,
    outcome: analysis.intent,
    objections: analysis.objections || [],
    nextAction: analysis.nextAction,
    isInterested,
    createdAt: FieldValue.serverTimestamp(),
  })

  // If interested, create high-priority notification
  if (isInterested) {
    const leadDoc = await leadRef.get()
    const leadName = leadDoc.data()?.firstName || 'Prospect'

    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'voice_call_interested',
      prospectId: leadId,
      message: `Appel positif avec ${leadName} — ${analysis.keyInsight || 'interesse par un RDV'}`,
      priority: 'high',
      callId: callData.callId,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    })
  }

  console.log(JSON.stringify({
    event: 'vapi_callback_processed',
    orgId,
    leadId,
    callId: callData.callId,
    status: callData.status,
    intent: analysis.intent,
    duration: callData.duration,
    isInterested,
  }))
}

// ---------------------------------------------------------------------------
// 3. autoVoiceCallTrigger — onCall (batch trigger for stale leads)
// ---------------------------------------------------------------------------

/**
 * Finds leads that were contacted 48h+ ago with no response and have a phone number,
 * then launches voice calls for them.
 *
 * @param {number} [data.maxCalls=10] - Maximum number of calls to launch
 * @param {string} [data.collectionName='prospects'] - Collection to search
 */
export const autoVoiceCallTrigger = onCall({
  region: 'europe-west1',
  timeoutSeconds: 300,
  memory: '1GiB',
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { maxCalls = 10, collectionName = 'prospects' } = request.data || {}

  const db = getDb()
  const uid = request.auth.uid

  // Get user org
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Profil utilisateur introuvable')
  }

  const orgId = userDoc.data().currentOrgId || userDoc.data().orgId
  if (!orgId) {
    throw new HttpsError('failed-precondition', 'Organisation non configuree')
  }

  // Check calling hours
  const now = new Date()
  const parisHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }))
  const day = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'Europe/Paris' })

  if (['Sat', 'Sun'].includes(day) || parisHour < 9 || parisHour > 18) {
    throw new HttpsError('failed-precondition', 'Appels uniquement en heures ouvrables (lun-ven, 9h-18h)')
  }

  // Check Vapi config
  if (!process.env.VAPI_API_KEY) {
    throw new HttpsError('failed-precondition', 'VAPI_API_KEY non configure')
  }

  // Get org data
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const orgData = orgDoc.data() || {}

  // Find stale leads: contacted 48h+ ago, status CONTACTED, has phone, no recent call
  const twoDaysAgo = new Date()
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const prospectsSnap = await db
    .collection('organizations').doc(orgId).collection(collectionName)
    .where('crmColumn', '==', 'CONTACTED')
    .where('updatedAt', '<=', twoDaysAgo)
    .limit(maxCalls * 3) // Fetch more to filter
    .get()

  const campaignContext = {
    orgId,
    orgName: orgData.name || 'FaceMedia',
    offer: orgData.voiceScript?.offer || orgData.description || 'solutions de prospection digitale',
    tone: orgData.voiceScript?.tone || 'professionnel et chaleureux',
    niche: orgData.niche || '',
    collectionName,
    webhookUrl: `https://europe-west1-face-media-factory.cloudfunctions.net/vapiCallbackWebhook`,
  }

  const results = {
    launched: 0,
    skipped: 0,
    errors: 0,
    calls: [],
  }

  for (const prospectDoc of prospectsSnap.docs) {
    if (results.launched >= maxCalls) break

    const prospect = prospectDoc.data()

    // Must have phone
    if (!prospect.phone) {
      results.skipped++
      continue
    }

    // Skip if called in last 7 days
    const lastCallAt = prospect.lastCallAt?.toDate?.() || null
    if (lastCallAt && lastCallAt > sevenDaysAgo) {
      results.skipped++
      continue
    }

    try {
      const leadData = { id: prospectDoc.id, ...prospect }
      const callResult = await launchVoiceCall(leadData, campaignContext)

      // Update lead
      await prospectDoc.ref.update({
        lastCallId: callResult.callId,
        lastCallAt: FieldValue.serverTimestamp(),
        lastCallStatus: callResult.status,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Log to subcollection
      await prospectDoc.ref.collection('calls').doc(callResult.callId).set({
        callId: callResult.callId,
        provider: 'vapi',
        phone: callResult.phone,
        status: callResult.status,
        initiatedBy: 'auto_trigger',
        createdAt: FieldValue.serverTimestamp(),
      })

      results.launched++
      results.calls.push({
        leadId: prospectDoc.id,
        callId: callResult.callId,
        phone: callResult.phone,
      })
    } catch (err) {
      results.errors++
      console.error(JSON.stringify({
        event: 'auto_voice_call_error',
        orgId,
        leadId: prospectDoc.id,
        error: err.message,
      }))
    }
  }

  console.log(JSON.stringify({
    event: 'auto_voice_trigger_complete',
    orgId,
    ...results,
  }))

  return {
    success: true,
    ...results,
  }
})
