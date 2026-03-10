/**
 * franceTravailMonitor.js — API France Travail offres d'emploi
 * Scheduler quotidien 7h — detecte recrutements marketing/digital
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const HIRING_KEYWORDS = [
  'marketing digital', 'community manager', 'social media',
  'webmaster', 'chef de projet digital', 'communication digitale',
  'SEO', 'SEA', 'growth', 'e-commerce', 'commercial terrain',
  'responsable communication', 'charge de communication',
];

export const monitorFranceTravail = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    console.log('[FranceTravail] Scanning offres marketing/digital...');

    const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
    const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('[FranceTravail] Credentials manquants, skip');
      return;
    }

    let accessToken;
    try {
      const tokenResp = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=api_offresdemploiv2 o2dsoffre`,
        signal: AbortSignal.timeout(10000),
      });
      const tokenData = await tokenResp.json();
      accessToken = tokenData.access_token;
    } catch (error) {
      console.error('[FranceTravail] Auth failed:', error.message);
      return;
    }

    const db = getDb();
    const signals = [];

    for (const keyword of HIRING_KEYWORDS) {
      try {
        const params = new URLSearchParams({
          motsCles: keyword,
          minCreationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
          range: '0-49',
        });

        const resp = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });

        if (!resp.ok) continue;
        const data = await resp.json();
        const offres = data.resultats || [];

        for (const offre of offres) {
          const entreprise = offre.entreprise?.nom || null;
          if (!entreprise) continue;

          signals.push({
            type: keyword.includes('commercial') ? 'hiring_commercial' : 'hiring_marketing',
            source: 'franceTravailMonitor',
            rawData: {
              offreId: offre.id,
              intitule: offre.intitule,
              entreprise,
              lieuTravail: offre.lieuTravail?.libelle,
              codePostal: offre.lieuTravail?.codePostal,
              dateCreation: offre.dateCreation,
              keyword,
            },
            score: keyword.includes('commercial') ? 25 : 35,
            status: 'new',
            message: `${entreprise} recrute : ${offre.intitule}`,
            actionable: true,
          });
        }
      } catch (error) {
        console.warn(`[FranceTravail] Erreur keyword ${keyword}:`, error.message);
      }
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

    console.log(`[FranceTravail] ${signals.length} signaux sauvegardes`);
  }
);
