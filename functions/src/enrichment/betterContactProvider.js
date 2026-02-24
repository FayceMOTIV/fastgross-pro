/**
 * Better Contact Provider - Email Enrichment
 * Face Media Factory
 *
 * Aggregator: queries 20+ providers in parallel (Dropcontact, Apollo, Hunter, etc.)
 * Free tier: 50 credits/month
 * API: https://app.bettercontact.rocks/api
 */

class BetterContactProvider {
  constructor() {
    this.apiKey = process.env.BETTERCONTACT_API_KEY || null
    this.baseUrl = 'https://app.bettercontact.rocks/api/v1'

    this.config = {
      name: 'bettercontact',
      monthlyLimit: 50,
      priority: 5, // Last resort (queries multiple providers)
      timeout: 45000 // Aggregator may be slow
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
      console.log('[BetterContact] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  async enrichEmail(email) {
    if (!this.isAvailable()) {
      throw new Error('BetterContact monthly limit reached or API key not configured')
    }

    const startTime = Date.now()

    try {
      // Better Contact enrichment via email
      const response = await fetch(`${this.baseUrl}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          email,
          enrich_email: true,
          enrich_phone: true
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `BetterContact API error: ${response.status}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime
      this.usage.current++

      const contact = data.data || data.contact || data

      return {
        success: true,
        provider: 'bettercontact',
        data: {
          email: contact.email || email,
          firstName: contact.first_name || contact.firstName || null,
          lastName: contact.last_name || contact.lastName || null,
          fullName: contact.full_name || contact.fullName || null,
          company: contact.company || contact.organization || null,
          title: contact.title || contact.job_title || null,
          linkedinUrl: contact.linkedin_url || contact.linkedin || null,
          phone: contact.phone || contact.mobile_phone || contact.direct_phone || null,
          location: contact.location || contact.city || null,
          confidence: contact.confidence || contact.email_confidence || 70,
          // BetterContact extras
          verifiedEmail: contact.email_verified || false,
          sources: contact.sources || []
        },
        latency
      }
    } catch (error) {
      console.error('[BetterContact] Error:', error.message)
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

export default BetterContactProvider
