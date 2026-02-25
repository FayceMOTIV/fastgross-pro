/**
 * OVH Telecom SMS Provider
 * Best price for France/Europe: ~0.0045 EUR/SMS
 *
 * API: https://eu.api.ovh.com/
 * Features:
 * - REST API with signature auth
 * - Delivery reports
 * - Sender ID customization
 * - Unicode support
 * - Credit balance check
 *
 * Auth: Generate credentials at https://eu.api.ovh.com/createToken/
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js'
import { checkSMSCompliance, formatPhoneNumber, isWithinSendingHours } from './compliance.js'

const getDb = () => getFirestore()

// ============================================
// OVH API CONFIG
// ============================================
const OVH_API_BASE = 'https://eu.api.ovh.com/1.0'

function getOvhConfig(orgConfig = {}) {
  return {
    appKey: orgConfig.ovhAppKey || process.env.OVH_APP_KEY || '',
    appSecret: orgConfig.ovhAppSecret || process.env.OVH_APP_SECRET || '',
    consumerKey: orgConfig.ovhConsumerKey || process.env.OVH_CONSUMER_KEY || '',
    serviceName: orgConfig.ovhServiceName || process.env.OVH_SMS_SERVICE_NAME || '',
    sender: orgConfig.ovhSmsSender || process.env.OVH_SMS_SENDER || 'FaceMedia',
  }
}

// ============================================
// OVH API REQUEST SIGNING
// ============================================
async function ovhRequest(method, path, body, config) {
  const timestamp = Math.floor(Date.now() / 1000)

  const bodyStr = body ? JSON.stringify(body) : ''
  const url = `${OVH_API_BASE}${path}`

  // OVH signature: SHA1(appSecret + consumerKey + method + url + body + timestamp)
  const toSign = `${config.appSecret}+${config.consumerKey}+${method}+${url}+${bodyStr}+${timestamp}`

  // Use Web Crypto API (available in Node 18+ / Cloud Functions)
  const encoder = new TextEncoder()
  const data = encoder.encode(toSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = '$1$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const headers = {
    'Content-Type': 'application/json',
    'X-Ovh-Application': config.appKey,
    'X-Ovh-Consumer': config.consumerKey,
    'X-Ovh-Timestamp': String(timestamp),
    'X-Ovh-Signature': signature,
  }

  const fetchOptions = { method, headers }
  if (body && (method === 'POST' || method === 'PUT')) {
    fetchOptions.body = bodyStr
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OVH API ${response.status}: ${errorText}`)
  }

  return response.json()
}

// ============================================
// GSM-7 ENCODING CHECK
// ============================================
const GSM7_CHARS = '@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !"#\u00a4%&\'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bfabcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0'
const GSM7_EXTENDED = '^{}\\[~]|\u20ac'

function isGSM7(text) {
  for (const char of text) {
    if (!GSM7_CHARS.includes(char) && !GSM7_EXTENDED.includes(char)) {
      return false
    }
  }
  return true
}

function getSegmentCount(text) {
  if (isGSM7(text)) {
    if (text.length <= 160) return 1
    return Math.ceil(text.length / 153)
  } else {
    if (text.length <= 70) return 1
    return Math.ceil(text.length / 67)
  }
}

// ============================================
// ENVOYER UN SMS VIA OVH
// ============================================
export async function sendSMS(orgId, prospectId, message, options = {}) {
  const result = {
    success: false,
    messageId: null,
    segmentCount: 0,
    encoding: null,
    credits: null,
    error: null,
    provider: 'ovh',
    complianceChecks: [],
  }

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'sms')
    result.complianceChecks = complianceResult.checks

    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`
      result.details = complianceResult.details
      return result
    }

    // 2. Verifier horaires d'envoi
    if (!options.ignoreHours) {
      const hoursCheck = isWithinSendingHours()
      if (!hoursCheck.allowed) {
        result.error = `Outside sending hours: ${hoursCheck.reason}`
        return result
      }
    }

    // 3. Recuperer le prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
    const prospectSnap = await prospectRef.get()

    if (!prospectSnap.exists) {
      result.error = 'Prospect not found'
      return result
    }

    const prospect = prospectSnap.data()
    const phone = prospect.phone || prospect.mobile

    if (!phone) {
      result.error = 'No phone number for prospect'
      return result
    }

    // 4. Formater le numero (international avec 00)
    const formattedPhone = formatPhoneForOvh(phone)
    if (!formattedPhone) {
      result.error = 'Invalid phone number format'
      return result
    }

    // 5. Personaliser le message
    const personalizedMessage = replaceVariables(message, prospect, options)

    // 6. Encoding et segments
    result.encoding = isGSM7(personalizedMessage) ? 'GSM-7' : 'UCS-2'
    result.segmentCount = getSegmentCount(personalizedMessage)

    if (result.segmentCount > 3) {
      console.warn(`SMS to ${prospectId}: ${result.segmentCount} segments (${personalizedMessage.length} chars)`)
    }

    // 7. Footer STOP
    const finalMessage = ensureStopFooter(personalizedMessage)

    // 8. Recuperer config org ou env
    const orgConfigRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('sms')
    const orgConfigSnap = await orgConfigRef.get()
    const orgConfig = orgConfigSnap.exists ? orgConfigSnap.data() : {}

    const config = getOvhConfig(orgConfig)

    if (!config.appKey || !config.appSecret || !config.consumerKey || !config.serviceName) {
      // Fallback mock
      console.warn('OVH SMS not configured - using mock')
      result.success = true
      result.messageId = `mock_${Date.now()}`
      result.mock = true
      await recordTouchpoint(orgId, prospectId, 'sms')
      await logSMSInteraction(orgId, prospectId, {
        type: 'sms_sent',
        to: formattedPhone,
        body: finalMessage,
        segmentCount: result.segmentCount,
        encoding: result.encoding,
        provider: 'ovh_mock',
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      })
      return result
    }

    // 9. Envoyer via OVH SMS API
    const smsPayload = {
      message: finalMessage,
      receivers: [formattedPhone],
      noStopClause: false,
      priority: 'high',
      validityPeriod: 2880,
    }

    // Use sender if alphanumeric, otherwise senderForResponse
    if (/^[a-zA-Z]/.test(config.sender)) {
      smsPayload.sender = config.sender
    } else {
      smsPayload.senderForResponse = true
    }

    // Unicode encoding if needed
    if (!isGSM7(finalMessage)) {
      smsPayload.charset = 'UTF-8'
    }

    const response = await ovhRequest(
      'POST',
      `/sms/${config.serviceName}/jobs`,
      smsPayload,
      config
    )

    // OVH returns: { totalCreditsRemoved: N, invalidReceivers: [], validReceivers: [...], ids: [123] }
    if (response.ids && response.ids.length > 0) {
      result.success = true
      result.messageId = String(response.ids[0])
      result.credits = response.totalCreditsRemoved

      // 10. Enregistrer le touchpoint
      await recordTouchpoint(orgId, prospectId, 'sms')

      // 11. Logger l'interaction
      await logSMSInteraction(orgId, prospectId, {
        type: 'sms_sent',
        messageId: result.messageId,
        to: formattedPhone,
        body: finalMessage,
        segmentCount: result.segmentCount,
        encoding: result.encoding,
        provider: 'ovh',
        creditsUsed: response.totalCreditsRemoved,
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      })
    } else {
      const invalidReceivers = response.invalidReceivers || []
      result.error = invalidReceivers.length > 0
        ? `Invalid receiver: ${invalidReceivers.join(', ')}`
        : 'OVH SMS: no message ID returned'
    }

    return result
  } catch (error) {
    console.error('OVH SMS sendSMS error:', error)
    result.error = error.message
    return result
  }
}

// ============================================
// ENVOI BATCH
// ============================================
export async function sendSMSBatch(orgId, messages, options = {}) {
  const results = {
    total: messages.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    provider: 'ovh',
    details: [],
  }

  const delayMs = options.delayMs || 1000

  for (const msg of messages) {
    try {
      const result = await sendSMS(orgId, msg.prospectId, msg.message, {
        ...options,
        sequenceId: msg.sequenceId,
        stepId: msg.stepId,
      })

      if (result.success) {
        results.sent++
      } else if (result.error?.includes('Compliance')) {
        results.skipped++
      } else {
        results.failed++
      }

      results.details.push({
        prospectId: msg.prospectId,
        ...result,
      })

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      results.failed++
      results.details.push({
        prospectId: msg.prospectId,
        success: false,
        error: error.message,
      })
    }
  }

  return results
}

// ============================================
// VERIFIER CREDITS OVH
// ============================================
export async function checkCredits(orgId) {
  try {
    const orgConfigRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('sms')
    const orgConfigSnap = await orgConfigRef.get()
    const orgConfig = orgConfigSnap.exists ? orgConfigSnap.data() : {}

    const config = getOvhConfig(orgConfig)

    if (!config.appKey || !config.appSecret || !config.consumerKey || !config.serviceName) {
      return { credits: 0, configured: false }
    }

    const accountInfo = await ovhRequest(
      'GET',
      `/sms/${config.serviceName}`,
      null,
      config
    )

    // OVH returns creditsLeft in the account info
    const credits = accountInfo.creditsLeft || 0

    return {
      credits,
      configured: true,
      description: accountInfo.description || '',
      status: accountInfo.status || 'unknown',
    }
  } catch (error) {
    console.error('OVH SMS checkCredits error:', error)
    return { credits: 0, configured: false, error: error.message }
  }
}

// ============================================
// FORMATER NUMERO (International avec 00)
// OVH attend le format 0033XXXXXXXXX
// ============================================
function formatPhoneForOvh(phone) {
  if (!phone) return null

  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '')

  if (cleaned.startsWith('+')) {
    cleaned = '00' + cleaned.substring(1)
  }

  // Si commence par 0 et 10 chiffres (France), prefixer 0033
  if (cleaned.startsWith('0') && !cleaned.startsWith('00') && cleaned.length === 10) {
    cleaned = '0033' + cleaned.substring(1)
  }

  // Si numerique sans prefixe international (ex: 33612345678), ajouter 00
  if (/^\d{10,15}$/.test(cleaned) && !cleaned.startsWith('00')) {
    cleaned = '00' + cleaned
  }

  if (!/^00\d{10,15}$/.test(cleaned)) {
    return null
  }

  return cleaned
}

// ============================================
// REMPLACER LES VARIABLES
// ============================================
function replaceVariables(message, prospect, options = {}) {
  const variables = {
    '{prenom}': prospect.firstName || prospect.prenom || '',
    '{nom}': prospect.lastName || prospect.nom || '',
    '{entreprise}': prospect.company || prospect.entreprise || '',
    '{poste}': prospect.position || prospect.poste || '',
    '{ville}': prospect.city || prospect.ville || '',
    '{secteur}': prospect.sector || prospect.secteur || '',
    ...options.customVariables,
  }

  let result = message
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value)
  }

  return result.trim()
}

// ============================================
// FOOTER STOP
// ============================================
function ensureStopFooter(message) {
  const stopKeywords = ['STOP', 'ARRET', 'DESABONNER', 'UNSUBSCRIBE']
  const hasStop = stopKeywords.some(kw => message.toUpperCase().includes(kw))

  if (hasStop) return message

  return `${message}\n\nSTOP au 36XXX`
}

// ============================================
// LOGGER INTERACTION
// ============================================
async function logSMSInteraction(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'sms',
        direction: 'out',
        createdAt: FieldValue.serverTimestamp(),
      })
  } catch (error) {
    console.error('logSMSInteraction error:', error)
  }
}

export { isGSM7, getSegmentCount, formatPhoneForOvh }
