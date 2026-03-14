/**
 * googleMapsScanner.js — Recherche Google Maps via Serper.dev Maps API
 *
 * Utilise l'endpoint Maps de Serper (POST https://google.serper.dev/maps)
 * pour trouver des commerces/entreprises locales.
 *
 * Cout: utilise le quota Serper existant (2500 free/mois)
 */

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

/**
 * Recherche sur Google Maps via Serper.dev
 *
 * @param {Object} params
 * @param {string[]} [params.keywords] - Mots-cles de recherche (ex: ["restaurant", "pizzeria"])
 * @param {string} [params.keyword] - Mot-cle unique (fallback)
 * @param {string} [params.location] - Localisation (ex: "Paris", "Lyon 6e")
 * @param {number} [params.radius] - Rayon en km (informatif, Serper gere via location)
 * @param {number} [params.maxResults=20] - Nombre max de resultats
 * @returns {Promise<Array>} Prospects au format FMF standard
 */
export async function scanGoogleMaps(params = {}) {
  const {
    keywords = [],
    keyword,
    location = 'France',
    maxResults = 20,
  } = params;

  if (!SERPER_API_KEY) {
    console.warn('[GoogleMapsScanner] SERPER_API_KEY non configure');
    return [];
  }

  const searchTerms = keywords.length > 0 ? keywords : (keyword ? [keyword] : []);

  if (searchTerms.length === 0) {
    console.warn('[GoogleMapsScanner] Aucun mot-cle fourni');
    return [];
  }

  const allPlaces = [];
  const seen = new Set();

  // Limiter a 3 requetes max pour ne pas exploser le quota
  for (const term of searchTerms.slice(0, 3)) {
    try {
      const query = `${term} ${location}`.trim();
      console.log(`[GoogleMapsScanner] Serper Maps: "${query}"`);

      const response = await fetch('https://google.serper.dev/maps', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: Math.min(maxResults, 20),
          gl: 'fr',
          hl: 'fr',
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[GoogleMapsScanner] Serper HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const places = data.places || [];

      for (const place of places) {
        // Dedup par CID ou nom+adresse
        const key = place.cid || `${place.title}_${place.address}`;
        if (seen.has(key)) continue;
        seen.add(key);

        allPlaces.push(normalizePlace(place, term));
      }
    } catch (error) {
      console.warn(`[GoogleMapsScanner] Erreur recherche "${term}": ${error.message}`);
    }
  }

  console.log(`[GoogleMapsScanner] ${allPlaces.length} resultats uniques`);
  return allPlaces.slice(0, maxResults);
}

/**
 * Normalise un resultat Serper Maps vers le format prospect FMF
 */
function normalizePlace(place, searchTerm) {
  return {
    companyName: place.title || null,
    contactName: null,
    email: null,
    phone: place.phoneNumber || null,
    website: place.website || null,
    city: extractCity(place.address),
    codePostal: extractCodePostal(place.address),
    sector: place.category || searchTerm || null,
    siret: null,
    codeNaf: null,
    effectif: null,
    adresse: place.address || null,
    rating: place.rating || null,
    reviewCount: place.ratingCount || 0,
    latitude: place.latitude || null,
    longitude: place.longitude || null,
    cid: place.cid || null,
    source: 'google_maps',
    signals: buildSignals(place),
  };
}

/**
 * Construit les signaux de scoring depuis les donnees Google Maps
 */
function buildSignals(place) {
  const signals = [
    { type: 'maps_presence', score: 50, detail: 'Present sur Google Maps' },
  ];

  // Bonus rating
  if (place.rating) {
    if (place.rating >= 4.5) {
      signals.push({ type: 'high_rating', score: 20, detail: `Note ${place.rating}/5` });
    } else if (place.rating < 3.5) {
      signals.push({ type: 'low_rating', score: 15, detail: `Note basse ${place.rating}/5 — besoin amelioration` });
    }
  }

  // Bonus avis
  if (place.ratingCount) {
    if (place.ratingCount > 100) {
      signals.push({ type: 'many_reviews', score: 15, detail: `${place.ratingCount} avis` });
    } else if (place.ratingCount < 10) {
      signals.push({ type: 'few_reviews', score: 10, detail: `Seulement ${place.ratingCount} avis — potentiel` });
    }
  }

  // Bonus site web
  if (place.website) {
    signals.push({ type: 'has_website', score: 10, detail: 'Site web present' });
  } else {
    signals.push({ type: 'no_website', score: 20, detail: 'Pas de site web — besoin digital fort' });
  }

  return signals;
}

/**
 * Extrait le code postal depuis une adresse Google Maps
 */
function extractCodePostal(address) {
  if (!address) return null;
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

/**
 * Extrait la ville depuis une adresse Google Maps (apres le code postal)
 */
function extractCity(address) {
  if (!address) return null;
  const match = address.match(/\b\d{5}\s+([A-Za-zÀ-ÿ\s-]+)/);
  return match ? match[1].trim() : null;
}
