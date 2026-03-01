/**
 * Unified Channel Dispatcher v5.0
 *
 * Point d'entree unique pour l'envoi de messages multicanal:
 * - Routage automatique ou manuel vers le bon canal
 * - Compliance et quotas verifies avant envoi
 * - Fallback automatique si canal principal echoue
 * - Logging unifie et analytics
 * - Retry avec backoff exponentiel
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { selectOptimalChannel } from './channelRouter.js';
import { canContactOnChannel, recordTouchpoint } from '../compliance/unifiedOptManager.js';

// Channel senders
import { sendSMS as sendSMSBudget } from '../channels/sms/sender.js';
import { sendSMS as sendSMSOvh } from '../channels/sms/ovhSmsProvider.js';
import { sendWhatsApp } from '../channels/whatsapp/sender.js';
import { sendInstagramDM } from '../channels/instagram/dmSender.js';
import { sendVoicemailDrop } from '../channels/voicemail/dropSender.js';
import { sendLetter, sendPostcard } from '../channels/postal/mailSender.js';
import { sendLetterMF } from '../channels/postal/merciFacteurProvider.js';

const getDb = () => getFirestore();

// ============================================
// CHANNELS REGISTRY
// ============================================
const CHANNEL_REGISTRY = {
  email: {
    name: 'Email',
    costPerUnit: 0.0001,
    maxRetries: 2,
    retryDelayMs: 5000,
  },
  sms: {
    name: 'SMS',
    costPerUnit: 0.0045,
    maxRetries: 1,
    retryDelayMs: 3000,
  },
  whatsapp: {
    name: 'WhatsApp',
    costPerUnit: 0.05,
    maxRetries: 1,
    retryDelayMs: 5000,
  },
  instagram: {
    name: 'Instagram DM',
    costPerUnit: 0,
    maxRetries: 0,
    retryDelayMs: 0,
  },
  voicemail: {
    name: 'Voicemail',
    costPerUnit: 0.15,
    maxRetries: 1,
    retryDelayMs: 10000,
  },
  postal: {
    name: 'Courrier',
    costPerUnit: 1.50,
    maxRetries: 0,
    retryDelayMs: 0,
  },
};

// ============================================
// DISPATCH MESSAGE (Point d'entree principal)
// ============================================
export async function dispatchMessage(orgId, prospectId, messageConfig, options = {}) {
  const startTime = Date.now();
  const result = {
    success: false,
    channel: null,
    channelResponse: null,
    fallbackUsed: null,
    attempts: 0,
    error: null,
    duration: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Determiner le canal
    let channel = messageConfig.channel;

    if (!channel && messageConfig.autoSelectChannel !== false) {
      const routerResult = await selectOptimalChannel(orgId, prospectId, {
        preferredChannels: messageConfig.preferredChannels,
        excludeChannels: messageConfig.excludeChannels,
      });

      if (!routerResult.channel) {
        result.error = `No available channel: ${routerResult.reason}`;
        await logDispatch(orgId, prospectId, result);
        return result;
      }

      channel = routerResult.channel;
    }

    if (!channel) {
      result.error = 'No channel specified and autoSelect disabled';
      return result;
    }

    result.channel = channel;

    // 2. Verifier compliance
    if (!options.skipCompliance) {
      const compliance = await canContactOnChannel(orgId, prospectId, channel);
      if (!compliance.canContact) {
        result.error = `Compliance blocked on ${channel}: ${compliance.reason}`;
        result.complianceDetails = compliance.details;

        // Tenter fallback
        if (messageConfig.fallbackChannels?.length > 0) {
          return await attemptFallback(orgId, prospectId, messageConfig, options, result);
        }

        await logDispatch(orgId, prospectId, result);
        return result;
      }
    }

    // 3. Envoyer
    const channelConfig = CHANNEL_REGISTRY[channel] || { maxRetries: 0, retryDelayMs: 0 };
    const maxRetries = options.maxRetries ?? channelConfig.maxRetries;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      result.attempts++;

      try {
        const sendResult = await sendToChannel(orgId, prospectId, channel, messageConfig, options);

        if (sendResult.success) {
          result.success = true;
          result.channelResponse = sendResult;
          result.duration = Date.now() - startTime;
          await logDispatch(orgId, prospectId, result);
          return result;
        }

        lastError = sendResult.error;
      } catch (err) {
        lastError = err.message;
      }

      // Retry delay avec backoff
      if (attempt < maxRetries) {
        const delay = (options.retryDelayMs || channelConfig.retryDelayMs) * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    result.error = lastError || `All ${result.attempts} attempts failed on ${channel}`;

    // 4. Tenter fallback
    if (messageConfig.fallbackChannels?.length > 0) {
      return await attemptFallback(orgId, prospectId, messageConfig, options, result);
    }

    result.duration = Date.now() - startTime;
    await logDispatch(orgId, prospectId, result);
    return result;

  } catch (error) {
    console.error('dispatchMessage error:', error);
    result.error = error.message;
    result.duration = Date.now() - startTime;
    await logDispatch(orgId, prospectId, result);
    return result;
  }
}

// ============================================
// DISPATCH BATCH
// ============================================
export async function dispatchBatch(orgId, messages, options = {}) {
  const results = {
    total: messages.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  const concurrency = options.concurrency || 1;
  const delayMs = options.delayMs || 1000;

  if (concurrency <= 1) {
    // Sequentiel
    for (const msg of messages) {
      const result = await dispatchMessage(orgId, msg.prospectId, msg, options);

      if (result.success) results.sent++;
      else if (result.error?.includes('Compliance')) results.skipped++;
      else results.failed++;

      results.details.push({ prospectId: msg.prospectId, ...result });

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  } else {
    // Parallele par lots
    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(msg => dispatchMessage(orgId, msg.prospectId, msg, options))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const batchResult = batchResults[j];
        const msg = batch[j];

        if (batchResult.status === 'fulfilled') {
          const result = batchResult.value;
          if (result.success) results.sent++;
          else if (result.error?.includes('Compliance')) results.skipped++;
          else results.failed++;
          results.details.push({ prospectId: msg.prospectId, ...result });
        } else {
          results.failed++;
          results.details.push({
            prospectId: msg.prospectId,
            success: false,
            error: batchResult.reason?.message || 'Unknown batch error',
          });
        }
      }

      if (delayMs > 0 && i + concurrency < messages.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return results;
}

// ============================================
// SEND TO CHANNEL (Routage interne)
// ============================================
async function sendToChannel(orgId, prospectId, channel, messageConfig, options) {
  const content = messageConfig.content || {};

  switch (channel) {
    case 'email':
      return await sendEmail(orgId, prospectId, content, options);

    case 'sms':
      return await sendSMSDispatch(orgId, prospectId, content, options);

    case 'whatsapp':
      return await sendWhatsAppDispatch(orgId, prospectId, content, options);

    case 'instagram':
      return await sendInstagramDispatch(orgId, prospectId, content, options);

    case 'voicemail':
      return await sendVoicemailDispatch(orgId, prospectId, content, options);

    case 'postal':
      return await sendPostalDispatch(orgId, prospectId, content, options);

    default:
      return { success: false, error: `Unknown channel: ${channel}` };
  }
}

// ============================================
// EMAIL DISPATCH
// ============================================
async function sendEmail(orgId, prospectId, content, options) {
  try {
    // Recuperer le prospect pour l'email
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { success: false, error: 'Prospect not found' };
    }

    const prospect = prospectSnap.data();
    const email = prospect.email;

    if (!email) {
      return { success: false, error: 'No email for prospect' };
    }

    // Import dynamique pour eviter les dependances circulaires
    const { sendEmail: sendEmailRouter } = await import('../email/emailRouter.js');

    const text = replaceVariables(content.text || '', prospect, options);
    const html = replaceVariables(content.html || content.text || '', prospect, options);
    const subject = replaceVariables(content.subject || 'Message', prospect, options);

    const result = await sendEmailRouter({
      to: email,
      subject,
      html,
      text,
      from: content.from,
      replyTo: content.replyTo,
      orgId,
      prospectId,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider,
      error: result.error,
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// SMS DISPATCH
// ============================================
async function sendSMSDispatch(orgId, prospectId, content, options) {
  try {
    const provider = options.smsProvider || 'ovh';
    const message = content.text || content.message || '';

    if (provider === 'budgetsms') {
      return await sendSMSBudget(orgId, prospectId, message, {
        sequenceId: options.sequenceId,
        stepId: options.stepId,
        customVariables: content.customVariables,
      });
    }

    // OVH Telecom par defaut
    return await sendSMSOvh(orgId, prospectId, message, {
      sequenceId: options.sequenceId,
      stepId: options.stepId,
      customVariables: content.customVariables,
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// WHATSAPP DISPATCH
// ============================================
async function sendWhatsAppDispatch(orgId, prospectId, content, options) {
  try {
    const messageData = {
      type: content.templateName ? 'template' : 'text',
      text: content.text || content.message,
      templateName: content.templateName,
      templateLanguage: content.templateLanguage || 'fr',
      templateVariables: content.templateVariables,
      buttons: content.buttons,
    };

    return await sendWhatsApp(orgId, prospectId, messageData, {
      sequenceId: options.sequenceId,
      stepId: options.stepId,
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// INSTAGRAM DISPATCH
// ============================================
async function sendInstagramDispatch(orgId, prospectId, content, options) {
  try {
    return await sendInstagramDM(orgId, prospectId, content.text || content.message || '', {
      quickReplies: content.quickReplies,
      mediaUrl: content.mediaUrl,
      sequenceId: options.sequenceId,
      stepId: options.stepId,
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// VOICEMAIL DISPATCH
// ============================================
async function sendVoicemailDispatch(orgId, prospectId, content, options) {
  try {
    return await sendVoicemailDrop(orgId, prospectId, {
      text: content.text,
      scriptId: content.scriptId,
      templateId: content.templateId,
      voiceId: content.voiceId,
      sequenceId: options.sequenceId,
      stepId: options.stepId,
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// POSTAL DISPATCH
// ============================================
async function sendPostalDispatch(orgId, prospectId, content, options) {
  try {
    const provider = options.postalProvider || 'postgrid';
    const mailType = content.type || 'letter';

    if (provider === 'mercifacteur') {
      return await sendLetterMF(orgId, prospectId, {
        pdfUrl: content.pdfUrl,
        pdfBase64: content.pdfBase64,
        templateId: content.templateId,
        mode: content.mode || 'normal',
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      });
    }

    // PostGrid par defaut
    if (mailType === 'postcard') {
      return await sendPostcard(orgId, prospectId, {
        front: content.front || content.html,
        back: content.back,
        templateId: content.templateId,
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      });
    }

    return await sendLetter(orgId, prospectId, {
      html: content.html,
      templateId: content.templateId,
      color: content.color ?? true,
      doubleSided: content.doubleSided ?? false,
      trackingEnabled: content.trackingEnabled ?? true,
      sequenceId: options.sequenceId,
      stepId: options.stepId,
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// FALLBACK LOGIC
// ============================================
async function attemptFallback(orgId, prospectId, messageConfig, options, originalResult) {
  const fallbacks = [...messageConfig.fallbackChannels];

  for (const fallbackChannel of fallbacks) {
    // Ne pas retenter le canal qui a deja echoue
    if (fallbackChannel === originalResult.channel) continue;

    const compliance = await canContactOnChannel(orgId, prospectId, fallbackChannel);
    if (!compliance.canContact) continue;

    const fallbackConfig = { ...messageConfig, channel: fallbackChannel, fallbackChannels: [] };
    const fallbackResult = await dispatchMessage(orgId, prospectId, fallbackConfig, {
      ...options,
      skipCompliance: true,
    });

    if (fallbackResult.success) {
      fallbackResult.fallbackUsed = fallbackChannel;
      fallbackResult.originalChannel = originalResult.channel;
      fallbackResult.originalError = originalResult.error;
      return fallbackResult;
    }
  }

  // Tous les fallbacks ont echoue
  originalResult.duration = Date.now() - (Date.parse(originalResult.timestamp) || Date.now());
  await logDispatch(orgId, prospectId, originalResult);
  return originalResult;
}

// ============================================
// VARIABLE REPLACEMENT
// ============================================
function replaceVariables(text, prospect, options = {}) {
  if (!text) return '';

  const variables = {
    '{prenom}': prospect.firstName || prospect.prenom || '',
    '{nom}': prospect.lastName || prospect.nom || '',
    '{entreprise}': prospect.company || prospect.entreprise || '',
    '{poste}': prospect.position || prospect.poste || '',
    '{ville}': prospect.city || prospect.ville || '',
    '{secteur}': prospect.sector || prospect.secteur || '',
    '{email}': prospect.email || '',
    '{telephone}': prospect.phone || prospect.mobile || '',
    ...(options.customVariables || {}),
  };

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'gi'), value);
  }

  return result.trim();
}

// ============================================
// LOGGING
// ============================================
async function logDispatch(orgId, prospectId, result) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('dispatchLog').add({
        prospectId,
        channel: result.channel,
        success: result.success,
        error: result.error || null,
        fallbackUsed: result.fallbackUsed || null,
        attempts: result.attempts,
        duration: result.duration,
        channelResponse: result.channelResponse ? {
          messageId: result.channelResponse.messageId,
          provider: result.channelResponse.provider,
        } : null,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Mettre a jour analytics journalieres
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = getDb().collection('organizations').doc(orgId)
      .collection('channelAnalytics').doc(today);

    const updates = {
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (result.channel) {
      if (result.success) {
        updates[`dispatch.${result.channel}.sent`] = FieldValue.increment(1);
      } else {
        updates[`dispatch.${result.channel}.failed`] = FieldValue.increment(1);
      }
      updates[`dispatch.${result.channel}.attempts`] = FieldValue.increment(result.attempts);
    }

    if (result.fallbackUsed) {
      updates[`dispatch.fallbacks`] = FieldValue.increment(1);
    }

    await analyticsRef.set(updates, { merge: true });

  } catch (error) {
    console.error('logDispatch error:', error);
  }
}

// ============================================
// GET DISPATCH STATS
// ============================================
export async function getDispatchStats(orgId, days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('dispatchLog')
      .where('createdAt', '>=', startDate)
      .get();

    const stats = {
      total: 0,
      sent: 0,
      failed: 0,
      fallbacksUsed: 0,
      avgDuration: 0,
      byChannel: {},
    };

    let totalDuration = 0;

    logsSnap.forEach(doc => {
      const log = doc.data();
      stats.total++;

      if (log.success) stats.sent++;
      else stats.failed++;

      if (log.fallbackUsed) stats.fallbacksUsed++;
      totalDuration += log.duration || 0;

      // Par canal
      const ch = log.channel || 'unknown';
      if (!stats.byChannel[ch]) {
        stats.byChannel[ch] = { sent: 0, failed: 0, attempts: 0 };
      }
      if (log.success) stats.byChannel[ch].sent++;
      else stats.byChannel[ch].failed++;
      stats.byChannel[ch].attempts += log.attempts || 0;
    });

    stats.avgDuration = stats.total > 0 ? Math.round(totalDuration / stats.total) : 0;
    stats.successRate = stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : '0';

    return stats;

  } catch (error) {
    console.error('getDispatchStats error:', error);
    return { total: 0, sent: 0, failed: 0, byChannel: {} };
  }
}

// ============================================
// GET SUPPORTED CHANNELS
// ============================================
export function getSupportedChannels() {
  return Object.entries(CHANNEL_REGISTRY).map(([id, config]) => ({
    id,
    ...config,
  }));
}

export { CHANNEL_REGISTRY };
