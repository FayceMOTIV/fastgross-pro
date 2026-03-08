/**
 * Retargeting Sync - Synchronisation prospects vers Meta + Google Custom Audiences
 *
 * Business Plan only. Le prospect voit les pubs du client en parallele des messages Alex.
 *
 * RGPD: Hash SHA-256 de l'email et du telephone avant envoi.
 *
 * Variables: META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID,
 *            GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
 *            GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

const getDb = () => getFirestore()

const META_GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v16'

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'retargetingSync', event, ...data, timestamp: new Date().toISOString() }))

/**
 * Hash une valeur en SHA-256 (normalise en lowercase, trim) pour conformite RGPD.
 * @param {string} value - Valeur a hasher
 * @returns {string|null} Hash SHA-256 hex ou null si valeur vide
 */
function hashForAudience(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Normalise un numero de telephone pour le hashing (+33612345678 -> 33612345678)
 * @param {string} phone - Numero de telephone
 * @returns {string|null} Hash SHA-256 du numero normalise
 */
function hashPhone(phone) {
  if (!phone) return null
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '')
  return hashForAudience(cleaned)
}

/**
 * Ajoute un prospect aux audiences de retargeting Meta + Google.
 * Hash les donnees personnelles (SHA-256) avant envoi (RGPD).
 *
 * @param {Object} lead - Le lead (id, email, phone, name, orgId)
 * @param {Object} clientConfig - Config organisation (metaAudienceId, googleAudienceResourceName, orgId)
 * @returns {Promise<{success: boolean, meta?: {added: boolean}, google?: {added: boolean}, error?: string}>}
 */
export async function addToRetargetingAudiences(lead, clientConfig) {
  const orgId = lead?.orgId || clientConfig?.orgId

  if (!orgId || (!lead?.email && !lead?.phone)) {
    log('error', { error: 'Missing orgId or lead contact info' })
    return { success: false, error: 'missing_params' }
  }

  const hashedEmail = hashForAudience(lead.email)
  const hashedPhone = hashPhone(lead.phone)
  const hashedFirstName = hashForAudience(lead.name?.split(' ')[0])
  const hashedLastName = hashForAudience(lead.name?.split(' ').slice(1).join(' '))

  const results = { success: true, meta: { added: false }, google: { added: false } }

  // Meta Custom Audience
  const metaResult = await syncToMetaAudience(
    { hashedEmail, hashedPhone, hashedFirstName, hashedLastName },
    clientConfig,
    'add'
  )
  results.meta = metaResult

  // Google Customer Match
  const googleResult = await syncToGoogleAudience(
    { hashedEmail, hashedPhone },
    clientConfig,
    'add'
  )
  results.google = googleResult

  // Enregistrer le statut retargeting dans Firestore
  try {
    const db = getDb()
    await db.doc(`organizations/${orgId}/prospects/${lead.id}`).update({
      retargeting: {
        active: true,
        metaSynced: metaResult.added,
        googleSynced: googleResult.added,
        syncedAt: FieldValue.serverTimestamp()
      }
    })
  } catch (error) {
    log('firestore_update_error', { leadId: lead.id, error: error.message })
  }

  log('added_to_audiences', {
    leadId: lead.id,
    meta: metaResult.added,
    google: googleResult.added
  })

  return results
}

/**
 * Retire un prospect des audiences de retargeting (sur reponse positive ou desinscription).
 *
 * @param {Object} lead - Le lead (id, email, phone, orgId)
 * @param {Object} clientConfig - Config organisation
 * @param {string} reason - Raison du retrait ('positive_reply' | 'unsubscribe' | 'converted' | 'manual')
 * @returns {Promise<{success: boolean, meta?: {removed: boolean}, google?: {removed: boolean}, error?: string}>}
 */
export async function removeFromRetargetingAudiences(lead, clientConfig, reason) {
  const orgId = lead?.orgId || clientConfig?.orgId

  if (!orgId || (!lead?.email && !lead?.phone)) {
    log('error', { error: 'Missing orgId or lead contact info' })
    return { success: false, error: 'missing_params' }
  }

  const hashedEmail = hashForAudience(lead.email)
  const hashedPhone = hashPhone(lead.phone)
  const hashedFirstName = hashForAudience(lead.name?.split(' ')[0])
  const hashedLastName = hashForAudience(lead.name?.split(' ').slice(1).join(' '))

  const results = { success: true, meta: { removed: false }, google: { removed: false } }

  const metaResult = await syncToMetaAudience(
    { hashedEmail, hashedPhone, hashedFirstName, hashedLastName },
    clientConfig,
    'remove'
  )
  results.meta = metaResult

  const googleResult = await syncToGoogleAudience(
    { hashedEmail, hashedPhone },
    clientConfig,
    'remove'
  )
  results.google = googleResult

  try {
    const db = getDb()
    await db.doc(`organizations/${orgId}/prospects/${lead.id}`).update({
      retargeting: {
        active: false,
        removedAt: FieldValue.serverTimestamp(),
        removeReason: reason
      }
    })
  } catch (error) {
    log('firestore_update_error', { leadId: lead.id, error: error.message })
  }

  log('removed_from_audiences', {
    leadId: lead.id,
    reason,
    meta: metaResult.removed,
    google: googleResult.removed
  })

  return results
}

/**
 * Synchronise un utilisateur vers Meta Custom Audience
 * @param {Object} hashedData - Donnees hashees
 * @param {Object} clientConfig - Config client
 * @param {'add'|'remove'} action - Action a effectuer
 * @returns {Promise<{added?: boolean, removed?: boolean, error?: string}>}
 */
async function syncToMetaAudience(hashedData, clientConfig, action) {
  const token = process.env.META_SYSTEM_USER_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID || clientConfig?.metaAdAccountId
  const audienceId = clientConfig?.metaAudienceId

  if (!token || !audienceId) {
    return { [action === 'add' ? 'added' : 'removed']: false, error: 'meta_not_configured' }
  }

  const userData = []
  if (hashedData.hashedEmail) userData.push(hashedData.hashedEmail)
  if (hashedData.hashedPhone) userData.push(hashedData.hashedPhone)

  if (userData.length === 0) {
    return { [action === 'add' ? 'added' : 'removed']: false, error: 'no_data_to_sync' }
  }

  const schema = []
  const data = []
  if (hashedData.hashedEmail) { schema.push('EMAIL_SHA256'); data.push(hashedData.hashedEmail) }
  if (hashedData.hashedPhone) { schema.push('PHONE_SHA256'); data.push(hashedData.hashedPhone) }
  if (hashedData.hashedFirstName) { schema.push('FN_SHA256'); data.push(hashedData.hashedFirstName) }
  if (hashedData.hashedLastName) { schema.push('LN_SHA256'); data.push(hashedData.hashedLastName) }

  const endpoint = action === 'add' ? 'users' : 'users'
  const method = action === 'add' ? 'POST' : 'DELETE'

  try {
    const response = await fetch(`${META_GRAPH_BASE}/${audienceId}/${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        payload: {
          schema,
          data: [data]
        }
      })
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      log('meta_sync_error', { error: result.error?.message, action })
      return { [action === 'add' ? 'added' : 'removed']: false, error: result.error?.message }
    }

    return { [action === 'add' ? 'added' : 'removed']: true }
  } catch (error) {
    log('meta_fetch_error', { error: error.message, action })
    return { [action === 'add' ? 'added' : 'removed']: false, error: error.message }
  }
}

/**
 * Synchronise un utilisateur vers Google Ads Customer Match
 * @param {Object} hashedData - Donnees hashees
 * @param {Object} clientConfig - Config client
 * @param {'add'|'remove'} action - Action a effectuer
 * @returns {Promise<{added?: boolean, removed?: boolean, error?: string}>}
 */
async function syncToGoogleAudience(hashedData, clientConfig, action) {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || clientConfig?.googleAdsCustomerId
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const audienceResource = clientConfig?.googleAudienceResourceName

  if (!devToken || !customerId || !audienceResource || !refreshToken) {
    return { [action === 'add' ? 'added' : 'removed']: false, error: 'google_not_configured' }
  }

  try {
    // Obtenir access token via refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      return { [action === 'add' ? 'added' : 'removed']: false, error: 'google_auth_failed' }
    }

    const userIdentifiers = []
    if (hashedData.hashedEmail) userIdentifiers.push({ hashedEmail: hashedData.hashedEmail })
    if (hashedData.hashedPhone) userIdentifiers.push({ hashedPhoneNumber: hashedData.hashedPhone })

    if (userIdentifiers.length === 0) {
      return { [action === 'add' ? 'added' : 'removed']: false, error: 'no_data_to_sync' }
    }

    const operation = action === 'add' ? 'addOperations' : 'removeOperations'

    const response = await fetch(
      `${GOOGLE_ADS_BASE}/customers/${customerId}/offlineUserDataJobs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
          'developer-token': devToken
        },
        body: JSON.stringify({
          job: {
            type: 'CUSTOMER_MATCH_USER_LIST',
            customerMatchUserListMetadata: {
              userList: audienceResource
            }
          },
          [operation]: userIdentifiers.map(id => ({
            userIdentifiers: [id]
          }))
        })
      }
    )

    const result = await response.json()

    if (!response.ok || result.error) {
      log('google_sync_error', { error: result.error?.message, action })
      return { [action === 'add' ? 'added' : 'removed']: false, error: result.error?.message }
    }

    return { [action === 'add' ? 'added' : 'removed']: true }
  } catch (error) {
    log('google_fetch_error', { error: error.message, action })
    return { [action === 'add' ? 'added' : 'removed']: false, error: error.message }
  }
}
