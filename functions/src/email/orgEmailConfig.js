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
