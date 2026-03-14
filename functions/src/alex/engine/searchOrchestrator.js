/**
 * searchOrchestrator.js — L'orchestrateur de recherche principal
 * C'est le fichier qui ORCHESTRE tout. Quand Alex decide de chercher des prospects,
 * c'est ce module qui est appele.
 *
 * 1. Charge le profil business du user
 * 2. Demande au nicheReasoner un plan de recherche adapte
 * 3. Selectionne les 3-5 meilleures sources
 * 4. Lance les recherches en parallele
 * 5. Agrege les resultats
 * 6. Pour chaque prospect : scanne le site + correle les signaux + qualifie
 * 7. Applique le scoring adaptatif (poids appris des resultats passes)
 * 8. Trie par score et retourne les TOP prospects
 */
import { buildSearchPlan } from './nicheReasoner.js';
import { selectSources } from './smartSourceSelector.js';
import { correlateSignals } from './signalCorrelator.js';
import { qualifyProspect } from './prospectQualifier.js';
import { applyLearnedWeights } from './adaptiveScorer.js';
import { getSourceById, buildSerperQuery } from './sourceRegistry.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export async function intelligentProspectSearch(organizationId, objective, options = {}) {
  const db = getDb();
  const maxResults = options.maxResults || 15;
  const missionCriteria = options.criteria || null;

  console.log(`[Reacteur] Recherche intelligente lancee pour org ${organizationId}: "${objective}"`);
  if (missionCriteria) {
    console.log(`[Reacteur] Criteres precis actives:`, JSON.stringify(missionCriteria));
  }

  // 1. Charger le profil business
  const profileDoc = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
  const businessProfile = profileDoc.exists ? profileDoc.data() : {};

  // 2. Construire le plan de recherche adapte a la niche
  let searchPlan = null;
  try {
    searchPlan = await buildSearchPlan(businessProfile, objective);

    // Sauvegarder le plan pour reference
    await db.doc(`organizations/${organizationId}/alexMemory/lastSearchPlan`).set({
      ...searchPlan,
      objective,
      criteria: missionCriteria || null,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.warn('[Reacteur] nicheReasoner failed, using defaults:', error.message);
  }

  // 3. Selectionner les sources optimales
  const nicheType = detectNicheType(businessProfile);
  let selectedSources = selectSources(nicheType, searchPlan);

  // Booster les sources financieres si criteres financiers presents
  if (missionCriteria && hasFinancialCriteria(missionCriteria)) {
    selectedSources = boostFinancialSources(selectedSources);
    console.log(`[Reacteur] Sources financieres boostees (CA/effectif requis)`);
  }

  console.log(`[Reacteur] Sources selectionnees: ${selectedSources.map(s => s.source).join(', ')}`);

  // 4. Lancer les recherches en parallele (avec quota Serper)
  const maxSerperQueries = options.maxSerperQueries || 20;
  const serperQuota = { used: 0, max: maxSerperQueries };

  const searchResults = await Promise.allSettled(
    selectedSources.map(source =>
      executeSourceSearch(source, businessProfile, searchPlan, organizationId, serperQuota)
    )
  );

  console.log(`[Reacteur] Quota Serper: ${serperQuota.used}/${serperQuota.max} requetes utilisees`);

  // 5. Agreger tous les prospects trouves
  let allProspects = [];
  for (const result of searchResults) {
    if (result.status === 'fulfilled' && result.value) {
      allProspects.push(...result.value);
    }
  }

  // Dedupliquer par SIRET ou domaine
  allProspects = deduplicateProspects(allProspects);

  console.log(`[Reacteur] ${allProspects.length} prospects uniques trouves, en cours de qualification...`);

  // 6. Pour chaque prospect : scanner + correler + qualifier
  // Qualifier assez de candidats pour remplir maxResults (ratio ~60% passent le filtre)
  const qualifyLimit = Math.min(Math.ceil(maxResults * 1.8), 50);
  const toQualify = allProspects.slice(0, qualifyLimit);

  const qualifiedProspects = [];
  for (const prospect of toQualify) {
    try {
      // Scanner le site du prospect (si pas deja fait)
      let scanResult = null;
      if (prospect.website) {
        try {
          const { runScanInternal } = await import('../../scanner/scanOrchestrator.js');
          const result = await runScanInternal({
            domain: prospect.website,
            organizationId,
          });
          scanResult = result;
        } catch {
          // Scanner peut echouer, pas critique
        }
      }

      // Correler les signaux
      const signals = [
        ...(prospect.signals || []),
        ...(scanResult?.signals || []),
      ];

      // Appliquer les poids appris
      const weightedSignals = await applyLearnedWeights(organizationId, signals);

      // Calculer le score correle
      const correlation = correlateSignals(weightedSignals, searchPlan);

      // Qualifier (BANT + criteres mission)
      let qualification = null;
      if (correlation.totalScore >= 30) {
        qualification = await qualifyProspect(prospect, businessProfile, scanResult, searchPlan, missionCriteria);
      }

      qualifiedProspects.push({
        ...prospect,
        signals: weightedSignals,
        scanResult: scanResult ? {
          totalSignalScore: scanResult.totalSignalScore,
          priority: scanResult.priority,
          diagnosticSummary: scanResult.diagnosticSummary,
        } : null,
        correlation,
        qualification,
        finalScore: qualification ? qualification.totalScore : correlation.totalScore,
        recommendation: qualification?.recommendation ||
          (correlation.totalScore >= 60 ? 'contact_now' :
           correlation.totalScore >= 30 ? 'nurture' : 'skip'),
        suggestedMessage: qualification?.suggestedMessage || null,
      });
    } catch (error) {
      console.warn(`[Reacteur] Erreur qualification prospect ${prospect.companyName}:`, error.message);
      qualifiedProspects.push({ ...prospect, finalScore: 0, recommendation: 'skip' });
    }
  }

  // 7. Trier par score final
  qualifiedProspects.sort((a, b) => b.finalScore - a.finalScore);

  // 8. Sauvegarder les TOP prospects dans Firestore
  const topProspects = qualifiedProspects
    .filter(p => p.recommendation !== 'skip')
    .slice(0, maxResults);

  // Batch save (max 499)
  const CHUNK = 499;
  for (let i = 0; i < topProspects.length; i += CHUNK) {
    const chunk = topProspects.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const prospect of chunk) {
      const ref = db.collection(`organizations/${organizationId}/prospects`).doc();

      // Deriver scoreCategory depuis finalScore (attendu par le frontend)
      const score = prospect.finalScore || 0;
      const scoreCategory = score >= 70 ? 'hot' : score >= 50 ? 'warm' : score >= 30 ? 'cold' : 'ice';

      // Splitter contactName en firstName + lastName (attendu par le frontend)
      const nameParts = (prospect.contactName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Determiner channels disponibles
      const channels = [];
      if (prospect.email) channels.push('email');
      if (prospect.phone) channels.push('sms', 'whatsapp');

      batch.set(ref, {
        // Champs attendus par le frontend (Prospects.jsx + useFirestore.js)
        company: prospect.companyName || null,
        firstName,
        lastName,
        email: prospect.email || null,
        phone: prospect.phone || null,
        website: prospect.website || null,
        city: prospect.city || null,
        industry: prospect.sector || null,
        score,
        scoreCategory,
        channels,
        status: 'new',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),

        // Champs supplementaires Alex
        companyName: prospect.companyName || null,
        contactName: prospect.contactName || null,
        codePostal: prospect.codePostal || null,
        sector: prospect.sector || null,
        siret: prospect.siret || null,
        codeNaf: prospect.codeNaf || null,
        effectif: prospect.effectif || null,
        finalScore: score,
        recommendation: prospect.recommendation,
        suggestedMessage: prospect.suggestedMessage || null,
        correlation: prospect.correlation ? JSON.parse(JSON.stringify(prospect.correlation)) : null,
        qualification: prospect.qualification ? JSON.parse(JSON.stringify(prospect.qualification)) : null,
        foundByAlex: true,
        source: 'reacteur_nucleaire',
      });
    }
    await batch.commit();
  }

  console.log(`[Reacteur] ${topProspects.length} prospects qualifies sauvegardes`);

  return {
    totalFound: allProspects.length,
    qualified: topProspects.length,
    topProspects: topProspects.map(p => ({
      companyName: p.companyName,
      contactName: p.contactName,
      finalScore: p.finalScore,
      recommendation: p.recommendation,
      signals: p.signals?.length || 0,
      suggestedMessage: p.suggestedMessage,
    })),
    searchPlan: {
      sourcesUsed: selectedSources.map(s => s.source),
      nicheType,
    },
  };
}

/**
 * Detecte si les criteres de mission incluent des filtres financiers
 */
function hasFinancialCriteria(criteria) {
  return !!(criteria.minRevenue || criteria.maxRevenue || criteria.minEmployees || criteria.maxEmployees || criteria.legalForms?.length);
}

/**
 * Booste les sources qui contiennent des donnees financieres
 * (Pappers, Societe.com, Infogreffe, SIRENE, BODACC)
 */
function boostFinancialSources(sources) {
  const financialSourceIds = new Set([
    'pappers_financial', 'societe_com', 'infogreffe', 'sirene_search',
    'bodacc', 'societe_bilans', 'inpi_rcs', 'kompass',
  ]);

  // Ajouter les sources financieres manquantes
  const existingIds = new Set(sources.map(s => s.source));
  const toAdd = [];
  for (const id of financialSourceIds) {
    if (!existingIds.has(id)) {
      toAdd.push({ source: id, score: 9, reason: 'Criteres financiers actifs — source boostee' });
    }
  }

  // Booster le score des sources financieres existantes
  const boosted = sources.map(s => {
    if (financialSourceIds.has(s.source)) {
      return { ...s, score: Math.min((s.score || 5) + 3, 10) };
    }
    return s;
  });

  // Fusionner et retrier
  const all = [...boosted, ...toAdd];
  all.sort((a, b) => (b.score || 0) - (a.score || 0));

  return all;
}

function detectNicheType(profile) {
  const activity = (profile.activity || '').toLowerCase();

  // 16 niches — ordre: du plus specifique au plus generique
  if (/courtage.{0,5}energie|fournisseur.{0,5}energie|electricite|gaz naturel|photovoltaique|panneau solaire|borne.{0,5}recharge/.test(activity)) return 'energie';
  if (/medecin|dentiste|kine|osteo|pharmacie|labo|clinique|opticien|infirmier|sage.femme|orthophoniste|psychologue/.test(activity)) return 'sante';
  if (/restaurant|brasserie|pizzeria|traiteur|snack|fast.food|boulangerie|patisserie|glacier|cafe|bar|bistrot/.test(activity)) return 'restauration';
  if (/constructeur|promoteur|renovation|batiment|gros.oeuvre|demolition|terrassement|beton|charpente/.test(activity)) return 'btp_construction';
  if (/avocat|notaire|huissier|expert.comptable|commissaire|juridique|cabinet.conseil|audit/.test(activity)) return 'juridique';
  if (/courtier|courtage|assurance|mutuelle|credit|banque|cgp|patrimoine|gestion.actifs/.test(activity)) return 'finance_assurance';
  if (/franchise|reseau|master.franchise|multi.site|enseigne/.test(activity)) return 'franchise';
  if (/agricul|elevage|viticul|maraich|exploitation|cooperative|agro|semence/.test(activity)) return 'agriculture';
  if (/hotel|camping|gite|location vacances|tourisme|chambres? d.hotes|village.vacances/.test(activity)) return 'tourisme';
  if (/transport|logistique|demenagement|livraison|coursier|fret|messagerie/.test(activity)) return 'transport_logistique';
  if (/plombier|electricien|menuisier|macon|peintre|couvreur|chauffagiste|serrurier|carreleur/.test(activity)) return 'artisan';
  if (/immobilier|agence immo|gestion locative|syndic|promotion.immobiliere/.test(activity)) return 'immobilier';
  if (/boutique en ligne|e-commerce|vente en ligne|marketplace|dropshipping/.test(activity)) return 'ecommerce';
  if (/agence|consultant|coach|formation|saas|logiciel|startup/.test(activity)) return 'b2b_services';
  if (/coiffeur|estheti|beaute|salon|barbier|ongle|spa/.test(activity)) return 'commerce_local';
  if (/garage|auto|mecani|carrosserie|controle.technique/.test(activity)) return 'commerce_local';

  return 'commerce_local'; // Defaut
}

function deduplicateProspects(prospects) {
  const seen = new Map();

  for (const p of prospects) {
    const key = p.siret || p.website || p.email || `${p.companyName}_${p.codePostal}`;

    if (!seen.has(key)) {
      seen.set(key, p);
    } else {
      // Fusionner les signaux
      const existing = seen.get(key);
      existing.signals = [...(existing.signals || []), ...(p.signals || [])];
      existing.sources = [...new Set([...(existing.sources || []), p.source])];
    }
  }

  return [...seen.values()];
}

/**
 * Construit des requetes Serper adaptees au profil et a la source.
 * Utilise le sourceRegistry pour les sources connues, fallback generique sinon.
 */
function buildSerperQueriesForSource(sourceId, businessProfile, searchPlan, queries) {
  const location = queries?.location || businessProfile.location || '';
  const activity = businessProfile.activity || businessProfile.sector || '';
  const target = businessProfile.targetAudience || activity;

  // Si le searchPlan a des keywords specifiques pour cette source, les utiliser
  if (queries?.keywords?.length) {
    return queries.keywords.map(k => `${k} ${location}`);
  }

  // Chercher la source dans le registre
  const registrySource = getSourceById(sourceId);
  if (registrySource) {
    const query = buildSerperQuery(registrySource, { target, location });
    // Generer une 2eme variante pour diversifier les resultats
    const variant = buildSerperQuery(registrySource, { target: activity, location });
    return query === variant ? [query] : [query, variant];
  }

  // Fallback generique
  return [`${target} ${location} contact`];
}

/**
 * Normalise un resultat Serper vers le format prospect attendu par Firestore
 */
function normalizeSerperResult(r, source) {
  const snippet = r.snippet || '';
  return {
    companyName: r.name || r.title || null,
    contactName: null,
    email: extractEmailFromSnippet(snippet),
    phone: extractPhoneFromSnippet(snippet),
    website: r.url || r.domain ? `https://${r.domain}` : null,
    city: null,
    codePostal: extractPostalFromSnippet(snippet),
    sector: r.sector || null,
    siret: extractSiretFromSnippet(snippet),
    source: `serper_${source}`,
    signals: [{ type: 'web_presence', score: r.relevanceScore || 50 }],
    snippet,
    // Donnees financieres extraites du snippet (Pappers, Societe.com)
    chiffreAffaires: extractRevenueFromSnippet(snippet),
    effectif: extractEffectifFromSnippet(snippet),
    formeJuridique: extractLegalFormFromSnippet(snippet),
    dateCreation: extractDateCreationFromSnippet(snippet),
  };
}

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

function extractPostalFromSnippet(snippet) {
  if (!snippet) return null;
  const match = snippet.match(/\b(0[1-9]|[1-8]\d|9[0-5]|97[1-6])\d{3}\b/);
  return match ? match[0] : null;
}

function extractSiretFromSnippet(snippet) {
  if (!snippet) return null;
  // SIRET = 14 chiffres, SIREN = 9 chiffres
  const siret = snippet.match(/\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/);
  if (siret) return siret[0].replace(/\s/g, '');
  const siren = snippet.match(/(?:SIREN|siren|RCS)\s*:?\s*(\d{3}\s?\d{3}\s?\d{3})/);
  return siren ? siren[1].replace(/\s/g, '') : null;
}

function extractRevenueFromSnippet(snippet) {
  if (!snippet) return null;
  // "CA : 2 500 000 EUR", "chiffre d'affaires : 3,5 M", "CA de 1.2M€"
  const mMatch = snippet.match(/(?:CA|chiffre.{0,15}affaires?)\s*(?:de|:)?\s*([\d,.]+)\s*(?:M|millions?)/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1].replace(',', '.')) * 1_000_000);
  const kMatch = snippet.match(/(?:CA|chiffre.{0,15}affaires?)\s*(?:de|:)?\s*([\d,.]+)\s*(?:k|K|milliers?)/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
  const fullMatch = snippet.match(/(?:CA|chiffre.{0,15}affaires?)\s*(?:de|:)?\s*([\d\s,.]+)\s*(?:EUR|€)/i);
  if (fullMatch) return parseInt(fullMatch[1].replace(/[\s.,]/g, ''), 10) || null;
  return null;
}

function extractEffectifFromSnippet(snippet) {
  if (!snippet) return null;
  // "effectif : 25", "effectif de 15 salaries"
  const effMatch = snippet.match(/effectif\s*(?:de|:)?\s*(\d+)/i);
  if (effMatch) return parseInt(effMatch[1], 10);
  // "25 salaries", "15 salariés", "8 employes", "12 employés"
  const numMatch = snippet.match(/(\d+)\s*(?:salari[eé]?s?|employ[eé]?s?|collaborateurs?)/i);
  if (numMatch) return parseInt(numMatch[1], 10);
  // "entre 20 et 49 salaries"
  const rangeMatch = snippet.match(/(\d+)\s*(?:a|à|-)\s*(\d+)\s*(?:salari|employ|collabor)/i);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2);
  return null;
}

function extractLegalFormFromSnippet(snippet) {
  if (!snippet) return null;
  const match = snippet.match(/\b(SAS|SARL|EURL|SA|SCI|SASU|SNC|SCS|SCOP|Auto.entrepreneur|EI)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function extractDateCreationFromSnippet(snippet) {
  if (!snippet) return null;
  const match = snippet.match(/(?:cre[eé]e?\s+(?:le|en)\s+|creation\s*:\s*)(\d{2}[/.-]\d{2}[/.-]\d{4}|\d{4})/i);
  return match ? match[1] : null;
}

async function executeSourceSearch(source, businessProfile, searchPlan, organizationId, serperQuota = { used: 0, max: 10 }) {
  const sourceId = source.source;
  const queries = source.queries || searchPlan?.optimizedQueries?.[sourceId] || {};

  // Pour website_scan : deja gere dans la qualification
  if (sourceId === 'website_scan') return [];

  // Verifier si un module natif existe dans le registre
  const registrySource = getSourceById(sourceId);
  const nativeModule = registrySource?.nativeModule || null;

  // Essayer le module natif en priorite
  if (nativeModule) {
    try {
      if (sourceId === 'sirene_search') {
        const { searchSirene } = await import('../../sourcing/sireneSearch.js');
        const results = await searchSirene({
          codeNaf: queries.codeNaf || businessProfile.targetNaf,
          location: queries.location || businessProfile.location,
          radius: queries.radius || businessProfile.radius,
        });
        if (results?.length > 0) return results;
      }

      if (sourceId === 'google_maps_scan' || sourceId === 'google_reviews') {
        const { scanGoogleMaps } = await import('../../scanner/sources/googleMapsScanner.js');
        const results = await scanGoogleMaps({
          keywords: queries.keywords || [businessProfile.targetAudience],
          location: queries.location || businessProfile.location,
          radius: queries.radius || businessProfile.radius,
        });
        if (results?.length > 0) return results;
      }
    } catch {
      // Module natif pas disponible → Serper fallback
    }
  }

  // Protection quota Serper
  if (serperQuota.used >= serperQuota.max) {
    console.log(`[Reacteur] Quota Serper atteint (${serperQuota.max}), skip source ${sourceId}`);
    return [];
  }

  // Serper fallback (toujours disponible si SERPER_API_KEY configuree)
  try {
    const { searchProspects } = await import('../../scraping/googleCSE.js');
    const serperQueries = buildSerperQueriesForSource(sourceId, businessProfile, searchPlan, queries);

    // Allocation smart : sources haute pertinence (score >= 8) → 2 queries, autres → 1
    const maxForThisSource = (source.relevanceScore >= 8) ? 2 : 1;
    const remaining = serperQuota.max - serperQuota.used;
    const queriesToRun = serperQueries.slice(0, Math.min(maxForThisSource, remaining));

    const allFound = [];
    for (const q of queriesToRun) {
      console.log(`[Reacteur] Serper search (${serperQuota.used + 1}/${serperQuota.max}): "${q}"`);
      serperQuota.used++;
      const found = await searchProspects(q, {
        maxResults: 10,
        orgId: organizationId,
        useCache: true,
        gl: 'fr',
        hl: 'fr',
      });
      allFound.push(...found.map(r => normalizeSerperResult(r, sourceId)));
    }

    console.log(`[Reacteur] Source ${sourceId} → ${allFound.length} resultats Serper`);
    return allFound;
  } catch (err) {
    console.warn(`[Reacteur] Source ${sourceId} completement echouee:`, err.message);
    return [];
  }
}
