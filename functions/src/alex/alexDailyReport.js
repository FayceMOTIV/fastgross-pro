/**
 * alexDailyReport.js — Triple rapport Alex (8H, 14H, 21H)
 *
 * Alex envoie 3 rapports par jour :
 * - 8H  : Briefing matin — objectifs du jour, mission en cours, plan d'action
 * - 14H : Point mi-journee — progression, resultats, ajustements
 * - 21H : Bilan soir — resultats finaux, hot leads, plan demain
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const REPORT_HOURS = [8, 14, 21];

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
    const parisHour = parseInt(now.toLocaleString('fr-FR', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Paris',
    }), 10);

    // Verifier si c'est une heure de rapport
    if (!REPORT_HOURS.includes(parisHour)) return;

    const reportType = parisHour === 8 ? 'morning' : parisHour === 14 ? 'midday' : 'evening';

    console.log(`[Alex Report] Demarrage rapport ${reportType} (${parisHour}H)`);

    // Trouver toutes les orgs actives
    const orgsSnap = await db.collection('organizations')
      .where('prospectionEnabled', '==', true)
      .get();

    for (const orgDoc of orgsSnap.docs) {
      try {
        await generateAndSendReport(orgDoc.id, orgDoc.data(), reportType);
      } catch (error) {
        console.error(`[Alex Report] Erreur ${reportType} pour ${orgDoc.id}:`, error.message);
      }
    }
  }
);

async function generateAndSendReport(organizationId, orgData, reportType) {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Charger stats + mission en parallele
  const [statsToday, missionDoc, prefsDoc, topHot] = await Promise.all([
    loadTodayStats(db, organizationId, today),
    db.doc(`organizations/${organizationId}/alexMemory/currentMission`).get(),
    db.doc(`organizations/${organizationId}/alexMemory/preferences`).get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('alexScore', '>=', 80)
      .orderBy('alexScore', 'desc')
      .limit(3)
      .get(),
  ]);

  const prefs = prefsDoc.exists ? prefsDoc.data() : {};
  const mission = missionDoc.exists ? missionDoc.data() : null;

  // Top hot leads
  const hotLeads = topHot.docs.map(d => {
    const p = d.data();
    return `${p.company || p.companyName || '?'} (${p.alexScore || p.score || 0}/100)`;
  });

  // Construire le prompt selon le type de rapport
  const prompt = buildReportPrompt(reportType, statsToday, mission, hotLeads, orgData);

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 600,
  });

  const reportMessage = response.choices[0].message.content;

  // Envoyer via WhatsApp si configure
  const userPhone = prefs.userWhatsApp || orgData.ownerPhone;
  if (userPhone) {
    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js');
      await sendWhatsAppMessage({
        to: userPhone,
        message: reportMessage,
        organizationId,
        isNotification: true,
      });
    } catch (e) {
      console.warn(`[Alex Report] WhatsApp send failed for ${organizationId}:`, e.message);
    }
  }

  // Sauvegarder le rapport (consultable dans le SaaS)
  const dateKey = today.toISOString().split('T')[0];
  await db.doc(`organizations/${organizationId}/alexReports/${dateKey}_${reportType}`).set({
    type: reportType,
    stats: statsToday,
    mission: mission ? { objective: mission.objective, target: mission.target, current: mission.current } : null,
    hotLeads,
    message: reportMessage,
    sentVia: userPhone ? 'whatsapp' : 'saas_only',
    sentAt: new Date(),
  });

  console.log(`[Alex Report] ${reportType} envoye pour ${organizationId}`);
}

async function loadTodayStats(db, organizationId, today) {
  const [found, contacted, replied, hot, total] = await Promise.all([
    db.collection(`organizations/${organizationId}/prospects`)
      .where('createdAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('contactedAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('repliedAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .where('status', '==', 'hot')
      .count().get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .count().get(),
  ]);

  return {
    foundToday: found.data().count,
    contactedToday: contacted.data().count,
    repliedToday: replied.data().count,
    hotTotal: hot.data().count,
    totalProspects: total.data().count,
  };
}

function buildReportPrompt(reportType, stats, mission, hotLeads, orgData) {
  const missionBlock = mission
    ? `\nMISSION EN COURS : "${mission.objective}"\n- Objectif : ${mission.target} prospects\n- Realise : ${mission.current || 0}/${mission.target}\n- Progression : ${Math.round(((mission.current || 0) / mission.target) * 100)}%\n- Deadline : ${mission.deadline || 'aujourdhui'}`
    : '\nPas de mission specifique en cours.';

  const hotBlock = hotLeads.length > 0
    ? `\nHOT LEADS :\n${hotLeads.map(h => `- ${h}`).join('\n')}`
    : '\nPas de hot lead pour le moment.';

  const headers = {
    morning: 'BRIEFING MATIN (8H)',
    midday: 'POINT MI-JOURNEE (14H)',
    evening: 'BILAN SOIR (21H)',
  };

  const instructions = {
    morning: `C'est le briefing du matin. Presente :
1. L'etat des lieux (prospects totaux, hot leads)
2. La mission du jour (si active) et le plan d'action
3. Ce que tu vas faire dans les prochaines heures
Sois motive et energique. Donne envie de bosser.`,

    midday: `C'est le point mi-journee. Presente :
1. La progression du jour (trouves, contactes, reponses)
2. L'avancement de la mission (% realise)
3. Les ajustements si necessaire
4. Les hot leads a traiter EN PRIORITE
Sois factuel et oriente action.`,

    evening: `C'est le bilan de fin de journee. Presente :
1. Les resultats finaux du jour (chiffres cles)
2. Le bilan de la mission (objectif atteint ou pas ?)
3. Les hot leads a rappeler demain matin
4. Ce que tu prevois pour demain
Sois honnete sur les resultats. Si c'est bien, celebre. Si c'est moyen, dis-le.`,
  };

  return `Tu es Alex, l'associe commercial IA. Genere un rapport ${headers[reportType]} court et percutant (max 10 lignes).

STATS DU JOUR :
- Prospects trouves aujourdhui : ${stats.foundToday}
- Prospects contactes : ${stats.contactedToday}
- Reponses recues : ${stats.repliedToday}
- Hot leads total : ${stats.hotTotal}
- Total prospects en base : ${stats.totalProspects}
${missionBlock}
${hotBlock}

INSTRUCTIONS :
${instructions[reportType]}

REGLES :
- Format texte WhatsApp (pas de HTML, pas de markdown complexe)
- Commence par un emoji adapte + "${headers[reportType]}"
- Utilise des emojis pour structurer (pas trop)
- Tutoie le user
- Max 10 lignes
- Si mission active, mentionne TOUJOURS la progression`;
}
