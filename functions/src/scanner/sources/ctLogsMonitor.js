/**
 * ctLogsMonitor.js — crt.sh Certificate Transparency Logs
 * Scheduler quotidien 3h — detecte nouveaux domaines .fr
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export const monitorCTLogs = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    console.log('[CTLogs] Scanning nouveaux domaines .fr...');

    const keywords = [
      'restaurant', 'boulangerie', 'coiffeur', 'plombier', 'artisan',
      'garage', 'pizzeria', 'brasserie', 'traiteur', 'fleuriste',
      'dentiste', 'avocat', 'architecte', 'electricien', 'menuisier',
    ];

    const allNewDomains = [];

    for (const keyword of keywords) {
      try {
        const url = `https://crt.sh/?q=%25${keyword}%25.fr&output=json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) continue;

        const certs = await response.json();
        const recentCerts = certs.filter(cert => {
          const entryDate = new Date(cert.entry_timestamp);
          return (Date.now() - entryDate.getTime()) < 48 * 60 * 60 * 1000;
        });

        for (const cert of recentCerts) {
          const domain = cert.common_name.replace('*.', '');
          if (domain.endsWith('.fr') && !domain.includes('*')) {
            allNewDomains.push({
              domain,
              keyword,
              issuedAt: cert.entry_timestamp,
              issuer: cert.issuer_name,
            });
          }
        }
        await sleep(1000);
      } catch (error) {
        console.warn(`[CTLogs] Erreur keyword ${keyword}:`, error.message);
      }
    }

    const uniqueDomains = [...new Map(allNewDomains.map(d => [d.domain, d])).values()];
    console.log(`[CTLogs] ${uniqueDomains.length} nouveaux domaines .fr detectes`);

    const db = getDb();
    const CHUNK = 499;
    for (let i = 0; i < uniqueDomains.length; i += CHUNK) {
      const chunk = uniqueDomains.slice(i, i + CHUNK);
      const batch = db.batch();
      for (const entry of chunk) {
        const ref = db.collection('scanSignals').doc();
        batch.set(ref, {
          type: 'new_domain',
          source: 'ctLogsMonitor',
          rawData: entry,
          score: 25,
          status: 'new',
          message: `Nouveau domaine detecte : ${entry.domain} (mot-cle: ${entry.keyword})`,
          actionable: true,
          detectedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    console.log(`[CTLogs] ${uniqueDomains.length} signaux sauvegardes`);
  }
);
