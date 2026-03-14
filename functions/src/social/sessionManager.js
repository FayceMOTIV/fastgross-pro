/**
 * Session Manager — gestion des connexions sociales
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js';

const getDb = () => getFirestore();
const VPS_SECRET_KEY = defineSecret('VPS_SECRET_KEY');

function vpsHeaders(secret) {
  return { 'Content-Type': 'application/json', 'X-FMF-Secret': secret };
}

export const listConnectedPlatforms = onCall(
  { region: 'europe-west1', memory: '256MiB', secrets: [VPS_SECRET_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');
    const { orgId } = request.data;

    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis');
    await verifyOrgMembership(request.auth.uid, orgId);

    const resp = await axios.get(
      `http://94.130.184.44:3001/social/sessions/${orgId}`,
      { headers: vpsHeaders(VPS_SECRET_KEY.value()), timeout: 10000 }
    );

    return { orgId, platforms: resp.data.connected_platforms || [] };
  }
);

export const disconnectSocialPlatform = onCall(
  { region: 'europe-west1', memory: '256MiB', secrets: [VPS_SECRET_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');
    const { orgId, platform } = request.data;

    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis');
    await verifyOrgMembership(request.auth.uid, orgId);

    await axios.post('http://94.130.184.44:3001/social/disconnect-session',
      { orgId, platform },
      { headers: vpsHeaders(VPS_SECRET_KEY.value()), timeout: 10000 }
    );

    await getDb().collection('organizations').doc(orgId).update({
      [`socialOmniscient.connectedPlatforms.${platform}`]: {
        connected: false,
        disconnectedAt: FieldValue.serverTimestamp(),
      }
    });

    return { success: true };
  }
);
