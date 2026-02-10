/**
 * Quota management for Cloud Functions
 * Checks user subscription limits before operations
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// Plan limits configuration
const PLAN_LIMITS = {
  starter: {
    prospectsPerMonth: 500,
    emailsPerMonth: 1000,
    smsPerMonth: 0,
    whatsappPerMonth: 0,
    scansPerMonth: 50,
    sequencesPerMonth: 10,
  },
  pro: {
    prospectsPerMonth: 2500,
    emailsPerMonth: 5000,
    smsPerMonth: 500,
    whatsappPerMonth: 200,
    scansPerMonth: 250,
    sequencesPerMonth: 50,
  },
  enterprise: {
    prospectsPerMonth: 10000,
    emailsPerMonth: 20000,
    smsPerMonth: 2000,
    whatsappPerMonth: 1000,
    scansPerMonth: -1, // unlimited
    sequencesPerMonth: -1, // unlimited
  },
}

/**
 * Get current billing period (YYYY-MM format)
 */
export function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Check if user can perform an action based on quota
 * @param {string} userId - User ID
 * @param {string} quotaType - Type of quota (emails, sms, whatsapp, scans, sequences, prospects)
 * @param {number} amount - Amount to check (default 1)
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number}>}
 */
export async function checkQuota(userId, quotaType, amount = 1) {
  const db = getDb()
  const userDoc = await db.collection('users').doc(userId).get()

  if (!userDoc.exists) {
    return { allowed: false, remaining: 0, limit: 0, error: 'User not found' }
  }

  const userData = userDoc.data()
  const plan = userData.subscription?.plan || 'starter'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter

  const limitKey = `${quotaType}PerMonth`
  const limit = limits[limitKey]

  // Unlimited (-1)
  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 }
  }

  // No access (0)
  if (limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 }
  }

  const currentPeriod = getCurrentPeriod()
  const usage = userData.usage || {}

  // Check if we need to reset usage (new period)
  if (usage.period !== currentPeriod) {
    // Will be reset on first increment
    return { allowed: amount <= limit, remaining: limit - amount, limit }
  }

  const currentUsage = usage[quotaType] || 0
  const remaining = limit - currentUsage

  return {
    allowed: amount <= remaining,
    remaining,
    limit,
    currentUsage,
  }
}

/**
 * Increment usage counter
 * @param {string} userId - User ID
 * @param {string} quotaType - Type of quota
 * @param {number} amount - Amount to increment (default 1)
 */
export async function incrementUsage(userId, quotaType, amount = 1) {
  const db = getDb()
  const currentPeriod = getCurrentPeriod()
  const userRef = db.collection('users').doc(userId)

  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    const userData = userDoc.data() || {}
    const usage = userData.usage || {}

    // Reset if new period
    if (usage.period !== currentPeriod) {
      transaction.update(userRef, {
        usage: {
          period: currentPeriod,
          emails: quotaType === 'emails' ? amount : 0,
          sms: quotaType === 'sms' ? amount : 0,
          whatsapp: quotaType === 'whatsapp' ? amount : 0,
          scans: quotaType === 'scans' ? amount : 0,
          sequences: quotaType === 'sequences' ? amount : 0,
          prospects: quotaType === 'prospects' ? amount : 0,
        },
      })
    } else {
      transaction.update(userRef, {
        [`usage.${quotaType}`]: FieldValue.increment(amount),
      })
    }
  })
}

/**
 * Get user's current plan
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Plan name
 */
export async function getUserPlan(userId) {
  const db = getDb()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) return 'starter'
  return userDoc.data()?.subscription?.plan || 'starter'
}

/**
 * Check if a channel is available for user's plan
 * @param {string} userId - User ID
 * @param {string} channel - Channel name
 * @returns {Promise<boolean>}
 */
export async function isChannelAvailable(userId, channel) {
  const plan = await getUserPlan(userId)

  const channelsByPlan = {
    starter: ['email'],
    pro: ['email', 'sms', 'whatsapp'],
    enterprise: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier'],
  }

  const availableChannels = channelsByPlan[plan] || channelsByPlan.starter
  return availableChannels.includes(channel)
}
