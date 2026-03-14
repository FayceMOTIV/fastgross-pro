/**
 * geoFunction.js
 * Cloud Functions pour la gestion des zones geographiques.
 */

import { onCall } from 'firebase-functions/v2/https';
import { setClientGeoSettings, getClientGeoSettings } from './clientGeoSettings.js';
import { extractGeoIntent } from './geoIntentExtractor.js';
import { resolveGeoZone } from './geoZoneResolver.js';
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js';

/**
 * Mise a jour des settings geo depuis le dashboard
 */
export const updateClientGeoSettings = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  if (!request.auth) throw new Error('Non authentifie');

  const { orgId, zones, nafs, secteurs, maxLeadsPerDay, excludedCodes } = request.data;
  if (!orgId) throw new Error('orgId requis');

  await verifyOrgMembership(request.auth.uid, orgId);

  const result = await setClientGeoSettings(orgId, {
    zones: zones || [],
    nafs: nafs || [],
    secteurs: secteurs || [],
    maxLeadsPerDay,
    excludedCodes
  });

  return { success: true, data: result };
});

/**
 * Lecture des settings geo
 */
export const getGeoSettings = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  if (!request.auth) throw new Error('Non authentifie');
  const { orgId } = request.data;
  if (!orgId) throw new Error('orgId requis');

  await verifyOrgMembership(request.auth.uid, orgId);

  const settings = await getClientGeoSettings(orgId);
  return { success: true, data: settings };
});

/**
 * Extraction d'intention geo depuis un message libre (assistant onboarding)
 */
export const detectGeoFromMessage = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { message } = request.data;
  if (!message) throw new Error('message requis');

  const intent = await extractGeoIntent(message);
  return intent;
});

/**
 * Resoudre une zone geographique (utilitaire)
 */
export const resolveZone = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { input } = request.data;
  if (!input) throw new Error('input requis');

  const zone = await resolveGeoZone(input);
  return { success: true, zone };
});
