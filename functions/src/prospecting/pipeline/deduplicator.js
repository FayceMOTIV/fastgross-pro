/**
 * Deduplicator — Cross-collection deduplication for leads
 *
 * Checks for duplicates across:
 * - rawLeads (staging collection)
 * - prospects (production collection)
 *
 * Matching strategies:
 * - Email exact match
 * - Phone exact match
 * - Domain exact match
 * - SIRET exact match
 * - CompanyName + City fuzzy (Levenshtein >= 0.85)
 */

import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── MAIN DEDUP ─────────────────────────────────────────────────────────────

/**
 * Check if a lead is a duplicate
 * @param {string} orgId
 * @param {Object} lead - Normalized lead
 * @returns {Object} { isDuplicate, existingId, existingCollection, mergedFields }
 */
export async function checkDuplicate(orgId, lead) {
  const db = getDb()
  const orgRef = db.collection('organizations').doc(orgId)

  // Check each matching strategy in priority order
  const strategies = [
    { field: 'email', value: lead.email, collection: 'prospects', queryField: 'email' },
    { field: 'email', value: lead.email, collection: 'rawLeads', queryField: 'normalized.email' },
    { field: 'phone', value: lead.phone, collection: 'prospects', queryField: 'phone' },
    { field: 'siret', value: lead.siret, collection: 'prospects', queryField: 'enrichment.siret' },
    { field: 'siret', value: lead.siret, collection: 'rawLeads', queryField: 'normalized.siret' },
    { field: 'domain', value: lead.domain, collection: 'prospects', queryField: 'enrichment.domain' },
    { field: 'domain', value: lead.domain, collection: 'rawLeads', queryField: 'normalized.domain' },
  ]

  for (const strategy of strategies) {
    if (!strategy.value) continue

    const snapshot = await orgRef
      .collection(strategy.collection)
      .where(strategy.queryField, '==', strategy.value)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0]
      const mergedFields = computeMergedFields(lead, existingDoc.data(), strategy.collection)

      return {
        isDuplicate: true,
        existingId: existingDoc.id,
        existingCollection: strategy.collection,
        matchedOn: strategy.field,
        mergedFields,
      }
    }
  }

  // Fuzzy match: companyName + city
  if (lead.companyName && lead.city) {
    const fuzzyResult = await fuzzyCompanyMatch(orgRef, lead)
    if (fuzzyResult) {
      return fuzzyResult
    }
  }

  return { isDuplicate: false, existingId: null, existingCollection: null, mergedFields: null }
}

/**
 * Batch deduplication
 * @param {string} orgId
 * @param {Array} leads - Array of normalized leads
 * @returns {Object} { unique, duplicates, stats }
 */
export async function deduplicateBatch(orgId, leads) {
  const unique = []
  const duplicates = []
  const seenEmails = new Set()
  const seenPhones = new Set()
  const seenSirets = new Set()
  const seenDomains = new Set()

  for (const lead of leads) {
    // Intra-batch dedup first (fast, no Firestore)
    if (lead.email && seenEmails.has(lead.email)) {
      duplicates.push({ ...lead, matchedOn: 'email_intrabatch' })
      continue
    }
    if (lead.phone && seenPhones.has(lead.phone)) {
      duplicates.push({ ...lead, matchedOn: 'phone_intrabatch' })
      continue
    }
    if (lead.siret && seenSirets.has(lead.siret)) {
      duplicates.push({ ...lead, matchedOn: 'siret_intrabatch' })
      continue
    }

    // Cross-collection dedup (Firestore queries)
    const result = await checkDuplicate(orgId, lead)

    if (result.isDuplicate) {
      duplicates.push({
        ...lead,
        matchedOn: result.matchedOn,
        existingId: result.existingId,
        existingCollection: result.existingCollection,
        mergedFields: result.mergedFields,
      })
    } else {
      unique.push(lead)
      if (lead.email) seenEmails.add(lead.email)
      if (lead.phone) seenPhones.add(lead.phone)
      if (lead.siret) seenSirets.add(lead.siret)
      if (lead.domain) seenDomains.add(lead.domain)
    }
  }

  logger.info(`[deduplicator] Batch: ${leads.length} total, ${unique.length} unique, ${duplicates.length} duplicates`)

  return {
    unique,
    duplicates,
    stats: {
      total: leads.length,
      unique: unique.length,
      duplicates: duplicates.length,
    },
  }
}

// ─── FUZZY MATCHING ─────────────────────────────────────────────────────────

async function fuzzyCompanyMatch(orgRef, lead) {
  // Get prospects in same city
  const snapshot = await orgRef
    .collection('prospects')
    .where('city', '==', lead.city)
    .limit(50)
    .get()

  for (const doc of snapshot.docs) {
    const existing = doc.data()
    const existingName = (existing.company || existing.companyName || '').toLowerCase()
    const leadName = lead.companyName.toLowerCase()

    if (existingName && levenshteinSimilarity(existingName, leadName) >= 0.85) {
      return {
        isDuplicate: true,
        existingId: doc.id,
        existingCollection: 'prospects',
        matchedOn: 'companyName_fuzzy',
        mergedFields: computeMergedFields(lead, existing, 'prospects'),
      }
    }
  }

  return null
}

/**
 * Levenshtein similarity (0-1 range)
 */
function levenshteinSimilarity(a, b) {
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

function levenshteinDistance(a, b) {
  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

// ─── MERGE STRATEGY ─────────────────────────────────────────────────────────

/**
 * Compute fields that could enrich the existing record
 * (new lead has data that existing doesn't)
 */
function computeMergedFields(newLead, existing, collection) {
  const merged = {}
  const existingData = collection === 'rawLeads' ? (existing.normalized || {}) : existing

  const fieldsToMerge = ['email', 'phone', 'website', 'linkedinUrl', 'siret', 'jobTitle', 'employeeCount', 'revenue']

  for (const field of fieldsToMerge) {
    const newValue = newLead[field]
    const existingValue = existingData[field] || existingData?.enrichment?.[field]

    if (newValue && !existingValue) {
      merged[field] = newValue
    }
  }

  // Merge intent signals
  if (newLead.intentSignals?.length > 0) {
    merged.newIntentSignals = newLead.intentSignals
  }

  return Object.keys(merged).length > 0 ? merged : null
}
