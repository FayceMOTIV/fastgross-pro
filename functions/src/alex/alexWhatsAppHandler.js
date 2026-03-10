/**
 * alexWhatsAppHandler.js — Reception des messages WhatsApp du user FMF
 * Le user parle a Alex depuis WhatsApp → meme cerveau que le web
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ==========================================
// COMMANDES RAPIDES (evite d'appeler Groq)
// ==========================================
const QUICK_COMMANDS = {
  'stats': 'Montre-moi mes stats de cette semaine',
  'prospects': 'Montre-moi les derniers prospects trouves',
  'chauds': 'Quels sont les prospects chauds en attente ?',
  'pause': 'Mets la prospection en pause',
  'go': 'Reprends la prospection',
  'reprends': 'Reprends la prospection',
  'rapport': 'Envoie-moi le rapport maintenant',
  'aide': null,
  'help': null,
};

function handleQuickCommand(messageText) {
  const normalized = (messageText || '').trim().toLowerCase();

  if (normalized === 'aide' || normalized === 'help') {
    return {
      isQuickCommand: true,
      skipBrain: true,
      response: {
        message: '*Commandes rapides Alex :*\n\n' +
          'stats — Tes KPIs de la semaine\n' +
          'prospects — Derniers prospects trouves\n' +
          'chauds — Prospects chauds en attente\n' +
          'pause — Mettre en pause\n' +
          'go — Reprendre\n' +
          'rapport — Rapport immediat\n\n' +
          'Ou parle-moi naturellement, je comprends tout',
        whatsapp: { type: 'text' },
      },
    };
  }

  if (Object.prototype.hasOwnProperty.call(QUICK_COMMANDS, normalized) && QUICK_COMMANDS[normalized] !== null) {
    return {
      isQuickCommand: true,
      skipBrain: false,
      expandedMessage: QUICK_COMMANDS[normalized],
    };
  }

  return { isQuickCommand: false };
}

// ==========================================
// PARSING DES REPONSES BOUTONS / LISTES
// ==========================================
function parseButtonResponse(message) {
  // Reponse a un bouton
  if (message?.message?.buttonsResponseMessage) {
    return {
      type: 'button',
      id: message.message.buttonsResponseMessage.selectedButtonId,
      text: message.message.buttonsResponseMessage.selectedDisplayText,
    };
  }

  // Reponse a une liste
  if (message?.message?.listResponseMessage) {
    return {
      type: 'list',
      id: message.message.listResponseMessage.singleSelectReply?.selectedRowId,
      title: message.message.listResponseMessage.title,
    };
  }

  // Reponse numerique (fallback si boutons pas supportes)
  const text = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
  const numMatch = text.match(/^(\d)$/);
  if (numMatch) {
    return {
      type: 'number',
      id: `option_${numMatch[1]}`,
      text,
    };
  }

  return null;
}

const BUTTON_MAPPINGS = {
  'view_prospects': 'Montre-moi les prospects',
  'contact_all': 'Contacte-les tous',
  'contact_top3': 'Contacte les 3 meilleurs',
  'view_stats': 'Montre-moi mes stats',
  'adjust_search': 'Je veux ajuster la recherche',
  'yes_go': 'Oui vas-y',
  'good_idea': 'Bonne idee, fais-le',
  'detail_prospect': 'Donne-moi plus de details',
  'call_prospect': 'Je vais l\'appeler',
  'daily_report': 'Envoie-moi un rapport',
  'pause': 'Mets en pause',
  'resume': 'Reprends la prospection',
};

function buttonToNaturalMessage(buttonResponse) {
  if (!buttonResponse) return null;
  return BUTTON_MAPPINGS[buttonResponse.id] || buttonResponse.text || buttonResponse.id;
}

// ==========================================
// HANDLER PRINCIPAL — WEBHOOK INCOMING
// ==========================================
export const alexWhatsAppIncoming = onRequest(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (req, res) => {
    try {
      const { event, data } = req.body || {};

      // On ne traite que les messages entrants
      if (event !== 'messages.upsert') {
        res.status(200).send('OK');
        return;
      }

      const message = data;
      const senderPhone = message?.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const isFromMe = message?.key?.fromMe;

      // Extraire le texte du message (texte, bouton, liste)
      let messageText = message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.buttonsResponseMessage?.selectedButtonId
        || message?.message?.listResponseMessage?.singleSelectReply?.selectedRowId
        || '';

      // Ignorer les messages envoyes par nous-memes
      if (isFromMe || !senderPhone || !messageText) {
        res.status(200).send('OK');
        return;
      }

      console.log(`[AlexWA] Message recu de ${senderPhone}: "${messageText}"`);

      const db = getDb();

      // Verifier si ce numero appartient a un user FMF
      const userMapping = await db.collection('whatsappUserMappings')
        .where('phone', '==', senderPhone)
        .where('active', '==', true)
        .limit(1)
        .get();

      if (userMapping.empty) {
        // Ce n'est PAS un user FMF → c'est un PROSPECT qui repond
        console.log(`[AlexWA] Prospect (non-user) ${senderPhone}, routing vers flux prospect`);
        await handleProspectReply(db, senderPhone, messageText);
        res.status(200).send('OK');
        return;
      }

      // C'est un USER FMF qui parle a Alex
      const userData = userMapping.docs[0].data();
      const { organizationId, userId } = userData;

      console.log(`[AlexWA] User FMF ${senderPhone} parle a Alex (org: ${organizationId})`);

      // Envoyer le "typing" indicator
      const { sendTypingIndicator, sendAlexWhatsAppResponse } = await import('./alexWhatsAppSender.js');
      await sendTypingIndicator(senderPhone);

      // Verifier les commandes rapides
      const quickCmd = handleQuickCommand(messageText);
      if (quickCmd.isQuickCommand && quickCmd.skipBrain) {
        await sendAlexWhatsAppResponse(senderPhone, quickCmd.response);
        res.status(200).send('OK');
        return;
      }

      // Si commande rapide expandee, remplacer le texte
      if (quickCmd.isQuickCommand && quickCmd.expandedMessage) {
        messageText = quickCmd.expandedMessage;
      }

      // Verifier si c'est une reponse a un bouton
      const buttonResp = parseButtonResponse(message);
      if (buttonResp) {
        const natural = buttonToNaturalMessage(buttonResp);
        if (natural) messageText = natural;
      }

      // Appeler le cerveau d'Alex (meme que le web)
      const { chatWithAlexInternal } = await import('./alexBrain.js');
      const alexResponse = await chatWithAlexInternal(messageText, organizationId, userId);

      // Formater et envoyer la reponse
      await sendAlexWhatsAppResponse(senderPhone, alexResponse);

      res.status(200).send('OK');
    } catch (error) {
      console.error('[AlexWA] Erreur:', error.message);
      res.status(200).send('OK'); // Toujours 200 pour eviter les retries
    }
  }
);

/**
 * Gerer la reponse d'un prospect (pas un user FMF)
 */
async function handleProspectReply(db, phone, text) {
  try {
    const prospects = await db.collectionGroup('prospects')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (!prospects.empty) {
      const prospectRef = prospects.docs[0].ref;
      await prospectRef.update({
        lastReply: text,
        repliedAt: new Date(),
        status: 'replied',
      });
      // alertHotLead (Prompt 4) se declenchera via onDocumentUpdated
    }
  } catch (error) {
    console.warn('[AlexWA] handleProspectReply error:', error.message);
  }
}
