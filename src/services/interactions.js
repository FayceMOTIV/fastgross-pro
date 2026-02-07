/**
 * Interactions Service v2.0
 * All channel interactions tracking
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Interaction types
export const INTERACTION_TYPES = {
  // Outbound
  email_sent: { label: 'Email envoye', icon: 'Send', color: 'text-emerald-400', direction: 'out' },
  sms_sent: { label: 'SMS envoye', icon: 'Smartphone', color: 'text-blue-400', direction: 'out' },
  whatsapp_sent: { label: 'WhatsApp envoye', icon: 'MessageCircle', color: 'text-green-400', direction: 'out' },
  instagram_dm_sent: { label: 'DM Instagram envoye', icon: 'Instagram', color: 'text-pink-400', direction: 'out' },
  voicemail_sent: { label: 'Vocal envoye', icon: 'Mic', color: 'text-purple-400', direction: 'out' },
  courrier_sent: { label: 'Courrier envoye', icon: 'Mail', color: 'text-amber-400', direction: 'out' },

  // Tracking
  email_opened: { label: 'Email ouvert', icon: 'Eye', color: 'text-amber-400', direction: 'track' },
  email_clicked: { label: 'Lien clique', icon: 'MousePointer', color: 'text-blue-400', direction: 'track' },
  email_bounced: { label: 'Email bounce', icon: 'AlertTriangle', color: 'text-red-400', direction: 'track' },
  sms_delivered: { label: 'SMS livre', icon: 'Check', color: 'text-brand-400', direction: 'track' },
  whatsapp_read: { label: 'WhatsApp lu', icon: 'CheckCheck', color: 'text-green-400', direction: 'track' },
  courrier_delivered: { label: 'Courrier livre', icon: 'Package', color: 'text-amber-400', direction: 'track' },

  // Inbound
  email_reply: { label: 'Reponse email', icon: 'Reply', color: 'text-brand-400', direction: 'in' },
  sms_reply: { label: 'Reponse SMS', icon: 'MessageSquare', color: 'text-blue-400', direction: 'in' },
  whatsapp_reply: { label: 'Reponse WhatsApp', icon: 'MessageCircle', color: 'text-green-400', direction: 'in' },
  instagram_reply: { label: 'Reponse Instagram', icon: 'Instagram', color: 'text-pink-400', direction: 'in' },
  call_received: { label: 'Appel recu', icon: 'Phone', color: 'text-purple-400', direction: 'in' },

  // Status changes
  prospect_created: { label: 'Prospect cree', icon: 'UserPlus', color: 'text-dark-400', direction: 'system' },
  status_changed: { label: 'Statut change', icon: 'RefreshCw', color: 'text-dark-400', direction: 'system' },
  sequence_enrolled: { label: 'Inscrit sequence', icon: 'Play', color: 'text-brand-400', direction: 'system' },
  sequence_completed: { label: 'Sequence terminee', icon: 'CheckCircle', color: 'text-emerald-400', direction: 'system' },
  sequence_stopped: { label: 'Sequence arretee', icon: 'StopCircle', color: 'text-amber-400', direction: 'system' },
  converted: { label: 'Converti', icon: 'Trophy', color: 'text-amber-400', direction: 'system' },
  blacklisted: { label: 'Blackliste', icon: 'Ban', color: 'text-red-400', direction: 'system' },
}

/**
 * Get interactions collection reference
 */
function interactionsRef(orgId) {
  return collection(db, 'organizations', orgId, 'interactions')
}

/**
 * Create a new interaction
 */
export async function createInteraction(orgId, interactionData) {
  const interactionRef = doc(interactionsRef(orgId))

  const interaction = {
    // Type and channel
    type: interactionData.type,
    channel: interactionData.channel || extractChannel(interactionData.type),
    direction: INTERACTION_TYPES[interactionData.type]?.direction || 'system',

    // Related entities
    prospectId: interactionData.prospectId,
    sequenceId: interactionData.sequenceId || null,
    stepId: interactionData.stepId || null,
    templateId: interactionData.templateId || null,

    // Content
    subject: interactionData.subject || null,
    content: interactionData.content || null,
    contentPreview: interactionData.content?.substring(0, 200) || null,

    // Metadata
    metadata: interactionData.metadata || {},

    // Tracking
    messageId: interactionData.messageId || null, // External message ID
    externalId: interactionData.externalId || null, // Provider ID

    // User
    userId: interactionData.userId || null,
    userName: interactionData.userName || null,

    // Timestamps
    createdAt: serverTimestamp(),
    occurredAt: interactionData.occurredAt || serverTimestamp(),
  }

  await setDoc(interactionRef, interaction)

  return { id: interactionRef.id, ...interaction }
}

/**
 * Extract channel from interaction type
 */
function extractChannel(type) {
  if (type.startsWith('email')) return 'email'
  if (type.startsWith('sms')) return 'sms'
  if (type.startsWith('whatsapp')) return 'whatsapp'
  if (type.startsWith('instagram')) return 'instagram_dm'
  if (type.startsWith('voicemail')) return 'voicemail'
  if (type.startsWith('courrier')) return 'courrier'
  return null
}

/**
 * Get interactions with filters
 */
export async function getInteractions(orgId, options = {}) {
  const {
    prospectId,
    sequenceId,
    channel,
    type,
    direction,
    startDate,
    endDate,
    pageSize = 50,
    lastDoc,
  } = options

  let q = query(interactionsRef(orgId), orderBy('createdAt', 'desc'), limit(pageSize))

  if (prospectId) {
    q = query(
      interactionsRef(orgId),
      where('prospectId', '==', prospectId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )
  }

  if (sequenceId) {
    q = query(
      interactionsRef(orgId),
      where('sequenceId', '==', sequenceId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    )
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snapshot = await getDocs(q)
  let interactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Client-side filtering for complex queries
  if (channel) {
    interactions = interactions.filter((i) => i.channel === channel)
  }

  if (type) {
    interactions = interactions.filter((i) => i.type === type)
  }

  if (direction) {
    interactions = interactions.filter((i) => i.direction === direction)
  }

  if (startDate) {
    const start = startDate instanceof Date ? Timestamp.fromDate(startDate) : startDate
    interactions = interactions.filter((i) =>
      i.createdAt?.toMillis?.() >= start.toMillis()
    )
  }

  if (endDate) {
    const end = endDate instanceof Date ? Timestamp.fromDate(endDate) : endDate
    interactions = interactions.filter((i) =>
      i.createdAt?.toMillis?.() <= end.toMillis()
    )
  }

  return {
    interactions,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  }
}

/**
 * Get recent interactions for dashboard
 */
export async function getRecentInteractions(orgId, limitCount = 20) {
  const snapshot = await getDocs(
    query(
      interactionsRef(orgId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  )

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Get interaction stats
 */
export async function getInteractionStats(orgId, options = {}) {
  const { startDate, endDate, channel } = options

  let q = query(interactionsRef(orgId))

  if (channel) {
    q = query(interactionsRef(orgId), where('channel', '==', channel))
  }

  const snapshot = await getDocs(q)

  const stats = {
    total: 0,
    byType: {},
    byChannel: {},
    byDirection: {
      out: 0,
      in: 0,
      track: 0,
      system: 0,
    },
    replies: 0,
    conversions: 0,
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data()

    // Date filtering
    if (startDate || endDate) {
      const createdAt = data.createdAt?.toDate?.()
      if (!createdAt) return

      if (startDate && createdAt < startDate) return
      if (endDate && createdAt > endDate) return
    }

    stats.total++
    stats.byType[data.type] = (stats.byType[data.type] || 0) + 1
    stats.byChannel[data.channel] = (stats.byChannel[data.channel] || 0) + 1
    stats.byDirection[data.direction] = (stats.byDirection[data.direction] || 0) + 1

    if (data.type.includes('reply')) stats.replies++
    if (data.type === 'converted') stats.conversions++
  })

  return stats
}

/**
 * Get channel-specific stats
 */
export async function getChannelStats(orgId, channel, days = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const snapshot = await getDocs(
    query(
      interactionsRef(orgId),
      where('channel', '==', channel),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    )
  )

  const stats = {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data()

    if (data.type.includes('sent')) stats.sent++
    if (data.type.includes('delivered')) stats.delivered++
    if (data.type.includes('opened') || data.type.includes('read')) stats.opened++
    if (data.type.includes('clicked')) stats.clicked++
    if (data.type.includes('reply')) stats.replied++
    if (data.type.includes('bounced')) stats.bounced++
  })

  // Calculate rates
  stats.openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0
  stats.clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : 0
  stats.replyRate = stats.sent > 0 ? ((stats.replied / stats.sent) * 100).toFixed(1) : 0
  stats.bounceRate = stats.sent > 0 ? ((stats.bounced / stats.sent) * 100).toFixed(1) : 0

  return stats
}

/**
 * Get prospect interaction timeline
 */
export async function getProspectTimeline(orgId, prospectId, limitCount = 50) {
  const snapshot = await getDocs(
    query(
      interactionsRef(orgId),
      where('prospectId', '==', prospectId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  )

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const typeInfo = INTERACTION_TYPES[data.type] || {}

    return {
      id: doc.id,
      ...data,
      typeInfo,
    }
  })
}

/**
 * Subscribe to real-time interactions
 */
export function subscribeToInteractions(orgId, callback, options = {}) {
  const { prospectId, limit: limitCount = 50 } = options

  let q = query(
    interactionsRef(orgId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )

  if (prospectId) {
    q = query(
      interactionsRef(orgId),
      where('prospectId', '==', prospectId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  }

  return onSnapshot(q, (snapshot) => {
    const interactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      typeInfo: INTERACTION_TYPES[doc.data().type] || {},
    }))
    callback(interactions)
  })
}

/**
 * Subscribe to new replies (for notifications)
 */
export function subscribeToReplies(orgId, callback) {
  return onSnapshot(
    query(
      interactionsRef(orgId),
      where('direction', '==', 'in'),
      orderBy('createdAt', 'desc'),
      limit(10)
    ),
    (snapshot) => {
      const replies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(replies)
    }
  )
}

export default {
  INTERACTION_TYPES,
  createInteraction,
  getInteractions,
  getRecentInteractions,
  getInteractionStats,
  getChannelStats,
  getProspectTimeline,
  subscribeToInteractions,
  subscribeToReplies,
}
