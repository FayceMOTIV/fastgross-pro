/**
 * useLinkedIn — Hook LinkedIn (HeyReach + Apify)
 *
 * Sub-hooks :
 * - useLinkedInAccounts(orgId) : CRUD comptes LinkedIn
 * - useLinkedInCampaigns(orgId) : campagnes HeyReach
 * - useLinkedInInbox(orgId) : messages realtime
 * - useLinkedInStats(orgId) : stats aggregees
 * - useLinkedIn() : composite hook
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
// MOCK DATA
// ============================================

const MOCK_LINKEDIN_ACCOUNTS = [
  {
    id: 'li_acc_1',
    name: 'Thomas Martin',
    profileUrl: 'https://linkedin.com/in/thomas-martin',
    status: 'active',
    dailySent: 12,
    dailyLimit: 25,
    totalSent: 456,
    totalConnected: 189,
    totalReplied: 67,
    warmupDay: 18,
    connectionRate: 41.4,
    replyRate: 14.7,
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
  {
    id: 'li_acc_2',
    name: 'Sophie Dubois',
    profileUrl: 'https://linkedin.com/in/sophie-dubois',
    status: 'active',
    dailySent: 8,
    dailyLimit: 20,
    totalSent: 234,
    totalConnected: 102,
    totalReplied: 38,
    warmupDay: 12,
    connectionRate: 43.6,
    replyRate: 16.2,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'li_acc_3',
    name: 'Lucas Bernard',
    profileUrl: 'https://linkedin.com/in/lucas-bernard',
    status: 'warming_up',
    dailySent: 3,
    dailyLimit: 5,
    totalSent: 21,
    totalConnected: 8,
    totalReplied: 2,
    warmupDay: 3,
    connectionRate: 38.1,
    replyRate: 9.5,
    lastActivity: new Date(Date.now() - 7200000).toISOString(),
    addedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

const MOCK_LINKEDIN_CAMPAIGNS = [
  {
    id: 'camp_1',
    name: 'Dirigeants E-commerce IDF',
    status: 'active',
    provider: 'heyreach',
    leadsCount: 145,
    sentCount: 89,
    connectedCount: 34,
    repliedCount: 12,
    connectionRate: 38.2,
    replyRate: 13.5,
    dailyLimit: 25,
    accountIds: ['li_acc_1', 'li_acc_2'],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'camp_2',
    name: 'CTOs Startups France',
    status: 'active',
    provider: 'heyreach',
    leadsCount: 78,
    sentCount: 45,
    connectedCount: 19,
    repliedCount: 7,
    connectionRate: 42.2,
    replyRate: 15.6,
    dailyLimit: 20,
    accountIds: ['li_acc_1'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'camp_3',
    name: 'DRH Grandes Entreprises',
    status: 'paused',
    provider: 'heyreach',
    leadsCount: 210,
    sentCount: 132,
    connectedCount: 51,
    repliedCount: 18,
    connectionRate: 38.6,
    replyRate: 13.6,
    dailyLimit: 25,
    accountIds: ['li_acc_1', 'li_acc_2'],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

const MOCK_LINKEDIN_INBOX = [
  {
    id: 'msg_1',
    prospectName: 'Antoine Leroy',
    prospectUrl: 'https://linkedin.com/in/antoine-leroy',
    channel: 'linkedin',
    message: 'Bonjour Thomas, merci pour votre message. Votre solution semble interessante, pouvez-vous m\'en dire plus ?',
    receivedAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'unread',
    sentiment: 'positive',
    campaignId: 'camp_1',
    accountId: 'li_acc_1',
  },
  {
    id: 'msg_2',
    prospectName: 'Claire Moreau',
    prospectUrl: 'https://linkedin.com/in/claire-moreau',
    channel: 'linkedin',
    message: 'Pas interesse pour le moment, mais je garde votre contact.',
    receivedAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'read',
    sentiment: 'neutral',
    campaignId: 'camp_1',
    accountId: 'li_acc_2',
  },
  {
    id: 'msg_3',
    prospectName: 'Pierre Duval',
    prospectUrl: 'https://linkedin.com/in/pierre-duval',
    channel: 'linkedin',
    message: 'Bonjour Sophie, oui je suis disponible jeudi pour un call de 15 min.',
    receivedAt: new Date(Date.now() - 14400000).toISOString(),
    status: 'read',
    sentiment: 'positive',
    campaignId: 'camp_2',
    accountId: 'li_acc_1',
  },
  {
    id: 'msg_4',
    prospectName: 'Julie Petit',
    prospectUrl: 'https://linkedin.com/in/julie-petit',
    channel: 'linkedin',
    message: 'Nous avons deja un prestataire, desolee.',
    receivedAt: new Date(Date.now() - 43200000).toISOString(),
    status: 'read',
    sentiment: 'negative',
    campaignId: 'camp_3',
    accountId: 'li_acc_2',
  },
  {
    id: 'msg_5',
    prospectName: 'Nicolas Roux',
    prospectUrl: 'https://linkedin.com/in/nicolas-roux',
    channel: 'linkedin',
    message: 'Pouvez-vous m\'envoyer une brochure ? Mon email : nicolas@startup.io',
    receivedAt: new Date(Date.now() - 54000000).toISOString(),
    status: 'unread',
    sentiment: 'positive',
    campaignId: 'camp_1',
    accountId: 'li_acc_1',
  },
]

const MOCK_LINKEDIN_STATS = {
  sentToday: 23,
  sentThisWeek: 142,
  totalSent: 711,
  totalConnected: 299,
  totalReplied: 107,
  connectionRate: 42.1,
  replyRate: 15.0,
  activeAccounts: 2,
  totalAccounts: 3,
  activeCampaigns: 2,
  totalCampaigns: 3,
  pendingReplies: 2,
  nextExecution: new Date(Date.now() + 1800000).toISOString(),
}

// ============================================
// useLinkedInAccounts
// ============================================

export function useLinkedInAccounts(orgId) {
  const { isDemo } = useDemo()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    if (!orgId || isDemo) {
      setAccounts(MOCK_LINKEDIN_ACCOUNTS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getLinkedInHunterStats')
      const result = await fn({ orgId })
      setAccounts(result.data?.accounts || [])
    } catch (err) {
      console.error('Error fetching LinkedIn accounts:', err)
      setError(err)
      try {
        const snap = await getDocs(
          collection(db, 'organizations', orgId, 'channelAccounts')
        )
        const liAccounts = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.provider === 'heyreach' || a.channel === 'linkedin')
        setAccounts(liAccounts)
      } catch (fbErr) {
        console.error('LinkedIn accounts Firestore fallback failed:', fbErr)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = useCallback(
    async (profileUrl, name) => {
      if (isDemo) {
        const newAcc = {
          id: `li_acc_${Date.now()}`,
          name: name || 'Nouveau compte',
          profileUrl,
          status: 'warming_up',
          dailySent: 0,
          dailyLimit: 5,
          totalSent: 0,
          totalConnected: 0,
          totalReplied: 0,
          warmupDay: 1,
          connectionRate: 0,
          replyRate: 0,
          lastActivity: null,
          addedAt: new Date().toISOString(),
        }
        setAccounts((prev) => [...prev, newAcc])
        return newAcc
      }

      const fn = httpsCallable(functions, 'addLinkedInAccount')
      const result = await fn({ orgId, profileUrl, name })
      await fetchAccounts()
      return result.data
    },
    [orgId, isDemo, fetchAccounts]
  )

  const removeAccount = useCallback(
    async (accountId) => {
      if (isDemo) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId))
        return { success: true }
      }

      const fn = httpsCallable(functions, 'removeLinkedInAccount')
      const result = await fn({ orgId, accountId })
      await fetchAccounts()
      return result.data
    },
    [orgId, isDemo, fetchAccounts]
  )

  const activeCount = useMemo(() => accounts.filter((a) => a.status === 'active').length, [accounts])

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
    refresh: fetchAccounts,
    activeCount,
    totalDailySent,
    totalDailyCapacity,
  }
}

// ============================================
// useLinkedInCampaigns
// ============================================

export function useLinkedInCampaigns(orgId) {
  const { isDemo } = useDemo()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orgId || isDemo) {
      setCampaigns(MOCK_LINKEDIN_CAMPAIGNS)
      setLoading(false)
      return
    }

    const campaignsRef = collection(db, 'organizations', orgId, 'outreachCampaigns')
    const q = query(
      campaignsRef,
      where('provider', '==', 'heyreach'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || null,
        }))
        setCampaigns(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to LinkedIn campaigns:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId, isDemo])

  const createCampaign = useCallback(
    async (config) => {
      if (isDemo) {
        const newCampaign = {
          id: `camp_${Date.now()}`,
          name: config.name || 'Nouvelle campagne',
          status: 'created',
          provider: 'heyreach',
          leadsCount: 0,
          sentCount: 0,
          connectedCount: 0,
          repliedCount: 0,
          connectionRate: 0,
          replyRate: 0,
          dailyLimit: config.dailyLimit || 25,
          accountIds: config.accountIds || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setCampaigns((prev) => [newCampaign, ...prev])
        return { success: true, campaignId: newCampaign.id }
      }

      const fn = httpsCallable(functions, 'runLinkedInHunterManual')
      const result = await fn({
        orgId,
        createCampaignAfter: true,
        campaignName: config.name,
        ...config,
      })
      return result.data
    },
    [orgId, isDemo]
  )

  const pauseCampaign = useCallback(
    async (campaignId) => {
      if (isDemo) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: 'paused' } : c))
        )
        return { success: true }
      }

      const fn = httpsCallable(functions, 'runLinkedInHunterManual')
      return (await fn({ orgId, action: 'pauseCampaign', campaignId })).data
    },
    [orgId, isDemo]
  )

  const resumeCampaign = useCallback(
    async (campaignId) => {
      if (isDemo) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: 'active' } : c))
        )
        return { success: true }
      }

      const fn = httpsCallable(functions, 'runLinkedInHunterManual')
      return (await fn({ orgId, action: 'resumeCampaign', campaignId })).data
    },
    [orgId, isDemo]
  )

  const getStats = useCallback(
    async (campaignId) => {
      if (isDemo) {
        const camp = campaigns.find((c) => c.id === campaignId)
        return { success: true, stats: camp || {} }
      }

      const fn = httpsCallable(functions, 'getLinkedInHunterStats')
      return (await fn({ orgId, campaignId })).data
    },
    [orgId, isDemo, campaigns]
  )

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'active'),
    [campaigns]
  )

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    pauseCampaign,
    resumeCampaign,
    getStats,
    activeCampaigns,
  }
}

// ============================================
// useLinkedInInbox
// ============================================

export function useLinkedInInbox(orgId) {
  const { isDemo } = useDemo()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!orgId || isDemo) {
      setMessages(MOCK_LINKEDIN_INBOX)
      setUnreadCount(MOCK_LINKEDIN_INBOX.filter((m) => m.status === 'unread').length)
      setLoading(false)
      return
    }

    const inboxRef = collection(db, 'organizations', orgId, 'interactions')
    const q = query(
      inboxRef,
      where('channel', '==', 'linkedin'),
      where('direction', '==', 'inbound'),
      orderBy('receivedAt', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          receivedAt: d.data().receivedAt?.toDate?.()?.toISOString() || null,
        }))
        setMessages(items)
        setUnreadCount(items.filter((m) => m.status === 'unread').length)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to LinkedIn inbox:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId, isDemo])

  const syncInbox = useCallback(async () => {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 1500))
      return { success: true, synced: 3 }
    }

    const fn = httpsCallable(functions, 'syncLinkedInInbox')
    const result = await fn({ orgId })
    return result.data
  }, [orgId, isDemo])

  const markAsRead = useCallback(
    async (messageId) => {
      if (isDemo) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, status: 'read' } : m))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
        return
      }

      const { updateDoc: updateDocFn } = await import('firebase/firestore')
      await updateDocFn(doc(db, 'organizations', orgId, 'interactions', messageId), {
        status: 'read',
      })
    },
    [orgId, isDemo]
  )

  return {
    messages,
    loading,
    unreadCount,
    syncInbox,
    markAsRead,
  }
}

// ============================================
// useLinkedInStats
// ============================================

export function useLinkedInStats(orgId) {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!orgId || isDemo) {
      setStats(MOCK_LINKEDIN_STATS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getLinkedInHunterStats')
      const result = await fn({ orgId })
      setStats(result.data?.stats || result.data || {})
    } catch (err) {
      console.error('Error fetching LinkedIn stats:', err)
      try {
        const today = new Date().toISOString().split('T')[0]
        const statsDoc = await getDoc(
          doc(db, 'organizations', orgId, 'dailyBudgets', today)
        )
        if (statsDoc.exists()) {
          const data = statsDoc.data()
          setStats({
            sentToday: data.channels?.linkedin?.used || 0,
            totalSent: data.channels?.linkedin?.totalSent || 0,
          })
        }
      } catch (fbErr) {
        console.error('LinkedIn stats fallback failed:', fbErr)
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
// useLinkedInActions
// ============================================

export function useLinkedInActions(orgId) {
  const { isDemo } = useDemo()
  const [sendingConnection, setSendingConnection] = useState(null)
  const [sendingMessage, setSendingMessage] = useState(null)
  const [runningHunt, setRunningHunt] = useState(false)

  const sendConnectionRequest = useCallback(
    async (accountId, profileUrl, message) => {
      if (isDemo) {
        setSendingConnection(profileUrl)
        await new Promise((r) => setTimeout(r, 1500))
        setSendingConnection(null)
        return { success: true }
      }

      setSendingConnection(profileUrl)
      try {
        const fn = httpsCallable(functions, 'runLinkedInHunterManual')
        const result = await fn({
          orgId,
          action: 'sendConnection',
          accountId,
          profileUrl,
          message,
        })
        return result.data
      } finally {
        setSendingConnection(null)
      }
    },
    [orgId, isDemo]
  )

  const sendMessage = useCallback(
    async (accountId, profileUrl, message) => {
      if (isDemo) {
        setSendingMessage(profileUrl)
        await new Promise((r) => setTimeout(r, 1500))
        setSendingMessage(null)
        return { success: true }
      }

      setSendingMessage(profileUrl)
      try {
        const fn = httpsCallable(functions, 'runLinkedInHunterManual')
        const result = await fn({
          orgId,
          action: 'sendMessage',
          accountId,
          profileUrl,
          message,
        })
        return result.data
      } finally {
        setSendingMessage(null)
      }
    },
    [orgId, isDemo]
  )

  const runHunt = useCallback(
    async (config = {}) => {
      if (isDemo) {
        setRunningHunt(true)
        await new Promise((r) => setTimeout(r, 3000))
        setRunningHunt(false)
        return { success: true, found: Math.floor(Math.random() * 20) + 5 }
      }

      setRunningHunt(true)
      try {
        const fn = httpsCallable(functions, 'runLinkedInHunterManual')
        const result = await fn({ orgId, ...config })
        return result.data
      } finally {
        setRunningHunt(false)
      }
    },
    [orgId, isDemo]
  )

  return {
    sendConnectionRequest,
    sendMessage,
    runHunt,
    sendingConnection,
    sendingMessage,
    runningHunt,
  }
}

// ============================================
// useLinkedIn (composite)
// ============================================

export default function useLinkedIn() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const accountsData = useLinkedInAccounts(orgId)
  const campaignsData = useLinkedInCampaigns(orgId)
  const inboxData = useLinkedInInbox(orgId)
  const statsData = useLinkedInStats(orgId)
  const actions = useLinkedInActions(orgId)

  const loading = accountsData.loading || campaignsData.loading || statsData.loading

  const refreshAll = useCallback(async () => {
    await Promise.all([accountsData.refresh(), statsData.refresh()])
  }, [accountsData, statsData])

  return {
    orgId,
    accounts: accountsData,
    campaigns: campaignsData,
    inbox: inboxData,
    stats: statsData.stats,
    statsLoading: statsData.loading,
    ...actions,
    loading,
    refreshAll,
  }
}
