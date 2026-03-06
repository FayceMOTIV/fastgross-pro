/**
 * Business Hours Validator — Orchestrator Helper
 *
 * Verification horaires ouvrables, weekends, jours feries,
 * calcul du prochain creneau d'envoi.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { getCountryProfile } from '../../engine/countryProfiles.js'

const getDb = () => getFirestore()

// Horaires par defaut par timezone
const DEFAULT_BUSINESS_HOURS = {
  'Europe/Paris': { start: 8, end: 20 },
  'Europe/London': { start: 8, end: 19 },
  'America/New_York': { start: 9, end: 18 },
  'America/Los_Angeles': { start: 9, end: 18 },
  'Asia/Dubai': { start: 9, end: 19 },
  'Africa/Casablanca': { start: 9, end: 19 },
}

/**
 * Verifier si on est dans les horaires ouvrables
 * @param {string} timezone
 * @param {Object} customHours - { start: number, end: number }
 * @returns {boolean}
 */
export function isWithinBusinessHours(timezone = 'Europe/Paris', customHours = null) {
  try {
    const hours = customHours || DEFAULT_BUSINESS_HOURS[timezone] || DEFAULT_BUSINESS_HOURS['Europe/Paris']
    const now = new Date()

    // Heure locale dans le timezone
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const currentHour = parseInt(hourFormatter.format(now), 10)

    // Jour de la semaine
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    })
    const day = dayFormatter.format(now)

    // Weekends
    if (day === 'Sat' || day === 'Sun') {
      return false
    }

    return currentHour >= hours.start && currentHour < hours.end
  } catch (error) {
    // Fallback serveur
    const hour = new Date().getHours()
    const day = new Date().getDay()
    if (day === 0 || day === 6) return false
    return hour >= 8 && hour < 20
  }
}

/**
 * Calculer le prochain creneau d'envoi disponible
 * @param {string} timezone
 * @param {Object} customHours
 * @returns {{ nextWindow: Date, waitMinutes: number, isNow: boolean }}
 */
export function getNextSendWindow(timezone = 'Europe/Paris', customHours = null) {
  const hours = customHours || DEFAULT_BUSINESS_HOURS[timezone] || DEFAULT_BUSINESS_HOURS['Europe/Paris']

  // Si deja dans les heures ouvrables
  if (isWithinBusinessHours(timezone, customHours)) {
    return { nextWindow: new Date(), waitMinutes: 0, isNow: true }
  }

  const now = new Date()

  // Heure et jour dans le timezone
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  })
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })

  const currentHour = parseInt(hourFormatter.format(now), 10)
  const currentDay = dayFormatter.format(now)

  let daysToAdd = 0

  // Si weekend ou apres les heures, avancer
  if (currentDay === 'Fri' && currentHour >= hours.end) {
    daysToAdd = 3 // Lundi
  } else if (currentDay === 'Sat') {
    daysToAdd = 2 // Lundi
  } else if (currentDay === 'Sun') {
    daysToAdd = 1 // Lundi
  } else if (currentHour >= hours.end) {
    daysToAdd = 1 // Demain
  }

  // Construire la prochaine fenetre
  const next = new Date(now)
  next.setDate(next.getDate() + daysToAdd)

  // Si on est avant les heures aujourd'hui (et pas weekend), c'est aujourd'hui
  if (daysToAdd === 0 && currentHour < hours.start) {
    // Attendre le debut des heures ouvrables
  }

  // Calculer les minutes d'attente approximatives
  let waitMinutes = 0
  if (daysToAdd > 0) {
    // Heures restantes aujourd'hui + heures des jours intermediaires + debut demain
    waitMinutes = (24 - currentHour + (daysToAdd - 1) * 24 + hours.start) * 60
  } else {
    waitMinutes = (hours.start - currentHour) * 60
  }

  return {
    nextWindow: next,
    waitMinutes: Math.max(0, waitMinutes),
    isNow: false,
  }
}

/**
 * Lire la config business hours d'une organisation
 * @param {string} orgId
 * @returns {{ timezone: string, hours: { start: number, end: number }, isOpen: boolean }}
 */
export async function getBusinessHoursForOrg(orgId) {
  try {
    const orgSnap = await getDb().collection('organizations').doc(orgId).get()
    const org = orgSnap.exists ? orgSnap.data() : {}

    const timezone = org.timezone || 'Europe/Paris'
    const customHours = org.businessHours || null
    const isOpen = isWithinBusinessHours(timezone, customHours)

    return {
      timezone,
      hours: customHours || DEFAULT_BUSINESS_HOURS[timezone] || DEFAULT_BUSINESS_HOURS['Europe/Paris'],
      isOpen,
      nextWindow: isOpen ? null : getNextSendWindow(timezone, customHours),
    }
  } catch (error) {
    logger.error('getBusinessHoursForOrg error:', error)
    return {
      timezone: 'Europe/Paris',
      hours: DEFAULT_BUSINESS_HOURS['Europe/Paris'],
      isOpen: false,
      nextWindow: getNextSendWindow('Europe/Paris'),
    }
  }
}

/**
 * Verifie les heures ouvrables en utilisant la timezone du prospect (pas de l'org)
 * @param {object} prospect - Donnees prospect
 * @param {object} org - Donnees organisation (fallback)
 * @returns {{ isOpen: boolean, timezone: string, nextWindow: object|null }}
 */
export function isOpenForProspect(prospect, org = {}) {
  const countryProfile = getCountryProfile(prospect)
  const prospectTimezone = prospect?.timezone || countryProfile.timezone
  const hours = countryProfile.businessHours || org.businessHours || null

  const isOpen = isWithinBusinessHours(prospectTimezone, hours)

  return {
    isOpen,
    timezone: prospectTimezone,
    country: countryProfile.code,
    nextWindow: isOpen ? null : getNextSendWindow(prospectTimezone, hours),
  }
}

export { DEFAULT_BUSINESS_HOURS }
