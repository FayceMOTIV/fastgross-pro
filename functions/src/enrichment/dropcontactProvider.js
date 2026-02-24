/**
 * Dropcontact Provider - Email Enrichment
 * Face Media Factory
 *
 * Free tier: 25 credits/month (no credit card required)
 * API: https://api.dropcontact.com
 * Speciality: French B2B data, GDPR compliant, email + phone + company
 */

class DropcontactProvider {
  constructor() {
    this.apiKey = process.env.DROPCONTACT_API_KEY || null
    this.baseUrl = 'https://api.dropcontact.com'

    this.config = {
      name: 'dropcontact',
      monthlyLimit: 25,
      priority: 4, // After Hunter
      timeout: 30000 // Dropcontact is async, may take longer
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
      console.log('[Dropcontact] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  async enrichEmail(email) {
    if (!this.isAvailable()) {
      throw new Error('Dropcontact monthly limit reached or API key not configured')
    }

    const startTime = Date.now()

    try {
      // Dropcontact enrichment endpoint
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': this.apiKey
        },
        body: JSON.stringify({
          data: [{ email }],
          siren: true,
          language: 'fr'
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `Dropcontact API error: ${response.status}`)
      }

      const result = await response.json()
      const requestId = result.request_id

      // Dropcontact is async — poll for results (max 3 attempts)
      let data = null
      for (let attempt = 0; attempt < 3; attempt++) {
        await sleep(5000) // Wait 5s between polls

        const pollResponse = await fetch(`${this.baseUrl}/batch/${requestId}`, {
          method: 'GET',
          headers: {
            'X-Access-Token': this.apiKey
          },
          signal: AbortSignal.timeout(this.config.timeout)
        })

        if (!pollResponse.ok) continue

        const pollResult = await pollResponse.json()
        if (pollResult.success && pollResult.data?.length > 0) {
          data = pollResult.data[0]
          break
        }
        if (pollResult.error) throw new Error(pollResult.error)
      }

      if (!data) throw new Error('Dropcontact enrichment timed out')

      const latency = Date.now() - startTime
      this.usage.current++

      return {
        success: true,
        provider: 'dropcontact',
        data: {
          email: data.email?.[0]?.email || email,
          firstName: data.first_name || null,
          lastName: data.last_name || null,
          fullName: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
          company: data.company || null,
          title: data.job || null,
          linkedinUrl: data.linkedin || null,
          phone: data.phone || null,
          location: data.city ? `${data.city}, ${data.country || 'France'}` : null,
          confidence: data.email?.[0]?.qualification === 'valid' ? 90 : 65,
          // Dropcontact extras
          siren: data.siren || null,
          siret: data.siret || null,
          companySize: data.nb_employees || null,
          website: data.website || null
        },
        latency
      }
    } catch (error) {
      console.error('[Dropcontact] Error:', error.message)
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default DropcontactProvider
