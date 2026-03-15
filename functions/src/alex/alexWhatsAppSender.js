/**
 * alexWhatsAppSender.js — Envoi de reponses riches Alex via Evolution API
 * Supporte: texte, boutons, listes, images, documents, audio, localisation
 */

import { getFirestore } from 'firebase-admin/firestore';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://94.130.184.44:8080';
const getApiKey = () => process.env.EVOLUTION_API_KEY || 'fmf-evolution-key-2026';
const DEFAULT_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3';

/**
 * Multi-tenant: resolve Evolution instance for an org, fallback to global
 */
async function getInstanceForOrg(orgId) {
  if (orgId) {
    try {
      const db = getFirestore();
      const configSnap = await db.collection('organizations').doc(orgId)
        .collection('integrations').doc('whatsapp').get();
      if (configSnap.exists) {
        const data = configSnap.data();
        if (data?.instanceName && data?.status === 'connected') {
          return data.instanceName;
        }
      }
    } catch {
      // Fallback instance globale
    }
  }
  return DEFAULT_INSTANCE;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Envoyer la reponse d'Alex formatee pour WhatsApp
 */
export async function sendAlexWhatsAppResponse(phone, alexResponse, orgId) {
  const wa = alexResponse.whatsapp || { type: 'text' };

  // 1. Envoyer le message principal
  switch (wa.type) {
    case 'buttons':
      await sendButtonMessage(phone, alexResponse.message, wa.buttons || [], orgId);
      break;
    case 'list':
      await sendListMessage(phone, alexResponse.message, wa.list || {}, orgId);
      break;
    default:
      await sendTextMessage(phone, alexResponse.message, orgId);
  }

  // 2. Envoyer les messages de suivi (si plusieurs bulles)
  if (wa.followUpMessages && wa.followUpMessages.length > 0) {
    for (const followUp of wa.followUpMessages) {
      await sleep(1500);
      await sendTextMessage(phone, followUp, orgId);
    }
  }
}

/**
 * Message texte simple
 */
export async function sendTextMessage(phone, text, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '').replace(/@s\.whatsapp\.net$/, '');
  if (!cleanPhone || !text) return;

  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        text,
        delay: 1200,
      }),
    });
  } catch (error) {
    console.error('[AlexWA Sender] sendTextMessage error:', error.message);
  }
}

/**
 * Message avec boutons (max 3)
 * Fallback texte si les boutons natifs ne marchent pas (Baileys)
 */
async function sendButtonMessage(phone, text, buttons, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!buttons || buttons.length === 0) {
    return sendTextMessage(phone, text, orgId);
  }

  const instance = await getInstanceForOrg(orgId);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendButtons/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        title: 'Alex',
        description: text,
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: {
            id: b.id || 'btn',
            title: String(b.text || '').substring(0, 20),
          },
        })),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    // Fallback : envoyer en texte formate
    console.warn('[AlexWA Sender] Buttons fallback to text:', error.message);
    const buttonText = buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
    const fallbackText = `${text}\n\n${buttonText}\n\n_Reponds avec le numero de ton choix_`;
    await sendTextMessage(phone, fallbackText, orgId);
  }
}

/**
 * Message avec liste (plus de 3 options)
 */
async function sendListMessage(phone, text, list, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  if (!list || !list.sections) {
    return sendTextMessage(phone, text, orgId);
  }

  const instance = await getInstanceForOrg(orgId);
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendList/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        title: 'Alex',
        description: text,
        buttonText: list.buttonText || 'Voir les options',
        footerText: 'Face Media Factory',
        sections: list.sections.map(section => ({
          title: section.title || '',
          rows: (section.rows || []).map(row => ({
            rowId: row.id || 'row',
            title: String(row.title || '').substring(0, 24),
            description: String(row.description || '').substring(0, 72),
          })),
        })),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    // Fallback texte
    console.warn('[AlexWA Sender] List fallback to text:', error.message);
    let fallbackText = text + '\n';
    for (const section of (list.sections || [])) {
      fallbackText += `\n*${section.title}*\n`;
      (section.rows || []).forEach((row, i) => {
        fallbackText += `${i + 1}. ${row.title}${row.description ? ' — ' + row.description : ''}\n`;
      });
    }
    fallbackText += '\n_Reponds avec le numero de ton choix_';
    await sendTextMessage(phone, fallbackText, orgId);
  }
}

/**
 * Indicateur "en train d'ecrire..."
 */
export async function sendTypingIndicator(phone, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/chat/presence/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: `${cleanPhone}@s.whatsapp.net`,
        delay: 3000,
        presence: 'composing',
      }),
    });
  } catch {
    // Pas critique
  }
}

/**
 * Envoyer une image
 */
export async function sendImageMessage(phone, imageUrl, caption, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'image',
        media: imageUrl,
        caption: caption || '',
      }),
    });
  } catch (error) {
    console.error('[AlexWA Sender] sendImageMessage error:', error.message);
  }
}

/**
 * Envoyer un document (PDF)
 */
export async function sendDocumentMessage(phone, documentUrl, filename, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'document',
        media: documentUrl,
        fileName: filename || 'rapport-alex.pdf',
      }),
    });
  } catch (error) {
    console.error('[AlexWA Sender] sendDocumentMessage error:', error.message);
  }
}

/**
 * Envoyer un message audio (vocal Alex)
 */
export async function sendAudioMessage(phone, audioUrl, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        audio: audioUrl,
      }),
    });
  } catch (error) {
    console.error('[AlexWA Sender] sendAudioMessage error:', error.message);
  }
}

/**
 * Envoyer une localisation
 */
export async function sendLocationMessage(phone, lat, lng, name, address, orgId) {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const instance = await getInstanceForOrg(orgId);
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendLocation/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getApiKey(),
      },
      body: JSON.stringify({
        number: cleanPhone,
        latitude: lat,
        longitude: lng,
        name: name || '',
        address: address || '',
      }),
    });
  } catch (error) {
    console.error('[AlexWA Sender] sendLocationMessage error:', error.message);
  }
}
