/**
 * Apollo Provider - Email Enrichment
 * Face Media Factory
 *
 * Free tier: 60 emails/month
 * API: https://api.apollo.io/v1
 */

class ApolloProvider {
  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || null
    this.baseUrl = 'https://api.apollo.io/v1'

    this.config = {
      name: 'apollo',
      monthlyLimit: 60,
      priority: 2, // Medium priority
      timeout: 15000
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
      console.log('[Apollo] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  async enrichEmail(email) {
    if (!this.isAvailable()) {
      throw new Error('Apollo monthly limit reached or API key not configured')
    }

    const startTime = Date.now()

    try {
      // Apollo uses people/match endpoint for email enrichment
      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey
        },
        body: JSON.stringify({
          email: email,
          reveal_personal_emails: false,
          reveal_phone_number: true
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Apollo API error: ${response.status}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime
      this.usage.current++

      const person = data.person || {}

      return {
        success: true,
        provider: 'apollo',
        data: {
          email: email,
          firstName: person.first_name || null,
          lastName: person.last_name || null,
          fullName: person.name || null,
          company: person.organization?.name || null,
          title: person.title || null,
          linkedinUrl: person.linkedin_url || null,
          phone: person.phone_numbers?.[0]?.sanitized_number || null,
          location: person.city ? `${person.city}, ${person.country}` : null,
          confidence: person.email_status === 'verified' ? 95 : 70
        },
        latency
      }
    } catch (error) {
      console.error('[Apollo] Error:', error.message)
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

export default ApolloProvider
