/**
 * Derrick Provider - Email Enrichment
 * Face Media Factory
 *
 * Free tier: 200 emails/month
 * API: https://derrick.app/api
 */

class DerrickProvider {
  constructor() {
    this.apiKey = process.env.DERRICK_API_KEY || null
    this.baseUrl = 'https://api.derrick.app/v1'

    this.config = {
      name: 'derrick',
      monthlyLimit: 200,
      priority: 1, // Highest priority
      timeout: 10000
    }

    this.usage = {
      current: 0,
      resetTime: this.getNextResetTime()
    }
  }

  getNextResetTime() {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth
  }

  resetUsageIfNeeded() {
    const now = new Date()
    if (now >= this.usage.resetTime) {
      this.usage.current = 0
      this.usage.resetTime = this.getNextResetTime()
      console.log('[Derrick] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  async enrichEmail(email) {
    if (!this.isAvailable()) {
      throw new Error('Derrick monthly limit reached or API key not configured')
    }

    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Derrick API error: ${response.status}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime
      this.usage.current++

      return {
        success: true,
        provider: 'derrick',
        data: {
          email: email,
          firstName: data.first_name || null,
          lastName: data.last_name || null,
          fullName: data.full_name || null,
          company: data.company || null,
          title: data.title || null,
          linkedinUrl: data.linkedin_url || null,
          phone: data.phone || null,
          location: data.location || null,
          confidence: data.confidence || 0
        },
        latency
      }
    } catch (error) {
      console.error('[Derrick] Error:', error.message)
      throw error
    }
  }

  getStatus() {
    this.resetUsageIfNeeded()
    return {
      name: this.config.name,
      available: this.isAvailable(),
      usage: this.usage.current,
      limit: this.config.monthlyLimit,
      resetTime: this.usage.resetTime,
      priority: this.config.priority
    }
  }
}

export default DerrickProvider
