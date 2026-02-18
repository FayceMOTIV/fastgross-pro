/**
 * Types et interfaces pour les AI providers
 * Face Media Factory - AI Personalization System
 */

/**
 * @typedef {Object} AIProvider
 * @property {string} name - Nom du provider (groq, openrouter, gemini)
 * @property {number} dailyLimit - Limite quotidienne de requetes
 * @property {number} currentUsage - Utilisation actuelle
 * @property {Date} resetTime - Heure de reset des compteurs
 * @property {boolean} available - Si le provider est disponible
 * @property {number} priority - Priorite (1=highest, 3=lowest)
 */

/**
 * @typedef {Object} PersonalizationRequest
 * @property {string} prospectName - Nom du prospect
 * @property {string} prospectBio - Biographie Instagram
 * @property {string} prospectCategory - Categorie du compte
 * @property {string} prospectFollowers - Nombre de followers
 * @property {string} businessType - Type de business
 * @property {string} targetService - Service a proposer
 */

/**
 * @typedef {Object} PersonalizationResponse
 * @property {string[]} angles - 3 angles de personnalisation
 * @property {string} provider - Provider utilise
 * @property {number} tokensUsed - Tokens consommes
 * @property {number} latency - Latence en ms
 * @property {boolean} fromCache - Si depuis cache
 */

module.exports = {
  // Types exportes pour JSDoc
}
