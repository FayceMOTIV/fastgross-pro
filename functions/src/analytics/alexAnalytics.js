/**
 * alexAnalytics — Calcul metriques Alex (reply rate, conversion, temps reponse)
 * Utilise par autoOptimizer et AutoPilotDashboard
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore } from 'firebase-admin/firestore'
import { calculateAlexMetrics } from '../alex/autoOptimizer.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

/**
 * Callable: obtenir les metriques Alex pour le dashboard
 */
export const getAlexAnalytics = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Auth required')
    }

    const { orgId, period = '7d' } = request.data || {}
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId required')

    await verifyOrgMembership(request.auth.uid, orgId)

    try {
      // Charger les metriques calculees
      const metrics = await calculateAlexMetrics(orgId)

      // Charger les optimisations sauvegardees
      let optimization = {}
      try {
        const optSnap = await getDb()
          .collection('organizations').doc(orgId)
          .collection('settings').doc('alexOptimization')
          .get()
        if (optSnap.exists) optimization = optSnap.data()
      } catch { /* no optimization yet */ }

      // Charger l'historique des analytics
      const historySnap = await getDb()
        .collection('organizations').doc(orgId)
        .collection('analytics')
        .where('type', '==', 'alex_weekly')
        .orderBy('createdAt', 'desc')
        .limit(12)
        .get()

      const history = historySnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))

      return {
        success: true,
        current: metrics,
        optimization,
        history,
      }
    } catch (err) {
      logger.error('getAlexAnalytics error:', err.message)
      throw new HttpsError('internal', err.message)
    }
  }
)
