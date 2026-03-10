/**
 * OAuth officiel Meta & LinkedIn.
 * Remplace le flux cookie-editor par un flux bouton "Connecter" standard.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';

const getDb = () => getFirestore();
const META_APP_ID = defineSecret('META_APP_ID');
const META_APP_SECRET = defineSecret('META_APP_SECRET');
const LINKEDIN_CLIENT_ID = defineSecret('LINKEDIN_CLIENT_ID');
const LINKEDIN_CLIENT_SECRET = defineSecret('LINKEDIN_CLIENT_SECRET');
const VPS_SECRET_KEY = defineSecret('VPS_SECRET_KEY');

const VPS_URL = 'http://94.130.184.44:3001';
const APP_URL = 'https://face-media-factory.web.app';

function vpsHeaders(secret) {
  return { 'Content-Type': 'application/json', 'X-FMF-Secret': secret };
}

// ============================================================
// META (Facebook + Instagram)
// ============================================================

export const metaOAuthStart = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [META_APP_ID],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');

    const { orgId } = request.data;
    const state = Buffer.from(JSON.stringify({
      orgId,
      uid: request.auth.uid,
      ts: Date.now()
    })).toString('base64');

    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'instagram_basic',
      'instagram_manage_comments',
    ].join(',');

    const redirectUri = encodeURIComponent(
      'https://europe-west1-face-media-factory.cloudfunctions.net/metaOAuthCallback'
    );

    const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth?' +
      `client_id=${META_APP_ID.value()}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      'response_type=code';

    return { authUrl, state };
  }
);

export const metaOAuthCallback = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [META_APP_ID, META_APP_SECRET, VPS_SECRET_KEY],
  },
  async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=facebook&reason=${error}`);
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=facebook&reason=invalid_state`);
    }

    const { orgId } = stateData;
    const redirectUri = 'https://europe-west1-face-media-factory.cloudfunctions.net/metaOAuthCallback';

    try {
      // Echange le code contre un token
      const tokenResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: META_APP_ID.value(),
          client_secret: META_APP_SECRET.value(),
          redirect_uri: redirectUri,
          code,
        },
        timeout: 15000,
      });

      const { access_token, expires_in } = tokenResp.data;

      // Echange contre un token longue duree (60 jours)
      const longTokenResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: META_APP_ID.value(),
          client_secret: META_APP_SECRET.value(),
          fb_exchange_token: access_token,
        },
        timeout: 15000,
      });

      const longToken = longTokenResp.data.access_token;
      const longExpiry = Date.now() / 1000 + (longTokenResp.data.expires_in || 5184000);

      // Sauvegarde chiffree sur le VPS
      await axios.post(`${VPS_URL}/social/save-oauth-tokens`, {
        orgId,
        platform: 'facebook',
        accessToken: longToken,
        expiresAt: longExpiry,
      }, { headers: vpsHeaders(VPS_SECRET_KEY.value()), timeout: 10000 });

      // Enregistre en Firestore (sans le token — juste le statut)
      await getDb().collection('organizations').doc(orgId).update({
        'socialOmniscient.connectedPlatforms.facebook': {
          connected: true,
          connectedAt: FieldValue.serverTimestamp(),
          expiresAt: new Date(longExpiry * 1000),
          scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic'],
        }
      });

      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_success=facebook`);

    } catch (err) {
      console.error('[Meta OAuth Callback]', err.message);
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=facebook&reason=token_exchange_failed`);
    }
  }
);

// ============================================================
// LINKEDIN
// ============================================================

export const linkedinOAuthStart = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [LINKEDIN_CLIENT_ID],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');

    const { orgId } = request.data;
    const state = Buffer.from(JSON.stringify({
      orgId,
      uid: request.auth.uid,
      ts: Date.now()
    })).toString('base64');

    const redirectUri = encodeURIComponent(
      'https://europe-west1-face-media-factory.cloudfunctions.net/linkedinOAuthCallback'
    );

    const authUrl = 'https://www.linkedin.com/oauth/v2/authorization?' +
      'response_type=code&' +
      `client_id=${LINKEDIN_CLIENT_ID.value()}&` +
      `redirect_uri=${redirectUri}&` +
      'scope=openid%20profile%20email%20w_member_social&' +
      `state=${encodeURIComponent(state)}`;

    return { authUrl, state };
  }
);

export const linkedinOAuthCallback = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, VPS_SECRET_KEY],
  },
  async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=linkedin&reason=${error}`);
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=linkedin&reason=invalid_state`);
    }

    const { orgId } = stateData;
    const redirectUri = 'https://europe-west1-face-media-factory.cloudfunctions.net/linkedinOAuthCallback';

    try {
      const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: LINKEDIN_CLIENT_ID.value(),
          client_secret: LINKEDIN_CLIENT_SECRET.value(),
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }
      );

      const { access_token, expires_in } = tokenResp.data;
      const expiresAt = Date.now() / 1000 + (expires_in || 5184000);

      // Sauvegarde chiffree sur le VPS
      await axios.post(`${VPS_URL}/social/save-oauth-tokens`, {
        orgId,
        platform: 'linkedin',
        accessToken: access_token,
        expiresAt,
      }, { headers: vpsHeaders(VPS_SECRET_KEY.value()), timeout: 10000 });

      await getDb().collection('organizations').doc(orgId).update({
        'socialOmniscient.connectedPlatforms.linkedin': {
          connected: true,
          connectedAt: FieldValue.serverTimestamp(),
          expiresAt: new Date(expiresAt * 1000),
        }
      });

      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_success=linkedin`);

    } catch (err) {
      console.error('[LinkedIn OAuth Callback]', err.message);
      return res.redirect(`${APP_URL}/app/social-omniscient?oauth_error=linkedin&reason=token_exchange_failed`);
    }
  }
);
