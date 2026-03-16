/**
 * orgEmailConfig.js — Per-org email sender configuration
 *
 * Reads email sending config from Firestore:
 *   organizations/{orgId}/integrations/email
 *
 * Fields:
 *   senderEmail: "Alex <alex@outreach.you-energie.com>"
 *   senderName: "Alex — You Énergie"
 *   senderDomain: "outreach.you-energie.com"
 *   signature: "Alex | You Énergie | you-energie.com"
 *   replyToDomain: "inbound.facemedia.tech" (default)
 *   verified: true/false (DNS SPF/DKIM/DMARC verified)
 *
 * Fallback: {orgSlug}@outreach.facemedia.tech
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// Cache per org (5 min TTL)
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Get email sending config for an organization
 * @param {string} orgId
 * @returns {Promise<{senderEmail: string, senderName: string, signature: string, replyToDomain: string, verified: boolean}>}
 */
export async function getOrgEmailConfig(orgId) {
  if (!orgId) return null

  // Check cache
  const cached = cache.get(orgId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.config
  }

  try {
    const db = getDb()
    const configDoc = await db
      .collection('organizations').doc(orgId)
      .collection('integrations').doc('email')
      .get()

    if (configDoc.exists) {
      const data = configDoc.data()
      if (data.senderEmail) {
        const config = {
          senderEmail: data.senderEmail,
          senderName: data.senderName || 'Alex',
          senderDomain: data.senderDomain || null,
          signature: data.signature || '',
          replyToDomain: data.replyToDomain || 'inbound.facemedia.tech',
          verified: data.verified === true,
        }
        cache.set(orgId, { config, ts: Date.now() })
        return config
      }
    }

    // Fallback: generate from org slug
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    if (orgDoc.exists) {
      const org = orgDoc.data()
      const slug = org.slug || orgId.slice(0, 8)
      const orgName = org.name || 'FMF'

      const config = {
        senderEmail: `Alex <${slug}@outreach.facemedia.tech>`,
        senderName: `Alex — ${orgName}`,
        senderDomain: 'outreach.facemedia.tech',
        signature: `Alex | ${orgName}`,
        replyToDomain: 'inbound.facemedia.tech',
        verified: false,
      }
      cache.set(orgId, { config, ts: Date.now() })
      return config
    }
  } catch (error) {
    console.warn(`[OrgEmailConfig] Failed to load config for ${orgId}:`, error.message)
  }

  return null
}

/**
 * Build Reply-To address for a specific prospect in an org
 * Format: reply+{prospectId}+{orgId}@inbound.facemedia.tech
 */
export function buildReplyToAddress(prospectId, orgId, domain = 'inbound.facemedia.tech') {
  if (!prospectId || !orgId) return null
  return `reply+${prospectId}+${orgId}@${domain}`
}

/**
 * Parse a Reply-To address to extract prospectId and orgId
 * @param {string} replyToAddress - e.g. "reply+abc123+orgXyz@inbound.facemedia.tech"
 * @returns {{prospectId: string, orgId: string} | null}
 */
export function parseReplyToAddress(replyToAddress) {
  if (!replyToAddress) return null

  // Match reply+{prospectId}+{orgId}@domain
  const match = replyToAddress.match(/^reply\+([^+@]+)\+([^+@]+)@/)
  if (!match) return null

  return {
    prospectId: match[1],
    orgId: match[2],
  }
}

// ─── Callables for custom domain setup ──────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

/**
 * Save custom email domain config for an org
 * If no custom domain, uses automatic {slug}@outreach.facemedia.tech
 */
export const saveCustomEmailDomain = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, domain, senderName } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const integrationRef = db.collection('organizations').doc(orgId).collection('integrations').doc('email')

  if (!domain) {
    // Reset to automatic mode
    const orgDoc = await db.doc(`organizations/${orgId}`).get()
    const org = orgDoc.exists ? orgDoc.data() : {}
    const slug = org.slug || orgId.slice(0, 8)
    const orgName = org.name || 'FMF'

    await integrationRef.set({
      mode: 'automatic',
      senderEmail: `Alex <${slug}@outreach.facemedia.tech>`,
      senderName: senderName || `Alex — ${orgName}`,
      senderDomain: 'outreach.facemedia.tech',
      signature: `Alex | ${orgName}`,
      replyToDomain: 'inbound.facemedia.tech',
      verified: true, // Wildcard domain is pre-verified
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // Invalidate cache
    cache.delete(orgId)

    return { success: true, mode: 'automatic', senderEmail: `${slug}@outreach.facemedia.tech` }
  }

  // Custom domain mode
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  await integrationRef.set({
    mode: 'custom',
    customDomain: cleanDomain,
    senderEmail: `Alex <alex@${cleanDomain}>`,
    senderName: senderName || 'Alex',
    senderDomain: cleanDomain,
    signature: '',
    replyToDomain: 'inbound.facemedia.tech',
    verified: false,
    dnsCheckedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // Invalidate cache
  cache.delete(orgId)

  return { success: true, mode: 'custom', domain: cleanDomain }
})

/**
 * Verify DNS configuration for a custom email domain
 */
export const verifyCustomDomainDNS = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const integrationRef = db.collection('organizations').doc(orgId).collection('integrations').doc('email')
  const configDoc = await integrationRef.get()

  if (!configDoc.exists || !configDoc.data().customDomain) {
    throw new HttpsError('failed-precondition', 'Aucun domaine custom configure')
  }

  const domain = configDoc.data().customDomain

  // Run actual DNS verification
  const { verifyDNSConfiguration } = await import('./deliverability.js')
  const results = await verifyDNSConfiguration(domain)

  const isVerified = results.overallScore >= 60

  await integrationRef.update({
    verified: isVerified,
    dnsCheckedAt: FieldValue.serverTimestamp(),
    dnsResults: {
      spf: results.spf.configured,
      dkim: results.dkim.configured,
      dmarc: results.dmarc.configured,
      mx: results.mx.configured,
      score: results.overallScore,
    },
  })

  // Invalidate cache
  cache.delete(orgId)

  return {
    success: true,
    verified: isVerified,
    score: results.overallScore,
    spf: results.spf,
    dkim: results.dkim,
    dmarc: results.dmarc,
    mx: results.mx,
    recommendations: results.recommendations,
  }
})

/**
 * Get current email domain config for an org
 */
export const getOrgEmailDomainConfig = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  const [integrationDoc, orgDoc] = await Promise.all([
    db.collection('organizations').doc(orgId).collection('integrations').doc('email').get(),
    db.doc(`organizations/${orgId}`).get(),
  ])

  const org = orgDoc.exists ? orgDoc.data() : {}
  const slug = org.slug || orgId.slice(0, 8)
  const orgName = org.name || 'FMF'
  const autoEmail = `${slug}@outreach.facemedia.tech`

  if (!integrationDoc.exists) {
    return {
      mode: 'automatic',
      autoEmail,
      senderEmail: `Alex <${autoEmail}>`,
      senderName: `Alex — ${orgName}`,
      verified: true,
      customDomain: null,
    }
  }

  const data = integrationDoc.data()
  return {
    mode: data.mode || (data.customDomain ? 'custom' : 'automatic'),
    autoEmail,
    senderEmail: data.senderEmail || `Alex <${autoEmail}>`,
    senderName: data.senderName || `Alex — ${orgName}`,
    verified: data.verified || false,
    customDomain: data.customDomain || null,
    dnsResults: data.dnsResults || null,
    dnsCheckedAt: data.dnsCheckedAt || null,
  }
})
