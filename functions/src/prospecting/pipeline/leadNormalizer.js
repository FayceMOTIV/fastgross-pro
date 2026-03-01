/**
 * Lead Normalizer — Transforms raw source data into unified prospect-compatible shape
 *
 * Each source produces different data structures. This module normalizes them
 * into a unified shape that's compatible with the existing prospect model.
 */

import { logger } from 'firebase-functions/v2'

// ─── FIELD NORMALIZATION ────────────────────────────────────────────────────

/**
 * Normalize a raw lead into the unified shape
 * @param {Object} rawLead - Document from rawLeads collection
 * @returns {Object} Normalized lead ready for dedup + scoring
 */
export function normalizeLead(rawLead) {
  const normalized = rawLead.normalized || {}
  const raw = rawLead.raw || {}
  const sourceId = rawLead.sourceId

  return {
    companyName: cleanString(normalized.companyName || raw.companyName || raw.company || ''),
    firstName: cleanString(normalized.firstName || raw.firstName || ''),
    lastName: cleanString(normalized.lastName || raw.lastName || ''),
    email: normalizeEmail(normalized.email || raw.email || ''),
    phone: normalizePhone(normalized.phone || raw.phone || ''),
    website: normalizeUrl(normalized.website || raw.website || ''),
    domain: normalizeDomain(normalized.domain || ''),
    siret: normalizeSiret(normalized.siret || raw.siret || ''),
    naf: cleanString(normalized.naf || raw.naf || ''),
    nafLabel: cleanString(normalized.nafLabel || raw.nafLabel || ''),
    address: cleanString(normalized.address || raw.address || ''),
    city: cleanString(normalized.city || raw.city || ''),
    postalCode: cleanString(normalized.postalCode || raw.postalCode || ''),
    country: (normalized.country || raw.country || 'FR').toUpperCase(),
    jobTitle: cleanString(normalized.jobTitle || raw.jobTitle || ''),
    linkedinUrl: normalizeUrl(normalized.linkedinUrl || raw.linkedinUrl || ''),
    employeeCount: parseNumber(normalized.employeeCount || raw.employeeCount),
    revenue: parseNumber(normalized.revenue || raw.revenue),
    sourceId,
    sourceGroup: rawLead.sourceGroup || 'unknown',
    intentSignals: normalized.intentSignals || [],
  }
}

/**
 * Batch normalize leads
 * @param {Array} rawLeads - Array of rawLead documents
 * @returns {Object} { normalized, errors }
 */
export function normalizeLeadsBatch(rawLeads) {
  const normalized = []
  const errors = []

  for (const rawLead of rawLeads) {
    try {
      const lead = normalizeLead(rawLead)

      // Minimum data quality check
      if (!lead.companyName && !lead.email && !lead.domain) {
        errors.push({ id: rawLead.id, reason: 'no_identifiable_data' })
        continue
      }

      normalized.push({ ...lead, rawLeadId: rawLead.id })
    } catch (error) {
      logger.error(`[leadNormalizer] Error normalizing lead ${rawLead.id}:`, error)
      errors.push({ id: rawLead.id, reason: error.message })
    }
  }

  return { normalized, errors }
}

// ─── FIELD CLEANERS ─────────────────────────────────────────────────────────

function cleanString(str) {
  if (!str || typeof str !== 'string') return ''
  return str.trim().replace(/\s+/g, ' ')
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return ''
  const cleaned = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(cleaned) ? cleaned : ''
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  // Remove non-digit chars except + at start
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.length < 8) return ''

  // French phone formatting
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+33${cleaned.slice(1)}`
  }
  if (cleaned.startsWith('33') && cleaned.length === 11) {
    return `+${cleaned}`
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const cleaned = url.trim()
  if (!cleaned) return ''

  try {
    const fullUrl = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`
    const parsed = new URL(fullUrl)
    return parsed.href
  } catch {
    return ''
  }
}

function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return ''
  return domain.trim().toLowerCase().replace(/^www\./, '')
}

function normalizeSiret(siret) {
  if (!siret || typeof siret !== 'string') return ''
  const cleaned = siret.replace(/\s/g, '')
  // SIRET = 14 digits, SIREN = 9 digits
  if (/^\d{9}$/.test(cleaned) || /^\d{14}$/.test(cleaned)) {
    return cleaned
  }
  return ''
}

function parseNumber(value) {
  if (value === null || value === undefined) return null
  const num = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10)
  return isNaN(num) ? null : num
}
