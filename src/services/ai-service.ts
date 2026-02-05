/**
 * AI Service - DISTRAM by Face Media
 *
 * Core AI service using OpenAI GPT-4o for all AI-powered features
 */

import { getOpenAIClient, OPENAI_MODELS } from './ai/openai-client';

// Available models
export const AI_MODELS = {
  FAST: OPENAI_MODELS.GPT4O_MINI,    // Fast, cheap - for simple tasks
  STANDARD: OPENAI_MODELS.GPT4O,     // Balanced - good for most tasks
  POWERFUL: OPENAI_MODELS.GPT4O,     // Most capable - for complex analysis
} as const;

// Types
interface ProspectScore {
  score: number;
  reasons: string[];
  recommendedActions: string[];
  estimatedPotential: 'low' | 'medium' | 'high';
}

interface EmailGenerationResult {
  subject: string;
  body: string;
  callToAction: string;
}

interface ClientAnalysis {
  summary: string;
  buyingPatterns: string[];
  recommendations: string[];
  churnRisk: 'low' | 'medium' | 'high';
  upsellOpportunities: string[];
}

interface RouteOptimization {
  optimizedOrder: number[];
  estimatedDuration: number;
  estimatedDistance: number;
  tips: string[];
}

// AI Service Class
export class AIService {
  private model: string;

  constructor(model: string = AI_MODELS.STANDARD) {
    this.model = model;
  }

  // Score a prospect based on available data
  async scoreProspect(prospect: {
    name: string;
    type: string;
    address: string;
    phone?: string;
    website?: string;
    notes?: string;
  }): Promise<ProspectScore> {
    const prompt = `Tu es un expert commercial dans le secteur de la distribution alimentaire pour les fast-foods et restaurants.

Analyse ce prospect potentiel et donne-lui un score de 0 à 100 basé sur son potentiel commercial.

Prospect:
- Nom: ${prospect.name}
- Type: ${prospect.type}
- Adresse: ${prospect.address}
${prospect.phone ? `- Téléphone: ${prospect.phone}` : ''}
${prospect.website ? `- Site web: ${prospect.website}` : ''}
${prospect.notes ? `- Notes: ${prospect.notes}` : ''}

Réponds en JSON avec ce format exact:
{
  "score": <nombre entre 0 et 100>,
  "reasons": ["raison 1", "raison 2", ...],
  "recommendedActions": ["action 1", "action 2", ...],
  "estimatedPotential": "low" | "medium" | "high"
}`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result as ProspectScore;
    } catch (error) {
      console.error('Error scoring prospect:', error);
      return {
        score: 50,
        reasons: ['Analyse automatique non disponible'],
        recommendedActions: ['Contacter pour qualification manuelle'],
        estimatedPotential: 'medium',
      };
    }
  }

  // Generate personalized outreach email
  async generateProspectEmail(prospect: {
    name: string;
    type: string;
    context?: string;
  }, senderName: string, companyName: string): Promise<EmailGenerationResult> {
    const prompt = `Tu es un commercial expert en prospection B2B dans le secteur alimentaire.

Génère un email de prospection personnalisé pour ce prospect:

Prospect:
- Nom établissement: ${prospect.name}
- Type: ${prospect.type}
${prospect.context ? `- Contexte: ${prospect.context}` : ''}

Expéditeur: ${senderName}
Entreprise: ${companyName} (grossiste alimentaire spécialisé fast-food)

L'email doit être:
- Court (max 150 mots)
- Personnalisé selon le type d'établissement
- Professionnel mais chaleureux
- Avec une proposition de valeur claire
- Se terminer par un call-to-action

Réponds en JSON:
{
  "subject": "Objet de l'email",
  "body": "Corps de l'email",
  "callToAction": "Phrase d'appel à l'action"
}`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content || '{}') as EmailGenerationResult;
    } catch (error) {
      console.error('Error generating email:', error);
      throw new Error('Impossible de générer l\'email');
    }
  }

  // Analyze client buying patterns
  async analyzeClient(client: {
    name: string;
    type: string;
    orderHistory: { date: string; total: number; products: string[] }[];
    lastOrderDate: string;
  }): Promise<ClientAnalysis> {
    const prompt = `Tu es un analyste commercial expert.

Analyse ce client et son historique d'achat:

Client: ${client.name}
Type: ${client.type}
Dernière commande: ${client.lastOrderDate}

Historique des commandes:
${client.orderHistory.map(o => `- ${o.date}: ${o.total}€ (${o.products.join(', ')})`).join('\n')}

Fournis une analyse complète en JSON:
{
  "summary": "Résumé du profil client",
  "buyingPatterns": ["pattern 1", "pattern 2", ...],
  "recommendations": ["recommandation 1", ...],
  "churnRisk": "low" | "medium" | "high",
  "upsellOpportunities": ["opportunité 1", ...]
}`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content || '{}') as ClientAnalysis;
    } catch (error) {
      console.error('Error analyzing client:', error);
      throw new Error('Impossible d\'analyser le client');
    }
  }

  // Simple route optimization suggestion (for complex optimization, use OSRM)
  async suggestRouteOptimization(stops: {
    id: string;
    name: string;
    address: string;
    priority?: 'high' | 'normal' | 'low';
    timeWindow?: { start: string; end: string };
  }[]): Promise<RouteOptimization> {
    const prompt = `Tu es un expert en logistique de livraison.

Optimise l'ordre de ces arrêts de livraison:

${stops.map((s, i) => `${i + 1}. ${s.name} - ${s.address}${s.priority ? ` (priorité: ${s.priority})` : ''}${s.timeWindow ? ` (créneau: ${s.timeWindow.start}-${s.timeWindow.end})` : ''}`).join('\n')}

Considère:
- Proximité géographique
- Créneaux horaires
- Priorités

Réponds en JSON:
{
  "optimizedOrder": [indices dans le nouvel ordre, commençant à 0],
  "estimatedDuration": estimation en minutes,
  "estimatedDistance": estimation en km,
  "tips": ["conseil 1", "conseil 2", ...]
}`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: AI_MODELS.FAST, // Use faster model for this
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(response.choices[0].message.content || '{}') as RouteOptimization;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error('Impossible d\'optimiser la tournée');
    }
  }

  // Chat assistant for internal queries
  async chatAssistant(
    message: string,
    context?: { role?: string; recentData?: string }
  ): Promise<string> {
    const systemPrompt = `Tu es l'assistant IA de DISTRAM, une plateforme de gestion commerciale pour grossistes alimentaires halal.

Tu aides les utilisateurs (commerciaux, responsables, livreurs) à:
- Trouver des informations sur les clients, commandes, stocks
- Répondre aux questions sur les procédures
- Donner des conseils commerciaux
- Aider avec la planification

${context?.role ? `L'utilisateur actuel est: ${context.role}` : ''}
${context?.recentData ? `Contexte récent: ${context.recentData}` : ''}

Réponds de manière concise, professionnelle et utile. En français.`;

    try {
      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: AI_MODELS.FAST, // Fast model for chat
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || 'Désolé, je n\'ai pas pu traiter votre demande.';
    } catch (error) {
      console.error('Error in chat assistant:', error);
      return 'Désolé, une erreur est survenue. Veuillez réessayer.';
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

// Export utility functions for direct use
export async function scoreProspect(prospect: Parameters<AIService['scoreProspect']>[0]) {
  return aiService.scoreProspect(prospect);
}

export async function generateEmail(
  prospect: Parameters<AIService['generateProspectEmail']>[0],
  senderName: string,
  companyName: string
) {
  return aiService.generateProspectEmail(prospect, senderName, companyName);
}

export async function analyzeClient(client: Parameters<AIService['analyzeClient']>[0]) {
  return aiService.analyzeClient(client);
}

export async function optimizeRoute(stops: Parameters<AIService['suggestRouteOptimization']>[0]) {
  return aiService.suggestRouteOptimization(stops);
}

export async function chat(message: string, context?: { role?: string; recentData?: string }) {
  return aiService.chatAssistant(message, context);
}
