/**
 * Human In The Loop — Escalation management
 * Handles listing, retrieving, and resolving escalations
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

/**
 * Cloud Function: Get Escalations for an org
 */
export const getEscalations = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, status = 'pending', limit: maxResults = 50 } = data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  let query = db.collection('organizations').doc(orgId).collection('escalations')
    .orderBy('createdAt', 'desc')
    .limit(maxResults)

  if (status !== 'all') {
    query = query.where('status', '==', status)
  }

  const snapshot = await query.get()

  const escalations = await Promise.all(snapshot.docs.map(async (doc) => {
    const esc = { id: doc.id, ...doc.data() }

    // Enrich with prospect info
    if (esc.leadId) {
      const prospectDoc = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(esc.leadId)
        .get()

      if (prospectDoc.exists) {
        const p = prospectDoc.data()
        esc.prospect = {
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          company: p.company || '',
          email: p.email || '',
          score: p.score || 0,
        }
      }
    }

    return esc
  }))

  return { success: true, escalations }
})

/**
 * Cloud Function: Handle an escalation (approve/modify/close)
 */
export const handleEscalation = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, escalationId, action, modifiedReply, crmAction } = data || {}

  if (!orgId || !escalationId || !action) {
    throw new HttpsError('invalid-argument', 'orgId, escalationId, and action are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const validActions = ['send_as_is', 'send_modified', 'call', 'send_booking', 'close', 'blacklist']
  if (!validActions.includes(action)) {
    throw new HttpsError('invalid-argument', `action must be one of: ${validActions.join(', ')}`)
  }

  const db = getDb()
  const escRef = db.collection('organizations').doc(orgId).collection('escalations').doc(escalationId)
  const escDoc = await escRef.get()

  if (!escDoc.exists) {
    throw new HttpsError('not-found', 'Escalation not found')
  }

  const esc = escDoc.data()

  // Update escalation status
  const updates = {
    status: 'resolved',
    resolvedBy: auth.uid,
    resolvedAt: FieldValue.serverTimestamp(),
    action,
  }

  if (action === 'send_modified' && modifiedReply) {
    updates.finalReply = modifiedReply
  } else if (action === 'send_as_is') {
    updates.finalReply = esc.agentDraftReply
  }

  await escRef.update(updates)

  // Update prospect CRM column if specified
  if (crmAction && esc.leadId) {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(esc.leadId)

    const prospectUpdates = { updatedAt: FieldValue.serverTimestamp() }

    if (crmAction === 'MEETING') prospectUpdates.crmColumn = 'MEETING'
    if (crmAction === 'INTERESTED') prospectUpdates.crmColumn = 'INTERESTED'
    if (crmAction === 'LOST') prospectUpdates.crmColumn = 'LOST'

    if (action === 'blacklist') {
      prospectUpdates.crmColumn = 'LOST'
      prospectUpdates.blacklisted = true
      prospectUpdates.blacklistedAt = FieldValue.serverTimestamp()
      prospectUpdates.blacklistedReason = 'hitl_manual'
    }

    await prospectRef.update(prospectUpdates)
  }

  // Log the action
  if (esc.leadId) {
    await db.collection('organizations').doc(orgId).collection('interactions').doc().set({
      prospectId: esc.leadId,
      type: 'hitl_action',
      content: action === 'send_modified' ? modifiedReply : esc.agentDraftReply,
      action,
      escalationId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: auth.uid,
    })
  }

  console.log(JSON.stringify({
    event: 'escalation_handled',
    orgId,
    escalationId,
    action,
    leadId: esc.leadId,
  }))

  return { success: true, action }
})

/**
 * Cloud Function: Generate conversation summary for escalation
 */
export const generateEscalationSummary = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, leadId } = data || {}
  if (!orgId || !leadId) {
    throw new HttpsError('invalid-argument', 'orgId and leadId are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()

  // Get last 10 interactions
  const interactionsSnap = await db
    .collection('organizations').doc(orgId).collection('interactions')
    .where('prospectId', '==', leadId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()

  if (interactionsSnap.empty) {
    return { success: true, summary: 'Aucune interaction precedente.' }
  }

  const messages = interactionsSnap.docs
    .map((d) => d.data())
    .reverse()
    .map((i) => `[${i.type || 'message'}] ${i.content || i.subject || ''}`)
    .filter((m) => m.length > 10)
    .join('\n')

  const summary = await callAI(
    `Resume cette conversation commerciale en 3 lignes maximum.
Indique: le contexte, les objections ou demandes, et le statut actuel.

Conversation:
${messages.slice(0, 2000)}

Reponds UNIQUEMENT avec le resume, sans prefixe.`,
    200
  )

  return { success: true, summary }
})
