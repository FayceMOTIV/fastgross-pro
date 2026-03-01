/**
 * Source Registry — Central registry of all 22 lead sources
 *
 * Maps sourceId → module, group, frequency, defaultConfig
 * Used by sourceOrchestrator to iterate sources dynamically.
 */

// ─── LEAD SOURCE ENUM ───────────────────────────────────────────────────────

export const LEAD_SOURCES = {
  // Phase 1 — Registries (public data)
  SIRENE: 'sirene',
  BODACC: 'bodacc',
  FRANCE_TRAVAIL: 'france_travail',

  // Phase 1 — Intent signals
  SERP_HUNTING: 'serp_hunting',
  NEW_DOMAINS: 'new_domains',
  COMPETITOR_REVIEWS: 'competitor_reviews',

  // Phase 2+ (future)
  INFOGREFFE: 'infogreffe',
  SOCIETE_COM: 'societe_com',
  PAPPERS: 'pappers',
  ANNUAIRE_ENTREPRISES: 'annuaire_entreprises',
  TWITTER: 'twitter',
  REDDIT: 'reddit',
  GITHUB: 'github',
  PRODUCTHUNT: 'producthunt',
  HACKER_NEWS: 'hacker_news',
  STACKOVERFLOW_JOBS: 'stackoverflow_jobs',
  MEETUP: 'meetup',
  EVENTBRITE: 'eventbrite',
  CRUNCHBASE: 'crunchbase',
  JOB_BOARDS: 'job_boards',
  PRESS_RELEASES: 'press_releases',
  FUNDRAISING: 'fundraising',
}

// ─── SOURCE GROUPS ──────────────────────────────────────────────────────────

export const SOURCE_GROUPS = {
  REGISTRIES: 'registries',
  INTENT: 'intent',
  SOCIAL: 'social',
  TECH: 'tech',
  EVENTS: 'events',
  BUSINESS: 'business',
}

// ─── FREQUENCY PRESETS ──────────────────────────────────────────────────────

export const FREQUENCIES = {
  DAILY: 'daily',           // 1x/jour
  TWICE_DAILY: 'twice_daily', // 2x/jour
  WEEKLY: 'weekly',         // 1x/semaine
  TWICE_WEEKLY: 'twice_weekly', // 2x/semaine
  HOURLY_2: 'every_2h',    // toutes les 2h (align with orchestrator)
}

// ─── SOURCE REGISTRY ────────────────────────────────────────────────────────

export const SOURCE_REGISTRY = {
  // ═══ Phase 1 — Registries ═══
  [LEAD_SOURCES.SIRENE]: {
    module: () => import('./registries/sireneSource.js'),
    group: SOURCE_GROUPS.REGISTRIES,
    frequency: FREQUENCIES.DAILY,
    estimatedLeadsPerRun: 600,
    estimatedLeadsPerMonth: 15000,
    phase: 1,
    requiresApiKey: 'INSEE_API_KEY',
    defaultConfig: {
      nafCodes: [],  // empty = all
      etatAdministratif: 'A',  // Active only
      maxResults: 700,
      dateRange: 30,  // days
    },
  },

  [LEAD_SOURCES.BODACC]: {
    module: () => import('./registries/bodaccSource.js'),
    group: SOURCE_GROUPS.REGISTRIES,
    frequency: FREQUENCIES.DAILY,
    estimatedLeadsPerRun: 175,
    estimatedLeadsPerMonth: 5000,
    phase: 1,
    requiresApiKey: null,  // API ouverte
    defaultConfig: {
      typeAvis: ['creation', 'modification'],
      maxResults: 200,
      dateRange: 30,
    },
  },

  [LEAD_SOURCES.FRANCE_TRAVAIL]: {
    module: () => import('./registries/franceTravailSource.js'),
    group: SOURCE_GROUPS.REGISTRIES,
    frequency: FREQUENCIES.DAILY,
    estimatedLeadsPerRun: 125,
    estimatedLeadsPerMonth: 3000,
    phase: 1,
    requiresApiKey: 'FRANCE_TRAVAIL_CLIENT_ID',
    defaultConfig: {
      keywords: [],
      dateRange: 7,
      maxResults: 150,
    },
  },

  // ═══ Phase 1 — Intent Signals ═══
  [LEAD_SOURCES.SERP_HUNTING]: {
    module: () => import('./intent/serpHuntingSource.js'),
    group: SOURCE_GROUPS.INTENT,
    frequency: FREQUENCIES.DAILY,
    estimatedLeadsPerRun: 350,
    estimatedLeadsPerMonth: 10000,
    phase: 1,
    requiresApiKey: 'SERPER_API_KEY',
    defaultConfig: {
      queriesPerRun: 20,
      maxResultsPerQuery: 20,
    },
  },

  [LEAD_SOURCES.NEW_DOMAINS]: {
    module: () => import('./intent/newDomainsSource.js'),
    group: SOURCE_GROUPS.INTENT,
    frequency: FREQUENCIES.DAILY,
    estimatedLeadsPerRun: 500,
    estimatedLeadsPerMonth: 15000,
    phase: 1,
    requiresApiKey: null,  // WhoisDS gratuit
    defaultConfig: {
      tlds: ['.fr'],
      maxResults: 500,
    },
  },

  [LEAD_SOURCES.COMPETITOR_REVIEWS]: {
    module: () => import('./intent/competitorReviewsSource.js'),
    group: SOURCE_GROUPS.INTENT,
    frequency: FREQUENCIES.TWICE_WEEKLY,
    estimatedLeadsPerRun: 150,
    estimatedLeadsPerMonth: 4000,
    phase: 1,
    requiresApiKey: 'SERPER_API_KEY',
    defaultConfig: {
      competitors: [],
      maxRating: 2,
      maxResults: 200,
    },
  },
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Get enabled sources for an org based on config
 * @param {Object} orgConfig - Organization prospecting config
 * @returns {Array} Array of { sourceId, config, registryEntry }
 */
export function getEnabledSources(orgConfig) {
  const sourcesConfig = orgConfig?.sources || {}

  return Object.entries(SOURCE_REGISTRY)
    .filter(([sourceId, entry]) => {
      // Only Phase 1 sources for now
      if (entry.phase > 1) return false

      // Check if explicitly disabled
      const sourceConf = sourcesConfig[sourceId]
      if (sourceConf?.enabled === false) return false

      return true
    })
    .map(([sourceId, entry]) => ({
      sourceId,
      config: { ...entry.defaultConfig, ...(sourcesConfig[sourceId]?.config || {}) },
      registryEntry: entry,
    }))
}

/**
 * Check if a source is due for execution based on frequency
 * @param {string} sourceId
 * @param {Date|null} lastRunAt
 * @param {string} frequency
 * @returns {boolean}
 */
export function isDueForRun(sourceId, lastRunAt, frequency) {
  if (!lastRunAt) return true

  const now = Date.now()
  const lastRun = lastRunAt instanceof Date ? lastRunAt.getTime() : new Date(lastRunAt).getTime()
  const elapsed = now - lastRun

  const MS_HOUR = 3600000
  const MS_DAY = 86400000

  const intervals = {
    [FREQUENCIES.HOURLY_2]: 2 * MS_HOUR,
    [FREQUENCIES.TWICE_DAILY]: 12 * MS_HOUR,
    [FREQUENCIES.DAILY]: MS_DAY,
    [FREQUENCIES.TWICE_WEEKLY]: 3.5 * MS_DAY,
    [FREQUENCIES.WEEKLY]: 7 * MS_DAY,
  }

  const interval = intervals[frequency] || MS_DAY
  return elapsed >= interval
}

/**
 * Get all Phase 1 source IDs
 */
export function getPhase1Sources() {
  return Object.entries(SOURCE_REGISTRY)
    .filter(([, entry]) => entry.phase === 1)
    .map(([sourceId]) => sourceId)
}
