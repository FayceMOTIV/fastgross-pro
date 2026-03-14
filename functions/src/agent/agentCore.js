/**
 * Agent Core — AI agent with RAG, objection strategies, and escalation
 * Enhanced version of alex/scoreAndReply.js with KB integration
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import {
  searchKB,
  getProspectProfile,
  analyzeSentiment,
  escalateToHuman,
  updateCRM,
  scheduleFollowup,
} from './agentTools.js'

const getDb = () => getFirestore()

// Objection strategies
const OBJECTION_STRATEGIES = {
  OBJECTION_PRICE: {
    strategy: 'reframe_value',
    prompt: `Le prospect a une objection sur le prix. Strategie: reframe_value.
- Mettre en avant le ROI et le cout de ne rien faire
- Comparer avec le cout d'acquisition client actuel
- Proposer un calcul concret de rentabilite
- Mentionner la possibilite d'essai gratuit si disponible`,
  },
  OBJECTION_TIME: {
    strategy: 'reduce_friction',
    prompt: `Le prospect dit ne pas avoir le temps. Strategie: reduce_friction.
- Proposer une demo de 15 minutes maximum
- Mentionner un onboarding en 48h
- Insister sur l'automatisation qui fait gagner du temps
- Proposer de tout gerer a sa place`,
  },
  OBJECTION_COMPETITOR: {
    strategy: 'differentiate',
    prompt: `Le prospect mentionne un concurrent. Strategie: differentiate.
- Chercher dans la base de connaissances les avantages differenciants
- Ne jamais denigrer le concurrent
- Mettre en avant des fonctionnalites uniques
- Proposer une comparaison factuelle`,
  },
  OBJECTION_TRUST: {
    strategy: 'social_proof',
    prompt: `Le prospect manque de confiance. Strategie: social_proof.
- Partager des etudes de cas de clients similaires
- Mentionner des chiffres concrets de resultats
- Proposer de mettre en relation avec un client existant
- Insister sur la garantie et l'accompagnement`,
  },
}

// Keywords that trigger escalation
const LEGAL_KEYWORDS = ['avocat', 'juridique', 'contrat', 'RGPD', 'tribunal', 'plainte', 'litige', 'mise en demeure']

/**
 * Classify objection type from message
 */
function classifyObjection(message) {
  const lower = message.toLowerCase()
  if (lower.match(/prix|cher|budget|cout|tarif|abonnement/)) return 'OBJECTION_PRICE'
  if (lower.match(/temps|occupe|pas le moment|charge|deborde/)) return 'OBJECTION_TIME'
  if (lower.match(/concurrent|alternative|deja.*solution|autre.*outil/)) return 'OBJECTION_COMPETITOR'
  if (lower.match(/confian|garantie|preuve|serieux|arnaque|risque/)) return 'OBJECTION_TRUST'
  return null
}

/**
 * Determine if agent should escalate to human
 */
function shouldEscalate({ kbMaxScore, sentimentScore, leadScore, turnCount, message }) {
  const reasons = []

  if (kbMaxScore < 0.6) reasons.push('kb_no_info')
  if (sentimentScore < -0.6) reasons.push('very_negative')
  if (leadScore > 90) reasons.push('vip_lead')
  if (turnCount > 4) reasons.push('long_conversation')

  const hasLegalKeyword = LEGAL_KEYWORDS.some((kw) => message.toLowerCase().includes(kw))
  if (hasLegalKeyword) reasons.push('legal_keywords')

  return {
    shouldEscalate: reasons.length > 0,
    reasons,
    primaryReason: reasons[0] || null,
  }
}

/**
 * Cloud Function: Agent Respond
 * Processes an incoming message and generates an AI response with RAG
 */
export const agentRespond = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, leadId, message, replyCategory, channel, sentimentScore } = data || {}

  if (!orgId || !leadId || !message) {
    throw new HttpsError('invalid-argument', 'orgId, leadId and message are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  try {
    const db = getDb()

    // 1. Load prospect context
    const prospect = await getProspectProfile(orgId, leadId)
    if (!prospect) {
      throw new HttpsError('not-found', 'Prospect not found')
    }

    const turnCount = (prospect.agentTurnCount || 0) + 1
    const leadScore = prospect.qualityScore ?? ((prospect.score ?? 0) <= 10 ? (prospect.score ?? 0) * 10 : (prospect.score ?? 0))

    // Handle special replyCategory before normal flow
    if (replyCategory === 'UNSUBSCRIBE') {
      await updateCRM(orgId, leadId, {
        blacklisted: true,
        blacklistedAt: FieldValue.serverTimestamp(),
        blacklistedReason: 'unsubscribe_request',
        crmColumn: 'LOST',
        agentTurnCount: turnCount,
        lastAgentAction: 'unsubscribed',
      })
      return {
        success: true,
        response: null,
        confidenceScore: 100,
        escaladeHumain: false,
        suggestedCrmAction: 'MOVE_TO_LOST',
        action: 'unsubscribed',
      }
    }

    if (replyCategory === 'OUT_OF_OFFICE') {
      // Parse return date from message
      const dateMatch = message.match(/(\d{1,2})\s*(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre|\/\d{1,2})/i)
        || message.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
        || message.match(/le\s+(\d{1,2})/i)
      let nextContactAt = new Date()
      nextContactAt.setDate(nextContactAt.getDate() + 7) // default +7 days

      if (dateMatch) {
        const dayNum = parseInt(dateMatch[1], 10)
        const monthNames = { janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11 }
        if (dateMatch[2] && monthNames[dateMatch[2].toLowerCase()] !== undefined) {
          const month = monthNames[dateMatch[2].toLowerCase()]
          nextContactAt = new Date(new Date().getFullYear(), month, dayNum + 1)
          if (nextContactAt < new Date()) nextContactAt.setFullYear(nextContactAt.getFullYear() + 1)
        } else if (dateMatch[2]) {
          const monthNum = parseInt(dateMatch[2], 10) - 1
          const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear()
          nextContactAt = new Date(year < 100 ? 2000 + year : year, monthNum, dayNum + 1)
        } else {
          // Just a day number like "le 21"
          nextContactAt = new Date()
          nextContactAt.setDate(dayNum + 1)
          if (nextContactAt < new Date()) nextContactAt.setMonth(nextContactAt.getMonth() + 1)
        }
      }

      await updateCRM(orgId, leadId, {
        nextContactAt,
        agentTurnCount: turnCount,
        lastAgentAction: 'ooo_reschedule',
        agentNotes: `Absent - relance programmee le ${nextContactAt.toLocaleDateString('fr-FR')}`,
      })

      // Schedule followup
      await scheduleFollowup(orgId, leadId, nextContactAt, 'Relance post-absence (OOO detecte)')

      return {
        success: true,
        response: null,
        confidenceScore: 90,
        escaladeHumain: false,
        suggestedCrmAction: 'RESCHEDULE',
        nextContactAt,
        action: 'ooo_reschedule',
      }
    }

    if (replyCategory === 'REFERRAL') {
      // Extract email from message
      const emailMatch = message.match(/[\w.+-]+@[\w.-]+\.\w+/)
      // Extract name before or around the email
      const nameMatch = message.match(/(?:contactez|contacter)\s+(?:plutôt|plutot)?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i)
        || message.match(/([A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú][a-zà-ú]+)\s*(?::|;|,)?\s*[\w.+-]+@/i)

      const referredName = nameMatch ? nameMatch[1].trim() : ''
      const referredEmail = emailMatch ? emailMatch[0] : null

      if (referredEmail) {
        const nameParts = referredName.split(/\s+/)
        await db.collection('organizations').doc(orgId).collection('prospects').add({
          email: referredEmail,
          contactName: referredName || referredEmail,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          source: 'referral',
          sourceLeadId: leadId,
          referredBy: prospect.contactName || `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim(),
          crmColumn: 'NEW',
          qualityScore: 50,
          agentTurnCount: 0,
          blacklisted: false,
          timeline: [],
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      await updateCRM(orgId, leadId, {
        agentTurnCount: turnCount,
        lastAgentAction: 'referral_processed',
        agentNotes: `Referral vers ${referredName || referredEmail || 'contact inconnu'}`,
      })

      return {
        success: true,
        response: `Merci pour cette recommandation. Je vais contacter ${referredName || 'votre collegue'} de votre part.`,
        confidenceScore: 85,
        escaladeHumain: false,
        suggestedCrmAction: 'REFERRAL_CREATED',
        referredEmail,
        referredName,
        action: 'referral_processed',
      }
    }

    // 2. Analyze sentiment (use provided score or calculate)
    const sentiment = sentimentScore !== undefined
      ? { score: sentimentScore, label: sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral', confidence: 0.8 }
      : await analyzeSentiment(message)

    // 3. Search KB for relevant context
    const kbResults = await searchKB(orgId, message)
    const kbContext = kbResults.chunks.map((c) => c.content).join('\n\n')

    // 4. Check escalation
    const escalation = shouldEscalate({
      kbMaxScore: kbResults.maxScore,
      sentimentScore: sentiment.score,
      leadScore,
      turnCount,
      message,
    })

    if (escalation.shouldEscalate) {
      // Generate a draft response before escalating
      const draft = await callAI(
        `Tu es un assistant commercial. Genere un brouillon de reponse pour ce message prospect.
Le prospect s'appelle ${prospect.firstName} ${prospect.lastName} de ${prospect.company || 'une entreprise'}.
Message: "${message}"
Contexte KB: ${kbContext.slice(0, 500) || 'Aucun contexte disponible'}
Reponds de maniere professionnelle et empathique en 2-3 phrases.`,
        300
      )

      await escalateToHuman(orgId, leadId, escalation.primaryReason, draft)

      // Update prospect
      await updateCRM(orgId, leadId, {
        agentTurnCount: turnCount,
        lastAgentAction: 'escalated',
        escalationReason: escalation.primaryReason,
      })

      return {
        success: true,
        response: draft,
        confidenceScore: 30,
        escaladeHumain: true,
        escalationReasons: escalation.reasons,
        suggestedCrmAction: null,
      }
    }

    // 5. Classify objection and get strategy
    // Use provided replyCategory if it's an objection type, otherwise classify from message
    const objectionType = (replyCategory && OBJECTION_STRATEGIES[replyCategory])
      ? replyCategory
      : classifyObjection(message)
    const strategy = objectionType ? OBJECTION_STRATEGIES[objectionType] : null

    // 6. Build prompt with context
    const conversationHistory = (prospect.recentInteractions || [])
      .slice(0, 5)
      .map((i) => `[${i.type}] ${i.content || i.subject || ''}`)
      .join('\n')

    const prompt = `Tu es un assistant commercial experimente pour ${prospect.company ? `l'entreprise cliente de ` : ''}FaceMedia Factory.
Tu parles a ${prospect.firstName} ${prospect.lastName}${prospect.company ? ` de ${prospect.company}` : ''}.
Score du lead: ${leadScore}/100. Tour de conversation: ${turnCount}.

HISTORIQUE RECENT:
${conversationHistory || 'Premier contact'}

BASE DE CONNAISSANCES:
${kbContext || 'Aucune information specifique disponible'}

${strategy ? `STRATEGIE D'OBJECTION (${strategy.strategy}):\n${strategy.prompt}\n` : ''}

MESSAGE DU PROSPECT:
"${message}"

INSTRUCTIONS:
- Reponds en francais, de maniere professionnelle mais chaleureuse
- Maximum 3-4 phrases
- Si le prospect est interesse, propose un RDV
- Si c'est une objection, utilise la strategie indiquee
- Ne repete jamais le meme argument
- Termine par une question ouverte ou une proposition concrete

IMPORTANT: Reponds UNIQUEMENT avec le message a envoyer, sans guillemets ni prefixe.`

    // Choose LLM based on lead score
    const response = await callAI(prompt, 400)

    // 7. Determine suggested CRM action
    let suggestedCrmAction = null
    if (replyCategory === 'INTERESTED' || sentiment.score > 0.5) suggestedCrmAction = 'MOVE_TO_INTERESTED'
    if (message.toLowerCase().match(/rdv|rendez.vous|dispo|creneau|calendrier/)) suggestedCrmAction = 'MOVE_TO_MEETING'
    if (sentiment.score < -0.5) suggestedCrmAction = null

    // 8. Calculate confidence
    const confidenceScore = Math.round(
      (kbResults.hasRelevantResults ? 30 : 10) +
      (strategy ? 20 : 0) +
      (sentiment.confidence * 30) +
      (turnCount <= 3 ? 20 : 10)
    )

    // 9. Update prospect
    await updateCRM(orgId, leadId, {
      agentTurnCount: turnCount,
      lastAgentAction: 'responded',
      lastAgentResponse: response,
      lastAgentConfidence: confidenceScore,
    })

    return {
      success: true,
      response,
      confidenceScore: Math.min(100, confidenceScore),
      escaladeHumain: false,
      suggestedCrmAction,
      sentiment: sentiment.label,
      objectionType,
      kbChunksUsed: kbResults.chunks.length,
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', `Agent error: ${error.message}`)
  }
})

/**
 * Cloud Function: Get Agent Status for an org
 */
export const getAgentStatus = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()

  // Count KB chunks
  const kbSnapshot = await db.collection('organizations').doc(orgId).collection('kb').count().get()
  const kbChunks = kbSnapshot.data().count

  // Count pending escalations
  const escSnapshot = await db.collection('organizations').doc(orgId).collection('escalations')
    .where('status', '==', 'pending')
    .count().get()
  const pendingEscalations = escSnapshot.data().count

  // Get playbook status
  const playbookDoc = await db.collection('organizations').doc(orgId).collection('agentPlaybook').doc('latest').get()

  return {
    kbChunks,
    pendingEscalations,
    hasPlaybook: playbookDoc.exists,
    playbookUpdatedAt: playbookDoc.data()?.updatedAt || null,
  }
})
