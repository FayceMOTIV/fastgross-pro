# MISSION : ALEX — L'ASSOCIÉ COMMERCIAL IA
# Le user ne voit pas le moteur. Le moteur est une fusée nucléaire. Il parle juste à Alex.
# Projet : ~/Projects/face-media-factory
# Stack : React/Vite/Tailwind + Firebase (europe-west1) + Groq (llama-3.3-70b) + VPS Python 94.130.184.44

---

## LA VISION EN UNE PHRASE

> Le user ouvre FMF. Il voit un chat. Il dit ce qu'il veut. Alex fait le reste.

Alex n'est pas un chatbot. Alex n'est pas un assistant. Alex est un **associé commercial** qui :
- Comprend le business du user comme un collègue de 10 ans
- Choisit les meilleures sources pour la niche du user
- Trouve les prospects, les qualifie, les contacte
- Rend des comptes tous les jours par WhatsApp et email
- Prévient en temps réel quand un prospect chaud se manifeste

---

## CE QUE LE USER VOIT

### Écran principal : UN CHAT avec Alex

Pas de dashboard complexe en premier. Le premier écran = une conversation.

```
┌─────────────────────────────────────────────┐
│  🤖 Alex — Votre associé commercial         │
│                                              │
│  Alex : Salut ! Je suis Alex, ton associé    │
│  commercial IA. Dis-moi ce que tu fais et    │
│  quel type de clients tu cherches, je        │
│  m'occupe du reste.                          │
│                                              │
│  User : Je suis plombier à Marseille, je     │
│  cherche des clients particuliers qui ont    │
│  des problèmes de fuite                     │
│                                              │
│  Alex : Top ! Pour être ultra efficace,      │
│  j'ai quelques questions :                   │
│  1. Tu interviens dans quel rayon autour     │
│     de Marseille ?                           │
│  2. Tu fais chauffage + plomberie ou juste   │
│     plomberie ?                              │
│  3. Quel est ton tarif moyen d'intervention ?│
│  4. Tu préfères qu'on te contacte par        │
│     WhatsApp ou téléphone ?                  │
│                                              │
│  User : 30km autour, plomberie + chauffage,  │
│  120€ de l'heure, WhatsApp                   │
│                                              │
│  Alex : Parfait, voici ce que je vais faire :│
│                                              │
│  📋 MA STRATÉGIE POUR TOI :                  │
│                                              │
│  1. Scanner les forums locaux et Nextdoor    │
│     pour les gens qui signalent des fuites   │
│  2. Surveiller les avis Google négatifs des  │
│     plombiers concurrents dans ton rayon     │
│  3. Détecter les permis de construire récents│
│     (rénovation = besoin de plombier)        │
│  4. Contacter les prospects par WhatsApp     │
│     avec un message personnalisé             │
│  5. Te prévenir sur WhatsApp dès qu'un       │
│     prospect veut te parler                  │
│                                              │
│  Objectif : 15 prospects qualifiés/semaine   │
│                                              │
│  Je lance ? 🚀                               │
│                                              │
│  User : Go !                                 │
│                                              │
│  Alex : C'est parti ! Je te fais un premier  │
│  rapport demain matin à 8h. En attendant,    │
│  je commence à chercher. 💪                   │
│                                              │
│  ─────────────────────────────────────────   │
│  [Tapez votre message...]            [Envoyer]│
└─────────────────────────────────────────────┘
```

### Navigation secondaire (sidebar ou bottom nav)

```
💬 Alex          ← Le chat (écran principal)
👥 Prospects     ← Liste/CRM des prospects trouvés par Alex
📊 Tableau de bord ← KPIs, stats, performances
⚙️ Réglages      ← Profil, canaux, notifications
```

Le user peut aller voir ses prospects, ses stats, ses réglages. Mais il REVIENT toujours au chat avec Alex pour piloter. C'est comme WhatsApp Business : tu parles, ça se passe.

---

## ARCHITECTURE TECHNIQUE

### Le cerveau d'Alex : 5 couches

```
┌─────────────────────────────────────────────────┐
│              COUCHE 1 : COMPRÉHENSION            │
│  Alex comprend ce que le user veut               │
│  → NLU (Natural Language Understanding)          │
│  → Détecte l'intention : chercher prospects,     │
│    modifier stratégie, voir résultats, question  │
│  → Extrait les entités : niche, ville, budget... │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              COUCHE 2 : MÉMOIRE                  │
│  Alex connaît le business du user                │
│  → businessProfile (Firestore)                   │
│  → Historique des conversations                  │
│  → KPIs actuels (prospects trouvés, contactés..) │
│  → Préférences (canaux, horaires, ton)           │
│  → Ce qui a marché / pas marché avant            │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              COUCHE 3 : STRATÈGE                 │
│  Alex décide quoi faire                          │
│  → Choisit les sources pertinentes pour la niche │
│  → Définit la stratégie de prospection           │
│  → Adapte en fonction des résultats              │
│  → Propose des ajustements proactifs             │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              COUCHE 4 : EXÉCUTEUR                │
│  Alex fait le travail                            │
│  → Lance les scans (20 boosters)                 │
│  → Contacte les prospects (WhatsApp/Email/SMS)   │
│  → Gère les réponses et les relances             │
│  → Score et qualifie en continu                  │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              COUCHE 5 : RAPPORTEUR               │
│  Alex rend des comptes                           │
│  → Rapport quotidien WhatsApp/email à 8h         │
│  → Alerte temps réel si prospect chaud           │
│  → Résumé hebdo avec recommandations             │
│  → Répond aux questions sur les KPIs             │
└─────────────────────────────────────────────────┘
```

---

## PHASE 1 : LE CERVEAU D'ALEX (Groq + Firestore)

### 1.1 La conversation intelligente

**Fichier : `functions/src/alex/alexBrain.js`**

C'est le cœur du système. Chaque message du user passe par cette fonction.

```javascript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const db = getFirestore();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const alexResponse = JSON.parse(response.choices[0].message.content);

    // 5. Exécuter les actions décidées par Alex
    if (alexResponse.actions && alexResponse.actions.length > 0) {
      await executeAlexActions(alexResponse.actions, organizationId, uid);
    }

    // 6. Sauvegarder le message + la réponse dans l'historique
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

    // 7. Si Alex a mis à jour le profil business, sauvegarder
    if (alexResponse.profileUpdates) {
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
```

### 1.2 Le system prompt d'Alex — LE CŒUR DE TOUT

**Fichier : `functions/src/alex/alexSystemPrompt.js`**

```javascript
export function buildAlexSystemPrompt(context) {
  const { businessProfile, kpis, activeStrategy, recentResults, preferences } = context;

  return `Tu es Alex, l'associé commercial IA de l'utilisateur. Tu n'es PAS un chatbot. Tu es un COLLÈGUE qui connaît son business par cœur et qui trouve des clients pour lui.

## TON CARACTÈRE
- Tu parles comme un collègue, pas comme un robot. Tu tutoies. Tu es direct, enthousiaste, concret.
- Tu ne dis JAMAIS "en tant qu'IA" ou "je suis un assistant". Tu es Alex, point.
- Tu donnes des conseils business basés sur les données réelles, pas des généralités.
- Quand tu proposes une stratégie, tu expliques POURQUOI en 1 phrase, pas un cours magistral.
- Tu utilises des emojis avec parcimonie (1-2 max par message).
- Si le user demande quelque chose d'impossible, tu le dis honnêtement et tu proposes une alternative.

## CE QUE TU SAIS SUR LE USER
${businessProfile ? `
- Activité : ${businessProfile.activity || 'Non renseigné'}
- Secteur : ${businessProfile.sector || 'Non renseigné'}
- Localisation : ${businessProfile.location || 'Non renseigné'}
- Rayon d'action : ${businessProfile.radius || 'Non renseigné'}
- Cible : ${businessProfile.targetAudience || 'Non renseigné'} (${businessProfile.targetType || 'B2B/B2C non précisé'})
- Services/Produits : ${businessProfile.services || 'Non renseigné'}
- Tarif moyen : ${businessProfile.averagePrice || 'Non renseigné'}
- Canal de contact préféré : ${businessProfile.preferredChannel || 'WhatsApp'}
- Objectif : ${businessProfile.goal || 'Non renseigné'}
- Concurrents connus : ${businessProfile.competitors?.join(', ') || 'Non renseigné'}
- Ce qui a marché avant : ${businessProfile.whatWorked || 'Pas encore de données'}
- Ce qui n'a pas marché : ${businessProfile.whatDidntWork || 'Pas encore de données'}
` : 'Tu ne connais pas encore ce user. Commence par lui poser des questions pour comprendre son business.'}

## KPIs ACTUELS
${kpis ? `
- Prospects trouvés cette semaine : ${kpis.prospectsFoundThisWeek || 0}
- Prospects contactés cette semaine : ${kpis.prospectsContactedThisWeek || 0}
- Réponses reçues cette semaine : ${kpis.repliesThisWeek || 0}
- Taux de réponse : ${kpis.replyRate || 'N/A'}
- RDV obtenus cette semaine : ${kpis.meetingsThisWeek || 0}
- Prospects chauds en attente : ${kpis.hotProspectsWaiting || 0}
` : 'Pas encore de KPIs — le user vient de commencer.'}

## STRATÉGIE ACTIVE
${activeStrategy ? `
- Sources utilisées : ${activeStrategy.activeSources?.join(', ') || 'Aucune'}
- Canaux de contact : ${activeStrategy.channels?.join(', ') || 'Aucun'}
- Objectif hebdo : ${activeStrategy.weeklyGoal || 'Non défini'}
- Statut : ${activeStrategy.status || 'Non démarré'}
` : 'Pas de stratégie active. Propose-en une basée sur ce que tu sais du user.'}

## RÉSULTATS RÉCENTS
${recentResults ? `
Derniers prospects trouvés :
${recentResults.map(r => `- ${r.companyName} (${r.signal}) — Score: ${r.score}`).join('\n')}
` : 'Aucun résultat encore.'}

## TES CAPACITÉS (ce que tu peux FAIRE, pas juste dire)
Tu as accès à un moteur de prospection ultra-puissant. Voici ce que tu peux lancer :

SOURCES DE PROSPECTS :
- sirene_search : Chercher des entreprises par code NAF + localisation dans la base SIRENE (4M+ entreprises françaises)
- bodacc_monitor : Détecter les nouvelles créations d'entreprises
- france_travail_monitor : Détecter les entreprises qui recrutent (signal d'achat)
- ct_logs_monitor : Détecter les nouveaux sites web créés
- google_maps_scan : Trouver des commerces par type + localisation
- google_reviews_monitor : Surveiller les avis Google (baisses de note, avis négatifs)
- social_scan : Analyser la présence Instagram/TikTok/Facebook
- leboncoin_monitor : Détecter les cessions de fonds de commerce
- subventions_monitor : Détecter les entreprises ayant reçu des aides digitales
- serper_hunt : Chercher sur Google des entreprises par mots-clés
- forums_scan : Chercher sur les forums/groupes des demandes de service

ANALYSE DE PROSPECTS :
- website_scan : Scanner le site web d'un prospect (tech stack, SEO, état)
- email_infra_scan : Analyser l'infrastructure email (MX, SPF, DKIM)
- google_business_scan : Analyser la fiche Google Business
- financial_scan : Récupérer les données financières (Pappers)

CONTACT :
- send_whatsapp : Envoyer un message WhatsApp personnalisé
- send_email : Envoyer un email personnalisé
- send_sms : Envoyer un SMS

NOTIFICATIONS :
- notify_user_whatsapp : Prévenir le user sur WhatsApp
- notify_user_email : Envoyer un rapport par email
- schedule_daily_report : Programmer un rapport quotidien

## COMMENT TU RÉPONDS

Tu réponds TOUJOURS en JSON avec cette structure :
{
  "message": "Ton message au user (texte conversationnel, comme un collègue)",
  "actions": [
    // Liste des actions à exécuter. VIDE si tu ne fais que parler.
    {
      "type": "sirene_search",           // Le type d'action
      "params": { ... },                 // Les paramètres
      "reason": "..."                    // Pourquoi tu fais ça (1 phrase)
    }
  ],
  "suggestions": [
    // 1-3 suggestions de ce que le user pourrait demander ensuite
    "Montre-moi les prospects trouvés",
    "Change la stratégie pour cibler aussi les particuliers",
    "Envoie-moi un rapport maintenant"
  ],
  "profileUpdates": {
    // Infos à sauvegarder dans le profil business du user
    // Seulement si le user a donné de nouvelles infos
    "activity": "plombier",
    "location": "Marseille",
    "radius": "30km"
  }
}

## RÈGLES CRITIQUES

1. Si tu ne connais PAS le business du user → pose des questions AVANT de proposer une stratégie. Maximum 4 questions à la fois.

2. Si le user demande "trouve-moi des prospects" et que tu as déjà son profil → lance les actions ET explique ce que tu fais. Ne demande pas de confirmation pour chaque action.

3. Si le user demande des KPIs → donne des CHIFFRES concrets, pas des phrases vagues. "Tu as 12 prospects trouvés cette semaine, 8 contactés, 3 ont répondu, 1 veut un RDV."

4. Si un prospect chaud se manifeste → ton action inclut TOUJOURS notify_user_whatsapp pour prévenir le user immédiatement.

5. Quand tu proposes une stratégie → elle doit être SPÉCIFIQUE au business du user. Pas de conseil générique. "Pour un plombier à Marseille, les forums locaux et les avis Google négatifs des concurrents sont tes meilleures sources" — pas "les réseaux sociaux peuvent être utiles".

6. Tu adaptes ta stratégie aux RÉSULTATS. Si les forums donnent 0 prospect mais Google Maps en donne 20, tu dis "les forums marchent pas pour toi, je me concentre sur Google Maps".

7. Tu ANTICIPES. Si le user n'a pas parlé depuis 2 jours, ton rapport quotidien inclut des suggestions proactives : "J'ai remarqué que 3 nouveaux plombiers ont ouvert dans ton rayon cette semaine. Tu veux qu'on ajuste la stratégie ?"

8. Tu ne proposes JAMAIS plus de 3 sources en même temps pour commencer. Tu commences simple, tu mesures, tu ajustes.`;
}
```

### 1.3 Le contexte du user — Tout ce qu'Alex sait

**Fichier : `functions/src/alex/alexMemory.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function loadUserContext(organizationId, userId) {
  // Charger tout en parallèle
  const [
    businessProfileDoc,
    activeStrategyDoc,
    kpisDoc,
    recentProspects,
    preferencesDoc,
  ] = await Promise.all([
    db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get(),
    db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).get(),
    db.doc(`organizations/${organizationId}/alexMemory/kpis`).get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    db.doc(`organizations/${organizationId}/alexMemory/preferences`).get(),
  ]);

  return {
    businessProfile: businessProfileDoc.exists ? businessProfileDoc.data() : null,
    activeStrategy: activeStrategyDoc.exists ? activeStrategyDoc.data() : null,
    kpis: kpisDoc.exists ? kpisDoc.data() : null,
    recentResults: recentProspects.docs.map(d => ({ id: d.id, ...d.data() })),
    preferences: preferencesDoc.exists ? preferencesDoc.data() : null,
  };
}

export async function loadConversationHistory(organizationId, limit = 20) {
  const snapshot = await db.collection(`organizations/${organizationId}/alexConversations`)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  // Inverser pour avoir l'ordre chronologique
  return snapshot.docs.reverse().map(d => ({
    role: d.data().role,
    content: d.data().content,
  }));
}
```

### 1.4 L'exécuteur d'actions — Alex fait ce qu'il dit

**Fichier : `functions/src/alex/alexActionExecutor.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function executeAlexActions(actions, organizationId, userId) {
  const results = [];

  for (const action of actions) {
    try {
      console.log(`🤖 Alex exécute : ${action.type} — ${action.reason}`);

      switch (action.type) {
        // ═══════════ SOURCES DE PROSPECTS ═══════════
        
        case 'sirene_search': {
          // Importe et appelle la recherche SIRENE existante dans le projet
          // Utilise les params : { codesNaf, localisation, rayon }
          const { searchSirene } = await import('../sourcing/sireneSearch.js');
          const prospects = await searchSirene(action.params);
          
          // Sauvegarder les prospects trouvés
          const batch = db.batch();
          for (const prospect of prospects.slice(0, 50)) { // max 50 par batch
            const ref = db.collection(`organizations/${organizationId}/prospects`).doc();
            batch.set(ref, {
              ...prospect,
              source: 'sirene',
              foundByAlex: true,
              createdAt: new Date(),
              status: 'new',
            });
          }
          await batch.commit();
          
          results.push({ type: 'sirene_search', found: prospects.length });
          break;
        }

        case 'google_maps_scan': {
          // Lance un scan Google Maps via Apify
          // Utilise les params : { query, location, radius }
          const { scanGoogleMaps } = await import('../scanner/sources/googleMapsScanner.js');
          const places = await scanGoogleMaps(action.params);
          results.push({ type: 'google_maps_scan', found: places.length });
          break;
        }

        case 'website_scan': {
          // Lance le scan complet du site d'un prospect
          const { runProspectScan } = await import('../scanner/scanOrchestrator.js');
          const scanResult = await runProspectScan({
            data: {
              domain: action.params.domain,
              prospectId: action.params.prospectId,
              organizationId,
            }
          });
          results.push({ type: 'website_scan', result: scanResult });
          break;
        }

        case 'france_travail_monitor': {
          // Active le monitoring France Travail pour cette niche
          await db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).set({
            franceTravailKeywords: action.params.keywords,
            franceTravailActive: true,
          }, { merge: true });
          results.push({ type: 'france_travail_monitor', status: 'activated' });
          break;
        }

        case 'google_reviews_monitor': {
          // Active la surveillance des avis Google des concurrents
          await db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).set({
            competitorsToWatch: action.params.competitors,
            googleReviewsActive: true,
          }, { merge: true });
          results.push({ type: 'google_reviews_monitor', status: 'activated' });
          break;
        }

        case 'bodacc_monitor':
        case 'ct_logs_monitor':
        case 'social_scan':
        case 'leboncoin_monitor':
        case 'subventions_monitor':
        case 'serper_hunt':
        case 'forums_scan':
        case 'email_infra_scan':
        case 'google_business_scan':
        case 'financial_scan': {
          // Active la source dans la stratégie
          await db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).set({
            [`${action.type}Active`]: true,
            [`${action.type}Params`]: action.params,
          }, { merge: true });
          results.push({ type: action.type, status: 'activated' });
          break;
        }

        // ═══════════ CONTACT PROSPECTS ═══════════

        case 'send_whatsapp': {
          // Envoyer un WhatsApp au prospect
          const { sendWhatsAppMessage } = await import('../channels/whatsapp/whatsappSender.js');
          await sendWhatsAppMessage({
            to: action.params.phone,
            message: action.params.message,
            organizationId,
          });
          
          // Mettre à jour le statut du prospect
          if (action.params.prospectId) {
            await db.doc(`organizations/${organizationId}/prospects/${action.params.prospectId}`)
              .update({ status: 'contacted', contactedAt: new Date(), contactChannel: 'whatsapp' });
          }
          results.push({ type: 'send_whatsapp', status: 'sent' });
          break;
        }

        case 'send_email': {
          const { sendEmail } = await import('../channels/email/emailSender.js');
          await sendEmail({
            to: action.params.email,
            subject: action.params.subject,
            body: action.params.body,
            organizationId,
          });
          results.push({ type: 'send_email', status: 'sent' });
          break;
        }

        case 'send_sms': {
          const { sendSMS } = await import('../channels/sms/smsSender.js');
          await sendSMS({
            to: action.params.phone,
            message: action.params.message,
            organizationId,
          });
          results.push({ type: 'send_sms', status: 'sent' });
          break;
        }

        // ═══════════ NOTIFICATIONS AU USER ═══════════

        case 'notify_user_whatsapp': {
          // Prévenir le user sur SON WhatsApp personnel
          const { sendWhatsAppMessage } = await import('../channels/whatsapp/whatsappSender.js');
          const userPhone = action.params.userPhone || 
            (await db.doc(`organizations/${organizationId}/alexMemory/preferences`).get()).data()?.userWhatsApp;
          
          if (userPhone) {
            await sendWhatsAppMessage({
              to: userPhone,
              message: action.params.message,
              organizationId,
              isNotification: true, // Flag pour ne pas compter dans les quotas prospect
            });
          }
          results.push({ type: 'notify_user_whatsapp', status: userPhone ? 'sent' : 'no_phone' });
          break;
        }

        case 'notify_user_email': {
          const { sendEmail } = await import('../channels/email/emailSender.js');
          const userEmail = action.params.userEmail ||
            (await db.doc(`organizations/${organizationId}/alexMemory/preferences`).get()).data()?.userEmail;
          
          if (userEmail) {
            await sendEmail({
              to: userEmail,
              subject: action.params.subject || '📊 Rapport Alex — Face Media Factory',
              body: action.params.body,
              organizationId,
              isNotification: true,
            });
          }
          results.push({ type: 'notify_user_email', status: userEmail ? 'sent' : 'no_email' });
          break;
        }

        case 'schedule_daily_report': {
          // Sauvegarder la préférence de rapport quotidien
          await db.doc(`organizations/${organizationId}/alexMemory/preferences`).set({
            dailyReportEnabled: true,
            dailyReportTime: action.params.time || '08:00',
            dailyReportChannel: action.params.channel || 'whatsapp',
            userWhatsApp: action.params.userPhone || null,
            userEmail: action.params.userEmail || null,
          }, { merge: true });
          results.push({ type: 'schedule_daily_report', status: 'scheduled' });
          break;
        }

        default:
          console.warn(`⚠️ Action inconnue : ${action.type}`);
          results.push({ type: action.type, status: 'unknown_action' });
      }
    } catch (error) {
      console.error(`❌ Erreur action ${action.type}:`, error.message);
      results.push({ type: action.type, status: 'error', error: error.message });
    }
  }

  // Sauvegarder le log des actions
  await db.collection(`organizations/${organizationId}/alexActionLogs`).add({
    actions,
    results,
    executedAt: new Date(),
  });

  return results;
}
```

---

## PHASE 2 : LES RAPPORTS AUTOMATIQUES

### 2.1 Rapport quotidien — Alex rend des comptes tous les matins

**Fichier : `functions/src/alex/alexDailyReport.js`**

```javascript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';

const db = getFirestore();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Tourne toutes les heures, vérifie qui veut un rapport à cette heure
export const alexDailyReporter = onSchedule(
  {
    schedule: '0 * * * *', // Chaque heure
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const currentHour = new Date().toLocaleString('fr-FR', { 
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' 
    });
    
    // Trouver tous les tenants qui veulent un rapport à cette heure
    const orgs = await db.collectionGroup('alexMemory')
      .where('dailyReportEnabled', '==', true)
      .get();

    for (const doc of orgs.docs) {
      const prefs = doc.data();
      const reportTime = prefs.dailyReportTime || '08:00';
      
      // Vérifier si c'est l'heure du rapport (comparer juste l'heure)
      if (!currentHour.startsWith(reportTime.split(':')[0])) continue;

      const orgPath = doc.ref.parent.parent.id; // organizations/{orgId}
      
      try {
        await generateAndSendReport(orgPath, prefs);
      } catch (error) {
        console.error(`Erreur rapport pour ${orgPath}:`, error.message);
      }
    }
  }
);

async function generateAndSendReport(organizationId, prefs) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Charger les données des dernières 24h
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

  // Générer le message avec Groq
  const prompt = `Tu es Alex, l'associé commercial IA. Génère un rapport quotidien court et percutant (max 8 lignes) en français pour ton client.

Stats des dernières 24h :
- Prospects trouvés : ${stats.found}
- Prospects contactés : ${stats.contacted}
- Réponses reçues : ${stats.replies}
- Prospects chauds en attente : ${stats.hot}

Règles :
- Sois concret et direct, comme un collègue qui fait le point le matin
- Si les résultats sont bons, félicite brièvement
- Si les résultats sont faibles, propose 1 ajustement concret
- Termine par ce que tu vas faire aujourd'hui
- Format texte simple (pour WhatsApp), pas de HTML
- Commence par "📊 Rapport Alex —" suivi de la date du jour`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 500,
  });

  const reportMessage = response.choices[0].message.content;

  // Envoyer selon le canal préféré
  if (prefs.dailyReportChannel === 'whatsapp' && prefs.userWhatsApp) {
    const { sendWhatsAppMessage } = await import('../channels/whatsapp/whatsappSender.js');
    await sendWhatsAppMessage({
      to: prefs.userWhatsApp,
      message: reportMessage,
      organizationId,
      isNotification: true,
    });
  }

  if (prefs.dailyReportChannel === 'email' || prefs.userEmail) {
    const { sendEmail } = await import('../channels/email/emailSender.js');
    await sendEmail({
      to: prefs.userEmail,
      subject: `📊 Rapport Alex — ${new Date().toLocaleDateString('fr-FR')}`,
      body: reportMessage,
      organizationId,
      isNotification: true,
    });
  }

  // Sauvegarder le rapport
  await db.collection(`organizations/${organizationId}/alexReports`).add({
    stats,
    message: reportMessage,
    sentVia: prefs.dailyReportChannel,
    sentAt: new Date(),
  });
}
```

### 2.2 Alertes temps réel — Prospect chaud = notification immédiate

**Fichier : `functions/src/alex/alexHotLeadAlert.js`**

```javascript
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Se déclenche quand le statut d'un prospect change
export const alertHotLead = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orgId = event.params.orgId;

    // Détecter les transitions importantes
    const isNewReply = !before.repliedAt && after.repliedAt;
    const isNowHot = before.status !== 'hot' && after.status === 'hot';
    const isInterested = after.replyClassification === 'INTERESTED' && before.replyClassification !== 'INTERESTED';
    const wantsMeeting = after.replyClassification === 'WANTS_MEETING' && before.replyClassification !== 'WANTS_MEETING';

    if (!isNewReply && !isNowHot && !isInterested && !wantsMeeting) return;

    // Charger les préférences du user
    const prefs = (await db.doc(`organizations/${orgId}/alexMemory/preferences`).get()).data();
    if (!prefs?.userWhatsApp) return;

    // Construire le message d'alerte
    let alertMessage = '';
    
    if (wantsMeeting) {
      alertMessage = `🔥 ALERTE CHAUDE !\n\n${after.companyName || after.contactName} veut un RDV !\n\nSon message : "${after.lastReply?.substring(0, 200)}"\n\nRéponds-lui vite, je te l'envoie tout chaud ! 🎯`;
    } else if (isInterested) {
      alertMessage = `🟢 Bonne nouvelle !\n\n${after.companyName || after.contactName} est intéressé(e) !\n\nSon message : "${after.lastReply?.substring(0, 200)}"\n\nTu veux que je continue la conversation ou tu prends la main ?`;
    } else if (isNewReply) {
      alertMessage = `💬 ${after.companyName || after.contactName} a répondu !\n\n"${after.lastReply?.substring(0, 200)}"`;
    } else if (isNowHot) {
      alertMessage = `🎯 Nouveau prospect chaud : ${after.companyName || after.contactName} (score: ${after.score})\n\nJe le contacte ou tu préfères le faire toi-même ?`;
    }

    // Envoyer la notification WhatsApp
    const { sendWhatsAppMessage } = await import('../channels/whatsapp/whatsappSender.js');
    await sendWhatsAppMessage({
      to: prefs.userWhatsApp,
      message: alertMessage,
      organizationId: orgId,
      isNotification: true,
    });

    console.log(`🔔 Alerte envoyée à ${prefs.userWhatsApp} pour prospect ${after.companyName}`);
  }
);
```

---

## PHASE 3 : LE FRONTEND — L'INTERFACE CHAT

### 3.1 AlexChat.jsx — L'écran principal

**Fichier : `src/components/alex/AlexChat.jsx`**

Crée un composant React qui ressemble à WhatsApp/iMessage :

**Structure :**
- Barre du haut : avatar Alex + nom "Alex — Votre associé commercial" + badge statut (en ligne / en train de chercher...)
- Zone de messages scrollable :
  - Messages du user alignés à droite (bulle bleue)
  - Messages d'Alex alignés à gauche (bulle grise claire)
  - Quand Alex exécute des actions : petit encart avec animation de chargement et texte "🔍 Je cherche des restaurants à Lyon..." puis "✅ 47 restaurants trouvés !"
  - Suggestions cliquables en bas du dernier message d'Alex (chips/boutons)
- Zone de saisie en bas : input texte + bouton envoyer
- État "Alex réfléchit..." avec animation de typing (3 points)

**Comportement :**
- `onSnapshot` sur `organizations/{orgId}/alexConversations` pour le temps réel
- Appel à la Cloud Function `chatWithAlex` quand le user envoie un message
- Auto-scroll vers le bas à chaque nouveau message
- Les suggestions sont cliquables et envoient le texte comme message
- Premier message d'Alex si la conversation est vide : message d'accueil (voir le system prompt)

**Design :**
- Fond légèrement grisé (comme WhatsApp Web)
- Bulles arrondies
- Police lisible (16px minimum)
- Responsive mobile-first
- Tailwind CSS uniquement
- Animation de typing : 3 cercles qui rebondissent

### 3.2 AlexActionCard.jsx — Affichage des actions en cours

**Fichier : `src/components/alex/AlexActionCard.jsx`**

Composant intégré dans les messages d'Alex quand il exécute des actions :

```
┌─────────────────────────────────────┐
│ 🔍 Recherche SIRENE                 │
│ Restaurants dans un rayon de 30km   │
│ autour de Marseille                 │
│                                     │
│ ████████████░░░░ 67%               │
│                                     │
│ 47 résultats trouvés               │
└─────────────────────────────────────┘
```

- Icône par type d'action
- Barre de progression (si possible) ou spinner
- Résultat affiché quand terminé
- Cliquable → ouvre la liste des prospects trouvés

### 3.3 AlexOnboarding — Premier lancement

**Fichier : `src/components/alex/AlexOnboarding.jsx`**

Quand le user ouvre FMF pour la première fois, Alex affiche :

```
🤖 Alex : Salut ! Je suis Alex, ton associé commercial IA.

Mon job c'est simple : je trouve des clients pour toi pendant que 
tu fais ton métier.

Pour commencer, dis-moi ce que tu fais. Par exemple :
• "Je suis plombier à Marseille"  
• "J'ai un restaurant à Lyon"
• "Je suis coach sportif, je cherche des clients en ligne"

Dis-moi tout, je m'adapte à n'importe quel business 💪
```

Pas de formulaire. Pas de wizard en 10 étapes. Une conversation.

---

## PHASE 4 : LE SCHEDULER INTELLIGENT

### 4.1 Alex travaille même quand le user dort

**Fichier : `functions/src/alex/alexAutonomousWorker.js`**

```javascript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Tourne toutes les heures — Alex travaille en autonomie
export const alexAutonomousWorker = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    console.log('🤖 Alex Autonomous Worker : Lancement...');

    // Récupérer toutes les organisations avec une stratégie active
    const orgs = await db.collectionGroup('alexMemory')
      .where('status', '==', 'active')
      .get();

    for (const doc of orgs.docs) {
      const strategy = doc.data();
      const orgId = doc.ref.parent.parent.id;

      try {
        // Pour chaque source activée, lancer le scan
        if (strategy.sirene_searchActive) {
          await runSourceForOrg(orgId, 'sirene_search', strategy.sirene_searchParams);
        }
        if (strategy.franceTravailActive) {
          await runSourceForOrg(orgId, 'france_travail', strategy.france_travail_monitorParams);
        }
        if (strategy.googleReviewsActive) {
          await runSourceForOrg(orgId, 'google_reviews', strategy.google_reviews_monitorParams);
        }
        // ... idem pour chaque source activée

        // Vérifier les prospects non contactés et les contacter
        await autoContactNewProspects(orgId, strategy);

        // Vérifier les relances à faire
        await autoFollowUp(orgId, strategy);

      } catch (error) {
        console.error(`Erreur worker pour ${orgId}:`, error.message);
      }
    }
  }
);

async function autoContactNewProspects(orgId, strategy) {
  // Trouver les prospects avec score >= seuil et pas encore contactés
  const threshold = strategy.autoContactThreshold || 50;
  const channel = strategy.preferredChannel || 'whatsapp';
  
  const uncontacted = await db.collection(`organizations/${orgId}/prospects`)
    .where('status', '==', 'new')
    .where('score', '>=', threshold)
    .orderBy('score', 'desc')
    .limit(10) // Max 10 par heure
    .get();

  for (const doc of uncontacted.docs) {
    const prospect = doc.data();
    
    // Générer un message personnalisé basé sur les signaux détectés
    const message = await generatePersonalizedMessage(orgId, prospect);
    
    // Envoyer via le canal préféré
    if (channel === 'whatsapp' && prospect.phone) {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/whatsappSender.js');
      await sendWhatsAppMessage({
        to: prospect.phone,
        message,
        organizationId: orgId,
      });
    } else if (prospect.email) {
      const { sendEmail } = await import('../channels/email/emailSender.js');
      await sendEmail({
        to: prospect.email,
        subject: message.subject,
        body: message.body,
        organizationId: orgId,
      });
    }

    // Mettre à jour le statut
    await doc.ref.update({
      status: 'contacted',
      contactedAt: new Date(),
      contactChannel: channel,
      contactMessage: message,
    });
  }
}

async function autoFollowUp(orgId, strategy) {
  // Relancer les prospects contactés il y a 48h+ sans réponse
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  
  const noReply = await db.collection(`organizations/${orgId}/prospects`)
    .where('status', '==', 'contacted')
    .where('contactedAt', '<', twoDaysAgo)
    .where('followUpCount', '<', 3) // Max 3 relances
    .limit(5)
    .get();

  for (const doc of noReply.docs) {
    const prospect = doc.data();
    
    // Générer un message de relance différent du premier
    const followUpMessage = await generateFollowUpMessage(orgId, prospect);
    
    // Envoyer
    // ... (même logique que autoContactNewProspects)
    
    await doc.ref.update({
      followUpCount: (prospect.followUpCount || 0) + 1,
      lastFollowUpAt: new Date(),
    });
  }
}

async function generatePersonalizedMessage(orgId, prospect) {
  // Charger le profil business du user
  const profile = (await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get()).data();
  
  // Charger le diagnostic du prospect (s'il existe)
  const scanResult = prospect.scanResultId 
    ? (await db.doc(`scanResults/${prospect.scanResultId}`).get()).data()
    : null;

  const groq = new (await import('groq-sdk')).default({ apiKey: process.env.GROQ_API_KEY });
  
  const prompt = `Tu es Alex. Génère un message de prospection WhatsApp personnalisé.

TON CLIENT (celui qui envoie) :
- Activité : ${profile?.activity || 'Non renseigné'}
- Services : ${profile?.services || 'Non renseigné'}

LE PROSPECT (celui qui reçoit) :
- Nom : ${prospect.contactName || prospect.companyName}
- Entreprise : ${prospect.companyName}
- Secteur : ${prospect.sector || 'Non renseigné'}
${scanResult ? `
DIAGNOSTIC DU PROSPECT :
- Problèmes détectés : ${scanResult.signals?.map(s => s.message).join(', ')}
- Score : ${scanResult.totalSignalScore}
` : ''}

RÈGLES :
- Max 3 phrases
- Mentionne un problème SPÉCIFIQUE du prospect si disponible
- Propose une solution concrète
- Termine par une question ouverte
- Ton amical et professionnel, pas commercial
- Pas de "je me permets de vous contacter"
- PAS de formule de politesse longue

Réponds uniquement avec le message, rien d'autre.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 300,
  });

  return response.choices[0].message.content;
}

async function generateFollowUpMessage(orgId, prospect) {
  // Similaire à generatePersonalizedMessage mais avec un angle différent
  // Utilise le followUpCount pour varier : relance douce → valeur ajoutée → dernier message
  const followUpAngles = [
    'relance douce : "Petit rappel" sans pression',
    'valeur ajoutée : partage un conseil gratuit lié au problème détecté',
    'dernier message : "Je ne veux pas être insistant, mais..." avec urgence douce',
  ];
  
  const angle = followUpAngles[Math.min(prospect.followUpCount || 0, 2)];
  
  // ... même logique avec Groq mais en précisant l'angle de relance
  return `Relance ${(prospect.followUpCount || 0) + 1}/3 — ${angle}`;
}
```

---

## PHASE 5 : EXPORTS ET DÉPLOIEMENT

### 5.1 Export des Cloud Functions Alex

**Fichier : `functions/src/alex/index.js`**

```javascript
export { chatWithAlex } from './alexBrain.js';
export { alexDailyReporter } from './alexDailyReport.js';
export { alertHotLead } from './alexHotLeadAlert.js';
export { alexAutonomousWorker } from './alexAutonomousWorker.js';
```

Puis dans `functions/index.js`, importer et ré-exporter toutes les fonctions Alex.

### 5.2 Firestore collections Alex

```
organizations/{orgId}/
  alexConversations/      — Historique du chat avec Alex
    {msgId}: { role, content, actions, timestamp, userId }
  
  alexMemory/
    businessProfile       — Ce qu'Alex sait sur le business du user
    activeStrategy        — La stratégie en cours (sources activées, params)
    preferences           — Préférences (canal rapport, heure, WhatsApp user, email user)
    kpis                  — KPIs calculés (mis à jour par le worker)
  
  alexActionLogs/         — Log de toutes les actions exécutées par Alex
    {logId}: { actions, results, executedAt }
  
  alexReports/            — Historique des rapports quotidiens
    {reportId}: { stats, message, sentVia, sentAt }
  
  prospects/              — Les prospects trouvés (existant, enrichi)
    {prospectId}: { 
      ...existingFields,
      foundByAlex: true,
      source: 'sirene' | 'google_maps' | 'france_travail' | ...,
      scanResultId: 'ref vers scanResults/',
      status: 'new' | 'contacted' | 'replied' | 'hot' | 'converted' | 'lost',
      contactedAt, contactChannel, contactMessage,
      repliedAt, lastReply, replyClassification,
      followUpCount, lastFollowUpAt,
      score: 0-100,
    }
```

### 5.3 Firestore indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "alexConversations",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prospects",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "score", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "prospects",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "contactedAt", "order": "ASCENDING" },
        { "fieldPath": "followUpCount", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "prospects",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 5.4 Routing React

Dans le router principal de l'app, faire du chat Alex la page d'accueil :

```jsx
// src/App.jsx ou src/router.jsx
// La route par défaut après login = le chat Alex
{ path: '/app', element: <AlexChat /> },          // DÉFAUT
{ path: '/app/prospects', element: <Prospects /> },
{ path: '/app/dashboard', element: <Dashboard /> },
{ path: '/app/settings', element: <Settings /> },
```

### 5.5 Tests de validation

```bash
# 1. Déployer
firebase deploy --only functions
firebase deploy --only hosting

# 2. Tester le chat Alex
# Ouvrir le SaaS → le chat doit s'afficher en premier
# Envoyer : "Je suis plombier à Lyon"
# Alex doit poser des questions de suivi
# Répondre aux questions
# Alex doit proposer une stratégie et la lancer

# 3. Tester le rapport quotidien
# Configurer un numéro WhatsApp dans les préférences
# Attendre l'heure configurée (ou forcer via Firebase Console)

# 4. Tester les alertes
# Modifier manuellement un prospect : status → 'hot'
# Le user doit recevoir un WhatsApp immédiatement

# 5. Tester le worker autonome
# Vérifier dans les logs que alexAutonomousWorker tourne toutes les heures
# Vérifier que les prospects sont contactés automatiquement

# 6. Build
npm run build  # 0 erreurs
```

---

## ORDRE D'EXÉCUTION STRICT

1. **Phase 1** : alexBrain.js + alexSystemPrompt.js + alexMemory.js + alexActionExecutor.js
   → Tester : envoyer un message, vérifier la réponse JSON d'Alex
2. **Phase 2** : alexDailyReport.js + alexHotLeadAlert.js
   → Tester : forcer un rapport, modifier un prospect en 'hot'
3. **Phase 3** : AlexChat.jsx + AlexActionCard.jsx + AlexOnboarding.jsx
   → Tester : conversation complète dans l'UI
4. **Phase 4** : alexAutonomousWorker.js
   → Tester : vérifier que les prospects sont contactés automatiquement
5. **Phase 5** : routing, indexes, déploiement complet

IMPORTANT : Ce prompt s'appuie sur les modules du scanner (prompt précédent).
Les actions comme 'website_scan', 'sirene_search' appellent le code implémenté par le prompt INTENT_SCANNER_20_BOOSTERS.
Exécute ce prompt APRÈS le prompt scanner.

Lis d'abord l'architecture existante dans functions/src/ pour comprendre les imports, les patterns (ESM, admin SDK, etc.), et adapter le code ci-dessus aux conventions du projet.
