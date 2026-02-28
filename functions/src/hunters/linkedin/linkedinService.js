/**
 * LinkedIn Service — HeyReach API Client
 *
 * Wrapper autour de l'API HeyReach pour la gestion des campagnes LinkedIn
 * Base URL: https://api.heyreach.io/api/v1/
 * Auth: X-API-KEY header
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const getDb = () => getFirestore()

const HEYREACH_BASE_URL = 'https://api.heyreach.io/api/v1'
const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY || ''

// ============================================
// HTTP CLIENT
// ============================================
function getClient(apiKey = null) {
  const key = apiKey || HEYREACH_API_KEY
  if (!key) {
    throw new Error('HEYREACH_API_KEY not configured')
  }

  return axios.create({
    baseURL: HEYREACH_BASE_URL,
    headers: {
      'X-API-KEY': key,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })
}

// ============================================
// CAMPAIGNS
// ============================================

/**
 * Creer une campagne HeyReach
 */
export async function createCampaign(orgId, config = {}) {
  try {
    const client = getClient(config.apiKey)

    const payload = {
      name: config.name || `FMF-${orgId}-${Date.now()}`,
      accountIds: config.accountIds || [],
      settings: {
        dailyLimit: config.dailyLimit || 25,
        sendConnectionRequests: config.sendConnectionRequests !== false,
        sendMessages: config.sendMessages !== false,
        sendFollowUps: config.sendFollowUps || false,
      },
    }

    const response = await client.post('/campaigns', payload)
    const campaign = response.data

    // Sauvegarder dans Firestore
    const db = getDb()
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('outreachCampaigns')
      .doc(campaign.id || `hr-${Date.now()}`)
      .set({
        provider: 'heyreach',
        externalId: campaign.id,
        name: payload.name,
        status: 'created',
        config: payload.settings,
        createdAt: FieldValue.serverTimestamp(),
      })

    logger.info(`[linkedinService] Campaign created for org=${orgId}: ${campaign.id}`)
    return { success: true, campaignId: campaign.id, data: campaign }
  } catch (error) {
    logger.error('[linkedinService] createCampaign error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

/**
 * Ajouter des leads a une campagne
 */
export async function addLeadsToCampaign(campaignId, leads, config = {}) {
  try {
    const client = getClient(config.apiKey)

    const payload = {
      campaignId,
      leads: leads.map((lead) => ({
        linkedInUrl: lead.linkedinUrl || lead.profileUrl,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        companyName: lead.company || lead.companyName || '',
        email: lead.email || '',
      })),
    }

    const response = await client.post('/campaigns/add-leads', payload)

    logger.info(`[linkedinService] Added ${leads.length} leads to campaign ${campaignId}`)
    return { success: true, added: leads.length, data: response.data }
  } catch (error) {
    logger.error('[linkedinService] addLeadsToCampaign error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

/**
 * Obtenir les stats d'une campagne
 */
export async function getCampaignStats(campaignId, config = {}) {
  try {
    const client = getClient(config.apiKey)
    const response = await client.get(`/campaigns/${campaignId}/stats`)
    return { success: true, stats: response.data }
  } catch (error) {
    logger.error('[linkedinService] getCampaignStats error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

/**
 * Pause / Resume campagne
 */
export async function pauseCampaign(campaignId, config = {}) {
  try {
    const client = getClient(config.apiKey)
    await client.post(`/campaigns/${campaignId}/pause`)
    logger.info(`[linkedinService] Campaign ${campaignId} paused`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

export async function resumeCampaign(campaignId, config = {}) {
  try {
    const client = getClient(config.apiKey)
    await client.post(`/campaigns/${campaignId}/resume`)
    logger.info(`[linkedinService] Campaign ${campaignId} resumed`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

// ============================================
// MESSAGING
// ============================================

/**
 * Envoyer une demande de connexion
 */
export async function sendConnectionRequest(accountId, profileUrl, message, config = {}) {
  try {
    const client = getClient(config.apiKey)

    const payload = {
      accountId,
      profileUrl,
      message: message || '',
    }

    const response = await client.post('/messages/connection-request', payload)

    logger.info(`[linkedinService] Connection request sent to ${profileUrl}`)
    return { success: true, data: response.data }
  } catch (error) {
    logger.error('[linkedinService] sendConnectionRequest error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

/**
 * Envoyer un message direct
 */
export async function sendMessage(accountId, profileUrl, message, config = {}) {
  try {
    const client = getClient(config.apiKey)

    const payload = {
      accountId,
      profileUrl,
      message,
    }

    const response = await client.post('/messages/send', payload)

    logger.info(`[linkedinService] Message sent to ${profileUrl}`)
    return { success: true, data: response.data }
  } catch (error) {
    logger.error('[linkedinService] sendMessage error:', error.response?.data || error.message)
    return { success: false, error: error.response?.data?.message || error.message }
  }
}

// ============================================
// INBOX
// ============================================

/**
 * Recuperer les messages inbox
 */
export async function getInboxMessages(accountId, since = null, config = {}) {
  try {
    const client = getClient(config.apiKey)

    const params = { accountId }
    if (since) params.since = since

    const response = await client.get('/inbox/messages', { params })

    logger.info(`[linkedinService] Fetched ${response.data?.messages?.length || 0} inbox messages`)
    return { success: true, messages: response.data?.messages || [] }
  } catch (error) {
    logger.error('[linkedinService] getInboxMessages error:', error.response?.data || error.message)
    return { success: false, messages: [], error: error.response?.data?.message || error.message }
  }
}

// ============================================
// ACCOUNTS
// ============================================

/**
 * Lister les comptes LinkedIn connectes
 */
export async function getLinkedInAccounts(config = {}) {
  try {
    const client = getClient(config.apiKey)
    const response = await client.get('/accounts')
    return { success: true, accounts: response.data?.accounts || response.data || [] }
  } catch (error) {
    logger.error('[linkedinService] getLinkedInAccounts error:', error.response?.data || error.message)
    return { success: false, accounts: [], error: error.response?.data?.message || error.message }
  }
}

/**
 * Obtenir les stats d'un compte
 */
export async function getAccountStats(accountId, config = {}) {
  try {
    const client = getClient(config.apiKey)
    const response = await client.get(`/accounts/${accountId}/stats`)
    return { success: true, stats: response.data }
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message }
  }
}
