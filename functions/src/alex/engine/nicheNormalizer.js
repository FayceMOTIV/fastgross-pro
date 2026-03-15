/**
 * nicheNormalizer.js — Normalise les noms de niche bruts vers les 16 types du sourceRegistry
 *
 * Probleme resolu : parseMission() retourne des noms bruts ("restaurant", "plombier", "tech")
 * mais selectSources() attend l'un des 16 types predefinis ("restauration", "artisan", "b2b_services").
 * Ce module fait le pont entre les deux.
 */

const SUPPORTED_NICHES = [
  'commerce_local', 'artisan', 'profession_liberale', 'immobilier',
  'ecommerce', 'b2b_services', 'tourisme', 'transport_logistique',
  'energie', 'sante', 'restauration', 'btp_construction',
  'juridique', 'finance_assurance', 'franchise', 'agriculture',
];

/**
 * Mapping statique : mot-cle brut → niche type
 * Couvre le francais (avec et sans accents), les synonymes courants,
 * et les termes que parseMission retourne le plus souvent.
 */
const KEYWORD_MAP = {
  // restauration
  restaurant: 'restauration', restauration: 'restauration', gastronomie: 'restauration',
  gastronomique: 'restauration', brasserie: 'restauration', pizzeria: 'restauration',
  traiteur: 'restauration', snack: 'restauration', boulangerie: 'restauration',
  patisserie: 'restauration', glacier: 'restauration', cafe: 'restauration',
  bar: 'restauration', bistrot: 'restauration', fast_food: 'restauration',
  creperie: 'restauration', kebab: 'restauration',

  // artisan
  artisan: 'artisan', plombier: 'artisan', plomberie: 'artisan',
  electricien: 'artisan', menuisier: 'artisan', macon: 'artisan',
  peintre: 'artisan', couvreur: 'artisan', chauffagiste: 'artisan',
  serrurier: 'artisan', carreleur: 'artisan', charpentier: 'artisan',

  // b2b_services
  b2b_services: 'b2b_services', b2b: 'b2b_services',
  saas: 'b2b_services', tech: 'b2b_services', startup: 'b2b_services',
  logiciel: 'b2b_services', software: 'b2b_services',
  agence: 'b2b_services', marketing: 'b2b_services', communication: 'b2b_services',
  consulting: 'b2b_services', conseil: 'b2b_services', consultant: 'b2b_services',
  formation: 'b2b_services', formateur: 'b2b_services', coaching: 'b2b_services',
  coach: 'b2b_services', infoproduit: 'b2b_services', education: 'b2b_services',
  informatique: 'b2b_services', digital: 'b2b_services', numerique: 'b2b_services',
  cybersecurite: 'b2b_services', cybersecurity: 'b2b_services', cyber: 'b2b_services',
  ia: 'b2b_services', intelligence_artificielle: 'b2b_services',
  ong: 'b2b_services', association: 'b2b_services', humanitaire: 'b2b_services',
  ngo: 'b2b_services', non_profit: 'b2b_services',

  // ecommerce
  ecommerce: 'ecommerce', 'e-commerce': 'ecommerce',
  boutique_en_ligne: 'ecommerce', marketplace: 'ecommerce',
  dropshipping: 'ecommerce', mode: 'ecommerce', vetement: 'ecommerce',
  textile: 'ecommerce', pret_a_porter: 'ecommerce',

  // juridique
  juridique: 'juridique', avocat: 'juridique', notaire: 'juridique',
  huissier: 'juridique', droit: 'juridique', 'expert-comptable': 'juridique',
  expert_comptable: 'juridique', comptable: 'juridique', audit: 'juridique',

  // immobilier
  immobilier: 'immobilier', immo: 'immobilier', agence_immobiliere: 'immobilier',
  gestion_locative: 'immobilier', syndic: 'immobilier', promotion_immobiliere: 'immobilier',

  // sante
  sante: 'sante', medical: 'sante', medecin: 'sante', dentiste: 'sante',
  kine: 'sante', osteo: 'sante', pharmacie: 'sante', clinique: 'sante',
  opticien: 'sante', infirmier: 'sante', psychologue: 'sante',
  orthophoniste: 'sante', 'sage-femme': 'sante', labo: 'sante',

  // commerce_local
  commerce_local: 'commerce_local', commerce: 'commerce_local',
  coiffeur: 'commerce_local', coiffure: 'commerce_local',
  esthetique: 'commerce_local', beaute: 'commerce_local',
  salon: 'commerce_local', barbier: 'commerce_local',
  spa: 'commerce_local', onglerie: 'commerce_local',
  garage: 'commerce_local', mecanique: 'commerce_local',
  fleuriste: 'commerce_local', opticien_local: 'commerce_local',

  // tourisme
  tourisme: 'tourisme', hotel: 'tourisme', hotellerie: 'tourisme',
  camping: 'tourisme', gite: 'tourisme', chambre_dhotes: 'tourisme',
  voyage: 'tourisme', location_vacances: 'tourisme',

  // transport_logistique
  transport: 'transport_logistique', transport_logistique: 'transport_logistique',
  logistique: 'transport_logistique', demenagement: 'transport_logistique',
  livraison: 'transport_logistique', coursier: 'transport_logistique',
  fret: 'transport_logistique',

  // btp_construction
  btp: 'btp_construction', btp_construction: 'btp_construction',
  construction: 'btp_construction', batiment: 'btp_construction',
  promoteur: 'btp_construction', renovation: 'btp_construction',
  terrassement: 'btp_construction',

  // finance_assurance
  finance: 'finance_assurance', finance_assurance: 'finance_assurance',
  assurance: 'finance_assurance', banque: 'finance_assurance',
  courtier: 'finance_assurance', mutuelle: 'finance_assurance',
  patrimoine: 'finance_assurance', credit: 'finance_assurance',
  cgp: 'finance_assurance',

  // energie
  energie: 'energie', photovoltaique: 'energie', solaire: 'energie',
  borne_recharge: 'energie', electricite: 'energie',
  gaz: 'energie', courtage_energie: 'energie',

  // franchise
  franchise: 'franchise', reseau: 'franchise', multi_site: 'franchise',
  enseigne: 'franchise',

  // agriculture
  agriculture: 'agriculture', elevage: 'agriculture', viticulture: 'agriculture',
  maraichage: 'agriculture', cooperative: 'agriculture', agro: 'agriculture',

  // profession_liberale
  profession_liberale: 'profession_liberale', liberal: 'profession_liberale',
  architecte: 'profession_liberale', geometre: 'profession_liberale',
};

/**
 * Regex patterns pour le fuzzy matching en fallback
 * (meme patterns que detectNicheType dans searchOrchestrator.js)
 */
const REGEX_PATTERNS = [
  { pattern: /courtage.{0,5}energie|fournisseur.{0,5}energie|photovolta[ïi]que|panneau.?solaire|borne.{0,5}recharge/i, niche: 'energie' },
  { pattern: /m[eé]decin|dentiste|kin[eé]|ost[eé]o|pharmacie|labo|clinique|opticien|infirmier|sage.?femme|psychologue|orthophoniste/i, niche: 'sante' },
  { pattern: /restaurant|brasserie|pizzeria|traiteur|snack|fast.?food|boulangerie|p[aâ]tisserie|glacier|caf[eé]|bar|bistrot|cr[eê]perie/i, niche: 'restauration' },
  { pattern: /constructeur|promoteur|r[eé]novation|b[aâ]timent|gros.?oeuvre|d[eé]molition|terrassement|charpente/i, niche: 'btp_construction' },
  { pattern: /avocat|notaire|huissier|expert.?comptable|commissaire|juridique|cabinet.?conseil|audit/i, niche: 'juridique' },
  { pattern: /courtier|courtage|assurance|mutuelle|cr[eé]dit|banque|cgp|patrimoine|gestion.?actifs/i, niche: 'finance_assurance' },
  { pattern: /franchise|r[eé]seau|master.?franchise|multi.?site|enseigne/i, niche: 'franchise' },
  { pattern: /agricul|[eé]levage|viticul|mara[iî]ch|exploitation|coop[eé]rative|agro|semence/i, niche: 'agriculture' },
  { pattern: /h[oô]tel|camping|g[iî]te|location.?vacances|tourisme|chambres?.?d.?h[oô]tes/i, niche: 'tourisme' },
  { pattern: /transport|logistique|d[eé]m[eé]nagement|livraison|coursier|fret|messagerie/i, niche: 'transport_logistique' },
  { pattern: /plombier|[eé]lectricien|menuisier|ma[çc]on|peintre|couvreur|chauffagiste|serrurier|carreleur/i, niche: 'artisan' },
  { pattern: /immobilier|agence.?immo|gestion.?locative|syndic|promotion.?immobili[eè]re/i, niche: 'immobilier' },
  { pattern: /boutique.?en.?ligne|e-?commerce|vente.?en.?ligne|marketplace|dropshipping|mode.?f[eé]minine/i, niche: 'ecommerce' },
  { pattern: /saas|logiciel|startup|cybersecurit[eé]|intelligence.?artificielle|informatique|digital|formation|formateur|coach|consulting|ong|humanitaire|association/i, niche: 'b2b_services' },
  { pattern: /agence|consultant|marketing|communication|conseil/i, niche: 'b2b_services' },
  { pattern: /coiffeur|esth[eé]ti|beaut[eé]|salon|barbier|ongle|spa/i, niche: 'commerce_local' },
  { pattern: /garage|auto|m[eé]cani|carrosserie|contr[oô]le.?technique/i, niche: 'commerce_local' },
];

/**
 * Normalise un nom de niche brut vers l'un des 16 types predefinis du sourceRegistry.
 *
 * Strategie en 3 couches :
 * 1. Match exact dans SUPPORTED_NICHES (deja bon)
 * 2. Lookup dans KEYWORD_MAP (mapping statique complet)
 * 3. Regex fuzzy matching en fallback
 * 4. Default : commerce_local
 *
 * @param {string} rawNiche - Nom brut de niche (ex: "restaurant", "plombier", "tech", "mode feminine")
 * @returns {string} L'un des 16 types predefinis du sourceRegistry
 */
export function normalizeNicheType(rawNiche) {
  if (!rawNiche || typeof rawNiche !== 'string') return 'commerce_local';

  // Normaliser : minuscule, trim, remplacer accents et espaces
  const cleaned = rawNiche
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer accents
    .replace(/\s+/g, '_')           // espaces → underscores
    .replace(/['']/g, '_')          // apostrophes
    .replace(/-/g, '_');

  // 1. Match exact dans les 16 types
  if (SUPPORTED_NICHES.includes(cleaned)) return cleaned;

  // 2. Lookup dans le keyword map (avec la version nettoyee)
  if (KEYWORD_MAP[cleaned]) return KEYWORD_MAP[cleaned];

  // 2b. Essayer aussi avec la version originale (pour les clefs avec tirets/accents)
  const rawLower = rawNiche.toLowerCase().trim();
  if (KEYWORD_MAP[rawLower]) return KEYWORD_MAP[rawLower];

  // 2c. Essayer chaque mot individuellement
  const words = cleaned.split('_').filter(w => w.length > 2);
  for (const word of words) {
    if (KEYWORD_MAP[word]) return KEYWORD_MAP[word];
  }

  // 3. Regex fuzzy matching sur le texte original
  for (const { pattern, niche } of REGEX_PATTERNS) {
    if (pattern.test(rawNiche)) return niche;
  }

  // 4. Default
  return 'commerce_local';
}

/**
 * Version batch : normalise un tableau de niches
 */
export function normalizeNicheTypes(rawNiches) {
  return rawNiches.map(normalizeNicheType);
}

export { SUPPORTED_NICHES };
