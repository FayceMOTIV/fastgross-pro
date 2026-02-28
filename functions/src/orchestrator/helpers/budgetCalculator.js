/**
 * Budget Calculator — Orchestrator Helper
 *
 * Repartition dynamique du budget quotidien par canal,
 * allocation basee sur la performance, tracking budget restant.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// Cout moyen par message par canal (EUR)
const CHANNEL_COSTS = {
  email: 0.001,
  sms: 0.035,
  whatsapp: 0.05,
  instagram: 0,
  voicemail: 0.15,
  postal: 1.50,
  linkedin: 0,
  twitter: 0,
}

// Repartition par defaut (% du budget total messages)
const DEFAULT_ALLOCATION = {
  email: 0.40,
  sms: 0.15,
  whatsapp: 0.15,
  instagram: 0.10,
  linkedin: 0.10,
  voicemail: 0.05,
  postal: 0.03,
  twitter: 0.02,
}

/**
 * Calculer les budgets quotidiens par canal pour une org
 * @param {Object} orgConfig - { dailyBudget: { total, channels }, channels }
 * @returns {{ [channel]: number }} messages par canal
 */
export function calculateDailyBudgets(orgConfig) {
  const totalMessages = orgConfig.dailyBudget?.total || 100
  const channelOverrides = orgConfig.dailyBudget?.channels || {}
  const enabledChannels = orgConfig.channels || {}

  const budgets = {}

  // Si overrides explicites, les utiliser
  const overrideTotal = Object.values(channelOverrides).reduce((a, b) => a + b, 0)

  if (overrideTotal > 0) {
    for (const [channel, count] of Object.entries(channelOverrides)) {
      if (enabledChannels[channel]?.enabled !== false) {
        budgets[channel] = count
      }
    }
    return budgets
  }

  // Sinon, repartition par defaut
  for (const [channel, pct] of Object.entries(DEFAULT_ALLOCATION)) {
    if (enabledChannels[channel]?.enabled) {
      budgets[channel] = Math.floor(totalMessages * pct)
    }
  }

  return budgets
}

/**
 * Allocation dynamique basee sur la performance historique
 * Canaux performants recoivent plus de budget
 * @param {number} totalBudget - Nombre total de messages
 * @param {Object} channelPerformance - { [channel]: { sent, replied, responseRate } }
 * @returns {{ [channel]: number }}
 */
export function getChannelAllocation(totalBudget, channelPerformance) {
  const channels = Object.keys(channelPerformance)
  if (channels.length === 0) return {}

  // Calculer un score par canal (responseRate + bonus volume)
  const scores = {}
  let totalScore = 0

  for (const channel of channels) {
    const perf = channelPerformance[channel]
    const responseRate = parseFloat(perf.responseRate) || 0
    const volumeBonus = Math.min(perf.sent || 0, 100) / 100 // 0-1 bonus pour volume
    const score = Math.max(responseRate + volumeBonus * 5, 1) // Min score 1
    scores[channel] = score
    totalScore += score
  }

  // Distribuer proportionnellement
  const allocation = {}
  let distributed = 0

  for (const channel of channels) {
    const share = Math.floor((scores[channel] / totalScore) * totalBudget)
    allocation[channel] = share
    distributed += share
  }

  // Distribuer le reste au meilleur canal
  if (distributed < totalBudget && channels.length > 0) {
    const bestChannel = channels.reduce((a, b) => (scores[a] > scores[b] ? a : b))
    allocation[bestChannel] += totalBudget - distributed
  }

  return allocation
}

/**
 * Obtenir le budget restant pour un canal aujourd'hui
 * @returns {{ remaining: number, used: number, limit: number }}
 */
export async function getRemainingBudget(orgId, channel, date = null) {
  const db = getDb()
  const today = date || new Date().toISOString().split('T')[0]

  try {
    // Lire config org
    const orgSnap = await db.collection('organizations').doc(orgId).get()
    const org = orgSnap.exists ? orgSnap.data() : {}

    const budgets = calculateDailyBudgets(org)
    const limit = budgets[channel] || 0

    // Lire usage du jour
    const usageSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('dailyBudgets')
      .doc(today)
      .get()

    const usage = usageSnap.exists ? usageSnap.data() : {}
    const used = usage[`${channel}_sent`] || 0

    return { remaining: Math.max(0, limit - used), used, limit }
  } catch (error) {
    logger.error('getRemainingBudget error:', error)
    return { remaining: 0, used: 0, limit: 0 }
  }
}

/**
 * Enregistrer une utilisation de budget
 */
export async function recordBudgetUsage(orgId, channel, count = 1) {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  try {
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('dailyBudgets')
      .doc(today)
      .set(
        {
          date: today,
          [`${channel}_sent`]: FieldValue.increment(count),
          totalSent: FieldValue.increment(count),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
  } catch (error) {
    logger.error('recordBudgetUsage error:', error)
  }
}

export { CHANNEL_COSTS }
