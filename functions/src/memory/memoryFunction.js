/**
 * memoryFunction.js
 * Cloud Functions pour le systeme de memoire Alex.
 *
 * - consolidateAlexMemory : scheduler nocturne (2h Paris)
 * - forceConsolidateNiche : callable admin
 * - onConversationEnd : trigger Firestore
 * - getAlexMemoryStats : callable dashboard
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  extractAndConsolidate,
  saveEpisodicMemory,
  buildAlexMemoryContext,
  detectResponseTags
} from './alexMemoryEngine.js';

/**
 * Consolidation nocturne : episodique -> semantique
 * Tourne chaque nuit a 2h du matin (Paris)
 */
export const consolidateAlexMemory = onSchedule({
  schedule: '0 2 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  const db = getFirestore();
  logger.info('Starting nightly Alex memory consolidation...');

  // Trouver toutes les niches avec des episodes non traites
  const unprocessed = await db.collection('alexEpisodicMemory')
    .where('processedForSemantic', '==', false)
    .select('leadNaf', 'leadZone')
    .limit(500)
    .get();

  if (unprocessed.empty) {
    logger.info('No unprocessed memories — skipping consolidation');
    return;
  }

  // Grouper par niche+zone
  const nicheZones = new Map();
  for (const doc of unprocessed.docs) {
    const data = doc.data();
    const key = `${data.leadNaf}_${data.leadZone}`;
    if (!nicheZones.has(key)) {
      nicheZones.set(key, { nafCode: data.leadNaf, zone: data.leadZone });
    }
  }

  logger.info(`Consolidating ${nicheZones.size} niche+zone combinations (${unprocessed.size} episodes)`);

  let processed = 0;
  let errors = 0;
  for (const { nafCode, zone } of nicheZones.values()) {
    try {
      await extractAndConsolidate(nafCode, zone);
      processed++;
      await new Promise(r => setTimeout(r, 1500)); // rate limiting Groq
    } catch (e) {
      logger.error(`Consolidation failed for ${nafCode}_${zone}:`, e.message);
      errors++;
    }
  }

  logger.info(`Memory consolidation complete: ${processed}/${nicheZones.size} niches updated, ${errors} errors`);
});

/**
 * Forcer la consolidation d'une niche (debug / admin)
 */
export const forceConsolidateNiche = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  if (!request.auth) throw new Error('Non authentifie');
  const { nafCode, zone } = request.data;
  if (!nafCode || !zone) throw new Error('nafCode et zone requis');

  const result = await extractAndConsolidate(nafCode, zone);
  return { success: true, result };
});

/**
 * Trigger automatique : quand une interaction se termine,
 * extraire les events et sauvegarder en memoire episodique.
 */
export const onInteractionCreated = onDocumentCreated({
  document: 'organizations/{orgId}/interactions/{interactionId}',
  region: 'europe-west1'
}, async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { prospectId, channel, message, response, leadNaf, leadZone, orgId } = data;

  // Sauvegarder le message envoye
  if (message) {
    const tags = response ? detectResponseTags(response) : ['no_response'];
    await saveEpisodicMemory({
      clientId: event.params.orgId,
      sessionId: prospectId || event.params.interactionId,
      leadNaf: leadNaf || '',
      leadZone: leadZone || '',
      event: response ? 'response_received' : 'message_sent',
      messageContent: message,
      messageChannel: channel || 'unknown',
      responseReceived: !!response,
      responseDelayMin: data.responseDelayMin || null,
      score: data.score || 5,
      tags
    });
  }
});

/**
 * Obtenir le contexte memoire pour une niche (debug / preview)
 */
export const getAlexMemoryContext = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { nafCode, zone, channel } = request.data;
  if (!nafCode || !zone) throw new Error('nafCode et zone requis');

  const context = await buildAlexMemoryContext(nafCode, zone, channel || 'whatsapp');
  return { success: true, context, length: context.length };
});

/**
 * Statistiques globales memoire Alex
 */
export const getAlexMemoryStats = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const db = getFirestore();

  const [episodic, semantic, procedural] = await Promise.all([
    db.collection('alexEpisodicMemory').count().get(),
    db.collection('alexSemanticMemory').count().get(),
    db.collection('alexProceduralMemory').count().get()
  ]);

  // Top niches par sampleSize
  const topNiches = await db.collection('alexSemanticMemory')
    .orderBy('sampleSize', 'desc')
    .limit(10)
    .get();

  return {
    success: true,
    stats: {
      totalEpisodes: episodic.data().count,
      totalNiches: semantic.data().count,
      totalRuleSets: procedural.data().count,
      topNiches: topNiches.docs.map(d => ({
        id: d.id,
        nafCode: d.data().nafCode,
        zone: d.data().zone,
        secteur: d.data().secteur,
        sampleSize: d.data().sampleSize,
        lastUpdated: d.data().lastUpdated
      }))
    }
  };
});
