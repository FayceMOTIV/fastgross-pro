/**
 * Postal Tracking Manager
 *
 * Tracking offline-to-online:
 * - QR codes uniques
 * - PURLs personnalisees
 * - Tracking livraison PostGrid
 * - Attribution conversions
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const getDb = () => getFirestore();

// ============================================
// CONFIG
// ============================================
const QR_CODE_API = 'https://api.qrserver.com/v1/create-qr-code';
const PURL_BASE_URL = process.env.PURL_BASE_URL || 'https://facemediafactory.com/go';

// ============================================
// CREER CODE TRACKING
// ============================================
export async function createTrackingCode(orgId, prospectId, mailType) {
  try {
    // Generer code unique
    const code = generateUniqueCode();

    // URL de redirection
    const trackingUrl = `${PURL_BASE_URL}/${code}`;

    // Generer QR code
    const qrCodeUrl = `${QR_CODE_API}/?size=200x200&format=png&data=${encodeURIComponent(trackingUrl)}`;

    // Sauvegarder
    const ref = await db.collection('organizations').doc(orgId)
      .collection('postalTracking').add({
        code,
        prospectId,
        mailType,
        trackingUrl,
        qrCodeUrl,
        status: 'created',
        scans: [],
        createdAt: FieldValue.serverTimestamp()
      });

    return {
      id: ref.id,
      code,
      trackingUrl,
      qrCodeUrl
    };

  } catch (error) {
    console.error('createTrackingCode error:', error);
    return {
      code: generateUniqueCode(),
      qrCodeUrl: `${QR_CODE_API}/?size=200x200&data=error`,
      trackingUrl: PURL_BASE_URL
    };
  }
}

// ============================================
// CREER PURL PERSONNALISEE
// ============================================
export async function createPURL(orgId, prospectId, template = 'default') {
  try {
    // Recuperer prospect pour personnalisation
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    let slug;
    if (prospectSnap.exists) {
      const prospect = prospectSnap.data();
      // Creer slug personnalise
      const firstName = (prospect.firstName || '').toLowerCase().replace(/[^a-z]/g, '');
      const company = (prospect.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
      slug = `${firstName}-${company}-${generateShortCode()}`;
    } else {
      slug = generateUniqueCode();
    }

    const purlUrl = `${PURL_BASE_URL}/${slug}`;

    // Determiner destination selon template
    let destinationUrl;
    switch (template) {
      case 'calendly':
        destinationUrl = await getOrgCalendlyUrl(orgId);
        break;
      case 'landing':
        destinationUrl = await getOrgLandingUrl(orgId);
        break;
      case 'offer':
        destinationUrl = await getOrgOfferUrl(orgId);
        break;
      default:
        destinationUrl = await getOrgDefaultUrl(orgId);
    }

    // Ajouter UTM parameters
    const utmParams = new URLSearchParams({
      utm_source: 'postal',
      utm_medium: 'direct_mail',
      utm_campaign: `purl_${template}`,
      utm_content: prospectId
    });
    destinationUrl = `${destinationUrl}${destinationUrl.includes('?') ? '&' : '?'}${utmParams}`;

    // Sauvegarder
    const ref = await db.collection('organizations').doc(orgId)
      .collection('postalPURLs').add({
        slug,
        prospectId,
        template,
        purlUrl,
        destinationUrl,
        visits: [],
        conversions: [],
        createdAt: FieldValue.serverTimestamp()
      });

    return {
      id: ref.id,
      slug,
      url: purlUrl,
      destinationUrl
    };

  } catch (error) {
    console.error('createPURL error:', error);
    return {
      slug: generateUniqueCode(),
      url: PURL_BASE_URL
    };
  }
}

// ============================================
// WEBHOOK TRACKING QR/PURL
// ============================================
export const postalTrackingWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      const code = req.params[0] || req.query.code || req.path.split('/').pop();

      if (!code) {
        return res.status(400).send('Missing tracking code');
      }

      // Chercher dans tous les orgs (tracking global)
      const trackingResult = await findTrackingByCode(code);

      if (!trackingResult) {
        // Fallback URL
        return res.redirect(302, process.env.DEFAULT_REDIRECT_URL || 'https://facemediafactory.com');
      }

      // Enregistrer le scan/visite
      await recordScan(trackingResult.orgId, trackingResult.id, trackingResult.type, {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer']
      });

      // Rediriger vers destination
      res.redirect(302, trackingResult.destinationUrl);

    } catch (error) {
      console.error('postalTrackingWebhook error:', error);
      res.redirect(302, process.env.DEFAULT_REDIRECT_URL || 'https://facemediafactory.com');
    }
  }
);

// ============================================
// TROUVER TRACKING PAR CODE
// ============================================
async function findTrackingByCode(code) {
  try {
    // Chercher dans postalTracking (QR codes)
    const orgsSnap = await db.collection('organizations').get();

    for (const orgDoc of orgsSnap.docs) {
      // Chercher dans tracking codes
      const trackingSnap = await db.collection('organizations').doc(orgDoc.id)
        .collection('postalTracking')
        .where('code', '==', code)
        .limit(1)
        .get();

      if (!trackingSnap.empty) {
        const data = trackingSnap.docs[0].data();
        return {
          id: trackingSnap.docs[0].id,
          orgId: orgDoc.id,
          type: 'qr',
          destinationUrl: data.destinationUrl || await getOrgDefaultUrl(orgDoc.id),
          prospectId: data.prospectId
        };
      }

      // Chercher dans PURLs
      const purlSnap = await db.collection('organizations').doc(orgDoc.id)
        .collection('postalPURLs')
        .where('slug', '==', code)
        .limit(1)
        .get();

      if (!purlSnap.empty) {
        const data = purlSnap.docs[0].data();
        return {
          id: purlSnap.docs[0].id,
          orgId: orgDoc.id,
          type: 'purl',
          destinationUrl: data.destinationUrl,
          prospectId: data.prospectId
        };
      }
    }

    return null;

  } catch (error) {
    console.error('findTrackingByCode error:', error);
    return null;
  }
}

// ============================================
// ENREGISTRER SCAN/VISITE
// ============================================
async function recordScan(orgId, trackingId, type, scanData) {
  try {
    const collection = type === 'qr' ? 'postalTracking' : 'postalPURLs';

    await db.collection('organizations').doc(orgId)
      .collection(collection).doc(trackingId)
      .update({
        [`${type === 'qr' ? 'scans' : 'visits'}`]: FieldValue.arrayUnion(scanData),
        lastScanAt: FieldValue.serverTimestamp(),
        scanCount: FieldValue.increment(1)
      });

    // Recuperer prospectId pour mise a jour
    const docSnap = await db.collection('organizations').doc(orgId)
      .collection(collection).doc(trackingId).get();

    if (docSnap.exists) {
      const data = docSnap.data();

      if (data.prospectId) {
        // Mettre a jour prospect
        await db.collection('organizations').doc(orgId)
          .collection('prospects').doc(data.prospectId)
          .update({
            'channels.postal.lastScanAt': FieldValue.serverTimestamp(),
            'channels.postal.scanCount': FieldValue.increment(1),
            status: 'engaged'
          });

        // Logger interaction
        await db.collection('organizations').doc(orgId)
          .collection('interactions').add({
            type: type === 'qr' ? 'postal_qr_scan' : 'postal_purl_visit',
            channel: 'postal',
            direction: 'in',
            prospectId: data.prospectId,
            trackingId,
            ...scanData,
            createdAt: FieldValue.serverTimestamp()
          });
      }
    }

    // Mettre a jour analytics
    await updatePostalAnalytics(orgId, type === 'qr' ? 'qr_scans' : 'purl_visits');

  } catch (error) {
    console.error('recordScan error:', error);
  }
}

// ============================================
// ENREGISTRER CONVERSION
// ============================================
export async function recordConversion(orgId, prospectId, conversionType, value = null) {
  try {
    // Trouver le tracking/PURL associe
    const trackingSnap = await db.collection('organizations').doc(orgId)
      .collection('postalTracking')
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const purlSnap = await db.collection('organizations').doc(orgId)
      .collection('postalPURLs')
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    const conversionData = {
      type: conversionType,
      value,
      timestamp: FieldValue.serverTimestamp()
    };

    if (!trackingSnap.empty) {
      await db.collection('organizations').doc(orgId)
        .collection('postalTracking').doc(trackingSnap.docs[0].id)
        .update({
          conversions: FieldValue.arrayUnion(conversionData),
          converted: true,
          convertedAt: FieldValue.serverTimestamp()
        });
    }

    if (!purlSnap.empty) {
      await db.collection('organizations').doc(orgId)
        .collection('postalPURLs').doc(purlSnap.docs[0].id)
        .update({
          conversions: FieldValue.arrayUnion(conversionData),
          converted: true,
          convertedAt: FieldValue.serverTimestamp()
        });
    }

    // Mettre a jour analytics
    await updatePostalAnalytics(orgId, 'conversions');

    return { success: true };

  } catch (error) {
    console.error('recordConversion error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// WEBHOOK POSTGRID (Tracking livraison)
// ============================================
export const postalDeliveryWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send('Method not allowed');
      }

      const payload = req.body;
      const eventType = payload.event;
      const mailId = payload.data?.id;
      const metadata = payload.data?.metadata;

      if (!mailId || !metadata?.orgId) {
        return res.status(200).send('OK'); // Ignorer les events sans metadata
      }

      const { orgId, prospectId, trackingCode } = metadata;

      switch (eventType) {
        case 'letter.created':
        case 'postcard.created':
          await updateMailStatus(orgId, mailId, 'created');
          break;

        case 'letter.rendered':
        case 'postcard.rendered':
          await updateMailStatus(orgId, mailId, 'rendered');
          break;

        case 'letter.mailed':
        case 'postcard.mailed':
          await updateMailStatus(orgId, mailId, 'mailed', payload.data);
          break;

        case 'letter.in_transit':
        case 'postcard.in_transit':
          await updateMailStatus(orgId, mailId, 'in_transit', payload.data);
          break;

        case 'letter.delivered':
        case 'postcard.delivered':
          await handleDelivery(orgId, prospectId, mailId, payload.data);
          break;

        case 'letter.returned':
        case 'postcard.returned':
          await handleReturn(orgId, prospectId, mailId, payload.data);
          break;
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('postalDeliveryWebhook error:', error);
      res.status(500).send('Internal error');
    }
  }
);

// ============================================
// GERER LIVRAISON
// ============================================
async function handleDelivery(orgId, prospectId, mailId, data) {
  try {
    // Mettre a jour interaction
    const interactionsSnap = await db.collection('organizations').doc(orgId)
      .collection('interactions')
      .where('mailId', '==', mailId)
      .limit(1)
      .get();

    if (!interactionsSnap.empty) {
      await interactionsSnap.docs[0].ref.update({
        status: 'delivered',
        deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : FieldValue.serverTimestamp()
      });
    }

    // Mettre a jour prospect
    if (prospectId) {
      await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.postal.lastDelivered': FieldValue.serverTimestamp(),
          'channels.postal.deliveryStatus': 'delivered'
        });
    }

    // Analytics
    await updatePostalAnalytics(orgId, 'delivered');

  } catch (error) {
    console.error('handleDelivery error:', error);
  }
}

// ============================================
// GERER RETOUR
// ============================================
async function handleReturn(orgId, prospectId, mailId, data) {
  try {
    // Mettre a jour interaction
    const interactionsSnap = await db.collection('organizations').doc(orgId)
      .collection('interactions')
      .where('mailId', '==', mailId)
      .limit(1)
      .get();

    if (!interactionsSnap.empty) {
      await interactionsSnap.docs[0].ref.update({
        status: 'returned',
        returnReason: data.returnReason,
        returnedAt: FieldValue.serverTimestamp()
      });
    }

    // Marquer adresse comme non delivrable
    if (prospectId) {
      await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.postal.deliverable': false,
          'channels.postal.deliveryStatus': 'returned',
          'channels.postal.returnReason': data.returnReason
        });
    }

    // Analytics
    await updatePostalAnalytics(orgId, 'returned');

  } catch (error) {
    console.error('handleReturn error:', error);
  }
}

// ============================================
// METTRE A JOUR STATUT COURRIER
// ============================================
async function updateMailStatus(orgId, mailId, status, data = {}) {
  try {
    const interactionsSnap = await db.collection('organizations').doc(orgId)
      .collection('interactions')
      .where('mailId', '==', mailId)
      .limit(1)
      .get();

    if (!interactionsSnap.empty) {
      const updateData = {
        status,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (data.trackingNumber) {
        updateData.trackingNumber = data.trackingNumber;
      }
      if (data.expectedDeliveryDate) {
        updateData.expectedDelivery = new Date(data.expectedDeliveryDate);
      }

      await interactionsSnap.docs[0].ref.update(updateData);
    }

  } catch (error) {
    console.error('updateMailStatus error:', error);
  }
}

// ============================================
// OBTENIR STATS TRACKING
// ============================================
export async function getTrackingStats(orgId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // QR scans
    const trackingSnap = await db.collection('organizations').doc(orgId)
      .collection('postalTracking')
      .where('createdAt', '>=', startDate)
      .get();

    let totalQRCodes = 0;
    let totalScans = 0;
    let qrConversions = 0;

    trackingSnap.forEach(doc => {
      totalQRCodes++;
      const data = doc.data();
      totalScans += data.scanCount || 0;
      if (data.converted) qrConversions++;
    });

    // PURLs
    const purlSnap = await db.collection('organizations').doc(orgId)
      .collection('postalPURLs')
      .where('createdAt', '>=', startDate)
      .get();

    let totalPURLs = 0;
    let totalVisits = 0;
    let purlConversions = 0;

    purlSnap.forEach(doc => {
      totalPURLs++;
      const data = doc.data();
      totalVisits += data.visits?.length || 0;
      if (data.converted) purlConversions++;
    });

    // Courriers
    const mailSnap = await db.collection('organizations').doc(orgId)
      .collection('interactions')
      .where('channel', '==', 'postal')
      .where('direction', '==', 'out')
      .where('createdAt', '>=', startDate)
      .get();

    let totalSent = 0;
    let delivered = 0;
    let returned = 0;

    mailSnap.forEach(doc => {
      totalSent++;
      const data = doc.data();
      if (data.status === 'delivered') delivered++;
      if (data.status === 'returned') returned++;
    });

    return {
      period: `${days} jours`,
      mail: {
        sent: totalSent,
        delivered,
        returned,
        deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : 0
      },
      tracking: {
        qrCodes: totalQRCodes,
        scans: totalScans,
        scanRate: totalQRCodes > 0 ? ((totalScans / totalQRCodes) * 100).toFixed(1) : 0,
        qrConversions
      },
      purl: {
        created: totalPURLs,
        visits: totalVisits,
        visitRate: totalPURLs > 0 ? ((totalVisits / totalPURLs) * 100).toFixed(1) : 0,
        conversions: purlConversions
      },
      overall: {
        engagement: totalScans + totalVisits,
        conversions: qrConversions + purlConversions,
        conversionRate: totalSent > 0 ? (((qrConversions + purlConversions) / totalSent) * 100).toFixed(1) : 0
      }
    };

  } catch (error) {
    console.error('getTrackingStats error:', error);
    return {
      mail: { sent: 0, delivered: 0 },
      tracking: { qrCodes: 0, scans: 0 },
      purl: { created: 0, visits: 0 }
    };
  }
}

// ============================================
// HELPERS
// ============================================
function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateShortCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getOrgDefaultUrl(orgId) {
  try {
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (orgSnap.exists) {
      return orgSnap.data().postalConfig?.defaultUrl || 'https://facemediafactory.com';
    }
  } catch (error) {}
  return 'https://facemediafactory.com';
}

async function getOrgCalendlyUrl(orgId) {
  try {
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (orgSnap.exists) {
      return orgSnap.data().postalConfig?.calendlyUrl || await getOrgDefaultUrl(orgId);
    }
  } catch (error) {}
  return await getOrgDefaultUrl(orgId);
}

async function getOrgLandingUrl(orgId) {
  try {
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (orgSnap.exists) {
      return orgSnap.data().postalConfig?.landingUrl || await getOrgDefaultUrl(orgId);
    }
  } catch (error) {}
  return await getOrgDefaultUrl(orgId);
}

async function getOrgOfferUrl(orgId) {
  try {
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (orgSnap.exists) {
      return orgSnap.data().postalConfig?.offerUrl || await getOrgDefaultUrl(orgId);
    }
  } catch (error) {}
  return await getOrgDefaultUrl(orgId);
}

async function updatePostalAnalytics(orgId, metric) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await db.collection('organizations').doc(orgId)
      .collection('channelAnalytics').doc(today)
      .set({
        date: today,
        [`channels.postal.${metric}`]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
  } catch (error) {
    console.error('updatePostalAnalytics error:', error);
  }
}
