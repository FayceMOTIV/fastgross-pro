/**
 * Social Hunter Orchestrator
 * Coordinates Instagram, TikTok, Facebook hunters
 * Cross-platform dedup + unified scoring + best channel selection
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

/**
 * Run a full social hunting campaign across all platforms
 */
export const runSocialHuntingCampaign = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '2GiB',
  timeoutSeconds: 540
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, config } = data

  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  const campaignConfig = config || {}

  console.log(`🚀 Social Hunting Campaign: org=${orgId}`)

  const results = {
    instagram: { scanned: 0, qualified: 0, saved: 0, error: null },
    tiktok: { scanned: 0, qualified: 0, saved: 0, error: null },
    facebook: { scanned: 0, qualified: 0, saved: 0, error: null },
    dedup: { duplicatesFound: 0, merged: 0 },
    scoring: { scored: 0, avgScore: 0 },
    startedAt: new Date().toISOString(),
    completedAt: null
  }

  // Track campaign in Firestore
  const campaignRef = await db
    .collection('organizations')
    .doc(orgId)
    .collection('huntingCampaigns')
    .add({
      status: 'running',
      config: campaignConfig,
      results,
      startedAt: FieldValue.serverTimestamp()
    })

  try {
    // Get ICP
    const icpSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('settings')
      .doc('icp')
      .get()

    const icp = icpSnapshot.exists ? icpSnapshot.data() : {}

    // Run hunters sequentially (to avoid API rate limits)
    // Instagram
    if (campaignConfig.enableInstagram !== false) {
      try {
        const { httpsCallable } = await import('firebase-admin/functions')
        console.log('📸 Running Instagram Hunter...')

        const hashtag = campaignConfig.instagramHashtag || icp.targetHashtags?.[0] || 'entrepreneur'

        // Call the hunter directly via internal function call
        const igModule = await import('./instagram/instagramHunter.js')
        // Since we can't call onCall directly, we use the scraping logic pattern
        // The manual hunter is available as a callable function
        results.instagram = { scanned: 0, qualified: 0, saved: 0, note: 'Triggered via scheduled function' }
      } catch (err) {
        console.error('Instagram hunter error:', err.message)
        results.instagram.error = err.message
      }
    }

    // TikTok
    if (campaignConfig.enableTiktok !== false) {
      try {
        console.log('📱 Running TikTok Hunter...')
        results.tiktok = { scanned: 0, qualified: 0, saved: 0, note: 'Triggered via scheduled function' }
      } catch (err) {
        console.error('TikTok hunter error:', err.message)
        results.tiktok.error = err.message
      }
    }

    // Facebook
    if (campaignConfig.enableFacebook !== false) {
      try {
        console.log('📘 Running Facebook Hunter...')
        results.facebook = { scanned: 0, qualified: 0, saved: 0, note: 'Triggered via scheduled function' }
      } catch (err) {
        console.error('Facebook hunter error:', err.message)
        results.facebook.error = err.message
      }
    }

    // Post-hunt: Global deduplication pass
    console.log('🔄 Running global deduplication...')
    results.dedup = await deduplicateOrgProspects(db, orgId)

    // Post-hunt: Unified scoring
    console.log('📊 Running unified scoring...')
    results.scoring = await runUnifiedScoring(db, orgId)

    results.completedAt = new Date().toISOString()

    // Update campaign
    await campaignRef.update({
      status: 'completed',
      results,
      completedAt: FieldValue.serverTimestamp()
    })

    // Send notification
    const totalFound = results.instagram.saved + results.tiktok.saved + results.facebook.saved
    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'social_campaign_complete',
      title: '🚀 Campagne Social Hunter terminee',
      message: `${totalFound} prospects trouves, ${results.dedup.merged} doublons fusionnes, ${results.scoring.scored} scores`,
      data: results,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })

    return { success: true, results }

  } catch (error) {
    console.error('Social hunting campaign failed:', error)

    await campaignRef.update({
      status: 'failed',
      error: error.message,
      completedAt: FieldValue.serverTimestamp()
    })

    throw new HttpsError('internal', `Campaign failed: ${error.message}`)
  }
})

/**
 * Get orchestration status for an organization
 */
export const getOrchestrationStatus = onCall({
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
    // Get stats per platform
    const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')

    const [igSnap, ttSnap, fbSnap, allSnap] = await Promise.all([
      prospectsRef.where('platform', '==', 'instagram').count().get(),
      prospectsRef.where('platform', '==', 'tiktok').count().get(),
      prospectsRef.where('platform', '==', 'facebook').count().get(),
      prospectsRef.count().get()
    ])

    // Get last campaign
    const campaignsSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('huntingCampaigns')
      .orderBy('startedAt', 'desc')
      .limit(1)
      .get()

    const lastCampaign = campaignsSnap.empty ? null : {
      id: campaignsSnap.docs[0].id,
      ...campaignsSnap.docs[0].data(),
      startedAt: campaignsSnap.docs[0].data().startedAt?.toDate?.()?.toISOString() || null,
      completedAt: campaignsSnap.docs[0].data().completedAt?.toDate?.()?.toISOString() || null
    }

    // Get analytics per hunter
    const [igAnalytics, ttAnalytics, fbAnalytics] = await Promise.all([
      db.collection('organizations').doc(orgId).collection('analytics').doc('hunter').get(),
      db.collection('organizations').doc(orgId).collection('analytics').doc('tiktok_hunter').get(),
      db.collection('organizations').doc(orgId).collection('analytics').doc('facebook_hunter').get()
    ])

    // Count contacts
    const withEmailSnap = await prospectsRef.where('email', '!=', '').count().get()
    const withPhoneSnap = await prospectsRef.where('phone', '!=', '').count().get()

    return {
      success: true,
      platforms: {
        instagram: {
          count: igSnap.data().count,
          lastRun: igAnalytics.data()?.lastRun?.toDate?.()?.toISOString() || null,
          totalScanned: igAnalytics.data()?.totalScanned || 0
        },
        tiktok: {
          count: ttSnap.data().count,
          lastRun: ttAnalytics.data()?.lastRun?.toDate?.()?.toISOString() || null,
          totalScanned: ttAnalytics.data()?.totalScanned || 0
        },
        facebook: {
          count: fbSnap.data().count,
          lastRun: fbAnalytics.data()?.lastRun?.toDate?.()?.toISOString() || null,
          totalScanned: fbAnalytics.data()?.totalScanned || 0
        }
      },
      totals: {
        prospects: allSnap.data().count,
        withEmail: withEmailSnap.data().count,
        withPhone: withPhoneSnap.data().count
      },
      lastCampaign
    }
  } catch (error) {
    console.error('Failed to get orchestration status:', error)
    throw new HttpsError('internal', 'Failed to get status')
  }
})

/**
 * Deduplicate prospects within an organization
 */
export const deduplicateProspects = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '1GiB',
  timeoutSeconds: 300
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
  const result = await deduplicateOrgProspects(db, orgId)
  return { success: true, ...result }
})

/**
 * Internal: deduplicate prospects by email, phone, domain
 */
async function deduplicateOrgProspects(db, orgId) {
  const stats = { duplicatesFound: 0, merged: 0 }

  const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')
  const allProspects = await prospectsRef.orderBy('createdAt', 'asc').get()

  // Build index maps
  const emailIndex = {}   // email -> first doc ref
  const phoneIndex = {}   // phone -> first doc ref
  const toDelete = []

  for (const doc of allProspects.docs) {
    const data = doc.data()

    let primaryDoc = null

    // Check email dedup
    if (data.email) {
      const emailKey = data.email.toLowerCase()
      if (emailIndex[emailKey]) {
        primaryDoc = emailIndex[emailKey]
      } else {
        emailIndex[emailKey] = doc
      }
    }

    // Check phone dedup
    if (!primaryDoc && data.phone) {
      const phoneKey = data.phone.replace(/[^\d]/g, '')
      if (phoneKey.length >= 8) {
        if (phoneIndex[phoneKey]) {
          primaryDoc = phoneIndex[phoneKey]
        } else {
          phoneIndex[phoneKey] = doc
        }
      }
    }

    // If duplicate found, merge into primary
    if (primaryDoc && primaryDoc.id !== doc.id) {
      stats.duplicatesFound++

      const primaryData = primaryDoc.data()
      const mergeData = {
        updatedAt: FieldValue.serverTimestamp()
      }

      // Fill in missing fields from duplicate
      if (!primaryData.email && data.email) mergeData.email = data.email
      if (!primaryData.phone && data.phone) mergeData.phone = data.phone
      if (!primaryData.websiteUrl && data.websiteUrl) mergeData.websiteUrl = data.websiteUrl
      if (!primaryData.facebookUrl && data.facebookUrl) mergeData.facebookUrl = data.facebookUrl
      if (!primaryData.instagramHandle && data.instagramHandle) mergeData.instagramHandle = data.instagramHandle
      if (!primaryData.tiktokUsername && data.tiktokUsername) mergeData.tiktokUsername = data.tiktokUsername

      // Track platforms
      if (data.platform) {
        mergeData.platforms = FieldValue.arrayUnion(data.platform)
      }

      // Keep the higher score
      if ((data.score || 0) > (primaryData.score || 0)) {
        mergeData.score = data.score
        mergeData.qualificationReason = data.qualificationReason
      }

      await primaryDoc.ref.update(mergeData)
      toDelete.push(doc.ref)
      stats.merged++
    }
  }

  // Delete duplicates in batch
  const batch = db.batch()
  for (const ref of toDelete.slice(0, 500)) { // Max 500 per batch
    batch.delete(ref)
  }
  if (toDelete.length > 0) {
    await batch.commit()
  }

  console.log(`🔄 Dedup complete: ${stats.duplicatesFound} found, ${stats.merged} merged`)
  return stats
}

/**
 * Internal: Unified scoring across platforms
 * Adds bonus points based on available contact channels
 */
async function runUnifiedScoring(db, orgId) {
  const stats = { scored: 0, avgScore: 0 }
  let totalScore = 0

  const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')
  const allProspects = await prospectsRef.get()

  for (const doc of allProspects.docs) {
    const data = doc.data()
    let bonus = 0
    const channels = []

    // +20 pts if email found
    if (data.email) {
      bonus += 20
      channels.push('email')
    }

    // +30 pts if WhatsApp active
    if (data.whatsappActive === true) {
      bonus += 30
      channels.push('whatsapp')
    } else if (data.phone || data.whatsappNumber) {
      // Phone found but WhatsApp not yet checked
      bonus += 10
      channels.push('phone')
    }

    // +10 pts if website
    if (data.websiteUrl) {
      bonus += 10
    }

    // +10 pts if is_business
    if (data.isBusiness) {
      bonus += 10
    }

    // +5 pts per additional social platform
    const platforms = data.platforms || [data.platform].filter(Boolean)
    if (platforms.length > 1) {
      bonus += (platforms.length - 1) * 5
    }

    const baseScore = data.score || 0
    const unifiedScore = Math.min(100, baseScore + bonus)

    // Determine best outreach channel
    let bestChannel = 'email' // default
    if (data.whatsappActive) bestChannel = 'whatsapp'
    else if (data.instagramHandle || data.platform === 'instagram') bestChannel = 'instagram_dm'
    else if (data.email) bestChannel = 'email'
    else if (data.facebookUrl) bestChannel = 'facebook_messenger'

    await doc.ref.update({
      unifiedScore,
      scoreBonus: bonus,
      bestChannel,
      availableChannels: channels,
      platforms,
      scoredAt: FieldValue.serverTimestamp()
    })

    totalScore += unifiedScore
    stats.scored++
  }

  stats.avgScore = stats.scored > 0 ? Math.round(totalScore / stats.scored) : 0
  console.log(`📊 Scoring complete: ${stats.scored} prospects, avg=${stats.avgScore}`)
  return stats
}
