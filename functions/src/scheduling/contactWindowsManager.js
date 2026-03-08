/**
 * Contact Windows Manager — Intent Hunter
 *
 * Fenetres de contact autorisees par systeme (B2B / B2C).
 * TOUTES les sequences passent par getNextContactSlot() avant d'envoyer.
 * Ne jamais contacter hors fenetre, quel que soit l'urgence.
 *
 * Inclut les jours feries France 2025-2026 hardcodes.
 */

// ============================================
// JOURS FERIES FRANCE 2025-2026
// ============================================

const FRENCH_PUBLIC_HOLIDAYS = [
  // 2025
  '2025-01-01', // Jour de l'an
  '2025-04-21', // Lundi de Paques
  '2025-05-01', // Fete du travail
  '2025-05-08', // Victoire 1945
  '2025-05-29', // Ascension
  '2025-06-09', // Lundi de Pentecote
  '2025-07-14', // Fete nationale
  '2025-08-15', // Assomption
  '2025-11-01', // Toussaint
  '2025-11-11', // Armistice
  '2025-12-25', // Noel
  // 2026
  '2026-01-01', // Jour de l'an
  '2026-04-06', // Lundi de Paques
  '2026-05-01', // Fete du travail
  '2026-05-08', // Victoire 1945
  '2026-05-14', // Ascension
  '2026-05-25', // Lundi de Pentecote
  '2026-07-14', // Fete nationale
  '2026-08-15', // Assomption
  '2026-11-01', // Toussaint
  '2026-11-11', // Armistice
  '2026-12-25', // Noel
  // 2027 (debut d'annee)
  '2027-01-01'
]

const holidaySet = new Set(FRENCH_PUBLIC_HOLIDAYS)

// ============================================
// CONTACT WINDOWS DEFINITION
// ============================================

const CONTACT_WINDOWS = {
  B2B: {
    days: [1, 2, 3, 4, 5],               // Lundi-Vendredi
    hours: { start: 8, end: 18 },
    bestSlots: ['09:00', '10:00', '14:00', '15:00']
  },
  B2C: {
    days: [1, 2, 3, 4, 5, 6],            // Lundi-Samedi (jamais dimanche)
    hours: { start: 9, end: 20 },
    bestSlots: ['12:00', '12:30', '19:00', '19:30']
  }
}

// ============================================
// TIMEZONE UTILITIES
// ============================================

/**
 * Obtient la date/heure actuelle dans un fuseau horaire donne
 */
function nowInTimezone(timezone = 'Europe/Paris') {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(now)
  const get = (type) => parts.find(p => p.type === type)?.value

  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    dayOfWeek: new Date(
      parseInt(get('year')),
      parseInt(get('month')) - 1,
      parseInt(get('day'))
    ).getDay() || 7, // 1=Lundi, 7=Dimanche (ISO)
    dateString: `${get('year')}-${get('month')}-${get('day')}`,
    raw: now
  }
}

/**
 * Verifie si une date est un jour ferie
 */
function isPublicHoliday(dateString) {
  return holidaySet.has(dateString)
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Verifie si on est actuellement dans une fenetre de contact autorisee
 *
 * @param {'B2B'|'B2C'} systemType
 * @param {string} timezone - Fuseau horaire du prospect (defaut Europe/Paris)
 * @returns {boolean}
 */
export function isInContactWindow(systemType, timezone = 'Europe/Paris') {
  const window = CONTACT_WINDOWS[systemType]
  if (!window) return false

  const now = nowInTimezone(timezone)

  // Jour ferie → interdit
  if (isPublicHoliday(now.dateString)) return false

  // Jour de la semaine (ISO: 1=Lundi, 7=Dimanche)
  const jsDay = new Date(now.year, now.month - 1, now.day).getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay
  if (!window.days.includes(isoDay)) return false

  // Heure
  if (now.hour < window.hours.start || now.hour >= window.hours.end) return false

  return true
}

/**
 * Calcule le prochain creneau de contact autorise
 *
 * @param {'B2B'|'B2C'} systemType
 * @param {string} timezone
 * @returns {string} Timestamp ISO du prochain creneau
 */
export function getNextContactSlot(systemType, timezone = 'Europe/Paris') {
  const window = CONTACT_WINDOWS[systemType]
  if (!window) throw new Error(`systemType invalide: ${systemType}`)

  // Si on est deja dans la fenetre, retourner maintenant
  if (isInContactWindow(systemType, timezone)) {
    return new Date().toISOString()
  }

  // Sinon, chercher le prochain creneau
  const now = new Date()
  const candidate = new Date(now)

  // Chercher dans les 14 prochains jours max
  for (let attempt = 0; attempt < 14; attempt++) {
    // Obtenir les infos du jour candidat dans le bon timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit'
    })
    const dateParts = formatter.formatToParts(candidate)
    const dateStr = `${dateParts.find(p => p.type === 'year').value}-${dateParts.find(p => p.type === 'month').value}-${dateParts.find(p => p.type === 'day').value}`

    const jsDay = candidate.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay

    const isValidDay = window.days.includes(isoDay) && !isPublicHoliday(dateStr)

    if (isValidDay) {
      // Calculer l'heure de debut dans le timezone du prospect
      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', hour12: false
      })
      const currentHour = parseInt(hourFormatter.format(candidate))

      if (attempt === 0 && currentHour < window.hours.end) {
        // Aujourd'hui, on peut encore envoyer
        if (currentHour >= window.hours.start) {
          return candidate.toISOString()
        }
        // Avant ouverture : programmer a l'heure d'ouverture
        const startSlot = new Date(candidate)
        // Approximation : ajouter la difference d'heures
        startSlot.setHours(startSlot.getHours() + (window.hours.start - currentHour))
        startSlot.setMinutes(0, 0, 0)
        return startSlot.toISOString()
      }

      if (attempt > 0) {
        // Jour futur valide : programmer a l'heure d'ouverture
        // Utiliser le meilleur slot si disponible
        const bestSlot = window.bestSlots[0] || `${String(window.hours.start).padStart(2, '0')}:00`
        const [slotHour, slotMin] = bestSlot.split(':').map(Number)

        // Creer la date au bon jour avec le bon horaire
        const scheduled = new Date(candidate)
        scheduled.setHours(slotHour, slotMin, 0, 0)
        return scheduled.toISOString()
      }
    }

    // Passer au jour suivant (debut de journee)
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(0, 0, 0, 0)
  }

  // Fallback : demain matin (ne devrait jamais arriver)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(window.hours.start, 0, 0, 0)
  return tomorrow.toISOString()
}

/**
 * Detecte le fuseau horaire probable d'un lead
 *
 * @param {Object} lead
 * @returns {string} Timezone string
 */
export function detectTimezone(lead) {
  // France metropolitaine par defaut
  const defaultTz = 'Europe/Paris'

  if (lead.timezone) return lead.timezone

  // Detection par zone/ville connue
  if (lead.zone || lead.city || lead.location) {
    const loc = (lead.zone || lead.city || lead.location).toLowerCase()

    // DOM-TOM
    if (loc.includes('guadeloupe') || loc.includes('martinique') || loc.includes('saint-barth')) return 'America/Guadeloupe'
    if (loc.includes('reunion') || loc.includes('mayotte')) return 'Indian/Reunion'
    if (loc.includes('guyane') || loc.includes('cayenne')) return 'America/Cayenne'
    if (loc.includes('polynesie') || loc.includes('tahiti')) return 'Pacific/Tahiti'
    if (loc.includes('nouvelle-caledonie') || loc.includes('noumea')) return 'Pacific/Noumea'

    // Pays europeens proches
    if (loc.includes('london') || loc.includes('londres') || loc.includes('uk')) return 'Europe/London'
    if (loc.includes('berlin') || loc.includes('munich') || loc.includes('allemagne')) return 'Europe/Berlin'
    if (loc.includes('madrid') || loc.includes('barcelona') || loc.includes('espagne')) return 'Europe/Madrid'
    if (loc.includes('rome') || loc.includes('milan') || loc.includes('italie')) return 'Europe/Rome'
    if (loc.includes('bruxelles') || loc.includes('belgique')) return 'Europe/Brussels'
    if (loc.includes('geneve') || loc.includes('zurich') || loc.includes('suisse')) return 'Europe/Zurich'
  }

  // Detection par indicatif telephonique
  if (lead.phone) {
    if (lead.phone.startsWith('+33')) return 'Europe/Paris'
    if (lead.phone.startsWith('+32')) return 'Europe/Brussels'
    if (lead.phone.startsWith('+41')) return 'Europe/Zurich'
    if (lead.phone.startsWith('+44')) return 'Europe/London'
    if (lead.phone.startsWith('+49')) return 'Europe/Berlin'
    if (lead.phone.startsWith('+34')) return 'Europe/Madrid'
    if (lead.phone.startsWith('+39')) return 'Europe/Rome'
    if (lead.phone.startsWith('+212')) return 'Africa/Casablanca'
    if (lead.phone.startsWith('+216')) return 'Africa/Tunis'
    if (lead.phone.startsWith('+1')) return 'America/New_York'
  }

  return defaultTz
}

/**
 * Retourne les meilleures heures d'envoi pour un systemType
 * @param {'B2B'|'B2C'} systemType
 * @returns {string[]} Best time slots
 */
export function getBestSlots(systemType) {
  return CONTACT_WINDOWS[systemType]?.bestSlots || []
}

/**
 * Retourne la configuration de fenetre pour un systemType
 * @param {'B2B'|'B2C'} systemType
 * @returns {Object} Window config
 */
export function getWindowConfig(systemType) {
  return CONTACT_WINDOWS[systemType] || null
}
