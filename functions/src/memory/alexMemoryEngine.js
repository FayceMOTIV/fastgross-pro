/**
 * alexMemoryEngine.js
 * Coeur du systeme de memoire Alex — 3 couches (Generative Agents / A-MEM / MIRIX 2025).
 *
 * Fonctions principales :
 *   - saveEpisodicMemory(event) — enregistre un evenement de conversation
 *   - extractAndConsolidate(nafCode, zone) — extrait les patterns (batch nocturne)
 *   - retrieveRelevantMemory(context) — recupere la memoire pertinente
 *   - buildAlexMemoryContext(nafCode, zone, channel) — construit le contexte pour le system prompt
 *
 * Score de retrieval = alpha*recency + beta*importance + gamma*relevance (Generative Agents)
 *
 * Collections Firestore :
 *   - alexEpisodicMemory/{memoryId}     — evenements individuels avec embedding
 *   - alexSemanticMemory/{nafCode}_{zone} — patterns par niche+zone avec KNN
 *   - alexProceduralMemory/{scope}_{nafCode} — regles auto-generees
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { logger } from 'firebase-functions';

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

// -- SCORE DE RETRIEVAL (formule Generative Agents)
const ALPHA = 0.3; // poids recency
const BETA  = 0.3; // poids importance
const GAMMA = 0.4; // poids relevance (semantique)

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return normA && normB ? dot / (normA * normB) : 0;
}

// -- EMBEDDING (Gemini embedding-001)
async function embedText(text) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (e) {
    logger.warn('embedText error:', e.message);
    return null;
  }
}

// -- GROQ with fallback
async function callGroq(messages, maxTokens = 500) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  for (const model of GROQ_MODELS) {
    try {
      const comp = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages
      });
      return comp.choices[0]?.message?.content || '{}';
    } catch (e) {
      if (e.status === 429 && model !== GROQ_MODELS[GROQ_MODELS.length - 1]) continue;
      throw e;
    }
  }
  return '{}';
}

// -- ANONYMISATION RGPD
function anonymizeMessage(text) {
  if (!text) return '';
  return text
    .replace(/(\+33|0)\s?[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g, '[TEL]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{14}\b/g, '[SIRET]')
    .replace(/\b\d{9}\b/g, '[SIREN]')
    .replace(/M\.?\s+[A-Z][a-z]+\s+[A-Z][A-Z]+/g, '[CONTACT]')
    .replace(/Mme\.?\s+[A-Z][a-z]+\s+[A-Z][A-Z]+/g, '[CONTACT]');
}

// ============================================================
// SAVE EPISODIC MEMORY
// ============================================================
export async function saveEpisodicMemory({
  clientId, sessionId, leadNaf, leadZone,
  event, messageContent, messageChannel,
  responseReceived, responseDelayMin, score, tags
}) {
  const db = getFirestore();
  const anonymized = anonymizeMessage(messageContent);
  const embedding = await embedText(anonymized);

  // Calculer l'importance avec Groq (1-10)
  let importance = 5;
  try {
    const raw = await callGroq([{
      role: 'user',
      content: `Sur une echelle de 1 a 10, quelle est l'importance de cet evenement pour ameliorer la prospection ?
Evenement : ${event}
Canal : ${messageChannel}
Reponse recue : ${responseReceived}
Score : ${score}
Tags : ${tags?.join(', ')}
Reponds en JSON : {"importance": <1-10>}`
    }], 20);
    const parsed = JSON.parse(raw);
    const val = parsed.importance;
    if (val >= 1 && val <= 10) importance = val;
  } catch { /* keep default 5 */ }

  const doc = {
    clientId,
    sessionId,
    leadNaf: leadNaf || '',
    leadZone: leadZone || '',
    timestamp: new Date(),
    event,
    messageContent: anonymized,
    messageChannel: messageChannel || 'unknown',
    responseReceived: !!responseReceived,
    responseDelayMin: responseDelayMin || null,
    score: score || 5,
    tags: tags || [],
    importance,
    processedForSemantic: false
  };

  if (embedding) {
    doc.embedding = FieldValue.vector(embedding);
  }

  const ref = await db.collection('alexEpisodicMemory').add(doc);
  logger.info(`Episodic memory saved: ${ref.id} | naf=${leadNaf} zone=${leadZone} imp=${importance}`);
  return ref.id;
}

// ============================================================
// EXTRACT AND CONSOLIDATE (batch nocturne)
// ============================================================
export async function extractAndConsolidate(nafCode, zone, limitDays = 30) {
  const db = getFirestore();
  logger.info(`Consolidating memory naf=${nafCode} zone=${zone}`);

  const since = new Date(Date.now() - limitDays * 24 * 3600 * 1000);
  const snapshot = await db.collection('alexEpisodicMemory')
    .where('leadNaf', '==', nafCode)
    .where('leadZone', '==', zone)
    .where('processedForSemantic', '==', false)
    .where('timestamp', '>=', since)
    .limit(200)
    .get();

  if (snapshot.empty) {
    logger.info(`No new episodic memories for ${nafCode}_${zone}`);
    return null;
  }

  const memories = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  logger.info(`Processing ${memories.length} memories for ${nafCode}_${zone}`);

  const corpus = memories.map(m =>
    `[${m.event}] Canal:${m.messageChannel} Score:${m.score} Reponse:${m.responseReceived ? 'OUI' : 'NON'} Tags:${m.tags?.join(',')}\nMessage: ${m.messageContent?.slice(0, 200)}`
  ).join('\n---\n');

  const analysisPrompt = `Tu es un expert en prospection commerciale B2B. Analyse ces ${memories.length} evenements de conversation dans la niche NAF ${nafCode} en zone ${zone}.

CORPUS :
${corpus.slice(0, 8000)}

Extrais en JSON strict :
{
  "patterns": [
    {"trigger": "declencheur du message", "response": "type de reponse qui a bien fonctionne", "conversionRate": 0.5, "occurrences": 3}
  ],
  "objections": [
    {"objection": "formulation de l'objection", "bestResponse": "reponse qui a converti", "conversionRate": 0.5, "occurrences": 2}
  ],
  "timing": {
    "bestDayOfWeek": 1,
    "bestHourOfDay": 10,
    "avgResponseDelay": 45,
    "confidence": 0.7
  },
  "keywords": [
    {"word": "mot", "impact": "positive", "conversionDelta": 0.3}
  ],
  "proceduralRules": ["regle apprise"],
  "tabooWords": ["mot1"],
  "preferredOpeners": ["accroche validee 1", "accroche validee 2", "accroche validee 3"],
  "insights": "resume textuel des 3 apprentissages cles"
}`;

  let analysis;
  try {
    const raw = await callGroq([{ role: 'user', content: analysisPrompt }], 1000);
    analysis = JSON.parse(raw);
  } catch (e) {
    logger.error('extractAndConsolidate Groq error', e);
    return null;
  }

  // Embedding du document semantique
  const semanticText = `${nafCode} ${zone} ${analysis.insights || ''} ${analysis.preferredOpeners?.join(' ') || ''}`;
  const embedding = await embedText(semanticText);

  // Upsert dans alexSemanticMemory
  const docRef = db.doc(`alexSemanticMemory/${nafCode}_${zone}`);
  const existingSnap = await docRef.get();
  const existing = existingSnap.data() || {};

  const updateData = {
    nafCode,
    zone,
    secteur: existing.secteur || nafCode,
    patterns: mergeArrayWithDedup(existing.patterns || [], analysis.patterns || [], 'trigger'),
    objections: mergeArrayWithDedup(existing.objections || [], analysis.objections || [], 'objection'),
    timing: (analysis.timing?.confidence || 0) > (existing.timing?.confidence || 0)
      ? analysis.timing
      : (existing.timing || {}),
    keywords: mergeArrayWithDedup(existing.keywords || [], analysis.keywords || [], 'word'),
    sampleSize: (existing.sampleSize || 0) + memories.length,
    lastUpdated: new Date(),
    insights: analysis.insights || existing.insights || null
  };

  if (embedding) {
    updateData.embedding = FieldValue.vector(embedding);
  }

  await docRef.set(updateData, { merge: true });

  // Mise a jour des regles procedurales (globales)
  if (analysis.proceduralRules?.length > 0 || analysis.tabooWords?.length > 0 || analysis.preferredOpeners?.length > 0) {
    const rulesRef = db.doc(`alexProceduralMemory/global_${nafCode}`);
    const rulesData = {
      clientId: 'global',
      nafCode,
      lastUpdated: new Date()
    };

    if (analysis.proceduralRules?.length > 0) {
      rulesData.rules = FieldValue.arrayUnion(
        ...analysis.proceduralRules.map(r => ({
          rule: r,
          addedAt: new Date().toISOString(),
          confidence: 0.7,
          violations: 0
        }))
      );
    }

    if (analysis.tabooWords?.length > 0) {
      rulesData.tabooWords = FieldValue.arrayUnion(...analysis.tabooWords);
    }

    if (analysis.preferredOpeners?.length > 0) {
      rulesData.preferredOpeners = analysis.preferredOpeners;
    }

    rulesData.version = FieldValue.increment(1);
    await rulesRef.set(rulesData, { merge: true });
  }

  // Marquer les episodes comme traites
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { processedForSemantic: true });
  }
  await batch.commit();

  logger.info(`Memory consolidated for ${nafCode}_${zone}: ${memories.length} episodes processed`);
  return { nafCode, zone, episodesProcessed: memories.length, analysis };
}

// ============================================================
// RETRIEVE RELEVANT MEMORY
// ============================================================
export async function retrieveRelevantMemory({ nafCode, zone, currentMessage, channel }) {
  const db = getFirestore();
  const results = {
    semantic: null,
    procedural: null,
    similarEpisodes: []
  };

  // 1. Memoire semantique directe (niche + zone)
  const semanticDoc = await db.doc(`alexSemanticMemory/${nafCode}_${zone}`).get();
  if (semanticDoc.exists) results.semantic = semanticDoc.data();

  // 2. Cross-niche via vector search (si pas assez de donnees locales)
  if (!results.semantic || (results.semantic.sampleSize || 0) < 10) {
    try {
      const queryEmbedding = await embedText(`${nafCode} ${currentMessage || ''}`);
      if (queryEmbedding) {
        const vectorQuery = db.collection('alexSemanticMemory')
          .findNearest('embedding', FieldValue.vector(queryEmbedding), {
            limit: 3,
            distanceMeasure: 'COSINE'
          });
        const vectorResults = await vectorQuery.get();
        const crossNiche = vectorResults.docs.map(d => d.data());
        if (crossNiche.length > 0 && !results.semantic) {
          results.semantic = {
            ...crossNiche[0],
            isCrossNiche: true,
            crossNicheWeight: 0.5
          };
        }
      }
    } catch (e) {
      logger.warn('Vector search error (index may not exist yet):', e.message);
    }
  }

  // 3. Regles procedurales (globales pour cette niche)
  const procDoc = await db.doc(`alexProceduralMemory/global_${nafCode}`).get();
  if (procDoc.exists) results.procedural = procDoc.data();

  // 4. Episodes similaires recents (via vector search)
  if (currentMessage) {
    try {
      const msgEmbedding = await embedText(currentMessage);
      if (msgEmbedding) {
        const episodeQuery = db.collection('alexEpisodicMemory')
          .where('leadNaf', '==', nafCode)
          .where('responseReceived', '==', true)
          .findNearest('embedding', FieldValue.vector(msgEmbedding), {
            limit: 5,
            distanceMeasure: 'COSINE'
          });
        const episodeResults = await episodeQuery.get();
        results.similarEpisodes = episodeResults.docs.map(d => ({
          ...d.data(),
          id: d.id
        }));
      }
    } catch (e) {
      logger.warn('Episode vector search error:', e.message);
    }
  }

  return results;
}

// ============================================================
// BUILD ALEX MEMORY CONTEXT (injection dans le system prompt)
// ============================================================
export async function buildAlexMemoryContext(nafCode, zone, channel) {
  const memory = await retrieveRelevantMemory({ nafCode, zone, channel });
  const parts = [];

  if (memory.semantic && (memory.semantic.sampleSize || 0) > 0) {
    const s = memory.semantic;
    const crossLabel = s.isCrossNiche ? ` (niche similaire — ${Math.round((s.crossNicheWeight || 0.5) * 100)}% pertinence)` : '';

    parts.push(`## CE QU'ALEX SAIT SUR CETTE NICHE${crossLabel}`);

    if (s.timing?.confidence > 0.5) {
      const jours = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
      parts.push(`**Timing optimal :** ${jours[s.timing.bestDayOfWeek] || 'N/A'} a ${s.timing.bestHourOfDay || 'N/A'}h (${Math.round(s.timing.confidence * 100)}% confiance)`);
    }

    if (s.patterns?.length > 0) {
      const top3 = [...s.patterns].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0)).slice(0, 3);
      parts.push(`**Patterns qui convertissent :**`);
      for (const p of top3) {
        parts.push(`- "${p.trigger}" -> "${p.response}" (${Math.round((p.conversionRate || 0) * 100)}% conv, ${p.occurrences || 0} obs.)`);
      }
    }

    if (s.objections?.length > 0) {
      const topObj = [...s.objections].sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0)).slice(0, 3);
      parts.push(`**Objections frequentes + reponses validees :**`);
      for (const o of topObj) {
        parts.push(`- Objection : "${o.objection}" -> Reponse : "${o.bestResponse}" (${Math.round((o.conversionRate || 0) * 100)}% conv)`);
      }
    }

    if (s.preferredOpeners?.length > 0) {
      parts.push(`**Top accroches validees :**`);
      s.preferredOpeners.slice(0, 3).forEach((a, i) => parts.push(`${i + 1}. "${a}"`));
    }

    if (s.keywords?.length > 0) {
      const pos = s.keywords.filter(k => k.impact === 'positive').slice(0, 5).map(k => k.word);
      const neg = s.keywords.filter(k => k.impact === 'negative').slice(0, 5).map(k => k.word);
      if (pos.length) parts.push(`**Mots qui convertissent :** ${pos.join(', ')}`);
      if (neg.length) parts.push(`**Mots a eviter :** ${neg.join(', ')}`);
    }

    if (s.insights) {
      parts.push(`**Insight cle :** ${s.insights}`);
    }

    parts.push(`*(${s.sampleSize} conversations analysees)*`);
  }

  if (memory.procedural?.rules?.length > 0) {
    parts.push(`\n## REGLES QU'ALEX S'EST FIXEES`);
    const highConfRules = memory.procedural.rules
      .filter(r => (r.confidence || 0) >= 0.6)
      .slice(0, 5);
    for (const r of highConfRules) {
      parts.push(`- ${r.rule}`);
    }

    if (memory.procedural.tabooWords?.length > 0) {
      parts.push(`**Mots tabous dans cette niche :** ${memory.procedural.tabooWords.join(', ')}`);
    }
  }

  if (memory.similarEpisodes?.length > 0) {
    const converted = memory.similarEpisodes.filter(e => e.messageContent && e.responseReceived).slice(0, 3);
    if (converted.length > 0) {
      parts.push(`\n## CONVERSATIONS SIMILAIRES RECENTES QUI ONT CONVERTI`);
      for (const e of converted) {
        parts.push(`- Canal ${e.messageChannel}: "${e.messageContent.slice(0, 100)}..." -> reponse recue`);
      }
    }
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

// ============================================================
// DETECT TAGS FROM RESPONSE
// ============================================================
export function detectResponseTags(response) {
  if (!response) return ['no_response'];
  const tags = [];
  const lower = response.toLowerCase();
  if (/non merci|pas interesse|arretez|stop|desabonner/i.test(lower)) tags.push('refus');
  if (/rdv|rendez-vous|disponible|quand|on peut se voir/i.test(lower)) tags.push('interet_rdv');
  if (/prix|cout|combien|tarif|budget/i.test(lower)) tags.push('objection_prix');
  if (/merci|interessant|parfait|super|genial/i.test(lower)) tags.push('positif');
  if (/pas le temps|occupe|plus tard|rappel/i.test(lower)) tags.push('objection_temps');
  if (/deja un prestataire|on a deja|fournisseur/i.test(lower)) tags.push('objection_concurrent');
  if (tags.length === 0) tags.push('neutre');
  return tags;
}

// ============================================================
// UTILS
// ============================================================
function mergeArrayWithDedup(existing, newItems, keyField) {
  const map = new Map(existing.map(item => [item[keyField], item]));
  for (const item of newItems) {
    const key = item[keyField];
    if (!key) continue;
    if (map.has(key)) {
      const prev = map.get(key);
      const totalOcc = (prev.occurrences || 0) + (item.occurrences || 0);
      map.set(key, {
        ...prev,
        ...item,
        occurrences: totalOcc,
        conversionRate: totalOcc > 0
          ? ((prev.conversionRate || 0) * (prev.occurrences || 0) + (item.conversionRate || 0) * (item.occurrences || 0)) / totalOcc
          : item.conversionRate || 0
      });
    } else {
      map.set(key, item);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0))
    .slice(0, 50);
}
