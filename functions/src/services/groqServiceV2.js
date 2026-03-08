/**
 * Groq Service — Version améliorée avec Email Marketing Bible (Pépite #5)
 * + génération contenu social (Typefully) + structured outputs strict
 */

import Groq from 'groq-sdk';
import { buildEmailSystemPrompt, FOLLOWUP_ANGLES } from '../knowledge/emailBestPractices.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── SCHEMAS JSON STRICT ──────────────────────────────────────────────────────

const MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: 'Objet email (max 60 chars)' },
    message: { type: 'string', description: 'Corps du message' },
    hookType: { type: 'string', enum: ['curiosity', 'directValue', 'personal', 'urgency'] },
    structure: { type: 'string', enum: ['PAS', 'AIDA', 'BAB', 'DIRECT'] },
    ctaStyle: { type: 'string', enum: ['soft', 'direct', 'valueFirst'] },
    wordCount: { type: 'number' },
    estimatedOpenRate: { type: 'number', description: '0-1' },
    estimatedResponseRate: { type: 'number', description: '0-1' },
    personalizationElements: { type: 'array', items: { type: 'string' } },
  },
  required: ['message', 'hookType', 'structure', 'ctaStyle', 'wordCount', 'estimatedResponseRate', 'personalizationElements'],
  additionalProperties: false,
};

const FOLLOWUP_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    message: { type: 'string' },
    angle: { type: 'string', enum: ['different_value', 'social_proof', 'direct_ask', 'final_value'] },
    wordCount: { type: 'number' },
  },
  required: ['message', 'angle', 'wordCount'],
  additionalProperties: false,
};

const CONNECTION_NOTE_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'Note de connexion LinkedIn (max 300 chars)' },
    commonPoint: { type: 'string' },
    specificReason: { type: 'string' },
    charCount: { type: 'number' },
  },
  required: ['message', 'charCount'],
  additionalProperties: false,
};

const SOCIAL_CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Contenu du post' },
    hook: { type: 'string', description: 'La première phrase accroche' },
    platform: { type: 'string', enum: ['linkedin', 'twitter-threads', 'threads', 'bluesky'] },
    hashtags: { type: 'array', items: { type: 'string' } },
    callToAction: { type: 'string' },
    estimatedEngagementRate: { type: 'number' },
  },
  required: ['text', 'hook', 'platform', 'hashtags'],
  additionalProperties: false,
};

const SCORING_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '0-100' },
    qualification: { type: 'string', enum: ['hot', 'warm', 'cold', 'unqualified'] },
    topReason: { type: 'string' },
    recommendedChannel: { type: 'string', enum: ['email', 'whatsapp', 'linkedin', 'instagram'] },
  },
  required: ['score', 'qualification', 'topReason', 'recommendedChannel'],
  additionalProperties: false,
};

// ─── GROQ SERVICE ─────────────────────────────────────────────────────────────

export class GroqService {
  /**
   * Génère un message personnalisé pour un prospect
   * Utilise la Email Marketing Bible comme base
   */
  async generateMessage({ prospect, channel = 'email', template = null }) {
    const systemPrompt = buildEmailSystemPrompt(prospect, channel);

    const schema = channel === 'linkedin' && !template?.isDM ? CONNECTION_NOTE_SCHEMA : MESSAGE_SCHEMA;
    const schemaName = channel === 'email' ? 'email_message' : channel === 'linkedin' ? 'linkedin_message' : 'social_dm';

    const userPrompt = template
      ? `Génère un message en suivant ce template comme inspiration (ne pas copier mot pour mot) : "${template}"`
      : `Génère le meilleur message possible pour convertir ce prospect. Sois ultra-spécifique à sa situation.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: schemaName, strict: true, schema },
      },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content);

    // P2 — Enforce channel length limits post-generation
    if (result.message) {
      result.message = enforceChannelLength(result.message, channel);
    }

    return result;
  }

  /**
   * Génère un follow-up basé sur l'engagement actuel du prospect
   */
  async generateFollowUp({ prospect, followUpNumber = 1 }) {
    const angles = Object.values(FOLLOWUP_ANGLES);
    const angle = angles[Math.min(followUpNumber - 1, angles.length - 1)];

    const systemPrompt = `Tu es expert en cold email de relance.
Ce prospect n'a pas répondu au premier email. Tu dois relancer avec l'angle : ${angle.name} — "${angle.intro}"
Entreprise : ${prospect.name}, secteur ${prospect.industry || 'commerce'}.
Longueur : 60-90 mots max. Ton différent de la première approche.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Génère le follow-up.' },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'followup_message', strict: true, schema: FOLLOWUP_SCHEMA },
      },
      temperature: 0.8,
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Génère une note de connexion LinkedIn (max 300 chars)
   */
  async generateConnectionNote({ prospect }) {
    const systemPrompt = `Tu génères des notes de connexion LinkedIn ULTRA-courtes (max 300 chars).
Prospect : ${prospect.directorFirstName || ''} ${prospect.name || ''} — ${prospect.industry || ''}.
Règle : 1 point commun + 1 raison spécifique. JAMAIS générique. Pas de "je me permets".`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Génère la note de connexion.' },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'connection_note', strict: true, schema: CONNECTION_NOTE_SCHEMA },
      },
      temperature: 0.6,
      max_tokens: 200,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Génère du contenu social pour Typefully
   * Objectif : chauffer les prospects AVANT le cold DM
   */
  async generateSocialContent({ industry, platform, prospects = [], tone = 'expert_helpful', goal = 'attract_b2b_prospects' }) {
    const platformRules = {
      linkedin: 'Post LinkedIn professionnel, 150-300 mots, structure aérée, hashtags B2B, insights secteur',
      'twitter-threads': 'Tweet accroche (280 chars) suivi de 3-5 tweets de valeur, concis et percutants',
      threads: 'Post Threads conversationnel, 150-200 chars, accessible, engageant',
      bluesky: 'Post Bluesky authentique, max 300 chars, ton direct',
    };

    const topPainPoints = prospects.slice(0, 3).map(p => p.intentLabel || p.industry).filter(Boolean).join(', ');

    const systemPrompt = `Tu créés du contenu social ${platform} pour une agence digitale B2B ciblant le secteur ${industry}.
Objectif : attirer des prospects ${industry} qui se reconnaissent dans le contenu.
Ton : ${tone}.
Règles plateforme : ${platformRules[platform]}.
${topPainPoints ? `Problèmes observés chez nos prospects : ${topPainPoints}` : ''}

Le contenu doit apporter de la VALEUR réelle (conseil, insight, donnée) — pas de contenu creux ou promotionnel.
Les prospects doivent penser "Tiens, ça me parle" et s'identifier au problème mentionné.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Génère un post ${platform} sur les défis digitaux du secteur ${industry} en 2025.` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'social_content', strict: true, schema: SOCIAL_CONTENT_SCHEMA },
      },
      temperature: 0.9,
      max_tokens: 600,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Score rapide d'un prospect (modèle léger)
   * Utilisé pour trier les leads avant de les mettre en séquence
   */
  async scoreProspect(prospect) {
    const systemPrompt = `Tu es un expert en qualification de leads B2B pour agences digitales.
Analyse ce prospect et donne-lui un score de 0 à 100.
Critères : présence web, secteur actif, taille, indicateurs de budget, signaux d'intention.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Modèle léger pour le scoring
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Prospect : ${JSON.stringify({
          name: prospect.name,
          industry: prospect.industry,
          googleRating: prospect.googleRating,
          reviewCount: prospect.reviewCount,
          website: !!prospect.website,
          hasInstagram: !!prospect.instagram,
          intentSignals: prospect.intentSignals,
        })}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'prospect_score', strict: true, schema: SCORING_SCHEMA },
      },
      temperature: 0.3,
      max_tokens: 200,
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

// ─── POST-PROCESSING ────────────────────────────────────────────────────────

/**
 * Enforce strict channel character limits
 * Truncates at last sentence boundary to keep message coherent
 */
function enforceChannelLength(message, channel) {
  const limits = { sms: 155, whatsapp: 250, email: 600, linkedin: 300 };
  const max = limits[channel] || 600;
  if (!message || message.length <= max) return message;

  const truncated = message.slice(0, max);
  const lastSentence = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExcl = truncated.lastIndexOf('!');
  const breakPoint = Math.max(lastSentence, lastQuestion, lastExcl);

  if (breakPoint > max * 0.5) {
    return message.slice(0, breakPoint + 1).trim();
  }

  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > max * 0.6) {
    return message.slice(0, lastSpace).trim();
  }

  return truncated.trim();
}
