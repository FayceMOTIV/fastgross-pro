/**
 * retryFailedWhatsApp.js
 * Scheduled function: checks WhatsApp messages pending >24h
 * and retries via SMS fallback.
 *
 * Runs every 6 hours.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const RETRY_AFTER_HOURS = 24;
const MAX_RETRIES_PER_RUN = 50;

/**
 * Scan WhatsApp messages stuck in 'pending' or 'sent' (no delivery) for >24h
 * Retry via SMS fallback
 */
export const retryFailedWhatsApp = onSchedule({
  schedule: '0 */6 * * *', // Every 6 hours
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 120,
}, async () => {
  const db = getFirestore();
  const cutoff = new Date(Date.now() - RETRY_AFTER_HOURS * 60 * 60 * 1000);

  logger.info(`[retryFailedWhatsApp] Scanning for WhatsApp messages older than ${RETRY_AFTER_HOURS}h (cutoff: ${cutoff.toISOString()})`);

  // Find stuck WhatsApp messages across all orgs
  const stuckMessages = await db.collectionGroup('interactions')
    .where('channel', '==', 'whatsapp')
    .where('direction', '==', 'out')
    .where('status', 'in', ['pending', 'sent'])
    .where('createdAt', '<=', cutoff)
    .where('smsFallbackSent', '==', false)
    .limit(MAX_RETRIES_PER_RUN)
    .get();

  if (stuckMessages.empty) {
    logger.info('[retryFailedWhatsApp] No stuck WhatsApp messages found');
    return;
  }

  logger.info(`[retryFailedWhatsApp] Found ${stuckMessages.size} stuck WhatsApp messages — scheduling SMS fallback`);

  let retried = 0;
  let errors = 0;

  for (const doc of stuckMessages.docs) {
    try {
      const data = doc.data();
      const phone = data.recipientPhone || data.phone || null;

      if (!phone) {
        logger.warn(`[retryFailedWhatsApp] No phone for ${doc.ref.path} — skipping`);
        continue;
      }

      // Mark as fallback scheduled (prevent double-retry)
      await doc.ref.update({
        smsFallbackSent: true,
        smsFallbackScheduledAt: FieldValue.serverTimestamp(),
        status: 'whatsapp_failed_sms_fallback',
      });

      // Create a new SMS interaction in the same org
      const pathParts = doc.ref.path.split('/');
      const orgId = pathParts[1]; // organizations/{orgId}/interactions/{id}

      await db.collection('organizations').doc(orgId)
        .collection('interactions').add({
          channel: 'sms',
          direction: 'out',
          status: 'pending',
          message: data.message || data.body || '',
          recipientPhone: phone,
          prospectId: data.prospectId || null,
          createdAt: FieldValue.serverTimestamp(),
          source: 'whatsapp_sms_fallback',
          originalWhatsAppRef: doc.ref.path,
        });

      retried++;
    } catch (err) {
      logger.error(`[retryFailedWhatsApp] Error processing ${doc.ref.path}:`, err.message);
      errors++;
    }
  }

  logger.info(`[retryFailedWhatsApp] Complete: ${retried} retried via SMS, ${errors} errors`);
});
