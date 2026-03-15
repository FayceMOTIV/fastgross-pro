/**
 * logAlexActivity.js — Log all Alex activity to Firestore for real-time feed
 *
 * Collection: organizations/{orgId}/alexActivity
 * Types: search, qualify, email_sent, sms_sent, whatsapp_sent, voice_call,
 *        signal_detected, job_change, error, scoring, monitor, mission_parsed,
 *        daily_report, hot_lead, autonomous_action, rescue, reply_sent
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Log an Alex activity event
 *
 * @param {string} orgId - Organization ID
 * @param {Object} activity
 * @param {string} activity.type - Activity type (search, qualify, email_sent, etc.)
 * @param {string} activity.title - Short human-readable title
 * @param {string} [activity.details] - Optional longer description
 * @param {string} [activity.status] - success | error | info
 * @param {string} [activity.prospectId] - Related prospect ID
 * @param {string} [activity.channel] - Channel used (email, sms, whatsapp, etc.)
 * @returns {Promise<void>}
 */
export async function logAlexActivity(orgId, activity) {
  if (!orgId || !activity?.type) return

  try {
    const db = getDb()
    await db.collection(`organizations/${orgId}/alexActivity`).add({
      type: activity.type,
      title: activity.title || activity.type,
      details: activity.details || null,
      status: activity.status || 'success',
      prospectId: activity.prospectId || null,
      channel: activity.channel || null,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    })
  } catch (e) {
    // Non-blocking — never fail the parent operation
    console.warn('[AlexActivity] Log failed:', e.message)
  }
}
