/**
 * WhatsApp Checker
 * Check if phone numbers have active WhatsApp accounts via Evolution API
 * Runs daily at 2 AM to check unverified prospects
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()

// Evolution API config (self-hosted, free)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

// Limits
const BATCH_SIZE = 100
const DELAY_BETWEEN_CHECKS_MS = 2000

/**
 * WhatsApp Checker - Scheduled daily at 2 AM
 */
export const whatsappChecker = onSchedule(
  {
    schedule: '0 2 * * *', // 2 AM daily
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb()
    logger.info('Starting WhatsApp checker...')

    const stats = {
      checked: 0,
      active: 0,
      inactive: 0,
      errors: 0,
    }

    try {
      // Get prospects with phone numbers that haven't been checked
      const prospectsSnapshot = await db
        .collectionGroup('prospects')
        .where('phone', '!=', null)
        .where('whatsappChecked', '==', false)
        .limit(BATCH_SIZE)
        .get()

      if (prospectsSnapshot.empty) {
        // Also check prospects where whatsappChecked doesn't exist
        const uncheckedSnapshot = await db
          .collectionGroup('prospects')
          .where('phone', '!=', null)
          .limit(BATCH_SIZE)
          .get()

        const unchecked = uncheckedSnapshot.docs.filter(
          (doc) => doc.data().whatsappChecked === undefined
        )

        if (unchecked.length === 0) {
          logger.info('No prospects to check')
          return { stats }
        }

        // Process unchecked prospects
        for (const prospectDoc of unchecked) {
          await processProspect(prospectDoc, stats, db)
        }
      } else {
        logger.info(`Found ${prospectsSnapshot.size} prospects to check`)

        for (const prospectDoc of prospectsSnapshot.docs) {
          await processProspect(prospectDoc, stats, db)
        }
      }

      logger.info('WhatsApp checker completed', stats)
      return { stats }
    } catch (error) {
      logger.error('WhatsApp checker failed:', error)
      throw error
    }
  }
)

/**
 * Process a single prospect
 */
async function processProspect(prospectDoc, stats, db) {
  const prospect = prospectDoc.data()
  const phone = prospect.phone

  if (!phone) return

  try {
    const isActive = await checkWhatsAppNumber(phone)
    stats.checked++

    if (isActive) {
      stats.active++
    } else {
      stats.inactive++
    }

    await prospectDoc.ref.update({
      whatsappChecked: true,
      whatsappActive: isActive,
      whatsappStatus: isActive ? 'verified' : 'no_whatsapp',
      whatsappCheckedAt: FieldValue.serverTimestamp(),
    })

    logger.info(`Phone ${phone}: ${isActive ? 'Active' : 'Not active'}`)

    // Delay to avoid rate limiting
    await sleep(DELAY_BETWEEN_CHECKS_MS)
  } catch (error) {
    logger.error(`Error checking ${phone}:`, error.message)
    stats.errors++

    await prospectDoc.ref.update({
      whatsappChecked: true,
      whatsappActive: false,
      whatsappStatus: 'error',
      whatsappCheckError: error.message,
      whatsappCheckedAt: FieldValue.serverTimestamp(),
    })
  }
}

/**
 * Check if a phone number has WhatsApp via Evolution API
 */
async function checkWhatsAppNumber(phone) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    logger.warn('Evolution API not configured')
    return false
  }

  try {
    // Clean phone number (remove + and spaces), add WhatsApp suffix
    const cleanPhone = phone.replace(/[^\d]/g, '')

    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/checkIsWhatsApp/${EVOLUTION_INSTANCE_NAME}`,
      {
        numbers: [`${cleanPhone}@s.whatsapp.net`]
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      }
    )

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].exists === true
    }

    return false
  } catch (error) {
    // If Evolution API is not available, log and return false
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      logger.warn('Evolution API not reachable - skipping WhatsApp check')
      return false
    }
    throw error
  }
}

/**
 * Manual WhatsApp check trigger
 */
export const checkWhatsAppManual = async (data, context) => {
  const db = getDb()
  const { orgId, prospectId, phone } = data

  if (!phone) {
    throw new Error('Phone number required')
  }

  try {
    const isActive = await checkWhatsAppNumber(phone)

    // Update prospect if provided
    if (orgId && prospectId) {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)
        .update({
          whatsappChecked: true,
          whatsappActive: isActive,
          whatsappStatus: isActive ? 'verified' : 'no_whatsapp',
          whatsappCheckedAt: FieldValue.serverTimestamp(),
        })
    }

    return {
      phone,
      whatsappActive: isActive,
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('Manual WhatsApp check failed:', error)
    throw error
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
