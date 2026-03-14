/**
 * sourceRegistry.js — Registre central des 500 sources de prospection
 *
 * Chaque source a :
 * - id : identifiant unique
 * - category : categorie (annuaire, emploi, avis, etc.)
 * - description : description courte pour le prompt Groq
 * - serperConfig : { site, queryTemplate } pour construire des requetes Serper site:xxx
 * - nativeModule : chemin d'import si un module natif existe (prioritaire sur Serper)
 * - nicheRelevance : { niche: score 0-10 } — pertinence par niche
 */

const SOURCES = [
  // ============================================================
  // ANNUAIRE (9 sources)
  // ============================================================
  {
    id: 'pagesjaunes',
    category: 'annuaire',
    description: 'PagesJaunes — annuaire pro France, fiches entreprises avec tel/adresse/avis',
    serperConfig: { site: 'pagesjaunes.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 10, artisan: 10, profession_liberale: 9, immobilier: 8,
      ecommerce: 3, b2b_services: 6, tourisme: 9, transport_logistique: 7,
    },
  },
  {
    id: 'kompass',
    category: 'annuaire',
    description: 'Kompass — annuaire B2B international, dirigeants et CA',
    serperConfig: { site: 'kompass.com', queryTemplate: '{target} {location} France' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 2, profession_liberale: 4, immobilier: 3,
      ecommerce: 5, b2b_services: 9, tourisme: 3, transport_logistique: 8,
    },
  },
  {
    id: 'europages',
    category: 'annuaire',
    description: 'Europages — annuaire B2B europeen, fournisseurs et fabricants',
    serperConfig: { site: 'europages.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 3, profession_liberale: 2, immobilier: 2,
      ecommerce: 6, b2b_services: 8, tourisme: 2, transport_logistique: 7,
    },
  },
  {
    id: 'societe_com',
    category: 'annuaire',
    description: 'Societe.com — fiches entreprises, dirigeants, bilans, SIRET',
    serperConfig: { site: 'societe.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 6, artisan: 5, profession_liberale: 7, immobilier: 7,
      ecommerce: 5, b2b_services: 8, tourisme: 5, transport_logistique: 7,
    },
  },
  {
    id: '118712',
    category: 'annuaire',
    description: '118712 — annuaire telephonique et pages pro',
    serperConfig: { site: '118712.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 7, artisan: 7, profession_liberale: 6, immobilier: 5,
      ecommerce: 2, b2b_services: 4, tourisme: 6, transport_logistique: 5,
    },
  },
  {
    id: 'mappy',
    category: 'annuaire',
    description: 'Mappy — annuaire geolocalise, horaires et avis',
    serperConfig: { site: 'mappy.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 6, profession_liberale: 5, immobilier: 5,
      ecommerce: 2, b2b_services: 3, tourisme: 7, transport_logistique: 4,
    },
  },
  {
    id: 'hotfrog',
    category: 'annuaire',
    description: 'Hotfrog — annuaire PME France, categories sectorielles',
    serperConfig: { site: 'hotfrog.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 5, profession_liberale: 4, immobilier: 3,
      ecommerce: 3, b2b_services: 6, tourisme: 4, transport_logistique: 5,
    },
  },
  {
    id: 'yelp_france',
    category: 'annuaire',
    description: 'Yelp France — avis et fiches commerce locaux',
    serperConfig: { site: 'yelp.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 5, profession_liberale: 5, immobilier: 3,
      ecommerce: 2, b2b_services: 3, tourisme: 8, transport_logistique: 2,
    },
  },
  {
    id: 'cylex',
    category: 'annuaire',
    description: 'Cylex — annuaire entreprises France avec horaires et avis',
    serperConfig: { site: 'cylex.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 5, profession_liberale: 4, immobilier: 3,
      ecommerce: 2, b2b_services: 5, tourisme: 4, transport_logistique: 4,
    },
  },

  // ============================================================
  // EMPLOI (6 sources)
  // ============================================================
  {
    id: 'indeed',
    category: 'emploi',
    description: 'Indeed — offres emploi (signal de croissance/recrutement)',
    serperConfig: { site: 'indeed.fr', queryTemplate: '{target} {location} emploi' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 4, profession_liberale: 5, immobilier: 6,
      ecommerce: 6, b2b_services: 8, tourisme: 6, transport_logistique: 8,
    },
  },
  {
    id: 'welcometothejungle',
    category: 'emploi',
    description: 'Welcome to the Jungle — recrutement tech/startup (signal croissance)',
    serperConfig: { site: 'welcometothejungle.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 1, profession_liberale: 3, immobilier: 3,
      ecommerce: 7, b2b_services: 9, tourisme: 2, transport_logistique: 4,
    },
  },
  {
    id: 'linkedin_jobs',
    category: 'emploi',
    description: 'LinkedIn Jobs — offres emploi LinkedIn (signal croissance B2B)',
    serperConfig: { site: 'linkedin.com/jobs', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 2, profession_liberale: 5, immobilier: 6,
      ecommerce: 7, b2b_services: 9, tourisme: 3, transport_logistique: 6,
    },
  },
  {
    id: 'france_travail',
    category: 'emploi',
    description: 'France Travail (ex-Pole Emploi) — offres emploi publiques, signal recrutement',
    serperConfig: { site: 'francetravail.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 5, profession_liberale: 4, immobilier: 5,
      ecommerce: 4, b2b_services: 7, tourisme: 6, transport_logistique: 8,
    },
  },
  {
    id: 'apec',
    category: 'emploi',
    description: 'APEC — emploi cadres, signal croissance entreprise',
    serperConfig: { site: 'apec.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 1, profession_liberale: 4, immobilier: 5,
      ecommerce: 5, b2b_services: 8, tourisme: 3, transport_logistique: 5,
    },
  },
  {
    id: 'glassdoor',
    category: 'emploi',
    description: 'Glassdoor — avis employes et offres, signal culture entreprise',
    serperConfig: { site: 'glassdoor.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 1, profession_liberale: 3, immobilier: 4,
      ecommerce: 5, b2b_services: 7, tourisme: 3, transport_logistique: 5,
    },
  },

  // ============================================================
  // AVIS (6 sources)
  // ============================================================
  {
    id: 'google_reviews',
    category: 'avis',
    description: 'Google Reviews — avis Google Maps, note et volume (signal reputation)',
    serperConfig: { site: null, queryTemplate: '{target} {location} avis Google' },
    nativeModule: '../../scanner/sources/googleMapsScanner.js',
    nicheRelevance: {
      commerce_local: 10, artisan: 9, profession_liberale: 8, immobilier: 7,
      ecommerce: 4, b2b_services: 6, tourisme: 10, transport_logistique: 5,
    },
  },
  {
    id: 'trustpilot',
    category: 'avis',
    description: 'Trustpilot — avis consommateurs, signal qualite/insatisfaction',
    serperConfig: { site: 'trustpilot.com', queryTemplate: '{target} avis' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 3, profession_liberale: 4, immobilier: 5,
      ecommerce: 9, b2b_services: 7, tourisme: 7, transport_logistique: 6,
    },
  },
  {
    id: 'tripadvisor',
    category: 'avis',
    description: 'TripAdvisor — avis restaurants/hotels/tourisme',
    serperConfig: { site: 'tripadvisor.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 7, artisan: 1, profession_liberale: 1, immobilier: 2,
      ecommerce: 1, b2b_services: 2, tourisme: 10, transport_logistique: 2,
    },
  },
  {
    id: 'avis_verifies',
    category: 'avis',
    description: 'Avis Verifies — plateforme avis certifies ecommerce FR',
    serperConfig: { site: 'avis-verifies.com', queryTemplate: '{target}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 2, profession_liberale: 3, immobilier: 3,
      ecommerce: 8, b2b_services: 5, tourisme: 4, transport_logistique: 3,
    },
  },
  {
    id: 'g2',
    category: 'avis',
    description: 'G2 — avis logiciels B2B, signal insatisfaction outil actuel',
    serperConfig: { site: 'g2.com', queryTemplate: '{target} reviews' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 2,
      ecommerce: 5, b2b_services: 9, tourisme: 1, transport_logistique: 3,
    },
  },
  {
    id: 'capterra',
    category: 'avis',
    description: 'Capterra — comparateur logiciels, signal recherche solution',
    serperConfig: { site: 'capterra.fr', queryTemplate: '{target} logiciel' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 2,
      ecommerce: 5, b2b_services: 8, tourisme: 1, transport_logistique: 3,
    },
  },

  // ============================================================
  // SOCIAL (5 sources)
  // ============================================================
  {
    id: 'instagram_profiles',
    category: 'social',
    description: 'Instagram — profils business, engagement, signal presence digitale',
    serperConfig: { site: 'instagram.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 6, profession_liberale: 5, immobilier: 7,
      ecommerce: 9, b2b_services: 6, tourisme: 9, transport_logistique: 3,
    },
  },
  {
    id: 'facebook_pages',
    category: 'social',
    description: 'Facebook Pages — pages pro, avis, engagement local',
    serperConfig: { site: 'facebook.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 7, profession_liberale: 5, immobilier: 6,
      ecommerce: 6, b2b_services: 5, tourisme: 8, transport_logistique: 4,
    },
  },
  {
    id: 'tiktok_profiles',
    category: 'social',
    description: 'TikTok — profils business, viralite, signal marketing digital',
    serperConfig: { site: 'tiktok.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 6, artisan: 3, profession_liberale: 2, immobilier: 4,
      ecommerce: 8, b2b_services: 4, tourisme: 7, transport_logistique: 2,
    },
  },
  {
    id: 'twitter_profiles',
    category: 'social',
    description: 'X/Twitter — profils entreprises, veille sectorielle',
    serperConfig: { site: 'x.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 2, profession_liberale: 4, immobilier: 3,
      ecommerce: 5, b2b_services: 7, tourisme: 4, transport_logistique: 3,
    },
  },
  {
    id: 'youtube_channels',
    category: 'social',
    description: 'YouTube — chaines entreprises, signal marketing contenu',
    serperConfig: { site: 'youtube.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 4, profession_liberale: 3, immobilier: 5,
      ecommerce: 7, b2b_services: 6, tourisme: 6, transport_logistique: 3,
    },
  },

  // ============================================================
  // OPENDATA (8 sources)
  // ============================================================
  {
    id: 'bodacc',
    category: 'opendata',
    description: 'BODACC — creations/radiations/cessions, signal nouvelle entreprise',
    serperConfig: { site: 'bodacc.fr', queryTemplate: '{target} {location} creation' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 7, artisan: 7, profession_liberale: 6, immobilier: 7,
      ecommerce: 5, b2b_services: 7, tourisme: 5, transport_logistique: 6,
    },
  },
  {
    id: 'inpi_rcs',
    category: 'opendata',
    description: 'INPI/RCS — registre commerce, immatriculations, signal creation',
    serperConfig: { site: 'data.inpi.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 6, artisan: 6, profession_liberale: 5, immobilier: 6,
      ecommerce: 5, b2b_services: 7, tourisme: 4, transport_logistique: 6,
    },
  },
  {
    id: 'rge_ademe',
    category: 'opendata',
    description: 'RGE ADEME — artisans certifies renovation energetique',
    serperConfig: { site: 'france-renov.gouv.fr', queryTemplate: '{target} {location} RGE' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 10, profession_liberale: 1, immobilier: 5,
      ecommerce: 1, b2b_services: 2, tourisme: 1, transport_logistique: 1,
    },
  },
  {
    id: 'qualiopi',
    category: 'opendata',
    description: 'Qualiopi — organismes de formation certifies',
    serperConfig: { site: null, queryTemplate: '{target} {location} qualiopi certification' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 2, profession_liberale: 3, immobilier: 2,
      ecommerce: 2, b2b_services: 7, tourisme: 2, transport_logistique: 3,
    },
  },
  {
    id: 'bio_agence',
    category: 'opendata',
    description: 'Agence Bio — annuaire producteurs/commercants bio certifies',
    serperConfig: { site: 'annuaire.agencebio.org', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 6, artisan: 2, profession_liberale: 1, immobilier: 1,
      ecommerce: 4, b2b_services: 2, tourisme: 5, transport_logistique: 3,
    },
  },
  {
    id: 'subventions',
    category: 'opendata',
    description: 'Subventions publiques — aides recues, signal investissement',
    serperConfig: { site: null, queryTemplate: '{target} {location} subvention aide publique' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 5, profession_liberale: 3, immobilier: 4,
      ecommerce: 4, b2b_services: 6, tourisme: 5, transport_logistique: 5,
    },
  },
  {
    id: 'ct_logs',
    category: 'opendata',
    description: 'Certificate Transparency Logs — nouveaux sites web .fr crees',
    serperConfig: { site: null, queryTemplate: '{target} nouveau site web {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 3,
      ecommerce: 7, b2b_services: 7, tourisme: 3, transport_logistique: 2,
    },
  },
  {
    id: 'france_travail_api',
    category: 'opendata',
    description: 'API France Travail — offres emploi structurees (ROME/NAF)',
    serperConfig: { site: 'francetravail.io', queryTemplate: '{target} {location} offre emploi' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 4, profession_liberale: 4, immobilier: 5,
      ecommerce: 5, b2b_services: 7, tourisme: 5, transport_logistique: 7,
    },
  },

  // ============================================================
  // IMMO (4 sources)
  // ============================================================
  {
    id: 'seloger',
    category: 'immo',
    description: 'SeLoger — annonces immobilieres, signal agences actives',
    serperConfig: { site: 'seloger.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 3, profession_liberale: 2, immobilier: 10,
      ecommerce: 1, b2b_services: 2, tourisme: 3, transport_logistique: 2,
    },
  },
  {
    id: 'logic_immo',
    category: 'immo',
    description: 'Logic-Immo — annonces immobilieres, agents et promoteurs',
    serperConfig: { site: 'logic-immo.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 3, profession_liberale: 1, immobilier: 9,
      ecommerce: 1, b2b_services: 2, tourisme: 2, transport_logistique: 1,
    },
  },
  {
    id: 'leboncoin_immo',
    category: 'immo',
    description: 'Leboncoin Immobilier — annonces immo, agences et particuliers',
    serperConfig: { site: 'leboncoin.fr/immobilier', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 4, profession_liberale: 1, immobilier: 9,
      ecommerce: 2, b2b_services: 2, tourisme: 3, transport_logistique: 2,
    },
  },
  {
    id: 'permis_construire',
    category: 'immo',
    description: 'Permis de construire — dossiers deposes, signal BTP/renovation',
    serperConfig: { site: null, queryTemplate: 'permis construire {location} recent' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 10, profession_liberale: 1, immobilier: 8,
      ecommerce: 1, b2b_services: 2, tourisme: 2, transport_logistique: 1,
    },
  },

  // ============================================================
  // MARCHES PUBLICS (3 sources)
  // ============================================================
  {
    id: 'boamp',
    category: 'marches',
    description: 'BOAMP — appels offres publics, marches etat/collectivites',
    serperConfig: { site: 'boamp.fr', queryTemplate: '{target} {location} marche public' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 6, profession_liberale: 4, immobilier: 3,
      ecommerce: 2, b2b_services: 8, tourisme: 2, transport_logistique: 7,
    },
  },
  {
    id: 'marches_publics',
    category: 'marches',
    description: 'PLACE — plateforme marches publics, appels offres en cours',
    serperConfig: { site: 'marches-publics.gouv.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 6, profession_liberale: 4, immobilier: 3,
      ecommerce: 2, b2b_services: 7, tourisme: 2, transport_logistique: 7,
    },
  },
  {
    id: 'achat_public',
    category: 'marches',
    description: 'Achat-Public — veille marches publics et DCE',
    serperConfig: { site: 'achatpublic.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 5, profession_liberale: 3, immobilier: 2,
      ecommerce: 2, b2b_services: 7, tourisme: 1, transport_logistique: 6,
    },
  },

  // ============================================================
  // PRESSE (4 sources)
  // ============================================================
  {
    id: 'presse_locale',
    category: 'presse',
    description: 'Presse locale — ouvertures/fermetures commerces, actualites locales',
    serperConfig: { site: null, queryTemplate: '{target} {location} ouverture nouveau' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 5, profession_liberale: 4, immobilier: 5,
      ecommerce: 3, b2b_services: 5, tourisme: 7, transport_logistique: 4,
    },
  },
  {
    id: 'communiques_presse',
    category: 'presse',
    description: 'Communiques de presse — levees, partenariats, lancements',
    serperConfig: { site: null, queryTemplate: '{target} communique presse {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 4,
      ecommerce: 5, b2b_services: 7, tourisme: 4, transport_logistique: 5,
    },
  },
  {
    id: 'levees_fonds',
    category: 'presse',
    description: 'Levees de fonds — startups financees, signal croissance rapide',
    serperConfig: { site: null, queryTemplate: '{target} levee de fonds {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 3,
      ecommerce: 7, b2b_services: 9, tourisme: 2, transport_logistique: 4,
    },
  },
  {
    id: 'frenchtech_news',
    category: 'presse',
    description: 'French Tech / Maddyness — actualites startup FR',
    serperConfig: { site: 'maddyness.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 2,
      ecommerce: 6, b2b_services: 9, tourisme: 2, transport_logistique: 3,
    },
  },

  // ============================================================
  // FORUMS (4 sources)
  // ============================================================
  {
    id: 'reddit_france',
    category: 'forums',
    description: 'Reddit France — discussions, recommandations, demandes de prestataires',
    serperConfig: { site: 'reddit.com/r/france', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 6, profession_liberale: 4, immobilier: 5,
      ecommerce: 5, b2b_services: 6, tourisme: 4, transport_logistique: 4,
    },
  },
  {
    id: 'facebook_groups',
    category: 'forums',
    description: 'Groupes Facebook — groupes locaux, entraide, recommandations',
    serperConfig: { site: 'facebook.com/groups', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 8, artisan: 8, profession_liberale: 4, immobilier: 6,
      ecommerce: 4, b2b_services: 5, tourisme: 7, transport_logistique: 4,
    },
  },
  {
    id: 'quora_fr',
    category: 'forums',
    description: 'Quora francophone — questions/reponses, signal besoin',
    serperConfig: { site: 'fr.quora.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 3, artisan: 4, profession_liberale: 4, immobilier: 4,
      ecommerce: 4, b2b_services: 5, tourisme: 3, transport_logistique: 3,
    },
  },
  {
    id: 'forums_specialises',
    category: 'forums',
    description: 'Forums specialises — forums de niche par secteur (BTP, restauration, etc.)',
    serperConfig: { site: null, queryTemplate: 'forum {target} {location} cherche prestataire' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 7, profession_liberale: 5, immobilier: 5,
      ecommerce: 4, b2b_services: 6, tourisme: 4, transport_logistique: 5,
    },
  },

  // ============================================================
  // ECOMMERCE (3 sources)
  // ============================================================
  {
    id: 'amazon_sellers',
    category: 'ecommerce',
    description: 'Amazon Marketplace — vendeurs tiers FR, signal ecommerce actif',
    serperConfig: { site: 'amazon.fr', queryTemplate: '{target} vendeur' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 2, artisan: 1, profession_liberale: 1, immobilier: 1,
      ecommerce: 9, b2b_services: 3, tourisme: 1, transport_logistique: 4,
    },
  },
  {
    id: 'etsy_shops',
    category: 'ecommerce',
    description: 'Etsy — boutiques artisanales, createurs FR',
    serperConfig: { site: 'etsy.com', queryTemplate: '{target} France {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 7, profession_liberale: 1, immobilier: 1,
      ecommerce: 8, b2b_services: 2, tourisme: 3, transport_logistique: 1,
    },
  },
  {
    id: 'leboncoin_pro',
    category: 'ecommerce',
    description: 'Leboncoin Pro — annonces pros, signal activite commerciale',
    serperConfig: { site: 'leboncoin.fr', queryTemplate: '{target} {location} professionnel' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 6, artisan: 5, profession_liberale: 2, immobilier: 6,
      ecommerce: 5, b2b_services: 3, tourisme: 3, transport_logistique: 5,
    },
  },

  // ============================================================
  // FINANCIAL (3 sources)
  // ============================================================
  {
    id: 'pappers_financial',
    category: 'financial',
    description: 'Pappers — bilans, CA, resultat, dirigeants, signal sante financiere',
    serperConfig: { site: 'pappers.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 4, profession_liberale: 6, immobilier: 7,
      ecommerce: 5, b2b_services: 8, tourisme: 4, transport_logistique: 7,
    },
  },
  {
    id: 'societe_bilans',
    category: 'financial',
    description: 'Societe.com Bilans — comptes annuels, evolution CA, signal croissance',
    serperConfig: { site: 'societe.com', queryTemplate: '{target} {location} bilan chiffre affaires' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 4, artisan: 3, profession_liberale: 5, immobilier: 6,
      ecommerce: 5, b2b_services: 7, tourisme: 4, transport_logistique: 6,
    },
  },
  {
    id: 'infogreffe',
    category: 'financial',
    description: 'Infogreffe — greffes tribunaux commerce, creations/modifications',
    serperConfig: { site: 'infogreffe.fr', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 5, artisan: 5, profession_liberale: 5, immobilier: 6,
      ecommerce: 4, b2b_services: 7, tourisme: 4, transport_logistique: 6,
    },
  },

  // ============================================================
  // TECH (4 sources)
  // ============================================================
  {
    id: 'github_signals',
    category: 'tech',
    description: 'GitHub — repos, activity, signal equipe tech active',
    serperConfig: { site: 'github.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 1, immobilier: 2,
      ecommerce: 5, b2b_services: 8, tourisme: 1, transport_logistique: 2,
    },
  },
  {
    id: 'conference_speakers',
    category: 'tech',
    description: 'Conferences tech — speakers, signal expertise et visibilite',
    serperConfig: { site: null, queryTemplate: '{target} conference speaker {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 1,
      ecommerce: 4, b2b_services: 8, tourisme: 1, transport_logistique: 2,
    },
  },
  {
    id: 'crunchbase',
    category: 'tech',
    description: 'Crunchbase — profils startup, funding, signal investissement',
    serperConfig: { site: 'crunchbase.com', queryTemplate: '{target} {location}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 1, immobilier: 2,
      ecommerce: 6, b2b_services: 9, tourisme: 1, transport_logistique: 3,
    },
  },
  {
    id: 'product_hunt',
    category: 'tech',
    description: 'Product Hunt — lancements produits, signal startup active',
    serperConfig: { site: 'producthunt.com', queryTemplate: '{target}' },
    nativeModule: null,
    nicheRelevance: {
      commerce_local: 1, artisan: 1, profession_liberale: 1, immobilier: 1,
      ecommerce: 5, b2b_services: 8, tourisme: 1, transport_logistique: 2,
    },
  },

];

// ============================================================
// EXPANSION : 100 sources supplementaires (total: 159)
// ============================================================

function _s(id, cat, desc, site, qt, rel) {
  return {
    id, category: cat, description: desc,
    serperConfig: { site: site || null, queryTemplate: qt },
    nativeModule: null, nicheRelevance: rel,
  };
}

SOURCES.push(
  // --- Annuaires specialises (10) ---
  _s('hoodspot', 'annuaire', 'Hoodspot — fiches entreprises geolocalisees avec chiffres cles', 'hoodspot.fr', '{target} {location}',
    { commerce_local: 7, artisan: 6, profession_liberale: 5, immobilier: 5, b2b_services: 6, tourisme: 5, transport_logistique: 5, restauration: 7, energie: 4, sante: 4 }),
  _s('justacote', 'annuaire', 'Justacote — annuaire proximite avec avis', 'justacote.com', '{target} {location}',
    { commerce_local: 8, artisan: 7, profession_liberale: 5, immobilier: 4, tourisme: 6, restauration: 8, sante: 5 }),
  _s('starofservice', 'annuaire', 'StarOfService — mise en relation prestataires/clients', 'starofservice.com', '{target} {location}',
    { commerce_local: 6, artisan: 9, profession_liberale: 6, btp_construction: 7, sante: 4, juridique: 4 }),
  _s('gralon', 'annuaire', 'Gralon — annuaire thematique entreprises FR', 'gralon.net', '{target} {location}',
    { commerce_local: 5, artisan: 4, profession_liberale: 4, b2b_services: 5, tourisme: 5 }),
  _s('infobel', 'annuaire', 'Infobel — annuaire international entreprises', 'infobel.com', '{target} {location} France',
    { b2b_services: 7, transport_logistique: 5, commerce_local: 4, ecommerce: 4 }),
  _s('manageo', 'annuaire', 'Manageo — fiches entreprises + scoring financier', 'manageo.fr', '{target} {location}',
    { b2b_services: 7, finance_assurance: 6, commerce_local: 5, immobilier: 5, transport_logistique: 5 }),
  _s('verif', 'annuaire', 'Verif.com — verification entreprises, bilans, dirigeants', 'verif.com', '{target} {location}',
    { b2b_services: 7, finance_assurance: 6, immobilier: 5, transport_logistique: 5, juridique: 5 }),
  _s('score3', 'annuaire', 'Score3 — scoring solvabilite entreprises', 'score3.fr', '{target} {location}',
    { b2b_services: 7, finance_assurance: 7, immobilier: 5, transport_logistique: 5 }),
  _s('ellisphere', 'annuaire', 'Ellisphere — intelligence economique, credit entreprise', 'ellisphere.com', '{target} {location}',
    { b2b_services: 8, finance_assurance: 7, transport_logistique: 5 }),
  _s('annuaire_entreprises', 'annuaire', 'Annuaire Entreprises — annuaire officiel data.gouv.fr', 'annuaire-entreprises.data.gouv.fr', '{target} {location}',
    { commerce_local: 7, artisan: 7, profession_liberale: 6, b2b_services: 8, immobilier: 6, transport_logistique: 7, energie: 5, sante: 5, juridique: 5, finance_assurance: 5, franchise: 5, agriculture: 5 }),

  // --- Sante/Medical (8) ---
  _s('doctolib', 'sante', 'Doctolib — praticiens sante, medecins, specialistes', 'doctolib.fr', '{target} {location}',
    { sante: 10, profession_liberale: 7, commerce_local: 3 }),
  _s('ameli_annuaire', 'sante', 'Ameli Annuaire Sante — professionnels de sante agrees', 'annuaire-sante.ameli.fr', '{target} {location}',
    { sante: 10, profession_liberale: 6 }),
  _s('resalib', 'sante', 'Resalib — praticiens bien-etre et medecines douces', 'resalib.fr', '{target} {location}',
    { sante: 8, profession_liberale: 5, commerce_local: 3 }),
  _s('maiia', 'sante', 'Maiia — rendez-vous medicaux en ligne', 'maiia.com', '{target} {location}',
    { sante: 9, profession_liberale: 5 }),
  _s('mondocteur', 'sante', 'MonDocteur — annuaire medecins et prise RDV', 'mondocteur.fr', '{target} {location}',
    { sante: 9, profession_liberale: 5 }),
  _s('ordoclic', 'sante', 'Ordoclic — pharmacies et parapharmacies', 'ordoclic.fr', '{target} {location}',
    { sante: 8, commerce_local: 4 }),
  _s('conseil_medecin', 'sante', 'CNOM — Conseil National Ordre des Medecins, annuaire officiel', 'conseil-national.medecin.fr', '{target} {location}',
    { sante: 10, profession_liberale: 7 }),
  _s('ordre_pharmaciens', 'sante', 'Ordre des Pharmaciens — annuaire officiel pharmacies FR', 'ordre.pharmacien.fr', '{target} {location}',
    { sante: 9, commerce_local: 4 }),

  // --- BTP/Renovation (8) ---
  _s('habitatpresto', 'btp', 'Habitatpresto — artisans renovation, devis travaux', 'habitatpresto.com', '{target} {location}',
    { btp_construction: 10, artisan: 9, immobilier: 5 }),
  _s('travaux_com', 'btp', 'Travaux.com — devis travaux et renovation', 'travaux.com', '{target} {location}',
    { btp_construction: 10, artisan: 9, immobilier: 5 }),
  _s('quotatis', 'btp', 'Quotatis — mise en relation travaux BTP', 'quotatis.fr', '{target} {location}',
    { btp_construction: 9, artisan: 8, immobilier: 4 }),
  _s('hemea', 'btp', 'Hemea — renovation complete, architectes et artisans', 'hemea.com', '{target} {location}',
    { btp_construction: 9, artisan: 7, immobilier: 5, profession_liberale: 4 }),
  _s('houzz', 'btp', 'Houzz — architectes, decorateurs, artisans renovation', 'houzz.fr', '{target} {location}',
    { btp_construction: 8, artisan: 7, immobilier: 6, profession_liberale: 5 }),
  _s('batiactu', 'btp', 'Batiactu — actualites BTP, appels offres construction', 'batiactu.com', '{target} {location}',
    { btp_construction: 9, artisan: 6, immobilier: 4, transport_logistique: 3 }),
  _s('qualibat', 'btp', 'Qualibat — annuaire artisans certifies BTP', 'qualibat.com', '{target} {location}',
    { btp_construction: 10, artisan: 10, immobilier: 4 }),
  _s('ffbatiment', 'btp', 'FFBatiment — federation batiment, entreprises adherentes', 'ffbatiment.fr', '{target} {location}',
    { btp_construction: 9, artisan: 8, transport_logistique: 3 }),

  // --- Restauration/Food (8) ---
  _s('thefork', 'restauration', 'TheFork (LaFourchette) — restaurants, avis et reservations', 'thefork.fr', '{target} {location}',
    { restauration: 10, commerce_local: 7, tourisme: 8 }),
  _s('deliveroo', 'restauration', 'Deliveroo — restaurants livraison, signal activite', 'deliveroo.fr', '{target} {location}',
    { restauration: 9, commerce_local: 6, tourisme: 4 }),
  _s('ubereats', 'restauration', 'UberEats — restaurants livraison, couverture nationale', 'ubereats.com', '{target} {location}',
    { restauration: 9, commerce_local: 6, tourisme: 4 }),
  _s('zenchef', 'restauration', 'Zenchef — outils digitaux restaurateurs, annuaire', 'zenchef.com', '{target} {location}',
    { restauration: 9, commerce_local: 5, tourisme: 4 }),
  _s('mapstr', 'restauration', 'Mapstr — lieux recommandes par la communaute', 'mapstr.com', '{target} {location}',
    { restauration: 7, commerce_local: 6, tourisme: 7 }),
  _s('guide_michelin', 'restauration', 'Guide Michelin — restaurants gastronomiques, etoiles', 'guide.michelin.com', '{target} {location}',
    { restauration: 10, tourisme: 9, commerce_local: 5 }),
  _s('petitfute', 'restauration', 'Petit Fute — guide local restaurants, commerces, tourisme', 'petitfute.com', '{target} {location}',
    { restauration: 8, commerce_local: 7, tourisme: 9, artisan: 3 }),
  _s('resto_fr', 'restauration', 'Resto.fr — annuaire restaurants France', 'resto.fr', '{target} {location}',
    { restauration: 9, commerce_local: 6, tourisme: 6 }),

  // --- Immobilier supplementaire (8) ---
  _s('bienici', 'immo', 'Bienici — agregateur annonces immobilieres', 'bienici.com', '{target} {location}',
    { immobilier: 10, btp_construction: 4 }),
  _s('pap', 'immo', 'PAP — particulier a particulier, immobilier', 'pap.fr', '{target} {location}',
    { immobilier: 9 }),
  _s('orpi', 'immo', 'Orpi — reseau agences immobilieres', 'orpi.com', '{target} {location}',
    { immobilier: 10, franchise: 6 }),
  _s('century21_fr', 'immo', 'Century 21 — reseau agences immobilieres', 'century21.fr', '{target} {location}',
    { immobilier: 10, franchise: 6 }),
  _s('laforet', 'immo', 'Laforet — reseau immobilier, gestion locative', 'laforet.com', '{target} {location}',
    { immobilier: 10, franchise: 6 }),
  _s('guy_hoquet', 'immo', 'Guy Hoquet — reseau immobilier franchise', 'guy-hoquet.com', '{target} {location}',
    { immobilier: 10, franchise: 7 }),
  _s('meilleurs_agents', 'immo', 'MeilleursAgents — estimation immobiliere, agents locaux', 'meilleursagents.com', '{target} {location}',
    { immobilier: 9, finance_assurance: 4 }),
  _s('castorus', 'immo', 'Castorus — suivi prix immobilier, alertes', 'castorus.com', '{target} {location}',
    { immobilier: 8, finance_assurance: 3 }),

  // --- Finance/Assurance/Courtage (8) ---
  _s('meilleurtaux', 'finance', 'Meilleurtaux — courtage credit immobilier et assurance', 'meilleurtaux.com', '{target} {location}',
    { finance_assurance: 10, immobilier: 7, energie: 4 }),
  _s('lesfurets', 'finance', 'LesFurets — comparateur assurance, energie, telecom', 'lesfurets.com', '{target} {location}',
    { finance_assurance: 9, energie: 7 }),
  _s('assurland', 'finance', 'Assurland — comparateur assurances FR', 'assurland.com', '{target} {location}',
    { finance_assurance: 10 }),
  _s('empruntis', 'finance', 'Empruntis — courtage credit immobilier', 'empruntis.com', '{target} {location}',
    { finance_assurance: 9, immobilier: 6 }),
  _s('reassurez_moi', 'finance', 'Reassurez-moi — comparateur assurances, courtage', 'reassurez-moi.fr', '{target} {location}',
    { finance_assurance: 9 }),
  _s('selectra', 'finance', 'Selectra — comparateur energie et telecom, courtage', 'selectra.info', '{target} {location}',
    { energie: 10, finance_assurance: 6 }),
  _s('kelwatt', 'finance', 'Kelwatt — comparateur electricite et gaz', 'kelwatt.fr', '{target} {location}',
    { energie: 10, finance_assurance: 5 }),
  _s('choisir', 'finance', 'Choisir.com — comparateur energie, telecom, banque', 'choisir.com', '{target} {location}',
    { energie: 9, finance_assurance: 7 }),

  // --- Juridique/Compta (8) ---
  _s('avocat_fr', 'juridique', 'Avocat.fr — annuaire avocats par specialite et barreau', 'avocat.fr', '{target} {location}',
    { juridique: 10, profession_liberale: 7 }),
  _s('village_justice', 'juridique', 'Village-Justice — communaute juridique, annuaire avocats', 'village-justice.com', '{target} {location}',
    { juridique: 10, profession_liberale: 6 }),
  _s('juritravail', 'juridique', 'Juritravail — droit du travail, avocats specialises', 'juritravail.com', '{target} {location}',
    { juridique: 9, b2b_services: 4 }),
  _s('legalstart', 'juridique', 'Legalstart — creation entreprise, services juridiques', 'legalstart.fr', '{target} {location}',
    { juridique: 8, b2b_services: 6, franchise: 4 }),
  _s('expert_comptable', 'juridique', 'Expert-Comptable.com — annuaire experts-comptables FR', 'expert-comptable.com', '{target} {location}',
    { juridique: 9, finance_assurance: 7, profession_liberale: 8, b2b_services: 5 }),
  _s('compta_online', 'juridique', 'Compta-Online — communaute comptabilite, annuaire EC', 'compta-online.com', '{target} {location}',
    { juridique: 8, finance_assurance: 6, profession_liberale: 6 }),
  _s('notaires_fr', 'juridique', 'Notaires.fr — annuaire officiel notaires de France', 'notaires.fr', '{target} {location}',
    { juridique: 10, immobilier: 7, profession_liberale: 8 }),
  _s('legalplace', 'juridique', 'LegalPlace — services juridiques en ligne, creation societe', 'legalplace.fr', '{target} {location}',
    { juridique: 8, b2b_services: 5 }),

  // --- Formation (6) ---
  _s('moncompteformation', 'formation', 'MonCompteFormation — formations certifiantes CPF', 'moncompteformation.gouv.fr', '{target} {location}',
    { b2b_services: 6, profession_liberale: 4, sante: 3, btp_construction: 4 }),
  _s('maformation', 'formation', 'MaFormation — catalogue formations professionnelles', 'maformation.fr', '{target} {location}',
    { b2b_services: 6, profession_liberale: 4 }),
  _s('kelformation', 'formation', 'Kelformation — comparateur formations pros', 'kelformation.com', '{target} {location}',
    { b2b_services: 6, profession_liberale: 4 }),
  _s('topformation', 'formation', 'TopFormation — formations professionnelles continues', 'topformation.fr', '{target} {location}',
    { b2b_services: 6 }),
  _s('centre_inffo', 'formation', 'Centre Inffo — info formation professionnelle continue', 'centre-inffo.fr', '{target} {location}',
    { b2b_services: 5 }),
  _s('edof', 'formation', 'EDOF — formations certifiees officielles (RNCP)', 'of.moncompteformation.gouv.fr', '{target} {location}',
    { b2b_services: 5, profession_liberale: 3 }),

  // --- Transport/Logistique supplementaire (6) ---
  _s('fretbay', 'transport', 'Fretbay — bourse de fret entre particuliers et pros', 'fretbay.com', '{target} {location}',
    { transport_logistique: 10, ecommerce: 4 }),
  _s('chronotruck', 'transport', 'Chronotruck — transport routier et fret digital', 'chronotruck.com', '{target} {location}',
    { transport_logistique: 10 }),
  _s('upela', 'transport', 'Upela — comparateur expedition colis pro', 'upela.com', '{target} {location}',
    { transport_logistique: 9, ecommerce: 6 }),
  _s('shippingbo', 'transport', 'ShippingBo — logistique ecommerce et fulfillment', 'shippingbo.com', '{target} {location}',
    { transport_logistique: 9, ecommerce: 7 }),
  _s('fretlink', 'transport', 'FretLink — plateforme digitale transport de fret', 'fretlink.com', '{target} {location}',
    { transport_logistique: 10 }),
  _s('timocom', 'transport', 'TimoCom — bourse de fret europeenne', 'timocom.fr', '{target} {location}',
    { transport_logistique: 9, b2b_services: 3 }),

  // --- Tourisme supplementaire (6) ---
  _s('booking_com', 'tourisme_extra', 'Booking.com — hotels et hebergements, avis voyageurs', 'booking.com', '{target} {location}',
    { tourisme: 10, restauration: 4, commerce_local: 3 }),
  _s('airbnb_fr', 'tourisme_extra', 'Airbnb — locations saisonnieres, hotes FR', 'airbnb.fr', '{target} {location}',
    { tourisme: 10, immobilier: 5 }),
  _s('campings_com', 'tourisme_extra', 'Campings.com — campings et hebergements plein air', 'campings.com', '{target} {location}',
    { tourisme: 9, agriculture: 3 }),
  _s('gites_de_france', 'tourisme_extra', 'Gites de France — gites et chambres hotes labels', 'gites-de-france.com', '{target} {location}',
    { tourisme: 10, agriculture: 4, restauration: 3 }),
  _s('lonelyplanet_fr', 'tourisme_extra', 'Lonely Planet FR — guides voyage, destinations FR', 'lonelyplanet.fr', '{target} {location}',
    { tourisme: 8 }),
  _s('france_voyage', 'tourisme_extra', 'France-Voyage — tourisme France, villes et villages', 'france-voyage.com', '{target} {location}',
    { tourisme: 9, commerce_local: 4, restauration: 4 }),

  // --- Energie (6) ---
  _s('engie_pro', 'energie', 'Engie — fournisseur energie gaz/elec, offres pro', 'engie.fr', '{target} {location} professionnel',
    { energie: 10, b2b_services: 4, btp_construction: 4 }),
  _s('edf_pro', 'energie', 'EDF Pro — fournisseur electricite, offres entreprises', 'edf.fr', '{target} {location} professionnel',
    { energie: 10, b2b_services: 3 }),
  _s('totalenergies_pro', 'energie', 'TotalEnergies — fournisseur multi-energie, offres pro', 'totalenergies.fr', '{target} {location} professionnel',
    { energie: 10, transport_logistique: 4 }),
  _s('hellowatt', 'energie', 'Hello Watt — diagnostic energetique, comparateur', 'hellowatt.fr', '{target} {location}',
    { energie: 10, btp_construction: 5, immobilier: 4 }),
  _s('quelleenergie', 'energie', 'Quelle Energie — renovation energetique, aides', 'quelleenergie.fr', '{target} {location}',
    { energie: 9, btp_construction: 7, artisan: 5, immobilier: 4 }),
  _s('prix_elec', 'energie', 'Prix-Elec — comparateur tarifs electricite pro', 'prix-elec.com', '{target} {location} professionnel',
    { energie: 10, finance_assurance: 4 }),

  // --- Tech/Startup supplementaire (6) ---
  _s('angel_co', 'tech', 'AngelList — startups, investisseurs, recrutement tech', 'angel.co', '{target} {location}',
    { b2b_services: 8, ecommerce: 5 }),
  _s('dealroom', 'tech', 'Dealroom — base de donnees startups et financement', 'dealroom.co', '{target} {location}',
    { b2b_services: 8, finance_assurance: 5 }),
  _s('eldorado', 'tech', 'Eldorado — levees de fonds startups FR', 'eldorado.co', '{target} {location}',
    { b2b_services: 9, finance_assurance: 5 }),
  _s('frenchweb', 'tech', 'FrenchWeb — media tech et business FR', 'frenchweb.fr', '{target} {location}',
    { b2b_services: 7, ecommerce: 5 }),
  _s('usine_digitale', 'tech', 'L\'Usine Digitale — actualites transformation digitale', 'usine-digitale.fr', '{target} {location}',
    { b2b_services: 7, energie: 4, transport_logistique: 4 }),
  _s('journal_du_net', 'tech', 'Journal du Net — actualites business et tech', 'journaldunet.com', '{target} {location}',
    { b2b_services: 7, ecommerce: 5, finance_assurance: 4 }),

  // --- Franchise (5) ---
  _s('toute_la_franchise', 'franchise', 'Toute la Franchise — annuaire reseaux franchise FR', 'toute-la-franchise.com', '{target} {location}',
    { franchise: 10, commerce_local: 6, restauration: 7, immobilier: 5 }),
  _s('ac_franchise', 'franchise', 'AC Franchise — comparateur franchises, opportunites', 'ac-franchise.com', '{target} {location}',
    { franchise: 10, commerce_local: 5, restauration: 6 }),
  _s('franchise_magazine', 'franchise', 'Franchise Magazine — actualites et annuaire franchise', 'franchise-magazine.com', '{target} {location}',
    { franchise: 10, commerce_local: 5, restauration: 5 }),
  _s('observatoire_franchise', 'franchise', 'Observatoire Franchise — stats et tendances franchise FR', 'observatoiredelafranchise.fr', '{target} {location}',
    { franchise: 9, commerce_local: 4 }),
  _s('franchise_directe', 'franchise', 'Franchise Directe — offres franchise disponibles', 'franchise-directe.com', '{target} {location}',
    { franchise: 10, commerce_local: 5, restauration: 6, immobilier: 4 }),

  // --- Agriculture/Agro (5) ---
  _s('agriaffaires', 'agriculture', 'Agriaffaires — materiel agricole, annonces pros', 'agriaffaires.com', '{target} {location}',
    { agriculture: 10, transport_logistique: 4 }),
  _s('terre_net', 'agriculture', 'Terre-net — actualites agricoles, marches, meteo', 'terre-net.fr', '{target} {location}',
    { agriculture: 10 }),
  _s('pleinchamp', 'agriculture', 'Pleinchamp — agriculture, elevage, viticulture', 'pleinchamp.com', '{target} {location}',
    { agriculture: 10, restauration: 3 }),
  _s('chambre_agriculture', 'agriculture', 'Chambres Agriculture — reseau officiel, annuaire exploitations', 'chambres-agriculture.fr', '{target} {location}',
    { agriculture: 10, juridique: 3 }),
  _s('agri_web', 'agriculture', 'Agri-Web — annuaire entreprises agricoles et agroalimentaires', 'agri-web.fr', '{target} {location}',
    { agriculture: 10, restauration: 4, transport_logistique: 3 }),

  // --- Presse regionale (4) ---
  _s('ouest_france', 'presse', 'Ouest-France — presse regionale, economie locale', 'ouest-france.fr', '{target} {location}',
    { commerce_local: 7, artisan: 5, restauration: 6, tourisme: 6, agriculture: 5 }),
  _s('le_telegramme', 'presse', 'Le Telegramme — presse regionale Bretagne', 'letelegramme.fr', '{target} {location}',
    { commerce_local: 6, artisan: 4, tourisme: 5, agriculture: 5 }),
  _s('la_depeche', 'presse', 'La Depeche — presse Sud-Ouest, economie regionale', 'ladepeche.fr', '{target} {location}',
    { commerce_local: 6, artisan: 4, tourisme: 5, agriculture: 5 }),
  _s('le_progres', 'presse', 'Le Progres — presse Rhone-Alpes, actualites locales', 'leprogres.fr', '{target} {location}',
    { commerce_local: 6, artisan: 4, tourisme: 5, btp_construction: 3 }),

  // ============================================================
  // EXPANSION V3 — 40 nouvelles sources (8 categories)
  // ============================================================

  // --- Open Data officiel manquant (6) ---
  _s('data_gouv_datasets', 'opendata_gouv', 'data.gouv.fr — datasets officiels, subventions, concessions', 'data.gouv.fr', '{target} {location}',
    { b2b_services: 7, btp_construction: 5, transport_logistique: 5, agriculture: 6, energie: 5 }),
  _s('registre_metiers', 'opendata_gouv', 'Registre des Metiers CMA — artisans immatricules officiel', 'registre-metiers.fr', '{target} {location} artisan',
    { artisan: 10, btp_construction: 8, commerce_local: 6, restauration: 4 }),
  _s('inpi_brevets', 'opendata_gouv', 'INPI Brevets — depots brevets, signal R&D et innovation', 'bases-brevets.inpi.fr', '{target} brevet innovation',
    { b2b_services: 8, energie: 7, sante: 6 }),
  _s('inpi_marques', 'opendata_gouv', 'INPI Marques — depots marques, signal lancement produit', 'data.inpi.fr', '{target} marque depot',
    { b2b_services: 7, ecommerce: 8, franchise: 7, restauration: 5, commerce_local: 5 }),
  _s('decp_gouv', 'opendata_gouv', 'DECP — titulaires marches publics attribues', 'data.economie.gouv.fr', '{target} {location} titulaire marche',
    { b2b_services: 8, btp_construction: 9, transport_logistique: 7, juridique: 5 }),
  _s('aides_entreprises', 'opendata_gouv', 'Aides-Entreprises — aides BPI et regions, signal investissement', 'aides-entreprises.fr', '{target} {location} aide subvention',
    { b2b_services: 7, agriculture: 6, energie: 7, btp_construction: 5 }),

  // --- Startup ecosysteme (5) ---
  _s('bpifrance_startup', 'startup', 'BPI France Creation — startups labellisees, accompagnees', 'bpifrance-creation.fr', '{target} {location}',
    { b2b_services: 9, ecommerce: 7, energie: 5 }),
  _s('station_f', 'startup', 'Station F — 1000 startups Paris, programmes acceleration', 'stationf.co', '{target}',
    { b2b_services: 9, ecommerce: 6 }),
  _s('frenchtech_membres', 'startup', 'La French Tech — membres labellises, communautes regionales', 'lafrenchtech.com', '{target} {location}',
    { b2b_services: 8, ecommerce: 6, energie: 4 }),
  _s('village_by_ca', 'startup', 'Village by CA — 40 villages, 3000 startups incubees', 'levillagebyca.com', '{target} {location}',
    { b2b_services: 8, ecommerce: 5, agriculture: 4, finance_assurance: 4 }),
  _s('pbf_territoires', 'startup', 'BPI Territoires — ecosystemes regionaux startups', 'lelab.bpifrance.fr', '{target} {location}',
    { b2b_services: 7, energie: 5 }),

  // --- Evenements & Salons (5) ---
  _s('eventbrite_fr', 'evenements', 'Eventbrite France — organisateurs evenements B2B', 'eventbrite.fr', '{target} {location} professionnel',
    { b2b_services: 9, restauration: 5, commerce_local: 6, ecommerce: 5, franchise: 4 }),
  _s('meetup_fr', 'evenements', 'Meetup France — communautes pro, groupes sectoriels', 'meetup.com', '{target} {location}',
    { b2b_services: 8, ecommerce: 5, finance_assurance: 4 }),
  _s('salons_pro', 'evenements', 'Salons-Online — annuaire salons professionnels, exposants', 'salons-online.com', '{target} {location} salon',
    { b2b_services: 8, btp_construction: 7, agriculture: 6, restauration: 5 }),
  _s('foires_expositions', 'evenements', 'Foires-Expositions — foires regionales, exposants PME', 'foires-expositions.com', '{target} {location}',
    { commerce_local: 7, artisan: 7, agriculture: 6, restauration: 5, tourisme: 5 }),
  _s('viparis_exposants', 'evenements', 'Viparis — exposants grands salons Paris Expo', 'viparis.com', '{target} salon exposant',
    { b2b_services: 7, transport_logistique: 5, restauration: 6 }),

  // --- Awards & Palmares (5) ---
  _s('bestworkplaces_fr', 'palmares', 'Great Place to Work France — entreprises certifiees', 'greatplacetowork.fr', '{target} {location}',
    { b2b_services: 8, sante: 5, ecommerce: 5, finance_assurance: 5 }),
  _s('ecovadis_rated', 'palmares', 'EcoVadis — entreprises notees RSE, signal procurement', 'ecovadis.com', '{target} RSE notation',
    { b2b_services: 8, transport_logistique: 6, btp_construction: 5 }),
  _s('gazelles_bpifrance', 'palmares', 'Gazelles & Pepites BPI — PME croissance rapide', 'bpifrance.fr', '{target} {location} gazelle pepite',
    { b2b_services: 9, ecommerce: 6, energie: 5 }),
  _s('palmares_challenges', 'palmares', 'Challenges 500 premieres — classement PME croissance', 'challenges.fr', '{target} {location} 500 croissance',
    { b2b_services: 8, ecommerce: 5 }),
  _s('trophees_echos', 'palmares', 'Les Echos Trophees — entreprises recompensees par secteur', 'lesechos.fr', '{target} {location} trophee palmares',
    { b2b_services: 7, sante: 4, energie: 5 }),

  // --- Industrie manufacturiere (5) ---
  _s('usine_nouvelle_annuaire', 'industrie', 'L\'Usine Nouvelle — annuaire industriels FR', 'usinenouvelle.com', '{target} {location}',
    { b2b_services: 6, transport_logistique: 5, energie: 5, btp_construction: 4 }),
  _s('industrie_com', 'industrie', 'Industrie.com — fournisseurs industriels, sous-traitants', 'industrie.com', '{target} {location}',
    { btp_construction: 5, transport_logistique: 5, b2b_services: 5 }),
  _s('sous_traitance_sti', 'industrie', 'STI — bourse sous-traitance industrielle FR', 'sous-traitance-industrie.com', '{target} {location}',
    { btp_construction: 6, b2b_services: 4 }),
  _s('alliance_industrie_futur', 'industrie', 'Alliance Industrie du Futur — usine 4.0', 'allianceindustriedufutur.org', '{target} {location}',
    { b2b_services: 7, energie: 6 }),
  _s('global_industrie', 'industrie', 'Global Industrie — annuaire sous-traitants salons', 'global-industrie.com', '{target} {location} sous-traitant',
    { b2b_services: 5 }),

  // --- Marketplace vendeurs (4) ---
  _s('cdiscount_pro', 'marketplace', 'Cdiscount Pro — vendeurs marketplace FR', 'cdiscount.com', '{target} vendeur boutique',
    { ecommerce: 9, commerce_local: 4, transport_logistique: 4 }),
  _s('rakuten_boutiques', 'marketplace', 'Rakuten France — vendeurs pro marketplace', 'rakuten.com', '{target} boutique vendeur France',
    { ecommerce: 9, commerce_local: 4 }),
  _s('manomano_pros', 'marketplace', 'ManoMano — vendeurs bricolage/jardinage pro', 'manomano.fr', '{target} vendeur',
    { ecommerce: 8, artisan: 5, btp_construction: 6, commerce_local: 4 }),
  _s('vinted_pros', 'marketplace', 'Vinted Pro — vendeurs professionnels mode', 'vinted.fr', '{target} professionnel boutique',
    { ecommerce: 7, commerce_local: 3 }),

  // --- Recrutement RH (3) ---
  _s('cadremploi', 'emploi', 'Cadremploi — recrutement cadres, signal croissance', 'cadremploi.fr', '{target} {location}',
    { b2b_services: 8, finance_assurance: 6, sante: 5, juridique: 5 }),
  _s('hellowork', 'emploi', 'HelloWork — emploi PME France, recrutement regional', 'hellowork.com', '{target} {location} recrutement',
    { b2b_services: 7, commerce_local: 6, artisan: 5, restauration: 5, btp_construction: 5 }),
  _s('jobteaser', 'emploi', 'JobTeaser — recrutement jeunes diplomes, expansion', 'jobteaser.com', '{target} {location}',
    { b2b_services: 7, ecommerce: 5, finance_assurance: 4 }),

  // --- Media & Podcast (3) ---
  _s('bfm_business', 'media', 'BFM Business — interviews dirigeants, visibilite media', 'bfmtv.com', '{target} {location} dirigeant interview',
    { b2b_services: 8, finance_assurance: 5, ecommerce: 4 }),
  _s('podcast_fr_business', 'media', 'Podcasts entrepreneurs FR — invites decideurs', 'podcastfrancebusiness.com', '{target} entrepreneur podcast',
    { b2b_services: 7, ecommerce: 5, finance_assurance: 4 }),
  _s('linkedin_articles', 'media', 'LinkedIn Articles — dirigeants publient, thought leadership', 'linkedin.com/pulse', '{target} {location} article',
    { b2b_services: 8, finance_assurance: 5, juridique: 4, sante: 4 }),

  // --- RSE & Environnement (4) ---
  _s('ademe_dispositifs', 'environnement', 'ADEME — dispositifs financements eco, entreprises accompagnees', 'ademe.fr', '{target} {location} diagnostic financement',
    { energie: 9, btp_construction: 7, agriculture: 6, transport_logistique: 5 }),
  _s('bilan_carbone_acv', 'environnement', 'Bilan Carbone — entreprises declarantes, signal RSE avance', 'bilans-ges.ademe.fr', '{target} bilan carbone',
    { energie: 9, transport_logistique: 6, b2b_services: 5 }),
  _s('labels_rse', 'environnement', 'Labels RSE (B Corp, Lucie, ISO 26000) — certifiees responsables', 'labellucie.com', '{target} {location} label RSE',
    { b2b_services: 7, finance_assurance: 5, transport_logistique: 5 }),
  _s('greenweez_bio', 'environnement', 'Greenweez/Naturalia — marques bio distribuees, signal B2B', 'greenweez.com', '{target} marque fournisseur',
    { agriculture: 7, restauration: 5, ecommerce: 5, commerce_local: 4 }),
);

// ============================================================
// EXPANSION V4 — 301 sources internationales + niches (total: 500)
// Sources issues du catalogue 500 Sources Prospects Illimites
// ============================================================

SOURCES.push(
// --- A. Registres gouvernementaux internationaux (18) ---
_s('opencorporates', 'registre_intl', 'OpenCorporates — 200M+ entreprises mondiales, API gratuite', 'opencorporates.com', '{target} {location}',
  { b2b_services: 8, ecommerce: 5, finance_assurance: 6, transport_logistique: 5, commerce_local: 4 }),
_s('companies_house', 'registre_intl', 'Companies House UK — registre entreprises britanniques, API REST', 'find-and-update.company-information.service.gov.uk', '{target}',
  { b2b_services: 7, finance_assurance: 6, ecommerce: 5 }),
_s('sec_edgar', 'registre_intl', 'SEC EDGAR — filings financiers entreprises US publiques', 'sec.gov/edgar', '{target}',
  { finance_assurance: 9, b2b_services: 7, ecommerce: 5 }),
_s('handelsregister', 'registre_intl', 'Handelsregister — registre commercial allemand', 'handelsregister.de', '{target}',
  { b2b_services: 7, transport_logistique: 6, industrie: 7 }),
_s('gleif', 'registre_intl', 'GLEIF — base mondiale entites juridiques (LEI)', 'gleif.org', '{target}',
  { finance_assurance: 9, b2b_services: 6 }),
_s('data_gov_us', 'registre_intl', 'Data.gov USA — portail donnees ouvertes US government', 'data.gov', '{target}',
  { b2b_services: 5, finance_assurance: 4, agriculture: 5 }),
_s('european_data_portal', 'registre_intl', 'European Data Portal — donnees ouvertes europeennes', 'data.europa.eu', '{target} {location}',
  { b2b_services: 6, agriculture: 5, transport_logistique: 5 }),
_s('registre_canada', 'registre_intl', 'Registre Entreprises Canada — entreprises canadiennes', 'ic.gc.ca', '{target}',
  { b2b_services: 6, transport_logistique: 5 }),
_s('abn_australia', 'registre_intl', 'ABN Lookup Australie — registre entreprises australiennes', 'abr.business.gov.au', '{target}',
  { b2b_services: 5 }),
_s('cnpj_bresil', 'registre_intl', 'CNPJ Bresil — base entreprises bresiliennes', 'receita.economia.gov.br', '{target}',
  { b2b_services: 5 }),
_s('mca_india', 'registre_intl', 'MCA Inde — registre entreprises indiennes', 'mca.gov.in', '{target}',
  { b2b_services: 5 }),
_s('acra_singapore', 'registre_intl', 'ACRA Singapour — registre entreprises singapouriennes', 'acra.gov.sg', '{target}',
  { b2b_services: 6, finance_assurance: 6 }),
_s('kvk_netherlands', 'registre_intl', 'KVK Pays-Bas — chambre de commerce neerlandaise', 'kvk.nl', '{target}',
  { b2b_services: 6, transport_logistique: 6 }),
_s('bolagsverket_sweden', 'registre_intl', 'Bolagsverket Suede — registre suedois entreprises', 'bolagsverket.se', '{target}',
  { b2b_services: 5 }),
_s('cnmv_spain', 'registre_intl', 'CNMV Espagne — registre marches financiers', 'cnmv.es', '{target}',
  { finance_assurance: 7 }),
_s('consob_italy', 'registre_intl', 'CONSOB Italie — autorite financiere italienne', 'consob.it', '{target}',
  { finance_assurance: 7 }),
_s('israel_companies', 'registre_intl', 'Israeli Companies Registry — registre entreprises israeliennes', 'ica.justice.gov.il', '{target}',
  { b2b_services: 6 }),
_s('cipc_south_africa', 'registre_intl', 'CIPC Afrique du Sud — registre entreprises sud-africaines', 'cipc.co.za', '{target}',
  { b2b_services: 5 }),

// --- B. Bases B2B internationales (12) ---
_s('apollo_io', 'b2b_intl', 'Apollo.io — 275M+ contacts B2B, 50 reveals/mois gratuits', 'apollo.io', '{target} {location}',
  { b2b_services: 10, ecommerce: 7, sante: 5, finance_assurance: 6, immobilier: 5 }),
_s('brownbook', 'b2b_intl', 'Brownbook — 44.6M+ entreprises mondiales', 'brownbook.net', '{target} {location}',
  { commerce_local: 6, b2b_services: 5, tourisme: 4 }),
_s('b2bmap', 'b2b_intl', 'B2BMAP — annuaire B2B mondial par pays/categorie', 'b2bmap.com', '{target} {location}',
  { b2b_services: 6, transport_logistique: 5, ecommerce: 5 }),
_s('manta', 'b2b_intl', 'Manta — millions entreprises US, profils detailles', 'manta.com', '{target} {location}',
  { commerce_local: 7, b2b_services: 6 }),
_s('thomasnet', 'b2b_intl', 'ThomasNet — fabricants et fournisseurs industriels US', 'thomasnet.com', '{target}',
  { b2b_services: 7, transport_logistique: 6, btp_construction: 5 }),
_s('globalspec', 'b2b_intl', 'GlobalSpec — fournisseurs industriels et techniques', 'globalspec.com', '{target}',
  { b2b_services: 6, energie: 5 }),
_s('tradeindia', 'b2b_intl', 'TradeIndia — fabricants et exportateurs indiens', 'tradeindia.com', '{target}',
  { transport_logistique: 6, ecommerce: 5 }),
_s('alibaba', 'b2b_intl', 'Alibaba — fournisseurs et fabricants mondiaux', 'alibaba.com', '{target}',
  { ecommerce: 8, transport_logistique: 7, b2b_services: 5 }),
_s('made_in_china', 'b2b_intl', 'Made-in-China — fabricants chinois', 'made-in-china.com', '{target}',
  { ecommerce: 7, transport_logistique: 6 }),
_s('exporthub', 'b2b_intl', 'ExportHub — marketplace B2B mondiale', 'exporthub.com', '{target}',
  { ecommerce: 6, transport_logistique: 6 }),
_s('go4worldbusiness', 'b2b_intl', 'Go4WorldBusiness — annuaire import/export mondial', 'go4worldbusiness.com', '{target}',
  { transport_logistique: 7, ecommerce: 6, b2b_services: 5 }),
_s('wlw_dach', 'b2b_intl', 'Wer liefert was — B2B marketplace DACH', 'wlw.de', '{target}',
  { b2b_services: 7, transport_logistique: 6 }),

// --- C. Annuaires professionnels internationaux (10) ---
_s('clutch_co', 'annuaire_intl', 'Clutch.co — annuaire agences et prestataires IT, notes', 'clutch.co', '{target} {location}',
  { b2b_services: 10, ecommerce: 6 }),
_s('goodfirms', 'annuaire_intl', 'GoodFirms — annuaire IT et software companies', 'goodfirms.co', '{target} {location}',
  { b2b_services: 9, ecommerce: 5 }),
_s('sortlist', 'annuaire_intl', 'Sortlist — annuaire agences europeennes', 'sortlist.com', '{target} {location}',
  { b2b_services: 9 }),
_s('designrush', 'annuaire_intl', 'DesignRush — annuaire agences digitales', 'designrush.com', '{target} {location}',
  { b2b_services: 8 }),
_s('upcity', 'annuaire_intl', 'UpCity — annuaire prestataires B2B notes', 'upcity.com', '{target} {location}',
  { b2b_services: 8 }),
_s('trustradius', 'annuaire_intl', 'TrustRadius — avis logiciels enterprise', 'trustradius.com', '{target}',
  { b2b_services: 8 }),
_s('ieee_acm', 'annuaire_intl', 'IEEE/ACM — ingenieurs et chercheurs tech', 'ieee.org', '{target}',
  { b2b_services: 5, sante: 3, energie: 4 }),
_s('rics_uk', 'annuaire_intl', 'RICS — professionnels immobilier UK', 'rics.org', '{target} {location}',
  { immobilier: 8 }),
_s('ordre_ec_fr', 'annuaire_intl', 'Ordre Experts-Comptables — annuaire comptables France', 'experts-comptables.fr', '{target} {location}',
  { finance_assurance: 9, juridique: 7, profession_liberale: 8 }),
_s('cma_metiers', 'annuaire_intl', 'CMA France — chambre de metiers et artisanat', 'cma-france.fr', '{target} {location}',
  { artisan: 10, btp_construction: 8, commerce_local: 7, restauration: 5 }),

// --- D. Startups & Funding internationaux (18) ---
_s('wellfound', 'startup_intl', 'AngelList/Wellfound — startups, jobs, investisseurs', 'wellfound.com', '{target}',
  { b2b_services: 9, ecommerce: 6, finance_assurance: 5 }),
_s('yc_directory', 'startup_intl', 'Y Combinator Directory — toutes les startups YC', 'ycombinator.com/companies', '{target}',
  { b2b_services: 10, ecommerce: 7 }),
_s('techstars', 'startup_intl', 'Techstars Portfolio — portfolio Techstars mondial', 'techstars.com/portfolio', '{target}',
  { b2b_services: 9 }),
_s('five_hundred_global', 'startup_intl', '500 Global Portfolio — portfolio 500 Startups', '500.co/companies', '{target}',
  { b2b_services: 8 }),
_s('seedtable', 'startup_intl', 'Seedtable — base donnees startups europeennes', 'seedtable.com', '{target} {location}',
  { b2b_services: 8, ecommerce: 5 }),
_s('eu_startups', 'startup_intl', 'EU-Startups.com — annuaire startups europeennes', 'eu-startups.com', '{target}',
  { b2b_services: 8 }),
_s('f6s', 'startup_intl', 'F6S — reseau mondial de startups', 'f6s.com', '{target} {location}',
  { b2b_services: 8 }),
_s('betalist', 'startup_intl', 'BetaList — startups en pre-lancement', 'betalist.com', '{target}',
  { b2b_services: 8, ecommerce: 5 }),
_s('startupblink', 'startup_intl', 'StartupBlink — classement startups par ville', 'startupblink.com', '{target} {location}',
  { b2b_services: 7 }),
_s('pitchbook', 'startup_intl', 'PitchBook — profils entreprises/investisseurs', 'pitchbook.com', '{target}',
  { finance_assurance: 8, b2b_services: 7 }),
_s('cbinsights', 'startup_intl', 'CB Insights — analyses et classements startups', 'cbinsights.com', '{target}',
  { b2b_services: 8, finance_assurance: 6 }),
_s('golden_com', 'startup_intl', 'Golden.com — base connaissances entreprises/personnes', 'golden.com', '{target}',
  { b2b_services: 7 }),
_s('tracxn', 'startup_intl', 'Tracxn — donnees startups et investisseurs', 'tracxn.com', '{target}',
  { b2b_services: 8, finance_assurance: 6 }),
_s('indiehackers', 'startup_intl', 'IndieHackers — fondateurs micro-SaaS et bootstrappers', 'indiehackers.com', '{target}',
  { b2b_services: 9, ecommerce: 5 }),
_s('acquire_com', 'startup_intl', 'Acquire.com — startups SaaS en vente et acheteurs', 'acquire.com', '{target}',
  { b2b_services: 8 }),
_s('kickstarter', 'startup_intl', 'Kickstarter — projets crowdfunding, futurs prospects', 'kickstarter.com', '{target}',
  { ecommerce: 7, b2b_services: 5 }),
_s('indiegogo', 'startup_intl', 'Indiegogo — crowdfunding, projets innovants', 'indiegogo.com', '{target}',
  { ecommerce: 7, b2b_services: 5 }),
_s('appsumo', 'startup_intl', 'AppSumo — deals SaaS, entreprises en lancement', 'appsumo.com', '{target}',
  { b2b_services: 8, ecommerce: 6 }),

// --- E. Job Boards internationaux (10) ---
_s('google_jobs', 'emploi_intl', 'Google Jobs — agregateur toutes offres emploi', null, '{target} {location} emploi recrutement',
  { b2b_services: 7, ecommerce: 5, commerce_local: 5, transport_logistique: 6 }),
_s('ziprecruiter', 'emploi_intl', 'ZipRecruiter — job board US majeur', 'ziprecruiter.com', '{target}',
  { b2b_services: 6 }),
_s('weworkremotely', 'emploi_intl', 'We Work Remotely — jobs remote, entreprises tech croissance', 'weworkremotely.com', '{target}',
  { b2b_services: 8, ecommerce: 5 }),
_s('remoteok', 'emploi_intl', 'RemoteOK — jobs remote avec donnees salaires', 'remoteok.com', '{target}',
  { b2b_services: 7 }),
_s('wellfound_jobs', 'emploi_intl', 'Wellfound Jobs — jobs dans les startups', 'wellfound.com/jobs', '{target}',
  { b2b_services: 8 }),
_s('hn_whos_hiring', 'emploi_intl', 'Hacker News Who\'s Hiring — thread mensuel HN recrutement', 'news.ycombinator.com', '{target} who is hiring',
  { b2b_services: 9, ecommerce: 5 }),
_s('stackoverflow_jobs', 'emploi_intl', 'Stack Overflow Jobs — jobs developpeurs', 'stackoverflow.com/jobs', '{target}',
  { b2b_services: 8 }),
_s('otta', 'emploi_intl', 'Otta — jobs startups tech', 'otta.com', '{target}',
  { b2b_services: 7 }),
_s('remotive', 'emploi_intl', 'Remotive — jobs remote categorises', 'remotive.com', '{target}',
  { b2b_services: 6 }),
_s('himalayas_app', 'emploi_intl', 'Himalayas — jobs remote avec profils entreprises', 'himalayas.app', '{target}',
  { b2b_services: 6 }),

// --- F. Reseaux sociaux & Communautes (16) ---
_s('reddit_global', 'communaute', 'Reddit — discussions intention achat temps reel', 'reddit.com', '{target} {location} recommend looking for',
  { b2b_services: 7, ecommerce: 6, commerce_local: 5, artisan: 5 }),
_s('hackernews', 'communaute', 'Hacker News — communaute tech/startup, lancements', 'news.ycombinator.com', '{target}',
  { b2b_services: 9, ecommerce: 5 }),
_s('f5bot', 'communaute', 'F5Bot — monitoring Reddit/HN/Lobsters par keyword, alertes email', 'f5bot.com', '{target}',
  { b2b_services: 8, ecommerce: 5 }),
_s('discord_servers', 'communaute', 'Discord — communautes tech, crypto, SaaS', 'discord.com', '{target}',
  { b2b_services: 6, ecommerce: 4 }),
_s('slack_communities', 'communaute', 'Slack communities — communautes pro par industrie', null, '{target} slack community {location}',
  { b2b_services: 7 }),
_s('stackexchange', 'communaute', 'Stack Exchange — 45+ sites Q&A specialises', 'stackexchange.com', '{target}',
  { b2b_services: 6 }),
_s('lobsters', 'communaute', 'Lobsters — communaute tech alternative a HN', 'lobste.rs', '{target}',
  { b2b_services: 7 }),
_s('devto', 'communaute', 'dev.to — communaute developpeurs, articles et discussions', 'dev.to', '{target}',
  { b2b_services: 7 }),
_s('hashnode', 'communaute', 'Hashnode — blogs developpeurs par niche technique', 'hashnode.com', '{target}',
  { b2b_services: 6 }),
_s('luma_events', 'communaute', 'Luma — evenements tech/startup', 'lu.ma', '{target} {location}',
  { b2b_services: 7 }),
_s('bluesky', 'communaute', 'Bluesky — reseau social decentralise, communautes tech', 'bsky.app', '{target}',
  { b2b_services: 5 }),
_s('threads_meta', 'communaute', 'Threads — alternative Twitter par Meta', 'threads.net', '{target} {location}',
  { b2b_services: 4, ecommerce: 4 }),
_s('mastodon', 'communaute', 'Mastodon — reseau decentralise, communautes niche', 'joinmastodon.org', '{target}',
  { b2b_services: 5 }),
_s('r_saas', 'communaute', 'r/SaaS — fondateurs et utilisateurs SaaS', 'reddit.com/r/SaaS', '{target}',
  { b2b_services: 10, ecommerce: 5 }),
_s('r_entrepreneur', 'communaute', 'r/Entrepreneur — entrepreneurs avec besoins explicites', 'reddit.com/r/Entrepreneur', '{target}',
  { b2b_services: 8, ecommerce: 6, commerce_local: 5 }),
_s('r_smallbusiness', 'communaute', 'r/smallbusiness — PME avec problemes = opportunites', 'reddit.com/r/smallbusiness', '{target}',
  { commerce_local: 8, b2b_services: 7, artisan: 5 }),

// --- G. Review sites supplementaires (14) ---
_s('software_advice', 'avis_intl', 'Software Advice — recommandations logiciels par categorie', 'softwareadvice.com', '{target}',
  { b2b_services: 8 }),
_s('getapp', 'avis_intl', 'GetApp — comparateur applications B2B', 'getapp.com', '{target}',
  { b2b_services: 8 }),
_s('peerspot', 'avis_intl', 'PeerSpot — avis IT enterprise', 'peerspot.com', '{target}',
  { b2b_services: 7 }),
_s('saasworthy', 'avis_intl', 'SaaSWorthy — annuaire et avis SaaS', 'saasworthy.com', '{target}',
  { b2b_services: 8 }),
_s('crozdesk', 'avis_intl', 'Crozdesk — comparateur logiciels B2B', 'crozdesk.com', '{target}',
  { b2b_services: 7 }),
_s('sourceforge', 'avis_intl', 'SourceForge — logiciels, avis, comparaisons', 'sourceforge.net', '{target}',
  { b2b_services: 6 }),
_s('alternativeto', 'avis_intl', 'AlternativeTo — alternatives a tout logiciel/service', 'alternativeto.net', '{target}',
  { b2b_services: 7, ecommerce: 4 }),
_s('gartner_reviews', 'avis_intl', 'Gartner Peer Insights — avis tech enterprise', 'gartner.com/reviews', '{target}',
  { b2b_services: 9, finance_assurance: 5, sante: 4 }),
_s('chrome_webstore', 'avis_intl', 'Chrome Web Store — extensions, besoins logiciels', 'chrome.google.com/webstore', '{target}',
  { b2b_services: 6 }),
_s('wordpress_plugins', 'avis_intl', 'WordPress Plugin Directory — 500k+ sites par plugin', 'wordpress.org/plugins', '{target}',
  { b2b_services: 5, ecommerce: 6, commerce_local: 4 }),
_s('google_maps_global', 'avis_intl', 'Google Maps Business — entreprises locales mondiales', 'google.com/maps', '{target} {location}',
  { commerce_local: 10, artisan: 9, restauration: 10, tourisme: 9, sante: 7, immobilier: 6 }),
_s('yelp_global', 'avis_intl', 'Yelp — entreprises locales et avis mondiaux', 'yelp.com', '{target} {location}',
  { commerce_local: 9, restauration: 9, tourisme: 8, artisan: 6 }),
_s('glassdoor_reviews', 'avis_intl', 'Glassdoor avis employeurs — culture entreprise, signal investissement', 'glassdoor.com', '{target} reviews',
  { b2b_services: 7, finance_assurance: 5 }),
_s('ih_milestones', 'avis_intl', 'Indie Hackers Milestones — fondateurs partageant croissance', 'indiehackers.com', '{target} milestone revenue',
  { b2b_services: 8 }),

// --- H. Donnees financieres internationales (8) ---
_s('sec_edgar_search', 'financial_intl', 'SEC EDGAR Full-Text — recherche dans filings US', 'efts.sec.gov', '{target}',
  { finance_assurance: 10, b2b_services: 6 }),
_s('seeking_alpha', 'financial_intl', 'Seeking Alpha — earnings calls transcrits, signaux strategiques', 'seekingalpha.com', '{target}',
  { finance_assurance: 9 }),
_s('macrotrends', 'financial_intl', 'Macrotrends — donnees financieres historiques', 'macrotrends.net', '{target}',
  { finance_assurance: 8 }),
_s('yahoo_finance', 'financial_intl', 'Yahoo Finance — donnees financieres, news, screeners', 'finance.yahoo.com', '{target}',
  { finance_assurance: 9, b2b_services: 5 }),
_s('finviz', 'financial_intl', 'Finviz — screener actions US avec filtres avances', 'finviz.com', '{target}',
  { finance_assurance: 9 }),
_s('world_bank', 'financial_intl', 'World Bank Open Data — donnees economiques mondiales', 'data.worldbank.org', '{target}',
  { finance_assurance: 6, agriculture: 5 }),
_s('imf_data', 'financial_intl', 'IMF Data — donnees economiques par pays', 'imf.org', '{target}',
  { finance_assurance: 7 }),
_s('oecd_data', 'financial_intl', 'OECD Data — statistiques pays OCDE', 'data.oecd.org', '{target}',
  { finance_assurance: 6 }),

// --- I. Intelligence technographique (10) ---
_s('builtwith', 'techno', 'BuiltWith — stack techno de n\'importe quel site', 'builtwith.com', '{target}',
  { b2b_services: 9, ecommerce: 8 }),
_s('wappalyzer', 'techno', 'Wappalyzer — detection technos via extension', 'wappalyzer.com', '{target}',
  { b2b_services: 8, ecommerce: 7 }),
_s('similarweb', 'techno', 'SimilarWeb — trafic et analytics de sites web', 'similarweb.com', '{target}',
  { b2b_services: 8, ecommerce: 8, commerce_local: 4 }),
_s('publicwww', 'techno', 'PublicWWW — recherche dans code source sites web', 'publicwww.com', '{target}',
  { b2b_services: 7, ecommerce: 6 }),
_s('shodan', 'techno', 'Shodan — moteur de recherche IoT/serveurs', 'shodan.io', '{target}',
  { b2b_services: 6 }),
_s('censys', 'techno', 'Censys — scan internet, certificats SSL, services', 'search.censys.io', '{target}',
  { b2b_services: 6 }),
_s('dnsdumpster', 'techno', 'DNSdumpster — reconnaissance DNS gratuite', 'dnsdumpster.com', '{target}',
  { b2b_services: 5 }),
_s('wayback_machine', 'techno', 'Wayback Machine — archives web historiques', 'web.archive.org', '{target}',
  { b2b_services: 5, ecommerce: 4 }),
_s('spyfu', 'techno', 'SpyFu — donnees SEO/PPC des concurrents', 'spyfu.com', '{target}',
  { b2b_services: 7, ecommerce: 7 }),
_s('ubersuggest', 'techno', 'Ubersuggest — donnees SEO et keywords', 'neilpatel.com/ubersuggest', '{target}',
  { b2b_services: 6, ecommerce: 6, commerce_local: 4 }),

// --- K. Alertes & Monitoring (8) ---
_s('google_alerts', 'alertes', 'Google Alerts — alertes web par keyword illimitees', 'google.com/alerts', '{target} {location}',
  { b2b_services: 7, ecommerce: 5, commerce_local: 6, artisan: 5 }),
_s('talkwalker_alerts', 'alertes', 'Talkwalker Alerts — x3.7 plus de resultats que Google Alerts', 'talkwalker.com/alerts', '{target} {location}',
  { b2b_services: 8, ecommerce: 6 }),
_s('catchintent', 'alertes', 'CatchIntent — Reddit intent monitoring IA, filtre 95% du bruit', 'catchintent.com', '{target}',
  { b2b_services: 9, ecommerce: 6 }),
_s('mention', 'alertes', 'Mention — 3 alertes, 1000 mentions/mois', 'mention.com', '{target}',
  { b2b_services: 7, ecommerce: 5 }),
_s('social_searcher', 'alertes', 'Social Searcher — monitoring social media gratuit', 'social-searcher.com', '{target} {location}',
  { b2b_services: 6, ecommerce: 5, commerce_local: 5 }),
_s('boardreader', 'alertes', 'Boardreader — recherche dans les forums', 'boardreader.com', '{target} {location}',
  { b2b_services: 6, artisan: 5, btp_construction: 5 }),
_s('google_trends', 'alertes', 'Google Trends — tendances de recherche par topic', 'trends.google.com', '{target}',
  { b2b_services: 6, ecommerce: 7, commerce_local: 5, restauration: 5, tourisme: 5 }),
_s('feedly_rss', 'alertes', 'Feedly/RSS — monitoring via lecteur RSS, signaux temps reel', 'feedly.com', '{target}',
  { b2b_services: 7 }),

// --- L. Google Search Operators (8) ---
_s('dork_linkedin', 'dork', 'Google Dork LinkedIn — trouver decideurs par titre/industrie', null, 'site:linkedin.com/in "{target}" {location}',
  { b2b_services: 10, ecommerce: 7, finance_assurance: 7, sante: 6, immobilier: 7, commerce_local: 6, artisan: 5, juridique: 7 }),
_s('dork_fichiers', 'dork', 'Google Dork fichiers — spreadsheets de prospects caches', null, 'filetype:xlsx OR filetype:csv "{target}" "email" {location}',
  { b2b_services: 8, ecommerce: 6 }),
_s('dork_concurrent', 'dork', 'Google Dork concurrents — detecter insatisfaction', null, '"{target}" ("alternative" OR "switching from" OR "frustrated")',
  { b2b_services: 9, ecommerce: 7 }),
_s('dork_funding', 'dork', 'Google Dork levees — detecter levees de fonds', null, '"{target}" ("raises" OR "funding" OR "series") {location}',
  { b2b_services: 9, finance_assurance: 7 }),
_s('dork_reddit', 'dork', 'Google Dork Reddit — intentions achat Reddit', null, 'site:reddit.com "{target}" "recommend" OR "looking for" {location}',
  { b2b_services: 8, ecommerce: 6, commerce_local: 5, artisan: 6 }),
_s('dork_annuaire', 'dork', 'Google Dork annuaires — trouver annuaires de niche', null, 'inurl:directory OR inurl:members "{target}" {location}',
  { b2b_services: 7, commerce_local: 6, artisan: 6, profession_liberale: 6 }),
_s('dork_hiring', 'dork', 'Google Dork recrutement — signaux de recrutement', null, '"{target}" ("hiring" OR "we\'re growing") {location}',
  { b2b_services: 8, ecommerce: 5, transport_logistique: 6 }),
_s('dork_launch', 'dork', 'Google Dork lancements — nouveaux lancements produits', null, '"{target}" ("just launched" OR "now available" OR "introducing")',
  { b2b_services: 8, ecommerce: 7 }),

// --- M. Enrichissement email (10) ---
_s('hunter_io', 'enrichissement', 'Hunter.io — 25 recherches email/mois gratuites', 'hunter.io', '{target} email',
  { b2b_services: 9, ecommerce: 7, commerce_local: 5, sante: 5, finance_assurance: 6, immobilier: 6, juridique: 6 }),
_s('snov_io', 'enrichissement', 'Snov.io — 50 credits/mois email finder', 'snov.io', '{target} email',
  { b2b_services: 9, ecommerce: 6 }),
_s('clearbit_connect', 'enrichissement', 'Clearbit Connect — 100 lookups/mois dans Gmail', 'clearbit.com', '{target}',
  { b2b_services: 9 }),
_s('rocketreach', 'enrichissement', 'RocketReach — 5 lookups/mois email', 'rocketreach.co', '{target}',
  { b2b_services: 8 }),
_s('lusha', 'enrichissement', 'Lusha — 5 credits/mois contact enrichment', 'lusha.com', '{target}',
  { b2b_services: 8 }),
_s('contactout', 'enrichissement', 'ContactOut — 40 credits/mois email', 'contactout.com', '{target}',
  { b2b_services: 8 }),
_s('skrapp_io', 'enrichissement', 'Skrapp.io — 150 emails/mois', 'skrapp.io', '{target}',
  { b2b_services: 7 }),
_s('anymail_finder', 'enrichissement', 'Anymail Finder — lookups email limites', 'anymailfinder.com', '{target}',
  { b2b_services: 7 }),
_s('voila_norbert', 'enrichissement', 'Voila Norbert — 50 recherches gratuites email', 'voilanorbert.com', '{target}',
  { b2b_services: 7 }),
_s('people_data_labs', 'enrichissement', 'People Data Labs — donnees personnes/entreprises via API', 'peopledatalabs.com', '{target}',
  { b2b_services: 8, finance_assurance: 5 }),

// --- N. Donnees specialisees par niche (22) ---
_s('shopify_stores', 'niche_data', 'Shopify Store Directory — boutiques ecommerce Shopify', 'shopify.com', '{target} store',
  { ecommerce: 10, commerce_local: 5 }),
_s('woocommerce_showcase', 'niche_data', 'WooCommerce Showcase — sites ecommerce WooCommerce', 'woo.com/showcase', '{target}',
  { ecommerce: 9, commerce_local: 4 }),
_s('github_trending', 'niche_data', 'GitHub trending — projets populaires par techno', 'github.com/trending', '{target}',
  { b2b_services: 8 }),
_s('npm_registry', 'niche_data', 'npm registry — packages JS populaires, entreprises tech', 'npmjs.com', '{target}',
  { b2b_services: 7 }),
_s('aws_marketplace', 'niche_data', 'AWS Marketplace — entreprises vendant sur AWS', 'aws.amazon.com/marketplace', '{target}',
  { b2b_services: 8 }),
_s('gcp_marketplace', 'niche_data', 'Google Cloud Marketplace — entreprises vendant sur GCP', 'cloud.google.com/marketplace', '{target}',
  { b2b_services: 8 }),
_s('azure_marketplace', 'niche_data', 'Azure Marketplace — entreprises vendant sur Azure', 'azuremarketplace.microsoft.com', '{target}',
  { b2b_services: 8 }),
_s('salesforce_appexchange', 'niche_data', 'Salesforce AppExchange — apps ecosysteme Salesforce', 'appexchange.salesforce.com', '{target}',
  { b2b_services: 9, finance_assurance: 5 }),
_s('hubspot_apps', 'niche_data', 'HubSpot App Marketplace — apps ecosysteme HubSpot', 'ecosystem.hubspot.com', '{target}',
  { b2b_services: 9 }),
_s('zapier_apps', 'niche_data', 'Zapier App Directory — 3000+ apps integrees', 'zapier.com/apps', '{target}',
  { b2b_services: 8 }),
_s('stripe_partners', 'niche_data', 'Stripe Partners Directory — partenaires Stripe', 'stripe.com/partners/directory', '{target}',
  { b2b_services: 7, finance_assurance: 6, ecommerce: 7 }),
_s('slack_apps', 'niche_data', 'Slack App Directory — apps Slack, entreprises SaaS B2B', 'slack.com/apps', '{target}',
  { b2b_services: 8 }),
_s('figma_community', 'niche_data', 'Figma Community — designers et agences', 'figma.com/community', '{target}',
  { b2b_services: 6 }),
_s('dribbble', 'niche_data', 'Dribbble — designers, agences, freelances', 'dribbble.com', '{target} {location}',
  { b2b_services: 6 }),
_s('behance', 'niche_data', 'Behance — creatifs et agences de design', 'behance.net', '{target} {location}',
  { b2b_services: 6 }),
_s('upwork', 'niche_data', 'Upwork — freelances et agences par specialite', 'upwork.com', '{target} {location}',
  { b2b_services: 7, ecommerce: 4 }),
_s('fiverr', 'niche_data', 'Fiverr — micro-entrepreneurs par service', 'fiverr.com', '{target}',
  { b2b_services: 5, ecommerce: 4 }),
_s('malt_fr', 'niche_data', 'Malt — freelances europeens par specialite', 'malt.fr', '{target} {location}',
  { b2b_services: 8, profession_liberale: 5 }),
_s('toptal_com', 'niche_data', 'Toptal — top 3% freelances tech/finance/design', 'toptal.com', '{target}',
  { b2b_services: 7, finance_assurance: 4 }),
_s('shopify_apps', 'niche_data', 'Shopify App Store — apps SaaS ecommerce', 'apps.shopify.com', '{target}',
  { ecommerce: 10, b2b_services: 7 }),
_s('prestashop_addons', 'niche_data', 'PrestaShop Addons — modules PrestaShop, developpeurs', 'addons.prestashop.com', '{target}',
  { ecommerce: 8 }),
_s('woo_extensions', 'niche_data', 'WooCommerce Extensions — extensions WooCommerce', 'woo.com/products', '{target}',
  { ecommerce: 8 }),

// --- O. Conferences, Awards & Classements (15) ---
_s('saastr', 'conferences', 'SaaStr Annual — decideurs SaaS mondiaux', 'saastr.com', '{target} speaker sponsor',
  { b2b_services: 10 }),
_s('websummit', 'conferences', 'Web Summit — 70k+ attendees tech', 'websummit.com', '{target}',
  { b2b_services: 8 }),
_s('collision', 'conferences', 'Collision — startups et corporates', 'collisionconf.com', '{target}',
  { b2b_services: 7 }),
_s('techcrunch_disrupt', 'conferences', 'TechCrunch Disrupt — startups en competition', 'techcrunch.com/events', '{target}',
  { b2b_services: 9 }),
_s('deloitte_fast500', 'conferences', 'Deloitte Fast 500 — entreprises tech forte croissance', 'deloitte.com', '{target} fast 500',
  { b2b_services: 9 }),
_s('inc_5000', 'conferences', 'Inc. 5000 — entreprises US forte croissance', 'inc.com/inc5000', '{target}',
  { b2b_services: 8 }),
_s('ft_1000', 'conferences', 'FT 1000 — entreprises europeennes en croissance', 'ft.com/ft1000', '{target}',
  { b2b_services: 8, finance_assurance: 5 }),
_s('gartner_mq', 'conferences', 'Gartner Magic Quadrant — vendors par categorie tech', 'gartner.com', '{target} magic quadrant',
  { b2b_services: 9 }),
_s('forrester_wave', 'conferences', 'Forrester Wave — vendors evalues par Forrester', 'forrester.com', '{target} wave',
  { b2b_services: 9 }),
_s('g2_awards', 'conferences', 'G2 Best Software Awards — top logiciels par categorie', 'g2.com/best-software-companies', '{target}',
  { b2b_services: 9 }),
_s('stevie_awards', 'conferences', 'Stevie Awards — business awards mondiaux', 'stevieawards.com', '{target}',
  { b2b_services: 7 }),
_s('ey_entrepreneur', 'conferences', 'EY Entrepreneur of the Year — entrepreneurs primes', 'ey.com', '{target} entrepreneur year',
  { b2b_services: 7, finance_assurance: 5 }),
_s('forbes_lists', 'conferences', 'Forbes lists — 30 Under 30, Cloud 100, classements', 'forbes.com/lists', '{target}',
  { b2b_services: 8 }),
_s('vivatech', 'conferences', 'VivaTech — salon tech Paris, startups et corporates', 'vivatechnology.com', '{target} {location}',
  { b2b_services: 9, ecommerce: 5 }),
_s('bpifrance_excellence', 'conferences', 'BPI France Excellence — PME excellence labellisees', 'bpifrance.fr', '{target} {location} excellence label',
  { b2b_services: 8, commerce_local: 5 }),

// --- P. Open Data & APIs (12) ---
_s('wikidata', 'opendata_api', 'Wikidata SPARQL — base connaissances structuree', 'query.wikidata.org', '{target}',
  { b2b_services: 5 }),
_s('dbpedia', 'opendata_api', 'DBpedia — donnees structurees de Wikipedia', 'dbpedia.org', '{target}',
  { b2b_services: 5 }),
_s('github_api', 'opendata_api', 'GitHub API — repos, contributeurs, organisations', 'api.github.com', '{target}',
  { b2b_services: 8 }),
_s('reddit_api', 'opendata_api', 'Reddit API — posts, commentaires, subreddits', 'reddit.com', '{target}',
  { b2b_services: 7, ecommerce: 5 }),
_s('google_custom_search', 'opendata_api', 'Google Custom Search API — 100 recherches/jour', null, '{target} {location}',
  { b2b_services: 7, ecommerce: 6, commerce_local: 6, artisan: 5 }),
_s('clearbit_logo', 'opendata_api', 'Clearbit Logo API — logos entreprises par domaine', 'logo.clearbit.com', '{target}',
  { b2b_services: 5 }),
_s('common_crawl', 'opendata_api', 'Common Crawl — archive web crawl petaoctets', 'commoncrawl.org', '{target}',
  { b2b_services: 6, ecommerce: 5 }),
_s('diffbot', 'opendata_api', 'Diffbot Knowledge Graph — entites structurees du web', 'diffbot.com', '{target}',
  { b2b_services: 8 }),
_s('abstract_api', 'opendata_api', 'Abstract API — email validation, geolocation', 'abstractapi.com', '{target}',
  { b2b_services: 5 }),
_s('hn_api', 'opendata_api', 'Hacker News API — posts, commentaires, users', null, '{target} hacker news',
  { b2b_services: 7 }),
_s('google_maps_api', 'opendata_api', 'Google Maps Places API — entreprises locales API', null, '{target} {location}',
  { commerce_local: 10, artisan: 9, restauration: 9, tourisme: 8, sante: 7, immobilier: 6, btp_construction: 5 }),
_s('foursquare_api', 'opendata_api', 'Foursquare Places API — donnees lieux et entreprises', 'foursquare.com', '{target} {location}',
  { commerce_local: 8, restauration: 7, tourisme: 7 }),

// --- Q. Niches locales & geographiques internationales (12) ---
_s('yell_uk', 'local_intl', 'Yell.com UK — pages jaunes britanniques', 'yell.com', '{target}',
  { commerce_local: 8, artisan: 7, restauration: 6, tourisme: 5 }),
_s('dasoertliche_de', 'local_intl', 'Das Oertliche DE — annuaire entreprises allemand', 'dasoertliche.de', '{target}',
  { commerce_local: 7, artisan: 6 }),
_s('paginegialle_it', 'local_intl', 'Pagine Gialle IT — pages jaunes italiennes', 'paginegialle.it', '{target}',
  { commerce_local: 7, artisan: 6, restauration: 7 }),
_s('yellowpages_us', 'local_intl', 'Yellow Pages US — annuaire entreprises US', 'yellowpages.com', '{target}',
  { commerce_local: 8, artisan: 6 }),
_s('yellowpages_ca', 'local_intl', 'Yellow Pages Canada — annuaire canadien', 'yellowpages.ca', '{target}',
  { commerce_local: 7 }),
_s('truelocal_au', 'local_intl', 'True Local Australie — annuaire entreprises australien', 'truelocal.com.au', '{target}',
  { commerce_local: 7 }),
_s('justdial_in', 'local_intl', 'JustDial Inde — annuaire entreprises indiennes', 'justdial.com', '{target}',
  { commerce_local: 7 }),
_s('openstreetmap', 'local_intl', 'OpenStreetMap — donnees POI open-source mondiales', 'openstreetmap.org', '{target} {location}',
  { commerce_local: 6, restauration: 5, tourisme: 5 }),
_s('nextdoor_biz', 'local_intl', 'Nextdoor businesses — entreprises locales recommandees', 'nextdoor.com', '{target} {location}',
  { commerce_local: 9, artisan: 7, restauration: 6 }),
_s('alignable', 'local_intl', 'Alignable — reseau social entreprises locales US', 'alignable.com', '{target}',
  { commerce_local: 8, artisan: 6, b2b_services: 5 }),
_s('xing_dach', 'local_intl', 'Xing — reseau professionnel germanophone', 'xing.com', '{target}',
  { b2b_services: 7, finance_assurance: 5 }),
_s('craigslist', 'local_intl', 'Craigslist — entreprises et services locaux US', 'craigslist.org', '{target}',
  { commerce_local: 7, artisan: 6 }),

// --- R. Contenu & Intelligence media (9) ---
_s('google_scholar', 'contenu', 'Google Scholar — articles academiques, chercheurs R&D', 'scholar.google.com', '{target}',
  { sante: 7, b2b_services: 5, energie: 5 }),
_s('arxiv', 'contenu', 'arXiv — pre-publications scientifiques ML, IA, physique', 'arxiv.org', '{target}',
  { b2b_services: 6 }),
_s('researchgate', 'contenu', 'ResearchGate — reseau chercheurs, profils publics', 'researchgate.net', '{target}',
  { sante: 6, b2b_services: 5 }),
_s('medium', 'contenu', 'Medium — articles fondateurs et experts', 'medium.com', '{target} {location}',
  { b2b_services: 7, ecommerce: 5 }),
_s('substack', 'contenu', 'Substack — experts qui publient newsletters de niche', 'substack.com', '{target}',
  { b2b_services: 7 }),
_s('slideshare', 'contenu', 'SlideShare — presentations entreprises et experts', 'slideshare.net', '{target}',
  { b2b_services: 6 }),
_s('speakerdeck', 'contenu', 'Speakerdeck — slides conferences, experts identifiables', 'speakerdeck.com', '{target}',
  { b2b_services: 6 }),
_s('podcast_index', 'contenu', 'Podcast Index — 4M+ podcasts indexes', 'podcastindex.org', '{target}',
  { b2b_services: 6 }),
_s('listen_notes', 'contenu', 'Listen Notes — moteur recherche podcasts', 'listennotes.com', '{target}',
  { b2b_services: 6 }),

// --- V. Crypto, Web3 & DeepTech (8) ---
_s('coingecko', 'crypto', 'CoinGecko — projets crypto avec teams et contacts', 'coingecko.com', '{target}',
  { finance_assurance: 6, b2b_services: 5 }),
_s('coinmarketcap', 'crypto', 'CoinMarketCap — 10k+ projets crypto listes', 'coinmarketcap.com', '{target}',
  { finance_assurance: 6 }),
_s('defillama', 'crypto', 'DeFi Llama — protocoles DeFi avec TVL et teams', 'defillama.com', '{target}',
  { finance_assurance: 7 }),
_s('papers_with_code', 'crypto', 'Papers With Code — projets IA/ML avec auteurs', 'paperswithcode.com', '{target}',
  { b2b_services: 7 }),
_s('huggingface', 'crypto', 'Hugging Face — organisations et entreprises IA', 'huggingface.co', '{target}',
  { b2b_services: 7 }),
_s('replicate', 'crypto', 'Replicate — modeles IA deployes, entreprises tech', 'replicate.com', '{target}',
  { b2b_services: 6 }),
_s('theresanaiforthat', 'crypto', 'There\'s an AI for That — 5000+ outils IA', 'theresanaiforthat.com', '{target}',
  { b2b_services: 8 }),
_s('aigrant', 'crypto', 'AI Grant — startups IA financees', 'aigrant.com', '{target}',
  { b2b_services: 7 }),

// --- W. Immobilier & Construction internationaux (6) ---
_s('zillow_agents', 'immo_intl', 'Zillow — agents immobiliers US', 'zillow.com/professionals', '{target}',
  { immobilier: 9 }),
_s('realtor_com', 'immo_intl', 'Realtor.com — agents et agences US', 'realtor.com', '{target}',
  { immobilier: 8 }),
_s('zoopla_uk', 'immo_intl', 'Zoopla UK — agences immobilieres UK', 'zoopla.co.uk', '{target}',
  { immobilier: 8 }),
_s('immoscout24_de', 'immo_intl', 'ImmoScout24 DE — agences immobilieres Allemagne', 'immobilienscout24.de', '{target}',
  { immobilier: 8 }),
_s('homeadvisor_angi', 'immo_intl', 'HomeAdvisor/Angi — artisans et entrepreneurs US', 'angi.com', '{target}',
  { artisan: 8, btp_construction: 8, immobilier: 5 }),
_s('constructconnect', 'immo_intl', 'ConstructionConnect — projets construction en cours', 'constructconnect.com', '{target}',
  { btp_construction: 9 }),

// --- X. Sante internationaux (8) ---
_s('npi_registry', 'sante_intl', 'NPI Registry US — tous professionnels sante US', 'npiregistry.cms.hhs.gov', '{target}',
  { sante: 10, profession_liberale: 6 }),
_s('healthgrades', 'sante_intl', 'Healthgrades — medecins US avec avis', 'healthgrades.com', '{target}',
  { sante: 9 }),
_s('zocdoc', 'sante_intl', 'Zocdoc — praticiens avec disponibilites', 'zocdoc.com', '{target}',
  { sante: 9 }),
_s('clinicaltrials', 'sante_intl', 'ClinicalTrials.gov — essais cliniques, pharma qui investit', 'clinicaltrials.gov', '{target}',
  { sante: 8 }),
_s('pubmed', 'sante_intl', 'PubMed — chercheurs medicaux par specialite', 'pubmed.ncbi.nlm.nih.gov', '{target}',
  { sante: 7 }),
_s('fda_orange', 'sante_intl', 'FDA Orange Book — medicaments approuves, entreprises pharma', 'fda.gov', '{target}',
  { sante: 7 }),
_s('ema_europe', 'sante_intl', 'EMA Europe — medicaments approuves EU', 'ema.europa.eu', '{target}',
  { sante: 7 }),
_s('hospital_compare', 'sante_intl', 'Hospital Compare CMS — hopitaux US avec performance', 'medicare.gov/care-compare', '{target}',
  { sante: 8 }),

// --- Y. Education internationaux (6) ---
_s('udemy_instructors', 'education', 'Udemy instructors — formateurs par specialite', 'udemy.com', '{target}',
  { b2b_services: 5, profession_liberale: 4 }),
_s('coursera_partners', 'education', 'Coursera partners — universites et entreprises partenaires', 'coursera.org', '{target}',
  { b2b_services: 5 }),
_s('edx_partners', 'education', 'edX partners — institutions educatives partenaires', 'edx.org', '{target}',
  { b2b_services: 5 }),
_s('nces_us', 'education', 'NCES USA — toutes ecoles et universites US', 'nces.ed.gov', '{target}',
  { b2b_services: 4 }),
_s('holoniq_edtech', 'education', 'HolonIQ EdTech — listes entreprises EdTech', 'holoniq.com', '{target}',
  { b2b_services: 6 }),
_s('qs_rankings', 'education', 'QS World University Rankings — universites classees', 'topuniversities.com', '{target}',
  { b2b_services: 4 }),

// --- Z. Transport & Industrie internationaux (6) ---
_s('fmcsa_us', 'transport_intl', 'FMCSA US — toutes entreprises transport US', 'safer.fmcsa.dot.gov', '{target}',
  { transport_logistique: 9 }),
_s('importyeti', 'transport_intl', 'ImportYeti — donnees douanieres US, supply chain', 'importyeti.com', '{target}',
  { transport_logistique: 8, ecommerce: 6 }),
_s('truckpaper', 'transport_intl', 'TruckPaper — concessionnaires camions', 'truckpaper.com', '{target}',
  { transport_logistique: 8 }),
_s('machinerytrader', 'transport_intl', 'MachineryTrader — vendeurs equipements industriels', 'machinerytrader.com', '{target}',
  { transport_logistique: 6, btp_construction: 7, agriculture: 6 }),
_s('industrynet_us', 'transport_intl', 'IndustryNet — fabricants fournisseurs industriels US', 'industrynet.com', '{target}',
  { b2b_services: 6, transport_logistique: 5 }),
_s('duns_lookup', 'transport_intl', 'DUNS Lookup — recherche entreprises D-U-N-S', 'dnb.com', '{target}',
  { b2b_services: 7, finance_assurance: 6, transport_logistique: 5 }),

// --- AA. Gouvernement, ONG & Secteur public (8) ---
_s('guidestar', 'ong_public', 'GuideStar/Candid — base ONG et fondations US', 'candid.org', '{target}',
  { b2b_services: 5 }),
_s('charity_navigator', 'ong_public', 'Charity Navigator — ONG notees et evaluees', 'charitynavigator.org', '{target}',
  { b2b_services: 5 }),
_s('usaspending', 'ong_public', 'USAspending — tous contrats gouvernementaux US', 'usaspending.gov', '{target}',
  { b2b_services: 7 }),
_s('sam_gov', 'ong_public', 'SAM.gov — registre fournisseurs gouvernement US', 'sam.gov', '{target}',
  { b2b_services: 7, transport_logistique: 5 }),
_s('ted_eu', 'ong_public', 'TED EU — appels offres publics europeens', 'ted.europa.eu', '{target} {location}',
  { b2b_services: 8, btp_construction: 7, transport_logistique: 6 }),
_s('grants_gov', 'ong_public', 'Grants.gov — subventions federales US', 'grants.gov', '{target}',
  { b2b_services: 5, sante: 4 }),
_s('un_marketplace', 'ong_public', 'UN Marketplace — fournisseurs Nations Unies', 'marketplace.un.org', '{target}',
  { b2b_services: 6 }),
_s('devex', 'ong_public', 'DEVEX — ONG et organisations developpement', 'devex.com', '{target}',
  { b2b_services: 5 }),

// --- AB. Medias, Presse & Influenceurs (12) ---
_s('connectively', 'media_intl', 'Connectively (ex-HARO) — journalistes cherchant sources', 'connectively.us', '{target}',
  { b2b_services: 7 }),
_s('muckrack', 'media_intl', 'MuckRack — base journalistes par beat', 'muckrack.com', '{target}',
  { b2b_services: 6 }),
_s('tiktok_creators', 'media_intl', 'TikTok Creator Marketplace — createurs par niche', 'creatormarketplace.tiktok.com', '{target}',
  { ecommerce: 7, restauration: 5, commerce_local: 5 }),
_s('twitch_directory', 'media_intl', 'Twitch Directory — streamers par categorie', 'twitch.tv/directory', '{target}',
  { ecommerce: 5 }),
_s('pr_newswire', 'media_intl', 'PR Newswire — entreprises publiant communiques', 'prnewswire.com', '{target} {location}',
  { b2b_services: 7, finance_assurance: 5 }),
_s('businesswire', 'media_intl', 'BusinessWire — communiques presse mondiaux', 'businesswire.com', '{target}',
  { b2b_services: 7, finance_assurance: 5 }),
_s('globenewswire', 'media_intl', 'Globe Newswire — communiques presse internationaux', 'globenewswire.com', '{target}',
  { b2b_services: 6 }),
_s('chartable_podcasts', 'media_intl', 'Chartable — podcasts populaires par categorie', 'chartable.com', '{target}',
  { b2b_services: 5 }),
_s('beehiiv_newsletters', 'media_intl', 'Beehiiv — newsletters par niche', 'beehiiv.com', '{target}',
  { b2b_services: 5, ecommerce: 4 }),
_s('youtube_creators', 'media_intl', 'YouTube Creator Directory — createurs B2B par niche', 'youtube.com', '{target} {location} channel',
  { b2b_services: 6, ecommerce: 5, restauration: 4, commerce_local: 4 }),
_s('instagram_creators', 'media_intl', 'Instagram Creator Marketplace — createurs par niche', 'instagram.com', '{target} {location} business',
  { ecommerce: 7, restauration: 6, commerce_local: 6, tourisme: 5 }),
_s('prlog', 'media_intl', 'PRLog — communiques presse gratuits', 'prlog.org', '{target}',
  { b2b_services: 5 }),

// --- AD. Legal, Compliance & Brevets internationaux (8) ---
_s('google_patents', 'legal_intl', 'Google Patents — brevets mondiaux, entreprises innovantes', 'patents.google.com', '{target}',
  { b2b_services: 6, sante: 5, energie: 5 }),
_s('uspto', 'legal_intl', 'USPTO — brevets US avec inventeurs et entreprises', 'patft.uspto.gov', '{target}',
  { b2b_services: 6 }),
_s('espacenet', 'legal_intl', 'Espacenet — brevets europeens', 'worldwide.espacenet.com', '{target}',
  { b2b_services: 6, energie: 5 }),
_s('wipo_patentscope', 'legal_intl', 'WIPO PATENTSCOPE — brevets mondiaux', 'patentscope.wipo.int', '{target}',
  { b2b_services: 6 }),
_s('justia_us', 'legal_intl', 'Justia US — dossiers juridiques et avocats US', 'justia.com', '{target}',
  { juridique: 8 }),
_s('avvo', 'legal_intl', 'Avvo — annuaire avocats US avec avis', 'avvo.com', '{target}',
  { juridique: 8 }),
_s('legal500', 'legal_intl', 'Legal500 — classement cabinets avocats mondiaux', 'legal500.com', '{target} {location}',
  { juridique: 9 }),
_s('chambers_partners', 'legal_intl', 'Chambers & Partners — rankings cabinets juridiques', 'chambers.com', '{target} {location}',
  { juridique: 9 }),

// --- AE. Agriculture & Energie internationaux (6) ---
_s('usda', 'agri_intl', 'USDA — donnees agricoles US', 'usda.gov', '{target}',
  { agriculture: 8 }),
_s('open_food_facts', 'agri_intl', 'Open Food Facts — base produits alimentaires mondiale', 'world.openfoodfacts.org', '{target}',
  { agriculture: 7, restauration: 5 }),
_s('irena', 'agri_intl', 'IRENA — donnees energie renouvelable par pays', 'irena.org', '{target}',
  { energie: 8 }),
_s('global_solar_atlas', 'agri_intl', 'Global Solar Atlas — donnees solaires par localisation', 'globalsolaratlas.info', '{target} {location}',
  { energie: 8 }),
_s('wine_searcher', 'agri_intl', 'Wine-Searcher — producteurs vin mondiaux', 'wine-searcher.com', '{target} {location}',
  { agriculture: 7, restauration: 5, tourisme: 4 }),
_s('faostat', 'agri_intl', 'FAOSTAT — donnees agriculture mondiale FAO', 'fao.org/faostat', '{target}',
  { agriculture: 8 }),

// --- AF. Finance & Assurance internationaux (8) ---
_s('finra_brokercheck', 'finance_intl', 'FINRA BrokerCheck — courtiers conseillers US', 'brokercheck.finra.org', '{target}',
  { finance_assurance: 10 }),
_s('sec_adviser', 'finance_intl', 'SEC Investment Adviser — conseillers investissement US', 'adviserinfo.sec.gov', '{target}',
  { finance_assurance: 10 }),
_s('fca_register', 'finance_intl', 'FCA Register UK — entreprises financieres UK regulees', 'register.fca.org.uk', '{target}',
  { finance_assurance: 9 }),
_s('bafin_de', 'finance_intl', 'BaFin Register DE — entreprises financieres DE regulees', 'bafin.de', '{target}',
  { finance_assurance: 9 }),
_s('acpr_fr', 'finance_intl', 'ACPR Registre France — banques et assurances francaises', 'acpr.banque-france.fr', '{target} {location}',
  { finance_assurance: 10 }),
_s('cbinsights_fintech', 'finance_intl', 'CB Insights Fintech 250 — top fintech mondiales', 'cbinsights.com', '{target} fintech',
  { finance_assurance: 9, b2b_services: 6 }),
_s('finovate', 'finance_intl', 'Finovate — startups fintech qui pitchent', 'finovate.com', '{target}',
  { finance_assurance: 8 }),
_s('naic_insurance', 'finance_intl', 'NAIC Insurance — compagnies assurance US par etat', 'naic.org', '{target}',
  { finance_assurance: 9 }),

// --- AG. Automobile & Mobilite (6) ---
_s('cars_com', 'automobile', 'Cars.com — concessionnaires US', 'cars.com', '{target}',
  { commerce_local: 6, transport_logistique: 5 }),
_s('autotrader_uk', 'automobile', 'AutoTrader UK — concessionnaires UK', 'autotrader.co.uk', '{target}',
  { commerce_local: 6 }),
_s('dealerrater', 'automobile', 'DealerRater — concessionnaires avec avis', 'dealerrater.com', '{target}',
  { commerce_local: 6 }),
_s('electrek', 'automobile', 'Electrek — entreprises vehicules electriques', 'electrek.co', '{target}',
  { energie: 7, transport_logistique: 6 }),
_s('plugshare', 'automobile', 'PlugShare — reseaux recharge EV, entreprises', 'plugshare.com', '{target} {location}',
  { energie: 7, transport_logistique: 5 }),
_s('fleetowner', 'automobile', 'FleetOwner — gestionnaires de flottes', 'fleetowner.com', '{target}',
  { transport_logistique: 8 }),

// --- AH. Sport, Loisirs & Tourisme internationaux (8) ---
_s('viator', 'tourisme_intl', 'Viator — operateurs activites touristiques', 'viator.com', '{target} {location}',
  { tourisme: 9 }),
_s('getyourguide', 'tourisme_intl', 'GetYourGuide — fournisseurs experiences', 'getyourguide.com', '{target} {location}',
  { tourisme: 9 }),
_s('mindbody', 'tourisme_intl', 'Mindbody — studios fitness, yoga, bien-etre', 'mindbodyonline.com', '{target} {location}',
  { sante: 6, commerce_local: 6 }),
_s('classpass', 'tourisme_intl', 'ClassPass — studios et salles partenaires', 'classpass.com', '{target} {location}',
  { sante: 5, commerce_local: 6 }),
_s('opentable', 'tourisme_intl', 'OpenTable — restaurants avec reservation en ligne', 'opentable.com', '{target} {location}',
  { restauration: 9, tourisme: 7 }),
_s('resy', 'tourisme_intl', 'Resy — restaurants premium', 'resy.com', '{target} {location}',
  { restauration: 8, tourisme: 6 }),
_s('mindbody_studios', 'tourisme_intl', 'Studios sport et bien-etre — fitness, yoga, pilates', null, '{target} {location} studio fitness yoga',
  { sante: 6, commerce_local: 7 }),
_s('faire_marketplace', 'tourisme_intl', 'Faire — marques wholesale B2B', 'faire.com', '{target}',
  { ecommerce: 8, commerce_local: 5, restauration: 4 }),

// --- AI. Donnees demographiques (8) ---
_s('us_census', 'census', 'US Census Business Builder — donnees business par zone US', 'census.gov', '{target}',
  { commerce_local: 6, b2b_services: 5 }),
_s('eurostat', 'census', 'Eurostat — statistiques entreprises europeennes', 'ec.europa.eu/eurostat', '{target}',
  { b2b_services: 6, finance_assurance: 5 }),
_s('insee', 'census', 'INSEE — donnees entreprises francaises', 'insee.fr', '{target} {location}',
  { b2b_services: 7, commerce_local: 7, artisan: 6, finance_assurance: 5, agriculture: 6 }),
_s('destatis_de', 'census', 'Destatis DE — statistiques entreprises allemandes', 'destatis.de', '{target}',
  { b2b_services: 5 }),
_s('ons_uk', 'census', 'ONS UK — statistiques entreprises britanniques', 'ons.gov.uk', '{target}',
  { b2b_services: 5 }),
_s('data_gouv_open', 'census', 'data.gouv.fr — open data gouvernemental francais', 'data.gouv.fr', '{target} {location}',
  { b2b_services: 7, agriculture: 6, commerce_local: 6, btp_construction: 5, energie: 5 }),
_s('data_gov_uk', 'census', 'data.gov.uk — open data gouvernemental UK', 'data.gov.uk', '{target}',
  { b2b_services: 5 }),
_s('govdata_de', 'census', 'GOVDATA DE — open data gouvernemental allemand', 'govdata.de', '{target}',
  { b2b_services: 5 }),

// --- Communautes Reddit par niche (10) ---
_s('r_startups', 'reddit_niche', 'r/startups — fondateurs en phase croissance', 'reddit.com/r/startups', '{target}',
  { b2b_services: 9, ecommerce: 6 }),
_s('r_sales', 'reddit_niche', 'r/sales — sales reps cherchant outils', 'reddit.com/r/sales', '{target}',
  { b2b_services: 8 }),
_s('r_marketing', 'reddit_niche', 'r/marketing — marketeurs avec besoins', 'reddit.com/r/marketing', '{target}',
  { b2b_services: 8, ecommerce: 6 }),
_s('r_ecommerce', 'reddit_niche', 'r/ecommerce — vendeurs ecommerce', 'reddit.com/r/ecommerce', '{target}',
  { ecommerce: 10, commerce_local: 5 }),
_s('r_realestate', 'reddit_niche', 'r/realestate — professionnels immobilier', 'reddit.com/r/realestate', '{target}',
  { immobilier: 9 }),
_s('r_accounting', 'reddit_niche', 'r/accounting — comptables et experts-comptables', 'reddit.com/r/accounting', '{target}',
  { finance_assurance: 8, juridique: 6, profession_liberale: 7 }),
_s('r_consulting', 'reddit_niche', 'r/consulting — consultants par specialite', 'reddit.com/r/consulting', '{target}',
  { b2b_services: 8 }),
_s('r_webdev', 'reddit_niche', 'r/webdev — developpeurs web et agences', 'reddit.com/r/webdev', '{target}',
  { b2b_services: 8 }),
_s('r_cybersecurity', 'reddit_niche', 'r/cybersecurity — pros securite, entreprises budget', 'reddit.com/r/cybersecurity', '{target}',
  { b2b_services: 7 }),
_s('r_datascience', 'reddit_niche', 'r/datascience — data scientists, entreprises data-driven', 'reddit.com/r/datascience', '{target}',
  { b2b_services: 7 }),

// --- Registres complementaires internationaux (6) ---
_s('infocamere_it', 'registre_extra', 'InfoCamere Italie — registre entreprises italiennes', 'registroimprese.it', '{target}',
  { b2b_services: 5 }),
_s('empresa360_es', 'registre_extra', 'Empresa360 Espagne — recherche entreprises espagnoles', 'empresa360.es', '{target}',
  { b2b_services: 5 }),
_s('nz_companies', 'registre_extra', 'NZ Companies — registre entreprises Nouvelle-Zelande', 'companies-register.companiesoffice.govt.nz', '{target}',
  { b2b_services: 5 }),
_s('asic_au', 'registre_extra', 'ASIC Australie — registre entreprises australiennes', 'connectonline.asic.gov.au', '{target}',
  { b2b_services: 5 }),
_s('cro_ireland', 'registre_extra', 'CRO Irlande — registre entreprises irlandaises', 'cro.ie', '{target}',
  { b2b_services: 6 }),
_s('moc_thailand', 'registre_extra', 'MoC Thailand — registre commerce thailandais', 'dbd.go.th', '{target}',
  { b2b_services: 4 }),

// --- B2B marketplaces internationales (7) ---
_s('tradekey', 'b2b_extra', 'TradeKey — marketplace B2B import/export', 'tradekey.com', '{target}',
  { transport_logistique: 7, ecommerce: 6 }),
_s('global_sources', 'b2b_extra', 'Global Sources — fournisseurs asiatiques B2B', 'globalsources.com', '{target}',
  { transport_logistique: 7, ecommerce: 6 }),
_s('ec21', 'b2b_extra', 'EC21 — marketplace B2B coreenne mondiale', 'ec21.com', '{target}',
  { ecommerce: 5, transport_logistique: 5 }),
_s('dhgate', 'b2b_extra', 'DHgate — marketplace B2B chinoise', 'dhgate.com', '{target}',
  { ecommerce: 6, transport_logistique: 5 }),
_s('iglobal', 'b2b_extra', 'iGlobal — annuaire entreprises mondiales', 'iglobal.co', '{target} {location}',
  { commerce_local: 5, b2b_services: 5 }),
_s('opportunity_network', 'b2b_extra', 'Opportunity Network — B2B deal matching global', 'opportunitynetwork.com', '{target}',
  { b2b_services: 7, finance_assurance: 5 }),
_s('tundra_wholesale', 'b2b_extra', 'Tundra — fournisseurs wholesale', 'tundra.com', '{target}',
  { ecommerce: 7, commerce_local: 4 }),

// --- HN & Communautes tech (4) ---
_s('hn_show', 'hn_tech', 'Show HN — createurs qui lancent, prospects potentiels', 'news.ycombinator.com', '{target} show hn',
  { b2b_services: 9, ecommerce: 5 }),
_s('hn_ask', 'hn_tech', 'Ask HN — questions, intentions, besoins explicites', 'news.ycombinator.com', '{target} ask hn',
  { b2b_services: 8 }),
_s('saas_mantra', 'hn_tech', 'SaaS Mantra — communaute fondateurs SaaS', 'saasmantra.com', '{target}',
  { b2b_services: 8 }),
_s('growthhackers', 'hn_tech', 'Growth Hackers — communaute marketeurs growth', 'growthhackers.com', '{target}',
  { b2b_services: 7, ecommerce: 5 }),
);

// ============================================================
// Defaults pour les 8 nouvelles niches sur les sources existantes
// ============================================================

const CATEGORY_NICHE_DEFAULTS = {
  annuaire:       { energie: 4, sante: 5, restauration: 6, btp_construction: 5, juridique: 5, finance_assurance: 4, franchise: 4, agriculture: 3 },
  emploi:         { energie: 5, sante: 5, restauration: 4, btp_construction: 5, juridique: 4, finance_assurance: 5, franchise: 3, agriculture: 4 },
  avis:           { energie: 2, sante: 5, restauration: 7, btp_construction: 4, juridique: 3, finance_assurance: 3, franchise: 4, agriculture: 2 },
  social:         { energie: 2, sante: 4, restauration: 7, btp_construction: 3, juridique: 2, finance_assurance: 3, franchise: 5, agriculture: 3 },
  opendata:       { energie: 5, sante: 4, restauration: 3, btp_construction: 5, juridique: 5, finance_assurance: 5, franchise: 4, agriculture: 5 },
  immo:           { energie: 4, sante: 2, restauration: 2, btp_construction: 7, juridique: 4, finance_assurance: 5, franchise: 3, agriculture: 2 },
  marches:        { energie: 6, sante: 3, restauration: 2, btp_construction: 8, juridique: 5, finance_assurance: 3, franchise: 2, agriculture: 4 },
  presse:         { energie: 4, sante: 4, restauration: 5, btp_construction: 4, juridique: 3, finance_assurance: 4, franchise: 4, agriculture: 4 },
  forums:         { energie: 3, sante: 5, restauration: 5, btp_construction: 6, juridique: 4, finance_assurance: 3, franchise: 3, agriculture: 4 },
  ecommerce:      { energie: 2, sante: 2, restauration: 3, btp_construction: 2, juridique: 1, finance_assurance: 2, franchise: 3, agriculture: 3 },
  financial:      { energie: 5, sante: 4, restauration: 4, btp_construction: 5, juridique: 6, finance_assurance: 7, franchise: 5, agriculture: 4 },
  tech:           { energie: 4, sante: 3, restauration: 2, btp_construction: 2, juridique: 2, finance_assurance: 4, franchise: 2, agriculture: 1 },
  // V3 categories
  opendata_gouv:  { energie: 5, sante: 4, restauration: 3, btp_construction: 6, juridique: 5, finance_assurance: 5, franchise: 3, agriculture: 5 },
  startup:        { energie: 5, sante: 4, restauration: 3, btp_construction: 3, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 3 },
  evenements:     { energie: 4, sante: 5, restauration: 6, btp_construction: 6, juridique: 4, finance_assurance: 4, franchise: 5, agriculture: 5 },
  palmares:       { energie: 5, sante: 4, restauration: 4, btp_construction: 5, juridique: 4, finance_assurance: 5, franchise: 4, agriculture: 4 },
  industrie:      { energie: 6, sante: 3, restauration: 2, btp_construction: 5, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 3 },
  marketplace:    { energie: 2, sante: 2, restauration: 3, btp_construction: 3, juridique: 1, finance_assurance: 2, franchise: 3, agriculture: 3 },
  media:          { energie: 4, sante: 4, restauration: 4, btp_construction: 3, juridique: 4, finance_assurance: 5, franchise: 4, agriculture: 3 },
  environnement:  { energie: 8, sante: 3, restauration: 4, btp_construction: 6, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 6 },
  // V4 categories (301 international + niche sources)
  registre_intl:  { commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 3, ecommerce: 4, b2b_services: 6, tourisme: 2, transport_logistique: 4, energie: 3, sante: 3, restauration: 2, btp_construction: 3, juridique: 4, finance_assurance: 5, franchise: 3, agriculture: 3 },
  b2b_intl:       { commerce_local: 3, artisan: 2, profession_liberale: 2, immobilier: 2, ecommerce: 6, b2b_services: 6, tourisme: 2, transport_logistique: 6, energie: 3, sante: 2, restauration: 2, btp_construction: 3, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 3 },
  annuaire_intl:  { commerce_local: 3, artisan: 2, profession_liberale: 4, immobilier: 3, ecommerce: 4, b2b_services: 7, tourisme: 2, transport_logistique: 3, energie: 3, sante: 3, restauration: 2, btp_construction: 2, juridique: 3, finance_assurance: 4, franchise: 2, agriculture: 2 },
  startup_intl:   { commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 2, ecommerce: 5, b2b_services: 8, tourisme: 1, transport_logistique: 3, energie: 4, sante: 3, restauration: 2, btp_construction: 2, juridique: 2, finance_assurance: 4, franchise: 2, agriculture: 2 },
  emploi_intl:    { commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 3, ecommerce: 5, b2b_services: 7, tourisme: 3, transport_logistique: 5, energie: 4, sante: 4, restauration: 3, btp_construction: 4, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 3 },
  communaute:     { commerce_local: 4, artisan: 4, profession_liberale: 3, immobilier: 3, ecommerce: 5, b2b_services: 7, tourisme: 3, transport_logistique: 3, energie: 3, sante: 4, restauration: 4, btp_construction: 4, juridique: 3, finance_assurance: 3, franchise: 3, agriculture: 3 },
  avis_intl:      { commerce_local: 5, artisan: 3, profession_liberale: 3, immobilier: 3, ecommerce: 5, b2b_services: 6, tourisme: 4, transport_logistique: 3, energie: 2, sante: 4, restauration: 5, btp_construction: 3, juridique: 3, finance_assurance: 3, franchise: 4, agriculture: 2 },
  financial_intl: { commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 2, ecommerce: 3, b2b_services: 5, tourisme: 1, transport_logistique: 2, energie: 3, sante: 2, restauration: 1, btp_construction: 2, juridique: 3, finance_assurance: 8, franchise: 2, agriculture: 2 },
  techno:         { commerce_local: 3, artisan: 2, profession_liberale: 2, immobilier: 2, ecommerce: 6, b2b_services: 7, tourisme: 2, transport_logistique: 2, energie: 3, sante: 2, restauration: 2, btp_construction: 2, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 1 },
  alertes:        { commerce_local: 5, artisan: 4, profession_liberale: 3, immobilier: 3, ecommerce: 5, b2b_services: 7, tourisme: 3, transport_logistique: 4, energie: 4, sante: 4, restauration: 4, btp_construction: 4, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 3 },
  dork:           { commerce_local: 5, artisan: 5, profession_liberale: 5, immobilier: 5, ecommerce: 6, b2b_services: 8, tourisme: 4, transport_logistique: 5, energie: 4, sante: 4, restauration: 4, btp_construction: 5, juridique: 5, finance_assurance: 5, franchise: 4, agriculture: 4 },
  enrichissement: { commerce_local: 5, artisan: 4, profession_liberale: 5, immobilier: 5, ecommerce: 6, b2b_services: 8, tourisme: 3, transport_logistique: 4, energie: 4, sante: 5, restauration: 3, btp_construction: 4, juridique: 5, finance_assurance: 5, franchise: 4, agriculture: 3 },
  niche_data:     { commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 2, ecommerce: 7, b2b_services: 6, tourisme: 2, transport_logistique: 3, energie: 2, sante: 2, restauration: 2, btp_construction: 2, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 2 },
  conferences:    { commerce_local: 2, artisan: 1, profession_liberale: 3, immobilier: 2, ecommerce: 4, b2b_services: 8, tourisme: 2, transport_logistique: 3, energie: 4, sante: 4, restauration: 2, btp_construction: 3, juridique: 3, finance_assurance: 5, franchise: 3, agriculture: 2 },
  opendata_api:   { commerce_local: 5, artisan: 4, profession_liberale: 3, immobilier: 3, ecommerce: 5, b2b_services: 6, tourisme: 4, transport_logistique: 4, energie: 4, sante: 4, restauration: 4, btp_construction: 4, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 4 },
  local_intl:     { commerce_local: 7, artisan: 6, profession_liberale: 4, immobilier: 4, ecommerce: 3, b2b_services: 4, tourisme: 5, transport_logistique: 3, energie: 2, sante: 4, restauration: 6, btp_construction: 3, juridique: 3, finance_assurance: 3, franchise: 4, agriculture: 3 },
  contenu:        { commerce_local: 2, artisan: 2, profession_liberale: 3, immobilier: 2, ecommerce: 4, b2b_services: 6, tourisme: 2, transport_logistique: 2, energie: 4, sante: 5, restauration: 2, btp_construction: 2, juridique: 3, finance_assurance: 3, franchise: 2, agriculture: 3 },
  crypto:         { commerce_local: 1, artisan: 1, profession_liberale: 1, immobilier: 1, ecommerce: 3, b2b_services: 6, tourisme: 1, transport_logistique: 1, energie: 3, sante: 3, restauration: 1, btp_construction: 1, juridique: 1, finance_assurance: 5, franchise: 1, agriculture: 1 },
  immo_intl:      { commerce_local: 3, artisan: 5, profession_liberale: 2, immobilier: 8, ecommerce: 1, b2b_services: 3, tourisme: 2, transport_logistique: 1, energie: 2, sante: 1, restauration: 1, btp_construction: 6, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 1 },
  sante_intl:     { commerce_local: 2, artisan: 1, profession_liberale: 5, immobilier: 1, ecommerce: 2, b2b_services: 4, tourisme: 1, transport_logistique: 1, energie: 1, sante: 9, restauration: 1, btp_construction: 1, juridique: 2, finance_assurance: 3, franchise: 1, agriculture: 2 },
  education:      { commerce_local: 2, artisan: 2, profession_liberale: 4, immobilier: 1, ecommerce: 3, b2b_services: 5, tourisme: 1, transport_logistique: 1, energie: 2, sante: 3, restauration: 1, btp_construction: 1, juridique: 2, finance_assurance: 2, franchise: 2, agriculture: 2 },
  transport_intl: { commerce_local: 2, artisan: 2, profession_liberale: 1, immobilier: 1, ecommerce: 4, b2b_services: 5, tourisme: 2, transport_logistique: 8, energie: 3, sante: 1, restauration: 1, btp_construction: 5, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 5 },
  ong_public:     { commerce_local: 2, artisan: 2, profession_liberale: 3, immobilier: 2, ecommerce: 2, b2b_services: 6, tourisme: 2, transport_logistique: 4, energie: 4, sante: 4, restauration: 2, btp_construction: 5, juridique: 4, finance_assurance: 3, franchise: 2, agriculture: 3 },
  media_intl:     { commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 2, ecommerce: 4, b2b_services: 6, tourisme: 3, transport_logistique: 2, energie: 3, sante: 3, restauration: 3, btp_construction: 2, juridique: 3, finance_assurance: 4, franchise: 3, agriculture: 2 },
  legal_intl:     { commerce_local: 1, artisan: 1, profession_liberale: 4, immobilier: 3, ecommerce: 2, b2b_services: 5, tourisme: 1, transport_logistique: 2, energie: 4, sante: 4, restauration: 1, btp_construction: 2, juridique: 8, finance_assurance: 5, franchise: 2, agriculture: 2 },
  agri_intl:      { commerce_local: 3, artisan: 2, profession_liberale: 2, immobilier: 1, ecommerce: 3, b2b_services: 4, tourisme: 3, transport_logistique: 3, energie: 6, sante: 3, restauration: 4, btp_construction: 2, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 9 },
  finance_intl:   { commerce_local: 1, artisan: 1, profession_liberale: 3, immobilier: 3, ecommerce: 2, b2b_services: 5, tourisme: 1, transport_logistique: 2, energie: 3, sante: 2, restauration: 1, btp_construction: 2, juridique: 4, finance_assurance: 9, franchise: 2, agriculture: 2 },
  automobile:     { commerce_local: 5, artisan: 3, profession_liberale: 1, immobilier: 1, ecommerce: 3, b2b_services: 4, tourisme: 2, transport_logistique: 7, energie: 6, sante: 1, restauration: 1, btp_construction: 2, juridique: 2, finance_assurance: 4, franchise: 4, agriculture: 2 },
  tourisme_intl:  { commerce_local: 5, artisan: 2, profession_liberale: 2, immobilier: 3, ecommerce: 4, b2b_services: 4, tourisme: 9, transport_logistique: 3, energie: 2, sante: 4, restauration: 7, btp_construction: 2, juridique: 2, finance_assurance: 3, franchise: 3, agriculture: 3 },
  census:         { commerce_local: 5, artisan: 4, profession_liberale: 3, immobilier: 4, ecommerce: 4, b2b_services: 6, tourisme: 3, transport_logistique: 4, energie: 4, sante: 4, restauration: 4, btp_construction: 4, juridique: 3, finance_assurance: 5, franchise: 3, agriculture: 5 },
  reddit_niche:   { commerce_local: 4, artisan: 4, profession_liberale: 4, immobilier: 4, ecommerce: 6, b2b_services: 7, tourisme: 3, transport_logistique: 3, energie: 3, sante: 4, restauration: 4, btp_construction: 4, juridique: 4, finance_assurance: 4, franchise: 3, agriculture: 3 },
  registre_extra: { commerce_local: 3, artisan: 2, profession_liberale: 3, immobilier: 2, ecommerce: 3, b2b_services: 5, tourisme: 2, transport_logistique: 3, energie: 3, sante: 2, restauration: 2, btp_construction: 3, juridique: 3, finance_assurance: 4, franchise: 2, agriculture: 2 },
  b2b_extra:      { commerce_local: 3, artisan: 2, profession_liberale: 2, immobilier: 2, ecommerce: 5, b2b_services: 5, tourisme: 2, transport_logistique: 6, energie: 3, sante: 2, restauration: 2, btp_construction: 3, juridique: 2, finance_assurance: 3, franchise: 2, agriculture: 3 },
  hn_tech:        { commerce_local: 1, artisan: 1, profession_liberale: 2, immobilier: 1, ecommerce: 4, b2b_services: 8, tourisme: 1, transport_logistique: 2, energie: 3, sante: 3, restauration: 1, btp_construction: 1, juridique: 2, finance_assurance: 3, franchise: 1, agriculture: 1 },
};

for (const source of SOURCES) {
  const defaults = CATEGORY_NICHE_DEFAULTS[source.category];
  if (defaults) {
    for (const [niche, score] of Object.entries(defaults)) {
      if (source.nicheRelevance[niche] === undefined) {
        source.nicheRelevance[niche] = score;
      }
    }
  }
}

// ============================================================
// API publique
// ============================================================

/**
 * Retourne toutes les sources du registre
 */
export function getAllSources() {
  return SOURCES;
}

/**
 * Retourne le nombre total de sources
 */
export function getSourceCount() {
  return SOURCES.length;
}

/**
 * Retourne les sources par categorie
 */
export function getSourcesByCategory(category) {
  return SOURCES.filter(s => s.category === category);
}

/**
 * Retourne toutes les categories disponibles
 */
export function getCategories() {
  return [...new Set(SOURCES.map(s => s.category))];
}

/**
 * Retourne une source par id
 */
export function getSourceById(id) {
  return SOURCES.find(s => s.id === id) || null;
}

/**
 * Retourne les sources triees par pertinence pour une niche donnee
 * @param {string} nicheType - Type de niche
 * @param {number} minScore - Score minimum de pertinence (defaut: 1)
 * @returns {Array} Sources triees par score decroissant
 */
export function getSourcesForNiche(nicheType, minScore = 1) {
  return SOURCES
    .map(s => ({
      ...s,
      relevanceScore: s.nicheRelevance[nicheType] || 0,
    }))
    .filter(s => s.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Retourne les top N sources pour une niche
 * Par defaut retourne 200 sources pour couvrir un maximum de terrain
 */
export function getTopSourcesForNiche(nicheType, count = 200) {
  return getSourcesForNiche(nicheType, 1).slice(0, count);
}

/**
 * Retourne les niches supportees
 */
export function getSupportedNiches() {
  return [
    'commerce_local',
    'artisan',
    'profession_liberale',
    'immobilier',
    'ecommerce',
    'b2b_services',
    'tourisme',
    'transport_logistique',
    'energie',
    'sante',
    'restauration',
    'btp_construction',
    'juridique',
    'finance_assurance',
    'franchise',
    'agriculture',
  ];
}

/**
 * Genere la liste des descriptions pour le prompt Groq (nicheReasoner)
 * Format : "1. id — description"
 */
export function getAllDescriptions() {
  return SOURCES.map((s, i) => `${i + 1}. ${s.id} — ${s.description}`).join('\n');
}

/**
 * Construit une requete Serper a partir de la config d'une source
 * @param {Object} source - Source du registre
 * @param {Object} context - { target, location }
 * @returns {string} Requete Serper formatee
 */
export function buildSerperQuery(source, context) {
  const { target = '', location = '' } = context;

  let query = source.serperConfig.queryTemplate
    .replace('{target}', target)
    .replace('{location}', location)
    .trim();

  // Ajouter site: si specifie
  if (source.serperConfig.site) {
    query = `site:${source.serperConfig.site} ${query}`;
  }

  return query;
}
