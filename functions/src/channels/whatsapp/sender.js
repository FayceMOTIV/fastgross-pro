/**
 * WhatsApp Sender - Evolution API + Meta Cloud API
 *
 * Provider routing:
 * - Si EVOLUTION_API_URL est configure → Evolution API (self-hosted, gratuit)
 * - Sinon → Meta Cloud API (officiel, payant)
 *
 * Evolution API (self-hosted):
 * - Messages texte libres (pas de fenetre 24h)
 * - Pas besoin de templates approuves
 *
 * Meta Cloud API:
 * - Templates pre-approuves (hors fenetre 24h)
 * - Messages libres (dans fenetre 24h)
 * - Quick reply buttons
 * - Media support
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js';
import { isInSessionWindow, updateSession, createSession } from './sessionManager.js';
import { getApprovedTemplate, validateTemplateParams } from './templates.js';

const getDb = () => getFirestore();

// ============================================
// PROVIDER DETECTION
// ============================================
const useEvolutionAPI = () => !!process.env.EVOLUTION_API_URL;

const getEvolutionConfig = async (orgId) => {
  // Multi-tenant : chercher l'instance du tenant dans Firestore
  if (orgId) {
    try {
      const configRef = getDb().collection('organizations').doc(orgId)
        .collection('integrations').doc('whatsapp');
      const configSnap = await configRef.get();

      if (configSnap.exists) {
        const data = configSnap.data();
        if (data?.instanceName && data?.status === 'connected') {
          return {
            url: process.env.EVOLUTION_API_URL,
            apiKey: process.env.EVOLUTION_API_KEY,
            instanceName: data.instanceName,
          };
        }
      }
    } catch (err) {
      console.error('getEvolutionConfig tenant lookup error:', err.message);
    }
  }

  // Fallback : instance globale
  return {
    url: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3',
  };
};

// ============================================
// EVOLUTION API — ENVOI MESSAGE (avec retry + backoff)
// ============================================
async function sendEvolutionMessage(orgId, phone, text, maxRetries = 3) {
  const config = await getEvolutionConfig(orgId);
  const url = `${config.url}/message/sendText/${config.instanceName}`;
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ number: phone, text }),
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        lastError = { message: data.response?.message || data.error || 'Evolution API error' };
        if (attempt < maxRetries - 1) {
          console.warn(`[WhatsApp] Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { error: lastError };
      }

      return {
        messages: [{ id: data.key?.id || data.messageId || `evo_${Date.now()}` }]
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = { message: 'Evolution API timeout (30s)' };
      } else {
        lastError = { message: err.message || 'Evolution API unreachable' };
      }

      if (attempt < maxRetries - 1) {
        console.warn(`[WhatsApp] Attempt ${attempt + 1}/${maxRetries} error:`, lastError.message);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return { error: lastError || { message: 'Max retries exceeded' } };
}

// ============================================
// CONFIGURATION META CLOUD API
// ============================================
const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const getMetaConfig = async (orgId) => {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('whatsapp');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
      };
    }

    return configSnap.data();
  } catch (error) {
    console.error('getMetaConfig error:', error);
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    };
  }
};

// ============================================
// ENVOYER UN MESSAGE WHATSAPP
// ============================================
export async function sendWhatsApp(orgId, prospectId, messageData, options = {}) {
  const result = {
    success: false,
    messageId: null,
    messageType: null,
    error: null,
    complianceChecks: []
  };

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'whatsapp');
    result.complianceChecks = complianceResult.checks;

    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`;
      result.details = complianceResult.details;
      return result;
    }

    // 2. Recuperer le prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.error = 'Prospect not found';
      return result;
    }

    const prospect = prospectSnap.data();
    const phone = prospect.phone || prospect.mobile;

    if (!phone) {
      result.error = 'No phone number for prospect';
      return result;
    }

    // 3. Formater le numero (WhatsApp format)
    const formattedPhone = formatWhatsAppNumber(phone);
    if (!formattedPhone) {
      result.error = 'Invalid phone number format';
      return result;
    }

    // 4. Determiner le provider et envoyer
    let response;
    let sessionCheck = { inSession: false };

    if (useEvolutionAPI()) {
      // Evolution API — envoi direct, pas de fenetre 24h
      const text = messageData.text || messageData.body || '';
      const personalizedText = replaceVariables(text, prospect, options);
      response = await sendEvolutionMessage(orgId, formattedPhone, personalizedText);
      result.messageType = 'evolution';
    } else {
      // Meta Cloud API — gestion session 24h + templates
      sessionCheck = await isInSessionWindow(orgId, prospectId);

      let messagePayload;

      if (sessionCheck.inSession) {
        messagePayload = await buildSessionMessage(messageData, prospect, options);
        result.messageType = 'session';
      } else {
        if (!messageData.templateName) {
          result.error = 'Template required outside 24h session window';
          return result;
        }
        messagePayload = await buildTemplateMessage(orgId, messageData, prospect, options);
        result.messageType = 'template';
      }

      if (!messagePayload) {
        result.error = 'Failed to build message payload';
        return result;
      }

      const config = await getMetaConfig(orgId);
      response = await sendMetaMessage(config, formattedPhone, messagePayload);
    }

    if (response.error) {
      result.error = response.error.message || 'WhatsApp API error';
      result.apiError = response.error;
      return result;
    }

    result.success = true;
    result.messageId = response.messages?.[0]?.id;

    // 7. Creer/mettre a jour la session (Meta API seulement)
    if (!useEvolutionAPI() && !sessionCheck.inSession) {
      await createSession(orgId, prospectId, formattedPhone);
    }

    // 8. Enregistrer le touchpoint
    await recordTouchpoint(orgId, prospectId, 'whatsapp');

    // 9. Logger l'interaction
    await logWhatsAppInteraction(orgId, prospectId, {
      type: 'whatsapp_sent',
      messageId: result.messageId,
      messageType: result.messageType,
      to: formattedPhone,
      templateName: messageData.templateName,
      sequenceId: options.sequenceId,
      stepId: options.stepId
    });

    return result;

  } catch (error) {
    console.error('sendWhatsApp error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENVOYER VIA META API
// ============================================
async function sendMetaMessage(config, to, payload) {
  const url = `${META_API_BASE}/${config.phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...payload
  };

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
      console.error('Meta API error:', data);
      return { error: data.error || { message: 'Unknown error' } };
    }

    return data;

  } catch (error) {
    console.error('sendMetaMessage error:', error);
    return { error: { message: error.message } };
  }
}

// ============================================
// CONSTRUIRE MESSAGE SESSION (libre)
// ============================================
async function buildSessionMessage(messageData, prospect, options) {
  const { text, type = 'text' } = messageData;

  // Remplacer les variables
  const personalizedText = replaceVariables(text, prospect, options);

  switch (type) {
    case 'text':
      return {
        type: 'text',
        text: {
          preview_url: true,
          body: personalizedText
        }
      };

    case 'interactive_buttons':
      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: personalizedText
          },
          action: {
            buttons: (messageData.buttons || []).slice(0, 3).map((btn, idx) => ({
              type: 'reply',
              reply: {
                id: btn.id || `btn_${idx}`,
                title: btn.title.substring(0, 20) // Max 20 chars
              }
            }))
          }
        }
      };

    case 'interactive_list':
      return {
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: personalizedText
          },
          action: {
            button: messageData.listButtonText || 'Options',
            sections: messageData.sections || []
          }
        }
      };

    default:
      return {
        type: 'text',
        text: {
          preview_url: true,
          body: personalizedText
        }
      };
  }
}

// ============================================
// CONSTRUIRE MESSAGE TEMPLATE
// ============================================
async function buildTemplateMessage(orgId, messageData, prospect, options) {
  const { templateName, language = 'fr' } = messageData;

  // Recuperer le template approuve
  const template = await getApprovedTemplate(orgId, templateName);

  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return null;
  }

  // Preparer les composants
  const components = [];

  // Header (si present)
  if (template.header && messageData.headerParams) {
    components.push({
      type: 'header',
      parameters: messageData.headerParams.map(param => ({
        type: param.type || 'text',
        [param.type || 'text']: param.value
      }))
    });
  }

  // Body parameters
  if (messageData.bodyParams || template.bodyVariables) {
    const bodyParams = messageData.bodyParams || [];

    // Auto-remplir depuis le prospect si pas fourni
    const autoParams = template.bodyVariables?.map(varName => {
      const value = getProspectVariable(prospect, varName);
      return { type: 'text', text: value };
    }) || [];

    const finalParams = bodyParams.length > 0 ? bodyParams : autoParams;

    if (finalParams.length > 0) {
      components.push({
        type: 'body',
        parameters: finalParams.map(param => ({
          type: 'text',
          text: String(param.text || param.value || '')
        }))
      });
    }
  }

  // Buttons (si present)
  if (template.buttons && messageData.buttonParams) {
    messageData.buttonParams.forEach((btnParam, idx) => {
      components.push({
        type: 'button',
        sub_type: btnParam.type || 'quick_reply',
        index: idx,
        parameters: btnParam.parameters || []
      });
    });
  }

  return {
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: language
      },
      components: components.length > 0 ? components : undefined
    }
  };
}

// ============================================
// FORMATER NUMERO WHATSAPP
// ============================================
function formatWhatsAppNumber(phone) {
  if (!phone) return null;

  // Nettoyer le numero
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Supprimer le + initial
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Si commence par 0 (France), remplacer par 33
  if (cleaned.startsWith('0')) {
    cleaned = '33' + cleaned.substring(1);
  }

  // Valider format (digits uniquement, 10-15 chars)
  if (!/^\d{10,15}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

// ============================================
// REMPLACER LES VARIABLES
// ============================================
function replaceVariables(text, prospect, options = {}) {
  const variables = {
    '{{1}}': prospect.firstName || prospect.prenom || '',
    '{{2}}': prospect.company || prospect.entreprise || '',
    '{{3}}': prospect.sector || prospect.secteur || '',
    '{prenom}': prospect.firstName || prospect.prenom || '',
    '{nom}': prospect.lastName || prospect.nom || '',
    '{entreprise}': prospect.company || prospect.entreprise || '',
    '{poste}': prospect.position || prospect.poste || '',
    ...options.customVariables
  };

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'gi'), value);
  }

  return result.trim();
}

// ============================================
// OBTENIR VARIABLE PROSPECT
// ============================================
function getProspectVariable(prospect, varName) {
  const mapping = {
    'prenom': prospect.firstName || prospect.prenom || '',
    'nom': prospect.lastName || prospect.nom || '',
    'entreprise': prospect.company || prospect.entreprise || '',
    'poste': prospect.position || prospect.poste || '',
    'ville': prospect.city || prospect.ville || '',
    'secteur': prospect.sector || prospect.secteur || '',
    'email': prospect.email || ''
  };

  return mapping[varName.toLowerCase()] || varName;
}

// ============================================
// LOGGER INTERACTION
// ============================================
async function logWhatsAppInteraction(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'whatsapp',
        direction: 'out',
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logWhatsAppInteraction error:', error);
  }
}

// ============================================
// ENVOYER MESSAGE INTERACTIF
// ============================================
export async function sendWhatsAppInteractive(orgId, prospectId, interactiveData, options = {}) {
  return sendWhatsApp(orgId, prospectId, {
    ...interactiveData,
    type: interactiveData.interactiveType || 'interactive_buttons'
  }, options);
}

// ============================================
// MARQUER MESSAGE COMME LU
// ============================================
export async function markAsRead(orgId, messageId) {
  try {
    const config = await getMetaConfig(orgId);
    const url = `${META_API_BASE}/${config.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });

    return response.ok;

  } catch (error) {
    console.error('markAsRead error:', error);
    return false;
  }
}

export { formatWhatsAppNumber };
