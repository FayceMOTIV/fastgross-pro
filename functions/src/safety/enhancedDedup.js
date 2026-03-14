/**
 * Enhanced Dedup — Deduplication multi-critere avant ajout prospect
 *
 * Match par :
 * 1. Email exact (lowercase normalized)
 * 2. Phone exact (E.164 normalized)
 * 3. Nom + Entreprise (fuzzy: Levenshtein distance < 3)
 * 4. Domaine website (extract domain from URL)
 *
 * Si match → enrichit existant au lieu de creer doublon
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ============================================
// CORE — checkDuplicate
// ============================================

/**
 * Verifie si un prospect existe deja dans l'org
 * @param {string} orgId
 * @param {Object} prospect — { email, phone, name, company, website }
 * @returns {{ isDuplicate: boolean, existingId: string|null, matchType: string|null, confidence: number }}
 */
export async function checkDuplicate(orgId, prospect) {
  const db = getDb()
  const prospectsRef = db.collection(`organizations/${orgId}/prospects`)

  // 1. Email exact match (highest confidence)
  if (prospect.email) {
    const normalizedEmail = prospect.email.toLowerCase().trim()
    const emailSnap = await prospectsRef
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    if (!emailSnap.empty) {
      return {
        isDuplicate: true,
        existingId: emailSnap.docs[0].id,
        matchType: 'email_exact',
        confidence: 100,
      }
    }
  }

  // 2. Phone exact match (E.164)
  if (prospect.phone) {
    const normalizedPhone = normalizePhone(prospect.phone)
    if (normalizedPhone) {
      const phoneSnap = await prospectsRef
        .where('phone', '==', normalizedPhone)
        .limit(1)
        .get()

      if (!phoneSnap.empty) {
        return {
          isDuplicate: true,
          existingId: phoneSnap.docs[0].id,
          matchType: 'phone_exact',
          confidence: 95,
        }
      }
    }
  }

  // 3. Website domain match
  if (prospect.website) {
    const domain = extractDomain(prospect.website)
    if (domain && domain.length > 3) {
      const domainSnap = await prospectsRef
        .where('websiteDomain', '==', domain)
        .limit(1)
        .get()

      if (!domainSnap.empty) {
        return {
          isDuplicate: true,
          existingId: domainSnap.docs[0].id,
          matchType: 'domain_match',
          confidence: 75,
        }
      }
    }
  }

  // 4. Name + Company fuzzy match
  if (prospect.name && prospect.company) {
    const normalizedName = (prospect.name || '').toLowerCase().trim()
    const normalizedCompany = (prospect.company || '').toLowerCase().trim()

    if (normalizedName && normalizedCompany) {
      // Search by company first (indexed), then fuzzy match name
      const companySnap = await prospectsRef
        .where('companyLower', '==', normalizedCompany)
        .limit(20)
        .get()

      for (const doc of companySnap.docs) {
        const existing = doc.data()
        const existingName = (existing.name || '').toLowerCase().trim()
        const distance = levenshteinDistance(normalizedName, existingName)

        if (distance <= 2) {
          return {
            isDuplicate: true,
            existingId: doc.id,
            matchType: 'name_company_fuzzy',
            confidence: distance === 0 ? 90 : distance === 1 ? 80 : 70,
          }
        }
      }
    }
  }

  return {
    isDuplicate: false,
    existingId: null,
    matchType: null,
    confidence: 0,
  }
}

// ============================================
// CORE — mergeIntoExisting
// ============================================

/**
 * Enrichit un prospect existant avec de nouvelles donnees
 */
export async function mergeIntoExisting(orgId, existingId, newData) {
  const db = getDb()
  const prospectRef = db.doc(`organizations/${orgId}/prospects/${existingId}`)
  const existingDoc = await prospectRef.get()

  if (!existingDoc.exists) {
    throw new Error(`Prospect ${existingId} non trouve`)
  }

  const existing = existingDoc.data()
  const updates = {}

  // Merge: ne remplacer que les champs vides
  const mergeFields = ['email', 'phone', 'website', 'linkedinUrl', 'instagram',
    'city', 'country', 'sector', 'title', 'company']

  for (const field of mergeFields) {
    if (newData[field] && !existing[field]) {
      updates[field] = newData[field]
    }
  }

  // Tags: union
  if (newData.tags?.length) {
    const existingTags = existing.tags || []
    const newTags = [...new Set([...existingTags, ...newData.tags])]
    if (newTags.length > existingTags.length) {
      updates.tags = newTags
    }
  }

  // Sources: track all sources
  if (newData.source) {
    const existingSources = existing.sources || [existing.source].filter(Boolean)
    if (!existingSources.includes(newData.source)) {
      updates.sources = [...existingSources, newData.source]
    }
  }

  // Normalized fields for future dedup
  if (updates.email) updates.email = updates.email.toLowerCase().trim()
  if (updates.phone) updates.phone = normalizePhone(updates.phone)
  if (updates.website) updates.websiteDomain = extractDomain(updates.website)
  if (updates.company || newData.company) {
    updates.companyLower = (updates.company || newData.company || existing.company || '').toLowerCase().trim()
  }

  if (Object.keys(updates).length > 0) {
    updates.enrichedAt = FieldValue.serverTimestamp()
    updates.enrichedFrom = newData.source || 'dedup_merge'
    await prospectRef.update(updates)
  }

  return {
    mergedFields: Object.keys(updates),
    existingId,
    status: Object.keys(updates).length > 0 ? 'enriched' : 'no_new_data',
  }
}

// ============================================
// CALLABLE — deduplicateOrg (batch)
// ============================================

export const deduplicateOrg = onCall({
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 300,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId, dryRun = true } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const prospectsSnap = await db.collection(`organizations/${orgId}/prospects`)
    .orderBy('createdAt', 'desc')
    .limit(2000)
    .get()

  const emailMap = new Map()
  const phoneMap = new Map()
  const duplicates = []

  for (const doc of prospectsSnap.docs) {
    const data = doc.data()
    const email = (data.email || '').toLowerCase().trim()
    const phone = normalizePhone(data.phone || '')

    // Email dedup
    if (email) {
      if (emailMap.has(email)) {
        duplicates.push({
          duplicateId: doc.id,
          originalId: emailMap.get(email),
          matchType: 'email',
          email,
        })
      } else {
        emailMap.set(email, doc.id)
      }
    }

    // Phone dedup
    if (phone) {
      if (phoneMap.has(phone)) {
        const existing = duplicates.find(d => d.duplicateId === doc.id)
        if (!existing) {
          duplicates.push({
            duplicateId: doc.id,
            originalId: phoneMap.get(phone),
            matchType: 'phone',
            phone,
          })
        }
      } else {
        phoneMap.set(phone, doc.id)
      }
    }
  }

  // Merge si pas dry run
  let merged = 0
  if (!dryRun) {
    for (const dup of duplicates) {
      try {
        const dupDoc = await db.doc(`organizations/${orgId}/prospects/${dup.duplicateId}`).get()
        if (dupDoc.exists) {
          await mergeIntoExisting(orgId, dup.originalId, dupDoc.data())
          await db.doc(`organizations/${orgId}/prospects/${dup.duplicateId}`).update({
            status: 'duplicate',
            mergedInto: dup.originalId,
            mergedAt: FieldValue.serverTimestamp(),
          })
          merged++
        }
      } catch (err) {
        console.error(`[Dedup] Erreur merge ${dup.duplicateId}:`, err.message)
      }
    }
  }

  return {
    totalProspects: prospectsSnap.size,
    duplicatesFound: duplicates.length,
    merged: dryRun ? 0 : merged,
    dryRun,
    duplicates: duplicates.slice(0, 50), // Limiter le retour
  }
})

// ============================================
// HELPERS
// ============================================

function normalizePhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1)
  }
  return cleaned
}

function extractDomain(input) {
  if (!input) return ''
  try {
    const cleaned = input.includes('://') ? input : `https://${input}`
    const url = new URL(cleaned)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0)
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[b.length][a.length]
}
