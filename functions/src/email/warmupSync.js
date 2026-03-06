/**
 * Warmup Sync — Scheduler that syncs warmup stats every 4 hours
 * Checks warmup scores and triggers alerts if thresholds exceeded
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Scheduled: Every 4 hours
 * Sync warmup stats from email accounts and check thresholds
 */
export const warmupSync = onSchedule({
  schedule: '0 */4 * * *',
  region: 'europe-west1',
  timeZone: 'Europe/Paris',
  timeoutSeconds: 120,
  memory: '256MiB',
}, async () => {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id
    const orgData = orgDoc.data()

    if (!orgData.channels?.email?.enabled) continue

    try {
      const accountsSnapshot = await db
        .collection('organizations').doc(orgId)
        .collection('emailAccounts')
        .where('status', 'in', ['active', 'warming'])
        .get()

      if (accountsSnapshot.empty) continue

      for (const accountDoc of accountsSnapshot.docs) {
        const account = accountDoc.data()

        // Calculate warmup score from recent stats
        const bounceRate = account.bounceRate || 0
        const spamRate = account.spamRate || 0
        const sentToday = account.sentToday || 0
        const dailyLimit = account.dailyLimit || 100

        // Simple warmup score: penalize high bounce/spam rates
        let warmupScore = 100
        warmupScore -= bounceRate * 10  // -10 per % bounce
        warmupScore -= spamRate * 100   // -100 per % spam
        if (sentToday > dailyLimit * 0.9) warmupScore -= 10 // near limit penalty
        warmupScore = Math.max(0, Math.min(100, Math.round(warmupScore)))

        // Update account with computed score
        await accountDoc.ref.update({
          warmupScore,
          lastSyncAt: FieldValue.serverTimestamp(),
        })

        // Alert: Bounce rate too high
        if (bounceRate > 3) {
          await db.collection('organizations').doc(orgId).collection('notifications').add({
            type: 'email_alert',
            severity: 'high',
            message: `Bounce rate eleve sur ${account.email}: ${bounceRate}%`,
            accountId: accountDoc.id,
            createdAt: FieldValue.serverTimestamp(),
            read: false,
          })
        }

        // Alert: Spam rate critical
        if (spamRate > 0.1) {
          await db.collection('organizations').doc(orgId).collection('notifications').add({
            type: 'email_alert',
            severity: 'critical',
            message: `Spam rate critique sur ${account.email}: ${spamRate}%`,
            accountId: accountDoc.id,
            createdAt: FieldValue.serverTimestamp(),
            read: false,
          })
        }
      }

      console.log(JSON.stringify({
        event: 'warmup_sync_complete',
        orgId,
        accounts: accountsSnapshot.size,
      }))
    } catch (error) {
      console.error(JSON.stringify({
        event: 'warmup_sync_error',
        orgId,
        error: error.message,
      }))
    }
  }
})
