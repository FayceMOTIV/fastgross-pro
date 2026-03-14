/**
 * Social Signal Processor — Trigger + API callables
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import axios from 'axios';
import Groq from 'groq-sdk';
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js';

const getDb = () => getFirestore();
const VPS_SECRET_KEY = defineSecret('VPS_SECRET_KEY');

function vpsHeaders(secret) {
  return { 'Content-Type': 'application/json', 'X-FMF-Secret': secret };
}

// ============================================================
// TRIGGER : Nouveau lead social -> genere reponse + action
// ============================================================

export const processSocialLead = onDocumentCreated(
  {
    document: 'socialLeads/{leadId}',
    region: 'europe-west1',
    memory: '512MiB',
    secrets: [VPS_SECRET_KEY],
  },
  async (event) => {
    const leadData = event.data.data();
    const leadId = event.params.leadId;

    if (!leadData || leadData.status !== 'pending_first_action') return;

    const orgDoc = await getDb().collection('organizations').doc(leadData.orgId).get();
    if (!orgDoc.exists) return;
    const orgData = orgDoc.data();
    const productProfile = orgData?.productProfile || {};

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await generateContextualResponse(leadData, productProfile, groq);

    if (!response) {
      await event.data.ref.update({ status: 'response_generation_failed' });
      return;
    }

    await executeFirstAction(leadId, leadData, response, VPS_SECRET_KEY.value());
  }
);

async function generateContextualResponse(lead, productProfile, groq) {
  const businessName = productProfile.businessName || 'notre equipe';
  const service = productProfile.mainService || 'nos services';

  const isOfficialSource = ['bodacc_creation', 'france_travail', 'sitadel_permit'].includes(lead.source);

  const prompt = `Tu es Alex, l'assistant commercial de "${businessName}".

CONTEXTE DU SIGNAL :
Source : ${lead.source}
Texte : "${lead.signalText}"
Mots-cles : ${(lead.matchedKeywords || []).join(', ')}

Genere un message de prise de contact naturel en francais.
${isOfficialSource
    ? 'Format : felicitations ou aide sincere (source officielle = creation/recrutement recent).'
    : 'Format : reponse directe et bienveillante au post ou message detecte.'}

REGLES IMPERATIVES :
- Maximum 2 phrases, ton humain non commercial
- Parler au nom de "${businessName}"
- Proposer naturellement "${service}"
- Ne JAMAIS mentionner FMF ou "intelligence artificielle"
- Pas de ponctuation excessive

Reponds UNIQUEMENT avec le texte du message.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.error('[SignalProcessor] Groq error:', error.message);
    return null;
  }
}

async function executeFirstAction(leadId, lead, responseText, vpsSecret) {
  const source = lead.source;
  let actionResult = { success: false, channel: null, reason: 'unhandled_source' };

  try {
    if (source === 'facebook_group' && lead.contactUrl) {
      const resp = await axios.post('http://94.130.184.44:3001/social/comment', {
        orgId: lead.orgId, platform: 'facebook',
        postUrl: lead.contactUrl, text: responseText
      }, { headers: vpsHeaders(vpsSecret), timeout: 120000 });
      actionResult = { success: resp.data.success, channel: 'facebook_comment', reason: resp.data.reason };

    } else if (source === 'linkedin_feed' && lead.contactUrl) {
      const resp = await axios.post('http://94.130.184.44:3001/social/comment', {
        orgId: lead.orgId, platform: 'linkedin',
        postUrl: lead.contactUrl, text: responseText
      }, { headers: vpsHeaders(vpsSecret), timeout: 120000 });
      actionResult = { success: resp.data.success, channel: 'linkedin_comment', reason: resp.data.reason };

    } else if (source === 'telegram_group' && lead.contactUsername) {
      const resp = await axios.post('http://94.130.184.44:3001/social/dm', {
        platform: 'telegram', username: lead.contactUsername, message: responseText
      }, { headers: vpsHeaders(vpsSecret), timeout: 30000 });
      actionResult = { success: resp.data.success, channel: 'telegram_dm' };

    } else if (['bodacc_creation', 'france_travail', 'sitadel_permit'].includes(source) && lead.siren) {
      const leadRef = getDb().collection('leads').doc();
      await leadRef.set({
        orgId: lead.orgId,
        siren: lead.siren,
        source: 'social_omniscient',
        socialSignalSource: source,
        initialMessage: responseText,
        status: 'pending_enrichment',
        createdAt: FieldValue.serverTimestamp(),
      });
      actionResult = { success: true, channel: 'enrichment_pipeline' };
    }
  } catch (error) {
    console.error('[SignalProcessor] Action error:', error.message);
    actionResult = { success: false, error: error.message };
  }

  await getDb().collection('socialLeads').doc(leadId).update({
    status: actionResult.success ? 'first_action_done' : 'first_action_failed',
    'sequence.step': 1,
    'sequence.completedSteps': FieldValue.arrayUnion({
      step: 1,
      channel: actionResult.channel,
      success: actionResult.success,
      reason: actionResult.reason || null,
      text: responseText,
      doneAt: new Date().toISOString(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ============================================================
// API CALLABLE — Actions manuelles depuis le dashboard
// ============================================================

export const socialManualAction = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [VPS_SECRET_KEY],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');

    const { action, leadId, orgId, customMessage } = request.data;
    if (!leadId || !orgId) throw new HttpsError('invalid-argument', 'leadId et orgId requis');

    await verifyOrgMembership(request.auth.uid, orgId);

    const leadDoc = await getDb().collection('socialLeads').doc(leadId).get();
    if (!leadDoc.exists) throw new HttpsError('not-found', 'Lead introuvable');

    const lead = leadDoc.data();

    const message = customMessage || '';
    const vpsSecret = VPS_SECRET_KEY.value();
    let result = { success: false };

    switch (action) {
      case 'send_dm_facebook': {
        if (!lead.contactUrl) throw new HttpsError('failed-precondition', 'contactUrl manquant');
        const fbResp = await axios.post('http://94.130.184.44:3001/social/dm', {
          orgId, platform: 'facebook', profileUrl: lead.contactUrl, message
        }, { headers: vpsHeaders(vpsSecret), timeout: 120000 });
        result = fbResp.data;
        break;
      }

      case 'send_dm_linkedin': {
        if (!lead.contactUrl) throw new HttpsError('failed-precondition', 'contactUrl manquant');
        const liResp = await axios.post('http://94.130.184.44:3001/social/dm', {
          orgId, platform: 'linkedin', profileUrl: lead.contactUrl, message
        }, { headers: vpsHeaders(vpsSecret), timeout: 120000 });
        result = liResp.data;
        break;
      }

      case 'mark_converted':
        await getDb().collection('socialLeads').doc(leadId).update({
          status: 'converted',
          convertedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };

      case 'dismiss':
        await getDb().collection('socialLeads').doc(leadId).update({
          status: 'dismissed',
          dismissedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };

      default:
        throw new HttpsError('invalid-argument', `Action inconnue: ${action}`);
    }

    if (result.success) {
      await getDb().collection('socialLeads').doc(leadId).update({
        'sequence.completedSteps': FieldValue.arrayUnion({
          step: 'manual',
          action,
          success: true,
          text: message,
          doneAt: new Date().toISOString(),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return result;
  }
);

// ============================================================
// API CALLABLE — Configuration sources org
// ============================================================

export const configureSocialSources = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');

    const { orgId, config } = request.data;

    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis');
    await verifyOrgMembership(request.auth.uid, orgId);

    const ALLOWED_KEYS = [
      'enabled', 'keywords', 'geoZones', 'nafCodes',
      'facebookGroups', 'telegramGroups', 'googleAlertsUrls', 'plan'
    ];

    const updates = { 'socialOmniscient.updatedAt': FieldValue.serverTimestamp() };
    for (const key of ALLOWED_KEYS) {
      if (config[key] !== undefined) updates[`socialOmniscient.${key}`] = config[key];
    }

    await getDb().collection('organizations').doc(orgId).update(updates);

    return { success: true };
  }
);

// ============================================================
// API CALLABLE — Stats dashboard
// ============================================================

export const getSocialStats = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Non connecte');

    const { orgId, period = 7 } = request.data;

    if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis');
    await verifyOrgMembership(request.auth.uid, orgId);

    const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const [signalsSnap, leadsSnap] = await Promise.all([
      getDb().collection('socialSignals')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(cutoff))
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get(),
      getDb().collection('socialLeads')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(cutoff))
        .get(),
    ]);

    const bySource = {};
    signalsSnap.docs.forEach(doc => {
      const src = doc.data().source || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    const leads = leadsSnap.docs.map(d => d.data());
    const converted = leads.filter(l => l.status === 'converted').length;
    const actionsDone = leads.filter(l => l.status === 'first_action_done').length;

    return {
      totalSignals: signalsSnap.size,
      totalLeads: leadsSnap.size,
      converted,
      actionsDone,
      conversionRate: leadsSnap.size > 0 ? Math.round((converted / leadsSnap.size) * 100) : 0,
      bySource,
      recentSignals: signalsSnap.docs.slice(0, 20).map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate()?.toISOString(),
      })),
    };
  }
);
