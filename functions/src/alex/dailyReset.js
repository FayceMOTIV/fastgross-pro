/**
 * dailyReset — Cron 00:05 Europe/Paris
 * Reset sentToday et repliesToday pour tous les prospects
 * Met a jour le sparkline (historique 14 jours)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Scheduler quotidien: reset compteurs + mise a jour sparkline
 */
export const dailyReset = onSchedule(
  {
    schedule: 'every day 00:05',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
    retryCount: 1,
  },
  async () => {
    logger.info('dailyReset: starting daily reset')

    const db = getDb()
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Trouver toutes les organisations
    let orgsSnap
    try {
      orgsSnap = await db.collection('organizations').get()
    } catch (err) {
      logger.error('dailyReset: failed to fetch organizations:', err.message)
      return
    }

    if (orgsSnap.empty) {
      logger.info('dailyReset: no organizations found')
      return
    }

    let totalProspectsReset = 0
    let totalOrgsProcessed = 0
    let totalErrors = 0

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id

      try {
        // 1. Sauvegarder les stats du jour dans le sparkline
        await saveOrgDailyStats(db, orgId, today)

        // 2. Reset les compteurs de tous les prospects
        const resetCount = await resetOrgProspects(db, orgId)
        totalProspectsReset += resetCount

        // 3. Mettre a jour le sparkline sur le document org
        await updateOrgSparkline(db, orgId, today)

        totalOrgsProcessed++
      } catch (err) {
        logger.error(`dailyReset: error processing org ${orgId}:`, err.message)
        totalErrors++
      }
    }

    logger.info(
      `dailyReset: done — ${totalOrgsProcessed} orgs, ${totalProspectsReset} prospects reset, ${totalErrors} errors`
    )
  }
)

/**
 * Sauvegarde les stats du jour pour une org
 */
async function saveOrgDailyStats(db, orgId, dateStr) {
  const prospectsRef = db
    .collection('organizations').doc(orgId)
    .collection('prospects')

  try {
    // Aggreger les compteurs avant le reset
    const snap = await prospectsRef.get()

    let totalSent = 0
    let totalReplies = 0
    let hotCount = 0
    let warmCount = 0
    let coldCount = 0

    snap.docs.forEach((doc) => {
      const data = doc.data()
      totalSent += data.sentToday || 0
      totalReplies += data.repliesToday || 0
      if (data.alexCategory === 'hot') hotCount++
      else if (data.alexCategory === 'warm') warmCount++
      else if (data.alexCategory === 'cold') coldCount++
    })

    // Sauvegarder dans dailyStats subcollection
    await db
      .collection('organizations').doc(orgId)
      .collection('dailyStats').doc(dateStr)
      .set({
        date: dateStr,
        totalSent,
        totalReplies,
        replyRate: totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0,
        hotLeads: hotCount,
        warmLeads: warmCount,
        coldLeads: coldCount,
        totalProspects: snap.size,
        createdAt: FieldValue.serverTimestamp(),
      })

    logger.info(`dailyReset: saved stats for org ${orgId} — sent:${totalSent} replies:${totalReplies}`)
  } catch (err) {
    logger.error(`saveOrgDailyStats error for ${orgId}:`, err.message)
  }
}

/**
 * Reset sentToday et repliesToday pour tous les prospects d'une org
 * Utilise des batch writes pour la performance
 */
async function resetOrgProspects(db, orgId) {
  const prospectsRef = db
    .collection('organizations').doc(orgId)
    .collection('prospects')

  let totalReset = 0

  try {
    // Trouver les prospects qui ont des compteurs > 0
    const snap = await prospectsRef
      .where('sentToday', '>', 0)
      .get()

    const snap2 = await prospectsRef
      .where('repliesToday', '>', 0)
      .get()

    // Combiner les IDs uniques
    const idsToReset = new Set()
    snap.docs.forEach((d) => idsToReset.add(d.id))
    snap2.docs.forEach((d) => idsToReset.add(d.id))

    if (idsToReset.size === 0) {
      return 0
    }

    // Batch write (max 500 par batch)
    const ids = Array.from(idsToReset)
    const batchSize = 450

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = db.batch()
      const chunk = ids.slice(i, i + batchSize)

      chunk.forEach((prospectId) => {
        const ref = prospectsRef.doc(prospectId)
        batch.update(ref, {
          sentToday: 0,
          repliesToday: 0,
        })
      })

      await batch.commit()
      totalReset += chunk.length
    }

    logger.info(`resetOrgProspects: reset ${totalReset} prospects for org ${orgId}`)
  } catch (err) {
    logger.error(`resetOrgProspects error for ${orgId}:`, err.message)
  }

  return totalReset
}

/**
 * Met a jour le sparkline (14 derniers jours) sur le document org
 */
async function updateOrgSparkline(db, orgId, todayStr) {
  try {
    // Charger les 14 derniers jours de stats
    const statsSnap = await db
      .collection('organizations').doc(orgId)
      .collection('dailyStats')
      .orderBy('date', 'desc')
      .limit(14)
      .get()

    const sparkline = statsSnap.docs
      .map((d) => {
        const data = d.data()
        return {
          date: data.date,
          sent: data.totalSent || 0,
          replies: data.totalReplies || 0,
          replyRate: data.replyRate || 0,
          hot: data.hotLeads || 0,
        }
      })
      .reverse() // Du plus ancien au plus recent

    await db.collection('organizations').doc(orgId).update({
      alexSparkline: sparkline,
      alexLastReset: FieldValue.serverTimestamp(),
    })

    logger.info(`updateOrgSparkline: updated sparkline for org ${orgId} (${sparkline.length} days)`)
  } catch (err) {
    logger.error(`updateOrgSparkline error for ${orgId}:`, err.message)
  }
}
