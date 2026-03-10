/**
 * reverseEnrichment.js — Signal detecte -> Identification du prospect
 * Quand un signal est detecte SANS prospect associe, ce module tente
 * d'identifier le prospect a partir du signal via SIRENE, Firestore, etc.
 */

import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

/**
 * Tente d'identifier un prospect a partir d'un signal orphelin
 * @param {object} signal - Signal avec id, source, rawData
 * @returns {Promise<object|null>} Prospect identifie ou null
 */
export async function reverseEnrichFromSignal(signal) {
  const db = getDb();
  let prospect = null;

  switch (signal.source) {
    case 'ctLogsMonitor':
      prospect = await identifyFromDomain(db, signal.rawData?.domain);
      break;

    case 'franceTravailMonitor':
      if (signal.rawData?.siret) {
        prospect = await identifyFromSiret(db, signal.rawData.siret);
      } else if (signal.rawData?.entreprise) {
        prospect = await identifyFromCompanyName(
          signal.rawData.entreprise,
          signal.rawData.codePostal
        );
      }
      break;

    case 'leboncoinCessionsMonitor':
      if (signal.rawData?.entreprise) {
        prospect = await identifyFromCompanyName(
          signal.rawData.entreprise,
          signal.rawData.codePostal
        );
      }
      break;

    case 'subventionsMonitor':
      if (signal.rawData?.entreprise) {
        prospect = await identifyFromCompanyName(signal.rawData.entreprise);
      }
      break;

    default:
      break;
  }

  if (prospect && signal.id) {
    try {
      await db.collection('scanSignals').doc(signal.id).update({
        prospectId: prospect.id,
        status: 'linked',
        processedAt: new Date(),
      });
    } catch (error) {
      console.warn('[ReverseEnrich] Erreur update signal:', error.message);
    }
    return prospect;
  }

  return null;
}

async function identifyFromDomain(db, domain) {
  if (!domain) return null;

  try {
    const snapshot = await db
      .collectionGroup('prospects')
      .where('website', '==', domain)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    const snapshot2 = await db
      .collectionGroup('prospects')
      .where('website', '==', `https://${domain}`)
      .limit(1)
      .get();

    if (!snapshot2.empty) {
      const doc = snapshot2.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.warn('[ReverseEnrich] Firestore domain search error:', error.message);
  }

  return null;
}

async function identifyFromSiret(db, siret) {
  if (!siret) return null;

  try {
    const snapshot = await db
      .collectionGroup('prospects')
      .where('siret', '==', siret)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.warn('[ReverseEnrich] Firestore SIRET search error:', error.message);
  }

  return null;
}

async function identifyFromCompanyName(name, codePostal = null) {
  if (!name) return null;

  try {
    const params = new URLSearchParams({ q: name, per_page: '1' });
    if (codePostal) params.set('code_postal', codePostal);

    const url = `https://recherche-entreprises.api.gouv.fr/search?${params.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.results?.length > 0) {
      const result = data.results[0];
      return {
        id: null,
        siret: result.siege?.siret,
        siren: result.siren,
        companyName: result.nom_complet,
        address: result.siege?.adresse,
        codeNaf: result.activite_principale,
        codePostal: result.siege?.code_postal,
        ville: result.siege?.libelle_commune,
      };
    }

    return null;
  } catch (error) {
    console.warn('[ReverseEnrich] API recherche-entreprises error:', error.message);
    return null;
  }
}
