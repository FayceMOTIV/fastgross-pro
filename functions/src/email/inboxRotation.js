/**
 * Inbox Rotation - Distribution des envois entre plusieurs mailboxes
 * Niveau Instantly : Les pros utilisent plusieurs adresses email
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Recupere la prochaine inbox disponible pour envoi
 * Utilise un algorithme round-robin base sur le volume envoye
 */
export async function getNextSendingInbox(orgId) {
  const db = getDb()

  // Recuperer toutes les inboxes actives et en bonne sante
  const inboxesSnap = await db.collection(`organizations/${orgId}/inboxes`)
    .where('status', '==', 'active')
    .where('health', '>=', 80)
    .get()

  if (inboxesSnap.empty) {
    return { error: 'no_active_inboxes', message: 'Aucune boite email active. Configurez une inbox dans Parametres.' }
  }

  const inboxes = inboxesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  // Trier par nombre d'envois aujourd'hui (celui qui a le moins envoye)
  const sorted = inboxes.sort((a, b) => (a.sentToday || 0) - (b.sentToday || 0))

  // Prendre celui qui a le moins envoye
  const selected = sorted[0]

  // Verifier les limites journalieres
  const dailyLimit = selected.dailyLimit || 50
  if ((selected.sentToday || 0) >= dailyLimit) {
    // Toutes les inboxes ont atteint leur limite
    const allAtLimit = sorted.every(inbox => (inbox.sentToday || 0) >= (inbox.dailyLimit || 50))
    if (allAtLimit) {
      return {
        error: 'all_inboxes_at_limit',
        message: 'Toutes les boites ont atteint leur limite quotidienne.',
        canSendAt: 'tomorrow',
        resetAt: getNextMidnight()
      }
    }

    // Trouver une autre inbox disponible
    const available = sorted.find(inbox => (inbox.sentToday || 0) < (inbox.dailyLimit || 50))
    if (available) {
      return { inbox: available }
    }
  }

  return { inbox: selected }
}

/**
 * Incremente le compteur d'envois pour une inbox
 */
export async function incrementInboxSentCount(orgId, inboxId) {
  const db = getDb()
  const inboxRef = db.doc(`organizations/${orgId}/inboxes/${inboxId}`)

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(inboxRef)
    if (!doc.exists) return

    const data = doc.data()
    transaction.update(inboxRef, {
      sentToday: (data.sentToday || 0) + 1,
      totalSent: (data.totalSent || 0) + 1,
      lastSentAt: new Date()
    })
  })
}

/**
 * Met a jour la sante d'une inbox apres un bounce
 */
export async function updateInboxHealth(orgId, inboxId, event) {
  const db = getDb()
  const inboxRef = db.doc(`organizations/${orgId}/inboxes/${inboxId}`)

  const doc = await inboxRef.get()
  if (!doc.exists) return

  const data = doc.data()
  let health = data.health || 100

  switch (event) {
    case 'bounce':
      health = Math.max(0, health - 5)
      break
    case 'complaint':
      health = Math.max(0, health - 10)
      break
    case 'delivered':
      health = Math.min(100, health + 0.5)
      break
    case 'opened':
      health = Math.min(100, health + 0.2)
      break
  }

  await inboxRef.update({
    health,
    lastHealthUpdate: new Date(),
    [`events.${event}`]: (data.events?.[event] || 0) + 1
  })

  // Desactiver si sante trop basse
  if (health < 50) {
    await inboxRef.update({
      status: 'unhealthy',
      statusReason: 'Sante trop basse - trop de bounces ou plaintes'
    })
  }
}

/**
 * Reset quotidien des compteurs d'envoi
 */
export async function resetDailyInboxCounters(orgId) {
  const db = getDb()
  const inboxesSnap = await db.collection(`organizations/${orgId}/inboxes`).get()

  const batch = db.batch()
  inboxesSnap.docs.forEach(doc => {
    batch.update(doc.ref, { sentToday: 0 })
  })

  await batch.commit()
}

/**
 * Cree une nouvelle inbox pour l'organisation
 */
export async function createInbox(orgId, inboxData) {
  const db = getDb()

  const inbox = {
    email: inboxData.email,
    name: inboxData.name || inboxData.email.split('@')[0],
    domain: inboxData.email.split('@')[1],
    smtpHost: inboxData.smtpHost,
    smtpPort: inboxData.smtpPort || 587,
    smtpUser: inboxData.smtpUser || inboxData.email,
    smtpPass: inboxData.smtpPass, // Devrait etre chiffre en prod
    status: 'pending_verification',
    health: 100,
    dailyLimit: inboxData.dailyLimit || 50,
    sentToday: 0,
    totalSent: 0,
    warmupEnabled: inboxData.warmupEnabled || false,
    warmupDay: 0,
    createdAt: new Date(),
    events: {
      delivered: 0,
      bounced: 0,
      opened: 0,
      complained: 0
    }
  }

  const docRef = await db.collection(`organizations/${orgId}/inboxes`).add(inbox)
  return { id: docRef.id, ...inbox }
}

/**
 * Recupere les stats de toutes les inboxes
 */
export async function getInboxesStats(orgId) {
  const db = getDb()
  const inboxesSnap = await db.collection(`organizations/${orgId}/inboxes`).get()

  const stats = {
    total: inboxesSnap.size,
    active: 0,
    unhealthy: 0,
    totalSentToday: 0,
    totalCapacityToday: 0,
    inboxes: []
  }

  inboxesSnap.docs.forEach(doc => {
    const data = doc.data()
    if (data.status === 'active') stats.active++
    if (data.status === 'unhealthy') stats.unhealthy++
    stats.totalSentToday += data.sentToday || 0
    stats.totalCapacityToday += data.dailyLimit || 50

    stats.inboxes.push({
      id: doc.id,
      email: data.email,
      status: data.status,
      health: data.health,
      sentToday: data.sentToday || 0,
      dailyLimit: data.dailyLimit || 50,
      remaining: (data.dailyLimit || 50) - (data.sentToday || 0)
    })
  })

  stats.remainingCapacity = stats.totalCapacityToday - stats.totalSentToday
  stats.usagePercent = Math.round((stats.totalSentToday / stats.totalCapacityToday) * 100) || 0

  return stats
}

function getNextMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight
}
