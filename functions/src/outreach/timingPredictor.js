/**
 * Timing Predictif — Super Pouvoir 10 (Alex V4)
 * Calcul du moment optimal d'envoi par prospect.
 *
 * Dimensions d'analyse :
 *  1. Historique interactions (heures d'ouverture/reponse du prospect)
 *  2. Patterns sectoriels (quand les pros de ce secteur lisent)
 *  3. Jour de la semaine (mardi-jeudi > lundi/vendredi)
 *  4. Canal (email 9h-11h, LinkedIn 7h-8h, SMS 12h-14h)
 *  5. Timezone du prospect
 *
 * Output : { bestDay, bestHour, bestChannel, confidence, reasoning }
 *
 * Storage: organizations/{orgId}/timingModels/{modelId} (apprentissage continu)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Default timing patterns by sector ───────────────────────────────

const SECTOR_PATTERNS = {
  restaurant: { bestDays: [1, 2, 3], bestHours: [10, 11, 14, 15], peakHour: 10, avoidDays: [5, 6, 0] },
  ecommerce: { bestDays: [1, 2, 3, 4], bestHours: [9, 10, 14, 15], peakHour: 9, avoidDays: [0] },
  saas: { bestDays: [1, 2, 3, 4], bestHours: [8, 9, 10, 14], peakHour: 9, avoidDays: [0, 6] },
  artisan: { bestDays: [1, 2, 3, 4], bestHours: [7, 8, 12, 13, 18], peakHour: 7, avoidDays: [0] },
  agence: { bestDays: [1, 2, 3, 4], bestHours: [9, 10, 11, 14, 15], peakHour: 10, avoidDays: [0, 6] },
  immobilier: { bestDays: [1, 2, 3, 4, 5], bestHours: [9, 10, 14, 15, 16], peakHour: 10, avoidDays: [0] },
  medical: { bestDays: [1, 2, 3, 4], bestHours: [12, 13, 18, 19], peakHour: 12, avoidDays: [0, 6] },
  default: { bestDays: [1, 2, 3, 4], bestHours: [9, 10, 11, 14, 15], peakHour: 10, avoidDays: [0, 6] },
}

// ─── Channel timing preferences ─────────────────────────────────────

const CHANNEL_TIMING = {
  email: { peakHours: [9, 10, 14], goodHours: [8, 11, 15, 16], weight: 1.0 },
  linkedin: { peakHours: [7, 8, 17, 18], goodHours: [9, 12, 19], weight: 0.9 },
  sms: { peakHours: [12, 13, 18], goodHours: [10, 14, 19], weight: 0.8 },
  whatsapp: { peakHours: [9, 10, 18, 19], goodHours: [8, 12, 17, 20], weight: 0.85 },
}

// ─── Day names ───────────────────────────────────────────────────────

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAY_SCORES = [0, 70, 95, 100, 90, 60, 20] // Score par jour (0=dim, 6=sam)

// ─── Callable: predict optimal timing ────────────────────────────────

export const predictOptimalTiming = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, channel, sector } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const prediction = await computeOptimalTiming(db, orgId, prospectId, channel, sector)

  return { success: true, ...prediction }
})

// ─── Callable: record timing feedback ────────────────────────────────

export const recordTimingFeedback = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, channel, sentAt, opened, replied, openedAt, repliedAt } = request.data || {}
  if (!orgId || !sentAt) throw new HttpsError('invalid-argument', 'orgId et sentAt requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const sentDate = new Date(sentAt)

  await db.collection(`organizations/${orgId}/timingFeedback`).add({
    prospectId: prospectId || null,
    channel: channel || 'email',
    sentDay: sentDate.getDay(),
    sentHour: sentDate.getHours(),
    opened: opened || false,
    replied: replied || false,
    openDelay: openedAt ? (new Date(openedAt).getTime() - sentDate.getTime()) / 60000 : null, // minutes
    replyDelay: repliedAt ? (new Date(repliedAt).getTime() - sentDate.getTime()) / 60000 : null,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { success: true }
})

// ─── Callable: get timing analytics ──────────────────────────────────

export const getTimingAnalytics = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const snap = await db.collection(`organizations/${orgId}/timingFeedback`)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get()

  const byDay = Array(7).fill(null).map(() => ({ sent: 0, opened: 0, replied: 0 }))
  const byHour = Array(24).fill(null).map(() => ({ sent: 0, opened: 0, replied: 0 }))
  const byChannel = {}

  for (const doc of snap.docs) {
    const d = doc.data()
    const day = d.sentDay ?? 0
    const hour = d.sentHour ?? 0
    const ch = d.channel || 'email'

    byDay[day].sent++
    if (d.opened) byDay[day].opened++
    if (d.replied) byDay[day].replied++

    byHour[hour].sent++
    if (d.opened) byHour[hour].opened++
    if (d.replied) byHour[hour].replied++

    if (!byChannel[ch]) byChannel[ch] = { sent: 0, opened: 0, replied: 0 }
    byChannel[ch].sent++
    if (d.opened) byChannel[ch].opened++
    if (d.replied) byChannel[ch].replied++
  }

  // Compute rates
  const dayAnalytics = byDay.map((d, i) => ({
    day: DAY_NAMES[i],
    ...d,
    openRate: d.sent > 0 ? Math.round((d.opened / d.sent) * 100) : 0,
    replyRate: d.sent > 0 ? Math.round((d.replied / d.sent) * 100) : 0,
  }))

  const hourAnalytics = byHour.map((h, i) => ({
    hour: `${i}h`,
    ...h,
    openRate: h.sent > 0 ? Math.round((h.opened / h.sent) * 100) : 0,
    replyRate: h.sent > 0 ? Math.round((h.replied / h.sent) * 100) : 0,
  }))

  return { dayAnalytics, hourAnalytics, byChannel, totalFeedback: snap.size }
})

// ─── Core: compute optimal timing ───────────────────────────────────

export async function computeOptimalTiming(db, orgId, prospectId, channel, sector) {
  let prospectData = null
  let interactionHistory = []

  // 1. Get prospect data if available
  if (prospectId) {
    const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
    if (pDoc.exists) prospectData = pDoc.data()

    // Get interaction history for this prospect
    const intSnap = await db.collection(`organizations/${orgId}/interactions`)
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    interactionHistory = intSnap.docs.map(d => d.data())
  }

  // 2. Get org-level timing feedback
  const feedbackSnap = await db.collection(`organizations/${orgId}/timingFeedback`)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get()
  const feedbackData = feedbackSnap.docs.map(d => d.data())

  // 3. Determine sector
  const detectedSector = sector || prospectData?.sector || prospectData?.niche || 'default'
  const sectorKey = Object.keys(SECTOR_PATTERNS).find(k => detectedSector.toLowerCase().includes(k)) || 'default'
  const sectorPattern = SECTOR_PATTERNS[sectorKey]

  // 4. Determine channel
  const targetChannel = channel || 'email'
  const channelTiming = CHANNEL_TIMING[targetChannel] || CHANNEL_TIMING.email

  // 5. Compute scores for each day+hour combination
  const candidates = []

  for (let day = 0; day < 7; day++) {
    if (sectorPattern.avoidDays.includes(day)) continue

    for (const hour of [...new Set([...channelTiming.peakHours, ...channelTiming.goodHours, ...sectorPattern.bestHours])]) {
      if (hour < 8 || hour >= 20) continue // Business hours

      let score = 0
      const reasons = []

      // Day score
      score += DAY_SCORES[day] * 0.3
      if (sectorPattern.bestDays.includes(day)) {
        score += 15
        reasons.push(`${DAY_NAMES[day]} est un bon jour pour ${sectorKey}`)
      }

      // Hour score — sector match
      if (sectorPattern.bestHours.includes(hour)) {
        score += 20
        reasons.push(`${hour}h est optimal pour le secteur ${sectorKey}`)
      }

      // Hour score — channel match
      if (channelTiming.peakHours.includes(hour)) {
        score += 25
        reasons.push(`${hour}h est un pic pour ${targetChannel}`)
      } else if (channelTiming.goodHours.includes(hour)) {
        score += 10
      }

      // Prospect interaction history bonus
      if (interactionHistory.length > 0) {
        const sameHourInteractions = interactionHistory.filter(i => {
          const d = i.createdAt?.toDate?.() || new Date(i.createdAt)
          return d.getHours() === hour
        })
        if (sameHourInteractions.length > 0) {
          score += 15
          reasons.push(`Le prospect a deja interagi a ${hour}h`)
        }
      }

      // Org feedback bonus
      if (feedbackData.length > 5) {
        const sameDayHour = feedbackData.filter(f => f.sentDay === day && f.sentHour === hour)
        const opened = sameDayHour.filter(f => f.opened).length
        const total = sameDayHour.length
        if (total > 2) {
          const rate = opened / total
          score += Math.round(rate * 20)
          if (rate > 0.5) reasons.push(`Taux d'ouverture ${Math.round(rate * 100)}% historique a ce creneau`)
        }
      }

      candidates.push({ day, dayName: DAY_NAMES[day], hour, score: Math.round(score), reasons })
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  const best = candidates[0] || { day: 2, dayName: 'Mardi', hour: 10, score: 50, reasons: ['Defaut : mardi 10h'] }
  const confidence = Math.min(100, Math.round((best.score / 100) * 100))

  // Find next occurrence of this day+hour
  const nextSendDate = getNextOccurrence(best.day, best.hour)

  return {
    bestDay: best.dayName,
    bestDayIndex: best.day,
    bestHour: best.hour,
    bestChannel: targetChannel,
    confidence,
    score: best.score,
    reasoning: best.reasons,
    nextSendDate: nextSendDate.toISOString(),
    alternatives: candidates.slice(1, 4).map(c => ({
      day: c.dayName,
      hour: c.hour,
      score: c.score,
    })),
    sectorUsed: sectorKey,
    dataPoints: feedbackData.length,
  }
}

// ─── Helper: get next occurrence of day+hour ─────────────────────────

function getNextOccurrence(targetDay, targetHour) {
  const now = new Date()
  const result = new Date(now)

  // Set target hour
  result.setHours(targetHour, 0, 0, 0)

  // Find next occurrence of target day
  const currentDay = now.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil < 0) daysUntil += 7
  if (daysUntil === 0 && now.getHours() >= targetHour) daysUntil = 7

  result.setDate(result.getDate() + daysUntil)
  return result
}
