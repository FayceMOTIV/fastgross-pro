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

/**
 * Callable: resolve org slug for public collect page
 * No auth required — returns only public-safe fields
 */
export const resolveCollectPageOrg = onCall({
  region: 'europe-west1',
  timeoutSeconds: 10,
}, async (request) => {
  const { slug } = request.data || {}
  if (!slug) throw new HttpsError('invalid-argument', 'slug requis')

  const db = getDb()
  const snap = await db.collection('organizations')
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snap.empty) {
    throw new HttpsError('not-found', 'Organisation introuvable')
  }

  const orgDoc = snap.docs[0]
  const data = orgDoc.data()
  const ca = data.conversionAction || {}

  return {
    orgId: orgDoc.id,
    name: data.name || '',
    logoUrl: data.logoUrl || null,
    conversionAction: {
      type: ca.type || null,
      label: ca.label || null,
      description: ca.description || null,
    },
    collectPageConfig: data.collectPageConfig || null,
  }
})

/**
 * Callable: submit collect page form (public, no auth)
 * Creates or updates prospect with contact info + optional document
 */
export const submitCollectPage = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  const { orgId, name, email, phone, message, documentUrl, fileName, mimeType } = request.data || {}

  if (!orgId || !name || !phone) {
    throw new HttpsError('invalid-argument', 'orgId, name et phone requis')
  }

  // Validate phone format FR
  const phoneRegex = /^(?:\+33|0)[67]\d{8}$/
  const cleanPhone = phone.replace(/[\s.-]/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    throw new HttpsError('invalid-argument', 'Numero de telephone invalide')
  }

  // Normalize phone to +33
  const normalizedPhone = cleanPhone.startsWith('0')
    ? '+33' + cleanPhone.slice(1)
    : cleanPhone

  const db = getDb()

  // Validate org exists
  const orgSnap = await db.doc(`organizations/${orgId}`).get()
  if (!orgSnap.exists) {
    throw new HttpsError('not-found', 'Organisation introuvable')
  }

  const prospectsRef = db.collection(`organizations/${orgId}/prospects`)

  // Dedup: check if phone already exists (single equality query — no composite index needed)
  const existingSnap = await prospectsRef
    .where('phone', '==', normalizedPhone)
    .limit(5)
    .get()
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  // Find most recent duplicate within 24h
  let recentDoc = null
  for (const doc of existingSnap.docs) {
    const ts = doc.data().createdAt?.toMillis?.() || 0
    if (ts > oneDayAgo) {
      if (!recentDoc || ts > (recentDoc.data().createdAt?.toMillis?.() || 0)) {
        recentDoc = doc
      }
    }
  }
  const recentDuplicate = !!recentDoc

  let prospectId

  if (recentDuplicate) {
    // Update existing prospect
    const existingDoc = recentDoc
    prospectId = existingDoc.id
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (documentUrl) {
      updateData.conversionAttachmentUrl = documentUrl
      updateData.conversionDocumentPath = `organizations/${orgId}/documents/${prospectId}/${Date.now()}_${fileName || 'document'}`
    }
    if (message) updateData.message = message
    if (email) updateData.email = email

    await prospectsRef.doc(prospectId).update(updateData)

    // Log interaction
    await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId,
      channel: 'collect_page',
      direction: 'in',
      type: 'conversion_action',
      conversionType: 'document_upload',
      reason: 'collect_page_upload_update',
      message: `Mise a jour via page de collecte${fileName ? ': ' + fileName : ''}`,
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info(`[CollectPage] Updated existing prospect ${prospectId}`, { orgId })
  } else {
    // Create new prospect
    const newProspect = {
      name,
      email: email || null,
      phone: normalizedPhone,
      source: 'collect_page',
      alexStatus: 'conversion_action_done',
      conversionActionDoneAt: FieldValue.serverTimestamp(),
      conversionActionType: 'document_upload',
      conversionActionReason: 'collect_page_upload',
      conversionAttachmentUrl: documentUrl || null,
      message: message || null,
      score: 80,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (documentUrl && fileName) {
      const ts = Date.now()
      newProspect.conversionDocumentPath = `organizations/${orgId}/documents/new/${ts}_${fileName}`
    }

    const docRef = await prospectsRef.add(newProspect)
    prospectId = docRef.id

    // Update document path with actual ID
    if (documentUrl && fileName) {
      const ts = Date.now()
      await docRef.update({
        conversionDocumentPath: `organizations/${orgId}/documents/${prospectId}/${ts}_${fileName}`,
      })
    }

    // Log interaction
    await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId,
      channel: 'collect_page',
      direction: 'in',
      type: 'conversion_action',
      conversionType: 'document_upload',
      reason: 'collect_page_upload',
      message: `Document depose via page de collecte${fileName ? ': ' + fileName : ''}`,
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info(`[CollectPage] Created new prospect ${prospectId}`, { orgId })
  }

  // Notify client (urgent)
  await db.collection(`organizations/${orgId}/notifications`).add({
    type: 'conversion_action_done',
    prospectId,
    message: `${name} a depose un document via votre page de collecte`,
    priority: 'urgent',
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  })

  logAlexActivity(orgId, {
    type: 'conversion_action',
    title: `Nouveau lead via page de collecte — ${name}`,
    details: `Tel: ${normalizedPhone}. ${email ? 'Email: ' + email + '. ' : ''}${fileName ? 'Fichier: ' + fileName : 'Sans document'}`,
    status: 'success',
    prospectId,
    channel: 'collect_page',
  })

  // Notify owner via WhatsApp (non-blocking)
  try {
    const orgData = orgSnap.data()
    const ownerPhone = orgData.ownerPhone || orgData.contactPhone
    if (ownerPhone) {
      const apiUrl = process.env.EVOLUTION_API_URL
      const apiKey = process.env.EVOLUTION_API_KEY
      if (apiUrl && apiKey) {
        let instance = process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3'
        const waSnap = await db.doc(`organizations/${orgId}/integrations/whatsapp`).get()
        if (waSnap.exists) {
          const wa = waSnap.data()
          if (wa?.status === 'connected' && wa?.instanceName) instance = wa.instanceName
        }
        const cleanOwnerPhone = String(ownerPhone).replace(/\D/g, '')
        const msg = `*Nouveau document recu*\n\n` +
          `*${name}* a depose un document via votre page de collecte.\n` +
          `Tel: ${normalizedPhone}\n` +
          (email ? `Email: ${email}\n` : '') +
          (fileName ? `Fichier: ${fileName}\n` : '') +
          (message ? `Message: ${message}\n` : '') +
          `\n_Face Media Factory_`
        await fetch(`${apiUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({ number: cleanOwnerPhone, text: msg }),
        })
        logger.info(`[CollectPage] WhatsApp sent to owner ${cleanOwnerPhone}`)
      }
    }
  } catch (waErr) {
    logger.warn('[CollectPage] WhatsApp notification failed:', waErr.message)
  }

  return { success: true, prospectId }
})
