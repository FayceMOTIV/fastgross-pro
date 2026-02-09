/**
 * Organization Service v2.0
 * Multi-tenant organization management with RBAC
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ROLES } from './permissions'

// Plan definitions with limits
export const PLANS = {
  trial: {
    label: 'Essai',
    maxUsers: 1,
    maxProspects: 100,
    maxSequences: 2,
    maxChannels: ['email'],
    maxEmailsPerMonth: 200,
    features: ['email_basic'],
    price: 0,
  },
  solo: {
    label: 'Solo',
    maxUsers: 1,
    maxProspects: 500,
    maxSequences: 5,
    maxChannels: ['email', 'sms'],
    maxEmailsPerMonth: 1000,
    features: ['email_basic', 'sms_basic', 'templates'],
    price: 29,
  },
  startup: {
    label: 'Startup',
    maxUsers: 5,
    maxProspects: 2000,
    maxSequences: 20,
    maxChannels: ['email', 'sms', 'whatsapp'],
    maxEmailsPerMonth: 5000,
    features: ['email_basic', 'sms_basic', 'whatsapp', 'templates', 'sequences', 'analytics'],
    price: 79,
  },
  agency: {
    label: 'Agence',
    maxUsers: 20,
    maxProspects: 10000,
    maxSequences: 100,
    maxChannels: ['email', 'sms', 'whatsapp', 'instagram_dm', 'voicemail', 'courrier'],
    maxEmailsPerMonth: 25000,
    features: [
      'email_basic',
      'sms_basic',
      'whatsapp',
      'instagram',
      'voicemail',
      'courrier',
      'templates',
      'sequences',
      'analytics',
      'api',
      'webhooks',
    ],
    price: 199,
  },
  enterprise: {
    label: 'Enterprise',
    maxUsers: -1, // Unlimited
    maxProspects: -1,
    maxSequences: -1,
    maxChannels: [
      'email',
      'sms',
      'whatsapp',
      'instagram_dm',
      'facebook_dm',
      'voicemail',
      'courrier',
    ],
    maxEmailsPerMonth: -1,
    features: ['all'],
    price: 499,
  },
}

/**
 * Create a new organization
 */
export async function createOrganization(user, orgData) {
  const orgRef = doc(collection(db, 'organizations'))
  const now = new Date()
  const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days trial

  const organization = {
    name: orgData.name,
    slug: generateSlug(orgData.name),
    logo: orgData.logo || null,
    plan: 'trial',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ownerId: user.uid,

    // Billing info
    billing: {
      plan: 'trial',
      trialEndsAt: trialEnds,
      stripeCustomerId: null,
      subscriptionId: null,
      nextBillingDate: null,
    },

    // Plan limits
    limits: { ...PLANS.trial },

    // Organization settings
    settings: {
      timezone: 'Europe/Paris',
      language: 'fr',
      brandColor: '#00d49a',
      emailFooter: null,
      defaultSequenceDelay: 2, // days
    },

    // Usage counters
    usage: {
      currentProspects: 0,
      currentSequences: 0,
      emailsSentThisMonth: 0,
      lastResetDate: serverTimestamp(),
    },
  }

  // Create org document
  await setDoc(orgRef, organization)

  // Add creator as owner
  await setDoc(doc(db, 'organizations', orgRef.id, 'members', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null,
    role: 'owner',
    joinedAt: serverTimestamp(),
    invitedBy: null,
    status: 'active',
  })

  // Create default settings documents
  await initializeOrgDefaults(orgRef.id)

  return { id: orgRef.id, ...organization, role: 'owner' }
}

/**
 * Initialize default organization settings and data
 */
async function initializeOrgDefaults(orgId) {
  const batch = writeBatch(db)

  // Default channel configurations
  const channels = [
    { id: 'email', enabled: true, provider: null, config: {} },
    { id: 'sms', enabled: false, provider: null, config: {} },
    { id: 'whatsapp', enabled: false, provider: null, config: {} },
    { id: 'instagram_dm', enabled: false, provider: null, config: {} },
    { id: 'voicemail', enabled: false, provider: null, config: {} },
    { id: 'courrier', enabled: false, provider: null, config: {} },
  ]

  channels.forEach((channel) => {
    const ref = doc(db, 'organizations', orgId, 'channels', channel.id)
    batch.set(ref, { ...channel, updatedAt: serverTimestamp() })
  })

  // Default settings
  const settingsRef = doc(db, 'organizations', orgId, 'settings', 'general')
  batch.set(settingsRef, {
    notifications: {
      emailDigest: true,
      replyAlerts: true,
      weeklyReport: true,
    },
    prospecting: {
      autoStopOnReply: true,
      cooldownDays: 30,
      maxContactsPerDomain: 5,
    },
    rgpd: {
      consentRequired: true,
      retentionDays: 365,
      autoDeleteInactive: true,
    },
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId) {
  const orgDoc = await getDoc(doc(db, 'organizations', orgId))
  if (!orgDoc.exists()) return null
  return { id: orgDoc.id, ...orgDoc.data() }
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId) {
  const userOrgs = []

  try {
    // Query user's memberships using collectionGroup
    const membershipsQuery = query(
      collectionGroup(db, 'members'),
      where('uid', '==', userId),
      where('status', '==', 'active')
    )

    const membershipsSnapshot = await getDocs(membershipsQuery)

    for (const memberDoc of membershipsSnapshot.docs) {
      // Get org ID from parent path: organizations/{orgId}/members/{memberId}
      const orgId = memberDoc.ref.parent.parent.id

      try {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId))
        if (orgDoc.exists()) {
          userOrgs.push({
            id: orgId,
            ...orgDoc.data(),
            role: memberDoc.data().role,
            memberData: memberDoc.data(),
          })
        }
      } catch (err) {
        console.warn(`Could not fetch org ${orgId}:`, err.message)
      }
    }
  } catch (err) {
    console.warn('CollectionGroup query failed, trying alternative:', err.message)
    // Fallback: check user profile for org references
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists() && userDoc.data().defaultOrgId) {
        const orgId = userDoc.data().defaultOrgId
        const orgDoc = await getDoc(doc(db, 'organizations', orgId))
        const memberDoc = await getDoc(doc(db, 'organizations', orgId, 'members', userId))

        if (orgDoc.exists() && memberDoc.exists()) {
          userOrgs.push({
            id: orgId,
            ...orgDoc.data(),
            role: memberDoc.data().role,
            memberData: memberDoc.data(),
          })
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback org fetch failed:', fallbackErr.message)
    }
  }

  return userOrgs.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
}

/**
 * Update organization
 */
export async function updateOrganization(orgId, updates) {
  const orgRef = doc(db, 'organizations', orgId)
  await updateDoc(orgRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete organization (soft delete)
 */
export async function deleteOrganization(orgId) {
  await updateDoc(doc(db, 'organizations', orgId), {
    deletedAt: serverTimestamp(),
    status: 'deleted',
  })
}

// ==========================================
// MEMBER MANAGEMENT
// ==========================================

/**
 * Get all members of an organization
 */
export async function getOrgMembers(orgId) {
  const membersSnapshot = await getDocs(
    query(collection(db, 'organizations', orgId, 'members'), orderBy('joinedAt', 'desc'))
  )

  return membersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Get single member
 */
export async function getOrgMember(orgId, userId) {
  const memberDoc = await getDoc(doc(db, 'organizations', orgId, 'members', userId))
  if (!memberDoc.exists()) return null
  return { id: memberDoc.id, ...memberDoc.data() }
}

/**
 * Update member role
 */
export async function updateMemberRole(orgId, userId, newRole) {
  if (!ROLES[newRole]) {
    throw new Error('Role invalide')
  }

  await updateDoc(doc(db, 'organizations', orgId, 'members', userId), {
    role: newRole,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove member from organization
 */
export async function removeMember(orgId, userId) {
  await deleteDoc(doc(db, 'organizations', orgId, 'members', userId))
}

// ==========================================
// INVITATION SYSTEM
// ==========================================

/**
 * Create invitation
 */
export async function createInvitation(orgId, inviterUser, inviteData) {
  const inviteRef = doc(collection(db, 'organizations', orgId, 'invitations'))
  const token = generateInviteToken()

  const invitation = {
    email: inviteData.email.toLowerCase(),
    role: inviteData.role || 'member',
    token,
    invitedBy: {
      uid: inviterUser.uid,
      email: inviterUser.email,
      displayName: inviterUser.displayName,
    },
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status: 'pending',
    message: inviteData.message || null,
  }

  await setDoc(inviteRef, invitation)

  return { id: inviteRef.id, ...invitation }
}

/**
 * Get pending invitations
 */
export async function getPendingInvitations(orgId) {
  const invitesSnapshot = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'invitations'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )
  )

  return invitesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Accept invitation
 */
export async function acceptInvitation(orgId, inviteId, user) {
  const inviteRef = doc(db, 'organizations', orgId, 'invitations', inviteId)
  const inviteDoc = await getDoc(inviteRef)

  if (!inviteDoc.exists()) {
    throw new Error('Invitation non trouvee')
  }

  const invite = inviteDoc.data()

  if (invite.status !== 'pending') {
    throw new Error('Invitation deja utilisee')
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error('Email non correspondant')
  }

  if (invite.expiresAt.toDate() < new Date()) {
    throw new Error('Invitation expiree')
  }

  const batch = writeBatch(db)

  // Create member
  batch.set(doc(db, 'organizations', orgId, 'members', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL || null,
    role: invite.role,
    joinedAt: serverTimestamp(),
    invitedBy: invite.invitedBy.uid,
    status: 'active',
  })

  // Update invitation
  batch.update(inviteRef, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
    acceptedBy: user.uid,
  })

  await batch.commit()
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(orgId, inviteId) {
  await updateDoc(doc(db, 'organizations', orgId, 'invitations', inviteId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
  })
}

/**
 * Resend invitation
 */
export async function resendInvitation(orgId, inviteId) {
  await updateDoc(doc(db, 'organizations', orgId, 'invitations', inviteId), {
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    resentAt: serverTimestamp(),
  })
}

// ==========================================
// REAL-TIME LISTENERS
// ==========================================

/**
 * Subscribe to organization changes
 */
export function subscribeToOrganization(orgId, callback) {
  return onSnapshot(doc(db, 'organizations', orgId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() })
    }
  })
}

/**
 * Subscribe to members changes
 */
export function subscribeToMembers(orgId, callback) {
  return onSnapshot(query(collection(db, 'organizations', orgId, 'members')), (snapshot) => {
    const members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(members)
  })
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateInviteToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export default {
  PLANS,
  createOrganization,
  getOrganization,
  getUserOrganizations,
  updateOrganization,
  deleteOrganization,
  getOrgMembers,
  getOrgMember,
  updateMemberRole,
  removeMember,
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  subscribeToOrganization,
  subscribeToMembers,
}
