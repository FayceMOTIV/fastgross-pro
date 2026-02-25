/**
 * Channel Monitoring Dashboard v5.0
 *
 * Surveillance en temps reel de tous les canaux:
 * - Sante de chaque canal (provider status, quotas, credits)
 * - Metriques d'envoi (sent, delivered, bounced, failed)
 * - Alertes automatiques (credits bas, taux echec eleve)
 * - Stats historiques pour graphiques
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { checkCredits as checkSMSCredits } from '../channels/sms/ovhSmsProvider.js';

const getDb = () => getFirestore();

// ============================================
// SEUILS D'ALERTE
// ============================================
const ALERT_THRESHOLDS = {
  sms: { minCredits: 50, maxFailRate: 0.15 },
  email: { maxBounceRate: 0.05, maxFailRate: 0.10 },
  whatsapp: { maxFailRate: 0.20 },
  instagram: { maxFailRate: 0.25, dailyLimit: 70 },
  voicemail: { maxFailRate: 0.20 },
  postal: { maxFailRate: 0.10 },
};

// ============================================
// DASHBOARD COMPLET
// ============================================
export async function getChannelDashboard(orgId, days = 7) {
  try {
    const [channelStats, alerts, recentActivity, providerStatus] = await Promise.all([
      getChannelStats(orgId, days),
      getActiveAlerts(orgId),
      getRecentActivity(orgId, 20),
      getProviderStatus(orgId),
    ]);

    return {
      summary: buildSummary(channelStats),
      channels: channelStats,
      alerts,
      recentActivity,
      providerStatus,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('getChannelDashboard error:', error);
    return { error: error.message };
  }
}

// ============================================
// STATS PAR CANAL
// ============================================
async function getChannelStats(orgId, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const interactionsSnap = await getDb().collection('organizations').doc(orgId)
    .collection('interactions')
    .where('direction', '==', 'out')
    .where('createdAt', '>=', startDate)
    .get();

  const channels = {
    email: { sent: 0, delivered: 0, opened: 0, bounced: 0, failed: 0, replied: 0 },
    sms: { sent: 0, delivered: 0, failed: 0, replied: 0 },
    whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0, replied: 0 },
    instagram: { sent: 0, delivered: 0, failed: 0, replied: 0 },
    voicemail: { sent: 0, delivered: 0, callback: 0, failed: 0 },
    postal: { sent: 0, delivered: 0, returned: 0, failed: 0, scanned: 0 },
  };

  interactionsSnap.forEach(doc => {
    const data = doc.data();
    const ch = data.channel;
    if (!channels[ch]) return;

    channels[ch].sent++;

    const status = data.status || '';
    if (status === 'delivered') channels[ch].delivered++;
    if (status === 'opened' && ch === 'email') channels[ch].opened++;
    if (status === 'bounced' && ch === 'email') channels[ch].bounced++;
    if (status === 'read' && ch === 'whatsapp') channels[ch].read++;
    if (status === 'returned' && ch === 'postal') channels[ch].returned++;
    if (status === 'failed' || status === 'error') channels[ch].failed++;
    if (status === 'replied') channels[ch].replied++;
    if (status === 'callback' && ch === 'voicemail') channels[ch].callback++;
    if (status === 'scanned' && ch === 'postal') channels[ch].scanned++;
  });

  // Calculer les taux
  for (const [ch, stats] of Object.entries(channels)) {
    if (stats.sent > 0) {
      stats.deliveryRate = ((stats.delivered / stats.sent) * 100).toFixed(1);
      stats.failRate = ((stats.failed / stats.sent) * 100).toFixed(1);

      if (ch === 'email') {
        stats.openRate = ((stats.opened / stats.sent) * 100).toFixed(1);
        stats.bounceRate = ((stats.bounced / stats.sent) * 100).toFixed(1);
        stats.replyRate = ((stats.replied / stats.sent) * 100).toFixed(1);
      }
      if (ch === 'whatsapp') {
        stats.readRate = ((stats.read / stats.sent) * 100).toFixed(1);
      }
      if (ch === 'postal') {
        stats.returnRate = ((stats.returned / stats.sent) * 100).toFixed(1);
        stats.scanRate = ((stats.scanned / stats.sent) * 100).toFixed(1);
      }
    }
  }

  return channels;
}

// ============================================
// RESUME GLOBAL
// ============================================
function buildSummary(channelStats) {
  let totalSent = 0;
  let totalDelivered = 0;
  let totalFailed = 0;
  let totalReplied = 0;
  let activeChannels = 0;

  for (const stats of Object.values(channelStats)) {
    totalSent += stats.sent;
    totalDelivered += stats.delivered;
    totalFailed += stats.failed;
    totalReplied += stats.replied || 0;
    if (stats.sent > 0) activeChannels++;
  }

  return {
    totalSent,
    totalDelivered,
    totalFailed,
    totalReplied,
    activeChannels,
    globalDeliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0',
    globalFailRate: totalSent > 0 ? ((totalFailed / totalSent) * 100).toFixed(1) : '0',
    globalReplyRate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0',
  };
}

// ============================================
// STATUT PROVIDERS
// ============================================
async function getProviderStatus(orgId) {
  const status = {};

  // SMS (OVH Telecom credits)
  try {
    const smsCredits = await checkSMSCredits(orgId);
    status.sms = {
      provider: 'OVH Telecom',
      configured: smsCredits.configured,
      credits: smsCredits.credits,
      healthy: smsCredits.configured && smsCredits.credits > ALERT_THRESHOLDS.sms.minCredits,
    };
  } catch {
    status.sms = { provider: 'OVH Telecom', configured: false, healthy: false };
  }

  // Email (check SMTP config)
  try {
    const emailConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('email').get();
    const emailConfig = emailConfigSnap.exists ? emailConfigSnap.data() : {};
    status.email = {
      provider: emailConfig.resendApiKey ? 'Resend' : emailConfig.smtpHost ? 'SMTP' : 'Non configure',
      configured: !!(emailConfig.resendApiKey || emailConfig.smtpHost || process.env.SMTP_HOST),
      healthy: !!(emailConfig.resendApiKey || emailConfig.smtpHost || process.env.SMTP_HOST),
    };
  } catch {
    status.email = { provider: 'Unknown', configured: false, healthy: false };
  }

  // WhatsApp (check config)
  try {
    const waConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('whatsapp').get();
    const waConfig = waConfigSnap.exists ? waConfigSnap.data() : {};
    status.whatsapp = {
      provider: 'Meta Cloud API',
      configured: !!(waConfig.accessToken || process.env.WHATSAPP_TOKEN),
      healthy: !!(waConfig.accessToken || process.env.WHATSAPP_TOKEN),
    };
  } catch {
    status.whatsapp = { provider: 'Meta Cloud API', configured: false, healthy: false };
  }

  // Instagram (check config)
  try {
    const igConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('instagram').get();
    const igConfig = igConfigSnap.exists ? igConfigSnap.data() : {};
    status.instagram = {
      provider: 'Meta Graph API',
      configured: !!(igConfig.accessToken || process.env.INSTAGRAM_TOKEN),
      healthy: !!(igConfig.accessToken || process.env.INSTAGRAM_TOKEN),
    };
  } catch {
    status.instagram = { provider: 'Meta Graph API', configured: false, healthy: false };
  }

  // Voicemail (check config)
  try {
    const vmConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('voicemail').get();
    const vmConfig = vmConfigSnap.exists ? vmConfigSnap.data() : {};
    status.voicemail = {
      provider: 'Drop Cowboy',
      configured: !!(vmConfig.apiKey || process.env.DROP_COWBOY_API_KEY),
      healthy: !!(vmConfig.apiKey || process.env.DROP_COWBOY_API_KEY),
    };
  } catch {
    status.voicemail = { provider: 'Drop Cowboy', configured: false, healthy: false };
  }

  // Postal (check both providers)
  try {
    const postalConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('postal').get();
    const mfConfigSnap = await getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('merciFacteur').get();

    const postalConfig = postalConfigSnap.exists ? postalConfigSnap.data() : {};
    const mfConfig = mfConfigSnap.exists ? mfConfigSnap.data() : {};

    const hasPostGrid = !!(postalConfig.apiKey || process.env.POSTGRID_API_KEY);
    const hasMerciFacteur = !!(mfConfig.secretKey || process.env.MERCI_FACTEUR_SECRET_KEY);

    status.postal = {
      provider: hasMerciFacteur ? 'Merci Facteur' : hasPostGrid ? 'PostGrid' : 'Non configure',
      configured: hasPostGrid || hasMerciFacteur,
      healthy: hasPostGrid || hasMerciFacteur,
      postgrid: hasPostGrid,
      merciFacteur: hasMerciFacteur,
    };
  } catch {
    status.postal = { provider: 'Unknown', configured: false, healthy: false };
  }

  return status;
}

// ============================================
// ALERTES
// ============================================
async function getActiveAlerts(orgId) {
  try {
    const alertsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('channelAlerts')
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    return alertsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch {
    return [];
  }
}

export async function checkAndCreateAlerts(orgId) {
  try {
    const [stats, providerStatus] = await Promise.all([
      getChannelStats(orgId, 1),
      getProviderStatus(orgId),
    ]);

    const alerts = [];

    // Verifier credits SMS
    if (providerStatus.sms?.configured && providerStatus.sms.credits < ALERT_THRESHOLDS.sms.minCredits) {
      alerts.push({
        channel: 'sms',
        severity: providerStatus.sms.credits < 10 ? 'critical' : 'warning',
        type: 'low_credits',
        message: `Credits SMS bas: ${providerStatus.sms.credits} restants`,
        resolved: false,
      });
    }

    // Verifier taux d'echec par canal
    for (const [ch, threshold] of Object.entries(ALERT_THRESHOLDS)) {
      const channelStats = stats[ch];
      if (!channelStats || channelStats.sent < 5) continue;

      const failRate = channelStats.failed / channelStats.sent;
      if (failRate > threshold.maxFailRate) {
        alerts.push({
          channel: ch,
          severity: failRate > threshold.maxFailRate * 2 ? 'critical' : 'warning',
          type: 'high_fail_rate',
          message: `Taux d'echec ${ch} eleve: ${(failRate * 100).toFixed(1)}% (seuil: ${(threshold.maxFailRate * 100)}%)`,
          resolved: false,
        });
      }

      // Bounce rate email
      if (ch === 'email' && threshold.maxBounceRate) {
        const bounceRate = channelStats.bounced / channelStats.sent;
        if (bounceRate > threshold.maxBounceRate) {
          alerts.push({
            channel: 'email',
            severity: bounceRate > 0.10 ? 'critical' : 'warning',
            type: 'high_bounce_rate',
            message: `Taux de bounce email eleve: ${(bounceRate * 100).toFixed(1)}%`,
            resolved: false,
          });
        }
      }
    }

    // Sauvegarder les nouvelles alertes
    const batch = getDb().batch();
    for (const alert of alerts) {
      // Verifier si alerte similaire existe deja
      const existingSnap = await getDb().collection('organizations').doc(orgId)
        .collection('channelAlerts')
        .where('channel', '==', alert.channel)
        .where('type', '==', alert.type)
        .where('resolved', '==', false)
        .limit(1)
        .get();

      if (existingSnap.empty) {
        const ref = getDb().collection('organizations').doc(orgId)
          .collection('channelAlerts').doc();
        batch.set(ref, {
          ...alert,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return alerts;

  } catch (error) {
    console.error('checkAndCreateAlerts error:', error);
    return [];
  }
}

// ============================================
// ACTIVITE RECENTE
// ============================================
async function getRecentActivity(orgId, limit = 20) {
  try {
    const dispatchSnap = await getDb().collection('organizations').doc(orgId)
      .collection('dispatchLog')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return dispatchSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        channel: data.channel,
        success: data.success,
        error: data.error,
        prospectId: data.prospectId,
        fallbackUsed: data.fallbackUsed,
        duration: data.duration,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

  } catch {
    return [];
  }
}

// ============================================
// HISTORIQUE POUR GRAPHIQUES
// ============================================
export async function getChannelHistory(orgId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analyticsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('channelAnalytics')
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .orderBy('date', 'asc')
      .get();

    return analyticsSnap.docs.map(doc => ({
      date: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error('getChannelHistory error:', error);
    return [];
  }
}

// ============================================
// RESOLVE ALERT
// ============================================
export async function resolveAlert(orgId, alertId) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('channelAlerts').doc(alertId)
      .update({
        resolved: true,
        resolvedAt: FieldValue.serverTimestamp(),
      });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export { ALERT_THRESHOLDS };
