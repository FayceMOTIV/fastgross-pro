/**
 * Postiz Client - Self-hosted Multi-Platform Posting
 * Face Media Factory
 *
 * Self-hosted = UNLIMITED posts
 * Supports: Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube, Pinterest,
 *           Reddit, Threads, Bluesky, Mastodon, Dribbble, Discord
 */

class PostizClient {
  constructor() {
    this.baseUrl = process.env.POSTIZ_API_URL || null
    this.apiKey = process.env.POSTIZ_API_KEY || null

    this.config = {
      name: 'postiz',
      priority: 1, // Primary provider (self-hosted, unlimited)
      timeout: 30000,
      supportedPlatforms: [
        'twitter',
        'linkedin',
        'facebook',
        'instagram',
        'tiktok',
        'youtube',
        'pinterest',
        'reddit',
        'threads',
        'bluesky',
        'mastodon',
        'dribbble',
        'discord'
      ]
    }

    this.stats = {
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      postsByPlatform: {}
    }
  }

  isAvailable() {
    return !!this.baseUrl && !!this.apiKey
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
      throw new Error('Postiz not configured (API URL or key missing)')
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
      const response = await fetch(`${this.baseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          content,
          platforms: platforms.map((p) => p.toLowerCase()),
          media: mediaUrls,
          scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
          publishNow: !scheduledAt
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Postiz API error: ${response.status}`)
      }

      const data = await response.json()
      const latency = Date.now() - startTime

      this.stats.successfulPosts++
      for (const platform of platforms) {
        this.stats.postsByPlatform[platform] = (this.stats.postsByPlatform[platform] || 0) + 1
      }

      return {
        success: true,
        provider: 'postiz',
        postId: data.id || data.postId,
        platforms: platforms,
        status: scheduledAt ? 'scheduled' : 'published',
        scheduledAt: scheduledAt,
        latency
      }
    } catch (error) {
      this.stats.failedPosts++
      console.error('[Postiz] Error:', error.message)
      throw error
    }
  }

  /**
   * Get post status
   */
  async getPostStatus(postId) {
    if (!this.isAvailable()) {
      throw new Error('Postiz not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/posts/${postId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to get post status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[Postiz] Get status error:', error.message)
      throw error
    }
  }

  /**
   * Cancel a scheduled post
   */
  async cancelPost(postId) {
    if (!this.isAvailable()) {
      throw new Error('Postiz not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel post: ${response.status}`)
      }

      return { success: true, postId }
    } catch (error) {
      console.error('[Postiz] Cancel post error:', error.message)
      throw error
    }
  }

  /**
   * Get connected accounts
   */
  async getConnectedAccounts() {
    if (!this.isAvailable()) {
      throw new Error('Postiz not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`Failed to get accounts: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[Postiz] Get accounts error:', error.message)
      throw error
    }
  }

  getStatus() {
    return {
      name: this.config.name,
      available: this.isAvailable(),
      priority: this.config.priority,
      supportedPlatforms: this.config.supportedPlatforms,
      stats: this.stats
    }
  }
}

export default PostizClient
