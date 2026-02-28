/**
 * Channel Health Check — Orchestrator Helper
 *
 * Verification sante de chaque canal (API ping, config, limites),
 * listing des canaux sains et prets a envoyer.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const getDb = () => getFirestore()

// Timeouts pour les health checks
const HEALTH_CHECK_TIMEOUT = 8000

/**
 * Verifier la sante de tous les canaux d'une org
 * @returns {{ [channel]: { healthy: boolean, reason: string, latency: number } }}
 */
export async function checkAllChannelsHealth(orgId) {
  const orgSnap = await getDb().collection('organizations').doc(orgId).get()
  const org = orgSnap.exists ? orgSnap.data() : {}
  const channels = org.channels || {}

  const results = {}
  const checks = []

  for (const [channel, config] of Object.entries(channels)) {
    if (!config.enabled) {
      results[channel] = { healthy: false, reason: 'disabled', latency: 0 }
      continue
    }
    checks.push(
      checkChannelHealth(channel, org).then((result) => {
        results[channel] = result
      })
    )
  }

  await Promise.allSettled(checks)
  return results
}

/**
 * Verifier la sante d'un canal specifique
 * @param {string} channel
 * @param {Object} orgConfig - Config organisation
 * @returns {{ healthy: boolean, reason: string|null, latency: number }}
 */
export async function checkChannelHealth(channel, orgConfig) {
  const start = Date.now()

  try {
    switch (channel) {
      case 'email':
        return await checkEmailHealth(orgConfig)

      case 'sms':
        return await checkSMSHealth(orgConfig)

      case 'whatsapp':
        return await checkWhatsAppHealth(orgConfig)

      case 'instagram':
        return checkInstagramHealth(orgConfig)

      case 'linkedin':
        return await checkLinkedInHealth(orgConfig)

      case 'voicemail':
        return checkVoicemailHealth(orgConfig)

      case 'postal':
        return checkPostalHealth(orgConfig)

      case 'twitter':
        return { healthy: false, reason: 'not_implemented', latency: 0 }

      default:
        return { healthy: false, reason: 'unknown_channel', latency: 0 }
    }
  } catch (error) {
    return { healthy: false, reason: error.message, latency: Date.now() - start }
  }
}

/**
 * Obtenir la liste des canaux sains, actifs et dans les limites d'envoi
 * @returns {string[]} Liste de noms de canaux
 */
export async function getHealthySendableChannels(orgId) {
  try {
    const healthResults = await checkAllChannelsHealth(orgId)
    const healthy = []

    for (const [channel, result] of Object.entries(healthResults)) {
      if (result.healthy) {
        healthy.push(channel)
      }
    }

    return healthy
  } catch (error) {
    logger.error('getHealthySendableChannels error:', error)
    return []
  }
}

// ============================================
// HEALTH CHECKS PAR CANAL
// ============================================

async function checkEmailHealth(orgConfig) {
  const start = Date.now()
  // Email est considere sain si SMTP est configure
  const smtpHost = process.env.SMTP_HOST || orgConfig.channels?.email?.smtpHost
  if (!smtpHost) {
    return { healthy: false, reason: 'smtp_not_configured', latency: 0 }
  }
  return { healthy: true, reason: null, latency: Date.now() - start }
}

async function checkSMSHealth(orgConfig) {
  const start = Date.now()
  const provider = orgConfig.channels?.sms?.provider || 'ovh'

  if (provider === 'ovh') {
    const appKey = process.env.OVH_APP_KEY
    if (!appKey) {
      return { healthy: false, reason: 'ovh_not_configured', latency: 0 }
    }
    return { healthy: true, reason: null, latency: Date.now() - start }
  }

  // Twilio
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  if (!twilioSid) {
    return { healthy: false, reason: 'twilio_not_configured', latency: 0 }
  }
  return { healthy: true, reason: null, latency: Date.now() - start }
}

async function checkWhatsAppHealth(orgConfig) {
  const start = Date.now()
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

  if (!apiUrl || !apiKey) {
    return { healthy: false, reason: 'evolution_not_configured', latency: 0 }
  }

  try {
    const response = await axios.get(
      `${apiUrl}/instance/connectionState/${instanceName}`,
      { headers: { apikey: apiKey }, timeout: HEALTH_CHECK_TIMEOUT }
    )
    const state = response.data?.instance?.state || response.data?.state
    const healthy = state === 'open'
    return {
      healthy,
      reason: healthy ? null : `instance_state_${state}`,
      latency: Date.now() - start,
    }
  } catch {
    return { healthy: false, reason: 'evolution_unreachable', latency: Date.now() - start }
  }
}

function checkInstagramHealth(orgConfig) {
  const igConfig = orgConfig.channels?.instagram || {}
  const hasToken = !!(process.env.INSTAGRAM_ACCESS_TOKEN || igConfig.accessToken)
  return {
    healthy: hasToken,
    reason: hasToken ? null : 'instagram_not_configured',
    latency: 0,
  }
}

async function checkLinkedInHealth(orgConfig) {
  const start = Date.now()
  const apiKey = process.env.HEYREACH_API_KEY || orgConfig.channels?.linkedin?.apiKey

  if (!apiKey) {
    return { healthy: false, reason: 'heyreach_not_configured', latency: 0 }
  }

  try {
    const response = await axios.get('https://api.heyreach.io/api/v1/campaign/List?offset=0&limit=1', {
      headers: { 'X-API-KEY': apiKey, Accept: 'application/json' },
      timeout: HEALTH_CHECK_TIMEOUT,
    })
    return {
      healthy: response.status === 200,
      reason: null,
      latency: Date.now() - start,
    }
  } catch {
    return { healthy: false, reason: 'heyreach_unreachable', latency: Date.now() - start }
  }
}

function checkVoicemailHealth(orgConfig) {
  const vmConfig = orgConfig.channels?.voicemail || {}
  const hasConfig = !!(process.env.DROPCOWBOY_API_KEY || vmConfig.apiKey)
  return {
    healthy: hasConfig,
    reason: hasConfig ? null : 'voicemail_not_configured',
    latency: 0,
  }
}

function checkPostalHealth(orgConfig) {
  const provider = orgConfig.channels?.postal?.provider || 'mercifacteur'
  let configured = false

  if (provider === 'mercifacteur') {
    configured = !!(process.env.MERCI_FACTEUR_API_KEY)
  } else {
    configured = !!(process.env.POSTGRID_API_KEY)
  }

  return {
    healthy: configured,
    reason: configured ? null : `${provider}_not_configured`,
    latency: 0,
  }
}
