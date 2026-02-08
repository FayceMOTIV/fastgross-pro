/**
 * Prospects Service v2.0
 * Multi-tenant prospect management with real-time sync
 */

import {
  collection,
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
  startAfter,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Prospect status definitions
export const PROSPECT_STATUS = {
  new: {
    label: 'Nouveau',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  contacted: {
    label: 'Contacte',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  opened: {
    label: 'A ouvert',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  clicked: {
    label: 'A clique',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  replied: {
    label: 'A repondu',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
  },
  converted: {
    label: 'Converti',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  lost: { label: 'Perdu', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  blacklisted: {
    label: 'Blackliste',
    color: 'text-dark-500',
    bg: 'bg-dark-800',
    border: 'border-dark-700',
  },
}

// Channel definitions
export const CHANNELS = {
  email: { label: 'Email', icon: 'Mail', color: 'text-emerald-400' },
  sms: { label: 'SMS', icon: 'Smartphone', color: 'text-blue-400' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'text-green-400' },
  instagram_dm: { label: 'Instagram', icon: 'Instagram', color: 'text-pink-400' },
  facebook_dm: { label: 'Facebook', icon: 'Facebook', color: 'text-blue-500' },
  voicemail: { label: 'Vocal', icon: 'Mic', color: 'text-purple-400' },
  courrier: { label: 'Courrier', icon: 'Mail', color: 'text-amber-400' },
}

/**
 * Get prospects collection reference
 */
function prospectsRef(orgId) {
  return collection(db, 'organizations', orgId, 'prospects')
}

/**
 * Create a new prospect
 */
export async function createProspect(orgId, prospectData, createdBy) {
  const prospectRef = doc(prospectsRef(orgId))

  const prospect = {
    // Identity
    firstName: prospectData.firstName || '',
    lastName: prospectData.lastName || '',
    email: prospectData.email?.toLowerCase() || null,
    phone: prospectData.phone || null,

    // Professional
    company: prospectData.company || null,
    jobTitle: prospectData.jobTitle || null,
    website: prospectData.website || null,
    linkedin: prospectData.linkedin || null,

    // Location
    city: prospectData.city || null,
    country: prospectData.country || 'France',

    // Channels availability
    channels: {
      email: { available: !!prospectData.email, verified: false },
      sms: { available: !!prospectData.phone, verified: false },
      whatsapp: { available: !!prospectData.phone, verified: false },
      instagram_dm: { available: !!prospectData.instagram, handle: prospectData.instagram || null },
      facebook_dm: { available: false, handle: null },
      voicemail: { available: !!prospectData.phone, verified: false },
      courrier: { available: !!prospectData.city, address: prospectData.address || null },
    },

    // Status & scoring
    status: 'new',
    score: prospectData.score || 5,
    tags: prospectData.tags || [],
    source: prospectData.source || 'manual',

    // Sequence enrollment
    currentSequenceId: null,
    sequenceStep: 0,
    sequenceStatus: null, // 'active', 'paused', 'completed', 'stopped'

    // Activity tracking
    lastContactedAt: null,
    lastOpenedAt: null,
    lastClickedAt: null,
    lastRepliedAt: null,
    totalEmailsSent: 0,
    totalOpens: 0,
    totalClicks: 0,

    // Reply data
    hasReplied: false,
    replyChannel: null,
    replyContent: null,
    replyReceivedAt: null,

    // RGPD
    consentDate: prospectData.consentDate || null,
    optOutDate: null,
    dataRetentionExpiry: null,

    // Notes
    notes: prospectData.notes || null,

    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy?.uid || null,
    assignedTo: prospectData.assignedTo || createdBy?.uid || null,
  }

  await setDoc(prospectRef, prospect)

  // Update org usage counter
  await updateDoc(doc(db, 'organizations', orgId), {
    'usage.currentProspects': increment(1),
  })

  return { id: prospectRef.id, ...prospect }
}

/**
 * Get prospect by ID
 */
export async function getProspect(orgId, prospectId) {
  const prospectDoc = await getDoc(doc(prospectsRef(orgId), prospectId))
  if (!prospectDoc.exists()) return null
  return { id: prospectDoc.id, ...prospectDoc.data() }
}

/**
 * Get prospects with filters and pagination
 */
export async function getProspects(orgId, options = {}) {
  const {
    status,
    channel,
    tags,
    search,
    assignedTo,
    sequenceId,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    pageSize = 50,
    lastDoc,
  } = options

  let q = query(prospectsRef(orgId))

  // Apply filters
  if (status && status !== 'all') {
    q = query(q, where('status', '==', status))
  }

  if (channel) {
    q = query(q, where(`channels.${channel}.available`, '==', true))
  }

  if (assignedTo) {
    q = query(q, where('assignedTo', '==', assignedTo))
  }

  if (sequenceId) {
    q = query(q, where('currentSequenceId', '==', sequenceId))
  }

  // Order and pagination
  q = query(q, orderBy(orderByField, orderDirection), limit(pageSize))

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snapshot = await getDocs(q)
  const prospects = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Client-side filtering for complex queries
  let filtered = prospects

  if (tags?.length > 0) {
    filtered = filtered.filter((p) => tags.some((tag) => p.tags?.includes(tag)))
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.firstName?.toLowerCase().includes(searchLower) ||
        p.lastName?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.company?.toLowerCase().includes(searchLower)
    )
  }

  return {
    prospects: filtered,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  }
}

/**
 * Update prospect
 */
export async function updateProspect(orgId, prospectId, updates) {
  const prospectRef = doc(prospectsRef(orgId), prospectId)

  await updateDoc(prospectRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Update prospect status
 */
export async function updateProspectStatus(orgId, prospectId, status, metadata = {}) {
  const updates = {
    status,
    updatedAt: serverTimestamp(),
    ...metadata,
  }

  // Handle specific status changes
  if (status === 'replied') {
    updates.hasReplied = true
    updates.lastRepliedAt = serverTimestamp()
    updates.sequenceStatus = 'stopped'
  } else if (status === 'converted') {
    updates.sequenceStatus = 'completed'
  } else if (status === 'blacklisted') {
    updates.sequenceStatus = 'stopped'
    updates.optOutDate = serverTimestamp()
  }

  await updateProspect(orgId, prospectId, updates)
}

/**
 * Delete prospect
 */
export async function deleteProspect(orgId, prospectId) {
  await deleteDoc(doc(prospectsRef(orgId), prospectId))

  // Update org usage counter
  await updateDoc(doc(db, 'organizations', orgId), {
    'usage.currentProspects': increment(-1),
  })
}

/**
 * Bulk update prospects
 */
export async function bulkUpdateProspects(orgId, prospectIds, updates) {
  const batch = writeBatch(db)

  prospectIds.forEach((id) => {
    const ref = doc(prospectsRef(orgId), id)
    batch.update(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}

/**
 * Bulk delete prospects
 */
export async function bulkDeleteProspects(orgId, prospectIds) {
  const batch = writeBatch(db)

  prospectIds.forEach((id) => {
    batch.delete(doc(prospectsRef(orgId), id))
  })

  await batch.commit()

  // Update org usage counter
  await updateDoc(doc(db, 'organizations', orgId), {
    'usage.currentProspects': increment(-prospectIds.length),
  })
}

/**
 * Import prospects from CSV/Excel
 */
export async function importProspects(orgId, prospects, createdBy) {
  const batch = writeBatch(db)
  const results = { success: 0, errors: [] }

  for (const prospect of prospects) {
    try {
      if (!prospect.email && !prospect.phone) {
        results.errors.push({ prospect, error: 'Email ou telephone requis' })
        continue
      }

      const prospectRef = doc(prospectsRef(orgId))
      const prospectData = {
        firstName: prospect.firstName || prospect.prenom || '',
        lastName: prospect.lastName || prospect.nom || '',
        email: prospect.email?.toLowerCase() || null,
        phone: prospect.phone || prospect.telephone || null,
        company: prospect.company || prospect.entreprise || null,
        jobTitle: prospect.jobTitle || prospect.poste || null,
        website: prospect.website || null,
        city: prospect.city || prospect.ville || null,
        country: prospect.country || prospect.pays || 'France',
        source: 'import',
        status: 'new',
        score: 5,
        tags: prospect.tags ? prospect.tags.split(',').map((t) => t.trim()) : [],
        channels: {
          email: { available: !!prospect.email, verified: false },
          sms: { available: !!prospect.phone, verified: false },
          whatsapp: { available: !!prospect.phone, verified: false },
          instagram_dm: { available: false, handle: null },
          facebook_dm: { available: false, handle: null },
          voicemail: { available: !!prospect.phone, verified: false },
          courrier: { available: !!prospect.city, address: prospect.address || null },
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: createdBy?.uid || null,
      }

      batch.set(prospectRef, prospectData)
      results.success++
    } catch (error) {
      results.errors.push({ prospect, error: error.message })
    }
  }

  if (results.success > 0) {
    await batch.commit()

    // Update org usage counter
    await updateDoc(doc(db, 'organizations', orgId), {
      'usage.currentProspects': increment(results.success),
    })
  }

  return results
}

/**
 * Add activity to prospect
 */
export async function addProspectActivity(orgId, prospectId, activity) {
  const activityRef = doc(
    collection(db, 'organizations', orgId, 'prospects', prospectId, 'activities')
  )

  await setDoc(activityRef, {
    ...activity,
    createdAt: serverTimestamp(),
  })

  // Update prospect tracking fields based on activity type
  const prospectUpdates = { updatedAt: serverTimestamp() }

  switch (activity.type) {
    case 'email_sent':
      prospectUpdates.lastContactedAt = serverTimestamp()
      prospectUpdates.totalEmailsSent = increment(1)
      break
    case 'email_opened':
      prospectUpdates.lastOpenedAt = serverTimestamp()
      prospectUpdates.totalOpens = increment(1)
      if (activity.updateStatus) prospectUpdates.status = 'opened'
      break
    case 'email_clicked':
      prospectUpdates.lastClickedAt = serverTimestamp()
      prospectUpdates.totalClicks = increment(1)
      if (activity.updateStatus) prospectUpdates.status = 'clicked'
      break
    case 'reply_received':
      prospectUpdates.hasReplied = true
      prospectUpdates.lastRepliedAt = serverTimestamp()
      prospectUpdates.replyChannel = activity.channel
      prospectUpdates.replyContent = activity.content
      prospectUpdates.status = 'replied'
      prospectUpdates.sequenceStatus = 'stopped'
      break
  }

  await updateProspect(orgId, prospectId, prospectUpdates)
}

/**
 * Get prospect activities
 */
export async function getProspectActivities(orgId, prospectId, limit_count = 50) {
  const activitiesSnapshot = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'prospects', prospectId, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    )
  )

  return activitiesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Subscribe to prospects changes
 */
export function subscribeToProspects(orgId, callback, options = {}) {
  let q = query(prospectsRef(orgId), orderBy('updatedAt', 'desc'), limit(100))

  if (options.status) {
    q = query(
      prospectsRef(orgId),
      where('status', '==', options.status),
      orderBy('updatedAt', 'desc'),
      limit(100)
    )
  }

  return onSnapshot(q, (snapshot) => {
    const prospects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(prospects)
  })
}

/**
 * Get prospect stats
 */
export async function getProspectStats(orgId) {
  const prospects = await getDocs(prospectsRef(orgId))

  const stats = {
    total: 0,
    byStatus: {},
    byChannel: {},
    replied: 0,
    avgScore: 0,
  }

  let totalScore = 0

  prospects.forEach((doc) => {
    const data = doc.data()
    stats.total++
    totalScore += data.score || 0

    // By status
    stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1

    // By channel
    Object.entries(data.channels || {}).forEach(([channel, config]) => {
      if (config?.available) {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1
      }
    })

    if (data.hasReplied) stats.replied++
  })

  stats.avgScore = stats.total > 0 ? (totalScore / stats.total).toFixed(1) : 0

  return stats
}

export default {
  PROSPECT_STATUS,
  CHANNELS,
  createProspect,
  getProspect,
  getProspects,
  updateProspect,
  updateProspectStatus,
  deleteProspect,
  bulkUpdateProspects,
  bulkDeleteProspects,
  importProspects,
  addProspectActivity,
  getProspectActivities,
  subscribeToProspects,
  getProspectStats,
}
