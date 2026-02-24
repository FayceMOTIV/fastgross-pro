/**
 * BudgetSMS Provider
 * Best price/quality ratio for Europe (~0.035€/SMS France)
 *
 * API: https://api.budgetsms.net/sendsms/
 * Features:
 * - HTTP GET/POST API (simple)
 * - Delivery reports via callback
 * - Sender ID customization
 * - Unicode support
 * - Batch sending
 * - Credit balance check
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js'
import { checkSMSCompliance, formatPhoneNumber, isWithinSendingHours } from './compliance.js'

const getDb = () => getFirestore()

// ============================================
// BUDGETSMS API CONFIG
// ============================================
const BUDGETSMS_API_BASE = 'https://api.budgetsms.net'

function getBudgetSmsConfig(orgConfig = {}) {
  return {
    username: orgConfig.budgetsmsUsername || process.env.BUDGETSMS_USERNAME || '',
    userId: orgConfig.budgetsmsUserId || process.env.BUDGETSMS_USERID || '',
    handle: orgConfig.budgetsmsHandle || process.env.BUDGETSMS_HANDLE || '',
    from: orgConfig.budgetsmsSender || process.env.BUDGETSMS_SENDER_ID || 'FaceMedia',
  }
}

// ============================================
// GSM-7 ENCODING CHECK
// ============================================
const GSM7_CHARS = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM7_EXTENDED = '^{}\\[~]|€'

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
// ENVOYER UN SMS VIA BUDGETSMS
// ============================================
export async function sendSMS(orgId, prospectId, message, options = {}) {
  const result = {
    success: false,
    messageId: null,
    segmentCount: 0,
    encoding: null,
    credits: null,
    error: null,
    provider: 'budgetsms',
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

    // 4. Formater le numero (international sans +)
    const formattedPhone = formatPhoneForBudgetSms(phone)
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

    const config = getBudgetSmsConfig(orgConfig)

    if (!config.username || !config.userId || !config.handle) {
      // Fallback mock
      console.warn('BudgetSMS not configured - using mock')
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
        provider: 'budgetsms_mock',
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      })
      return result
    }

    // 9. Envoyer via BudgetSMS API
    const params = new URLSearchParams({
      username: config.username,
      userid: config.userId,
      handle: config.handle,
      msg: finalMessage,
      from: config.from,
      to: formattedPhone,
    })

    // Unicode si non-GSM7
    if (!isGSM7(finalMessage)) {
      params.set('credit', '2') // Unicode costs 2 credits
    }

    // Status callback
    if (process.env.APP_URL) {
      params.set('dlrurl', `${process.env.APP_URL}/api/sms/budgetsms-status?id=%id%&status=%statusid%`)
    }

    const response = await fetch(`${BUDGETSMS_API_BASE}/sendsms/?${params.toString()}`)
    const responseText = await response.text()

    // BudgetSMS returns: OK <message_id> or ERR <code> <message>
    if (responseText.startsWith('OK')) {
      const messageId = responseText.split(' ')[1]?.trim()
      result.success = true
      result.messageId = messageId

      // 10. Enregistrer le touchpoint
      await recordTouchpoint(orgId, prospectId, 'sms')

      // 11. Logger l'interaction
      await logSMSInteraction(orgId, prospectId, {
        type: 'sms_sent',
        messageId,
        to: formattedPhone,
        body: finalMessage,
        segmentCount: result.segmentCount,
        encoding: result.encoding,
        provider: 'budgetsms',
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      })
    } else {
      // Parse error
      const errorCode = responseText.split(' ')[1]?.trim()
      const errorMessages = {
        '1001': 'Not enough credits',
        '1002': 'Identification failed (wrong credentials)',
        '1003': 'Account not active',
        '1004': 'IP address not allowed',
        '1005': 'Destination not allowed',
        '1006': 'Message empty or too long',
        '1007': 'Sender too long',
        '1008': 'DLR URL too long',
        '1009': 'Destination number invalid',
        '1010': 'Domain not allowed',
        '2001': 'Internal error',
      }
      result.error = errorMessages[errorCode] || `BudgetSMS error: ${responseText}`
      result.budgetSmsErrorCode = errorCode
    }

    return result
  } catch (error) {
    console.error('BudgetSMS sendSMS error:', error)
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
    provider: 'budgetsms',
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
// VERIFIER CREDITS BUDGETSMS
// ============================================
export async function checkCredits(orgId) {
  try {
    const orgConfigRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('sms')
    const orgConfigSnap = await orgConfigRef.get()
    const orgConfig = orgConfigSnap.exists ? orgConfigSnap.data() : {}

    const config = getBudgetSmsConfig(orgConfig)

    if (!config.username || !config.userId || !config.handle) {
      return { credits: 0, configured: false }
    }

    const params = new URLSearchParams({
      username: config.username,
      userid: config.userId,
      handle: config.handle,
    })

    const response = await fetch(`${BUDGETSMS_API_BASE}/checkcredit/?${params.toString()}`)
    const responseText = await response.text()

    if (responseText.startsWith('OK')) {
      const credits = parseFloat(responseText.split(' ')[1]?.trim()) || 0
      return { credits, configured: true }
    }

    return { credits: 0, configured: true, error: responseText }
  } catch (error) {
    console.error('BudgetSMS checkCredits error:', error)
    return { credits: 0, configured: false, error: error.message }
  }
}

// ============================================
// FORMATER NUMERO (International sans +)
// ============================================
function formatPhoneForBudgetSms(phone) {
  if (!phone) return null

  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '')

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Si commence par 0 (France), remplacer par 33
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '33' + cleaned.substring(1)
  }

  if (!/^\d{10,15}$/.test(cleaned)) {
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

export { isGSM7, getSegmentCount, formatPhoneForBudgetSms }
