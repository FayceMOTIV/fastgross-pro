/**
 * OpenRouter Provider - Multiple Free Models
 * Face Media Factory
 *
 * Free tier: 20 req/min per model, ~800 req/day with rotation
 */

import OpenAI from 'openai'

class OpenRouterProvider {
  constructor() {
    this.client = process.env.OPENROUTER_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://face-media-factory.web.app',
            'X-Title': 'Face Media Factory'
          }
        })
      : null

    this.config = {
      name: 'openrouter',
      dailyLimit: 1000,
      models: [
        'nvidia/nemotron-nano-9b-v2:free',
        'stepfun/step-3.5-flash:free',
        'z-ai/glm-4.5-air:free',
        'arcee-ai/trinity-mini:free'
      ],
      currentModelIndex: 0,
      priority: 2, // Medium priority (fallback)
      maxTokens: 1000,
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
      console.log('[OpenRouter] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.dailyLimit && !!process.env.OPENROUTER_API_KEY && this.client !== null
  }

  rotateModel() {
    this.config.currentModelIndex =
      (this.config.currentModelIndex + 1) % this.config.models.length
  }

  getCurrentModel() {
    return this.config.models[this.config.currentModelIndex]
  }

  async generatePersonalization(prospect, retryCount = 0) {
    if (!this.isAvailable()) {
      throw new Error('OpenRouter daily limit reached or API key not configured')
    }

    const startTime = Date.now()
    const model = this.getCurrentModel()

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

FORMAT DE REPONSE (JSON strict) :
{
  "angle1": "...",
  "angle2": "...",
  "angle3": "..."
}

REPONSE :`

    try {
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })

      const latency = Date.now() - startTime
      this.usage.current++

      let responseText = completion.choices[0].message.content

      // Clean response (remove markdown if present)
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      const response = JSON.parse(responseText)

      return {
        angles: [response.angle1, response.angle2, response.angle3],
        provider: 'openrouter',
        model: model,
        tokensUsed: completion.usage?.total_tokens || 0,
        latency: latency,
        fromCache: false
      }
    } catch (error) {
      console.error(`[OpenRouter] Error with model ${model}:`, error.message)

      // Rotate model and retry (max 3 times)
      if (retryCount < 3) {
        console.log(`[OpenRouter] Rotating to next model, retry ${retryCount + 1}/3`)
        this.rotateModel()
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
      currentModel: this.getCurrentModel()
    }
  }
}

export default OpenRouterProvider
