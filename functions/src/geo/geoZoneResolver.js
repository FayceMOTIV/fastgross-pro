/**
 * geoZoneResolver.js
 * Resout n'importe quelle expression geographique en parametres
 * utilisables par SIRENE, Serper, et les autres sources.
 *
 * Entrees acceptees :
 *   - "dans l'Ain" -> { type: 'departement', code: '01', nom: 'Ain' }
 *   - "Lyon" -> { type: 'commune', codeInsee: '69123', codePostal: '69001', lat, lon }
 *   - "autour de Lyon 30km" -> { type: 'radius', lat, lon, radiusKm: 30 }
 *   - "Auvergne-Rhone-Alpes" -> { type: 'region', code: '84', departements: ['01','03',...] }
 *   - "75011" -> { type: 'codePostal', code: '75011', commune: 'Paris 11e' }
 *   - { departement: '01' } -> passthrough direct
 */

import { logger } from 'firebase-functions';

// -- Mapping regions -> departements
const REGIONS_DEPARTEMENTS = {
  '11': ['75','77','78','91','92','93','94','95'],
  '24': ['18','28','36','37','41','45'],
  '27': ['21','25','39','58','70','71','89','90'],
  '28': ['14','27','50','61','76'],
  '32': ['02','59','60','62','80'],
  '44': ['08','10','51','52','54','55','57','67','68','88'],
  '52': ['44','49','53','72','85'],
  '53': ['22','29','35','56'],
  '75': ['16','17','19','23','24','33','40','47','64','79','86','87'],
  '76': ['09','11','12','30','31','32','34','46','48','65','66','81','82'],
  '84': ['01','03','07','15','26','38','42','43','63','69','73','74'],
  '93': ['04','05','06','13','83','84'],
  '94': ['2A','2B'],
};

const REGIONS_NOMS = {
  'ile-de-france': '11', 'idf': '11',
  'centre-val de loire': '24', 'centre': '24',
  'bourgogne-franche-comte': '27', 'bourgogne': '27',
  'normandie': '28',
  'hauts-de-france': '32',
  'grand est': '44', 'alsace': '44', 'lorraine': '44',
  'pays de la loire': '52',
  'bretagne': '53',
  'nouvelle-aquitaine': '75', 'aquitaine': '75',
  'occitanie': '76', 'languedoc': '76', 'midi-pyrenees': '76',
  'auvergne-rhone-alpes': '84', 'auvergne': '84', 'rhone-alpes': '84', 'aura': '84',
  'provence-alpes-cote d\'azur': '93', 'paca': '93',
  'corse': '94',
};

const DEPT_NOMS = {
  'ain': '01', 'aisne': '02', 'allier': '03', 'alpes-de-haute-provence': '04',
  'hautes-alpes': '05', 'alpes-maritimes': '06', 'ardeche': '07', 'ardennes': '08',
  'ariege': '09', 'aube': '10', 'aude': '11', 'aveyron': '12', 'bouches-du-rhone': '13',
  'calvados': '14', 'cantal': '15', 'charente': '16', 'charente-maritime': '17',
  'cher': '18', 'correze': '19', 'cote-d-or': '21', 'cotes-d-armor': '22',
  'creuse': '23', 'dordogne': '24', 'doubs': '25', 'drome': '26', 'eure': '27',
  'eure-et-loir': '28', 'finistere': '29', 'gard': '30', 'haute-garonne': '31',
  'gers': '32', 'gironde': '33', 'herault': '34', 'ille-et-vilaine': '35',
  'indre': '36', 'indre-et-loire': '37', 'isere': '38', 'jura': '39', 'landes': '40',
  'loir-et-cher': '41', 'loire': '42', 'haute-loire': '43', 'loire-atlantique': '44',
  'loiret': '45', 'lot': '46', 'lot-et-garonne': '47', 'lozere': '48',
  'maine-et-loire': '49', 'manche': '50', 'marne': '51', 'haute-marne': '52',
  'mayenne': '53', 'meurthe-et-moselle': '54', 'meuse': '55', 'morbihan': '56',
  'moselle': '57', 'nievre': '58', 'nord': '59', 'oise': '60', 'orne': '61',
  'pas-de-calais': '62', 'puy-de-dome': '63', 'pyrenees-atlantiques': '64',
  'hautes-pyrenees': '65', 'pyrenees-orientales': '66', 'bas-rhin': '67',
  'haut-rhin': '68', 'rhone': '69', 'haute-saone': '70', 'saone-et-loire': '71',
  'sarthe': '72', 'savoie': '73', 'haute-savoie': '74', 'paris': '75',
  'seine-maritime': '76', 'seine-et-marne': '77', 'yvelines': '78',
  'deux-sevres': '79', 'somme': '80', 'tarn': '81', 'tarn-et-garonne': '82',
  'var': '83', 'vaucluse': '84', 'vendee': '85', 'vienne': '86',
  'haute-vienne': '87', 'vosges': '88', 'yonne': '89', 'territoire-de-belfort': '90',
  'essonne': '91', 'hauts-de-seine': '92', 'seine-saint-denis': '93',
  'val-de-marne': '94', 'val-d-oise': '95',
};

/**
 * Resout une expression geographique (texte libre ou objet) en zone normalisee
 * @param {string|object} input - Expression a resoudre
 * @returns {Promise<object>} Zone normalisee
 */
export async function resolveGeoZone(input) {
  if (typeof input === 'object' && input !== null && input.type) return input;
  if (typeof input === 'object' && input !== null && input.departement) {
    return { type: 'departement', code: input.departement, nom: null, sireneFilter: { departement: input.departement } };
  }

  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  const text = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // 1. Code postal (5 chiffres)
  const cpMatch = text.match(/\b(\d{5})\b/);
  if (cpMatch) {
    const cp = cpMatch[1];
    const commune = await fetchCommune({ codePostal: cp });
    return {
      type: 'codePostal',
      code: cp,
      codeDepartement: cp.startsWith('97') ? cp.slice(0, 3) : cp.slice(0, 2),
      commune: commune?.nom || null,
      lat: commune?.centre?.coordinates?.[1] || null,
      lon: commune?.centre?.coordinates?.[0] || null,
      sireneFilter: { code_postal: cp }
    };
  }

  // 2. Rayon GPS "autour de [ville] [N]km"
  const radiusMatch = text.match(/autour de (.+?)\s+(\d+)\s*km/);
  if (radiusMatch) {
    const villeNom = radiusMatch[1].trim();
    const radiusKm = parseInt(radiusMatch[2]);
    const commune = await fetchCommune({ nom: villeNom });
    if (commune) {
      return {
        type: 'radius',
        ville: commune.nom,
        codeDepartement: commune.codeDepartement,
        lat: commune.centre?.coordinates?.[1],
        lon: commune.centre?.coordinates?.[0],
        radiusKm,
        sireneFilter: { departement: commune.codeDepartement }
      };
    }
  }

  // 3. Region par nom (check BEFORE department names to avoid partial matches like "rhone" in "auvergne-rhone-alpes")
  for (const [nom, code] of Object.entries(REGIONS_NOMS)) {
    const normalized = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (text.includes(normalized)) {
      return {
        type: 'region',
        code,
        nom,
        departements: REGIONS_DEPARTEMENTS[code] || [],
        sireneFilter: { region: code }
      };
    }
  }

  // 4. Departement par nom
  for (const [nom, code] of Object.entries(DEPT_NOMS)) {
    const normalized = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (text.includes(normalized)) {
      const dept = await fetchDepartement(code);
      return {
        type: 'departement',
        code,
        nom: dept?.nom || nom.charAt(0).toUpperCase() + nom.slice(1),
        sireneFilter: { departement: code }
      };
    }
  }

  // 5. Departement par numero (2 digits)
  const deptNumMatch = text.match(/\b(0[1-9]|[1-9][0-9]|2[ab])\b/i);
  if (deptNumMatch) {
    const code = deptNumMatch[0].padStart(2, '0').toUpperCase();
    const dept = await fetchDepartement(code);
    return {
      type: 'departement',
      code,
      nom: dept?.nom || null,
      sireneFilter: { departement: code }
    };
  }

  // 6. Ville (fallback geo.api)
  if (text.length > 2) {
    const commune = await fetchCommune({ nom: raw.trim() });
    if (commune) {
      return {
        type: 'commune',
        codeInsee: commune.code,
        nom: commune.nom,
        codeDepartement: commune.codeDepartement,
        codePostal: commune.codesPostaux?.[0] || null,
        lat: commune.centre?.coordinates?.[1] || null,
        lon: commune.centre?.coordinates?.[0] || null,
        sireneFilter: { code_commune: commune.code }
      };
    }
  }

  logger.warn(`geoZoneResolver: impossible de resoudre "${input}" — fallback France`);
  return { type: 'france', nom: 'France', sireneFilter: {} };
}

// -- Helpers API geo.api.gouv.fr

async function fetchCommune({ nom, codePostal }) {
  try {
    const params = new URLSearchParams({
      fields: 'nom,code,codeDepartement,codesPostaux,centre',
      limit: '1'
    });
    if (nom) params.set('nom', nom);
    if (codePostal) params.set('codePostal', codePostal);
    const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function fetchDepartement(code) {
  try {
    const res = await fetch(`https://geo.api.gouv.fr/departements/${code}?fields=nom,code`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Convertit une GeoZone en parametres de requete SIRENE
 */
export function geoZoneToSireneParams(zone) {
  if (!zone) return {};
  if (zone.type === 'region') {
    return { departement: zone.departements?.join(',') || '' };
  }
  if (zone.type === 'radius') {
    return { departement: zone.codeDepartement || '' };
  }
  return zone.sireneFilter || {};
}

/**
 * Convertit une GeoZone en query string Serper Maps
 */
export function geoZoneToSerperQuery(baseQuery, zone) {
  if (!zone) return baseQuery;
  const location = zone.nom || zone.ville || zone.commune || '';
  return location ? `${baseQuery} ${location}` : baseQuery;
}
