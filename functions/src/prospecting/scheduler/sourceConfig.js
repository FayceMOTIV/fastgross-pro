/**
 * Source Config — CRUD for per-tenant prospecting configuration
 *
 * Stored in organizations/{orgId}/settings/prospecting
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { SOURCE_REGISTRY, LEAD_SOURCES } from '../sources/_sourceRegistry.js'

const getDb = () => getFirestore()

// ─── DEFAULT CONFIG ─────────────────────────────────────────────────────────

const DEFAULT_PROSPECTING_CONFIG = {
  enabled: false,
  sources: {},
  scoring: {
    minScoreToPromote: 40,
  },
  dedup: {
    matchFields: ['email', 'phone', 'domain', 'siret'],
    enableFuzzyCompanyMatch: true,
    fuzzyThreshold: 0.85,
    mergeStrategy: 'enrich',  // enrich | skip | replace
  },
  limits: {
    maxRawLeadsPerDay: 5000,
    maxPromotionsPerDay: 500,
    rawLeadTTLDays: 30,
  },
}

// ─── GET CONFIG ─────────────────────────────────────────────────────────────

/**
 * Get prospecting config for an org (with defaults)
 */
export const getSourceConfig = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId is required')
    }

    const config = await getProspectingConfig(orgId)
    return { success: true, config }
  }
)

/**
 * Internal: Get config with defaults merged
 */
export async function getProspectingConfig(orgId) {
  const db = getDb()
  const doc = await db
    .collection('organizations').doc(orgId)
    .collection('settings').doc('prospecting')
    .get()

  const stored = doc.exists ? doc.data() : {}

  // Merge with defaults
  return {
    ...DEFAULT_PROSPECTING_CONFIG,
    ...stored,
    scoring: { ...DEFAULT_PROSPECTING_CONFIG.scoring, ...(stored.scoring || {}) },
    dedup: { ...DEFAULT_PROSPECTING_CONFIG.dedup, ...(stored.dedup || {}) },
    limits: { ...DEFAULT_PROSPECTING_CONFIG.limits, ...(stored.limits || {}) },
    sources: mergeSourceConfigs(stored.sources || {}),
  }
}

// ─── UPDATE CONFIG ──────────────────────────────────────────────────────────

/**
 * Update prospecting config for an org
 */
export const updateSourceConfig = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, config } = request.data
    if (!orgId || !config) {
      throw new HttpsError('invalid-argument', 'orgId and config are required')
    }

    // Validate config
    const validationErrors = validateConfig(config)
    if (validationErrors.length > 0) {
      throw new HttpsError('invalid-argument', `Invalid config: ${validationErrors.join(', ')}`)
    }

    const db = getDb()
    await db
      .collection('organizations').doc(orgId)
      .collection('settings').doc('prospecting')
      .set(
        {
          ...config,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true }
      )

    logger.info(`[sourceConfig] Updated config for org ${orgId}`)

    return { success: true }
  }
)

// ─── HELPERS ────────────────────────────────────────────────────────────────

function mergeSourceConfigs(storedSources) {
  const merged = {}

  for (const [sourceId, registryEntry] of Object.entries(SOURCE_REGISTRY)) {
    const stored = storedSources[sourceId] || {}
    merged[sourceId] = {
      enabled: stored.enabled ?? (registryEntry.phase === 1),
      frequency: stored.frequency || registryEntry.frequency,
      config: { ...registryEntry.defaultConfig, ...(stored.config || {}) },
      estimatedLeadsPerMonth: registryEntry.estimatedLeadsPerMonth,
      group: registryEntry.group,
      phase: registryEntry.phase,
      requiresApiKey: registryEntry.requiresApiKey,
    }
  }

  return merged
}

function validateConfig(config) {
  const errors = []

  if (config.scoring) {
    const min = config.scoring.minScoreToPromote
    if (min !== undefined && (typeof min !== 'number' || min < 0 || min > 100)) {
      errors.push('scoring.minScoreToPromote must be 0-100')
    }
  }

  if (config.dedup) {
    const threshold = config.dedup.fuzzyThreshold
    if (threshold !== undefined && (typeof threshold !== 'number' || threshold < 0.5 || threshold > 1)) {
      errors.push('dedup.fuzzyThreshold must be 0.5-1.0')
    }
  }

  if (config.limits) {
    const maxRaw = config.limits.maxRawLeadsPerDay
    if (maxRaw !== undefined && (typeof maxRaw !== 'number' || maxRaw < 100)) {
      errors.push('limits.maxRawLeadsPerDay must be >= 100')
    }
  }

  return errors
}
