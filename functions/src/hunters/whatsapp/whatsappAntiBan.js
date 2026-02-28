/**
 * WhatsApp Anti-Ban System
 * Progressive warmup, block rate monitoring, business hours, instance rotation
 *
 * Protections:
 * - Progressive warmup schedule (day 1-3: 3/day, day 4-7: 15/day, etc.)
 * - Block rate monitoring (>5% → auto-pause)
 * - Business hours enforcement per timezone
 * - Multi-instance rotation with load balancing
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const getDb = () => getFirestore()

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Warmup schedule: day ranges → { maxPerHour, maxPerDay }
const WARMUP_SCHEDULE = [
  { minDay: 1, maxDay: 3, maxPerHour: 1, maxPerDay: 3 },
  { minDay: 4, maxDay: 7, maxPerHour: 3, maxPerDay: 15 },
  { minDay: 8, maxDay: 14, maxPerHour: 5, maxPerDay: 30 },
  { minDay: 15, maxDay: 21, maxPerHour: 8, maxPerDay: 40 },
  { minDay: 22, maxDay: Infinity, maxPerHour: 10, maxPerDay: 50 },
]

// Block rate threshold
const BLOCK_RATE_THRESHOLD = 0.05 // 5%
const BLOCK_CHECK_WINDOW_HOURS = 24

// Business hours per timezone (default Europe/Paris)
const BUSINESS_HOURS = {
  'Europe/Paris': { start: 8, end: 20 },
  'Europe/London': { start: 8, end: 19 },
  'America/New_York': { start: 9, end: 18 },
  'America/Los_Angeles': { start: 9, end: 18 },
  'Asia/Dubai': { start: 9, end: 19 },
}

/**
 * Get warmup limits based on instance creation date
 * Returns { maxPerHour, maxPerDay, warmupDay, phase }
 */
export function getWhatsAppWarmupLimits(instanceCreatedAt) {
  if (!instanceCreatedAt) {
    // No creation date → use conservative defaults
    return { maxPerHour: 3, maxPerDay: 15, warmupDay: 1, phase: 'unknown' }
  }

  const createdDate = instanceCreatedAt.seconds
    ? new Date(instanceCreatedAt.seconds * 1000)
    : new Date(instanceCreatedAt)

  const now = new Date()
  const diffMs = now - createdDate
  const warmupDay = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const schedule = WARMUP_SCHEDULE.find(
    (s) => warmupDay >= s.minDay && warmupDay <= s.maxDay
  ) || WARMUP_SCHEDULE[WARMUP_SCHEDULE.length - 1]

  let phase = 'warmup'
  if (warmupDay <= 3) phase = 'initial'
  else if (warmupDay <= 7) phase = 'early'
  else if (warmupDay <= 14) phase = 'growing'
  else if (warmupDay <= 21) phase = 'maturing'
  else phase = 'mature'

  return {
    maxPerHour: schedule.maxPerHour,
    maxPerDay: schedule.maxPerDay,
    warmupDay,
    phase,
  }
}

/**
 * Check block rate for an org over the last 24 hours
 * Returns { blockRate, totalSent, totalBlocked, shouldPause }
 */
export async function checkBlockRate(orgId) {
  const db = getDb()

  try {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - BLOCK_CHECK_WINDOW_HOURS)

    // Get recent WhatsApp interactions
    const interactionsSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('whatsappContactedAt', '>=', cutoff)
      .get()

    let totalSent = 0
    let totalBlocked = 0

    interactionsSnap.docs.forEach((doc) => {
      const data = doc.data()
      if (data.whatsappStatus) {
        totalSent++
        if (
          data.whatsappStatus === 'error' &&
          data.whatsappError?.includes('blocked')
        ) {
          totalBlocked++
        }
      }
    })

    const blockRate = totalSent > 0 ? totalBlocked / totalSent : 0
    const shouldPause = blockRate > BLOCK_RATE_THRESHOLD && totalSent >= 5

    if (shouldPause) {
      logger.warn(
        `WhatsApp block rate ${(blockRate * 100).toFixed(1)}% exceeds threshold for org ${orgId}. Auto-pausing.`
      )

      // Record the pause event
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc('whatsappAntiBan')
        .set(
          {
            lastBlockRateCheck: FieldValue.serverTimestamp(),
            blockRate,
            totalSent,
            totalBlocked,
            autoPaused: true,
            autoPausedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    }

    return { blockRate, totalSent, totalBlocked, shouldPause }
  } catch (error) {
    logger.error('checkBlockRate error:', error)
    return { blockRate: 0, totalSent: 0, totalBlocked: 0, shouldPause: false }
  }
}

/**
 * Check if current time is within business hours for a given timezone
 */
export function isBusinessHours(timezone = 'Europe/Paris') {
  try {
    const hours = BUSINESS_HOURS[timezone] || BUSINESS_HOURS['Europe/Paris']

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(now), 10)

    // Also check weekends
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
    const day = dayFormatter.format(now)
    if (day === 'Sat' || day === 'Sun') {
      return false
    }

    return currentHour >= hours.start && currentHour < hours.end
  } catch (error) {
    // Fallback: use server time
    const hour = new Date().getHours()
    const day = new Date().getDay()
    if (day === 0 || day === 6) return false
    return hour >= 8 && hour < 20
  }
}

/**
 * Select the best WhatsApp instance for sending
 * Considers: health, daily usage, warmup phase, block rate
 * Returns { instanceName, instanceUrl, apiKey } or null if none available
 */
export async function selectBestInstance(orgId) {
  const db = getDb()

  try {
    // Get org's WhatsApp instances
    const instancesSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('whatsappInstances')
      .where('status', '==', 'active')
      .get()

    if (instancesSnap.empty) {
      // Fallback to default instance from env
      const health = await checkEvolutionHealth(
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'
      )

      if (!health.connected) return null

      return {
        instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'facemedia',
        instanceUrl: EVOLUTION_API_URL,
        apiKey: EVOLUTION_API_KEY,
        warmupLimits: getWhatsAppWarmupLimits(null),
      }
    }

    // Evaluate each instance
    const candidates = []
    const today = new Date().toISOString().split('T')[0]

    for (const doc of instancesSnap.docs) {
      const instance = doc.data()

      // Check health
      const health = await checkEvolutionHealth(
        instance.apiUrl || EVOLUTION_API_URL,
        instance.apiKey || EVOLUTION_API_KEY,
        instance.instanceName
      )

      if (!health.connected) continue

      // Get warmup limits
      const warmupLimits = getWhatsAppWarmupLimits(instance.createdAt)

      // Get today's usage
      const usageDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('whatsappInstances')
        .doc(doc.id)
        .collection('usage')
        .doc(today)
        .get()

      const usage = usageDoc.exists ? usageDoc.data() : { sent: 0 }
      const remaining = warmupLimits.maxPerDay - (usage.sent || 0)

      if (remaining <= 0) continue

      candidates.push({
        id: doc.id,
        instanceName: instance.instanceName,
        instanceUrl: instance.apiUrl || EVOLUTION_API_URL,
        apiKey: instance.apiKey || EVOLUTION_API_KEY,
        warmupLimits,
        remaining,
        usage: usage.sent || 0,
      })
    }

    if (candidates.length === 0) return null

    // Sort by remaining capacity (most remaining first)
    candidates.sort((a, b) => b.remaining - a.remaining)

    return candidates[0]
  } catch (error) {
    logger.error('selectBestInstance error:', error)
    return null
  }
}

/**
 * Check Evolution API instance health
 */
async function checkEvolutionHealth(apiUrl, apiKey, instanceName) {
  try {
    const response = await axios.get(
      `${apiUrl}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: apiKey },
        timeout: 10000,
      }
    )
    const state = response.data?.instance?.state || response.data?.state
    return { connected: state === 'open', state }
  } catch {
    return { connected: false, state: 'error' }
  }
}

/**
 * Record a send event for usage tracking
 */
export async function recordSendEvent(orgId, instanceId, success = true) {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  try {
    const usageRef = instanceId
      ? db
          .collection('organizations')
          .doc(orgId)
          .collection('whatsappInstances')
          .doc(instanceId)
          .collection('usage')
          .doc(today)
      : db.collection('whatsappStats').doc(today)

    await usageRef.set(
      {
        sent: FieldValue.increment(1),
        ...(success ? {} : { errors: FieldValue.increment(1) }),
        lastSendAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error) {
    logger.error('recordSendEvent error:', error)
  }
}
