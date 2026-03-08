/**
 * Reseller Engine
 *
 * Logique metier pour le programme White-Label Reseller :
 * - Creation d'invitations reseller avec token securise (7 jours)
 * - Activation client via invite token
 * - Calcul des commissions (30% sur abonnements actifs)
 * - Branding white-label par reseller
 *
 * Exports: createResellerInvite, activateResellerClient, calculateResellerCommissions, getResellerBranding
 */

import crypto from 'crypto'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const INVITE_EXPIRY_DAYS = 7
const COMMISSION_RATE = 0.30

// ─── INVITE ─────────────────────────────────────────────────────────────────

/**
 * Cree une invitation reseller pour un client potentiel.
 * Genere un token unique, stocke dans Firestore avec expiration 7 jours.
 *
 * @param {string} resellerId - ID du reseller (doc ID dans collection resellers)
 * @param {string} clientEmail - Email du client a inviter
 * @returns {{ token: string, signupUrl: string, expiresAt: Date }}
 */
export async function createResellerInvite(resellerId, clientEmail) {
  const db = getDb()

  if (!resellerId || !clientEmail) {
    throw new Error('resellerId and clientEmail are required')
  }

  const normalizedEmail = clientEmail.toLowerCase().trim()

  // Verifier que le reseller existe et est actif
  const resellerDoc = await db.collection('resellers').doc(resellerId).get()
  if (!resellerDoc.exists) {
    throw new Error(`Reseller ${resellerId} not found`)
  }

  const resellerData = resellerDoc.data()
  if (resellerData.status !== 'active') {
    throw new Error(`Reseller ${resellerId} is not active (status: ${resellerData.status})`)
  }

  // Verifier qu'il n'y a pas deja une invite en cours pour cet email
  const existingInvite = await db
    .collection('resellerInvites')
    .where('resellerId', '==', resellerId)
    .where('clientEmail', '==', normalizedEmail)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (!existingInvite.empty) {
    const existing = existingInvite.docs[0].data()
    const now = new Date()
    if (existing.expiresAt.toDate() > now) {
      throw new Error(`An active invite already exists for ${normalizedEmail}`)
    }
    // Invite expiree — on la marque comme telle avant d'en creer une nouvelle
    await existingInvite.docs[0].ref.update({ status: 'expired' })
  }

  // Generer un token unique
  const token = crypto.randomUUID()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS)

  const inviteData = {
    token,
    resellerId,
    clientEmail: normalizedEmail,
    status: 'pending',
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  }

  await db.collection('resellerInvites').doc(token).set(inviteData)

  // URL de signup avec token
  const domain = resellerData.domain || 'face-media-factory.web.app'
  const signupUrl = `https://${domain}/signup?invite=${token}`

  console.log(JSON.stringify({
    event: 'reseller_invite_created',
    data: { resellerId, clientEmail: normalizedEmail, token, expiresAt: expiresAt.toISOString() },
    timestamp: Date.now(),
  }))

  return { token, signupUrl, expiresAt }
}

// ─── ACTIVATION ─────────────────────────────────────────────────────────────

/**
 * Active un client via un token d'invitation reseller.
 * Valide le token, lie le client au reseller, met a jour le profil user.
 *
 * @param {string} token - Token d'invitation
 * @param {string} userId - ID Firebase Auth de l'utilisateur qui active
 * @returns {{ success: boolean, resellerId: string, resellerName: string }}
 */
export async function activateResellerClient(token, userId) {
  const db = getDb()

  if (!token || !userId) {
    throw new Error('token and userId are required')
  }

  // Recuperer et valider l'invite
  const inviteDoc = await db.collection('resellerInvites').doc(token).get()
  if (!inviteDoc.exists) {
    throw new Error('Invalid invite token')
  }

  const invite = inviteDoc.data()

  if (invite.status !== 'pending') {
    throw new Error(`Invite already ${invite.status}`)
  }

  const now = new Date()
  if (invite.expiresAt.toDate() <= now) {
    await inviteDoc.ref.update({ status: 'expired' })
    throw new Error('Invite token has expired')
  }

  // Recuperer le reseller
  const resellerDoc = await db.collection('resellers').doc(invite.resellerId).get()
  if (!resellerDoc.exists) {
    throw new Error('Reseller no longer exists')
  }

  const resellerData = resellerDoc.data()

  // Transaction atomique pour activer le client
  await db.runTransaction(async (transaction) => {
    // 1. Marquer l'invite comme activee
    transaction.update(inviteDoc.ref, {
      status: 'activated',
      activatedBy: userId,
      activatedAt: FieldValue.serverTimestamp(),
    })

    // 2. Mettre a jour le user doc avec le resellerId
    const userRef = db.collection('users').doc(userId)
    transaction.update(userRef, {
      resellerId: invite.resellerId,
      resellerActivatedAt: FieldValue.serverTimestamp(),
    })

    // 3. Creer le client dans la sous-collection du reseller
    const clientRef = db
      .collection('resellers')
      .doc(invite.resellerId)
      .collection('clients')
      .doc(userId)

    transaction.set(clientRef, {
      userId,
      email: invite.clientEmail,
      status: 'active',
      subscriptionStatus: 'none',
      monthlyRevenue: 0,
      activatedAt: FieldValue.serverTimestamp(),
      inviteToken: token,
    })

    // 4. Incrementer le compteur de clients du reseller
    const resellerRef = db.collection('resellers').doc(invite.resellerId)
    transaction.update(resellerRef, {
      totalClients: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  console.log(JSON.stringify({
    event: 'reseller_client_activated',
    data: { resellerId: invite.resellerId, userId, clientEmail: invite.clientEmail },
    timestamp: Date.now(),
  }))

  return {
    success: true,
    resellerId: invite.resellerId,
    resellerName: resellerData.name || 'Partner',
  }
}

// ─── COMMISSIONS ────────────────────────────────────────────────────────────

/**
 * Calcule les commissions d'un reseller (30% sur abonnements actifs).
 * Itere sur tous les clients, verifie leur subscription, met a jour les stats.
 *
 * @param {string} resellerId - ID du reseller
 * @returns {{ totalClients: number, activeClients: number, totalMRR: number, commission: number, details: Array }}
 */
export async function calculateResellerCommissions(resellerId) {
  const db = getDb()

  if (!resellerId) {
    throw new Error('resellerId is required')
  }

  // Recuperer tous les clients du reseller
  const clientsSnap = await db
    .collection('resellers')
    .doc(resellerId)
    .collection('clients')
    .get()

  if (clientsSnap.empty) {
    return {
      totalClients: 0,
      activeClients: 0,
      totalMRR: 0,
      commission: 0,
      details: [],
    }
  }

  const details = []
  let totalMRR = 0
  let activeClients = 0

  for (const clientDoc of clientsSnap.docs) {
    const client = clientDoc.data()
    const userId = clientDoc.id

    // Chercher l'organisation de ce client pour recuperer la subscription
    const orgsSnap = await db
      .collection('organizations')
      .where('ownerId', '==', userId)
      .limit(1)
      .get()

    let subscriptionAmount = 0
    let planName = 'none'

    if (!orgsSnap.empty) {
      const orgData = orgsSnap.docs[0].data()
      const subscription = orgData.subscription || {}

      if (subscription.status === 'active' && subscription.monthlyAmount) {
        subscriptionAmount = subscription.monthlyAmount
        planName = subscription.plan || 'unknown'
        activeClients++
      }
    }

    totalMRR += subscriptionAmount

    details.push({
      userId,
      email: client.email,
      status: client.status,
      plan: planName,
      monthlyRevenue: subscriptionAmount,
      commission: Math.round(subscriptionAmount * COMMISSION_RATE * 100) / 100,
    })

    // Mettre a jour le client doc avec le revenu courant
    await clientDoc.ref.update({
      monthlyRevenue: subscriptionAmount,
      subscriptionStatus: subscriptionAmount > 0 ? 'active' : 'none',
      lastCalculatedAt: FieldValue.serverTimestamp(),
    })
  }

  const commission = Math.round(totalMRR * COMMISSION_RATE * 100) / 100

  // Mettre a jour les stats globales du reseller
  await db.collection('resellers').doc(resellerId).update({
    stats: {
      totalClients: clientsSnap.size,
      activeClients,
      totalMRR,
      commission,
      lastCalculatedAt: new Date().toISOString(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(JSON.stringify({
    event: 'reseller_commissions_calculated',
    data: { resellerId, totalClients: clientsSnap.size, activeClients, totalMRR, commission },
    timestamp: Date.now(),
  }))

  return {
    totalClients: clientsSnap.size,
    activeClients,
    totalMRR,
    commission,
    details,
  }
}

// ─── BRANDING ───────────────────────────────────────────────────────────────

/**
 * Retourne la configuration de branding white-label d'un reseller.
 *
 * @param {string} resellerId - ID du reseller
 * @returns {{ name: string, logo: string, primaryColor: string, domain: string }}
 */
export async function getResellerBranding(resellerId) {
  const db = getDb()

  if (!resellerId) {
    throw new Error('resellerId is required')
  }

  const resellerDoc = await db.collection('resellers').doc(resellerId).get()
  if (!resellerDoc.exists) {
    throw new Error(`Reseller ${resellerId} not found`)
  }

  const data = resellerDoc.data()
  const branding = data.branding || {}

  return {
    name: branding.name || data.name || 'Partner',
    logo: branding.logo || '',
    primaryColor: branding.primaryColor || '#4F6EF7',
    domain: branding.domain || data.domain || 'face-media-factory.web.app',
  }
}
