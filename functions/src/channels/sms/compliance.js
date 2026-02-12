/**
 * SMS Compliance - CNIL France B2B
 *
 * Regles CNIL:
 * - Opt-in prealable OBLIGATOIRE (contrairement a email B2B)
 * - STOP SMS gratuit dans chaque message
 * - Pas avant 8h ni apres 20h
 * - Pas le dimanche ni jours feries
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { recordOptOut } from '../../compliance/unifiedOptManager.js';

const db = getFirestore();

// ============================================
// JOURS FERIES FRANCE 2025-2026
// ============================================
const FRENCH_HOLIDAYS = [
  // 2025
  '2025-01-01', // Jour de l'an
  '2025-04-21', // Lundi de Paques
  '2025-05-01', // Fete du travail
  '2025-05-08', // Victoire 1945
  '2025-05-29', // Ascension
  '2025-06-09', // Lundi de Pentecote
  '2025-07-14', // Fete nationale
  '2025-08-15', // Assomption
  '2025-11-01', // Toussaint
  '2025-11-11', // Armistice
  '2025-12-25', // Noel
  // 2026
  '2026-01-01',
  '2026-04-06', // Paques
  '2026-05-01',
  '2026-05-08',
  '2026-05-14', // Ascension
  '2026-05-25', // Pentecote
  '2026-07-14',
  '2026-08-15',
  '2026-11-01',
  '2026-11-11',
  '2026-12-25'
];

// ============================================
// VERIFIER HORAIRES D'ENVOI
// ============================================
export function isWithinSendingHours(date = new Date()) {
  const result = {
    allowed: true,
    reason: null,
    details: {}
  };

  // Timezone France (UTC+1 ou UTC+2 en ete)
  const franceTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const hour = franceTime.getHours();
  const day = franceTime.getDay(); // 0 = Dimanche
  const dateString = franceTime.toISOString().split('T')[0];

  result.details = {
    hour,
    day,
    dateString,
    franceTime: franceTime.toISOString()
  };

  // Pas avant 8h
  if (hour < 8) {
    result.allowed = false;
    result.reason = 'before_8am';
    return result;
  }

  // Pas apres 20h
  if (hour >= 20) {
    result.allowed = false;
    result.reason = 'after_8pm';
    return result;
  }

  // Pas le dimanche
  if (day === 0) {
    result.allowed = false;
    result.reason = 'sunday';
    return result;
  }

  // Pas les jours feries
  if (FRENCH_HOLIDAYS.includes(dateString)) {
    result.allowed = false;
    result.reason = 'holiday';
    return result;
  }

  return result;
}

// ============================================
// CALCULER PROCHAINE FENETRE D'ENVOI
// ============================================
export function getNextSendingWindow(date = new Date()) {
  const franceTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  let nextWindow = new Date(franceTime);

  // Si apres 20h, passer au lendemain 8h
  if (nextWindow.getHours() >= 20) {
    nextWindow.setDate(nextWindow.getDate() + 1);
    nextWindow.setHours(8, 0, 0, 0);
  }

  // Si avant 8h, attendre 8h
  if (nextWindow.getHours() < 8) {
    nextWindow.setHours(8, 0, 0, 0);
  }

  // Si dimanche, passer a lundi
  while (nextWindow.getDay() === 0) {
    nextWindow.setDate(nextWindow.getDate() + 1);
  }

  // Verifier jours feries
  let dateString = nextWindow.toISOString().split('T')[0];
  while (FRENCH_HOLIDAYS.includes(dateString)) {
    nextWindow.setDate(nextWindow.getDate() + 1);
    if (nextWindow.getDay() === 0) {
      nextWindow.setDate(nextWindow.getDate() + 1);
    }
    dateString = nextWindow.toISOString().split('T')[0];
  }

  return nextWindow;
}

// ============================================
// FORMATER NUMERO DE TELEPHONE
// ============================================
export function formatPhoneNumber(phone, defaultCountry = 'FR') {
  if (!phone) return null;

  // Nettoyer le numero
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Si commence par 0, ajouter +33
  if (cleaned.startsWith('0') && defaultCountry === 'FR') {
    cleaned = '+33' + cleaned.substring(1);
  }

  // Si pas de +, ajouter +33
  if (!cleaned.startsWith('+')) {
    if (defaultCountry === 'FR') {
      cleaned = '+33' + cleaned;
    } else {
      // Autres pays supportes
      const countryCodes = {
        'BE': '+32',
        'CH': '+41',
        'LU': '+352',
        'CA': '+1',
        'US': '+1'
      };
      cleaned = (countryCodes[defaultCountry] || '+33') + cleaned;
    }
  }

  // Valider format E.164
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    return null;
  }

  return cleaned;
}

// ============================================
// VERIFIER SI NUMERO MOBILE
// ============================================
export function isMobileNumber(phone) {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return false;

  // France: +33 6xx ou +33 7xx
  if (formatted.startsWith('+33')) {
    const localPart = formatted.substring(3);
    return localPart.startsWith('6') || localPart.startsWith('7');
  }

  // Autres pays: assumer mobile par defaut
  return true;
}

// ============================================
// MOTS-CLES STOP
// ============================================
const STOP_KEYWORDS = [
  'STOP',
  'ARRET',
  'ARRETER',
  'DESABONNER',
  'DESABONNEMENT',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'REMOVE',
  'OPTOUT',
  'OPT-OUT',
  'OPT OUT'
];

// ============================================
// VERIFIER SI MESSAGE EST UN OPT-OUT
// ============================================
export function isOptOutMessage(message) {
  if (!message) return false;

  const normalized = message.toUpperCase().trim();

  // Verifier correspondance exacte
  if (STOP_KEYWORDS.includes(normalized)) {
    return true;
  }

  // Verifier si contient un mot-cle au debut
  for (const keyword of STOP_KEYWORDS) {
    if (normalized.startsWith(keyword + ' ') || normalized === keyword) {
      return true;
    }
  }

  return false;
}

// ============================================
// TRAITER UN MESSAGE ENTRANT
// ============================================
export async function processInboundSMS(from, body, orgId = null) {
  const result = {
    processed: false,
    isOptOut: false,
    action: null,
    error: null
  };

  try {
    // Verifier si c'est un opt-out
    if (isOptOutMessage(body)) {
      result.isOptOut = true;
      result.action = 'opt_out';

      // Trouver le prospect par numero de telephone
      const prospect = await findProspectByPhone(from, orgId);

      if (prospect) {
        // Enregistrer l'opt-out
        await recordOptOut(prospect.orgId, prospect.id, 'sms', 'sms_stop_keyword');

        // Logger
        await logSMSOptOut(prospect.orgId, prospect.id, from, body);

        result.processed = true;
        result.prospectId = prospect.id;
        result.orgId = prospect.orgId;
      } else {
        // Prospect non trouve, logger quand meme
        await logUnknownOptOut('sms', from, body);
        result.processed = true;
        result.note = 'prospect_not_found';
      }
    } else {
      // Message normal (reponse)
      result.action = 'reply';

      const prospect = await findProspectByPhone(from, orgId);

      if (prospect) {
        await logSMSReply(prospect.orgId, prospect.id, from, body);
        result.processed = true;
        result.prospectId = prospect.id;
        result.orgId = prospect.orgId;
      }
    }

    return result;

  } catch (error) {
    console.error('processInboundSMS error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// TROUVER PROSPECT PAR TELEPHONE
// ============================================
async function findProspectByPhone(phone, specificOrgId = null) {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) return null;

  // Variations du numero a chercher
  const phoneVariations = [
    formattedPhone,
    formattedPhone.replace('+33', '0'),
    phone.replace(/[\s\-\.\(\)]/g, '')
  ];

  try {
    if (specificOrgId) {
      // Chercher dans une org specifique
      for (const phoneVar of phoneVariations) {
        const snapshot = await db.collection('organizations').doc(specificOrgId)
          .collection('prospects')
          .where('phone', '==', phoneVar)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          return {
            id: snapshot.docs[0].id,
            orgId: specificOrgId,
            ...snapshot.docs[0].data()
          };
        }
      }
    } else {
      // Chercher dans toutes les orgs (plus lent)
      const orgsSnapshot = await db.collection('organizations').get();

      for (const orgDoc of orgsSnapshot.docs) {
        for (const phoneVar of phoneVariations) {
          const snapshot = await db.collection('organizations').doc(orgDoc.id)
            .collection('prospects')
            .where('phone', '==', phoneVar)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            return {
              id: snapshot.docs[0].id,
              orgId: orgDoc.id,
              ...snapshot.docs[0].data()
            };
          }
        }
      }
    }

    return null;

  } catch (error) {
    console.error('findProspectByPhone error:', error);
    return null;
  }
}

// ============================================
// LOGGING
// ============================================
async function logSMSOptOut(orgId, prospectId, from, body) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: 'sms_opt_out',
        channel: 'sms',
        direction: 'in',
        prospectId,
        from,
        body,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logSMSOptOut error:', error);
  }
}

async function logSMSReply(orgId, prospectId, from, body) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: 'sms_reply',
        channel: 'sms',
        direction: 'in',
        prospectId,
        from,
        body,
        createdAt: FieldValue.serverTimestamp()
      });

    // Mettre a jour le statut du prospect
    await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        status: 'replied',
        lastReplyAt: FieldValue.serverTimestamp(),
        lastReplyChannel: 'sms',
        updatedAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logSMSReply error:', error);
  }
}

async function logUnknownOptOut(channel, from, body) {
  try {
    await db.collection('unknownOptOuts').add({
      channel,
      from,
      body,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('logUnknownOptOut error:', error);
  }
}

// ============================================
// VERIFICATION COMPLETE COMPLIANCE SMS
// ============================================
export async function checkSMSCompliance(orgId, prospectId) {
  const checks = {
    passed: true,
    reasons: [],
    details: {}
  };

  try {
    // 1. Verifier horaires
    const hoursCheck = isWithinSendingHours();
    if (!hoursCheck.allowed) {
      checks.passed = false;
      checks.reasons.push(`hours_${hoursCheck.reason}`);
      checks.details.hours = hoursCheck;
    }

    // 2. Recuperer prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      checks.passed = false;
      checks.reasons.push('prospect_not_found');
      return checks;
    }

    const prospect = prospectSnap.data();

    // 3. Verifier numero mobile
    if (!prospect.phone && !prospect.mobile) {
      checks.passed = false;
      checks.reasons.push('no_phone');
      return checks;
    }

    const phone = prospect.phone || prospect.mobile;
    if (!isMobileNumber(phone)) {
      checks.passed = false;
      checks.reasons.push('not_mobile_number');
      checks.details.phone = phone;
    }

    // 4. Verifier opt-in explicite (OBLIGATOIRE pour SMS en France)
    const channels = prospect.channels || {};
    const smsChannel = channels.sms || {};

    const validOptIns = ['explicit', 'explicit_sms'];
    if (!validOptIns.includes(smsChannel.optIn)) {
      checks.passed = false;
      checks.reasons.push('no_opt_in');
      checks.details.currentOptIn = smsChannel.optIn;
    }

    // 5. Verifier non-suppression
    const suppression = prospect.suppression || {};
    if (suppression.global === true || suppression.byChannel?.sms === true) {
      checks.passed = false;
      checks.reasons.push('suppressed');
    }

    return checks;

  } catch (error) {
    console.error('checkSMSCompliance error:', error);
    checks.passed = false;
    checks.reasons.push('error');
    checks.details.error = error.message;
    return checks;
  }
}

export { STOP_KEYWORDS, FRENCH_HOLIDAYS };
