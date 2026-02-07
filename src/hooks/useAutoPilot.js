/**
 * useAutoPilot - Hook pour le moteur de prospection autonome
 */

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../contexts/OrgContext'
import { db, functions } from '../lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { PROSPECT_STATUS } from '../engine/config'

export function useAutoPilot() {
  const { currentOrg } = useOrg()
  const [config, setConfig] = useState(null)
  const [prospects, setProspects] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  // Charger la configuration autopilot
  useEffect(() => {
    if (!currentOrg?.id) {
      setConfig(null)
      setLoading(false)
      return
    }

    const configRef = doc(db, 'organizations', currentOrg.id, 'autopilotConfig', 'settings')

    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ id: snapshot.id, ...snapshot.data() })
      } else {
        setConfig(null)
      }
      setLoading(false)
    }, (err) => {
      console.error('Error fetching autopilot config:', err)
      setError(err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Charger les prospects recents
  useEffect(() => {
    if (!currentOrg?.id) {
      setProspects([])
      return
    }

    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')
    const q = query(
      prospectsRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setProspects(data)

      // Calculer les stats
      const newStats = {
        total: data.length,
        byStatus: {},
        avgScore: 0,
        emailExtractionRate: 0
      }

      Object.values(PROSPECT_STATUS).forEach(status => {
        newStats.byStatus[status] = data.filter(p => p.status === status).length
      })

      const scoredProspects = data.filter(p => p.score > 0)
      if (scoredProspects.length > 0) {
        newStats.avgScore = Math.round(
          scoredProspects.reduce((sum, p) => sum + p.score, 0) / scoredProspects.length
        )
      }

      const scrapedCount = data.filter(p => p.status !== PROSPECT_STATUS.FOUND).length
      const withEmailCount = data.filter(p => p.emails?.length > 0).length
      if (scrapedCount > 0) {
        newStats.emailExtractionRate = Math.round((withEmailCount / scrapedCount) * 100)
      }

      setStats(newStats)
    })

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Charger les logs recents
  useEffect(() => {
    if (!currentOrg?.id) {
      setLogs([])
      return
    }

    const logsRef = collection(db, 'organizations', currentOrg.id, 'autopilotLogs')
    const q = query(logsRef, orderBy('runAt', 'desc'), limit(20))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setLogs(data)
    })

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Sauvegarder la configuration
  const saveConfig = useCallback(async (newConfig) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const configRef = doc(db, 'organizations', currentOrg.id, 'autopilotConfig', 'settings')
    await setDoc(configRef, {
      ...newConfig,
      updatedAt: serverTimestamp()
    }, { merge: true })
  }, [currentOrg?.id])

  // Activer/desactiver l'autopilot
  const toggleAutoPilot = useCallback(async (enabled) => {
    await saveConfig({ enabled })
  }, [saveConfig])

  // Executer manuellement le pipeline
  const runManual = useCallback(async () => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    setRunning(true)
    setError(null)

    try {
      const runFn = httpsCallable(functions, 'runAutoPilotManual')
      const result = await runFn({ orgId: currentOrg.id })
      return result.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setRunning(false)
    }
  }, [currentOrg?.id])

  // Envoyer un email a un prospect
  const sendProspectEmail = useCallback(async (prospectId, accountId) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    // Recuperer le prospect
    const prospectRef = doc(db, 'organizations', currentOrg.id, 'prospects', prospectId)
    const prospectSnap = await getDoc(prospectRef)

    if (!prospectSnap.exists()) {
      throw new Error('Prospect non trouve')
    }

    const prospect = prospectSnap.data()

    if (!prospect.generatedEmail?.subject || !prospect.emails?.[0]) {
      throw new Error('Email non genere pour ce prospect')
    }

    const sendFn = httpsCallable(functions, 'sendProspectEmail')
    const result = await sendFn({
      emailData: {
        to: prospect.emails[0],
        subject: prospect.generatedEmail.subject,
        body: prospect.generatedEmail.body
      },
      accountId,
      prospectId,
      orgId: currentOrg.id
    })

    return result.data
  }, [currentOrg?.id])

  // Obtenir les prospects par statut
  const getProspectsByStatus = useCallback((status) => {
    return prospects.filter(p => p.status === status)
  }, [prospects])

  // Obtenir les prospects prets a envoyer
  const getReadyProspects = useCallback(() => {
    return prospects
      .filter(p => p.status === PROSPECT_STATUS.READY || p.status === PROSPECT_STATUS.SCORED)
      .filter(p => p.emails?.length > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [prospects])

  // Mettre a jour le statut d'un prospect
  const updateProspectStatus = useCallback(async (prospectId, status) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    const prospectRef = doc(db, 'organizations', currentOrg.id, 'prospects', prospectId)
    await updateDoc(prospectRef, {
      status,
      updatedAt: serverTimestamp()
    })
  }, [currentOrg?.id])

  // Supprimer un prospect de la file
  const removeProspect = useCallback(async (prospectId) => {
    await updateProspectStatus(prospectId, 'removed')
  }, [updateProspectStatus])

  return {
    config,
    prospects,
    logs,
    stats,
    loading,
    running,
    error,
    saveConfig,
    toggleAutoPilot,
    runManual,
    sendProspectEmail,
    getProspectsByStatus,
    getReadyProspects,
    updateProspectStatus,
    removeProspect
  }
}

export default useAutoPilot
