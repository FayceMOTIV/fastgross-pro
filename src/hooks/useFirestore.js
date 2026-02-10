import { useState, useEffect, useMemo } from 'react'
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
import { useDemo } from '@/contexts/DemoContext'

// Demo data for prospects
const DEMO_PROSPECTS = [
  {
    id: '1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@techcorp.fr',
    phone: '+33612345678',
    company: 'TechCorp',
    position: 'CEO',
    status: 'qualified',
    score: 85,
    channels: { email: { valid: true }, sms: { valid: true } },
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    firstName: 'Jean',
    lastName: 'Martin',
    email: 'jean.martin@startup.io',
    phone: '+33623456789',
    company: 'StartupIO',
    position: 'CTO',
    status: 'in_sequence',
    score: 72,
    channels: { email: { valid: true }, whatsapp: { valid: true } },
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
  },
  {
    id: '3',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie@agence.fr',
    phone: '+33634567890',
    company: 'Agence Creative',
    position: 'Directrice',
    status: 'replied',
    score: 92,
    channels: { email: { valid: true } },
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(),
  },
  {
    id: '4',
    firstName: 'Pierre',
    lastName: 'Dubois',
    email: 'p.dubois@industrie.com',
    phone: '+33645678901',
    company: 'Industrie SA',
    position: 'DAF',
    status: 'new',
    score: 45,
    channels: { email: { valid: true } },
    createdAt: new Date(Date.now() - 345600000),
    updatedAt: new Date(),
  },
  {
    id: '5',
    firstName: 'Claire',
    lastName: 'Moreau',
    email: 'claire.moreau@conseil.fr',
    phone: '+33656789012',
    company: 'ConseilPro',
    position: 'Associee',
    status: 'converted',
    score: 98,
    channels: { email: { valid: true }, sms: { valid: true }, whatsapp: { valid: true } },
    createdAt: new Date(Date.now() - 432000000),
    updatedAt: new Date(),
  },
  {
    id: '6',
    firstName: 'Lucas',
    lastName: 'Petit',
    email: 'lucas@digital.io',
    phone: '+33667890123',
    company: 'Digital Agency',
    position: 'Fondateur',
    status: 'enriched',
    score: 68,
    channels: { email: { valid: true } },
    createdAt: new Date(Date.now() - 518400000),
    updatedAt: new Date(),
  },
]

// Demo data for sequences
const DEMO_SEQUENCES = [
  {
    id: '1',
    name: 'Outreach B2B SaaS',
    description: 'Sequence pour les startups SaaS',
    status: 'active',
    steps: [
      { channel: 'email', day: 0 },
      { channel: 'sms', day: 3 },
      { channel: 'email', day: 7 },
    ],
    stats: { enrolled: 45, active: 28, replied: 12, converted: 5 },
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Relance Agences',
    description: 'Pour les agences de com',
    status: 'active',
    steps: [
      { channel: 'email', day: 0 },
      { channel: 'whatsapp', day: 2 },
      { channel: 'voicemail', day: 5 },
    ],
    stats: { enrolled: 32, active: 18, replied: 8, converted: 3 },
    createdAt: new Date(Date.now() - 1209600000),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Cold Outreach PME',
    description: 'Prospection PME industrielles',
    status: 'paused',
    steps: [
      { channel: 'email', day: 0 },
      { channel: 'courrier', day: 7 },
    ],
    stats: { enrolled: 120, active: 0, replied: 25, converted: 8 },
    createdAt: new Date(Date.now() - 2419200000),
    updatedAt: new Date(),
  },
]

// Demo data for templates
const DEMO_TEMPLATES = [
  {
    id: '1',
    name: 'Premier contact B2B',
    channel: 'email',
    category: 'prospection',
    subject: 'Question rapide sur {{company}}',
    content: 'Bonjour {{firstName}},\n\nJe me permets de vous contacter...',
    stats: { used: 156, openRate: 62, replyRate: 18 },
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Follow-up SMS',
    channel: 'sms',
    category: 'relance',
    subject: null,
    content:
      'Bonjour {{firstName}}, suite a mon email, seriez-vous disponible pour un call de 15min ?',
    stats: { used: 89, openRate: 95, replyRate: 28 },
    createdAt: new Date(Date.now() - 1209600000),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'WhatsApp intro',
    channel: 'whatsapp',
    category: 'prospection',
    subject: null,
    content: 'Bonjour {{firstName}} ! Je suis {{senderName}} de Face Media Factory...',
    stats: { used: 45, openRate: 88, replyRate: 35 },
    createdAt: new Date(Date.now() - 2419200000),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Relance email J+7',
    channel: 'email',
    category: 'relance',
    subject: 'Re: {{previousSubject}}',
    content: 'Bonjour {{firstName}},\n\nJe me permets de revenir vers vous...',
    stats: { used: 234, openRate: 58, replyRate: 22 },
    createdAt: new Date(Date.now() - 3024000000),
    updatedAt: new Date(),
  },
]

// Demo data for interactions
const DEMO_INTERACTIONS = [
  {
    id: '1',
    type: 'email_sent',
    channel: 'email',
    direction: 'out',
    prospectId: '1',
    prospectName: 'Marie Dupont',
    prospectCompany: 'TechCorp',
    subject: 'Question rapide sur TechCorp',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    type: 'email_opened',
    channel: 'email',
    direction: 'track',
    prospectId: '1',
    prospectName: 'Marie Dupont',
    prospectCompany: 'TechCorp',
    createdAt: new Date(Date.now() - 3000000),
  },
  {
    id: '3',
    type: 'email_reply',
    channel: 'email',
    direction: 'in',
    prospectId: '3',
    prospectName: 'Sophie Bernard',
    prospectCompany: 'Agence Creative',
    content: "Bonjour, je serais ravie d'en discuter...",
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: '4',
    type: 'sms_sent',
    channel: 'sms',
    direction: 'out',
    prospectId: '2',
    prospectName: 'Jean Martin',
    prospectCompany: 'StartupIO',
    content: 'Bonjour Jean, suite a mon email...',
    createdAt: new Date(Date.now() - 14400000),
  },
  {
    id: '5',
    type: 'whatsapp_read',
    channel: 'whatsapp',
    direction: 'track',
    prospectId: '5',
    prospectName: 'Claire Moreau',
    prospectCompany: 'ConseilPro',
    createdAt: new Date(Date.now() - 21600000),
  },
  {
    id: '6',
    type: 'converted',
    channel: null,
    direction: 'system',
    prospectId: '5',
    prospectName: 'Claire Moreau',
    prospectCompany: 'ConseilPro',
    createdAt: new Date(Date.now() - 86400000),
  },
]

// Demo data for team members
const DEMO_TEAM_MEMBERS = [
  {
    id: '1',
    uid: 'demo-user',
    displayName: 'Utilisateur Demo',
    email: 'demo@facemedia.fr',
    role: 'owner',
    status: 'active',
    joinedAt: new Date(Date.now() - 30 * 86400000),
    lastActiveAt: new Date(),
  },
  {
    id: '2',
    uid: 'demo-admin',
    displayName: 'Admin Test',
    email: 'admin@facemedia.fr',
    role: 'admin',
    status: 'active',
    joinedAt: new Date(Date.now() - 15 * 86400000),
    lastActiveAt: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    uid: 'demo-manager',
    displayName: 'Manager Test',
    email: 'manager@facemedia.fr',
    role: 'manager',
    status: 'active',
    joinedAt: new Date(Date.now() - 7 * 86400000),
    lastActiveAt: new Date(Date.now() - 7200000),
  },
]

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
  const { data, loading, error } = useCollection('clients', [orderBy('createdAt', 'desc')])
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
        const leadsQuery = query(collection(db, 'leads'), where('orgId', '==', currentOrg.id))
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
        const clientsQuery = query(collection(db, 'clients'), where('orgId', '==', currentOrg.id))
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

// =============================================================================
// V2.0 HOOKS - Organization subcollections
// =============================================================================

/**
 * Hook pour les templates (subcollection de l'organisation)
 */
export function useTemplates(options = {}) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [templates, setTemplates] = useState(isDemo ? DEMO_TEMPLATES : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Skip Firestore in demo mode
    if (isDemo) {
      setTemplates(DEMO_TEMPLATES)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setTemplates([])
      setLoading(false)
      return
    }

    const templatesRef = collection(db, 'organizations', currentOrg.id, 'templates')
    const q = query(templatesRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
        }))
        setTemplates(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to templates:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  return { templates, loading, error }
}

/**
 * Hook pour les sequences (subcollection de l'organisation)
 */
export function useSequences() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [sequences, setSequences] = useState(isDemo ? DEMO_SEQUENCES : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Skip Firestore in demo mode
    if (isDemo) {
      setSequences(DEMO_SEQUENCES)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setSequences([])
      setLoading(false)
      return
    }

    const sequencesRef = collection(db, 'organizations', currentOrg.id, 'sequences')
    const q = query(sequencesRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
          lastActivatedAt: doc.data().lastActivatedAt?.toDate?.() || null,
        }))
        setSequences(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to sequences:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  return { sequences, loading, error }
}

/**
 * Hook pour les interactions (subcollection de l'organisation)
 */
export function useInteractions(options = {}) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [interactions, setInteractions] = useState(isDemo ? DEMO_INTERACTIONS : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  const { limitCount = 100 } = options

  useEffect(() => {
    // Skip Firestore in demo mode
    if (isDemo) {
      setInteractions(DEMO_INTERACTIONS)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setInteractions([])
      setLoading(false)
      return
    }

    const interactionsRef = collection(db, 'organizations', currentOrg.id, 'interactions')
    const q = query(interactionsRef, orderBy('createdAt', 'desc'), limit(limitCount))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))
        setInteractions(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to interactions:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, limitCount, isDemo])

  return { interactions, loading, error }
}

/**
 * Hook pour les membres de l'equipe (subcollection de l'organisation)
 */
export function useTeamMembers() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [members, setMembers] = useState(isDemo ? DEMO_TEAM_MEMBERS : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Skip Firestore in demo mode
    if (isDemo) {
      setMembers(DEMO_TEAM_MEMBERS)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setMembers([])
      setLoading(false)
      return
    }

    const membersRef = collection(db, 'organizations', currentOrg.id, 'members')
    const q = query(membersRef, orderBy('joinedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          joinedAt: doc.data().joinedAt?.toDate?.() || null,
          lastActiveAt: doc.data().lastActiveAt?.toDate?.() || null,
        }))
        setMembers(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to members:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  return { members, loading, error }
}

/**
 * Hook pour les invitations en attente (subcollection de l'organisation)
 */
export function useInvitations() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Skip Firestore in demo mode (no pending invitations)
    if (isDemo) {
      setInvitations([])
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setInvitations([])
      setLoading(false)
      return
    }

    const invitationsRef = collection(db, 'organizations', currentOrg.id, 'invitations')
    const q = query(invitationsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          expiresAt: doc.data().expiresAt?.toDate?.() || null,
        }))
        setInvitations(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to invitations:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  return { invitations, loading, error }
}

/**
 * Hook pour les prospects (subcollection de l'organisation)
 */
export function useProspects(options = {}) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [prospects, setProspects] = useState(isDemo ? DEMO_PROSPECTS : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  const { status, limitCount = 500 } = options

  useEffect(() => {
    // Skip Firestore in demo mode
    if (isDemo) {
      setProspects(DEMO_PROSPECTS)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setProspects([])
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')
    let q = query(prospectsRef, orderBy('updatedAt', 'desc'), limit(limitCount))

    if (status) {
      q = query(
        prospectsRef,
        where('status', '==', status),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
        }))
        setProspects(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to prospects:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, status, limitCount, isDemo])

  return { prospects, loading, error }
}

/**
 * Hook pour les stats REELLES du Dashboard (pas de mock data)
 * Utilisé quand on n'est PAS en mode demo
 */
export function useRealDashboardStats() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [stats, setStats] = useState({
    // Prospects
    totalProspects: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    // Campaigns
    pendingCampaigns: 0,
    activeCampaigns: 0,
    totalSequences: 0,
    // Today's work
    todayToContact: 0,
    todayContacted: 0,
    todayReplies: 0,
    todaySigned: 0,
    // Totals
    totalEmailsSent: 0,
    totalSMSSent: 0,
    totalMessages: 0,
    openRate: 0,
    replyRate: 0,
    // Revenue (from converted)
    converted: 0,
    // By channel
    byChannel: {
      email: 0,
      sms: 0,
      whatsapp: 0,
      instagram_dm: 0,
      voicemail: 0,
      courrier: 0,
    },
    repliesByChannel: {
      email: 0,
      sms: 0,
      whatsapp: 0,
      instagram_dm: 0,
      voicemail: 0,
      courrier: 0,
    },
  })
  const [pendingCampaignsList, setPendingCampaignsList] = useState([])
  const [hotProspects, setHotProspects] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [loading, setLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo || !currentOrg?.id) {
      setLoading(false)
      return
    }

    // Set up real-time listeners
    const unsubscribers = []

    // Listen to prospects
    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')
    const prospectsQuery = query(prospectsRef, orderBy('createdAt', 'desc'), limit(500))

    unsubscribers.push(
      onSnapshot(prospectsQuery, (snapshot) => {
        const prospects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
        }))

        // Calculate stats
        const hot = prospects.filter((p) => p.score >= 80)
        const warm = prospects.filter((p) => p.score >= 50 && p.score < 80)
        const cold = prospects.filter((p) => p.score < 50)

        setStats((prev) => ({
          ...prev,
          totalProspects: prospects.length,
          hotLeads: hot.length,
          warmLeads: warm.length,
          coldLeads: cold.length,
        }))

        // Hot prospects with replies (for display)
        const replied = prospects.filter(
          (p) => p.status === 'replied' || p.reply
        )
        setHotProspects(replied.slice(0, 10))
      })
    )

    // Listen to campaigns
    const campaignsRef = collection(db, 'organizations', currentOrg.id, 'campaigns')
    const campaignsQuery = query(campaignsRef, orderBy('createdAt', 'desc'))

    unsubscribers.push(
      onSnapshot(campaignsQuery, (snapshot) => {
        const campaigns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
        }))

        const pending = campaigns.filter((c) => c.status === 'pending')
        const active = campaigns.filter((c) => c.status === 'active' || c.status === 'running')

        // Today's work
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayCampaigns = campaigns.filter((c) => {
          const createdAt = c.createdAt
          return createdAt && createdAt >= today
        })

        setStats((prev) => ({
          ...prev,
          pendingCampaigns: pending.length,
          activeCampaigns: active.length,
          totalSequences: campaigns.length,
          todayToContact: pending.length,
          todayContacted: active.length,
        }))

        setPendingCampaignsList(pending)
      })
    )

    // Listen to interactions for activity feed
    const interactionsRef = collection(db, 'organizations', currentOrg.id, 'interactions')
    const interactionsQuery = query(interactionsRef, orderBy('createdAt', 'desc'), limit(20))

    unsubscribers.push(
      onSnapshot(interactionsQuery, (snapshot) => {
        const interactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }))

        // Format for activity feed
        const formatted = interactions.map((i) => ({
          id: i.id,
          type: i.type,
          channel: i.channel || 'email',
          message: i.prospectName || 'Prospect',
          details: i.prospectCompany || i.subject || '',
          timestamp: i.createdAt,
          timeAgo: formatTimeAgo(i.createdAt),
        }))

        setRecentActivity(formatted)

        // Calculate channel stats
        const byChannel = {
          email: 0,
          sms: 0,
          whatsapp: 0,
          instagram_dm: 0,
          voicemail: 0,
          courrier: 0,
        }
        const repliesByChannel = { ...byChannel }

        interactions.forEach((i) => {
          const ch = i.channel || 'email'
          if (i.direction === 'out' || i.type?.includes('sent')) {
            byChannel[ch] = (byChannel[ch] || 0) + 1
          }
          if (i.type?.includes('reply') || i.type?.includes('replied')) {
            repliesByChannel[ch] = (repliesByChannel[ch] || 0) + 1
          }
        })

        const totalMessages = Object.values(byChannel).reduce((a, b) => a + b, 0)
        const totalReplies = Object.values(repliesByChannel).reduce((a, b) => a + b, 0)

        setStats((prev) => ({
          ...prev,
          byChannel,
          repliesByChannel,
          totalMessages,
          todayReplies: totalReplies,
          replyRate: totalMessages > 0 ? Math.round((totalReplies / totalMessages) * 100) : 0,
        }))

        // Calculate daily stats for chart
        const last7Days = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)

          const dayInteractions = interactions.filter((int) => {
            const intDate = int.createdAt
            return intDate >= date && intDate < nextDate
          })

          const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' })
          last7Days.push({
            name: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
            envoyes: dayInteractions.filter((i) => i.direction === 'out' || i.type?.includes('sent')).length,
            ouverts: dayInteractions.filter((i) => i.type?.includes('open')).length,
            reponses: dayInteractions.filter((i) => i.type?.includes('reply')).length,
          })
        }

        setDailyStats(last7Days)
      })
    )

    setLoading(false)

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [currentOrg?.id, isDemo])

  return {
    stats,
    pendingCampaigns: pendingCampaignsList,
    hotProspects,
    recentActivity,
    dailyStats,
    loading,
  }
}

// Helper function for time ago
function formatTimeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return "A l'instant"
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  return `Il y a ${Math.floor(seconds / 86400)}j`
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
    },
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
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }))

        // Filter by period
        const currentEvents = allEvents.filter((e) => e.createdAt >= startDate)
        const previousEvents = allEvents.filter(
          (e) => e.createdAt >= previousStartDate && e.createdAt < startDate
        )

        // Calculate totals
        const sent = currentEvents.filter((e) => e.type === 'sent').length
        const opened = currentEvents.filter((e) => e.type === 'opened').length
        const replied = currentEvents.filter((e) => e.type === 'replied').length

        const prevSent = previousEvents.filter((e) => e.type === 'sent').length
        const prevOpened = previousEvents.filter((e) => e.type === 'opened').length
        const prevReplied = previousEvents.filter((e) => e.type === 'replied').length

        // Group by day for chart
        const chartMap = new Map()
        currentEvents.forEach((e) => {
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
        const clientsQuery = query(collection(db, 'clients'), where('orgId', '==', currentOrg.id))
        const clientsSnap = await getDocs(clientsQuery)
        const clients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

        const byClient = clients
          .map((client) => {
            const clientEvents = currentEvents.filter((e) => e.clientId === client.id)
            const cSent = clientEvents.filter((e) => e.type === 'sent').length
            const cOpened = clientEvents.filter((e) => e.type === 'opened').length
            const cReplied = clientEvents.filter((e) => e.type === 'replied').length
            return {
              name: client.name,
              sent: cSent,
              openRate: cSent > 0 ? Math.round((cOpened / cSent) * 100) : 0,
              replyRate: cSent > 0 ? Math.round((cReplied / cSent) * 100) : 0,
            }
          })
          .filter((c) => c.sent > 0)
          .sort((a, b) => b.sent - a.sent)

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
          },
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
