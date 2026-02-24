/**
 * Instagram Webhook Handler
 *
 * Traitement des webhooks Meta pour Instagram:
 * - Messages entrants (DMs)
 * - Reactions aux messages
 * - Story replies
 * - Commentaires
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { findProspectByIgUserId } from './dmSender.js';
import { processCommentTrigger } from './commentTrigger.js';
import { updateSessionInbound } from '../whatsapp/sessionManager.js';

const getDb = () => getFirestore();

// ============================================
// VERIFIER SIGNATURE WEBHOOK
// ============================================
function verifyWebhookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn('META_APP_SECRET not set');
    return true; // Skip validation in dev
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return signature === expectedSignature;
}

// ============================================
// WEBHOOK VERIFICATION (GET)
// ============================================
export const instagramWebhookVerify = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
      console.error('INSTAGRAM_WEBHOOK_VERIFY_TOKEN not set');
      return res.status(500).send('Server misconfigured');
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Instagram webhook verified');
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Forbidden');
  }
);

// ============================================
// WEBHOOK HANDLER (POST)
// ============================================
export const instagramWebhookHandler = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
      }

      // Verifier signature en production
      if (process.env.NODE_ENV === 'production') {
        if (!verifyWebhookSignature(req)) {
          console.error('Invalid webhook signature');
          return res.status(403).send('Invalid signature');
        }
      }

      const body = req.body;

      // Verifier que c'est Instagram
      if (body.object !== 'instagram') {
        return res.status(200).send('OK');
      }

      // Traiter les entrees
      for (const entry of body.entry || []) {
        await processEntry(entry);
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('instagramWebhookHandler error:', error);
      res.status(500).send('Internal error');
    }
  }
);

// ============================================
// TRAITER UNE ENTREE WEBHOOK
// ============================================
async function processEntry(entry) {
  const igUserId = entry.id;

  // Messages
  if (entry.messaging) {
    for (const event of entry.messaging) {
      await processMessagingEvent(event, igUserId);
    }
  }

  // Commentaires
  if (entry.changes) {
    for (const change of entry.changes) {
      if (change.field === 'comments') {
        await processCommentEvent(change.value, igUserId);
      }
      if (change.field === 'mentions') {
        await processMentionEvent(change.value, igUserId);
      }
    }
  }
}

// ============================================
// TRAITER EVENEMENT MESSAGE
// ============================================
async function processMessagingEvent(event, pageIgUserId) {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;

  // Ignorer nos propres messages
  if (senderId === pageIgUserId) {
    return;
  }

  // Message texte
  if (event.message) {
    await handleIncomingMessage(event, pageIgUserId);
  }

  // Reaction
  if (event.reaction) {
    await handleReaction(event, pageIgUserId);
  }

  // Story reply
  if (event.message?.reply_to?.story) {
    await handleStoryReply(event, pageIgUserId);
  }

  // Message echo (notre message delivre)
  if (event.message?.is_echo) {
    await handleMessageEcho(event, pageIgUserId);
  }

  // Message read
  if (event.read) {
    await handleMessageRead(event, pageIgUserId);
  }
}

// ============================================
// GERER MESSAGE ENTRANT
// ============================================
async function handleIncomingMessage(event, pageIgUserId) {
  const senderId = event.sender.id;
  const messageText = event.message.text || '';
  const messageId = event.message.mid;
  const timestamp = event.timestamp;

  console.log(`IG DM from ${senderId}: ${messageText.substring(0, 50)}...`);

  // Trouver l'org a partir du page IG user ID
  const orgId = await findOrgByIgUserId(pageIgUserId);

  if (!orgId) {
    console.warn(`Org not found for IG user ${pageIgUserId}`);
    await logUnmatchedWebhook('instagram_message', event);
    return;
  }

  // Trouver le prospect
  const prospect = await findProspectByIgUserId(orgId, senderId);

  if (prospect) {
    // Enregistrer la reponse
    await logInstagramReply(orgId, prospect.id, {
      messageId,
      text: messageText,
      senderId,
      timestamp
    });

    // Mettre a jour interaction pour compliance
    await updateProspectInteraction(orgId, prospect.id);

    // Verifier si c'est une reponse a un trigger
    if (event.message.quick_reply) {
      await handleQuickReply(orgId, prospect.id, event.message.quick_reply);
    }
  } else {
    // Nouveau contact - creer prospect si trigger keyword
    await handleNewContact(orgId, senderId, messageText, messageId);
  }
}

// ============================================
// GERER REACTION
// ============================================
async function handleReaction(event, pageIgUserId) {
  const senderId = event.sender.id;
  const reaction = event.reaction.reaction;
  const emoji = event.reaction.emoji;
  const messageId = event.reaction.mid;

  console.log(`IG reaction from ${senderId}: ${emoji || reaction}`);

  const orgId = await findOrgByIgUserId(pageIgUserId);
  if (!orgId) return;

  const prospect = await findProspectByIgUserId(orgId, senderId);
  if (!prospect) return;

  await getDb().collection('organizations').doc(orgId)
    .collection('instagramInteractions').add({
      type: 'reaction',
      prospectId: prospect.id,
      senderId,
      reaction: emoji || reaction,
      messageId,
      createdAt: FieldValue.serverTimestamp()
    });

  // Une reaction compte comme interaction
  await updateProspectInteraction(orgId, prospect.id);
}

// ============================================
// GERER STORY REPLY
// ============================================
async function handleStoryReply(event, pageIgUserId) {
  const senderId = event.sender.id;
  const storyId = event.message.reply_to.story.id;
  const replyText = event.message.text;

  console.log(`IG story reply from ${senderId}`);

  const orgId = await findOrgByIgUserId(pageIgUserId);
  if (!orgId) return;

  const prospect = await findProspectByIgUserId(orgId, senderId);

  await getDb().collection('organizations').doc(orgId)
    .collection('instagramInteractions').add({
      type: 'story_reply',
      prospectId: prospect?.id,
      senderId,
      storyId,
      text: replyText,
      createdAt: FieldValue.serverTimestamp()
    });

  // Story reply = interaction prealable satisfaite
  if (prospect) {
    await updateProspectInteraction(orgId, prospect.id);
  }
}

// ============================================
// GERER COMMENTAIRE
// ============================================
async function processCommentEvent(value, pageIgUserId) {
  const {
    id: commentId,
    text,
    from,
    media
  } = value;

  console.log(`IG comment from ${from?.username}: ${text?.substring(0, 50)}...`);

  const orgId = await findOrgByIgUserId(pageIgUserId);
  if (!orgId) return;

  // Logger le commentaire
  await getDb().collection('organizations').doc(orgId)
    .collection('instagramInteractions').add({
      type: 'comment',
      commentId,
      text,
      fromId: from?.id,
      fromUsername: from?.username,
      mediaId: media?.id,
      createdAt: FieldValue.serverTimestamp()
    });

  // Verifier triggers comment-to-DM
  await processCommentTrigger(orgId, commentId, text, from, media);
}

// ============================================
// GERER MENTION
// ============================================
async function processMentionEvent(value, pageIgUserId) {
  const { media_id, comment_id } = value;

  console.log(`IG mention in media ${media_id}`);

  const orgId = await findOrgByIgUserId(pageIgUserId);
  if (!orgId) return;

  await getDb().collection('organizations').doc(orgId)
    .collection('instagramInteractions').add({
      type: 'mention',
      mediaId: media_id,
      commentId: comment_id,
      createdAt: FieldValue.serverTimestamp()
    });
}

// ============================================
// GERER QUICK REPLY
// ============================================
async function handleQuickReply(orgId, prospectId, quickReply) {
  const payload = quickReply.payload;

  await getDb().collection('organizations').doc(orgId)
    .collection('interactions').add({
      type: 'instagram_quick_reply',
      channel: 'instagram',
      direction: 'in',
      prospectId,
      payload,
      createdAt: FieldValue.serverTimestamp()
    });

  // Actions basees sur le payload
  if (payload === 'INTERESTED' || payload === 'YES') {
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        status: 'replied_positive',
        lastReplyAt: FieldValue.serverTimestamp(),
        lastReplyChannel: 'instagram'
      });
  }
}

// ============================================
// GERER MESSAGE ECHO
// ============================================
async function handleMessageEcho(event, pageIgUserId) {
  // Message envoye par nous - mettre a jour le statut si necessaire
  const messageId = event.message.mid;

  // Optionnel: tracker la delivrabilite
}

// ============================================
// GERER MESSAGE LU
// ============================================
async function handleMessageRead(event, pageIgUserId) {
  const watermark = event.read.watermark;

  // Optionnel: marquer les messages comme lus
}

// ============================================
// GERER NOUVEAU CONTACT
// ============================================
async function handleNewContact(orgId, igUserId, messageText, messageId) {
  // Verifier si c'est un trigger keyword
  const triggers = await getKeywordTriggers(orgId);

  for (const trigger of triggers) {
    if (messageText.toUpperCase().includes(trigger.keyword.toUpperCase())) {
      // Creer un nouveau prospect
      const prospectRef = await getDb().collection('organizations').doc(orgId)
        .collection('prospects').add({
          source: 'instagram_dm',
          status: 'new',
          channels: {
            instagram: {
              igUserId,
              handle: null, // Sera enrichi
              active: true,
              lastInteraction: FieldValue.serverTimestamp()
            }
          },
          triggerKeyword: trigger.keyword,
          firstMessage: messageText,
          createdAt: FieldValue.serverTimestamp()
        });

      console.log(`New prospect created from IG DM: ${prospectRef.id}`);

      // Executer l'action du trigger
      if (trigger.autoReply) {
        // Envoyer reponse automatique
        await sendTriggerResponse(orgId, igUserId, trigger.autoReply);
      }

      break;
    }
  }
}

// ============================================
// HELPERS
// ============================================
async function findOrgByIgUserId(igUserId) {
  try {
    const orgsSnapshot = await getDb().collection('organizations').get();

    for (const orgDoc of orgsSnapshot.docs) {
      const integrationSnap = await getDb().collection('organizations').doc(orgDoc.id)
        .collection('integrations').doc('instagram').get();

      if (integrationSnap.exists && integrationSnap.data().igUserId === igUserId) {
        return orgDoc.id;
      }
    }

    // Fallback: check env var
    if (process.env.INSTAGRAM_USER_ID === igUserId && process.env.DEFAULT_ORG_ID) {
      return process.env.DEFAULT_ORG_ID;
    }

    return null;
  } catch (error) {
    console.error('findOrgByIgUserId error:', error);
    return null;
  }
}

async function logInstagramReply(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: 'instagram_reply',
        channel: 'instagram',
        direction: 'in',
        prospectId,
        ...data,
        createdAt: FieldValue.serverTimestamp()
      });

    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        status: 'replied',
        lastReplyAt: FieldValue.serverTimestamp(),
        lastReplyChannel: 'instagram'
      });
  } catch (error) {
    console.error('logInstagramReply error:', error);
  }
}

async function updateProspectInteraction(orgId, prospectId) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.instagram.lastInteraction': FieldValue.serverTimestamp(),
        'channels.instagram.active': true
      });
  } catch (error) {
    console.error('updateProspectInteraction error:', error);
  }
}

async function getKeywordTriggers(orgId) {
  try {
    const snapshot = await getDb().collection('organizations').doc(orgId)
      .collection('instagramTriggers')
      .where('type', '==', 'keyword')
      .where('enabled', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    return [];
  }
}

async function sendTriggerResponse(orgId, igUserId, message) {
  // Import dynamique pour eviter circular dependency
  const { sendInstagramDM } = await import('./dmSender.js');

  // Trouver ou creer le prospect
  const prospect = await findProspectByIgUserId(orgId, igUserId);

  if (prospect) {
    // Note: on bypass compliance car c'est une reponse a un trigger
    // await sendInstagramDM(orgId, prospect.id, message);
  }
}

async function logUnmatchedWebhook(type, data) {
  try {
    await getDb().collection('unmatchedWebhooks').add({
      type,
      data,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('logUnmatchedWebhook error:', error);
  }
}
