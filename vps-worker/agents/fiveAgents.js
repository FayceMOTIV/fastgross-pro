/**
 * FMF — 5 Agents BullMQ Spécialisés (Pépite #3 — Sales Intelligence Agent Team)
 * Chaque agent tourne indépendamment sur le VPS Hetzner
 *
 * Usage : node vps-worker/startAll.js
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

// ─── CONFIG REDIS ─────────────────────────────────────────────────────────────

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // requis par BullMQ
});

// ─── QUEUES (partagées entre agents) ─────────────────────────────────────────

const createQueues = (orgId) => ({
  email: new Queue(`fmf-email-${orgId}`, { connection }),
  whatsapp: new Queue(`fmf-whatsapp-${orgId}`, { connection }),
  instagram: new Queue(`fmf-instagram-${orgId}`, { connection }),
  linkedin: new Queue(`fmf-linkedin-${orgId}`, { connection }),
  orchestrator: new Queue(`fmf-orchestrator-${orgId}`, { connection }),
});


// ─── EMAIL AGENT ──────────────────────────────────────────────────────────────

function startEmailAgent(orgId) {
  const { GroqService } = require('../services/groqServiceV2');
  const groq = new GroqService();

  const worker = new Worker(`fmf-email-${orgId}`, async (job) => {
    const { prospectId, action, prospect, template } = job.data;

    if (action === 'sendEmail') {
      const message = await groq.generateMessage({ prospect, channel: 'email', template });
      // TODO: Wire up with actual email sender (SES/Instantly)
      console.log(`[EMAIL] Generated message for ${prospect.name}: ${message.subject}`);
      return { sent: true, prospectId, subject: message.subject };
    }

    if (action === 'sendFollowUp') {
      const followUpMsg = await groq.generateFollowUp({ prospect, followUpNumber: job.data.followUpNumber });
      console.log(`[EMAIL] Generated follow-up for ${prospect.name}: ${followUpMsg.subject}`);
      return { sent: true, subject: followUpMsg.subject };
    }

  }, {
    connection,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }, // 1min, 5min, 25min
    },
  });

  worker.on('completed', (job, result) => console.log(`[EMAIL] Job ${job.id} completed`, result));
  worker.on('failed', (job, err) => console.error(`[EMAIL] Job ${job.id} failed`, err.message));

  console.log(`[EMAIL AGENT] Started for org ${orgId}`);
  return worker;
}


// ─── WHATSAPP AGENT ───────────────────────────────────────────────────────────

function startWhatsAppAgent(orgId) {
  const { evolutionAutomate, evolutionObserve } = require('../services/evolutionAgentSuite');
  const { GroqService } = require('../services/groqServiceV2');
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const groq = new GroqService();

  // Rate limiter : 1 message par random(3-7)s
  let lastSentAt = 0;
  const DAILY_MAX = 60;

  const worker = new Worker(`fmf-whatsapp-${orgId}`, async (job) => {
    const { prospect, instanceName, template, action } = job.data;

    // Vérifier limite quotidienne
    const limit = await evolutionAutomate.checkDailyLimit(db, orgId, instanceName, DAILY_MAX);
    if (!limit.canSend) {
      // Reporter le job à demain 9h
      const tomorrow9h = new Date();
      tomorrow9h.setDate(tomorrow9h.getDate() + 1);
      tomorrow9h.setHours(9, 0, 0, 0);
      await job.moveToDelayed(tomorrow9h.getTime());
      return { deferred: true, reason: 'daily_limit_reached' };
    }

    // Délai humain depuis le dernier envoi (minimum 3s)
    const timeSinceLast = Date.now() - lastSentAt;
    if (timeSinceLast < 3000) {
      await new Promise(r => setTimeout(r, 3000 - timeSinceLast));
    }

    if (action === 'sendDM') {
      const message = await groq.generateMessage({ prospect, channel: 'whatsapp', template });
      const humanMsg = evolutionAutomate.buildHumanizedMessage(message.message, prospect);

      const result = await evolutionAutomate.sendWithRetry(instanceName, prospect.phone, humanMsg);
      lastSentAt = Date.now();

      if (result.success) {
        await evolutionAutomate.incrementDailyCount(db, orgId, instanceName);
        // Update Firestore engagement
        await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
          'engagement.whatsappSentAt': new Date().toISOString(),
          'engagement.touchpoints': admin.firestore.FieldValue.increment(1),
        });
      }

      // Vérifier risque ban après envoi
      await evolutionObserve.alertIfUnhealthy(db, orgId, instanceName, 80);

      return { sent: result.success, messageId: result.messageId };
    }

  }, {
    connection,
    concurrency: 1, // UN seul message à la fois (critique anti-ban)
    limiter: { max: 1, duration: 4000 }, // max 1 job / 4s via BullMQ
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 300000 }, // retry après 5min
    },
  });

  worker.on('failed', (job, err) => console.error(`[WHATSAPP] Job ${job.id} failed`, err.message));

  console.log(`[WHATSAPP AGENT] Started for org ${orgId}`);
  return worker;
}


// ─── INSTAGRAM AGENT ──────────────────────────────────────────────────────────

function startInstagramAgent(orgId) {
  const { BrowserAgent } = require('./browserAgent');
  const { GroqService } = require('../services/groqServiceV2');
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const groq = new GroqService();

  const worker = new Worker(`fmf-instagram-${orgId}`, async (job) => {
    const { prospect, accountId, action, template } = job.data;

    if (action === 'warmup_follow') {
      // J-3 : Follow le compte avant DM (warmup)
      await BrowserAgent.followUser(prospect.instagram, accountId);
      return { action: 'followed', username: prospect.instagram };
    }

    if (action === 'warmup_likes') {
      // J-2 : Liker 2-3 posts récents
      await BrowserAgent.likeRecentPosts(prospect.instagram, accountId, 3);
      return { action: 'liked', username: prospect.instagram };
    }

    if (action === 'sendDM') {
      // J0 : Envoyer DM après warmup
      const message = await groq.generateMessage({ prospect, channel: 'instagram', template });

      // Utiliser browser agent pour DM
      const result = await BrowserAgent.sendDM(prospect.instagram, message.message, accountId);
      if (result.success) {
        await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
          'engagement.instagramDMedAt': new Date().toISOString(),
          'engagement.touchpoints': admin.firestore.FieldValue.increment(1),
        });
      }
      return { sent: result.success, via: 'browser' };
    }

    if (action === 'replyStory') {
      // Répondre à une story du prospect (très fort engagement)
      const result = await BrowserAgent.replyToStory(
        prospect.instagram,
        job.data.storyId,
        job.data.storyReply,
        accountId
      );
      return { replied: result.success };
    }

  }, {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 10000 }, // 1 action / 10s
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 600000 }, // retry après 10min
    },
  });

  worker.on('failed', (job, err) => console.error(`[INSTAGRAM] Job ${job.id} failed`, err.message));

  console.log(`[INSTAGRAM AGENT] Started for org ${orgId}`);
  return worker;
}


// ─── LINKEDIN AGENT ───────────────────────────────────────────────────────────

function startLinkedInAgent(orgId) {
  const { GroqService } = require('../services/groqServiceV2');
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const groq = new GroqService();

  const worker = new Worker(`fmf-linkedin-${orgId}`, async (job) => {
    const { prospect, accountId, action, template } = job.data;

    if (action === 'visitProfile') {
      // TODO: Wire up with LinkedIn API (HeyReach/Unipile)
      console.log(`[LINKEDIN] Visit profile: ${prospect.linkedin}`);
      await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
        'engagement.linkedinVisitedAt': new Date().toISOString(),
      });
      return { action: 'visited' };
    }

    if (action === 'sendConnectionRequest') {
      const note = await groq.generateConnectionNote({ prospect });
      console.log(`[LINKEDIN] Connection request to ${prospect.linkedin}: ${note.message}`);
      await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
        'engagement.linkedinConnectSentAt': new Date().toISOString(),
      });
      return { sent: true, note: note.message };
    }

    if (action === 'sendMessage') {
      const message = await groq.generateMessage({ prospect, channel: 'linkedin', template });
      console.log(`[LINKEDIN] Message to ${prospect.linkedin}: ${message.message.substring(0, 100)}...`);
      await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
        'engagement.linkedinMessagedAt': new Date().toISOString(),
      });
      return { sent: true };
    }

  }, {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 90000 }, // 1 action / 90s (limite LinkedIn stricte)
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1800000 }, // retry après 30min
    },
  });

  worker.on('failed', (job, err) => console.error(`[LINKEDIN] Job ${job.id} failed`, err.message));

  console.log(`[LINKEDIN AGENT] Started for org ${orgId}`);
  return worker;
}


// ─── ORCHESTRATOR AGENT ───────────────────────────────────────────────────────

function startOrchestratorAgent(orgId) {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  const queues = createQueues(orgId);

  const { getNextAction } = require('./orchestratorEngine');

  const worker = new Worker(`fmf-orchestrator-${orgId}`, async (job) => {
    const { prospectId, trigger } = job.data;

    // Charger le prospect depuis Firestore
    const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get();
    if (!prospectDoc.exists) return { skipped: true, reason: 'prospect_not_found' };

    const prospect = { id: prospectId, ...prospectDoc.data() };

    // Décider la prochaine action basée sur l'engagement
    const nextAction = await getNextAction(prospect);

    if (!nextAction) return { skipped: true, reason: 'no_action_needed' };

    // Charger config org (instances, templates, etc.)
    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const orgConfig = orgDoc.data();

    // Pousser dans la bonne queue d'agent
    const priority = prospect.score > 80 ? 10 : prospect.score > 60 ? 5 : 1;

    const jobPayload = {
      prospectId,
      prospect: { ...prospect, _clientName: orgConfig.name, _clientEmail: orgConfig.email },
      action: nextAction.action,
      template: orgConfig.templates?.[nextAction.channel],
      instanceName: orgConfig.waInstances?.[0], // WA instance
      accountId: orgConfig.socialAccounts?.[nextAction.channel],
      followUpNumber: prospect.engagement?.touchpoints || 0,
    };

    const jobId = `${orgId}-${prospectId}-${nextAction.action}-${Date.now()}`;

    await queues[nextAction.channel].add(nextAction.action, jobPayload, {
      priority,
      jobId,
      delay: nextAction.delay || 0,
    });

    // Mettre à jour l'état du prospect
    await db.doc(`organizations/${orgId}/prospects/${prospectId}`).update({
      'engagement.lastTouchAt': new Date().toISOString(),
      'engagement.activeChannel': nextAction.channel,
      'engagement.nextAction': nextAction.action,
      'engagement.nextActionAt': new Date(Date.now() + (nextAction.delay || 0)).toISOString(),
    });

    return { dispatched: true, channel: nextAction.channel, action: nextAction.action };

  }, {
    connection,
    concurrency: 10, // L'orchestrateur peut traiter plusieurs prospects en parallèle
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  // Cron : scanner tous les prospects actifs toutes les 30min
  const cronQueue = new Queue(`fmf-orchestrator-${orgId}`, { connection });
  const scanAllProspects = async () => {
    const prospectsSnap = await db.collection(`organizations/${orgId}/prospects`)
      .where('status', 'in', ['qualified', 'in_sequence'])
      .where('engagement.lastTouchAt', '<', new Date(Date.now() - 3600000).toISOString()) // > 1h depuis dernier touch
      .limit(100)
      .get();

    for (const doc of prospectsSnap.docs) {
      await cronQueue.add('scan', { prospectId: doc.id, trigger: 'cron' }, {
        jobId: `scan-${doc.id}-${Date.now()}`,
        priority: 1,
      });
    }

    console.log(`[ORCHESTRATOR] Scanned ${prospectsSnap.size} prospects for org ${orgId}`);
  };

  // Démarrer le cron scan toutes les 30 minutes
  setInterval(scanAllProspects, 30 * 60 * 1000);
  scanAllProspects(); // Scan immédiat au démarrage

  worker.on('failed', (job, err) => console.error(`[ORCHESTRATOR] Job ${job.id} failed`, err.message));

  console.log(`[ORCHESTRATOR AGENT] Started for org ${orgId} (cron: 30min)`);
  return worker;
}


// ─── START ALL ────────────────────────────────────────────────────────────────

async function startAllAgents(orgIds) {
  console.log(`[FMF AGENTS] Starting agents for ${orgIds.length} organizations...`);

  for (const orgId of orgIds) {
    startEmailAgent(orgId);
    startWhatsAppAgent(orgId);
    startInstagramAgent(orgId);
    startLinkedInAgent(orgId);
    startOrchestratorAgent(orgId);
  }

  console.log('[FMF AGENTS] All agents started');
}

module.exports = {
  createQueues,
  startEmailAgent,
  startWhatsAppAgent,
  startInstagramAgent,
  startLinkedInAgent,
  startOrchestratorAgent,
  startAllAgents,
};
