/**
 * Migration: Add crmColumn to all prospects
 * Maps legacy status values to new CRM columns
 * Admin-only Cloud Function
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const STATUS_TO_CRM = {
  new: 'NEW',
  contacted: 'CONTACTED',
  opened: 'CONTACTED',
  clicked: 'CONTACTED',
  replied: 'INTERESTED',
  converted: 'SIGNED',
  lost: 'LOST',
  blacklisted: 'LOST',
}

export const migrateCrmColumns = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 540,
  memory: '512MiB',
}, async (request) => {
  const { auth } = request
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  // Check admin
  const adminDoc = await getDb().collection('superAdmins').doc(auth.uid).get()
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Admin access required')
  }

  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  let totalMigrated = 0
  let totalSkipped = 0

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id
    const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')
    const prospectsSnapshot = await prospectsRef.get()

    const batchSize = 400
    let batch = db.batch()
    let batchCount = 0

    for (const prospectDoc of prospectsSnapshot.docs) {
      const data = prospectDoc.data()

      // Skip if already has crmColumn
      if (data.crmColumn) {
        totalSkipped++
        continue
      }

      const crmColumn = STATUS_TO_CRM[data.status] || 'NEW'

      batch.update(prospectDoc.ref, {
        crmColumn,
        agentNotes: data.agentNotes || '',
        agentTurnCount: data.agentTurnCount || 0,
        inboxStatus: data.inboxStatus || 'unread',
        updatedAt: FieldValue.serverTimestamp(),
      })

      batchCount++
      totalMigrated++

      if (batchCount >= batchSize) {
        await batch.commit()
        batch = db.batch()
        batchCount = 0
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit()
    }
  }

  return {
    success: true,
    totalMigrated,
    totalSkipped,
    message: `Migration complete: ${totalMigrated} prospects migres, ${totalSkipped} deja a jour`,
  }
})
