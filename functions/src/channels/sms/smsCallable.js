/**
 * SMS Callable Cloud Functions
 * Wraps internal SMS helpers into Firebase onCall functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'
import { sendSMS as sendSMSInternal, sendSMSBatch as sendSMSBatchInternal } from './sender.js'
import {
  sendSMS as sendSMSOvhInternal,
  sendSMSBatch as sendSMSBatchOvhInternal,
  checkCredits as checkCreditsInternal,
} from './ovhSmsProvider.js'
import {
  createSMSTemplate as createSMSTemplateInternal,
  getSMSTemplates as getSMSTemplatesInternal,
  validateSMSContent as validateSMSContentInternal,
} from './templates.js'

export const sendSMS = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, message, options } = request.data
    if (!orgId || !prospectId || !message) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et message requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendSMSInternal(orgId, prospectId, message, options)
  }
)

export const sendSMSBatch = onCall(
  { region: 'europe-west1', timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, messages, options } = request.data
    if (!orgId || !messages?.length) {
      throw new HttpsError('invalid-argument', 'orgId et messages requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendSMSBatchInternal(orgId, messages, options)
  }
)

export const sendSMSOvh = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, message, options } = request.data
    if (!orgId || !prospectId || !message) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et message requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendSMSOvhInternal(orgId, prospectId, message, options)
  }
)

export const sendSMSBatchOvh = onCall(
  { region: 'europe-west1', timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, messages, options } = request.data
    if (!orgId || !messages?.length) {
      throw new HttpsError('invalid-argument', 'orgId et messages requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendSMSBatchOvhInternal(orgId, messages, options)
  }
)

export const checkSMSCredits = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    await verifyOrgMembership(request.auth.uid, orgId)
    return checkCreditsInternal(orgId)
  }
)

export const createSMSTemplate = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateData } = request.data
    if (!orgId || !templateData) {
      throw new HttpsError('invalid-argument', 'orgId et templateData requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return createSMSTemplateInternal(orgId, templateData)
  }
)

export const getSMSTemplates = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, category } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    await verifyOrgMembership(request.auth.uid, orgId)
    return getSMSTemplatesInternal(orgId, category)
  }
)

export const validateSMSContent = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { content } = request.data
    if (!content) throw new HttpsError('invalid-argument', 'content requis')
    return validateSMSContentInternal(content)
  }
)
