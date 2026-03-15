/**
 * monitorExecutor.js — Execute les 12 monitors Alex via Serper
 * Chaque monitor = 1-2 queries Serper adaptees au type de veille.
 * Resultats sauvegardes dans alexMemory pour diff et suivi.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { logAlexActivity } from '../../utils/logAlexActivity.js';

const getDb = () => getFirestore();

// ============================================
// CONFIGS DES 12 MONITORS
// ============================================
const MONITOR_CONFIGS = {
  serper_hunt: {
    label: 'Chasse Serper',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" email site:linkedin.com`,
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" contact "@"`,
    ],
    maxQueries: 2,
  },
  google_reviews_monitor: {
    label: 'Avis Google negatifs',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" avis google 1 etoile`,
    ],
    maxQueries: 1,
  },
  google_business_scan: {
    label: 'Google Business',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" near "${bp.location || ''}" site:google.com/maps`,
    ],
    maxQueries: 1,
  },
  social_scan: {
    label: 'Reseaux sociaux',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" site:instagram.com OR site:facebook.com OR site:linkedin.com`,
    ],
    maxQueries: 1,
  },
  france_travail_monitor: {
    label: 'France Travail',
    buildQueries: (bp) => [
      `site:francetravail.fr "${bp.targetAudience || bp.activity}" "${bp.location || ''}"`,
    ],
    maxQueries: 1,
  },
  bodacc_monitor: {
    label: 'BODACC creations',
    buildQueries: (bp) => [
      `site:bodacc.fr "${bp.targetAudience || bp.activity}" creation`,
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" immatriculation`,
    ],
    maxQueries: 2,
  },
  leboncoin_monitor: {
    label: 'LeBonCoin pro',
    buildQueries: (bp) => [
      `site:leboncoin.fr "${bp.targetAudience || bp.activity}" "${bp.location || ''}" pro`,
    ],
    maxQueries: 1,
  },
  forums_scan: {
    label: 'Forums & demandes',
    buildQueries: (bp) => {
      const pain = bp.painPoints?.[0] || bp.activity || '';
      return [
        `"${bp.targetAudience || bp.activity}" forum "${pain}" OR "cherche prestataire"`,
      ];
    },
    maxQueries: 1,
  },
  financial_scan: {
    label: 'Donnees financieres',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" site:societe.com OR site:pappers.fr`,
    ],
    maxQueries: 1,
  },
  email_infra_scan: {
    label: 'Scan emails',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" "@" contact email`,
    ],
    maxQueries: 1,
  },
  subventions_monitor: {
    label: 'Subventions & aides',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" subvention aide "${bp.location || ''}" 2025 2026`,
    ],
    maxQueries: 1,
  },
  ct_logs_monitor: {
    label: 'Nouveaux sites',
    buildQueries: (bp) => [
      `"${bp.targetAudience || bp.activity}" "${bp.location || ''}" nouveau site web lancement`,
    ],
    maxQueries: 1,
  },
};

// ============================================
// EXTRACTION HELPERS (mirrored from searchOrchestrator)
// ============================================
function extractPhoneFromSnippet(snippet) {
  if (!snippet) return null;
  const match = snippet.match(/0[1-9](?:[\s.\-]?\d{2}){4}/);
  return match ? match[0].replace(/[\s.\-]/g, '') : null;
}

function extractEmailFromSnippet(snippet) {
  if (!snippet) return null;
  const match = snippet.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  return match ? match[0] : null;
}

function extractSiretFromSnippet(snippet) {
  if (!snippet) return null;
  const siret = snippet.match(/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/);
  if (siret) return siret[0].replace(/\s/g, '');
  const siren = snippet.match(/(?:SIREN|siren|RCS)\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/);
  return siren ? siren[1].replace(/\s/g, '') : null;
}

function extractRevenueFromSnippet(snippet) {
  if (!snippet) return null;
  const mMatch = snippet.match(/(?:CA|chiffre.{0,15}affaires?)\s*(?:de|:)?\s*([\d,.]+)\s*(?:M|millions?)/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1].replace(',', '.')) * 1_000_000);
  const kMatch = snippet.match(/(?:CA|chiffre.{0,15}affaires?)\s*(?:de|:)?\s*([\d,.]+)\s*(?:k|K|milliers?)/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
  return null;
}

function extractDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ============================================
// EXECUTE MONITOR
// ============================================
export async function executeMonitor(type, orgId, params = {}) {
  const config = MONITOR_CONFIGS[type];
  if (!config) {
    return { type, status: 'error', error: `Monitor inconnu: ${type}` };
  }

  const db = getDb();

  // 1. Charger le profil business
  const profileDoc = await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get();
  const businessProfile = profileDoc.exists ? profileDoc.data() : {};

  // Surcharger avec les params de l'action si fournis
  const bp = {
    ...businessProfile,
    ...(params.zone ? { location: params.zone } : {}),
    ...(params.niche ? { targetAudience: params.niche } : {}),
    ...(params.activity ? { activity: params.activity } : {}),
  };

  if (!bp.targetAudience && !bp.activity) {
    return { type, status: 'error', error: 'Profil business incomplet (pas de targetAudience ni activity)' };
  }

  // 2. Construire les queries Serper
  const queries = config.buildQueries(bp).slice(0, config.maxQueries);

  // 3. Executer les recherches Serper
  const { searchProspects } = await import('../../scraping/googleCSE.js');

  const allResults = [];
  for (const query of queries) {
    try {
      console.log(`[Monitor ${type}] Serper: "${query}"`);
      const found = await searchProspects(query, {
        maxResults: 10,
        orgId,
        useCache: true,
        gl: 'fr',
        hl: 'fr',
      });
      allResults.push(...found);
    } catch (err) {
      console.warn(`[Monitor ${type}] Erreur query "${query}":`, err.message);
    }
  }

  // 4. Extraire les donnees et dedup par domaine
  const seenDomains = new Set();
  const prospects = [];

  for (const r of allResults) {
    const domain = extractDomainFromUrl(r.link || r.url);
    if (domain && seenDomains.has(domain)) continue;
    if (domain) seenDomains.add(domain);

    const snippet = r.snippet || r.description || '';
    prospects.push({
      title: r.title || '',
      url: r.link || r.url || '',
      domain,
      snippet: snippet.slice(0, 300),
      phone: extractPhoneFromSnippet(snippet),
      email: extractEmailFromSnippet(snippet),
      siret: extractSiretFromSnippet(snippet),
      revenue: extractRevenueFromSnippet(snippet),
      source: type,
    });
  }

  // 5. Charger les resultats precedents pour calculer les new discoveries
  const previousDoc = await db.doc(`organizations/${orgId}/alexMemory/${type}Results`).get();
  const previousDomains = new Set(previousDoc.exists ? (previousDoc.data().domains || []) : []);
  const newDiscoveries = prospects.filter(p => p.domain && !previousDomains.has(p.domain));

  // 6. Sauvegarder les resultats
  const allDomains = [...new Set([...previousDomains, ...prospects.map(p => p.domain).filter(Boolean)])];
  await db.doc(`organizations/${orgId}/alexMemory/${type}Results`).set({
    lastRun: new Date(),
    count: prospects.length,
    newCount: newDiscoveries.length,
    domains: allDomains.slice(0, 500),
    results: prospects.slice(0, 50),
  });

  // 7. Maintenir le flag activeStrategy
  await db.doc(`organizations/${orgId}/alexMemory/activeStrategy`).set({
    [`${type}Active`]: true,
    [`${type}LastRun`]: new Date(),
    [`${type}Params`]: params,
  }, { merge: true });

  const withEmail = prospects.filter(p => p.email).length;
  const withPhone = prospects.filter(p => p.phone).length;

  console.log(`[Monitor ${type}] ${prospects.length} resultats, ${newDiscoveries.length} nouveaux, ${withEmail} emails, ${withPhone} tel`);

  logAlexActivity(orgId, {
    type: 'monitor',
    title: `Monitor ${config.label} — ${newDiscoveries.length} nouvelles decouvertes`,
    details: `${prospects.length} resultats total, ${withEmail} emails, ${withPhone} telephones. Domaines cumules: ${allDomains.length}`,
    status: 'success',
  });

  return {
    type,
    status: 'executed',
    label: config.label,
    count: prospects.length,
    newDiscoveries: newDiscoveries.length,
    highlights: prospects.slice(0, 5).map(p => p.title),
    withEmail,
    withPhone,
  };
}
