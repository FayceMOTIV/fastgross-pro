/**
 * Voicemail Compliance - CNIL France B2B
 *
 * Regles voicemail:
 * - Opt-in explicite requis
 * - Horaires legaux: 8h-20h semaine, pas dimanche
 * - Pas de jours feries
 * - Mobile uniquement
 * - Frequence limitee
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// ============================================
// HORAIRES LEGAUX FRANCE
// ============================================
const LEGAL_START_HOUR = 8;  // 8h00
const LEGAL_END_HOUR = 20;   // 20h00

// Jours feries 2025-2026 France
const FRENCH_HOLIDAYS_2025 = [
  '2025-01-01', // Jour de l'An
  '2025-04-21', // Lundi de Paques
  '2025-05-01', // Fete du Travail
  '2025-05-08', // Victoire 1945
  '2025-05-29', // Ascension
  '2025-06-09', // Lundi de Pentecote
  '2025-07-14', // Fete Nationale
  '2025-08-15', // Assomption
  '2025-11-01', // Toussaint
  '2025-11-11', // Armistice
  '2025-12-25'  // Noel
];

const FRENCH_HOLIDAYS_2026 = [
  '2026-01-01', // Jour de l'An
  '2026-04-06', // Lundi de Paques
  '2026-05-01', // Fete du Travail
  '2026-05-08', // Victoire 1945
  '2026-05-14', // Ascension
  '2026-05-25', // Lundi de Pentecote
  '2026-07-14', // Fete Nationale
  '2026-08-15', // Assomption
  '2026-11-01', // Toussaint
  '2026-11-11', // Armistice
  '2026-12-25'  // Noel
];

const FRENCH_HOLIDAYS = [...FRENCH_HOLIDAYS_2025, ...FRENCH_HOLIDAYS_2026];

// ============================================
// VERIFIER SI DANS HEURES OUVRABLES
// ============================================
export function isWithinBusinessHours(date = new Date()) {
  // Convertir en heure France
  const franceTime = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  const hour = franceTime.getHours();
  const dayOfWeek = franceTime.getDay(); // 0 = Dimanche
  const dateStr = franceTime.toISOString().split('T')[0];

  // Dimanche interdit
  if (dayOfWeek === 0) {
    return {
      allowed: false,
      reason: 'sunday_not_allowed',
      nextWindow: getNextBusinessHours(franceTime)
    };
  }

  // Samedi: limite stricte (pas de prospection)
  if (dayOfWeek === 6) {
    return {
      allowed: false,
      reason: 'saturday_not_allowed',
      nextWindow: getNextBusinessHours(franceTime)
    };
  }

  // Jour ferie
  if (FRENCH_HOLIDAYS.includes(dateStr)) {
    return {
      allowed: false,
      reason: 'holiday',
      holiday: dateStr,
      nextWindow: getNextBusinessHours(franceTime)
    };
  }

  // Heures legales
  if (hour < LEGAL_START_HOUR) {
    return {
      allowed: false,
      reason: 'before_business_hours',
      nextWindow: getNextBusinessHours(franceTime)
    };
  }

  if (hour >= LEGAL_END_HOUR) {
    return {
      allowed: false,
      reason: 'after_business_hours',
      nextWindow: getNextBusinessHours(franceTime)
    };
  }

  return {
    allowed: true,
    currentHour: hour,
    remainingHours: LEGAL_END_HOUR - hour
  };
}

// ============================================
// CALCULER PROCHAINE FENETRE D'ENVOI
// ============================================
function getNextBusinessHours(fromDate) {
  const next = new Date(fromDate);

  // Si apres 20h, passer au lendemain 8h
  if (next.getHours() >= LEGAL_END_HOUR) {
    next.setDate(next.getDate() + 1);
    next.setHours(LEGAL_START_HOUR, 0, 0, 0);
  } else if (next.getHours() < LEGAL_START_HOUR) {
    next.setHours(LEGAL_START_HOUR, 0, 0, 0);
  }

  // Avancer jusqu'a un jour ouvrable
  let attempts = 0;
  while (attempts < 10) {
    const dayOfWeek = next.getDay();
    const dateStr = next.toISOString().split('T')[0];

    // Eviter weekend
    if (dayOfWeek === 0) {
      next.setDate(next.getDate() + 1);
      next.setHours(LEGAL_START_HOUR, 0, 0, 0);
    } else if (dayOfWeek === 6) {
      next.setDate(next.getDate() + 2);
      next.setHours(LEGAL_START_HOUR, 0, 0, 0);
    } else if (FRENCH_HOLIDAYS.includes(dateStr)) {
      next.setDate(next.getDate() + 1);
      next.setHours(LEGAL_START_HOUR, 0, 0, 0);
    } else {
      break;
    }
    attempts++;
  }

  return next;
}

// ============================================
// VERIFIER COMPLIANCE VOICEMAIL COMPLETE
// ============================================
export async function checkVoicemailCompliance(orgId, prospectId) {
  const checks = {
    passed: true,
    reasons: [],
    details: {},
    warnings: []
  };

  try {
    // 1. Recuperer le prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      checks.passed = false;
      checks.reasons.push('prospect_not_found');
      return checks;
    }

    const prospect = prospectSnap.data();

    // 2. Verifier numero mobile
    const phone = prospect.phone || prospect.mobile;
    if (!phone) {
      checks.passed = false;
      checks.reasons.push('no_phone_number');
    } else if (!isMobileNumber(phone)) {
      checks.passed = false;
      checks.reasons.push('not_mobile_number');
      checks.warnings.push('Voicemail drop requiert un numero mobile');
    }

    // 3. Verifier opt-in voicemail (OBLIGATOIRE)
    const voicemail = prospect.channels?.voicemail || {};
    if (voicemail.optIn !== 'explicit' && voicemail.optIn !== true) {
      checks.passed = false;
      checks.reasons.push('no_voicemail_opt_in');
      checks.details.currentOptIn = voicemail.optIn;
    }

    // 4. Verifier vmEnabled
    if (voicemail.vmEnabled === false) {
      checks.passed = false;
      checks.reasons.push('voicemail_disabled');
      checks.details.disableReason = voicemail.failReason;
    }

    // 5. Verifier suppression
    const suppression = prospect.suppression || {};
    if (suppression.global === true) {
      checks.passed = false;
      checks.reasons.push('globally_suppressed');
    }
    if (suppression.byChannel?.voicemail === true) {
      checks.passed = false;
      checks.reasons.push('voicemail_suppressed');
    }

    // 6. Verifier heures ouvrables
    const hoursCheck = isWithinBusinessHours();
    if (!hoursCheck.allowed) {
      checks.passed = false;
      checks.reasons.push('outside_business_hours');
      checks.details.hoursCheck = hoursCheck;
    }

    // 7. Verifier frequence (1 voicemail max par semaine)
    const lastVoicemail = voicemail.lastDropped;
    if (lastVoicemail) {
      const lastDate = lastVoicemail.toDate ? lastVoicemail.toDate() : new Date(lastVoicemail);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince < 7) {
        checks.passed = false;
        checks.reasons.push('too_recent_voicemail');
        checks.details.daysSinceLastVoicemail = daysSince;
        checks.details.nextAllowedDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    // 8. Verifier touchpoints totaux
    const touchpoints = prospect.touchpoints || {};
    if (touchpoints.byChannel?.voicemail >= 1) {
      // Limite 1 voicemail par prospect par 30 jours
      const lastTouch = touchpoints.lastTouch;
      if (lastTouch) {
        const lastTouchDate = lastTouch.toDate ? lastTouch.toDate() : new Date(lastTouch);
        const daysSinceTouch = Math.floor((Date.now() - lastTouchDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceTouch < 30) {
          checks.passed = false;
          checks.reasons.push('voicemail_limit_reached');
          checks.details.voicemailsThisPeriod = touchpoints.byChannel.voicemail;
        }
      }
    }

    return checks;

  } catch (error) {
    console.error('checkVoicemailCompliance error:', error);
    checks.passed = false;
    checks.reasons.push('error');
    checks.details.error = error.message;
    return checks;
  }
}

// ============================================
// VERIFIER SI NUMERO MOBILE
// ============================================
function isMobileNumber(phone) {
  if (!phone) return false;

  // Nettoyer
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // Format France: +33 6xx ou +33 7xx
  if (cleaned.startsWith('+33')) {
    const suffix = cleaned.substring(3);
    return suffix.startsWith('6') || suffix.startsWith('7');
  }

  // Format local: 06 ou 07
  if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
    return cleaned.length === 10;
  }

  // Format international avec 33
  if (cleaned.startsWith('33')) {
    const suffix = cleaned.substring(2);
    return suffix.startsWith('6') || suffix.startsWith('7');
  }

  // Autres pays: considerer comme mobile si pas fixe reconnu
  // Pour l'international, on est plus permissif
  return true;
}

// ============================================
// ENREGISTRER OPT-IN VOICEMAIL
// ============================================
export async function recordVoicemailOptIn(orgId, prospectId, proof = {}) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.voicemail.optIn': 'explicit',
        'channels.voicemail.optInDate': FieldValue.serverTimestamp(),
        'channels.voicemail.optInProof': proof,
        'channels.voicemail.vmEnabled': true,
        'suppression.byChannel.voicemail': false
      });

    // Log audit
    await db.collection('organizations').doc(orgId)
      .collection('complianceAudit').add({
        type: 'opt_in',
        channel: 'voicemail',
        prospectId,
        proof,
        createdAt: FieldValue.serverTimestamp()
      });

    return { success: true };
  } catch (error) {
    console.error('recordVoicemailOptIn error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ENREGISTRER OPT-OUT VOICEMAIL
// ============================================
export async function recordVoicemailOptOut(orgId, prospectId, reason = '') {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.voicemail.optIn': 'opt_out',
        'channels.voicemail.optOutDate': FieldValue.serverTimestamp(),
        'channels.voicemail.optOutReason': reason,
        'suppression.byChannel.voicemail': true
      });

    // Log audit
    await db.collection('organizations').doc(orgId)
      .collection('complianceAudit').add({
        type: 'opt_out',
        channel: 'voicemail',
        prospectId,
        reason,
        createdAt: FieldValue.serverTimestamp()
      });

    return { success: true };
  } catch (error) {
    console.error('recordVoicemailOptOut error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// MARQUER NUMERO COMME INVALIDE
// ============================================
export async function markNumberInvalid(orgId, prospectId, errorCode, errorMessage) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.voicemail.vmEnabled': false,
        'channels.voicemail.failReason': errorMessage,
        'channels.voicemail.failCode': errorCode,
        'channels.voicemail.failedAt': FieldValue.serverTimestamp()
      });

    return { success: true };
  } catch (error) {
    console.error('markNumberInvalid error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR STATS COMPLIANCE
// ============================================
export async function getVoicemailComplianceStats(orgId) {
  try {
    const prospectsSnap = await db.collection('organizations').doc(orgId)
      .collection('prospects')
      .get();

    let total = 0;
    let withOptIn = 0;
    let vmEnabled = 0;
    let suppressed = 0;
    let invalidNumbers = 0;

    prospectsSnap.forEach(doc => {
      const prospect = doc.data();
      total++;

      const voicemail = prospect.channels?.voicemail || {};

      if (voicemail.optIn === 'explicit' || voicemail.optIn === true) {
        withOptIn++;
      }

      if (voicemail.vmEnabled !== false) {
        vmEnabled++;
      }

      if (prospect.suppression?.byChannel?.voicemail === true) {
        suppressed++;
      }

      if (voicemail.failCode) {
        invalidNumbers++;
      }
    });

    return {
      total,
      withOptIn,
      withOptInPercent: total > 0 ? ((withOptIn / total) * 100).toFixed(1) : 0,
      vmEnabled,
      suppressed,
      invalidNumbers,
      eligible: withOptIn - suppressed - invalidNumbers
    };

  } catch (error) {
    console.error('getVoicemailComplianceStats error:', error);
    return {
      total: 0,
      withOptIn: 0,
      vmEnabled: 0,
      suppressed: 0,
      invalidNumbers: 0,
      eligible: 0
    };
  }
}

// ============================================
// VERIFIER SI PROSPECT ELIGIBLE
// ============================================
export async function isProspectEligibleForVoicemail(orgId, prospectId) {
  const compliance = await checkVoicemailCompliance(orgId, prospectId);
  return {
    eligible: compliance.passed,
    reasons: compliance.reasons,
    warnings: compliance.warnings
  };
}

export { LEGAL_START_HOUR, LEGAL_END_HOUR, FRENCH_HOLIDAYS };
