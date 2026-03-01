/**
 * Email Router - Amazon SES primary + SMTP fallback
 * Face Media Factory
 *
 * Unified email sending with automatic failover:
 * 1. Tries Amazon SES first (high deliverability, cost-effective)
 * 2. Falls back to SMTP if SES fails
 * 3. Logs every attempt in Firestore email_logs collection
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import nodemailer from 'nodemailer'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// ============================================
// SES CLIENT (singleton)
// ============================================
let sesClient = null

function getSESClient() {
  if (sesClient) return sesClient

  const region = process.env.AWS_REGION || 'eu-west-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required for SES')
  }

  sesClient = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  })

  return sesClient
}

/**
 * Send an email with automatic failover
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text body (auto-generated from html if missing)
 * @param {string} [options.from] - Sender (default: env config)
 * @param {string} [options.replyTo] - Reply-to address
 * @param {Object} [options.headers] - Custom headers
 * @param {string} [options.orgId] - Organization ID for logging
 * @param {string} [options.prospectId] - Prospect ID for logging
 * @returns {Promise<{success: boolean, provider: string, messageId: string}>}
 */
export async function sendEmail(options) {
  const { to, subject, html, text, from, replyTo, headers = {}, orgId, prospectId } = options

  if (!to || !subject || !html) {
    throw new Error('Missing required fields: to, subject, html')
  }

  const startTime = Date.now()
  let lastError = null

  // Try Amazon SES first
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const result = await sendViaSES({ to, subject, html, text, from, replyTo, headers })
      await logEmailEvent({ provider: 'ses', status: 'sent', to, subject, orgId, prospectId, messageId: result.messageId, latency: Date.now() - startTime })
      return { success: true, provider: 'ses', messageId: result.messageId }
    } catch (error) {
      console.warn('[EmailRouter] SES failed, trying SMTP fallback:', error.message)
      lastError = error
      await logEmailEvent({ provider: 'ses', status: 'failed', to, subject, orgId, prospectId, error: error.message, latency: Date.now() - startTime })
    }
  }

  // Fallback to SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const result = await sendViaSMTP({ to, subject, html, text, from, replyTo, headers })
      await logEmailEvent({ provider: 'smtp', status: 'sent', to, subject, orgId, prospectId, messageId: result.messageId, latency: Date.now() - startTime })
      return { success: true, provider: 'smtp', messageId: result.messageId }
    } catch (error) {
      console.error('[EmailRouter] SMTP also failed:', error.message)
      lastError = error
      await logEmailEvent({ provider: 'smtp', status: 'failed', to, subject, orgId, prospectId, error: error.message, latency: Date.now() - startTime })
    }
  }

  // Both failed
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.SMTP_HOST) {
    throw new Error('No email provider configured. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in .env')
  }

  throw new Error(`All email providers failed. Last error: ${lastError?.message || 'unknown'}`)
}

/**
 * Send via Amazon SES
 */
async function sendViaSES({ to, subject, html, text, from, replyTo, headers }) {
  const client = getSESClient()
  const defaultFrom = process.env.SES_FROM_EMAIL || process.env.EMAIL_FROM || 'Face Media Factory <noreply@facemedia.app>'

  const toAddresses = Array.isArray(to) ? to : [to]

  const params = {
    Source: from || defaultFrom,
    Destination: {
      ToAddresses: toAddresses
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8'
        }
      }
    }
  }

  if (text) {
    params.Message.Body.Text = { Data: text, Charset: 'UTF-8' }
  }

  if (replyTo) {
    params.ReplyToAddresses = [replyTo]
  }

  const command = new SendEmailCommand(params)
  const response = await client.send(command)

  return { messageId: response.MessageId }
}

/**
 * Send via SMTP (Nodemailer)
 */
async function sendViaSMTP({ to, subject, html, text, from, replyTo, headers }) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  const defaultFrom = process.env.EMAIL_FROM || process.env.SMTP_USER

  const mailOptions = {
    from: from || defaultFrom,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    headers
  }

  if (text) mailOptions.text = text
  if (replyTo) mailOptions.replyTo = replyTo

  const info = await transport.sendMail(mailOptions)
  return { messageId: info.messageId }
}

/**
 * Log email events to Firestore
 */
async function logEmailEvent(event) {
  try {
    const db = getDb()
    await db.collection('email_logs').add({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[EmailRouter] Failed to log email event:', error.message)
  }
}

/**
 * Test email configuration by sending a test email
 * @param {string} testEmail - Email address to send test to
 * @returns {Promise<{success: boolean, provider: string, latency: number}>}
 */
export async function testEmailConfig(testEmail) {
  const startTime = Date.now()

  const result = await sendEmail({
    to: testEmail,
    subject: 'Face Media Factory - Test Email Configuration',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F6EF7;">Configuration Email Validee</h2>
        <p>Si vous recevez cet email, votre configuration email fonctionne correctement.</p>
        <p style="color: #666; font-size: 13px;">Envoye le ${new Date().toLocaleString('fr-FR')} via Face Media Factory (Amazon SES)</p>
      </div>
    `,
    text: 'Configuration Email Validee. Si vous recevez cet email, votre configuration email fonctionne correctement.'
  })

  return {
    ...result,
    latency: Date.now() - startTime
  }
}

/**
 * Get email provider status
 * @returns {Object} Provider availability status
 */
export function getEmailStatus() {
  return {
    ses: {
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      region: process.env.AWS_REGION || 'eu-west-1',
      priority: 1
    },
    smtp: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      priority: 2
    },
    anyAvailable: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) || !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  }
}
