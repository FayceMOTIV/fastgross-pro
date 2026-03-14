/**
 * Conversation Engine — Moteur de gestion des reponses prospects
 *
 * Classification IA des reponses entrantes (8 intents),
 * actions automatiques par intent, et generation de reponses contextuelles.
 *
 * Collection Firestore : organizations/{orgId}/campaigns/{campaignId}/replies/{replyId}
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ============================================
// REPLY INTENTS — 8 classifications possibles
// ============================================

export const REPLY_INTENTS = {
  INTERESTED: {
    label: 'Interesse',
    action: 'escalate_hot',
    stopSequence: true,
    priority: 'critical',
  },
  MEETING_REQUEST: {
    label: 'Demande RDV',
    action: 'schedule_meeting',
    stopSequence: true,
    priority: 'critical',
  },
  INFO_REQUEST: {
    label: 'Demande info',
    action: 'auto_reply_info',
    stopSequence: false,
    priority: 'high',
  },
  ALREADY_HAVE: {
    label: 'Deja equipe',
    action: 'nurture_long',
    stopSequence: true,
    priority: 'low',
  },
  NOT_NOW: {
    label: 'Pas maintenant',
    action: 'reschedule_30d',
    stopSequence: true,
    priority: 'medium',
  },
  NEGATIVE: {
    label: 'Negatif',
    action: 'suppress',
    stopSequence: true,
    priority: 'low',
  },
  GAVE_CONTACT: {
    label: 'Donne un contact',
    action: 'add_referral',
    stopSequence: true,
    priority: 'high',
  },
  QUESTION: {
    label: 'Question',
    action: 'auto_reply_faq',
    stopSequence: false,
    priority: 'medium',
  },
}

const VALID_INTENTS = Object.keys(REPLY_INTENTS)

// ============================================
// classifyReply — Cloud Function onCall
// ============================================

export const classifyReply = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, prospectId, replyText, channel, campaignId } = request.data

    if (!orgId || !prospectId || !replyText || !campaignId) {
      throw new HttpsError(
        'invalid-argument',
        'orgId, prospectId, replyText et campaignId requis'
      )
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const userId = request.auth.uid

    try {
      // Recuperer le prospect pour le contexte
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectDoc = await prospectRef.get()
      if (!prospectDoc.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      const prospect = { id: prospectDoc.id, ...prospectDoc.data() }

      // Recuperer la campagne pour le contexte
      const campaignRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)

      const campaignDoc = await campaignRef.get()
      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campagne non trouvee')
      }

      const campaign = { id: campaignDoc.id, ...campaignDoc.data() }

      // Classifier la reponse via IA
      const prompt = `Tu es un expert en classification de reponses de prospection B2B.

REPONSE DU PROSPECT:
"${replyText}"

CONTEXTE:
- Prospect : ${prospect.firstName || ''} ${prospect.lastName || ''} chez ${prospect.company || 'Entreprise inconnue'}
- Canal : ${channel || 'email'}
- Campagne : ${campaign.name || 'Campagne'}

INTENTS POSSIBLES (choisis-en exactement UN) :
1. INTERESTED — Le prospect est interesse, veut en savoir plus, valide l'approche
2. MEETING_REQUEST — Le prospect demande un rendez-vous, un appel, un creneau
3. INFO_REQUEST — Le prospect demande des informations supplementaires (tarifs, fonctionnalites, etc.)
4. ALREADY_HAVE — Le prospect a deja une solution similaire, est deja equipe
5. NOT_NOW — Le prospect n'est pas disponible maintenant mais potentiellement plus tard
6. NEGATIVE — Refus clair, pas interesse, demande d'arret
7. GAVE_CONTACT — Le prospect redirige vers un collegue ou donne un autre contact
8. QUESTION — Le prospect pose une question generale sans exprimer d'interet ou de refus

Analyse la reponse et retourne UNIQUEMENT ce JSON :
{
  "intent": "INTERESTED|MEETING_REQUEST|INFO_REQUEST|ALREADY_HAVE|NOT_NOW|NEGATIVE|GAVE_CONTACT|QUESTION",
  "confidence": 0.95,
  "summary": "Resume en 1 phrase de la reponse",
  "suggestedReply": "Reponse suggeree adaptee au contexte (max 80 mots, ton professionnel)"
}`

      const aiResponse = await callAI(prompt, 500)

      // Parser la reponse IA
      const parsed = extractJSON(aiResponse)

      if (!parsed) {
        throw new Error('Impossible de parser la reponse IA')
      }

      // Valider l'intent
      const intent = VALID_INTENTS.includes(parsed.intent)
        ? parsed.intent
        : 'QUESTION'

      const confidence =
        typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5

      const summary = parsed.summary || 'Reponse classifiee automatiquement'
      const suggestedReply = parsed.suggestedReply || ''

      // Sauvegarder la classification dans Firestore
      const replyData = {
        prospectId,
        prospectName:
          `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim() ||
          prospect.email ||
          prospectId,
        prospectCompany: prospect.company || '',
        replyText,
        channel: channel || 'email',
        campaignId,
        intent,
        intentLabel: REPLY_INTENTS[intent].label,
        intentAction: REPLY_INTENTS[intent].action,
        confidence,
        summary,
        suggestedReply,
        stopSequence: REPLY_INTENTS[intent].stopSequence,
        priority: REPLY_INTENTS[intent].priority,
        status: 'pending',
        classifiedBy: 'ai',
        classifiedAt: FieldValue.serverTimestamp(),
        createdBy: userId,
        createdAt: FieldValue.serverTimestamp(),
      }

      const replyRef = await db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)
        .collection('replies')
        .add(replyData)

      console.log(
        JSON.stringify({
          event: 'reply_classified',
          data: {
            orgId,
            campaignId,
            prospectId,
            replyId: replyRef.id,
            intent,
            confidence,
            channel: channel || 'email',
          },
          timestamp: Date.now(),
        })
      )

      return {
        intent,
        confidence,
        summary,
        suggestedReply,
        replyId: replyRef.id,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      console.error(
        JSON.stringify({
          event: 'reply_classification_error',
          data: { orgId, prospectId, campaignId, error: error.message },
          timestamp: Date.now(),
        })
      )
      throw new HttpsError(
        'internal',
        `Erreur classification: ${error.message}`
      )
    }
  }
)

// ============================================
// handleIncomingReply — Cloud Function onCall
// ============================================

export const handleIncomingReply = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, replyId, action, editedReply, campaignId } = request.data

    if (!orgId || !replyId || !action || !campaignId) {
      throw new HttpsError(
        'invalid-argument',
        'orgId, replyId, action et campaignId requis'
      )
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const validActions = ['approve', 'edit', 'reject', 'auto']
    if (!validActions.includes(action)) {
      throw new HttpsError(
        'invalid-argument',
        `Action invalide. Valeurs possibles : ${validActions.join(', ')}`
      )
    }

    const db = getDb()

    try {
      // Lire le doc reply
      const replyRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)
        .collection('replies')
        .doc(replyId)

      const replyDoc = await replyRef.get()
      if (!replyDoc.exists) {
        throw new HttpsError('not-found', 'Reponse non trouvee')
      }

      const reply = replyDoc.data()
      const intent = reply.intent

      if (reply.status === 'handled') {
        throw new HttpsError(
          'failed-precondition',
          'Cette reponse a deja ete traitee'
        )
      }

      // Recuperer le prospect
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(reply.prospectId)

      const prospectDoc = await prospectRef.get()
      const prospect = prospectDoc.exists
        ? { id: prospectDoc.id, ...prospectDoc.data() }
        : { id: reply.prospectId }

      // Recuperer la campagne
      const campaignRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)

      const campaignDoc = await campaignRef.get()
      const campaign = campaignDoc.exists
        ? { id: campaignDoc.id, ...campaignDoc.data() }
        : { id: campaignId }

      let executedAction = action

      // Si rejet, juste marquer comme rejete
      if (action === 'reject') {
        await replyRef.update({
          status: 'rejected',
          handledAt: FieldValue.serverTimestamp(),
          handledBy: request.auth.uid,
        })

        console.log(
          JSON.stringify({
            event: 'reply_rejected',
            data: { orgId, replyId, campaignId, intent },
            timestamp: Date.now(),
          })
        )

        return { success: true, action: 'rejected' }
      }

      // Executer l'action selon l'intent
      const intentConfig = REPLY_INTENTS[intent]

      switch (intent) {
        case 'INTERESTED':
        case 'MEETING_REQUEST': {
          // Deplacer prospect vers 'responded', notifier l'utilisateur
          if (prospectDoc.exists) {
            await prospectRef.update({
              crmColumn: 'RESPONDED',
              lastReplyIntent: intent,
              lastReplyAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            })
          }

          // Stopper la sequence si active
          if (intentConfig.stopSequence) {
            await stopActiveSequences(db, orgId, reply.prospectId, campaignId)
          }

          // Creer une notification urgente
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('notifications')
            .add({
              type: intent === 'MEETING_REQUEST' ? 'meeting_request' : 'hot_lead',
              prospectId: reply.prospectId,
              prospectName: reply.prospectName,
              prospectCompany: reply.prospectCompany,
              message:
                intent === 'MEETING_REQUEST'
                  ? `${reply.prospectName} demande un rendez-vous !`
                  : `${reply.prospectName} est interesse !`,
              replyId,
              campaignId,
              priority: 'critical',
              read: false,
              createdAt: FieldValue.serverTimestamp(),
            })

          executedAction = intentConfig.action
          break
        }

        case 'INFO_REQUEST':
        case 'QUESTION': {
          // Generer une reponse automatique via IA
          const autoReplyText =
            action === 'edit' && editedReply
              ? editedReply
              : await generateAutoReply({
                  prospect,
                  intent,
                  campaign,
                  replyText: reply.replyText,
                })

          // Sauvegarder comme brouillon
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('campaigns')
            .doc(campaignId)
            .collection('replies')
            .doc(replyId)
            .collection('drafts')
            .add({
              text: autoReplyText,
              generatedBy: action === 'edit' ? 'user' : 'ai',
              status: action === 'approve' || action === 'auto' ? 'ready' : 'draft',
              createdAt: FieldValue.serverTimestamp(),
              createdBy: request.auth.uid,
            })

          executedAction = intentConfig.action
          break
        }

        case 'NOT_NOW': {
          // Programmer un suivi dans 30 jours
          const followUpDate = new Date()
          followUpDate.setDate(followUpDate.getDate() + 30)

          await db
            .collection('organizations')
            .doc(orgId)
            .collection('scheduledFollowups')
            .add({
              leadId: reply.prospectId,
              prospectName: reply.prospectName,
              campaignId,
              scheduledDate: followUpDate,
              note: 'Relance automatique — prospect pas disponible maintenant',
              source: 'conversation_engine',
              status: 'pending',
              createdAt: FieldValue.serverTimestamp(),
            })

          // Mettre a jour le prospect
          if (prospectDoc.exists) {
            await prospectRef.update({
              crmColumn: 'CONTACTED',
              lastReplyIntent: 'NOT_NOW',
              nextFollowUp: followUpDate,
              updatedAt: FieldValue.serverTimestamp(),
            })
          }

          // Stopper la sequence
          if (intentConfig.stopSequence) {
            await stopActiveSequences(db, orgId, reply.prospectId, campaignId)
          }

          executedAction = 'reschedule_30d'
          break
        }

        case 'NEGATIVE':
        case 'ALREADY_HAVE': {
          // Ajouter a la liste de suppression + stopper la sequence
          if (prospectDoc.exists) {
            await prospectRef.update({
              crmColumn: 'LOST',
              lostReason: intent === 'NEGATIVE' ? 'negative_reply' : 'already_equipped',
              lastReplyIntent: intent,
              updatedAt: FieldValue.serverTimestamp(),
            })
          }

          // Suppression
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('suppressionList')
            .doc(prospect.email || reply.prospectId)
            .set({
              email: prospect.email || '',
              prospectId: reply.prospectId,
              reason: intent === 'NEGATIVE' ? 'negative_reply' : 'already_equipped',
              channel: reply.channel,
              addedAt: FieldValue.serverTimestamp(),
            })

          // Stopper la sequence
          if (intentConfig.stopSequence) {
            await stopActiveSequences(db, orgId, reply.prospectId, campaignId)
          }

          executedAction = intentConfig.action
          break
        }

        case 'GAVE_CONTACT': {
          // Extraire les infos du contact refere et creer un nouveau prospect
          const referralInfo = extractReferralInfo(reply.replyText, reply.suggestedReply)

          const newProspectData = {
            source: 'referral',
            referredBy: reply.prospectId,
            referredByName: reply.prospectName,
            firstName: referralInfo.firstName || '',
            lastName: referralInfo.lastName || '',
            email: referralInfo.email || '',
            phone: referralInfo.phone || '',
            company: prospect.company || '',
            status: 'new',
            crmColumn: 'NEW',
            notes: `Contact transmis par ${reply.prospectName}`,
            createdAt: FieldValue.serverTimestamp(),
          }

          const newProspectRef = await db
            .collection('organizations')
            .doc(orgId)
            .collection('prospects')
            .add(newProspectData)

          // Notifier
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('notifications')
            .add({
              type: 'referral',
              prospectId: reply.prospectId,
              prospectName: reply.prospectName,
              newProspectId: newProspectRef.id,
              message: `${reply.prospectName} a donne un contact : ${referralInfo.email || referralInfo.firstName || 'voir details'}`,
              replyId,
              campaignId,
              priority: 'high',
              read: false,
              createdAt: FieldValue.serverTimestamp(),
            })

          // Stopper la sequence d'origine
          if (intentConfig.stopSequence) {
            await stopActiveSequences(db, orgId, reply.prospectId, campaignId)
          }

          executedAction = 'add_referral'
          break
        }

        default:
          executedAction = 'unknown'
      }

      // Marquer la reponse comme traitee
      await replyRef.update({
        status: 'handled',
        handledAction: executedAction,
        handledAt: FieldValue.serverTimestamp(),
        handledBy: request.auth.uid,
      })

      console.log(
        JSON.stringify({
          event: 'reply_handled',
          data: {
            orgId,
            replyId,
            campaignId,
            intent,
            executedAction,
            action,
          },
          timestamp: Date.now(),
        })
      )

      return { success: true, action: executedAction }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      console.error(
        JSON.stringify({
          event: 'reply_handling_error',
          data: { orgId, replyId, campaignId, error: error.message },
          timestamp: Date.now(),
        })
      )
      throw new HttpsError(
        'internal',
        `Erreur traitement reponse: ${error.message}`
      )
    }
  }
)

// ============================================
// generateAutoReply — Fonction interne (non exportee comme CF)
// ============================================

/**
 * Genere une reponse contextuelle via IA
 * @param {Object} params
 * @param {Object} params.prospect - Prospect concerne
 * @param {string} params.intent - Intent classifie
 * @param {Object} params.campaign - Campagne associee
 * @param {string} params.replyText - Texte de la reponse du prospect
 * @returns {Promise<string>} Texte de la reponse generee
 */
async function generateAutoReply({ prospect, intent, campaign, replyText }) {
  const intentConfig = REPLY_INTENTS[intent]

  const campaignContext = campaign.icp
    ? `ICP cible : ${campaign.icp}`
    : 'Prospection commerciale B2B'

  const toneInstruction = campaign.tone
    ? `Ton souhaite : ${campaign.tone}`
    : 'Ton professionnel, courtois et direct'

  const knowledgeBase = campaign.knowledgeBase
    ? `\nBASE DE CONNAISSANCES:\n${campaign.knowledgeBase}`
    : ''

  const prompt = `Tu es un expert en redaction commerciale B2B.

CONTEXTE:
- Prospect : ${prospect.firstName || ''} ${prospect.lastName || ''} chez ${prospect.company || 'Entreprise'}
- ${campaignContext}
- ${toneInstruction}
- Intent detecte : ${intentConfig.label}
- Campagne : ${campaign.name || 'Campagne'}
${knowledgeBase}

REPONSE DU PROSPECT:
"${replyText}"

CONSIGNE:
Redige une reponse adaptee a l'intent "${intentConfig.label}".
${intent === 'INFO_REQUEST' ? 'Fournis des informations utiles basees sur la base de connaissances si disponible.' : ''}
${intent === 'QUESTION' ? 'Reponds a la question du prospect de maniere precise et utile.' : ''}

Regles :
- Maximum 100 mots
- Ton ${campaign.tone || 'professionnel et bienveillant'}
- Tutoiement interdit sauf si le prospect tutoie
- Pas de promesses irrealistes
- Termine par un appel a l'action doux (proposition de RDV, lien, etc.)
- Redige UNIQUEMENT le texte de la reponse, sans guillemets ni prefixe

Reponse :`

  const generatedText = await callAI(prompt, 300)

  // Nettoyer la reponse (supprimer guillemets encadrants potentiels)
  const cleaned = generatedText
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()

  return cleaned
}

// ============================================
// Fonctions utilitaires internes
// ============================================

/**
 * Stoppe les sequences actives pour un prospect sur une campagne donnee
 */
async function stopActiveSequences(db, orgId, prospectId, campaignId) {
  const enrollmentsSnap = await db
    .collection('organizations')
    .doc(orgId)
    .collection('campaigns')
    .doc(campaignId)
    .collection('enrollments')
    .where('status', '==', 'active')
    .get()

  const batch = db.batch()
  let stopped = 0

  for (const doc of enrollmentsSnap.docs) {
    const data = doc.data()
    if (data.prospect?.id === prospectId || data.prospectId === prospectId) {
      batch.update(doc.ref, {
        status: 'stopped',
        stoppedReason: 'reply_received',
        stoppedAt: FieldValue.serverTimestamp(),
      })
      stopped++
    }
  }

  if (stopped > 0) {
    await batch.commit()
  }

  return stopped
}

/**
 * Extrait les informations d'un contact refere depuis le texte de la reponse
 */
function extractReferralInfo(replyText, suggestedReply) {
  const combined = `${replyText} ${suggestedReply || ''}`

  // Extraire email
  const emailMatch = combined.match(/[\w.+-]+@[\w.-]+\.\w+/)
  const email = emailMatch ? emailMatch[0] : ''

  // Extraire telephone
  const phoneMatch = combined.match(
    /(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/
  )
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.-]/g, '') : ''

  // Tenter d'extraire un nom (heuristique simple)
  let firstName = ''
  let lastName = ''

  const namePatterns = [
    /contacte[rz]?\s+(?:plutot\s+)?(\w+)\s+(\w+)/i,
    /(?:mon|ma)\s+(?:collegue|collègue|responsable|directeur|directrice)\s+(\w+)\s+(\w+)/i,
    /(?:voici|c'est)\s+(\w+)\s+(\w+)/i,
    /(?:adressez|dirigez)[\s-]+vous\s+(?:a|à)\s+(\w+)\s+(\w+)/i,
  ]

  for (const pattern of namePatterns) {
    const match = combined.match(pattern)
    if (match) {
      firstName = match[1] || ''
      lastName = match[2] || ''
      break
    }
  }

  return { firstName, lastName, email, phone }
}
