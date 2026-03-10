/**
 * leboncoinCessionsMonitor.js — Cessions fonds de commerce sur LeBonCoin
 * Placeholder — necessite Apify actor pour le scraping
 */

export async function monitorLeboncoinCessions(keywords, location) {
  // LeBonCoin bloque le scraping direct
  // Utiliser Apify actor "apify/leboncoin-scraper" en production
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    console.warn('[LeBonCoin] APIFY_API_TOKEN manquant');
    return [];
  }

  try {
    const query = keywords.join(' ');
    const resp = await fetch('https://api.apify.com/v2/acts/apify~leboncoin-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        startUrls: [{
          url: `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query)}&category=71&locations=${encodeURIComponent(location || 'France')}`,
        }],
        maxItems: 20,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) return [];

    const run = await resp.json();
    // In production, wait for run completion and fetch dataset
    return [{
      type: 'business_acquisition',
      source: 'leboncoinCessionsMonitor',
      rawData: { runId: run.data?.id, query, location },
      score: 45,
      status: 'pending_results',
      message: `Recherche cessions : "${query}" ${location || ''}`,
      actionable: true,
    }];
  } catch (error) {
    console.warn(`[LeBonCoin] Erreur:`, error.message);
    return [];
  }
}
