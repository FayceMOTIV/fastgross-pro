/**
 * Reply Handler — Traitement structure des reponses de prospects
 * Classifie la reponse, genere 2 scripts de reponse IA, notifie le client via WhatsApp + Firestore
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { classifyReply, REPLY_CATEGORIES } from '../engine/replyClassifier.js'
import { callAI, extractJSON } from '../ai/callAI.js'

const getDb = () => getFirestore()

// --- Emoji par categorie ---
const CATEGORY_EMOJI = {
  POSITIVE: '🟢',
  NEGATIVE: '🔴',
  OBJECTION: '🟠',
  REFERRAL: '🔵',
  OOO: '⚪',
  WRONG_PERSON: '🟣',
  UNSUBSCRIBE: '⛔',
  NEUTRAL: '⚫',
}

// --- Generation de scripts de reponse IA ---

async function generateResponseScripts(replyText, prospect, classification) {
  const prompt = `Tu es un expert en cold outreach B2B. Un prospect a repondu a notre message de prospection.

REPONSE DU PROSPECT:
"${replyText}"

CLASSIFICATION: ${classification.category} (${REPLY_CATEGORIES[classification.category]?.label || 'Neutre'})

CONTEXTE PROSPECT:
- Nom: ${prospect.name || 'Inconnu'}
- Entreprise: ${prospect.company || prospect.industry || 'Non renseigne'}
- Canal: ${prospect.channel || 'email'}
- Score: ${prospect.score || prospect.alexScore || 'N/A'}

CONSIGNES:
- Genere 2 scripts de reponse differents, chacun adapte a la classification
- Script 1: Reponse directe et professionnelle
- Script 2: Reponse plus chaleureuse et relationnelle
- Les scripts doivent etre courts (3-5 phrases max)
- En francais
- Tutoyer si le prospect tutoie, vouvoyer sinon
- Si NEGATIVE/UNSUBSCRIBE: genere un message de cloture poli

Retourne UNIQUEMENT ce JSON:
{
  "script1": { "label": "Direct", "text": "..." },
  "script2": { "label": "Relationnel", "text": "..." },
  "actionRecommandee": "description courte de l'action a prendre"
}`

  try {
    const text = await callAI(prompt, 500)
    const result = extractJSON(text)
    if (result && result.script1 && result.script2) {
      return result
    }
  } catch (error) {
    logger.warn('[ReplyHandler] AI script generation failed:', error.message)
  }

  // Fallback heuristique
  return getFallbackScripts(classification.category, prospect)
}

function getFallbackScripts(category, prospect) {
  const name = prospect.name || 'Monsieur/Madame'

  const scripts = {
    POSITIVE: {
      script1: { label: 'Direct', text: `Bonjour ${name}, merci pour votre interet ! Je vous propose un echange rapide cette semaine. Quelles sont vos disponibilites ?` },
      script2: { label: 'Relationnel', text: `Bonjour ${name}, ravi de votre retour ! J'aimerais beaucoup echanger avec vous pour mieux comprendre vos besoins. Quel creneau vous conviendrait ?` },
      actionRecommandee: 'Proposer un rendez-vous rapidement',
    },
    NEGATIVE: {
      script1: { label: 'Cloture', text: `Merci pour votre retour ${name}. Je respecte votre decision. N'hesitez pas a revenir vers nous si vos besoins evoluent.` },
      script2: { label: 'Doux', text: `Bien compris ${name}. Je ne vous solliciterai plus. Bonne continuation dans vos projets !` },
      actionRecommandee: 'Ajouter a la liste de suppression',
    },
    OBJECTION: {
      script1: { label: 'Direct', text: `Je comprends votre point ${name}. Permettez-moi de vous apporter quelques precisions qui pourraient changer votre perspective.` },
      script2: { label: 'Relationnel', text: `Excellente question ${name} ! C'est justement un sujet qu'on adresse regulierement. Voulez-vous qu'on en discute rapidement ?` },
      actionRecommandee: 'Repondre a l\'objection avec des arguments adaptes',
    },
    REFERRAL: {
      script1: { label: 'Direct', text: `Merci pour cette redirection ${name}. Je vais contacter la personne de votre part. Bonne journee !` },
      script2: { label: 'Relationnel', text: `C'est tres gentil ${name} ! Pourriez-vous nous mettre en relation par email ? Ce serait ideal.` },
      actionRecommandee: 'Contacter le nouveau referent',
    },
    OOO: {
      script1: { label: 'Relance', text: `Pas de souci ! Je reviendrai vers vous apres votre retour. Bonnes vacances !` },
      script2: { label: 'Note', text: `Note interne : replanifier le contact apres la date de retour indiquee.` },
      actionRecommandee: 'Replanifier le contact apres retour',
    },
    WRONG_PERSON: {
      script1: { label: 'Direct', text: `Merci de me l'indiquer ${name}. Pourriez-vous me diriger vers la bonne personne pour ce sujet ?` },
      script2: { label: 'Relationnel', text: `Desolee pour la confusion ${name} ! Sauriez-vous qui serait le bon interlocuteur chez vous pour discuter de ce sujet ?` },
      actionRecommandee: 'Demander le bon contact',
    },
    UNSUBSCRIBE: {
      script1: { label: 'Confirmation', text: `Bien note ${name}. Vous avez ete retire de notre liste. Nous ne vous contacterons plus.` },
      script2: { label: 'Cloture', text: `C'est fait ${name}. Desolee pour le derangement. Bonne continuation !` },
      actionRecommandee: 'Retirer de toutes les sequences',
    },
    NEUTRAL: {
      script1: { label: 'Relance', text: `Merci pour votre retour ${name}. Y a-t-il des informations supplementaires que je puisse vous apporter ?` },
      script2: { label: 'Engagement', text: `Merci ${name} ! Pour mieux cerner vos besoins, seriez-vous disponible pour un rapide appel de 10 minutes ?` },
      actionRecommandee: 'Relancer avec une proposition concrete',
    },
  }

  return scripts[category] || scripts.NEUTRAL
}

// --- Notification WhatsApp structuree ---

async function sendWhatsAppNotification(orgId, prospect, classification, scripts, channel, replyText) {
  const db = getDb()

  // Recuperer le numero WhatsApp du client (owner de l'org)
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  if (!orgDoc.exists) return { sent: false, reason: 'org_not_found' }

  const orgData = orgDoc.data()
  const notifyPhone = orgData.notificationPhone || orgData.ownerPhone
  const notifyWhatsApp = orgData.notificationWhatsApp !== false // default true

  if (!notifyPhone || !notifyWhatsApp) {
    logger.info(`[ReplyHandler] WhatsApp notification disabled or no phone for org:${orgId}`)
    return { sent: false, reason: 'no_phone_or_disabled' }
  }

  const emoji = CATEGORY_EMOJI[classification.category] || '📩'
  const categoryLabel = REPLY_CATEGORIES[classification.category]?.label || 'Neutre'
  const prospectName = prospect.name || 'Prospect inconnu'
  const prospectCompany = prospect.company || prospect.industry || ''

  // Message WhatsApp structure
  const message = [
    `${emoji} *NOUVELLE REPONSE — ${categoryLabel.toUpperCase()}*`,
    '',
    `👤 *${prospectName}*${prospectCompany ? ` — ${prospectCompany}` : ''}`,
    `📱 Canal: ${channel}`,
    `📊 Score: ${prospect.score || prospect.alexScore || 'N/A'}`,
    '',
    `💬 *Message:*`,
    `"${replyText.length > 200 ? replyText.substring(0, 200) + '...' : replyText}"`,
    '',
    `✍️ *Script 1 (${scripts.script1.label}):*`,
    scripts.script1.text,
    '',
    `✍️ *Script 2 (${scripts.script2.label}):*`,
    scripts.script2.text,
    '',
    `⚡ *Action:* ${scripts.actionRecommandee}`,
  ].join('\n')

  // Sauvegarder dans la notification queue (sera envoye par le WhatsApp sender existant)
  try {
    await db.collection(`organizations/${orgId}/notificationQueue`).add({
      type: 'reply_alert',
      channel: 'whatsapp',
      to: notifyPhone,
      message,
      priority: classification.category === 'POSITIVE' ? 'urgent' : 'normal',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    return { sent: true, to: notifyPhone }
  } catch (error) {
    logger.error(`[ReplyHandler] Failed to queue WhatsApp notification:`, error.message)
    return { sent: false, reason: error.message }
  }
}

// --- Fonction principale ---

/**
 * Traite une reponse entrante:
 * 1. Classifie la reponse via replyClassifier
 * 2. Genere 2 scripts de reponse IA
 * 3. Sauvegarde dans Firestore (replyFeeds)
 * 4. Envoie notification WhatsApp au client
 *
 * @param {string} orgId
 * @param {string} prospectId
 * @param {string} channel - canal de la reponse (whatsapp, email, instagram, linkedin)
 * @param {string} replyText - texte de la reponse
 * @param {string} from - identifiant expediteur
 * @returns {Object} resultat du traitement
 */
export async function handleIncomingReply(orgId, prospectId, channel, replyText, from) {
  const db = getDb()

  logger.info(`[ReplyHandler] Processing reply for org:${orgId} prospect:${prospectId} channel:${channel}`)

  // 1. Recuperer le prospect
  const prospectDoc = await db
    .collection(`organizations/${orgId}/prospects`)
    .doc(prospectId)
    .get()

  const prospect = prospectDoc.exists
    ? { id: prospectId, ...prospectDoc.data() }
    : { id: prospectId, name: from, channel }

  // 2. Classifier la reponse
  const classification = await classifyReply(replyText, prospect, callAI)

  logger.info(`[ReplyHandler] Classification: ${classification.category} (${classification.confidence})`, {
    orgId,
    prospectId,
    method: classification.method,
  })

  // 3. Generer les scripts de reponse
  const scripts = await generateResponseScripts(replyText, prospect, classification)

  // 4. Sauvegarder dans replyFeeds
  const replyDoc = {
    orgId,
    prospectId,
    prospectName: prospect.name || from,
    prospectCompany: prospect.company || prospect.industry || '',
    channel,
    from,
    replyText,
    classification: {
      category: classification.category,
      label: REPLY_CATEGORIES[classification.category]?.label || 'Neutre',
      confidence: classification.confidence,
      sentiment: classification.sentiment,
      method: classification.method,
    },
    scripts: {
      script1: scripts.script1,
      script2: scripts.script2,
      actionRecommandee: scripts.actionRecommandee,
    },
    status: 'unread',
    actionTaken: null,
    createdAt: FieldValue.serverTimestamp(),
  }

  const replyRef = await db.collection(`organizations/${orgId}/replyFeeds`).add(replyDoc)

  // 5. Mettre a jour le prospect
  const prospectUpdate = {
    lastReplyAt: FieldValue.serverTimestamp(),
    lastReplyChannel: channel,
    lastReplyClassification: classification.category,
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Changer le statut si reponse positive
  if (classification.category === 'POSITIVE') {
    prospectUpdate.alexStatus = 'replied'
  } else if (classification.category === 'NEGATIVE' || classification.category === 'UNSUBSCRIBE') {
    prospectUpdate.alexStatus = 'lost'
    prospectUpdate.blacklisted = classification.category === 'UNSUBSCRIBE'
  }

  if (prospectDoc.exists) {
    await prospectDoc.ref.update(prospectUpdate)
  }

  // 6. Creer la notification Firestore (in-app)
  await db.collection(`organizations/${orgId}/notifications`).add({
    type: 'prospect_reply',
    prospectId,
    prospectName: prospect.name || from,
    channel,
    classification: classification.category,
    message: `${CATEGORY_EMOJI[classification.category] || '📩'} ${prospect.name || from} a repondu (${REPLY_CATEGORIES[classification.category]?.label || 'Neutre'})`,
    priority: classification.category === 'POSITIVE' ? 'high' : 'low',
    replyFeedId: replyRef.id,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  })

  // 7. Envoyer notification WhatsApp
  const whatsAppResult = await sendWhatsAppNotification(
    orgId,
    prospect,
    classification,
    scripts,
    channel,
    replyText
  )

  // 8. Incrementer les stats
  await db.collection(`organizations/${orgId}/analytics`).doc('replies').set({
    totalReplies: FieldValue.increment(1),
    [`byCategory.${classification.category}`]: FieldValue.increment(1),
    [`byChannel.${channel}`]: FieldValue.increment(1),
    lastReplyAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  const result = {
    replyFeedId: replyRef.id,
    classification: classification.category,
    confidence: classification.confidence,
    scripts: {
      script1: scripts.script1,
      script2: scripts.script2,
    },
    whatsAppNotification: whatsAppResult,
    prospectStatusUpdated: true,
  }

  logger.info(`[ReplyHandler] Done for org:${orgId} prospect:${prospectId}`, result)

  return result
}

/**
 * Marque un replyFeed comme lu/traite
 */
export async function markReplyHandled(orgId, replyFeedId, action) {
  const db = getDb()

  await db.collection(`organizations/${orgId}/replyFeeds`).doc(replyFeedId).update({
    status: 'handled',
    actionTaken: action,
    handledAt: FieldValue.serverTimestamp(),
  })

  return { success: true }
}

/**
 * Recupere les stats du reply handler
 */
export async function getReplyHandlerStats(orgId) {
  const db = getDb()

  const analyticsDoc = await db
    .collection(`organizations/${orgId}/analytics`)
    .doc('replies')
    .get()

  const analytics = analyticsDoc.exists ? analyticsDoc.data() : {}

  // Compter les non-lus
  const unreadSnap = await db
    .collection(`organizations/${orgId}/replyFeeds`)
    .where('status', '==', 'unread')
    .count()
    .get()

  return {
    totalReplies: analytics.totalReplies || 0,
    unreadCount: unreadSnap.data().count,
    byCategory: analytics.byCategory || {},
    byChannel: analytics.byChannel || {},
    lastReplyAt: analytics.lastReplyAt || null,
  }
}
