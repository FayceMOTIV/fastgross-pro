/**
 * notificationSender — Envoi multi-canal (WhatsApp + Telegram) de notifications riches
 * Utilise par transferLeadToClient, scoreAndReply, rescueScheduler
 */

import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'
import {
  hotLeadTemplate,
  meetingBookedTemplate,
  rescueAlertTemplate,
  dailyReportTemplate,
  NOTIFICATION_TYPES,
} from './notificationTemplates.js'

const getDb = () => getFirestore()

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

async function getInstanceName(orgId) {
  if (orgId) {
    try {
      const configSnap = await getDb()
        .collection('organizations').doc(orgId)
        .collection('integrations').doc('whatsapp')
        .get()
      if (configSnap.exists) {
        const data = configSnap.data()
        if (data?.instanceName && data?.status === 'connected') {
          return data.instanceName
        }
      }
    } catch { /* fallback */ }
  }
  return process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3'
}

/**
 * Envoie une notification riche via WhatsApp
 */
async function sendWhatsAppNotification(phone, text, orgId) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !phone) {
    return { success: false, error: 'whatsapp_not_configured' }
  }

  const cleanPhone = phone.replace(/[^\d]/g, '')
  const instanceName = await getInstanceName(orgId)

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      { number: cleanPhone, text },
      {
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    )
    return {
      success: true,
      messageId: response.data?.key?.id || response.data?.messageId,
      provider: 'whatsapp',
    }
  } catch (error) {
    logger.error('WhatsApp notification failed:', error.response?.data || error.message)
    return { success: false, error: error.message, provider: 'whatsapp' }
  }
}

/**
 * Envoie une notification via Telegram
 */
async function sendTelegramNotification(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    return { success: false, error: 'telegram_not_configured' }
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      },
      { timeout: 15000 }
    )
    return {
      success: true,
      messageId: response.data?.result?.message_id,
      provider: 'telegram',
    }
  } catch (error) {
    logger.error('Telegram notification failed:', error.response?.data || error.message)
    return { success: false, error: error.message, provider: 'telegram' }
  }
}

/**
 * Genere le contenu de notification selon le type
 */
function buildNotificationContent(type, data) {
  switch (type) {
    case NOTIFICATION_TYPES.HOT_LEAD:
      return hotLeadTemplate(data)
    case NOTIFICATION_TYPES.MEETING_BOOKED:
      return meetingBookedTemplate(data)
    case NOTIFICATION_TYPES.RESCUE_ALERT:
      return rescueAlertTemplate(data)
    case NOTIFICATION_TYPES.DAILY_REPORT:
      return dailyReportTemplate(data)
    default:
      return `Notification: ${JSON.stringify(data).slice(0, 500)}`
  }
}

/**
 * Envoie une notification riche multi-canal
 * @param {object} params
 * @param {string} params.orgId - ID organisation
 * @param {string} params.type - Type notification (hot_lead, meeting_booked, rescue_alert, daily_report)
 * @param {object} params.data - Donnees pour le template
 * @param {string} [params.phone] - Telephone WhatsApp du destinataire
 * @param {string} [params.telegramChatId] - Chat ID Telegram
 */
export async function sendNotification({ orgId, type, data, phone, telegramChatId }) {
  const content = buildNotificationContent(type, data)
  const results = []

  // Charger config org pour trouver les destinataires
  let orgData = {}
  if (orgId) {
    try {
      const orgSnap = await getDb().collection('organizations').doc(orgId).get()
      if (orgSnap.exists) orgData = orgSnap.data()
    } catch (err) {
      logger.warn('Could not load org for notification:', err.message)
    }
  }

  const targetPhone = phone || orgData.ownerPhone || orgData.contactPhone
  const targetTelegram = telegramChatId || orgData.telegramChatId

  // Envoi WhatsApp
  if (targetPhone) {
    const waResult = await sendWhatsAppNotification(targetPhone, content, orgId)
    results.push(waResult)
  }

  // Envoi Telegram
  if (targetTelegram) {
    const tgResult = await sendTelegramNotification(targetTelegram, content)
    results.push(tgResult)
  }

  // Logger en Firestore
  if (orgId) {
    try {
      await getDb()
        .collection('organizations').doc(orgId)
        .collection('notifications').add({
          type,
          content: content.slice(0, 2000),
          channels: results.map((r) => r.provider).filter(Boolean),
          delivered: results.some((r) => r.success),
          recipientPhone: targetPhone || null,
          recipientTelegram: targetTelegram || null,
          createdAt: FieldValue.serverTimestamp(),
        })
    } catch (err) {
      logger.warn('Failed to log notification:', err.message)
    }
  }

  const delivered = results.some((r) => r.success)
  logger.info(`Notification [${type}] for org ${orgId}: delivered=${delivered}`)

  return { success: delivered, results }
}
