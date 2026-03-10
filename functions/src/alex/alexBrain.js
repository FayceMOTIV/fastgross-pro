/**
 * alexBrain.js — Le cerveau d'Alex, l'associe commercial IA
 * Chaque message du user passe par cette fonction.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';
import { buildAlexSystemPrompt } from './alexSystemPrompt.js';
import { loadUserContext, loadConversationHistory } from './alexMemory.js';
import { executeAlexActions } from './alexActionExecutor.js';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export const chatWithAlex = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const { message, organizationId } = request.data;
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');
    if (!message) throw new HttpsError('invalid-argument', 'Message requis');

    const db = getDb();

    // 1. Charger le contexte complet du user
    const context = await loadUserContext(organizationId, uid);

    // 2. Charger l'historique de conversation (derniers 20 messages)
    const history = await loadConversationHistory(organizationId, 20);

    // 3. Construire le system prompt d'Alex
    const systemPrompt = buildAlexSystemPrompt(context);

    // 4. Appeler Groq
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    let alexResponse;
    try {
      alexResponse = JSON.parse(response.choices[0].message.content);
    } catch {
      alexResponse = { message: response.choices[0].message.content, actions: [], suggestions: [] };
    }

    // 5. Executer les actions decidees par Alex
    if (alexResponse.actions && alexResponse.actions.length > 0) {
      await executeAlexActions(alexResponse.actions, organizationId, uid);
    }

    // 6. Sauvegarder le message + la reponse dans l'historique
    const batch = db.batch();
    const convRef = db.collection(`organizations/${organizationId}/alexConversations`);

    batch.set(convRef.doc(), {
      role: 'user',
      content: message,
      timestamp: FieldValue.serverTimestamp(),
      userId: uid,
    });

    batch.set(convRef.doc(), {
      role: 'assistant',
      content: alexResponse.message,
      actions: alexResponse.actions || [],
      timestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // 7. Si Alex a mis a jour le profil business, sauvegarder
    if (alexResponse.profileUpdates && Object.keys(alexResponse.profileUpdates).length > 0) {
      await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`)
        .set(alexResponse.profileUpdates, { merge: true });
    }

    return {
      message: alexResponse.message,
      actions: alexResponse.actions || [],
      suggestions: alexResponse.suggestions || [],
    };
  }
);

/**
 * Version interne — appelee par le webhook WhatsApp (sans auth Firebase)
 * Meme logique que chatWithAlex mais avec instruction WhatsApp
 */
export async function chatWithAlexInternal(message, organizationId, userId) {
  const db = getDb();

  const context = await loadUserContext(organizationId, userId);
  const history = await loadConversationHistory(organizationId, 20);
  const systemPrompt = buildAlexSystemPrompt(context);

  const whatsappInstruction = `

## FORMAT WHATSAPP
Tu reponds via WhatsApp. Adapte ton format :
- Messages courts (max 500 caracteres par bulle)
- Si la reponse est longue, decoupe en plusieurs messages courts
- Utilise des emojis naturellement (comme sur WhatsApp entre collegues)
- Propose des BOUTONS quand c'est pertinent (max 3 boutons)
- Propose une LISTE quand il y a plus de 3 choix

Dans ton JSON, ajoute un champ "whatsapp" :
{
  "message": "...",
  "whatsapp": {
    "type": "buttons",
    "buttons": [
      { "id": "action_id", "text": "Texte du bouton (max 20 chars)" }
    ],
    "followUpMessages": ["Deuxieme bulle si necessaire"]
  },
  "actions": [...],
  "suggestions": [...],
  "profileUpdates": {...}
}`;

  const msgs = [
    { role: 'system', content: systemPrompt + whatsappInstruction },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    temperature: 0.4,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  let alexResponse;
  try {
    alexResponse = JSON.parse(response.choices[0].message.content);
  } catch {
    alexResponse = { message: response.choices[0].message.content, actions: [], whatsapp: { type: 'text' } };
  }

  // Executer les actions
  if (alexResponse.actions && alexResponse.actions.length > 0) {
    await executeAlexActions(alexResponse.actions, organizationId, userId);
  }

  // Sauvegarder dans l'historique (partage avec le web)
  const batch = db.batch();
  const convRef = db.collection(`organizations/${organizationId}/alexConversations`);

  batch.set(convRef.doc(), {
    role: 'user',
    content: message,
    timestamp: FieldValue.serverTimestamp(),
    userId,
    via: 'whatsapp',
  });

  batch.set(convRef.doc(), {
    role: 'assistant',
    content: alexResponse.message,
    actions: alexResponse.actions || [],
    timestamp: FieldValue.serverTimestamp(),
    via: 'whatsapp',
  });

  await batch.commit();

  // Si Alex a mis a jour le profil
  if (alexResponse.profileUpdates && Object.keys(alexResponse.profileUpdates).length > 0) {
    await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`)
      .set(alexResponse.profileUpdates, { merge: true });
  }

  return alexResponse;
}
