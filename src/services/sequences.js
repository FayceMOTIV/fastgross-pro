/**
 * Sequences Service v2.0
 * Multi-channel sequence orchestration
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
  serverTimestamp,
  writeBatch,
  onSnapshot,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Sequence status definitions
export const SEQUENCE_STATUS = {
  draft: { label: 'Brouillon', color: 'text-dark-400', bg: 'bg-dark-800' },
  active: { label: 'Active', color: 'text-brand-400', bg: 'bg-brand-500/10' },
  paused: { label: 'En pause', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  completed: { label: 'Terminee', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  archived: { label: 'Archivee', color: 'text-dark-500', bg: 'bg-dark-800' },
}

// Channel configurations with limits
export const CHANNEL_CONFIG = {
  email: {
    maxPerSequence: 5,
    minDelayDays: 1,
    label: 'Email',
    icon: 'Mail',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  sms: {
    maxPerSequence: 2,
    minDelayDays: 3,
    label: 'SMS',
    icon: 'Smartphone',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  whatsapp: {
    maxPerSequence: 2,
    minDelayDays: 3,
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  instagram_dm: {
    maxPerSequence: 1,
    minDelayDays: 5,
    label: 'Instagram',
    icon: 'Instagram',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  voicemail: {
    maxPerSequence: 1,
    minDelayDays: 7,
    label: 'Vocal',
    icon: 'Mic',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  courrier: {
    maxPerSequence: 1,
    minDelayDays: 14,
    label: 'Courrier',
    icon: 'Mail',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
}

// Orchestration rules
export const ORCHESTRATION_RULES = {
  stopOnAnyReply: true,
  minDelayBetweenContacts: 24, // hours
  maxContactsPerDay: 1,
  respectOptOut: true,
  trackOpens: true,
  trackClicks: true,
}

/**
 * Get sequences collection reference
 */
function sequencesRef(orgId) {
  return collection(db, 'organizations', orgId, 'sequences')
}

/**
 * Create a new sequence
 */
export async function createSequence(orgId, sequenceData, createdBy) {
  const sequenceRef = doc(sequencesRef(orgId))

  const sequence = {
    name: sequenceData.name,
    description: sequenceData.description || null,
    status: 'draft',

    // Channels used in this sequence
    channels: sequenceData.channels || ['email'],

    // Sequence configuration
    config: {
      stopOnReply: sequenceData.stopOnReply ?? true,
      trackOpens: sequenceData.trackOpens ?? true,
      trackClicks: sequenceData.trackClicks ?? true,
      sendWindow: sequenceData.sendWindow || {
        startHour: 9,
        endHour: 18,
        timezone: 'Europe/Paris',
        weekdaysOnly: true,
      },
      ...sequenceData.config,
    },

    // Target filters
    targetFilters: sequenceData.targetFilters || {
      status: ['new'],
      minScore: 0,
      tags: [],
      excludeTags: [],
    },

    // Stats
    stats: {
      enrolled: 0,
      active: 0,
      completed: 0,
      stopped: 0,
      replied: 0,
      converted: 0,
    },

    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy?.uid || null,
    lastActivatedAt: null,
    lastPausedAt: null,
  }

  await setDoc(sequenceRef, sequence)

  // Create default steps if provided
  if (sequenceData.steps?.length > 0) {
    const batch = writeBatch(db)

    sequenceData.steps.forEach((step, index) => {
      const stepRef = doc(collection(db, 'organizations', orgId, 'sequences', sequenceRef.id, 'steps'))
      batch.set(stepRef, {
        order: index,
        channel: step.channel || 'email',
        delayDays: step.delayDays || (index === 0 ? 0 : 2),
        templateId: step.templateId || null,
        subject: step.subject || null,
        content: step.content || null,
        createdAt: serverTimestamp(),
      })
    })

    await batch.commit()
  }

  // Update org usage counter
  await updateDoc(doc(db, 'organizations', orgId), {
    'usage.currentSequences': increment(1),
  })

  return { id: sequenceRef.id, ...sequence }
}

/**
 * Get sequence by ID with steps
 */
export async function getSequence(orgId, sequenceId) {
  const sequenceDoc = await getDoc(doc(sequencesRef(orgId), sequenceId))
  if (!sequenceDoc.exists()) return null

  // Get steps
  const stepsSnapshot = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'sequences', sequenceId, 'steps'),
      orderBy('order', 'asc')
    )
  )

  const steps = stepsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  return {
    id: sequenceDoc.id,
    ...sequenceDoc.data(),
    steps,
  }
}

/**
 * Get all sequences
 */
export async function getSequences(orgId, options = {}) {
  const { status, includeArchived = false } = options

  let q = query(sequencesRef(orgId), orderBy('updatedAt', 'desc'))

  if (status) {
    q = query(sequencesRef(orgId), where('status', '==', status), orderBy('updatedAt', 'desc'))
  }

  const snapshot = await getDocs(q)
  let sequences = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  if (!includeArchived) {
    sequences = sequences.filter((s) => s.status !== 'archived')
  }

  return sequences
}

/**
 * Update sequence
 */
export async function updateSequence(orgId, sequenceId, updates) {
  const sequenceRef = doc(sequencesRef(orgId), sequenceId)

  await updateDoc(sequenceRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Update sequence status
 */
export async function updateSequenceStatus(orgId, sequenceId, status) {
  const updates = {
    status,
    updatedAt: serverTimestamp(),
  }

  if (status === 'active') {
    updates.lastActivatedAt = serverTimestamp()
  } else if (status === 'paused') {
    updates.lastPausedAt = serverTimestamp()
  }

  await updateSequence(orgId, sequenceId, updates)
}

/**
 * Delete sequence
 */
export async function deleteSequence(orgId, sequenceId) {
  // Delete all steps first
  const stepsSnapshot = await getDocs(
    collection(db, 'organizations', orgId, 'sequences', sequenceId, 'steps')
  )

  const batch = writeBatch(db)

  stepsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  // Delete sequence
  batch.delete(doc(sequencesRef(orgId), sequenceId))

  await batch.commit()

  // Update org usage counter
  await updateDoc(doc(db, 'organizations', orgId), {
    'usage.currentSequences': increment(-1),
  })
}

/**
 * Duplicate sequence
 */
export async function duplicateSequence(orgId, sequenceId, createdBy) {
  const original = await getSequence(orgId, sequenceId)
  if (!original) throw new Error('Sequence non trouvee')

  const newSequence = await createSequence(
    orgId,
    {
      name: `${original.name} (copie)`,
      description: original.description,
      channels: original.channels,
      config: original.config,
      targetFilters: original.targetFilters,
      steps: original.steps,
    },
    createdBy
  )

  return newSequence
}

// ==========================================
// SEQUENCE STEPS
// ==========================================

/**
 * Add step to sequence
 */
export async function addSequenceStep(orgId, sequenceId, stepData) {
  // Get current step count
  const stepsSnapshot = await getDocs(
    collection(db, 'organizations', orgId, 'sequences', sequenceId, 'steps')
  )

  const stepRef = doc(collection(db, 'organizations', orgId, 'sequences', sequenceId, 'steps'))

  await setDoc(stepRef, {
    order: stepsSnapshot.size,
    channel: stepData.channel || 'email',
    delayDays: stepData.delayDays || 2,
    templateId: stepData.templateId || null,
    subject: stepData.subject || null,
    content: stepData.content || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Update sequence channels list
  const sequence = await getDoc(doc(sequencesRef(orgId), sequenceId))
  const channels = new Set(sequence.data()?.channels || [])
  channels.add(stepData.channel)

  await updateSequence(orgId, sequenceId, {
    channels: Array.from(channels),
  })

  return { id: stepRef.id }
}

/**
 * Update sequence step
 */
export async function updateSequenceStep(orgId, sequenceId, stepId, updates) {
  const stepRef = doc(db, 'organizations', orgId, 'sequences', sequenceId, 'steps', stepId)

  await updateDoc(stepRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete sequence step
 */
export async function deleteSequenceStep(orgId, sequenceId, stepId) {
  await deleteDoc(doc(db, 'organizations', orgId, 'sequences', sequenceId, 'steps', stepId))

  // Reorder remaining steps
  const stepsSnapshot = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'sequences', sequenceId, 'steps'),
      orderBy('order', 'asc')
    )
  )

  const batch = writeBatch(db)
  stepsSnapshot.docs.forEach((doc, index) => {
    batch.update(doc.ref, { order: index })
  })

  await batch.commit()
}

/**
 * Reorder sequence steps
 */
export async function reorderSequenceSteps(orgId, sequenceId, stepIds) {
  const batch = writeBatch(db)

  stepIds.forEach((stepId, index) => {
    const stepRef = doc(db, 'organizations', orgId, 'sequences', sequenceId, 'steps', stepId)
    batch.update(stepRef, { order: index })
  })

  await batch.commit()
}

// ==========================================
// ENROLLMENTS
// ==========================================

/**
 * Enroll prospect in sequence
 */
export async function enrollProspect(orgId, sequenceId, prospectId) {
  const enrollmentRef = doc(
    collection(db, 'organizations', orgId, 'sequences', sequenceId, 'enrollments')
  )

  await setDoc(enrollmentRef, {
    prospectId,
    status: 'active',
    currentStep: 0,
    enrolledAt: serverTimestamp(),
    nextActionAt: serverTimestamp(),
    completedSteps: [],
    lastActionAt: null,
  })

  // Update sequence stats
  await updateDoc(doc(sequencesRef(orgId), sequenceId), {
    'stats.enrolled': increment(1),
    'stats.active': increment(1),
  })

  // Update prospect
  await updateDoc(doc(db, 'organizations', orgId, 'prospects', prospectId), {
    currentSequenceId: sequenceId,
    sequenceStep: 0,
    sequenceStatus: 'active',
  })

  return { id: enrollmentRef.id }
}

/**
 * Stop prospect enrollment
 */
export async function stopEnrollment(orgId, sequenceId, prospectId, reason = 'manual') {
  const enrollmentsSnapshot = await getDocs(
    query(
      collection(db, 'organizations', orgId, 'sequences', sequenceId, 'enrollments'),
      where('prospectId', '==', prospectId),
      where('status', '==', 'active')
    )
  )

  if (enrollmentsSnapshot.empty) return

  const batch = writeBatch(db)

  enrollmentsSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: 'stopped',
      stoppedAt: serverTimestamp(),
      stopReason: reason,
    })
  })

  await batch.commit()

  // Update sequence stats
  await updateDoc(doc(sequencesRef(orgId), sequenceId), {
    'stats.active': increment(-1),
    'stats.stopped': increment(1),
  })

  // Update prospect
  await updateDoc(doc(db, 'organizations', orgId, 'prospects', prospectId), {
    sequenceStatus: 'stopped',
  })
}

/**
 * Get sequence enrollments
 */
export async function getSequenceEnrollments(orgId, sequenceId, status = 'active') {
  let q = collection(db, 'organizations', orgId, 'sequences', sequenceId, 'enrollments')

  if (status) {
    q = query(q, where('status', '==', status))
  }

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Subscribe to sequences changes
 */
export function subscribeToSequences(orgId, callback) {
  return onSnapshot(
    query(sequencesRef(orgId), where('status', '!=', 'archived'), orderBy('status'), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      const sequences = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      callback(sequences)
    }
  )
}

export default {
  SEQUENCE_STATUS,
  CHANNEL_CONFIG,
  ORCHESTRATION_RULES,
  createSequence,
  getSequence,
  getSequences,
  updateSequence,
  updateSequenceStatus,
  deleteSequence,
  duplicateSequence,
  addSequenceStep,
  updateSequenceStep,
  deleteSequenceStep,
  reorderSequenceSteps,
  enrollProspect,
  stopEnrollment,
  getSequenceEnrollments,
  subscribeToSequences,
}
