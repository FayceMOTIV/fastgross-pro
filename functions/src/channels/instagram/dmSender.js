/**
 * Instagram DM Sender - Meta Graph API
 *
 * Envoi de DMs Instagram via l'API officielle Meta:
 * - Messages texte
 * - Images et media
 * - Quick replies (templates)
 * - Rate limiting (70 DM/jour safe)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js';
import { checkRateLimit, incrementDailyCount } from './compliance.js';

const getDb = () => getFirestore();

// ============================================
// META GRAPH API CONFIG
// ============================================
const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// Rate limit safe: 70 DMs/jour
const DAILY_DM_LIMIT = 70;

// ============================================
// OBTENIR CONFIG INSTAGRAM
// ============================================
async function getInstagramConfig(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('instagram');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        pageId: process.env.INSTAGRAM_PAGE_ID,
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
        igUserId: process.env.INSTAGRAM_USER_ID
      };
    }

    return configSnap.data();
  } catch (error) {
    console.error('getInstagramConfig error:', error);
    return {
      pageId: process.env.INSTAGRAM_PAGE_ID,
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      igUserId: process.env.INSTAGRAM_USER_ID
    };
  }
}

// ============================================
// ENVOYER UN DM INSTAGRAM
// ============================================
export async function sendInstagramDM(orgId, prospectId, message, options = {}) {
  const result = {
    success: false,
    messageId: null,
    error: null,
    complianceChecks: []
  };

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'instagram');
    result.complianceChecks = complianceResult.checks;

    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`;
      result.details = complianceResult.details;
      return result;
    }

    // 2. Verifier rate limit
    const rateCheck = await checkRateLimit(orgId);
    if (!rateCheck.allowed) {
      result.error = `Rate limit exceeded: ${rateCheck.count}/${DAILY_DM_LIMIT} DMs today`;
      return result;
    }

    // 3. Recuperer le prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.error = 'Prospect not found';
      return result;
    }

    const prospect = prospectSnap.data();

    // 4. Verifier Instagram ID ou handle
    const igUserId = prospect.channels?.instagram?.igUserId ||
                     prospect.instagramId ||
                     prospect.instagram_id;

    if (!igUserId) {
      result.error = 'No Instagram user ID for prospect';
      return result;
    }

    // 5. Preparer le message personnalise
    const personalizedMessage = replaceVariables(message, prospect, options);

    // 6. Envoyer via Meta Graph API
    const config = await getInstagramConfig(orgId);
    const response = await sendMetaDM(config, igUserId, personalizedMessage, options);

    if (response.error) {
      result.error = response.error.message || 'Meta API error';
      result.metaError = response.error;
      return result;
    }

    result.success = true;
    result.messageId = response.message_id || response.id;

    // 7. Incrementer compteur rate limit
    await incrementDailyCount(orgId);

    // 8. Enregistrer le touchpoint
    await recordTouchpoint(orgId, prospectId, 'instagram');

    // 9. Logger l'interaction
    await logInstagramInteraction(orgId, prospectId, {
      type: 'instagram_dm_sent',
      messageId: result.messageId,
      recipientId: igUserId,
      text: personalizedMessage,
      sequenceId: options.sequenceId,
      stepId: options.stepId
    });

    return result;

  } catch (error) {
    console.error('sendInstagramDM error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENVOYER VIA META GRAPH API
// ============================================
async function sendMetaDM(config, recipientId, message, options = {}) {
  const url = `${META_API_BASE}/${config.igUserId}/messages`;

  const body = {
    recipient: {
      id: recipientId
    },
    message: {
      text: message
    }
  };

  // Ajouter quick replies si fournis
  if (options.quickReplies && options.quickReplies.length > 0) {
    body.message.quick_replies = options.quickReplies.slice(0, 13).map(qr => ({
      content_type: 'text',
      title: qr.title.substring(0, 20),
      payload: qr.payload || qr.title
    }));
  }

  // Ajouter image si fournie
  if (options.imageUrl) {
    body.message = {
      attachment: {
        type: 'image',
        payload: {
          url: options.imageUrl,
          is_reusable: true
        }
      }
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta Instagram API error:', data);
      return { error: data.error || { message: 'Unknown error' } };
    }

    return data;

  } catch (error) {
    console.error('sendMetaDM error:', error);
    return { error: { message: error.message } };
  }
}

// ============================================
// ENVOYER REPONSE A UN COMMENTAIRE (Comment-to-DM)
// ============================================
export async function sendPrivateReply(orgId, commentId, message, options = {}) {
  const result = {
    success: false,
    messageId: null,
    error: null
  };

  try {
    const config = await getInstagramConfig(orgId);

    // Verifier rate limit
    const rateCheck = await checkRateLimit(orgId);
    if (!rateCheck.allowed) {
      result.error = 'Rate limit exceeded';
      return result;
    }

    const url = `${META_API_BASE}/${commentId}/private_replies`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      result.error = data.error?.message || 'Failed to send private reply';
      return result;
    }

    result.success = true;
    result.messageId = data.id;

    await incrementDailyCount(orgId);

    return result;

  } catch (error) {
    console.error('sendPrivateReply error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENVOYER MEDIA (Image)
// ============================================
export async function sendInstagramMedia(orgId, prospectId, mediaUrl, caption = '') {
  return sendInstagramDM(orgId, prospectId, caption, { imageUrl: mediaUrl });
}

// ============================================
// OBTENIR CONVERSATION HISTORY
// ============================================
export async function getConversationHistory(orgId, prospectId, limit = 20) {
  try {
    const config = await getInstagramConfig(orgId);

    // Recuperer l'IG user ID du prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { error: 'Prospect not found' };
    }

    const prospect = prospectSnap.data();
    const igUserId = prospect.channels?.instagram?.igUserId;

    if (!igUserId) {
      return { error: 'No Instagram user ID' };
    }

    // Recuperer les conversations
    const url = `${META_API_BASE}/${config.igUserId}/conversations?user_id=${igUserId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    if (!response.ok) {
      return { error: 'Failed to fetch conversations' };
    }

    const data = await response.json();
    const conversationId = data.data?.[0]?.id;

    if (!conversationId) {
      return { messages: [] };
    }

    // Recuperer les messages
    const messagesUrl = `${META_API_BASE}/${conversationId}/messages?limit=${limit}`;

    const messagesResponse = await fetch(messagesUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    const messagesData = await messagesResponse.json();

    return {
      conversationId,
      messages: messagesData.data || []
    };

  } catch (error) {
    console.error('getConversationHistory error:', error);
    return { error: error.message };
  }
}

// ============================================
// REMPLACER VARIABLES
// ============================================
function replaceVariables(message, prospect, options = {}) {
  const variables = {
    '{prenom}': prospect.firstName || prospect.prenom || '',
    '{nom}': prospect.lastName || prospect.nom || '',
    '{entreprise}': prospect.company || prospect.entreprise || '',
    '{instagram}': prospect.channels?.instagram?.handle || '',
    ...options.customVariables
  };

  let result = message;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value);
  }

  return result.trim();
}

// ============================================
// LOGGER INTERACTION
// ============================================
async function logInstagramInteraction(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'instagram',
        direction: 'out',
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logInstagramInteraction error:', error);
  }
}

// ============================================
// TROUVER PROSPECT PAR IG USER ID
// ============================================
export async function findProspectByIgUserId(orgId, igUserId) {
  try {
    const snapshot = await getDb().collection('organizations').doc(orgId)
      .collection('prospects')
      .where('channels.instagram.igUserId', '==', igUserId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };

  } catch (error) {
    console.error('findProspectByIgUserId error:', error);
    return null;
  }
}

export { DAILY_DM_LIMIT };
