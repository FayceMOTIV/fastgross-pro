/**
 * Cloud Function: sendProspectEmail
 * Envoie un email de prospection via SMTP utilisateur, Gmail OAuth, ou Outlook OAuth
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import nodemailer from 'nodemailer'
import { google } from 'googleapis'

const db = getFirestore()

// Warmup limits par jour
const WARMUP_LIMITS = {
  1: 5, 4: 15, 8: 30, 15: 60, 22: 100, 31: null
}

/**
 * Obtenir la limite effective d'un compte en warmup
 */
function getEffectiveLimit(account) {
  const day = account.warmupDay || 1
  let limit = 5

  for (const [startDay, dayLimit] of Object.entries(WARMUP_LIMITS)) {
    if (day >= parseInt(startDay)) {
      limit = dayLimit !== null ? dayLimit : account.dailyLimit
    }
  }

  return Math.min(limit, account.dailyLimit || 500)
}

/**
 * Dechiffrer les credentials (simple base64 pour l'exemple)
 * En production, utiliser Cloud KMS ou Secret Manager
 */
function decryptCredentials(encrypted) {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return encrypted
  }
}

/**
 * Chiffrer les credentials
 */
export function encryptCredentials(credentials) {
  const json = JSON.stringify(credentials)
  return Buffer.from(json).toString('base64')
}

/**
 * Envoyer via Gmail API (OAuth2)
 */
async function sendViaGmailAPI(emailData, credentials) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    refresh_token: credentials.refreshToken
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Construire le message MIME
  const message = [
    `From: ${emailData.from}`,
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    ...(emailData.headers ? Object.entries(emailData.headers).map(([k, v]) => `${k}: ${v}`) : []),
    'Content-Type: text/html; charset=utf-8',
    '',
    emailData.html
  ].join('\r\n')

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage
    }
  })

  return { messageId: response.data.id }
}

/**
 * Envoyer via Microsoft Graph API (OAuth2)
 */
async function sendViaMSGraph(emailData, credentials) {
  const tokenEndpoint = `https://login.microsoftonline.com/common/oauth2/v2.0/token`

  // Rafraichir le token
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
      scope: 'Mail.Send offline_access'
    })
  })

  const tokens = await tokenResponse.json()
  if (!tokens.access_token) {
    throw new Error('Failed to refresh Microsoft token')
  }

  // Envoyer l'email
  const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.html
        },
        toRecipients: [
          { emailAddress: { address: emailData.to } }
        ],
        internetMessageHeaders: emailData.headers ? Object.entries(emailData.headers).map(([name, value]) => ({ name, value })) : []
      }
    })
  })

  if (!sendResponse.ok) {
    const error = await sendResponse.text()
    throw new Error(`Microsoft Graph error: ${error}`)
  }

  return { messageId: `ms-${Date.now()}` }
}

/**
 * Envoyer via SMTP (nodemailer)
 */
async function sendViaSMTP(emailData, credentials) {
  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port || 587,
    secure: credentials.port === 465,
    auth: {
      user: credentials.user,
      pass: credentials.pass
    },
    tls: {
      rejectUnauthorized: false // Pour les certificats auto-signes
    }
  })

  const info = await transporter.sendMail({
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    headers: emailData.headers
  })

  return { messageId: info.messageId }
}

/**
 * Formater le body en HTML email
 */
function formatEmailHtml(body, unsubscribeLink) {
  const paragraphs = body
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p}</p>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs}
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
    <p>Vous recevez cet email car votre site web est public.</p>
    <p><a href="${unsubscribeLink}" style="color: #666;">Se desinscrire</a></p>
  </div>
</body>
</html>`
}

/**
 * Cloud Function principale pour l'envoi d'emails de prospection
 */
export const sendProspectEmail = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { emailData, accountId, prospectId, orgId } = request.data

    if (!emailData || !accountId || !prospectId || !orgId) {
      throw new HttpsError('invalid-argument', 'Donnees manquantes')
    }

    try {
      // Verifier que l'utilisateur appartient a l'org
      const memberDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('members')
        .doc(request.auth.uid)
        .get()

      if (!memberDoc.exists) {
        throw new HttpsError('permission-denied', 'Vous n\'appartenez pas a cette organisation')
      }

      // Recuperer le compte email
      const accountDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailAccounts')
        .doc(accountId)
        .get()

      if (!accountDoc.exists) {
        throw new HttpsError('not-found', 'Compte email non trouve')
      }

      const account = accountDoc.data()

      // Verifier le quota
      const effectiveLimit = getEffectiveLimit(account)
      if (account.sentToday >= effectiveLimit) {
        throw new HttpsError('resource-exhausted', `Quota atteint: ${account.sentToday}/${effectiveLimit}`)
      }

      // Verifier la blacklist
      const blacklistDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('blacklist')
        .doc(emailData.to.toLowerCase())
        .get()

      if (blacklistDoc.exists) {
        throw new HttpsError('failed-precondition', 'Email dans la blacklist')
      }

      // Dechiffrer les credentials
      const credentials = decryptCredentials(account.credentials)

      // Generer le lien de desinscription
      const baseUrl = process.env.APP_URL || 'https://facemedia.app'
      const unsubscribeLink = `${baseUrl}/unsubscribe?e=${encodeURIComponent(emailData.to)}&o=${orgId}`

      // Preparer l'email final
      const finalEmail = {
        from: `${account.displayName} <${account.email}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: formatEmailHtml(emailData.body, unsubscribeLink),
        headers: {
          'List-Unsubscribe': `<${unsubscribeLink}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-FMF-Prospect-Id': prospectId,
          'X-FMF-Account-Id': accountId,
          'X-FMF-Org-Id': orgId
        }
      }

      // Envoyer selon le type de compte
      let result
      switch (account.type) {
        case 'gmail':
          result = await sendViaGmailAPI(finalEmail, credentials)
          break
        case 'outlook':
          result = await sendViaMSGraph(finalEmail, credentials)
          break
        case 'smtp':
          result = await sendViaSMTP(finalEmail, credentials)
          break
        default:
          throw new HttpsError('invalid-argument', `Type de compte inconnu: ${account.type}`)
      }

      // Mettre a jour les compteurs du compte
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailAccounts')
        .doc(accountId)
        .update({
          sentToday: FieldValue.increment(1),
          totalSent: FieldValue.increment(1),
          lastUsedAt: FieldValue.serverTimestamp()
        })

      // Mettre a jour le statut du prospect
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)
        .update({
          status: 'sent',
          emailedAt: FieldValue.serverTimestamp(),
          sentVia: accountId,
          messageId: result.messageId,
          updatedAt: FieldValue.serverTimestamp()
        })

      // Logger l'evenement
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailEvents')
        .add({
          type: 'sent',
          prospectId,
          accountId,
          to: emailData.to,
          subject: emailData.subject,
          messageId: result.messageId,
          timestamp: FieldValue.serverTimestamp()
        })

      // Enregistrer le contact du domaine
      const domain = emailData.to.split('@')[1]
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('domainContacts')
        .doc(domain)
        .set({
          domain,
          email: emailData.to,
          contactedAt: FieldValue.serverTimestamp()
        }, { merge: true })

      return { success: true, messageId: result.messageId }

    } catch (error) {
      console.error('Send prospect email error:', error)

      // Logger l'erreur
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailEvents')
        .add({
          type: 'send_failed',
          prospectId,
          accountId,
          error: error.message,
          timestamp: FieldValue.serverTimestamp()
        })

      if (error instanceof HttpsError) {
        throw error
      }
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Test de connexion SMTP
 */
export const testSmtpConnection = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { host, port, user, pass, testEmail } = request.data

    try {
      const transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      })

      // Verifier la connexion
      await transporter.verify()

      // Envoyer un email test si demande
      if (testEmail) {
        await transporter.sendMail({
          from: user,
          to: testEmail,
          subject: 'Test de connexion Face Media Factory',
          text: 'Votre compte SMTP est correctement configure !'
        })
      }

      return { success: true }
    } catch (error) {
      throw new HttpsError('invalid-argument', `Echec connexion SMTP: ${error.message}`)
    }
  }
)
