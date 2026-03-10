/**
 * alexDailyReport.js — Rapport quotidien d'Alex
 * Alex rend des comptes tous les matins sur WhatsApp/email.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tourne toutes les heures, verifie qui veut un rapport a cette heure
export const alexDailyReporter = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getDb();
    const now = new Date();
    const currentHour = now.toLocaleString('fr-FR', {
      hour: '2-digit',
      timeZone: 'Europe/Paris',
    }).padStart(2, '0');

    // Trouver tous les orgs avec rapport quotidien actif
    const orgsSnap = await db.collectionGroup('alexMemory').get();

    for (const doc of orgsSnap.docs) {
      const data = doc.data();
      if (!data.dailyReportEnabled) continue;

      const reportTime = data.dailyReportTime || '08:00';
      const reportHour = reportTime.split(':')[0];

      if (currentHour !== reportHour) continue;

      const orgId = doc.ref.parent.parent.id;

      try {
        await generateAndSendReport(orgId, data);
      } catch (error) {
        console.error(`[Alex Report] Erreur pour ${orgId}:`, error.message);
      }
    }
  }
);

async function generateAndSendReport(organizationId, prefs) {
  const db = getDb();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Charger les donnees des dernieres 24h
  const [newProspects, contactedProspects, replies, hotLeads] = await Promise.all([
    db.collection(`organizations/${organizationId}/prospects`)
      .where('createdAt', '>=', yesterday)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('contactedAt', '>=', yesterday)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('repliedAt', '>=', yesterday)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('status', '==', 'hot')
      .count().get(),
  ]);

  const stats = {
    found: newProspects.data().count,
    contacted: contactedProspects.data().count,
    replies: replies.data().count,
    hot: hotLeads.data().count,
  };

  // Generer le message avec Groq
  const prompt = `Tu es Alex, l'associe commercial IA. Genere un rapport quotidien court et percutant (max 8 lignes) en francais.

Stats des dernieres 24h :
- Prospects trouves : ${stats.found}
- Prospects contactes : ${stats.contacted}
- Reponses recues : ${stats.replies}
- Prospects chauds en attente : ${stats.hot}

Regles :
- Sois concret et direct, comme un collegue qui fait le point le matin
- Si les resultats sont bons, felicite brievement
- Si les resultats sont faibles, propose 1 ajustement concret
- Termine par ce que tu vas faire aujourd'hui
- Format texte simple (pour WhatsApp), pas de HTML
- Commence par "Rapport Alex —" suivi de la date du jour`;

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 500,
  });

  const reportMessage = response.choices[0].message.content;

  // Envoyer selon le canal prefere
  if (prefs.dailyReportChannel === 'whatsapp' && prefs.userWhatsApp) {
    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
      await sendWhatsAppMessage({
        to: prefs.userWhatsApp,
        message: reportMessage,
        organizationId,
        isNotification: true,
      });
    } catch (e) {
      console.warn('[Alex Report] WhatsApp send failed:', e.message);
    }
  }

  // Sauvegarder le rapport
  await db.collection(`organizations/${organizationId}/alexReports`).add({
    stats,
    message: reportMessage,
    sentVia: prefs.dailyReportChannel || 'none',
    sentAt: new Date(),
  });
}
