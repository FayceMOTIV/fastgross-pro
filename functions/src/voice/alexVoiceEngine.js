/**
 * alexVoiceEngine.js — Core engine for Alex Voice outbound calls
 *
 * Orchestrates the full call lifecycle:
 *   1. Pre-call checks (phone, legal hours, 30-day limit, negative lead filter)
 *   2. Build transient Vapi assistant (context per-call, not saved)
 *   3. Launch call via Vapi API
 *   4. Record call in Firestore
 *
 * Stack: Vapi (orchestration) + ElevenLabs (voice) + Groq (brain) + Deepgram (transcription)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { buildAlexVoicePrompt } from './alexVoicePromptBuilder.js'
import { buildVapiTools } from './alexVoiceTools.js'
import { isCallAllowed, getNextLegalWindow } from './callScheduler.js'

const getDb = () => getFirestore()

// Vapi config
const VAPI_BASE_URL = 'https://api.vapi.ai'
const WEBHOOK_BASE_URL = `https://europe-west1-face-media-factory.cloudfunctions.net/alexVoiceWebhook`

// Voice config (ElevenLabs cloned voice)
const DEFAULT_VOICE_CONFIG = {
  provider: '11labs',
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Alex male FR
  stability: 0.6,
  similarityBoost: 0.78,
  speed: 1.05,
}

// Model config (Groq)
const DEFAULT_MODEL_CONFIG = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.4,
  maxTokens: 150,
}

/**
 * Initiate an Alex Voice call to a lead.
 *
 * @param {Object} lead - Lead data from Firestore
 * @param {Object} options
 * @param {string} options.orgId - Organization ID
 * @param {string} options.leadId - Lead document ID
 * @param {string} [options.trigger='manual'] - What triggered the call (manual, j3_noreply, campaign)
 * @param {string} [options.collection='prospects'] - Firestore collection name
 * @returns {Promise<Object>} Call result
 */
export async function initiateAlexCall(lead, options = {}) {
  const { orgId, leadId, trigger = 'manual', collection = 'prospects' } = options

  if (!orgId || !leadId) {
    return { success: false, error: 'orgId and leadId required' }
  }

  // ---- Pre-call check 1: Phone number ----
  const phone = normalizePhone(lead.phone || lead.telephone || lead.tel)
  if (!phone) {
    logger.warn(`[AlexVoice] No valid phone for lead ${leadId}`)
    return { success: false, error: 'no_valid_phone' }
  }

  // ---- Pre-call check 2: Legal hours (CNIL) ----
  const legalCheck = isCallAllowed()
  if (!legalCheck.allowed) {
    const nextWindow = getNextLegalWindow()
    logger.info(`[AlexVoice] Call not allowed now (${legalCheck.reason}), next window: ${nextWindow.toISOString()}`)
    return {
      success: false,
      error: 'outside_legal_hours',
      reason: legalCheck.reason,
      nextWindow: nextWindow.toISOString(),
    }
  }

  // ---- Pre-call check 3: 30-day limit ----
  const recentCall = await checkCallHistory(leadId)
  if (recentCall) {
    logger.info(`[AlexVoice] Lead ${leadId} already called within 30 days`)
    return { success: false, error: 'called_within_30_days', lastCallDate: recentCall }
  }

  // ---- Pre-call check 4: Negative lead filter ----
  if (isNegativeLead(lead)) {
    logger.info(`[AlexVoice] Lead ${leadId} is negative, skipping call`)
    return { success: false, error: 'negative_lead' }
  }

  // ---- Build transient assistant ----
  const vapiApiKey = process.env.VAPI_API_KEY
  if (!vapiApiKey) {
    logger.error('[AlexVoice] VAPI_API_KEY not configured')
    return { success: false, error: 'vapi_not_configured' }
  }

  let systemPrompt
  try {
    systemPrompt = await buildAlexVoicePrompt(lead, orgId)
  } catch (err) {
    logger.error('[AlexVoice] Failed to build voice prompt:', err.message)
    return { success: false, error: 'prompt_build_failed' }
  }

  const firstMessage = buildFirstMessage(lead)
  const tools = buildVapiTools(WEBHOOK_BASE_URL)

  const assistantConfig = {
    name: `alex-voice-${leadId}`,
    model: {
      ...DEFAULT_MODEL_CONFIG,
      messages: [
        { role: 'system', content: systemPrompt },
      ],
      tools,
    },
    voice: { ...DEFAULT_VOICE_CONFIG },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'fr',
    },
    firstMessage,
    endCallMessage: 'Merci pour votre temps, bonne journee!',
    serverUrl: WEBHOOK_BASE_URL,
    silenceTimeoutSeconds: 15,
    maxDurationSeconds: 300,
    backgroundSound: 'off',
    analysisPlan: {
      summaryPrompt: 'Resume cet appel commercial en 3 lignes max. Inclus: interet du prospect, objections, prochaine etape.',
      structuredDataPrompt: 'Extrais: { "interested": bool, "objections": [string], "nextStep": string, "sentiment": "positive"|"neutral"|"negative", "callbackRequested": bool }',
      successEvaluationPrompt: 'L\'appel est reussi si: RDV pris, interet exprime, ou callback programme. Echoue si: raccrohe, pas interesse, ou injoignable.',
    },
  }

  // ---- Launch Vapi call ----
  let vapiResponse
  try {
    const response = await fetch(`${VAPI_BASE_URL}/call/phone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistant: assistantConfig,
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phone,
          name: lead.name || lead.nom || lead.firstName || undefined,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Vapi API ${response.status}: ${errText}`)
    }

    vapiResponse = await response.json()
    logger.info(`[AlexVoice] Call launched: ${vapiResponse.id} → ${phone}`)
  } catch (err) {
    logger.error('[AlexVoice] Vapi call failed:', err.message)
    return { success: false, error: 'vapi_call_failed', details: err.message }
  }

  // ---- Record in Firestore ----
  try {
    const db = getDb()
    await db.collection('voiceCalls').doc(vapiResponse.id).set({
      callId: vapiResponse.id,
      leadId,
      orgId,
      collection,
      phone,
      trigger,
      status: 'initiated',
      leadName: lead.name || lead.nom || lead.firstName || null,
      leadCompany: lead.company || lead.companyName || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Update lead document
    await db
      .collection('organizations').doc(orgId)
      .collection(collection).doc(leadId)
      .update({
        lastVoiceCallId: vapiResponse.id,
        lastVoiceCallAt: FieldValue.serverTimestamp(),
        voiceCallCount: FieldValue.increment(1),
      })
  } catch (err) {
    logger.warn('[AlexVoice] Firestore record failed (non-blocking):', err.message)
  }

  return {
    success: true,
    callId: vapiResponse.id,
    phone,
    trigger,
  }
}

/**
 * Build context-aware first message for the call.
 * Priority: director name > signal > pain > default.
 *
 * @param {Object} lead
 * @returns {string}
 */
function buildFirstMessage(lead) {
  const name = lead.directorName || lead.name || lead.nom || lead.firstName || null
  const company = lead.company || lead.companyName || lead.nom || ''

  // Priority 1: Director name known
  if (lead.directorName) {
    return `Bonjour ${lead.directorName}, c'est Alex. Je me permets de vous appeler car j'ai vu que ${company} pourrait beneficier d'un coup de pouce sur sa visibilite. Vous avez 2 minutes?`
  }

  // Priority 2: Bad Google rating
  if (lead.noteGoogle && lead.noteGoogle < 3.5) {
    return `Bonjour, c'est Alex. J'appelle parce que j'ai vu votre fiche Google et je pense qu'on peut vraiment ameliorer votre visibilite. Vous avez 2 minutes?`
  }

  // Priority 3: No website
  if (!lead.website) {
    return `Bonjour, c'est Alex. J'appelle parce que j'ai remarque que ${company || 'votre entreprise'} n'a pas encore de presence en ligne forte. On aide des entreprises comme la votre a attirer plus de clients. Vous avez 2 minutes?`
  }

  // Default
  return `Bonjour, c'est Alex. Je me permets de vous appeler au sujet de la visibilite en ligne de ${company || 'votre entreprise'}. Vous avez 2 minutes?`
}

/**
 * Check if lead was called in the last 30 days.
 *
 * @param {string} leadId
 * @returns {Promise<string|null>} Last call date or null
 */
async function checkCallHistory(leadId) {
  const db = getDb()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const snap = await db.collection('voiceCalls')
    .where('leadId', '==', leadId)
    .where('createdAt', '>=', thirtyDaysAgo)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snap.empty) return null
  const data = snap.docs[0].data()
  return data.createdAt?.toDate?.()?.toISOString() || 'recent'
}

/**
 * Check if lead should NOT be called (negative indicators).
 *
 * @param {Object} lead
 * @returns {boolean}
 */
function isNegativeLead(lead) {
  // Procedure collective / liquidation
  if (lead.procedureCollective || lead.liquidation) return true

  // Very bad Google rating
  if (lead.noteGoogle && lead.noteGoogle < 2.5 && lead.nbAvis > 10) return true

  // Blacklisted
  if (lead.blacklisted || lead.doNotCall) return true

  // Opted out
  if (lead.optedOut || lead.unsubscribed) return true

  return false
}

/**
 * Normalize French phone number to E.164.
 *
 * @param {string} phone
 * @returns {string|null}
 */
function normalizePhone(phone) {
  if (!phone) return null

  let cleaned = String(phone).replace(/[\s\-().]/g, '')

  // Already E.164
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned

  // French 00 prefix
  if (cleaned.startsWith('0033')) {
    return '+33' + cleaned.slice(4)
  }

  // French local (06, 07, 01, etc.)
  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    return '+33' + cleaned.slice(1)
  }

  // Bare 33 prefix
  if (/^33\d{9}$/.test(cleaned)) {
    return '+' + cleaned
  }

  return null
}
