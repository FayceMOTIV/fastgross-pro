/**
 * Batch Calculator — Orchestrator Helper
 *
 * Calcul de taille de batch adaptative selon warmup,
 * delais inter-messages avec jitter gaussien,
 * decoupage intelligent des prospects en batches.
 */

import { logger } from 'firebase-functions/v2'

// Warmup schedule generique par canal (jour → maxPerDay)
const WARMUP_SCHEDULES = {
  email: [
    { minDay: 1, maxDay: 3, maxPerHour: 5, maxPerDay: 20 },
    { minDay: 4, maxDay: 7, maxPerHour: 10, maxPerDay: 50 },
    { minDay: 8, maxDay: 14, maxPerHour: 20, maxPerDay: 100 },
    { minDay: 15, maxDay: 21, maxPerHour: 40, maxPerDay: 200 },
    { minDay: 22, maxDay: Infinity, maxPerHour: 60, maxPerDay: 500 },
  ],
  sms: [
    { minDay: 1, maxDay: 3, maxPerHour: 2, maxPerDay: 5 },
    { minDay: 4, maxDay: 7, maxPerHour: 5, maxPerDay: 20 },
    { minDay: 8, maxDay: 14, maxPerHour: 10, maxPerDay: 50 },
    { minDay: 15, maxDay: Infinity, maxPerHour: 15, maxPerDay: 80 },
  ],
  whatsapp: [
    { minDay: 1, maxDay: 3, maxPerHour: 1, maxPerDay: 3 },
    { minDay: 4, maxDay: 7, maxPerHour: 3, maxPerDay: 15 },
    { minDay: 8, maxDay: 14, maxPerHour: 5, maxPerDay: 30 },
    { minDay: 15, maxDay: 21, maxPerHour: 8, maxPerDay: 40 },
    { minDay: 22, maxDay: Infinity, maxPerHour: 10, maxPerDay: 50 },
  ],
  instagram: [
    { minDay: 1, maxDay: 7, maxPerHour: 2, maxPerDay: 10 },
    { minDay: 8, maxDay: 14, maxPerHour: 5, maxPerDay: 25 },
    { minDay: 15, maxDay: Infinity, maxPerHour: 8, maxPerDay: 40 },
  ],
  linkedin: [
    { minDay: 1, maxDay: 7, maxPerHour: 3, maxPerDay: 15 },
    { minDay: 8, maxDay: 14, maxPerHour: 5, maxPerDay: 25 },
    { minDay: 15, maxDay: Infinity, maxPerHour: 8, maxPerDay: 40 },
  ],
  voicemail: [
    { minDay: 1, maxDay: 7, maxPerHour: 3, maxPerDay: 10 },
    { minDay: 8, maxDay: Infinity, maxPerHour: 5, maxPerDay: 20 },
  ],
  postal: [
    { minDay: 1, maxDay: Infinity, maxPerHour: 5, maxPerDay: 20 },
  ],
  twitter: [
    { minDay: 1, maxDay: 7, maxPerHour: 2, maxPerDay: 10 },
    { minDay: 8, maxDay: Infinity, maxPerHour: 5, maxPerDay: 25 },
  ],
}

// Delais de base inter-messages par canal (ms)
const BASE_DELAYS = {
  email: 2000,
  sms: 3000,
  whatsapp: 5000,
  instagram: 8000,
  linkedin: 10000,
  voicemail: 5000,
  postal: 1000,
  twitter: 6000,
}

/**
 * Calculer la taille de batch en fonction du warmup et du budget restant
 * @param {string} channel
 * @param {number} warmupDay - Jour depuis creation du canal (1-based)
 * @param {number} remaining - Budget restant aujourd'hui
 * @returns {{ batchSize: number, maxPerHour: number, maxPerDay: number, phase: string }}
 */
export function calculateBatchSize(channel, warmupDay = 1, remaining = Infinity) {
  const schedule = WARMUP_SCHEDULES[channel] || WARMUP_SCHEDULES.email
  const day = Math.max(1, warmupDay)

  const tier = schedule.find((s) => day >= s.minDay && day <= s.maxDay)
    || schedule[schedule.length - 1]

  // La taille du batch est le min entre maxPerHour et remaining
  const batchSize = Math.min(tier.maxPerHour, remaining)

  let phase = 'warmup'
  if (day <= 3) phase = 'initial'
  else if (day <= 7) phase = 'early'
  else if (day <= 14) phase = 'growing'
  else if (day <= 21) phase = 'maturing'
  else phase = 'mature'

  return {
    batchSize: Math.max(0, batchSize),
    maxPerHour: tier.maxPerHour,
    maxPerDay: tier.maxPerDay,
    phase,
  }
}

/**
 * Calculer le delai inter-messages avec jitter gaussien
 * Evite les patterns detectables par les plateformes
 * @param {string} channel
 * @returns {number} Delai en ms
 */
export function calculateDelay(channel) {
  const baseDelay = BASE_DELAYS[channel] || 3000

  // Jitter gaussien: ±30% du delai de base
  const jitterRange = baseDelay * 0.3
  const jitter = gaussianRandom() * jitterRange

  return Math.max(500, Math.round(baseDelay + jitter))
}

/**
 * Decouper une liste de prospects en batches
 * @param {Array} prospects
 * @param {number} batchSize
 * @returns {Array<Array>} Tableau de batches
 */
export function splitIntoBatches(prospects, batchSize) {
  if (!prospects || prospects.length === 0) return []
  if (batchSize <= 0) return []

  const batches = []
  for (let i = 0; i < prospects.length; i += batchSize) {
    batches.push(prospects.slice(i, i + batchSize))
  }

  return batches
}

/**
 * Obtenir les limites de warmup pour un canal et un jour specifique
 * @param {string} channel
 * @param {number} warmupDay
 * @returns {{ maxPerHour: number, maxPerDay: number }}
 */
export function getWarmupLimits(channel, warmupDay = 1) {
  const schedule = WARMUP_SCHEDULES[channel] || WARMUP_SCHEDULES.email
  const day = Math.max(1, warmupDay)

  const tier = schedule.find((s) => day >= s.minDay && day <= s.maxDay)
    || schedule[schedule.length - 1]

  return {
    maxPerHour: tier.maxPerHour,
    maxPerDay: tier.maxPerDay,
  }
}

/**
 * Generateur gaussien simple (Box-Muller)
 * Retourne une valeur entre -1 et 1 centree sur 0
 */
function gaussianRandom() {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2)
  return Math.max(-1, Math.min(1, z / 3))
}

export { WARMUP_SCHEDULES, BASE_DELAYS }
