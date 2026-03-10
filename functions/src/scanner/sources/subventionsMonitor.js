/**
 * subventionsMonitor.js — data.gouv.fr aides aux entreprises
 * Scheduler hebdomadaire lundi 6h
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export const monitorSubventions = onSchedule(
  {
    schedule: '0 6 * * 1',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    console.log('[Subventions] Scanning aides entreprises...');

    const DIGITAL_AIDS_KEYWORDS = [
      'numerique', 'digital', 'site web', 'e-commerce',
      'transformation digitale', 'transition numerique',
    ];

    const signals = [];

    try {
      const resp = await fetch(
        'https://aides-territoires.beta.gouv.fr/api/aids/?is_live=true&targeted_audiences=private_sector&page_size=50&ordering=-date_created',
        { signal: AbortSignal.timeout(15000) }
      );

      if (!resp.ok) {
        console.warn('[Subventions] API response not ok:', resp.status);
        return;
      }

      const data = await resp.json();
      const aids = data.results || [];

      for (const aid of aids) {
        const isDigital = DIGITAL_AIDS_KEYWORDS.some(kw =>
          (aid.name || '').toLowerCase().includes(kw) ||
          (aid.description || '').toLowerCase().includes(kw)
        );

        if (!isDigital) continue;

        signals.push({
          type: 'received_subsidy',
          source: 'subventionsMonitor',
          rawData: {
            aidId: aid.id,
            name: aid.name,
            url: aid.url,
            perimeter: aid.perimeter?.name,
            submissionDeadline: aid.submission_deadline,
            dateCreated: aid.date_created,
          },
          score: 30,
          status: 'new',
          message: `Aide digitale disponible : ${aid.name}`,
          actionable: true,
        });
      }
    } catch (error) {
      console.error('[Subventions] Error:', error.message);
    }

    if (signals.length === 0) return;

    const db = getDb();
    const batch = db.batch();
    for (const signal of signals.slice(0, 499)) {
      const ref = db.collection('scanSignals').doc();
      batch.set(ref, { ...signal, detectedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();

    console.log(`[Subventions] ${signals.length} aides digitales detectees`);
  }
);
