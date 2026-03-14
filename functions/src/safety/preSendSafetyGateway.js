/**
 * Pre-Send Safety Gateway — Point d'entree unique avant TOUT envoi
 *
 * 9 checks dans l'ordre :
 * 1. Global blacklist (RGPD)
 * 2. Org suppression list
 * 3. Channel compliance (opt-in/opt-out)
 * 4. Bounce check
 * 5. Customer check (ne pas prospecter des clients existants)
 * 6. Active sequence check
 * 7. Email toxicity (disposable, role-based, catch-all, spam trap)
 * 8. Domain health
 * 9. Rate limit (warmup)
 */

import { getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const getDb = () => getFirestore()

// ============================================
// SPAM TRAP PATTERNS (known providers)
// ============================================

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'tempmailaddress.com',
  'getnada.com', 'maildrop.cc', 'mailnesia.com', 'temp-mail.org',
  'mohmal.com', 'tempail.com', 'emailondeck.com', 'harakirimail.com',
])

const ROLE_PREFIXES = [
  'info@', 'contact@', 'admin@', 'support@', 'noreply@', 'no-reply@',
  'webmaster@', 'postmaster@', 'hostmaster@', 'abuse@', 'sales@',
  'marketing@', 'help@', 'hello@', 'team@', 'office@', 'billing@',
  'accounts@', 'security@', 'privacy@', 'feedback@', 'jobs@', 'hr@',
]

const SPAM_TRAP_PATTERNS = [
  /^spam(trap)?@/i,
  /^(seed|trap|pristine|recycled)[-_]?\d*@/i,
  /^honeypot/i,
  /^(test|fake|null|void|dead|bounce)@/i,
]

// ============================================
// CORE — canSendSafely
// ============================================

/**
 * Verifie si on peut envoyer a un prospect — point d'entree unique
 * @param {string} orgId
 * @param {string} prospectId
 * @param {string} email
 * @param {string} channel — 'email' | 'sms' | 'whatsapp' | 'instagram' | 'linkedin'
 * @returns {{ allowed: boolean, reasons: string[] }}
 */
export async function canSendSafely(orgId, prospectId, email, channel = 'email') {
  const reasons = []
  const normalizedEmail = (email || '').toLowerCase().trim()

  // 1. Global blacklist (RGPD)
  try {
    const { isGlobalBlacklisted } = await import('../compliance/rgpdEngine.js')
    const blacklisted = await isGlobalBlacklisted(normalizedEmail)
    if (blacklisted) {
      reasons.push('global_blacklist: email dans la blacklist RGPD globale')
    }
  } catch {
    // rgpdEngine non disponible — skip
  }

  // 2. Org suppression list
  try {
    const { canSendTo } = await import('../engine/compliance.js')
    const result = await canSendTo(normalizedEmail, orgId)
    if (result && !result.canSend) {
      reasons.push(`suppression_list: ${result.reason} — ${result.detail}`)
    }
  } catch {
    // compliance non disponible — skip
  }

  // 3. Channel compliance (opt-in/opt-out)
  if (channel) {
    try {
      const { canContactOnChannel } = await import('../compliance/unifiedOptManager.js')
      const channelResult = await canContactOnChannel(orgId, prospectId || normalizedEmail, channel)
      if (channelResult && !channelResult.allowed) {
        reasons.push(`channel_blocked: opt-out ${channel} — ${channelResult.reason || 'interdit'}`)
      }
    } catch {
      // unifiedOptManager non disponible — skip
    }
  }

  // 4. Bounce check
  if (normalizedEmail) {
    const db = getDb()
    try {
      const bouncesSnap = await db.collection('bounces')
        .where('email', '==', normalizedEmail)
        .limit(3)
        .get()
      if (bouncesSnap.size >= 2) {
        reasons.push(`bounce: email a bounce ${bouncesSnap.size} fois`)
      }
    } catch {
      // bounces collection may not exist
    }
  }

  // 5. Customer check — ne pas prospecter des clients
  if (orgId && normalizedEmail) {
    const db = getDb()
    try {
      const customerSnap = await db.collection(`organizations/${orgId}/customers`)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get()
      if (!customerSnap.empty) {
        reasons.push('is_customer: ce contact est deja un client')
      }
    } catch {
      // customers collection may not exist — safe to skip
    }
  }

  // 6. Active sequence check
  if (orgId && prospectId) {
    const db = getDb()
    try {
      const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
      if (prospectDoc.exists) {
        const data = prospectDoc.data()
        if (data.sequenceStatus === 'active' && data.sequenceId) {
          reasons.push('active_sequence: prospect deja dans une sequence active')
        }
      }
    } catch {
      // prospect doc may not exist
    }
  }

  // 7. Email toxicity (disposable, role-based, spam trap)
  if (normalizedEmail && channel === 'email') {
    const toxicityIssues = checkEmailToxicity(normalizedEmail)
    reasons.push(...toxicityIssues)
  }

  // 8. Domain health
  if (orgId && channel === 'email') {
    try {
      const db = getDb()
      const domainDoc = await db.doc(`organizations/${orgId}/emailHealth/reputation`).get()
      if (domainDoc.exists) {
        const rep = domainDoc.data()
        if (rep.score && rep.score < 30) {
          reasons.push(`domain_health: reputation domaine critique (${rep.score}/100)`)
        }
      }
    } catch {
      // emailHealth may not exist
    }
  }

  // 9. Rate limit (warmup capacity)
  if (orgId && channel === 'email') {
    try {
      const { getAdaptiveWarmupLimit } = await import('../email/warmup.js')
      const { getInboxesStats } = await import('../email/inboxRotation.js')
      const [limit, stats] = await Promise.all([
        getAdaptiveWarmupLimit(orgId).catch(() => null),
        getInboxesStats(orgId).catch(() => null),
      ])
      if (limit && stats && stats.totalSentToday >= limit) {
        reasons.push(`rate_limit: limite journaliere atteinte (${stats.totalSentToday}/${limit})`)
      }
    } catch {
      // warmup/inbox not available
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    checkedAt: new Date().toISOString(),
    email: normalizedEmail,
    channel,
  }
}

// ============================================
// EMAIL TOXICITY CHECK
// ============================================

function checkEmailToxicity(email) {
  const issues = []
  const domain = email.split('@')[1] || ''

  // Disposable domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    issues.push('toxic_disposable: domaine jetable detecte')
  }

  // Role-based
  if (ROLE_PREFIXES.some(prefix => email.startsWith(prefix))) {
    issues.push('toxic_role: adresse role-based (info@, contact@, etc.)')
  }

  // Spam trap patterns
  if (SPAM_TRAP_PATTERNS.some(pattern => pattern.test(email))) {
    issues.push('toxic_spam_trap: pattern spam trap detecte')
  }

  // Catch-all heuristic (very long local part)
  const localPart = email.split('@')[0] || ''
  if (localPart.length > 64) {
    issues.push('toxic_invalid: partie locale trop longue (>64 chars)')
  }

  return issues
}

// ============================================
// CALLABLE — preSendSafetyCheck
// ============================================

export const preSendSafetyCheck = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId, prospectId, email, channel } = request.data || {}
  if (!orgId || !email) {
    throw new HttpsError('invalid-argument', 'orgId et email requis')
  }

  return canSendSafely(orgId, prospectId || null, email, channel || 'email')
})
