# MISSION : LE RÉACTEUR NUCLÉAIRE — Le moteur de recherche de prospects d'Alex
# C'est la pièce CENTRALE de FMF. Si ce moteur est moyen, tout est moyen.
# Si ce moteur est exceptionnel, FMF est imbattable.
# Projet : ~/Projects/face-media-factory
# À exécuter APRÈS les prompts Scanner + Alex Brain

---

## POURQUOI LES PROMPTS PRÉCÉDENTS NE SUFFISENT PAS

Les prompts précédents ont construit :
- Le scanner (20 sources, diagnostics)
- Le cerveau d'Alex (conversation, actions, rapports)
- L'interface WhatsApp

Mais il manque le CŒUR : comment Alex PENSE quand il cherche des prospects.

Actuellement, Alex reçoit "trouve-moi des plombiers à Marseille" et lance une recherche SIRENE.
C'est du niveau stagiaire.

Ce qu'Alex doit faire, c'est RAISONNER comme un commercial senior :

```
"OK, plombier à Marseille, particuliers, rayon 30km.
 
 Mes meilleures sources pour cette niche :
 1. Google Maps — les plombiers sont TOUS sur Google Maps
 2. Avis Google négatifs des CONCURRENTS — les clients mécontents cherchent un autre plombier
 3. Permis de construire — rénovation = besoin de plombier
 4. Forums locaux — les gens demandent des recommandations de plombier
 5. SIRENE — pour compléter avec les données légales
 
 Pas pertinent pour cette niche :
 ❌ France Travail (un plombier solo ne recrute pas)
 ❌ crt.sh (un plombier n'a souvent pas de site web)
 ❌ Pappers financials (trop petit pour avoir des bilans publiés)
 
 Signaux d'achat spécifiques :
 - Avis Google 1-2 étoiles d'un concurrent = client mécontent = prospect chaud
 - Post Facebook/Nextdoor 'cherche plombier urgence' = besoin immédiat
 - Permis de construire résidentiel déposé = travaux dans 3-6 mois
 - Température < 0°C depuis 3 jours = risque gel tuyaux = urgences
 
 Ma stratégie :
 Phase 1 (immédiat) : Google Maps concurrents → avis négatifs → clients mécontents
 Phase 2 (continu) : monitoring forums locaux pour demandes de plombier
 Phase 3 (saisonnier) : alerte météo gel → message proactif aux propriétaires"
```

VOILÀ ce que doit faire le moteur. Pas juste "requête SIRENE → liste".

---

## ARCHITECTURE : LE RAISONNEMENT EN 7 ÉTAPES

```
┌─────────────────────────────────────────────────────────────┐
│                    LE RÉACTEUR NUCLÉAIRE                      │
│                                                              │
│  Étape 1 : COMPRENDRE LA NICHE                              │
│  → Alex analyse le business du user en profondeur            │
│  → Il identifie le client IDÉAL du user (pas le user)        │
│  → Il comprend le parcours d'achat du client idéal           │
│                                                              │
│  Étape 2 : CHOISIR LES SOURCES                              │
│  → Pour CHAQUE niche, certaines sources sont en or           │
│  → D'autres sont inutiles                                    │
│  → Alex RAISONNE sur quelles sources activer                 │
│                                                              │
│  Étape 3 : CONSTRUIRE LA REQUÊTE INTELLIGENTE                │
│  → Pas une requête générique                                 │
│  → Des requêtes SPÉCIFIQUES à la niche                       │
│  → Combinaison de mots-clés que seul un expert utiliserait   │
│                                                              │
│  Étape 4 : CORRÉLER LES SIGNAUX                             │
│  → Un signal seul = faible                                   │
│  → 3 signaux combinés = prospect brûlant                     │
│  → Avis négatif + site obsolète + recrute = JACKPOT          │
│                                                              │
│  Étape 5 : QUALIFIER AVEC LE CONTEXTE                        │
│  → Ce prospect peut-il PAYER le service du user ?             │
│  → Ce prospect a-t-il le POUVOIR de décision ?                │
│  → Le TIMING est-il bon ?                                     │
│                                                              │
│  Étape 6 : APPRENDRE DES RÉSULTATS                          │
│  → Ce prospect a converti → qu'est-ce qui l'identifiait ?    │
│  → Ce prospect n'a pas répondu → pourquoi ?                  │
│  → Ajuster le scoring automatiquement                        │
│                                                              │
│  Étape 7 : TROUVER DES LOOKALIKES                           │
│  → "Mon meilleur client est Le Petit Bistrot"                │
│  → "Trouve-moi 20 restaurants qui lui ressemblent"           │
│  → Matching multi-critères automatique                       │
└─────────────────────────────────────────────────────────────┘
```

---

## FICHIER 1 : nicheReasoner.js — Le cerveau stratégique

**Fichier : `functions/src/alex/engine/nicheReasoner.js`**

Ce module est appelé AVANT toute recherche. Il analyse la niche du user et produit un PLAN DE RECHERCHE optimisé.

```javascript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Analyse la niche du user et produit un plan de recherche optimisé.
 * C'est LE module le plus important de tout FMF.
 * 
 * Input : le businessProfile du user
 * Output : un plan de recherche avec les sources classées par pertinence,
 *          les mots-clés optimisés, et les signaux d'achat spécifiques
 */
export async function buildSearchPlan(businessProfile, objective) {
  const prompt = `Tu es un expert en stratégie commerciale et en prospection B2B/B2C.

CONTEXTE DU USER :
- Activité : ${businessProfile.activity}
- Secteur : ${businessProfile.sector}
- Localisation : ${businessProfile.location}
- Rayon : ${businessProfile.radius}
- Services : ${businessProfile.services}
- Cible : ${businessProfile.targetAudience} (${businessProfile.targetType})
- Tarif moyen : ${businessProfile.averagePrice}
- Objectif actuel : ${objective || businessProfile.goal}
${businessProfile.competitors ? `- Concurrents connus : ${businessProfile.competitors.join(', ')}` : ''}
${businessProfile.bestClients ? `- Meilleurs clients actuels : ${JSON.stringify(businessProfile.bestClients)}` : ''}

SOURCES DISPONIBLES (tu dois les classer par pertinence pour CETTE niche) :
1. sirene_search — Base SIRENE, recherche par code NAF + localisation (4M+ entreprises FR)
2. google_maps_scan — Google Maps, recherche par type de commerce + zone géo
3. google_reviews_monitor — Avis Google, surveillance des notes et avis négatifs
4. france_travail — Offres d'emploi (signal de croissance/besoin)
5. bodacc_monitor — Nouvelles créations d'entreprises
6. ct_logs — Nouveaux sites web créés (.fr)
7. forums_scan — Forums, groupes Facebook, Nextdoor (demandes de service)
8. social_scan — Instagram, TikTok, Facebook (analyse engagement)
9. leboncoin_monitor — Cessions de fonds de commerce
10. subventions_monitor — Aides publiques reçues
11. serper_hunt — Recherches Google ciblées
12. competitor_reviews — Avis négatifs des concurrents du user
13. website_scan — Analyse des sites web des prospects
14. permis_construire — Permis de construire (signal BTP/rénovation)
15. pappers_financial — Données financières (CA, résultat, dirigeants)
16. weather_seasonal — Météo et saisonnalité

ANALYSE DEMANDÉE :

1. PARCOURS D'ACHAT : Comment le client idéal du user cherche-t-il un prestataire dans ce secteur ? (ex: Google Maps → avis → site web → appel). Décris les 3-4 étapes clés.

2. SOURCES CLASSÉES : Pour chaque source, donne un score de pertinence (0-10) et explique POURQUOI en 1 phrase. Classe de la plus pertinente à la moins pertinente.

3. REQUÊTES OPTIMISÉES : Pour chaque source pertinente (score >= 6), donne les mots-clés EXACTS à utiliser. Pas des mots génériques — des mots qu'un expert du secteur utiliserait.

4. SIGNAUX D'ACHAT SPÉCIFIQUES : Liste 5-8 signaux qui, dans CETTE niche spécifiquement, indiquent qu'un prospect a besoin des services du user. Sois très précis.

5. SIGNAUX DE CORRÉLATION : Donne 3 combinaisons de signaux qui, ensemble, créent un prospect "brûlant". Format : signal A + signal B + signal C = prospect score 90+

6. DISQUALIFIANTS : Liste 3-4 critères qui disqualifient un prospect même s'il semble intéressant.

7. TIMING OPTIMAL : Quel est le meilleur moment (jour/semaine, heure, saison) pour contacter un prospect dans cette niche ?

8. MESSAGE D'APPROCHE : Quel angle d'approche fonctionne le mieux dans cette niche ? Quel pain point ouvrir en premier ?

Réponds en JSON structuré :
{
  "buyerJourney": ["étape 1", "étape 2", ...],
  "rankedSources": [
    { "source": "google_maps_scan", "score": 10, "reason": "..." },
    ...
  ],
  "optimizedQueries": {
    "google_maps_scan": { "keywords": ["..."], "types": ["..."], "radius": "..." },
    "forums_scan": { "platforms": ["..."], "keywords": ["..."] },
    ...
  },
  "buyingSignals": [
    { "signal": "...", "score": 25, "explanation": "..." },
    ...
  ],
  "correlationCombos": [
    { "signals": ["A", "B", "C"], "combinedScore": 90, "explanation": "..." },
    ...
  ],
  "disqualifiers": ["...", "...", "..."],
  "bestTiming": { "days": ["..."], "hours": "...", "season": "..." },
  "approachAngle": { "painPoint": "...", "opener": "...", "tone": "..." }
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const plan = JSON.parse(response.choices[0].message.content);

  return plan;
}
```

---

## FICHIER 2 : signalCorrelator.js — La corrélation multi-signaux

**Fichier : `functions/src/alex/engine/signalCorrelator.js`**

```javascript
/**
 * Corrèle les signaux d'un prospect pour calculer un score composite.
 * Un signal seul = faible. Plusieurs signaux combinés = prospect brûlant.
 * 
 * C'est ce qui différencie FMF de TOUS les concurrents :
 * - Clay enrichit mais ne corrèle pas
 * - Apollo score mais de manière statique
 * - FMF combine dynamiquement les signaux selon la niche
 */
export function correlateSignals(signals, searchPlan) {
  let totalScore = 0;
  const correlations = [];

  // 1. Score individuel de chaque signal
  for (const signal of signals) {
    totalScore += signal.score;
  }

  // 2. Bonus de corrélation — signaux qui se renforcent mutuellement
  const signalTypes = new Set(signals.map(s => s.type));
  
  if (searchPlan?.correlationCombos) {
    for (const combo of searchPlan.correlationCombos) {
      const matchedSignals = combo.signals.filter(s => signalTypes.has(s));
      
      if (matchedSignals.length >= 2) {
        // Au moins 2 signaux sur 3 du combo sont présents
        const comboBonus = Math.round(combo.combinedScore * (matchedSignals.length / combo.signals.length));
        totalScore += comboBonus;
        
        correlations.push({
          combo: combo.signals,
          matched: matchedSignals,
          bonus: comboBonus,
          explanation: combo.explanation,
        });
      }
    }
  }

  // 3. Bonus de fraîcheur — signaux récents valent plus
  const now = Date.now();
  for (const signal of signals) {
    const ageHours = (now - new Date(signal.detectedAt).getTime()) / (1000 * 60 * 60);
    
    if (ageHours < 24) {
      totalScore += 10; // Signal de moins de 24h = très frais
    } else if (ageHours < 72) {
      totalScore += 5; // Signal de moins de 3 jours = frais
    }
    // Au-delà de 7 jours, le signal perd de la valeur
    if (ageHours > 168) {
      totalScore -= 5;
    }
  }

  // 4. Bonus de diversité — des signaux de sources DIFFÉRENTES valent plus
  const uniqueSources = new Set(signals.map(s => s.source));
  if (uniqueSources.size >= 3) {
    totalScore += 15; // 3+ sources différentes confirment le besoin
  }
  if (uniqueSources.size >= 5) {
    totalScore += 10; // 5+ sources = prospect ultra-confirmé
  }

  // 5. Vérifier les disqualifiants
  let disqualified = false;
  if (searchPlan?.disqualifiers) {
    for (const disq of searchPlan.disqualifiers) {
      // Vérifier si un signal matche un disqualifiant
      // (logique simplifiée, à enrichir selon les cas)
      if (signals.some(s => s.message?.toLowerCase().includes(disq.toLowerCase()))) {
        disqualified = true;
        totalScore = Math.max(totalScore - 50, 0);
      }
    }
  }

  // 6. Plafonner le score à 100
  totalScore = Math.min(Math.max(totalScore, 0), 100);

  // 7. Déterminer la priorité
  const priority = totalScore >= 80 ? 'critical'
    : totalScore >= 60 ? 'high'
    : totalScore >= 35 ? 'medium'
    : 'low';

  return {
    totalScore,
    priority,
    signalCount: signals.length,
    uniqueSources: uniqueSources.size,
    correlations,
    disqualified,
    breakdown: {
      individualSignals: signals.reduce((sum, s) => sum + s.score, 0),
      correlationBonus: correlations.reduce((sum, c) => sum + c.bonus, 0),
      freshnessBonus: totalScore - signals.reduce((sum, s) => sum + s.score, 0) - correlations.reduce((sum, c) => sum + c.bonus, 0),
    },
  };
}
```

---

## FICHIER 3 : lookalikeFinder.js — "Trouve-moi des prospects comme celui-ci"

**Fichier : `functions/src/alex/engine/lookalikeFinder.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Le user dit "Mon meilleur client c'est Le Petit Bistrot, trouve-moi des restaurants qui lui ressemblent"
 * 
 * Alex analyse Le Petit Bistrot :
 * - Secteur : restaurant gastronomique
 * - Taille : 8-15 employés
 * - CA : 400-800K€
 * - Zone : centre-ville Lyon
 * - Tech : site WordPress, présent sur TheFork, Instagram actif
 * - Signaux au moment de la conversion : note Google 4.2, site vieillissant, pas de booking en ligne
 * 
 * Puis cherche des restaurants avec un profil SIMILAIRE.
 */
export async function findLookalikes(referenceProspectId, organizationId, maxResults = 20) {
  // 1. Charger le prospect de référence avec son diagnostic complet
  const refDoc = await db.doc(`organizations/${organizationId}/prospects/${referenceProspectId}`).get();
  if (!refDoc.exists) throw new Error('Prospect de référence introuvable');
  
  const reference = refDoc.data();
  
  // 2. Charger le scan du prospect de référence (s'il existe)
  let refScan = null;
  if (reference.scanResultId) {
    const scanDoc = await db.doc(`scanResults/${reference.scanResultId}`).get();
    if (scanDoc.exists) refScan = scanDoc.data();
  }

  // 3. Extraire le profil type (les caractéristiques qui définissent ce prospect)
  const profile = {
    sector: reference.sector || reference.codeNaf,
    location: reference.city || reference.codePostal,
    sizeRange: estimateSizeRange(reference.effectif),
    hasWebsite: !!reference.website,
    cms: refScan?.techStack?.cms || null,
    googleRating: refScan?.googleBusiness?.rating || null,
    socialPresence: {
      instagram: !!refScan?.social?.instagram?.handle,
      facebook: !!refScan?.social?.facebook,
    },
    signals: reference.signals?.map(s => s.type) || [],
  };

  // 4. Construire la requête de recherche lookalike
  // Chercher dans SIRENE des entreprises avec le même code NAF + zone géo similaire
  const { searchSirene } = await import('../../sourcing/sireneSearch.js');
  
  const candidates = await searchSirene({
    codeNaf: profile.sector,
    location: profile.location,
    radius: 25, // Même zone géographique
  });

  // 5. Scorer chaque candidat par similarité avec le prospect de référence
  const scored = [];
  
  for (const candidate of candidates) {
    // Ne pas inclure le prospect de référence lui-même
    if (candidate.siret === reference.siret) continue;
    
    // Ne pas inclure les prospects déjà dans le CRM
    const exists = await db.collection(`organizations/${organizationId}/prospects`)
      .where('siret', '==', candidate.siret)
      .limit(1)
      .get();
    if (!exists.empty) continue;
    
    let similarityScore = 0;
    const matchReasons = [];
    
    // Même secteur exact
    if (candidate.codeNaf === profile.sector) {
      similarityScore += 30;
      matchReasons.push('Même secteur d\'activité');
    }
    
    // Taille similaire
    if (candidate.effectif && profile.sizeRange) {
      if (candidate.effectif >= profile.sizeRange.min && candidate.effectif <= profile.sizeRange.max) {
        similarityScore += 20;
        matchReasons.push('Taille d\'entreprise similaire');
      }
    }
    
    // Même zone géographique
    if (candidate.codePostal?.substring(0, 2) === profile.location?.substring(0, 2)) {
      similarityScore += 15;
      matchReasons.push('Même zone géographique');
    }
    
    // A un site web (comme le référent)
    if (profile.hasWebsite && candidate.website) {
      similarityScore += 10;
      matchReasons.push('Possède un site web');
    }
    
    // Entreprise du même âge approximatif
    if (candidate.dateCreation && reference.dateCreation) {
      const ageDiff = Math.abs(
        new Date(candidate.dateCreation).getFullYear() - new Date(reference.dateCreation).getFullYear()
      );
      if (ageDiff <= 3) {
        similarityScore += 10;
        matchReasons.push('Ancienneté similaire');
      }
    }
    
    if (similarityScore >= 40) { // Seuil minimum de similarité
      scored.push({
        ...candidate,
        similarityScore,
        matchReasons,
        isLookalike: true,
        referenceProspectId,
      });
    }
  }
  
  // 6. Trier par score de similarité et retourner les meilleurs
  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, maxResults);
}

function estimateSizeRange(effectif) {
  if (!effectif) return null;
  if (effectif <= 5) return { min: 1, max: 10 };
  if (effectif <= 20) return { min: 5, max: 30 };
  if (effectif <= 50) return { min: 20, max: 80 };
  return { min: 50, max: 200 };
}
```

---

## FICHIER 4 : adaptiveScorer.js — Le scoring qui APPREND

**Fichier : `functions/src/alex/engine/adaptiveScorer.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Le scoring adaptatif apprend de CHAQUE résultat :
 * - Ce prospect a converti → quels signaux avait-il ? → augmenter le poids de ces signaux
 * - Ce prospect n'a pas répondu → quels signaux avait-il ? → diminuer le poids
 * 
 * C'est un feedback loop qui rend FMF de plus en plus précis avec le temps.
 * Aucun concurrent ne fait ça au niveau du tenant individuel.
 */

// Appelé quand un prospect change de statut (converti, perdu, pas de réponse)
export async function learnFromOutcome(organizationId, prospectId, outcome) {
  // outcome : 'converted' | 'meeting_booked' | 'replied_positive' | 'replied_negative' | 'no_reply' | 'lost'
  
  const prospect = (await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get()).data();
  if (!prospect || !prospect.signals) return;
  
  // Charger les poids actuels
  const weightsDoc = await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).get();
  const weights = weightsDoc.exists ? weightsDoc.data() : {};
  
  // Ajuster les poids selon le résultat
  const adjustment = getAdjustment(outcome);
  
  for (const signal of prospect.signals) {
    const signalType = signal.type;
    const currentWeight = weights[signalType] || 1.0;
    
    // Multiplicateur : bons résultats augmentent le poids, mauvais le diminuent
    const newWeight = Math.max(0.1, Math.min(3.0, currentWeight * adjustment));
    weights[signalType] = newWeight;
  }
  
  // Sauvegarder les poids mis à jour
  await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).set(weights, { merge: true });
  
  // Sauvegarder dans l'historique d'apprentissage
  await db.collection(`organizations/${organizationId}/alexLearning`).add({
    prospectId,
    outcome,
    signals: prospect.signals.map(s => s.type),
    source: prospect.source,
    sector: prospect.sector,
    learnedAt: new Date(),
  });
  
  return { adjusted: Object.keys(weights).length, outcome };
}

function getAdjustment(outcome) {
  switch (outcome) {
    case 'converted': return 1.3;           // +30% pour les signaux qui mènent à la conversion
    case 'meeting_booked': return 1.2;      // +20%
    case 'replied_positive': return 1.15;   // +15%
    case 'replied_negative': return 0.95;   // -5%
    case 'no_reply': return 0.9;            // -10%
    case 'lost': return 0.8;               // -20%
    default: return 1.0;
  }
}

/**
 * Applique les poids appris au scoring d'un prospect
 */
export async function applyLearnedWeights(organizationId, signals) {
  const weightsDoc = await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).get();
  const weights = weightsDoc.exists ? weightsDoc.data() : {};
  
  return signals.map(signal => ({
    ...signal,
    rawScore: signal.score,
    adjustedScore: Math.round(signal.score * (weights[signal.type] || 1.0)),
    weight: weights[signal.type] || 1.0,
  }));
}

/**
 * Génère un rapport d'apprentissage pour le user
 * "Voici ce que j'ai appris sur tes meilleurs prospects"
 */
export async function generateLearningInsights(organizationId) {
  const learning = await db.collection(`organizations/${organizationId}/alexLearning`)
    .orderBy('learnedAt', 'desc')
    .limit(100)
    .get();
  
  if (learning.empty) return null;
  
  const outcomes = learning.docs.map(d => d.data());
  
  // Analyser les patterns
  const convertedSignals = {};
  const lostSignals = {};
  
  for (const outcome of outcomes) {
    const bucket = outcome.outcome === 'converted' || outcome.outcome === 'meeting_booked' 
      ? convertedSignals : lostSignals;
    
    for (const signal of (outcome.signals || [])) {
      bucket[signal] = (bucket[signal] || 0) + 1;
    }
  }
  
  // Trouver les signaux les plus prédictifs de conversion
  const bestSignals = Object.entries(convertedSignals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([signal, count]) => ({ signal, conversions: count }));
  
  // Trouver les signaux qui mènent le plus souvent à rien
  const worstSignals = Object.entries(lostSignals)
    .filter(([signal]) => !convertedSignals[signal] || convertedSignals[signal] < lostSignals[signal])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([signal, count]) => ({ signal, losses: count }));
  
  return {
    totalOutcomes: outcomes.length,
    conversionRate: outcomes.filter(o => o.outcome === 'converted' || o.outcome === 'meeting_booked').length / outcomes.length,
    bestSignals,
    worstSignals,
    recommendation: bestSignals.length > 0 
      ? `Tes meilleurs prospects ont souvent ces signaux : ${bestSignals.map(s => s.signal).join(', ')}. Je me concentre dessus.`
      : 'Pas encore assez de données pour optimiser. Continue à prospecter, j\'apprends de chaque résultat.',
  };
}
```

---

## FICHIER 5 : smartSourceSelector.js — Le sélecteur de sources intelligent

**Fichier : `functions/src/alex/engine/smartSourceSelector.js`**

```javascript
/**
 * Pour chaque recherche, Alex ne lance PAS toutes les 20 sources.
 * Il sélectionne les 3-5 meilleures pour CETTE niche spécifique.
 * 
 * C'est de l'intelligence, pas du spam de sources.
 */

// Mapping niche → sources optimales (enrichi par nicheReasoner.js à chaque session)
const DEFAULT_SOURCE_RELEVANCE = {
  // COMMERCES LOCAUX (restaurants, coiffeurs, boulangers...)
  commerce_local: {
    top: ['google_maps_scan', 'google_reviews_monitor', 'competitor_reviews', 'website_scan'],
    medium: ['sirene_search', 'social_scan', 'forums_scan'],
    low: ['france_travail', 'ct_logs', 'pappers_financial'],
    irrelevant: ['leboncoin_monitor'], // sauf cessions
  },
  
  // ARTISANS (plombier, électricien, menuisier...)
  artisan: {
    top: ['google_maps_scan', 'forums_scan', 'permis_construire', 'google_reviews_monitor'],
    medium: ['sirene_search', 'weather_seasonal', 'competitor_reviews'],
    low: ['social_scan', 'website_scan'],
    irrelevant: ['france_travail', 'ct_logs', 'pappers_financial'],
  },
  
  // PROFESSIONS LIBÉRALES (avocats, dentistes, architectes...)
  profession_liberale: {
    top: ['google_maps_scan', 'google_reviews_monitor', 'website_scan', 'sirene_search'],
    medium: ['france_travail', 'pappers_financial', 'social_scan'],
    low: ['forums_scan', 'competitor_reviews'],
    irrelevant: ['permis_construire', 'weather_seasonal', 'leboncoin_monitor'],
  },
  
  // B2B SERVICES (agences, consultants, SaaS...)
  b2b_services: {
    top: ['sirene_search', 'france_travail', 'website_scan', 'competitor_reviews'],
    medium: ['social_scan', 'ct_logs', 'serper_hunt', 'pappers_financial'],
    low: ['google_maps_scan', 'google_reviews_monitor'],
    irrelevant: ['permis_construire', 'weather_seasonal'],
  },
  
  // E-COMMERCE
  ecommerce: {
    top: ['website_scan', 'social_scan', 'competitor_reviews', 'serper_hunt'],
    medium: ['sirene_search', 'ct_logs', 'france_travail'],
    low: ['google_maps_scan'],
    irrelevant: ['permis_construire', 'weather_seasonal', 'forums_scan'],
  },
  
  // IMMOBILIER
  immobilier: {
    top: ['sirene_search', 'google_maps_scan', 'website_scan', 'pappers_financial'],
    medium: ['france_travail', 'social_scan', 'permis_construire'],
    low: ['google_reviews_monitor', 'competitor_reviews'],
    irrelevant: ['weather_seasonal', 'ct_logs'],
  },
};

/**
 * Sélectionne les sources optimales pour une recherche.
 * Utilise le searchPlan du nicheReasoner si disponible, sinon les défauts.
 */
export function selectSources(nicheType, searchPlan, options = {}) {
  const maxSources = options.maxSources || 5;
  
  // Si le nicheReasoner a produit un plan, l'utiliser
  if (searchPlan?.rankedSources) {
    return searchPlan.rankedSources
      .filter(s => s.score >= 6)  // Score de pertinence >= 6/10
      .slice(0, maxSources)
      .map(s => ({
        source: s.source,
        relevanceScore: s.score,
        reason: s.reason,
        queries: searchPlan.optimizedQueries?.[s.source] || null,
      }));
  }
  
  // Sinon, utiliser les défauts
  const defaults = DEFAULT_SOURCE_RELEVANCE[nicheType] || DEFAULT_SOURCE_RELEVANCE.commerce_local;
  
  const selected = [];
  
  // Prendre toutes les sources "top" (max 3)
  for (const source of defaults.top.slice(0, 3)) {
    selected.push({ source, relevanceScore: 9, reason: 'Source prioritaire pour cette niche' });
  }
  
  // Compléter avec les "medium" si besoin
  if (selected.length < maxSources) {
    for (const source of defaults.medium) {
      if (selected.length >= maxSources) break;
      selected.push({ source, relevanceScore: 7, reason: 'Source complémentaire' });
    }
  }
  
  return selected;
}
```

---

## FICHIER 6 : prospectQualifier.js — La qualification contextuelle

**Fichier : `functions/src/alex/engine/prospectQualifier.js`**

```javascript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Qualification contextuelle d'un prospect par rapport au business du user.
 * 
 * Pas juste "est-ce que ce prospect a un besoin ?"
 * Mais "est-ce que ce prospect peut PAYER et a-t-il le POUVOIR de décider ?"
 * Et "le TIMING est-il bon ?"
 * 
 * Framework BANT adapté par l'IA :
 * B (Budget) : Ce prospect a-t-il les moyens de payer le service ?
 * A (Authority) : On parle au décideur ?
 * N (Need) : Le besoin est-il confirmé par les signaux ?
 * T (Timing) : Le moment est-il bon ?
 */
export async function qualifyProspect(prospect, businessProfile, scanResult, searchPlan) {
  const prompt = `Tu es un expert en qualification de prospects B2B.

LE USER (celui qui vend) :
- Activité : ${businessProfile.activity}
- Services : ${businessProfile.services}
- Tarif moyen : ${businessProfile.averagePrice}
- Cible : ${businessProfile.targetAudience}

LE PROSPECT (celui qu'on évalue) :
- Nom : ${prospect.companyName || prospect.contactName}
- Secteur : ${prospect.sector || 'non renseigné'}
- Localisation : ${prospect.city || prospect.codePostal || 'non renseigné'}
- Taille : ${prospect.effectif || 'non renseigné'} employés
- Site web : ${prospect.website || 'non renseigné'}
${scanResult ? `
DIAGNOSTIC DU PROSPECT :
- Score PageSpeed : ${scanResult.seo?.lighthouseScore || 'N/A'}
- Note Google : ${scanResult.googleBusiness?.rating || 'N/A'}
- Nombre d'avis : ${scanResult.googleBusiness?.totalReviews || 'N/A'}
- CMS : ${scanResult.techStack?.cms || 'non détecté'}
- Analytics : ${scanResult.website?.hasAnalytics ? 'oui' : 'non'}
- Signaux détectés : ${scanResult.signals?.map(s => s.message).join('; ')}
` : 'Pas de diagnostic disponible'}

ÉVALUE ce prospect selon 4 critères (score 0-25 chacun, total /100) :

1. BUDGET (0-25) : Ce prospect a-t-il les moyens de payer ${businessProfile.averagePrice || 'le service'} ?
   Indices : taille de l'entreprise, secteur, zone géographique, signes de croissance

2. AUTORITÉ (0-25) : Est-ce qu'on a identifié le décideur ?
   Indices : le contact est-il le gérant/dirigeant ? ou un employé ?

3. BESOIN (0-25) : Le besoin est-il confirmé par les signaux ?
   Indices : signaux détectés, état du site, note Google, engagement social

4. TIMING (0-25) : Le moment est-il bon pour contacter ?
   Indices : saisonnalité, événements récents, urgence des signaux

Réponds en JSON :
{
  "budget": { "score": 0-25, "reasoning": "..." },
  "authority": { "score": 0-25, "reasoning": "..." },
  "need": { "score": 0-25, "reasoning": "..." },
  "timing": { "score": 0-25, "reasoning": "..." },
  "totalScore": 0-100,
  "recommendation": "contact_now" | "nurture" | "skip",
  "suggestedMessage": "Le premier message idéal pour ce prospect (1-2 phrases)"
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## FICHIER 7 : searchOrchestrator.js — L'orchestrateur de recherche principal

**Fichier : `functions/src/alex/engine/searchOrchestrator.js`**

C'est le fichier qui ORCHESTRE tout. Quand Alex décide de chercher des prospects, c'est ce module qui est appelé.

```javascript
import { buildSearchPlan } from './nicheReasoner.js';
import { selectSources } from './smartSourceSelector.js';
import { correlateSignals } from './signalCorrelator.js';
import { qualifyProspect } from './prospectQualifier.js';
import { applyLearnedWeights } from './adaptiveScorer.js';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * RECHERCHE INTELLIGENTE DE PROSPECTS
 * 
 * C'est LE processus central de FMF. Voici ce qu'il fait :
 * 
 * 1. Charge le profil business du user
 * 2. Demande au nicheReasoner un plan de recherche adapté
 * 3. Sélectionne les 3-5 meilleures sources
 * 4. Lance les recherches en parallèle
 * 5. Agrège les résultats
 * 6. Pour chaque prospect : scanne le site + corrèle les signaux + qualifie
 * 7. Applique le scoring adaptatif (poids appris des résultats passés)
 * 8. Trie par score et retourne les TOP prospects
 */
export async function intelligentProspectSearch(organizationId, objective, options = {}) {
  const maxResults = options.maxResults || 15;
  
  console.log(`🧠 Recherche intelligente lancée pour org ${organizationId}: "${objective}"`);
  
  // 1. Charger le profil business
  const profileDoc = await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get();
  const businessProfile = profileDoc.data() || {};
  
  // 2. Construire le plan de recherche adapté à la niche
  let searchPlan;
  try {
    searchPlan = await buildSearchPlan(businessProfile, objective);
    
    // Sauvegarder le plan pour référence
    await db.doc(`organizations/${organizationId}/alexMemory/lastSearchPlan`).set({
      ...searchPlan,
      objective,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.warn('nicheReasoner failed, using defaults:', error.message);
    searchPlan = null;
  }
  
  // 3. Sélectionner les sources optimales
  const nicheType = detectNicheType(businessProfile);
  const selectedSources = selectSources(nicheType, searchPlan);
  
  console.log(`📡 Sources sélectionnées: ${selectedSources.map(s => s.source).join(', ')}`);
  
  // 4. Lancer les recherches en parallèle
  const searchResults = await Promise.allSettled(
    selectedSources.map(source => 
      executeSourceSearch(source, businessProfile, searchPlan, organizationId)
    )
  );
  
  // 5. Agréger tous les prospects trouvés
  let allProspects = [];
  for (const result of searchResults) {
    if (result.status === 'fulfilled' && result.value) {
      allProspects.push(...result.value);
    }
  }
  
  // Dédupliquer par SIRET ou domaine
  allProspects = deduplicateProspects(allProspects);
  
  console.log(`📋 ${allProspects.length} prospects uniques trouvés, en cours de qualification...`);
  
  // 6. Pour chaque prospect : scanner + corréler + qualifier
  // (limiter à 20 pour ne pas exploser les quotas)
  const toQualify = allProspects.slice(0, 20);
  
  const qualifiedProspects = [];
  for (const prospect of toQualify) {
    try {
      // Scanner le site du prospect (si pas déjà fait)
      let scanResult = null;
      if (prospect.website) {
        const { runProspectScan } = await import('../../scanner/scanOrchestrator.js');
        try {
          scanResult = await runProspectScan({
            data: { domain: prospect.website, organizationId }
          });
        } catch (e) {
          // Scanner peut échouer, pas critique
        }
      }
      
      // Corréler les signaux
      const signals = [
        ...(prospect.signals || []),
        ...(scanResult?.signals || []),
      ];
      
      // Appliquer les poids appris
      const weightedSignals = await applyLearnedWeights(organizationId, signals);
      
      // Calculer le score corrélé
      const correlation = correlateSignals(weightedSignals, searchPlan);
      
      // Qualifier (BANT)
      let qualification = null;
      if (correlation.totalScore >= 30) { // Ne qualifier que les prospects intéressants
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
      console.warn(`Erreur qualification prospect ${prospect.companyName}:`, error.message);
      qualifiedProspects.push({ ...prospect, finalScore: 0, recommendation: 'skip' });
    }
  }
  
  // 7. Trier par score final
  qualifiedProspects.sort((a, b) => b.finalScore - a.finalScore);
  
  // 8. Sauvegarder les TOP prospects dans Firestore
  const topProspects = qualifiedProspects
    .filter(p => p.recommendation !== 'skip')
    .slice(0, maxResults);
  
  const batch = db.batch();
  for (const prospect of topProspects) {
    const ref = db.collection(`organizations/${organizationId}/prospects`).doc();
    batch.set(ref, {
      ...prospect,
      scanResult: prospect.scanResult || null, // Éviter les objets trop gros
      foundByAlex: true,
      status: 'new',
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  
  console.log(`✅ ${topProspects.length} prospects qualifiés sauvegardés`);
  
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
  const sector = (profile.sector || '').toLowerCase();
  
  if (/restaurant|brasserie|pizzeria|traiteur|snack|café|bar/.test(activity)) return 'commerce_local';
  if (/plombier|électricien|menuisier|maçon|peintre|couvreur|chauffagiste/.test(activity)) return 'artisan';
  if (/avocat|dentiste|médecin|architecte|comptable|kiné|ostéo/.test(activity)) return 'profession_liberale';
  if (/agence|consultant|coach|formation|saas|logiciel/.test(activity)) return 'b2b_services';
  if (/boutique en ligne|e-commerce|vente en ligne/.test(activity)) return 'ecommerce';
  if (/immobilier|agence immo|gestion locative/.test(activity)) return 'immobilier';
  if (/coiffeur|esthéti|beauté|salon|barbier|ongle/.test(activity)) return 'commerce_local';
  if (/garage|auto|mécani|carrosserie/.test(activity)) return 'commerce_local';
  
  return 'commerce_local'; // Défaut
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
      const { searchSirene } = await import('../../sourcing/sireneSearch.js');
      return await searchSirene({
        codeNaf: queries.codeNaf || businessProfile.targetNaf,
        location: queries.location || businessProfile.location,
        radius: queries.radius || businessProfile.radius,
      });
    }
    
    case 'google_maps_scan': {
      const { scanGoogleMaps } = await import('../../scanner/sources/googleMapsScanner.js');
      return await scanGoogleMaps({
        keywords: queries.keywords || [businessProfile.targetAudience],
        location: queries.location || businessProfile.location,
        radius: queries.radius || businessProfile.radius,
      });
    }
    
    // Ajouter chaque source ici...
    // Pour les sources qui ne sont pas encore implémentées,
    // retourner un tableau vide et log un warning
    
    default: {
      console.warn(`⚠️ Source ${source.source} pas encore implémentée`);
      return [];
    }
  }
}
```

---

## INTÉGRATION AVEC alexBrain.js

Dans `alexActionExecutor.js`, ajouter l'action `intelligent_search` :

```javascript
case 'intelligent_search': {
  const { intelligentProspectSearch } = await import('./engine/searchOrchestrator.js');
  const results = await intelligentProspectSearch(
    organizationId,
    action.params.objective,
    { maxResults: action.params.maxResults || 15 }
  );
  
  // Sauvegarder le résumé pour qu'Alex puisse en parler
  await db.doc(`organizations/${organizationId}/alexMemory/lastSearchResults`).set({
    ...results,
    searchedAt: new Date(),
  });
  
  resultsList.push({ type: 'intelligent_search', ...results });
  break;
}

case 'find_lookalikes': {
  const { findLookalikes } = await import('./engine/lookalikeFinder.js');
  const lookalikes = await findLookalikes(
    action.params.referenceProspectId,
    organizationId,
    action.params.maxResults || 20
  );
  resultsList.push({ type: 'find_lookalikes', found: lookalikes.length });
  break;
}
```

Et dans le system prompt d'Alex, REMPLACER l'action `sirene_search` par :

```
- intelligent_search : Recherche intelligente de prospects. Alex choisit les meilleures sources, scanne, qualifie et retourne les TOP prospects. Params : { objective: "description libre de ce que le user cherche" }
- find_lookalikes : Trouve des prospects similaires à un prospect existant. Params : { referenceProspectId: "id du prospect modèle" }
```

---

## TRIGGER APPRENTISSAGE — Quand un prospect change de statut

Ajouter un trigger Firestore pour apprendre automatiquement :

```javascript
// functions/src/alex/engine/learningTrigger.js
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { learnFromOutcome } from './adaptiveScorer.js';

export const learnFromProspectOutcome = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orgId = event.params.orgId;
    const prospectId = event.params.prospectId;

    // Détecter les transitions de statut intéressantes
    if (before.status === after.status) return;

    const outcomeMap = {
      'converted': 'converted',
      'meeting_booked': 'meeting_booked',
      'replied': after.replyClassification === 'INTERESTED' ? 'replied_positive' : 'replied_negative',
      'lost': 'lost',
      'archived': 'no_reply',
    };

    const outcome = outcomeMap[after.status];
    if (!outcome) return;

    await learnFromOutcome(orgId, prospectId, outcome);
    console.log(`🧠 Apprentissage : prospect ${prospectId} → ${outcome}`);
  }
);
```

---

## EXPORTS

```javascript
// functions/src/alex/engine/index.js
export { buildSearchPlan } from './nicheReasoner.js';
export { selectSources } from './smartSourceSelector.js';
export { correlateSignals } from './signalCorrelator.js';
export { findLookalikes } from './lookalikeFinder.js';
export { learnFromOutcome, applyLearnedWeights, generateLearningInsights } from './adaptiveScorer.js';
export { qualifyProspect } from './prospectQualifier.js';
export { intelligentProspectSearch } from './searchOrchestrator.js';
export { learnFromProspectOutcome } from './learningTrigger.js';
```

---

## TESTS

```bash
# Test 1 : nicheReasoner avec un profil plombier
# Vérifier que le plan de recherche est pertinent (Google Maps en top, pas France Travail)

# Test 2 : intelligentProspectSearch("restaurants à Lyon qui ont besoin d'aide digitale")
# Vérifier que les 15 prospects retournés ont des scores > 30 et des signaux variés

# Test 3 : lookalikeFinder avec un prospect existant
# Vérifier que les résultats sont dans le même secteur/zone/taille

# Test 4 : adaptiveScorer après marquage d'un prospect comme "converti"
# Vérifier que les poids des signaux de ce prospect ont augmenté

# Build
npm run build  # 0 erreurs
```
