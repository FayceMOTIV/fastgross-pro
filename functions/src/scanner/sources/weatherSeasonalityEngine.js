/**
 * weatherSeasonalityEngine.js — Meteo + saisonnalite par secteur NAF
 * Scheduler quotidien 6h
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const SEASONAL_RULES = {
  '56.10A': { name: 'Restaurant', peaks: [3, 4, 5, 6, 9, 10], signal: 'Saison haute restauration' },
  '56.30Z': { name: 'Bar/Debit de boissons', peaks: [5, 6, 7, 8], signal: 'Saison terrasse' },
  '47.71Z': { name: 'Pret-a-porter', peaks: [1, 6, 9, 11], signal: 'Saison soldes/collections' },
  '55.10Z': { name: 'Hotel', peaks: [4, 5, 6, 7, 8, 9], signal: 'Haute saison touristique' },
  '93.13Z': { name: 'Salle de sport', peaks: [1, 9], signal: 'Rentree/bonnes resolutions' },
  '96.02A': { name: 'Coiffure', peaks: [5, 6, 11, 12], signal: 'Saison mariages/fetes' },
  '43.21A': { name: 'Electricite', peaks: [3, 4, 9, 10], signal: 'Saison travaux' },
  '43.22A': { name: 'Plomberie', peaks: [9, 10, 11], signal: 'Preparation hiver' },
  '81.30Z': { name: 'Paysagiste', peaks: [3, 4, 5, 9], signal: 'Saison jardinage' },
  '10.71C': { name: 'Boulangerie', peaks: [1, 6, 12], signal: 'Fetes/Epiphanie/Galette' },
};

export const checkWeatherSeasonality = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const currentMonth = new Date().getMonth() + 1;
    console.log(`[Weather] Checking saisonnalite mois ${currentMonth}...`);

    const db = getDb();
    const signals = [];

    for (const [nafCode, rule] of Object.entries(SEASONAL_RULES)) {
      if (rule.peaks.includes(currentMonth)) {
        const prospectsSnap = await db.collection('scanResults')
          .where('prospect.codeNaf', '==', nafCode)
          .limit(100)
          .get();

        for (const doc of prospectsSnap.docs) {
          const data = doc.data();
          signals.push({
            type: 'seasonal_opportunity',
            source: 'weatherSeasonalityEngine',
            prospectId: data.prospectId || doc.id,
            organizationId: data.organizationId,
            rawData: { nafCode, nafName: rule.name, month: currentMonth },
            score: 15,
            status: 'new',
            message: `${rule.signal} — ${rule.name} (NAF ${nafCode})`,
            actionable: true,
          });
        }
      }
    }

    if (signals.length === 0) {
      console.log('[Weather] Aucune opportunite saisonniere ce mois');
      return;
    }

    const CHUNK = 499;
    for (let i = 0; i < signals.length; i += CHUNK) {
      const chunk = signals.slice(i, i + CHUNK);
      const batch = db.batch();
      for (const signal of chunk) {
        const ref = db.collection('scanSignals').doc();
        batch.set(ref, { ...signal, detectedAt: FieldValue.serverTimestamp() });
      }
      await batch.commit();
    }

    console.log(`[Weather] ${signals.length} opportunites saisonnieres detectees`);
  }
);
