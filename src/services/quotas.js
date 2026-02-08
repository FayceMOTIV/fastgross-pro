// Quotas management for Face Media Factory v4.0
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PLANS } from './plans'

// Get current month key (YYYY-MM)
export function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Default usage structure
export const DEFAULT_USAGE = {
  currentPeriod: getCurrentPeriod(),
  prospectsEnriched: 0,
  emailsSent: 0,
  smsSent: 0,
  whatsappSent: 0,
  sequencesActive: 0,
}

// Default subscription structure
export const DEFAULT_SUBSCRIPTION = {
  planId: 'starter',
  status: 'trial',
  startDate: null,
  currentPeriodEnd: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
}

// Check if quota allows an action
export async function checkQuota(userId, quotaType) {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return { allowed: false, error: 'Utilisateur non trouve', remaining: 0, limit: 0 }
    }

    const userData = userSnap.data()
    const subscription = userData.subscription || DEFAULT_SUBSCRIPTION
    const usage = userData.usage || DEFAULT_USAGE

    // Check if we're in a new period and need to reset
    const currentPeriod = getCurrentPeriod()
    if (usage.currentPeriod !== currentPeriod) {
      // Reset usage for new period
      await updateDoc(userRef, {
        'usage.currentPeriod': currentPeriod,
        'usage.prospectsEnriched': 0,
        'usage.emailsSent': 0,
        'usage.smsSent': 0,
        'usage.whatsappSent': 0,
      })
      usage.prospectsEnriched = 0
      usage.emailsSent = 0
      usage.smsSent = 0
      usage.whatsappSent = 0
    }

    const plan = PLANS[subscription.planId] || PLANS.starter
    const limits = plan.limits

    // Map quota type to limit and current usage
    const quotaMap = {
      prospects: { limit: limits.prospectsPerMonth, used: usage.prospectsEnriched },
      emails: { limit: limits.emailsPerMonth, used: usage.emailsSent },
      sms: { limit: limits.smsPerMonth, used: usage.smsSent },
      whatsapp: { limit: limits.whatsappPerMonth, used: usage.whatsappSent },
      sequences: {
        limit: limits.activeSequences,
        used: usage.sequencesActive,
        isUnlimited: limits.activeSequences === -1,
      },
      enrichments: { limit: limits.enrichmentsPerMonth, used: usage.prospectsEnriched },
    }

    const quota = quotaMap[quotaType]
    if (!quota) {
      return { allowed: false, error: 'Type de quota invalide', remaining: 0, limit: 0 }
    }

    // Check for unlimited
    if (quota.isUnlimited) {
      return { allowed: true, remaining: -1, limit: -1, unlimited: true }
    }

    const remaining = quota.limit - quota.used
    const allowed = remaining > 0

    return {
      allowed,
      remaining,
      limit: quota.limit,
      used: quota.used,
      percentUsed: Math.round((quota.used / quota.limit) * 100),
      error: allowed ? null : `Quota ${quotaType} atteint. Passez au forfait superieur.`,
    }
  } catch (error) {
    console.error('Error checking quota:', error)
    return { allowed: false, error: error.message, remaining: 0, limit: 0 }
  }
}

// Increment usage for a specific quota type
export async function incrementUsage(userId, quotaType, amount = 1) {
  try {
    const userRef = doc(db, 'users', userId)
    const fieldMap = {
      prospects: 'usage.prospectsEnriched',
      emails: 'usage.emailsSent',
      sms: 'usage.smsSent',
      whatsapp: 'usage.whatsappSent',
      sequences: 'usage.sequencesActive',
      enrichments: 'usage.prospectsEnriched',
    }

    const field = fieldMap[quotaType]
    if (!field) {
      throw new Error('Type de quota invalide')
    }

    await updateDoc(userRef, {
      [field]: increment(amount),
      'usage.lastUpdated': serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return { success: false, error: error.message }
  }
}

// Get all usage stats for a user
export async function getUsageStats(userId) {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return null
    }

    const userData = userSnap.data()
    const subscription = userData.subscription || DEFAULT_SUBSCRIPTION
    const usage = userData.usage || DEFAULT_USAGE
    const plan = PLANS[subscription.planId] || PLANS.starter

    return {
      plan: plan,
      subscription,
      usage: {
        prospects: {
          used: usage.prospectsEnriched || 0,
          limit: plan.limits.prospectsPerMonth,
          percent: Math.round(((usage.prospectsEnriched || 0) / plan.limits.prospectsPerMonth) * 100),
        },
        emails: {
          used: usage.emailsSent || 0,
          limit: plan.limits.emailsPerMonth,
          percent: Math.round(((usage.emailsSent || 0) / plan.limits.emailsPerMonth) * 100),
        },
        sms: {
          used: usage.smsSent || 0,
          limit: plan.limits.smsPerMonth,
          percent:
            plan.limits.smsPerMonth > 0
              ? Math.round(((usage.smsSent || 0) / plan.limits.smsPerMonth) * 100)
              : 0,
        },
        whatsapp: {
          used: usage.whatsappSent || 0,
          limit: plan.limits.whatsappPerMonth,
          percent:
            plan.limits.whatsappPerMonth > 0
              ? Math.round(((usage.whatsappSent || 0) / plan.limits.whatsappPerMonth) * 100)
              : 0,
        },
        sequences: {
          used: usage.sequencesActive || 0,
          limit: plan.limits.activeSequences,
          unlimited: plan.limits.activeSequences === -1,
        },
      },
      currentPeriod: usage.currentPeriod || getCurrentPeriod(),
    }
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return null
  }
}

// Check if user is approaching quota limit (80%+)
export function isApproachingLimit(used, limit) {
  if (limit <= 0) return false
  return used / limit >= 0.8
}

// Check if user has exceeded quota
export function hasExceededQuota(used, limit) {
  if (limit === -1) return false // unlimited
  return used >= limit
}
