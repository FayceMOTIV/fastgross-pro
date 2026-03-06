/**
 * Vapi Outbound — Automated outbound calling via Vapi API
 * Scheduled at 10h and 14h on weekdays
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Check if current time is within calling hours
 */
function isCallingHours() {
  const now = new Date()
  const parisHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Paris' }))
  const day = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'Europe/Paris' })
  if (['Sat', 'Sun'].includes(day)) return false
  return parisHour >= 9 && parisHour <= 18
}

/**
 * Make a Vapi outbound call
 */
async function makeVapiCall(phone, systemPrompt, firstMessage, vapiKey) {
  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: phone },
      assistant: {
        model: {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          systemPrompt,
        },
        firstMessage,
        voice: {
          provider: 'elevenlabs',
          voiceId: process.env.ELEVENLABS_VOICE_ID || 'default-fr',
        },
        endCallFunctionEnabled: true,
        maxDurationSeconds: 180,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vapi call failed: ${error}`)
  }

  return response.json()
}

/**
 * Scheduled: 10h and 14h weekdays
 * Query high-score leads with phone numbers for outbound calls
 */
export const vapiOutbound = onSchedule({
  schedule: '0 10,14 * * 1-5',
  region: 'europe-west1',
  timeZone: 'Europe/Paris',
  timeoutSeconds: 300,
  memory: '512MiB',
}, async () => {
  if (!isCallingHours()) return

  const vapiKey = process.env.VAPI_API_KEY
  if (!vapiKey) {
    console.log(JSON.stringify({ event: 'vapi_not_configured' }))
    return
  }

  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id
    const orgData = orgDoc.data()

    if (!orgData.channels?.voicemail?.enabled) continue

    try {
      // Find callable leads: score > 85, has phone, not called in 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const prospectsSnap = await db
        .collection('organizations').doc(orgId).collection('prospects')
        .where('score', '>=', 8.5) // 85 in display
        .where('crmColumn', 'in', ['INTERESTED', 'CONTACTED'])
        .limit(20)
        .get()

      let callsMade = 0
      const maxCalls = orgData.dailyBudget?.channels?.voicemail || 20

      for (const prospectDoc of prospectsSnap.docs) {
        if (callsMade >= maxCalls) break

        const prospect = prospectDoc.data()
        if (!prospect.phone) continue

        // Check if already called recently
        const lastCall = prospect.lastCallAt?.toDate?.() || null
        if (lastCall && lastCall > sevenDaysAgo) continue

        const systemPrompt = orgData.voiceScript?.systemPrompt ||
          `Tu es un assistant commercial professionnel de ${orgData.name || 'notre entreprise'}. Tu appelles pour proposer un rendez-vous de decouverte. Sois chaleureux, concis et professionnel. Si la personne est interessee, propose un creneau cette semaine. Si elle n'est pas disponible, demande quand la rappeler. Maximum 2 minutes.`

        const firstName = prospect.firstName || 'Monsieur/Madame'
        const firstMessage = orgData.voiceScript?.firstMessage ||
          `Bonjour ${firstName}, c'est ${orgData.name || 'FaceMedia'}. Je me permets de vous appeler suite a notre echange par email. Avez-vous 2 minutes ?`

        try {
          const callResult = await makeVapiCall(prospect.phone, systemPrompt, firstMessage, vapiKey)

          await prospectDoc.ref.update({
            lastCallAt: FieldValue.serverTimestamp(),
            lastCallId: callResult.id || null,
            updatedAt: FieldValue.serverTimestamp(),
          })

          await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
            prospectId: prospectDoc.id,
            type: 'voice_call',
            content: `Appel sortant initie via Vapi`,
            channel: 'voice',
            callId: callResult.id || null,
            createdAt: FieldValue.serverTimestamp(),
          })

          callsMade++
        } catch (callError) {
          console.error(JSON.stringify({
            event: 'vapi_call_error',
            orgId,
            prospectId: prospectDoc.id,
            error: callError.message,
          }))
        }
      }

      if (callsMade > 0) {
        console.log(JSON.stringify({
          event: 'vapi_outbound_complete',
          orgId,
          callsMade,
        }))
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'vapi_outbound_error',
        orgId,
        error: error.message,
      }))
    }
  }
})
