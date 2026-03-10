/**
 * triggerSocialScan.js — Declencher un scan social depuis le frontend
 * Le frontend appelle cette CF → la CF dispatche un job vers le VPS
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const VPS_SCANNER_URL = process.env.VPS_SCANNER_URL || 'http://94.130.184.44:8090';
const getWebhookSecret = () => process.env.VPS_WEBHOOK_SECRET || '';

const VALID_PLATFORMS = ['youtube', 'instagram', 'facebook', 'telegram'];

const TIER_CONFIG = {
  free:  { maxScans: 4,  priority: 15 },
  basic: { maxScans: 24, priority: 5  },
  pro:   { maxScans: 96, priority: 1  },
};

export const triggerSocialScan = onCall(
  {
    region: 'europe-west1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const uid = request.auth.uid;
    const { platform, scanConfig } = request.data || {};

    if (!platform) {
      throw new HttpsError('invalid-argument', 'platform is required');
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      throw new HttpsError('invalid-argument', `Invalid platform. Valid: ${VALID_PLATFORMS.join(', ')}`);
    }

    const db = getDb();

    // Trouver l'orgId du user
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }
    const orgId = userDoc.data().orgId || userDoc.data().organizationId || userDoc.data().currentOrganizationId;
    if (!orgId) {
      throw new HttpsError('failed-precondition', 'User has no organization');
    }

    // Verifier le quota du tenant
    const quotaDoc = await db.collection('tenantQuotas').doc(orgId).get();
    const quota = quotaDoc.exists ? quotaDoc.data() : { tier: 'free', scansToday: 0, lastResetDate: '' };

    const today = new Date().toISOString().split('T')[0];
    const scansToday = quota.lastResetDate === today ? (quota.scansToday || 0) : 0;
    const tier = TIER_CONFIG[quota.tier || 'free'] || TIER_CONFIG.free;

    if (scansToday >= tier.maxScans) {
      throw new HttpsError('resource-exhausted', `Daily scan limit reached (${tier.maxScans}/${tier.maxScans})`);
    }

    // Dispatcher le scan vers le VPS
    try {
      const response = await fetch(`${VPS_SCANNER_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': getWebhookSecret(),
        },
        body: JSON.stringify({
          tenantId: orgId,
          platform,
          scanConfig: scanConfig || {},
          priority: tier.priority,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`VPS responded with ${response.status}: ${errText}`);
      }

      // Incrementer le compteur de scans
      await db.collection('tenantQuotas').doc(orgId).set({
        tier: quota.tier || 'free',
        scansToday: scansToday + 1,
        lastResetDate: today,
        lastScanAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { status: 'dispatched', platform, scansRemaining: tier.maxScans - scansToday - 1 };
    } catch (err) {
      console.error('[triggerSocialScan] Error:', err.message);
      throw new HttpsError('internal', `Failed to dispatch scan: ${err.message}`);
    }
  }
);
