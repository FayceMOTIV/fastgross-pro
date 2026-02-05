/**
 * FastGross Pro - Services IA Centralisés
 * ========================================
 *
 * 5 IAs spécialisées pour DISTRAM:
 *
 * 1. IA SCAN MENU (GPT-4o Vision)
 *    - Analyse photos de menus restaurant
 *    - Détecte les plats et catégories
 *    - Recommande produits DISTRAM
 *    - Génère devis automatique
 *
 * 2. IA PROSPECTION
 *    - Score les prospects (0-100)
 *    - Génère emails personnalisés
 *    - Recommande actions commerciales
 *
 * 3. IA SMART PRICING
 *    - Suggestions de promotions
 *    - Respecte marges minimales
 *    - Calcule impact financier
 *
 * 4. IA ANALYSE CLIENT
 *    - Patterns d'achat
 *    - Risque de churn
 *    - Opportunités upsell
 *
 * 5. IA ASSISTANT CHAT
 *    - Support interne
 *    - Questions business
 *    - Aide contextuelle
 */

// Client OpenAI centralisé
export {
  getOpenAIClient,
  chatCompletion,
  chatCompletionJSON,
  OPENAI_MODELS,
  DEFAULT_MODEL,
} from './openai-client';

// IA 1: Scan Menu Vision
export {
  analyzeMenuImage,
  analyzeMenuWithGPT4o,
  type AnalyseMenuResult,
  type MenuAnalysisResult,
  type PlatDetecte,
  type ProduitRecommande,
} from './openai-vision';

// IA 2, 4, 5: Prospection, Analyse Client, Chat
export {
  AIService,
  aiService,
  AI_MODELS,
  scoreProspect,
  generateEmail,
  analyzeClient,
  optimizeRoute,
  chat,
} from '../ai-service';

// IA 3: Smart Pricing
export {
  generateSmartPromoSuggestion,
} from '../smart-pricing-ai-service';

// Catalogue expert DISTRAM
export {
  CATALOGUE_DISTRAM,
  GRAMMAGES_PLATS,
} from './expert-ai-service';

// ========================================
// CONFIGURATION DES MODÈLES
// ========================================

export const IA_CONFIG = {
  // Scan Menu - Utilise GPT-4o pour la vision
  SCAN_MENU: {
    model: 'gpt-4o',
    maxTokens: 3000,
    temperature: 0.3,
    description: 'Analyse de photos de menus avec GPT-4o Vision',
  },

  // Prospection - Utilise GPT-4o pour l'analyse complexe
  PROSPECTION: {
    model: 'gpt-4o',
    maxTokens: 500,
    temperature: 0.3,
    description: 'Scoring et recommandations prospects',
  },

  // Smart Pricing - Utilise GPT-4o mini pour rapidité
  SMART_PRICING: {
    model: 'gpt-4o-mini',
    maxTokens: 1500,
    temperature: 0.4,
    description: 'Suggestions de promotions intelligentes',
  },

  // Analyse Client - Utilise GPT-4o pour l'analyse comportementale
  ANALYSE_CLIENT: {
    model: 'gpt-4o',
    maxTokens: 800,
    temperature: 0.3,
    description: 'Analyse patterns achat et risque churn',
  },

  // Chat Assistant - Utilise GPT-4o mini pour rapidité
  CHAT_ASSISTANT: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.7,
    description: 'Assistant interne DISTRAM',
  },
} as const;

// ========================================
// STATISTIQUES IA (pour monitoring)
// ========================================

export interface IAUsageStats {
  scanMenu: { calls: number; avgTime: number; successRate: number };
  prospection: { calls: number; avgTime: number; successRate: number };
  smartPricing: { calls: number; avgTime: number; successRate: number };
  analyseClient: { calls: number; avgTime: number; successRate: number };
  chatAssistant: { calls: number; avgTime: number; successRate: number };
}

// Mock stats pour la démo
export function getIAUsageStats(): IAUsageStats {
  return {
    scanMenu: { calls: 156, avgTime: 2.8, successRate: 98 },
    prospection: { calls: 342, avgTime: 1.2, successRate: 99 },
    smartPricing: { calls: 89, avgTime: 1.5, successRate: 97 },
    analyseClient: { calls: 124, avgTime: 1.8, successRate: 99 },
    chatAssistant: { calls: 567, avgTime: 0.8, successRate: 100 },
  };
}
