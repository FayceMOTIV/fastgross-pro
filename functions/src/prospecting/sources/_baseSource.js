/**
 * Base Source Helpers — Shared utilities for all lead sources
 *
 * Provides:
 * - normalizeToLead: Transform raw API data into unified lead shape
 * - createSourceRun: Track source execution in Firestore
 * - updateSourceRun: Update run stats
 * - withRateLimit: Rate limiting wrapper
 * - withMockFallback: Mock data fallback when API key missing
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── UNIFIED LEAD SHAPE ────────────────────────────────────────────────────

/**
 * Normalize raw source data into the unified rawLead shape
 * @param {Object} rawData - Raw data from the source API
 * @param {string} sourceId - Source identifier (e.g. 'sirene', 'bodacc')
 * @param {string} sourceGroup - Source group (e.g. 'registries', 'intent')
 * @returns {Object} Normalized lead
 */
export function normalizeToLead(rawData, sourceId, sourceGroup) {
  return {
    companyName: rawData.companyName || rawData.company || rawData.nom || '',
    firstName: rawData.firstName || rawData.prenom || '',
    lastName: rawData.lastName || rawData.nom_dirigeant || '',
    email: rawData.email || '',
    phone: rawData.phone || rawData.telephone || '',
    website: rawData.website || rawData.siteWeb || '',
    domain: extractDomain(rawData.website || rawData.email || ''),
    siret: rawData.siret || rawData.siren || '',
    naf: rawData.naf || rawData.codeNaf || rawData.activitePrincipale || '',
    nafLabel: rawData.nafLabel || rawData.libelleActivite || '',
    address: rawData.address || rawData.adresse || '',
    city: rawData.city || rawData.ville || '',
    postalCode: rawData.postalCode || rawData.codePostal || '',
    country: rawData.country || 'FR',
    jobTitle: rawData.jobTitle || rawData.titre || '',
    linkedinUrl: rawData.linkedinUrl || '',
    employeeCount: rawData.employeeCount || rawData.effectif || null,
    revenue: rawData.revenue || rawData.chiffreAffaires || null,
    sourceId,
    sourceGroup,
    intentSignals: rawData.intentSignals || [],
    rawSourceData: rawData,
  }
}

/**
 * Extract domain from URL or email
 */
function extractDomain(input) {
  if (!input) return ''

  // From email
  if (input.includes('@')) {
    return input.split('@')[1]?.toLowerCase() || ''
  }

  // From URL
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    return new URL(url).hostname.replace('www.', '').toLowerCase()
  } catch {
    return input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]?.toLowerCase() || ''
  }
}

// ─── SOURCE RUN TRACKING ────────────────────────────────────────────────────

/**
 * Create a new source run document in Firestore
 * @param {string} orgId
 * @param {string} sourceId
 * @returns {Object} { runId, runRef }
 */
export async function createSourceRun(orgId, sourceId) {
  const db = getDb()
  const runData = {
    sourceId,
    status: 'running',
    stats: {
      collected: 0,
      normalized: 0,
      deduped: 0,
      enriched: 0,
      scored: 0,
      promoted: 0,
      rejected: 0,
      errors: 0,
    },
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    error: null,
  }

  const runRef = await db
    .collection('organizations').doc(orgId)
    .collection('sourceRuns')
    .add(runData)

  logger.info(`[baseSource] Created run ${runRef.id} for source ${sourceId} in org ${orgId}`)

  return { runId: runRef.id, runRef }
}

/**
 * Update a source run with new stats
 * @param {string} orgId
 * @param {string} runId
 * @param {Object} updates - Partial stats or status update
 */
export async function updateSourceRun(orgId, runId, updates) {
  const db = getDb()
  const runRef = db
    .collection('organizations').doc(orgId)
    .collection('sourceRuns').doc(runId)

  const updateData = {}

  if (updates.stats) {
    for (const [key, value] of Object.entries(updates.stats)) {
      updateData[`stats.${key}`] = value
    }
  }

  if (updates.status) {
    updateData.status = updates.status
  }

  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.completedAt = FieldValue.serverTimestamp()
  }

  if (updates.error) {
    updateData.error = updates.error
  }

  await runRef.update(updateData)
}

// ─── RATE LIMITING ──────────────────────────────────────────────────────────

/**
 * Wrap an async function with rate limiting
 * @param {Function} fn - Async function to rate limit
 * @param {number} delayMs - Delay between calls in ms
 * @returns {Function} Rate-limited function
 */
export function withRateLimit(fn, delayMs) {
  return async (...args) => {
    const result = await fn(...args)
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    return result
  }
}

// ─── MOCK FALLBACK ──────────────────────────────────────────────────────────

/**
 * Wrap a source collector with mock data fallback
 * @param {Function} collectFn - Real collector function
 * @param {Function} mockFn - Function returning mock data
 * @param {string} apiKeyEnvVar - Name of the env var to check
 * @returns {Function} Collector with mock fallback
 */
export function withMockFallback(collectFn, mockFn, apiKeyEnvVar) {
  return async (...args) => {
    const hasKey = apiKeyEnvVar ? !!process.env[apiKeyEnvVar] : true

    if (!hasKey) {
      logger.info(`[baseSource] No ${apiKeyEnvVar} found, using mock data`)
      return { leads: mockFn(), isMock: true }
    }

    try {
      const result = await collectFn(...args)
      return { ...result, isMock: false }
    } catch (error) {
      logger.error(`[baseSource] Collector failed, falling back to mock:`, error)
      return { leads: mockFn(), isMock: true, error: error.message }
    }
  }
}

// ─── SAVE RAW LEADS TO FIRESTORE ────────────────────────────────────────────

/**
 * Save a batch of normalized leads to rawLeads collection
 * @param {string} orgId
 * @param {Array} leads - Normalized leads
 * @param {string} sourceId
 * @param {string} batchId - Run/batch identifier
 * @returns {Object} { saved, errors }
 */
export async function saveRawLeads(orgId, leads, sourceId, batchId) {
  const db = getDb()
  const batch = db.batch()
  let saved = 0
  let errors = 0

  const collRef = db.collection('organizations').doc(orgId).collection('rawLeads')

  for (const lead of leads) {
    try {
      const docRef = collRef.doc()
      batch.set(docRef, {
        sourceId,
        sourceGroup: lead.sourceGroup || 'unknown',
        batchId,
        raw: lead.rawSourceData || {},
        normalized: {
          companyName: lead.companyName,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          domain: lead.domain,
          siret: lead.siret,
          naf: lead.naf,
          nafLabel: lead.nafLabel,
          address: lead.address,
          city: lead.city,
          postalCode: lead.postalCode,
          country: lead.country,
          jobTitle: lead.jobTitle,
          linkedinUrl: lead.linkedinUrl,
          employeeCount: lead.employeeCount,
          revenue: lead.revenue,
          intentSignals: lead.intentSignals,
        },
        pipeline: {
          status: 'collected',
          dedupResult: null,
          score: null,
          promotedToProspectId: null,
        },
        collectedAt: FieldValue.serverTimestamp(),
        processedAt: null,
      })
      saved++
    } catch (err) {
      logger.error(`[baseSource] Error batching lead:`, err)
      errors++
    }

    // Firestore batch limit: 500
    if (saved % 450 === 0 && saved > 0) {
      await batch.commit()
    }
  }

  if (saved % 450 !== 0 || saved === 0) {
    await batch.commit()
  }

  logger.info(`[baseSource] Saved ${saved} rawLeads for ${sourceId} in org ${orgId} (errors: ${errors})`)
  return { saved, errors }
}
