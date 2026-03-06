/**
 * autoOptimizer — Alex apprend de ses resultats
 * Analyse reply rates, ajuste ton/longueur/timing automatiquement
 * Cron weekly — statistiques simples (moyennes, percentiles)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Calcule les metriques de performance d'Alex pour une org
 */
async function calculateAlexMetrics(orgId) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Charger interactions des 7 derniers jours
  let interactions = []
  try {
    const snap = await getDb()
      .collection('organizations').doc(orgId)
      .collection('interactions')
      .where('createdAt', '>=', sevenDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get()
    interactions = snap.docs.map((d) => d.data())
  } catch (err) {
    logger.warn(`Could not load interactions for org ${orgId}:`, err.message)
    return null
  }

  if (interactions.length === 0) return null

  const outbound = interactions.filter((i) => i.direction === 'out' && i.source !== 'manual')
  const inbound = interactions.filter((i) => i.direction === 'in')

  // Reply rate global
  const replyRate = outbound.length > 0
    ? Math.round((inbound.length / outbound.length) * 100)
    : 0

  // Reply rate par canal
  const channelStats = {}
  for (const msg of outbound) {
    const ch = msg.channel || 'unknown'
    if (!channelStats[ch]) channelStats[ch] = { sent: 0, replies: 0 }
    channelStats[ch].sent++
  }
  for (const msg of inbound) {
    const ch = msg.channel || 'unknown'
    if (channelStats[ch]) channelStats[ch].replies++
  }

  const channelReplyRates = {}
  for (const [ch, stats] of Object.entries(channelStats)) {
    channelReplyRates[ch] = stats.sent > 0 ? Math.round((stats.replies / stats.sent) * 100) : 0
  }

  // Meilleur canal
  const bestChannel = Object.entries(channelReplyRates)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null

  // Reply rate par heure
  const hourStats = {}
  for (const msg of outbound) {
    const hour = msg.createdAt?.toDate?.()?.getHours?.() ?? null
    if (hour !== null) {
      if (!hourStats[hour]) hourStats[hour] = { sent: 0, replies: 0 }
      hourStats[hour].sent++
    }
  }
  for (const msg of inbound) {
    const replyHour = msg.createdAt?.toDate?.()?.getHours?.() ?? null
    if (replyHour !== null && hourStats[replyHour]) {
      hourStats[replyHour].replies++
    }
  }

  const bestHour = Object.entries(hourStats)
    .map(([h, s]) => ({ hour: parseInt(h), rate: s.sent > 0 ? s.replies / s.sent : 0 }))
    .sort((a, b) => b.rate - a.rate)[0]?.hour ?? null

  // Longueur message optimale
  const msgLengths = outbound
    .filter((m) => m.message)
    .map((m) => m.message.length)
  const avgLength = msgLengths.length > 0
    ? Math.round(msgLengths.reduce((a, b) => a + b, 0) / msgLengths.length)
    : 200

  // Score moyen des prospects replies
  const repliedScores = inbound
    .filter((i) => i.score)
    .map((i) => i.score)
  const avgReplyScore = repliedScores.length > 0
    ? Math.round(repliedScores.reduce((a, b) => a + b, 0) / repliedScores.length)
    : 0

  return {
    period: '7d',
    totalSent: outbound.length,
    totalReplies: inbound.length,
    replyRate,
    channelReplyRates,
    bestChannel,
    bestHour,
    avgMessageLength: avgLength,
    avgReplyScore,
    calculatedAt: new Date(),
  }
}

/**
 * Genere les parametres d'optimisation
 */
function generateOptimizationParams(metrics) {
  if (!metrics) return {}

  const params = {}

  // Ton prefere basé sur le reply rate
  if (metrics.replyRate >= 20) {
    params.preferred_tone = 'current' // Ca marche, ne rien changer
  } else if (metrics.replyRate >= 10) {
    params.preferred_tone = 'more_direct' // Plus direct
  } else {
    params.preferred_tone = 'more_casual' // Plus casual/humain
  }

  // Longueur optimale
  params.max_length = Math.min(400, Math.max(100, metrics.avgMessageLength))

  // Heures optimales
  if (metrics.bestHour !== null) {
    params.best_hours = [metrics.bestHour]
    // Ajouter les heures adjacentes
    if (metrics.bestHour > 8) params.best_hours.push(metrics.bestHour - 1)
    if (metrics.bestHour < 19) params.best_hours.push(metrics.bestHour + 1)
    params.best_hours.sort((a, b) => a - b)
  }

  // Canal prioritaire
  if (metrics.bestChannel) {
    params.preferred_channel = metrics.bestChannel
  }

  return params
}

/**
 * Cron weekly: analyse les performances et ajuste les parametres
 */
export const autoOptimizerCron = onSchedule(
  {
    schedule: 'every monday 07:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    logger.info('Auto-Optimizer cron started')

    try {
      const orgsSnap = await getDb()
        .collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      let optimized = 0

      for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id

        const metrics = await calculateAlexMetrics(orgId)
        if (!metrics) continue

        const optimization = generateOptimizationParams(metrics)

        // Sauvegarder metriques
        const weekId = `alex-${new Date().toISOString().slice(0, 10)}`
        await getDb()
          .collection('organizations').doc(orgId)
          .collection('analytics').doc(weekId)
          .set({
            ...metrics,
            optimization,
            type: 'alex_weekly',
            createdAt: FieldValue.serverTimestamp(),
          })

        // Sauvegarder parametres optimises
        await getDb()
          .collection('organizations').doc(orgId)
          .collection('settings').doc('alexOptimization')
          .set({
            ...optimization,
            metrics: {
              replyRate: metrics.replyRate,
              bestChannel: metrics.bestChannel,
              bestHour: metrics.bestHour,
            },
            lastOptimizedAt: FieldValue.serverTimestamp(),
          }, { merge: true })

        optimized++
        logger.info(`Optimized Alex for org ${orgId}: reply rate ${metrics.replyRate}%, best channel ${metrics.bestChannel}`)
      }

      logger.info(`Auto-Optimizer complete: ${optimized} orgs optimized`)
    } catch (err) {
      logger.error('Auto-Optimizer error:', err.message)
    }
  }
)

export { calculateAlexMetrics, generateOptimizationParams }
