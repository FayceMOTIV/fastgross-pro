/**
 * alexAutonomousWorker.js — Alex travaille meme quand le user dort
 * Tourne toutes les heures, execute les strategies actives de chaque org.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export const alexAutonomousWorker = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb();
    console.log('[Alex Worker] Lancement...');

    // Recuperer toutes les organisations avec une strategie active
    const strategiesSnap = await db.collectionGroup('alexMemory').get();

    let processed = 0;
    for (const doc of strategiesSnap.docs) {
      const data = doc.data();
      if (data.status !== 'active') continue;

      const orgId = doc.ref.parent.parent.id;

      try {
        // Verifier business hours (8h-20h Europe/Paris)
        const hour = new Date().toLocaleString('fr-FR', { hour: 'numeric', timeZone: 'Europe/Paris' });
        const hourNum = parseInt(hour);
        if (hourNum < 8 || hourNum >= 20) {
          console.log(`[Alex Worker] Hors heures ouvrables pour ${orgId}, skip`);
          continue;
        }

        // Auto-contacter les nouveaux prospects
        await autoContactNewProspects(orgId, data);

        // Auto-relance les prospects sans reponse
        await autoFollowUp(orgId, data);

        processed++;
      } catch (error) {
        console.error(`[Alex Worker] Erreur pour ${orgId}:`, error.message);
      }
    }

    console.log(`[Alex Worker] Termine. ${processed} orgs traitees.`);
  }
);

async function autoContactNewProspects(orgId, strategy) {
  const db = getDb();
  const threshold = strategy.autoContactThreshold || 50;

  const uncontacted = await db.collection(`organizations/${orgId}/prospects`)
    .where('status', '==', 'new')
    .where('foundByAlex', '==', true)
    .orderBy('finalScore', 'desc')
    .limit(10)
    .get();

  let contacted = 0;
  for (const doc of uncontacted.docs) {
    const prospect = doc.data();
    if ((prospect.finalScore || 0) < threshold) continue;

    // Generer un message personnalise
    const message = await generatePersonalizedMessage(orgId, prospect);
    if (!message) continue;

    // Marquer comme contacte (le dispatch reel se fait via le channel dispatcher)
    await doc.ref.update({
      status: 'contacted',
      contactedAt: FieldValue.serverTimestamp(),
      contactMessage: message,
      contactChannel: prospect.phone ? 'whatsapp' : 'email',
    });

    contacted++;
  }

  if (contacted > 0) {
    console.log(`[Alex Worker] ${contacted} prospects contactes pour ${orgId}`);
  }
}

async function autoFollowUp(orgId, strategy) {
  const db = getDb();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const noReply = await db.collection(`organizations/${orgId}/prospects`)
    .where('status', '==', 'contacted')
    .where('contactedAt', '<', twoDaysAgo)
    .limit(5)
    .get();

  let followedUp = 0;
  for (const doc of noReply.docs) {
    const prospect = doc.data();
    if ((prospect.followUpCount || 0) >= 3) continue;

    await doc.ref.update({
      followUpCount: (prospect.followUpCount || 0) + 1,
      lastFollowUpAt: FieldValue.serverTimestamp(),
    });

    followedUp++;
  }

  if (followedUp > 0) {
    console.log(`[Alex Worker] ${followedUp} relances pour ${orgId}`);
  }
}

async function generatePersonalizedMessage(orgId, prospect) {
  const db = getDb();
  const profile = (await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get()).data();
  if (!profile) return null;

  try {
    const prompt = `Tu es Alex. Genere un message de prospection WhatsApp personnalise.

TON CLIENT (celui qui envoie) :
- Activite : ${profile.activity || 'Non renseigne'}
- Services : ${profile.services || 'Non renseigne'}

LE PROSPECT (celui qui recoit) :
- Nom : ${prospect.contactName || prospect.companyName || 'Inconnu'}
- Entreprise : ${prospect.companyName || 'Non renseigne'}
- Secteur : ${prospect.sector || 'Non renseigne'}

REGLES :
- Max 3 phrases
- Propose une solution concrete
- Termine par une question ouverte
- Ton amical et professionnel
- PAS de formule de politesse longue

Reponds uniquement avec le message.`;

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  } catch (e) {
    console.warn('[Alex Worker] Message generation failed:', e.message);
    return null;
  }
}
