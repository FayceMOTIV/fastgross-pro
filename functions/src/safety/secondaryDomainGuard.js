/**
 * Secondary Domain Guard — Empeche l'envoi cold email depuis le domaine principal
 *
 * Logique :
 * - Verifie si domaine email = domaine principal org → BLOQUE
 * - Guide vers setup sous-domaine (outreach.mondomaine.com)
 * - Verifie SPF/DKIM/DMARC du domaine secondaire
 */

import { getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import dns from 'dns'
import { promisify } from 'util'

const getDb = () => getFirestore()
const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)

// ============================================
// CORE — checkOutreachDomain
// ============================================

/**
 * Verifie la configuration du domaine d'envoi
 * @param {string} orgId
 * @returns {{ safe: boolean, issues: string[], recommendations: string[] }}
 */
export async function checkOutreachDomain(orgId) {
  const db = getDb()
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  if (!orgDoc.exists) {
    return { safe: false, issues: ['Organisation non trouvee'], recommendations: [] }
  }

  const orgData = orgDoc.data()
  const mainDomain = extractDomain(orgData.website || orgData.domain || '')
  const issues = []
  const recommendations = []

  // Recuperer les inboxes configurees
  const inboxesSnap = await db.collection(`organizations/${orgId}/inboxes`)
    .where('enabled', '==', true)
    .limit(20)
    .get()

  if (inboxesSnap.empty) {
    issues.push('Aucune inbox configuree')
    recommendations.push('Configurez au moins une inbox d\'envoi')
    return { safe: false, issues, recommendations }
  }

  let hasSecondaryDomain = false
  let usesMainDomain = false

  for (const inboxDoc of inboxesSnap.docs) {
    const inbox = inboxDoc.data()
    const inboxDomain = extractDomain(inbox.email || '')

    if (!inboxDomain) continue

    if (mainDomain && inboxDomain === mainDomain) {
      usesMainDomain = true
      issues.push(`Inbox ${inbox.email} utilise le domaine principal (${mainDomain})`)
    } else {
      hasSecondaryDomain = true
    }
  }

  if (usesMainDomain && !hasSecondaryDomain) {
    issues.push('CRITIQUE: Toutes les inboxes utilisent le domaine principal')
    recommendations.push(
      `Creez un sous-domaine d'envoi: outreach.${mainDomain} ou mail.${mainDomain}`,
      'Configurez SPF, DKIM et DMARC sur le sous-domaine',
      'Utilisez le sous-domaine pour le cold email afin de proteger votre domaine principal',
    )
    return { safe: false, issues, recommendations }
  }

  if (usesMainDomain && hasSecondaryDomain) {
    recommendations.push(
      `Desactivez les inboxes sur ${mainDomain} pour le cold email`,
      'Utilisez uniquement les sous-domaines pour la prospection',
    )
  }

  return {
    safe: !usesMainDomain || hasSecondaryDomain,
    issues,
    recommendations,
    mainDomain,
    hasSecondaryDomain,
  }
}

// ============================================
// DOMAIN VALIDATION
// ============================================

/**
 * Valide SPF/DKIM/DMARC d'un domaine
 */
export async function validateDomainDNS(domain) {
  if (!domain) return { valid: false, issues: ['Domaine vide'] }

  const checks = { spf: false, dkim: false, dmarc: false }
  const issues = []

  // SPF
  try {
    const records = await resolveTxt(domain)
    const spfRecord = records.flat().find(r => r.startsWith('v=spf1'))
    if (spfRecord) {
      checks.spf = true
    } else {
      issues.push('SPF: pas de record SPF trouve')
    }
  } catch {
    issues.push('SPF: impossible de verifier (DNS error)')
  }

  // DKIM (check common selectors)
  const dkimSelectors = ['google', 'default', 'mail', 'dkim', 's1', 'selector1']
  for (const selector of dkimSelectors) {
    try {
      const records = await resolveTxt(`${selector}._domainkey.${domain}`)
      if (records.flat().some(r => r.includes('v=DKIM1'))) {
        checks.dkim = true
        break
      }
    } catch {
      // Try next selector
    }
  }
  if (!checks.dkim) {
    issues.push('DKIM: aucun selecteur DKIM trouve')
  }

  // DMARC
  try {
    const records = await resolveTxt(`_dmarc.${domain}`)
    const dmarcRecord = records.flat().find(r => r.startsWith('v=DMARC1'))
    if (dmarcRecord) {
      checks.dmarc = true
    } else {
      issues.push('DMARC: pas de record DMARC trouve')
    }
  } catch {
    issues.push('DMARC: impossible de verifier (DNS error)')
  }

  // MX
  let hasMX = false
  try {
    const mx = await resolveMx(domain)
    hasMX = mx.length > 0
  } catch {
    issues.push('MX: pas de record MX trouve')
  }

  return {
    valid: checks.spf && checks.dkim && checks.dmarc,
    checks,
    hasMX,
    issues,
    score: Object.values(checks).filter(Boolean).length * 33 + (hasMX ? 1 : 0),
  }
}

// ============================================
// INTERNAL — blockMainDomainSending
// ============================================

/**
 * Verifie si l'email d'envoi utilise le domaine principal — a appeler avant chaque envoi cold
 * @returns {boolean} true si bloque
 */
export async function isMainDomainBlocked(orgId, senderEmail) {
  const db = getDb()
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  if (!orgDoc.exists) return false

  const orgData = orgDoc.data()
  const mainDomain = extractDomain(orgData.website || orgData.domain || '')
  const senderDomain = extractDomain(senderEmail || '')

  if (!mainDomain || !senderDomain) return false

  // Si meme domaine → bloque pour cold email
  if (senderDomain === mainDomain) {
    // Check si l'org a explicitement autorise (override)
    if (orgData.allowMainDomainColdEmail === true) return false
    return true
  }

  return false
}

// ============================================
// HELPERS
// ============================================

function extractDomain(input) {
  if (!input) return ''
  try {
    const cleaned = input.includes('://') ? input : `https://${input}`
    const url = new URL(cleaned)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    // Peut etre un email
    const atIndex = input.indexOf('@')
    if (atIndex > 0) {
      return input.slice(atIndex + 1).toLowerCase().trim()
    }
    return input.toLowerCase().replace(/^www\./, '').trim()
  }
}

// ============================================
// CALLABLES
// ============================================

export const checkOutreachDomainSetup = onCall({
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  return checkOutreachDomain(orgId)
})

export const validateSecondaryDomain = onCall({
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { domain } = request.data || {}
  if (!domain) throw new HttpsError('invalid-argument', 'domain requis')

  return validateDomainDNS(domain)
})
