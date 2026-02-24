/**
 * Merci Facteur Provider
 * Lettres recommandees et courrier simple via La Poste
 *
 * API: https://www.merci-facteur.com/api/1.2/
 * Features:
 * - Lettre verte, suivi, LRAR, LRARE
 * - Recommande electronique (eIDAS)
 * - PDF content (up to 10 files, 50MB each)
 * - Webhooks for tracking
 * - NPAI (plis non distribues) management
 * - Anti-doublon system
 * - Publipostage (mail merge)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js';

const getDb = () => getFirestore();

// ============================================
// MERCI FACTEUR API CONFIG
// ============================================
const MF_API_BASE = 'https://www.merci-facteur.com/api/1.2';

// Modes d'envoi
export const SEND_MODES = {
  NORMAL: 'normal',       // Lettre verte (~1.16€)
  SUIVI: 'suivi',         // Lettre suivie (~1.50€)
  LRAR: 'lrar',           // Recommande AR (~7.16€)
  LRARE: 'lrare',         // Recommande AR electronique
  ERE_OTP_MAIL: 'ere_otp_mail',  // Recommande electronique OTP email
  ERE_OTP_SMS: 'ere_otp_sms',    // Recommande electronique OTP SMS
};

// Statuts courrier (chronologiques)
export const MAIL_STATUSES = {
  WAIT: 'wait',
  PRINTED: 'imprime',
  TAKEN: 'pris_en_charge',
  WAITING_PRESENTATION: 'attente_presentation',
  DELIVERING: 'distribution_en_cours',
  DELIVERED: 'distribue',
  PROBLEM: 'probleme_en_cours',
  UNDELIVERABLE: 'non_distribuable',
  RETURNED: 'retour_expediteur',
};

// ============================================
// GET / REFRESH TOKEN
// ============================================
let tokenCache = { token: null, expiresAt: 0 };

async function getMerciFacteurConfig(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('merciFacteur');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        secretKey: process.env.MERCI_FACTEUR_SECRET_KEY || '',
        webhookSecret: process.env.MERCI_FACTEUR_WEBHOOK_SECRET || '',
      };
    }

    return configSnap.data();
  } catch (error) {
    console.error('getMerciFacteurConfig error:', error);
    return {
      secretKey: process.env.MERCI_FACTEUR_SECRET_KEY || '',
      webhookSecret: process.env.MERCI_FACTEUR_WEBHOOK_SECRET || '',
    };
  }
}

async function getToken(orgId) {
  // Check cache first
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const config = await getMerciFacteurConfig(orgId);

  if (!config.secretKey) {
    return null;
  }

  // Hash the secret key (SHA-256)
  const hashedKey = createHash('sha256').update(config.secretKey).digest('hex');

  try {
    const response = await fetch(`${MF_API_BASE}/getToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: hashedKey,
        timeLimit: 1, // 24h
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Merci Facteur getToken error:', data.error);
      return null;
    }

    tokenCache = {
      token: data.token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23h (safety margin)
    };

    return data.token;
  } catch (error) {
    console.error('Merci Facteur getToken error:', error);
    return null;
  }
}

// ============================================
// ENVOYER UNE LETTRE (SIMPLE / RECOMMANDEE)
// ============================================
export async function sendLetterMF(orgId, prospectId, options = {}) {
  const result = {
    success: false,
    mailId: null,
    refCourrier: null,
    error: null,
    provider: 'merci_facteur',
    sendMode: null,
    complianceChecks: [],
    cost: null,
  };

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'postal');
    result.complianceChecks = complianceResult.checks;

    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`;
      return result;
    }

    // 2. Recuperer le prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.error = 'Prospect not found';
      return result;
    }

    const prospect = prospectSnap.data();

    // 3. Valider adresse destinataire
    const destAddress = buildDestAddress(prospect);
    if (!destAddress) {
      result.error = 'Invalid or missing address for prospect';
      return result;
    }

    // 4. Recuperer adresse expediteur
    const expAddress = await getSenderAddress(orgId);
    if (!expAddress) {
      result.error = 'Sender address not configured';
      return result;
    }

    // 5. Obtenir token
    const token = await getToken(orgId);

    if (!token) {
      // Mock fallback
      console.warn('Merci Facteur not configured - using mock');
      result.success = true;
      result.mailId = `mf_mock_${Date.now()}`;
      result.mock = true;
      result.sendMode = options.sendMode || SEND_MODES.NORMAL;
      await recordTouchpoint(orgId, prospectId, 'postal');
      await logMFInteraction(orgId, prospectId, {
        type: 'letter_sent',
        mailId: result.mailId,
        sendMode: result.sendMode,
        provider: 'merci_facteur_mock',
        sequenceId: options.sequenceId,
        stepId: options.stepId,
      });
      return result;
    }

    // 6. Preparer le contenu
    const content = buildLetterContent(options);
    if (!content) {
      result.error = 'No content provided (pdfUrl or pdfBase64 required)';
      return result;
    }

    // 7. Mode d'envoi
    const sendMode = options.sendMode || SEND_MODES.NORMAL;
    result.sendMode = sendMode;

    // 8. Anti-doublon
    const antidoublon = options.antidoublon ||
      `${orgId}_${prospectId}_${new Date().toISOString().split('T')[0]}`;

    // 9. Envoyer via Merci Facteur API
    const body = {
      token,
      adress: {
        exp: expAddress,
        dest: [destAddress],
      },
      content,
      mode_envoi: sendMode,
      antidoublon,
    };

    // Options supplementaires
    if (options.dateEnvoi) {
      body.dateEnvoi = options.dateEnvoi; // YYYY-MM-DD
    }
    if (options.gestionNpai) {
      body.gestionNpai = 1;
    }

    const response = await fetch(`${MF_API_BASE}/sendCourrier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      result.error = parseMFError(data.error);
      result.mfErrorCode = data.error.code;
      return result;
    }

    result.success = true;
    result.mailId = data.id_envoi || data.id;
    result.refCourrier = data.ref_courrier;

    // 10. Enregistrer touchpoint
    await recordTouchpoint(orgId, prospectId, 'postal');

    // 11. Logger interaction
    await logMFInteraction(orgId, prospectId, {
      type: 'letter_sent',
      mailId: result.mailId,
      refCourrier: result.refCourrier,
      sendMode,
      provider: 'merci_facteur',
      sequenceId: options.sequenceId,
      stepId: options.stepId,
    });

    return result;
  } catch (error) {
    console.error('sendLetterMF error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENVOYER LETTRE RECOMMANDEE (SHORTCUT)
// ============================================
export async function sendRegisteredLetterMF(orgId, prospectId, options = {}) {
  return sendLetterMF(orgId, prospectId, {
    ...options,
    sendMode: SEND_MODES.LRAR,
    gestionNpai: true,
  });
}

// ============================================
// OBTENIR STATUT COURRIER
// ============================================
export async function getMailStatusMF(orgId, mailId) {
  try {
    const token = await getToken(orgId);
    if (!token) {
      return { error: 'Merci Facteur not configured' };
    }

    const response = await fetch(`${MF_API_BASE}/getCourrier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        id_envoi: mailId,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { error: parseMFError(data.error) };
    }

    return {
      id: data.id_envoi,
      status: data.statut_courrier,
      statusLabel: getStatusLabel(data.statut_courrier),
      sendMode: data.mode_envoi,
      trackingNumber: data.tracking_number,
      sentAt: data.date_envoi,
      printedAt: data.date_impression,
      deliveredAt: data.date_distribution,
      refCourrier: data.ref_courrier,
      proofOfDeposit: data.preuve_depot_url,
      acknowledgmentReceipt: data.are_url,
    };
  } catch (error) {
    console.error('getMailStatusMF error:', error);
    return { error: error.message };
  }
}

// ============================================
// ANNULER COURRIER
// ============================================
export async function cancelMailMF(orgId, mailId) {
  try {
    const token = await getToken(orgId);
    if (!token) {
      return { success: false, error: 'Merci Facteur not configured' };
    }

    const response = await fetch(`${MF_API_BASE}/cancelCourrier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        id_envoi: mailId,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: parseMFError(data.error) };
    }

    return { success: true };
  } catch (error) {
    console.error('cancelMailMF error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// WEBHOOK MERCI FACTEUR
// ============================================
export async function handleMFWebhook(req) {
  try {
    // Verifier signature webhook
    const webhookSecret = process.env.MERCI_FACTEUR_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-mf-webhook-secret-key'];
      if (signature !== webhookSecret) {
        return { status: 401, message: 'Invalid webhook signature' };
      }
    }

    const payload = req.body;
    const event = payload.event;
    const details = payload.detail || [];

    for (const detail of details) {
      const eventName = event?.name_event;
      const mailId = detail.id_envoi;
      const refCourrier = detail.ref_courrier;
      const trackingNumber = detail.tracking_number;

      if (!mailId) continue;

      // Trouver l'interaction correspondante
      const interaction = await findInteractionByMailId(mailId);
      if (!interaction) continue;

      const { orgId, prospectId } = interaction;

      switch (eventName) {
        case 'printed':
          await updateMFStatus(orgId, mailId, MAIL_STATUSES.PRINTED, { trackingNumber });
          break;

        case 'sended':
          await updateMFStatus(orgId, mailId, MAIL_STATUSES.TAKEN, { trackingNumber });
          break;

        case 'delivered':
          await handleMFDelivery(orgId, prospectId, mailId);
          break;

        case 'pnd':
          await handleMFReturn(orgId, prospectId, mailId, detail);
          break;

        case 'are':
          await updateMFStatus(orgId, mailId, 'are_received', {
            areUrl: detail.are_url,
          });
          break;

        case 'pdd':
          await updateMFStatus(orgId, mailId, 'pdd_available', {
            pddUrl: detail.preuve_depot_url,
          });
          break;

        case 'error':
          await updateMFStatus(orgId, mailId, 'error', {
            errorDetail: detail.statut_courrier,
          });
          break;
      }
    }

    return { status: 200, message: 'OK' };
  } catch (error) {
    console.error('handleMFWebhook error:', error);
    return { status: 500, message: error.message };
  }
}

// ============================================
// ESTIMER COUT
// ============================================
export function estimateCostMF(sendMode, pageCount = 1, options = {}) {
  // Tarifs approximatifs TTC (France metropolitaine)
  const baseCosts = {
    [SEND_MODES.NORMAL]: 1.16,
    [SEND_MODES.SUIVI]: 1.50,
    [SEND_MODES.LRAR]: 7.16,
    [SEND_MODES.LRARE]: 7.16,
    [SEND_MODES.ERE_OTP_MAIL]: 3.49,
    [SEND_MODES.ERE_OTP_SMS]: 3.49,
  };

  let cost = baseCosts[sendMode] || baseCosts[SEND_MODES.NORMAL];

  // Pages supplementaires (poids = affranchissement)
  if (pageCount > 2) {
    cost += Math.ceil((pageCount - 2) / 2) * 0.20;
  }

  // Recto-verso reduit le nombre de pages imprimees
  if (options.rectoVerso && pageCount > 1) {
    cost -= Math.floor(pageCount / 4) * 0.10;
  }

  // International
  if (options.international) {
    cost += 1.50;
  }

  return Math.round(cost * 100) / 100;
}

// ============================================
// CONSTRUIRE ADRESSE DESTINATAIRE
// ============================================
function buildDestAddress(prospect) {
  const address = prospect.address;
  if (!address) return null;

  const line1 = address.line1 || address.street;
  const cp = address.postalCode || address.zip;
  const city = address.city;

  if (!line1 || !cp || !city) return null;

  const dest = {
    nom: prospect.lastName || prospect.nom || '',
    prenom: prospect.firstName || prospect.prenom || '',
    adresse1: line1,
    cp,
    ville: city,
    pays: (address.country || 'france').toLowerCase(),
  };

  // Civilite si disponible
  if (prospect.civility || prospect.civilite) {
    dest.civilite = prospect.civility || prospect.civilite;
  }

  // Entreprise
  if (prospect.company || prospect.entreprise) {
    dest.societe = prospect.company || prospect.entreprise;
  }

  // Complement d'adresse
  if (address.line2) {
    dest.adresse2 = address.line2;
  }

  // Pour recommande electronique
  if (prospect.email) {
    dest.email = prospect.email;
  }
  if (prospect.phone || prospect.mobile) {
    dest.telephone = prospect.phone || prospect.mobile;
  }

  return dest;
}

// ============================================
// RECUPERER ADRESSE EXPEDITEUR
// ============================================
async function getSenderAddress(orgId) {
  try {
    const orgRef = getDb().collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) return null;

    const org = orgSnap.data();
    const mfConfig = org.merciFacteurConfig || org.postalConfig || {};

    // Adresse MF pre-enregistree
    if (mfConfig.senderAddressId) {
      return mfConfig.senderAddressId; // ID numerique
    }

    // Construire depuis les donnees org
    const address = org.address || {};
    if (!address.line1 || !address.postalCode || !address.city) {
      return null;
    }

    return {
      societe: org.name || 'Face Media Factory',
      adresse1: address.line1,
      adresse2: address.line2 || '',
      cp: address.postalCode,
      ville: address.city,
      pays: (address.country || 'france').toLowerCase(),
    };
  } catch (error) {
    console.error('getSenderAddress error:', error);
    return null;
  }
}

// ============================================
// CONSTRUIRE CONTENU LETTRE
// ============================================
function buildLetterContent(options) {
  const content = {
    type: 'letter',
  };

  // PDF via URL
  if (options.pdfUrl) {
    content.fichier = [{ url: options.pdfUrl }];
  }
  // PDF en base64
  else if (options.pdfBase64) {
    content.fichier = [{ base64: options.pdfBase64 }];
  }
  // Multiples PDFs
  else if (options.pdfFiles && options.pdfFiles.length > 0) {
    content.fichier = options.pdfFiles.slice(0, 10).map(file => {
      if (file.url) return { url: file.url };
      if (file.base64) return { base64: file.base64 };
      return null;
    }).filter(Boolean);
  }
  else {
    return null;
  }

  // Impression recto/verso
  if (options.impression) {
    content.impression = options.impression; // 'recto', 'rectoverso', 'distinctrectoverso'
  } else {
    content.impression = 'rectoverso'; // Default: recto-verso pour economiser
  }

  return content;
}

// ============================================
// TROUVER INTERACTION PAR MAIL ID
// ============================================
async function findInteractionByMailId(mailId) {
  try {
    const orgsSnap = await getDb().collection('organizations').get();

    for (const orgDoc of orgsSnap.docs) {
      const interSnap = await getDb().collection('organizations').doc(orgDoc.id)
        .collection('interactions')
        .where('mailId', '==', mailId)
        .where('provider', '==', 'merci_facteur')
        .limit(1)
        .get();

      if (!interSnap.empty) {
        const data = interSnap.docs[0].data();
        return {
          orgId: orgDoc.id,
          prospectId: data.prospectId,
          interactionId: interSnap.docs[0].id,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('findInteractionByMailId error:', error);
    return null;
  }
}

// ============================================
// METTRE A JOUR STATUT MF
// ============================================
async function updateMFStatus(orgId, mailId, status, extra = {}) {
  try {
    const interSnap = await getDb().collection('organizations').doc(orgId)
      .collection('interactions')
      .where('mailId', '==', mailId)
      .limit(1)
      .get();

    if (!interSnap.empty) {
      await interSnap.docs[0].ref.update({
        status,
        ...extra,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('updateMFStatus error:', error);
  }
}

// ============================================
// GERER LIVRAISON MF
// ============================================
async function handleMFDelivery(orgId, prospectId, mailId) {
  try {
    await updateMFStatus(orgId, mailId, MAIL_STATUSES.DELIVERED);

    if (prospectId) {
      await getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.postal.lastDelivered': FieldValue.serverTimestamp(),
          'channels.postal.deliveryStatus': 'delivered',
        });
    }
  } catch (error) {
    console.error('handleMFDelivery error:', error);
  }
}

// ============================================
// GERER RETOUR / NPAI MF
// ============================================
async function handleMFReturn(orgId, prospectId, mailId, detail) {
  try {
    await updateMFStatus(orgId, mailId, MAIL_STATUSES.RETURNED, {
      returnReason: detail.statut_courrier || 'pnd',
    });

    if (prospectId) {
      await getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.postal.deliverable': false,
          'channels.postal.deliveryStatus': 'returned',
          'channels.postal.returnReason': detail.statut_courrier || 'NPAI',
        });
    }
  } catch (error) {
    console.error('handleMFReturn error:', error);
  }
}

// ============================================
// LOGGER INTERACTION MF
// ============================================
async function logMFInteraction(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'postal',
        direction: 'out',
        provider: 'merci_facteur',
        createdAt: FieldValue.serverTimestamp(),
      });

    // Mettre a jour le prospect
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.postal.lastSent': FieldValue.serverTimestamp(),
        'channels.postal.lastMailId': data.mailId,
        'channels.postal.lastProvider': 'merci_facteur',
        'channels.postal.totalSent': FieldValue.increment(1),
      });
  } catch (error) {
    console.error('logMFInteraction error:', error);
  }
}

// ============================================
// PARSE ERROR MF
// ============================================
function parseMFError(error) {
  if (typeof error === 'string') return error;

  const errorMessages = {
    'token_invalid': 'Token invalide ou expire',
    'token_expired': 'Token expire',
    'address_invalid': 'Adresse invalide',
    'content_invalid': 'Contenu invalide (PDF requis)',
    'credit_insufficient': 'Credits insuffisants',
    'doublon': 'Courrier doublon detecte (anti-doublon)',
    'file_too_large': 'Fichier trop volumineux (max 50MB)',
    'mode_invalid': 'Mode d\'envoi invalide',
  };

  const code = error.code || error.type || '';
  return errorMessages[code] || error.message || `Merci Facteur error: ${JSON.stringify(error)}`;
}

// ============================================
// STATUS LABEL
// ============================================
function getStatusLabel(status) {
  const labels = {
    [MAIL_STATUSES.WAIT]: 'En attente',
    [MAIL_STATUSES.PRINTED]: 'Imprime',
    [MAIL_STATUSES.TAKEN]: 'Pris en charge par La Poste',
    [MAIL_STATUSES.WAITING_PRESENTATION]: 'En attente de presentation',
    [MAIL_STATUSES.DELIVERING]: 'En cours de distribution',
    [MAIL_STATUSES.DELIVERED]: 'Distribue',
    [MAIL_STATUSES.PROBLEM]: 'Probleme en cours',
    [MAIL_STATUSES.UNDELIVERABLE]: 'Non distribuable',
    [MAIL_STATUSES.RETURNED]: 'Retour expediteur',
  };

  return labels[status] || status;
}
