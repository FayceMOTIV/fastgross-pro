/**
 * Test Email Functions
 * Send test emails via Amazon SES (emailRouter) to verify configuration
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { sendEmail, getEmailStatus } from '../email/emailRouter.js'

const getDb = () => getFirestore()

/**
 * Check if user is a super admin or beta user
 */
async function canTestEmail(userId) {
  const superAdminDoc = await getDb().collection('superAdmins').doc(userId).get()
  if (superAdminDoc.exists) return true

  const betaUserDoc = await getDb().collection('betaUsers').doc(userId).get()
  return betaUserDoc.exists
}

/**
 * Cloud Function: Send a test email via Amazon SES
 */
export const sendTestEmail = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  // Check if user can test emails (super admin or beta user)
  const canTest = await canTestEmail(auth.uid)
  if (!canTest) {
    throw new HttpsError('permission-denied', 'Only super admins and beta users can test emails')
  }

  const { to, subject, content, fromName } = data

  if (!to) {
    throw new HttpsError('invalid-argument', 'Recipient email (to) is required')
  }

  // Default values
  const emailSubject = subject || 'Test Email - Face Media Factory'
  const emailContent = content || `
    <h1>Test Email</h1>
    <p>This is a test email sent from Face Media Factory.</p>
    <p>If you receive this, your email configuration is working correctly!</p>
    <hr>
    <p style="color: #666; font-size: 12px;">
      Sent by: ${auth.token.email}<br>
      Time: ${new Date().toISOString()}
    </p>
  `

  const status = getEmailStatus()
  if (!status.anyAvailable) {
    throw new HttpsError('failed-precondition', 'No email provider configured (SES or SMTP)')
  }

  try {
    const result = await sendEmail({
      from: `${fromName || 'Face Media Factory'} <${process.env.SES_FROM_EMAIL || 'noreply@facemediafactory.com'}>`,
      to,
      subject: emailSubject,
      html: emailContent
    })

    // Log successful test
    await getDb().collection('emailTestLogs').add({
      userId: auth.uid,
      userEmail: auth.token.email,
      to,
      subject: emailSubject,
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      timestamp: FieldValue.serverTimestamp()
    })

    return {
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      message: `Test email sent to ${to} via ${result.provider}`
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error
    }

    // Log the error
    await getDb().collection('emailTestLogs').add({
      userId: auth.uid,
      userEmail: auth.token.email,
      to,
      subject: emailSubject,
      success: false,
      error: error.message,
      timestamp: FieldValue.serverTimestamp()
    })

    throw new HttpsError('internal', `Email send failed: ${error.message}`)
  }
})

/**
 * Cloud Function: Get test email logs
 */
export const getTestEmailLogs = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Only super admins can view all logs
    const superAdminDoc = await getDb().collection('superAdmins').doc(auth.uid).get()
    const isSuperAdmin = superAdminDoc.exists

    // Build query
    let query = getDb().collection('emailTestLogs')
      .orderBy('timestamp', 'desc')
      .limit(data?.limit || 50)

    // Non-admins can only see their own logs
    if (!isSuperAdmin) {
      query = query.where('userId', '==', auth.uid)
    }

    const snapshot = await query.get()

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
    }))

    return {
      success: true,
      count: logs.length,
      logs
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: Verify email provider configuration
 */
export const verifyEmailConfig = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  // Check if user can test
  const canTest = await canTestEmail(auth.uid)
  if (!canTest) {
    throw new HttpsError('permission-denied', 'Only super admins and beta users can verify config')
  }

  const status = getEmailStatus()

  return {
    configured: status.anyAvailable,
    providers: status,
    message: status.anyAvailable
      ? `Email configured: ${status.ses.configured ? 'SES (primary)' : ''}${status.ses.configured && status.smtp.configured ? ' + ' : ''}${status.smtp.configured ? 'SMTP (fallback)' : ''}`
      : 'No email provider configured. Set AWS credentials or SMTP config.'
  }
})
