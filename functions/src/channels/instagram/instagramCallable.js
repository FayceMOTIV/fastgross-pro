/**
 * Instagram DM Callable Cloud Functions
 * Wraps internal Instagram helpers into Firebase onCall functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'
import {
  sendInstagramDM as sendDMInternal,
  sendPrivateReply as sendReplyInternal,
} from './dmSender.js'
import {
  processCommentTrigger as processCommentTriggerInternal,
  createCommentTrigger as createCommentTriggerInternal,
} from './commentTrigger.js'

export const sendInstagramDM = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, message, options } = request.data
    if (!orgId || !prospectId || !message) {
      throw new HttpsError('invalid-argument', 'orgId, prospectId et message requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendDMInternal(orgId, prospectId, message, options)
  }
)

export const sendPrivateReply = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, commentId, message, options } = request.data
    if (!orgId || !commentId || !message) {
      throw new HttpsError('invalid-argument', 'orgId, commentId et message requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return sendReplyInternal(orgId, commentId, message, options)
  }
)

export const processCommentTrigger = onCall(
  { region: 'europe-west1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, commentId, text, from, media } = request.data
    if (!orgId || !commentId || !text) {
      throw new HttpsError('invalid-argument', 'orgId, commentId et text requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return processCommentTriggerInternal(orgId, commentId, text, from, media)
  }
)

export const createCommentTrigger = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, triggerData } = request.data
    if (!orgId || !triggerData) {
      throw new HttpsError('invalid-argument', 'orgId et triggerData requis')
    }
    await verifyOrgMembership(request.auth.uid, orgId)
    return createCommentTriggerInternal(orgId, triggerData)
  }
)
