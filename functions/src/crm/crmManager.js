/**
 * CRM Manager v1.0 — Cloud Functions pour le pipeline CRM
 *
 * - getProspectsPage: listing pagine des prospects
 * - moveProspect: deplacement dans le pipeline CRM
 * - addInternalNote: ajout de notes internes
 * - sendManualMessage: envoi manuel depuis le CRM
 * - exportProspectsCSV: export CSV des prospects
 * - deleteProspectGDPR: suppression RGPD avec audit log
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// ============================================
// CRM PIPELINE COLUMNS
// ============================================
export const CRM_COLUMNS = {
  detected: { label: 'Detecte', order: 0, color: 'gray' },
  warming: { label: 'Warming', order: 1, color: 'yellow' },
  contacted: { label: 'Contacte', order: 2, color: 'blue' },
  replied: { label: 'Repondu', order: 3, color: 'purple' },
  meeting: { label: 'RDV', order: 4, color: 'orange' },
  won: { label: 'Gagne', order: 5, color: 'green' },
  lost: { label: 'Perdu', order: 6, color: 'red' }
}

const VALID_COLUMNS = Object.keys(CRM_COLUMNS)
const VALID_SORT_FIELDS = ['score', 'createdAt', 'updatedAt', 'name', 'company', 'crmMovedAt']
const VALID_CHANNELS = ['email', 'sms', 'whatsapp']
const MAX_EXPORT_ROWS = 5000
const DEFAULT_EXPORT_COLUMNS = ['name', 'company', 'email', 'phone', 'score', 'source', 'crmColumn', 'city']

// ============================================
// 1. GET PROSPECTS PAGE (paginated listing)
// ============================================
export const getProspectsPage = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const {
      orgId,
      page = 1,
      pageSize = 25,
      filters = {},
      sortBy = 'score',
      sortDir = 'desc',
      searchQuery = ''
    } = request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    if (pageSize < 1 || pageSize > 100) {
      throw new HttpsError('invalid-argument', 'pageSize doit etre entre 1 et 100')
    }

    if (!VALID_SORT_FIELDS.includes(sortBy)) {
      throw new HttpsError('invalid-argument', `sortBy invalide. Valeurs acceptees: ${VALID_SORT_FIELDS.join(', ')}`)
    }

    const db = getDb()

    try {
      let query = db.collection('organizations').doc(orgId).collection('prospects')

      // Apply filters
      if (filters.column && VALID_COLUMNS.includes(filters.column)) {
        query = query.where('crmColumn', '==', filters.column)
      }

      if (filters.source) {
        query = query.where('source', '==', filters.source)
      }

      if (filters.scoreMin !== undefined && filters.scoreMin !== null) {
        query = query.where('score', '>=', filters.scoreMin)
      }

      if (filters.scoreMax !== undefined && filters.scoreMax !== null) {
        query = query.where('score', '<=', filters.scoreMax)
      }

      if (filters.city) {
        query = query.where('city', '==', filters.city)
      }

      if (filters.channel) {
        query = query.where('lastChannel', '==', filters.channel)
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', new Date(filters.dateFrom))
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', new Date(filters.dateTo))
      }

      // Sort
      const direction = sortDir === 'asc' ? 'asc' : 'desc'
      query = query.orderBy(sortBy, direction)

      // Count total (separate query)
      const countSnapshot = await query.count().get()
      let total = countSnapshot.data().count

      // Pagination via offset
      const offset = (page - 1) * pageSize
      query = query.offset(offset).limit(pageSize)

      const snapshot = await query.get()

      let prospects = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))

      // Client-side search filter (Firestore does not support LIKE)
      if (searchQuery && searchQuery.trim().length > 0) {
        const search = searchQuery.trim().toLowerCase()
        prospects = prospects.filter((p) => {
          const name = (p.name || '').toLowerCase()
          const company = (p.company || '').toLowerCase()
          const email = (p.email || '').toLowerCase()
          return name.includes(search) || company.includes(search) || email.includes(search)
        })
        // Adjust total for search (approximate — limited to current page)
        total = prospects.length < pageSize ? offset + prospects.length : total
      }

      const totalPages = Math.ceil(total / pageSize)

      console.log(JSON.stringify({
        event: 'crm_prospects_page',
        data: { orgId, page, pageSize, total, filtersApplied: Object.keys(filters).length, searchQuery: !!searchQuery },
        timestamp: Date.now()
      }))

      return { prospects, total, page, pageSize, totalPages }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'crm_prospects_page_error',
        data: { orgId, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors du chargement des prospects: ${error.message}`)
    }
  }
)

// ============================================
// 2. MOVE PROSPECT (change CRM column)
// ============================================
export const moveProspect = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const { orgId, prospectId, toColumn, reason } = request.data || {}

    if (!orgId || !prospectId || !toColumn) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et toColumn requis')
    }

    if (!VALID_COLUMNS.includes(toColumn)) {
      throw new HttpsError('invalid-argument', `Colonne invalide: ${toColumn}. Valeurs acceptees: ${VALID_COLUMNS.join(', ')}`)
    }

    const db = getDb()

    try {
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectSnap = await prospectRef.get()

      if (!prospectSnap.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      const prospectData = prospectSnap.data()
      const fromColumn = prospectData.crmColumn || 'detected'

      if (fromColumn === toColumn) {
        return { success: true, prospect: { id: prospectId, ...prospectData } }
      }

      // Update prospect
      await prospectRef.update({
        crmColumn: toColumn,
        crmMovedAt: FieldValue.serverTimestamp(),
        crmMovedBy: userId
      })

      // Add timeline entry
      const timelineRef = prospectRef.collection('timeline')
      await timelineRef.add({
        type: 'column_change',
        from: fromColumn,
        to: toColumn,
        reason: reason || null,
        userId,
        createdAt: FieldValue.serverTimestamp()
      })

      const updatedSnap = await prospectRef.get()
      const updatedProspect = { id: prospectId, ...updatedSnap.data() }

      console.log(JSON.stringify({
        event: 'crm_prospect_moved',
        data: { orgId, prospectId, from: fromColumn, to: toColumn, userId },
        timestamp: Date.now()
      }))

      return { success: true, prospect: updatedProspect }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error(JSON.stringify({
        event: 'crm_prospect_move_error',
        data: { orgId, prospectId, toColumn, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors du deplacement: ${error.message}`)
    }
  }
)

// ============================================
// 3. ADD INTERNAL NOTE
// ============================================
export const addInternalNote = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const { orgId, prospectId, content, isPinned = false } = request.data || {}

    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }

    if (!content || content.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Le contenu de la note ne peut pas etre vide')
    }

    const db = getDb()

    try {
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectSnap = await prospectRef.get()

      if (!prospectSnap.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      // Get user name for display
      const userSnap = await db.collection('users').doc(userId).get()
      const userName = userSnap.exists ? (userSnap.data().displayName || userSnap.data().email || 'Utilisateur') : 'Utilisateur'

      // Add note to timeline
      const timelineRef = prospectRef.collection('timeline')
      const noteDoc = await timelineRef.add({
        type: 'note',
        content: content.trim(),
        isPinned,
        userId,
        userName,
        createdAt: FieldValue.serverTimestamp()
      })

      console.log(JSON.stringify({
        event: 'crm_note_added',
        data: { orgId, prospectId, noteId: noteDoc.id, isPinned, userId },
        timestamp: Date.now()
      }))

      return { success: true, noteId: noteDoc.id }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error(JSON.stringify({
        event: 'crm_note_add_error',
        data: { orgId, prospectId, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors de l'ajout de la note: ${error.message}`)
    }
  }
)

// ============================================
// 4. SEND MANUAL MESSAGE
// ============================================
export const sendManualMessage = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const { orgId, prospectId, channel, content } = request.data || {}

    if (!orgId || !prospectId || !channel || !content) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId, channel et content requis')
    }

    if (!VALID_CHANNELS.includes(channel)) {
      throw new HttpsError('invalid-argument', `Canal invalide: ${channel}. Valeurs acceptees: ${VALID_CHANNELS.join(', ')}`)
    }

    const db = getDb()

    try {
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectSnap = await prospectRef.get()

      if (!prospectSnap.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      const prospectData = prospectSnap.data()

      // Validate contact info exists for chosen channel
      if (channel === 'email' && !prospectData.email) {
        throw new HttpsError('failed-precondition', 'Prospect sans adresse email')
      }

      if (channel === 'sms' && !prospectData.phone) {
        throw new HttpsError('failed-precondition', 'Prospect sans numero de telephone')
      }

      if (channel === 'whatsapp' && !prospectData.phone) {
        throw new HttpsError('failed-precondition', 'Prospect sans numero de telephone pour WhatsApp')
      }

      // Add to timeline as queued message
      const timelineRef = prospectRef.collection('timeline')
      const messageDoc = await timelineRef.add({
        type: 'manual_message',
        channel,
        content: content.trim(),
        status: 'queued',
        userId,
        createdAt: FieldValue.serverTimestamp()
      })

      // Try to dispatch via channelDispatcher (non-blocking)
      try {
        const { dispatchMessage } = await import('../engine/channelDispatcher.js')
        await dispatchMessage(orgId, prospectId, {
          channel,
          content: content.trim(),
          source: 'crm_manual'
        })

        // Update timeline status to sent
        await timelineRef.doc(messageDoc.id).update({ status: 'sent' })
      } catch (dispatchError) {
        // Dispatch unavailable or failed — message stays queued
        console.log(JSON.stringify({
          event: 'crm_manual_dispatch_fallback',
          data: { orgId, prospectId, channel, reason: dispatchError.message },
          timestamp: Date.now()
        }))
      }

      console.log(JSON.stringify({
        event: 'crm_manual_message_sent',
        data: { orgId, prospectId, channel, messageId: messageDoc.id, userId },
        timestamp: Date.now()
      }))

      return { success: true, messageId: messageDoc.id }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error(JSON.stringify({
        event: 'crm_manual_message_error',
        data: { orgId, prospectId, channel, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors de l'envoi du message: ${error.message}`)
    }
  }
)

// ============================================
// 5. EXPORT PROSPECTS CSV
// ============================================
export const exportProspectsCSV = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const {
      orgId,
      filters = {},
      columns = DEFAULT_EXPORT_COLUMNS
    } = request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()

    try {
      let query = db.collection('organizations').doc(orgId).collection('prospects')

      // Apply filters (same logic as getProspectsPage)
      if (filters.column && VALID_COLUMNS.includes(filters.column)) {
        query = query.where('crmColumn', '==', filters.column)
      }

      if (filters.source) {
        query = query.where('source', '==', filters.source)
      }

      if (filters.scoreMin !== undefined && filters.scoreMin !== null) {
        query = query.where('score', '>=', filters.scoreMin)
      }

      if (filters.scoreMax !== undefined && filters.scoreMax !== null) {
        query = query.where('score', '<=', filters.scoreMax)
      }

      if (filters.city) {
        query = query.where('city', '==', filters.city)
      }

      if (filters.channel) {
        query = query.where('lastChannel', '==', filters.channel)
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', new Date(filters.dateFrom))
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', new Date(filters.dateTo))
      }

      // Limit to max export rows
      query = query.limit(MAX_EXPORT_ROWS)

      const snapshot = await query.get()
      const prospects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Build CSV
      const csvRows = []

      // Header row
      csvRows.push(columns.join(','))

      // Data rows
      for (const prospect of prospects) {
        const row = columns.map((col) => {
          const value = prospect[col]

          if (value === null || value === undefined) {
            return ''
          }

          // Handle Firestore Timestamps
          if (value && typeof value === 'object' && value._seconds) {
            return new Date(value._seconds * 1000).toISOString()
          }

          // Escape CSV values
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }

          return stringValue
        })

        csvRows.push(row.join(','))
      }

      const csv = csvRows.join('\n')

      console.log(JSON.stringify({
        event: 'crm_export_csv',
        data: { orgId, count: prospects.length, columns: columns.length, userId },
        timestamp: Date.now()
      }))

      return {
        csv,
        count: prospects.length,
        exportedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'crm_export_csv_error',
        data: { orgId, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors de l'export CSV: ${error.message}`)
    }
  }
)

// ============================================
// 6. DELETE PROSPECT GDPR
// ============================================
export const deleteProspectGDPR = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const userId = request.auth.uid
    const { orgId, prospectId, reason } = request.data || {}

    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }

    if (!reason || reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Une raison de suppression est requise pour la conformite RGPD')
    }

    const db = getDb()

    try {
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectSnap = await prospectRef.get()

      if (!prospectSnap.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      const prospectData = prospectSnap.data()

      // Save minimal audit snapshot (only identifiers for RGPD traceability)
      const prospectSnapshot = {
        name: prospectData.name || null,
        email: prospectData.email || null
      }

      // Delete subcollections: timeline
      const timelineDocs = await prospectRef.collection('timeline').listDocuments()
      const timelineBatch = db.batch()
      for (const doc of timelineDocs) {
        timelineBatch.delete(doc)
      }
      if (timelineDocs.length > 0) {
        await timelineBatch.commit()
      }

      // Delete subcollections: interactions
      const interactionDocs = await prospectRef.collection('interactions').listDocuments()
      const interactionBatch = db.batch()
      for (const doc of interactionDocs) {
        interactionBatch.delete(doc)
      }
      if (interactionDocs.length > 0) {
        await interactionBatch.commit()
      }

      // Delete prospect doc
      await prospectRef.delete()

      // Create GDPR audit log
      const auditRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('gdprAuditLog')

      const auditDoc = await auditRef.add({
        action: 'delete',
        prospectId,
        reason: reason.trim(),
        deletedBy: userId,
        deletedAt: FieldValue.serverTimestamp(),
        prospectSnapshot
      })

      console.log(JSON.stringify({
        event: 'crm_prospect_deleted_gdpr',
        data: { orgId, prospectId, auditId: auditDoc.id, userId },
        timestamp: Date.now()
      }))

      return { success: true, auditId: auditDoc.id }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error(JSON.stringify({
        event: 'crm_prospect_delete_error',
        data: { orgId, prospectId, error: error.message },
        timestamp: Date.now()
      }))
      throw new HttpsError('internal', `Erreur lors de la suppression RGPD: ${error.message}`)
    }
  }
)
