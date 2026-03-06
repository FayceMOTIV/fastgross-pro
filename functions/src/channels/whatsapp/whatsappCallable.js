/**
 * WhatsApp Callable Cloud Functions
 * Wraps internal WhatsApp helpers into Firebase onCall functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  sendWhatsApp as sendWhatsAppInternal,
  markAsRead as markAsReadInternal,
} from './sender.js'
import {
  isInSessionWindow as isInSessionWindowInternal,
  createSession as createSessionInternal,
} from './sessionManager.js'
import {
  getApprovedTemplate as getApprovedTemplateInternal,
  syncTemplatesFromMeta as syncTemplatesFromMetaInternal,
  submitTemplateForApproval as submitTemplateForApprovalInternal,
} from './templates.js'
import {
  checkWhatsAppAvailability as checkAvailabilityInternal,
  checkBatchAvailability as checkBatchAvailabilityInternal,
} from './reachability.js'
import {
  createWhatsAppInstance as createInstanceInternal,
  getWhatsAppQRCode as getQRCodeInternal,
  getWhatsAppConnectionStatus as getConnectionStatusInternal,
  disconnectWhatsApp as disconnectInternal,
} from './instanceManager.js'

export const sendWhatsApp = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, messageData, options } = request.data
    if (!orgId || !prospectId || !messageData) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et messageData requis')
    }
    return sendWhatsAppInternal(orgId, prospectId, messageData, options)
  }
)

export const markAsRead = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, messageId } = request.data
    if (!orgId || !messageId) {
      throw new HttpsError('invalid-argument', 'orgId et messageId requis')
    }
    return markAsReadInternal(orgId, messageId)
  }
)

export const isInSessionWindow = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return isInSessionWindowInternal(orgId, prospectId)
  }
)

export const createSession = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, phoneNumber } = request.data
    if (!orgId || !prospectId || !phoneNumber) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et phoneNumber requis')
    }
    return createSessionInternal(orgId, prospectId, phoneNumber)
  }
)

export const getApprovedTemplate = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateName } = request.data
    if (!orgId || !templateName) {
      throw new HttpsError('invalid-argument', 'orgId et templateName requis')
    }
    return getApprovedTemplateInternal(orgId, templateName)
  }
)

export const syncTemplatesFromMeta = onCall(
  { region: 'europe-west1', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return syncTemplatesFromMetaInternal(orgId)
  }
)

export const submitTemplateForApproval = onCall(
  { region: 'europe-west1', timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateData } = request.data
    if (!orgId || !templateData) {
      throw new HttpsError('invalid-argument', 'orgId et templateData requis')
    }
    return submitTemplateForApprovalInternal(orgId, templateData)
  }
)

export const checkWhatsAppAvailability = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return checkAvailabilityInternal(orgId, prospectId)
  }
)

export const checkBatchAvailability = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectIds } = request.data
    if (!orgId || !prospectIds?.length) {
      throw new HttpsError('invalid-argument', 'orgId et prospectIds requis')
    }
    return checkBatchAvailabilityInternal(orgId, prospectIds)
  }
)

// ============================================
// Instance Management (Multi-Tenant Evolution API)
// ============================================

export const createWhatsAppInstance = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return createInstanceInternal(orgId)
  }
)

export const getWhatsAppQRCode = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return getQRCodeInternal(orgId)
  }
)

export const getWhatsAppConnectionStatus = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return getConnectionStatusInternal(orgId)
  }
)

export const disconnectWhatsApp = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return disconnectInternal(orgId)
  }
)
