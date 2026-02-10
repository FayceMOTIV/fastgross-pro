/**
 * Email Warmup System - Rodage progressif des nouveaux domaines
 * Niveau Instantly : 2-4 semaines de warm-up automatique
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// Planning de warm-up sur 4 semaines
const WARMUP_SCHEDULE = {
  week1: { minEmails: 5, maxEmails: 10, description: 'Conversations internes et contacts existants' },
  week2: { minEmails: 15, maxEmails: 25, description: 'Contacts existants et premiers cold emails' },
  week3: { minEmails: 30, maxEmails: 40, description: 'Cold emails progressifs' },
  week4: { minEmails: 50, maxEmails: 50, description: 'Pleine capacite' }
}

/**
 * Calcule le jour de warm-up et les limites d'envoi
 */
export function getWarmupStatus(inbox) {
  if (!inbox.warmupEnabled) {
    return {
      enabled: false,
      status: 'disabled',
      dailyLimit: inbox.dailyLimit || 50
    }
  }

  const createdAt = inbox.createdAt?.toDate ? inbox.createdAt.toDate() : new Date(inbox.createdAt)
  const now = new Date()
  const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))

  let week, weekNumber, dailyLimit, status, progress

  if (daysSinceCreation < 7) {
    weekNumber = 1
    week = WARMUP_SCHEDULE.week1
    status = 'warming'
    progress = Math.round((daysSinceCreation / 28) * 100)
  } else if (daysSinceCreation < 14) {
    weekNumber = 2
    week = WARMUP_SCHEDULE.week2
    status = 'warming'
    progress = Math.round((daysSinceCreation / 28) * 100)
  } else if (daysSinceCreation < 21) {
    weekNumber = 3
    week = WARMUP_SCHEDULE.week3
    status = 'warming'
    progress = Math.round((daysSinceCreation / 28) * 100)
  } else if (daysSinceCreation < 28) {
    weekNumber = 4
    week = WARMUP_SCHEDULE.week4
    status = 'almost_ready'
    progress = Math.round((daysSinceCreation / 28) * 100)
  } else {
    weekNumber = 5
    status = 'ready'
    progress = 100
    dailyLimit = inbox.dailyLimit || 50
    return {
      enabled: true,
      status,
      progress,
      weekNumber,
      daysSinceCreation,
      dailyLimit,
      message: 'Warm-up termine ! Pleine capacite.'
    }
  }

  // Calculer la limite journaliere en fonction du jour dans la semaine
  const dayInWeek = daysSinceCreation % 7
  const emailsPerDay = week.minEmails + Math.round(((week.maxEmails - week.minEmails) / 6) * dayInWeek)

  return {
    enabled: true,
    status,
    progress,
    weekNumber,
    daysSinceCreation,
    dayInWeek: dayInWeek + 1,
    dailyLimit: emailsPerDay,
    weekDescription: week.description,
    message: `Semaine ${weekNumber}/4 - ${emailsPerDay} emails/jour max`,
    daysRemaining: 28 - daysSinceCreation
  }
}

/**
 * Verifie si une inbox peut envoyer (warm-up + limites)
 */
export function canInboxSend(inbox) {
  const warmupStatus = getWarmupStatus(inbox)
  const currentSent = inbox.sentToday || 0
  const limit = warmupStatus.dailyLimit

  if (currentSent >= limit) {
    return {
      canSend: false,
      reason: 'daily_limit_reached',
      limit,
      sent: currentSent,
      warmupStatus
    }
  }

  return {
    canSend: true,
    remaining: limit - currentSent,
    limit,
    sent: currentSent,
    warmupStatus
  }
}

/**
 * Active le warm-up pour une inbox
 */
export async function enableWarmup(orgId, inboxId) {
  const db = getDb()
  await db.doc(`organizations/${orgId}/inboxes/${inboxId}`).update({
    warmupEnabled: true,
    warmupStartedAt: new Date()
  })
}

/**
 * Desactive le warm-up pour une inbox
 */
export async function disableWarmup(orgId, inboxId) {
  const db = getDb()
  await db.doc(`organizations/${orgId}/inboxes/${inboxId}`).update({
    warmupEnabled: false
  })
}

/**
 * Recupere le statut de warm-up pour toutes les inboxes
 */
export async function getWarmupOverview(orgId) {
  const db = getDb()
  const inboxesSnap = await db.collection(`organizations/${orgId}/inboxes`).get()

  const overview = {
    inboxes: [],
    totalCapacity: 0,
    warmingCount: 0,
    readyCount: 0
  }

  inboxesSnap.docs.forEach(doc => {
    const inbox = { id: doc.id, ...doc.data() }
    const warmupStatus = getWarmupStatus(inbox)

    overview.inboxes.push({
      id: doc.id,
      email: inbox.email,
      ...warmupStatus
    })

    overview.totalCapacity += warmupStatus.dailyLimit
    if (warmupStatus.status === 'warming' || warmupStatus.status === 'almost_ready') {
      overview.warmingCount++
    } else if (warmupStatus.status === 'ready') {
      overview.readyCount++
    }
  })

  return overview
}

/**
 * Genere les recommandations de warm-up
 */
export function getWarmupRecommendations(warmupStatus) {
  const recommendations = []

  if (warmupStatus.status === 'warming') {
    recommendations.push({
      type: 'limit',
      message: `Limitez-vous a ${warmupStatus.dailyLimit} emails/jour cette semaine`,
      priority: 'high'
    })

    if (warmupStatus.weekNumber === 1) {
      recommendations.push({
        type: 'content',
        message: 'Envoyez des emails a vos contacts existants en priorite',
        priority: 'medium'
      })
      recommendations.push({
        type: 'engagement',
        message: 'Encouragez les reponses pour etablir une bonne reputation',
        priority: 'medium'
      })
    }

    if (warmupStatus.weekNumber === 2) {
      recommendations.push({
        type: 'content',
        message: 'Commencez avec quelques cold emails par jour (5 max)',
        priority: 'medium'
      })
    }
  }

  if (warmupStatus.status === 'almost_ready') {
    recommendations.push({
      type: 'patience',
      message: `Plus que ${warmupStatus.daysRemaining} jours avant pleine capacite`,
      priority: 'info'
    })
  }

  if (warmupStatus.status === 'ready') {
    recommendations.push({
      type: 'monitor',
      message: 'Surveillez votre taux de bounce (< 2%) et plaintes (< 0.1%)',
      priority: 'medium'
    })
  }

  return recommendations
}
