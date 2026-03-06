/**
 * Postal Callable Cloud Functions
 * Wraps internal Postal helpers into Firebase onCall functions
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import {
  sendLetter as sendLetterInternal,
  sendPostcard as sendPostcardInternal,
  getMailStatus as getMailStatusInternal,
  cancelMail as cancelMailInternal,
} from './mailSender.js'
import {
  validateAddress as validateAddressInternal,
  validateAddressBatch as validateAddressBatchInternal,
  validateAndUpdateProspect as validateAndUpdateProspectInternal,
  autocompleteAddress as autocompleteAddressInternal,
} from './addressValidator.js'
import {
  generatePostalHTML as generatePostalHTMLInternal,
  createPostalTemplate as createPostalTemplateInternal,
  listPostalTemplates as listPostalTemplatesInternal,
  previewTemplate as previewTemplateInternal,
} from './templateGenerator.js'
import {
  createTrackingCode as createTrackingCodeInternal,
  createPURL as createPURLInternal,
  recordConversion as recordConversionInternal,
  getTrackingStats as getTrackingStatsInternal,
} from './trackingManager.js'
import {
  sendLetterMF as sendLetterMFInternal,
  sendRegisteredLetterMF as sendRegisteredLetterMFInternal,
  getMailStatusMF as getMailStatusMFInternal,
  cancelMailMF as cancelMailMFInternal,
  handleMFWebhook as handleMFWebhookInternal,
  estimateCostMF as estimateCostMFInternal,
} from './merciFacteurProvider.js'

// ============================================
// POSTGRID — LETTRES & CARTES
// ============================================

export const sendLetter = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, options } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return sendLetterInternal(orgId, prospectId, options)
  }
)

export const sendPostcard = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, options } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return sendPostcardInternal(orgId, prospectId, options)
  }
)

export const getMailStatus = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, mailId, mailType } = request.data
    if (!orgId || !mailId) {
      throw new HttpsError('invalid-argument', 'orgId et mailId requis')
    }
    return getMailStatusInternal(orgId, mailId, mailType)
  }
)

export const cancelMail = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, mailId, mailType } = request.data
    if (!orgId || !mailId) {
      throw new HttpsError('invalid-argument', 'orgId et mailId requis')
    }
    return cancelMailInternal(orgId, mailId, mailType)
  }
)

// ============================================
// VALIDATION D'ADRESSES
// ============================================

export const validateAddress = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, address } = request.data
    if (!orgId || !address) {
      throw new HttpsError('invalid-argument', 'orgId et address requis')
    }
    return validateAddressInternal(orgId, address)
  }
)

export const validateAddressBatch = onCall(
  { region: 'europe-west1', timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, addresses } = request.data
    if (!orgId || !addresses?.length) {
      throw new HttpsError('invalid-argument', 'orgId et addresses requis')
    }
    return validateAddressBatchInternal(orgId, addresses)
  }
)

export const validateAndUpdateProspect = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return validateAndUpdateProspectInternal(orgId, prospectId)
  }
)

export const autocompleteAddress = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, query } = request.data
    if (!orgId || !query) {
      throw new HttpsError('invalid-argument', 'orgId et query requis')
    }
    return autocompleteAddressInternal(orgId, query)
  }
)

// ============================================
// TEMPLATES POSTAUX
// ============================================

export const generatePostalHTML = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateId, data } = request.data
    if (!orgId || !templateId) {
      throw new HttpsError('invalid-argument', 'orgId et templateId requis')
    }
    return generatePostalHTMLInternal(orgId, templateId, data)
  }
)

export const createPostalTemplate = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateData } = request.data
    if (!orgId || !templateData) {
      throw new HttpsError('invalid-argument', 'orgId et templateData requis')
    }
    return createPostalTemplateInternal(orgId, templateData)
  }
)

export const listPostalTemplates = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, type } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return listPostalTemplatesInternal(orgId, type)
  }
)

export const previewTemplate = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateId, sampleData } = request.data
    if (!orgId || !templateId) {
      throw new HttpsError('invalid-argument', 'orgId et templateId requis')
    }
    return previewTemplateInternal(orgId, templateId, sampleData)
  }
)

// ============================================
// TRACKING
// ============================================

export const createTrackingCode = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, mailType } = request.data
    if (!orgId || !prospectId || !mailType) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et mailType requis')
    }
    return createTrackingCodeInternal(orgId, prospectId, mailType)
  }
)

export const createPURL = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, template } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return createPURLInternal(orgId, prospectId, template)
  }
)

export const recordConversion = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, conversionType, value } = request.data
    if (!orgId || !prospectId || !conversionType) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et conversionType requis')
    }
    return recordConversionInternal(orgId, prospectId, conversionType, value)
  }
)

export const getTrackingStats = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, days } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return getTrackingStatsInternal(orgId, days)
  }
)

// ============================================
// MERCI FACTEUR
// ============================================

export const sendLetterMF = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, options } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return sendLetterMFInternal(orgId, prospectId, options)
  }
)

export const sendRegisteredLetterMF = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, options } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return sendRegisteredLetterMFInternal(orgId, prospectId, options)
  }
)

export const getMailStatusMF = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, mailId } = request.data
    if (!orgId || !mailId) {
      throw new HttpsError('invalid-argument', 'orgId et mailId requis')
    }
    return getMailStatusMFInternal(orgId, mailId)
  }
)

export const cancelMailMF = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, mailId } = request.data
    if (!orgId || !mailId) {
      throw new HttpsError('invalid-argument', 'orgId et mailId requis')
    }
    return cancelMailMFInternal(orgId, mailId)
  }
)

export const estimateCostMF = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { sendMode, pageCount, options } = request.data
    if (!sendMode) throw new HttpsError('invalid-argument', 'sendMode requis')
    return estimateCostMFInternal(sendMode, pageCount, options)
  }
)

export const handleMFWebhook = onRequest(
  { region: 'europe-west1', timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const result = await handleMFWebhookInternal(req)
      res.status(200).json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)
