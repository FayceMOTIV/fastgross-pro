/**
 * Quota management for Cloud Functions
 * Checks user subscription limits before operations
 * Beta users get unlimited access to everything
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
  // Beta users get unlimited everything
  beta: {
    prospectsPerMonth: -1,
    emailsPerMonth: -1,
    smsPerMonth: -1,
    whatsappPerMonth: -1,
    scansPerMonth: -1,
    sequencesPerMonth: -1,
    instagramPerMonth: -1,
    voicemailPerMonth: -1,
    postalPerMonth: -1,
  },
}

/**
 * Check if user is a beta user (unlimited access)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isBetaUser(userId) {
  const db = getDb()
  const betaDoc = await db.collection('betaUsers').doc(userId).get()
  return betaDoc.exists
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
 * Beta users always get unlimited access
 * @param {string} userId - User ID
 * @param {string} quotaType - Type of quota (emails, sms, whatsapp, scans, sequences, prospects)
 * @param {number} amount - Amount to check (default 1)
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number, isBeta?: boolean}>}
 */
export async function checkQuota(userId, quotaType, amount = 1) {
  const db = getDb()

  // First check if user is a beta user - they get unlimited access
  const isBeta = await isBetaUser(userId)
  if (isBeta) {
    return { allowed: true, remaining: -1, limit: -1, isBeta: true }
  }

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
 * Beta users have access to all channels
 * @param {string} userId - User ID
 * @param {string} channel - Channel name
 * @returns {Promise<boolean>}
 */
export async function isChannelAvailable(userId, channel) {
  // Beta users have access to all channels
  const isBeta = await isBetaUser(userId)
  if (isBeta) {
    return true
  }

  const plan = await getUserPlan(userId)

  const channelsByPlan = {
    starter: ['email'],
    pro: ['email', 'sms', 'whatsapp'],
    enterprise: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier'],
  }

  const availableChannels = channelsByPlan[plan] || channelsByPlan.starter
  return availableChannels.includes(channel)
}

/**
 * Get quota info for a user
 * Beta users get special unlimited response
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export async function getQuotaInfo(userId) {
  const db = getDb()

  // Check if beta user
  const isBeta = await isBetaUser(userId)
  if (isBeta) {
    return {
      isBeta: true,
      plan: 'beta',
      limits: PLAN_LIMITS.beta,
      usage: {},
      channels: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier']
    }
  }

  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    return {
      plan: 'starter',
      limits: PLAN_LIMITS.starter,
      usage: {},
      channels: ['email']
    }
  }

  const userData = userDoc.data()
  const plan = userData.subscription?.plan || 'starter'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter

  const channelsByPlan = {
    starter: ['email'],
    pro: ['email', 'sms', 'whatsapp'],
    enterprise: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier'],
  }

  return {
    isBeta: false,
    plan,
    limits,
    usage: userData.usage || {},
    channels: channelsByPlan[plan] || channelsByPlan.starter
  }
}
