/**
 * alexHotLeadAlert.js — Alertes temps reel prospect chaud
 * Se declenche quand le statut d'un prospect change.
 */
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

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

    // Charger les preferences du user
    const prefsDoc = await db.doc(`organizations/${orgId}/alexMemory/preferences`).get();
    const prefs = prefsDoc.exists ? prefsDoc.data() : null;
    if (!prefs?.userWhatsApp) return;

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

    // Envoyer la notification WhatsApp
    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
      await sendWhatsAppMessage({
        to: prefs.userWhatsApp,
        message: alertMessage,
        organizationId: orgId,
        isNotification: true,
      });
      console.log(`[Alex Alert] Alerte envoyee pour prospect ${after.companyName || event.params.prospectId}`);
    } catch (e) {
      console.warn('[Alex Alert] WhatsApp send failed:', e.message);
    }
  }
);
