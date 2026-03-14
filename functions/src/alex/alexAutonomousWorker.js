/**
 * alexAutonomousWorker.js — Alex travaille meme quand le user dort
 * Tourne toutes les heures, execute les strategies actives de chaque org.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// Lazy imports (evite de charger toute la chaine channelDispatcher/compliance/senders au boot)
const getChannelRouter = async () => import('../engine/channelRouter.js');
const getChannelDispatcher = async () => import('../engine/channelDispatcher.js');
const getBudgetCalculator = async () => import('../orchestrator/helpers/budgetCalculator.js');

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

    // Selectionner le canal optimal
    const { selectOptimalChannel } = await getChannelRouter();
    const routerResult = await selectOptimalChannel(orgId, doc.id);
    const channel = routerResult.channel;
    if (!channel) {
      console.log(`[Alex Worker] Aucun canal dispo pour ${doc.id}: ${routerResult.reason}`);
      continue;
    }

    // Verifier le budget quotidien
    const { getRemainingBudget } = await getBudgetCalculator();
    const remaining = await getRemainingBudget(orgId, channel);
    if (remaining <= 0) {
      console.log(`[Alex Worker] Budget ${channel} epuise pour ${orgId}`);
      break;
    }

    // Generer un message personnalise
    const message = await generatePersonalizedMessage(orgId, prospect);
    if (!message) continue;

    // Fallback channels (alternatives du routeur)
    const fallbackChannels = (routerResult.alternatives || []).slice(0, 2);

    // Envoi reel via le channel dispatcher
    const { dispatchMessage } = await getChannelDispatcher();
    const res = await dispatchMessage(orgId, doc.id, {
      channel,
      content: message,
      subject: `Proposition ${prospect.companyName || ''}`.trim(),
      fallbackChannels,
    });

    if (res.success) {
      await doc.ref.update({
        status: 'contacted',
        contactedAt: FieldValue.serverTimestamp(),
        contactMessage: message,
        contactChannel: res.channel,
      });
      const { recordBudgetUsage } = await getBudgetCalculator();
      await recordBudgetUsage(orgId, res.channel);
      contacted++;
    } else {
      console.warn(`[Alex Worker] Echec envoi ${doc.id} via ${channel}: ${res.error}`);
    }
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
    const followUpCount = prospect.followUpCount || 0;
    if (followUpCount >= 3) continue;

    // Reutiliser le canal du premier contact, sinon router
    const channel = prospect.contactChannel || null;

    // Verifier le budget
    if (channel) {
      const { getRemainingBudget } = await getBudgetCalculator();
      const remaining = await getRemainingBudget(orgId, channel);
      if (remaining <= 0) {
        console.log(`[Alex Worker] Budget ${channel} epuise pour relance ${orgId}`);
        continue;
      }
    }

    // Generer un message de relance adapte au numero de relance
    const message = await generateFollowUpMessage(orgId, prospect, followUpCount + 1);
    if (!message) continue;

    // Dispatcher la relance
    const { dispatchMessage } = await getChannelDispatcher();
    const res = await dispatchMessage(orgId, doc.id, {
      channel,
      content: message,
      subject: `Relance ${prospect.companyName || ''}`.trim(),
    });

    if (res.success) {
      await doc.ref.update({
        followUpCount: followUpCount + 1,
        lastFollowUpAt: FieldValue.serverTimestamp(),
        lastFollowUpChannel: res.channel,
      });
      const { recordBudgetUsage } = await getBudgetCalculator();
      await recordBudgetUsage(orgId, res.channel);
      followedUp++;
    } else {
      console.warn(`[Alex Worker] Echec relance ${doc.id}: ${res.error}`);
    }
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

async function generateFollowUpMessage(orgId, prospect, followUpNumber) {
  const db = getDb();
  const profile = (await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get()).data();
  if (!profile) return null;

  const angles = {
    1: `Relance #1 : Apporte une NOUVELLE VALEUR (astuce, stat, insight) liee au secteur du prospect. Ne repete pas le premier message. Commence par "Je repensais a..." ou "Un detail qui pourrait vous interesser..."`,
    2: `Relance #2 : Utilise la PREUVE SOCIALE (resultat client similaire, temoignage, chiffre). Commence par "Un de mes clients dans [secteur similaire]..." ou "Recemment, j'ai aide..."`,
    3: `Relance #3 : Message FINAL, direct et honnete. Derniere tentative. Commence par "Je ne veux pas insister..." ou "Dernier message de ma part..."`,
  };

  const angle = angles[followUpNumber] || angles[3];

  try {
    const prompt = `Tu es Alex. Genere un message de RELANCE (tentative ${followUpNumber}/3).

TON CLIENT :
- Activite : ${profile.activity || 'Non renseigne'}
- Services : ${profile.services || 'Non renseigne'}

LE PROSPECT :
- Nom : ${prospect.contactName || prospect.companyName || 'Inconnu'}
- Entreprise : ${prospect.companyName || 'Non renseigne'}
- Secteur : ${prospect.sector || 'Non renseigne'}
- Premier message envoye : ${prospect.contactMessage ? 'oui' : 'non'}

ANGLE DE RELANCE :
${angle}

REGLES :
- Max 3 phrases
- NE REPETE PAS le premier message
- Ton naturel, pas robotique
- Termine par une question fermee (oui/non facile)

Reponds uniquement avec le message.`;

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  } catch (e) {
    console.warn(`[Alex Worker] Follow-up #${followUpNumber} generation failed:`, e.message);
    return null;
  }
}
