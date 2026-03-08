/**
 * Telegram Scraper — Intent Hunter Pro
 *
 * Searches public Telegram group/channel messages for B2B intent signals.
 * Uses the Telegram Bot API to read messages from groups the bot is added to.
 *
 * Auth: TELEGRAM_BOT_TOKEN (from @BotFather)
 * Rate limit: 30 req/min (Telegram allows 30 msg/s but we stay conservative)
 * API: Telegram Bot API — getUpdates + forwardMessage approach
 *
 * Note: Bot must be added to target groups with read permissions.
 * For channels, the bot must be an admin.
 *
 * @module intentHunter/pro/scrapers/telegramScraper
 */

import axios from 'axios'

const RATE_LIMIT_MS = 2100 // ~28 req/min to stay safe under 30

/**
 * Sleep with jitter to avoid thundering herd
 * @param {number} baseMs - Base delay in ms
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Build Telegram API URL
 * @param {string} token - Bot token
 * @param {string} method - API method name
 * @returns {string}
 */
const apiUrl = (token, method) => `https://api.telegram.org/bot${token}/${method}`

/**
 * Get recent updates (messages) for the bot
 * @param {string} token - Bot token
 * @param {number} offset - Update offset for pagination
 * @param {number} limit - Max updates to fetch
 * @returns {Promise<Array>} Update objects
 */
const getUpdates = async (token, offset = 0, limit = 100) => {
  const response = await axios.get(apiUrl(token, 'getUpdates'), {
    params: {
      offset,
      limit: Math.min(limit, 100),
      timeout: 0,
      allowed_updates: JSON.stringify(['message', 'channel_post'])
    },
    timeout: 15000
  })

  if (!response.data?.ok) {
    throw new Error(`Telegram API error: ${response.data?.description || 'unknown'}`)
  }

  return response.data.result || []
}

/**
 * Get chat info
 * @param {string} token - Bot token
 * @param {string|number} chatId - Chat ID or @username
 * @returns {Promise<object|null>}
 */
const getChatInfo = async (token, chatId) => {
  try {
    const response = await axios.get(apiUrl(token, 'getChat'), {
      params: { chat_id: chatId },
      timeout: 10000
    })
    return response.data?.ok ? response.data.result : null
  } catch {
    return null
  }
}

/**
 * Detect intent signals in message text
 * @param {string} text - Message text
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'urgent', 'rapidement', 'asap', 'des que possible',
    'besoin', 'cherche', 'recommandez', 'qui connait',
    'quel service', 'quel outil', 'aide'
  ]
  const budgetPatterns = [
    'budget', 'euros', 'tarif', 'devis', 'prix',
    'combien', 'cout', 'facturer', 'prestation', 'offre'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Message Telegram B2B — mots-cles: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Extract user info from Telegram message sender
 * @param {object} from - Telegram User object
 * @returns {{ firstName: string|null, lastName: string|null, username: string|null }}
 */
const extractSender = (from) => {
  if (!from) return { firstName: null, lastName: null, username: null }
  return {
    firstName: from.first_name || null,
    lastName: from.last_name || null,
    username: from.username || null
  }
}

/**
 * Scrape Telegram groups/channels for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {number} [config.daysBack=7] - Number of days to look back
 * @param {Array<string>} [config.chatIds] - Specific chat IDs to monitor
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    daysBack = 7,
    chatIds = []
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'telegram_scraper_start',
    clientId,
    keywords,
    maxResults,
    daysBack,
    chatIds: chatIds.length > 0 ? chatIds : 'all_from_updates',
    timestamp: Date.now()
  }))

  const botToken = process.env.TELEGRAM_BOT_TOKEN || ''

  if (!botToken) {
    console.log(JSON.stringify({
      event: 'telegram_scraper_skip',
      reason: 'Missing TELEGRAM_BOT_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const cutoff = Date.now() - daysBack * 24 * 3600 * 1000
    const seenMessageIds = new Set()
    let offset = 0
    const chatInfoCache = new Map()

    // Collect target chat IDs if provided
    const targetChatIds = new Set(chatIds.map((id) => String(id)))

    for (let batch = 0; batch < 10 && leads.length < maxResults; batch++) {
      try {
        const updates = await getUpdates(botToken, offset, 100)

        if (updates.length === 0) break

        // Update offset for next batch
        offset = updates[updates.length - 1].update_id + 1

        for (const update of updates) {
          if (leads.length >= maxResults) break

          const msg = update.message || update.channel_post
          if (!msg) continue

          // Skip if not from a target chat (when chatIds are specified)
          const chatId = String(msg.chat?.id || '')
          if (targetChatIds.size > 0 && !targetChatIds.has(chatId)) continue

          // Skip non-group/channel messages
          const chatType = msg.chat?.type || ''
          if (!['group', 'supergroup', 'channel'].includes(chatType)) continue

          // Skip duplicates
          if (seenMessageIds.has(msg.message_id)) continue
          seenMessageIds.add(msg.message_id)

          // Skip old messages
          const messageTs = (msg.date || 0) * 1000
          if (messageTs < cutoff) continue

          const text = msg.text || msg.caption || ''
          const intent = analyzeIntent(text, keywords)
          if (intent.matchCount === 0) continue

          const sender = extractSender(msg.from)

          // Get chat info if not cached
          let chatTitle = msg.chat?.title || null
          if (!chatTitle && !chatInfoCache.has(chatId)) {
            const info = await getChatInfo(botToken, chatId)
            chatInfoCache.set(chatId, info)
            chatTitle = info?.title || null
            await sleepWithJitter(RATE_LIMIT_MS)
          } else if (chatInfoCache.has(chatId)) {
            chatTitle = chatInfoCache.get(chatId)?.title || chatTitle
          }

          leads.push({
            source: 'telegram',
            sourceUrl: msg.chat?.username
              ? `https://t.me/${msg.chat.username}/${msg.message_id}`
              : `https://t.me/c/${chatId.replace('-100', '')}/${msg.message_id}`,
            sourcePublicStatement: text.slice(0, 500),
            platform: 'telegram',
            firstName: sender.firstName,
            lastName: sender.lastName,
            email: null,
            phone: null,
            company: null,
            linkedinUrl: null,
            nativeContactId: sender.username
              ? `@${sender.username}`
              : msg.from?.id ? String(msg.from.id) : null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: intent.budget,
            postedAt: messageTs || Date.now(),
            rawData: {
              messageId: msg.message_id,
              chatId,
              chatTitle,
              chatType,
              chatUsername: msg.chat?.username || null,
              senderId: msg.from?.id || null,
              senderUsername: sender.username,
              hasAttachment: !!(msg.document || msg.photo || msg.video),
              replyToMessageId: msg.reply_to_message?.message_id || null
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (batchError) {
        console.log(JSON.stringify({
          event: 'telegram_scraper_batch_error',
          batch,
          offset,
          error: batchError.message,
          timestamp: Date.now()
        }))
        if (batchError.response?.status === 429) {
          const retryAfter = batchError.response?.data?.parameters?.retry_after || 30
          await sleepWithJitter(retryAfter * 1000)
        } else {
          break
        }
      }
    }

    console.log(JSON.stringify({
      event: 'telegram_scraper_complete',
      clientId,
      leadsFound: leads.length,
      messagesProcessed: seenMessageIds.size,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'telegram_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
