/**
 * scoreAndReply — Score un message entrant via Groq (0-100) puis genere une reponse Alex
 * 2 appels Groq : scoring JSON + generation message
 * Si score > 80 → alerte Telegram
 */

import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Groq from 'groq-sdk'
import { sendMessage } from './sendMessage.js'
import { sendTelegramAlert } from './sendTelegramAlert.js'

const getDb = () => getFirestore()

/**
 * Score un message entrant et genere une reponse Alex
 * @param {object} params
 * @param {string} params.orgId - ID organisation
 * @param {string} params.prospectId - ID prospect
 * @param {string} params.channel - Canal source (whatsapp, email, instagram, linkedin)
 * @param {string} params.message - Message du prospect
 * @param {string} params.from - Expediteur (phone, email, handle)
 * @param {object} [params.prospectData] - Donnees prospect pre-chargees
 */
export async function scoreAndReply(params) {
  const { orgId, prospectId, channel, message, from, prospectData } = params

  if (!orgId || !prospectId || !message) {
    logger.error('scoreAndReply: missing required params', { orgId, prospectId })
    return { success: false, error: 'missing_params' }
  }

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) {
    logger.error('GROQ_API_KEY not configured')
    return { success: false, error: 'groq_not_configured' }
  }

  const groq = new Groq({ apiKey: groqApiKey })

  // Charger le prospect si pas pre-charge
  let prospect = prospectData
  if (!prospect) {
    try {
      const snap = await getDb()
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()
      prospect = snap.exists ? { id: snap.id, ...snap.data() } : {}
    } catch (err) {
      logger.error('Failed to load prospect:', err.message)
      prospect = {}
    }
  }

  // Verifier blacklist
  if (prospect.blacklisted) {
    logger.warn(`Prospect ${prospectId} is blacklisted, skipping scoreAndReply`)
    return { success: false, error: 'prospect_blacklisted' }
  }

  // Charger config Alex
  let alexConfig = {}
  try {
    const configSnap = await getDb().collection('settings').doc('alex').get()
    if (configSnap.exists) {
      alexConfig = configSnap.data()
    }
  } catch (err) {
    logger.warn('Could not load alex config, using defaults:', err.message)
  }

  // Charger config org
  let orgData = {}
  try {
    const orgSnap = await getDb().collection('organizations').doc(orgId).get()
    if (orgSnap.exists) {
      orgData = orgSnap.data()
    }
  } catch (err) {
    logger.warn('Could not load org data:', err.message)
  }

  // ============================================
  // ETAPE 1 : Scoring via Groq (JSON)
  // ============================================
  let score = 0
  let scoring = {}

  try {
    const scoringPrompt = buildScoringPrompt(message, prospect, channel)

    const scoringResponse = await groq.chat.completions.create({
      model: alexConfig.scoringModel || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en qualification de leads B2B. Reponds UNIQUEMENT en JSON valide.',
        },
        {
          role: 'user',
          content: scoringPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    })

    const rawScoring = scoringResponse.choices?.[0]?.message?.content
    scoring = JSON.parse(rawScoring || '{}')
    score = Math.min(100, Math.max(0, Number(scoring.score) || 0))
    scoring.score = score

    logger.info(`Scored prospect ${prospectId}: ${score}/100`, {
      intent: scoring.intent,
      urgency: scoring.urgency,
    })
  } catch (err) {
    logger.error('Groq scoring failed:', err.message)
    score = 50
    scoring = { score: 50, error: err.message, intent: 'unknown', urgency: 'medium' }
  }

  // ============================================
  // ETAPE 2 : Generation reponse Alex via Groq
  // ============================================
  let alexReply = ''

  try {
    const replyPrompt = buildReplyPrompt(message, prospect, scoring, channel, orgData, alexConfig)

    const replyResponse = await groq.chat.completions.create({
      model: alexConfig.replyModel || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: buildAlexSystemPrompt(orgData, alexConfig, channel),
        },
        {
          role: 'user',
          content: replyPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    alexReply = replyResponse.choices?.[0]?.message?.content?.trim() || ''
    logger.info(`Generated Alex reply for ${prospectId} (${alexReply.length} chars)`)
  } catch (err) {
    logger.error('Groq reply generation failed:', err.message)
    alexReply = ''
  }

  // ============================================
  // ETAPE 3 : Mise a jour Firestore
  // ============================================
  const prospectRef = getDb()
    .collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)

  try {
    // Logger l'interaction entrante
    await getDb()
      .collection('organizations').doc(orgId)
      .collection('interactions').add({
        prospectId,
        channel,
        direction: 'in',
        message,
        from,
        score,
        scoring,
        source: 'alex',
        createdAt: FieldValue.serverTimestamp(),
      })

    // Mettre a jour le prospect
    const updateData = {
      alexScore: score,
      alexScoring: scoring,
      alexLastInbound: FieldValue.serverTimestamp(),
      repliesToday: FieldValue.increment(1),
    }

    // Classifier le prospect
    if (score >= 80) {
      updateData.alexStatus = 'hot'
      updateData.alexCategory = 'hot'
    } else if (score >= 50) {
      updateData.alexStatus = 'warm'
      updateData.alexCategory = 'warm'
    } else if (score >= 25) {
      updateData.alexStatus = 'cold'
      updateData.alexCategory = 'cold'
      // Planifier un rescue dans 24h
      const rescueTime = new Date()
      rescueTime.setHours(rescueTime.getHours() + 24)
      updateData.rescueScheduledAt = rescueTime
    } else {
      updateData.alexStatus = 'ice'
      updateData.alexCategory = 'ice'
    }

    await prospectRef.update(updateData)
  } catch (err) {
    logger.error('Failed to update Firestore:', err.message)
  }

  // ============================================
  // ETAPE 4 : Envoyer la reponse Alex
  // ============================================
  let sendResult = { success: false }

  if (alexReply) {
    sendResult = await sendMessage({
      orgId,
      prospectId,
      channel,
      message: alexReply,
      to: from,
    })

    if (sendResult.success) {
      logger.info(`Alex replied to ${prospectId} via ${channel}`)
    } else {
      logger.error(`Alex failed to reply to ${prospectId}:`, sendResult.error)
    }
  }

  // ============================================
  // ETAPE 5 : Alerte Telegram si score > 80
  // ============================================
  if (score > 80) {
    try {
      await sendTelegramAlert({
        prospectName: prospect.name || prospect.firstName || from,
        score,
        channel,
        message,
        orgName: orgData.name || orgId,
        phone: prospect.phone,
        email: prospect.email,
        company: prospect.company,
      })
    } catch (err) {
      logger.error('Telegram alert failed:', err.message)
    }
  }

  return {
    success: true,
    score,
    scoring,
    replied: sendResult.success,
    alexReply: alexReply ? alexReply.slice(0, 100) + '...' : '',
  }
}

// ============================================
// Prompt Builders
// ============================================

function buildScoringPrompt(message, prospect, channel) {
  const context = [
    `Canal: ${channel}`,
    prospect.name ? `Prospect: ${prospect.name}` : null,
    prospect.company ? `Entreprise: ${prospect.company}` : null,
    prospect.industry ? `Secteur: ${prospect.industry}` : null,
    prospect.alexScore ? `Score precedent: ${prospect.alexScore}` : null,
    prospect.alexStatus ? `Status precedent: ${prospect.alexStatus}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `Analyse ce message d'un prospect et attribue un score de 0 a 100.

Contexte:
${context}

Message du prospect:
"${message}"

Reponds en JSON avec ces champs:
{
  "score": <number 0-100>,
  "intent": "<interested|question|objection|not_interested|spam|other>",
  "urgency": "<high|medium|low>",
  "sentiment": "<positive|neutral|negative>",
  "buyingSignals": ["<signal1>", "<signal2>"],
  "summary": "<resume en 1 ligne>"
}

Criteres de scoring:
- 90-100: Demande explicite de prix/demo/rdv
- 80-89: Fort interet, questions specifiques sur l'offre
- 60-79: Interet modere, questions generales
- 40-59: Reponse neutre, besoin de plus d'info
- 20-39: Peu interesse, objections
- 0-19: Pas interesse, spam, hors sujet`
}

function buildAlexSystemPrompt(orgData, alexConfig, channel) {
  const orgName = orgData.name || 'notre agence'
  const tone = alexConfig.tone || 'professionnel et amical'
  const language = alexConfig.language || 'francais'
  const maxLength = channel === 'whatsapp' ? 300 : channel === 'email' ? 500 : 200

  return `Tu es Alex, assistant commercial IA de ${orgName}.
Ton role: qualifier les prospects et les amener vers un rendez-vous.

Regles:
- Reponds en ${language}
- Ton: ${tone}
- Max ${maxLength} caracteres
- Jamais de formule type "En tant qu'IA" ou "Je suis un chatbot"
- Pose UNE question pour qualifier davantage
- Si le prospect est chaud (score > 80), propose un RDV
- Si le prospect a des objections, reponds avec empathie
- Jamais de promesse non tenue
- Adapte le style au canal: ${channel === 'whatsapp' ? 'court, emoji ok' : channel === 'email' ? 'structure, formel' : 'court, direct'}`
}

function buildReplyPrompt(message, prospect, scoring, channel, orgData, alexConfig) {
  const services = alexConfig.services || orgData.services || 'services de prospection digitale'

  return `Le prospect a envoye ce message (score: ${scoring.score}/100, intent: ${scoring.intent}):

"${message}"

${scoring.summary ? `Resume: ${scoring.summary}` : ''}
${prospect.name ? `Prospect: ${prospect.name}` : ''}
${prospect.company ? `Entreprise: ${prospect.company}` : ''}

Nos services: ${services}

Genere UNE reponse naturelle et engageante.
${scoring.score >= 80 ? 'Le prospect est CHAUD — propose un creneau pour un appel/RDV.' : ''}
${scoring.score < 40 ? 'Le prospect est FROID — relance doucement sans etre insistant.' : ''}
${scoring.intent === 'objection' ? 'Le prospect a des objections — reponds avec empathie et reformule la valeur.' : ''}`
}
