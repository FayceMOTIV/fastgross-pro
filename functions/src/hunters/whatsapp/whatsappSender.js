/**
 * WhatsApp Sender
 * Send personalized WhatsApp messages to verified prospects via Evolution API
 * Runs hourly with safe rate limits
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import axios from 'axios'

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

    // Check sleep hours
    const currentHour = new Date().getHours()
    if (currentHour >= LIMITS.SLEEP_HOURS_START || currentHour < LIMITS.SLEEP_HOURS_END) {
      logger.info(`Sleep hours (${LIMITS.SLEEP_HOURS_START}h-${LIMITS.SLEEP_HOURS_END}h), skipping`)
      return { skipped: true, reason: 'sleep_hours' }
    }

    // Check weekend
    if (LIMITS.NO_WEEKEND) {
      const dayOfWeek = new Date().getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        logger.info('Weekend, skipping')
        return { skipped: true, reason: 'weekend' }
      }
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

      // Check limits
      if (dailyStats.messagesSentToday >= LIMITS.MAX_MESSAGES_PER_DAY) {
        logger.info('Daily limit reached')
        return { skipped: true, reason: 'daily_limit' }
      }

      if (dailyStats.messagesSentThisHour >= LIMITS.MAX_MESSAGES_PER_HOUR) {
        logger.info('Hourly limit reached')
        return { skipped: true, reason: 'hourly_limit' }
      }

      // Calculate how many messages we can send
      const remainingHourly = LIMITS.MAX_MESSAGES_PER_HOUR - dailyStats.messagesSentThisHour
      const remainingDaily = LIMITS.MAX_MESSAGES_PER_DAY - dailyStats.messagesSentToday
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

          // Random delay
          const delay = randomBetween(
            LIMITS.MIN_DELAY_SECONDS * 1000,
            LIMITS.MAX_DELAY_SECONDS * 1000
          )
          await sleep(delay)
        } catch (error) {
          logger.error(`Error sending to ${prospect.phone}:`, error.message)
          stats.errors++

          await prospectDoc.ref.update({
            whatsappStatus: 'error',
            whatsappError: error.message,
          })
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
 * Send single WhatsApp message (callable)
 */
export const sendWhatsAppManual = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (request) => {
    const { phone, message, orgId, prospectId } = request.data
    const db = getDb()

    if (!phone || !message) {
      throw new Error('Phone and message required')
    }

    try {
      await sendWhatsAppMessage(phone, message)

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
            whatsappMessageSent: message,
          })
      }

      return {
        success: true,
        phone,
        sentAt: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('Manual WhatsApp send failed:', error)
      throw error
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
      throw error
    }
  }
)

/**
 * Send message via Evolution API
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
    throw new Error('Failed to send WhatsApp message')
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
