/**
 * Beta Users Management
 * CRUD operations for beta users (super admin only)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Check if user is a super admin
 */
async function isSuperAdmin(userId) {
  const doc = await getDb().collection('superAdmins').doc(userId).get()
  return doc.exists
}

/**
 * Cloud Function: Add a beta user
 */
export const addBetaUser = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Check if caller is super admin
    const isAdmin = await isSuperAdmin(auth.uid)
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only super admins can add beta users')
    }

    const { email, reason } = data

    if (!email) {
      throw new HttpsError('invalid-argument', 'Email is required')
    }

    // Find user by email
    const usersSnapshot = await getDb().collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      throw new HttpsError('not-found', `No user found with email: ${email}`)
    }

    const userDoc = usersSnapshot.docs[0]
    const userId = userDoc.id

    // Check if already beta user
    const existingBeta = await getDb().collection('betaUsers').doc(userId).get()
    if (existingBeta.exists) {
      throw new HttpsError('already-exists', 'User is already a beta user')
    }

    // Add as beta user
    await getDb().collection('betaUsers').doc(userId).set({
      email: email.toLowerCase(),
      addedBy: auth.uid,
      addedByEmail: auth.token.email,
      addedAt: FieldValue.serverTimestamp(),
      reason: reason || 'Added by super admin'
    })

    return {
      success: true,
      userId,
      email: email.toLowerCase(),
      message: `${email} added as beta user`
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: Remove a beta user
 */
export const removeBetaUser = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Check if caller is super admin
    const isAdmin = await isSuperAdmin(auth.uid)
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only super admins can remove beta users')
    }

    const { userId } = data

    if (!userId) {
      throw new HttpsError('invalid-argument', 'User ID is required')
    }

    // Check if user exists in beta users
    const betaDoc = await getDb().collection('betaUsers').doc(userId).get()
    if (!betaDoc.exists) {
      throw new HttpsError('not-found', 'User is not a beta user')
    }

    // Cannot remove self if you're the last super admin
    const superAdminsSnapshot = await getDb().collection('superAdmins').get()
    const superAdminDoc = await getDb().collection('superAdmins').doc(userId).get()

    if (superAdminDoc.exists && superAdminsSnapshot.size === 1) {
      throw new HttpsError('failed-precondition', 'Cannot remove the only super admin from beta')
    }

    // Remove beta user
    await getDb().collection('betaUsers').doc(userId).delete()

    return {
      success: true,
      userId,
      message: 'Beta user removed'
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: List all beta users
 */
export const listBetaUsers = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Check if caller is super admin
    const isAdmin = await isSuperAdmin(auth.uid)
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only super admins can list beta users')
    }

    // Get all beta users
    const snapshot = await getDb().collection('betaUsers').orderBy('addedAt', 'desc').get()

    const betaUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || null
    }))

    return {
      success: true,
      count: betaUsers.length,
      betaUsers
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: Check if a specific user is beta
 */
export const checkBetaStatus = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Can check own status or super admin can check anyone
    const targetUserId = data?.userId || auth.uid

    if (targetUserId !== auth.uid) {
      const isAdmin = await isSuperAdmin(auth.uid)
      if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Only super admins can check other users')
      }
    }

    const betaDoc = await getDb().collection('betaUsers').doc(targetUserId).get()

    return {
      isBetaUser: betaDoc.exists,
      data: betaDoc.exists ? {
        ...betaDoc.data(),
        addedAt: betaDoc.data().addedAt?.toDate?.()?.toISOString() || null
      } : null
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Cloud Function: List all super admins
 */
export const listSuperAdmins = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  try {
    // Check if caller is super admin
    const isAdmin = await isSuperAdmin(auth.uid)
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only super admins can list super admins')
    }

    // Get all super admins
    const snapshot = await getDb().collection('superAdmins').orderBy('createdAt', 'desc').get()

    const superAdmins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }))

    return {
      success: true,
      count: superAdmins.length,
      superAdmins
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})
