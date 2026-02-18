/**
 * Groq Provider - Fastest AI (300 tok/sec)
 * Face Media Factory
 *
 * Free tier: 14,400 req/day
 */

import Groq from 'groq-sdk'

class GroqProvider {
  constructor() {
    this.client = process.env.GROQ_API_KEY
      ? new Groq({ apiKey: process.env.GROQ_API_KEY })
      : null

    this.config = {
      name: 'groq',
      dailyLimit: 14400, // Free tier
      model: 'llama-3.3-70b-versatile',
      priority: 1, // Highest priority (fastest)
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
      console.log('[Groq] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.dailyLimit && !!process.env.GROQ_API_KEY && this.client !== null
  }

  async generatePersonalization(prospect) {
    if (!this.isAvailable()) {
      throw new Error('Groq daily limit reached or API key not configured')
    }

    const startTime = Date.now()

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
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      })

      const latency = Date.now() - startTime
      this.usage.current++

      const response = JSON.parse(completion.choices[0].message.content)

      return {
        angles: [response.angle1, response.angle2, response.angle3],
        provider: 'groq',
        model: this.config.model,
        tokensUsed: completion.usage?.total_tokens || 0,
        latency: latency,
        fromCache: false
      }
    } catch (error) {
      console.error('[Groq] Error:', error.message)
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
      priority: this.config.priority
    }
  }
}

export default GroqProvider
