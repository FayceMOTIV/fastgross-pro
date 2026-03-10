/**
 * nicheReasoner.js — Le cerveau strategique
 * Analyse la niche du user et produit un plan de recherche optimise.
 * C'est LE module le plus important de tout FMF.
 */
import Groq from 'groq-sdk';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Input : le businessProfile du user
 * Output : un plan de recherche avec les sources classees par pertinence,
 *          les mots-cles optimises, et les signaux d'achat specifiques
 */
export async function buildSearchPlan(businessProfile, objective) {
  const prompt = `Tu es un expert en strategie commerciale et en prospection B2B/B2C.

CONTEXTE DU USER :
- Activite : ${businessProfile.activity || 'non renseigne'}
- Secteur : ${businessProfile.sector || 'non renseigne'}
- Localisation : ${businessProfile.location || 'non renseigne'}
- Rayon : ${businessProfile.radius || 'non renseigne'}
- Services : ${businessProfile.services || 'non renseigne'}
- Cible : ${businessProfile.targetAudience || 'non renseigne'} (${businessProfile.targetType || 'non renseigne'})
- Tarif moyen : ${businessProfile.averagePrice || 'non renseigne'}
- Objectif actuel : ${objective || businessProfile.goal || 'trouver des prospects'}
${businessProfile.competitors ? `- Concurrents connus : ${businessProfile.competitors.join(', ')}` : ''}
${businessProfile.bestClients ? `- Meilleurs clients actuels : ${JSON.stringify(businessProfile.bestClients)}` : ''}

SOURCES DISPONIBLES (tu dois les classer par pertinence pour CETTE niche) :
1. sirene_search — Base SIRENE, recherche par code NAF + localisation (4M+ entreprises FR)
2. google_maps_scan — Google Maps, recherche par type de commerce + zone geo
3. google_reviews_monitor — Avis Google, surveillance des notes et avis negatifs
4. france_travail — Offres d'emploi (signal de croissance/besoin)
5. bodacc_monitor — Nouvelles creations d'entreprises
6. ct_logs — Nouveaux sites web crees (.fr)
7. forums_scan — Forums, groupes Facebook, Nextdoor (demandes de service)
8. social_scan — Instagram, TikTok, Facebook (analyse engagement)
9. leboncoin_monitor — Cessions de fonds de commerce
10. subventions_monitor — Aides publiques recues
11. serper_hunt — Recherches Google ciblees
12. competitor_reviews — Avis negatifs des concurrents du user
13. website_scan — Analyse des sites web des prospects
14. permis_construire — Permis de construire (signal BTP/renovation)
15. pappers_financial — Donnees financieres (CA, resultat, dirigeants)
16. weather_seasonal — Meteo et saisonnalite

ANALYSE DEMANDEE :

1. PARCOURS D'ACHAT : Comment le client ideal du user cherche-t-il un prestataire dans ce secteur ?
2. SOURCES CLASSEES : Pour chaque source, donne un score de pertinence (0-10) et explique POURQUOI en 1 phrase.
3. REQUETES OPTIMISEES : Pour chaque source pertinente (score >= 6), donne les mots-cles EXACTS a utiliser.
4. SIGNAUX D'ACHAT SPECIFIQUES : Liste 5-8 signaux specifiques a cette niche.
5. SIGNAUX DE CORRELATION : Donne 3 combinaisons de signaux qui creent un prospect "brulant".
6. DISQUALIFIANTS : Liste 3-4 criteres qui disqualifient un prospect.
7. TIMING OPTIMAL : Meilleur moment pour contacter dans cette niche.
8. MESSAGE D'APPROCHE : Quel angle d'approche fonctionne le mieux.

Reponds en JSON structure :
{
  "buyerJourney": ["etape 1", "etape 2", ...],
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

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const plan = JSON.parse(response.choices[0].message.content);
  return plan;
}
