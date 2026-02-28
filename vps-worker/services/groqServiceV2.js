/**
 * Groq Service — Version amelioree avec Email Marketing Bible (Pepite #5)
 * + generation contenu social (Typefully) + structured outputs strict
 *
 * CJS version for VPS Worker
 */

const Groq = require('groq-sdk');
const { buildEmailSystemPrompt, FOLLOWUP_ANGLES } = require('../knowledge/emailBestPractices');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- SCHEMAS JSON STRICT ---

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
    hook: { type: 'string', description: 'La premiere phrase accroche' },
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

// --- GROQ SERVICE ---

class GroqService {
  async generateMessage({ prospect, channel = 'email', template = null }) {
    const systemPrompt = buildEmailSystemPrompt(prospect, channel);

    const schema = channel === 'linkedin' && !template?.isDM ? CONNECTION_NOTE_SCHEMA : MESSAGE_SCHEMA;
    const schemaName = channel === 'email' ? 'email_message' : channel === 'linkedin' ? 'linkedin_message' : 'social_dm';

    const userPrompt = template
      ? `Genere un message en suivant ce template comme inspiration (ne pas copier mot pour mot) : "${template}"`
      : `Genere le meilleur message possible pour convertir ce prospect. Sois ultra-specifique a sa situation.`;

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

    return JSON.parse(response.choices[0].message.content);
  }

  async generateFollowUp({ prospect, followUpNumber = 1 }) {
    const angles = Object.values(FOLLOWUP_ANGLES);
    const angle = angles[Math.min(followUpNumber - 1, angles.length - 1)];

    const systemPrompt = `Tu es expert en cold email de relance.
Ce prospect n'a pas repondu au premier email. Tu dois relancer avec l'angle : ${angle.name} — "${angle.intro}"
Entreprise : ${prospect.name}, secteur ${prospect.industry || 'commerce'}.
Longueur : 60-90 mots max. Ton different de la premiere approche.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Genere le follow-up.' },
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

  async generateConnectionNote({ prospect }) {
    const systemPrompt = `Tu generes des notes de connexion LinkedIn ULTRA-courtes (max 300 chars).
Prospect : ${prospect.directorFirstName || ''} ${prospect.name || ''} — ${prospect.industry || ''}.
Regle : 1 point commun + 1 raison specifique. JAMAIS generique. Pas de "je me permets".`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Genere la note de connexion.' },
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

  async generateSocialContent({ industry, platform, prospects = [], tone = 'expert_helpful', goal = 'attract_b2b_prospects' }) {
    const platformRules = {
      linkedin: 'Post LinkedIn professionnel, 150-300 mots, structure aeree, hashtags B2B, insights secteur',
      'twitter-threads': 'Tweet accroche (280 chars) suivi de 3-5 tweets de valeur, concis et percutants',
      threads: 'Post Threads conversationnel, 150-200 chars, accessible, engageant',
      bluesky: 'Post Bluesky authentique, max 300 chars, ton direct',
    };

    const topPainPoints = prospects.slice(0, 3).map(p => p.intentLabel || p.industry).filter(Boolean).join(', ');

    const systemPrompt = `Tu crees du contenu social ${platform} pour une agence digitale B2B ciblant le secteur ${industry}.
Objectif : attirer des prospects ${industry} qui se reconnaissent dans le contenu.
Ton : ${tone}.
Regles plateforme : ${platformRules[platform]}.
${topPainPoints ? `Problemes observes chez nos prospects : ${topPainPoints}` : ''}

Le contenu doit apporter de la VALEUR reelle (conseil, insight, donnee) — pas de contenu creux ou promotionnel.
Les prospects doivent penser "Tiens, ca me parle" et s'identifier au probleme mentionne.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genere un post ${platform} sur les defis digitaux du secteur ${industry} en 2025.` },
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

  async scoreProspect(prospect) {
    const systemPrompt = `Tu es un expert en qualification de leads B2B pour agences digitales.
Analyse ce prospect et donne-lui un score de 0 a 100.
Criteres : presence web, secteur actif, taille, indicateurs de budget, signaux d'intention.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
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

module.exports = { GroqService };
