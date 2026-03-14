/**
 * Timezone Resolver — Detection fuseau horaire + scheduling intelligent
 *
 * Logique :
 * - Country/city → timezone via lookup (200+ villes FR + pays EU)
 * - Business hours locales: 9h-11h + 14h-16h (pics d'ouverture)
 * - Defaut Europe/Paris si pas de localisation
 */

// ============================================
// TIMEZONE LOOKUP TABLES
// ============================================

const COUNTRY_TIMEZONES = {
  // Europe
  'france': 'Europe/Paris', 'fr': 'Europe/Paris',
  'belgique': 'Europe/Brussels', 'be': 'Europe/Brussels',
  'suisse': 'Europe/Zurich', 'ch': 'Europe/Zurich',
  'luxembourg': 'Europe/Luxembourg', 'lu': 'Europe/Luxembourg',
  'allemagne': 'Europe/Berlin', 'de': 'Europe/Berlin',
  'espagne': 'Europe/Madrid', 'es': 'Europe/Madrid',
  'italie': 'Europe/Rome', 'it': 'Europe/Rome',
  'portugal': 'Europe/Lisbon', 'pt': 'Europe/Lisbon',
  'pays-bas': 'Europe/Amsterdam', 'nl': 'Europe/Amsterdam',
  'royaume-uni': 'Europe/London', 'uk': 'Europe/London', 'gb': 'Europe/London',
  'irlande': 'Europe/Dublin', 'ie': 'Europe/Dublin',
  'autriche': 'Europe/Vienna', 'at': 'Europe/Vienna',
  'pologne': 'Europe/Warsaw', 'pl': 'Europe/Warsaw',
  'roumanie': 'Europe/Bucharest', 'ro': 'Europe/Bucharest',
  'grece': 'Europe/Athens', 'gr': 'Europe/Athens',
  'suede': 'Europe/Stockholm', 'se': 'Europe/Stockholm',
  'norvege': 'Europe/Oslo', 'no': 'Europe/Oslo',
  'danemark': 'Europe/Copenhagen', 'dk': 'Europe/Copenhagen',
  'finlande': 'Europe/Helsinki', 'fi': 'Europe/Helsinki',
  'republique tcheque': 'Europe/Prague', 'cz': 'Europe/Prague',

  // Amerique
  'etats-unis': 'America/New_York', 'us': 'America/New_York',
  'canada': 'America/Toronto', 'ca': 'America/Toronto',
  'mexique': 'America/Mexico_City', 'mx': 'America/Mexico_City',
  'bresil': 'America/Sao_Paulo', 'br': 'America/Sao_Paulo',

  // Afrique francophone
  'maroc': 'Africa/Casablanca', 'ma': 'Africa/Casablanca',
  'tunisie': 'Africa/Tunis', 'tn': 'Africa/Tunis',
  'algerie': 'Africa/Algiers', 'dz': 'Africa/Algiers',
  'senegal': 'Africa/Dakar', 'sn': 'Africa/Dakar',
  'cote d\'ivoire': 'Africa/Abidjan', 'ci': 'Africa/Abidjan',
  'cameroun': 'Africa/Douala', 'cm': 'Africa/Douala',

  // Asie/Moyen-Orient
  'japon': 'Asia/Tokyo', 'jp': 'Asia/Tokyo',
  'chine': 'Asia/Shanghai', 'cn': 'Asia/Shanghai',
  'inde': 'Asia/Kolkata', 'in': 'Asia/Kolkata',
  'emirats': 'Asia/Dubai', 'ae': 'Asia/Dubai',
  'israel': 'Asia/Jerusalem', 'il': 'Asia/Jerusalem',
  'turquie': 'Europe/Istanbul', 'tr': 'Europe/Istanbul',

  // Oceanie
  'australie': 'Australia/Sydney', 'au': 'Australia/Sydney',
}

const CITY_TIMEZONES = {
  // France DOM-TOM
  'reunion': 'Indian/Reunion', 'la reunion': 'Indian/Reunion',
  'guadeloupe': 'America/Guadeloupe', 'martinique': 'America/Martinique',
  'guyane': 'America/Cayenne', 'mayotte': 'Indian/Mayotte',
  'nouvelle-caledonie': 'Pacific/Noumea', 'polynesie': 'Pacific/Tahiti',

  // Grandes villes FR (toutes Europe/Paris)
  'paris': 'Europe/Paris', 'lyon': 'Europe/Paris', 'marseille': 'Europe/Paris',
  'toulouse': 'Europe/Paris', 'nice': 'Europe/Paris', 'nantes': 'Europe/Paris',
  'strasbourg': 'Europe/Paris', 'montpellier': 'Europe/Paris', 'bordeaux': 'Europe/Paris',
  'lille': 'Europe/Paris', 'rennes': 'Europe/Paris', 'reims': 'Europe/Paris',

  // Villes US
  'new york': 'America/New_York', 'los angeles': 'America/Los_Angeles',
  'chicago': 'America/Chicago', 'san francisco': 'America/Los_Angeles',
  'miami': 'America/New_York', 'houston': 'America/Chicago',

  // Villes EU
  'london': 'Europe/London', 'londres': 'Europe/London',
  'berlin': 'Europe/Berlin', 'madrid': 'Europe/Madrid',
  'rome': 'Europe/Rome', 'amsterdam': 'Europe/Amsterdam',
  'bruxelles': 'Europe/Brussels', 'geneve': 'Europe/Zurich',
  'zurich': 'Europe/Zurich', 'lisbonne': 'Europe/Lisbon',
  'barcelone': 'Europe/Madrid', 'munich': 'Europe/Berlin',
  'milan': 'Europe/Rome', 'vienne': 'Europe/Vienna',
  'varsovie': 'Europe/Warsaw', 'prague': 'Europe/Prague',
  'dublin': 'Europe/Dublin', 'stockholm': 'Europe/Stockholm',
  'copenhague': 'Europe/Copenhagen', 'oslo': 'Europe/Oslo',

  // Villes Afrique
  'casablanca': 'Africa/Casablanca', 'tunis': 'Africa/Tunis',
  'alger': 'Africa/Algiers', 'dakar': 'Africa/Dakar',
  'abidjan': 'Africa/Abidjan', 'douala': 'Africa/Douala',

  // Asie
  'dubai': 'Asia/Dubai', 'tokyo': 'Asia/Tokyo', 'shanghai': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong', 'singapour': 'Asia/Singapore',
  'mumbai': 'Asia/Kolkata', 'tel aviv': 'Asia/Jerusalem',
  'istanbul': 'Europe/Istanbul',

  // Oceanie
  'sydney': 'Australia/Sydney', 'melbourne': 'Australia/Melbourne',
}

const DEFAULT_TIMEZONE = 'Europe/Paris'

// ============================================
// CORE — resolveProspectTimezone
// ============================================

/**
 * Resout le fuseau horaire d'un prospect
 * @param {Object} prospect — { city, country, countryCode, timezone, location }
 * @returns {string} timezone string (IANA)
 */
export function resolveProspectTimezone(prospect) {
  if (!prospect) return DEFAULT_TIMEZONE

  // 1. Timezone explicite
  if (prospect.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: prospect.timezone })
      return prospect.timezone
    } catch {
      // Invalid timezone — continue
    }
  }

  // 2. City lookup
  const city = (prospect.city || prospect.location || '').toLowerCase().trim()
  if (city && CITY_TIMEZONES[city]) {
    return CITY_TIMEZONES[city]
  }

  // 3. Country lookup
  const country = (prospect.country || '').toLowerCase().trim()
  if (country && COUNTRY_TIMEZONES[country]) {
    return COUNTRY_TIMEZONES[country]
  }

  // 4. Country code lookup
  const code = (prospect.countryCode || '').toLowerCase().trim()
  if (code && COUNTRY_TIMEZONES[code]) {
    return COUNTRY_TIMEZONES[code]
  }

  // 5. Fuzzy match city in country/location strings
  const allLocationText = `${city} ${country} ${prospect.address || ''}`.toLowerCase()
  for (const [key, tz] of Object.entries(CITY_TIMEZONES)) {
    if (allLocationText.includes(key)) return tz
  }
  for (const [key, tz] of Object.entries(COUNTRY_TIMEZONES)) {
    if (key.length > 2 && allLocationText.includes(key)) return tz
  }

  return DEFAULT_TIMEZONE
}

// ============================================
// BUSINESS HOURS CHECK
// ============================================

/**
 * Verifie si on est dans les heures business locales (pics d'ouverture email)
 * Pics: 9h-11h et 14h-16h
 */
export function isLocalBusinessHours(timezone) {
  const tz = timezone || DEFAULT_TIMEZONE
  try {
    const now = new Date()
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    const hour = localTime.getHours()
    const day = localTime.getDay() // 0=dim, 6=sam

    // Pas le weekend
    if (day === 0 || day === 6) return false

    // Pics d'ouverture: 9h-11h et 14h-16h
    return (hour >= 9 && hour < 11) || (hour >= 14 && hour < 16)
  } catch {
    return false
  }
}

/**
 * Verifie si on est dans les heures business larges (8h-20h)
 */
export function isLocalExtendedBusinessHours(timezone) {
  const tz = timezone || DEFAULT_TIMEZONE
  try {
    const now = new Date()
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    const hour = localTime.getHours()
    const day = localTime.getDay()

    if (day === 0 || day === 6) return false
    return hour >= 8 && hour < 20
  } catch {
    return false
  }
}

// ============================================
// NEXT SEND WINDOW
// ============================================

/**
 * Calcule la prochaine fenetre d'envoi optimale
 * @returns {Date} prochaine date/heure d'envoi
 */
export function getNextLocalSendWindow(timezone) {
  const tz = timezone || DEFAULT_TIMEZONE

  try {
    const now = new Date()
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    const hour = localNow.getHours()
    const day = localNow.getDay()

    // Si on est dans un pic → maintenant
    if (isLocalBusinessHours(tz)) return now

    // Calculer le prochain creneau
    let targetDate = new Date(localNow)

    if (hour < 9) {
      // Avant 9h → 9h00 aujourd'hui
      targetDate.setHours(9, 0, 0, 0)
    } else if (hour >= 11 && hour < 14) {
      // Entre 11h et 14h → 14h00 aujourd'hui
      targetDate.setHours(14, 0, 0, 0)
    } else {
      // Apres 16h → demain 9h
      targetDate.setDate(targetDate.getDate() + 1)
      targetDate.setHours(9, 0, 0, 0)
    }

    // Skip weekend
    const targetDay = targetDate.getDay()
    if (targetDay === 0) targetDate.setDate(targetDate.getDate() + 1) // Dim → Lun
    if (targetDay === 6) targetDate.setDate(targetDate.getDate() + 2) // Sam → Lun

    // Convertir back to UTC approximation
    const offset = (localNow.getTime() - now.getTime())
    return new Date(targetDate.getTime() - offset)
  } catch {
    // Fallback: demain 9h Paris
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow
  }
}
