/**
 * Instagram Compliance
 *
 * Regles Instagram DM:
 * - Interaction prealable requise (pas de cold DM)
 * - Rate limit 70 DM/jour (safe zone)
 * - API officielle Meta uniquement
 * - Pas de messages identiques en masse
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// LIMITES
// ============================================
const DAILY_DM_LIMIT = 70;      // Safe zone
const HOURLY_DM_LIMIT = 20;     // Limite horaire recommandee
const MIN_DELAY_MS = 5000;      // 5 secondes entre DMs

// ============================================
// VERIFIER RATE LIMIT
// ============================================
export async function checkRateLimit(orgId) {
  const result = {
    allowed: true,
    count: 0,
    limit: DAILY_DM_LIMIT,
    remaining: DAILY_DM_LIMIT,
    resetAt: null
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = getDb().collection('organizations').doc(orgId)
      .collection('rateLimits').doc(`instagram_${today}`);

    const counterSnap = await counterRef.get();

    if (counterSnap.exists) {
      result.count = counterSnap.data().count || 0;
      result.remaining = DAILY_DM_LIMIT - result.count;

      if (result.count >= DAILY_DM_LIMIT) {
        result.allowed = false;

        // Calculer reset (minuit)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        result.resetAt = tomorrow;
      }
    }

    return result;

  } catch (error) {
    console.error('checkRateLimit error:', error);
    // En cas d'erreur, autoriser pour ne pas bloquer
    return result;
  }
}

// ============================================
// INCREMENTER COMPTEUR JOURNALIER
// ============================================
export async function incrementDailyCount(orgId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const counterRef = getDb().collection('organizations').doc(orgId)
      .collection('rateLimits').doc(`instagram_${today}`);

    await counterRef.set({
      count: FieldValue.increment(1),
      date: today,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('incrementDailyCount error:', error);
    return false;
  }
}

// ============================================
// VERIFIER INTERACTION PREALABLE
// ============================================
export async function hasPriorInteraction(orgId, prospectId) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { hasInteraction: false, reason: 'prospect_not_found' };
    }

    const prospect = prospectSnap.data();
    const instagram = prospect.channels?.instagram || {};

    // Verifier si derniere interaction existe
    if (instagram.lastInteraction) {
      return {
        hasInteraction: true,
        lastInteraction: instagram.lastInteraction.toDate(),
        interactionType: instagram.lastInteractionType
      };
    }

    // Verifier dans les interactions
    const interactionsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('instagramInteractions')
      .where('prospectId', '==', prospectId)
      .where('direction', '==', 'in')
      .limit(1)
      .get();

    if (!interactionsSnap.empty) {
      return {
        hasInteraction: true,
        source: 'interactions_collection'
      };
    }

    return {
      hasInteraction: false,
      reason: 'no_prior_interaction'
    };

  } catch (error) {
    console.error('hasPriorInteraction error:', error);
    return { hasInteraction: false, error: error.message };
  }
}

// ============================================
// VERIFIER COMPLIANCE COMPLETE INSTAGRAM
// ============================================
export async function checkInstagramCompliance(orgId, prospectId) {
  const checks = {
    passed: true,
    reasons: [],
    details: {},
    warnings: []
  };

  try {
    // 1. Verifier rate limit
    const rateCheck = await checkRateLimit(orgId);
    if (!rateCheck.allowed) {
      checks.passed = false;
      checks.reasons.push('rate_limit_exceeded');
      checks.details.rateLimit = rateCheck;
    }

    // 2. Recuperer prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      checks.passed = false;
      checks.reasons.push('prospect_not_found');
      return checks;
    }

    const prospect = prospectSnap.data();

    // 3. Verifier Instagram ID
    const instagram = prospect.channels?.instagram || {};
    if (!instagram.igUserId && !instagram.handle) {
      checks.passed = false;
      checks.reasons.push('no_instagram_id');
    }

    // 4. Verifier interaction prealable (CRITIQUE)
    const interactionCheck = await hasPriorInteraction(orgId, prospectId);
    if (!interactionCheck.hasInteraction) {
      checks.passed = false;
      checks.reasons.push('no_prior_interaction');
      checks.details.interaction = interactionCheck;
      checks.warnings.push('Cold DM interdit sur Instagram - interaction prealable requise');
    }

    // 5. Verifier non-suppression
    const suppression = prospect.suppression || {};
    if (suppression.global === true) {
      checks.passed = false;
      checks.reasons.push('globally_suppressed');
    }
    if (suppression.byChannel?.instagram === true) {
      checks.passed = false;
      checks.reasons.push('instagram_suppressed');
    }

    // 6. Verifier si compte actif
    if (instagram.active === false) {
      checks.passed = false;
      checks.reasons.push('instagram_not_active');
    }

    // 7. Verifier blocage
    if (instagram.blocked === true) {
      checks.passed = false;
      checks.reasons.push('blocked_by_user');
    }

    return checks;

  } catch (error) {
    console.error('checkInstagramCompliance error:', error);
    checks.passed = false;
    checks.reasons.push('error');
    checks.details.error = error.message;
    return checks;
  }
}

// ============================================
// ENREGISTRER INTERACTION (pour compliance)
// ============================================
export async function recordInstagramInteraction(orgId, prospectId, type) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.instagram.lastInteraction': FieldValue.serverTimestamp(),
        'channels.instagram.lastInteractionType': type,
        'channels.instagram.active': true
      });

    return { success: true };
  } catch (error) {
    console.error('recordInstagramInteraction error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VERIFIER DELAI ENTRE MESSAGES
// ============================================
export async function checkMessageDelay(orgId, prospectId) {
  try {
    const interactionSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('channel', '==', 'instagram')
      .where('direction', '==', 'out')
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (interactionSnap.empty) {
      return { canSend: true };
    }

    const lastSent = interactionSnap.docs[0].data().createdAt;
    const lastSentMs = lastSent?.toMillis() || 0;
    const elapsed = Date.now() - lastSentMs;

    if (elapsed < MIN_DELAY_MS) {
      return {
        canSend: false,
        waitMs: MIN_DELAY_MS - elapsed,
        reason: 'too_soon'
      };
    }

    return { canSend: true };

  } catch (error) {
    console.error('checkMessageDelay error:', error);
    return { canSend: true };
  }
}

// ============================================
// OBTENIR STATS RATE LIMIT
// ============================================
export async function getRateLimitStats(orgId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisHour = new Date();
    thisHour.setMinutes(0, 0, 0);

    // Compteur journalier
    const dailyRef = getDb().collection('organizations').doc(orgId)
      .collection('rateLimits').doc(`instagram_${today}`);
    const dailySnap = await dailyRef.get();
    const dailyCount = dailySnap.exists ? (dailySnap.data().count || 0) : 0;

    // Compteur horaire
    const hourlySnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('channel', '==', 'instagram')
      .where('direction', '==', 'out')
      .where('createdAt', '>=', Timestamp.fromDate(thisHour))
      .get();
    const hourlyCount = hourlySnap.size;

    return {
      daily: {
        count: dailyCount,
        limit: DAILY_DM_LIMIT,
        remaining: DAILY_DM_LIMIT - dailyCount,
        percentage: Math.round((dailyCount / DAILY_DM_LIMIT) * 100)
      },
      hourly: {
        count: hourlyCount,
        limit: HOURLY_DM_LIMIT,
        remaining: HOURLY_DM_LIMIT - hourlyCount
      }
    };

  } catch (error) {
    console.error('getRateLimitStats error:', error);
    return {
      daily: { count: 0, limit: DAILY_DM_LIMIT, remaining: DAILY_DM_LIMIT },
      hourly: { count: 0, limit: HOURLY_DM_LIMIT, remaining: HOURLY_DM_LIMIT }
    };
  }
}

// ============================================
// VERIFIER VARIETE DES MESSAGES
// ============================================
export async function checkMessageVariety(orgId, message, limit = 10) {
  try {
    // Recuperer les derniers messages envoyes
    const recentSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('channel', '==', 'instagram')
      .where('direction', '==', 'out')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const recentMessages = recentSnap.docs.map(doc => doc.data().text || '');

    // Verifier si le message est trop similaire
    const normalizedNew = message.toLowerCase().trim();

    let duplicateCount = 0;
    for (const recent of recentMessages) {
      const normalizedRecent = recent.toLowerCase().trim();
      const similarity = calculateSimilarity(normalizedNew, normalizedRecent);

      if (similarity > 0.9) {
        duplicateCount++;
      }
    }

    if (duplicateCount >= 3) {
      return {
        varied: false,
        warning: 'Message trop similaire aux messages recents - risque de detection spam'
      };
    }

    return { varied: true };

  } catch (error) {
    console.error('checkMessageVariety error:', error);
    return { varied: true };
  }
}

// Calcul simple de similarite (Jaccard)
function calculateSimilarity(str1, str2) {
  const set1 = new Set(str1.split(' '));
  const set2 = new Set(str2.split(' '));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export { DAILY_DM_LIMIT, HOURLY_DM_LIMIT };
