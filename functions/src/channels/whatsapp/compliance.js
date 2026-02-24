/**
 * WhatsApp Compliance - RGPD France
 *
 * Regles specifiques WhatsApp:
 * - Opt-in SPECIFIQUE WhatsApp obligatoire (distinct de SMS)
 * - Templates Meta approuves obligatoires hors fenetre 24h
 * - Gestion blocages et signalements
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { recordOptOut } from '../../compliance/unifiedOptManager.js';

const getDb = () => getFirestore();

// ============================================
// MOTS-CLES OPT-OUT WHATSAPP
// ============================================
const OPTOUT_KEYWORDS = [
  'STOP',
  'ARRET',
  'DESABONNER',
  'UNSUBSCRIBE',
  'DESINSCRIRE',
  'NE PLUS RECEVOIR',
  'SE DESINSCRIRE',
  'OPTOUT',
  'OPT-OUT'
];

// ============================================
// VERIFIER COMPLIANCE WHATSAPP
// ============================================
export async function checkWhatsAppCompliance(orgId, prospectId) {
  const checks = {
    passed: true,
    reasons: [],
    details: {},
    warnings: []
  };

  try {
    // 1. Recuperer prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      checks.passed = false;
      checks.reasons.push('prospect_not_found');
      return checks;
    }

    const prospect = prospectSnap.data();

    // 2. Verifier numero de telephone
    if (!prospect.phone && !prospect.mobile) {
      checks.passed = false;
      checks.reasons.push('no_phone');
      return checks;
    }

    // 3. Verifier opt-in SPECIFIQUE WhatsApp
    const channels = prospect.channels || {};
    const waChannel = channels.whatsapp || {};

    // Opt-in WhatsApp doit etre explicite et specifique
    const validOptIns = ['explicit_wa', 'explicit_whatsapp'];
    if (!validOptIns.includes(waChannel.optIn)) {
      checks.passed = false;
      checks.reasons.push('no_whatsapp_specific_opt_in');
      checks.details.currentOptIn = waChannel.optIn;
      checks.details.note = 'Un opt-in SMS ne suffit pas pour WhatsApp en Europe';
    }

    // 4. Verifier non-suppression
    const suppression = prospect.suppression || {};
    if (suppression.global === true) {
      checks.passed = false;
      checks.reasons.push('globally_suppressed');
    }
    if (suppression.byChannel?.whatsapp === true) {
      checks.passed = false;
      checks.reasons.push('whatsapp_suppressed');
    }

    // 5. Verifier disponibilite WhatsApp
    if (waChannel.available === false) {
      checks.passed = false;
      checks.reasons.push('whatsapp_not_available');
    }

    if (waChannel.reachable === false) {
      checks.passed = false;
      checks.reasons.push('whatsapp_not_reachable');
    }

    // 6. Verifier blocage
    if (waChannel.blocked === true) {
      checks.passed = false;
      checks.reasons.push('prospect_blocked_us');
    }

    // 7. Avertissements
    if (!waChannel.reachable && waChannel.reachable !== false) {
      checks.warnings.push('reachability_not_verified');
    }

    return checks;

  } catch (error) {
    console.error('checkWhatsAppCompliance error:', error);
    checks.passed = false;
    checks.reasons.push('error');
    checks.details.error = error.message;
    return checks;
  }
}

// ============================================
// VERIFIER SI MESSAGE EST OPT-OUT
// ============================================
export function isOptOutMessage(message) {
  if (!message) return false;

  const normalized = message.toUpperCase().trim();

  // Correspondance exacte
  if (OPTOUT_KEYWORDS.includes(normalized)) {
    return true;
  }

  // Contient un mot-cle
  for (const keyword of OPTOUT_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return true;
    }
  }

  return false;
}

// ============================================
// TRAITER MESSAGE ENTRANT
// ============================================
export async function processInboundWhatsApp(orgId, prospectId, message, messageId) {
  const result = {
    processed: false,
    isOptOut: false,
    isPositive: false,
    action: null,
    error: null
  };

  try {
    const messageText = typeof message === 'string' ? message : message?.text?.body || '';

    // Verifier opt-out
    if (isOptOutMessage(messageText)) {
      result.isOptOut = true;
      result.action = 'opt_out';

      // Enregistrer l'opt-out
      await recordOptOut(orgId, prospectId, 'whatsapp', 'whatsapp_message');

      // Logger
      await logWhatsAppEvent(orgId, prospectId, 'opt_out', { messageId, text: messageText });

      result.processed = true;
      return result;
    }

    // Verifier reponses positives (boutons rapides)
    const positiveResponses = [
      'oui', 'yes', 'interesse', 'oui, interesse', 'oui, parlons-en',
      'oui, je veux savoir', 'confirme', 'ok', 'd\'accord', 'daccord'
    ];

    const normalizedText = messageText.toLowerCase().trim();
    if (positiveResponses.includes(normalizedText)) {
      result.isPositive = true;
      result.action = 'positive_response';
    } else {
      result.action = 'reply';
    }

    // Logger la reponse
    await logWhatsAppReply(orgId, prospectId, messageText, messageId, result.isPositive);

    result.processed = true;
    return result;

  } catch (error) {
    console.error('processInboundWhatsApp error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// GERER BLOCAGE PAR PROSPECT
// ============================================
export async function handleProspectBlocked(orgId, prospectId) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'channels.whatsapp.blocked': true,
      'channels.whatsapp.blockedAt': FieldValue.serverTimestamp(),
      'suppression.byChannel.whatsapp': true
    });

    await logWhatsAppEvent(orgId, prospectId, 'blocked', {});

    return { success: true };

  } catch (error) {
    console.error('handleProspectBlocked error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// GERER SIGNALEMENT SPAM
// ============================================
export async function handleSpamReport(orgId, prospectId) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'channels.whatsapp.spamReported': true,
      'channels.whatsapp.spamReportedAt': FieldValue.serverTimestamp(),
      'suppression.byChannel.whatsapp': true,
      'suppression.global': true // Signalement spam = suppression globale
    });

    await logWhatsAppEvent(orgId, prospectId, 'spam_reported', {});

    // Alerter l'equipe
    await alertTeam(orgId, 'spam_report', { prospectId });

    return { success: true };

  } catch (error) {
    console.error('handleSpamReport error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VERIFIER QUALITE COMPTE
// ============================================
export async function checkAccountQuality(orgId) {
  const result = {
    healthy: true,
    warnings: [],
    metrics: {}
  };

  try {
    // Recuperer stats recentes
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interactionsRef = getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('channel', '==', 'whatsapp')
      .where('createdAt', '>=', thirtyDaysAgo);

    const snapshot = await interactionsRef.get();

    let sent = 0;
    let delivered = 0;
    let read = 0;
    let blocked = 0;
    let spamReports = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'whatsapp_sent') sent++;
      if (data.status === 'delivered') delivered++;
      if (data.status === 'read') read++;
      if (data.type === 'blocked') blocked++;
      if (data.type === 'spam_reported') spamReports++;
    });

    result.metrics = {
      sent,
      delivered,
      read,
      blocked,
      spamReports,
      deliveryRate: sent > 0 ? (delivered / sent * 100).toFixed(1) : 0,
      readRate: delivered > 0 ? (read / delivered * 100).toFixed(1) : 0,
      blockRate: sent > 0 ? (blocked / sent * 100).toFixed(1) : 0
    };

    // Alertes
    if (spamReports > 0) {
      result.healthy = false;
      result.warnings.push(`${spamReports} signalement(s) spam - risque de restriction compte`);
    }

    if (result.metrics.blockRate > 5) {
      result.healthy = false;
      result.warnings.push(`Taux de blocage eleve (${result.metrics.blockRate}%)`);
    }

    if (result.metrics.deliveryRate < 90 && sent > 10) {
      result.warnings.push(`Taux de livraison faible (${result.metrics.deliveryRate}%)`);
    }

    return result;

  } catch (error) {
    console.error('checkAccountQuality error:', error);
    result.warnings.push('Erreur lors de la verification');
    return result;
  }
}

// ============================================
// LOGGING
// ============================================
async function logWhatsAppEvent(orgId, prospectId, eventType, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: `whatsapp_${eventType}`,
        channel: 'whatsapp',
        prospectId,
        data,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('logWhatsAppEvent error:', error);
  }
}

async function logWhatsAppReply(orgId, prospectId, text, messageId, isPositive) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        type: 'whatsapp_reply',
        channel: 'whatsapp',
        direction: 'in',
        prospectId,
        text,
        messageId,
        isPositive,
        createdAt: FieldValue.serverTimestamp()
      });

    // Mettre a jour le prospect
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        status: isPositive ? 'replied_positive' : 'replied',
        lastReplyAt: FieldValue.serverTimestamp(),
        lastReplyChannel: 'whatsapp'
      });

  } catch (error) {
    console.error('logWhatsAppReply error:', error);
  }
}

async function alertTeam(orgId, alertType, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('alerts').add({
        type: alertType,
        data,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('alertTeam error:', error);
  }
}

export { OPTOUT_KEYWORDS };
