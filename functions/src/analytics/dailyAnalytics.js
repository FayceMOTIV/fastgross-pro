/**
 * Daily Analytics — Aggregates daily stats per org
 * Called after events (send, reply, meeting) or via scheduled cron
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

/**
 * Get today's date key in YYYY-MM-DD format
 */
function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/**
 * Increment a daily analytics counter
 */
async function incrementDailyStat(orgId, field, increment = 1) {
  const db = getDb()
  const dateKey = getDateKey()
  const ref = db.collection('organizations').doc(orgId).collection('analytics').doc(dateKey)

  await ref.set({
    [field]: FieldValue.increment(increment),
    date: dateKey,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

/**
 * Cloud Function: Update daily analytics (callable after each event)
 */
export const updateDailyAnalytics = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, event, channel, source, replyCategory } = data || {}
  if (!orgId || !event) {
    throw new HttpsError('invalid-argument', 'orgId and event are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  try {
    // Base counters
    switch (event) {
      case 'lead_collected':
        await incrementDailyStat(orgId, 'leadsCollected')
        if (source) await incrementDailyStat(orgId, `bySource.${source}`)
        break

      case 'email_sent':
        await incrementDailyStat(orgId, 'emailsSent')
        if (channel) await incrementDailyStat(orgId, `byChannel.${channel}`)
        break

      case 'email_opened':
        await incrementDailyStat(orgId, 'opens')
        break

      case 'email_clicked':
        await incrementDailyStat(orgId, 'clicks')
        break

      case 'reply_received':
        await incrementDailyStat(orgId, 'replies')
        if (replyCategory === 'POSITIVE') await incrementDailyStat(orgId, 'positiveReplies')
        if (replyCategory) await incrementDailyStat(orgId, `byReplyCategory.${replyCategory}`)
        break

      case 'meeting_booked':
        await incrementDailyStat(orgId, 'meetingsBooked')
        break

      default:
        break
    }

    return { success: true }
  } catch (error) {
    throw new HttpsError('internal', `Analytics update failed: ${error.message}`)
  }
})

/**
 * Scheduled: Daily at 23:55 — Snapshot daily totals
 */
export const dailyAnalyticsSnapshot = onSchedule({
  schedule: '55 23 * * *',
  region: 'europe-west1',
  timeZone: 'Europe/Paris',
  timeoutSeconds: 120,
  memory: '256MiB',
}, async () => {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()
  const dateKey = getDateKey()

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id

    try {
      const ref = db.collection('organizations').doc(orgId).collection('analytics').doc(dateKey)
      const existing = await ref.get()

      if (!existing.exists) {
        // Create empty record for the day
        await ref.set({
          date: dateKey,
          leadsCollected: 0,
          emailsSent: 0,
          opens: 0,
          clicks: 0,
          replies: 0,
          positiveReplies: 0,
          meetingsBooked: 0,
          bySource: {},
          byChannel: {},
          byReplyCategory: {},
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      // Compute rates from existing data
      const data = existing.data() || {}
      const emailsSent = data.emailsSent || 0
      const opens = data.opens || 0
      const replies = data.replies || 0

      if (emailsSent > 0) {
        await ref.update({
          openRate: Math.round((opens / emailsSent) * 100 * 10) / 10,
          replyRate: Math.round((replies / emailsSent) * 100 * 10) / 10,
          snapshotAt: FieldValue.serverTimestamp(),
        })
      }

      console.log(JSON.stringify({
        event: 'daily_analytics_snapshot',
        orgId,
        dateKey,
        emailsSent,
        replies,
      }))
    } catch (error) {
      console.error(JSON.stringify({
        event: 'daily_analytics_error',
        orgId,
        error: error.message,
      }))
    }
  }
})
