/**
 * sendMessage — Router multi-canal pour Agent Alex
 * WhatsApp (Evolution API), Email (Instantly), Instagram (Wave.co), LinkedIn (Waalaxy)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

// Evolution API config
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

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
 * Envoie un message via le canal optimal
 * @param {object} params
 * @param {string} params.orgId - ID organisation
 * @param {string} params.prospectId - ID prospect
 * @param {string} params.channel - Canal: whatsapp | email | instagram | linkedin
 * @param {string} params.message - Contenu du message
 * @param {string} params.to - Destinataire (phone, email, handle)
 * @param {object} [params.metadata] - Donnees supplementaires
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendMessage(params) {
  const { orgId, prospectId, channel, message, to, metadata = {} } = params

  if (!channel || !message || !to) {
    return { success: false, error: 'channel, message, and to are required' }
  }

  // Verifier blacklist
  if (prospectId && orgId) {
    const prospectRef = getDb()
      .collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
    const prospectSnap = await prospectRef.get()
    if (prospectSnap.exists && prospectSnap.data().blacklisted) {
      logger.warn(`Prospect ${prospectId} is blacklisted, skipping send`)
      return { success: false, error: 'prospect_blacklisted' }
    }
  }

  // Inject CTA if requested and conversionAction exists
  let finalMessage = message
  let ctaButton = ''
  if (metadata.injectCTA !== false && orgId) {
    try {
      const { getConversionAction, buildCTAText, buildCTAButton } = await import('./conversionCTA.js')
      const ca = await getConversionAction(orgId)
      if (ca && ca.type !== 'reply_positive') {
        const orgSnap = await getDb().doc(`organizations/${orgId}`).get()
        const orgSlug = orgSnap.exists ? (orgSnap.data().slug || orgId) : orgId
        const ctaText = buildCTAText(ca, channel, orgSlug, prospectId)
        if (ctaText) {
          finalMessage = message + ctaText
        }
        if (channel === 'email') {
          ctaButton = buildCTAButton(ca, orgSlug, prospectId)
        }
      }
    } catch (err) {
      logger.warn('CTA injection failed (non-blocking):', err.message)
    }
  }

  let result

  switch (channel) {
    case 'whatsapp':
      result = await sendViaWhatsApp(to, finalMessage, orgId)
      break
    case 'email':
      result = await sendViaEmail(to, finalMessage, { ...metadata, orgId, prospectId, ctaButton })
      break
    case 'instagram':
      result = await sendViaInstagram(to, message, metadata)
      break
    case 'linkedin':
      result = await sendViaLinkedIn(to, message, metadata)
      break
    default:
      return { success: false, error: `Unknown channel: ${channel}` }
  }

  // Logger l'interaction dans Firestore
  if (result.success && orgId && prospectId) {
    try {
      await getDb()
        .collection('organizations').doc(orgId)
        .collection('interactions').add({
          prospectId,
          channel,
          direction: 'out',
          message,
          source: metadata.source || 'alex',
          messageId: result.messageId || null,
          createdAt: FieldValue.serverTimestamp(),
        })

      // Mettre a jour le prospect
      await getDb()
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          alexLastContact: FieldValue.serverTimestamp(),
          alexStatus: 'replied',
          sentToday: FieldValue.increment(1),
        })
    } catch (err) {
      logger.error('Failed to log interaction:', err.message)
    }

    logAlexActivity(orgId, {
      type: 'whatsapp_sent',
      title: `Message envoye via ${channel} — ${to}`,
      details: `${message.substring(0, 100)}`,
      status: 'success',
      prospectId,
      channel,
    });
  }

  return result
}

// ============================================
// WHATSAPP via Evolution API
// ============================================
async function sendViaWhatsApp(phone, text, orgId) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    logger.error('Evolution API not configured')
    return { success: false, error: 'evolution_api_not_configured' }
  }

  const cleanPhone = phone.replace(/[^\d]/g, '')
  const instanceName = await getInstanceName(orgId)

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        number: cleanPhone,
        text,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    return {
      success: true,
      messageId: response.data?.key?.id || response.data?.messageId,
      provider: 'evolution_api',
    }
  } catch (error) {
    logger.error('WhatsApp send error:', error.response?.data || error.message)
    return { success: false, error: error.message, provider: 'evolution_api' }
  }
}

// ============================================
// EMAIL via emailRouter (Resend → SES → SMTP)
// Multi-tenant: FROM = org's configured sender, Reply-To = encoded prospect+org
// ============================================
async function sendViaEmail(email, text, metadata = {}) {
  try {
    const { sendEmail } = await import('../email/emailRouter.js')
    const { getOrgEmailConfig } = await import('../email/orgEmailConfig.js')

    const orgId = metadata.orgId || null
    const prospectId = metadata.prospectId || null

    // Load org-specific email config
    const emailConfig = orgId ? await getOrgEmailConfig(orgId) : null
    const fromAddress = emailConfig?.senderEmail
      || process.env.EMAIL_FROM
      || 'Face Media Factory <noreply@facemedia.app>'

    // Build Reply-To with encoded prospect+org for inbound routing
    const replyTo = (orgId && prospectId)
      ? `reply+${prospectId}+${orgId}@inbound.facemedia.tech`
      : null

    const subject = metadata.subject || 'Suite a votre demande'
    const orgName = emailConfig?.senderName || 'Alex'
    const signature = emailConfig?.signature || ''

    const ctaButtonHtml = metadata.ctaButton || ''
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px;">
        <p>${text.replace(/\n/g, '<br>')}</p>
        ${ctaButtonHtml}
        ${signature ? `<br><p style="color: #666; font-size: 13px;">${signature}</p>` : ''}
      </div>
    `

    const result = await sendEmail({
      to: email,
      subject,
      html: htmlBody,
      text,
      from: fromAddress,
      replyTo,
      orgId,
      prospectId,
    })

    return {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
    }
  } catch (error) {
    logger.error('Email send error:', error.message)
    return { success: false, error: error.message, provider: 'email_router' }
  }
}

// ============================================
// INSTAGRAM via Wave.co API
// ============================================
async function sendViaInstagram(handle, text, metadata = {}) {
  const apiKey = process.env.WAVE_API_KEY

  if (!apiKey) {
    logger.warn('Wave.co API key not configured, Instagram DM not sent')
    return { success: false, error: 'wave_not_configured' }
  }

  try {
    const response = await axios.post(
      'https://api.wave.co/v1/messages/send',
      {
        platform: 'instagram',
        recipient: handle,
        message: text,
        campaign_id: metadata.campaignId,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    return {
      success: true,
      messageId: response.data?.message_id,
      provider: 'wave',
    }
  } catch (error) {
    logger.error('Instagram send error:', error.response?.data || error.message)
    return { success: false, error: error.message, provider: 'wave' }
  }
}

// ============================================
// LINKEDIN via Waalaxy API
// ============================================
async function sendViaLinkedIn(profileUrl, text, metadata = {}) {
  const apiKey = process.env.WAALAXY_API_KEY

  if (!apiKey) {
    logger.warn('Waalaxy API key not configured, LinkedIn message not sent')
    return { success: false, error: 'waalaxy_not_configured' }
  }

  try {
    const response = await axios.post(
      'https://api.waalaxy.com/v1/messages',
      {
        prospect_url: profileUrl,
        message: text,
        campaign_id: metadata.campaignId,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    )

    return {
      success: true,
      messageId: response.data?.id,
      provider: 'waalaxy',
    }
  } catch (error) {
    logger.error('LinkedIn send error:', error.response?.data || error.message)
    return { success: false, error: error.message, provider: 'waalaxy' }
  }
}

/**
 * Callable: envoi manuel d'un message par le commercial (CRM Dialogue)
 */
export const sendManualMessage = onCall(
  { region: 'europe-west1', timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, prospectId, channel, message, to, source } = request.data || {}

    if (!orgId || !prospectId || !channel || !message || !to) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId, channel, message, to are required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const result = await sendMessage({
      orgId,
      prospectId,
      channel,
      message,
      to,
      metadata: { source: source || 'manual' },
    })

    if (!result.success) {
      throw new HttpsError('internal', result.error || 'Send failed')
    }

    return result
  }
)
