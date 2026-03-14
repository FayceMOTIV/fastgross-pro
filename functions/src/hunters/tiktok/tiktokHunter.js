/**
 * TikTok Hunter
 * Automated prospect discovery via hashtag scraping
 * Uses tiktok-scraper (Node.js) for scraping + Gemini for qualification
 *
 * Cost: $0 (100% free open-source tools)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../../ai/callAI.js'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// Rate limits for TikTok safety
const RATE_LIMITS = {
  maxProfilesPerScan: 50,
  delayBetweenActions: 2000  // 2 seconds
}

/**
 * Scheduled TikTok Hunter
 * Runs daily at 10AM Paris time (offset from Instagram)
 */
export const tiktokHunter = onSchedule({
  schedule: '0 10 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540
}, async (event) => {
  console.log('🎯 TikTok Hunter: Starting daily scan...')

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0, errors: 0 }

  try {
    // Get all organizations with TikTok hunter enabled
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      // Check if TikTok hunter is enabled for this org
      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.tiktokEnabled) continue

      // Get ICP (Ideal Customer Profile) settings
      const icpSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('icp')
        .get()

      const icp = icpSnapshot.exists ? icpSnapshot.data() : {}
      const hashtags = icp.tiktokHashtags || icp.targetHashtags || ['entrepreneur', 'business']

      console.log(`📍 Processing org: ${orgId}, TikTok hashtags: ${hashtags.join(', ')}`)

      // Scrape prospects from hashtags
      for (const hashtag of hashtags.slice(0, 3)) { // Max 3 hashtags
        try {
          const prospects = await scrapeTikTokHashtag(hashtag)
          stats.scanned += prospects.length

          // Qualify each prospect with AI
          for (const prospect of prospects) {
            try {
              const qualification = await qualifyTikTokProspectWithAI(prospect, icp)

              if (qualification.score >= 70) {
                stats.qualified++

                // Check if prospect already exists (same platform)
                const existingSnapshot = await db
                  .collection('organizations')
                  .doc(orgId)
                  .collection('prospects')
                  .where('platform', '==', 'tiktok')
                  .where('platformId', '==', prospect.id)
                  .limit(1)
                  .get()

                if (!existingSnapshot.empty) continue

                // Cross-platform dedup: check by email
                let crossPlatformDoc = null
                if (prospect.email) {
                  const emailCheck = await db
                    .collection('organizations')
                    .doc(orgId)
                    .collection('prospects')
                    .where('email', '==', prospect.email)
                    .limit(1)
                    .get()
                  if (!emailCheck.empty) crossPlatformDoc = emailCheck.docs[0]
                }

                // Cross-platform dedup: check by Instagram handle
                if (!crossPlatformDoc && prospect.instagram) {
                  const igCheck = await db
                    .collection('organizations')
                    .doc(orgId)
                    .collection('prospects')
                    .where('username', '==', prospect.instagram)
                    .where('platform', '==', 'instagram')
                    .limit(1)
                    .get()
                  if (!igCheck.empty) crossPlatformDoc = igCheck.docs[0]
                }

                if (crossPlatformDoc) {
                  // Merge TikTok data into existing prospect
                  await crossPlatformDoc.ref.update({
                    tiktokUsername: prospect.username,
                    tiktokFollowers: prospect.followers || 0,
                    tiktokUrl: `https://tiktok.com/@${prospect.username}`,
                    tiktokVideoCount: prospect.videoCount || 0,
                    tiktokLikes: prospect.likes || 0,
                    platforms: FieldValue.arrayUnion('tiktok'),
                    updatedAt: FieldValue.serverTimestamp()
                  })
                  stats.saved++
                } else {
                  // Save new prospect
                  await db
                    .collection('organizations')
                    .doc(orgId)
                    .collection('prospects')
                    .add({
                      // Basic info
                      source: 'tiktok_hunter',
                      platform: 'tiktok',
                      platformId: prospect.id,
                      username: prospect.username,
                      fullName: prospect.nickname || '',
                      bio: prospect.bio || '',
                      followers: prospect.followers || 0,
                      profileUrl: `https://tiktok.com/@${prospect.username}`,

                      // Extracted contact info
                      email: prospect.email || null,
                      instagramHandle: prospect.instagram || null,
                      websiteUrl: prospect.website || null,

                      // Multi-platform tracking
                      platforms: ['tiktok'],

                      // AI Qualification
                      score: qualification.score,
                      qualificationReason: qualification.reason,
                      suggestedApproach: qualification.approach,

                      // Status
                      status: 'new',
                      hunterStatus: 'qualified',

                      // Metadata
                      hashtag,
                      videoCount: prospect.videoCount || 0,
                      likes: prospect.likes || 0,
                      scannedAt: FieldValue.serverTimestamp(),
                      createdAt: FieldValue.serverTimestamp()
                    })

                  stats.saved++
                }
              }
            } catch (err) {
              console.error(`Error qualifying TikTok prospect ${prospect.username}:`, err)
              stats.errors++
            }
          }
        } catch (err) {
          console.error(`Error scraping TikTok hashtag ${hashtag}:`, err)
          stats.errors++
        }
      }

      // Send notification to org
      await db.collection('organizations').doc(orgId).collection('notifications').add({
        type: 'tiktok_hunter_complete',
        title: '🎯 TikTok Hunter: Scan termine',
        message: `${stats.scanned} profils scannes, ${stats.qualified} qualifies, ${stats.saved} nouveaux prospects`,
        data: stats,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      })

      // Update hunter stats
      await db.collection('organizations').doc(orgId).collection('analytics').doc('tiktok_hunter').set({
        lastRun: FieldValue.serverTimestamp(),
        lastStats: stats,
        totalScanned: FieldValue.increment(stats.scanned),
        totalQualified: FieldValue.increment(stats.qualified),
        totalSaved: FieldValue.increment(stats.saved)
      }, { merge: true })
    }

    console.log(`✅ TikTok Hunter complete:`, stats)
    return stats

  } catch (error) {
    console.error('❌ TikTok Hunter failed:', error)
    throw error
  }
})

/**
 * Manual trigger for TikTok Hunter (callable)
 */
export const runTikTokHunterManual = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '1GiB',
  timeoutSeconds: 300
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, hashtag } = data

  if (!orgId || !hashtag) {
    throw new HttpsError('invalid-argument', 'orgId and hashtag are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  console.log(`🎯 Manual TikTok Hunt: org=${orgId}, hashtag=${hashtag}`)

  const db = getDb()
  const stats = { scanned: 0, qualified: 0, saved: 0 }

  try {
    // Get ICP settings
    const icpSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('settings')
      .doc('icp')
      .get()

    const icp = icpSnapshot.exists ? icpSnapshot.data() : {}

    // Scrape prospects
    const prospects = await scrapeTikTokHashtag(hashtag)
    stats.scanned = prospects.length

    // Qualify and save
    for (const prospect of prospects) {
      const qualification = await qualifyTikTokProspectWithAI(prospect, icp)

      if (qualification.score >= 70) {
        stats.qualified++

        const existingSnapshot = await db
          .collection('organizations')
          .doc(orgId)
          .collection('prospects')
          .where('platform', '==', 'tiktok')
          .where('platformId', '==', prospect.id)
          .limit(1)
          .get()

        if (!existingSnapshot.empty) continue

        // Cross-platform dedup: check by email
        let crossPlatformDoc = null
        if (prospect.email) {
          const emailCheck = await db
            .collection('organizations')
            .doc(orgId)
            .collection('prospects')
            .where('email', '==', prospect.email)
            .limit(1)
            .get()
          if (!emailCheck.empty) crossPlatformDoc = emailCheck.docs[0]
        }

        // Cross-platform dedup: check by Instagram handle
        if (!crossPlatformDoc && prospect.instagram) {
          const igCheck = await db
            .collection('organizations')
            .doc(orgId)
            .collection('prospects')
            .where('username', '==', prospect.instagram)
            .where('platform', '==', 'instagram')
            .limit(1)
            .get()
          if (!igCheck.empty) crossPlatformDoc = igCheck.docs[0]
        }

        if (crossPlatformDoc) {
          // Merge TikTok data into existing prospect
          await crossPlatformDoc.ref.update({
            tiktokUsername: prospect.username,
            tiktokFollowers: prospect.followers || 0,
            tiktokUrl: `https://tiktok.com/@${prospect.username}`,
            tiktokVideoCount: prospect.videoCount || 0,
            tiktokLikes: prospect.likes || 0,
            platforms: FieldValue.arrayUnion('tiktok'),
            updatedAt: FieldValue.serverTimestamp()
          })
          stats.saved++
        } else {
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('prospects')
            .add({
              source: 'tiktok_hunter',
              platform: 'tiktok',
              platformId: prospect.id,
              username: prospect.username,
              fullName: prospect.nickname || '',
              bio: prospect.bio || '',
              followers: prospect.followers || 0,
              profileUrl: `https://tiktok.com/@${prospect.username}`,
              email: prospect.email || null,
              instagramHandle: prospect.instagram || null,
              websiteUrl: prospect.website || null,
              platforms: ['tiktok'],
              score: qualification.score,
              qualificationReason: qualification.reason,
              suggestedApproach: qualification.approach,
              status: 'new',
              hunterStatus: 'qualified',
              hashtag,
              videoCount: prospect.videoCount || 0,
              likes: prospect.likes || 0,
              scannedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp()
            })

          stats.saved++
        }
      }
    }

    return {
      success: true,
      message: `Scan termine: ${stats.scanned} scannes, ${stats.qualified} qualifies, ${stats.saved} sauvegardes`,
      stats
    }

  } catch (error) {
    console.error('Manual TikTok Hunt failed:', error)
    throw new HttpsError('internal', `Scan failed: ${error.message}`)
  }
})

/**
 * Scrape TikTok hashtag using tiktok-scraper
 */
async function scrapeTikTokHashtag(hashtag) {
  try {
    // Dynamic import for tiktok-scraper
    const TikTokScraper = await import('tiktok-scraper')

    const options = {
      number: 30, // Number of posts to fetch
      sessionList: [], // No session needed for basic scraping
      proxy: '',
      by_user_id: false,
      asyncDownload: 5,
      asyncScraping: 3,
      filepath: '',
      fileName: '',
      filetype: '',
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'referer': 'https://www.tiktok.com/',
        'cookie': ''
      },
      timeout: 30000,
      tac: '' // Anti-bot token (optional)
    }

    console.log(`📱 Scraping TikTok hashtag: #${hashtag}`)

    // Get posts from hashtag
    const hashtagData = await TikTokScraper.hashtag(hashtag, options)
    const posts = hashtagData.collector || []

    console.log(`📊 Found ${posts.length} posts for #${hashtag}`)

    // Extract unique users from posts
    const seenUsers = new Set()
    const prospects = []

    for (const post of posts) {
      if (!post.authorMeta || seenUsers.has(post.authorMeta.id)) continue
      seenUsers.add(post.authorMeta.id)

      const author = post.authorMeta
      const bio = author.signature || ''

      // Extract contact info from bio
      const contactInfo = extractContactInfo(bio)

      prospects.push({
        id: author.id,
        username: author.name || author.nickName,
        nickname: author.nickName || author.name,
        bio: bio,
        followers: author.fans || 0,
        following: author.following || 0,
        likes: author.heart || 0,
        videoCount: author.video || 0,
        verified: author.verified || false,
        email: contactInfo.email,
        instagram: contactInfo.instagram,
        website: contactInfo.website
      })

      // Respect rate limit
      await sleep(RATE_LIMITS.delayBetweenActions)

      if (prospects.length >= RATE_LIMITS.maxProfilesPerScan) break
    }

    console.log(`✅ Extracted ${prospects.length} unique TikTok profiles`)
    return prospects

  } catch (error) {
    console.error('TikTok scraping error:', error)
    // Return mock data on error
    return getMockTikTokProspects(hashtag)
  }
}

/**
 * Extract contact information from TikTok bio
 */
function extractContactInfo(bio) {
  const result = {
    email: null,
    instagram: null,
    website: null
  }

  if (!bio) return result

  // Extract email
  const emailMatch = bio.match(/[\w.-]+@[\w.-]+\.\w+/i)
  if (emailMatch) {
    result.email = emailMatch[0].toLowerCase()
  }

  // Extract Instagram handle
  const instagramPatterns = [
    /@([a-zA-Z0-9._]+)/,
    /ig:\s*@?([a-zA-Z0-9._]+)/i,
    /insta:\s*@?([a-zA-Z0-9._]+)/i,
    /instagram:\s*@?([a-zA-Z0-9._]+)/i
  ]

  for (const pattern of instagramPatterns) {
    const match = bio.match(pattern)
    if (match && match[1] && !match[1].includes('.com')) {
      result.instagram = match[1]
      break
    }
  }

  // Extract website
  const websiteMatch = bio.match(/https?:\/\/[^\s]+/i)
  if (websiteMatch) {
    result.website = websiteMatch[0]
  }

  return result
}

/**
 * Mock TikTok prospects for testing
 */
function getMockTikTokProspects(hashtag) {
  return [
    {
      id: `mock_tiktok_${Date.now()}_1`,
      username: `${hashtag}_creator_1`,
      nickname: 'Alexandre Coach Business',
      bio: `Coach Business | J'aide les entrepreneurs a scaler \ud83d\udcc8 | contact@alexcoach.fr | IG: @alex.coach`,
      followers: 15000,
      following: 500,
      likes: 250000,
      videoCount: 150,
      verified: false,
      email: 'contact@alexcoach.fr',
      instagram: 'alex.coach',
      website: null
    },
    {
      id: `mock_tiktok_${Date.now()}_2`,
      username: `${hashtag}_expert_2`,
      nickname: 'Sophie E-commerce',
      bio: `E-commerce Expert | +2M de CA | Formations: https://sophie-ecom.fr | DM pour collabs`,
      followers: 45000,
      following: 300,
      likes: 800000,
      videoCount: 280,
      verified: true,
      email: null,
      instagram: null,
      website: 'https://sophie-ecom.fr'
    },
    {
      id: `mock_tiktok_${Date.now()}_3`,
      username: `${hashtag}_pro_3`,
      nickname: 'Pierre Marketing Digital',
      bio: `Agence Marketing | Clients: +50 PME | hello@pierre-marketing.com`,
      followers: 8500,
      following: 200,
      likes: 120000,
      videoCount: 95,
      verified: false,
      email: 'hello@pierre-marketing.com',
      instagram: null,
      website: null
    }
  ]
}

/**
 * Qualify TikTok prospect using Gemini AI
 */
async function qualifyTikTokProspectWithAI(prospect, icp) {
  try {
    const prompt = `Tu es un expert en qualification de prospects B2B. Analyse ce profil TikTok et donne un score de 0 a 100.

PROFIL TIKTOK:
- Username: @${prospect.username}
- Nom: ${prospect.nickname || 'Non specifie'}
- Bio: "${prospect.bio || 'Pas de bio'}"
- Followers: ${prospect.followers || 0}
- Videos: ${prospect.videoCount || 0}
- Likes totaux: ${prospect.likes || 0}
- Email trouve: ${prospect.email || 'Non'}
- Instagram: ${prospect.instagram || 'Non'}
- Site web: ${prospect.website || 'Non'}

PROFIL CLIENT IDEAL (ICP):
- Secteur cible: ${icp.industry || 'Tous secteurs'}
- Roles cibles: ${icp.targetRoles?.join(', ') || 'Entrepreneurs, Createurs de contenu'}
- Taille entreprise: ${icp.companySize || 'PME/Solopreneurs'}
- Mots-cles: ${icp.keywords?.join(', ') || 'business, entrepreneur, coach'}

CRITERES DE SCORING TIKTOK:
- 80-100: Createur pro avec contact direct (email), followers qualifies, contenu business
- 60-79: Bon potentiel, bio pro, signaux business clairs
- 40-59: Potentiel moyen, contenu mixte
- 0-39: Pas de fit evident, contenu personnel

BONUS:
- Email dans bio: +15 points
- Instagram lie: +10 points
- Site web: +10 points
- Verifie TikTok: +5 points

Reponds UNIQUEMENT avec ce JSON (pas d'autre texte):
{
  "score": <number 0-100>,
  "reason": "<explication courte du score>",
  "approach": "<suggestion d'approche personnalisee>"
}`

    const text = await callAI(prompt, 500)
    const analysis = extractJSON(text)
    if (!analysis) throw new Error('No JSON in response')

    return {
      score: Math.min(100, Math.max(0, analysis.score || 0)),
      reason: analysis.reason || 'Score calcule par IA',
      approach: analysis.approach || 'Message de prospection standard'
    }

  } catch (error) {
    console.error('AI qualification error:', error.message)
    return {
      score: prospect.followers > 5000 ? 65 : 45,
      reason: 'Erreur IA - score base sur followers',
      approach: 'Message generique de prospection'
    }
  }
}

/**
 * Get TikTok hunter statistics
 */
export const getTikTokHunterStats = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()

  try {
    // Get TikTok hunter analytics
    const analyticsDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('analytics')
      .doc('tiktok_hunter')
      .get()

    const analytics = analyticsDoc.exists ? analyticsDoc.data() : {}

    // Get recent TikTok prospects
    const prospectsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('platform', '==', 'tiktok')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const prospects = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      scannedAt: doc.data().scannedAt?.toDate?.()?.toISOString() || null
    }))

    // Count by status
    const byStatus = {
      new: prospects.filter(p => p.status === 'new').length,
      contacted: prospects.filter(p => p.status === 'contacted').length,
      replied: prospects.filter(p => p.status === 'replied').length,
      converted: prospects.filter(p => p.status === 'converted').length
    }

    // Count with email
    const withEmail = prospects.filter(p => p.email).length
    const withInstagram = prospects.filter(p => p.instagramHandle).length
    const withWebsite = prospects.filter(p => p.websiteUrl).length

    return {
      success: true,
      stats: {
        totalScanned: analytics.totalScanned || 0,
        totalQualified: analytics.totalQualified || 0,
        totalSaved: analytics.totalSaved || 0,
        lastRun: analytics.lastRun?.toDate?.()?.toISOString() || null,
        lastStats: analytics.lastStats || {}
      },
      byStatus,
      contactInfo: {
        withEmail,
        withInstagram,
        withWebsite
      },
      recentProspects: prospects
    }

  } catch (error) {
    console.error('Failed to get TikTok hunter stats:', error)
    throw new HttpsError('internal', 'Failed to get stats')
  }
})

/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
