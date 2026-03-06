/**
 * Auto Super Admin
 * First user to sign up becomes super admin automatically
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Check if there are any super admins in the system
 */
async function hasSuperAdmins() {
  const snapshot = await getDb().collection('superAdmins').limit(1).get()
  return !snapshot.empty
}

/**
 * Make user a super admin
 */
async function makeSuperAdmin(userId, email) {
  await getDb().collection('superAdmins').doc(userId).set({
    email,
    createdAt: FieldValue.serverTimestamp(),
    isFirstUser: true
  })
}

/**
 * Cloud Function: Check and promote first user to super admin
 * Called after user signup to check if they should be promoted
 */
export const checkFirstUser = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    const userId = auth.uid
    const email = auth.token.email

    // Check if super admins exist
    const hasAdmins = await hasSuperAdmins()

    if (!hasAdmins) {
      // First user - make them super admin
      await makeSuperAdmin(userId, email)

      // Also add them as beta user for unlimited quotas
      await getDb().collection('betaUsers').doc(userId).set({
        email,
        addedBy: 'system',
        addedAt: FieldValue.serverTimestamp(),
        reason: 'First user - auto super admin'
      })

      return {
        success: true,
        isSuperAdmin: true,
        isBetaUser: true,
        message: 'You are the first user - promoted to super admin with beta access'
      }
    }

    // Check if already super admin
    const superAdminDoc = await getDb().collection('superAdmins').doc(userId).get()
    const isSuperAdmin = superAdminDoc.exists

    // Check if beta user
    const betaUserDoc = await getDb().collection('betaUsers').doc(userId).get()
    const isBetaUser = betaUserDoc.exists

    return {
      success: true,
      isSuperAdmin,
      isBetaUser,
      message: 'User status checked'
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: Get current user's admin status
 */
export const getAdminStatus = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    const userId = auth.uid

    // Check super admin status
    const superAdminDoc = await getDb().collection('superAdmins').doc(userId).get()
    const isSuperAdmin = superAdminDoc.exists

    // Check beta user status
    const betaUserDoc = await getDb().collection('betaUsers').doc(userId).get()
    const isBetaUser = betaUserDoc.exists

    return {
      isSuperAdmin,
      isBetaUser,
      superAdminData: isSuperAdmin ? superAdminDoc.data() : null,
      betaUserData: isBetaUser ? betaUserDoc.data() : null
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})
