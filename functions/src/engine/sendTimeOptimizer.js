/**
 * Send Time Optimizer - Envoi au moment optimal
 * Niveau Instantly : Timing par secteur, jour, heure
 */

// Timing optimal par secteur (basé sur les données 2024-2025)
const SECTOR_TIMING = {
  restaurant: {
    hours: ['07:30', '08:00', '14:00'],
    days: ['tuesday', 'wednesday'],
    reason: 'Restaurateurs lisent leurs mails tot le matin avant le service'
  },
  retail: {
    hours: ['17:00', '17:30', '18:00'],
    days: ['tuesday', 'thursday'],
    reason: 'Le retail lit en fin de journee apres les clients'
  },
  medical: {
    hours: ['08:00', '08:30', '12:30'],
    days: ['wednesday', 'thursday'],
    reason: 'Medicaux ont des pauses mercredi et jeudi midi'
  },
  veterinaire: {
    hours: ['08:00', '12:00', '14:00'],
    days: ['tuesday', 'wednesday', 'thursday'],
    reason: 'Veterinaires entre deux rendez-vous'
  },
  tech: {
    hours: ['10:00', '10:30', '11:00', '14:30'],
    days: ['tuesday', 'thursday'],
    reason: 'Tech arrives plus tard, pic a 10h-11h'
  },
  legal: {
    hours: ['09:00', '09:30', '10:00'],
    days: ['tuesday', 'wednesday', 'thursday'],
    reason: 'Avocats/notaires tot le matin avant les RDV'
  },
  comptabilite: {
    hours: ['09:00', '09:30', '14:00'],
    days: ['tuesday', 'wednesday'],
    reason: 'Comptables entre les deadlines'
  },
  immobilier: {
    hours: ['09:00', '09:30', '17:00'],
    days: ['tuesday', 'thursday'],
    reason: 'Agents immobiliers avant et apres les visites'
  },
  formation: {
    hours: ['08:30', '09:00', '17:30'],
    days: ['tuesday', 'wednesday', 'thursday'],
    reason: 'Formateurs entre les sessions'
  },
  artisan: {
    hours: ['07:00', '07:30', '18:00'],
    days: ['tuesday', 'thursday'],
    reason: 'Artisans tres tot ou apres le chantier'
  },
  default: {
    hours: ['09:30', '10:00', '10:30', '14:00', '14:30'],
    days: ['tuesday', 'thursday', 'wednesday'],
    reason: 'Timing standard B2B'
  }
}

// Jours de la semaine en anglais et francais
const DAYS_MAP = {
  monday: { fr: 'Lundi', index: 1 },
  tuesday: { fr: 'Mardi', index: 2 },
  wednesday: { fr: 'Mercredi', index: 3 },
  thursday: { fr: 'Jeudi', index: 4 },
  friday: { fr: 'Vendredi', index: 5 },
  saturday: { fr: 'Samedi', index: 6 },
  sunday: { fr: 'Dimanche', index: 0 }
}

/**
 * Determine le moment optimal d'envoi
 * @param {Object} prospect - Prospect avec donnees
 * @param {string} channel - Canal (email, sms, whatsapp)
 * @param {number} stepIndex - Index de l'etape (0 = premier contact)
 * @returns {Object} Timing optimal
 */
export function getOptimalSendTime(prospect, channel, stepIndex = 0) {
  const enrichment = prospect.enrichment || prospect
  const sector = (enrichment.industry || enrichment.sector || '').toLowerCase()

  // Trouver le timing du secteur
  let timing = SECTOR_TIMING.default
  for (const [key, value] of Object.entries(SECTOR_TIMING)) {
    if (sector.includes(key)) {
      timing = value
      break
    }
  }

  // Pour SMS/WhatsApp, ajuster les heures (plus tard dans la journee)
  let hours = [...timing.hours]
  if (channel === 'sms' || channel === 'whatsapp') {
    hours = ['10:30', '11:00', '14:00', '14:30']
  }

  // Selectionner l'heure en fonction de l'index (varier entre les etapes)
  const hourIndex = stepIndex % hours.length
  const selectedHour = hours[hourIndex]

  // Selectionner le jour en fonction de l'index
  const dayIndex = stepIndex % timing.days.length
  const selectedDay = timing.days[dayIndex]

  return {
    sendHour: selectedHour,
    sendDay: selectedDay,
    sendDayFr: DAYS_MAP[selectedDay].fr,
    timezone: 'Europe/Paris',
    reason: timing.reason,
    alternativeDays: timing.days.filter(d => d !== selectedDay),
    alternativeHours: hours.filter(h => h !== selectedHour)
  }
}

/**
 * Calcule la prochaine date/heure d'envoi optimale
 * @param {number} baseDay - Jour de reference dans la sequence (0, 3, 7, etc.)
 * @param {Object} prospect - Prospect
 * @param {string} channel - Canal
 * @param {number} stepIndex - Index de l'etape
 * @returns {Date} Date d'envoi optimale
 */
export function calculateNextSendDate(baseDay, prospect, channel, stepIndex = 0) {
  const timing = getOptimalSendTime(prospect, channel, stepIndex)
  const now = new Date()

  // Commencer a partir d'aujourd'hui + baseDay
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + baseDay)

  // Trouver le prochain jour optimal
  const targetDayIndex = DAYS_MAP[timing.sendDay].index
  const currentDayIndex = targetDate.getDay()

  let daysToAdd = targetDayIndex - currentDayIndex
  if (daysToAdd < 0) daysToAdd += 7
  if (daysToAdd === 0 && isAfterHour(targetDate, timing.sendHour)) {
    daysToAdd = 7 // Passer a la semaine suivante
  }

  targetDate.setDate(targetDate.getDate() + daysToAdd)

  // Definir l'heure
  const [hours, minutes] = timing.sendHour.split(':').map(Number)
  targetDate.setHours(hours, minutes, 0, 0)

  return targetDate
}

function isAfterHour(date, hour) {
  const [h, m] = hour.split(':').map(Number)
  const currentHour = date.getHours()
  const currentMinutes = date.getMinutes()
  return currentHour > h || (currentHour === h && currentMinutes >= m)
}

/**
 * Verifie si c'est un bon moment pour envoyer maintenant
 */
export function isGoodTimeToSendNow(sector = 'default') {
  const now = new Date()
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]
  const currentHour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Trouver le timing du secteur
  const normalizedSector = sector.toLowerCase()
  let timing = SECTOR_TIMING.default
  for (const [key, value] of Object.entries(SECTOR_TIMING)) {
    if (normalizedSector.includes(key)) {
      timing = value
      break
    }
  }

  // Verifier le jour
  if (!timing.days.includes(currentDay)) {
    return {
      isGood: false,
      reason: `${DAYS_MAP[currentDay].fr} n'est pas un jour optimal pour ce secteur`,
      suggestion: `Privilegier ${timing.days.map(d => DAYS_MAP[d].fr).join(' ou ')}`
    }
  }

  // Verifier l'heure (tolerance de 30 min)
  const isNearOptimalHour = timing.hours.some(h => {
    const [targetH, targetM] = h.split(':').map(Number)
    const [currentH, currentM] = currentHour.split(':').map(Number)
    const targetMinutes = targetH * 60 + targetM
    const currentMinutes = currentH * 60 + currentM
    return Math.abs(targetMinutes - currentMinutes) <= 30
  })

  if (!isNearOptimalHour) {
    return {
      isGood: false,
      reason: `${currentHour} n'est pas dans la fenetre optimale`,
      suggestion: `Heures recommandees : ${timing.hours.join(', ')}`
    }
  }

  return {
    isGood: true,
    reason: 'Moment optimal pour envoyer',
    timing
  }
}

/**
 * Genere un planning d'envoi pour une semaine
 */
export function generateWeeklySchedule(prospects, icp) {
  const schedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: []
  }

  prospects.forEach((prospect, index) => {
    const timing = getOptimalSendTime(prospect, 'email', 0)
    const day = timing.sendDay

    if (schedule[day]) {
      schedule[day].push({
        prospect,
        time: timing.sendHour,
        priority: prospect.scoring?.priority || 'C'
      })
    }
  })

  // Trier par priorite et heure
  for (const day of Object.keys(schedule)) {
    schedule[day].sort((a, b) => {
      const priorityOrder = { A: 0, B: 1, C: 2, D: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.time.localeCompare(b.time)
    })
  }

  return schedule
}

/**
 * Stats sur les meilleurs moments (pour analytics)
 */
export function getSendTimeStats(sentEmails) {
  const stats = {
    byDay: {},
    byHour: {},
    bestCombinations: []
  }

  // Initialiser les jours
  Object.keys(DAYS_MAP).forEach(day => {
    stats.byDay[day] = { sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 }
  })

  // Initialiser les heures
  for (let h = 6; h <= 20; h++) {
    const hour = `${String(h).padStart(2, '0')}:00`
    stats.byHour[hour] = { sent: 0, opened: 0, replied: 0, openRate: 0, replyRate: 0 }
  }

  // Agreger les donnees
  sentEmails.forEach(email => {
    const sentAt = email.sentAt?.toDate ? email.sentAt.toDate() : new Date(email.sentAt)
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][sentAt.getDay()]
    const hour = `${String(sentAt.getHours()).padStart(2, '0')}:00`

    if (stats.byDay[day]) {
      stats.byDay[day].sent++
      if (email.opened) stats.byDay[day].opened++
      if (email.replied) stats.byDay[day].replied++
    }

    if (stats.byHour[hour]) {
      stats.byHour[hour].sent++
      if (email.opened) stats.byHour[hour].opened++
      if (email.replied) stats.byHour[hour].replied++
    }
  })

  // Calculer les taux
  for (const day of Object.keys(stats.byDay)) {
    const d = stats.byDay[day]
    d.openRate = d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0
    d.replyRate = d.sent > 0 ? Math.round((d.replied / d.sent) * 100) : 0
  }

  for (const hour of Object.keys(stats.byHour)) {
    const h = stats.byHour[hour]
    h.openRate = h.sent > 0 ? Math.round((h.opened / h.sent) * 100) : 0
    h.replyRate = h.sent > 0 ? Math.round((h.replied / h.sent) * 100) : 0
  }

  // Trouver les meilleures combinaisons
  const combinations = []
  for (const [day, dayStats] of Object.entries(stats.byDay)) {
    for (const [hour, hourStats] of Object.entries(stats.byHour)) {
      if (dayStats.sent > 5 && hourStats.sent > 5) {
        combinations.push({
          day,
          hour,
          combinedReplyRate: (dayStats.replyRate + hourStats.replyRate) / 2
        })
      }
    }
  }
  stats.bestCombinations = combinations
    .sort((a, b) => b.combinedReplyRate - a.combinedReplyRate)
    .slice(0, 5)

  return stats
}
