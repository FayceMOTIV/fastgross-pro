/**
 * useEmailAccounts - Hook pour la gestion des comptes email
 */

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../contexts/OrgContext'
import { db, functions } from '../lib/firebase'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getEffectiveLimit, ACCOUNT_QUOTAS, ACCOUNT_STATUS } from '../engine/config'

export function useEmailAccounts() {
  const { currentOrg } = useOrg()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger les comptes en temps reel
  useEffect(() => {
    if (!currentOrg?.id) {
      setAccounts([])
      setLoading(false)
      return
    }

    const accountsRef = collection(db, 'organizations', currentOrg.id, 'emailAccounts')
    const q = query(accountsRef, orderBy('connectedAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        effectiveLimit: getEffectiveLimit(doc.data())
      }))
      setAccounts(data)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching email accounts:', err)
      setError(err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Ajouter un compte SMTP
  const addSmtpAccount = useCallback(async (config) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const accountsRef = collection(db, 'organizations', currentOrg.id, 'emailAccounts')

    // Chiffrer les credentials (en base64 simple pour le dev)
    const credentials = btoa(JSON.stringify({
      host: config.host,
      port: config.port,
      user: config.user,
      pass: config.pass
    }))

    const newAccount = {
      type: 'smtp',
      email: config.user,
      displayName: config.displayName || config.user.split('@')[0],
      credentials,
      status: ACCOUNT_STATUS.WARMING_UP,
      dailyLimit: config.dailyLimit || ACCOUNT_QUOTAS.smtp.default,
      sentToday: 0,
      totalSent: 0,
      warmupDay: 1,
      reputation: 100,
      bounceCount: 0,
      bounceRate: 0,
      connectedAt: serverTimestamp(),
      lastUsedAt: null,
      lastError: null
    }

    const docRef = await addDoc(accountsRef, newAccount)
    return docRef.id
  }, [currentOrg?.id])

  // Ajouter un compte Gmail (OAuth)
  const addGmailAccount = useCallback(async (oauthData) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const accountsRef = collection(db, 'organizations', currentOrg.id, 'emailAccounts')

    const credentials = btoa(JSON.stringify({
      refreshToken: oauthData.refreshToken,
      accessToken: oauthData.accessToken
    }))

    const newAccount = {
      type: 'gmail',
      email: oauthData.email,
      displayName: oauthData.displayName || oauthData.email.split('@')[0],
      credentials,
      status: ACCOUNT_STATUS.WARMING_UP,
      dailyLimit: oauthData.isWorkspace ? ACCOUNT_QUOTAS.gmail.workspace : ACCOUNT_QUOTAS.gmail.free,
      isWorkspace: oauthData.isWorkspace || false,
      sentToday: 0,
      totalSent: 0,
      warmupDay: 1,
      reputation: 100,
      bounceCount: 0,
      bounceRate: 0,
      connectedAt: serverTimestamp(),
      lastUsedAt: null,
      lastError: null
    }

    const docRef = await addDoc(accountsRef, newAccount)
    return docRef.id
  }, [currentOrg?.id])

  // Ajouter un compte Outlook (OAuth)
  const addOutlookAccount = useCallback(async (oauthData) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const accountsRef = collection(db, 'organizations', currentOrg.id, 'emailAccounts')

    const credentials = btoa(JSON.stringify({
      refreshToken: oauthData.refreshToken,
      accessToken: oauthData.accessToken
    }))

    const newAccount = {
      type: 'outlook',
      email: oauthData.email,
      displayName: oauthData.displayName || oauthData.email.split('@')[0],
      credentials,
      status: ACCOUNT_STATUS.WARMING_UP,
      dailyLimit: oauthData.isBusiness ? ACCOUNT_QUOTAS.outlook.business : ACCOUNT_QUOTAS.outlook.free,
      isBusiness: oauthData.isBusiness || false,
      sentToday: 0,
      totalSent: 0,
      warmupDay: 1,
      reputation: 100,
      bounceCount: 0,
      bounceRate: 0,
      connectedAt: serverTimestamp(),
      lastUsedAt: null,
      lastError: null
    }

    const docRef = await addDoc(accountsRef, newAccount)
    return docRef.id
  }, [currentOrg?.id])

  // Tester une connexion SMTP
  const testSmtpConnection = useCallback(async (config) => {
    const testFn = httpsCallable(functions, 'testSmtpConnection')
    const result = await testFn(config)
    return result.data
  }, [])

  // Mettre a jour un compte
  const updateAccount = useCallback(async (accountId, updates) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const accountRef = doc(db, 'organizations', currentOrg.id, 'emailAccounts', accountId)
    await updateDoc(accountRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  }, [currentOrg?.id])

  // Supprimer un compte
  const deleteAccount = useCallback(async (accountId) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const accountRef = doc(db, 'organizations', currentOrg.id, 'emailAccounts', accountId)
    await deleteDoc(accountRef)
  }, [currentOrg?.id])

  // Mettre en pause / reactiver un compte
  const toggleAccountStatus = useCallback(async (accountId, currentStatus) => {
    const newStatus = currentStatus === ACCOUNT_STATUS.PAUSED
      ? ACCOUNT_STATUS.ACTIVE
      : ACCOUNT_STATUS.PAUSED

    await updateAccount(accountId, { status: newStatus })
  }, [updateAccount])

  // Calculer les stats globales
  const stats = {
    totalAccounts: accounts.length,
    activeCount: accounts.filter(a => a.status === ACCOUNT_STATUS.ACTIVE || a.status === ACCOUNT_STATUS.WARMING_UP).length,
    pausedCount: accounts.filter(a => a.status === ACCOUNT_STATUS.PAUSED).length,
    totalCapacity: accounts.reduce((sum, a) => sum + (a.effectiveLimit || 0), 0),
    totalSentToday: accounts.reduce((sum, a) => sum + (a.sentToday || 0), 0),
    get remainingCapacity() {
      return this.totalCapacity - this.totalSentToday
    }
  }

  return {
    accounts,
    loading,
    error,
    stats,
    addSmtpAccount,
    addGmailAccount,
    addOutlookAccount,
    testSmtpConnection,
    updateAccount,
    deleteAccount,
    toggleAccountStatus
  }
}

export default useEmailAccounts
