/**
 * Reddit Intent Hunter — Module 3 (Alex V4)
 * Monitors Reddit, Hacker News, and forums for purchase intent signals.
 *
 * Sources (free, 0€):
 *  - Serper.dev (existing key, site:reddit.com / site:news.ycombinator.com)
 *  - Reddit public JSON API (no auth needed for public posts)
 *
 * Intent scoring:
 *  +30 "looking for alternative to" / "willing to pay for"
 *  +25 "switched from" / "moved away from"
 *  +20 "frustrated with" / "hate using"
 *  +15 "anyone recommend" / "suggestions for"
 *  +10 generic niche mention
 *
 * Schedule: every 4 hours (intent signals are time-sensitive)
 * Storage: organizations/{orgId}/prospects (source = 'reddit_intent_hunter')
 *
 * CRITICAL RULE: React within 1-3 hours of publication for max response rate.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

const RATE_LIMITS = {
  maxQueries: 6,
  maxResultsPerQuery: 10,
  maxRedditFetches: 15,
  redditDelayMs: 2000
}

// ─── Intent pattern definitions ─────────────────────────────────────

const INTENT_PATTERNS = [
  {
    category: 'burning',
    score: 30,
    patterns: [
      /looking for (?:an? )?alternative/i,
      /willing to pay/i,
      /need (?:a |an )?(?:tool|solution|platform|service|software)/i,
      /budget (?:for|of|is|around)/i,
      /ready to (?:pay|invest|switch|buy)/i,
      /anyone know (?:a |an )?(?:good|better|cheaper)/i
    ],
    label: 'Intent brulant'
  },
  {
    category: 'very_hot',
    score: 25,
    patterns: [
      /switched from/i,
      /moved away from/i,
      /migrated? (?:from|away)/i,
      /replaced? .*? with/i,
      /dumped/i,
      /left .* for/i
    ],
    label: 'Tres chaud'
  },
  {
    category: 'hot',
    score: 20,
    patterns: [
      /frustrated with/i,
      /hate using/i,
      /(?:terrible|awful|worst|horrible) (?:experience|support|service)/i,
      /can'?t stand/i,
      /fed up with/i,
      /disappointed (?:with|by|in)/i,
      /looking to leave/i
    ],
    label: 'Chaud'
  },
  {
    category: 'warm',
    score: 15,
    patterns: [
      /anyone recommend/i,
      /suggestions? for/i,
      /what (?:do you|would you) (?:use|recommend|suggest)/i,
      /best (?:tool|solution|platform|service|software) for/i,
      /(?:comparing|comparison|vs|versus)/i,
      /which (?:one|tool|service) (?:do you|should I)/i
    ],
    label: 'Tiede'
  }
]

// Search query templates for Serper
const QUERY_TEMPLATES = [
  '"looking for" OR "alternative to" OR "recommend" {keyword} site:reddit.com',
  '"frustrated with" OR "switched from" OR "willing to pay" {keyword} site:reddit.com',
  '"need a tool" OR "best software" OR "suggestions for" {keyword} site:reddit.com',
  '{keyword} OR {competitor} "looking for" OR "recommend" site:news.ycombinator.com'
]

// ─── Scheduled: every 4 hours ───────────────────────────────────────

export const redditIntentHunter = onSchedule({
  schedule: 'every 4 hours',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  logger.info('🔴 Reddit Intent Hunter: starting scan')

  const db = getDb()
  const globalStats = { orgsProcessed: 0, searched: 0, intentsFound: 0, saved: 0, errors: 0 }

  try {
    const orgsSnap = await db.collection('organizations').get()

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      if (!orgData.hunterConfig?.redditIntentEnabled) continue

      try {
        const stats = await runRedditIntentScan(db, orgId)
        globalStats.orgsProcessed++
        globalStats.searched += stats.searched
        globalStats.intentsFound += stats.intentsFound
        globalStats.saved += stats.saved
        globalStats.errors += stats.errors
      } catch (err) {
        logger.error(`Error processing org ${orgId}:`, err)
        globalStats.errors++
      }
    }
  } catch (err) {
    logger.error('Reddit Intent Hunter fatal error:', err)
  }

  logger.info('🔴 Reddit Intent Hunter: done', globalStats)
})

// ─── Manual trigger ─────────────────────────────────────────────────

export const runRedditIntentHunterManual = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, keywords, competitors } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const stats = await runRedditIntentScan(db, orgId, keywords, competitors)

  return { success: true, stats }
})

// ─── Stats ──────────────────────────────────────────────────────────

export const getRedditIntentHunterStats = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const prospectsSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'reddit_intent_hunter')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  const prospects = prospectsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const total = prospects.length

  const byCategory = {}
  for (const p of prospects) {
    const cat = p.intentCategory || 'unknown'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }

  return {
    success: true,
    stats: {
      total,
      byCategory,
      avgScore: total > 0 ? Math.round(prospects.reduce((s, p) => s + (p.score || 0), 0) / total) : 0,
      last24h: prospects.filter(p => {
        const created = p.createdAt?.toDate?.() || new Date(p.createdAt)
        return (Date.now() - created.getTime()) < 24 * 3600 * 1000
      }).length
    }
  }
})

// ─── Core scan logic ────────────────────────────────────────────────

export async function runRedditIntentScan(db, orgId, overrideKeywords, overrideCompetitors) {
  const stats = { searched: 0, intentsFound: 0, saved: 0, errors: 0 }

  if (!SERPER_API_KEY) {
    logger.error('SERPER_API_KEY not configured')
    return stats
  }

  // Load niche context
  const context = await loadNicheContext(db, orgId)
  const keywords = overrideKeywords || context.keywords
  const competitors = overrideCompetitors || context.competitors

  if (!keywords.length) {
    logger.warn(`Org ${orgId}: no keywords configured for Reddit intent`)
    return stats
  }

  logger.info(`🔴 Org ${orgId}: scanning Reddit for: ${keywords.join(', ')} (competitors: ${competitors.join(', ')})`)

  // Build and execute search queries
  const allResults = []
  const queries = buildSearchQueries(keywords, competitors)

  for (const query of queries.slice(0, RATE_LIMITS.maxQueries)) {
    try {
      const results = await searchSerper(query)
      stats.searched++
      allResults.push(...results)
    } catch (err) {
      logger.warn(`Serper error for query "${query}":`, err.message)
      stats.errors++
    }
  }

  // Dedup by URL
  const uniqueResults = dedup(allResults, 'link')
  logger.info(`🔴 Org ${orgId}: ${uniqueResults.length} unique results to analyze`)

  // Fetch full post content and analyze intent
  const intents = []
  let fetchCount = 0

  for (const result of uniqueResults) {
    if (fetchCount >= RATE_LIMITS.maxRedditFetches) break

    try {
      const postData = await fetchRedditPost(result.link)
      if (!postData) continue
      fetchCount++

      const intentAnalysis = analyzeIntent(postData, keywords, competitors)
      if (intentAnalysis.totalScore > 0) {
        intents.push({
          ...postData,
          ...intentAnalysis,
          serperSnippet: result.snippet,
          serperTitle: result.title
        })
      }

      // Respect Reddit rate limit
      await new Promise(r => setTimeout(r, RATE_LIMITS.redditDelayMs))
    } catch (err) {
      logger.warn(`Error fetching post ${result.link}:`, err.message)
      stats.errors++
    }
  }

  stats.intentsFound = intents.length

  // Dedup against existing Reddit prospects
  const existingSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'reddit_intent_hunter')
    .get()

  const existingUrls = new Set(existingSnap.docs.map(d => d.data().redditUrl))

  const newIntents = intents.filter(i => !existingUrls.has(i.url))

  // Save to Firestore
  const batch = db.batch()
  for (const intent of newIntents.slice(0, 30)) {
    const ref = db.collection('organizations').doc(orgId).collection('prospects').doc()
    batch.set(ref, {
      companyName: intent.author !== '[deleted]' ? `u/${intent.author}` : 'Anonyme Reddit',
      fullName: intent.author !== '[deleted]' ? intent.author : null,
      source: 'reddit_intent_hunter',
      signal_type: 'reddit_intent',
      signal_detail: buildSignalDetail(intent),
      score: intent.totalScore,
      status: 'new',
      foundByAlex: true,

      // Reddit-specific fields
      redditUrl: intent.url,
      redditSubreddit: intent.subreddit,
      redditTitle: intent.title,
      redditBody: (intent.body || '').substring(0, 1000),
      redditAuthor: intent.author,
      redditScore: intent.ups || 0,
      redditComments: intent.numComments || 0,
      redditPostedAt: intent.createdUtc ? new Date(intent.createdUtc * 1000) : null,

      // Intent analysis
      intentCategory: intent.topCategory,
      intentPatterns: intent.matchedPatterns,
      intentFreshness: intent.freshness,
      intentUrgency: intent.urgency,

      // Prospection fields
      platforms: ['reddit'],
      channels: { email: false, phone: false, linkedin: false },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    stats.saved++
  }

  if (stats.saved > 0) {
    await batch.commit()

    // Notification
    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'reddit_intent_hunter_complete',
      title: 'Reddit Intent: Signaux detectes',
      message: `${stats.intentsFound} intentions detectees, ${stats.saved} nouveaux prospects`,
      data: stats,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  }

  // Log run
  await db.collection('organizations').doc(orgId).collection('hunterLogs').add({
    hunter: 'reddit_intent_hunter',
    stats,
    keywords,
    competitors,
    runAt: FieldValue.serverTimestamp()
  })

  logger.info(`🔴 Org ${orgId}: done`, stats)
  return stats
}

// ─── Serper search ──────────────────────────────────────────────────

async function searchSerper(query) {
  const response = await axios.post('https://google.serper.dev/search', {
    q: query,
    num: RATE_LIMITS.maxResultsPerQuery,
    tbs: 'qdr:w' // Last week only (freshness matters for intent)
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  })

  return (response.data?.organic || []).map(r => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    date: r.date
  }))
}

// ─── Reddit JSON API ────────────────────────────────────────────────

async function fetchRedditPost(url) {
  // Convert Reddit URL to JSON endpoint
  if (!url.includes('reddit.com')) return null

  // Clean URL and append .json
  let jsonUrl = url
    .replace(/\?.*$/, '')
    .replace(/\/$/, '')

  // Handle comment URLs — get the post
  if (!jsonUrl.endsWith('.json')) {
    jsonUrl += '.json'
  }

  try {
    const response = await axios.get(jsonUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'FMF-Hunter/1.0 (research bot)'
      }
    })

    const data = response.data
    if (!Array.isArray(data) || !data[0]?.data?.children?.[0]) return null

    const post = data[0].data.children[0].data
    return {
      url: `https://reddit.com${post.permalink}`,
      title: post.title || '',
      body: post.selftext || '',
      author: post.author || '[deleted]',
      subreddit: post.subreddit || '',
      ups: post.ups || 0,
      numComments: post.num_comments || 0,
      createdUtc: post.created_utc || null,
      isSelf: post.is_self || false
    }
  } catch (err) {
    // Reddit might rate-limit or return 403
    if (err.response?.status === 429) {
      logger.warn('Reddit rate limited, backing off')
      await new Promise(r => setTimeout(r, 5000))
    }
    return null
  }
}

// ─── Intent analysis ────────────────────────────────────────────────

function analyzeIntent(post, keywords, competitors) {
  const text = `${post.title} ${post.body}`.toLowerCase()
  let totalScore = 0
  const matchedPatterns = []
  let topCategory = null
  let topCategoryScore = 0

  // Check intent patterns
  for (const group of INTENT_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(text)) {
        totalScore += group.score
        matchedPatterns.push(group.label)
        if (group.score > topCategoryScore) {
          topCategoryScore = group.score
          topCategory = group.category
        }
        break // Only count each category once
      }
    }
  }

  // Keyword relevance bonus (+10)
  const keywordMatch = keywords.some(kw => text.includes(kw.toLowerCase()))
  if (keywordMatch) {
    totalScore += 10
    matchedPatterns.push('Keyword match')
  }

  // Competitor mention bonus (+15)
  const competitorMatch = competitors.some(c => text.includes(c.toLowerCase()))
  if (competitorMatch) {
    totalScore += 15
    matchedPatterns.push('Concurrent mentionne')
  }

  // Freshness bonus
  const freshness = calculateFreshness(post.createdUtc)
  if (freshness === 'very_fresh') {
    totalScore += 10 // < 3 hours
  } else if (freshness === 'fresh') {
    totalScore += 5 // < 24 hours
  }

  // Engagement signal
  if (post.numComments > 20) totalScore += 5
  if (post.ups > 50) totalScore += 5

  // Urgency detection
  const urgency = detectUrgency(text)

  return {
    totalScore: Math.min(totalScore, 100),
    matchedPatterns: [...new Set(matchedPatterns)],
    topCategory: topCategory || 'generic',
    freshness,
    urgency
  }
}

function calculateFreshness(createdUtc) {
  if (!createdUtc) return 'unknown'
  const ageHours = (Date.now() / 1000 - createdUtc) / 3600
  if (ageHours < 3) return 'very_fresh'
  if (ageHours < 24) return 'fresh'
  if (ageHours < 72) return 'recent'
  return 'old'
}

function detectUrgency(text) {
  if (/asap|urgent|immediately|right now|this week|deadline/i.test(text)) return 'high'
  if (/soon|this month|planning to|looking to/i.test(text)) return 'medium'
  return 'low'
}

function buildSignalDetail(intent) {
  const parts = []
  parts.push(`Post sur r/${intent.subreddit}: "${(intent.title || '').substring(0, 100)}"`)
  if (intent.matchedPatterns.length) {
    parts.push(`Signaux: ${intent.matchedPatterns.join(', ')}`)
  }
  if (intent.freshness === 'very_fresh') {
    parts.push('⚡ Tres recent (< 3h) — reactir vite')
  }
  if (intent.urgency === 'high') {
    parts.push('🔥 Urgence elevee detectee')
  }
  return parts.join('. ')
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildSearchQueries(keywords, competitors) {
  const queries = []

  for (const keyword of keywords.slice(0, 3)) {
    for (const template of QUERY_TEMPLATES) {
      const competitor = competitors[0] || ''
      const query = template
        .replace(/\{keyword\}/g, keyword)
        .replace(/\{competitor\}/g, competitor)
      queries.push(query)
    }
  }

  // Add competitor-specific queries
  for (const competitor of competitors.slice(0, 2)) {
    queries.push(`"${competitor}" "alternative" OR "frustrated" OR "switched from" site:reddit.com`)
  }

  return [...new Set(queries)]
}

async function loadNicheContext(db, orgId) {
  const result = { keywords: [], competitors: [] }

  // Try businessProfile first
  const profileSnap = await db
    .collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile')
    .get()

  if (profileSnap.exists) {
    const profile = profileSnap.data()
    if (profile.niche) result.keywords.push(profile.niche)
    if (profile.keywords) result.keywords.push(...profile.keywords)
    if (profile.sector) result.keywords.push(profile.sector)
    if (profile.service) result.keywords.push(profile.service)
    if (profile.competitors) result.competitors.push(...profile.competitors)
  }

  // Fallback to ICP settings
  if (!result.keywords.length) {
    const icpSnap = await db
      .collection('organizations').doc(orgId)
      .collection('settings').doc('icp')
      .get()

    if (icpSnap.exists) {
      const icp = icpSnap.data()
      if (icp.targetKeywords) result.keywords.push(...icp.targetKeywords)
      if (icp.competitors) result.competitors.push(...icp.competitors)
    }
  }

  result.keywords = [...new Set(result.keywords.map(k => k.toLowerCase().trim()).filter(Boolean))]
  result.competitors = [...new Set(result.competitors.map(c => c.trim()).filter(Boolean))]

  return result
}

function dedup(items, key) {
  const seen = new Set()
  return items.filter(item => {
    const val = item[key]
    if (!val || seen.has(val)) return false
    seen.add(val)
    return true
  })
}
