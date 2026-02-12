/**
 * Voicemail Drop Sender - Drop Cowboy API
 *
 * Ringless Voicemail Drop:
 * - Envoi direct vers messagerie vocale
 * - AI Voice Cloning
 * - Variables dynamiques dans l'audio
 * - ~$0.004/drop
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js';
import { generateScript } from './scriptGenerator.js';
import { checkVoicemailCompliance, isWithinBusinessHours } from './compliance.js';

const db = getFirestore();

// ============================================
// DROP COWBOY API CONFIG
// ============================================
const DROP_COWBOY_API_BASE = 'https://api.dropcowboy.com/v1';

// ============================================
// OBTENIR CONFIG DROP COWBOY
// ============================================
async function getDropCowboyConfig(orgId) {
  try {
    const configRef = db.collection('organizations').doc(orgId)
      .collection('integrations').doc('voicemail');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        teamId: process.env.DROPCOWBOY_TEAM_ID,
        secret: process.env.DROPCOWBOY_SECRET,
        brandId: process.env.DROPCOWBOY_BRAND_ID,
        callerId: process.env.DROPCOWBOY_CALLER_ID
      };
    }

    return configSnap.data();
  } catch (error) {
    console.error('getDropCowboyConfig error:', error);
    return {
      teamId: process.env.DROPCOWBOY_TEAM_ID,
      secret: process.env.DROPCOWBOY_SECRET,
      brandId: process.env.DROPCOWBOY_BRAND_ID,
      callerId: process.env.DROPCOWBOY_CALLER_ID
    };
  }
}

// ============================================
// ENVOYER UN VOICEMAIL DROP
// ============================================
export async function sendVoicemailDrop(orgId, prospectId, options = {}) {
  const result = {
    success: false,
    dropId: null,
    error: null,
    complianceChecks: []
  };

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'voicemail');
    result.complianceChecks = complianceResult.checks;

    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`;
      result.details = complianceResult.details;
      return result;
    }

    // 2. Verifier heures ouvrables
    if (!options.ignoreHours) {
      const hoursCheck = isWithinBusinessHours();
      if (!hoursCheck.allowed) {
        result.error = `Outside business hours: ${hoursCheck.reason}`;
        result.scheduledFor = hoursCheck.nextWindow;
        return result;
      }
    }

    // 3. Recuperer le prospect
    const prospectRef = db.collection('organizations').doc(orgId)
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

    // 4. Formater le numero
    const formattedPhone = formatPhoneForVoicemail(phone);
    if (!formattedPhone) {
      result.error = 'Invalid phone number format';
      return result;
    }

    // 5. Obtenir ou generer le script
    let scriptContent;
    if (options.scriptId) {
      // Script pre-enregistre
      scriptContent = await getScript(orgId, options.scriptId);
    } else if (options.templateId) {
      // Generer depuis template
      scriptContent = await generateScript(orgId, options.templateId, prospect);
    } else if (options.text) {
      // Texte brut pour TTS
      scriptContent = { type: 'tts', text: options.text };
    } else {
      result.error = 'No script, template, or text provided';
      return result;
    }

    // 6. Preparer la requete Drop Cowboy
    const config = await getDropCowboyConfig(orgId);

    // 7. Envoyer via Drop Cowboy API
    const response = await sendDropCowboyRequest(config, {
      phone: formattedPhone,
      script: scriptContent,
      prospect,
      options
    });

    if (response.error) {
      result.error = response.error;
      return result;
    }

    result.success = true;
    result.dropId = response.id;
    result.status = response.status;

    // 8. Enregistrer le touchpoint
    await recordTouchpoint(orgId, prospectId, 'voicemail');

    // 9. Logger l'interaction
    await logVoicemailInteraction(orgId, prospectId, {
      type: 'voicemail_dropped',
      dropId: result.dropId,
      phone: formattedPhone,
      scriptType: scriptContent.type,
      sequenceId: options.sequenceId,
      stepId: options.stepId
    });

    return result;

  } catch (error) {
    console.error('sendVoicemailDrop error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// REQUETE DROP COWBOY API
// ============================================
async function sendDropCowboyRequest(config, data) {
  const { phone, script, prospect, options } = data;

  const body = {
    brand_id: config.brandId,
    phone: phone,
    caller_id: config.callerId,
    foreign_id: prospect.id || options.foreignId
  };

  // Type de contenu audio
  if (script.type === 'recording') {
    // Audio pre-enregistre
    body.recording_id = script.recordingId;
  } else if (script.type === 'voice_clone') {
    // AI Voice Clone avec TTS
    body.voice_id = script.voiceId;
    body.tts_body = script.text;

    // Variables dynamiques
    if (script.variables) {
      body.variables = {};
      for (const [key, value] of Object.entries(script.variables)) {
        body.variables[key] = replaceVariable(value, prospect);
      }
    }
  } else if (script.type === 'tts') {
    // TTS standard
    body.tts_body = replaceVariables(script.text, prospect);
    if (config.defaultVoiceId) {
      body.voice_id = config.defaultVoiceId;
    }
  }

  try {
    const response = await fetch(`${DROP_COWBOY_API_BASE}/rvm`, {
      method: 'POST',
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Drop Cowboy API error:', responseData);
      return { error: responseData.message || 'Drop Cowboy API error' };
    }

    return responseData;

  } catch (error) {
    console.error('sendDropCowboyRequest error:', error);
    return { error: error.message };
  }
}

// ============================================
// OBTENIR SCRIPT
// ============================================
async function getScript(orgId, scriptId) {
  try {
    const scriptRef = db.collection('organizations').doc(orgId)
      .collection('voicemailScripts').doc(scriptId);
    const scriptSnap = await scriptRef.get();

    if (!scriptSnap.exists) {
      return null;
    }

    return scriptSnap.data();
  } catch (error) {
    console.error('getScript error:', error);
    return null;
  }
}

// ============================================
// FORMATER NUMERO TELEPHONE
// ============================================
function formatPhoneForVoicemail(phone) {
  if (!phone) return null;

  // Nettoyer
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Supprimer le + initial
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Si commence par 0 (France), remplacer par 33
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '33' + cleaned.substring(1);
  }

  // Valider format
  if (!/^\d{10,15}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

// ============================================
// REMPLACER VARIABLES
// ============================================
function replaceVariables(text, prospect) {
  const variables = {
    '{prenom}': prospect.firstName || prospect.prenom || '',
    '{nom}': prospect.lastName || prospect.nom || '',
    '{entreprise}': prospect.company || prospect.entreprise || '',
    '{ville}': prospect.city || prospect.ville || '',
    '{secteur}': prospect.sector || prospect.secteur || ''
  };

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key, 'gi'), value);
  }

  return result;
}

function replaceVariable(template, prospect) {
  return replaceVariables(template, prospect);
}

// ============================================
// LOGGER INTERACTION
// ============================================
async function logVoicemailInteraction(orgId, prospectId, data) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'voicemail',
        direction: 'out',
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logVoicemailInteraction error:', error);
  }
}

// ============================================
// OBTENIR STATUT DROP
// ============================================
export async function getDropStatus(orgId, dropId) {
  try {
    const config = await getDropCowboyConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/rvm/${dropId}`, {
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    if (!response.ok) {
      return { error: 'Failed to get status' };
    }

    return await response.json();

  } catch (error) {
    console.error('getDropStatus error:', error);
    return { error: error.message };
  }
}

// ============================================
// ANNULER DROP EN ATTENTE
// ============================================
export async function cancelDrop(orgId, dropId) {
  try {
    const config = await getDropCowboyConfig(orgId);

    const response = await fetch(`${DROP_COWBOY_API_BASE}/rvm/${dropId}/cancel`, {
      method: 'POST',
      headers: {
        'x-team-id': config.teamId,
        'x-secret': config.secret
      }
    });

    return response.ok;

  } catch (error) {
    console.error('cancelDrop error:', error);
    return false;
  }
}

export { formatPhoneForVoicemail };
