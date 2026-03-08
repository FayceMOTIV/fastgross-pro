/**
 * caFunction.js
 * Cloud Functions callables pour l'estimation CA.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { estimateCA } from './caEstimationEngine.js'
import { logger } from 'firebase-functions/v2'

/**
 * estimateLeadCA — Callable pour estimer le CA d'un lead
 */
export const estimateLeadCA = onCall(
  { region: 'europe-west1', memory: '512MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

    const { lead, caMinSeuil = 0 } = request.data || {}
    if (!lead || typeof lead !== 'object') {
      throw new HttpsError('invalid-argument', 'lead (object) requis')
    }

    logger.info(`[caFunction] estimateLeadCA pour ${lead.company || lead.nom || '?'}`)

    const result = await estimateCA(lead, { caMinSeuil })

    return {
      success: true,
      ...result,
    }
  },
)
