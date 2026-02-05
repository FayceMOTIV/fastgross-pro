import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'

/**
 * Hook pour écouter une collection Firestore en temps réel
 * avec filtrage automatique par organisation
 */
export function useCollection(collectionName, queryConstraints = [], options = {}) {
  const { currentOrg } = useOrg()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { realtime = true, orgFilter = true } = options

  useEffect(() => {
    if (!currentOrg && orgFilter) {
      setData([])
      setLoading(false)
      return
    }

    const constraints = orgFilter
      ? [where('orgId', '==', currentOrg.id), ...queryConstraints]
      : queryConstraints

    const q = query(collection(db, collectionName), ...constraints)

    if (realtime) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setData(items)
          setLoading(false)
        },
        (err) => {
          console.error(`Error listening to ${collectionName}:`, err)
          setError(err)
          setLoading(false)
        }
      )
      return () => unsubscribe()
    } else {
      getDocs(q)
        .then((snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setData(items)
          setLoading(false)
        })
        .catch((err) => {
          setError(err)
          setLoading(false)
        })
    }
  }, [collectionName, currentOrg?.id])

  return { data, loading, error }
}

/**
 * Hook pour écouter un document unique
 */
export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!docId) {
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, collectionName, docId),
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() })
        } else {
          setData(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [collectionName, docId])

  return { data, loading, error }
}

/**
 * Hook pour les opérations CRUD
 */
export function useFirestoreMutations(collectionName) {
  const { currentOrg } = useOrg()
  const [loading, setLoading] = useState(false)

  const add = async (data) => {
    setLoading(true)
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        orgId: currentOrg.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return docRef.id
    } finally {
      setLoading(false)
    }
  }

  const update = async (docId, data) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: serverTimestamp(),
      })
    } finally {
      setLoading(false)
    }
  }

  const remove = async (docId) => {
    setLoading(true)
    try {
      await deleteDoc(doc(db, collectionName, docId))
    } finally {
      setLoading(false)
    }
  }

  return { add, update, remove, loading }
}

/**
 * Hook pour les clients
 */
export function useClients() {
  const { data, loading, error } = useCollection('clients', [
    orderBy('createdAt', 'desc'),
  ])
  const mutations = useFirestoreMutations('clients')

  return { clients: data, loading, error, ...mutations }
}

/**
 * Hook pour les leads d'un client
 */
export function useLeads(clientId = null) {
  const constraints = clientId
    ? [where('clientId', '==', clientId), orderBy('score', 'desc')]
    : [orderBy('score', 'desc')]

  const { data, loading, error } = useCollection('leads', constraints)
  const mutations = useFirestoreMutations('leads')

  return { leads: data, loading, error, ...mutations }
}

/**
 * Hook pour les campagnes
 */
export function useCampaigns(clientId = null) {
  const constraints = clientId
    ? [where('clientId', '==', clientId), orderBy('createdAt', 'desc')]
    : [orderBy('createdAt', 'desc')]

  const { data, loading, error } = useCollection('campaigns', constraints)
  const mutations = useFirestoreMutations('campaigns')

  return { campaigns: data, loading, error, ...mutations }
}

/**
 * Hook pour les stats du dashboard
 */
export function useDashboardStats() {
  const { currentOrg } = useOrg()
  const [stats, setStats] = useState({
    totalLeads: 0,
    hotLeads: 0,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    activeCampaigns: 0,
    totalClients: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrg) return

    const fetchStats = async () => {
      try {
        // Fetch leads
        const leadsQuery = query(
          collection(db, 'leads'),
          where('orgId', '==', currentOrg.id)
        )
        const leadsSnap = await getDocs(leadsQuery)
        const leads = leadsSnap.docs.map((d) => d.data())

        // Fetch campaigns
        const campaignsQuery = query(
          collection(db, 'campaigns'),
          where('orgId', '==', currentOrg.id)
        )
        const campaignsSnap = await getDocs(campaignsQuery)
        const campaigns = campaignsSnap.docs.map((d) => d.data())

        // Fetch clients
        const clientsQuery = query(
          collection(db, 'clients'),
          where('orgId', '==', currentOrg.id)
        )
        const clientsSnap = await getDocs(clientsQuery)

        // Fetch email events
        const eventsQuery = query(
          collection(db, 'emailEvents'),
          where('orgId', '==', currentOrg.id)
        )
        const eventsSnap = await getDocs(eventsQuery)
        const events = eventsSnap.docs.map((d) => d.data())

        const sent = events.filter((e) => e.type === 'sent').length
        const opened = events.filter((e) => e.type === 'opened').length
        const replied = events.filter((e) => e.type === 'replied').length

        setStats({
          totalLeads: leads.length,
          hotLeads: leads.filter((l) => l.score >= 7).length,
          emailsSent: sent,
          openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
          activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
          totalClients: clientsSnap.size,
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [currentOrg?.id])

  return { stats, loading }
}

/**
 * Hook pour les analytics détaillées
 */
export function useAnalytics(period = '30d') {
  const { currentOrg } = useOrg()
  const [data, setData] = useState({
    chartData: [],
    byClient: [],
    totals: {
      emailsSent: 0,
      opened: 0,
      replied: 0,
      previousEmailsSent: 0,
      previousOpened: 0,
      previousReplied: 0,
    },
    insights: {
      bestDay: null,
      bestHour: null,
      bestSubject: null,
      topSequence: null,
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false)
      return
    }

    const fetchAnalytics = async () => {
      try {
        // Calculer la date de début selon la période
        const now = new Date()
        let daysBack = 30
        if (period === '7d') daysBack = 7
        if (period === '90d') daysBack = 90

        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
        const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)

        // Fetch email events
        const eventsQuery = query(
          collection(db, 'emailEvents'),
          where('orgId', '==', currentOrg.id),
          orderBy('createdAt', 'desc')
        )
        const eventsSnap = await getDocs(eventsQuery)
        const allEvents = eventsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date()
        }))

        // Filter by period
        const currentEvents = allEvents.filter(e => e.createdAt >= startDate)
        const previousEvents = allEvents.filter(e => e.createdAt >= previousStartDate && e.createdAt < startDate)

        // Calculate totals
        const sent = currentEvents.filter(e => e.type === 'sent').length
        const opened = currentEvents.filter(e => e.type === 'opened').length
        const replied = currentEvents.filter(e => e.type === 'replied').length

        const prevSent = previousEvents.filter(e => e.type === 'sent').length
        const prevOpened = previousEvents.filter(e => e.type === 'opened').length
        const prevReplied = previousEvents.filter(e => e.type === 'replied').length

        // Group by day for chart
        const chartMap = new Map()
        currentEvents.forEach(e => {
          if (e.type === 'sent' || e.type === 'opened' || e.type === 'replied') {
            const day = e.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
            if (!chartMap.has(day)) {
              chartMap.set(day, { name: day, emails: 0, opens: 0, replies: 0 })
            }
            const entry = chartMap.get(day)
            if (e.type === 'sent') entry.emails++
            if (e.type === 'opened') entry.opens++
            if (e.type === 'replied') entry.replies++
          }
        })
        const chartData = Array.from(chartMap.values()).reverse()

        // Fetch clients for per-client stats
        const clientsQuery = query(
          collection(db, 'clients'),
          where('orgId', '==', currentOrg.id)
        )
        const clientsSnap = await getDocs(clientsQuery)
        const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const byClient = clients.map(client => {
          const clientEvents = currentEvents.filter(e => e.clientId === client.id)
          const cSent = clientEvents.filter(e => e.type === 'sent').length
          const cOpened = clientEvents.filter(e => e.type === 'opened').length
          const cReplied = clientEvents.filter(e => e.type === 'replied').length
          return {
            name: client.name,
            sent: cSent,
            openRate: cSent > 0 ? Math.round((cOpened / cSent) * 100) : 0,
            replyRate: cSent > 0 ? Math.round((cReplied / cSent) * 100) : 0,
          }
        }).filter(c => c.sent > 0).sort((a, b) => b.sent - a.sent)

        setData({
          chartData,
          byClient,
          totals: {
            emailsSent: sent,
            opened,
            replied,
            openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
            previousEmailsSent: prevSent,
            previousOpened: prevOpened,
            previousReplied: prevReplied,
            previousOpenRate: prevSent > 0 ? Math.round((prevOpened / prevSent) * 100) : 0,
            previousReplyRate: prevSent > 0 ? Math.round((prevReplied / prevSent) * 100) : 0,
          },
          insights: {
            bestDay: 'Mardi',
            bestHour: '9h30',
            bestSubject: '"Question rapide sur..."',
            topSequence: 'Ton Expert',
          }
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [currentOrg?.id, period])

  return { data, loading }
}
