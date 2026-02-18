/**
 * AI Load Balancer - Intelligent provider selection with fallback
 * Face Media Factory
 *
 * Priority: Groq (fastest) > OpenRouter (flexible) > Gemini (backup)
 */

import GroqProvider from './groqProvider.js'
import OpenRouterProvider from './openrouterProvider.js'
import GeminiProvider from './geminiProvider.js'

class AILoadBalancer {
  constructor() {
    this.providers = {
      groq: new GroqProvider(),
      openrouter: new OpenRouterProvider(),
      gemini: new GeminiProvider()
    }

    // Stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: {
        groq: 0,
        openrouter: 0,
        gemini: 0
      },
      averageLatency: {
        groq: [],
        openrouter: [],
        gemini: []
      }
    }
  }

  /**
   * Selectionne le meilleur provider disponible
   * Priorite : Groq (fastest) > OpenRouter (flexible) > Gemini (backup)
   */
  selectProvider(strategy = 'speed') {
    const availableProviders = []

    // Check each provider availability
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
      throw new Error('No AI providers available (all limits reached or not configured)')
    }

    // Sort by priority (1 = highest)
    if (strategy === 'speed') {
      // Prioritize Groq (fastest)
      availableProviders.sort((a, b) => a.priority - b.priority)
    } else if (strategy === 'balanced') {
      // Distribute load evenly
      availableProviders.sort((a, b) => {
        const usageA = this.stats.providerUsage[a.name] || 0
        const usageB = this.stats.providerUsage[b.name] || 0
        return usageA - usageB
      })
    }

    return availableProviders[0]
  }

  /**
   * Genere une personnalisation avec fallback automatique
   */
  async generatePersonalization(prospect, strategy = 'speed') {
    this.stats.totalRequests++
    const attemptedProviders = new Set()

    while (attemptedProviders.size < Object.keys(this.providers).length) {
      try {
        const selected = this.selectProvider(strategy)

        // Skip if already attempted
        if (attemptedProviders.has(selected.name)) {
          // Mark as attempted and continue to trigger next selection
          for (const [name] of Object.entries(this.providers)) {
            if (!attemptedProviders.has(name)) {
              const status = this.providers[name].getStatus()
              if (status.available) {
                selected.name = name
                selected.provider = this.providers[name]
                break
              }
            }
          }
          if (attemptedProviders.has(selected.name)) {
            break // No more providers to try
          }
        }

        attemptedProviders.add(selected.name)
        console.log(`[LoadBalancer] Using provider: ${selected.name}`)

        const result = await selected.provider.generatePersonalization(prospect)

        // Update stats
        this.stats.successfulRequests++
        this.stats.providerUsage[selected.name]++
        this.stats.averageLatency[selected.name].push(result.latency)

        // Keep only last 100 latencies for average calculation
        if (this.stats.averageLatency[selected.name].length > 100) {
          this.stats.averageLatency[selected.name].shift()
        }

        console.log(`[LoadBalancer] Success with ${selected.name} (${result.latency}ms)`)

        return result
      } catch (error) {
        console.error(`[LoadBalancer] Failed: ${error.message}`)

        if (attemptedProviders.size === Object.keys(this.providers).length) {
          // All providers failed
          this.stats.failedRequests++
          throw new Error('All AI providers failed: ' + error.message)
        }

        console.log(`[LoadBalancer] Trying next provider...`)
      }
    }

    this.stats.failedRequests++
    throw new Error('All AI providers exhausted')
  }

  /**
   * Obtient le statut de tous les providers
   */
  getAllStatus() {
    const statuses = {}
    for (const [name, provider] of Object.entries(this.providers)) {
      statuses[name] = provider.getStatus()
    }
    return statuses
  }

  /**
   * Obtient les statistiques globales
   */
  getStats() {
    // Calculate average latencies
    const avgLatencies = {}
    for (const [provider, latencies] of Object.entries(this.stats.averageLatency)) {
      if (latencies.length > 0) {
        const sum = latencies.reduce((a, b) => a + b, 0)
        avgLatencies[provider] = Math.round(sum / latencies.length)
      } else {
        avgLatencies[provider] = 0
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
      averageLatency: avgLatencies
    }
  }

  /**
   * Reset les compteurs de stats (garde les providers)
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: {
        groq: 0,
        openrouter: 0,
        gemini: 0
      },
      averageLatency: {
        groq: [],
        openrouter: [],
        gemini: []
      }
    }
    console.log('[LoadBalancer] Stats reset')
  }
}

// Singleton instance
let loadBalancerInstance = null

export function getLoadBalancer() {
  if (!loadBalancerInstance) {
    loadBalancerInstance = new AILoadBalancer()
  }
  return loadBalancerInstance
}

export { AILoadBalancer }
