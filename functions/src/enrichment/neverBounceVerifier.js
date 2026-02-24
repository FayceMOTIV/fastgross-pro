/**
 * NeverBounce Email Verifier
 * Face Media Factory
 *
 * Real SMTP-level email verification via NeverBounce API
 * Free tier: 1000 verifications (one-time credit, no monthly)
 * API: https://api.neverbounce.com/v4
 *
 * Verification levels:
 * 1. Local checks (format, disposable, role-based) — free, instant
 * 2. NeverBounce API (SMTP-level) — uses credits, 1-3 seconds
 *
 * Results: valid | invalid | disposable | catchall | unknown
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'

const NEVERBOUNCE_API_KEY = process.env.NEVERBOUNCE_API_KEY || ''
const BASE_URL = 'https://api.neverbounce.com/v4'

// Disposable domains list
const DISPOSABLE_DOMAINS = [
  'guerrillamail.com', 'tempmail.com', 'yopmail.com', 'mailinator.com',
  'temp-mail.org', '10minutemail.com', 'throwaway.email', 'fakeinbox.com',
  'trashmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com',
  'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me'
]

const ROLE_PREFIXES = [
  'info', 'contact', 'admin', 'support', 'sales', 'hello', 'help',
  'marketing', 'team', 'office', 'noreply', 'no-reply', 'postmaster',
  'webmaster', 'abuse', 'billing', 'press', 'hr', 'careers', 'legal'
]

/**
 * Verify a single email via NeverBounce
 * Returns: { email, result, flags, score, canSend }
 */
export async function verifyEmail(email) {
  if (!email || typeof email !== 'string') {
    return { email, result: 'invalid', reason: 'empty_input', score: 0, canSend: false, flags: [] }
  }

  const normalized = email.toLowerCase().trim()
  const flags = []

  // Local checks first (free)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(normalized)) {
    return { email: normalized, result: 'invalid', reason: 'bad_format', score: 0, canSend: false, flags: ['bad_format'] }
  }

  const [localPart, domain] = normalized.split('@')

  // Check disposable
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { email: normalized, result: 'disposable', reason: 'disposable_domain', score: 0, canSend: false, flags: ['disposable'] }
  }

  // Check role-based
  if (ROLE_PREFIXES.some(p => localPart === p || localPart.startsWith(`${p}.`) || localPart.startsWith(`${p}_`))) {
    flags.push('role_based')
  }

  // If no NeverBounce key, return local-only result
  if (!NEVERBOUNCE_API_KEY) {
    return {
      email: normalized,
      result: 'unknown',
      reason: 'no_neverbounce_key',
      score: flags.includes('role_based') ? 50 : 70,
      canSend: true,
      flags,
      provider: 'local'
    }
  }

  // NeverBounce SMTP verification
  try {
    const response = await fetch(`${BASE_URL}/single/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: NEVERBOUNCE_API_KEY,
        email: normalized
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || `NeverBounce API error: ${response.status}`)
    }

    const data = await response.json()

    // NeverBounce result codes: 0=valid, 1=invalid, 2=disposable, 3=catchall, 4=unknown
    const resultMap = { 0: 'valid', 1: 'invalid', 2: 'disposable', 3: 'catchall', 4: 'unknown' }
    const nbResult = resultMap[data.result] || 'unknown'

    if (nbResult === 'disposable') flags.push('disposable')
    if (nbResult === 'catchall') flags.push('catchall')

    const scoreMap = { valid: 95, catchall: 65, unknown: 50, invalid: 0, disposable: 0 }
    let score = scoreMap[nbResult] || 50
    if (flags.includes('role_based')) score = Math.max(0, score - 20)

    return {
      email: normalized,
      result: nbResult,
      reason: nbResult,
      score,
      canSend: nbResult === 'valid' || nbResult === 'catchall',
      flags,
      provider: 'neverbounce',
      nbCreditsUsed: data.credits_info?.free_credits_used || 1
    }
  } catch (error) {
    console.error('[NeverBounce] Error:', error.message)
    // Fallback to local-only
    return {
      email: normalized,
      result: 'unknown',
      reason: `api_error: ${error.message}`,
      score: flags.includes('role_based') ? 50 : 70,
      canSend: true,
      flags: [...flags, 'api_error'],
      provider: 'local_fallback'
    }
  }
}

/**
 * Verify batch of emails
 */
export async function verifyEmailsBatch(emails) {
  const results = []
  const stats = { total: emails.length, valid: 0, invalid: 0, catchall: 0, unknown: 0, disposable: 0 }

  for (const email of emails) {
    const result = await verifyEmail(email)
    results.push(result)
    stats[result.result] = (stats[result.result] || 0) + 1
  }

  stats.validRate = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0
  stats.sendableRate = stats.total > 0 ? Math.round(((stats.valid + stats.catchall) / stats.total) * 100) : 0

  return { results, stats }
}

/**
 * Check NeverBounce account credits
 */
export async function checkCredits() {
  if (!NEVERBOUNCE_API_KEY) {
    return { available: false, reason: 'no_api_key', credits: 0 }
  }

  try {
    const response = await fetch(`${BASE_URL}/account/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: NEVERBOUNCE_API_KEY }),
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    return {
      available: true,
      credits: data.credits_info?.free_credits_remaining || 0,
      totalUsed: data.credits_info?.free_credits_used || 0,
      monthlyApiUsage: data.credits_info?.monthly_api_usage || 0
    }
  } catch (error) {
    return { available: false, reason: error.message, credits: 0 }
  }
}

/**
 * Cloud Function: Verify email via NeverBounce
 */
export const verifyEmailNB = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated')

  const { email, emails } = data

  if (emails && Array.isArray(emails)) {
    if (emails.length > 100) throw new HttpsError('invalid-argument', 'Max 100 emails per batch')
    return await verifyEmailsBatch(emails)
  }

  if (!email) throw new HttpsError('invalid-argument', 'email is required')
  return await verifyEmail(email)
})

/**
 * Cloud Function: Check NeverBounce credits
 */
export const getNeverBounceCredits = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated')
  return await checkCredits()
})
