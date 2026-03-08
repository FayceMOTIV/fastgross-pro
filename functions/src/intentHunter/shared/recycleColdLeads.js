/**
 * Recycle Cold Leads — Intent Hunter (Shared B2B + B2C)
 *
 * Scheduled job : tourne chaque nuit a 2h.
 *
 * Pour chaque lead en statut 'cold' ou 'recycled' depuis > 30 jours :
 *   1. Verifier si un nouveau signal existe sur la plateforme source
 *   2. Si signal trouve → remettre en sequence active avec contexte mis a jour
 *   3. Si aucun signal → maintenir en veille, re-verifier dans 30 jours
 *   4. Si lead inactif > 1 an → supprimer (RGPD retention)
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { purgeExpiredLeads } from '../../compliance/rgpdEngine.js'

const getDb = () => getFirestore()

/**
 * Scheduled Cloud Function : recycle les leads froids
 */
export const recycleColdLeadsCron = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'europe-west1',
    timezone: 'Europe/Paris',
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async () => {
    const db = getDb()

    console.log(JSON.stringify({
      function: 'recycleColdLeads',
      step: 'started',
      timestamp: new Date().toISOString()
    }))

    // Phase 1 : Purger les leads expires (RGPD > 1 an)
    const purgedPro = await purgeExpiredLeads('intentLeadsPro', 100)
    const purgedParticuliers = await purgeExpiredLeads('intentLeadsParticuliers', 100)

    // Phase 2 : Chercher les leads froids recyclables (> 30 jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo)

    const collections = ['intentLeadsPro', 'intentLeadsParticuliers']
    let recycledCount = 0
    let checkedCount = 0

    for (const collection of collections) {
      const snapshot = await db.collection(collection)
        .where('sequenceStatus', 'in', ['cold', 'recycled'])
        .where('lastActivityAt', '<=', cutoffTimestamp)
        .where('isBlacklisted', '==', false)
        .limit(50)
        .get()

      for (const doc of snapshot.docs) {
        checkedCount++
        const lead = doc.data()

        // TODO: Verifier si nouveau signal existe sur la source
        // Pour l'instant, on marque comme verifie et on re-planifie dans 30 jours
        const nextCheckDate = new Date()
        nextCheckDate.setDate(nextCheckDate.getDate() + 30)

        await doc.ref.update({
          lastRecycleCheck: Timestamp.now(),
          nextRecycleCheck: Timestamp.fromDate(nextCheckDate),
          recycleCheckCount: (lead.recycleCheckCount || 0) + 1
        })
      }
    }

    console.log(JSON.stringify({
      function: 'recycleColdLeads',
      step: 'completed',
      purgedPro: purgedPro.deleted,
      purgedParticuliers: purgedParticuliers.deleted,
      checkedCount,
      recycledCount
    }))
  }
)

/**
 * Reactive un lead froid avec un nouveau signal
 * @param {string} leadId
 * @param {string} collection
 * @param {Object} newSignal - Nouveau signal detecte
 */
export async function reactivateLead(leadId, collection, newSignal) {
  const db = getDb()

  await db.collection(collection).doc(leadId).update({
    sequenceStatus: 'active',
    sequenceStep: 0,
    intentSignal: newSignal.text || 'Nouveau signal detecte',
    sourceUrl: newSignal.url || null,
    lastActivityAt: Timestamp.now(),
    reactivatedAt: Timestamp.now(),
    reactivationReason: newSignal.reason || 'new_signal'
  })

  console.log(JSON.stringify({
    function: 'recycleColdLeads.reactivateLead',
    step: 'reactivated',
    leadId,
    collection,
    reason: newSignal.reason
  }))
}
