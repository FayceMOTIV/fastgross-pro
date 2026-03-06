/**
 * Voicemail Callable Cloud Functions
 * Wraps internal Voicemail helpers into Firebase onCall functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  sendVoicemailDrop as sendDropInternal,
  getDropStatus as getDropStatusInternal,
  cancelDrop as cancelDropInternal,
} from './dropSender.js'
import {
  createVoiceClone as createCloneInternal,
  listVoices as listVoicesInternal,
  getVoice as getVoiceInternal,
  deleteVoice as deleteVoiceInternal,
  previewTTS as previewTTSInternal,
} from './voiceClone.js'
import {
  generateScript as generateScriptInternal,
  generateScriptWithAI as generateScriptWithAIInternal,
  createScriptTemplate as createScriptTemplateInternal,
  listScriptTemplates as listScriptTemplatesInternal,
} from './scriptGenerator.js'

// ============================================
// DROP SENDER
// ============================================

export const sendVoicemailDrop = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, prospectId, options } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }
    return sendDropInternal(orgId, prospectId, options)
  }
)

export const getDropStatus = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, dropId } = request.data
    if (!orgId || !dropId) {
      throw new HttpsError('invalid-argument', 'orgId et dropId requis')
    }
    return getDropStatusInternal(orgId, dropId)
  }
)

export const cancelDrop = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, dropId } = request.data
    if (!orgId || !dropId) {
      throw new HttpsError('invalid-argument', 'orgId et dropId requis')
    }
    return cancelDropInternal(orgId, dropId)
  }
)

// ============================================
// VOICE CLONE
// ============================================

export const createVoiceClone = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, audioData, metadata } = request.data
    if (!orgId || !audioData) {
      throw new HttpsError('invalid-argument', 'orgId et audioData requis')
    }
    return createCloneInternal(orgId, audioData, metadata)
  }
)

export const listVoices = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return listVoicesInternal(orgId)
  }
)

export const getVoice = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, voiceId } = request.data
    if (!orgId || !voiceId) {
      throw new HttpsError('invalid-argument', 'orgId et voiceId requis')
    }
    return getVoiceInternal(orgId, voiceId)
  }
)

export const deleteVoice = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, voiceId } = request.data
    if (!orgId || !voiceId) {
      throw new HttpsError('invalid-argument', 'orgId et voiceId requis')
    }
    return deleteVoiceInternal(orgId, voiceId)
  }
)

export const previewTTS = onCall(
  { region: 'europe-west1', timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, voiceId, text } = request.data
    if (!orgId || !voiceId || !text) {
      throw new HttpsError('invalid-argument', 'orgId, voiceId et text requis')
    }
    return previewTTSInternal(orgId, voiceId, text)
  }
)

// ============================================
// SCRIPT GENERATOR
// ============================================

export const generateScript = onCall(
  { region: 'europe-west1', timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateId, prospect, customVariables } = request.data
    if (!orgId || !templateId || !prospect) {
      throw new HttpsError('invalid-argument', 'orgId, templateId et prospect requis')
    }
    return generateScriptInternal(orgId, templateId, prospect, customVariables)
  }
)

export const generateScriptWithAI = onCall(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, context } = request.data
    if (!orgId || !context) {
      throw new HttpsError('invalid-argument', 'orgId et context requis')
    }
    return generateScriptWithAIInternal(orgId, context)
  }
)

export const createScriptTemplate = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, templateData } = request.data
    if (!orgId || !templateData) {
      throw new HttpsError('invalid-argument', 'orgId et templateData requis')
    }
    return createScriptTemplateInternal(orgId, templateData)
  }
)

export const listScriptTemplates = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non autorise')
    const { orgId, category } = request.data
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
    return listScriptTemplatesInternal(orgId, category)
  }
)
