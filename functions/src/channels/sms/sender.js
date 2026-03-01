/**
 * SMS Sender - BudgetSMS API
 *
 * Envoi SMS via BudgetSMS avec:
 * - API GET simple (https://api.budgetsms.net/sendsms)
 * - Smart encoding (GSM-7/UCS-2)
 * - Opt-in verification
 * - CNIL compliance
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js'
import { checkSMSCompliance, formatPhoneNumber, isWithinSendingHours } from './compliance.js'

const getDb = () => getFirestore()

// ============================================
// CONFIGURATION
// ============================================
const BUDGETSMS_API_URL = 'https://api.budgetsms.net/sendsms'

function getBudgetSMSConfig() {
  const username = process.env.BUDGETSMS_USERNAME
  const handle = process.env.BUDGETSMS_HANDLE

  if (!username || !handle) {
    throw new Error('BUDGETSMS_USERNAME and BUDGETSMS_HANDLE required')
  }

  return { username, handle }
}

// ============================================
// CARACTERES GSM-7 (160 chars max)
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
// FORMATER NUMERO POUR BUDGETSMS
// ============================================
// BudgetSMS attend le format international sans +
// Ex: 33612345678
function formatForBudgetSMS(phone) {
  const formatted = formatPhoneNumber(phone)
  if (!formatted) return null
  // formatPhoneNumber retourne +33... — on retire le +
  return formatted.replace(/^\+/, '')
}

// ============================================
// ENVOYER UN SMS
// ============================================
export async function sendSMS(orgId, prospectId, message, options = {}) {
  const result = {
    success: false,
    messageSid: null,
    segmentCount: 0,
    encoding: null,
    error: null,
    complianceChecks: []
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

    // 2. Verifier horaires d'envoi (8h-20h, pas dimanche)
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

    // 4. Formater le numero pour BudgetSMS
    const formattedPhone = formatForBudgetSMS(phone)
    if (!formattedPhone) {
      result.error = 'Invalid phone number format'
      return result
    }

    // 5. Preparer le message avec variables
    const personalizedMessage = replaceVariables(message, prospect, options)

    // 6. Verifier longueur et encoding
    result.encoding = isGSM7(personalizedMessage) ? 'GSM-7' : 'UCS-2'
    result.segmentCount = getSegmentCount(personalizedMessage)

    if (result.segmentCount > 3) {
      console.warn(`SMS to ${prospectId}: ${result.segmentCount} segments (${personalizedMessage.length} chars)`)
    }

    // 7. Ajouter footer STOP si pas deja present
    const finalMessage = ensureStopFooter(personalizedMessage)

    // 8. Envoyer via BudgetSMS
    const config = getBudgetSMSConfig()
    const params = new URLSearchParams({
      username: config.username,
      userid: config.handle,
      handle: config.handle,
      to: formattedPhone,
      msg: finalMessage,
      from: process.env.BUDGETSMS_SENDER || 'FaceMedia',
    })

    const response = await fetch(`${BUDGETSMS_API_URL}?${params.toString()}`)
    const responseText = await response.text()

    // BudgetSMS retourne "OK <messageId>" en cas de succes
    // ou un code d'erreur en cas d'echec
    if (responseText.startsWith('OK')) {
      const messageId = responseText.replace('OK ', '').trim()
      result.success = true
      result.messageSid = messageId
      result.status = 'sent'
    } else {
      result.error = `BudgetSMS error: ${responseText}`
      result.providerErrorCode = responseText.trim()
      return result
    }

    // 9. Enregistrer le touchpoint
    await recordTouchpoint(orgId, prospectId, 'sms')

    // 10. Logger l'interaction
    await logSMSInteraction(orgId, prospectId, {
      type: 'sms_sent',
      messageSid: result.messageSid,
      to: formattedPhone,
      body: finalMessage,
      segmentCount: result.segmentCount,
      encoding: result.encoding,
      provider: 'budgetsms',
      sequenceId: options.sequenceId,
      stepId: options.stepId
    })

    return result

  } catch (error) {
    console.error('sendSMS error:', error)
    result.error = error.message
    return result
  }
}

// ============================================
// ENVOI BATCH (pour sequences)
// ============================================
export async function sendSMSBatch(orgId, messages, options = {}) {
  const results = {
    total: messages.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  }

  // Respecter rate limits - 1 SMS par seconde par defaut
  const delayMs = options.delayMs || 1000

  for (const msg of messages) {
    try {
      const result = await sendSMS(orgId, msg.prospectId, msg.message, {
        ...options,
        sequenceId: msg.sequenceId,
        stepId: msg.stepId
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
        ...result
      })

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

    } catch (error) {
      results.failed++
      results.details.push({
        prospectId: msg.prospectId,
        success: false,
        error: error.message
      })
    }
  }

  return results
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
    ...options.customVariables
  }

  let result = message
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), value)
  }

  return result.trim()
}

// ============================================
// ASSURER FOOTER STOP
// ============================================
function ensureStopFooter(message) {
  const stopKeywords = ['STOP', 'ARRET', 'DESABONNER', 'UNSUBSCRIBE']
  const hasStop = stopKeywords.some(kw =>
    message.toUpperCase().includes(kw)
  )

  if (hasStop) {
    return message
  }

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
        createdAt: FieldValue.serverTimestamp()
      })
  } catch (error) {
    console.error('logSMSInteraction error:', error)
  }
}

// ============================================
// VERIFIER STATUT MESSAGE
// ============================================
export async function getMessageStatus(messageSid) {
  // BudgetSMS n'a pas d'API de status check en temps reel
  // On retourne le dernier statut depuis Firestore
  try {
    const snapshot = await getDb().collectionGroup('interactions')
      .where('messageSid', '==', messageSid)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return { error: 'Message not found' }
    }

    const data = snapshot.docs[0].data()
    return {
      sid: messageSid,
      status: data.status || 'sent',
      provider: 'budgetsms',
      dateCreated: data.createdAt
    }
  } catch (error) {
    console.error('getMessageStatus error:', error)
    return { error: error.message }
  }
}

// ============================================
// EXPORTS
// ============================================
export { isGSM7, getSegmentCount }
