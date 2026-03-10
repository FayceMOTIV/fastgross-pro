/**
 * Social Omniscient v2 — Orchestrateur Cloud Tasks
 *
 * Le scheduler dispatch des Cloud Tasks individuels (1 task = 1 org)
 * pour eviter le timeout. Chaque task a 10 minutes et tourne independamment.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFunctions } from 'firebase-admin/functions';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';

const getDb = () => getFirestore();
const VPS_SECRET_KEY = defineSecret('VPS_SECRET_KEY');

const VPS_URL = 'http://94.130.184.44:3001';

function vpsHeaders(secretValue) {
  return {
    'Content-Type': 'application/json',
    'X-FMF-Secret': secretValue,
  };
}

// ============================================================
// SCHEDULER : dispatch 1 task par org (pas de boucle monolithique)
// ============================================================

export const scheduleSocialScans = onSchedule(
  {
    schedule: 'every 2 hours',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 120,
    secrets: [VPS_SECRET_KEY],
  },
  async () => {
    console.log('[SocialScheduler] Dispatching scan tasks...');

    const db = getDb();
    const orgsSnap = await db.collection('organizations')
      .where('socialOmniscient.enabled', '==', true)
      .where('subscription.status', '==', 'active')
      .select('socialOmniscient', 'subscription')
      .get();

    if (orgsSnap.empty) {
      console.log('[SocialScheduler] Aucun org actif');
      return;
    }

    const queue = getFunctions().taskQueue('scanSingleOrg');
    const dispatched = [];

    for (const orgDoc of orgsSnap.docs) {
      try {
        await queue.enqueue(
          { orgId: orgDoc.id },
          {
            scheduleDelaySeconds: 0,
            dispatchDeadlineSeconds: 600,
          }
        );
        dispatched.push(orgDoc.id);
      } catch (error) {
        console.error(`[SocialScheduler] Erreur dispatch org ${orgDoc.id}:`, error.message);
      }
    }

    console.log(`[SocialScheduler] ${dispatched.length} tasks dispatchees`);
  }
);

// ============================================================
// CLOUD TASK : scan un seul org (timeout 10 min, isole)
// ============================================================

export const scanSingleOrg = onTaskDispatched(
  {
    retryConfig: { maxAttempts: 2, minBackoffSeconds: 60 },
    rateLimits: { maxConcurrentDispatches: 10 },
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 600,
    secrets: [VPS_SECRET_KEY],
  },
  async (req) => {
    const { orgId } = req.data;
    if (!orgId) return;

    const db = getDb();
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) return;

    const orgData = orgDoc.data();
    const config = orgData.socialOmniscient || {};
    const plan = orgData.subscription?.plan || 'radar';
    const layers = getPlanLayers(plan);
    const secret = VPS_SECRET_KEY.value();

    console.log(`[ScanSingleOrg] Scan org ${orgId} — plan ${plan}`);

    const signals = [];
    const keywords = config.keywords || [];
    const geoZones = config.geoZones || [];
    const nafCodes = config.nafCodes || [];

    // COUCHE 1 — Sources officielles (sans auth, scale illimite)
    if (layers.includes('official')) {
      // BODACC
      try {
        const r = await axios.post(`${VPS_URL}/social/scan-bodacc`,
          { daysBack: 3, nafCodes },
          { headers: vpsHeaders(secret), timeout: 30000 }
        );
        signals.push(...(r.data.signals || []));
      } catch (e) { console.warn(`[${orgId}] BODACC:`, e.message); }

      // France Travail
      for (const zone of geoZones.slice(0, 3)) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-france-travail`,
            { commune: zone.codeCommune || '69123', nafCodes, daysBack: 7 },
            { headers: vpsHeaders(secret), timeout: 30000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] FranceTravail:`, e.message); }
      }

      // SITADEL
      for (const zone of geoZones.slice(0, 2)) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-sitadel`,
            { department: zone.department || '69', daysBack: 30 },
            { headers: vpsHeaders(secret), timeout: 30000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] SITADEL:`, e.message); }
      }

      // RSS sources multiples
      const rssSources = ['boamp', 'batiactu', 'indeed_fr', 'fusac', 'decideurs'];
      for (const sourceId of rssSources) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-rss`,
            { sourceId, daysBack: 3 },
            { headers: vpsHeaders(secret), timeout: 15000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] RSS ${sourceId}:`, e.message); }
      }
    }

    // COUCHE 2 — Web ouvert
    if (layers.includes('web')) {
      for (const alertUrl of (config.googleAlertsUrls || [])) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-google-alerts`,
            { rssUrl: alertUrl, daysBack: 1 },
            { headers: vpsHeaders(secret), timeout: 15000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] GoogleAlerts:`, e.message); }
      }
    }

    // COUCHE 3 — Reseaux sociaux (Hunter+) — Playwright queue
    if (layers.includes('social') && keywords.length > 0) {
      // LinkedIn Feed
      try {
        const r = await axios.post(`${VPS_URL}/social/scan-linkedin-feed`,
          { orgId, keywords },
          { headers: vpsHeaders(secret), timeout: 120000 }
        );
        signals.push(...(r.data.signals || []));
      } catch (e) { console.warn(`[${orgId}] LinkedIn:`, e.message); }

      // Facebook Groupes
      for (const group of (config.facebookGroups || []).slice(0, 3)) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-facebook-group`,
            { orgId, groupUrl: group.url, keywords, maxPosts: 20 },
            { headers: vpsHeaders(secret), timeout: 120000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] FB group:`, e.message); }
      }
    }

    // COUCHE 3b — Telegram (Hunter+)
    if (layers.includes('messaging')) {
      for (const group of (config.telegramGroups || []).slice(0, 5)) {
        try {
          const r = await axios.post(`${VPS_URL}/social/scan-telegram`,
            { groupUsername: group.username, keywords, limit: 100 },
            { headers: vpsHeaders(secret), timeout: 30000 }
          );
          signals.push(...(r.data.signals || []));
        } catch (e) { console.warn(`[${orgId}] Telegram:`, e.message); }
      }
    }

    // Traitement et sauvegarde des signaux
    const newCount = await processSocialSignals(orgId, signals);

    // Mise a jour statut scan
    await getDb().collection('organizations').doc(orgId).update({
      'socialOmniscient.lastScan': FieldValue.serverTimestamp(),
      'socialOmniscient.lastSignalsCount': signals.length,
      'socialOmniscient.lastNewSignals': newCount,
    });

    console.log(`[ScanSingleOrg] ${orgId}: ${signals.length} signaux, ${newCount} nouveaux`);
  }
);

function getPlanLayers(plan) {
  const map = {
    'radar':      ['official', 'web'],
    'hunter':     ['official', 'web', 'social', 'messaging'],
    'omniscient': ['official', 'web', 'social', 'messaging', 'predictive'],
    'war_room':   ['official', 'web', 'social', 'messaging', 'predictive', 'collective'],
  };
  return map[plan] || map['radar'];
}

async function processSocialSignals(orgId, signals) {
  if (signals.length === 0) return 0;
  const db = getDb();

  // Batch read dedup keys existants
  const existingSnap = await db.collection('socialSignals')
    .where('orgId', '==', orgId)
    .select('dedupKey')
    .limit(2000)
    .get();
  const existingKeys = new Set(existingSnap.docs.map(d => d.data().dedupKey).filter(Boolean));

  let newCount = 0;
  const highValueSignals = [];
  const toInsert = [];

  for (const signal of signals) {
    const dedupKey = signal.dedup_key || `${signal.source}_${JSON.stringify(signal).slice(0, 64)}`;

    if (existingKeys.has(dedupKey)) continue;
    existingKeys.add(dedupKey);

    const ref = db.collection('socialSignals').doc();
    toInsert.push({ ref, signal, dedupKey });

    newCount++;
    if ((signal.intent_score || 0) >= 70) {
      highValueSignals.push({ ...signal, id: ref.id });
    }
  }

  // Firestore batch max 500
  const CHUNK_SIZE = 499;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const { ref, signal, dedupKey } of chunk) {
      batch.set(ref, {
        ...signal,
        id: ref.id,
        orgId,
        dedupKey,
        status: 'new',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // Cree des leads pour les signaux chauds
  for (const signal of highValueSignals) {
    await createSocialLead(orgId, signal);
  }

  return newCount;
}

async function createSocialLead(orgId, signal) {
  const ref = getDb().collection('socialLeads').doc();
  await ref.set({
    orgId,
    signalId: signal.id,
    source: signal.source,
    contactName: signal.author || signal.denomination || signal.entreprise || '',
    contactUrl: signal.author_url || signal.post_url || signal.telegram_link || '',
    contactUsername: signal.author_username || null,
    siren: signal.siren || null,
    matchedKeywords: signal.matched_keywords || [],
    intentScore: signal.intent_score || 50,
    signalText: (signal.text || signal.title || '').slice(0, 500),
    status: 'pending_first_action',
    sequence: {
      step: 0,
      nextActionAt: Timestamp.fromDate(new Date(Date.now() + 60 * 1000)),
      completedSteps: [],
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}
