/**
 * callScheduler.js — CNIL-compliant call scheduling
 *
 * Legal calling hours in France (CNIL / Decret 2022-1313):
 *   - Lundi a Vendredi: 9h-12h et 14h-18h
 *   - Jamais les week-ends ni jours feries
 *   - Max 1 appel par 30 jours par lead
 *
 * Exports:
 *   - isCallAllowed(date)       → boolean
 *   - getNextLegalWindow(from)  → Date
 *   - JOURS_FERIES              → Set<string>
 */

// Jours feries France 2025-2026 (format YYYY-MM-DD)
const JOURS_FERIES = new Set([
  // 2025
  '2025-01-01', '2025-04-21', '2025-05-01', '2025-05-08',
  '2025-05-29', '2025-06-09', '2025-07-14', '2025-08-15',
  '2025-11-01', '2025-11-11', '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08',
  '2026-05-14', '2026-05-25', '2026-07-14', '2026-08-15',
  '2026-11-01', '2026-11-11', '2026-12-25',
])

/**
 * Formate une date en YYYY-MM-DD pour la timezone Europe/Paris.
 * @param {Date} date
 * @returns {string}
 */
function toParisDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
}

/**
 * Retourne l'heure Paris (0-23) pour une date donnee.
 * @param {Date} date
 * @returns {number}
 */
function getParisHour(date) {
  return parseInt(
    date.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }),
    10
  )
}

/**
 * Retourne le jour de la semaine (0=dim, 6=sam) en timezone Europe/Paris.
 * @param {Date} date
 * @returns {number}
 */
function getParisDay(date) {
  const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Europe/Paris', weekday: 'short' })
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[dayStr] ?? 0
}

/**
 * Verifie si un appel est autorise a la date donnee.
 *
 * @param {Date} [date=now] - Date a verifier
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function isCallAllowed(date = new Date()) {
  const dayOfWeek = getParisDay(date)
  const hour = getParisHour(date)
  const dateStr = toParisDateStr(date)

  // Week-end
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { allowed: false, reason: 'weekend' }
  }

  // Jour ferie
  if (JOURS_FERIES.has(dateStr)) {
    return { allowed: false, reason: `jour_ferie_${dateStr}` }
  }

  // Creneaux autorises: 9h-12h et 14h-18h
  const inMorning = hour >= 9 && hour < 12
  const inAfternoon = hour >= 14 && hour < 18

  if (!inMorning && !inAfternoon) {
    return { allowed: false, reason: `hors_creneau_${hour}h` }
  }

  return { allowed: true }
}

/**
 * Calcule la prochaine fenetre legale d'appel.
 *
 * @param {Date} [from=now] - Date de depart
 * @returns {Date} - Prochaine date autorisee
 */
export function getNextLegalWindow(from = new Date()) {
  const d = new Date(from)
  const MAX_ITERATIONS = 30 * 48 // securite: max 30 jours * 48 demi-heures

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const dayOfWeek = getParisDay(d)
    const hour = getParisHour(d)
    const dateStr = toParisDateStr(d)

    // Skip week-ends et feries
    if (dayOfWeek === 0 || dayOfWeek === 6 || JOURS_FERIES.has(dateStr)) {
      // Avancer au lendemain 9h
      d.setDate(d.getDate() + 1)
      setParisHour(d, 9, 0)
      continue
    }

    // Avant 9h → avancer a 9h
    if (hour < 9) {
      setParisHour(d, 9, 0)
      return d
    }

    // 9h-12h → OK
    if (hour >= 9 && hour < 12) {
      return d
    }

    // 12h-14h (pause dejeuner) → avancer a 14h
    if (hour >= 12 && hour < 14) {
      setParisHour(d, 14, 0)
      return d
    }

    // 14h-18h → OK
    if (hour >= 14 && hour < 18) {
      return d
    }

    // Apres 18h → lendemain 9h
    d.setDate(d.getDate() + 1)
    setParisHour(d, 9, 0)
  }

  // Fallback securite
  return d
}

/**
 * Helper — set hour in Paris timezone (approximatif mais suffisant).
 * @param {Date} d
 * @param {number} targetHour
 * @param {number} targetMin
 */
function setParisHour(d, targetHour, targetMin = 0) {
  const currentHour = getParisHour(d)
  const diff = targetHour - currentHour
  d.setHours(d.getHours() + diff, targetMin, 0, 0)
}

export { JOURS_FERIES }
