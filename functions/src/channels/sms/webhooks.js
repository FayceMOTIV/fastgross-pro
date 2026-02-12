/**
 * SMS Webhooks - Twilio Status Callbacks
 *
 * Traitement des callbacks Twilio:
 * - Status updates (sent, delivered, failed, undelivered)
 * - Inbound messages (replies, STOP)
 * - Error handling
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';
import { processInboundSMS } from './compliance.js';

const db = getFirestore();

// ============================================
// VALIDER SIGNATURE TWILIO
// ============================================
function validateTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set, skipping signature validation');
    return true;
  }

  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  return twilio.validateRequest(
    authToken,
    signature,
    url,
    req.body
  );
}

// ============================================
// WEBHOOK STATUS CALLBACK
// ============================================
export const smsStatusWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      // Valider methode
      if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
      }

      // Valider signature Twilio (en production)
      if (process.env.NODE_ENV === 'production') {
        if (!validateTwilioSignature(req)) {
          console.error('Invalid Twilio signature');
          return res.status(403).send('Invalid signature');
        }
      }

      const {
        MessageSid,
        MessageStatus,
        To,
        From,
        ErrorCode,
        ErrorMessage,
        AccountSid
      } = req.body;

      console.log(`SMS Status: ${MessageSid} -> ${MessageStatus}`);

      // Chercher l'interaction correspondante
      const interaction = await findInteractionByMessageSid(MessageSid);

      if (interaction) {
        // Mettre a jour le statut
        await updateInteractionStatus(interaction.orgId, interaction.id, {
          status: MessageStatus,
          errorCode: ErrorCode,
          errorMessage: ErrorMessage,
          updatedAt: FieldValue.serverTimestamp()
        });

        // Actions selon le statut
        await handleStatusChange(interaction, MessageStatus, { ErrorCode, ErrorMessage });

        // Mettre a jour les analytics
        await updateChannelAnalytics(interaction.orgId, 'sms', MessageStatus);
      } else {
        // Logger le message non trouve
        console.warn(`Interaction not found for MessageSid: ${MessageSid}`);
        await logOrphanedWebhook('sms_status', req.body);
      }

      // Repondre OK a Twilio
      res.status(200).send('OK');

    } catch (error) {
      console.error('smsStatusWebhook error:', error);
      res.status(500).send('Internal error');
    }
  }
);

// ============================================
// WEBHOOK INBOUND SMS
// ============================================
export const smsInboundWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
      }

      // Valider signature
      if (process.env.NODE_ENV === 'production') {
        if (!validateTwilioSignature(req)) {
          return res.status(403).send('Invalid signature');
        }
      }

      const {
        MessageSid,
        From,
        To,
        Body,
        NumMedia,
        AccountSid
      } = req.body;

      console.log(`Inbound SMS from ${From}: ${Body?.substring(0, 50)}...`);

      // Traiter le message (STOP, reponse, etc.)
      const result = await processInboundSMS(From, Body);

      // Repondre avec TwiML si necessaire
      const twiml = new twilio.twiml.MessagingResponse();

      if (result.isOptOut) {
        // Confirmer le desabonnement
        twiml.message('Vous etes desormais desabonne. Vous ne recevrez plus de SMS de notre part.');
      }
      // Pas de reponse auto pour les autres messages

      res.type('text/xml');
      res.send(twiml.toString());

    } catch (error) {
      console.error('smsInboundWebhook error:', error);
      res.status(500).send('Internal error');
    }
  }
);

// ============================================
// TROUVER INTERACTION PAR MESSAGE SID
// ============================================
async function findInteractionByMessageSid(messageSid) {
  try {
    // Chercher dans toutes les orgs
    const orgsSnapshot = await db.collection('organizations').get();

    for (const orgDoc of orgsSnapshot.docs) {
      const interactionSnapshot = await db
        .collection('organizations').doc(orgDoc.id)
        .collection('interactions')
        .where('messageSid', '==', messageSid)
        .limit(1)
        .get();

      if (!interactionSnapshot.empty) {
        return {
          id: interactionSnapshot.docs[0].id,
          orgId: orgDoc.id,
          ...interactionSnapshot.docs[0].data()
        };
      }
    }

    return null;

  } catch (error) {
    console.error('findInteractionByMessageSid error:', error);
    return null;
  }
}

// ============================================
// METTRE A JOUR STATUT INTERACTION
// ============================================
async function updateInteractionStatus(orgId, interactionId, updates) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('interactions').doc(interactionId)
      .update(updates);
  } catch (error) {
    console.error('updateInteractionStatus error:', error);
  }
}

// ============================================
// GERER CHANGEMENT DE STATUT
// ============================================
async function handleStatusChange(interaction, status, errorInfo) {
  const { orgId, prospectId, sequenceId, stepId } = interaction;

  switch (status) {
    case 'delivered':
      // SMS delivre avec succes
      await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          lastSMSDelivered: FieldValue.serverTimestamp(),
          'channels.sms.lastDelivered': FieldValue.serverTimestamp()
        });
      break;

    case 'undelivered':
    case 'failed':
      // SMS echoue
      console.warn(`SMS failed for prospect ${prospectId}: ${errorInfo.ErrorCode} - ${errorInfo.ErrorMessage}`);

      // Mettre a jour le prospect
      await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.sms.lastError': {
            code: errorInfo.ErrorCode,
            message: errorInfo.ErrorMessage,
            at: FieldValue.serverTimestamp()
          }
        });

      // Codes d'erreur specifiques
      if (errorInfo.ErrorCode === '30003' || errorInfo.ErrorCode === '30004') {
        // Numero invalide ou injoignable - marquer comme non disponible
        await db.collection('organizations').doc(orgId)
          .collection('prospects').doc(prospectId)
          .update({
            'channels.sms.available': false,
            'channels.sms.unavailableReason': 'invalid_number'
          });
      }
      break;

    case 'sent':
      // SMS envoye (en cours de livraison)
      break;

    case 'queued':
      // SMS en file d'attente
      break;
  }
}

// ============================================
// METTRE A JOUR ANALYTICS CANAL
// ============================================
async function updateChannelAnalytics(orgId, channel, status) {
  const today = new Date().toISOString().split('T')[0];

  try {
    const analyticsRef = db.collection('organizations').doc(orgId)
      .collection('channelAnalytics').doc(today);

    const statusField = mapStatusToField(status);
    if (statusField) {
      await analyticsRef.set({
        date: today,
        [`channels.${channel}.${statusField}`]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

  } catch (error) {
    console.error('updateChannelAnalytics error:', error);
  }
}

function mapStatusToField(status) {
  const mapping = {
    'queued': 'queued',
    'sent': 'sent',
    'delivered': 'delivered',
    'undelivered': 'failed',
    'failed': 'failed',
    'read': 'read'
  };
  return mapping[status] || null;
}

// ============================================
// LOGGER WEBHOOK ORPHELIN
// ============================================
async function logOrphanedWebhook(type, data) {
  try {
    await db.collection('orphanedWebhooks').add({
      type,
      data,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('logOrphanedWebhook error:', error);
  }
}

// ============================================
// EXPORTS
// ============================================
export { validateTwilioSignature };
