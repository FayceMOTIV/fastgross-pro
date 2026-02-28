/**
 * useWarRoom — Hook War Room (Super Admin)
 *
 * Sub-hooks :
 * - useWarRoomStats() : stats cross-org
 * - useOrgList() : liste orgs avec status prospection
 * - useReplyFeed() : feed replies realtime cross-org
 * - useEmergencyControls() : pause/resume globale
 * - useWarRoom() : composite hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useDemo } from '@/hooks/useDemo'

// ============================================
// MOCK DATA
// ============================================

const MOCK_WAR_ROOM_STATS = {
  totalOrgs: 12,
  activeOrgs: 8,
  pausedOrgs: 3,
  errorOrgs: 1,
  totalMessagesSentToday: 2847,
  totalMessagesThisWeek: 14523,
  totalRepliestoday: 312,
  globalReplyRate: 11.0,
  channels: {
    email: {
      sentToday: 1245,
      sentWeek: 6890,
      replies: 134,
      replyRate: 10.8,
      health: 'healthy',
      errors: 0,
    },
    sms: {
      sentToday: 423,
      sentWeek: 2134,
      replies: 52,
      replyRate: 12.3,
      health: 'healthy',
      errors: 0,
    },
    whatsapp: {
      sentToday: 312,
      sentWeek: 1567,
      replies: 67,
      replyRate: 21.5,
      health: 'healthy',
      errors: 0,
    },
    instagram: {
      sentToday: 189,
      sentWeek: 945,
      replies: 23,
      replyRate: 12.2,
      health: 'warning',
      errors: 2,
    },
    linkedin: {
      sentToday: 156,
      sentWeek: 834,
      replies: 24,
      replyRate: 15.4,
      health: 'healthy',
      errors: 0,
    },
    voicemail: {
      sentToday: 312,
      sentWeek: 1456,
      replies: 8,
      replyRate: 2.6,
      health: 'healthy',
      errors: 0,
    },
    postal: {
      sentToday: 45,
      sentWeek: 187,
      replies: 3,
      replyRate: 6.7,
      health: 'healthy',
      errors: 0,
    },
    twitter: {
      sentToday: 165,
      sentWeek: 510,
      replies: 1,
      replyRate: 0.6,
      health: 'degraded',
      errors: 5,
    },
  },
  budgetUsed: 67,
  budgetTotal: 100,
  lastSchedulerRun: new Date(Date.now() - 300000).toISOString(),
  schedulerStatus: 'running',
}

const MOCK_ORG_LIST = [
  {
    id: 'org_1',
    name: 'Agence Alpha',
    plan: 'enterprise',
    prospectionEnabled: true,
    prospectionState: 'running',
    channelsActive: ['email', 'sms', 'whatsapp', 'instagram', 'linkedin'],
    dailyBudget: 150,
    sentToday: 98,
    repliesToday: 12,
    replyRate: 12.2,
    lastActivity: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'org_2',
    name: 'StartupBeta SAS',
    plan: 'pro',
    prospectionEnabled: true,
    prospectionState: 'running',
    channelsActive: ['email', 'sms', 'whatsapp'],
    dailyBudget: 80,
    sentToday: 56,
    repliesToday: 7,
    replyRate: 12.5,
    lastActivity: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'org_3',
    name: 'Immobilier Gamma',
    plan: 'enterprise',
    prospectionEnabled: true,
    prospectionState: 'running',
    channelsActive: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'postal'],
    dailyBudget: 200,
    sentToday: 145,
    repliesToday: 18,
    replyRate: 12.4,
    lastActivity: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'org_4',
    name: 'Formation Delta',
    plan: 'pro',
    prospectionEnabled: true,
    prospectionState: 'paused',
    channelsActive: ['email', 'sms'],
    dailyBudget: 50,
    sentToday: 23,
    repliesToday: 3,
    replyRate: 13.0,
    lastActivity: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'org_5',
    name: 'E-commerce Epsilon',
    plan: 'enterprise',
    prospectionEnabled: true,
    prospectionState: 'running',
    channelsActive: ['email', 'sms', 'whatsapp', 'linkedin', 'instagram'],
    dailyBudget: 180,
    sentToday: 134,
    repliesToday: 15,
    replyRate: 11.2,
    lastActivity: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'org_6',
    name: 'Cabinet Zeta',
    plan: 'starter',
    prospectionEnabled: true,
    prospectionState: 'running',
    channelsActive: ['email'],
    dailyBudget: 30,
    sentToday: 28,
    repliesToday: 4,
    replyRate: 14.3,
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'org_7',
    name: 'Coaching Eta',
    plan: 'pro',
    prospectionEnabled: false,
    prospectionState: 'idle',
    channelsActive: ['email', 'whatsapp'],
    dailyBudget: 60,
    sentToday: 0,
    repliesToday: 0,
    replyRate: 0,
    lastActivity: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'org_8',
    name: 'Consulting Theta',
    plan: 'enterprise',
    prospectionEnabled: true,
    prospectionState: 'error',
    channelsActive: ['email', 'sms', 'whatsapp', 'instagram'],
    dailyBudget: 120,
    sentToday: 45,
    repliesToday: 5,
    replyRate: 11.1,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    errorMessage: 'WhatsApp instance disconnected',
  },
]

const MOCK_REPLY_FEED = [
  {
    id: 'rf_1',
    orgId: 'org_1',
    orgName: 'Agence Alpha',
    prospectName: 'Jean-Pierre Leclerc',
    channel: 'email',
    message: 'Bonjour, votre proposition m\'interesse. Quand pouvons-nous en discuter ?',
    sentiment: 'positive',
    classification: 'interested',
    receivedAt: new Date(Date.now() - 120000).toISOString(),
    status: 'unread',
  },
  {
    id: 'rf_2',
    orgId: 'org_3',
    orgName: 'Immobilier Gamma',
    prospectName: 'Marie-Claire Fontaine',
    channel: 'whatsapp',
    message: 'Merci pour l\'info ! Je suis disponible mardi prochain a 14h.',
    sentiment: 'positive',
    classification: 'meeting_request',
    receivedAt: new Date(Date.now() - 300000).toISOString(),
    status: 'unread',
  },
  {
    id: 'rf_3',
    orgId: 'org_5',
    orgName: 'E-commerce Epsilon',
    prospectName: 'Nicolas Petit',
    channel: 'linkedin',
    message: 'Pas interesse pour le moment.',
    sentiment: 'negative',
    classification: 'not_interested',
    receivedAt: new Date(Date.now() - 600000).toISOString(),
    status: 'read',
  },
  {
    id: 'rf_4',
    orgId: 'org_2',
    orgName: 'StartupBeta SAS',
    prospectName: 'Sophie Moreau',
    channel: 'sms',
    message: 'Oui envoyez-moi plus d\'infos par email svp',
    sentiment: 'positive',
    classification: 'interested',
    receivedAt: new Date(Date.now() - 900000).toISOString(),
    status: 'read',
  },
  {
    id: 'rf_5',
    orgId: 'org_1',
    orgName: 'Agence Alpha',
    prospectName: 'Philippe Dubois',
    channel: 'instagram',
    message: 'Cool votre concept ! C\'est quoi vos tarifs ?',
    sentiment: 'positive',
    classification: 'pricing_inquiry',
    receivedAt: new Date(Date.now() - 1200000).toISOString(),
    status: 'unread',
  },
  {
    id: 'rf_6',
    orgId: 'org_6',
    orgName: 'Cabinet Zeta',
    prospectName: 'Isabelle Renard',
    channel: 'email',
    message: 'Desabonnez-moi de vos listes svp.',
    sentiment: 'negative',
    classification: 'unsubscribe',
    receivedAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'read',
  },
  {
    id: 'rf_7',
    orgId: 'org_3',
    orgName: 'Immobilier Gamma',
    prospectName: 'Alain Girard',
    channel: 'voicemail',
    message: '[Rappel recu] Demande de rappel via messagerie vocale',
    sentiment: 'positive',
    classification: 'callback_request',
    receivedAt: new Date(Date.now() - 2400000).toISOString(),
    status: 'read',
  },
]

// ============================================
// useWarRoomStats
// ============================================

export function useWarRoomStats() {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    if (isDemo) {
      setStats(MOCK_WAR_ROOM_STATS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getWarRoomStats')
      const result = await fn({})
      setStats(result.data?.stats || result.data || {})
    } catch (err) {
      console.error('Error fetching War Room stats:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isDemo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (isDemo) return
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [fetchStats, isDemo])

  return { stats, loading, error, refresh: fetchStats }
}

// ============================================
// useOrgList
// ============================================

export function useOrgList() {
  const { isDemo } = useDemo()
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrgs = useCallback(async () => {
    if (isDemo) {
      setOrgs(MOCK_ORG_LIST)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getWarRoomOrgList')
      const result = await fn({})
      setOrgs(result.data?.organizations || result.data || [])
    } catch (err) {
      console.error('Error fetching org list:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isDemo])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const toggleProspection = useCallback(
    async (orgId, enabled) => {
      if (isDemo) {
        setOrgs((prev) =>
          prev.map((o) =>
            o.id === orgId
              ? {
                  ...o,
                  prospectionEnabled: enabled,
                  prospectionState: enabled ? 'running' : 'idle',
                }
              : o
          )
        )
        return { success: true }
      }

      const fn = httpsCallable(functions, 'toggleOrgProspection')
      const result = await fn({ orgId, enabled })
      await fetchOrgs()
      return result.data
    },
    [isDemo, fetchOrgs]
  )

  const activeOrgs = useMemo(
    () => orgs.filter((o) => o.prospectionEnabled && o.prospectionState === 'running'),
    [orgs]
  )
  const pausedOrgs = useMemo(
    () => orgs.filter((o) => o.prospectionState === 'paused'),
    [orgs]
  )
  const errorOrgs = useMemo(
    () => orgs.filter((o) => o.prospectionState === 'error'),
    [orgs]
  )

  return {
    orgs,
    loading,
    error,
    toggleProspection,
    refresh: fetchOrgs,
    activeOrgs,
    pausedOrgs,
    errorOrgs,
  }
}

// ============================================
// useReplyFeed
// ============================================

export function useReplyFeed() {
  const { isDemo } = useDemo()
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isDemo) {
      setReplies(MOCK_REPLY_FEED)
      setUnreadCount(MOCK_REPLY_FEED.filter((r) => r.status === 'unread').length)
      setLoading(false)
      return
    }

    // Cross-org realtime listener on replyFeeds collectionGroup
    const q = query(
      collection(db, 'replyFeedsGlobal'),
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
        setReplies(items)
        setUnreadCount(items.filter((r) => r.status === 'unread').length)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to reply feed:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [isDemo])

  const positiveReplies = useMemo(
    () => replies.filter((r) => r.sentiment === 'positive'),
    [replies]
  )
  const negativeReplies = useMemo(
    () => replies.filter((r) => r.sentiment === 'negative'),
    [replies]
  )

  return {
    replies,
    loading,
    unreadCount,
    positiveReplies,
    negativeReplies,
  }
}

// ============================================
// useEmergencyControls
// ============================================

export function useEmergencyControls() {
  const { isDemo } = useDemo()
  const [pausing, setPausing] = useState(false)
  const [pausedChannels, setPausedChannels] = useState([])
  const [globalPaused, setGlobalPaused] = useState(false)

  const emergencyPauseAll = useCallback(async () => {
    if (isDemo) {
      setPausing(true)
      await new Promise((r) => setTimeout(r, 2000))
      setGlobalPaused(true)
      setPausing(false)
      return { success: true }
    }

    setPausing(true)
    try {
      const fn = httpsCallable(functions, 'emergencyPauseAll')
      const result = await fn({})
      setGlobalPaused(true)
      return result.data
    } finally {
      setPausing(false)
    }
  }, [isDemo])

  const emergencyResumeAll = useCallback(async () => {
    if (isDemo) {
      setPausing(true)
      await new Promise((r) => setTimeout(r, 1500))
      setGlobalPaused(false)
      setPausedChannels([])
      setPausing(false)
      return { success: true }
    }

    setPausing(true)
    try {
      const fn = httpsCallable(functions, 'emergencyPauseAll')
      const result = await fn({ resume: true })
      setGlobalPaused(false)
      setPausedChannels([])
      return result.data
    } finally {
      setPausing(false)
    }
  }, [isDemo])

  const pauseChannel = useCallback(
    async (channel) => {
      if (isDemo) {
        setPausedChannels((prev) => [...prev, channel])
        return { success: true }
      }

      const fn = httpsCallable(functions, 'emergencyPauseAll')
      const result = await fn({ channel, pause: true })
      setPausedChannels((prev) => [...prev, channel])
      return result.data
    },
    [isDemo]
  )

  const resumeChannel = useCallback(
    async (channel) => {
      if (isDemo) {
        setPausedChannels((prev) => prev.filter((c) => c !== channel))
        return { success: true }
      }

      const fn = httpsCallable(functions, 'emergencyPauseAll')
      const result = await fn({ channel, pause: false })
      setPausedChannels((prev) => prev.filter((c) => c !== channel))
      return result.data
    },
    [isDemo]
  )

  return {
    emergencyPauseAll,
    emergencyResumeAll,
    pauseChannel,
    resumeChannel,
    pausing,
    pausedChannels,
    globalPaused,
  }
}

// ============================================
// useWarRoom (composite)
// ============================================

export default function useWarRoom() {
  const statsData = useWarRoomStats()
  const orgListData = useOrgList()
  const replyFeedData = useReplyFeed()
  const emergencyData = useEmergencyControls()

  const loading = statsData.loading || orgListData.loading || replyFeedData.loading

  const refreshAll = useCallback(async () => {
    await Promise.all([statsData.refresh(), orgListData.refresh()])
  }, [statsData, orgListData])

  return {
    stats: statsData.stats,
    statsLoading: statsData.loading,
    statsError: statsData.error,
    orgs: orgListData,
    replyFeed: replyFeedData,
    emergency: emergencyData,
    loading,
    refreshAll,
  }
}
