/**
 * smartSourceSelector.js — Le selecteur de sources intelligent
 * Pour chaque recherche, Alex ne lance PAS toutes les 59 sources.
 * Il selectionne les 8-10 meilleures pour CETTE niche specifique
 * en utilisant le sourceRegistry comme reference.
 */
import { getTopSourcesForNiche } from './sourceRegistry.js';

/**
 * Selectionne les sources optimales pour une recherche.
 * Utilise le searchPlan du nicheReasoner si disponible,
 * sinon le sourceRegistry trie par pertinence pour la niche.
 */
export function selectSources(nicheType, searchPlan, options = {}) {
  const defaultLimit = options.maxSources || 8;
  const hardMax = 10;

  // Si le nicheReasoner a produit un plan, l'utiliser en priorite
  if (searchPlan?.rankedSources) {
    const mustInclude = searchPlan.rankedSources.filter(s => s.score >= 8);
    const canInclude = searchPlan.rankedSources.filter(s => s.score >= 5 && s.score < 8);
    const remaining = Math.min(defaultLimit, hardMax) - mustInclude.length;
    const selected = [...mustInclude, ...canInclude.slice(0, Math.max(0, remaining))];

    return selected.slice(0, hardMax).map(s => ({
      source: s.source,
      relevanceScore: s.score,
      reason: s.reason,
      queries: searchPlan.optimizedQueries?.[s.source] || null,
    }));
  }

  // Sinon, utiliser le registre trie par pertinence pour la niche
  const allSources = getTopSourcesForNiche(nicheType, hardMax);
  const mustInclude = allSources.filter(s => s.relevanceScore >= 8);
  const canInclude = allSources.filter(s => s.relevanceScore >= 5 && s.relevanceScore < 8);
  const remaining = Math.min(defaultLimit, hardMax) - mustInclude.length;
  const selected = [...mustInclude, ...canInclude.slice(0, Math.max(0, remaining))];

  return selected.slice(0, hardMax).map(s => ({
    source: s.id,
    relevanceScore: s.relevanceScore,
    reason: `${s.category} — ${s.description.split(' — ')[1] || s.description}`,
    queries: null,
  }));
}
