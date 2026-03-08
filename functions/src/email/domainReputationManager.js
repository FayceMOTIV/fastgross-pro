/**
 * Domain Reputation Manager — Intent Hunter
 *
 * Protege la reputation email des clients.
 * Warmup progressif, rotation intelligente, score de sante.
 *
 * Complement de deliverability.js (DNS/SPF/DKIM) et warmup.js (sync externe).
 * Ce module gere la rotation et les limites d'envoi par domaine.
 *
 * Collection Firestore : emailDomains/{clientId_domain}
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// ============================================
// WARMUP SCHEDULE
// ============================================

const WARMUP_LIMITS = {
  1: 20,   // Semaine 1 : max 20/jour
  2: 50,   // Semaine 2 : max 50/jour
  3: 100,  // Semaine 3 : max 100/jour
  4: 200   // Semaine 4+ : max 200/jour (plafond absolu)
}

const HEALTH_THRESHOLDS = {
  PAUSE_BELOW: 70,        // Score < 70 → pause 48h
  WARNING_BELOW: 80,      // Score < 80 → alerte
  BOUNCE_PENALTY: -5,     // Par bounce
  SPAM_PENALTY: -15,      // Par spam report
  DELIVERED_BONUS: 0.5,   // Par email delivre (petite amelioration)
  INITIAL_SCORE: 100,     // Score initial
  MIN_SCORE: 0,
  MAX_SCORE: 100
}

// ============================================
// DOCUMENT ID HELPER
// ============================================

function domainDocId(clientId, domain) {
  return `${clientId}_${domain.toLowerCase().trim()}`
}

// ============================================
// DOMAIN MANAGEMENT
// ============================================

/**
 * Enregistre ou recupere un domaine email pour un client
 * @param {string} clientId
 * @param {string} domain
 * @returns {Promise<Object>} Domain document data
 */
export async function getOrCreateDomain(clientId, domain) {
  const db = getDb()
  const docId = domainDocId(clientId, domain)
  const ref = db.collection('emailDomains').doc(docId)

  const doc = await ref.get()
  if (doc.exists) return { id: docId, ...doc.data() }

  // Creer le domaine avec valeurs par defaut
  const data = {
    clientId,
    domain: domain.toLowerCase().trim(),
    score: HEALTH_THRESHOLDS.INITIAL_SCORE,
    dailySent: 0,
    dailyLimit: WARMUP_LIMITS[1],
    warmupWeek: 1,
    warmupStartedAt: Timestamp.now(),
    isPaused: false,
    pauseUntil: null,
    lastChecked: Timestamp.now(),
    totalSent: 0,
    totalBounces: 0,
    totalSpamReports: 0,
    createdAt: Timestamp.now()
  }

  await ref.set(data)
  return { id: docId, ...data }
}

/**
 * Retourne le domaine le plus sain disponible pour un client
 * @param {string} clientId
 * @returns {Promise<Object|null>} Meilleur domaine ou null si aucun dispo
 */
export async function getAvailableDomain(clientId) {
  const db = getDb()
  const now = Timestamp.now()

  // Recuperer tous les domaines du client
  const snapshot = await db.collection('emailDomains')
    .where('clientId', '==', clientId)
    .orderBy('score', 'desc')
    .get()

  if (snapshot.empty) return null

  for (const doc of snapshot.docs) {
    const data = doc.data()

    // Skip si en pause et pause pas encore expiree
    if (data.isPaused && data.pauseUntil && data.pauseUntil.toMillis() > now.toMillis()) {
      continue
    }

    // Si pause expiree, reactiver
    if (data.isPaused && data.pauseUntil && data.pauseUntil.toMillis() <= now.toMillis()) {
      await doc.ref.update({ isPaused: false, pauseUntil: null })
      data.isPaused = false
    }

    // Verifier la limite journaliere
    const limit = getWarmupLimitInternal(data.warmupWeek)
    if (data.dailySent >= limit) continue

    // Ce domaine est disponible
    return { id: doc.id, ...data, dailyLimit: limit }
  }

  return null
}

/**
 * Calcule la limite d'envoi du jour pour un domaine
 */
function getWarmupLimitInternal(warmupWeek) {
  if (warmupWeek >= 4) return WARMUP_LIMITS[4]
  return WARMUP_LIMITS[warmupWeek] || WARMUP_LIMITS[1]
}

/**
 * Retourne la limite d'envoi du jour pour un domaine client
 * @param {string} domain
 * @param {string} clientId
 * @returns {Promise<number>}
 */
export async function getWarmupLimit(domain, clientId) {
  const domainData = await getOrCreateDomain(clientId, domain)
  return getWarmupLimitInternal(domainData.warmupWeek)
}

// ============================================
// EVENT RECORDING
// ============================================

/**
 * Enregistre un bounce et degrade le score
 * @param {string} domain
 * @param {string} clientId
 */
export async function recordBounce(domain, clientId) {
  const db = getDb()
  const docId = domainDocId(clientId, domain)
  const ref = db.collection('emailDomains').doc(docId)

  const doc = await ref.get()
  if (!doc.exists) return

  const data = doc.data()
  const newScore = Math.max(
    HEALTH_THRESHOLDS.MIN_SCORE,
    data.score + HEALTH_THRESHOLDS.BOUNCE_PENALTY
  )

  const updates = {
    score: newScore,
    totalBounces: FieldValue.increment(1),
    lastChecked: Timestamp.now()
  }

  // Auto-pause si score trop bas
  if (newScore < HEALTH_THRESHOLDS.PAUSE_BELOW) {
    const pauseUntil = new Date()
    pauseUntil.setHours(pauseUntil.getHours() + 48)
    updates.isPaused = true
    updates.pauseUntil = Timestamp.fromDate(pauseUntil)

    console.log(JSON.stringify({
      function: 'domainReputationManager.recordBounce',
      step: 'auto_paused',
      domain,
      clientId,
      score: newScore,
      pauseUntil: pauseUntil.toISOString()
    }))
  }

  await ref.update(updates)
}

/**
 * Enregistre un spam report et degrade fortement le score
 * @param {string} domain
 * @param {string} clientId
 */
export async function recordSpamReport(domain, clientId) {
  const db = getDb()
  const docId = domainDocId(clientId, domain)
  const ref = db.collection('emailDomains').doc(docId)

  const doc = await ref.get()
  if (!doc.exists) return

  const data = doc.data()
  const newScore = Math.max(
    HEALTH_THRESHOLDS.MIN_SCORE,
    data.score + HEALTH_THRESHOLDS.SPAM_PENALTY
  )

  const updates = {
    score: newScore,
    totalSpamReports: FieldValue.increment(1),
    lastChecked: Timestamp.now()
  }

  // Pause immediate si spam report et score deja faible
  if (newScore < HEALTH_THRESHOLDS.PAUSE_BELOW) {
    const pauseUntil = new Date()
    pauseUntil.setHours(pauseUntil.getHours() + 48)
    updates.isPaused = true
    updates.pauseUntil = Timestamp.fromDate(pauseUntil)
  }

  await ref.update(updates)

  console.log(JSON.stringify({
    function: 'domainReputationManager.recordSpamReport',
    step: 'recorded',
    domain,
    clientId,
    newScore
  }))
}

/**
 * Enregistre un email delivre avec succes (ameliore legerement le score)
 * @param {string} domain
 * @param {string} clientId
 */
export async function recordDelivered(domain, clientId) {
  const db = getDb()
  const docId = domainDocId(clientId, domain)
  const ref = db.collection('emailDomains').doc(docId)

  const doc = await ref.get()
  if (!doc.exists) return

  const data = doc.data()
  const newScore = Math.min(
    HEALTH_THRESHOLDS.MAX_SCORE,
    data.score + HEALTH_THRESHOLDS.DELIVERED_BONUS
  )

  await ref.update({
    score: newScore,
    dailySent: FieldValue.increment(1),
    totalSent: FieldValue.increment(1),
    lastChecked: Timestamp.now()
  })
}

// ============================================
// PAUSE / RESUME
// ============================================

/**
 * Met en pause un domaine manuellement
 * @param {string} domain
 * @param {string} clientId
 * @param {number} hours - Duree de la pause en heures (defaut 48)
 */
export async function pauseDomain(domain, clientId, hours = 48) {
  const db = getDb()
  const docId = domainDocId(clientId, domain)

  const pauseUntil = new Date()
  pauseUntil.setHours(pauseUntil.getHours() + hours)

  await db.collection('emailDomains').doc(docId).update({
    isPaused: true,
    pauseUntil: Timestamp.fromDate(pauseUntil)
  })

  console.log(JSON.stringify({
    function: 'domainReputationManager.pauseDomain',
    step: 'paused',
    domain,
    clientId,
    hours,
    pauseUntil: pauseUntil.toISOString()
  }))
}

// ============================================
// WARMUP PROGRESSION
// ============================================

/**
 * Fait progresser la semaine de warmup si applicable
 * A appeler quotidiennement via scheduled function
 * @param {string} clientId
 */
export async function progressWarmup(clientId) {
  const db = getDb()
  const snapshot = await db.collection('emailDomains')
    .where('clientId', '==', clientId)
    .where('warmupWeek', '<', 4)
    .get()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const startedAt = data.warmupStartedAt?.toDate() || data.createdAt?.toDate()
    if (!startedAt) continue

    const daysSinceStart = Math.floor((Date.now() - startedAt.getTime()) / 86_400_000)
    const expectedWeek = Math.min(4, Math.floor(daysSinceStart / 7) + 1)

    if (expectedWeek > data.warmupWeek) {
      await doc.ref.update({
        warmupWeek: expectedWeek,
        dailyLimit: getWarmupLimitInternal(expectedWeek)
      })

      console.log(JSON.stringify({
        function: 'domainReputationManager.progressWarmup',
        step: 'advanced',
        domain: data.domain,
        clientId,
        fromWeek: data.warmupWeek,
        toWeek: expectedWeek,
        newLimit: getWarmupLimitInternal(expectedWeek)
      }))
    }
  }
}

// ============================================
// DAILY RESET
// ============================================

/**
 * Reset les compteurs dailySent a minuit
 * A appeler via scheduled function quotidienne
 */
export async function resetDailySentCounters() {
  const db = getDb()
  const snapshot = await db.collection('emailDomains').get()

  const batch = db.batch()
  let count = 0

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { dailySent: 0 })
    count++

    // Firestore batch limit : 500
    if (count % 450 === 0) {
      await batch.commit()
    }
  }

  if (count % 450 !== 0) {
    await batch.commit()
  }

  console.log(JSON.stringify({
    function: 'domainReputationManager.resetDailySentCounters',
    step: 'completed',
    domainsReset: count
  }))
}

// ============================================
// DASHBOARD / STATUS
// ============================================

/**
 * Retourne le tableau de bord de sante des domaines d'un client
 * @param {string} clientId
 * @returns {Promise<Object>}
 */
export async function getDomainStatus(clientId) {
  const db = getDb()
  const snapshot = await db.collection('emailDomains')
    .where('clientId', '==', clientId)
    .get()

  const domains = snapshot.docs.map(doc => {
    const data = doc.data()
    const limit = getWarmupLimitInternal(data.warmupWeek)
    return {
      domain: data.domain,
      score: data.score,
      status: data.isPaused ? 'paused' : (data.score >= HEALTH_THRESHOLDS.WARNING_BELOW ? 'healthy' : 'warning'),
      dailySent: data.dailySent,
      dailyLimit: limit,
      warmupWeek: data.warmupWeek,
      totalSent: data.totalSent,
      totalBounces: data.totalBounces,
      totalSpamReports: data.totalSpamReports,
      bounceRate: data.totalSent > 0 ? ((data.totalBounces / data.totalSent) * 100).toFixed(2) + '%' : '0%',
      isPaused: data.isPaused,
      pauseUntil: data.pauseUntil?.toDate()?.toISOString() || null
    }
  })

  return {
    clientId,
    totalDomains: domains.length,
    activeDomains: domains.filter(d => !d.isPaused).length,
    domains,
    checkedAt: new Date().toISOString()
  }
}

// ============================================
// SEND DELAY WITH JITTER
// ============================================

/**
 * Calcule le delai d'envoi avec jitter aleatoire
 * Entre 25 et 55 secondes entre chaque email
 * @returns {number} Delai en millisecondes
 */
export function getSendDelay() {
  const minDelay = 25_000  // 25 secondes
  const maxDelay = 55_000  // 55 secondes
  return minDelay + Math.random() * (maxDelay - minDelay)
}

/**
 * Verifie si un domaine peut envoyer un email maintenant
 * @param {string} domain
 * @param {string} clientId
 * @returns {Promise<{ canSend: boolean, reason?: string, delay?: number }>}
 */
export async function canSendEmail(domain, clientId) {
  const domainData = await getOrCreateDomain(clientId, domain)

  if (domainData.isPaused) {
    return { canSend: false, reason: 'domain_paused' }
  }

  const limit = getWarmupLimitInternal(domainData.warmupWeek)
  if (domainData.dailySent >= limit) {
    return { canSend: false, reason: 'daily_limit_reached' }
  }

  if (domainData.score < HEALTH_THRESHOLDS.PAUSE_BELOW) {
    return { canSend: false, reason: 'health_score_too_low' }
  }

  return { canSend: true, delay: getSendDelay() }
}
