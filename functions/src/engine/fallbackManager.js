/**
 * Fallback Manager - Channel Fallback Logic
 *
 * Logique de fallback automatique:
 * - Email pas ouvert 48h -> SMS
 * - SMS non delivre -> WhatsApp
 * - WhatsApp non dispo -> Email
 * - Detection engagement pour ajuster
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { selectOptimalChannel } from './channelRouter.js';
import { canContactOnChannel } from '../compliance/unifiedOptManager.js';

const getDb = () => getFirestore();

// ============================================
// REGLES DE FALLBACK PAR DEFAUT
// ============================================
export const DEFAULT_FALLBACK_RULES = {
  email: {
    triggerAfterHours: 48,
    condition: 'not_opened',
    fallbackOrder: ['sms', 'whatsapp', 'instagram'],
    maxFallbacks: 1
  },
  sms: {
    triggerAfterHours: 24,
    condition: 'not_delivered',
    fallbackOrder: ['whatsapp', 'email'],
    maxFallbacks: 1
  },
  whatsapp: {
    triggerAfterHours: 24,
    condition: 'not_read',
    fallbackOrder: ['sms', 'email'],
    maxFallbacks: 1
  },
  instagram: {
    triggerAfterHours: 48,
    condition: 'not_read',
    fallbackOrder: ['email', 'whatsapp'],
    maxFallbacks: 1
  },
  voicemail: {
    triggerAfterHours: 72,
    condition: 'no_callback',
    fallbackOrder: ['sms', 'email'],
    maxFallbacks: 1
  },
  postal: {
    triggerAfterDays: 10,
    condition: 'not_engaged',
    fallbackOrder: ['email'],
    maxFallbacks: 1
  }
};

// ============================================
// VERIFIER SI FALLBACK NECESSAIRE
// ============================================
export async function checkFallbackNeeded(orgId, prospectId, interactionId) {
  const result = {
    needsFallback: false,
    originalChannel: null,
    suggestedFallback: null,
    reason: null
  };

  try {
    // 1. Recuperer l'interaction originale
    const interactionRef = getDb().collection('organizations').doc(orgId)
      .collection('interactions').doc(interactionId);
    const interactionSnap = await interactionRef.get();

    if (!interactionSnap.exists) {
      result.reason = 'interaction_not_found';
      return result;
    }

    const interaction = interactionSnap.data();
    result.originalChannel = interaction.channel;

    // 2. Verifier si deja en fallback
    if (interaction.isFallback || interaction.fallbackExecuted) {
      result.reason = 'already_fallback';
      return result;
    }

    // 3. Obtenir les regles pour ce canal
    const rules = await getFallbackRules(orgId, interaction.channel);

    // 4. Verifier le temps ecoule
    const createdAt = interaction.createdAt?.toDate() || new Date();
    const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed < rules.triggerAfterHours) {
      result.reason = 'too_early';
      return result;
    }

    // 5. Verifier la condition de fallback
    const conditionMet = await evaluateFallbackCondition(
      orgId,
      prospectId,
      interaction,
      rules.condition
    );

    if (!conditionMet) {
      result.reason = 'condition_not_met';
      return result;
    }

    // 6. Trouver le meilleur fallback disponible
    for (const fallbackChannel of rules.fallbackOrder) {
      const complianceCheck = await canContactOnChannel(orgId, prospectId, fallbackChannel);

      if (complianceCheck.canContact) {
        result.needsFallback = true;
        result.suggestedFallback = fallbackChannel;
        result.reason = rules.condition;
        break;
      }
    }

    if (!result.suggestedFallback) {
      result.reason = 'no_fallback_available';
    }

    return result;

  } catch (error) {
    console.error('checkFallbackNeeded error:', error);
    result.reason = 'error';
    result.error = error.message;
    return result;
  }
}

// ============================================
// EVALUER CONDITION DE FALLBACK
// ============================================
async function evaluateFallbackCondition(orgId, prospectId, interaction, condition) {
  switch (condition) {
    case 'not_opened':
      return !interaction.opened && !interaction.openedAt;

    case 'not_delivered':
      return interaction.status !== 'delivered' && interaction.status !== 'sent';

    case 'not_read':
      return !interaction.read && !interaction.readAt;

    case 'no_callback':
      // Verifier si un callback a ete recu
      const callbackSnap = await getDb().collection('organizations').doc(orgId)
        .collection('interactions')
        .where('prospectId', '==', prospectId)
        .where('type', '==', 'voicemail_callback')
        .where('createdAt', '>=', interaction.createdAt)
        .limit(1)
        .get();
      return callbackSnap.empty;

    case 'not_engaged':
      // Verifier QR scan ou PURL visite
      const prospectRef = getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId);
      const prospectSnap = await prospectRef.get();
      if (prospectSnap.exists) {
        const postal = prospectSnap.data().channels?.postal || {};
        return !postal.lastScanAt;
      }
      return true;

    case 'no_reply':
      // Verifier si une reponse a ete recue
      const replySnap = await getDb().collection('organizations').doc(orgId)
        .collection('interactions')
        .where('prospectId', '==', prospectId)
        .where('direction', '==', 'in')
        .where('createdAt', '>=', interaction.createdAt)
        .limit(1)
        .get();
      return replySnap.empty;

    default:
      return true;
  }
}

// ============================================
// OBTENIR REGLES FALLBACK
// ============================================
async function getFallbackRules(orgId, channel) {
  try {
    // Chercher regles custom
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('fallbackRules');
    const configSnap = await configRef.get();

    if (configSnap.exists) {
      const customRules = configSnap.data();
      if (customRules[channel]) {
        return { ...DEFAULT_FALLBACK_RULES[channel], ...customRules[channel] };
      }
    }

    return DEFAULT_FALLBACK_RULES[channel] || DEFAULT_FALLBACK_RULES.email;

  } catch (error) {
    return DEFAULT_FALLBACK_RULES[channel] || DEFAULT_FALLBACK_RULES.email;
  }
}

// ============================================
// EXECUTER FALLBACK
// ============================================
export async function executeFallback(orgId, prospectId, originalInteractionId, fallbackChannel) {
  const result = {
    success: false,
    newInteractionId: null,
    channel: fallbackChannel,
    error: null
  };

  try {
    // 1. Recuperer interaction originale
    const originalRef = getDb().collection('organizations').doc(orgId)
      .collection('interactions').doc(originalInteractionId);
    const originalSnap = await originalRef.get();

    if (!originalSnap.exists) {
      result.error = 'original_interaction_not_found';
      return result;
    }

    const original = originalSnap.data();

    // 2. Marquer l'original comme ayant eu un fallback
    await originalRef.update({
      fallbackExecuted: true,
      fallbackChannel,
      fallbackAt: FieldValue.serverTimestamp()
    });

    // 3. Creer la nouvelle interaction de fallback
    const fallbackData = {
      type: `${fallbackChannel}_fallback`,
      channel: fallbackChannel,
      direction: 'out',
      prospectId,
      isFallback: true,
      originalInteractionId,
      originalChannel: original.channel,
      fallbackReason: `${original.channel}_${original.status || 'no_engagement'}`,
      sequenceId: original.sequenceId,
      stepId: original.stepId,
      templateId: original.templateId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    };

    const newRef = await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add(fallbackData);

    result.success = true;
    result.newInteractionId = newRef.id;

    // 4. Logger l'evenement
    await logFallbackEvent(orgId, {
      prospectId,
      originalInteractionId,
      newInteractionId: newRef.id,
      originalChannel: original.channel,
      fallbackChannel,
      reason: fallbackData.fallbackReason
    });

    return result;

  } catch (error) {
    console.error('executeFallback error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// SCANNER FALLBACKS EN ATTENTE
// ============================================
export async function scanPendingFallbacks(orgId) {
  const results = {
    scanned: 0,
    fallbacksTriggered: [],
    errors: []
  };

  try {
    // Calculer seuil de temps (48h par defaut pour la plupart)
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - 24);

    // Trouver interactions outbound non engagees
    const interactionsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('direction', '==', 'out')
      .where('fallbackExecuted', '==', null)
      .where('createdAt', '<=', Timestamp.fromDate(threshold))
      .limit(100)
      .get();

    for (const doc of interactionsSnap.docs) {
      results.scanned++;

      const interaction = doc.data();

      // Verifier si fallback necessaire
      const check = await checkFallbackNeeded(
        orgId,
        interaction.prospectId,
        doc.id
      );

      if (check.needsFallback && check.suggestedFallback) {
        const fallbackResult = await executeFallback(
          orgId,
          interaction.prospectId,
          doc.id,
          check.suggestedFallback
        );

        if (fallbackResult.success) {
          results.fallbacksTriggered.push({
            prospectId: interaction.prospectId,
            originalChannel: interaction.channel,
            fallbackChannel: check.suggestedFallback,
            newInteractionId: fallbackResult.newInteractionId
          });
        } else {
          results.errors.push({
            interactionId: doc.id,
            error: fallbackResult.error
          });
        }
      }
    }

    return results;

  } catch (error) {
    console.error('scanPendingFallbacks error:', error);
    results.errors.push({ error: error.message });
    return results;
  }
}

// ============================================
// CONFIGURER REGLES FALLBACK
// ============================================
export async function setFallbackRules(orgId, channel, rules) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('fallbackRules');

    await configRef.set({
      [channel]: {
        ...rules,
        updatedAt: FieldValue.serverTimestamp()
      }
    }, { merge: true });

    return { success: true };

  } catch (error) {
    console.error('setFallbackRules error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR STATS FALLBACK
// ============================================
export async function getFallbackStats(orgId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const fallbackSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('isFallback', '==', true)
      .where('createdAt', '>=', Timestamp.fromDate(startDate))
      .get();

    const stats = {
      total: 0,
      byOriginalChannel: {},
      byFallbackChannel: {},
      successRate: 0,
      engaged: 0
    };

    fallbackSnap.forEach(doc => {
      const data = doc.data();
      stats.total++;

      // Par canal original
      const origChannel = data.originalChannel;
      stats.byOriginalChannel[origChannel] = (stats.byOriginalChannel[origChannel] || 0) + 1;

      // Par canal fallback
      const fbChannel = data.channel;
      stats.byFallbackChannel[fbChannel] = (stats.byFallbackChannel[fbChannel] || 0) + 1;

      // Engagement
      if (data.opened || data.read || data.replied || data.status === 'delivered') {
        stats.engaged++;
      }
    });

    stats.successRate = stats.total > 0
      ? ((stats.engaged / stats.total) * 100).toFixed(1)
      : 0;

    return stats;

  } catch (error) {
    console.error('getFallbackStats error:', error);
    return { total: 0, successRate: 0 };
  }
}

// ============================================
// DESACTIVER FALLBACK POUR PROSPECT
// ============================================
export async function disableFallbackForProspect(orgId, prospectId, channel = null) {
  try {
    const updateData = channel
      ? { [`fallbackDisabled.${channel}`]: true }
      : { fallbackDisabledGlobal: true };

    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update(updateData);

    return { success: true };

  } catch (error) {
    console.error('disableFallbackForProspect error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LOGGER EVENEMENT FALLBACK
// ============================================
async function logFallbackEvent(orgId, eventData) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('fallbackLogs').add({
        ...eventData,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logFallbackEvent error:', error);
  }
}

// ============================================
// PREVISUALISER FALLBACK
// ============================================
export async function previewFallbackChain(orgId, prospectId, startChannel) {
  const chain = [{ channel: startChannel, type: 'primary' }];

  try {
    const rules = await getFallbackRules(orgId, startChannel);

    for (const fallbackChannel of rules.fallbackOrder || []) {
      const complianceCheck = await canContactOnChannel(orgId, prospectId, fallbackChannel);

      chain.push({
        channel: fallbackChannel,
        type: 'fallback',
        available: complianceCheck.canContact,
        blockedReason: complianceCheck.canContact ? null : complianceCheck.reason
      });

      if (chain.length >= 4) break; // Max 4 etapes
    }

    return chain;

  } catch (error) {
    console.error('previewFallbackChain error:', error);
    return chain;
  }
}
