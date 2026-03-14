/**
 * sireneSearch.js — Recherche SIRENE via Pappers API
 *
 * Utilise l'API Pappers (recherche avancee) pour trouver des entreprises
 * par code NAF + localisation geographique.
 *
 * Pappers free tier: 10 000 fiches/mois
 * Docs: https://www.pappers.fr/api/documentation
 */

const PAPPERS_BASE = 'https://api.pappers.fr/v2';

function getToken() {
  const token = process.env.PAPPERS_API_TOKEN || process.env.PAPPERS_API_KEY;
  if (!token) {
    throw new Error('PAPPERS_API_TOKEN non configure');
  }
  return token;
}

/**
 * Recherche des entreprises via SIRENE (Pappers)
 *
 * @param {Object} params
 * @param {string} [params.codeNaf] - Code NAF (ex: "56.10A")
 * @param {string} [params.location] - Ville ou departement
 * @param {string} [params.codePostal] - Code postal
 * @param {string} [params.departement] - Numero departement (ex: "75")
 * @param {number} [params.radius] - Rayon en km (non supporte nativement, utilise departement)
 * @param {string} [params.activity] - Texte libre pour recherche
 * @param {number} [params.maxResults=30] - Nombre max de resultats
 * @returns {Promise<Array>} Prospects au format FMF standard
 */
export async function searchSirene(params = {}) {
  const {
    codeNaf,
    location,
    codePostal,
    departement,
    activity,
    maxResults = 30,
  } = params;

  if (!codeNaf && !activity && !location) {
    console.warn('[SireneSearch] Parametres insuffisants (codeNaf ou activity requis)');
    return [];
  }

  let token;
  try {
    token = getToken();
  } catch {
    console.warn('[SireneSearch] Pappers non configure, retour vide');
    return [];
  }

  const searchParams = new URLSearchParams({
    api_token: token,
    par_page: String(Math.min(maxResults, 50)),
    entreprise_cessee: 'false',
    precision: 'standard',
  });

  // Code NAF
  if (codeNaf) {
    const cleaned = codeNaf.replace(/\./g, '');
    searchParams.set('code_naf', cleaned);
  }

  // Localisation
  if (departement) {
    searchParams.set('departement', departement);
  } else if (codePostal) {
    searchParams.set('code_postal', codePostal);
  } else if (location) {
    // Extraire departement depuis location si possible
    const dept = extractDepartement(location);
    if (dept) {
      searchParams.set('departement', dept);
    } else {
      // Recherche texte avec ville
      searchParams.set('q', location);
    }
  }

  // Recherche texte libre
  if (activity && !searchParams.has('q')) {
    searchParams.set('q', activity);
  }

  try {
    const url = `${PAPPERS_BASE}/recherche?${searchParams.toString()}`;
    console.log(`[SireneSearch] Requete Pappers: code_naf=${codeNaf || '-'}, location=${location || departement || codePostal || '-'}`);

    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });

    if (response.status === 401) {
      console.error('[SireneSearch] Token Pappers invalide');
      return [];
    }
    if (response.status === 429) {
      console.warn('[SireneSearch] Quota Pappers depasse');
      return [];
    }
    if (!response.ok) {
      console.error(`[SireneSearch] HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.resultats || data.results || [];

    console.log(`[SireneSearch] ${results.length} entreprises trouvees`);

    return results.map(normalizeToProspect).filter(Boolean);
  } catch (error) {
    console.error(`[SireneSearch] Erreur: ${error.message}`);
    return [];
  }
}

/**
 * Normalise un resultat Pappers vers le format prospect FMF
 */
function normalizeToProspect(data) {
  if (!data) return null;

  const siege = data.siege || {};

  // Extraire dirigeant
  let contactName = null;
  if (data.representants?.length > 0) {
    const rep = data.representants[0];
    const prenom = rep.prenom || '';
    const nom = rep.nom_patronymique || rep.nom || '';
    contactName = [prenom, nom].filter(Boolean).join(' ') || null;
  }

  return {
    companyName: data.nom_entreprise || data.denomination || data.nom_commercial || null,
    contactName,
    email: null, // Pappers ne fournit pas d'email
    phone: null, // Pappers ne fournit pas de telephone
    website: null,
    city: siege.ville || null,
    codePostal: siege.code_postal || null,
    sector: data.libelle_code_naf || null,
    siret: siege.siret || data.siret || null,
    siren: data.siren || null,
    codeNaf: data.code_naf || siege.code_naf || null,
    effectif: data.tranche_effectif || null,
    formeJuridique: data.forme_juridique || null,
    dateCreation: data.date_creation || null,
    adresse: siege.adresse_ligne_1 || null,
    chiffreAffaires: data.chiffre_affaires || null,
    source: 'sirene',
    signals: [
      { type: 'sirene_verified', score: 70, detail: 'Entreprise active au RCS' },
    ],
  };
}

/**
 * Tente d'extraire un numero de departement depuis un texte de localisation
 */
function extractDepartement(location) {
  if (!location) return null;
  const lower = location.toLowerCase().trim();

  // Code postal direct (5 chiffres)
  const cpMatch = lower.match(/^(\d{5})$/);
  if (cpMatch) return cpMatch[1].substring(0, 2);

  // Departement direct (2-3 chiffres)
  const deptMatch = lower.match(/^(\d{2,3})$/);
  if (deptMatch) return deptMatch[1];

  // Villes principales
  const CITY_MAP = {
    paris: '75', lyon: '69', marseille: '13', toulouse: '31',
    nice: '06', nantes: '44', montpellier: '34', strasbourg: '67',
    bordeaux: '33', lille: '59', rennes: '35', reims: '51',
    toulon: '83', grenoble: '38', dijon: '21', angers: '49',
    brest: '29', tours: '37', rouen: '76', caen: '14',
    nancy: '54', avignon: '84', cannes: '06',
  };

  return CITY_MAP[lower] || null;
}
