/**
 * Alex Voice - Appels vocaux IA via ElevenLabs + Retell + Twilio
 *
 * Business Plan only. Alex passe de vrais appels telephoniques.
 *
 * Stack:
 *   - Groq llama-3.3-70b : conversation / analyse transcript
 *   - ElevenLabs : synthese vocale (voice clone)
 *   - Retell : orchestration appel (turn-taking, silences, interruptions)
 *   - Twilio : telephonie (SIP trunk)
 *
 * Max 3 minutes par appel.
 * Fin d'appel sur phrases hostiles.
 * Transcript sauvegarde dans contactHistory.
 *
 * Outcomes: meeting_booked, callback_requested, not_interested, no_answer, voicemail
 *
 * Variables: ELEVENLABS_API_KEY, RETELL_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../ai/callAI.js'

const getDb = () => getFirestore()

const MAX_CALL_DURATION_SEC = 180
const RETELL_API_BASE = 'https://api.retellai.com'

const HOSTILE_PHRASES = [
  'arretez de m appeler', 'stop', 'ne rappelez plus', 'harcelement',
  'je vais porter plainte', 'liste noire', 'rgpd', 'supprimez mon numero',
  'do not call', 'unsubscribe', 'stop calling'
]

const VALID_OUTCOMES = ['meeting_booked', 'callback_requested', 'not_interested', 'no_answer', 'voicemail']

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'alexVoice', event, ...data, timestamp: new Date().toISOString() }))

/**
 * Cree un appel vocal via Retell AI pour un lead.
 * Configure l'agent Retell avec le prompt Alex + voice ElevenLabs + Twilio trunk.
 *
 * @param {Object} lead - Le lead a appeler (id, name, company, phone, orgId)
 * @param {Object} clientConfig - Config organisation (niche, companyName, voiceId, language)
 * @returns {Promise<{success: boolean, callId?: string, error?: string}>}
 */
export async function initiateAlexVoiceCall(lead, clientConfig) {
  const orgId = lead?.orgId || clientConfig?.orgId

  if (!lead?.phone || !orgId) {
    log('error', { error: 'Missing phone or orgId' })
    return { success: false, error: 'missing_params' }
  }

  const retellKey = process.env.RETELL_API_KEY
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER

  if (!retellKey || !twilioSid || !twilioFrom) {
    log('error', { error: 'Missing voice call credentials' })
    return { success: false, error: 'missing_credentials' }
  }

  try {
    const agentPrompt = buildCallScript(lead, clientConfig)

    const response = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retellKey}`
      },
      body: JSON.stringify({
        from_number: twilioFrom,
        to_number: lead.phone,
        agent_id: clientConfig?.retellAgentId || undefined,
        override_agent_config: {
          prompt: agentPrompt,
          language: clientConfig?.language || 'fr',
          voice_id: clientConfig?.voiceId || undefined,
          max_call_duration_sec: MAX_CALL_DURATION_SEC,
          end_call_phrases: HOSTILE_PHRASES
        },
        metadata: {
          leadId: lead.id,
          orgId,
          source: 'alexVoice'
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      log('retell_error', { status: response.status, error: data })
      return { success: false, error: data?.message || 'retell_api_error' }
    }

    const db = getDb()
    await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId: lead.id,
      channel: 'voice',
      direction: 'outbound',
      source: 'alexVoice',
      callId: data.call_id,
      status: 'initiated',
      createdAt: FieldValue.serverTimestamp()
    })

    log('call_initiated', { leadId: lead.id, callId: data.call_id, orgId })
    return { success: true, callId: data.call_id }
  } catch (error) {
    log('call_error', { leadId: lead.id, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Traite les evenements webhook Retell (fin d'appel, transcript, erreurs).
 * Sauvegarde le transcript et le resultat dans Firestore.
 *
 * @param {Object} payload - Payload webhook Retell
 * @returns {Promise<{success: boolean, outcome?: string, error?: string}>}
 */
export async function handleCallWebhook(payload) {
  if (!payload?.call_id) {
    log('webhook_invalid', { error: 'Missing call_id' })
    return { success: false, error: 'missing_call_id' }
  }

  const { call_id, event, transcript, call_status, metadata } = payload
  const orgId = metadata?.orgId
  const leadId = metadata?.leadId

  if (!orgId || !leadId) {
    log('webhook_no_metadata', { callId: call_id })
    return { success: false, error: 'missing_metadata' }
  }

  log('webhook_received', { callId: call_id, event, status: call_status })

  try {
    const db = getDb()
    const interactionsRef = db.collection(`organizations/${orgId}/interactions`)

    const snap = await interactionsRef
      .where('callId', '==', call_id)
      .limit(1)
      .get()

    if (snap.empty) {
      log('webhook_no_interaction', { callId: call_id })
      return { success: false, error: 'interaction_not_found' }
    }

    const interactionRef = snap.docs[0].ref

    if (event === 'call_ended' || call_status === 'ended') {
      const outcome = transcript ? await extractCallOutcome(transcript) : 'no_answer'

      await interactionRef.update({
        status: 'completed',
        transcript: transcript || null,
        outcome,
        duration: payload.duration_sec || null,
        endedAt: FieldValue.serverTimestamp()
      })

      log('call_completed', { callId: call_id, leadId, outcome, duration: payload.duration_sec })
      return { success: true, outcome }
    }

    await interactionRef.update({
      status: call_status || event,
      updatedAt: FieldValue.serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    log('webhook_error', { callId: call_id, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Analyse le transcript d'un appel et determine le resultat via Groq.
 *
 * @param {string} transcript - Transcript complet de l'appel
 * @returns {Promise<string>} Outcome: meeting_booked | callback_requested | not_interested | no_answer | voicemail
 */
export async function extractCallOutcome(transcript) {
  if (!transcript || transcript.trim().length < 10) {
    return 'no_answer'
  }

  try {
    const prompt = `Analyse ce transcript d'appel commercial et determine le resultat.
Reponds UNIQUEMENT en JSON : { "outcome": "...", "reason": "..." }

Outcomes possibles:
- meeting_booked : le prospect a accepte un RDV
- callback_requested : le prospect veut etre rappele plus tard
- not_interested : refus clair
- voicemail : repondeur / messagerie
- no_answer : pas de reponse significative

Transcript:
${transcript.slice(0, 3000)}` // Tronquer si trop long

    const result = await callAI(prompt, 200)
    const parsed = extractJSON(result)

    if (parsed?.outcome && VALID_OUTCOMES.includes(parsed.outcome)) {
      log('outcome_extracted', { outcome: parsed.outcome, reason: parsed.reason })
      return parsed.outcome
    }

    return 'not_interested'
  } catch (error) {
    log('outcome_extraction_error', { error: error.message })
    return 'not_interested'
  }
}

/**
 * Construit le script de conversation pour l'agent Alex
 * @param {Object} lead - Le lead
 * @param {Object} clientConfig - Config client
 * @returns {string} Prompt agent
 */
function buildCallScript(lead, clientConfig) {
  const companyName = clientConfig?.companyName || 'notre entreprise'
  const niche = clientConfig?.niche || 'services B2B'
  const lang = clientConfig?.language || 'fr'

  return `Tu es Alex, assistant commercial de ${companyName}.
Tu appelles ${lead.name || 'le prospect'} de ${lead.company || 'son entreprise'}.
Secteur: ${niche}. Langue: ${lang === 'fr' ? 'francais' : lang}.

Regles:
- Sois naturel, humain, pas robotique
- Presente-toi en 1 phrase, pose 1 question ouverte
- Ecoute plus que tu ne parles
- Objectif: proposer un RDV de 15min
- Si le prospect refuse, propose un rappel ou un email
- Ne force jamais, reste respectueux
- Max 3 minutes
- Si hostilite, remercie et raccroche poliment`
}
