/**
 * Address Validator - PostGrid API
 *
 * Verification et normalisation d'adresses:
 * - Validation France et international
 * - Standardisation format postal
 * - Detection adresses invalides
 * - Cache des validations
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// ============================================
// POSTGRID API CONFIG
// ============================================
const POSTGRID_API_BASE = 'https://api.postgrid.com/print-mail/v1';

// Cache validite (30 jours)
const VALIDATION_CACHE_DAYS = 30;

// ============================================
// OBTENIR CONFIG
// ============================================
async function getConfig(orgId) {
  try {
    const configRef = getDb().collection('organizations').doc(orgId)
      .collection('integrations').doc('postal');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return {
        apiKey: process.env.POSTGRID_API_KEY
      };
    }

    return configSnap.data();
  } catch (error) {
    return { apiKey: process.env.POSTGRID_API_KEY };
  }
}

// ============================================
// VALIDER ADRESSE
// ============================================
export async function validateAddress(orgId, address) {
  const result = {
    valid: false,
    deliverable: false,
    standardized: null,
    original: address,
    corrections: [],
    warnings: [],
    error: null
  };

  try {
    // 1. Validation basique
    const basicValidation = validateBasicFormat(address);
    if (!basicValidation.valid) {
      result.error = basicValidation.error;
      return result;
    }

    // 2. Verifier cache
    const cached = await getCachedValidation(orgId, address);
    if (cached) {
      return cached;
    }

    // 3. Appeler PostGrid pour validation
    const config = await getConfig(orgId);

    const response = await fetch(`${POSTGRID_API_BASE}/addver/verifications`, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          provinceOrState: address.state,
          postalOrZip: address.postalCode,
          country: address.country || 'FR'
        }
      })
    });

    if (!response.ok) {
      // Fallback sur validation basique
      console.warn('PostGrid validation failed, using basic validation');
      result.valid = basicValidation.valid;
      result.standardized = formatAddress(address);
      result.warnings.push('API validation unavailable - using basic validation');
      return result;
    }

    const data = await response.json();

    // 4. Interpreter la reponse
    result.valid = data.status === 'verified' || data.status === 'corrected';
    result.deliverable = data.deliverability === 'deliverable' ||
                         data.deliverability === 'deliverable_missing_info';

    if (data.verifiedAddress) {
      result.standardized = {
        name: address.name,
        company: address.company,
        line1: data.verifiedAddress.line1,
        line2: data.verifiedAddress.line2,
        city: data.verifiedAddress.city,
        state: data.verifiedAddress.provinceOrState,
        postalCode: data.verifiedAddress.postalOrZip,
        country: data.verifiedAddress.country
      };
    } else {
      result.standardized = formatAddress(address);
    }

    // 5. Collecter corrections et warnings
    if (data.status === 'corrected' && data.changes) {
      result.corrections = data.changes;
    }

    if (data.deliverability === 'deliverable_missing_info') {
      result.warnings.push('Address may be missing apartment/unit number');
    }

    if (data.deliverability === 'undeliverable') {
      result.valid = false;
      result.error = 'Address is not deliverable';
    }

    // 6. Mettre en cache
    await cacheValidation(orgId, address, result);

    return result;

  } catch (error) {
    console.error('validateAddress error:', error);
    result.error = error.message;

    // Fallback
    const basicValidation = validateBasicFormat(address);
    if (basicValidation.valid) {
      result.valid = true;
      result.standardized = formatAddress(address);
      result.warnings.push('Validation error - address accepted with basic check');
    }

    return result;
  }
}

// ============================================
// VALIDATION BASIQUE FORMAT
// ============================================
function validateBasicFormat(address) {
  const errors = [];

  if (!address.line1 || address.line1.trim().length < 3) {
    errors.push('Address line 1 is required');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!address.postalCode) {
    errors.push('Postal code is required');
  }

  // Validation code postal France
  const country = (address.country || 'FR').toUpperCase();
  if (country === 'FR' || country === 'FRANCE') {
    if (!/^\d{5}$/.test(address.postalCode?.replace(/\s/g, ''))) {
      errors.push('Invalid French postal code (must be 5 digits)');
    }
  }

  return {
    valid: errors.length === 0,
    error: errors.join(', ')
  };
}

// ============================================
// FORMATER ADRESSE
// ============================================
function formatAddress(address) {
  return {
    name: formatName(address.name),
    company: address.company?.trim(),
    line1: address.line1?.trim(),
    line2: address.line2?.trim(),
    city: address.city?.trim().toUpperCase(),
    state: address.state?.trim(),
    postalCode: address.postalCode?.replace(/\s/g, ''),
    country: (address.country || 'FR').toUpperCase()
  };
}

function formatName(name) {
  if (!name) return '';
  return name.trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================
// CACHE VALIDATION
// ============================================
async function getCachedValidation(orgId, address) {
  try {
    const cacheKey = generateCacheKey(address);
    const cacheRef = getDb().collection('organizations').doc(orgId)
      .collection('addressValidationCache').doc(cacheKey);
    const cacheSnap = await cacheRef.get();

    if (!cacheSnap.exists) {
      return null;
    }

    const cached = cacheSnap.data();

    // Verifier expiration
    const expiresAt = cached.validatedAt?.toDate();
    if (expiresAt) {
      const daysSince = (Date.now() - expiresAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > VALIDATION_CACHE_DAYS) {
        return null; // Cache expire
      }
    }

    return cached.result;

  } catch (error) {
    return null;
  }
}

async function cacheValidation(orgId, address, result) {
  try {
    const cacheKey = generateCacheKey(address);
    await getDb().collection('organizations').doc(orgId)
      .collection('addressValidationCache').doc(cacheKey)
      .set({
        original: address,
        result,
        validatedAt: FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('cacheValidation error:', error);
  }
}

function generateCacheKey(address) {
  const str = [
    address.line1,
    address.line2,
    address.city,
    address.postalCode,
    address.country
  ].filter(Boolean).join('|').toLowerCase();

  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `addr_${Math.abs(hash).toString(16)}`;
}

// ============================================
// VALIDER BATCH D'ADRESSES
// ============================================
export async function validateAddressBatch(orgId, addresses) {
  const results = [];

  for (const address of addresses) {
    const result = await validateAddress(orgId, address);
    results.push({
      original: address,
      ...result
    });

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const summary = {
    total: results.length,
    valid: results.filter(r => r.valid).length,
    deliverable: results.filter(r => r.deliverable).length,
    invalid: results.filter(r => !r.valid).length,
    withCorrections: results.filter(r => r.corrections?.length > 0).length
  };

  return { results, summary };
}

// ============================================
// VERIFIER ET METTRE A JOUR PROSPECT
// ============================================
export async function validateAndUpdateProspect(orgId, prospectId) {
  try {
    const prospectRef = getDb().collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId);
    const prospectSnap = await prospectRef.get();

    if (!prospectSnap.exists) {
      return { success: false, error: 'Prospect not found' };
    }

    const prospect = prospectSnap.data();
    const address = prospect.address;

    if (!address || !address.line1) {
      return { success: false, error: 'No address on record' };
    }

    const validation = await validateAddress(orgId, {
      name: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim(),
      company: prospect.company,
      ...address
    });

    // Mettre a jour le prospect
    await prospectRef.update({
      'channels.postal.addressVerified': validation.valid,
      'channels.postal.deliverable': validation.deliverable,
      'channels.postal.standardizedAddress': validation.standardized,
      'channels.postal.validatedAt': FieldValue.serverTimestamp(),
      'channels.postal.validationWarnings': validation.warnings
    });

    return {
      success: true,
      valid: validation.valid,
      deliverable: validation.deliverable,
      corrections: validation.corrections,
      warnings: validation.warnings
    };

  } catch (error) {
    console.error('validateAndUpdateProspect error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// AUTOCOMPLETE ADRESSE (France)
// ============================================
export async function autocompleteAddress(orgId, query) {
  try {
    const config = await getConfig(orgId);

    const response = await fetch(`${POSTGRID_API_BASE}/addver/completions?address=${encodeURIComponent(query)}&countryFilter=FR`, {
      headers: {
        'x-api-key': config.apiKey
      }
    });

    if (!response.ok) {
      return { suggestions: [] };
    }

    const data = await response.json();

    return {
      suggestions: (data.data || []).map(s => ({
        line1: s.line1,
        city: s.city,
        postalCode: s.postalOrZip,
        country: s.country
      }))
    };

  } catch (error) {
    console.error('autocompleteAddress error:', error);
    return { suggestions: [] };
  }
}

// ============================================
// PARSER ADRESSE TEXTE LIBRE
// ============================================
export function parseAddressText(text, country = 'FR') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const result = {
    name: '',
    company: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: country
  };

  // Heuristiques pour France
  if (country === 'FR') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code postal + Ville (ex: 75008 PARIS)
      const postalMatch = line.match(/^(\d{5})\s+(.+)$/);
      if (postalMatch) {
        result.postalCode = postalMatch[1];
        result.city = postalMatch[2];
        continue;
      }

      // Numero + rue
      if (/^\d+/.test(line) && !result.line1) {
        result.line1 = line;
        continue;
      }

      // Premiere ligne = nom ou entreprise
      if (i === 0) {
        // Si contient des mots-cles entreprise
        if (/^(SAS|SARL|SA|SCI|EURL|SASU|SCOP|GIE)\s/i.test(line) ||
            /\s(SAS|SARL|SA|SCI|EURL|SASU)$/i.test(line)) {
          result.company = line;
        } else {
          result.name = line;
        }
        continue;
      }

      // Deuxieme ligne = complement
      if (!result.line2 && result.line1 && !result.postalCode) {
        result.line2 = line;
      }
    }
  }

  return result;
}

// ============================================
// OBTENIR STATS VALIDATION ORG
// ============================================
export async function getValidationStats(orgId) {
  try {
    const prospectsSnap = await getDb().collection('organizations').doc(orgId)
      .collection('prospects')
      .get();

    let total = 0;
    let withAddress = 0;
    let verified = 0;
    let deliverable = 0;
    let notVerified = 0;

    prospectsSnap.forEach(doc => {
      const prospect = doc.data();
      total++;

      if (prospect.address?.line1) {
        withAddress++;

        const postal = prospect.channels?.postal || {};
        if (postal.addressVerified === true) {
          verified++;
        } else if (postal.addressVerified === false) {
          notVerified++;
        }

        if (postal.deliverable === true) {
          deliverable++;
        }
      }
    });

    return {
      total,
      withAddress,
      withAddressPercent: total > 0 ? ((withAddress / total) * 100).toFixed(1) : 0,
      verified,
      deliverable,
      notVerified,
      needsVerification: withAddress - verified - notVerified
    };

  } catch (error) {
    console.error('getValidationStats error:', error);
    return { total: 0, withAddress: 0, verified: 0, deliverable: 0 };
  }
}
