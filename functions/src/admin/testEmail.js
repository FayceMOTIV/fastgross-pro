/**
 * Test Email Functions
 * Send test emails via Resend to verify configuration
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'

const db = getFirestore()
const resendApiKey = defineSecret('RESEND_API_KEY')

/**
 * Check if user is a super admin or beta user
 */
async function canTestEmail(userId) {
  const superAdminDoc = await db.collection('superAdmins').doc(userId).get()
  if (superAdminDoc.exists) return true

  const betaUserDoc = await db.collection('betaUsers').doc(userId).get()
  return betaUserDoc.exists
}

/**
 * Cloud Function: Send a test email via Resend
 */
export const sendTestEmail = onCall({
  region: 'europe-west1',
  cors: true,
  secrets: [resendApiKey]
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

  const apiKey = resendApiKey.value()

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Resend API key not configured')
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName || 'Face Media Factory'} <noreply@facemediafactory.com>`,
        to: [to],
        subject: emailSubject,
        html: emailContent
      })
    })

    const result = await response.json()

    if (!response.ok) {
      // Log the error
      await db.collection('emailTestLogs').add({
        userId: auth.uid,
        userEmail: auth.token.email,
        to,
        subject: emailSubject,
        success: false,
        error: result,
        timestamp: FieldValue.serverTimestamp()
      })

      throw new HttpsError('internal', result.message || 'Failed to send email')
    }

    // Log successful test
    await db.collection('emailTestLogs').add({
      userId: auth.uid,
      userEmail: auth.token.email,
      to,
      subject: emailSubject,
      success: true,
      resendId: result.id,
      timestamp: FieldValue.serverTimestamp()
    })

    return {
      success: true,
      id: result.id,
      message: `Test email sent to ${to}`
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error
    }

    // Log the error
    await db.collection('emailTestLogs').add({
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

  // Only super admins can view all logs
  const superAdminDoc = await db.collection('superAdmins').doc(auth.uid).get()
  const isSuperAdmin = superAdminDoc.exists

  // Build query
  let query = db.collection('emailTestLogs')
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
})

/**
 * Cloud Function: Verify Resend configuration
 */
export const verifyResendConfig = onCall({
  region: 'europe-west1',
  cors: true,
  secrets: [resendApiKey]
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

  const apiKey = resendApiKey.value()

  if (!apiKey) {
    return {
      configured: false,
      message: 'Resend API key not set'
    }
  }

  try {
    // Verify API key by fetching domains
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        configured: false,
        message: 'Invalid API key',
        error: result.message
      }
    }

    return {
      configured: true,
      domains: result.data?.map(d => ({
        name: d.name,
        status: d.status,
        created: d.created_at
      })) || [],
      message: 'Resend is configured correctly'
    }
  } catch (error) {
    return {
      configured: false,
      message: `Connection error: ${error.message}`
    }
  }
})
