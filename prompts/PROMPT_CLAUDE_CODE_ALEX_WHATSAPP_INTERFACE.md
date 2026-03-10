# MISSION : ALEX SUR WHATSAPP — Parler à son associé commercial depuis sa poche
# Complément au prompt ALEX_ASSOCIE_COMMERCIAL_IA
# Projet : ~/Projects/face-media-factory
# Stack existant : Evolution API v2.3.7 sur VPS 94.130.184.44:8080, instance fmf-whatsapp3

---

## LA VISION

Le user envoie un WhatsApp à Alex comme il enverrait un message à un collègue :

```
User : "Salut Alex, t'as trouvé quoi aujourd'hui ?"

Alex : "Hey ! Bonne journée 💪
→ 8 nouveaux prospects détectés
→ 3 contactés ce matin
→ 1 a répondu : Marie du Petit Bistrot veut un RDV

Tu veux que je te montre les prospects ?"

[Bouton : 📋 Voir les prospects]
[Bouton : 📞 Appeler Marie]
[Bouton : 📊 Mes stats]
```

```
User : "Trouve-moi 10 restaurants à Bordeaux"

Alex : "Je lance la recherche 🔍"

(30 secondes plus tard)

Alex : "Trouvé ! 14 restaurants à Bordeaux qui matchent ton profil.
Les 3 meilleurs :

1. 🔥 Le Chapon Fin (score 82)
   → Note Google en baisse, pas de résa en ligne
2. 🔥 La Tupina (score 75)
   → Site pas mis à jour depuis 2024
3. ⭐ Brasserie Bordelaise (score 68)
   → Recrute un community manager

Je les contacte ?"

[Bouton : ✅ Contacte les 3]
[Bouton : 📋 Voir les 14]
[Bouton : ✏️ Ajuster la recherche]
```

```
User : "C'est quoi mes stats cette semaine ?"

Alex : "📊 Semaine du 3 au 9 mars :

Prospects trouvés : 47
Contactés : 32
Réponses : 8 (taux 25% 🔥)
RDV obtenus : 2
En attente de réponse : 24

Ton meilleur canal : WhatsApp (35% de réponses)
Ton pire canal : Email (12%)

💡 Conseil : tes messages du mardi marchent 2x mieux que ceux du lundi. Je décale les envois ?"

[Bouton : ✅ Bonne idée]
[Bouton : 📋 Détail par prospect]
```

---

## COMMENT ÇA MARCHE TECHNIQUEMENT

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User envoie │     │  Evolution   │     │  Cloud        │
│  WhatsApp    │────▶│  API webhook │────▶│  Function     │
│  à Alex      │     │  (VPS)       │     │  alexWhatsApp │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  alexBrain   │
                                          │  (Groq)      │
                                          │  = même      │
                                          │  cerveau que  │
                                          │  le chat web  │
                                          └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Formater    │
                                          │  réponse     │
                                          │  WhatsApp    │
                                          │  (boutons,   │
                                          │  listes)     │
                                          └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐     ┌──────────────┐
                                          │  Evolution   │────▶│  User reçoit │
                                          │  API send    │     │  la réponse  │
                                          │  (VPS)       │     │  avec boutons│
                                          └──────────────┘     └──────────────┘
```

Le cerveau est LE MÊME que sur le web (alexBrain.js). Seule la couche de présentation change :
- Sur le web → bulles de chat React
- Sur WhatsApp → messages formatés avec boutons et listes Evolution API

---

## PHASE 1 : RÉCEPTION DES MESSAGES WHATSAPP DU USER

### 1.1 Webhook Evolution API → Cloud Function

Le webhook `evolutionWebhook` existe déjà dans le projet. Il faut le modifier pour :
1. Détecter si le message vient d'un USER FMF (pas d'un prospect)
2. Si oui → router vers alexBrain au lieu du flux prospect

**Fichier : `functions/src/alex/alexWhatsAppHandler.js`**

```javascript
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

const EVOLUTION_API_URL = 'http://94.130.184.44:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; // fmf-evolution-key-2026
const EVOLUTION_INSTANCE = 'fmf-whatsapp3';

// Cette fonction est appelée par le webhook Evolution API
// quand un message est reçu sur le numéro FMF
export const alexWhatsAppIncoming = onRequest(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 60,
    cors: true,
  },
  async (req, res) => {
    try {
      const { event, data, instance } = req.body;
      
      // On ne traite que les messages entrants
      if (event !== 'messages.upsert') {
        res.status(200).send('OK');
        return;
      }
      
      const message = data;
      const senderPhone = message.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const messageText = message.message?.conversation 
        || message.message?.extendedTextMessage?.text
        || message.message?.buttonsResponseMessage?.selectedButtonId
        || message.message?.listResponseMessage?.singleSelectReply?.selectedRowId
        || '';
      const isFromMe = message.key?.fromMe;
      
      // Ignorer les messages envoyés par nous-mêmes
      if (isFromMe || !senderPhone || !messageText) {
        res.status(200).send('OK');
        return;
      }
      
      console.log(`📱 WhatsApp reçu de ${senderPhone}: "${messageText}"`);
      
      // Vérifier si ce numéro appartient à un user FMF
      const userMapping = await db.collection('whatsappUserMappings')
        .where('phone', '==', senderPhone)
        .limit(1)
        .get();
      
      if (userMapping.empty) {
        // Ce n'est PAS un user FMF → c'est un PROSPECT qui répond
        // Router vers le flux prospect existant (evolutionWebhook)
        console.log(`📱 Message d'un prospect (non-user), routing vers flux prospect`);
        await handleProspectReply(senderPhone, messageText, message);
        res.status(200).send('OK');
        return;
      }
      
      // C'est un USER FMF qui parle à Alex !
      const userData = userMapping.docs[0].data();
      const { organizationId, userId } = userData;
      
      console.log(`🤖 User FMF ${senderPhone} parle à Alex (org: ${organizationId})`);
      
      // Envoyer le "typing" indicator
      await sendTypingIndicator(senderPhone);
      
      // Appeler le cerveau d'Alex (même que le web)
      const { chatWithAlexInternal } = await import('./alexBrain.js');
      const alexResponse = await chatWithAlexInternal(messageText, organizationId, userId);
      
      // Formater la réponse pour WhatsApp
      await sendAlexWhatsAppResponse(senderPhone, alexResponse);
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Erreur alexWhatsAppIncoming:', error);
      res.status(200).send('OK'); // Toujours 200 pour éviter les retries Evolution API
    }
  }
);

async function handleProspectReply(phone, text, rawMessage) {
  // Trouver le prospect dans Firestore par numéro de téléphone
  // et traiter sa réponse (classification, alerte user, etc.)
  // Réutiliser la logique existante dans evolutionWebhook
  const prospects = await db.collectionGroup('prospects')
    .where('phone', '==', phone)
    .limit(1)
    .get();
  
  if (!prospects.empty) {
    const prospectRef = prospects.docs[0].ref;
    await prospectRef.update({
      lastReply: text,
      repliedAt: new Date(),
      status: 'replied',
    });
    
    // La Cloud Function alertHotLead (du prompt précédent) 
    // se déclenchera automatiquement via onDocumentUpdated
  }
}
```

### 1.2 Fonction interne alexBrain (sans auth HTTP)

Ajouter dans `functions/src/alex/alexBrain.js` une version interne appelable sans auth Firebase :

```javascript
// Version interne (appelée par le webhook WhatsApp, pas par le SDK client)
export async function chatWithAlexInternal(message, organizationId, userId) {
  // Même logique que chatWithAlex mais sans vérification auth Firebase
  const context = await loadUserContext(organizationId, userId);
  const history = await loadConversationHistory(organizationId, 20);
  const systemPrompt = buildAlexSystemPrompt(context);

  // Ajouter une instruction spécifique pour WhatsApp
  const whatsappInstruction = `

## FORMAT WHATSAPP
Tu réponds via WhatsApp. Adapte ton format :
- Messages courts (max 500 caractères par bulle)
- Si la réponse est longue, découpe en plusieurs messages courts
- Utilise des emojis naturellement (comme sur WhatsApp entre collègues)
- Propose des BOUTONS quand c'est pertinent (max 3 boutons)
- Propose une LISTE quand il y a plus de 3 choix

Dans ton JSON, ajoute un champ "whatsapp" :
{
  "message": "...",
  "whatsapp": {
    "type": "buttons",          // "text" | "buttons" | "list"
    "buttons": [                // max 3 boutons
      { "id": "action_id", "text": "Texte du bouton (max 20 chars)" }
    ],
    "list": {                   // OU une liste (max 10 sections)
      "buttonText": "Voir les options",
      "sections": [
        {
          "title": "Section 1",
          "rows": [
            { "id": "row_id", "title": "Titre (max 24 chars)", "description": "Description courte" }
          ]
        }
      ]
    },
    "followUpMessages": [       // messages additionnels envoyés après le premier
      "Deuxième bulle de texte si nécessaire"
    ]
  },
  "actions": [...],
  "profileUpdates": {...}
}`;

  const messages = [
    { role: 'system', content: systemPrompt + whatsappInstruction },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.4,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const alexResponse = JSON.parse(response.choices[0].message.content);

  // Exécuter les actions
  if (alexResponse.actions?.length > 0) {
    const { executeAlexActions } = await import('./alexActionExecutor.js');
    await executeAlexActions(alexResponse.actions, organizationId, userId);
  }

  // Sauvegarder dans l'historique (partagé avec le web)
  const convRef = db.collection(`organizations/${organizationId}/alexConversations`);
  await convRef.add({ role: 'user', content: message, timestamp: new Date(), userId, via: 'whatsapp' });
  await convRef.add({ role: 'assistant', content: alexResponse.message, actions: alexResponse.actions || [], timestamp: new Date(), via: 'whatsapp' });

  // Sauvegarder le profil si mis à jour
  if (alexResponse.profileUpdates) {
    await db.doc(`organizations/${organizationId}/alexMemory/businessProfile`)
      .set(alexResponse.profileUpdates, { merge: true });
  }

  return alexResponse;
}
```

---

## PHASE 2 : ENVOI DES RÉPONSES RICHES

### 2.1 Envoi de réponses formatées via Evolution API

**Fichier : `functions/src/alex/alexWhatsAppSender.js`**

```javascript
const EVOLUTION_API_URL = 'http://94.130.184.44:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = 'fmf-whatsapp3';

// Envoyer la réponse d'Alex formatée pour WhatsApp
export async function sendAlexWhatsAppResponse(phone, alexResponse) {
  const jid = `${phone}@s.whatsapp.net`;
  const wa = alexResponse.whatsapp || { type: 'text' };
  
  // 1. Envoyer le message principal
  switch (wa.type) {
    case 'buttons':
      await sendButtonMessage(jid, alexResponse.message, wa.buttons);
      break;
      
    case 'list':
      await sendListMessage(jid, alexResponse.message, wa.list);
      break;
      
    default:
      await sendTextMessage(jid, alexResponse.message);
  }
  
  // 2. Envoyer les messages de suivi (si plusieurs bulles)
  if (wa.followUpMessages) {
    for (const followUp of wa.followUpMessages) {
      await sleep(1500); // Délai naturel entre les bulles
      await sendTextMessage(jid, followUp);
    }
  }
}

// Message texte simple
async function sendTextMessage(jid, text) {
  await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: jid.replace('@s.whatsapp.net', ''),
      text: text,
      delay: 1200, // Délai naturel
    }),
  });
}

// Message avec boutons (max 3)
async function sendButtonMessage(jid, text, buttons) {
  // Evolution API v2 — Boutons interactifs
  // Note : les boutons natifs WhatsApp ne fonctionnent que via Cloud API (pas Baileys)
  // Avec Baileys (notre cas), on utilise les boutons "template" ou on simule avec du texte formaté
  
  try {
    // Tentative avec l'API boutons d'Evolution API
    await fetch(`${EVOLUTION_API_URL}/message/sendButtons/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: jid.replace('@s.whatsapp.net', ''),
        title: 'Alex',
        description: text,
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.text.substring(0, 20), // Max 20 caractères pour les boutons
          },
        })),
      }),
    });
  } catch (error) {
    // Fallback : envoyer en texte formaté si les boutons ne marchent pas
    const buttonText = buttons.map((b, i) => `${i + 1}️⃣ ${b.text}`).join('\n');
    const fallbackText = `${text}\n\n${buttonText}\n\n_Réponds avec le numéro de ton choix_`;
    await sendTextMessage(jid, fallbackText);
  }
}

// Message avec liste (plus de 3 options)
async function sendListMessage(jid, text, list) {
  try {
    await fetch(`${EVOLUTION_API_URL}/message/sendList/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: jid.replace('@s.whatsapp.net', ''),
        title: 'Alex',
        description: text,
        buttonText: list.buttonText || 'Voir les options',
        footerText: 'Face Media Factory',
        sections: list.sections.map(section => ({
          title: section.title,
          rows: section.rows.map(row => ({
            rowId: row.id,
            title: row.title.substring(0, 24), // Max 24 chars
            description: row.description?.substring(0, 72) || '', // Max 72 chars
          })),
        })),
      }),
    });
  } catch (error) {
    // Fallback texte
    let fallbackText = text + '\n';
    for (const section of list.sections) {
      fallbackText += `\n*${section.title}*\n`;
      section.rows.forEach((row, i) => {
        fallbackText += `${i + 1}. ${row.title}${row.description ? ' — ' + row.description : ''}\n`;
      });
    }
    fallbackText += '\n_Réponds avec le numéro de ton choix_';
    await sendTextMessage(jid, fallbackText);
  }
}

// Indicateur "en train d'écrire..."
export async function sendTypingIndicator(phone) {
  try {
    await fetch(`${EVOLUTION_API_URL}/chat/presence/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: `${phone}@s.whatsapp.net`,
        delay: 3000,
        presence: 'composing',
      }),
    });
  } catch (error) {
    // Pas critique si ça échoue
  }
}

// Envoyer une image (pour les graphiques, rapports visuels)
export async function sendImageMessage(phone, imageUrl, caption) {
  await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: 'image',
      media: imageUrl,
      caption: caption || '',
    }),
  });
}

// Envoyer un document (PDF de rapport)
export async function sendDocumentMessage(phone, documentUrl, filename) {
  await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      mediatype: 'document',
      media: documentUrl,
      fileName: filename || 'rapport-alex.pdf',
    }),
  });
}

// Envoyer un audio (message vocal d'Alex)
export async function sendAudioMessage(phone, audioUrl) {
  await fetch(`${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      audio: audioUrl,
    }),
  });
}

// Envoyer la localisation d'un prospect
export async function sendLocationMessage(phone, lat, lng, name, address) {
  await fetch(`${EVOLUTION_API_URL}/message/sendLocation/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      latitude: lat,
      longitude: lng,
      name: name,
      address: address,
    }),
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## PHASE 3 : GESTION DES RÉPONSES AUX BOUTONS ET LISTES

### 3.1 Mapper les interactions boutons → actions Alex

Quand le user clique un bouton ou sélectionne un élément de liste, le webhook reçoit l'ID.
Il faut mapper ces IDs vers des commandes pour Alex.

**Ajouter dans `alexWhatsAppHandler.js` :**

```javascript
// Détecte si le message est une réponse à un bouton/liste
function parseButtonResponse(message) {
  // Réponse à un bouton
  if (message.message?.buttonsResponseMessage) {
    return {
      type: 'button',
      id: message.message.buttonsResponseMessage.selectedButtonId,
      text: message.message.buttonsResponseMessage.selectedDisplayText,
    };
  }
  
  // Réponse à une liste
  if (message.message?.listResponseMessage) {
    return {
      type: 'list',
      id: message.message.listResponseMessage.singleSelectReply?.selectedRowId,
      title: message.message.listResponseMessage.title,
    };
  }
  
  // Réponse numérique (fallback si boutons pas supportés)
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  const numMatch = text.match(/^(\d)$/);
  if (numMatch) {
    return {
      type: 'number',
      id: `option_${numMatch[1]}`,
      text: text,
    };
  }
  
  return null;
}
```

Le buttonResponse est converti en texte naturel avant d'être envoyé à alexBrain.
Par exemple, si le user clique "📋 Voir les prospects", on envoie à Alex le message "Montre-moi les prospects".

```javascript
// Convertir la réponse bouton en message naturel pour Alex
function buttonToNaturalMessage(buttonResponse) {
  const mappings = {
    'view_prospects': 'Montre-moi les prospects',
    'contact_all': 'Contacte-les tous',
    'contact_top3': 'Contacte les 3 meilleurs',
    'view_stats': 'Montre-moi mes stats',
    'adjust_search': 'Je veux ajuster la recherche',
    'yes_go': 'Oui vas-y',
    'good_idea': 'Bonne idée, fais-le',
    'detail_prospect': 'Donne-moi plus de détails',
    'call_prospect': 'Je vais l\'appeler',
    'daily_report': 'Envoie-moi un rapport',
    'pause': 'Mets en pause',
    'resume': 'Reprends la prospection',
  };
  
  return mappings[buttonResponse.id] || buttonResponse.text || buttonResponse.id;
}
```

---

## PHASE 4 : ENREGISTREMENT DU USER (LIER WHATSAPP → COMPTE FMF)

### 4.1 Le user connecte son WhatsApp à son compte FMF

**Depuis l'app web (Settings) :**

Le user entre son numéro de téléphone dans les réglages. FMF envoie un code de vérification par WhatsApp. Le user saisit le code. Son numéro est lié à son compte.

**Fichier : `functions/src/alex/alexWhatsAppLink.js`**

```javascript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Étape 1 : Envoyer un code de vérification
export const sendWhatsAppVerification = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const { phone } = request.data;
    const uid = request.auth?.uid;
    if (!uid || !phone) throw new HttpsError('invalid-argument', 'Phone requis');
    
    // Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    
    // Sauvegarder le code (expire dans 10 minutes)
    await db.collection('whatsappVerifications').doc(uid).set({
      phone: phone.replace(/\D/g, ''), // Nettoyer le numéro
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });
    
    // Envoyer le code par WhatsApp
    const { sendTextMessage } = await import('./alexWhatsAppSender.js');
    await sendTextMessage(
      `${phone.replace(/\D/g, '')}@s.whatsapp.net`,
      `🔐 Votre code de vérification Face Media Factory : *${code}*\n\nCe code expire dans 10 minutes.`
    );
    
    return { sent: true };
  }
);

// Étape 2 : Vérifier le code et lier le compte
export const verifyWhatsAppCode = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const { code } = request.data;
    const uid = request.auth?.uid;
    if (!uid || !code) throw new HttpsError('invalid-argument', 'Code requis');
    
    const verif = await db.collection('whatsappVerifications').doc(uid).get();
    if (!verif.exists) throw new HttpsError('not-found', 'Aucune vérification en cours');
    
    const data = verif.data();
    if (data.code !== code) throw new HttpsError('permission-denied', 'Code incorrect');
    if (new Date() > data.expiresAt.toDate()) throw new HttpsError('deadline-exceeded', 'Code expiré');
    
    // Récupérer l'organizationId du user
    const userDoc = await db.collection('users').doc(uid).get();
    const organizationId = userDoc.data()?.organizationId;
    
    // Créer le mapping WhatsApp → user FMF
    await db.collection('whatsappUserMappings').doc(data.phone).set({
      phone: data.phone,
      userId: uid,
      organizationId,
      linkedAt: new Date(),
      active: true,
    });
    
    // Sauvegarder dans les préférences Alex
    await db.doc(`organizations/${organizationId}/alexMemory/preferences`).set({
      userWhatsApp: data.phone,
    }, { merge: true });
    
    // Marquer comme vérifié
    await db.collection('whatsappVerifications').doc(uid).update({ verified: true });
    
    // Envoyer le message de bienvenue
    const { sendTextMessage } = await import('./alexWhatsAppSender.js');
    await sendTextMessage(
      `${data.phone}@s.whatsapp.net`,
      `✅ Ton WhatsApp est connecté à Face Media Factory !\n\nJe suis Alex, ton associé commercial. Tu peux me parler ici comme sur l'app.\n\nEssaie : "Salut Alex, c'est quoi mes stats ?" 💪`
    );
    
    return { verified: true, phone: data.phone };
  }
);
```

---

## PHASE 5 : COMMANDES RAPIDES WHATSAPP

### 5.1 Commandes que le user peut taper rapidement

Alex comprend le langage naturel, mais on ajoute des raccourcis :

```
"stats"           → Résumé des KPIs
"prospects"       → Liste des derniers prospects
"chauds"          → Prospects chauds en attente
"pause"           → Met la prospection en pause
"go" / "reprends" → Reprend la prospection
"rapport"         → Envoie le rapport immédiatement
"aide"            → Liste des commandes disponibles
```

Ces raccourcis sont détectés AVANT d'appeler Groq (économise des tokens) :

**Ajouter dans `alexWhatsAppHandler.js` :**

```javascript
const QUICK_COMMANDS = {
  'stats': 'Montre-moi mes stats de cette semaine',
  'prospects': 'Montre-moi les derniers prospects trouvés',
  'chauds': 'Quels sont les prospects chauds en attente ?',
  'pause': 'Mets la prospection en pause',
  'go': 'Reprends la prospection',
  'reprends': 'Reprends la prospection',
  'rapport': 'Envoie-moi le rapport maintenant',
  'aide': null, // Traitement spécial
  'help': null,
};

function handleQuickCommand(messageText) {
  const normalized = messageText.trim().toLowerCase();
  
  if (normalized === 'aide' || normalized === 'help') {
    return {
      isQuickCommand: true,
      skipBrain: true,
      response: {
        message: `🤖 *Commandes rapides Alex :*\n\n📊 *stats* — Tes KPIs de la semaine\n👥 *prospects* — Derniers prospects trouvés\n🔥 *chauds* — Prospects chauds en attente\n⏸️ *pause* — Mettre en pause\n▶️ *go* — Reprendre\n📋 *rapport* — Rapport immédiat\n\nOu parle-moi naturellement, je comprends tout 😉`,
        whatsapp: { type: 'text' },
      },
    };
  }
  
  if (QUICK_COMMANDS[normalized] !== undefined) {
    return {
      isQuickCommand: true,
      skipBrain: false,
      expandedMessage: QUICK_COMMANDS[normalized],
    };
  }
  
  return { isQuickCommand: false };
}
```

---

## PHASE 6 : COMPOSANT SETTINGS WEB POUR LIER WHATSAPP

### 6.1 WhatsAppLinkSettings.jsx

**Fichier : `src/components/settings/WhatsAppLinkSettings.jsx`**

Composant dans la page Settings :

- Titre : "Connecter Alex à ton WhatsApp"
- Description : "Parle à Alex directement depuis WhatsApp. Reçois tes rapports et alertes sur ton téléphone."
- Input numéro de téléphone (format international +33...)
- Bouton "Envoyer le code"
- Input code de vérification (6 chiffres)
- Bouton "Vérifier"
- État connecté : badge vert + numéro + bouton "Déconnecter"
- Toggle : "Recevoir le rapport quotidien par WhatsApp" + sélecteur horaire (dropdown)

---

## PHASE 7 : EXPORT ET DÉPLOIEMENT

### 7.1 Nouvelles Cloud Functions à exporter

```javascript
// functions/src/alex/index.js — AJOUTER
export { alexWhatsAppIncoming } from './alexWhatsAppHandler.js';
export { sendWhatsAppVerification, verifyWhatsAppCode } from './alexWhatsAppLink.js';
```

### 7.2 Collection Firestore supplémentaire

```
whatsappUserMappings/{phone}
  phone: string              — numéro du user
  userId: string             — uid Firebase
  organizationId: string     — tenant
  linkedAt: timestamp
  active: boolean

whatsappVerifications/{userId}
  phone: string
  code: string (6 digits)
  expiresAt: timestamp
  verified: boolean
```

### 7.3 Configurer le webhook Evolution API

Le webhook Evolution API sur le VPS doit pointer vers la NOUVELLE Cloud Function :

```bash
# Sur le VPS, mettre à jour le webhook de l'instance fmf-whatsapp3
curl -X PUT "http://94.130.184.44:8080/webhook/set/fmf-whatsapp3" \
  -H "apikey: fmf-evolution-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://europe-west1-face-media-factory.cloudfunctions.net/alexWhatsAppIncoming",
      "webhookByEvents": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

### 7.4 Firestore Security Rules

```
match /whatsappUserMappings/{phone} {
  allow read: if request.auth != null;
  allow write: if false; // Cloud Functions seulement
}

match /whatsappVerifications/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false; // Cloud Functions seulement
}
```

### 7.5 Tests

```bash
# 1. Déployer
firebase deploy --only functions

# 2. Lier un WhatsApp depuis l'app web
# → Entrer numéro → Recevoir code → Vérifier

# 3. Envoyer "Salut Alex" depuis WhatsApp
# → Alex doit répondre avec le message d'accueil

# 4. Envoyer "stats" depuis WhatsApp
# → Alex doit répondre avec les KPIs

# 5. Envoyer "Trouve-moi des restaurants à Lyon"
# → Alex doit lancer la recherche et répondre avec les résultats + boutons

# 6. Cliquer sur un bouton
# → Alex doit exécuter l'action correspondante

# 7. Tester le fallback texte (si boutons pas supportés)
# → Le message doit s'afficher avec les options numérotées
```

---

## ORDRE D'EXÉCUTION

1. **Phase 4** (en premier !) : Lien WhatsApp → compte FMF (verification flow)
2. **Phase 1** : Réception des messages (webhook handler)
3. **Phase 2** : Envoi des réponses riches (boutons, listes, images)
4. **Phase 3** : Gestion des réponses aux boutons
5. **Phase 5** : Commandes rapides
6. **Phase 6** : Composant Settings
7. **Phase 7** : Configuration webhook VPS + déploiement + tests

IMPORTANT : Ce prompt nécessite que le prompt ALEX_ASSOCIE_COMMERCIAL_IA soit implémenté d'abord (alexBrain.js, alexMemory.js, etc.).
