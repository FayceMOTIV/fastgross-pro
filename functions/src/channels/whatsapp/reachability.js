/**
 * WhatsApp Reachability Check
 *
 * Verifier si un numero est disponible sur WhatsApp
 * avant d'envoyer un message
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { formatWhatsAppNumber } from './sender.js';

const getDb = () => getFirestore();

// ============================================
// META API CONFIG
// ============================================
const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================
// VERIFIER DISPONIBILITE WHATSAPP
// ============================================
export async function checkWhatsAppAvailability(orgId, phone) {
  const result = {
    available: null,
    phone: phone,
    formattedPhone: null,
    cached: false,
    error: null
  };

  try {
    // Formater le numero
    const formattedPhone = formatWhatsAppNumber(phone);
    if (!formattedPhone) {
      result.available = false;
      result.error = 'Invalid phone format';
      return result;
    }
    result.formattedPhone = formattedPhone;

    // Verifier le cache
    const cached = await getCachedAvailability(orgId, formattedPhone);
    if (cached !== null) {
      result.available = cached;
      result.cached = true;
      return result;
    }

    // Verifier via Meta API (contacts)
    const config = await getMetaConfig(orgId);

    if (!config.phoneNumberId || !config.accessToken) {
      // Pas de config Meta - assumer disponible
      result.available = true;
      result.note = 'no_config_assume_available';
      return result;
    }

    const contactCheck = await checkContactOnWhatsApp(config, formattedPhone);
    result.available = contactCheck.available;

    // Cacher le resultat
    await cacheAvailability(orgId, formattedPhone, result.available);

    return result;

  } catch (error) {
    console.error('checkWhatsAppAvailability error:', error);
    result.error = error.message;
    // En cas d'erreur, assumer disponible pour ne pas bloquer
    result.available = true;
    return result;
  }
}

// ============================================
// VERIFIER CONTACT VIA META API
// ============================================
async function checkContactOnWhatsApp(config, phone) {
  try {
    const url = `${META_API_BASE}/${config.phoneNumberId}/contacts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        blocking: 'wait',
        contacts: [`+${phone}`],
        force_check: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Meta contacts API error:', error);
      return { available: true, error: error.error?.message };
    }

    const data = await response.json();
    const contact = data.contacts?.[0];

    if (contact?.status === 'valid') {
      return {
        available: true,
        waId: contact.wa_id
      };
    }

    return {
      available: false,
      status: contact?.status
    };

  } catch (error) {
    console.error('checkContactOnWhatsApp error:', error);
    return { available: true, error: error.message };
  }
}

// ============================================
// CACHE DISPONIBILITE
// ============================================
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

async function getCachedAvailability(orgId, phone) {
  try {
    const cacheRef = db.collection('organizations').doc(orgId)
      .collection('whatsappAvailability').doc(phone);
    const cacheSnap = await cacheRef.get();

    if (!cacheSnap.exists) {
      return null;
    }

    const cache = cacheSnap.data();
    const age = Date.now() - (cache.checkedAt?.toMillis() || 0);

    if (age > CACHE_DURATION_MS) {
      return null; // Cache expire
    }

    return cache.available;

  } catch (error) {
    console.error('getCachedAvailability error:', error);
    return null;
  }
}

async function cacheAvailability(orgId, phone, available) {
  try {
    const cacheRef = db.collection('organizations').doc(orgId)
      .collection('whatsappAvailability').doc(phone);

    await cacheRef.set({
      phone,
      available,
      checkedAt: FieldValue.serverTimestamp()
    });

  } catch (error) {
    console.error('cacheAvailability error:', error);
  }
}

// ============================================
// VERIFIER BATCH
// ============================================
export async function checkBatchAvailability(orgId, phones) {
  const results = {
    total: phones.length,
    available: 0,
    unavailable: 0,
    errors: 0,
    details: []
  };

  // Limiter a 100 par batch
  const batch = phones.slice(0, 100);

  for (const phone of batch) {
    const check = await checkWhatsAppAvailability(orgId, phone);

    if (check.error) {
      results.errors++;
    } else if (check.available) {
      results.available++;
    } else {
      results.unavailable++;
    }

    results.details.push({
      phone,
      ...check
    });

    // Petit delai pour eviter rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// ============================================
// METTRE A JOUR PROSPECT AVEC DISPONIBILITE
// ============================================
export async function updateProspectWhatsAppStatus(orgId, prospectId, available) {
  try {
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);

    await prospectRef.update({
      'channels.whatsapp.available': available,
      'channels.whatsapp.reachable': available,
      'channels.whatsapp.checkedAt': FieldValue.serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error('updateProspectWhatsAppStatus error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VERIFIER ET METTRE A JOUR PROSPECT
// ============================================
export async function checkAndUpdateProspect(orgId, prospectId) {
  try {
    // Recuperer le prospect
    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { success: false, error: 'Prospect not found' };
    }

    const prospect = prospectSnap.data();
    const phone = prospect.phone || prospect.mobile;

    if (!phone) {
      return { success: false, error: 'No phone number' };
    }

    // Verifier disponibilite
    const check = await checkWhatsAppAvailability(orgId, phone);

    // Mettre a jour le prospect
    await updateProspectWhatsAppStatus(orgId, prospectId, check.available);

    return {
      success: true,
      available: check.available,
      cached: check.cached
    };

  } catch (error) {
    console.error('checkAndUpdateProspect error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// HELPER: GET META CONFIG
// ============================================
async function getMetaConfig(orgId) {
  try {
    const configRef = db.collection('organizations').doc(orgId)
      .collection('integrations').doc('whatsapp');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN
      };
    }

    return configSnap.data();
  } catch (error) {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN
    };
  }
}
