/**
 * Postal Mail Sender - PostGrid API
 *
 * Envoi courrier postal:
 * - Lettres et cartes postales
 * - International (focus France)
 * - Tracking livraison
 * - ~$0.30-1.50/piece selon type
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { canContactOnChannel, recordTouchpoint } from '../../compliance/unifiedOptManager.js';
import { validateAddress } from './addressValidator.js';
import { generatePostalHTML } from './templateGenerator.js';
import { createTrackingCode, createPURL } from './trackingManager.js';

const getDb = () => getFirestore();

// ============================================
// POSTGRID API CONFIG
// ============================================
const POSTGRID_API_BASE = 'https://api.postgrid.com/print-mail/v1';

// Types de courrier
export const MAIL_TYPES = {
  LETTER: 'letter',
  POSTCARD: 'postcard',
  SELF_MAILER: 'self_mailer',
  CHEQUE: 'cheque'
};

// Tailles disponibles
export const MAIL_SIZES = {
  LETTER: {
    standard: { width: 8.5, height: 11, unit: 'in' },
    legal: { width: 8.5, height: 14, unit: 'in' }
  },
  POSTCARD: {
    '4x6': { width: 4, height: 6, unit: 'in' },
    '6x9': { width: 6, height: 9, unit: 'in' },
    '6x11': { width: 6, height: 11, unit: 'in' }
  }
};

// ============================================
// OBTENIR CONFIG POSTGRID
// ============================================
async function getPostGridConfig(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('postal');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        apiKey: process.env.POSTGRID_API_KEY,
        testMode: process.env.POSTGRID_TEST_MODE === 'true'
      };
    }

    return configSnap.data();
  } catch (error) {
    console.error('getPostGridConfig error:', error);
    return {
      apiKey: process.env.POSTGRID_API_KEY,
      testMode: true
    };
  }
}

// ============================================
// OBTENIR ADRESSE RETOUR ORG
// ============================================
async function getReturnAddress(orgId) {
  try {
    const orgRef = getDb().collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
      return null;
    }

    const org = orgSnap.data();
    return org.postalConfig?.returnAddress || {
      name: org.name,
      line1: org.address?.line1,
      line2: org.address?.line2,
      city: org.address?.city,
      postalCode: org.address?.postalCode,
      country: org.address?.country || 'FR'
    };
  } catch (error) {
    console.error('getReturnAddress error:', error);
    return null;
  }
}

// ============================================
// ENVOYER LETTRE
// ============================================
export async function sendLetter(orgId, prospectId, options = {}) {
  const result = {
    success: false,
    mailId: null,
    error: null,
    complianceChecks: [],
    cost: null
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

    // 3. Valider adresse
    const addressValidation = await validateAddress(orgId, {
      name: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim(),
      company: prospect.company,
      line1: prospect.address?.line1 || prospect.address?.street,
      line2: prospect.address?.line2,
      city: prospect.address?.city,
      state: prospect.address?.state,
      postalCode: prospect.address?.postalCode || prospect.address?.zip,
      country: prospect.address?.country || 'FR'
    });

    if (!addressValidation.valid) {
      result.error = `Invalid address: ${addressValidation.error}`;
      result.details = addressValidation;
      return result;
    }

    // 4. Creer tracking
    const trackingCode = await createTrackingCode(orgId, prospectId, 'letter');
    const purlData = options.includePURL ? await createPURL(orgId, prospectId, options.purlTemplate) : null;

    // 5. Generer le contenu HTML
    let htmlContent;
    if (options.templateId) {
      htmlContent = await generatePostalHTML(orgId, options.templateId, {
        prospect,
        trackingCode,
        purl: purlData?.url,
        qrCode: trackingCode.qrCodeUrl,
        customVariables: options.variables
      });
    } else if (options.htmlContent) {
      htmlContent = options.htmlContent;
    } else {
      result.error = 'No template or HTML content provided';
      return result;
    }

    // 6. Obtenir adresse retour
    const returnAddress = await getReturnAddress(orgId);
    if (!returnAddress || !returnAddress.line1) {
      result.error = 'Return address not configured';
      return result;
    }

    // 7. Envoyer via PostGrid
    const config = await getPostGridConfig(orgId);

    const response = await sendPostGridRequest(config, {
      type: MAIL_TYPES.LETTER,
      to: addressValidation.standardized,
      from: returnAddress,
      html: htmlContent,
      size: options.size || 'standard',
      color: options.color !== false,
      doubleSided: options.doubleSided === true,
      extraService: options.extraService, // 'certified', 'registered', etc.
      metadata: {
        orgId,
        prospectId,
        trackingCode: trackingCode.code,
        sequenceId: options.sequenceId,
        stepId: options.stepId
      }
    });

    if (response.error) {
      result.error = response.error;
      return result;
    }

    result.success = true;
    result.mailId = response.id;
    result.trackingNumber = response.trackingNumber;
    result.expectedDelivery = response.expectedDeliveryDate;
    result.cost = response.price;

    // 8. Enregistrer touchpoint
    await recordTouchpoint(orgId, prospectId, 'postal');

    // 9. Logger interaction
    await logPostalInteraction(orgId, prospectId, {
      type: 'letter_sent',
      mailId: result.mailId,
      mailType: MAIL_TYPES.LETTER,
      trackingCode: trackingCode.code,
      trackingNumber: result.trackingNumber,
      expectedDelivery: result.expectedDelivery,
      cost: result.cost,
      sequenceId: options.sequenceId,
      stepId: options.stepId
    });

    return result;

  } catch (error) {
    console.error('sendLetter error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// ENVOYER CARTE POSTALE
// ============================================
export async function sendPostcard(orgId, prospectId, options = {}) {
  const result = {
    success: false,
    mailId: null,
    error: null,
    cost: null
  };

  try {
    // 1. Verifier compliance
    const complianceResult = await canContactOnChannel(orgId, prospectId, 'postal');
    if (!complianceResult.canContact) {
      result.error = `Compliance failed: ${complianceResult.reason}`;
      return result;
    }

    // 2. Recuperer prospect
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      result.error = 'Prospect not found';
      return result;
    }

    const prospect = prospectSnap.data();

    // 3. Valider adresse
    const addressValidation = await validateAddress(orgId, {
      name: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim(),
      company: prospect.company,
      line1: prospect.address?.line1,
      city: prospect.address?.city,
      postalCode: prospect.address?.postalCode,
      country: prospect.address?.country || 'FR'
    });

    if (!addressValidation.valid) {
      result.error = `Invalid address: ${addressValidation.error}`;
      return result;
    }

    // 4. Creer tracking
    const trackingCode = await createTrackingCode(orgId, prospectId, 'postcard');

    // 5. Obtenir adresse retour
    const returnAddress = await getReturnAddress(orgId);

    // 6. Preparer contenu
    const config = await getPostGridConfig(orgId);

    const response = await sendPostGridRequest(config, {
      type: MAIL_TYPES.POSTCARD,
      to: addressValidation.standardized,
      from: returnAddress,
      frontHtml: options.frontHtml || await generatePostalHTML(orgId, options.templateId, {
        prospect,
        side: 'front',
        qrCode: trackingCode.qrCodeUrl
      }),
      backHtml: options.backHtml || await generatePostalHTML(orgId, options.templateId, {
        prospect,
        side: 'back',
        trackingCode: trackingCode.code
      }),
      size: options.size || '4x6',
      metadata: {
        orgId,
        prospectId,
        trackingCode: trackingCode.code
      }
    });

    if (response.error) {
      result.error = response.error;
      return result;
    }

    result.success = true;
    result.mailId = response.id;
    result.cost = response.price;

    // Enregistrer
    await recordTouchpoint(orgId, prospectId, 'postal');
    await logPostalInteraction(orgId, prospectId, {
      type: 'postcard_sent',
      mailId: result.mailId,
      mailType: MAIL_TYPES.POSTCARD,
      trackingCode: trackingCode.code,
      cost: result.cost
    });

    return result;

  } catch (error) {
    console.error('sendPostcard error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// REQUETE POSTGRID API
// ============================================
async function sendPostGridRequest(config, data) {
  const endpoint = data.type === MAIL_TYPES.POSTCARD
    ? `${POSTGRID_API_BASE}/postcards`
    : `${POSTGRID_API_BASE}/letters`;

  const body = {
    to: data.to,
    from: data.from,
    metadata: data.metadata
  };

  if (data.type === MAIL_TYPES.POSTCARD) {
    body.frontHTML = data.frontHtml;
    body.backHTML = data.backHtml;
    body.size = data.size;
  } else {
    body.html = data.html;
    body.size = data.size;
    body.color = data.color;
    body.doubleSided = data.doubleSided;
    if (data.extraService) {
      body.extraService = data.extraService;
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('PostGrid API error:', responseData);
      return { error: responseData.error?.message || 'PostGrid API error' };
    }

    return {
      id: responseData.id,
      trackingNumber: responseData.trackingNumber,
      expectedDeliveryDate: responseData.expectedDeliveryDate,
      price: responseData.price,
      status: responseData.status
    };

  } catch (error) {
    console.error('sendPostGridRequest error:', error);
    return { error: error.message };
  }
}

// ============================================
// OBTENIR STATUT COURRIER
// ============================================
export async function getMailStatus(orgId, mailId, mailType = 'letter') {
  try {
    const config = await getPostGridConfig(orgId);
    const endpoint = mailType === 'postcard'
      ? `${POSTGRID_API_BASE}/postcards/${mailId}`
      : `${POSTGRID_API_BASE}/letters/${mailId}`;

    const response = await fetch(endpoint, {
      headers: {
        'x-api-key': config.apiKey
      }
    });

    if (!response.ok) {
      return { error: 'Failed to get status' };
    }

    const data = await response.json();

    return {
      id: data.id,
      status: data.status,
      trackingNumber: data.trackingNumber,
      trackingEvents: data.trackingEvents,
      expectedDeliveryDate: data.expectedDeliveryDate,
      deliveredAt: data.deliveredAt
    };

  } catch (error) {
    console.error('getMailStatus error:', error);
    return { error: error.message };
  }
}

// ============================================
// ANNULER COURRIER
// ============================================
export async function cancelMail(orgId, mailId, mailType = 'letter') {
  try {
    const config = await getPostGridConfig(orgId);
    const endpoint = mailType === 'postcard'
      ? `${POSTGRID_API_BASE}/postcards/${mailId}/cancel`
      : `${POSTGRID_API_BASE}/letters/${mailId}/cancel`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Cannot cancel - may already be printed' };
    }

    return { success: true };

  } catch (error) {
    console.error('cancelMail error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LOGGER INTERACTION POSTALE
// ============================================
async function logPostalInteraction(orgId, prospectId, data) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').add({
        ...data,
        prospectId,
        channel: 'postal',
        direction: 'out',
        createdAt: FieldValue.serverTimestamp()
      });

    // Mettre a jour le prospect
    await getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({
        'channels.postal.lastSent': FieldValue.serverTimestamp(),
        'channels.postal.lastMailId': data.mailId,
        'channels.postal.totalSent': FieldValue.increment(1)
      });

  } catch (error) {
    console.error('logPostalInteraction error:', error);
  }
}

// ============================================
// OBTENIR COUT ESTIME
// ============================================
export function estimateCost(mailType, options = {}) {
  // Estimations base (USD, peuvent varier)
  const baseCosts = {
    letter: {
      standard: 1.50,
      certified: 4.50,
      registered: 8.00
    },
    postcard: {
      '4x6': 0.30,
      '6x9': 0.45,
      '6x11': 0.60
    }
  };

  if (mailType === 'postcard') {
    return baseCosts.postcard[options.size] || baseCosts.postcard['4x6'];
  }

  let cost = baseCosts.letter.standard;

  if (options.extraService === 'certified') {
    cost = baseCosts.letter.certified;
  } else if (options.extraService === 'registered') {
    cost = baseCosts.letter.registered;
  }

  if (options.color) cost += 0.10;
  if (options.doubleSided) cost += 0.05;
  if (options.country && options.country !== 'FR') cost += 0.50;

  return cost;
}
