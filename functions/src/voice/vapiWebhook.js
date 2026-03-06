/**
 * Vapi Webhook — Process call completion events
 * Parses transcript, analyzes with AI, updates prospect
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'

const getDb = () => getFirestore()

/**
 * HTTP Webhook: Vapi Call Events
 */
export const vapiWebhook = onRequest({
  region: 'europe-west1',
  cors: true,
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const { message } = req.body

  // Only process end-of-call events
  if (message?.type !== 'end-of-call-report') {
    res.status(200).send('OK')
    return
  }

  const {
    call,
    transcript,
    summary,
    endedReason,
    recordingUrl,
    costBreakdown,
  } = message

  const callId = call?.id
  const phoneNumber = call?.customer?.number
  const duration = call?.duration || 0

  if (!callId || !phoneNumber) {
    res.status(200).send('OK - missing data')
    return
  }

  const db = getDb()

  try {
    // Find prospect by callId or phone
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id

      // Try to match by lastCallId
      let prospectsSnap = await db
        .collection('organizations').doc(orgId).collection('prospects')
        .where('lastCallId', '==', callId)
        .limit(1)
        .get()

      // Fallback: match by phone
      if (prospectsSnap.empty) {
        prospectsSnap = await db
          .collection('organizations').doc(orgId).collection('prospects')
          .where('phone', '==', phoneNumber)
          .limit(1)
          .get()
      }

      if (prospectsSnap.empty) continue

      const prospectDoc = prospectsSnap.docs[0]

      // Analyze transcript with AI
      let analysis = { intent: 'unknown', objections: [], nextAction: 'follow_up' }
      if (transcript) {
        try {
          const aiResponse = await callAI(
            `Analyse ce transcript d'appel commercial et reponds en JSON strict:
{
  "intent": "interested|not_interested|callback|meeting|undecided",
  "objections": ["objection1", "objection2"],
  "nextAction": "schedule_meeting|send_info|callback_later|close|nurture",
  "callbackDate": "date si mentionnee ou null",
  "keyInsight": "insight principal en 1 phrase"
}

Transcript:
${transcript.slice(0, 2000)}`,
            300
          )
          const cleaned = aiResponse.replace(/```json\n?|\n?```/g, '').trim()
          analysis = JSON.parse(cleaned)
        } catch {
          // Use default analysis
        }
      }

      // Determine CRM action
      let crmUpdate = {
        callTranscript: transcript?.slice(0, 5000) || '',
        callDuration: duration,
        callOutcome: analysis.intent,
        callRecordingUrl: recordingUrl || null,
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (analysis.intent === 'interested' || analysis.intent === 'meeting') {
        crmUpdate.crmColumn = 'INTERESTED'
      }

      await prospectDoc.ref.update(crmUpdate)

      // Log interaction
      await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
        prospectId: prospectDoc.id,
        type: 'voice_call_complete',
        content: summary || `Appel ${duration}s - ${analysis.intent}`,
        channel: 'voice',
        callId,
        duration,
        outcome: analysis.intent,
        objections: analysis.objections || [],
        nextAction: analysis.nextAction,
        createdAt: FieldValue.serverTimestamp(),
      })

      // If interested, send booking link via SMS
      if (analysis.intent === 'interested' || analysis.intent === 'meeting') {
        await db.collection('organizations').doc(orgId).collection('notifications').add({
          type: 'voice_interested',
          prospectId: prospectDoc.id,
          message: `Appel positif avec ${prospectDoc.data().firstName || 'prospect'} - ${analysis.keyInsight || 'interesse'}`,
          priority: 'high',
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        })
      }

      console.log(JSON.stringify({
        event: 'vapi_call_processed',
        orgId,
        prospectId: prospectDoc.id,
        duration,
        intent: analysis.intent,
      }))

      break
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'vapi_webhook_error',
      error: error.message,
    }))
    res.status(500).json({ error: error.message })
  }
})
