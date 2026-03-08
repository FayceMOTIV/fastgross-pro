/**
 * Intent Hunter Pro — Sources B2B Configuration
 *
 * 26 sources B2B organisees en 4 groupes :
 *   A — Social / Communities (11 sources)
 *   B — Business Events (7 sources)
 *   C — Mission Platforms (2 sources)
 *   D — Events / Behavior (6 sources)
 *
 * Chaque source definit son API, ses rate limits,
 * ses variables d'environnement requises et ses canaux de contact.
 */

// ============================================
// GROUP A — SOCIAL / COMMUNITIES (11 sources)
// ============================================

const GROUP_A = [
  {
    id: 'reddit',
    name: 'Reddit',
    group: 'A',
    platform: 'reddit',
    apiType: 'official',
    rateLimit: { maxPerMinute: 60, delayMs: 1000 },
    variables: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
    contactPrimary: 'reddit_public_reply',
    contactFallback: 'reddit_dm',
    enabled: true,
    description: 'Subreddits B2B francais et sectoriels'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    group: 'A',
    platform: 'linkedin',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 5, delayMs: 12000 },
    variables: ['HEYREACH_API_KEY', 'APIFY_API_TOKEN'],
    contactPrimary: 'heyreach_sequence',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Posts et groupes LinkedIn, signaux de recrutement'
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    group: 'A',
    platform: 'twitter',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: ['TWITTER_BEARER_TOKEN'],
    contactPrimary: 'twitter_reply',
    contactFallback: 'twitter_dm',
    enabled: true,
    description: 'Tweets B2B, hashtags sectoriels, demandes publiques'
  },
  {
    id: 'discord',
    name: 'Discord',
    group: 'A',
    platform: 'discord',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: ['DISCORD_BOT_TOKEN'],
    contactPrimary: 'discord_public_reply',
    contactFallback: 'discord_dm',
    enabled: true,
    description: 'Serveurs B2B, communautes SaaS et tech'
  },
  {
    id: 'slack',
    name: 'Slack Communities',
    group: 'A',
    platform: 'slack',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: ['SLACK_BOT_TOKEN'],
    contactPrimary: 'slack_public_reply',
    contactFallback: 'slack_dm',
    enabled: true,
    description: 'Workspaces Slack publics B2B'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    group: 'A',
    platform: 'telegram',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: ['TELEGRAM_BOT_TOKEN'],
    contactPrimary: 'telegram_group_reply',
    contactFallback: 'telegram_dm',
    enabled: true,
    description: 'Groupes Telegram B2B et crypto/tech'
  },
  {
    id: 'facebook_pro',
    name: 'Facebook Pro',
    group: 'A',
    platform: 'facebook',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'facebook_comment',
    contactFallback: 'facebook_dm',
    enabled: true,
    description: 'Groupes Facebook entrepreneurs et sectoriels'
  },
  {
    id: 'instagram_b2b',
    name: 'Instagram B2B',
    group: 'A',
    platform: 'instagram',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 6, delayMs: 10000 },
    variables: ['INSTAGRAM_ENCRYPTION_KEY', 'APIFY_API_TOKEN'],
    contactPrimary: 'instagram_comment',
    contactFallback: 'instagram_dm',
    enabled: true,
    description: 'Comptes Instagram pros, hashtags business'
  },
  {
    id: 'quora',
    name: 'Quora',
    group: 'A',
    platform: 'quora',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'quora_answer',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Questions Quora B2B en francais et anglais'
  },
  {
    id: 'hacker_news',
    name: 'Hacker News',
    group: 'A',
    platform: 'hackernews',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: [],
    contactPrimary: 'hn_comment',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Posts et commentaires Hacker News (YC)'
  },
  {
    id: 'product_hunt',
    name: 'Product Hunt',
    group: 'A',
    platform: 'producthunt',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: ['PRODUCTHUNT_API_TOKEN'],
    contactPrimary: 'ph_comment',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Lancements produits, makers en recherche de solutions'
  }
]

// ============================================
// GROUP B — BUSINESS EVENTS (7 sources)
// ============================================

const GROUP_B = [
  {
    id: 'bodacc',
    name: 'BODACC',
    group: 'B',
    platform: 'bodacc',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: [],
    contactPrimary: 'email_waterfall',
    contactFallback: 'postal',
    enabled: true,
    description: 'Creations, cessions, redressements (BODACC open data)'
  },
  {
    id: 'boamp',
    name: 'BOAMP',
    group: 'B',
    platform: 'boamp',
    apiType: 'official',
    rateLimit: { maxPerMinute: 30, delayMs: 2000 },
    variables: [],
    contactPrimary: 'email_waterfall',
    contactFallback: 'postal',
    enabled: true,
    description: 'Marches publics (BOAMP open data)'
  },
  {
    id: 'offres_emploi',
    name: 'Offres Emploi',
    group: 'B',
    platform: 'francetravail',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: ['FRANCETRAVAIL_CLIENT_ID', 'FRANCETRAVAIL_CLIENT_SECRET'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Offres d\'emploi France Travail — signal de croissance'
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    group: 'B',
    platform: 'crunchbase',
    apiType: 'official',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['CRUNCHBASE_API_KEY'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Levees de fonds, acquisitions, nominations'
  },
  {
    id: 'avis_concurrent',
    name: 'Avis Concurrent',
    group: 'B',
    platform: 'multi',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Avis negatifs sur concurrents (G2, Capterra, Trustpilot)'
  },
  {
    id: 'trustpilot_g2',
    name: 'Trustpilot / G2',
    group: 'B',
    platform: 'review_sites',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 8, delayMs: 7500 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Avis B2B 1-2 etoiles sur concurrents'
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    group: 'B',
    platform: 'glassdoor',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 6, delayMs: 10000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Entreprises en croissance (recrutement massif)'
  }
]

// ============================================
// GROUP C — MISSION PLATFORMS (2 sources)
// ============================================

const GROUP_C = [
  {
    id: 'malt',
    name: 'Malt',
    group: 'C',
    platform: 'malt',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 8, delayMs: 7500 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'malt_message',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Freelances en recherche active sur Malt'
  },
  {
    id: 'upwork',
    name: 'Upwork',
    group: 'C',
    platform: 'upwork',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 6, delayMs: 10000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'upwork_proposal',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Projets publies sur Upwork — intent d\'achat fort'
  }
]

// ============================================
// GROUP D — EVENTS / BEHAVIOR (6 sources)
// ============================================

const GROUP_D = [
  {
    id: 'eventbrite_meetup',
    name: 'Eventbrite / Meetup',
    group: 'D',
    platform: 'events',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: ['EVENTBRITE_API_KEY'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Participants et organisateurs evenements B2B'
  },
  {
    id: 'google_news',
    name: 'Google News',
    group: 'D',
    platform: 'google_news',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['SERPER_API_KEY'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Actualites entreprises (levees, nominations, expansion)'
  },
  {
    id: 'linkedin_events',
    name: 'LinkedIn Events',
    group: 'D',
    platform: 'linkedin',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 5, delayMs: 12000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'heyreach_sequence',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Participants evenements LinkedIn sectoriels'
  },
  {
    id: 'indie_hackers',
    name: 'Indie Hackers',
    group: 'D',
    platform: 'indiehackers',
    apiType: 'scraping',
    rateLimit: { maxPerMinute: 10, delayMs: 6000 },
    variables: ['APIFY_API_TOKEN'],
    contactPrimary: 'ih_comment',
    contactFallback: 'email_waterfall',
    enabled: true,
    description: 'Posts Indie Hackers — solopreneurs en recherche de solutions'
  },
  {
    id: 'pixel_visiteur',
    name: 'Pixel Visiteur',
    group: 'D',
    platform: 'pixel',
    apiType: 'microservice',
    rateLimit: { maxPerMinute: 100, delayMs: 600 },
    variables: ['PIXEL_API_KEY'],
    contactPrimary: 'email_waterfall',
    contactFallback: 'linkedin_connect',
    enabled: true,
    description: 'Visiteurs site web identifies par pixel (Clearbit Reveal, Albacross)'
  },
  {
    id: 'boamp_historique',
    name: 'BOAMP Historique',
    group: 'D',
    platform: 'boamp',
    apiType: 'official',
    rateLimit: { maxPerMinute: 20, delayMs: 3000 },
    variables: [],
    contactPrimary: 'email_waterfall',
    contactFallback: 'postal',
    enabled: true,
    description: 'Marches publics expires — entreprises ayant perdu un marche'
  }
]

// ============================================
// EXPORT UNIFIE
// ============================================

/**
 * Configuration complete des 26 sources B2B Intent Hunter Pro.
 * @type {Array<{
 *   id: string,
 *   name: string,
 *   group: 'A'|'B'|'C'|'D',
 *   platform: string,
 *   apiType: 'official'|'scraping'|'microservice',
 *   rateLimit: { maxPerMinute: number, delayMs: number },
 *   variables: string[],
 *   contactPrimary: string,
 *   contactFallback: string,
 *   enabled: boolean,
 *   description: string
 * }>}
 */
export const SOURCE_CONFIGS_PRO = [
  ...GROUP_A,
  ...GROUP_B,
  ...GROUP_C,
  ...GROUP_D
]

/**
 * Sources indexees par ID pour acces O(1)
 * @type {Record<string, typeof SOURCE_CONFIGS_PRO[0]>}
 */
export const SOURCES_BY_ID = Object.fromEntries(
  SOURCE_CONFIGS_PRO.map(s => [s.id, s])
)

/**
 * Sources groupees par groupe
 * @type {Record<'A'|'B'|'C'|'D', typeof SOURCE_CONFIGS_PRO>}
 */
export const SOURCES_BY_GROUP = {
  A: GROUP_A,
  B: GROUP_B,
  C: GROUP_C,
  D: GROUP_D
}

/**
 * Retourne les sources activees uniquement
 * @returns {typeof SOURCE_CONFIGS_PRO}
 */
export function getEnabledSources() {
  return SOURCE_CONFIGS_PRO.filter(s => s.enabled)
}

/**
 * Retourne les sources d'un groupe donne
 * @param {'A'|'B'|'C'|'D'} group
 * @returns {typeof SOURCE_CONFIGS_PRO}
 */
export function getSourcesByGroup(group) {
  return SOURCES_BY_GROUP[group] || []
}

/**
 * Verifie si les variables d'environnement requises sont presentes pour une source
 * @param {string} sourceId
 * @returns {{ ready: boolean, missing: string[] }}
 */
export function checkSourceReadiness(sourceId) {
  const source = SOURCES_BY_ID[sourceId]
  if (!source) return { ready: false, missing: [`source_not_found:${sourceId}`] }

  const missing = source.variables.filter(v => !process.env[v])
  return { ready: missing.length === 0, missing }
}
