/**
 * Voice Engine — Prepares and launches AI voice calls via Vapi
 *
 * Handles:
 * - Phone number formatting (E.164 / +33)
 * - Script generation via Groq (context-aware, DScore-based urgency)
 * - Vapi assistant creation with Groq model, ElevenLabs voice, Deepgram transcriber
 * - Webhook event normalization
 */

import Groq from 'groq-sdk'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Format phone number to E.164 (+33 for France)
 * Handles: 06..., +336..., 0033..., already formatted
 */
function formatPhoneE164(phone) {
  if (!phone) return null

  let cleaned = phone.replace(/[\s\-().]/g, '')

  // Already E.164
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned

  // French 00 prefix
  if (cleaned.startsWith('0033')) {
    cleaned = '+33' + cleaned.slice(4)
    return cleaned
  }

  // French local (06, 07, 01, etc.)
  if (/^0[1-9]\d{8}$/.test(cleaned)) {
    return '+33' + cleaned.slice(1)
  }

  // Bare number with country code but no +
  if (/^33\d{9}$/.test(cleaned)) {
    return '+' + cleaned
  }

  return null
}

/**
 * Map Vapi endedReason to a normalized call status
 */
function getCallStatus(endedReason) {
  const statusMap = {
    'assistant-said-end-call-phrase': 'completed',
    'customer-ended-call': 'completed',
    'assistant-ended-call': 'completed',
    'call-complete': 'completed',
    'voicemail': 'voicemail',
    'customer-busy': 'no_answer',
    'customer-did-not-answer': 'no_answer',
    'no-answer': 'no_answer',
    'machine-detected': 'voicemail',
    'silence-timed-out': 'failed',
    'max-duration-reached': 'timeout',
    'error': 'error',
    'pipeline-error': 'error',
    'network-error': 'error',
    'exceeded-max-duration': 'timeout',
  }

  return statusMap[endedReason] || 'unknown'
}

/**
 * Determine script urgency level from DScore (0-100)
 */
function getUrgencyFromDScore(dscore) {
  if (dscore >= 80) return 'high'
  if (dscore >= 50) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// Script generation via Groq
// ---------------------------------------------------------------------------

/**
 * Generate a call script (systemPrompt + firstMessage) using Groq
 *
 * @param {Object} lead - Lead data (firstName, company, niche, dscore, etc.)
 * @param {Object} context - Campaign context (orgName, offer, tone, language)
 * @returns {Promise<{systemPrompt: string, firstMessage: string}>}
 */
async function generateCallScript(lead, context) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    // Fallback: static French script
    const firstName = lead.firstName || 'Monsieur/Madame'
    return {
      systemPrompt: `Tu es un assistant commercial de ${context.orgName || 'notre entreprise'}. Tu appelles ${firstName} pour proposer un rendez-vous de decouverte. Sois chaleureux, concis, professionnel. Si la personne est interessee, propose un creneau cette semaine. Si elle refuse, remercie poliment. Maximum 2 minutes.`,
      firstMessage: `Bonjour ${firstName}, je suis ${context.orgName || 'FaceMedia'}. Je me permets de vous appeler car nous aidons les entreprises comme ${lead.company || 'la votre'} a developper leur activite. Avez-vous 2 minutes ?`,
    }
  }

  const urgency = getUrgencyFromDScore(lead.dscore || 0)
  const groq = new Groq({ apiKey: groqKey })

  const prompt = `Tu es un expert en cold calling B2B en France.
Genere un script d'appel telephonique en JSON strict avec deux champs:
- "systemPrompt": instructions pour l'agent IA vocal (personnalite, objectif, regles, ton)
- "firstMessage": la premiere phrase que l'agent prononce a l'appel

Contexte:
- Entreprise appelante: ${context.orgName || 'FaceMedia'}
- Offre: ${context.offer || 'solutions de prospection digitale'}
- Prospect: ${lead.firstName || ''} ${lead.lastName || ''}
- Societe prospect: ${lead.company || 'inconnue'}
- Secteur: ${lead.niche || context.niche || 'non precise'}
- Score urgence: ${urgency} (DScore: ${lead.dscore || 0}/100)
- Ton: ${context.tone || 'professionnel et chaleureux'}
- Langue: francais

Regles:
- Le systemPrompt doit faire max 500 mots
- Le firstMessage doit faire 2-3 phrases max
- Adapter l'urgence: ${urgency === 'high' ? 'lead tres chaud, aller droit au but, proposer rdv' : urgency === 'medium' ? 'lead tiede, creuser le besoin avant de proposer' : 'lead froid, approche douce, qualifier d abord'}
- Inclure une instruction de fin d'appel si le prospect n'est pas disponible
- Ne jamais mentionner de prix par telephone

Reponds UNIQUEMENT en JSON valide, sans markdown.`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    })

    const raw = completion.choices?.[0]?.message?.content?.trim()
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = safeParseLLMJson(cleaned)

    if (!parsed.systemPrompt || !parsed.firstMessage) {
      throw new Error('Missing required fields in AI response')
    }

    return {
      systemPrompt: parsed.systemPrompt,
      firstMessage: parsed.firstMessage,
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'voice_script_generation_error',
      error: err.message,
      leadId: lead.id,
    }))

    // Fallback static script
    const firstName = lead.firstName || 'Monsieur/Madame'
    return {
      systemPrompt: `Tu es un assistant commercial professionnel de ${context.orgName || 'notre entreprise'}. Tu appelles pour proposer un rendez-vous. Sois concis, chaleureux, professionnel. Maximum 2 minutes. Si le prospect n'est pas interesse, remercie et raccroche poliment.`,
      firstMessage: `Bonjour ${firstName}, c'est ${context.orgName || 'FaceMedia'}. Je vous appelle car nous accompagnons les entreprises de votre secteur dans leur developpement commercial. Avez-vous un instant ?`,
    }
  }
}

// ---------------------------------------------------------------------------
// Launch voice call via Vapi
// ---------------------------------------------------------------------------

/**
 * Launch an AI voice call via Vapi API
 *
 * @param {Object} lead - Lead object with at least { phone, firstName, lastName, company, dscore }
 * @param {Object} campaignContext - { orgName, offer, tone, niche, webhookUrl }
 * @returns {Promise<{callId: string, status: string, phone: string}>}
 * @throws {Error} If Vapi API key is missing or phone is invalid
 */
export async function launchVoiceCall(lead, campaignContext) {
  const vapiKey = process.env.VAPI_API_KEY
  if (!vapiKey) {
    throw new Error('VAPI_API_KEY is not configured')
  }

  const phone = formatPhoneE164(lead.phone)
  if (!phone) {
    throw new Error(`Invalid phone number: ${lead.phone}`)
  }

  // Generate script with Groq
  const { systemPrompt, firstMessage } = await generateCallScript(lead, campaignContext)

  // Build Vapi call payload
  const payload = {
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: {
      number: phone,
      name: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || undefined,
    },
    assistant: {
      model: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        systemPrompt,
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'fr',
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'default-fr',
        stability: 0.6,
        similarityBoost: 0.75,
      },
      firstMessage,
      endCallFunctionEnabled: true,
      maxDurationSeconds: 180,
      silenceTimeoutSeconds: 20,
      responseDelaySeconds: 0.5,
      backgroundSound: 'off',
    },
    metadata: {
      leadId: lead.id || null,
      orgId: campaignContext.orgId || null,
      dscore: lead.dscore || 0,
      collectionName: campaignContext.collectionName || 'prospects',
    },
  }

  // Add webhook URL if provided
  if (campaignContext.webhookUrl) {
    payload.serverUrl = campaignContext.webhookUrl
  }

  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Vapi API error (${response.status}): ${errorBody}`)
  }

  const result = await response.json()

  console.log(JSON.stringify({
    event: 'voice_call_launched',
    callId: result.id,
    phone,
    leadId: lead.id,
    orgId: campaignContext.orgId,
  }))

  return {
    callId: result.id,
    status: result.status || 'queued',
    phone,
  }
}

// ---------------------------------------------------------------------------
// Process Vapi webhook events
// ---------------------------------------------------------------------------

/**
 * Parse and normalize a Vapi webhook event into a standardized call record
 *
 * @param {Object} event - Raw Vapi webhook payload (req.body)
 * @returns {Object|null} Normalized call data or null if event is not actionable
 */
export function processVapiWebhookEvent(event) {
  const { message } = event || {}

  if (!message) return null

  const type = message.type

  // We only process end-of-call reports for full data
  if (type === 'end-of-call-report') {
    const {
      call,
      transcript,
      summary,
      endedReason,
      recordingUrl,
      costBreakdown,
    } = message

    return {
      provider: 'vapi',
      callId: call?.id || null,
      phone: call?.customer?.number || null,
      status: getCallStatus(endedReason),
      endedReason: endedReason || 'unknown',
      duration: call?.duration || 0,
      transcript: transcript || '',
      summary: summary || '',
      recordingUrl: recordingUrl || null,
      cost: costBreakdown?.total || null,
      costBreakdown: costBreakdown || null,
      metadata: call?.metadata || {},
      completedAt: new Date().toISOString(),
    }
  }

  // Status update events (call started, ringing, etc.)
  if (type === 'status-update') {
    return {
      provider: 'vapi',
      callId: message.call?.id || null,
      phone: message.call?.customer?.number || null,
      status: message.status || 'in_progress',
      endedReason: null,
      duration: 0,
      transcript: '',
      summary: '',
      recordingUrl: null,
      cost: null,
      costBreakdown: null,
      metadata: message.call?.metadata || {},
      completedAt: null,
    }
  }

  // Transcript update (partial — during call)
  if (type === 'transcript') {
    return {
      provider: 'vapi',
      callId: message.call?.id || null,
      phone: null,
      status: 'in_progress',
      endedReason: null,
      duration: 0,
      transcript: message.transcript || '',
      summary: '',
      recordingUrl: null,
      cost: null,
      costBreakdown: null,
      metadata: message.call?.metadata || {},
      completedAt: null,
    }
  }

  // Unknown event type — ignore
  return null
}
