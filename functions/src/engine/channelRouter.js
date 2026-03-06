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
import { getCountryProfile } from './countryProfiles.js';

const getDb = () => getFirestore();

// ============================================
// PRIORITE DES CANAUX PAR SCORE
// ============================================
const CHANNEL_PRIORITY_BY_SCORE = {
  // Score 80+ (Hot leads) - Canaux haute conversion
  hot: ['email', 'whatsapp', 'linkedin', 'voicemail', 'postal', 'sms', 'instagram', 'twitter'],

  // Score 50-79 (Warm leads) - Mix equilibre
  warm: ['email', 'sms', 'whatsapp', 'linkedin', 'instagram', 'voicemail', 'postal', 'twitter'],

  // Score 25-49 (Cold leads) - Canaux volume
  cold: ['email', 'sms', 'instagram', 'linkedin', 'whatsapp', 'voicemail', 'postal', 'twitter'],

  // Score <25 (Ice leads) - Email principalement
  ice: ['email', 'sms', 'instagram', 'whatsapp', 'linkedin', 'twitter']
};

// ============================================
// CANAUX PAR FORFAIT
// ============================================
const PLAN_CHANNELS = {
  starter: ['email'],
  pro: ['email', 'sms', 'whatsapp'],
  enterprise: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal'],
  agency: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal', 'linkedin', 'twitter']
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
  postal: 1.50,
  linkedin: 0,
  twitter: 0
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
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.reason = 'prospect_not_found';
      return result;
    }

    const prospect = prospectSnap.data();

    // 2. Recuperer organisation et forfait
    const orgRef = getDb().collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    const org = orgSnap.exists ? orgSnap.data() : {};
    const plan = org.plan || 'starter';

    // 3. Determiner canaux disponibles selon forfait
    const availableChannels = PLAN_CHANNELS[plan] || PLAN_CHANNELS.starter;

    // 4. Filtrer par canaux demandes si specifie
    let candidateChannels = options.channels
      ? options.channels.filter(c => availableChannels.includes(c))
      : availableChannels;

    // 5. Determiner priorite selon score + pays
    const score = prospect.score || 0;
    let priorityTier;
    if (score >= 80) priorityTier = 'hot';
    else if (score >= 50) priorityTier = 'warm';
    else if (score >= 25) priorityTier = 'cold';
    else priorityTier = 'ice';

    // Adapter la priorite selon le pays du prospect (Module 7)
    const countryProfile = getCountryProfile(prospect);
    const countryPriority = countryProfile?.channels?.priority;
    const defaultPriority = CHANNEL_PRIORITY_BY_SCORE[priorityTier];

    // Fusionner : canaux pays en priorite, puis le reste du tier
    const priorityOrder = countryPriority
      ? [...new Set([...countryPriority, ...defaultPriority])]
      : defaultPriority;

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

    case 'linkedin':
      const liData = channels.linkedin || {};
      const hasLinkedIn = !!(prospect.linkedinUrl || liData.profileUrl);
      const liActive = liData.active !== false;
      return {
        ready: hasLinkedIn && liActive,
        reason: !hasLinkedIn ? 'no_linkedin' : (!liActive ? 'linkedin_not_active' : null)
      };

    case 'twitter':
      const twData = channels.twitter || {};
      const hasTwitter = !!(prospect.twitterHandle || twData.handle);
      const twActive = twData.active !== false;
      return {
        ready: hasTwitter && twActive,
        reason: !hasTwitter ? 'no_twitter' : (!twActive ? 'twitter_not_active' : null)
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
    const prospectRef = getDb().collection('organizations').doc(orgId)
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
    postal: ['email'],
    linkedin: ['email', 'instagram'],
    twitter: ['email', 'sms']
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
    const prospectRef = getDb().collection('organizations').doc(orgId)
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

    if (prospect.linkedinUrl || channels.linkedin?.profileUrl) {
      available.push('linkedin');
    }

    if (prospect.twitterHandle || channels.twitter?.handle) {
      available.push('twitter');
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

    const interactionsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('createdAt', '>=', startDate)
      .get();

    const stats = {
      email: { sent: 0, delivered: 0, opened: 0, replied: 0, cost: 0 },
      sms: { sent: 0, delivered: 0, replied: 0, optOut: 0, cost: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, replied: 0, cost: 0 },
      instagram: { sent: 0, read: 0, replied: 0, cost: 0 },
      voicemail: { sent: 0, delivered: 0, callbacks: 0, cost: 0 },
      postal: { sent: 0, delivered: 0, scanned: 0, cost: 0 },
      linkedin: { sent: 0, connected: 0, replied: 0, cost: 0 },
      twitter: { sent: 0, delivered: 0, replied: 0, cost: 0 }
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
// GENERER SEQUENCE OPTIMALE MULTI-CANAL
// ============================================
export async function generateOptimalSequence(orgId, prospectId, options = {}) {
  const result = {
    sequence: [],
    estimatedCost: 0,
    reasoning: []
  };

  try {
    const db = getDb();
    const prospectSnap = await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId).get();

    if (!prospectSnap.exists) {
      return { ...result, error: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();
    const orgSnap = await db.collection('organizations').doc(orgId).get();
    const org = orgSnap.exists ? orgSnap.data() : {};
    const plan = org.plan || 'starter';
    const availableChannels = PLAN_CHANNELS[plan] || PLAN_CHANNELS.starter;

    const score = prospect.score || 0;
    const touchpoints = options.touchpoints || 7;
    const daysSpan = options.daysSpan || 21;

    // Determiner canaux utilisables pour ce prospect
    const usableChannels = [];
    for (const ch of availableChannels) {
      const ready = await isChannelReady(orgId, prospectId, ch, prospect);
      if (ready.ready) usableChannels.push(ch);
    }

    if (usableChannels.length === 0) {
      result.reasoning.push('Aucun canal disponible pour ce prospect');
      return result;
    }

    // Performance historique pour ponderer
    const perfStats = await getChannelPerformanceStats(orgId, 30);

    // Construire la sequence optimale
    const dayInterval = Math.floor(daysSpan / touchpoints);

    // Templates de sequences par score
    const templates = {
      hot: [
        { channel: 'email', type: 'intro' },
        { channel: 'linkedin', type: 'connect' },
        { channel: 'whatsapp', type: 'follow_up' },
        { channel: 'email', type: 'value' },
        { channel: 'voicemail', type: 'personal' },
        { channel: 'email', type: 'social_proof' },
        { channel: 'postal', type: 'premium' },
      ],
      warm: [
        { channel: 'email', type: 'intro' },
        { channel: 'sms', type: 'short' },
        { channel: 'linkedin', type: 'connect' },
        { channel: 'email', type: 'value' },
        { channel: 'whatsapp', type: 'casual' },
        { channel: 'email', type: 'social_proof' },
        { channel: 'instagram', type: 'soft' },
      ],
      cold: [
        { channel: 'email', type: 'intro' },
        { channel: 'email', type: 'value' },
        { channel: 'sms', type: 'short' },
        { channel: 'instagram', type: 'soft' },
        { channel: 'email', type: 'social_proof' },
        { channel: 'linkedin', type: 'connect' },
        { channel: 'email', type: 'breakup' },
      ],
      ice: [
        { channel: 'email', type: 'intro' },
        { channel: 'email', type: 'value' },
        { channel: 'email', type: 'breakup' },
      ],
    };

    const tier = score >= 80 ? 'hot' : score >= 50 ? 'warm' : score >= 25 ? 'cold' : 'ice';
    const template = templates[tier].slice(0, touchpoints);

    let day = 1;
    for (const step of template) {
      let selectedChannel = step.channel;

      // Si le canal n'est pas dispo, trouver un fallback
      if (!usableChannels.includes(selectedChannel)) {
        const fallbacks = getDefaultFallbacks(selectedChannel);
        selectedChannel = fallbacks.find(fb => usableChannels.includes(fb)) || null;
      }

      if (selectedChannel) {
        const cost = CHANNEL_COSTS[selectedChannel] || 0;
        result.sequence.push({
          day,
          channel: selectedChannel,
          type: step.type,
          estimatedCost: cost,
        });
        result.estimatedCost += cost;

        // Ajouter reasoning pour les substitutions
        if (selectedChannel !== step.channel) {
          result.reasoning.push(`Jour ${day}: ${step.channel} indisponible, substitue par ${selectedChannel}`);
        }
      }

      day += dayInterval;
    }

    result.reasoning.push(`Sequence ${tier} en ${touchpoints} touchpoints sur ${daysSpan} jours`);
    result.reasoning.push(`Canaux utilises: ${[...new Set(result.sequence.map(s => s.channel))].join(', ')}`);

    return result;
  } catch (error) {
    console.error('generateOptimalSequence error:', error);
    return { ...result, error: error.message };
  }
}

// ============================================
// ALLOCATION BUDGETAIRE PAR CANAL
// ============================================
export async function allocateChannelBudgets(orgId, dailyLimit) {
  const result = {
    allocations: {},
    reasoning: []
  };

  try {
    const db = getDb();
    const orgSnap = await db.collection('organizations').doc(orgId).get();
    const org = orgSnap.exists ? orgSnap.data() : {};
    const plan = org.plan || 'starter';
    const availableChannels = PLAN_CHANNELS[plan] || PLAN_CHANNELS.starter;

    // Performance historique
    const perfStats = await getChannelPerformanceStats(orgId, 30);

    // Calculer scores de performance par canal
    const channelScores = {};
    let totalScore = 0;

    for (const channel of availableChannels) {
      const stats = perfStats[channel] || {};
      const responseRate = parseFloat(stats.responseRate) || 0;
      const sent = stats.sent || 0;

      // Score = taux reponse * volume (penaliser canaux jamais utilises)
      const score = sent > 0 ? responseRate * Math.log(sent + 1) : 1;
      channelScores[channel] = Math.max(score, 0.5); // Minimum pour essayer chaque canal
      totalScore += channelScores[channel];
    }

    // Repartir le budget proportionnellement aux scores
    let allocated = 0;
    for (const channel of availableChannels) {
      const ratio = channelScores[channel] / totalScore;
      const channelBudget = Math.max(1, Math.round(dailyLimit * ratio));
      result.allocations[channel] = channelBudget;
      allocated += channelBudget;

      const responseRate = parseFloat(perfStats[channel]?.responseRate) || 0;
      result.reasoning.push(`${channel}: ${channelBudget} msg/jour (perf: ${responseRate}%, score: ${channelScores[channel].toFixed(1)})`);
    }

    // Ajuster si on depasse le budget
    if (allocated > dailyLimit) {
      const excess = allocated - dailyLimit;
      // Retirer l'exces des canaux les plus chers
      const sorted = availableChannels.sort((a, b) => (CHANNEL_COSTS[b] || 0) - (CHANNEL_COSTS[a] || 0));
      let remaining = excess;
      for (const ch of sorted) {
        if (remaining <= 0) break;
        const reduction = Math.min(remaining, result.allocations[ch] - 1);
        if (reduction > 0) {
          result.allocations[ch] -= reduction;
          remaining -= reduction;
        }
      }
    }

    result.totalAllocated = Object.values(result.allocations).reduce((a, b) => a + b, 0);
    result.estimatedDailyCost = Object.entries(result.allocations)
      .reduce((sum, [ch, count]) => sum + count * (CHANNEL_COSTS[ch] || 0), 0)
      .toFixed(2);

    return result;
  } catch (error) {
    console.error('allocateChannelBudgets error:', error);
    return { ...result, error: error.message };
  }
}

// ============================================
// SELECTION CANAUX PAR TYPE DE LEAD
// ============================================
export function selectChannelsByLeadType(lead) {
  const result = {
    primaryChannels: [],
    secondaryChannels: [],
    reasoning: []
  };

  const source = (lead.source || '').toLowerCase();
  const hasEmail = !!lead.email;
  const hasPhone = !!(lead.phone || lead.mobile);
  const hasLinkedIn = !!(lead.linkedinUrl || lead.channels?.linkedin?.profileUrl);
  const hasInstagram = !!(lead.instagramHandle || lead.channels?.instagram?.handle);
  const hasTwitter = !!(lead.twitterHandle || lead.channels?.twitter?.handle);
  const hasAddress = !!(lead.address?.line1 && lead.address?.city);
  const isB2B = lead.companyName || lead.company || lead.jobTitle || source.includes('linkedin');
  const isLocal = source.includes('google') || source.includes('maps') || source.includes('yelp');
  const isSocial = source.includes('instagram') || source.includes('tiktok') || source.includes('facebook') || source.includes('twitter');

  if (isB2B) {
    // B2B leads : LinkedIn + Email prioritaires
    result.reasoning.push('Lead B2B detecte — priorite LinkedIn + Email');
    if (hasLinkedIn) result.primaryChannels.push('linkedin');
    if (hasEmail) result.primaryChannels.push('email');
    if (hasPhone) result.secondaryChannels.push('sms');
    if (hasInstagram) result.secondaryChannels.push('instagram');
    if (hasTwitter) result.secondaryChannels.push('twitter');
  } else if (isLocal) {
    // Local business leads : SMS + Email
    result.reasoning.push('Lead local detecte — priorite SMS + Email');
    if (hasPhone) result.primaryChannels.push('sms');
    if (hasEmail) result.primaryChannels.push('email');
    if (hasPhone) result.secondaryChannels.push('whatsapp');
    if (hasAddress) result.secondaryChannels.push('postal');
    if (hasInstagram) result.secondaryChannels.push('instagram');
  } else if (isSocial) {
    // Social leads : Instagram + WhatsApp
    result.reasoning.push('Lead social detecte — priorite Instagram + WhatsApp');
    if (hasInstagram) result.primaryChannels.push('instagram');
    if (hasPhone) result.primaryChannels.push('whatsapp');
    if (hasEmail) result.secondaryChannels.push('email');
    if (hasTwitter) result.secondaryChannels.push('twitter');
    if (hasPhone) result.secondaryChannels.push('sms');
  } else {
    // Default : Email-first
    result.reasoning.push('Lead generique — priorite Email');
    if (hasEmail) result.primaryChannels.push('email');
    if (hasPhone) result.primaryChannels.push('sms');
    if (hasPhone) result.secondaryChannels.push('whatsapp');
    if (hasInstagram) result.secondaryChannels.push('instagram');
    if (hasLinkedIn) result.secondaryChannels.push('linkedin');
  }

  // Deduplicate
  result.secondaryChannels = result.secondaryChannels.filter(ch => !result.primaryChannels.includes(ch));

  return result;
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

export { PLAN_CHANNELS, CHANNEL_COSTS, CHANNEL_PRIORITY_BY_SCORE, getDefaultFallbacks };
