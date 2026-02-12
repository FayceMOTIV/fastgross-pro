/**
 * Channel Router - Intelligent Channel Selection
 *
 * Selection du canal optimal selon:
 * - Disponibilite canal (opt-in, numero verifie)
 * - Score prospect
 * - Historique touches
 * - Preferences prospect
 * - Forfait organisation
 */

import { getFirestore } from 'firebase-admin/firestore';
import { canContactOnChannel } from '../compliance/unifiedOptManager.js';

const getDb = () => getFirestore();

// ============================================
// PRIORITE DES CANAUX PAR SCORE
// ============================================
const CHANNEL_PRIORITY_BY_SCORE = {
  // Score 80+ (Hot leads) - Canaux haute conversion
  hot: ['email', 'whatsapp', 'voicemail', 'postal', 'sms', 'instagram'],

  // Score 50-79 (Warm leads) - Mix equilibre
  warm: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal'],

  // Score 25-49 (Cold leads) - Canaux volume
  cold: ['email', 'sms', 'instagram', 'whatsapp', 'voicemail', 'postal'],

  // Score <25 (Ice leads) - Email principalement
  ice: ['email', 'sms', 'instagram', 'whatsapp']
};

// ============================================
// CANAUX PAR FORFAIT
// ============================================
const PLAN_CHANNELS = {
  starter: ['email'],
  pro: ['email', 'sms', 'whatsapp'],
  enterprise: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal']
};

// ============================================
// COUT RELATIF PAR CANAL (pour optimisation budget)
// ============================================
const CHANNEL_COSTS = {
  email: 0.001,
  sms: 0.035,
  whatsapp: 0.05,
  instagram: 0,
  voicemail: 0.004,
  postal: 1.50
};

// ============================================
// SELECTIONNER CANAL OPTIMAL
// ============================================
export async function selectOptimalChannel(orgId, prospectId, options = {}) {
  const result = {
    channel: null,
    reason: null,
    alternatives: [],
    checks: {}
  };

  try {
    // 1. Recuperer prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.reason = 'prospect_not_found';
      return result;
    }

    const prospect = prospectSnap.data();

    // 2. Recuperer organisation et forfait
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    const org = orgSnap.exists ? orgSnap.data() : {};
    const plan = org.plan || 'starter';

    // 3. Determiner canaux disponibles selon forfait
    const availableChannels = PLAN_CHANNELS[plan] || PLAN_CHANNELS.starter;

    // 4. Filtrer par canaux demandes si specifie
    let candidateChannels = options.channels
      ? options.channels.filter(c => availableChannels.includes(c))
      : availableChannels;

    // 5. Determiner priorite selon score
    const score = prospect.score || 0;
    let priorityTier;
    if (score >= 80) priorityTier = 'hot';
    else if (score >= 50) priorityTier = 'warm';
    else if (score >= 25) priorityTier = 'cold';
    else priorityTier = 'ice';

    const priorityOrder = CHANNEL_PRIORITY_BY_SCORE[priorityTier];

    // 6. Trier les candidats par priorite
    candidateChannels.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // 7. Optimiser par cout si demande
    if (options.optimizeCost) {
      candidateChannels.sort((a, b) => CHANNEL_COSTS[a] - CHANNEL_COSTS[b]);
    }

    // 8. Verifier compliance pour chaque canal
    for (const channel of candidateChannels) {
      const complianceCheck = await canContactOnChannel(orgId, prospectId, channel);
      result.checks[channel] = complianceCheck;

      if (complianceCheck.canContact) {
        // Verifications supplementaires par canal
        const channelReady = await isChannelReady(orgId, prospectId, channel, prospect);

        if (channelReady.ready) {
          result.channel = channel;
          result.reason = `optimal_for_${priorityTier}_lead`;
          break;
        } else {
          result.alternatives.push({
            channel,
            blocked: channelReady.reason
          });
        }
      } else {
        result.alternatives.push({
          channel,
          blocked: complianceCheck.reason
        });
      }
    }

    // 9. Si aucun canal disponible
    if (!result.channel) {
      result.reason = 'no_channel_available';
    }

    return result;

  } catch (error) {
    console.error('selectOptimalChannel error:', error);
    result.reason = 'error';
    result.error = error.message;
    return result;
  }
}

// ============================================
// VERIFIER SI CANAL PRET
// ============================================
async function isChannelReady(orgId, prospectId, channel, prospect) {
  const channels = prospect.channels || {};

  switch (channel) {
    case 'email':
      return {
        ready: !!(prospect.email),
        reason: prospect.email ? null : 'no_email'
      };

    case 'sms':
      const smsData = channels.sms || {};
      const hasPhone = !!(prospect.phone || prospect.mobile);
      const smsVerified = smsData.verified !== false;
      return {
        ready: hasPhone && smsVerified,
        reason: !hasPhone ? 'no_phone' : (!smsVerified ? 'phone_not_verified' : null)
      };

    case 'whatsapp':
      const waData = channels.whatsapp || {};
      const hasWAPhone = !!(prospect.phone || prospect.mobile);
      const waReachable = waData.reachable !== false;
      return {
        ready: hasWAPhone && waReachable,
        reason: !hasWAPhone ? 'no_phone' : (!waReachable ? 'whatsapp_not_reachable' : null)
      };

    case 'instagram':
      const igData = channels.instagram || {};
      const hasIG = !!(igData.handle || igData.igUserId);
      const igActive = igData.active !== false;
      return {
        ready: hasIG && igActive,
        reason: !hasIG ? 'no_instagram' : (!igActive ? 'instagram_not_active' : null)
      };

    case 'voicemail':
      const vmData = channels.voicemail || {};
      const hasMobile = isMobileNumber(prospect.phone || prospect.mobile);
      const vmEnabled = vmData.vmEnabled !== false;
      return {
        ready: hasMobile && vmEnabled,
        reason: !hasMobile ? 'no_mobile' : (!vmEnabled ? 'voicemail_disabled' : null)
      };

    case 'postal':
      const postalData = channels.postal || {};
      const hasAddress = !!(prospect.address?.line1 && prospect.address?.city && prospect.address?.postalCode);
      const deliverable = postalData.deliverable !== false;
      return {
        ready: hasAddress && deliverable,
        reason: !hasAddress ? 'no_address' : (!deliverable ? 'address_not_deliverable' : null)
      };

    default:
      return { ready: false, reason: 'unknown_channel' };
  }
}

// ============================================
// SELECTIONNER CANAUX POUR SEQUENCE
// ============================================
export async function selectChannelsForSequence(orgId, prospectId, sequenceConfig) {
  const result = {
    steps: [],
    warnings: []
  };

  try {
    // Recuperer prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { steps: [], error: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();

    // Analyser chaque etape de la sequence
    for (const step of sequenceConfig.steps || []) {
      const stepResult = {
        day: step.day,
        originalChannel: step.channel,
        selectedChannel: null,
        fallbacks: []
      };

      // Verifier le canal prevu
      const channelSelection = await selectOptimalChannel(orgId, prospectId, {
        channels: [step.channel]
      });

      if (channelSelection.channel) {
        stepResult.selectedChannel = step.channel;
      } else {
        // Chercher fallback
        const fallbackSelection = await selectOptimalChannel(orgId, prospectId, {
          channels: step.fallbacks || getDefaultFallbacks(step.channel)
        });

        if (fallbackSelection.channel) {
          stepResult.selectedChannel = fallbackSelection.channel;
          stepResult.fallbackReason = channelSelection.reason;
          result.warnings.push(`Step ${step.day}: ${step.channel} unavailable, using ${fallbackSelection.channel}`);
        } else {
          stepResult.selectedChannel = null;
          stepResult.skipped = true;
          stepResult.skipReason = 'no_channel_available';
          result.warnings.push(`Step ${step.day}: No channel available, step will be skipped`);
        }
      }

      result.steps.push(stepResult);
    }

    return result;

  } catch (error) {
    console.error('selectChannelsForSequence error:', error);
    return { steps: [], error: error.message };
  }
}

// ============================================
// OBTENIR FALLBACKS PAR DEFAUT
// ============================================
function getDefaultFallbacks(channel) {
  const fallbacks = {
    email: ['sms', 'whatsapp'],
    sms: ['email', 'whatsapp'],
    whatsapp: ['sms', 'email'],
    instagram: ['email', 'whatsapp'],
    voicemail: ['sms', 'email'],
    postal: ['email']
  };

  return fallbacks[channel] || ['email'];
}

// ============================================
// RECOMMANDER STRATEGIE CANAL
// ============================================
export async function recommendChannelStrategy(orgId, prospectId) {
  const recommendation = {
    primaryChannel: null,
    sequence: [],
    reasoning: []
  };

  try {
    // Recuperer prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { error: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();
    const score = prospect.score || 0;
    const channels = prospect.channels || {};

    // Analyser disponibilite de chaque canal
    const available = [];

    if (prospect.email) {
      available.push('email');
    }

    if (prospect.phone && channels.sms?.optIn) {
      available.push('sms');
    }

    if (prospect.phone && channels.whatsapp?.reachable) {
      available.push('whatsapp');
    }

    if (channels.instagram?.handle) {
      available.push('instagram');
    }

    if (isMobileNumber(prospect.phone) && channels.voicemail?.optIn) {
      available.push('voicemail');
    }

    if (prospect.address?.line1 && channels.postal?.deliverable !== false) {
      available.push('postal');
    }

    // Recommander strategie selon score et disponibilite
    if (score >= 80) {
      // Hot lead - approche intensive multicanale
      recommendation.reasoning.push('Hot lead (score 80+) - approche intensive recommandee');

      if (available.includes('email')) {
        recommendation.sequence.push({ day: 1, channel: 'email', type: 'intro' });
      }
      if (available.includes('whatsapp')) {
        recommendation.sequence.push({ day: 3, channel: 'whatsapp', type: 'follow_up' });
      }
      if (available.includes('voicemail')) {
        recommendation.sequence.push({ day: 5, channel: 'voicemail', type: 'value' });
      }
      if (available.includes('email')) {
        recommendation.sequence.push({ day: 7, channel: 'email', type: 'social_proof' });
      }
      if (available.includes('postal')) {
        recommendation.sequence.push({ day: 10, channel: 'postal', type: 'premium' });
      }

      recommendation.primaryChannel = available.includes('whatsapp') ? 'whatsapp' : 'email';

    } else if (score >= 50) {
      // Warm lead - approche equilibree
      recommendation.reasoning.push('Warm lead (score 50-79) - approche equilibree');

      if (available.includes('email')) {
        recommendation.sequence.push({ day: 1, channel: 'email', type: 'intro' });
        recommendation.sequence.push({ day: 5, channel: 'email', type: 'value' });
      }
      if (available.includes('sms')) {
        recommendation.sequence.push({ day: 8, channel: 'sms', type: 'short' });
      }
      if (available.includes('whatsapp')) {
        recommendation.sequence.push({ day: 12, channel: 'whatsapp', type: 'casual' });
      }

      recommendation.primaryChannel = 'email';

    } else {
      // Cold/Ice lead - approche economique
      recommendation.reasoning.push('Cold lead (score <50) - approche economique email-first');

      if (available.includes('email')) {
        recommendation.sequence.push({ day: 1, channel: 'email', type: 'intro' });
        recommendation.sequence.push({ day: 5, channel: 'email', type: 'value' });
        recommendation.sequence.push({ day: 10, channel: 'email', type: 'breakup' });
      }

      recommendation.primaryChannel = 'email';
    }

    recommendation.availableChannels = available;

    return recommendation;

  } catch (error) {
    console.error('recommendChannelStrategy error:', error);
    return { error: error.message };
  }
}

// ============================================
// OBTENIR STATISTIQUES CANAL
// ============================================
export async function getChannelPerformanceStats(orgId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const interactionsSnap = await db.collection('organizations').doc(orgId)
      .collection('interactions')
      .where('createdAt', '>=', startDate)
      .get();

    const stats = {
      email: { sent: 0, delivered: 0, opened: 0, replied: 0, cost: 0 },
      sms: { sent: 0, delivered: 0, replied: 0, optOut: 0, cost: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, replied: 0, cost: 0 },
      instagram: { sent: 0, read: 0, replied: 0, cost: 0 },
      voicemail: { sent: 0, delivered: 0, callbacks: 0, cost: 0 },
      postal: { sent: 0, delivered: 0, scanned: 0, cost: 0 }
    };

    interactionsSnap.forEach(doc => {
      const data = doc.data();
      const channel = data.channel;
      const direction = data.direction;

      if (direction === 'out' && stats[channel]) {
        stats[channel].sent++;
        stats[channel].cost += CHANNEL_COSTS[channel] || 0;

        if (data.status === 'delivered') stats[channel].delivered++;
        if (data.opened) stats[channel].opened = (stats[channel].opened || 0) + 1;
        if (data.read) stats[channel].read = (stats[channel].read || 0) + 1;
      }

      if (direction === 'in' && stats[channel]) {
        stats[channel].replied = (stats[channel].replied || 0) + 1;
      }

      // Callbacks voicemail
      if (data.type === 'voicemail_callback') {
        stats.voicemail.callbacks++;
      }
    });

    // Calculer taux
    for (const channel of Object.keys(stats)) {
      const s = stats[channel];
      s.deliveryRate = s.sent > 0 ? ((s.delivered / s.sent) * 100).toFixed(1) : 0;
      s.responseRate = s.sent > 0 ? ((s.replied / s.sent) * 100).toFixed(1) : 0;
    }

    return stats;

  } catch (error) {
    console.error('getChannelPerformanceStats error:', error);
    return {};
  }
}

// ============================================
// HELPER
// ============================================
function isMobileNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

  // France mobile: +33 6xx ou +33 7xx
  if (cleaned.startsWith('+33')) {
    const suffix = cleaned.substring(3);
    return suffix.startsWith('6') || suffix.startsWith('7');
  }

  if (cleaned.startsWith('06') || cleaned.startsWith('07')) {
    return cleaned.length === 10;
  }

  return true; // Assume mobile for international
}

export { PLAN_CHANNELS, CHANNEL_COSTS, CHANNEL_PRIORITY_BY_SCORE };
