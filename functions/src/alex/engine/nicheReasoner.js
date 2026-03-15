/**
 * nicheReasoner.js — Le cerveau strategique
 * Analyse la niche du user et produit un plan de recherche optimise.
 * C'est LE module le plus important de tout FMF.
 */
import Groq from 'groq-sdk';
import { getAllDescriptions, getSourceCount } from './sourceRegistry.js';
import { safeParseLLMJson } from '../../utils/safeParseLLMJson.js';

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
${businessProfile.competitors ? `- Concurrents connus : ${Array.isArray(businessProfile.competitors) ? businessProfile.competitors.join(', ') : businessProfile.competitors}` : ''}
${businessProfile.bestClients ? `- Meilleurs clients actuels : ${JSON.stringify(businessProfile.bestClients)}` : ''}

SOURCES DISPONIBLES (${getSourceCount()} sources — tu dois les classer par pertinence pour CETTE niche) :
${getAllDescriptions()}

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

  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let response;
  for (const model of MODELS) {
    try {
      response = await getGroq().chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });
      break;
    } catch (e) {
      if (e.status === 429 && model === MODELS[0]) {
        console.warn(`[NicheReasoner] Rate limit 70b, fallback → ${MODELS[1]}`);
        continue;
      }
      throw e;
    }
  }

  const plan = safeParseLLMJson(response.choices[0].message.content);
  return plan;
}
