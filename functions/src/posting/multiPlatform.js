/**
 * Multi-Platform Posting - Intelligent provider selection with fallback
 * Face Media Factory
 *
 * Priority: Postiz (self-hosted, unlimited) > Late API (20/month free)
 * Supports 13 platforms total
 */

import PostizClient from './postizClient.js'
import LateClient from './lateClient.js'

class MultiPlatformPoster {
  constructor() {
    this.providers = {
      postiz: new PostizClient(),
      late: new LateClient()
    }

    this.stats = {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      providerUsage: {
        postiz: 0,
        late: 0
      },
      postsByPlatform: {}
    }
  }

  /**
   * Select the best available provider
   */
  selectProvider(platforms) {
    // Try Postiz first (primary, unlimited)
    const postizStatus = this.providers.postiz.getStatus()
    if (postizStatus.available) {
      // Check if all platforms are supported
      const allSupported = platforms.every((p) =>
        postizStatus.supportedPlatforms.includes(p.toLowerCase())
      )
      if (allSupported) {
        return { name: 'postiz', provider: this.providers.postiz }
      }
    }

    // Try Late as fallback
    const lateStatus = this.providers.late.getStatus()
    if (lateStatus.available) {
      const allSupported = platforms.every((p) =>
        lateStatus.supportedPlatforms.includes(p.toLowerCase())
      )
      if (allSupported) {
        return { name: 'late', provider: this.providers.late }
      }
    }

    return null
  }

  /**
   * Get all supported platforms across all providers
   */
  getAllSupportedPlatforms() {
    const platforms = new Set()
    for (const provider of Object.values(this.providers)) {
      const status = provider.getStatus()
      for (const platform of status.supportedPlatforms) {
        platforms.add(platform)
      }
    }
    return Array.from(platforms)
  }

  /**
   * Create a post with automatic fallback
   */
  async createPost(post) {
    this.stats.totalPosts++

    const { platforms } = post

    if (!platforms || platforms.length === 0) {
      throw new Error('At least one platform is required')
    }

    // Try primary provider first, then fallback
    const attemptedProviders = new Set()
    const providerNames = ['postiz', 'late']

    for (const providerName of providerNames) {
      if (attemptedProviders.has(providerName)) continue

      const provider = this.providers[providerName]
      const status = provider.getStatus()

      if (!status.available) {
        console.log(`[MultiPlatform] ${providerName} not available`)
        continue
      }

      // Check platform support
      const unsupported = platforms.filter((p) => !status.supportedPlatforms.includes(p.toLowerCase()))
      if (unsupported.length > 0) {
        console.log(`[MultiPlatform] ${providerName} doesn't support: ${unsupported.join(', ')}`)
        continue
      }

      attemptedProviders.add(providerName)
      console.log(`[MultiPlatform] Using provider: ${providerName}`)

      try {
        const result = await provider.createPost(post)

        // Update stats
        this.stats.successfulPosts++
        this.stats.providerUsage[providerName]++
        for (const platform of platforms) {
          this.stats.postsByPlatform[platform] = (this.stats.postsByPlatform[platform] || 0) + 1
        }

        console.log(`[MultiPlatform] Success with ${providerName} (${result.latency}ms)`)

        return result
      } catch (error) {
        console.error(`[MultiPlatform] Failed with ${providerName}: ${error.message}`)

        if (attemptedProviders.size === providerNames.length) {
          this.stats.failedPosts++
          throw new Error('All posting providers failed: ' + error.message)
        }

        console.log('[MultiPlatform] Trying next provider...')
      }
    }

    this.stats.failedPosts++
    throw new Error('No posting providers available')
  }

  /**
   * Get post status from any provider
   */
  async getPostStatus(postId, providerName = null) {
    if (providerName && this.providers[providerName]) {
      return await this.providers[providerName].getPostStatus(postId)
    }

    // Try all providers
    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const status = provider.getStatus()
        if (status.available) {
          return await provider.getPostStatus(postId)
        }
      } catch {
        continue
      }
    }

    throw new Error('Could not get post status from any provider')
  }

  /**
   * Cancel a post
   */
  async cancelPost(postId, providerName = null) {
    if (providerName && this.providers[providerName]) {
      return await this.providers[providerName].cancelPost(postId)
    }

    // Try all providers
    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const status = provider.getStatus()
        if (status.available) {
          return await provider.cancelPost(postId)
        }
      } catch {
        continue
      }
    }

    throw new Error('Could not cancel post from any provider')
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
    return {
      totalPosts: this.stats.totalPosts,
      successfulPosts: this.stats.successfulPosts,
      failedPosts: this.stats.failedPosts,
      successRate:
        this.stats.totalPosts > 0
          ? Math.round((this.stats.successfulPosts / this.stats.totalPosts) * 100)
          : 0,
      providerUsage: this.stats.providerUsage,
      postsByPlatform: this.stats.postsByPlatform,
      supportedPlatforms: this.getAllSupportedPlatforms()
    }
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      providerUsage: {
        postiz: 0,
        late: 0
      },
      postsByPlatform: {}
    }
    console.log('[MultiPlatform] Stats reset')
  }
}

// Singleton instance
let posterInstance = null

export function getMultiPlatformPoster() {
  if (!posterInstance) {
    posterInstance = new MultiPlatformPoster()
  }
  return posterInstance
}

export { MultiPlatformPoster }
