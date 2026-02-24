/**
 * Voicemail Callback Tracker
 *
 * Detection et suivi des rappels:
 * - Webhook Drop Cowboy
 * - Matching appels entrants
 * - Conversion tracking
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// WEBHOOK DROP COWBOY
// ============================================
export const voicemailWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
      }

      // Valider secret (optionnel)
      const webhookSecret = process.env.DROPCOWBOY_WEBHOOK_SECRET;
      if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
        return res.status(403).send('Invalid webhook secret');
      }

      const payload = req.body;

      console.log('Voicemail webhook:', payload);

      // Traiter selon le type d'evenement
      const eventType = payload.event || payload.type;

      switch (eventType) {
        case 'delivered':
        case 'rvm_delivered':
          await handleDelivered(payload);
          break;

        case 'failed':
        case 'rvm_failed':
          await handleFailed(payload);
          break;

        case 'callback':
        case 'call_received':
          await handleCallback(payload);
          break;

        default:
          console.log(`Unknown voicemail event: ${eventType}`);
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('voicemailWebhook error:', error);
      res.status(500).send('Internal error');
    }
  }
);

// ============================================
// GERER VOICEMAIL DELIVRE
// ============================================
async function handleDelivered(payload) {
  const { id, foreign_id, phone, delivered_at } = payload;

  try {
    // Trouver l'interaction
    const interaction = await findInteractionByDropId(id);

    if (interaction) {
      // Mettre a jour le statut
      await getDb().collection('organizations').doc(interaction.orgId)
        .collection('interactions').doc(interaction.id)
        .update({
          status: 'delivered',
          deliveredAt: delivered_at ? new Date(delivered_at) : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

      // Mettre a jour le prospect
      await getDb().collection('organizations').doc(interaction.orgId)
        .collection('prospects').doc(interaction.prospectId)
        .update({
          'channels.voicemail.lastDelivered': FieldValue.serverTimestamp()
        });

      // Mettre a jour analytics
      await updateChannelAnalytics(interaction.orgId, 'voicemail', 'delivered');
    }

  } catch (error) {
    console.error('handleDelivered error:', error);
  }
}

// ============================================
// GERER VOICEMAIL ECHOUE
// ============================================
async function handleFailed(payload) {
  const { id, foreign_id, phone, error_code, error_message } = payload;

  try {
    const interaction = await findInteractionByDropId(id);

    if (interaction) {
      await getDb().collection('organizations').doc(interaction.orgId)
        .collection('interactions').doc(interaction.id)
        .update({
          status: 'failed',
          errorCode: error_code,
          errorMessage: error_message,
          updatedAt: FieldValue.serverTimestamp()
        });

      // Marquer le prospect comme non-joignable en voicemail
      if (error_code === 'invalid_number' || error_code === 'not_mobile') {
        await getDb().collection('organizations').doc(interaction.orgId)
          .collection('prospects').doc(interaction.prospectId)
          .update({
            'channels.voicemail.vmEnabled': false,
            'channels.voicemail.failReason': error_message
          });
      }

      await updateChannelAnalytics(interaction.orgId, 'voicemail', 'failed');
    }

  } catch (error) {
    console.error('handleFailed error:', error);
  }
}

// ============================================
// GERER RAPPEL
// ============================================
async function handleCallback(payload) {
  const { phone, call_id, duration, timestamp } = payload;

  try {
    // Trouver le prospect par numero
    const prospect = await findProspectByPhone(phone);

    if (prospect) {
      // Enregistrer le callback
      await getDb().collection('organizations').doc(prospect.orgId)
        .collection('interactions').add({
          type: 'voicemail_callback',
          channel: 'voicemail',
          direction: 'in',
          prospectId: prospect.id,
          phone,
          callId: call_id,
          duration,
          createdAt: timestamp ? new Date(timestamp) : FieldValue.serverTimestamp()
        });

      // Mettre a jour le prospect
      await getDb().collection('organizations').doc(prospect.orgId)
        .collection('prospects').doc(prospect.id)
        .update({
          status: 'callback_received',
          lastCallbackAt: FieldValue.serverTimestamp(),
          'channels.voicemail.lastCallback': FieldValue.serverTimestamp()
        });

      // Notification equipe
      await notifyTeam(prospect.orgId, {
        type: 'voicemail_callback',
        prospectId: prospect.id,
        prospectName: `${prospect.firstName} ${prospect.lastName}`,
        company: prospect.company,
        phone
      });

      await updateChannelAnalytics(prospect.orgId, 'voicemail', 'callback');
    }

  } catch (error) {
    console.error('handleCallback error:', error);
  }
}

// ============================================
// ENREGISTRER APPEL ENTRANT MANUELLEMENT
// ============================================
export async function recordInboundCall(orgId, callData) {
  try {
    const { phone, prospectId, duration, notes } = callData;

    // Si pas de prospectId, chercher par telephone
    let targetProspectId = prospectId;
    if (!targetProspectId && phone) {
      const prospect = await findProspectByPhoneInOrg(orgId, phone);
      if (prospect) {
        targetProspectId = prospect.id;
      }
    }

    if (!targetProspectId) {
      return { success: false, error: 'Prospect not found' };
    }

    // Verifier si c'est potentiellement un callback voicemail
    const recentVoicemail = await findRecentVoicemail(orgId, targetProspectId, 72); // 72h

    const interactionRef = await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: recentVoicemail ? 'voicemail_callback' : 'inbound_call',
        channel: 'voicemail',
        direction: 'in',
        prospectId: targetProspectId,
        phone,
        duration,
        notes,
        relatedVoicemailId: recentVoicemail?.id,
        createdAt: FieldValue.serverTimestamp()
      });

    // Mettre a jour prospect
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(targetProspectId)
      .update({
        status: 'callback_received',
        lastCallbackAt: FieldValue.serverTimestamp()
      });

    return {
      success: true,
      interactionId: interactionRef.id,
      isCallback: !!recentVoicemail
    };

  } catch (error) {
    console.error('recordInboundCall error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR STATS CALLBACKS
// ============================================
export async function getCallbackStats(orgId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Voicemails envoyes
    const sentSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('type', '==', 'voicemail_dropped')
      .where('createdAt', '>=', startDate)
      .get();

    // Callbacks recus
    const callbacksSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('type', '==', 'voicemail_callback')
      .where('createdAt', '>=', startDate)
      .get();

    const sent = sentSnap.size;
    const callbacks = callbacksSnap.size;
    const callbackRate = sent > 0 ? ((callbacks / sent) * 100).toFixed(1) : 0;

    // Delivered
    let delivered = 0;
    sentSnap.forEach(doc => {
      if (doc.data().status === 'delivered') delivered++;
    });

    return {
      period: `${days} jours`,
      sent,
      delivered,
      deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
      callbacks,
      callbackRate,
      conversionFunnel: {
        sent,
        delivered,
        callbacks
      }
    };

  } catch (error) {
    console.error('getCallbackStats error:', error);
    return { sent: 0, callbacks: 0, callbackRate: 0 };
  }
}

// ============================================
// HELPERS
// ============================================
async function findInteractionByDropId(dropId) {
  try {
    const orgsSnap = await getDb().collection('organizations').get();

    for (const orgDoc of orgsSnap.docs) {
      const interactionSnap = await getDb().collection('organizations').doc(orgDoc.id)
        .collection('interactions')
        .where('dropId', '==', dropId)
        .limit(1)
        .get();

      if (!interactionSnap.empty) {
        return {
          id: interactionSnap.docs[0].id,
          orgId: orgDoc.id,
          ...interactionSnap.docs[0].data()
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function findProspectByPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const variations = [
    cleaned,
    `+${cleaned}`,
    cleaned.startsWith('33') ? `0${cleaned.substring(2)}` : cleaned
  ];

  try {
    const orgsSnap = await getDb().collection('organizations').get();

    for (const orgDoc of orgsSnap.docs) {
      for (const phoneVar of variations) {
        const prospectSnap = await getDb().collection('organizations').doc(orgDoc.id)
          .collection('prospects')
          .where('phone', '==', phoneVar)
          .limit(1)
          .get();

        if (!prospectSnap.empty) {
          return {
            id: prospectSnap.docs[0].id,
            orgId: orgDoc.id,
            ...prospectSnap.docs[0].data()
          };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function findProspectByPhoneInOrg(orgId, phone) {
  const cleaned = phone.replace(/\D/g, '');

  const prospectSnap = await getDb().collection('organizations').doc(orgId)
    .collection('prospects')
    .where('phone', '==', cleaned)
    .limit(1)
    .get();

  if (!prospectSnap.empty) {
    return {
      id: prospectSnap.docs[0].id,
      ...prospectSnap.docs[0].data()
    };
  }

  return null;
}

async function findRecentVoicemail(orgId, prospectId, hoursAgo) {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() - hoursAgo);

  const snap = await getDb().collection('organizations').doc(orgId)
    .collection('interactions')
    .where('type', '==', 'voicemail_dropped')
    .where('prospectId', '==', prospectId)
    .where('createdAt', '>=', threshold)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  return null;
}

async function notifyTeam(orgId, notification) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('notifications').add({
        ...notification,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('notifyTeam error:', error);
  }
}

async function updateChannelAnalytics(orgId, channel, metric) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('channelAnalytics').doc(today)
      .set({
        date: today,
        [`channels.${channel}.${metric}`]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
  } catch (error) {
    console.error('updateChannelAnalytics error:', error);
  }
}
