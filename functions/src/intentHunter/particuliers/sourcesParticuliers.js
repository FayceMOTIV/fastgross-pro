/**
 * Sources Particuliers (B2C) — Intent Hunter
 *
 * 18 sources locales pour detecter les particuliers
 * qui expriment un besoin de vie quotidienne.
 *
 * Groupes :
 *   A — Reseaux locaux geolocalisees (4)
 *   B — Plateformes de demande (4)
 *   C — Evenements de vie (4)
 *   D — Forums niche (6)
 */

export const SOURCE_CONFIGS_PARTICULIERS = [
  // === GROUPE A — Reseaux locaux geolocalisees ===
  {
    id: 'nextdoor',
    name: 'Nextdoor',
    group: 'A',
    platform: 'nextdoor',
    apiType: 'playwright',
    rateLimit: { maxPerMinute: 5, delayMs: 12000 },
    variables: [],
    contactPrimary: 'nextdoor_public_reply',
    contactFallback: 'tel_annuaire',
    enabled: true,
    description: 'Reseau social hyper-local par quartier — signal B2C le plus puissant',
    requiresGeo: true
  },
  {
    id: 'facebook_local',
    name: 'Groupes Facebook Locaux',
    group: 'A',
    platform: 'facebook',
    apiType: 'graph_api',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
    contactPrimary: 'facebook_public_comment',
    contactFallback: 'messenger_dm',
    enabled: true,
    description: 'Bons Plans [Ville], Entraide [Quartier], Voisins [Commune]',
    requiresGeo: true
  },
  {
    id: 'whatsapp_group',
    name: 'Groupes WhatsApp Locaux',
    group: 'A',
    platform: 'whatsapp',
    apiType: 'evolution_api',
    rateLimit: { maxPerMinute: 4, delayMs: 15000 },
    variables: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'],
    contactPrimary: 'whatsapp_group_reply',
    contactFallback: 'whatsapp_dm',
    enabled: true,
    description: 'Groupes commercants, associations, syndicats copropriete',
    requiresGeo: true
  },
  {
    id: 'allovoisins',
    name: 'AlloVoisins / Lebonvoisin',
    group: 'A',
    platform: 'allovoisins',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: [],
    contactPrimary: 'platform_contact_form',
    contactFallback: 'tel_profile',
    enabled: true,
    description: 'Demandes de services entre particuliers et voisins'
  },

  // === GROUPE B — Plateformes de demande ===
  {
    id: 'leboncoin',
    name: 'Leboncoin Services',
    group: 'B',
    platform: 'leboncoin',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: [],
    contactPrimary: 'tel_direct_annonce',
    contactFallback: 'voicemail_drop',
    enabled: true,
    description: 'Services demandes — telephone souvent visible dans l\'annonce'
  },
  {
    id: 'pagesjaunes',
    name: 'PagesJaunes Q&A',
    group: 'B',
    platform: 'pagesjaunes',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: [],
    contactPrimary: 'public_qa_reply',
    contactFallback: 'email',
    enabled: true,
    description: 'Questions publiques type "Ou trouver un bon plombier a Bordeaux ?"'
  },
  {
    id: 'houzz',
    name: 'Houzz / Habitissimo / Travaux.com',
    group: 'B',
    platform: 'houzz',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 8, delayMs: 7500 },
    variables: [],
    contactPrimary: 'platform_contact_form',
    contactFallback: 'email',
    enabled: true,
    description: 'Projets renovation maison avec budget estime'
  },
  {
    id: 'seloger_pap',
    name: 'SeLoger / PAP',
    group: 'B',
    platform: 'seloger',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 8, delayMs: 7500 },
    variables: [],
    contactPrimary: 'email_contact_annonce',
    contactFallback: 'tel_annonce',
    enabled: true,
    description: 'Particulier cherchant logement = demenagement dans 1-3 mois'
  },

  // === GROUPE C — Evenements de vie ===
  {
    id: 'permis_construire',
    name: 'Permis de construire (data.gouv.fr)',
    group: 'C',
    platform: 'data_gouv',
    apiType: 'official',
    rateLimit: { maxPerMinute: 60, delayMs: 1000 },
    variables: [],
    contactPrimary: 'tel_annuaire_nom_adresse',
    contactFallback: 'email_mairie',
    enabled: true,
    description: 'API officielle GRATUITE — permis construire et renovation deposes'
  },
  {
    id: 'bans_mariage',
    name: 'Bans de mariage (mairies)',
    group: 'C',
    platform: 'mairies',
    apiType: 'playwright',
    rateLimit: { maxPerMinute: 5, delayMs: 12000 },
    variables: [],
    contactPrimary: 'email_enrichi',
    contactFallback: 'instagram_dm',
    enabled: true,
    description: 'Publications legales mairies — mariage imminent'
  },
  {
    id: 'facebook_events',
    name: 'Facebook Life Events',
    group: 'C',
    platform: 'facebook',
    apiType: 'graph_api',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: ['FACEBOOK_ACCESS_TOKEN'],
    contactPrimary: 'messenger_dm',
    contactFallback: 'email',
    enabled: true,
    description: 'Fiances, maries, naissance, demenagement'
  },
  {
    id: 'pinterest',
    name: 'Pinterest Boards Publics',
    group: 'C',
    platform: 'pinterest',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: ['PINTEREST_API_KEY'],
    contactPrimary: 'email_enrichi',
    contactFallback: 'instagram_dm',
    enabled: true,
    description: 'Boards "Renovation cuisine 2025", "Mariage 2026", "Notre future maison"'
  },

  // === GROUPE D — Forums niche ===
  {
    id: 'forum_sante',
    name: 'Forums Sante (Doctissimo)',
    group: 'D',
    platform: 'doctissimo',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 12, delayMs: 5000 },
    variables: [],
    contactPrimary: 'public_forum_reply',
    contactFallback: 'email_profile',
    enabled: true,
    description: 'Questions sante → mutuelles, pharmacies, medecines alternatives'
  },
  {
    id: 'forum_auto',
    name: 'Forums Auto (Caradisiac / L\'Argus)',
    group: 'D',
    platform: 'caradisiac',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 12, delayMs: 5000 },
    variables: [],
    contactPrimary: 'public_forum_reply',
    contactFallback: 'email_profile',
    enabled: true,
    description: '"Besoin d\'un bon garagiste sur Lyon ?"'
  },
  {
    id: 'forum_maison',
    name: 'Forums Maison (Commentcamarche, Systemed)',
    group: 'D',
    platform: 'forums_maison',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 12, delayMs: 5000 },
    variables: [],
    contactPrimary: 'public_forum_reply',
    contactFallback: 'email_profile',
    enabled: true,
    description: '"Mon chauffe-eau lache, besoin d\'un plombier urgent"'
  },
  {
    id: 'instagram_local',
    name: 'Instagram Local',
    group: 'D',
    platform: 'instagram',
    apiType: 'microservice',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: [],
    contactPrimary: 'instagram_dm',
    contactFallback: 'email_bio',
    enabled: true,
    description: 'Hashtags geolocalisees : #besoinartisan #rechercheplombier'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    group: 'D',
    platform: 'tiktok',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: [],
    contactPrimary: 'tiktok_comment_reply',
    contactFallback: 'instagram_dm',
    enabled: true,
    description: 'Commentaires publics : "Quelqu\'un peut recommander un bon traiteur ?"'
  },
  {
    id: 'tripadvisor',
    name: 'TripAdvisor / Yelp',
    group: 'D',
    platform: 'tripadvisor',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 8, delayMs: 7500 },
    variables: [],
    contactPrimary: 'email_enrichi',
    contactFallback: 'tel_enrichi',
    enabled: true,
    description: 'Avis 1-3 etoiles sur concurrent B2C = client mecontent'
  }
]

/**
 * Retourne les sources actives pour un plan donne
 * @param {string[]} unlockedSources - Sources deverrouillees par le plan
 * @returns {Object[]} Sources actives
 */
export function getActiveSources(unlockedSources) {
  return SOURCE_CONFIGS_PARTICULIERS.filter(s => unlockedSources.includes(s.id))
}

/**
 * Retourne une source par son ID
 * @param {string} sourceId
 * @returns {Object|null}
 */
export function getSourceById(sourceId) {
  return SOURCE_CONFIGS_PARTICULIERS.find(s => s.id === sourceId) || null
}

/**
 * Retourne les sources par groupe
 * @param {string} group - 'A', 'B', 'C', 'D'
 * @returns {Object[]}
 */
export function getSourcesByGroup(group) {
  return SOURCE_CONFIGS_PARTICULIERS.filter(s => s.group === group)
}
