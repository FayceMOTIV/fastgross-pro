/**
 * WhatsApp Sender V2
 * Send personalized WhatsApp messages to verified prospects via Evolution API
 *
 * V2 Features:
 * - Batch sending with rate limiting
 * - Media support (images, documents, audio)
 * - Scheduled sending (queue + process)
 * - Gaussian random delays (human-like)
 * - Error classification + retry logic
 * - Instance health check
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import axios from 'axios'
import {
  getWhatsAppWarmupLimits,
  checkBlockRate,
  isBusinessHours,
  selectBestInstance,
  recordSendEvent,
} from './whatsappAntiBan.js'

const getDb = () => getFirestore()

// Evolution API config
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

// Safe limits
const LIMITS = {
  MAX_MESSAGES_PER_HOUR: 10,
  MAX_MESSAGES_PER_DAY: 50,
  MIN_DELAY_SECONDS: 120, // 2 min
  MAX_DELAY_SECONDS: 300, // 5 min
  SLEEP_HOURS_START: 23,
  SLEEP_HOURS_END: 7,
  NO_WEEKEND: true,
}

// Error classification for retry logic
const ERROR_TYPES = {
  RATE_LIMIT: 'rate_limit',       // Retry after delay
  BLOCKED: 'blocked',             // Stop sending
  INVALID_NUMBER: 'invalid',      // Skip prospect
  NOT_ON_WHATSAPP: 'not_wa',      // Mark inactive
  NETWORK: 'network',             // Retry
  UNKNOWN: 'unknown',             // Log and continue
}

function classifyWhatsAppError(error) {
  const msg = (error.message || '').toLowerCase()
  const status = error.response?.status
  const data = error.response?.data

  if (status === 429 || msg.includes('rate limit')) return ERROR_TYPES.RATE_LIMIT
  if (status === 403 || msg.includes('blocked') || msg.includes('banned')) return ERROR_TYPES.BLOCKED
  if (msg.includes('invalid') || msg.includes('not valid')) return ERROR_TYPES.INVALID_NUMBER
  if (msg.includes('not on whatsapp') || msg.includes('not registered')) return ERROR_TYPES.NOT_ON_WHATSAPP
  if (msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('network')) return ERROR_TYPES.NETWORK
  return ERROR_TYPES.UNKNOWN
}

// Gaussian random delay (Box-Muller)
function gaussianDelay(meanMs, stdDevMs) {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return Math.max(meanMs * 0.3, Math.round(meanMs + z * stdDevMs))
}

// Default message template
const DEFAULT_TEMPLATE = `Salut {firstName} !

J'ai vu ton profil {platform} (@{username}) et je pense que Face Media Factory pourrait t'interesser.

On automatise la prospection sur Instagram, TikTok et LinkedIn pour trouver des clients 24/7.

Tu veux en savoir plus ?

Faical
Face Media Factory`

/**
 * WhatsApp Sender - Runs hourly
 */
export const whatsappSender = onSchedule(
  {
    schedule: '0 * * * *', // Every hour
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb()
    logger.info('Starting WhatsApp sender...')

    // Anti-ban: Check business hours (timezone-aware)
    if (!isBusinessHours('Europe/Paris')) {
      logger.info('Outside business hours, skipping')
      return { skipped: true, reason: 'outside_business_hours' }
    }

    // Legacy checks (keep as fallback)
    const currentHour = new Date().getHours()
    if (currentHour >= LIMITS.SLEEP_HOURS_START || currentHour < LIMITS.SLEEP_HOURS_END) {
      logger.info(`Sleep hours (${LIMITS.SLEEP_HOURS_START}h-${LIMITS.SLEEP_HOURS_END}h), skipping`)
      return { skipped: true, reason: 'sleep_hours' }
    }

    if (LIMITS.NO_WEEKEND) {
      const dayOfWeek = new Date().getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        logger.info('Weekend, skipping')
        return { skipped: true, reason: 'weekend' }
      }
    }

    // Check instance health before sending
    const health = await checkInstanceHealth()
    if (!health.connected) {
      logger.warn(`WhatsApp instance not connected: ${health.state}`)
      return { skipped: true, reason: 'instance_disconnected', state: health.state }
    }

    const stats = {
      messagesSent: 0,
      errors: 0,
    }

    try {
      // Get today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const statsRef = db.collection('whatsappStats').doc(todayStr)
      const statsDoc = await statsRef.get()
      const dailyStats = statsDoc.exists
        ? statsDoc.data()
        : { messagesSentToday: 0, messagesSentThisHour: 0, lastResetHour: -1 }

      // Reset hourly counter if new hour
      const currentHourNum = new Date().getHours()
      if (dailyStats.lastResetHour !== currentHourNum) {
        dailyStats.messagesSentThisHour = 0
        dailyStats.lastResetHour = currentHourNum
      }

      // Anti-ban: Get warmup limits (adapt limits based on instance age)
      const instanceCreatedAt = dailyStats.instanceCreatedAt || null
      const warmupLimits = getWhatsAppWarmupLimits(instanceCreatedAt)
      const effectiveHourlyLimit = Math.min(LIMITS.MAX_MESSAGES_PER_HOUR, warmupLimits.maxPerHour)
      const effectiveDailyLimit = Math.min(LIMITS.MAX_MESSAGES_PER_DAY, warmupLimits.maxPerDay)

      logger.info(`Warmup day ${warmupLimits.warmupDay} (${warmupLimits.phase}): ${effectiveHourlyLimit}/h, ${effectiveDailyLimit}/day`)

      // Check limits with warmup-adjusted values
      if (dailyStats.messagesSentToday >= effectiveDailyLimit) {
        logger.info(`Daily limit reached (warmup: ${effectiveDailyLimit})`)
        return { skipped: true, reason: 'daily_limit', warmupPhase: warmupLimits.phase }
      }

      if (dailyStats.messagesSentThisHour >= effectiveHourlyLimit) {
        logger.info(`Hourly limit reached (warmup: ${effectiveHourlyLimit})`)
        return { skipped: true, reason: 'hourly_limit', warmupPhase: warmupLimits.phase }
      }

      // Calculate how many messages we can send
      const remainingHourly = effectiveHourlyLimit - dailyStats.messagesSentThisHour
      const remainingDaily = effectiveDailyLimit - dailyStats.messagesSentToday
      const messagesToSend = Math.min(remainingHourly, remainingDaily, 10)

      // Get verified prospects ready to contact
      const prospectsSnapshot = await db
        .collectionGroup('prospects')
        .where('whatsappActive', '==', true)
        .where('whatsappStatus', '==', 'verified')
        .where('score', '>=', 70) // Only high-score prospects
        .limit(messagesToSend)
        .get()

      logger.info(`Found ${prospectsSnapshot.size} prospects to contact`)

      for (const prospectDoc of prospectsSnapshot.docs) {
        const prospect = prospectDoc.data()

        try {
          // Get org's message template or use default
          const orgId = prospectDoc.ref.parent.parent.id

          // Anti-ban: Check block rate before each org batch
          const blockCheck = await checkBlockRate(orgId)
          if (blockCheck.shouldPause) {
            logger.warn(`Block rate too high for org ${orgId} (${(blockCheck.blockRate * 100).toFixed(1)}%), skipping`)
            continue
          }
          const orgDoc = await db.collection('organizations').doc(orgId).get()
          const orgData = orgDoc.data()
          const template = orgData?.whatsappTemplate || DEFAULT_TEMPLATE

          // Personalize message
          const message = personalizeMessage(template, prospect)

          // Send via Evolution API
          await sendWhatsAppMessage(prospect.phone, message)

          // Update prospect
          await prospectDoc.ref.update({
            whatsappStatus: 'contacted',
            whatsappContactedAt: FieldValue.serverTimestamp(),
            whatsappMessageSent: message,
          })

          stats.messagesSent++
          dailyStats.messagesSentToday++
          dailyStats.messagesSentThisHour++

          logger.info(`Sent WhatsApp to ${prospect.phone}`)

          // Update daily stats
          await statsRef.set(dailyStats, { merge: true })

          // Gaussian delay (human-like)
          const meanDelay = ((LIMITS.MIN_DELAY_SECONDS + LIMITS.MAX_DELAY_SECONDS) / 2) * 1000
          const stdDev = ((LIMITS.MAX_DELAY_SECONDS - LIMITS.MIN_DELAY_SECONDS) / 4) * 1000
          const delay = gaussianDelay(meanDelay, stdDev)
          await sleep(delay)
        } catch (error) {
          const errorType = classifyWhatsAppError(error)
          logger.error(`Error sending to ${prospect.phone}: [${errorType}]`, error.message)
          stats.errors++

          // Handle by error type
          if (errorType === ERROR_TYPES.BLOCKED) {
            logger.error('Account appears blocked - stopping sender')
            await prospectDoc.ref.update({
              whatsappStatus: 'error',
              whatsappError: `[${errorType}] ${error.message}`,
            })
            break // Stop all sending
          }

          if (errorType === ERROR_TYPES.NOT_ON_WHATSAPP) {
            await prospectDoc.ref.update({
              whatsappActive: false,
              whatsappStatus: 'not_on_whatsapp',
              whatsappError: error.message,
            })
          } else if (errorType === ERROR_TYPES.RATE_LIMIT) {
            logger.warn('Rate limited - stopping for this hour')
            await prospectDoc.ref.update({
              whatsappStatus: 'pending',
              whatsappError: `[${errorType}] ${error.message}`,
            })
            break // Stop and retry next hour
          } else {
            await prospectDoc.ref.update({
              whatsappStatus: 'error',
              whatsappError: `[${errorType}] ${error.message}`,
            })
          }
        }
      }

      logger.info('WhatsApp sender completed', stats)
      return { stats }
    } catch (error) {
      logger.error('WhatsApp sender failed:', error)
      throw error
    }
  }
)

/**
 * Send single WhatsApp message (callable) - supports text + media
 */
export const sendWhatsAppManual = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { phone, message, orgId, prospectId, mediaType, mediaUrl, caption } = request.data
    const db = getDb()

    if (!phone) {
      throw new HttpsError('invalid-argument', 'Phone required')
    }
    if (!message && !mediaUrl) {
      throw new HttpsError('invalid-argument', 'Message or mediaUrl required')
    }

    try {
      // Check instance health first
      const health = await checkInstanceHealth()
      if (!health.connected) {
        throw new HttpsError('unavailable', `WhatsApp instance not connected: ${health.state}`)
      }

      let result

      // Send media if provided
      if (mediaUrl && mediaType) {
        result = await sendWhatsAppMedia(phone, mediaType, mediaUrl, caption || message || '')
      }

      // Send text message
      if (message && !mediaUrl) {
        result = await sendWhatsAppMessage(phone, message)
      }

      // Update prospect if provided
      if (orgId && prospectId) {
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('prospects')
          .doc(prospectId)
          .update({
            whatsappStatus: 'contacted',
            whatsappContactedAt: FieldValue.serverTimestamp(),
            whatsappMessageSent: message || `[${mediaType}] ${mediaUrl}`,
          })
      }

      return {
        success: true,
        phone,
        messageType: mediaUrl ? mediaType : 'text',
        sentAt: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('Manual WhatsApp send failed:', error)
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Get WhatsApp stats
 */
export const getWhatsAppStats = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId } = request.data
    const db = getDb()

    try {
      // Get prospects stats
      const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')

      const [withPhoneSnap, activeSnap, contactedSnap, repliedSnap] = await Promise.all([
        prospectsRef.where('phone', '!=', null).count().get(),
        prospectsRef.where('whatsappActive', '==', true).count().get(),
        prospectsRef.where('whatsappStatus', '==', 'contacted').count().get(),
        prospectsRef.where('whatsappStatus', '==', 'replied').count().get(),
      ])

      // Get today's sending stats
      const today = new Date().toISOString().split('T')[0]
      const statsDoc = await db.collection('whatsappStats').doc(today).get()
      const dailyStats = statsDoc.exists ? statsDoc.data() : {}

      return {
        withPhone: withPhoneSnap.data().count,
        whatsappActive: activeSnap.data().count,
        contacted: contactedSnap.data().count,
        replied: repliedSnap.data().count,
        messagesSentToday: dailyStats.messagesSentToday || 0,
        conversionRate:
          contactedSnap.data().count > 0
            ? ((repliedSnap.data().count / contactedSnap.data().count) * 100).toFixed(1)
            : 0,
      }
    } catch (error) {
      logger.error('Get WhatsApp stats failed:', error)
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Send text message via Evolution API
 */
async function sendWhatsAppMessage(phone, text) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API not configured')
  }

  const cleanPhone = phone.replace(/[^\d]/g, '')

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`,
      {
        number: cleanPhone,
        text: text,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    return response.data
  } catch (error) {
    logger.error('Evolution API error:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Send media message via Evolution API (image, document, audio)
 */
async function sendWhatsAppMedia(phone, mediaType, mediaUrl, caption = '') {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API not configured')
  }

  const cleanPhone = phone.replace(/[^\d]/g, '')

  const endpointMap = {
    image: 'sendMedia',
    document: 'sendMedia',
    audio: 'sendWhatsAppAudio',
    video: 'sendMedia',
  }

  const endpoint = endpointMap[mediaType] || 'sendMedia'

  const body = {
    number: cleanPhone,
    mediatype: mediaType,
    media: mediaUrl,
  }

  if (caption && mediaType !== 'audio') {
    body.caption = caption
  }

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/${endpoint}/${EVOLUTION_INSTANCE_NAME}`,
      body,
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    )

    return response.data
  } catch (error) {
    logger.error('Evolution API media error:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Check Evolution API instance health
 */
async function checkInstanceHealth() {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE_NAME}`,
      {
        headers: { apikey: EVOLUTION_API_KEY },
        timeout: 10000,
      }
    )
    const state = response.data?.instance?.state || response.data?.state
    return {
      connected: state === 'open',
      state,
      instance: EVOLUTION_INSTANCE_NAME,
    }
  } catch (error) {
    return {
      connected: false,
      state: 'error',
      error: error.message,
      instance: EVOLUTION_INSTANCE_NAME,
    }
  }
}

/**
 * Personalize message with prospect data
 */
function personalizeMessage(template, prospect) {
  const firstName =
    prospect.fullName?.split(' ')[0] || prospect.full_name?.split(' ')[0] || prospect.username || ''
  const fullName = prospect.fullName || prospect.full_name || prospect.username || ''
  const platform = prospect.platform || prospect.source || 'Instagram'
  const username = prospect.username || ''
  const company = prospect.company || ''
  const industry = prospect.industry || ''

  return template
    .replace(/{firstName}/g, firstName)
    .replace(/{fullName}/g, fullName)
    .replace(/{platform}/g, platform)
    .replace(/{username}/g, username)
    .replace(/{company}/g, company)
    .replace(/{industry}/g, industry)
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
