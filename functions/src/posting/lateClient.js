/**
 * Late API Client - Fallback Multi-Platform Posting
 * Face Media Factory
 *
 * Free tier: 20 posts/month
 * API: https://api.late.co
 */

class LateClient {
  constructor() {
    this.apiKey = process.env.LATE_API_KEY || null
    this.baseUrl = 'https://api.late.co/v1'

    this.config = {
      name: 'late',
      monthlyLimit: 20,
      priority: 2, // Fallback provider
      timeout: 30000,
      supportedPlatforms: [
        'twitter',
        'linkedin',
        'facebook',
        'instagram',
        'tiktok',
        'youtube',
        'pinterest'
      ]
    }

    this.usage = {
      current: 0,
      resetTime: this.getNextResetTime()
    }

    this.stats = {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      postsByPlatform: {}
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
      console.log('[Late] Usage counter reset')
    }
  }

  isAvailable() {
    this.resetUsageIfNeeded()
    return this.usage.current < this.config.monthlyLimit && !!this.apiKey
  }

  isPlatformSupported(platform) {
    return this.config.supportedPlatforms.includes(platform.toLowerCase())
  }

  /**
   * Create a post on multiple platforms
   *
   * @param {Object} post - Post content
   * @param {string} post.content - Text content
   * @param {string[]} post.platforms - Target platforms
   * @param {string[]} post.mediaUrls - Optional media URLs
   * @param {Date} post.scheduledAt - Optional schedule date
   */
  async createPost(post) {
    if (!this.isAvailable()) {
      throw new Error('Late API limit reached or API key not configured')
    }

    const { content, platforms, mediaUrls = [], scheduledAt = null } = post

    if (!content) {
      throw new Error('Post content is required')
    }

    if (!platforms || platforms.length === 0) {
      throw new Error('At least one platform is required')
    }

    // Validate platforms
    const invalidPlatforms = platforms.filter((p) => !this.isPlatformSupported(p))
    if (invalidPlatforms.length > 0) {
      throw new Error(`Unsupported platforms: ${invalidPlatforms.join(', ')}`)
    }

    const startTime = Date.now()
    this.stats.totalPosts++

    try {
      const response = await fetch(`${this.baseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey
        },
        body: JSON.stringify({
          text: content,
          channels: platforms.map((p) => p.toLowerCase()),
          media: mediaUrls,
          schedule_time: scheduledAt ? scheduledAt.toISOString() : null
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Late API error: ${response.status}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      this.usage.current++
      this.stats.successfulPosts++
      for (const platform of platforms) {
        this.stats.postsByPlatform[platform] = (this.stats.postsByPlatform[platform] || 0) + 1
      }

      return {
        success: true,
        provider: 'late',
        postId: data.id || data.post_id,
        platforms: platforms,
        status: scheduledAt ? 'scheduled' : 'published',
        scheduledAt: scheduledAt,
        latency
      }
    } catch (error) {
      this.stats.failedPosts++
      console.error('[Late] Error:', error.message)
      throw error
    }
  }

  /**
   * Get post status
   */
  async getPostStatus(postId) {
    if (!this.apiKey) {
      throw new Error('Late API not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to get post status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[Late] Get status error:', error.message)
      throw error
    }
  }

  /**
   * Cancel a scheduled post
   */
  async cancelPost(postId) {
    if (!this.apiKey) {
      throw new Error('Late API not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': this.apiKey
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel post: ${response.status}`)
      }

      return { success: true, postId }
    } catch (error) {
      console.error('[Late] Cancel post error:', error.message)
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
      priority: this.config.priority,
      supportedPlatforms: this.config.supportedPlatforms,
      stats: this.stats
    }
  }
}

export default LateClient
