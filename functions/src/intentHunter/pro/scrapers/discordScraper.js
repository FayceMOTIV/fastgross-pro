/**
 * Discord Scraper — Intent Hunter Pro
 *
 * Searches messages in B2B-related Discord servers using the Discord Bot API.
 * Targets French entrepreneur, SaaS, and marketing communities.
 *
 * Auth: DISCORD_BOT_TOKEN
 * Rate limit: 30 req/min (Discord global rate limit is 50/s but per-route is lower)
 * API: Discord API v10 — /channels/{id}/messages
 *
 * Note: Bot must be invited to target servers with MESSAGE_CONTENT intent enabled.
 * The bot can only search channels it has access to.
 *
 * @module intentHunter/pro/scrapers/discordScraper
 */

import axios from 'axios'

const DISCORD_API_URL = 'https://discord.com/api/v10'
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
 * Get list of guilds the bot is in
 * @param {string} token - Discord bot token
 * @returns {Promise<Array>} Guilds
 */
const getGuilds = async (token) => {
  const response = await axios.get(`${DISCORD_API_URL}/users/@me/guilds`, {
    headers: { Authorization: `Bot ${token}` },
    timeout: 10000
  })
  return response.data || []
}

/**
 * Get text channels in a guild
 * @param {string} token - Discord bot token
 * @param {string} guildId - Guild ID
 * @returns {Promise<Array>} Text channels (type 0)
 */
const getTextChannels = async (token, guildId) => {
  const response = await axios.get(`${DISCORD_API_URL}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
    timeout: 10000
  })
  // Type 0 = text channel
  return (response.data || []).filter((ch) => ch.type === 0)
}

/**
 * Fetch recent messages from a channel
 * @param {string} token - Discord bot token
 * @param {string} channelId - Channel ID
 * @param {number} limit - Max messages to fetch (1-100)
 * @returns {Promise<Array>} Messages
 */
const getChannelMessages = async (token, channelId, limit = 100) => {
  const response = await axios.get(`${DISCORD_API_URL}/channels/${channelId}/messages`, {
    params: { limit: Math.min(limit, 100) },
    headers: { Authorization: `Bot ${token}` },
    timeout: 10000
  })
  return response.data || []
}

/**
 * Detect intent signals in message text
 * @param {string} text - Message content
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, budget: boolean, signal: string }}
 */
const analyzeIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const urgencyPatterns = [
    'urgent', 'rapidement', 'asap', 'des que possible',
    'tout de suite', 'immediatement', 'besoin', 'cherche',
    'quelqu\'un connait', 'recommandation', 'help'
  ]
  const budgetPatterns = [
    'budget', 'euros', 'tarif', 'devis', 'prix',
    'combien', 'cout', 'payer', 'facturer', 'prestation'
  ]

  const urgency = urgencyPatterns.some((p) => lower.includes(p))
  const budget = budgetPatterns.some((p) => lower.includes(p))

  const signal = matched.length > 0
    ? `Message Discord B2B — mots-cles: ${matched.join(', ')}${urgency ? ' [URGENT]' : ''}${budget ? ' [BUDGET]' : ''}`
    : ''

  return { matchCount: matched.length, urgency, budget, signal }
}

/**
 * Filter messages from the last N days
 * @param {Array} messages - Discord messages
 * @param {number} daysBack - Number of days to look back
 * @returns {Array} Filtered messages
 */
const filterRecent = (messages, daysBack) => {
  const cutoff = Date.now() - daysBack * 24 * 3600 * 1000
  return messages.filter((msg) => {
    const ts = new Date(msg.timestamp).getTime()
    return ts >= cutoff
  })
}

/**
 * Scrape Discord servers for B2B intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {number} [config.daysBack=7] - Number of days to look back
 * @param {Array<string>} [config.guildIds] - Specific guild IDs to scan (if empty, scan all)
 * @param {number} [config.maxChannelsPerGuild=10] - Max channels to scan per guild
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    daysBack = 7,
    guildIds = [],
    maxChannelsPerGuild = 10
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'discord_scraper_start',
    clientId,
    keywords,
    maxResults,
    daysBack,
    guildIds: guildIds.length > 0 ? guildIds : 'all',
    timestamp: Date.now()
  }))

  const botToken = process.env.DISCORD_BOT_TOKEN || ''

  if (!botToken) {
    console.log(JSON.stringify({
      event: 'discord_scraper_skip',
      reason: 'Missing DISCORD_BOT_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    let guilds = []

    if (guildIds.length > 0) {
      guilds = guildIds.map((id) => ({ id }))
    } else {
      guilds = await getGuilds(botToken)
      await sleepWithJitter(RATE_LIMIT_MS)
    }

    for (const guild of guilds) {
      if (leads.length >= maxResults) break

      try {
        const channels = await getTextChannels(botToken, guild.id)
        const channelsToScan = channels.slice(0, maxChannelsPerGuild)

        await sleepWithJitter(RATE_LIMIT_MS)

        for (const channel of channelsToScan) {
          if (leads.length >= maxResults) break

          try {
            const messages = await getChannelMessages(botToken, channel.id, 100)
            const recentMessages = filterRecent(messages, daysBack)

            for (const msg of recentMessages) {
              if (leads.length >= maxResults) break
              if (msg.author?.bot) continue

              const intent = analyzeIntent(msg.content, keywords)
              if (intent.matchCount === 0) continue

              const author = msg.author || {}

              leads.push({
                source: 'discord',
                sourceUrl: `https://discord.com/channels/${guild.id}/${channel.id}/${msg.id}`,
                sourcePublicStatement: (msg.content || '').slice(0, 500),
                platform: 'discord',
                firstName: author.global_name?.split(' ')[0] || author.username || null,
                lastName: author.global_name?.split(' ').slice(1).join(' ') || null,
                email: null,
                phone: null,
                company: null,
                linkedinUrl: null,
                nativeContactId: author.id || null,
                intentSignal: intent.signal,
                intentKeywordsCount: intent.matchCount,
                urgencyDetected: intent.urgency,
                budgetMentioned: intent.budget,
                postedAt: msg.timestamp
                  ? new Date(msg.timestamp).getTime()
                  : Date.now(),
                rawData: {
                  messageId: msg.id,
                  channelId: channel.id,
                  channelName: channel.name || null,
                  guildId: guild.id,
                  guildName: guild.name || null,
                  authorUsername: author.username || null,
                  authorDiscriminator: author.discriminator || null,
                  authorGlobalName: author.global_name || null,
                  attachmentCount: msg.attachments?.length || 0,
                  mentionCount: msg.mentions?.length || 0
                }
              })
            }

            await sleepWithJitter(RATE_LIMIT_MS)
          } catch (channelError) {
            console.log(JSON.stringify({
              event: 'discord_scraper_channel_error',
              channelId: channel.id,
              channelName: channel.name || null,
              error: channelError.message,
              timestamp: Date.now()
            }))
          }
        }
      } catch (guildError) {
        console.log(JSON.stringify({
          event: 'discord_scraper_guild_error',
          guildId: guild.id,
          error: guildError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'discord_scraper_complete',
      clientId,
      leadsFound: leads.length,
      guildsScanned: guilds.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'discord_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
