/**
 * Gemini Provider - Google AI
 * Face Media Factory
 *
 * Free tier: 1,500 req/day (conservative at 1,000)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
]

class GeminiProvider {
  constructor() {
    this.client = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null

    this.config = {
      name: 'gemini',
      dailyLimit: 1000,
      model: GEMINI_MODELS[0],
      priority: 3,
      maxTokens: 500,
      temperature: 0.7
    }

    this.usage = {
      current: 0,
      resetTime: this.getNextResetTime()
    }
  }

  getNextResetTime() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }

  resetUsageIfNeeded() {
    const now = new Date()
    if (now >= this.usage.resetTime) {
      this.usage.current = 0
      this.usage.resetTime = this.getNextResetTime()
      console.log('[Gemini] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.dailyLimit && !!process.env.GEMINI_API_KEY && this.client !== null
  }

  async generatePersonalization(prospect, retryCount = 0) {
    if (!this.isAvailable()) {
      throw new Error('Gemini daily limit reached or API key not configured')
    }

    const startTime = Date.now()
    const modelName = GEMINI_MODELS[retryCount] || GEMINI_MODELS[0]
    const model = this.client.getGenerativeModel({ model: modelName })

    const prompt = `Tu es un expert en prospection B2B. Analyse ce prospect Instagram et genere 3 angles de personnalisation pour une approche commerciale.

PROSPECT :
- Nom : ${prospect.prospectName}
- Bio : ${prospect.prospectBio}
- Categorie : ${prospect.prospectCategory}
- Followers : ${prospect.prospectFollowers}
- Business : ${prospect.businessType}

SERVICE A PROPOSER : ${prospect.targetService}

GENERE 3 ANGLES DE PERSONNALISATION :
1. Un angle base sur leur contenu/activite
2. Un angle base sur leur audience/marche
3. Un angle base sur leurs objectifs business apparents

FORMAT DE REPONSE (JSON strict, sans markdown) :
{
  "angle1": "...",
  "angle2": "...",
  "angle3": "..."
}`

    try {
      const result = await model.generateContent(prompt)
      const latency = Date.now() - startTime
      this.usage.current++

      const response_obj = result.response
      if (!response_obj || !response_obj.candidates || response_obj.candidates.length === 0) {
        throw new Error('Empty or blocked response from Gemini')
      }

      let responseText = response_obj.text()

      // Clean response (remove markdown if present)
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      const response = JSON.parse(responseText)

      this.config.model = modelName

      return {
        angles: [response.angle1, response.angle2, response.angle3],
        provider: 'gemini',
        model: modelName,
        tokensUsed: response_obj.usageMetadata?.totalTokenCount || 0,
        latency: latency,
        fromCache: false
      }
    } catch (error) {
      console.error(`[Gemini] Error with model ${modelName}:`, error.message)

      // Retry with next model (max 3 attempts)
      if (retryCount < GEMINI_MODELS.length - 1) {
        console.log(`[Gemini] Trying next model, retry ${retryCount + 1}/${GEMINI_MODELS.length - 1}`)
        return this.generatePersonalization(prospect, retryCount + 1)
      }

      throw error
    }
  }

  getStatus() {
    this.resetUsageIfNeeded()
    return {
      name: this.config.name,
      available: this.isAvailable(),
      usage: this.usage.current,
      limit: this.config.dailyLimit,
      resetTime: this.usage.resetTime,
      priority: this.config.priority,
      currentModel: this.config.model
    }
  }
}

export default GeminiProvider
