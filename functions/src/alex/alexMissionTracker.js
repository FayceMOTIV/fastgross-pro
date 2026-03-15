/**
 * alexMissionTracker.js — Systeme de missions Alex
 *
 * Quand le user dit "trouve moi 30 prospects courtage energie aujourd'hui",
 * Alex parse l'objectif en mission structuree, l'execute, et track la progression.
 *
 * Firestore: organizations/{orgId}/alexMemory/currentMission
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Groq from 'groq-sdk';
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js';

const getDb = () => getFirestore();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Mapping mots francais approximatifs → chiffres
 * Applique AVANT l'envoi a Groq pour garantir la detection
 */
const FRENCH_NUMBER_WORDS = [
  // Ordre important : expressions longues d'abord pour eviter les remplcements partiels
  [/\bun maximum de\b/gi, '50'],
  [/\ble plus possible de\b/gi, '50'],
  [/\bune dizaine\s+de\b/gi, '10'],
  [/\bune vingtaine\s+de\b/gi, '20'],
  [/\bune trentaine\s+de\b/gi, '30'],
  [/\bune quarantaine\s+de\b/gi, '40'],
  [/\bune cinquantaine\s+de\b/gi, '50'],
  [/\bune centaine\s+de\b/gi, '100'],
  [/\bune dizaine\b/gi, '10'],
  [/\bune vingtaine\b/gi, '20'],
  [/\bune trentaine\b/gi, '30'],
  [/\bune quarantaine\b/gi, '40'],
  [/\bune cinquantaine\b/gi, '50'],
  [/\bune centaine\b/gi, '100'],
  [/\bquelques\b/gi, '5'],
  [/\bplusieurs\b/gi, '10'],
];

/**
 * Convertit les mots-nombres francais en chiffres dans un message
 */
function preprocessFrenchNumbers(text) {
  let result = text;
  for (const [pattern, replacement] of FRENCH_NUMBER_WORDS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Convertit un target Groq potentiellement textuel en nombre
 * Fallback si Groq retourne "vingtaine" au lieu de 20
 */
const WORD_TO_NUMBER_MAP = {
  dizaine: 10,
  vingtaine: 20,
  trentaine: 30,
  quarantaine: 40,
  cinquantaine: 50,
  centaine: 100,
  quelques: 5,
  plusieurs: 10,
};

function normalizeTarget(raw) {
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  const str = String(raw).trim().toLowerCase();
  const asInt = parseInt(str, 10);
  if (!isNaN(asInt)) return asInt;
  if (WORD_TO_NUMBER_MAP[str]) return WORD_TO_NUMBER_MAP[str];
  return null;
}

/**
 * Parse un objectif en langage naturel en mission structuree
 * @param {string} message - Ex: "trouve moi 30 prospects courtage energie aujourd'hui"
 * @returns {Object|null} Mission structuree ou null si pas une mission
 */
export async function parseMission(message) {
  // Pre-traitement : convertir mots-nombres francais en chiffres
  const normalizedMessage = preprocessFrenchNumbers(message);

  // Detection rapide : le message contient-il un chiffre + un verbe d'action ?
  const hasNumber = /\d+/.test(normalizedMessage);
  const hasAction = /trouv|prospect|client|contact|transform|convert|genere|cherche|ramene|decroche|veux|besoin|faut|donne/i.test(normalizedMessage);

  if (!hasNumber || !hasAction) return null;

  const MISSION_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  try {
    let response;
    for (const model of MISSION_MODELS) {
      try {
        response = await getGroq().chat.completions.create({
          model,
          messages: [{
            role: 'user',
            content: `Analyse ce message et extrais la mission de prospection avec TOUS les criteres precis. Reponds en JSON.

Message : "${normalizedMessage}"

{
  "isMission": true/false,
  "objective": "description courte de l'objectif",
  "target": nombre de prospects/clients vises (integer),
  "niche": "secteur/niche detecte (ex: courtage_energie, restaurant, plombier, etc.)",
  "action": "find" | "contact" | "convert" | "find_and_contact",
  "deadline": "today" | "this_week" | "this_month",
  "zone": "zone geographique si mentionnee, sinon null",
  "criteria": {
    "minRevenue": chiffre d'affaires MINIMUM annuel en euros (integer ou null si pas mentionne),
    "maxRevenue": chiffre d'affaires MAXIMUM annuel en euros (integer ou null),
    "minEmployees": nombre MINIMUM de salaries (integer ou null),
    "maxEmployees": nombre MAXIMUM de salaries (integer ou null),
    "mustHaveWebsite": true si le user exige un site web, sinon false,
    "mustHaveEmail": true si le user exige un email, sinon false,
    "mustHavePhone": true si le user exige un telephone, sinon false,
    "excludeStatuses": ["liquidation", "radiation", "cessation"] si le user exclut certains statuts, sinon [],
    "legalForms": ["SAS", "SARL", "EURL", "SA", "SCI"] si formes juridiques specifiees, sinon [],
    "codeNaf": "code NAF specifique si mentionne, sinon null",
    "yearFounded": { "min": annee min, "max": annee max } si mentionne, sinon null,
    "keywords": ["mots-cles supplementaires"] si le user precise des specialites, sinon [],
    "customFilters": "toute autre condition non couverte ci-dessus, en texte libre"
  }
}

EXEMPLES de parsing :
- "30 plombiers a Paris CA > 2M" → minRevenue: 2000000, zone: "Paris"
- "20 SAS de + de 50 salaries" → minEmployees: 50, legalForms: ["SAS"]
- "entreprises creees apres 2020" → yearFounded: { min: 2020, max: null }
- "pas de societes en liquidation" → excludeStatuses: ["liquidation"]

Si le message n'est PAS une mission de prospection, mets isMission: false.`,
          }],
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        });
        break; // success, exit model loop
      } catch (e) {
        if (e.status === 429 && model === MISSION_MODELS[0]) {
          console.warn(`[Mission] Rate limit 70b, fallback → ${MISSION_MODELS[1]}`);
          continue;
        }
        throw e;
      }
    }

    const parsed = safeParseLLMJson(response.choices[0].message.content);
    if (!parsed.isMission) return null;

    // Nettoyer les criteres : supprimer les nulls et les arrays vides
    const rawCriteria = parsed.criteria || {};
    const criteria = {};
    for (const [key, value] of Object.entries(rawCriteria)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'boolean' && value === false) continue;
      criteria[key] = value;
    }

    return {
      objective: parsed.objective,
      target: normalizeTarget(parsed.target) || 10,
      niche: parsed.niche || null,
      action: parsed.action || 'find_and_contact',
      deadline: parsed.deadline || 'today',
      zone: parsed.zone || null,
      criteria: Object.keys(criteria).length > 0 ? criteria : null,
    };
  } catch (error) {
    console.warn('[Mission] Parse error:', error.message);
    return null;
  }
}

/**
 * Active une mission pour une organisation
 */
export async function activateMission(organizationId, mission) {
  const db = getDb();

  const missionData = {
    ...mission,
    current: 0,
    contacted: 0,
    replied: 0,
    converted: 0,
    status: 'active',
    startedAt: new Date(),
    updatedAt: new Date(),
    phases: {
      search: { status: 'pending', count: 0 },
      contact: { status: 'pending', count: 0 },
      reply: { status: 'pending', count: 0 },
      convert: { status: 'pending', count: 0 },
    },
  };

  await db.doc(`organizations/${organizationId}/alexMemory/currentMission`).set(missionData);

  console.log(`[Mission] Mission activee pour ${organizationId}: ${mission.objective} (target: ${mission.target})`);

  return missionData;
}

/**
 * Met a jour la progression d'une mission
 * @param {string} organizationId
 * @param {string} event - 'found' | 'contacted' | 'replied' | 'converted'
 * @param {number} count - Nombre a ajouter (defaut: 1)
 */
export async function updateMissionProgress(organizationId, event, count = 1) {
  const db = getDb();
  const ref = db.doc(`organizations/${organizationId}/alexMemory/currentMission`);
  const doc = await ref.get();

  if (!doc.exists || doc.data().status !== 'active') return null;

  const updates = { updatedAt: new Date() };

  switch (event) {
    case 'found':
      updates.current = FieldValue.increment(count);
      updates['phases.search.status'] = 'in_progress';
      updates['phases.search.count'] = FieldValue.increment(count);
      break;
    case 'contacted':
      updates.contacted = FieldValue.increment(count);
      updates['phases.contact.status'] = 'in_progress';
      updates['phases.contact.count'] = FieldValue.increment(count);
      break;
    case 'replied':
      updates.replied = FieldValue.increment(count);
      updates['phases.reply.status'] = 'in_progress';
      updates['phases.reply.count'] = FieldValue.increment(count);
      break;
    case 'converted':
      updates.converted = FieldValue.increment(count);
      updates['phases.convert.status'] = 'in_progress';
      updates['phases.convert.count'] = FieldValue.increment(count);
      break;
  }

  await ref.update(updates);

  // Verifier si mission complete
  const updated = (await ref.get()).data();
  if (updated.current >= updated.target) {
    await ref.update({
      'phases.search.status': 'completed',
      status: updated.contacted >= updated.target ? 'completed' : 'active',
    });
  }

  return updated;
}

/**
 * Retourne l'etat de la mission en cours
 */
export async function getMissionProgress(organizationId) {
  const db = getDb();
  const doc = await db.doc(`organizations/${organizationId}/alexMemory/currentMission`).get();

  if (!doc.exists) return null;

  const data = doc.data();
  const pct = data.target > 0 ? Math.round((data.current / data.target) * 100) : 0;

  return {
    ...data,
    progressPercent: Math.min(pct, 100),
    progressBar: buildProgressBar(pct),
    summary: buildMissionSummary(data),
  };
}

/**
 * Verifie si une mission est active
 */
export async function isMissionActive(organizationId) {
  const db = getDb();
  const doc = await db.doc(`organizations/${organizationId}/alexMemory/currentMission`).get();
  return doc.exists && doc.data().status === 'active';
}

/**
 * Genere la section mission pour le system prompt d'Alex
 */
export async function getMissionPromptSection(organizationId) {
  const progress = await getMissionProgress(organizationId);
  if (!progress || progress.status !== 'active') return '';

  return `
## MISSION EN COURS (PRIORITE ABSOLUE)
Objectif : ${progress.objective}
Cible : ${progress.target} prospects
Progression : ${progress.current}/${progress.target} (${progress.progressPercent}%)
${progress.progressBar}
Contactes : ${progress.contacted} | Reponses : ${progress.replied} | Convertis : ${progress.converted}
Niche : ${progress.niche || 'non specifiee'}
Zone : ${progress.zone || 'non specifiee'}
Deadline : ${progress.deadline}

Tu DOIS prioriser cette mission. A chaque interaction, rappelle la progression et propose des actions concretes pour avancer.
Si le user te parle d'autre chose, reponds puis ramene sur la mission.`;
}

function buildProgressBar(percent) {
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(Math.max(0, empty))}] ${percent}%`;
}

function buildMissionSummary(data) {
  const pct = data.target > 0 ? Math.round((data.current / data.target) * 100) : 0;

  if (pct >= 100) return `Mission accomplie ! ${data.current} prospects trouves sur ${data.target} vises.`;
  if (pct >= 75) return `Presque fini ! ${data.current}/${data.target} (${pct}%). On pousse !`;
  if (pct >= 50) return `A mi-chemin : ${data.current}/${data.target} (${pct}%). On continue.`;
  if (pct >= 25) return `Ca avance : ${data.current}/${data.target} (${pct}%). On accelere.`;
  return `Debut de mission : ${data.current}/${data.target} (${pct}%). Recherches en cours...`;
}
