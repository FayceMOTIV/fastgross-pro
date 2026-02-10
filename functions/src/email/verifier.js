/**
 * Email Verifier - Verification des emails avant envoi
 * Niveau Apollo/Instantly : Ne jamais envoyer a une adresse non verifiee
 */

import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

// Domaines jetables connus
const DISPOSABLE_DOMAINS = [
  'guerrillamail.com', 'tempmail.com', 'yopmail.com', 'mailinator.com',
  'temp-mail.org', '10minutemail.com', 'throwaway.email', 'fakeinbox.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
  'grr.la', 'getairmail.com', 'tempail.com', 'mohmal.com'
]

// Prefixes role-based (moins de reponses)
const ROLE_BASED_PREFIXES = [
  'info', 'contact', 'admin', 'support', 'sales', 'hello', 'help',
  'marketing', 'team', 'office', 'general', 'enquiries', 'service',
  'billing', 'press', 'media', 'hr', 'careers', 'jobs', 'legal',
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'postmaster',
  'webmaster', 'abuse', 'spam', 'newsletter', 'news'
]

// Domaines avec catch-all connus (acceptent tout)
const CATCH_ALL_DOMAINS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.fr',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net'
]

/**
 * Verifie si le format de l'email est valide
 */
function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.toLowerCase().trim())
}

/**
 * Verifie si un domaine a des enregistrements MX
 */
async function hasMxRecords(domain) {
  try {
    const records = await resolveMx(domain)
    return records && records.length > 0
  } catch (error) {
    return false
  }
}

/**
 * Verifie si le domaine est jetable
 */
function isDisposableDomain(domain) {
  return DISPOSABLE_DOMAINS.includes(domain.toLowerCase())
}

/**
 * Verifie si l'email est role-based
 */
function isRoleBased(email) {
  const localPart = email.split('@')[0].toLowerCase()
  return ROLE_BASED_PREFIXES.some(prefix =>
    localPart === prefix || localPart.startsWith(`${prefix}.`) || localPart.startsWith(`${prefix}_`)
  )
}

/**
 * Verifie si le domaine est connu pour etre catch-all
 */
function isCatchAllDomain(domain) {
  return CATCH_ALL_DOMAINS.includes(domain.toLowerCase())
}

/**
 * Verification complete d'un email avant envoi
 * @param {string} email - Email a verifier
 * @returns {Promise<Object>} Resultat de verification
 */
export async function verifyEmailBeforeSend(email) {
  const result = {
    email: email?.toLowerCase().trim(),
    valid: false,
    reason: null,
    isRoleBased: false,
    isDisposable: false,
    isCatchAll: false,
    confidence: 'low',
    domain: null,
    canSend: false,
    warnings: []
  }

  // 1. Format valide ?
  if (!isValidEmailFormat(email)) {
    result.reason = 'invalid_format'
    return result
  }

  const domain = email.split('@')[1].toLowerCase()
  result.domain = domain

  // 2. Domaine jetable ?
  if (isDisposableDomain(domain)) {
    result.reason = 'disposable_domain'
    result.isDisposable = true
    return result
  }

  // 3. Domaine existe ? (MX record check)
  const hasMx = await hasMxRecords(domain)
  if (!hasMx) {
    result.reason = 'no_mx_records'
    return result
  }

  // Email valide a ce stade
  result.valid = true
  result.canSend = true

  // 4. Role-based ? (taux de reponse plus faible)
  if (isRoleBased(email)) {
    result.isRoleBased = true
    result.warnings.push('role_based_email')
    result.confidence = 'medium'
  } else {
    result.confidence = 'high'
  }

  // 5. Catch-all domain ?
  if (isCatchAllDomain(domain)) {
    result.isCatchAll = true
    result.warnings.push('catch_all_domain')
  }

  return result
}

/**
 * Verification batch d'emails
 * @param {string[]} emails - Liste d'emails a verifier
 * @returns {Promise<Object>} Resultats de verification
 */
export async function verifyEmailsBatch(emails) {
  const results = {
    total: emails.length,
    valid: 0,
    invalid: 0,
    roleBased: 0,
    disposable: 0,
    details: []
  }

  for (const email of emails) {
    const verification = await verifyEmailBeforeSend(email)
    results.details.push(verification)

    if (verification.valid) {
      results.valid++
      if (verification.isRoleBased) results.roleBased++
    } else {
      results.invalid++
      if (verification.isDisposable) results.disposable++
    }
  }

  results.validRate = Math.round((results.valid / results.total) * 100)
  return results
}

/**
 * Score de qualite d'un email (0-100)
 */
export function getEmailQualityScore(verification) {
  if (!verification.valid) return 0

  let score = 100

  if (verification.isRoleBased) score -= 30
  if (verification.isCatchAll) score -= 10
  if (verification.warnings.length > 0) score -= verification.warnings.length * 5

  return Math.max(0, score)
}
