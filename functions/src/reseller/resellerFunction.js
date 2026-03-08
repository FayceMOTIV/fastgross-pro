/**
 * Reseller Cloud Functions
 *
 * 5 fonctions pour le programme White-Label Reseller :
 * - createReseller (onCall, admin only)
 * - inviteResellerClient (onCall, reseller authentifie)
 * - activateViaInvite (onCall, utilisateur authentifie)
 * - getResellerDashboard (onCall, reseller authentifie)
 * - monthlyResellerCommissions (onSchedule, 1er du mois a 06h00 Europe/Paris)
 *
 * Exports: createReseller, inviteResellerClient, activateViaInvite, getResellerDashboard, monthlyResellerCommissions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import {
  createResellerInvite,
  activateResellerClient,
  calculateResellerCommissions,
  getResellerBranding,
} from './resellerEngine.js'

const getDb = () => getFirestore()

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Verifie si l'utilisateur est un super admin via la collection superAdmins
 */
async function isSuperAdmin(userId) {
  const doc = await getDb().collection('superAdmins').doc(userId).get()
  return doc.exists
}

/**
 * Verifie si l'utilisateur est un reseller actif et retourne ses donnees
 */
async function getActiveReseller(userId) {
  const snapshot = await getDb()
    .collection('resellers')
    .where('ownerId', '==', userId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
}

// ─── 1. CREATE RESELLER (Admin Only) ────────────────────────────────────────

/**
 * Cree un nouveau reseller. Reserve aux super admins.
 *
 * Input: { name, email, ownerId, domain?, branding?: { logo, primaryColor } }
 * Output: { success, resellerId }
 */
export const createReseller = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  try {
    // Verifier les droits admin
    const isAdmin = await isSuperAdmin(auth.uid)
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Seuls les super admins peuvent creer des resellers')
    }

    const { name, email, ownerId, domain, branding } = data

    if (!name || !email || !ownerId) {
      throw new HttpsError('invalid-argument', 'name, email et ownerId sont requis')
    }

    const db = getDb()

    // Verifier que le ownerId n'est pas deja reseller
    const existingReseller = await db
      .collection('resellers')
      .where('ownerId', '==', ownerId)
      .limit(1)
      .get()

    if (!existingReseller.empty) {
      throw new HttpsError('already-exists', `L'utilisateur ${ownerId} est deja reseller`)
    }

    // Creer le reseller doc
    const resellerData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      ownerId,
      status: 'active',
      domain: domain || null,
      branding: {
        name: branding?.name || name.trim(),
        logo: branding?.logo || '',
        primaryColor: branding?.primaryColor || '#4F6EF7',
        domain: domain || null,
      },
      totalClients: 0,
      stats: {
        totalClients: 0,
        activeClients: 0,
        totalMRR: 0,
        commission: 0,
        lastCalculatedAt: null,
      },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }

    const resellerRef = await db.collection('resellers').add(resellerData)

    // Marquer l'utilisateur comme reseller
    await db.collection('users').doc(ownerId).update({
      isReseller: true,
      resellerId: resellerRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(JSON.stringify({
      event: 'reseller_created',
      data: { resellerId: resellerRef.id, name, ownerId, createdBy: auth.uid },
      timestamp: Date.now(),
    }))

    return { success: true, resellerId: resellerRef.id }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('createReseller error:', error)
    throw new HttpsError('internal', 'Erreur lors de la creation du reseller')
  }
})

// ─── 2. INVITE RESELLER CLIENT ──────────────────────────────────────────────

/**
 * Cree une invitation pour un client potentiel. Reserve aux resellers actifs.
 *
 * Input: { clientEmail }
 * Output: { token, signupUrl, expiresAt }
 */
export const inviteResellerClient = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  try {
    // Verifier que le caller est un reseller actif
    const reseller = await getActiveReseller(auth.uid)
    if (!reseller) {
      throw new HttpsError('permission-denied', 'Seuls les resellers actifs peuvent inviter des clients')
    }

    const { clientEmail } = data

    if (!clientEmail) {
      throw new HttpsError('invalid-argument', 'clientEmail est requis')
    }

    const result = await createResellerInvite(reseller.id, clientEmail)

    return result
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('inviteResellerClient error:', error)
    throw new HttpsError('internal', error.message || 'Erreur lors de la creation de l\'invitation')
  }
})

// ─── 3. ACTIVATE VIA INVITE ────────────────────────────────────────────────

/**
 * Active un utilisateur en tant que client reseller via un token d'invitation.
 *
 * Input: { token }
 * Output: { success, resellerId, resellerName }
 */
export const activateViaInvite = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  try {
    const { token } = data

    if (!token) {
      throw new HttpsError('invalid-argument', 'token est requis')
    }

    const result = await activateResellerClient(token, auth.uid)

    return result
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('activateViaInvite error:', error)
    throw new HttpsError('internal', error.message || 'Erreur lors de l\'activation')
  }
})

// ─── 4. GET RESELLER DASHBOARD ──────────────────────────────────────────────

/**
 * Retourne le dashboard reseller avec stats de commissions et branding.
 *
 * Input: {} (resellerId derive de l'utilisateur authentifie)
 * Output: { reseller, branding, commissions }
 */
export const getResellerDashboard = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  try {
    // Verifier que le caller est un reseller actif
    const reseller = await getActiveReseller(auth.uid)
    if (!reseller) {
      throw new HttpsError('permission-denied', 'Acces reserve aux resellers')
    }

    // Recuperer commissions et branding en parallele
    const [commissions, branding] = await Promise.all([
      calculateResellerCommissions(reseller.id),
      getResellerBranding(reseller.id),
    ])

    return {
      reseller: {
        id: reseller.id,
        name: reseller.name,
        email: reseller.email,
        status: reseller.status,
        createdAt: reseller.createdAt,
      },
      branding,
      commissions,
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    console.error('getResellerDashboard error:', error)
    throw new HttpsError('internal', 'Erreur lors du chargement du dashboard reseller')
  }
})

// ─── 5. MONTHLY RESELLER COMMISSIONS (Scheduled) ───────────────────────────

/**
 * Calcule les commissions mensuelles de tous les resellers actifs.
 * Execute le 1er du mois a 06h00 Europe/Paris.
 */
export const monthlyResellerCommissions = onSchedule({
  schedule: '0 6 1 * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  const db = getDb()

  console.log(JSON.stringify({
    event: 'monthly_reseller_commissions_start',
    timestamp: Date.now(),
  }))

  try {
    // Recuperer tous les resellers actifs
    const resellersSnap = await db
      .collection('resellers')
      .where('status', '==', 'active')
      .get()

    if (resellersSnap.empty) {
      console.log(JSON.stringify({
        event: 'monthly_reseller_commissions_skip',
        data: { reason: 'no_active_resellers' },
        timestamp: Date.now(),
      }))
      return
    }

    const results = []

    for (const resellerDoc of resellersSnap.docs) {
      const resellerId = resellerDoc.id
      const resellerData = resellerDoc.data()

      try {
        const commissions = await calculateResellerCommissions(resellerId)

        // Sauvegarder le rapport mensuel
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        await db
          .collection('resellers')
          .doc(resellerId)
          .collection('monthlyReports')
          .doc(monthKey)
          .set({
            ...commissions,
            monthKey,
            calculatedAt: FieldValue.serverTimestamp(),
          })

        results.push({
          resellerId,
          name: resellerData.name,
          status: 'success',
          commission: commissions.commission,
          activeClients: commissions.activeClients,
        })
      } catch (error) {
        console.error(`Commission calculation failed for reseller ${resellerId}:`, error)
        results.push({
          resellerId,
          name: resellerData.name,
          status: 'error',
          error: error.message,
        })
      }
    }

    console.log(JSON.stringify({
      event: 'monthly_reseller_commissions_complete',
      data: {
        totalResellers: resellersSnap.size,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        totalCommissions: results
          .filter(r => r.status === 'success')
          .reduce((sum, r) => sum + r.commission, 0),
      },
      timestamp: Date.now(),
    }))
  } catch (error) {
    console.error('monthlyResellerCommissions global error:', error)
    throw error
  }
})
