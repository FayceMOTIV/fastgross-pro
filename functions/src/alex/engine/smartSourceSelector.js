/**
 * smartSourceSelector.js — Le selecteur de sources intelligent
 * Pour chaque recherche, Alex ne lance PAS toutes les 20 sources.
 * Il selectionne les 3-5 meilleures pour CETTE niche specifique.
 */

const DEFAULT_SOURCE_RELEVANCE = {
  // COMMERCES LOCAUX (restaurants, coiffeurs, boulangers...)
  commerce_local: {
    top: ['google_maps_scan', 'google_reviews_monitor', 'competitor_reviews', 'website_scan'],
    medium: ['sirene_search', 'social_scan', 'forums_scan'],
    low: ['france_travail', 'ct_logs', 'pappers_financial'],
    irrelevant: ['leboncoin_monitor'],
  },

  // ARTISANS (plombier, electricien, menuisier...)
  artisan: {
    top: ['google_maps_scan', 'forums_scan', 'permis_construire', 'google_reviews_monitor'],
    medium: ['sirene_search', 'weather_seasonal', 'competitor_reviews'],
    low: ['social_scan', 'website_scan'],
    irrelevant: ['france_travail', 'ct_logs', 'pappers_financial'],
  },

  // PROFESSIONS LIBERALES (avocats, dentistes, architectes...)
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
 * Selectionne les sources optimales pour une recherche.
 * Utilise le searchPlan du nicheReasoner si disponible, sinon les defauts.
 */
export function selectSources(nicheType, searchPlan, options = {}) {
  const maxSources = options.maxSources || 5;

  // Si le nicheReasoner a produit un plan, l'utiliser
  if (searchPlan?.rankedSources) {
    return searchPlan.rankedSources
      .filter(s => s.score >= 6)
      .slice(0, maxSources)
      .map(s => ({
        source: s.source,
        relevanceScore: s.score,
        reason: s.reason,
        queries: searchPlan.optimizedQueries?.[s.source] || null,
      }));
  }

  // Sinon, utiliser les defauts
  const defaults = DEFAULT_SOURCE_RELEVANCE[nicheType] || DEFAULT_SOURCE_RELEVANCE.commerce_local;

  const selected = [];

  // Prendre toutes les sources "top" (max 3)
  for (const source of defaults.top.slice(0, 3)) {
    selected.push({ source, relevanceScore: 9, reason: 'Source prioritaire pour cette niche' });
  }

  // Completer avec les "medium" si besoin
  if (selected.length < maxSources) {
    for (const source of defaults.medium) {
      if (selected.length >= maxSources) break;
      selected.push({ source, relevanceScore: 7, reason: 'Source complementaire' });
    }
  }

  return selected;
}
