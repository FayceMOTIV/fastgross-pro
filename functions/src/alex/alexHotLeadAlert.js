/**
 * alexHotLeadAlert.js — Alertes temps reel prospect chaud
 * Se declenche quand le statut d'un prospect change.
 */
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logAlexActivity } from '../utils/logAlexActivity.js';

const getDb = () => getFirestore();

export const alertHotLead = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orgId = event.params.orgId;

    // Detecter les transitions importantes
    const isNewReply = !before.repliedAt && after.repliedAt;
    const isNowHot = before.status !== 'hot' && after.status === 'hot';
    const isInterested = after.replyClassification === 'INTERESTED' && before.replyClassification !== 'INTERESTED';
    const wantsMeeting = after.replyClassification === 'WANTS_MEETING' && before.replyClassification !== 'WANTS_MEETING';

    if (!isNewReply && !isNowHot && !isInterested && !wantsMeeting) return;

    const db = getDb();

    // Charger preferences + org data en parallele
    const [prefsDoc, orgDoc] = await Promise.all([
      db.doc(`organizations/${orgId}/alexMemory/preferences`).get(),
      db.doc(`organizations/${orgId}`).get(),
    ]);
    const prefs = prefsDoc.exists ? prefsDoc.data() : {};
    const orgData = orgDoc.exists ? orgDoc.data() : {};

    // Respecter le toggle hot lead alerts (default: true)
    if (prefs.hotLeadAlertsWhatsApp === false) return;

    // Construire le message d'alerte
    let alertMessage = '';
    const name = after.companyName || after.contactName || 'Un prospect';

    if (wantsMeeting) {
      alertMessage = `ALERTE CHAUDE !\n\n${name} veut un RDV !\n\nSon message : "${(after.lastReply || '').substring(0, 200)}"`;
    } else if (isInterested) {
      alertMessage = `Bonne nouvelle !\n\n${name} est interesse(e) !\n\nSon message : "${(after.lastReply || '').substring(0, 200)}"`;
    } else if (isNewReply) {
      alertMessage = `${name} a repondu !\n\n"${(after.lastReply || '').substring(0, 200)}"`;
    } else if (isNowHot) {
      alertMessage = `Nouveau prospect chaud : ${name} (score: ${after.score || after.finalScore || 'N/A'})`;
    }

    // Resoudre le numero: prefs.userWhatsApp > orgData.ownerPhone
    const userPhone = prefs.userWhatsApp || orgData.ownerPhone;

    // Si pas de numero, sauvegarder une notification in-app et sortir
    if (!userPhone) {
      await db.collection(`organizations/${orgId}/notifications`).add({
        type: 'hot_lead',
        title: alertMessage.split('\n')[0],
        message: alertMessage,
        prospectId: event.params.prospectId,
        read: false,
        createdAt: new Date(),
      });
      logAlexActivity(orgId, {
        type: 'hot_lead',
        title: `Alerte lead chaud (in-app) — ${name}`,
        details: 'Pas de WhatsApp configure — notification sauvegardee in-app',
        status: 'warning',
        prospectId: event.params.prospectId,
        channel: 'in_app',
      });
      return;
    }

    // Envoyer la notification WhatsApp (appel direct Evolution API — pas de compliance prospect)
    try {
      const apiUrl = process.env.EVOLUTION_API_URL;
      const apiKey = process.env.EVOLUTION_API_KEY;
      if (!apiUrl || !apiKey) {
        console.warn('[Alex Alert] Evolution API non configuree, alerte ignoree');
        return;
      }

      // Multi-tenant: chercher l'instance org, fallback globale
      let instance = process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3';
      const waDoc = await db.doc(`organizations/${orgId}/integrations/whatsapp`).get();
      if (waDoc.exists) {
        const waData = waDoc.data();
        if (waData?.status === 'connected' && waData?.instanceName) {
          instance = waData.instanceName;
        }
      }

      const phone = String(userPhone).replace(/\D/g, '');
      await fetch(`${apiUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: phone, text: alertMessage }),
      });
      console.log(`[Alex Alert] Alerte envoyee pour prospect ${after.companyName || event.params.prospectId}`);

      logAlexActivity(orgId, {
        type: 'hot_lead',
        title: `Alerte lead chaud — ${after.companyName || after.contactName || event.params.prospectId}`,
        details: alertMessage.substring(0, 200),
        status: 'success',
        prospectId: event.params.prospectId,
        channel: 'whatsapp',
      });
    } catch (e) {
      console.warn('[Alex Alert] WhatsApp send failed:', e.message);
    }
  }
);
