/**
 * Five Minute Rule - Pipeline ultra-rapide pour leads ULTRA HOT
 *
 * Business Plan only. Bypasse la queue Cloud Tasks normale.
 * Objectif : premier contact < 5 minutes apres detection du lead.
 *
 * Pipeline:
 *   T+0s   : Lead cree, score calcule
 *   T+10s  : isFalsePositive() verifie
 *   T+20s  : Canal de contact selectionne
 *   T+30s  : Message genere par Alex (Groq)
 *   T+60s  : Message envoye
 *   T+90s  : Social warming planifie
 *   T+5min : Notification client
 *
 * If outside contact window -> prepare message now, send at next slot.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../ai/callAI.js'

const getDb = () => getFirestore()

const ULTRA_HOT_THRESHOLD = 80
const MAX_PIPELINE_MS = 5 * 60 * 1000

const BUSINESS_HOURS = { start: 8, end: 20 }

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'fiveMinuteRule', event, ...data, timestamp: new Date().toISOString() }))

/**
 * Verifie si le lead est un faux positif (donnees incompletes, doublon, blackliste)
 * @param {Object} lead - Le lead a verifier
 * @param {string} orgId - Organisation ID
 * @returns {Promise<boolean>} true si faux positif
 */
async function isFalsePositive(lead, orgId) {
  if (!lead?.email && !lead?.phone) return true
  if (!lead?.company && !lead?.name) return true

  const db = getDb()
  const suppRef = db.collection(`organizations/${orgId}/suppressionList`)

  if (lead.email) {
    const suppDoc = await suppRef.doc(lead.email.toLowerCase()).get()
    if (suppDoc.exists) {
      log('false_positive_suppressed', { leadId: lead.id, reason: 'suppression_list' })
      return true
    }
  }

  const existingSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .where('email', '==', lead.email || '')
    .limit(1)
    .get()

  if (!existingSnap.empty && existingSnap.docs[0].id !== lead.id) {
    log('false_positive_duplicate', { leadId: lead.id })
    return true
  }

  return false
}

/**
 * Determine si on est dans la fenetre de contact autorisee
 * @param {string} timezone - Timezone du client (ex: 'Europe/Paris')
 * @returns {boolean}
 */
function isInContactWindow(timezone = 'Europe/Paris') {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone })
  const hour = parseInt(formatter.format(now), 10)
  return hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end
}

/**
 * Selectionne le canal optimal pour un contact immediat
 * @param {Object} lead - Le lead
 * @param {Object} clientConfig - Config organisation
 * @returns {string} Canal selectionne
 */
function selectFastestChannel(lead, clientConfig) {
  const channels = clientConfig?.channels || {}
  const priorities = ['whatsapp', 'sms', 'email']

  for (const channel of priorities) {
    if (!channels[channel]?.enabled) continue
    if (channel === 'whatsapp' && lead.phone) return 'whatsapp'
    if (channel === 'sms' && lead.phone) return 'sms'
    if (channel === 'email' && lead.email) return 'email'
  }

  return lead.email ? 'email' : null
}

/**
 * Lance le pipeline 5-minute rule pour un lead ULTRA HOT (score >= 80).
 * Bypasse Cloud Tasks, execution synchrone directe.
 *
 * @param {Object} lead - Le lead detecte (id, email, phone, company, name, score, orgId)
 * @param {Object} clientConfig - Configuration de l'organisation (channels, timezone, businessHours, niche)
 * @returns {Promise<{success: boolean, channel?: string, messageId?: string, scheduledAt?: string, responseTimeMs?: number}>}
 */
export async function triggerFiveMinuteRule(lead, clientConfig) {
  const startTime = Date.now()
  const orgId = lead?.orgId || clientConfig?.orgId

  if (!orgId || !lead) {
    log('error', { error: 'Missing lead or orgId' })
    return { success: false, error: 'missing_params' }
  }

  if ((lead.score || 0) < ULTRA_HOT_THRESHOLD) {
    log('skipped_low_score', { leadId: lead.id, score: lead.score })
    return { success: false, error: 'score_below_threshold' }
  }

  log('pipeline_started', { leadId: lead.id, score: lead.score, orgId })

  try {
    // T+10s — Verification faux positif
    const falsePositive = await isFalsePositive(lead, orgId)
    if (falsePositive) {
      return { success: false, error: 'false_positive' }
    }

    // T+20s — Selection canal
    const channel = selectFastestChannel(lead, clientConfig)
    if (!channel) {
      log('no_channel_available', { leadId: lead.id })
      return { success: false, error: 'no_channel' }
    }

    log('channel_selected', { leadId: lead.id, channel })

    // T+30s — Generation message via Groq
    const prompt = `Tu es Alex, assistant commercial IA. Genere un message de premier contact ultra-personnalise.
Lead: ${lead.name || 'Prospect'} chez ${lead.company || 'entreprise inconnue'}
Secteur: ${clientConfig?.niche || 'B2B'}
Canal: ${channel}
Ton: professionnel mais humain, direct, sans jargon marketing.
Langue: francais.
Reponds UNIQUEMENT avec le message (pas de guillemets, pas d'explication).
Max 3 phrases pour ${channel === 'email' ? 'email (+ objet sur la 1ere ligne)' : channel}.`

    const message = await callAI(prompt, 300)

    if (!message) {
      log('ai_generation_failed', { leadId: lead.id })
      return { success: false, error: 'ai_failed' }
    }

    log('message_generated', { leadId: lead.id, channel, lengthChars: message.length })

    const timezone = clientConfig?.timezone || 'Europe/Paris'
    const inWindow = isInContactWindow(timezone)

    const db = getDb()

    if (!inWindow) {
      // Hors heures — planifie pour le prochain slot
      log('outside_window_scheduled', { leadId: lead.id, channel })

      await db.collection(`organizations/${orgId}/scheduledMessages`).add({
        leadId: lead.id,
        channel,
        message,
        source: 'fiveMinuteRule',
        status: 'scheduled',
        createdAt: FieldValue.serverTimestamp()
      })

      return { success: true, channel, scheduledAt: 'next_business_hour', responseTimeMs: Date.now() - startTime }
    }

    // T+60s — Enregistrement pour envoi immediat (le dispatcher canal gere l'envoi reel)
    const msgRef = await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId: lead.id,
      channel,
      direction: 'outbound',
      content: message,
      source: 'fiveMinuteRule',
      status: 'pending',
      priority: 'ultra_hot',
      createdAt: FieldValue.serverTimestamp()
    })

    // T+90s — Planifier social warming
    await db.collection(`organizations/${orgId}/socialWarmingQueue`).add({
      leadId: lead.id,
      actions: ['linkedin_visit', 'linkedin_like'],
      scheduledFor: new Date(Date.now() + 90 * 1000).toISOString(),
      createdAt: FieldValue.serverTimestamp()
    })

    const responseTimeMs = Date.now() - startTime
    log('pipeline_completed', { leadId: lead.id, channel, messageId: msgRef.id, responseTimeMs })

    // T+5min — Notification client
    await db.collection(`organizations/${orgId}/notifications`).add({
      type: 'ultra_hot_lead',
      title: `Lead ULTRA HOT detecte : ${lead.name || lead.company}`,
      body: `Score ${lead.score}/100 — Contact ${channel} en ${Math.round(responseTimeMs / 1000)}s`,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })

    return { success: true, channel, messageId: msgRef.id, responseTimeMs }
  } catch (error) {
    log('pipeline_error', { leadId: lead.id, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Mesure le temps entre detection et envoi du premier message pour un lead.
 * Enregistre la metrique dans Firestore pour analytics.
 *
 * @param {string} leadId - ID du lead
 * @param {string} orgId - Organisation ID
 * @returns {Promise<{leadId: string, detectionToSendMs?: number, status: string}>}
 */
export async function measureResponseTime(leadId, orgId) {
  if (!leadId || !orgId) {
    return { leadId, status: 'missing_params' }
  }

  try {
    const db = getDb()

    const interactionsSnap = await db
      .collection(`organizations/${orgId}/interactions`)
      .where('prospectId', '==', leadId)
      .where('source', '==', 'fiveMinuteRule')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()

    if (interactionsSnap.empty) {
      return { leadId, status: 'no_five_minute_interaction' }
    }

    const interaction = interactionsSnap.docs[0].data()
    const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${leadId}`).get()
    const prospect = prospectDoc.data()

    if (!prospect?.createdAt || !interaction?.createdAt) {
      return { leadId, status: 'missing_timestamps' }
    }

    const detectionTime = prospect.createdAt.toMillis ? prospect.createdAt.toMillis() : prospect.createdAt
    const sendTime = interaction.createdAt.toMillis ? interaction.createdAt.toMillis() : interaction.createdAt
    const detectionToSendMs = sendTime - detectionTime

    log('response_time_measured', {
      leadId,
      detectionToSendMs,
      withinTarget: detectionToSendMs <= MAX_PIPELINE_MS
    })

    return { leadId, detectionToSendMs, status: detectionToSendMs <= MAX_PIPELINE_MS ? 'within_target' : 'exceeded_target' }
  } catch (error) {
    log('measure_error', { leadId, error: error.message })
    return { leadId, status: 'error', error: error.message }
  }
}
