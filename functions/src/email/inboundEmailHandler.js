/**
 * inboundEmailHandler.js — Webhook for inbound email replies
 *
 * Resend sends email.received events when prospects reply.
 * The Reply-To was set to: reply+{prospectId}+{orgId}@inbound.facemedia.tech
 *
 * Flow:
 * 1. Parse To/CC to extract prospectId + orgId
 * 2. Extract sender email, subject, body
 * 3. Route to handleIncomingReply() (same as WhatsApp)
 * 4. If POSITIVE → auto-qualify + notify client
 * 5. If UNSUBSCRIBE → blacklist across all channels
 * 6. Queue auto-reply for client approval
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { handleIncomingReply } from '../services/replyHandler.js'
import { parseReplyToAddress } from './orgEmailConfig.js'
import { generateAndQueueEmailReply } from '../alex/alexEmailApproval.js'

const getDb = () => getFirestore()

/**
 * Extract plain text from HTML email body
 */
function htmlToText(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extract the actual reply text, stripping quoted content
 * Handles common patterns: "On date, X wrote:", "Le date, X a écrit:", Gmail/Outlook quotes
 */
function extractReplyText(text) {
  if (!text) return ''

  const lines = text.split('\n')
  const replyLines = []

  for (const line of lines) {
    // Stop at quote markers
    if (/^>/.test(line)) break
    if (/^On .+ wrote:$/i.test(line)) break
    if (/^Le .+ a [ée]crit\s*:$/i.test(line)) break
    if (/^-{3,}/.test(line)) break // --- separator
    if (/^_{3,}/.test(line)) break // ___ separator
    if (/^From:/.test(line)) break
    if (/^De\s*:/.test(line)) break
    if (/^Envoy[ée]\s*:/.test(line)) break
    if (/^Sent\s*:/.test(line)) break

    replyLines.push(line)
  }

  return replyLines.join('\n').trim()
}

/**
 * Find prospectId and orgId from all recipients (To, CC)
 */
function findEncodedRecipient(recipients) {
  if (!recipients) return null

  const allRecipients = Array.isArray(recipients) ? recipients : [recipients]

  for (const r of allRecipients) {
    const email = typeof r === 'string' ? r : r?.email || r?.address || ''
    const parsed = parseReplyToAddress(email)
    if (parsed) return parsed
  }

  return null
}

/**
 * Detect unsubscribe intent from email content
 */
function isUnsubscribeEmail(subject, body) {
  const text = `${subject} ${body}`.toLowerCase()
  return /d[ée]sinscri|unsubscribe|stop|arr[eê]te|ne.*plus.*contact|supprimer|retirer/.test(text)
}

/**
 * Queue an auto-reply for client approval via alexEmailApproval module
 * Client gets notified via WhatsApp, can approve/reject
 * Auto-sends after 2h if no response (autopilot mode)
 */
async function queueAutoReply(orgId, prospectId, replyFeedId, classification, inboundText) {
  // Don't auto-reply to UNSUBSCRIBE or NEGATIVE
  if (['UNSUBSCRIBE', 'NEGATIVE'].includes(classification)) return

  try {
    await generateAndQueueEmailReply(orgId, prospectId, replyFeedId, inboundText || '')
  } catch (error) {
    logger.error(`[InboundEmail] Failed to queue auto-reply: ${error.message}`)
  }
}

/**
 * Blacklist prospect across all channels
 */
async function blacklistProspect(orgId, prospectId, email) {
  const db = getDb()
  const batch = db.batch()

  // Update prospect
  const prospectRef = db.collection(`organizations/${orgId}/prospects`).doc(prospectId)
  batch.update(prospectRef, {
    blacklisted: true,
    blacklistedAt: FieldValue.serverTimestamp(),
    blacklistReason: 'email_unsubscribe',
    alexStatus: 'lost',
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add to suppression list
  if (email) {
    const suppressRef = db.collection(`organizations/${orgId}/suppressionList`).doc(email.toLowerCase())
    batch.set(suppressRef, {
      email: email.toLowerCase(),
      reason: 'unsubscribe',
      channel: 'email',
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
}

/**
 * Main webhook handler for inbound emails
 * Accepts Resend email.received webhook format
 */
export const handleInboundEmail = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    // Fast ack
    res.status(200).json({ received: true })

    try {
      const body = req.body || {}

      // Resend webhook format
      const event = body.type || body.event
      const data = body.data || body

      // Only process email.received events
      if (event && event !== 'email.received') {
        logger.info(`[InboundEmail] Ignoring event: ${event}`)
        return
      }

      // Extract email data
      const fromEmail = data.from?.email || data.from || data.sender || ''
      const fromName = data.from?.name || fromEmail.split('@')[0] || ''
      const subject = data.subject || ''
      const htmlBody = data.html || data.body?.html || ''
      const textBody = data.text || data.body?.text || htmlToText(htmlBody)
      const toAddresses = data.to || data.recipients || []
      const ccAddresses = data.cc || []

      if (!fromEmail || (!textBody && !htmlBody)) {
        logger.warn('[InboundEmail] Missing from or body, ignoring')
        return
      }

      // Find encoded prospect+org from recipients
      const encoded = findEncodedRecipient([...toAddresses, ...ccAddresses])

      if (!encoded) {
        logger.warn('[InboundEmail] No encoded reply-to found in recipients', {
          to: JSON.stringify(toAddresses).slice(0, 200),
        })
        return
      }

      const { prospectId, orgId } = encoded

      logger.info(`[InboundEmail] Reply from ${fromEmail} for prospect ${prospectId} in org ${orgId}`)

      // Extract actual reply (strip quoted content)
      const replyText = extractReplyText(textBody) || textBody.slice(0, 2000)

      if (!replyText || replyText.length < 2) {
        logger.warn('[InboundEmail] Empty reply text, ignoring')
        return
      }

      // Check for unsubscribe
      if (isUnsubscribeEmail(subject, replyText)) {
        logger.info(`[InboundEmail] Unsubscribe detected from ${fromEmail}`)
        await blacklistProspect(orgId, prospectId, fromEmail)

        // Still log the reply
        await handleIncomingReply(orgId, prospectId, 'email', replyText, fromEmail)
        return
      }

      // Store the raw inbound email
      const db = getDb()
      await db.collection(`organizations/${orgId}/inboundEmails`).add({
        prospectId,
        from: fromEmail,
        fromName,
        subject,
        body: replyText.slice(0, 5000),
        rawHtml: htmlBody.slice(0, 10000),
        receivedAt: FieldValue.serverTimestamp(),
      })

      // Route to the same reply handler as WhatsApp
      const result = await handleIncomingReply(orgId, prospectId, 'email', replyText, fromEmail)

      // Check for conversion action (attachment, positive reply, etc.)
      try {
        const { checkAndHandleConversion } = await import('../alex/documentCollector.js')
        await checkAndHandleConversion({
          orgId,
          prospectId,
          text: replyText,
          hasAttachment: !!(data.attachments?.length),
          attachmentUrl: data.attachments?.[0]?.url || null,
          attachmentMimeType: data.attachments?.[0]?.content_type || null,
          channel: 'email',
        })
      } catch (err) {
        logger.warn('[InboundEmail] Conversion check failed (non-blocking):', err.message)
      }

      // Queue auto-reply for client approval
      if (result?.replyFeedId) {
        await queueAutoReply(orgId, prospectId, result.replyFeedId, result.classification, replyText)
      }

      // If POSITIVE → extra notification
      if (result?.classification === 'POSITIVE') {
        await db.collection(`organizations/${orgId}/notifications`).add({
          type: 'hot_email_reply',
          prospectId,
          message: `🔥 ${fromName || fromEmail} a répondu positivement par email ! Sujet: "${subject}"`,
          priority: 'urgent',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      logger.info(`[InboundEmail] Processed reply: ${result?.classification || 'unknown'}`, {
        orgId,
        prospectId,
        classification: result?.classification,
      })

    } catch (error) {
      logger.error('[InboundEmail] Error processing webhook:', error)
    }
  }
)
