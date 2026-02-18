/**
 * Hunter Provider - Email Enrichment
 * Face Media Factory
 *
 * Free tier: 50 requests/month
 * API: https://api.hunter.io/v2
 */

class HunterProvider {
  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY || null
    this.baseUrl = 'https://api.hunter.io/v2'

    this.config = {
      name: 'hunter',
      monthlyLimit: 50,
      priority: 3, // Lowest priority (backup)
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
      console.log('[Hunter] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  async enrichEmail(email) {
    if (!this.isAvailable()) {
      throw new Error('Hunter monthly limit reached or API key not configured')
    }

    const startTime = Date.now()

    try {
      // Hunter uses email-finder for enrichment
      const url = new URL(`${this.baseUrl}/email-verifier`)
      url.searchParams.append('email', email)
      url.searchParams.append('api_key', this.apiKey)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.errors?.[0]?.details || `Hunter API error: ${response.status}`)
      }

      const result = await response.json()
      const data = result.data || {}
      const latency = Date.now() - startTime
      this.usage.current++

      // Hunter's email-verifier returns less data, try person endpoint if we need more
      let personData = {}
      try {
        const personUrl = new URL(`${this.baseUrl}/people/find`)
        personUrl.searchParams.append('email', email)
        personUrl.searchParams.append('api_key', this.apiKey)

        const personResponse = await fetch(personUrl.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(this.config.timeout)
        })

        if (personResponse.ok) {
          const personResult = await personResponse.json()
          personData = personResult.data || {}
          this.usage.current++ // Second API call
        }
      } catch {
        // Ignore person lookup errors
      }

      return {
        success: true,
        provider: 'hunter',
        data: {
          email: email,
          firstName: personData.first_name || null,
          lastName: personData.last_name || null,
          fullName: personData.full_name || null,
          company: personData.company || null,
          title: personData.position || null,
          linkedinUrl: personData.linkedin || null,
          phone: personData.phone_number || null,
          location: personData.country || null,
          confidence: this.getConfidenceScore(data.score, data.status)
        },
        latency
      }
    } catch (error) {
      console.error('[Hunter] Error:', error.message)
      throw error
    }
  }

  getConfidenceScore(score, status) {
    if (status === 'valid') return 95
    if (status === 'accept_all') return 70
    if (score) return score
    return 50
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

export default HunterProvider
