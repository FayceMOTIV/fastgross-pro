/**
 * documentCollector.js — Detection conversion actions entrantes
 *
 * Detecte quand un prospect realise l'action de conversion configuree par l'org :
 * - document_upload : piece jointe OU keywords dans texte
 * - reply_positive : oui/ok/interesse/partant
 * - booking/signup/form_fill : handled par CTA URL tracking
 *
 * + Landing page callable (recordCollectPageConversion)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { getConversionAction } from './conversionCTA.js'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

/**
 * Check if an incoming message/attachment represents a conversion action
 * Called from evolutionWebhook (WhatsApp) and inboundEmailHandler (Email)
 *
 * @param {object} params
 * @param {string} params.orgId
 * @param {string} params.prospectId
 * @param {string} [params.text] - Message text
 * @param {boolean} [params.hasAttachment]
 * @param {string} [params.attachmentUrl]
 * @param {string} [params.attachmentMimeType]
 * @param {string} params.channel - whatsapp | email
 */
export async function checkAndHandleConversion(params) {
  const { orgId, prospectId, text, hasAttachment, attachmentUrl, attachmentMimeType, channel } = params

  if (!orgId || !prospectId) return { converted: false }

  const ca = await getConversionAction(orgId)
  if (!ca) return { converted: false }

  let converted = false
  let reason = ''

  switch (ca.type) {
    case 'document_upload': {
      // Conversion si piece jointe
      if (hasAttachment) {
        converted = true
        reason = 'attachment_received'
        break
      }
      // Conversion si keywords dans le texte
      if (text && ca.attachmentKeywords?.length > 0) {
        const lower = text.toLowerCase()
        const matched = ca.attachmentKeywords.filter(kw => lower.includes(kw.toLowerCase()))
        if (matched.length >= 1) {
          converted = true
          reason = `keyword_match: ${matched.join(', ')}`
        }
      }
      break
    }

    case 'reply_positive': {
      if (text && /\b(oui|ok|d'accord|interesse|partant|on y va|banco|go|lets go|je suis chaud|ca m'interesse|envoyez|dites.?moi plus)\b/i.test(text)) {
        converted = true
        reason = 'positive_reply'
      }
      break
    }

    default:
      // booking, signup, form_fill — conversion tracked via CTA URL click / callable
      return { converted: false }
  }

  if (!converted) return { converted: false }

  // === Conversion detected! ===
  const db = getDb()
  const prospectRef = db.collection(`organizations/${orgId}/prospects`).doc(prospectId)

  try {
    // Store document in Storage if attachment URL provided
    let documentPath = null
    if (hasAttachment && attachmentUrl) {
      // Store reference (actual file already on WhatsApp/email server)
      documentPath = `organizations/${orgId}/documents/${prospectId}/${Date.now()}`
    }

    // Update prospect
    const updateData = {
      alexStatus: 'conversion_action_done',
      conversionActionDoneAt: FieldValue.serverTimestamp(),
      conversionActionType: ca.type,
      conversionActionReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (documentPath) {
      updateData.conversionDocumentPath = documentPath
    }
    if (attachmentUrl) {
      updateData.conversionAttachmentUrl = attachmentUrl
    }

    await prospectRef.update(updateData)

    // Log interaction
    await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId,
      channel,
      direction: 'in',
      type: 'conversion_action',
      conversionType: ca.type,
      reason,
      message: text || '[attachment]',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Alert client via notification
    const prospectSnap = await prospectRef.get()
    const prospect = prospectSnap.exists ? prospectSnap.data() : {}
    const prospectName = prospect.name || prospect.contactName || prospect.companyName || 'Un prospect'

    await db.collection(`organizations/${orgId}/notifications`).add({
      type: 'conversion_action_done',
      prospectId,
      message: `${prospectName} a realise l'action de conversion (${ca.label || ca.type}) via ${channel}`,
      priority: 'urgent',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    logAlexActivity(orgId, {
      type: 'conversion_action',
      title: `Conversion detectee — ${prospectName}`,
      details: `Type: ${ca.type}. Raison: ${reason}. Canal: ${channel}.`,
      status: 'success',
      prospectId,
      channel,
    })

    logger.info(`[Conversion] ${prospectId} converted via ${ca.type} (${reason})`, { orgId, channel })

    return { converted: true, reason, type: ca.type }

  } catch (err) {
    logger.error('[Conversion] Failed to record conversion:', err.message)
    return { converted: false, error: err.message }
  }
}

/**
 * Callable: record conversion from landing page (CollectPage)
 * No auth required (public page), but validates org+prospect exist
 */
export const recordCollectPageConversion = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  // No auth required — public landing page
  const { orgId, prospectId, documentUrl, fileName, mimeType } = request.data || {}

  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  }

  const db = getDb()

  // Validate org exists
  const orgSnap = await db.doc(`organizations/${orgId}`).get()
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organisation introuvable')
  }

  // Validate prospect exists
  const prospectRef = db.collection(`organizations/${orgId}/prospects`).doc(prospectId)
  const prospectSnap = await prospectRef.get()
  if (!prospectSnap.exists) {
    throw new HttpsError('not-found', 'Prospect introuvable')
  }

  const ca = orgSnap.data()?.conversionAction
  const prospect = prospectSnap.data()

  // Record conversion
  const updateData = {
    alexStatus: 'conversion_action_done',
    conversionActionDoneAt: FieldValue.serverTimestamp(),
    conversionActionType: 'document_upload',
    conversionActionReason: 'collect_page_upload',
    updatedAt: FieldValue.serverTimestamp(),
  }
  if (documentUrl) {
    updateData.conversionAttachmentUrl = documentUrl
    updateData.conversionDocumentPath = `organizations/${orgId}/documents/${prospectId}/${Date.now()}_${fileName || 'document'}`
  }

  await prospectRef.update(updateData)

  // Log interaction
  await db.collection(`organizations/${orgId}/interactions`).add({
    prospectId,
    channel: 'collect_page',
    direction: 'in',
    type: 'conversion_action',
    conversionType: 'document_upload',
    reason: 'collect_page_upload',
    message: `Document depose via landing page: ${fileName || 'fichier'}`,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Notify client
  const prospectName = prospect.name || prospect.contactName || prospect.companyName || 'Un prospect'
  await db.collection(`organizations/${orgId}/notifications`).add({
    type: 'conversion_action_done',
    prospectId,
    message: `${prospectName} a depose un document via votre page de collecte (${ca?.label || 'document'})`,
    priority: 'urgent',
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  })

  logAlexActivity(orgId, {
    type: 'conversion_action',
    title: `Document depose — ${prospectName}`,
    details: `Via landing page. Fichier: ${fileName || 'document'}.`,
    status: 'success',
    prospectId,
    channel: 'collect_page',
  })

  return { success: true }
})
