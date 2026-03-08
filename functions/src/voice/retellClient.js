/**
 * Retell AI Client — Alternative voice AI provider (~30% less cost than Vapi)
 *
 * Retell API v2: https://docs.retellai.com/api-references
 * Uses native fetch (Node 20+).
 *
 * Handles:
 * - Launching outbound phone calls via Retell
 * - Processing webhook events (transcript, sentiment, task completion)
 * - Mapping disconnection reasons to normalized statuses
 */

const RETELL_API_BASE = 'https://api.retellai.com'

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Map Retell disconnection reasons to normalized call statuses
 */
function getRetellCallStatus(reason) {
  const statusMap = {
    'agent_hangup': 'completed',
    'user_hangup': 'completed',
    'call_transfer': 'transferred',
    'inactivity': 'timeout',
    'machine_detected': 'voicemail',
    'max_duration_reached': 'timeout',
    'concurrency_limit_reached': 'error',
    'dial_busy': 'no_answer',
    'dial_failed': 'failed',
    'dial_no_answer': 'no_answer',
    'error_inbound_webhook': 'error',
    'error_llm_websocket': 'error',
    'error_frontend_corrupted_payload': 'error',
    'error_twilio': 'error',
    'error_no_audio_received': 'error',
    'error_asr': 'error',
    'error_retell': 'error',
    'error_unknown': 'error',
    'voicemail_reached': 'voicemail',
    'registered_call_timeout': 'timeout',
  }

  return statusMap[reason] || 'unknown'
}

/**
 * Extract sentiment label from Retell's sentiment analysis
 */
function extractSentiment(callAnalysis) {
  if (!callAnalysis) return 'neutral'

  const sentiment = callAnalysis.user_sentiment
  if (!sentiment) return 'neutral'

  // Retell returns: Negative, Neutral, Positive, Unknown
  const map = {
    'Negative': 'negative',
    'Neutral': 'neutral',
    'Positive': 'positive',
    'Unknown': 'neutral',
  }

  return map[sentiment] || 'neutral'
}

// ---------------------------------------------------------------------------
// Launch Retell call
// ---------------------------------------------------------------------------

/**
 * Launch an outbound phone call via Retell AI
 *
 * @param {Object} lead - Lead object with { phone, firstName, lastName, company, id }
 * @param {Object} script - Script config { agentId, metadata, retellApiKey? }
 *   - agentId: Retell agent ID (pre-configured in Retell dashboard)
 *   - metadata: Custom metadata to attach to the call
 *   - retellApiKey: Override API key (falls back to env)
 * @returns {Promise<{callId: string, status: string, phone: string}>}
 * @throws {Error} If Retell API key or agentId is missing
 */
export async function launchRetellCall(lead, script) {
  const apiKey = script.retellApiKey || process.env.RETELL_API_KEY
  if (!apiKey) {
    throw new Error('RETELL_API_KEY is not configured')
  }

  if (!script.agentId) {
    throw new Error('Retell agentId is required')
  }

  if (!lead.phone) {
    throw new Error('Lead phone number is required')
  }

  // Build phone number — Retell expects E.164
  let phone = lead.phone.replace(/[\s\-().]/g, '')
  if (/^0[1-9]\d{8}$/.test(phone)) {
    phone = '+33' + phone.slice(1)
  } else if (/^33\d{9}$/.test(phone)) {
    phone = '+' + phone
  } else if (phone.startsWith('0033')) {
    phone = '+33' + phone.slice(4)
  } else if (!phone.startsWith('+')) {
    phone = '+' + phone
  }

  const payload = {
    agent_id: script.agentId,
    customer_number: phone,
    from_number: process.env.RETELL_FROM_NUMBER || undefined,
    metadata: {
      leadId: lead.id || null,
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null,
      company: lead.company || null,
      ...(script.metadata || {}),
    },
    retell_llm_dynamic_variables: {
      prospect_name: lead.firstName || 'Monsieur/Madame',
      company_name: lead.company || '',
      niche: lead.niche || '',
    },
  }

  const response = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Retell API error (${response.status}): ${errorBody}`)
  }

  const result = await response.json()

  console.log(JSON.stringify({
    event: 'retell_call_launched',
    callId: result.call_id,
    phone,
    leadId: lead.id,
    agentId: script.agentId,
  }))

  return {
    callId: result.call_id,
    status: result.call_status || 'registered',
    phone,
  }
}

// ---------------------------------------------------------------------------
// Process Retell webhook events
// ---------------------------------------------------------------------------

/**
 * Parse and normalize a Retell webhook event
 *
 * Retell sends a POST with:
 * {
 *   event: "call_started" | "call_ended" | "call_analyzed",
 *   call: { call_id, agent_id, call_status, ... }
 * }
 *
 * @param {Object} event - Raw Retell webhook payload (req.body)
 * @returns {Object|null} Normalized call data or null if not actionable
 */
export function processRetellWebhookEvent(event) {
  if (!event || !event.event) return null

  const eventType = event.event
  const call = event.call || {}

  // call_started — informational only
  if (eventType === 'call_started') {
    return {
      provider: 'retell',
      eventType: 'started',
      callId: call.call_id || null,
      phone: call.to_number || call.customer_number || null,
      status: 'in_progress',
      endedReason: null,
      duration: 0,
      transcript: '',
      transcriptObject: null,
      summary: '',
      sentiment: 'neutral',
      taskCompletion: null,
      recordingUrl: null,
      cost: null,
      metadata: call.metadata || {},
      completedAt: null,
    }
  }

  // call_ended — call finished, basic data available
  if (eventType === 'call_ended') {
    const disconnectionReason = call.disconnection_reason || 'unknown'
    const durationMs = call.end_timestamp && call.start_timestamp
      ? call.end_timestamp - call.start_timestamp
      : 0

    return {
      provider: 'retell',
      eventType: 'ended',
      callId: call.call_id || null,
      phone: call.to_number || call.customer_number || null,
      status: getRetellCallStatus(disconnectionReason),
      endedReason: disconnectionReason,
      duration: Math.round(durationMs / 1000),
      transcript: call.transcript || '',
      transcriptObject: call.transcript_object || null,
      summary: '',
      sentiment: 'neutral',
      taskCompletion: null,
      recordingUrl: call.recording_url || null,
      cost: call.combined_cost || null,
      metadata: call.metadata || {},
      completedAt: call.end_timestamp
        ? new Date(call.end_timestamp).toISOString()
        : new Date().toISOString(),
    }
  }

  // call_analyzed — full analysis available (transcript, sentiment, etc.)
  if (eventType === 'call_analyzed') {
    const disconnectionReason = call.disconnection_reason || 'unknown'
    const durationMs = call.end_timestamp && call.start_timestamp
      ? call.end_timestamp - call.start_timestamp
      : 0

    const callAnalysis = call.call_analysis || {}

    // Build readable transcript from transcript_object
    let transcript = call.transcript || ''
    if (!transcript && call.transcript_object && Array.isArray(call.transcript_object)) {
      transcript = call.transcript_object
        .map((turn) => `${turn.role === 'agent' ? 'Agent' : 'Client'}: ${turn.content}`)
        .join('\n')
    }

    return {
      provider: 'retell',
      eventType: 'analyzed',
      callId: call.call_id || null,
      phone: call.to_number || call.customer_number || null,
      status: getRetellCallStatus(disconnectionReason),
      endedReason: disconnectionReason,
      duration: Math.round(durationMs / 1000),
      transcript,
      transcriptObject: call.transcript_object || null,
      summary: callAnalysis.call_summary || '',
      sentiment: extractSentiment(callAnalysis),
      taskCompletion: callAnalysis.custom_analysis_data || null,
      recordingUrl: call.recording_url || null,
      cost: call.combined_cost || null,
      metadata: call.metadata || {},
      completedAt: call.end_timestamp
        ? new Date(call.end_timestamp).toISOString()
        : new Date().toISOString(),
    }
  }

  // Unknown event type
  return null
}
