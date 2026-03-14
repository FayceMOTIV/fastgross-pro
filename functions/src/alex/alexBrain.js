/**
 * alexBrain.js — Le cerveau d'Alex avec machine a etats
 * Claude (primary) + Groq (fallback)
 * Machine a etats : welcome → discover → zone → volume → channel → confirm → ready
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { buildAlexSystemPrompt } from './alexSystemPrompt.js';
import { loadConversationHistory } from './alexMemory.js';
import { executeAlexActions } from './alexActionExecutor.js';
import { parseMission, activateMission, getMissionPromptSection, updateMissionProgress } from './alexMissionTracker.js';
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js';

const getDb = () => getFirestore();
const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// Actions toujours autorisées (peu importe la phase)
const ALWAYS_ALLOWED_ACTIONS = [
  // Lectures
  'get_prospects', 'get_stats', 'list_campaigns', 'get_dscore', 'get_signals',
  'get_roi_metrics', 'get_pipeline_stats', 'get_interactions', 'get_market_insights',
  'get_mission_progress', 'export_prospects',
  // Mutations CRM
  'update_prospect', 'create_prospect', 'qualify_prospect', 'enrich_prospect',
  'tag_batch', 'bulk_status_update', 'delete_prospect',
  // Recherche
  'intelligent_search', 'sirene_search', 'google_maps_scan', 'find_lookalikes', 'website_scan',
  // Monitors (read-only Serper searches)
  'france_travail_monitor', 'google_reviews_monitor', 'bodacc_monitor', 'ct_logs_monitor',
  'social_scan', 'leboncoin_monitor', 'subventions_monitor', 'serper_hunt',
  'forums_scan', 'email_infra_scan', 'google_business_scan', 'financial_scan',
  // Controle
  'pause_prospection', 'resume_prospection', 'activate_mission',
  // Notifications
  'notify_user_whatsapp', 'notify_user_email', 'schedule_daily_report',
  // Generation
  'generate_sequence',
  // Contact (5 canaux + auto)
  'send_email', 'send_sms', 'send_whatsapp', 'send_instagram_dm', 'send_linkedin', 'auto_outreach',
];
// Actions data (exécutées de façon synchrone pour retourner le résultat dans la réponse)
const DATA_ACTIONS = [
  'get_prospects', 'get_stats', 'list_campaigns', 'update_prospect', 'create_prospect',
  'intelligent_search', 'get_mission_progress', 'get_dscore', 'get_signals',
  'qualify_prospect', 'get_roi_metrics', 'generate_sequence', 'get_pipeline_stats',
  'get_interactions', 'export_prospects', 'get_market_insights', 'find_lookalikes',
  'website_scan', 'enrich_prospect',
  // Contact — retournent le statut d'envoi
  'send_email', 'send_sms', 'send_whatsapp', 'send_instagram_dm', 'send_linkedin', 'auto_outreach',
];

/**
 * Construit le contexte org pour pré-seeder Alex
 */
async function buildOrgContext(orgId) {
  const db = getDb();
  try {
    const [prospectsSnap, kpisSnap, repliesSnap] = await Promise.all([
      db.collection(`organizations/${orgId}/prospects`)
        .orderBy('score', 'desc').limit(10).get(),
      db.doc(`organizations/${orgId}/alexMemory/kpis`).get(),
      db.collection(`organizations/${orgId}/interactions`)
        .orderBy('createdAt', 'desc').limit(3).get(),
    ]);

    const allProspects = prospectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return {
      hotProspects: allProspects.filter(p => (p.score || 0) >= 60).slice(0, 5),
      recentReplies: repliesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      kpis: kpisSnap.exists ? kpisSnap.data() : {},
    };
  } catch (e) {
    console.warn('[buildOrgContext] Failed:', e.message);
    return { hotProspects: [], recentReplies: [], kpis: {} };
  }
}

// Les 10 phases de conversation dans l'ordre (v2 — SPIN + Challenger Sale)
const PHASES = ['welcome', 'diagnose', 'discover', 'icp', 'zone', 'volume', 'channel', 'strategy', 'confirm', 'ready'];

/**
 * Appel LLM : Claude primary, Groq fallback
 */
async function callLLM(systemPrompt, messages, jsonMode = true) {
  // Essai Claude
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      })),
    });
    const text = response.content[0].text;
    console.log('[LLM] Claude OK, length:', text.length);
    return text;
  } catch (claudeErr) {
    console.warn('[LLM] Claude failed, fallback Groq:', claudeErr.message);
  }

  // Fallback Groq
  const groq = getGroq();
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: groqMessages,
    temperature: 0.4,
    max_tokens: 1024,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
  const text = response.choices[0].message.content;
  console.log('[LLM] Groq fallback OK, length:', text.length);
  return text;
}

/**
 * Extrait les infos structurees du message du user
 */
async function extractInfoFromMessage(userMessage, state) {
  const data = state.collectedData || {};
  const extractionPrompt = `Tu es un extracteur d'informations pour un outil de prospection B2B. Analyse ce message et retourne UNIQUEMENT du JSON valide, rien d'autre.

Message de l'utilisateur : "${userMessage}"

Contexte deja connu :
- Business/Niche cible : ${data.business || 'inconnu'}
- Offre : ${data.offer || 'inconnue'}
- Zone : ${data.zone || 'inconnue'}
- Volume : ${data.volume || 'inconnu'}
- Canal : ${data.channel || 'inconnu'}
- Douleur principale : ${data.pain || 'inconnue'}
- Ticket moyen : ${data.ticketMoyen || 'inconnu'}
- Clients actuels : ${data.currentClients || 'inconnu'}
- Echecs passes : ${data.failedAttempts || 'inconnus'}
- Concurrents cites : ${data.competitors || 'aucun'}
- Urgence : ${data.urgency || 'inconnue'}
- ICP (client ideal) : ${data.icp || 'inconnu'}
- Phase actuelle : ${state.phase || 'welcome'}

IMPORTANT — Contexte prospection :
- "business" = le SECTEUR CIBLE de prospection (niche visee). Ex: "restaurants a Paris" → business = "restaurants".
  C'est le type d'entreprise que l'utilisateur veut prospecter, PAS forcement son propre metier.
- "zone" = la zone geographique mentionnee. Ex: "a Paris", "sur Lyon", "en Ile-de-France" → extrais la zone.
- "icp" = le profil du prospect ideal si decrit plus precisement.
- Si le message mentionne un type de veille (France Travail, Google, etc.) c'est une info de canal/methode, pas business.

Extrais UNIQUEMENT ce qui est NOUVEAU ou MODIFIE dans ce message.
Si une info etait deja connue et n'est pas modifiee → mets null.

{
  "business": "le secteur/niche cible de prospection ou null",
  "offer": "l'offre/service que l'utilisateur vend ou null",
  "zone": "la zone geographique ou null",
  "volume": "le volume voulu ou null",
  "channel": "le canal de contact prefere ou null",
  "pain": "la douleur principale en 1 phrase ou null",
  "ticketMoyen": "valeur en EUR d'un client ou null",
  "currentClients": "nombre de clients actifs ou null",
  "failedAttempts": "ce qui a deja ete essaye et echoue ou null",
  "competitors": "concurrents cites ou null",
  "urgency": "now (besoin immediat) | soon (dans quelques semaines) | planning (preparer) ou null",
  "icp": "description du client ideal ou null",
  "isConfirmation": false
}

isConfirmation = true si le message contient : "go", "lance", "oui", "c'est bon", "c'est parti", "yes", "parfait", "envoie", "top", "nickel", "ok", "d'accord", "valide".`;

  try {
    const raw = await callLLM(extractionPrompt, [{ role: 'user', content: userMessage }], true);
    const json = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    const parsed = JSON.parse(json);

    // Post-processing : mapper les champs alternatifs vers 'volume'
    if (!parsed.volume) {
      const volumeAliases = ['budget', 'prospectsParSemaine', 'nombreClients', 'objectifClients',
        'clientsVoulus', 'volumeVise', 'objectif', 'nbClients', 'clientsParMois'];
      for (const alias of volumeAliases) {
        if (parsed[alias]) {
          parsed.volume = parsed[alias];
          delete parsed[alias];
          break;
        }
      }
    }

    // Post-processing : mapper les champs alternatifs vers 'business'
    if (!parsed.business) {
      const bizAliases = ['metier', 'activite', 'secteur', 'profession', 'niche', 'cible', 'target', 'nicheCible'];
      for (const alias of bizAliases) {
        if (parsed[alias]) {
          parsed.business = parsed[alias];
          delete parsed[alias];
          break;
        }
      }
    }

    // Post-processing : mapper les champs alternatifs vers 'zone'
    if (!parsed.zone) {
      const zoneAliases = ['ville', 'region', 'localisation', 'lieu', 'city', 'location', 'departement'];
      for (const alias of zoneAliases) {
        if (parsed[alias]) {
          parsed.zone = parsed[alias];
          delete parsed[alias];
          break;
        }
      }
    }

    // Regex fallback — si LLM retourne tout null, extraire par patterns
    const allNull = !parsed.business && !parsed.offer && !parsed.zone && !parsed.pain && !parsed.ticketMoyen && !parsed.icp;
    if (allNull) {
      const msg = userMessage.toLowerCase();

      // Extraire zone (villes francaises courantes)
      const zoneMatch = msg.match(/(?:a|à|sur|de|en|dans|pour)\s+(paris|lyon|marseille|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|lille|rennes|reims|toulon|grenoble|dijon|angers|nimes|saint-etienne|le havre|clermont|ile[- ]de[- ]france|idf|paca|rhone[- ]alpes|occitanie|bretagne|normandie|hauts[- ]de[- ]france|nouvelle[- ]aquitaine)/i);
      if (zoneMatch) parsed.zone = zoneMatch[1].charAt(0).toUpperCase() + zoneMatch[1].slice(1);

      // Extraire niche/business (patterns de prospection)
      const nichePatterns = [
        /(?:sur|pour|cibler?|prospecter?|trouver?|chercher?)\s+(?:les?|des?|du)?\s*([a-zéèêëàâùûîïôç\s-]{3,30}?)(?:\s+(?:a|à|sur|de|en|dans|par)\s)/i,
        /(?:veille|monitor|scan)\s+(?:\w+\s+)?(?:sur|pour)\s+(?:les?|des?)?\s*([a-zéèêëàâùûîïôç\s-]{3,30}?)(?:\s+(?:a|à|sur|de|en|dans)\s)/i,
        /(?:les?|des?)\s+(restaurants?|plombiers?|electriciens?|artisans?|boulangers?|coiffeurs?|dentistes?|avocats?|comptables?|architectes?|fleuristes?|pharmacies?|garages?|agences?\s+immobili[eè]res?|startups?|ecommerce|coaches?|consultants?|formateurs?|photographes?)(?:\s|$|,)/i,
      ];
      for (const pattern of nichePatterns) {
        const m = msg.match(pattern);
        if (m?.[1]?.trim()) {
          parsed.business = m[1].trim();
          break;
        }
      }

      // Extraire ticket moyen
      const ticketMatch = msg.match(/(\d+)\s*(?:eur|€|euros?)/i);
      if (ticketMatch) parsed.ticketMoyen = ticketMatch[1];

      // Detecter confirmation
      const confirmWords = ['go', 'lance', 'oui', "c'est bon", "c'est parti", 'yes', 'parfait', 'envoie', 'top', 'nickel', 'ok', "d'accord", 'valide'];
      if (confirmWords.some(kw => msg.includes(kw))) parsed.isConfirmation = true;

      if (parsed.business || parsed.zone || parsed.ticketMoyen) {
        console.log('[extract] Regex fallback extracted:', JSON.stringify(parsed));
      }
    }

    return parsed;
  } catch (e) {
    console.warn('[extract] Failed:', e.message);
    // Dernier recours : extraction regex pure
    const msg = userMessage.toLowerCase();
    const fallback = { isConfirmation: false };
    const zoneMatch = msg.match(/(?:a|à|sur|de|en)\s+(paris|lyon|marseille|toulouse|nice|nantes|bordeaux|lille|montpellier|strasbourg)/i);
    if (zoneMatch) fallback.zone = zoneMatch[1].charAt(0).toUpperCase() + zoneMatch[1].slice(1);
    const nicheMatch = msg.match(/(?:les?|des?)\s+(restaurants?|plombiers?|electriciens?|artisans?|boulangers?|coiffeurs?|dentistes?|avocats?|comptables?|architectes?)/i);
    if (nicheMatch) fallback.business = nicheMatch[1].trim();
    if (fallback.business || fallback.zone) console.log('[extract] Emergency regex:', JSON.stringify(fallback));
    return fallback;
  }
}

/**
 * Determine la prochaine phase — architecture SPIN + Challenger Sale v2
 * welcome → diagnose → discover → icp → zone → volume → channel → strategy → confirm → ready
 */
function determineNextPhase(currentPhase, data, isConfirmation) {
  // Phase finale irreversible
  if (currentPhase === 'ready') return 'ready';
  if (currentPhase === 'confirm' && isConfirmation) return 'ready';

  // Progression lineaire : chaque phase exige les donnees precedentes
  if (!data.business && !data.offer) {
    // Pas encore de metier → diagnose (douleur d'abord) ou discover
    return currentPhase === 'welcome' ? 'diagnose' : 'discover';
  }

  // On a le metier — manque-t-il la douleur ?
  if (!data.pain) return 'diagnose';

  // On a metier + douleur — manque-t-il l'offre precise ?
  if (!data.offer) return 'discover';

  // On a tout le business — manque-t-il l'ICP ?
  if (!data.icp) return 'icp';

  // ICP OK — manque-t-il la zone ?
  if (!data.zone) return 'zone';

  // Zone OK — manque-t-il le volume ?
  if (!data.volume) return 'volume';

  // Volume OK — manque-t-il le canal ?
  if (!data.channel) return 'channel';

  // Tout collecte → strategy puis confirm
  if (currentPhase === 'channel') return 'strategy';
  if (currentPhase === 'strategy') return 'confirm';
  return 'confirm';
}

/**
 * Parse la reponse JSON d'Alex et normalise les actions
 */
function parseAlexResponse(raw) {
  let parsed;
  try {
    const json = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    parsed = JSON.parse(json);
  } catch {
    parsed = { message: raw, actions: [], suggestions: [] };
  }

  const message = parsed.message || parsed.reply || parsed.response || parsed.text || raw || '';

  const actions = (parsed.actions || []).map(action => {
    if (typeof action === 'string') return { type: action, params: { objective: message } };
    if (action && typeof action === 'object' && action.type) return action;
    return null;
  }).filter(Boolean);

  return { message, actions, suggestions: parsed.suggestions || [] };
}

export const chatWithAlex = onCall(
  { region: 'europe-west1', memory: '1GiB', timeoutSeconds: 60, cors: true },
  async (request) => {
    const { message, organizationId, threadId: inputThreadId } = request.data || {};
    const uid = request.auth?.uid;

    console.log('[chatWithAlex] uid:', uid, 'orgId:', organizationId, 'threadId:', inputThreadId);

    if (!uid || !organizationId) {
      throw new HttpsError('unauthenticated', `Auth requis. uid=${uid}`);
    }
    if (!message) throw new HttpsError('invalid-argument', 'Message requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();

    try {
      // 0. Resolve threadId: input > activeThreadId > auto-create
      const stateRef = db.doc(`organizations/${organizationId}/alexMemory/conversationState`);
      const stateDoc = await stateRef.get();
      const stateData = stateDoc.exists ? stateDoc.data() : {};
      let threadId = inputThreadId || stateData.activeThreadId || null;

      if (!threadId) {
        const newThreadRef = db.collection(`organizations/${organizationId}/alexThreads`).doc();
        await newThreadRef.set({
          title: message.substring(0, 50),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: uid,
          phase: 'welcome',
          collectedData: {},
          lastMessage: '',
          messageCount: 0,
          archived: false,
        });
        threadId = newThreadRef.id;
        await stateRef.set({ activeThreadId: threadId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        console.log('[chatWithAlex] Auto-created thread:', threadId);
      }

      // 1. Lire l'etat depuis le thread doc (phase + collectedData)
      const threadRef = db.doc(`organizations/${organizationId}/alexThreads/${threadId}`);
      const threadDoc = await threadRef.get();
      let state;
      if (threadDoc.exists) {
        const td = threadDoc.data();
        state = { phase: td.phase || 'welcome', collectedData: td.collectedData || {} };
      } else {
        state = { phase: stateData.phase || 'welcome', collectedData: stateData.collectedData || {} };
      }

      // 2a. Auto-reset si historique vide dans ce thread ou dernier message > 24h
      const histRef = db.collection(`organizations/${organizationId}/alexConversations`);
      const lastMsgSnap = await histRef.where('threadId', '==', threadId).orderBy('timestamp', 'desc').limit(1).get();
      const isEmptyHistory = lastMsgSnap.empty;
      const lastMsgTs = !lastMsgSnap.empty ? lastMsgSnap.docs[0].data().timestamp?.toDate() : null;
      const isStale = lastMsgTs && (Date.now() - lastMsgTs.getTime() > 24 * 60 * 60 * 1000);

      if (isEmptyHistory || isStale) {
        state = { phase: 'welcome', collectedData: {} };
        await threadRef.update({ phase: 'welcome', collectedData: {}, updatedAt: FieldValue.serverTimestamp() }).catch(() => {});
        console.log('[chatWithAlex] AUTO-RESET — history empty:', isEmptyHistory, '| stale:', isStale);
      }

      // 2b. Detecter reset explicite
      const resetKeywords = ['recommence', 'repart', 'oublie tout', 'reset', 'change tout', 'on repart de zero'];
      if (resetKeywords.some(kw => message.toLowerCase().includes(kw))) {
        state = { phase: 'welcome', collectedData: {} };
        await threadRef.update({ phase: 'welcome', collectedData: {}, updatedAt: FieldValue.serverTimestamp() }).catch(() => {});
        console.log('[chatWithAlex] RESET explicite conversation state');
      }

      // 3. Detecter confirmation explicite — fast-track vers ready si on a assez de data
      const confirmKeywords = ["go", "lance", "c'est bon", "c'est parti", "oui", "yes", "parfait", "envoie", "demarrer", "start", "ok", "d'accord", "valide"];
      const isConfirm = confirmKeywords.some(kw => message.toLowerCase().includes(kw));
      const hasMinData = (state.collectedData?.business || state.collectedData?.offer) && state.collectedData?.zone;
      if (isConfirm && (state.phase === 'confirm' || hasMinData)) {
        state.phase = 'ready';
        await stateRef.set({ phase: 'ready', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        console.log('[chatWithAlex] Phase → ready (confirmation detectee, fast-track:', hasMinData ? 'oui' : 'non', ')');
      }

      // 4. Extraire les infos du message
      const extracted = await extractInfoFromMessage(message, state);
      console.log('[chatWithAlex] Extracted:', JSON.stringify(extracted));

      // Fusionner avec les donnees existantes (ne jamais ecraser avec null)
      const newData = { ...(state.collectedData || {}) };
      for (const [key, val] of Object.entries(extracted)) {
        if (val !== null && val !== undefined && key !== 'isConfirmation') {
          newData[key] = val;
        }
      }

      // 4b. Detecter si le message est une mission (ex: "trouve moi 30 prospects courtage energie")
      let missionActivated = null;
      try {
        const mission = await parseMission(message);
        if (mission) {
          missionActivated = await activateMission(organizationId, mission);
          console.log('[chatWithAlex] MISSION ACTIVEE:', mission.objective, '| target:', mission.target);
          // Auto-fill newData from mission
          if (mission.niche && !newData.business) newData.business = mission.niche;
          if (mission.zone && !newData.zone) newData.zone = mission.zone;
        }
      } catch (e) {
        console.warn('[chatWithAlex] Mission parse failed:', e.message);
      }

      // 4c. Detection directe de commandes/monitors dans le message
      // Bypass le LLM : si le user mentionne explicitement un monitor, on l'injecte
      const msgLower = message.toLowerCase();
      let autoInjectedActions = [];
      const MONITOR_KEYWORDS = {
        'france travail': 'france_travail_monitor',
        'google reviews': 'google_reviews_monitor', 'avis google': 'google_reviews_monitor',
        'google maps': 'google_business_scan', 'google business': 'google_business_scan',
        'reseaux sociaux': 'social_scan', 'instagram': 'social_scan', 'linkedin': 'social_scan',
        'bodacc': 'bodacc_monitor', 'immatriculation': 'bodacc_monitor',
        'leboncoin': 'leboncoin_monitor', 'bon coin': 'leboncoin_monitor',
        'forum': 'forums_scan',
        'subvention': 'subventions_monitor', 'aide': 'subventions_monitor',
        'serper': 'serper_hunt', 'cherche': 'serper_hunt',
        'email': 'email_infra_scan',
        'financ': 'financial_scan', 'societe.com': 'financial_scan', 'pappers': 'financial_scan',
        'nouveau site': 'ct_logs_monitor', 'ct log': 'ct_logs_monitor',
      };
      for (const [keyword, monitorType] of Object.entries(MONITOR_KEYWORDS)) {
        if (msgLower.includes(keyword)) {
          autoInjectedActions.push({ type: monitorType, params: { objective: newData.business || message }, reason: `Keyword detected: ${keyword}` });
          console.log(`[chatWithAlex] AUTO-INJECT monitor: ${monitorType} (keyword: "${keyword}")`);
          break; // un seul monitor auto-inject par message
        }
      }

      // Si le message est une commande de prospection ("active", "lance", "trouve", "prospecte")
      // et qu'on a business+zone, auto-inject intelligent_search aussi
      const isProspectCommand = /\b(active|lance|trouve|prospecte|cherche|demarre|scan)\b/i.test(message);
      if (isProspectCommand && newData.business && newData.zone) {
        autoInjectedActions.push({
          type: 'intelligent_search',
          params: { objective: `${newData.business} ${newData.zone}`, maxResults: 15 },
          reason: 'Commande de prospection detectee',
        });
        console.log('[chatWithAlex] AUTO-INJECT intelligent_search:', newData.business, newData.zone);
      }

      // 5. Determiner la prochaine phase
      const newPhase = determineNextPhase(state.phase, newData, extracted.isConfirmation);
      console.log('[chatWithAlex] Phase:', state.phase, '→', newPhase);

      // 6. Sauvegarder le nouvel etat dans le thread doc
      await threadRef.update({
        phase: newPhase,
        collectedData: newData,
        updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => {});

      // 6b. P0 FIX — Sync collectedData → businessProfile pour searchOrchestrator
      if (newData.business || newData.offer || newData.zone || newData.icp) {
        const bpUpdate = {};
        if (newData.business) bpUpdate.activity = newData.business;
        if (newData.offer) bpUpdate.services = newData.offer;
        if (newData.zone) bpUpdate.location = newData.zone;
        if (newData.icp) bpUpdate.targetAudience = newData.icp;
        if (newData.ticketMoyen) bpUpdate.averagePrice = newData.ticketMoyen;
        if (newData.volume) bpUpdate.goal = newData.volume;
        if (newData.channel) bpUpdate.preferredChannel = newData.channel;
        if (newData.pain) bpUpdate.painPoint = newData.pain;
        if (newData.competitors) bpUpdate.competitors = newData.competitors;
        if (newData.currentClients) bpUpdate.currentClients = newData.currentClients;

        db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).set({
          ...bpUpdate,
          updatedAt: FieldValue.serverTimestamp(),
          syncedFromChat: true,
        }, { merge: true }).catch(e => console.warn('[chatWithAlex] businessProfile sync failed:', e.message));
      }

      // 7. Charger l'historique + contexte org + optimizations + memory en parallèle
      let history = [];
      let orgContext = { hotProspects: [], recentReplies: [], kpis: {} };
      let alexOptimization = {};
      let memoryContext = {};
      try {
        const [hist, ctx, optSnap, memSnap] = await Promise.all([
          loadConversationHistory(organizationId, 15, threadId).catch(() => []),
          buildOrgContext(organizationId),
          db.doc(`organizations/${organizationId}/settings/alexOptimization`).get().catch(() => null),
          db.doc(`organizations/${organizationId}/alexMemory/memoryContext`).get().catch(() => null),
        ]);
        history = hist;
        orgContext = ctx;
        if (optSnap?.exists) alexOptimization = optSnap.data();
        if (memSnap?.exists) memoryContext = memSnap.data();
      } catch (e) {
        console.warn('[chatWithAlex] history/context failed:', e.message);
      }

      // 8. Construire le system prompt avec la phase, les donnees et le contexte org
      let missionSection = '';
      try {
        missionSection = await getMissionPromptSection(organizationId);
      } catch {}
      const systemPrompt = buildAlexSystemPrompt({ phase: newPhase, collectedData: newData }, newData, orgContext, alexOptimization, memoryContext)
        + (missionSection ? `\n\n${missionSection}` : '');

      // 9. Appeler le LLM
      const historyMessages = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const rawResponse = await callLLM(systemPrompt, historyMessages, true);
      console.log('[chatWithAlex] Raw LLM response:', rawResponse.substring(0, 300));

      const { message: alexMessage, actions: rawActions, suggestions } = parseAlexResponse(rawResponse);

      // 10. Gating des actions : données toujours autorisées, intelligent_search seulement en ready
      const finalActions = rawActions.filter(a =>
        ALWAYS_ALLOWED_ACTIONS.includes(a.type) || newPhase === 'ready'
      );

      const blocked = rawActions.filter(a =>
        !ALWAYS_ALLOWED_ACTIONS.includes(a.type) && newPhase !== 'ready'
      );
      if (blocked.length > 0) {
        console.log('[chatWithAlex] Actions BLOQUEES (phase:', newPhase, '):', blocked.map(a => a.type).join(', '));
      }

      // 11. Executer les actions data en synchrone, les autres en arrière-plan
      let actionData = {};
      const syncActions = finalActions.filter(a => DATA_ACTIONS.includes(a.type));
      const bgActions = finalActions.filter(a => !DATA_ACTIONS.includes(a.type));

      // If a mission was just activated, auto-inject intelligent_search action
      if (missionActivated && !syncActions.some(a => a.type === 'intelligent_search')) {
        const missionSearchAction = {
          type: 'intelligent_search',
          params: {
            objective: missionActivated.objective,
            maxResults: Math.min(missionActivated.target, 30),
          },
          reason: `Mission auto-lancee: ${missionActivated.objective}`,
        };
        syncActions.push(missionSearchAction);
        finalActions.push(missionSearchAction);
      }

      // Auto-inject monitors/search from keyword detection (bypass LLM action selection)
      for (const injected of autoInjectedActions) {
        const alreadyPresent = finalActions.some(a => a.type === injected.type);
        if (!alreadyPresent) {
          if (DATA_ACTIONS.includes(injected.type)) {
            syncActions.push(injected);
          } else {
            bgActions.push(injected);
          }
          finalActions.push(injected);
          console.log(`[chatWithAlex] Injected action: ${injected.type}`);
        }
      }

      if (syncActions.length > 0) {
        try {
          const syncResults = await executeAlexActions(syncActions, organizationId, uid);
          syncResults.forEach((r, i) => { actionData[syncActions[i].type] = r; });

          // Update mission progress for intelligent_search results
          for (let i = 0; i < syncResults.length; i++) {
            if (syncActions[i].type === 'intelligent_search' && syncResults[i]?.qualified > 0) {
              try {
                await updateMissionProgress(organizationId, 'found', syncResults[i].qualified);
                console.log(`[chatWithAlex] Mission progress +${syncResults[i].qualified} found`);
              } catch {}
            }
          }
        } catch (actErr) {
          console.warn('[chatWithAlex] syncActions failed:', actErr.message);
        }
      }

      if (bgActions.length > 0) {
        executeAlexActions(bgActions, organizationId, uid).catch(actErr => {
          console.warn('[chatWithAlex] bgActions failed:', actErr.message);
        });
      }

      // 12. Sauvegarder dans l'historique avec threadId
      const batch = db.batch();
      const convRef = db.collection(`organizations/${organizationId}/alexConversations`);

      batch.set(convRef.doc(), {
        role: 'user',
        content: message,
        timestamp: FieldValue.serverTimestamp(),
        userId: uid,
        threadId,
      });

      batch.set(convRef.doc(), {
        role: 'assistant',
        content: alexMessage,
        actions: finalActions,
        actionData,
        suggestions,
        phase: newPhase,
        timestamp: FieldValue.serverTimestamp(),
        threadId,
      });

      // Update thread metadata
      const isFirstMsg = isEmptyHistory;
      const threadUpdate = {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessage: (alexMessage || '').substring(0, 80),
        messageCount: FieldValue.increment(2),
        phase: newPhase,
      };
      if (isFirstMsg) {
        threadUpdate.title = message.substring(0, 50);
      }
      batch.update(threadRef, threadUpdate);

      await batch.commit();

      return { message: alexMessage, actions: finalActions, actionData, suggestions, phase: newPhase, threadId };

    } catch (err) {
      console.error('[chatWithAlex] Error:', err.message, err.stack);
      throw new HttpsError('internal', `Alex error: ${err.message}`);
    }
  }
);

/**
 * Nouvelle conversation — cree un nouveau thread (ne supprime plus les anciens messages)
 */
export const resetAlexConversation = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    const { organizationId } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();

    // Creer un nouveau thread
    const threadRef = db.collection(`organizations/${organizationId}/alexThreads`).doc();
    const now = FieldValue.serverTimestamp();

    await threadRef.set({
      title: 'Nouvelle conversation',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      phase: 'welcome',
      collectedData: {},
      lastMessage: '',
      messageCount: 0,
      archived: false,
    });

    // Set as active thread
    await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).set({
      activeThreadId: threadRef.id,
      updatedAt: now,
    }, { merge: true });

    console.log('[resetAlexConversation] orgId:', organizationId, '| new threadId:', threadRef.id);
    return { success: true, threadId: threadRef.id };
  }
);

/**
 * Version interne — WhatsApp (pas d'auth Firebase)
 */
export async function chatWithAlexInternal(message, organizationId, userId) {
  const db = getDb();

  const stateDoc = await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).get();
  const state = stateDoc.exists ? stateDoc.data() : { phase: 'welcome', collectedData: {} };

  const extracted = await extractInfoFromMessage(message, state);
  const newData = { ...(state.collectedData || {}) };
  for (const [key, val] of Object.entries(extracted)) {
    if (val !== null && val !== undefined && key !== 'isConfirmation') newData[key] = val;
  }

  // Detecter mission
  let missionActivated = null;
  try {
    const mission = await parseMission(message);
    if (mission) {
      missionActivated = await activateMission(organizationId, mission);
      console.log('[chatWithAlexInternal] MISSION ACTIVEE:', mission.objective);
    }
  } catch {}

  const newPhase = determineNextPhase(state.phase, newData, extracted.isConfirmation);

  await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).set({
    phase: newPhase, collectedData: newData, updatedAt: FieldValue.serverTimestamp(),
  });

  // Sync businessProfile (same as chatWithAlex)
  if (newData.business || newData.offer || newData.zone || newData.icp) {
    const bpUpdate = {};
    if (newData.business) bpUpdate.activity = newData.business;
    if (newData.offer) bpUpdate.services = newData.offer;
    if (newData.zone) bpUpdate.location = newData.zone;
    if (newData.icp) bpUpdate.targetAudience = newData.icp;
    if (newData.ticketMoyen) bpUpdate.averagePrice = newData.ticketMoyen;
    if (newData.volume) bpUpdate.goal = newData.volume;
    if (newData.channel) bpUpdate.preferredChannel = newData.channel;
    db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).set({
      ...bpUpdate, updatedAt: FieldValue.serverTimestamp(), syncedFromChat: true,
    }, { merge: true }).catch(() => {});
  }

  let history = [];
  try { history = await loadConversationHistory(organizationId, 15); } catch {}

  let missionSection = '';
  try { missionSection = await getMissionPromptSection(organizationId); } catch {}

  const systemPrompt = buildAlexSystemPrompt({ phase: newPhase }, newData) + `

## FORMAT WHATSAPP
Messages courts (max 500 chars). Emojis naturels. JSON uniquement.`
    + (missionSection ? `\n\n${missionSection}` : '');

  const rawResponse = await callLLM(systemPrompt, [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ], true);

  const { message: alexMessage, actions: rawActions, suggestions } = parseAlexResponse(rawResponse);
  const finalActions = rawActions.filter(a =>
    ALWAYS_ALLOWED_ACTIONS.includes(a.type) || newPhase === 'ready'
  );

  // Auto-inject intelligent_search if mission was just activated
  if (missionActivated && !finalActions.some(a => a.type === 'intelligent_search')) {
    finalActions.push({
      type: 'intelligent_search',
      params: { objective: missionActivated.objective, maxResults: Math.min(missionActivated.target, 30) },
      reason: `Mission auto-lancee: ${missionActivated.objective}`,
    });
  }

  if (finalActions.length > 0) {
    const results = await executeAlexActions(finalActions, organizationId, userId);
    // Update mission progress
    for (let i = 0; i < results.length; i++) {
      if (finalActions[i].type === 'intelligent_search' && results[i]?.qualified > 0) {
        try { await updateMissionProgress(organizationId, 'found', results[i].qualified); } catch {}
      }
    }
  }

  const batch = db.batch();
  const convRef = db.collection(`organizations/${organizationId}/alexConversations`);
  batch.set(convRef.doc(), { role: 'user', content: message, timestamp: FieldValue.serverTimestamp(), userId, via: 'whatsapp' });
  batch.set(convRef.doc(), { role: 'assistant', content: alexMessage, actions: finalActions, suggestions, phase: newPhase, timestamp: FieldValue.serverTimestamp(), via: 'whatsapp' });
  await batch.commit();

  return { message: alexMessage, actions: finalActions, suggestions, phase: newPhase };
}
