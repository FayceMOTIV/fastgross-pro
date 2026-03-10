/**
 * scanTaskQueue.js — Cloud Tasks queue pour scans distribues
 * Gere l'enqueue de scans prospect et le worker qui les traite
 */
import { CloudTasksClient } from '@google-cloud/tasks';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { checkTenantQuota } from './tenantQuotas.js';

const getDb = () => getFirestore();
const PROJECT_ID = 'face-media-factory';
const LOCATION = 'europe-west1';
const QUEUE_NAME = 'prospect-scans';

/**
 * Callable : l'user demande un scan batch -> on enqueue dans Cloud Tasks
 */
export const enqueueScan = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    const { prospects, organizationId } = request.data;
    const uid = request.auth?.uid;
    if (!uid || !organizationId) {
      throw new HttpsError('unauthenticated', 'Auth requis');
    }

    if (!Array.isArray(prospects) || prospects.length === 0) {
      throw new HttpsError('invalid-argument', 'prospects doit etre un tableau non vide');
    }

    const db = getDb();

    // Verifier le quota du tenant
    const quota = await checkTenantQuota(organizationId);
    if (prospects.length > quota.remainingScans) {
      throw new HttpsError(
        'resource-exhausted',
        `Quota depasse : ${quota.remainingScans} scans restants ce mois`
      );
    }

    // Enqueue chaque prospect dans Cloud Tasks
    const client = new CloudTasksClient();
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

    const tasks = [];
    for (let i = 0; i < prospects.length; i++) {
      const prospect = prospects[i];

      // Verifier le cache : pas de re-scan si < 7 jours
      const cached = await db
        .collection('scanResults')
        .where('domain', '==', prospect.domain)
        .where('organizationId', '==', organizationId)
        .where('scannedAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .limit(1)
        .get();

      if (!cached.empty) {
        tasks.push({ prospectId: prospect.id, status: 'cached', scanResultId: cached.docs[0].id });
        continue;
      }

      // Creer la tache avec un delai progressif (eviter les bursts)
      const delaySeconds = i * 2;
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: `https://europe-west1-${PROJECT_ID}.cloudfunctions.net/processScanTask`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(
            JSON.stringify({
              prospectId: prospect.id,
              domain: prospect.domain,
              organizationId,
              userId: uid,
            })
          ).toString('base64'),
          oidcToken: {
            serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
          },
        },
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + delaySeconds,
        },
      };

      await client.createTask({ parent, task });
      tasks.push({ prospectId: prospect.id, status: 'queued', delay: delaySeconds });
    }

    // Incrementer le compteur de scans du tenant
    await db
      .collection('tenantQuotas')
      .doc(organizationId)
      .set({ scansUsedThisMonth: FieldValue.increment(prospects.length) }, { merge: true });

    return { queued: tasks.length, tasks };
  }
);

/**
 * Worker HTTP : traite un scan individuel (appele par Cloud Tasks)
 */
export const processScanTask = onRequest(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 120,
    maxInstances: 50,
    concurrency: 20,
  },
  async (req, res) => {
    const { prospectId, domain, organizationId, userId } = req.body;

    if (!domain || !organizationId) {
      res.status(400).json({ error: 'domain et organizationId requis' });
      return;
    }

    try {
      const { runScanInternal } = await import('../scanOrchestrator.js');
      await runScanInternal({ prospectId, domain, organizationId });

      // Notifier le user que le scan est termine
      const db = getDb();
      await db.collection('scanNotifications').add({
        organizationId,
        userId,
        prospectId,
        domain,
        status: 'completed',
        completedAt: new Date(),
      });

      res.status(200).json({ status: 'completed', domain });
    } catch (error) {
      console.error(`[ScanTask] Erreur scan ${domain}:`, error.message);
      res.status(500).json({ error: error.message });
    }
  }
);
