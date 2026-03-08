/**
 * clientGeoSettings.js
 * Gestion des zones de prospection par client FMF.
 * Chaque client peut definir 1 a 5 zones + secteurs cibles.
 * Toutes les campagnes respectent automatiquement ces settings.
 *
 * Firestore : organizations/{orgId}/settings/geo
 */

import { getFirestore } from 'firebase-admin/firestore';
import { resolveGeoZone } from './geoZoneResolver.js';
import { logger } from 'firebase-functions';

export async function getClientGeoSettings(orgId) {
  const db = getFirestore();
  const doc = await db.doc(`organizations/${orgId}/settings/geo`).get();

  if (!doc.exists) {
    return {
      zones: [{ type: 'france', nom: 'France', sireneFilter: {} }],
      secteurs: [],
      nafs: [],
      maxLeadsPerDay: 50,
      excludedCodes: []
    };
  }

  return doc.data();
}

export async function setClientGeoSettings(orgId, settings) {
  const db = getFirestore();
  const docRef = db.doc(`organizations/${orgId}/settings/geo`);

  const resolvedZones = [];
  for (const zone of (settings.zones || [])) {
    const resolved = typeof zone === 'string' ? await resolveGeoZone(zone) : zone;
    resolvedZones.push(resolved);
  }

  const data = {
    zones: resolvedZones.slice(0, 5),
    secteurs: settings.secteurs || [],
    nafs: settings.nafs || [],
    maxLeadsPerDay: Math.min(Math.max(settings.maxLeadsPerDay || 50, 10), 500),
    excludedCodes: settings.excludedCodes || [],
    updatedAt: new Date().toISOString()
  };

  await docRef.set(data, { merge: true });
  logger.info(`geoSettings updated for org ${orgId}`, { zones: data.zones.length, nafs: data.nafs.length });
  return data;
}

/**
 * Construit les parametres SIRENE pour une org donnee
 * Retourne un tableau de queries (une par zone x naf)
 */
export async function buildSireneQueriesForClient(orgId, overrideNaf) {
  const settings = await getClientGeoSettings(orgId);
  const queries = [];

  for (const zone of settings.zones) {
    const nafList = overrideNaf
      ? [overrideNaf]
      : settings.nafs.length > 0 ? settings.nafs : [null];

    for (const naf of nafList) {
      const sireneParams = { ...(zone.sireneFilter || {}) };
      if (naf) sireneParams.activite_principale = naf;

      queries.push({ zone, naf, sireneParams });
    }
  }

  return queries;
}
