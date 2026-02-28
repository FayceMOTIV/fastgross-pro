/**
 * useSocialOutreach.js
 * Hooks pour la page Social Outreach unifiee (Instagram DM + WhatsApp)
 *
 * Encapsule :
 * - Gestion comptes Instagram (CRUD via cloud functions)
 * - Stats DM Instagram + WhatsApp
 * - Stats sourcing (Hunter)
 * - Ecoute realtime des reponses / interactions
 * - Envois manuels DM + WhatsApp
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/hooks/useDemo'

// ============================================
// Mock data pour demo mode
// ============================================

const MOCK_INSTAGRAM_ACCOUNTS = [
  {
    id: 'acc_1',
    username: 'prospection_agency',
    status: 'active',
    dailySent: 18,
    dailyLimit: 30,
    hourlySent: 2,
    hourlyLimit: 4,
    totalSent: 342,
    totalReplies: 89,
    warmupDay: 22,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 22).toISOString(),
  },
  {
    id: 'acc_2',
    username: 'growth_hunter_fr',
    status: 'active',
    dailySent: 25,
    dailyLimit: 30,
    hourlySent: 3,
    hourlyLimit: 4,
    totalSent: 567,
    totalReplies: 134,
    warmupDay: 30,
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'acc_3',
    username: 'business_connect_pro',
    status: 'paused',
    dailySent: 0,
    dailyLimit: 30,
    hourlySent: 0,
    hourlyLimit: 4,
    totalSent: 156,
    totalReplies: 38,
    warmupDay: 15,
    lastActivity: new Date(Date.now() - 86400000 * 2).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
]

const MOCK_DM_STATS = {
  instagram: {
    sentToday: 43,
    sentThisWeek: 186,
    totalSent: 1065,
    repliedCount: 261,
    responseRate: 24.5,
    activeAccounts: 2,
    totalAccounts: 3,
    nextExecution: new Date(Date.now() + 1800000).toISOString(),
  },
  whatsapp: {
    sentToday: 8,
    sentThisWeek: 42,
    totalSent: 312,
    repliedCount: 94,
    responseRate: 30.1,
    activeInstances: 1,
    instanceHealthy: true,
    nextExecution: new Date(Date.now() + 3600000).toISOString(),
  },
}

const MOCK_SOURCING_STATS = {
  instagram: { scanned: 1245, qualified: 487, saved: 312, lastRun: new Date(Date.now() - 7200000).toISOString() },
  tiktok: { scanned: 856, qualified: 248, saved: 185, lastRun: new Date(Date.now() - 14400000).toISOString() },
  facebook: { scanned: 389, qualified: 134, saved: 98, lastRun: new Date(Date.now() - 21600000).toISOString() },
}

const MOCK_PROSPECTS = [
  {
    id: 'p1',
    username: 'entrepreneur_paris',
    fullName: 'Marie Dupont',
    platform: 'instagram',
    score: 92,
    dmStatus: 'replied',
    email: 'marie@example.com',
    phone: '+33612345678',
    whatsappActive: true,
    whatsappStatus: 'contacted',
    followers: 12500,
    niche: 'ecommerce',
    scrapedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    contactedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'p2',
    username: 'coach_business_fr',
    fullName: 'Thomas Martin',
    platform: 'instagram',
    score: 88,
    dmStatus: 'contacted',
    email: null,
    phone: '+33698765432',
    whatsappActive: true,
    whatsappStatus: 'verified',
    followers: 8900,
    niche: 'agence_marketing',
    scrapedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    contactedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'p3',
    username: 'agence_web_lyon',
    fullName: 'Sophie Leroy',
    platform: 'instagram',
    score: 75,
    dmStatus: 'new',
    email: 'sophie@agence-lyon.fr',
    phone: null,
    whatsappActive: false,
    whatsappStatus: null,
    followers: 5400,
    niche: 'agence_marketing',
    scrapedAt: new Date(Date.now() - 86400000).toISOString(),
    contactedAt: null,
  },
  {
    id: 'p4',
    username: 'resto_gastro_paris',
    fullName: 'Pierre Bernard',
    platform: 'instagram',
    score: 82,
    dmStatus: 'converted',
    email: 'contact@restogastro.fr',
    phone: '+33654321098',
    whatsappActive: true,
    whatsappStatus: 'replied',
    followers: 15200,
    niche: 'restauration',
    scrapedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    contactedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'p5',
    username: 'beaute_salon_75',
    fullName: 'Camille Petit',
    platform: 'tiktok',
    score: 71,
    dmStatus: 'new',
    email: null,
    phone: '+33676543210',
    whatsappActive: true,
    whatsappStatus: 'verified',
    followers: 3200,
    niche: 'coiffeur',
    scrapedAt: new Date(Date.now() - 43200000).toISOString(),
    contactedAt: null,
  },
]

const MOCK_REPLIES = [
  {
    id: 'r1',
    prospectId: 'p1',
    prospectName: 'Marie Dupont',
    prospectUsername: 'entrepreneur_paris',
    channel: 'instagram',
    message: 'Bonjour ! Oui je suis interessee, on peut en discuter ?',
    receivedAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'unread',
    sentiment: 'positive',
  },
  {
    id: 'r2',
    prospectId: 'p4',
    prospectName: 'Pierre Bernard',
    prospectUsername: 'resto_gastro_paris',
    channel: 'whatsapp',
    message: 'Merci pour le message, envoyez-moi plus de details svp',
    receivedAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'read',
    sentiment: 'positive',
  },
  {
    id: 'r3',
    prospectId: 'p2',
    prospectName: 'Thomas Martin',
    prospectUsername: 'coach_business_fr',
    channel: 'instagram',
    message: "Non merci, pas interesse pour l'instant",
    receivedAt: new Date(Date.now() - 14400000).toISOString(),
    status: 'read',
    sentiment: 'negative',
  },
]

// ============================================
// Hook: Instagram Accounts Management
// ============================================

export function useInstagramAccounts(orgId) {
  const { isDemo } = useDemo()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    if (!orgId || isDemo) {
      setAccounts(MOCK_INSTAGRAM_ACCOUNTS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'listInstagramAccounts')
      const result = await fn({ orgId })
      setAccounts(result.data?.accounts || [])
    } catch (err) {
      console.error('Error fetching Instagram accounts:', err)
      setError(err)
      // Fallback to Firestore direct read
      try {
        const snap = await getDocs(
          collection(db, 'organizations', orgId, 'instagramAccounts')
        )
        setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (fbErr) {
        console.error('Firestore fallback failed:', fbErr)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = useCallback(async (username, password) => {
    if (isDemo) {
      const newAcc = {
        id: `acc_${Date.now()}`,
        username,
        status: 'warming_up',
        dailySent: 0,
        dailyLimit: 3,
        hourlySent: 0,
        hourlyLimit: 1,
        totalSent: 0,
        totalReplies: 0,
        warmupDay: 1,
        lastActivity: null,
        addedAt: new Date().toISOString(),
      }
      setAccounts(prev => [...prev, newAcc])
      return newAcc
    }

    const fn = httpsCallable(functions, 'addInstagramAccount')
    const result = await fn({ orgId, username, password })
    await fetchAccounts()
    return result.data
  }, [orgId, isDemo, fetchAccounts])

  const removeAccount = useCallback(async (accountId) => {
    if (isDemo) {
      setAccounts(prev => prev.filter(a => a.id !== accountId))
      return
    }

    const fn = httpsCallable(functions, 'removeInstagramAccount')
    await fn({ orgId, accountId })
    await fetchAccounts()
  }, [orgId, isDemo, fetchAccounts])

  const toggleStatus = useCallback(async (accountId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'

    if (isDemo) {
      setAccounts(prev =>
        prev.map(a => a.id === accountId ? { ...a, status: newStatus } : a)
      )
      return
    }

    const fn = httpsCallable(functions, 'updateAccountStatus')
    await fn({ orgId, accountId, status: newStatus })
    await fetchAccounts()
  }, [orgId, isDemo, fetchAccounts])

  const activeCount = useMemo(
    () => accounts.filter(a => a.status === 'active').length,
    [accounts]
  )

  const totalDailySent = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.dailySent || 0), 0),
    [accounts]
  )

  const totalDailyCapacity = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.dailyLimit || 0), 0),
    [accounts]
  )

  return {
    accounts,
    loading,
    error,
    addAccount,
    removeAccount,
    toggleStatus,
    refresh: fetchAccounts,
    activeCount,
    totalDailySent,
    totalDailyCapacity,
  }
}

// ============================================
// Hook: Instagram DM Stats
// ============================================

export function useInstagramDMStats(orgId) {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!orgId || isDemo) {
      setStats(MOCK_DM_STATS.instagram)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getDMStats')
      const result = await fn({ orgId })
      setStats(result.data)
    } catch (err) {
      console.error('Error fetching DM stats:', err)
      // Fallback: build stats from Firestore
      try {
        const today = new Date().toISOString().split('T')[0]
        const statsDoc = await getDoc(
          doc(db, 'organizations', orgId, 'dmStats', today)
        )
        if (statsDoc.exists()) {
          setStats(statsDoc.data())
        }
      } catch (fbErr) {
        console.error('DM stats fallback failed:', fbErr)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}

// ============================================
// Hook: WhatsApp Stats
// ============================================

export function useWhatsAppStats(orgId) {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!orgId || isDemo) {
      setStats(MOCK_DM_STATS.whatsapp)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getWhatsAppStats')
      const result = await fn({ orgId })
      setStats(result.data)
    } catch (err) {
      console.error('Error fetching WhatsApp stats:', err)
      try {
        const today = new Date().toISOString().split('T')[0]
        const statsDoc = await getDoc(
          doc(db, 'organizations', orgId, 'whatsappStats', today)
        )
        if (statsDoc.exists()) {
          setStats(statsDoc.data())
        }
      } catch (fbErr) {
        console.error('WhatsApp stats fallback failed:', fbErr)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}

// ============================================
// Hook: Sourcing Stats (Hunter)
// ============================================

export function useSourcingStats(orgId) {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!orgId || isDemo) {
      setStats(MOCK_SOURCING_STATS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getHunterStats')
      const result = await fn({ orgId })
      setStats(result.data)
    } catch (err) {
      console.error('Error fetching sourcing stats:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}

// ============================================
// Hook: Social Prospects (Instagram DM + WhatsApp)
// ============================================

export function useSocialProspects(orgId) {
  const { isDemo } = useDemo()
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || isDemo) {
      setProspects(MOCK_PROSPECTS)
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
    const q = query(
      prospectsRef,
      where('platform', 'in', ['instagram', 'tiktok', 'facebook']),
      orderBy('scrapedAt', 'desc'),
      limit(200)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setProspects(data)
      setLoading(false)
    }, (err) => {
      console.error('Error listening to social prospects:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [orgId, isDemo])

  return { prospects, loading }
}

// ============================================
// Hook: Replies / Interactions (Realtime)
// ============================================

export function useReplies(orgId) {
  const { isDemo } = useDemo()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!orgId || isDemo) {
      setReplies(MOCK_REPLIES)
      setUnreadCount(MOCK_REPLIES.filter(r => r.status === 'unread').length)
      setLoading(false)
      return
    }

    const interactionsRef = collection(db, 'organizations', orgId, 'interactions')
    const q = query(
      interactionsRef,
      where('channel', 'in', ['instagram', 'whatsapp']),
      where('direction', '==', 'inbound'),
      orderBy('receivedAt', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setReplies(data)
      setUnreadCount(data.filter(r => r.status === 'unread').length)
      setLoading(false)
    }, (err) => {
      console.error('Error listening to replies:', err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [orgId, isDemo])

  return { replies, loading, unreadCount }
}

// ============================================
// Hook: Social DM Actions (send DM, send WA)
// ============================================

export function useSocialActions(orgId) {
  const { isDemo } = useDemo()
  const [sendingDM, setSendingDM] = useState(null)
  const [sendingWA, setSendingWA] = useState(null)
  const [runningHunt, setRunningHunt] = useState(null)

  const sendInstagramDM = useCallback(async (prospectId, message) => {
    if (isDemo) {
      setSendingDM(prospectId)
      await new Promise(r => setTimeout(r, 1500))
      setSendingDM(null)
      return { success: true }
    }

    setSendingDM(prospectId)
    try {
      const fn = httpsCallable(functions, 'sendManualDM')
      const result = await fn({ orgId, prospectId, message })
      return result.data
    } finally {
      setSendingDM(null)
    }
  }, [orgId, isDemo])

  const sendWhatsApp = useCallback(async (phone, message, prospectId) => {
    if (isDemo) {
      setSendingWA(prospectId)
      await new Promise(r => setTimeout(r, 1500))
      setSendingWA(null)
      return { success: true }
    }

    setSendingWA(prospectId)
    try {
      const fn = httpsCallable(functions, 'sendWhatsAppManual')
      const result = await fn({ orgId, phone, message, prospectId })
      return result.data
    } finally {
      setSendingWA(null)
    }
  }, [orgId, isDemo])

  const runHunt = useCallback(async (platform, config = {}) => {
    if (isDemo) {
      setRunningHunt(platform)
      await new Promise(r => setTimeout(r, 3000))
      setRunningHunt(null)
      return { success: true, found: Math.floor(Math.random() * 20) + 5 }
    }

    setRunningHunt(platform)
    try {
      const fnName = {
        instagram: 'runInstagramHunterManual',
        tiktok: 'runTikTokHunterManual',
        facebook: 'runFacebookHunterManual',
      }[platform]

      if (!fnName) throw new Error(`Platform ${platform} non supportee`)

      const fn = httpsCallable(functions, fnName)
      const result = await fn({ orgId, ...config })
      return result.data
    } finally {
      setRunningHunt(null)
    }
  }, [orgId, isDemo])

  const runAdvancedScrape = useCallback(async (type, target) => {
    if (isDemo) {
      setRunningHunt('instagram')
      await new Promise(r => setTimeout(r, 3000))
      setRunningHunt(null)
      return { success: true, found: Math.floor(Math.random() * 30) + 10 }
    }

    setRunningHunt('instagram')
    try {
      const fn = httpsCallable(functions, 'runAdvancedInstagramScrape')
      const result = await fn({ orgId, type, target })
      return result.data
    } finally {
      setRunningHunt(null)
    }
  }, [orgId, isDemo])

  return {
    sendInstagramDM,
    sendWhatsApp,
    runHunt,
    runAdvancedScrape,
    sendingDM,
    sendingWA,
    runningHunt,
  }
}

// ============================================
// Hook combine principal : useSocialOutreach
// ============================================

export default function useSocialOutreach() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const igAccounts = useInstagramAccounts(orgId)
  const igStats = useInstagramDMStats(orgId)
  const waStats = useWhatsAppStats(orgId)
  const sourcing = useSourcingStats(orgId)
  const { prospects, loading: prospectsLoading } = useSocialProspects(orgId)
  const repliesData = useReplies(orgId)
  const actions = useSocialActions(orgId)

  const loading = igAccounts.loading || igStats.loading || waStats.loading || prospectsLoading

  const refreshAll = useCallback(async () => {
    await Promise.all([
      igAccounts.refresh(),
      igStats.refresh(),
      waStats.refresh(),
      sourcing.refresh(),
    ])
  }, [igAccounts, igStats, waStats, sourcing])

  return {
    orgId,
    // Instagram accounts
    accounts: igAccounts,
    // Stats
    igStats: igStats.stats,
    waStats: waStats.stats,
    sourcingStats: sourcing.stats,
    // Prospects
    prospects,
    prospectsLoading,
    // Replies
    replies: repliesData.replies,
    repliesLoading: repliesData.loading,
    unreadCount: repliesData.unreadCount,
    // Actions
    ...actions,
    // Global
    loading,
    refreshAll,
  }
}
