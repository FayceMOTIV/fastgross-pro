/**
 * Instagram Comment-to-DM Trigger
 *
 * Automatisation Comment-to-DM:
 * - Detection de mots-cles dans les commentaires
 * - Envoi automatique de DM avec contenu
 * - Lead magnet delivery
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendPrivateReply } from './dmSender.js';
import { incrementDailyCount } from './compliance.js';

const getDb = () => getFirestore();

// ============================================
// TRAITER TRIGGER COMMENTAIRE
// ============================================
export async function processCommentTrigger(orgId, commentId, text, from, media) {
  const result = {
    triggered: false,
    triggerId: null,
    action: null,
    error: null
  };

  try {
    // 1. Recuperer les triggers actifs
    const triggers = await getActiveCommentTriggers(orgId);

    if (triggers.length === 0) {
      return result;
    }

    // 2. Verifier si le commentaire match un trigger
    const normalizedText = text?.toLowerCase().trim() || '';

    for (const trigger of triggers) {
      const matches = checkTriggerMatch(normalizedText, trigger);

      if (matches) {
        result.triggered = true;
        result.triggerId = trigger.id;

        // 3. Verifier si on a deja repondu a ce commentaire
        const alreadyResponded = await hasRespondedToComment(orgId, commentId);
        if (alreadyResponded) {
          result.action = 'already_responded';
          return result;
        }

        // 4. Verifier si on a deja envoye a cet utilisateur recemment
        const recentlySent = await hasRecentlySentTo(orgId, from.id);
        if (recentlySent && !trigger.allowMultiple) {
          result.action = 'recently_sent';
          return result;
        }

        // 5. Executer l'action du trigger
        await executeTriggerAction(orgId, trigger, commentId, from, media);

        result.action = trigger.actionType;

        // 6. Logger le trigger
        await logTriggerExecution(orgId, trigger.id, {
          commentId,
          text,
          fromId: from.id,
          fromUsername: from.username,
          mediaId: media?.id
        });

        break; // Un seul trigger par commentaire
      }
    }

    return result;

  } catch (error) {
    console.error('processCommentTrigger error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// VERIFIER MATCH TRIGGER
// ============================================
function checkTriggerMatch(text, trigger) {
  const keywords = trigger.keywords || [trigger.keyword];

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase().trim();

    switch (trigger.matchType || 'contains') {
      case 'exact':
        if (text === normalizedKeyword) return true;
        break;

      case 'starts_with':
        if (text.startsWith(normalizedKeyword)) return true;
        break;

      case 'contains':
      default:
        if (text.includes(normalizedKeyword)) return true;
        break;
    }
  }

  return false;
}

// ============================================
// EXECUTER ACTION TRIGGER
// ============================================
async function executeTriggerAction(orgId, trigger, commentId, from, media) {
  switch (trigger.actionType) {
    case 'private_reply':
      // Envoyer un DM en reponse au commentaire
      const message = personalizeMessage(trigger.message, from);
      await sendPrivateReply(orgId, commentId, message);
      await incrementDailyCount(orgId);
      break;

    case 'send_link':
      // Envoyer un lien (lead magnet, etc.)
      const linkMessage = `${trigger.message}\n\n${trigger.linkUrl}`;
      await sendPrivateReply(orgId, commentId, linkMessage);
      await incrementDailyCount(orgId);
      break;

    case 'add_to_sequence':
      // Ajouter a une sequence d'engagement
      await addToEngagementSequence(orgId, from, trigger.sequenceId);
      break;

    case 'create_lead':
      // Creer un lead dans le CRM
      await createLeadFromComment(orgId, from, commentId, media);
      break;

    default:
      console.warn(`Unknown trigger action: ${trigger.actionType}`);
  }
}

// ============================================
// PERSONNALISER MESSAGE
// ============================================
function personalizeMessage(template, from) {
  const variables = {
    '{username}': from.username || '',
    '{name}': from.username || '' // Instagram n'expose pas le nom complet
  };

  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
  }

  return message;
}

// ============================================
// CREER LEAD DEPUIS COMMENTAIRE
// ============================================
async function createLeadFromComment(orgId, from, commentId, media) {
  try {
    // Verifier si le prospect existe deja
    const existingSnapshot = await getDb().collection('organizations').doc(orgId)
      .collection('prospects')
      .where('channels.instagram.igUserId', '==', from.id)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      // Mettre a jour l'interaction
      const prospectId = existingSnapshot.docs[0].id;
      await getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.instagram.lastInteraction': FieldValue.serverTimestamp(),
          lastCommentId: commentId
        });
      return prospectId;
    }

    // Creer nouveau prospect
    const prospectRef = await getDb().collection('organizations').doc(orgId)
      .collection('prospects').add({
        source: 'instagram_comment',
        status: 'new',
        channels: {
          instagram: {
            igUserId: from.id,
            handle: from.username ? `@${from.username}` : null,
            active: true,
            lastInteraction: FieldValue.serverTimestamp()
          }
        },
        firstCommentId: commentId,
        firstMediaId: media?.id,
        createdAt: FieldValue.serverTimestamp()
      });

    return prospectRef.id;

  } catch (error) {
    console.error('createLeadFromComment error:', error);
    return null;
  }
}

// ============================================
// AJOUTER A SEQUENCE D'ENGAGEMENT
// ============================================
async function addToEngagementSequence(orgId, from, sequenceId) {
  try {
    // Trouver ou creer le prospect
    let prospectId = await createLeadFromComment(orgId, from, null, null);

    if (!prospectId) return;

    // Ajouter a la sequence
    await getDb().collection('organizations').doc(orgId)
      .collection('sequences').doc(sequenceId)
      .collection('enrollments').add({
        prospectId,
        status: 'active',
        currentStep: 0,
        enrolledAt: FieldValue.serverTimestamp(),
        source: 'instagram_trigger'
      });

  } catch (error) {
    console.error('addToEngagementSequence error:', error);
  }
}

// ============================================
// VERIFIER SI DEJA REPONDU
// ============================================
async function hasRespondedToComment(orgId, commentId) {
  try {
    const snapshot = await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggerLogs')
      .where('commentId', '==', commentId)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    return false;
  }
}

// ============================================
// VERIFIER SI ENVOYE RECEMMENT
// ============================================
async function hasRecentlySentTo(orgId, igUserId, hoursAgo = 24) {
  try {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hoursAgo);

    const snapshot = await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggerLogs')
      .where('fromId', '==', igUserId)
      .where('executedAt', '>=', threshold)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    return false;
  }
}

// ============================================
// OBTENIR TRIGGERS ACTIFS
// ============================================
async function getActiveCommentTriggers(orgId) {
  try {
    const snapshot = await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggers')
      .where('type', '==', 'comment')
      .where('enabled', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getActiveCommentTriggers error:', error);
    return [];
  }
}

// ============================================
// CREER UN TRIGGER
// ============================================
export async function createCommentTrigger(orgId, triggerData) {
  try {
    const trigger = {
      type: 'comment',
      enabled: true,
      keywords: triggerData.keywords || [triggerData.keyword],
      matchType: triggerData.matchType || 'contains',
      actionType: triggerData.actionType || 'private_reply',
      message: triggerData.message,
      linkUrl: triggerData.linkUrl,
      sequenceId: triggerData.sequenceId,
      allowMultiple: triggerData.allowMultiple || false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const ref = await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggers').add(trigger);

    return { success: true, triggerId: ref.id };
  } catch (error) {
    console.error('createCommentTrigger error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LOGGER EXECUTION TRIGGER
// ============================================
async function logTriggerExecution(orgId, triggerId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggerLogs').add({
        triggerId,
        ...data,
        executedAt: FieldValue.serverTimestamp()
      });

    // Incrementer compteur du trigger
    await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggers').doc(triggerId)
      .update({
        executionCount: FieldValue.increment(1),
        lastExecutedAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logTriggerExecution error:', error);
  }
}

// ============================================
// TEMPLATES DE TRIGGERS POPULAIRES
// ============================================
export const TRIGGER_TEMPLATES = {
  lead_magnet: {
    name: 'Lead Magnet',
    keywords: ['GUIDE', 'EBOOK', 'PDF', 'GRATUIT'],
    matchType: 'contains',
    actionType: 'send_link',
    message: 'Merci pour votre interet ! Voici votre guide gratuit :',
    description: 'Envoie un lien vers un lead magnet quand quelqu\'un commente avec un mot-cle'
  },
  demo_request: {
    name: 'Demande de Demo',
    keywords: ['DEMO', 'ESSAI', 'TEST'],
    matchType: 'contains',
    actionType: 'private_reply',
    message: 'Super ! Je vous envoie le lien pour reserver votre demo personnalisee.',
    description: 'Engage les personnes interessees par une demo'
  },
  info_request: {
    name: 'Demande d\'Info',
    keywords: ['INFO', 'PLUS', 'DETAILS', 'TARIFS', 'PRIX'],
    matchType: 'contains',
    actionType: 'private_reply',
    message: 'Bien sur ! Je vous envoie toutes les infos en DM.',
    description: 'Repond aux demandes d\'information'
  }
};
