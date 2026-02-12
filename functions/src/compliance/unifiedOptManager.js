/**
 * Unified Opt-in/Opt-out Manager
 *
 * Gestion centralisee des consentements par canal
 * Conformite RGPD/CNIL France B2B
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// ============================================
// MATRICE COMPLIANCE RGPD FRANCE B2B
// ============================================
export const CHANNEL_COMPLIANCE = {
  email: {
    base: 'opt-out',           // Interet legitime B2B
    requiresOptIn: false,
    allowedWithout: true,      // Peut envoyer sans opt-in explicite
    mustBeRelevant: true,      // Doit etre lie a l'activite professionnelle
    unsubscribeRequired: true, // Lien desinscription obligatoire
    restrictions: []
  },
  sms: {
    base: 'opt-in',            // Consentement prealable OBLIGATOIRE
    requiresOptIn: true,
    allowedWithout: false,
    mustBeRelevant: true,
    unsubscribeRequired: true, // STOP SMS gratuit
    restrictions: [
      'hours_8_20',            // Pas avant 8h ni apres 20h
      'no_sunday',             // Pas le dimanche
      'no_holidays'            // Pas les jours feries
    ]
  },
  whatsapp: {
    base: 'opt-in-specific',   // Consentement SPECIFIQUE WhatsApp
    requiresOptIn: true,
    allowedWithout: false,
    mustBeRelevant: true,
    unsubscribeRequired: true,
    restrictions: [
      'template_required',     // Templates Meta approuves hors 24h
      '24h_session_window'     // Messages libres uniquement dans fenetre 24h
    ]
  },
  instagram: {
    base: 'interaction',       // Interaction prealable necessaire
    requiresOptIn: false,      // Pas d'opt-in explicite mais interaction requise
    allowedWithout: false,
    mustBeRelevant: true,
    unsubscribeRequired: false,
    restrictions: [
      'prior_interaction',     // Doit avoir interagi (comment, follow, story reply)
      'rate_limit_70_day',     // 70 DMs/jour max safe
      'official_api_only'      // API Meta uniquement
    ]
  },
  voicemail: {
    base: 'opt-in',            // Assimile communication electronique
    requiresOptIn: true,
    allowedWithout: false,
    mustBeRelevant: true,
    unsubscribeRequired: true,
    restrictions: [
      'business_hours',        // Heures ouvrables uniquement
      'max_1_per_sequence'     // 1 seul voicemail par sequence
    ]
  },
  postal: {
    base: 'opt-out',           // Le PLUS permissif en B2B
    requiresOptIn: false,
    allowedWithout: true,
    mustBeRelevant: true,      // Lien avec profession du destinataire
    unsubscribeRequired: true, // Mention comment se desinscrire
    restrictions: [
      'address_verified'       // Adresse verifiee avant envoi
    ]
  }
};

// ============================================
// VERIFIER SI ON PEUT CONTACTER
// ============================================
export async function canContactOnChannel(orgId, prospectId, channel) {
  const result = {
    canContact: false,
    reason: null,
    details: {},
    checks: []
  };

  try {
    // 1. Verifier si le canal existe dans la config
    const channelConfig = CHANNEL_COMPLIANCE[channel];
    if (!channelConfig) {
      result.reason = 'unknown_channel';
      result.checks.push({ check: 'channel_exists', passed: false });
      return result;
    }
    result.checks.push({ check: 'channel_exists', passed: true });

    // 2. Recuperer le prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.reason = 'prospect_not_found';
      result.checks.push({ check: 'prospect_exists', passed: false });
      return result;
    }
    result.checks.push({ check: 'prospect_exists', passed: true });

    const prospect = prospectSnap.data();
    const channels = prospect.channels || {};
    const channelData = channels[channel] || {};
    const suppression = prospect.suppression || {};

    // 3. Verifier suppression globale
    if (suppression.global === true) {
      result.reason = 'globally_suppressed';
      result.checks.push({ check: 'global_suppression', passed: false });
      return result;
    }
    result.checks.push({ check: 'global_suppression', passed: true });

    // 4. Verifier suppression canal specifique
    if (suppression.byChannel?.[channel] === true) {
      result.reason = 'channel_suppressed';
      result.details.channel = channel;
      result.checks.push({ check: 'channel_suppression', passed: false });
      return result;
    }
    result.checks.push({ check: 'channel_suppression', passed: true });

    // 5. Verifier disponibilite du canal
    if (channelData.available === false) {
      result.reason = 'channel_not_available';
      result.details.channel = channel;
      result.checks.push({ check: 'channel_available', passed: false });
      return result;
    }
    result.checks.push({ check: 'channel_available', passed: true });

    // 6. Verifier opt-in si requis
    if (channelConfig.requiresOptIn) {
      const hasOptIn = channelData.optIn &&
        ['explicit', 'explicit_wa', 'explicit_sms', 'explicit_vm'].includes(channelData.optIn);

      if (!hasOptIn) {
        result.reason = 'opt_in_required';
        result.details.channel = channel;
        result.details.currentOptIn = channelData.optIn;
        result.checks.push({ check: 'opt_in', passed: false });
        return result;
      }
      result.checks.push({ check: 'opt_in', passed: true });
      result.details.optInDate = channelData.optInDate;
      result.details.optInProof = channelData.optInProof;
    } else {
      result.checks.push({ check: 'opt_in', passed: true, note: 'not_required' });
    }

    // 7. Verifier restrictions specifiques au canal
    for (const restriction of channelConfig.restrictions) {
      const restrictionCheck = await checkRestriction(restriction, prospect, channelData, channel);
      result.checks.push(restrictionCheck);

      if (!restrictionCheck.passed) {
        result.reason = `restriction_${restriction}`;
        result.details.restriction = restriction;
        result.details.restrictionDetails = restrictionCheck.details;
        return result;
      }
    }

    // 8. Verifier touchpoint limits
    const touchpointCheck = await checkTouchpointLimits(orgId, prospectId, channel);
    result.checks.push(touchpointCheck);

    if (!touchpointCheck.passed) {
      result.reason = 'touchpoint_limit_reached';
      result.details.limit = touchpointCheck.limit;
      result.details.current = touchpointCheck.current;
      return result;
    }

    // Tout est OK
    result.canContact = true;
    result.reason = 'allowed';
    return result;

  } catch (error) {
    console.error('canContactOnChannel error:', error);
    result.reason = 'error';
    result.details.error = error.message;
    return result;
  }
}

// ============================================
// VERIFIER UNE RESTRICTION SPECIFIQUE
// ============================================
async function checkRestriction(restriction, prospect, channelData, channel) {
  const now = new Date();

  switch (restriction) {
    case 'hours_8_20': {
      const hour = now.getHours();
      const passed = hour >= 8 && hour < 20;
      return {
        check: 'hours_8_20',
        passed,
        details: { currentHour: hour, allowed: '8h-20h' }
      };
    }

    case 'no_sunday': {
      const day = now.getDay();
      const passed = day !== 0;
      return {
        check: 'no_sunday',
        passed,
        details: { currentDay: day, isSunday: day === 0 }
      };
    }

    case 'no_holidays': {
      // Simplification: pas de check jours feries pour l'instant
      return { check: 'no_holidays', passed: true, details: { note: 'not_implemented' } };
    }

    case 'business_hours': {
      const hour = now.getHours();
      const day = now.getDay();
      const isWeekday = day >= 1 && day <= 5;
      const isBusinessHour = hour >= 9 && hour < 18;
      const passed = isWeekday && isBusinessHour;
      return {
        check: 'business_hours',
        passed,
        details: { hour, day, isWeekday, isBusinessHour }
      };
    }

    case 'prior_interaction': {
      const hasInteraction = channelData.lastInteraction != null;
      return {
        check: 'prior_interaction',
        passed: hasInteraction,
        details: { lastInteraction: channelData.lastInteraction }
      };
    }

    case 'rate_limit_70_day': {
      // Sera verifie au niveau du sender Instagram
      return { check: 'rate_limit_70_day', passed: true, details: { note: 'checked_at_send' } };
    }

    case 'official_api_only': {
      return { check: 'official_api_only', passed: true, details: { note: 'using_meta_api' } };
    }

    case 'template_required': {
      // Sera verifie au niveau du sender WhatsApp
      return { check: 'template_required', passed: true, details: { note: 'checked_at_send' } };
    }

    case '24h_session_window': {
      // Sera verifie au niveau du session manager WhatsApp
      return { check: '24h_session_window', passed: true, details: { note: 'checked_at_send' } };
    }

    case 'max_1_per_sequence': {
      // Sera verifie au niveau du sequence builder
      return { check: 'max_1_per_sequence', passed: true, details: { note: 'checked_at_build' } };
    }

    case 'address_verified': {
      const verified = channelData.addressVerified === true;
      const deliverable = channelData.deliverable === true;
      return {
        check: 'address_verified',
        passed: verified && deliverable,
        details: { verified, deliverable }
      };
    }

    default:
      return { check: restriction, passed: true, details: { note: 'unknown_restriction' } };
  }
}

// ============================================
// VERIFIER LIMITES DE TOUCHPOINTS
// ============================================
const TOUCHPOINT_LIMITS = {
  email: { max30Days: 6 },
  sms: { max30Days: 3 },
  whatsapp: { max30Days: 2 },
  instagram: { max30Days: 2 },
  voicemail: { max30Days: 1 },
  postal: { max30Days: 1 },
  total: { max30Days: 15 }
};

async function checkTouchpointLimits(orgId, prospectId, channel) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { check: 'touchpoint_limits', passed: true, note: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();
    const touchpoints = prospect.touchpoints || { total: 0, byChannel: {} };

    // Verifier limite canal
    const channelCount = touchpoints.byChannel?.[channel] || 0;
    const channelLimit = TOUCHPOINT_LIMITS[channel]?.max30Days || 10;

    if (channelCount >= channelLimit) {
      return {
        check: 'touchpoint_limits',
        passed: false,
        limit: channelLimit,
        current: channelCount,
        type: 'channel'
      };
    }

    // Verifier limite totale
    const totalCount = touchpoints.total || 0;
    const totalLimit = TOUCHPOINT_LIMITS.total.max30Days;

    if (totalCount >= totalLimit) {
      return {
        check: 'touchpoint_limits',
        passed: false,
        limit: totalLimit,
        current: totalCount,
        type: 'total'
      };
    }

    return {
      check: 'touchpoint_limits',
      passed: true,
      channelCount,
      channelLimit,
      totalCount,
      totalLimit
    };

  } catch (error) {
    console.error('checkTouchpointLimits error:', error);
    return { check: 'touchpoint_limits', passed: true, note: 'error_checking' };
  }
}

// ============================================
// ENREGISTRER UN OPT-IN
// ============================================
export async function recordOptIn(orgId, prospectId, channel, proof = null) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    const optInData = {
      [`channels.${channel}.optIn`]: channel === 'whatsapp' ? 'explicit_wa' :
                                     channel === 'sms' ? 'explicit_sms' :
                                     channel === 'voicemail' ? 'explicit_vm' : 'explicit',
      [`channels.${channel}.optInDate`]: FieldValue.serverTimestamp(),
      [`channels.${channel}.available`]: true,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (proof) {
      optInData[`channels.${channel}.optInProof`] = proof;
    }

    await prospectRef.update(optInData);

    // Logger l'audit trail
    await logComplianceEvent(orgId, prospectId, 'opt_in', {
      channel,
      proof,
      timestamp: new Date().toISOString()
    });

    return { success: true, channel };

  } catch (error) {
    console.error('recordOptIn error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ENREGISTRER UN OPT-OUT
// ============================================
export async function recordOptOut(orgId, prospectId, channel, reason = 'user_request') {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    const optOutData = {
      [`suppression.byChannel.${channel}`]: true,
      [`channels.${channel}.optIn`]: 'opted_out',
      [`channels.${channel}.optOutDate`]: FieldValue.serverTimestamp(),
      [`channels.${channel}.optOutReason`]: reason,
      updatedAt: FieldValue.serverTimestamp()
    };

    await prospectRef.update(optOutData);

    // Logger l'audit trail
    await logComplianceEvent(orgId, prospectId, 'opt_out', {
      channel,
      reason,
      timestamp: new Date().toISOString()
    });

    return { success: true, channel, reason };

  } catch (error) {
    console.error('recordOptOut error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SUPPRESSION GLOBALE
// ============================================
export async function recordGlobalSuppression(orgId, prospectId, reason = 'user_request') {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'suppression.global': true,
      'suppression.globalReason': reason,
      'suppression.globalDate': FieldValue.serverTimestamp(),
      status: 'unsubscribed',
      updatedAt: FieldValue.serverTimestamp()
    });

    // Logger l'audit trail
    await logComplianceEvent(orgId, prospectId, 'global_suppression', {
      reason,
      timestamp: new Date().toISOString()
    });

    return { success: true };

  } catch (error) {
    console.error('recordGlobalSuppression error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ENREGISTRER UN TOUCHPOINT
// ============================================
export async function recordTouchpoint(orgId, prospectId, channel) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'touchpoints.total': FieldValue.increment(1),
      [`touchpoints.byChannel.${channel}`]: FieldValue.increment(1),
      'touchpoints.lastTouch': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error('recordTouchpoint error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// RESET TOUCHPOINTS (mensuel)
// ============================================
export async function resetTouchpoints(orgId, prospectId) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'touchpoints.total': 0,
      'touchpoints.byChannel': {
        email: 0,
        sms: 0,
        whatsapp: 0,
        instagram: 0,
        voicemail: 0,
        postal: 0
      },
      'touchpoints.lastReset': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error('resetTouchpoints error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// AUDIT TRAIL
// ============================================
async function logComplianceEvent(orgId, prospectId, eventType, data) {
  try {
    await db.collection('organizations').doc(orgId)
      .collection('complianceAudit').add({
        prospectId,
        eventType,
        data,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logComplianceEvent error:', error);
  }
}

// ============================================
// OBTENIR STATUT COMPLIANCE PROSPECT
// ============================================
export async function getProspectComplianceStatus(orgId, prospectId) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { found: false };
    }

    const prospect = prospectSnap.data();
    const channels = prospect.channels || {};
    const suppression = prospect.suppression || {};
    const touchpoints = prospect.touchpoints || { total: 0, byChannel: {} };

    const status = {
      found: true,
      globalSuppressed: suppression.global === true,
      channels: {}
    };

    for (const channel of Object.keys(CHANNEL_COMPLIANCE)) {
      const channelData = channels[channel] || {};
      const config = CHANNEL_COMPLIANCE[channel];

      status.channels[channel] = {
        available: channelData.available !== false,
        suppressed: suppression.byChannel?.[channel] === true,
        optIn: channelData.optIn || null,
        optInRequired: config.requiresOptIn,
        hasValidOptIn: config.requiresOptIn ?
          ['explicit', 'explicit_wa', 'explicit_sms', 'explicit_vm'].includes(channelData.optIn) :
          true,
        touchpoints: touchpoints.byChannel?.[channel] || 0,
        touchpointLimit: TOUCHPOINT_LIMITS[channel]?.max30Days || 10,
        canContact: false // Sera calcule
      };

      // Determiner si on peut contacter
      status.channels[channel].canContact =
        status.channels[channel].available &&
        !status.channels[channel].suppressed &&
        !status.globalSuppressed &&
        status.channels[channel].hasValidOptIn &&
        status.channels[channel].touchpoints < status.channels[channel].touchpointLimit;
    }

    status.totalTouchpoints = touchpoints.total || 0;
    status.totalTouchpointLimit = TOUCHPOINT_LIMITS.total.max30Days;

    return status;

  } catch (error) {
    console.error('getProspectComplianceStatus error:', error);
    return { found: false, error: error.message };
  }
}

// ============================================
// INITIALISER CHANNELS POUR NOUVEAU PROSPECT
// ============================================
export function getDefaultChannelData(email, phone = null, instagramHandle = null, address = null) {
  return {
    email: {
      available: !!email,
      verified: false,
      optIn: 'legitimate_interest' // B2B par defaut
    },
    sms: {
      available: !!phone,
      verified: false,
      optIn: null // Necessite opt-in explicite
    },
    whatsapp: {
      available: !!phone,
      reachable: null, // A verifier
      optIn: null // Necessite opt-in specifique
    },
    instagram: {
      handle: instagramHandle,
      active: null,
      lastInteraction: null
    },
    voicemail: {
      mobileVerified: !!phone,
      optIn: null,
      vmEnabled: null
    },
    postal: {
      addressVerified: !!address,
      deliverable: null,
      address: address
    }
  };
}

export function getDefaultTouchpoints() {
  return {
    total: 0,
    byChannel: {
      email: 0,
      sms: 0,
      whatsapp: 0,
      instagram: 0,
      voicemail: 0,
      postal: 0
    },
    lastTouch: null,
    nextScheduled: null
  };
}

export function getDefaultSuppression() {
  return {
    global: false,
    byChannel: {
      email: false,
      sms: false,
      whatsapp: false,
      instagram: false,
      voicemail: false,
      postal: false
    }
  };
}

export { TOUCHPOINT_LIMITS };
