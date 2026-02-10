/**
 * Cloud Function: resetMonthlyUsage
 * Resets usage counters at the start of each month
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { getCurrentPeriod } from './quotas.js'

const getDb = () => getFirestore()

/**
 * Reset usage counters for all users on the 1st of each month
 * Runs at 00:05 UTC on the 1st of each month
 */
export const resetMonthlyUsage = onSchedule(
  {
    schedule: '5 0 1 * *',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const db = getDb()
    console.log('Starting monthly usage reset')

    const newPeriod = getCurrentPeriod()
    let resetCount = 0

    try {
      // Get all users
      const usersSnap = await db.collection('users').get()

      const batch = db.batch()
      let batchCount = 0

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data()
        const currentPeriod = userData.usage?.period

        // Only reset if the period has changed
        if (currentPeriod !== newPeriod) {
          // Archive previous usage
          if (userData.usage) {
            await db
              .collection('users')
              .doc(userDoc.id)
              .collection('usageHistory')
              .doc(currentPeriod || 'unknown')
              .set({
                ...userData.usage,
                archivedAt: new Date(),
              })
          }

          // Reset usage
          batch.update(userDoc.ref, {
            usage: {
              period: newPeriod,
              emails: 0,
              sms: 0,
              whatsapp: 0,
              scans: 0,
              sequences: 0,
              prospects: 0,
              enrichments: 0,
            },
          })

          resetCount++
          batchCount++

          // Commit in batches of 500
          if (batchCount >= 500) {
            await batch.commit()
            batchCount = 0
          }
        }
      }

      // Commit remaining
      if (batchCount > 0) {
        await batch.commit()
      }

      console.log(`Monthly usage reset complete. Reset ${resetCount} users.`)

      return { success: true, usersReset: resetCount, period: newPeriod }
    } catch (error) {
      console.error('Monthly reset error:', error)
      throw error
    }
  }
)

/**
 * Manual trigger for usage reset (admin only)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'

export const manualResetUsage = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => {
    const db = getDb()
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    // Check if admin (you should implement proper admin check)
    const userDoc = await db.collection('users').doc(request.auth.uid).get()
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin only')
    }

    const { userId } = request.data

    if (userId) {
      // Reset single user
      const newPeriod = getCurrentPeriod()
      await db.collection('users').doc(userId).update({
        usage: {
          period: newPeriod,
          emails: 0,
          sms: 0,
          whatsapp: 0,
          scans: 0,
          sequences: 0,
          prospects: 0,
          enrichments: 0,
        },
      })

      return { success: true, userId, period: newPeriod }
    }

    throw new HttpsError('invalid-argument', 'userId requis')
  }
)
