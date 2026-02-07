import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './AuthContext'
import { useDemo } from './DemoContext'
import {
  createOrganization,
  getUserOrganizations,
  updateOrganization,
  getOrgMembers,
  subscribeToOrganization,
  subscribeToMembers,
  createInvitation,
  getPendingInvitations,
  PLANS,
} from '@/services/organization'
import {
  hasPermission,
  hasMinRole,
  canPerform,
  getRoleInfo,
  getAssignableRoles,
  ROLES,
  PERMISSIONS,
} from '@/services/permissions'

const OrgContext = createContext(null)

// Demo mode mock data
const DEMO_ORG = {
  id: 'demo-org',
  name: 'Demo Organisation',
  slug: 'demo',
  logo: null,
  role: 'owner',
  billing: {
    plan: 'pro',
    status: 'active',
    trialEndsAt: null,
  },
  usage: {
    currentProspects: 127,
    currentSequences: 5,
    emailsSentThisMonth: 1250,
  },
  limits: {
    maxProspects: 5000,
    maxSequences: 20,
    maxEmailsPerMonth: 10000,
    maxChannels: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier'],
  },
}

const DEMO_MEMBERS = [
  { id: '1', uid: 'demo-user', displayName: 'Utilisateur Demo', email: 'demo@facemedia.fr', role: 'owner', status: 'active', lastActiveAt: new Date() },
  { id: '2', uid: 'demo-admin', displayName: 'Admin Test', email: 'admin@facemedia.fr', role: 'admin', status: 'active', lastActiveAt: new Date(Date.now() - 3600000) },
  { id: '3', uid: 'demo-manager', displayName: 'Manager Test', email: 'manager@facemedia.fr', role: 'manager', status: 'active', lastActiveAt: new Date(Date.now() - 7200000) },
]

export function OrgProvider({ children }) {
  const { user } = useAuth()
  const { isDemo } = useDemo()

  // State
  const [currentOrg, setCurrentOrg] = useState(isDemo ? DEMO_ORG : null)
  const [orgs, setOrgs] = useState(isDemo ? [DEMO_ORG] : [])
  const [members, setMembers] = useState(isDemo ? DEMO_MEMBERS : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(null)

  // Current user's role in the current org
  const currentRole = useMemo(() => {
    if (!currentOrg || !user) return null
    return currentOrg.role || 'viewer'
  }, [currentOrg, user])

  // Role info for current user
  const roleInfo = useMemo(() => {
    return getRoleInfo(currentRole)
  }, [currentRole])

  // Fetch user's organizations
  useEffect(() => {
    // Skip fetching in demo mode
    if (isDemo) {
      setCurrentOrg(DEMO_ORG)
      setOrgs([DEMO_ORG])
      setMembers(DEMO_MEMBERS)
      setLoading(false)
      return
    }

    if (!user) {
      setOrgs([])
      setCurrentOrg(null)
      setMembers([])
      setLoading(false)
      return
    }

    const fetchOrgs = async () => {
      try {
        setLoading(true)
        setError(null)

        const userOrgs = await getUserOrganizations(user.uid)
        setOrgs(userOrgs)

        // Auto-select org from localStorage or first available
        const savedOrgId = localStorage.getItem('fmf_current_org')
        const savedOrg = userOrgs.find((o) => o.id === savedOrgId)
        const selectedOrg = savedOrg || userOrgs[0] || null

        setCurrentOrg(selectedOrg)

        if (selectedOrg) {
          localStorage.setItem('fmf_current_org', selectedOrg.id)
        }
      } catch (err) {
        console.error('Error fetching organizations:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchOrgs()
  }, [user, isDemo])

  // Subscribe to current org and members changes
  useEffect(() => {
    if (!currentOrg?.id) {
      setMembers([])
      return
    }

    // Subscribe to org changes
    const unsubOrg = subscribeToOrganization(currentOrg.id, (updatedOrg) => {
      setCurrentOrg((prev) => ({
        ...prev,
        ...updatedOrg,
        role: prev?.role, // Preserve role
      }))
    })

    // Subscribe to members changes
    const unsubMembers = subscribeToMembers(currentOrg.id, (updatedMembers) => {
      setMembers(updatedMembers)
    })

    return () => {
      unsubOrg()
      unsubMembers()
    }
  }, [currentOrg?.id])

  // Create a new organization
  const createOrg = useCallback(
    async (name, logo = null) => {
      if (!user) throw new Error('Must be authenticated')

      const newOrg = await createOrganization(user, { name, logo })

      setOrgs((prev) => [...prev, newOrg])
      setCurrentOrg(newOrg)
      localStorage.setItem('fmf_current_org', newOrg.id)

      return newOrg
    },
    [user]
  )

  // Switch organization
  const switchOrg = useCallback(
    (orgId) => {
      const org = orgs.find((o) => o.id === orgId)
      if (org) {
        setCurrentOrg(org)
        localStorage.setItem('fmf_current_org', orgId)
      }
    },
    [orgs]
  )

  // Update current organization
  const updateOrg = useCallback(
    async (updates) => {
      if (!currentOrg?.id) throw new Error('No organization selected')

      await updateOrganization(currentOrg.id, updates)
    },
    [currentOrg?.id]
  )

  // Permission checks
  const can = useCallback(
    (permission) => {
      return hasPermission(currentRole, permission)
    },
    [currentRole]
  )

  const canAction = useCallback(
    (action, resource) => {
      return canPerform(currentRole, action, resource)
    },
    [currentRole]
  )

  const isRoleAtLeast = useCallback(
    (minRole) => {
      return hasMinRole(currentRole, minRole)
    },
    [currentRole]
  )

  // Get members that current user can manage
  const manageableMembers = useMemo(() => {
    if (!currentRole) return []
    const userLevel = ROLES[currentRole]?.level || 0

    return members.filter((member) => {
      const memberLevel = ROLES[member.role]?.level || 0
      return userLevel > memberLevel
    })
  }, [members, currentRole])

  // Get roles that current user can assign
  const assignableRoles = useMemo(() => {
    return getAssignableRoles(currentRole)
  }, [currentRole])

  // Check if org is on trial
  const isTrialActive = useMemo(() => {
    if (!currentOrg?.billing) return false
    const trialEnds = currentOrg.billing.trialEndsAt?.toDate?.()
    return trialEnds && trialEnds > new Date()
  }, [currentOrg])

  // Trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!currentOrg?.billing?.trialEndsAt) return 0
    const trialEnds = currentOrg.billing.trialEndsAt.toDate?.()
    if (!trialEnds) return 0

    const diff = trialEnds - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [currentOrg])

  // Plan limits
  const limits = useMemo(() => {
    const plan = currentOrg?.billing?.plan || 'trial'
    return PLANS[plan] || PLANS.trial
  }, [currentOrg])

  // Usage stats
  const usage = useMemo(() => {
    return currentOrg?.usage || {
      currentProspects: 0,
      currentSequences: 0,
      emailsSentThisMonth: 0,
    }
  }, [currentOrg])

  // Check if limit reached
  const isLimitReached = useCallback(
    (limitType) => {
      const limit = limits[limitType]
      if (limit === -1) return false // Unlimited

      switch (limitType) {
        case 'maxProspects':
          return usage.currentProspects >= limit
        case 'maxSequences':
          return usage.currentSequences >= limit
        case 'maxUsers':
          return members.length >= limit
        case 'maxEmailsPerMonth':
          return usage.emailsSentThisMonth >= limit
        default:
          return false
      }
    },
    [limits, usage, members.length]
  )

  // Check if channel is available in current plan
  const isChannelAvailable = useCallback(
    (channel) => {
      return limits.maxChannels?.includes(channel) || false
    },
    [limits]
  )

  // Check if feature is available in current plan
  const hasFeature = useCallback(
    (feature) => {
      if (limits.features?.includes('all')) return true
      return limits.features?.includes(feature) || false
    },
    [limits]
  )

  const value = {
    // Data
    currentOrg,
    orgs,
    members,
    currentRole,
    roleInfo,
    loading,
    error,

    // Actions
    createOrg,
    switchOrg,
    updateOrg,

    // Permissions
    can,
    canAction,
    isRoleAtLeast,
    manageableMembers,
    assignableRoles,

    // Plan & Billing
    isTrialActive,
    trialDaysRemaining,
    limits,
    usage,
    isLimitReached,
    isChannelAvailable,
    hasFeature,

    // Static exports
    ROLES,
    PERMISSIONS,
    PLANS,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return context
}

export default OrgContext
