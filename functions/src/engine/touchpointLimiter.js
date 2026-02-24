/**
 * Touchpoint Limiter - Contact Frequency Management
 *
 * Limites de contact par prospect sur 30 jours:
 * - Email: 6
 * - SMS: 3
 * - WhatsApp: 2
 * - Instagram: 2
 * - Voicemail: 1
 * - Postal: 1
 * - Total: 15 max
 *
 * Espacement minimum: 48h entre touches
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// LIMITES PAR DEFAUT (30 jours)
// ============================================
export const DEFAULT_TOUCHPOINT_LIMITS = {
  email: 6,
  sms: 3,
  whatsapp: 2,
  instagram: 2,
  voicemail: 1,
  postal: 1,
  total: 15
};

// Espacement minimum entre touches (heures)
export const MIN_SPACING_HOURS = 48;

// Periode de comptage (jours)
export const COUNTING_PERIOD_DAYS = 30;

// ============================================
// VERIFIER SI TOUCHPOINT AUTORISE
// ============================================
export async function canAddTouchpoint(orgId, prospectId, channel) {
  const result = {
    allowed: false,
    reason: null,
    currentCount: 0,
    limit: 0,
    remaining: 0,
    nextAllowedAt: null
  };

  try {
    // 1. Obtenir limites (custom ou default)
    const limits = await getLimits(orgId);
    result.limit = limits[channel] || 0;

    // 2. Calculer periode
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - COUNTING_PERIOD_DAYS);

    // 3. Recuperer prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.reason = 'prospect_not_found';
      return result;
    }

    const prospect = prospectSnap.data();
    const touchpoints = prospect.touchpoints || {};

    // 4. Verifier limite totale
    const totalCount = touchpoints.total || 0;
    if (totalCount >= limits.total) {
      result.reason = 'total_limit_reached';
      result.currentCount = totalCount;
      result.limit = limits.total;
      return result;
    }

    // 5. Verifier limite par canal
    const channelCount = touchpoints.byChannel?.[channel] || 0;
    result.currentCount = channelCount;

    if (channelCount >= result.limit) {
      result.reason = 'channel_limit_reached';
      result.remaining = 0;

      // Calculer quand le prochain sera autorise (reset periode)
      const periodReset = await getNextResetDate(orgId, prospectId, channel);
      result.nextAllowedAt = periodReset;
      return result;
    }

    // 6. Verifier espacement minimum
    const lastTouch = touchpoints.lastTouch;
    if (lastTouch) {
      const lastTouchDate = lastTouch.toDate ? lastTouch.toDate() : new Date(lastTouch);
      const hoursSince = (Date.now() - lastTouchDate.getTime()) / (1000 * 60 * 60);
      const minSpacing = await getMinSpacing(orgId);

      if (hoursSince < minSpacing) {
        result.reason = 'too_soon';
        result.nextAllowedAt = new Date(lastTouchDate.getTime() + minSpacing * 60 * 60 * 1000);
        return result;
      }
    }

    // 7. Tout est OK
    result.allowed = true;
    result.remaining = result.limit - channelCount;

    return result;

  } catch (error) {
    console.error('canAddTouchpoint error:', error);
    result.reason = 'error';
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENREGISTRER TOUCHPOINT
// ============================================
export async function recordTouchpoint(orgId, prospectId, channel) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'touchpoints.total': FieldValue.increment(1),
      [`touchpoints.byChannel.${channel}`]: FieldValue.increment(1),
      'touchpoints.lastTouch': FieldValue.serverTimestamp(),
      'touchpoints.lastChannel': channel
    });

    // Logger dans l'historique
    await getDb().collection('organizations').doc(orgId)
      .collection('touchpointHistory').add({
        prospectId,
        channel,
        timestamp: FieldValue.serverTimestamp()
      });

    return { success: true };

  } catch (error) {
    console.error('recordTouchpoint error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR STATUT TOUCHPOINTS PROSPECT
// ============================================
export async function getTouchpointStatus(orgId, prospectId) {
  try {
    const limits = await getLimits(orgId);

    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { error: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();
    const touchpoints = prospect.touchpoints || {};
    const byChannel = touchpoints.byChannel || {};

    const status = {
      total: {
        used: touchpoints.total || 0,
        limit: limits.total,
        remaining: limits.total - (touchpoints.total || 0),
        percentUsed: ((touchpoints.total || 0) / limits.total * 100).toFixed(0)
      },
      byChannel: {},
      lastTouch: touchpoints.lastTouch,
      lastChannel: touchpoints.lastChannel
    };

    // Statut par canal
    for (const channel of Object.keys(limits)) {
      if (channel === 'total') continue;

      const used = byChannel[channel] || 0;
      const limit = limits[channel];

      status.byChannel[channel] = {
        used,
        limit,
        remaining: limit - used,
        canSend: used < limit
      };
    }

    // Calcul du prochain envoi autorise
    if (touchpoints.lastTouch) {
      const lastTouchDate = touchpoints.lastTouch.toDate ? touchpoints.lastTouch.toDate() : new Date(touchpoints.lastTouch);
      const minSpacing = await getMinSpacing(orgId);
      const nextAllowed = new Date(lastTouchDate.getTime() + minSpacing * 60 * 60 * 1000);

      if (nextAllowed > new Date()) {
        status.nextAllowedAt = nextAllowed;
        status.waitHours = Math.ceil((nextAllowed - Date.now()) / (1000 * 60 * 60));
      }
    }

    return status;

  } catch (error) {
    console.error('getTouchpointStatus error:', error);
    return { error: error.message };
  }
}

// ============================================
// RESET TOUCHPOINTS (fin de periode)
// ============================================
export async function resetTouchpoints(orgId, prospectId) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
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
      'touchpoints.periodStart': FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error('resetTouchpoints error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// RESET TOUCHPOINTS BATCH (scheduled)
// ============================================
export async function resetExpiredTouchpoints(orgId) {
  try {
    const periodThreshold = new Date();
    periodThreshold.setDate(periodThreshold.getDate() - COUNTING_PERIOD_DAYS);

    const prospectsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('prospects')
      .where('touchpoints.periodStart', '<=', Timestamp.fromDate(periodThreshold))
      .limit(100)
      .get();

    let resetCount = 0;

    for (const doc of prospectsSnap.docs) {
      await resetTouchpoints(orgId, doc.id);
      resetCount++;
    }

    return { success: true, resetCount };

  } catch (error) {
    console.error('resetExpiredTouchpoints error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CONFIGURER LIMITES CUSTOM
// ============================================
export async function setCustomLimits(orgId, limits) {
  try {
    // Valider
    const validChannels = ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal', 'total'];
    const cleanLimits = {};

    for (const [channel, limit] of Object.entries(limits)) {
      if (validChannels.includes(channel) && typeof limit === 'number' && limit >= 0) {
        cleanLimits[channel] = limit;
      }
    }

    await getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('touchpointLimits')
      .set({
        ...cleanLimits,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

    return { success: true };

  } catch (error) {
    console.error('setCustomLimits error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CONFIGURER ESPACEMENT CUSTOM
// ============================================
export async function setMinSpacing(orgId, hours) {
  try {
    if (typeof hours !== 'number' || hours < 0) {
      return { success: false, error: 'Invalid spacing value' };
    }

    await getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('touchpointLimits')
      .set({
        minSpacingHours: hours,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

    return { success: true };

  } catch (error) {
    console.error('setMinSpacing error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR LIMITES
// ============================================
async function getLimits(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('touchpointLimits');
    const configSnap = await configRef.get();

    if (configSnap.exists) {
      const custom = configSnap.data();
      return { ...DEFAULT_TOUCHPOINT_LIMITS, ...custom };
    }

    return DEFAULT_TOUCHPOINT_LIMITS;

  } catch (error) {
    return DEFAULT_TOUCHPOINT_LIMITS;
  }
}

// ============================================
// OBTENIR ESPACEMENT MINIMUM
// ============================================
async function getMinSpacing(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('settings').doc('touchpointLimits');
    const configSnap = await configRef.get();

    if (configSnap.exists) {
      return configSnap.data().minSpacingHours || MIN_SPACING_HOURS;
    }

    return MIN_SPACING_HOURS;

  } catch (error) {
    return MIN_SPACING_HOURS;
  }
}

// ============================================
// CALCULER PROCHAINE DATE DE RESET
// ============================================
async function getNextResetDate(orgId, prospectId, channel) {
  try {
    // Trouver le premier touchpoint de la periode
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - COUNTING_PERIOD_DAYS);

    const historySnap = await getDb().collection('organizations').doc(orgId)
      .collection('touchpointHistory')
      .where('prospectId', '==', prospectId)
      .where('channel', '==', channel)
      .where('timestamp', '>=', Timestamp.fromDate(periodStart))
      .orderBy('timestamp', 'asc')
      .limit(1)
      .get();

    if (!historySnap.empty) {
      const firstTouch = historySnap.docs[0].data().timestamp.toDate();
      const resetDate = new Date(firstTouch);
      resetDate.setDate(resetDate.getDate() + COUNTING_PERIOD_DAYS);
      return resetDate;
    }

    return null;

  } catch (error) {
    return null;
  }
}

// ============================================
// OBTENIR HISTORIQUE TOUCHPOINTS
// ============================================
export async function getTouchpointHistory(orgId, prospectId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historySnap = await getDb().collection('organizations').doc(orgId)
      .collection('touchpointHistory')
      .where('prospectId', '==', prospectId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .orderBy('timestamp', 'desc')
      .get();

    const history = historySnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));

    // Grouper par jour
    const byDay = {};
    history.forEach(touch => {
      const day = touch.timestamp.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(touch);
    });

    return { history, byDay };

  } catch (error) {
    console.error('getTouchpointHistory error:', error);
    return { history: [], byDay: {} };
  }
}

// ============================================
// VERIFIER BATCH DE PROSPECTS
// ============================================
export async function checkBatchTouchpoints(orgId, prospectIds, channel) {
  const results = [];

  for (const prospectId of prospectIds) {
    const check = await canAddTouchpoint(orgId, prospectId, channel);
    results.push({
      prospectId,
      allowed: check.allowed,
      reason: check.reason,
      remaining: check.remaining
    });
  }

  const summary = {
    total: results.length,
    allowed: results.filter(r => r.allowed).length,
    blocked: results.filter(r => !r.allowed).length,
    blockedReasons: {}
  };

  results.filter(r => !r.allowed).forEach(r => {
    summary.blockedReasons[r.reason] = (summary.blockedReasons[r.reason] || 0) + 1;
  });

  return { results, summary };
}

// ============================================
// OBTENIR STATS GLOBALES ORG
// ============================================
export async function getOrgTouchpointStats(orgId) {
  try {
    const prospectsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('prospects')
      .get();

    const stats = {
      totalProspects: 0,
      prospectsWithTouches: 0,
      totalTouches: 0,
      byChannel: {
        email: 0,
        sms: 0,
        whatsapp: 0,
        instagram: 0,
        voicemail: 0,
        postal: 0
      },
      atLimit: 0,
      nearLimit: 0 // 80%+
    };

    const limits = await getLimits(orgId);

    prospectsSnap.forEach(doc => {
      stats.totalProspects++;
      const prospect = doc.data();
      const touchpoints = prospect.touchpoints || {};

      if (touchpoints.total > 0) {
        stats.prospectsWithTouches++;
        stats.totalTouches += touchpoints.total;

        // Par canal
        const byChannel = touchpoints.byChannel || {};
        for (const channel of Object.keys(stats.byChannel)) {
          stats.byChannel[channel] += byChannel[channel] || 0;
        }

        // Verifier limites
        if (touchpoints.total >= limits.total) {
          stats.atLimit++;
        } else if (touchpoints.total >= limits.total * 0.8) {
          stats.nearLimit++;
        }
      }
    });

    stats.averageTouchesPerProspect = stats.prospectsWithTouches > 0
      ? (stats.totalTouches / stats.prospectsWithTouches).toFixed(1)
      : 0;

    return stats;

  } catch (error) {
    console.error('getOrgTouchpointStats error:', error);
    return { error: error.message };
  }
}

// ============================================
// SIMULER SEQUENCE
// ============================================
export async function simulateSequenceTouchpoints(orgId, prospectId, sequenceSteps) {
  const simulation = {
    steps: [],
    wouldExceedLimits: false,
    warnings: []
  };

  try {
    const status = await getTouchpointStatus(orgId, prospectId);
    if (status.error) {
      return { error: status.error };
    }

    // Copier l'etat actuel
    const simulatedByChannel = { ...status.byChannel };
    let simulatedTotal = status.total.used;

    for (const step of sequenceSteps) {
      const channel = step.channel;
      const channelStatus = simulatedByChannel[channel];

      if (!channelStatus) {
        simulation.steps.push({
          ...step,
          allowed: false,
          reason: 'unknown_channel'
        });
        continue;
      }

      if (simulatedTotal >= status.total.limit) {
        simulation.steps.push({
          ...step,
          allowed: false,
          reason: 'total_limit_would_exceed'
        });
        simulation.wouldExceedLimits = true;
        simulation.warnings.push(`Step ${step.day}: Total limit would be exceeded`);
        continue;
      }

      if (channelStatus.used >= channelStatus.limit) {
        simulation.steps.push({
          ...step,
          allowed: false,
          reason: 'channel_limit_would_exceed'
        });
        simulation.wouldExceedLimits = true;
        simulation.warnings.push(`Step ${step.day}: ${channel} limit would be exceeded`);
        continue;
      }

      // OK
      simulation.steps.push({
        ...step,
        allowed: true,
        simulatedRemaining: channelStatus.limit - channelStatus.used - 1
      });

      // Mettre a jour simulation
      channelStatus.used++;
      simulatedTotal++;
    }

    return simulation;

  } catch (error) {
    console.error('simulateSequenceTouchpoints error:', error);
    return { error: error.message };
  }
}
