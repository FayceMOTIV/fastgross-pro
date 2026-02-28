/**
 * sendTelegramAlert — Envoie une alerte Markdown au bot Telegram si score > 80
 * Utilise les variables d'environnement TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID
 */

import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const TELEGRAM_API = 'https://api.telegram.org'

/**
 * Envoie une alerte Telegram formatee en Markdown
 * @param {object} params
 * @param {string} params.prospectName - Nom du prospect
 * @param {number} params.score - Score 0-100
 * @param {string} params.channel - Canal source (whatsapp, email, instagram, linkedin)
 * @param {string} params.message - Dernier message du prospect
 * @param {string} params.orgName - Nom de l'organisation
 * @param {string} [params.phone] - Telephone du prospect
 * @param {string} [params.email] - Email du prospect
 * @param {string} [params.company] - Entreprise du prospect
 */
export async function sendTelegramAlert(params) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    logger.warn('Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing')
    return { success: false, reason: 'not_configured' }
  }

  const {
    prospectName,
    score,
    channel,
    message,
    orgName,
    phone,
    email,
    company,
  } = params

  const emoji = score >= 90 ? '🔥🔥🔥' : score >= 80 ? '🔥' : '📊'
  const channelEmoji = {
    whatsapp: '📱',
    email: '📧',
    instagram: '📸',
    linkedin: '💼',
  }[channel] || '📨'

  const text = [
    `${emoji} *LEAD HOT — Score ${score}/100*`,
    '',
    `${channelEmoji} Canal: *${channel}*`,
    `👤 Prospect: *${escapeMarkdown(prospectName)}*`,
    company ? `🏢 Entreprise: ${escapeMarkdown(company)}` : null,
    phone ? `📞 Tel: \`${phone}\`` : null,
    email ? `📧 Email: ${escapeMarkdown(email)}` : null,
    orgName ? `🏷 Client: ${escapeMarkdown(orgName)}` : null,
    '',
    `💬 Message:`,
    `_${escapeMarkdown(truncate(message, 500))}_`,
    '',
    `⏰ ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const response = await axios.post(
      `${TELEGRAM_API}/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    )

    logger.info(`Telegram alert sent for ${prospectName} (score: ${score})`)
    return { success: true, messageId: response.data?.result?.message_id }
  } catch (error) {
    logger.error('Telegram alert failed:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

function escapeMarkdown(text) {
  if (!text) return ''
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

function truncate(text, maxLen) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
