/**
 * EmailAccountManager - Gestion multi-comptes email avec rotation
 * Supporte Gmail OAuth2, Outlook OAuth2, et SMTP personnalise
 */

import { db } from '../lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { ACCOUNT_QUOTAS, ACCOUNT_STATUS, ACCOUNT_TYPES, getEffectiveLimit } from './config'

/**
 * Recuperer tous les comptes email d'une organisation
 */
export const getEmailAccounts = async (orgId) => {
  const accountsRef = collection(db, 'organizations', orgId, 'emailAccounts')
  const q = query(accountsRef, orderBy('connectedAt', 'desc'))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Recuperer un compte email specifique
 */
export const getEmailAccount = async (orgId, accountId) => {
  const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', accountId)
  const snapshot = await getDoc(accountRef)

  if (!snapshot.exists()) {
    throw new Error('Compte email non trouve')
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

/**
 * Recuperer les comptes actifs d'une organisation
 */
export const getActiveAccounts = async (orgId) => {
  const accountsRef = collection(db, 'organizations', orgId, 'emailAccounts')
  const q = query(
    accountsRef,
    where('status', 'in', [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.WARMING_UP])
  )
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Ajouter un nouveau compte email
 */
export const addEmailAccount = async (orgId, accountData) => {
  const accountsRef = collection(db, 'organizations', orgId, 'emailAccounts')

  // Determiner le quota par defaut selon le type
  let dailyLimit = ACCOUNT_QUOTAS.smtp.default
  if (accountData.type === ACCOUNT_TYPES.GMAIL) {
    dailyLimit = accountData.isWorkspace
      ? ACCOUNT_QUOTAS.gmail.workspace
      : ACCOUNT_QUOTAS.gmail.free
  } else if (accountData.type === ACCOUNT_TYPES.OUTLOOK) {
    dailyLimit = accountData.isBusiness
      ? ACCOUNT_QUOTAS.outlook.business
      : ACCOUNT_QUOTAS.outlook.free
  }

  const newAccount = {
    type: accountData.type,
    email: accountData.email,
    displayName: accountData.displayName || accountData.email.split('@')[0],
    credentials: accountData.credentials, // Doit etre chiffre cote serveur
    status: ACCOUNT_STATUS.WARMING_UP,
    dailyLimit,
    sentToday: 0,
    totalSent: 0,
    warmupDay: 1,
    reputation: 100,
    bounceCount: 0,
    bounceRate: 0,
    connectedAt: serverTimestamp(),
    lastUsedAt: null,
    lastError: null,
    // Metadata additionnelle
    isWorkspace: accountData.isWorkspace || false,
    isBusiness: accountData.isBusiness || false,
  }

  const docRef = await addDoc(accountsRef, newAccount)
  return docRef.id
}

/**
 * Mettre a jour un compte email
 */
export const updateEmailAccount = async (orgId, accountId, updates) => {
  const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', accountId)
  await updateDoc(accountRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Supprimer un compte email
 */
export const deleteEmailAccount = async (orgId, accountId) => {
  const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', accountId)
  await deleteDoc(accountRef)
}

/**
 * Incrementer le compteur d'envois du jour
 */
export const incrementSentToday = async (orgId, accountId) => {
  const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', accountId)
  await updateDoc(accountRef, {
    sentToday: increment(1),
    totalSent: increment(1),
    lastUsedAt: serverTimestamp(),
  })
}

/**
 * Reinitialiser les compteurs quotidiens (appele par le cron)
 */
export const resetDailyCounters = async (orgId) => {
  const accounts = await getEmailAccounts(orgId)

  const promises = accounts.map((account) => {
    const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', account.id)
    return updateDoc(accountRef, {
      sentToday: 0,
    })
  })

  await Promise.all(promises)
}

/**
 * Incrementer le jour de warmup (appele par le cron)
 */
export const incrementWarmupDays = async (orgId) => {
  const accounts = await getEmailAccounts(orgId)

  const promises = accounts
    .filter((a) => a.status === ACCOUNT_STATUS.WARMING_UP)
    .map((account) => {
      const accountRef = doc(db, 'organizations', orgId, 'emailAccounts', account.id)
      const newWarmupDay = (account.warmupDay || 1) + 1

      // Passer en actif apres 30 jours de warmup
      const updates = {
        warmupDay: newWarmupDay,
        ...(newWarmupDay > 30 && { status: ACCOUNT_STATUS.ACTIVE }),
      }

      return updateDoc(accountRef, updates)
    })

  await Promise.all(promises)
}

/**
 * Mettre en pause un compte (ex: trop de bounces)
 */
export const pauseAccount = async (orgId, accountId, reason) => {
  await updateEmailAccount(orgId, accountId, {
    status: ACCOUNT_STATUS.PAUSED,
    lastError: reason,
    pausedAt: serverTimestamp(),
  })
}

/**
 * Reactiver un compte
 */
export const activateAccount = async (orgId, accountId) => {
  const account = await getEmailAccount(orgId, accountId)

  await updateEmailAccount(orgId, accountId, {
    status: account.warmupDay > 30 ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.WARMING_UP,
    lastError: null,
  })
}

/**
 * Mettre a jour les stats de bounce
 */
export const updateBounceStats = async (orgId, accountId) => {
  const account = await getEmailAccount(orgId, accountId)
  const newBounceCount = (account.bounceCount || 0) + 1
  const newBounceRate = newBounceCount / Math.max(account.totalSent, 1)

  await updateEmailAccount(orgId, accountId, {
    bounceCount: newBounceCount,
    bounceRate: newBounceRate,
  })

  return newBounceRate
}

/**
 * Obtenir le prochain compte disponible pour l'envoi (rotation round-robin)
 */
export const getNextSendingAccount = async (orgId) => {
  // 1. Recuperer tous les comptes actifs
  const accounts = await getActiveAccounts(orgId)

  if (accounts.length === 0) {
    throw new Error('Aucun compte email actif.')
  }

  // 2. Filtrer ceux qui n'ont pas atteint leur quota du jour
  const available = accounts.filter((account) => {
    const effectiveLimit = getEffectiveLimit(account)
    return account.sentToday < effectiveLimit
  })

  if (available.length === 0) {
    throw new Error('Quota quotidien atteint sur tous les comptes.')
  }

  // 3. Round-robin : celui qui a le moins envoye
  available.sort((a, b) => a.sentToday - b.sentToday)

  return available[0]
}

/**
 * Verifier si un compte peut envoyer
 */
export const canAccountSend = (account) => {
  if (account.status === ACCOUNT_STATUS.PAUSED || account.status === ACCOUNT_STATUS.ERROR) {
    return { canSend: false, reason: 'account_paused' }
  }

  const effectiveLimit = getEffectiveLimit(account)
  if (account.sentToday >= effectiveLimit) {
    return { canSend: false, reason: 'quota_reached' }
  }

  if (account.bounceRate > 0.05) {
    return { canSend: false, reason: 'high_bounce_rate' }
  }

  return { canSend: true }
}

/**
 * Obtenir les statistiques globales des comptes
 */
export const getAccountsStats = async (orgId) => {
  const accounts = await getEmailAccounts(orgId)

  let totalCapacity = 0
  let totalSentToday = 0
  let activeCount = 0
  let warmingUpCount = 0
  let pausedCount = 0

  accounts.forEach((account) => {
    const effectiveLimit = getEffectiveLimit(account)
    totalCapacity += effectiveLimit
    totalSentToday += account.sentToday || 0

    if (account.status === ACCOUNT_STATUS.ACTIVE) activeCount++
    else if (account.status === ACCOUNT_STATUS.WARMING_UP) warmingUpCount++
    else if (account.status === ACCOUNT_STATUS.PAUSED) pausedCount++
  })

  return {
    totalAccounts: accounts.length,
    activeCount,
    warmingUpCount,
    pausedCount,
    totalCapacity,
    totalSentToday,
    remainingCapacity: totalCapacity - totalSentToday,
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      type: a.type,
      status: a.status,
      sentToday: a.sentToday,
      effectiveLimit: getEffectiveLimit(a),
      warmupDay: a.warmupDay,
      reputation: a.reputation,
    })),
  }
}

export default {
  getEmailAccounts,
  getEmailAccount,
  getActiveAccounts,
  addEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  incrementSentToday,
  resetDailyCounters,
  incrementWarmupDays,
  pauseAccount,
  activateAccount,
  updateBounceStats,
  getNextSendingAccount,
  canAccountSend,
  getAccountsStats,
}
