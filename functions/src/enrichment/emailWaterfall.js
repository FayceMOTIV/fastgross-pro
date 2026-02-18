/**
 * Email Enrichment Waterfall - Intelligent provider selection with fallback
 * Face Media Factory
 *
 * Priority: Derrick (200/mo) > Apollo (60/mo) > Hunter (50/mo)
 * Total: 310 emails/month FREE
 */

import DerrickProvider from './derrickProvider.js'
import ApolloProvider from './apolloProvider.js'
import HunterProvider from './hunterProvider.js'

class EmailWaterfall {
  constructor() {
    this.providers = {
      derrick: new DerrickProvider(),
      apollo: new ApolloProvider(),
      hunter: new HunterProvider()
    }

    // Stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: {
        derrick: 0,
        apollo: 0,
        hunter: 0
      },
      averageLatency: {
        derrick: [],
        apollo: [],
        hunter: []
      }
    }
  }

  /**
   * Select the best available provider
   * Priority: Derrick (1) > Apollo (2) > Hunter (3)
   */
  selectProvider() {
    const availableProviders = []

    for (const [name, provider] of Object.entries(this.providers)) {
      const status = provider.getStatus()
      if (status.available) {
        availableProviders.push({
          name,
          provider,
          priority: status.priority
        })
      }
    }

    if (availableProviders.length === 0) {
      return null
    }

    // Sort by priority (1 = highest)
    availableProviders.sort((a, b) => a.priority - b.priority)

    return availableProviders[0]
  }

  /**
   * Enrich a single email with automatic fallback
   */
  async enrichEmail(email) {
    this.stats.totalRequests++
    const attemptedProviders = new Set()

    while (attemptedProviders.size < Object.keys(this.providers).length) {
      const selected = this.selectProvider()

      if (!selected) {
        break
      }

      // Skip if already attempted
      if (attemptedProviders.has(selected.name)) {
        // Find next available provider
        let found = false
        for (const [name, provider] of Object.entries(this.providers)) {
          if (!attemptedProviders.has(name)) {
            const status = provider.getStatus()
            if (status.available) {
              selected.name = name
              selected.provider = provider
              found = true
              break
            }
          }
        }
        if (!found) break
      }

      attemptedProviders.add(selected.name)
      console.log(`[EmailWaterfall] Using provider: ${selected.name}`)

      try {
        const result = await selected.provider.enrichEmail(email)

        // Update stats
        this.stats.successfulRequests++
        this.stats.providerUsage[selected.name]++
        this.stats.averageLatency[selected.name].push(result.latency)

        // Keep only last 100 latencies
        if (this.stats.averageLatency[selected.name].length > 100) {
          this.stats.averageLatency[selected.name].shift()
        }

        console.log(`[EmailWaterfall] Success with ${selected.name} (${result.latency}ms)`)

        return result
      } catch (error) {
        console.error(`[EmailWaterfall] Failed with ${selected.name}: ${error.message}`)

        if (attemptedProviders.size === Object.keys(this.providers).length) {
          this.stats.failedRequests++
          throw new Error('All enrichment providers failed: ' + error.message)
        }

        console.log('[EmailWaterfall] Trying next provider...')
      }
    }

    this.stats.failedRequests++
    throw new Error('No enrichment providers available (all limits reached or not configured)')
  }

  /**
   * Enrich multiple emails in batch
   */
  async enrichEmailsBatch(emails, options = {}) {
    const { concurrency = 3, continueOnError = true } = options
    const results = []
    const errors = []

    // Process in batches
    for (let i = 0; i < emails.length; i += concurrency) {
      const batch = emails.slice(i, i + concurrency)
      const batchPromises = batch.map(async (email) => {
        try {
          return await this.enrichEmail(email)
        } catch (error) {
          if (continueOnError) {
            errors.push({ email, error: error.message })
            return null
          }
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(Boolean))
    }

    return {
      success: true,
      results,
      errors,
      stats: {
        total: emails.length,
        enriched: results.length,
        failed: errors.length
      }
    }
  }

  /**
   * Get status of all providers
   */
  getAllStatus() {
    const statuses = {}
    for (const [name, provider] of Object.entries(this.providers)) {
      statuses[name] = provider.getStatus()
    }
    return statuses
  }

  /**
   * Get global statistics
   */
  getStats() {
    const avgLatencies = {}
    for (const [provider, latencies] of Object.entries(this.stats.averageLatency)) {
      if (latencies.length > 0) {
        const sum = latencies.reduce((a, b) => a + b, 0)
        avgLatencies[provider] = Math.round(sum / latencies.length)
      } else {
        avgLatencies[provider] = 0
      }
    }

    // Calculate remaining capacity
    const statuses = this.getAllStatus()
    let totalRemaining = 0
    for (const status of Object.values(statuses)) {
      if (status.available) {
        totalRemaining += status.limit - status.usage
      }
    }

    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      successRate:
        this.stats.totalRequests > 0
          ? Math.round((this.stats.successfulRequests / this.stats.totalRequests) * 100)
          : 0,
      providerUsage: this.stats.providerUsage,
      averageLatency: avgLatencies,
      remainingCapacity: totalRemaining
    }
  }

  /**
   * Reset stats (keeps providers)
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: {
        derrick: 0,
        apollo: 0,
        hunter: 0
      },
      averageLatency: {
        derrick: [],
        apollo: [],
        hunter: []
      }
    }
    console.log('[EmailWaterfall] Stats reset')
  }
}

// Singleton instance
let waterfallInstance = null

export function getEmailWaterfall() {
  if (!waterfallInstance) {
    waterfallInstance = new EmailWaterfall()
  }
  return waterfallInstance
}

export { EmailWaterfall }
