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
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export async function intelligentProspectSearch(organizationId, objective, options = {}) {
  const db = getDb();
  const maxResults = options.maxResults || 15;

  console.log(`[Reacteur] Recherche intelligente lancee pour org ${organizationId}: "${objective}"`);

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
      generatedAt: new Date(),
    });
  } catch (error) {
    console.warn('[Reacteur] nicheReasoner failed, using defaults:', error.message);
  }

  // 3. Selectionner les sources optimales
  const nicheType = detectNicheType(businessProfile);
  const selectedSources = selectSources(nicheType, searchPlan);

  console.log(`[Reacteur] Sources selectionnees: ${selectedSources.map(s => s.source).join(', ')}`);

  // 4. Lancer les recherches en parallele
  const searchResults = await Promise.allSettled(
    selectedSources.map(source =>
      executeSourceSearch(source, businessProfile, searchPlan, organizationId)
    )
  );

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
  // (limiter a 20 pour ne pas exploser les quotas)
  const toQualify = allProspects.slice(0, 20);

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

      // Qualifier (BANT)
      let qualification = null;
      if (correlation.totalScore >= 30) {
        qualification = await qualifyProspect(prospect, businessProfile, scanResult, searchPlan);
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
      batch.set(ref, {
        companyName: prospect.companyName || null,
        contactName: prospect.contactName || null,
        email: prospect.email || null,
        phone: prospect.phone || null,
        website: prospect.website || null,
        city: prospect.city || null,
        codePostal: prospect.codePostal || null,
        sector: prospect.sector || null,
        siret: prospect.siret || null,
        codeNaf: prospect.codeNaf || null,
        effectif: prospect.effectif || null,
        finalScore: prospect.finalScore,
        recommendation: prospect.recommendation,
        suggestedMessage: prospect.suggestedMessage || null,
        correlation: prospect.correlation || null,
        qualification: prospect.qualification || null,
        foundByAlex: true,
        status: 'new',
        source: 'reacteur_nucleaire',
        createdAt: FieldValue.serverTimestamp(),
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

function detectNicheType(profile) {
  const activity = (profile.activity || '').toLowerCase();

  if (/restaurant|brasserie|pizzeria|traiteur|snack|cafe|bar/.test(activity)) return 'commerce_local';
  if (/plombier|electricien|menuisier|macon|peintre|couvreur|chauffagiste/.test(activity)) return 'artisan';
  if (/avocat|dentiste|medecin|architecte|comptable|kine|osteo/.test(activity)) return 'profession_liberale';
  if (/agence|consultant|coach|formation|saas|logiciel/.test(activity)) return 'b2b_services';
  if (/boutique en ligne|e-commerce|vente en ligne/.test(activity)) return 'ecommerce';
  if (/immobilier|agence immo|gestion locative/.test(activity)) return 'immobilier';
  if (/coiffeur|estheti|beaute|salon|barbier|ongle/.test(activity)) return 'commerce_local';
  if (/garage|auto|mecani|carrosserie/.test(activity)) return 'commerce_local';

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

async function executeSourceSearch(source, businessProfile, searchPlan, organizationId) {
  const queries = source.queries || searchPlan?.optimizedQueries?.[source.source] || {};

  switch (source.source) {
    case 'sirene_search': {
      try {
        const { searchSirene } = await import('../../sourcing/sireneSearch.js');
        return await searchSirene({
          codeNaf: queries.codeNaf || businessProfile.targetNaf,
          location: queries.location || businessProfile.location,
          radius: queries.radius || businessProfile.radius,
        });
      } catch {
        console.warn('[Reacteur] sirene_search pas encore implemente');
        return [];
      }
    }

    case 'google_maps_scan': {
      try {
        const { scanGoogleMaps } = await import('../../scanner/sources/googleMapsScanner.js');
        return await scanGoogleMaps({
          keywords: queries.keywords || [businessProfile.targetAudience],
          location: queries.location || businessProfile.location,
          radius: queries.radius || businessProfile.radius,
        });
      } catch {
        console.warn('[Reacteur] google_maps_scan pas encore implemente');
        return [];
      }
    }

    case 'website_scan': {
      // Deja gere dans la phase de qualification
      return [];
    }

    case 'google_reviews_monitor': {
      try {
        const { analyzeGoogleReviews } = await import('../../scanner/sources/googleReviewsMonitor.js');
        const keywords = queries.keywords || [businessProfile.targetAudience];
        const results = [];
        for (const keyword of keywords.slice(0, 3)) {
          const reviewData = await analyzeGoogleReviews(null, keyword);
          if (reviewData) results.push(reviewData);
        }
        return results;
      } catch {
        console.warn('[Reacteur] google_reviews_monitor pas encore implemente');
        return [];
      }
    }

    case 'competitor_reviews': {
      try {
        const { scrapeCompetitorReviews } = await import('../../signals/competitorReviewsScraper.js');
        const competitors = businessProfile.competitors || [];
        const results = [];
        for (const comp of competitors.slice(0, 3)) {
          const reviews = await scrapeCompetitorReviews(comp);
          if (reviews) results.push(...reviews);
        }
        return results;
      } catch {
        console.warn('[Reacteur] competitor_reviews pas encore implemente');
        return [];
      }
    }

    default: {
      console.warn(`[Reacteur] Source ${source.source} pas encore implementee`);
      return [];
    }
  }
}
