/**
 * Instagram DM Sender V2
 * Automated outreach to qualified prospects
 * Uses instagrapi (Python) for sending DMs
 *
 * V2 IMPROVEMENTS:
 * - Safe rate limits (4/h, 30/day)
 * - Gaussian delays (human-like behavior)
 * - Fatigue pauses every 3 DMs
 * - Sleep hours (23h-7h)
 * - Weekend pause
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { spawn } from 'child_process'
import { callAI } from '../../ai/callAI.js'

const getDb = () => getFirestore()

// SAFE rate limits - Instagram ban prevention
const DM_LIMITS = {
  maxPerHour: 4,           // Conservative for cold DMs
  maxPerDay: 30,           // Safe daily limit
  minDelaySeconds: 90,     // 1.5 min minimum
  maxDelaySeconds: 420,    // 7 min maximum
  fatiguePauseEvery: 3,    // Pause every 3 DMs
  fatiguePauseMinSeconds: 600,  // 10 min
  fatiguePauseMaxSeconds: 1200, // 20 min
  cooldownOnErrorSeconds: 600,  // 10 min on error
  sleepHoursStart: 23,     // No activity after 23h
  sleepHoursEnd: 7,        // No activity before 7h
  noWeekend: true          // No activity on weekends
}

/**
 * Generate gaussian random delay (more human-like)
 * Uses Box-Muller transform for normal distribution
 */
function gaussianDelay(minSeconds, maxSeconds) {
  const mean = (minSeconds + maxSeconds) / 2
  const stdDev = (maxSeconds - minSeconds) / 6

  // Box-Muller transform
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

  const delay = mean + z0 * stdDev
  return Math.max(minSeconds, Math.min(maxSeconds, delay))
}

/**
 * Check if we're in sleep hours (23h-7h)
 */
function isInSleepHours() {
  const hour = new Date().getHours()
  return hour >= DM_LIMITS.sleepHoursStart || hour < DM_LIMITS.sleepHoursEnd
}

/**
 * Check if it's weekend (Saturday or Sunday)
 */
function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

/**
 * Get variable delay pattern (mimics human behavior)
 */
function getHumanLikeDelay() {
  const rand = Math.random()

  // 40% chance: short delay (1.5-2.5 min)
  if (rand < 0.4) {
    return gaussianDelay(DM_LIMITS.minDelaySeconds, DM_LIMITS.minDelaySeconds + 60)
  }
  // 40% chance: medium delay (2.5-5 min)
  if (rand < 0.8) {
    return gaussianDelay(DM_LIMITS.minDelaySeconds + 60, DM_LIMITS.maxDelaySeconds - 120)
  }
  // 20% chance: long delay (5-7 min)
  return gaussianDelay(DM_LIMITS.maxDelaySeconds - 120, DM_LIMITS.maxDelaySeconds)
}

/**
 * Scheduled DM Sender
 * Runs every 30 minutes between 8AM-10PM Paris time (weekdays only)
 */
export const instagramDmSender = onSchedule({
  schedule: '0,30 8-22 * * 1-5',  // Every 30 min, 8-22h, Mon-Fri
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540
}, async (event) => {
  console.log('💬 Instagram DM Sender V2: Starting...')

  // Check sleep hours
  if (isInSleepHours()) {
    console.log('⏸️ Sleep hours (23h-7h), skipping...')
    return { skipped: true, reason: 'sleep_hours' }
  }

  // Check weekend
  if (DM_LIMITS.noWeekend && isWeekend()) {
    console.log('⏸️ Weekend, skipping...')
    return { skipped: true, reason: 'weekend' }
  }

  const db = getDb()
  const stats = { attempted: 0, sent: 0, failed: 0, skipped: 0 }

  try {
    // Get all organizations with DM sender enabled
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      // Check if DM sender is enabled
      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.dmSenderEnabled) continue

      // Check daily limit
      const today = new Date().toISOString().split('T')[0]
      const dailyStatsDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc(`dm_stats_${today}`)
        .get()

      const dailyStats = dailyStatsDoc.exists ? dailyStatsDoc.data() : { sent: 0 }
      if (dailyStats.sent >= DM_LIMITS.maxPerDay) {
        console.log(`⚠️ Org ${orgId} reached daily DM limit (${DM_LIMITS.maxPerDay})`)
        continue
      }

      // Check hourly limit
      const hourKey = `${today}_${new Date().getHours()}`
      const hourlyStatsDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc(`dm_hourly_${hourKey}`)
        .get()

      const hourlyStats = hourlyStatsDoc.exists ? hourlyStatsDoc.data() : { sent: 0 }
      if (hourlyStats.sent >= DM_LIMITS.maxPerHour) {
        console.log(`⚠️ Org ${orgId} reached hourly DM limit (${DM_LIMITS.maxPerHour})`)
        continue
      }

      // Calculate how many DMs we can send
      const remainingHourly = DM_LIMITS.maxPerHour - hourlyStats.sent
      const remainingDaily = DM_LIMITS.maxPerDay - dailyStats.sent
      const maxToSend = Math.min(remainingHourly, remainingDaily)

      // Get qualified prospects not yet contacted
      const prospectsSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .where('platform', '==', 'instagram')
        .where('hunterStatus', '==', 'qualified')
        .where('status', '==', 'new')
        .where('score', '>=', 70)
        .orderBy('score', 'desc')
        .limit(maxToSend)
        .get()

      if (prospectsSnapshot.empty) {
        console.log(`📭 No prospects to contact for org ${orgId}`)
        continue
      }

      const prospects = prospectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      }))

      console.log(`📤 Sending up to ${prospects.length} DMs for org ${orgId} (${remainingHourly} remaining this hour)`)

      // Get DM template
      const templateDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('settings')
        .doc('dmTemplate')
        .get()

      const template = templateDoc.exists ? templateDoc.data() : null

      // Get org info for personalization
      const orgInfo = {
        name: orgData.name || 'Face Media Factory',
        offer: orgData.offer || 'nos services',
        cta: orgData.callToAction || 'Interesse(e) ?'
      }

      // Send DMs with human-like behavior
      for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i]
        stats.attempted++

        try {
          // Pre-action "thinking" delay (5-15 seconds)
          const thinkDelay = gaussianDelay(5, 15)
          console.log(`🧠 Pre-action delay: ${Math.round(thinkDelay)}s`)
          await sleep(thinkDelay * 1000)

          // Generate personalized message
          const message = await generatePersonalizedDM(prospect, template, orgInfo)

          // Simulate typing time based on message length
          const typingTime = message.length / gaussianDelay(3, 7)
          console.log(`⌨️ Typing simulation: ${Math.round(typingTime)}s`)
          await sleep(typingTime * 1000)

          // Send DM
          const sent = await sendInstagramDM(prospect, message, orgId)

          if (sent) {
            stats.sent++

            // Update prospect status
            await prospect.ref.update({
              status: 'contacted',
              hunterStatus: 'contacted',
              contactedAt: FieldValue.serverTimestamp(),
              dmMessage: message,
              dmSentVia: 'instagram_hunter_v2'
            })

            // Log interaction
            await db
              .collection('organizations')
              .doc(orgId)
              .collection('interactions')
              .add({
                prospectId: prospect.id,
                type: 'dm_sent',
                channel: 'instagram',
                direction: 'outbound',
                content: message,
                status: 'sent',
                createdAt: FieldValue.serverTimestamp()
              })

            // Human-like variable delay
            const delay = getHumanLikeDelay()
            console.log(`⏱️ Waiting ${Math.round(delay)}s before next action...`)
            await sleep(delay * 1000)

            // Fatigue pause every N DMs
            if ((i + 1) % DM_LIMITS.fatiguePauseEvery === 0 && i < prospects.length - 1) {
              const fatiguePause = gaussianDelay(
                DM_LIMITS.fatiguePauseMinSeconds,
                DM_LIMITS.fatiguePauseMaxSeconds
              )
              console.log(`🛑 Fatigue pause: ${Math.round(fatiguePause / 60)} minutes`)
              await sleep(fatiguePause * 1000)
            }

          } else {
            stats.failed++
            await prospect.ref.update({
              hunterStatus: 'dm_failed',
              dmFailedAt: FieldValue.serverTimestamp()
            })
          }

        } catch (error) {
          console.error(`Failed to send DM to ${prospect.username}:`, error)
          stats.failed++

          // Longer cooldown on error
          console.log(`⚠️ Error cooldown: ${DM_LIMITS.cooldownOnErrorSeconds}s`)
          await sleep(DM_LIMITS.cooldownOnErrorSeconds * 1000)
        }
      }

      // Update hourly stats
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc(`dm_hourly_${hourKey}`)
        .set({
          sent: FieldValue.increment(stats.sent),
          failed: FieldValue.increment(stats.failed),
          lastRun: FieldValue.serverTimestamp()
        }, { merge: true })

      // Update daily stats
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc(`dm_stats_${today}`)
        .set({
          sent: FieldValue.increment(stats.sent),
          failed: FieldValue.increment(stats.failed),
          lastRun: FieldValue.serverTimestamp()
        }, { merge: true })

      // Send notification
      if (stats.sent > 0) {
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('notifications')
          .add({
            type: 'dm_batch_complete',
            title: '💬 DMs envoyes (V2 Safe Mode)',
            message: `${stats.sent} DMs envoyes, ${stats.failed} echecs`,
            data: stats,
            read: false,
            createdAt: FieldValue.serverTimestamp()
          })
      }
    }

    console.log(`✅ DM Sender V2 complete:`, stats)
    return stats

  } catch (error) {
    console.error('❌ DM Sender V2 failed:', error)
    throw error
  }
})

/**
 * Manual DM sender (single prospect)
 */
export const sendManualDM = onCall({
  region: 'europe-west1',
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 120
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, prospectId, message } = data

  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId and prospectId are required')
  }

  const db = getDb()

  try {
    // Get prospect
    const prospectDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .doc(prospectId)
      .get()

    if (!prospectDoc.exists) {
      throw new HttpsError('not-found', 'Prospect not found')
    }

    const prospect = {
      id: prospectDoc.id,
      ...prospectDoc.data()
    }

    // Generate message if not provided
    const dmMessage = message || await generatePersonalizedDM(prospect, null, { name: 'Face Media Factory' })

    // Send DM
    const sent = await sendInstagramDM(prospect, dmMessage, orgId)

    if (sent) {
      // Update prospect
      await prospectDoc.ref.update({
        status: 'contacted',
        hunterStatus: 'contacted',
        contactedAt: FieldValue.serverTimestamp(),
        dmMessage,
        dmSentVia: 'manual'
      })

      // Log interaction
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('interactions')
        .add({
          prospectId,
          type: 'dm_sent',
          channel: 'instagram',
          direction: 'outbound',
          content: dmMessage,
          status: 'sent',
          sentBy: auth.uid,
          createdAt: FieldValue.serverTimestamp()
        })

      return { success: true, message: 'DM envoye avec succes' }

    } else {
      throw new HttpsError('internal', 'Failed to send DM')
    }

  } catch (error) {
    console.error('Manual DM failed:', error)
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', `DM failed: ${error.message}`)
  }
})

/**
 * Generate personalized DM using AI
 */
async function generatePersonalizedDM(prospect, template, orgInfo) {
  const fallbackMessage = () => {
    const firstName = prospect.fullName?.split(' ')[0] || prospect.username
    return `Salut ${firstName} 👋

J'ai decouvert ton profil et je pense que ${orgInfo.name} pourrait t'interesser.

On aide les entrepreneurs comme toi a trouver plus de clients automatiquement.

${orgInfo.cta}`
  }

  try {
    const customTemplate = template?.content || ''

    const prompt = `Tu es un expert en cold outreach Instagram. Genere un DM personnalise et engageant.

PROSPECT:
- Username: @${prospect.username}
- Nom: ${prospect.fullName || 'Non specifie'}
- Bio: "${prospect.bio || 'Pas de bio'}"
- Raison qualification: ${prospect.qualificationReason || 'Profil interesse'}
- Approche suggeree: ${prospect.suggestedApproach || 'Standard'}

ENTREPRISE:
- Nom: ${orgInfo.name}
- Offre: ${orgInfo.offer}
- CTA: ${orgInfo.cta}

${customTemplate ? `TEMPLATE CUSTOM:\n${customTemplate}\n` : ''}

REGLES:
- Max 500 caracteres
- Ton amical et professionnel
- Personnalise avec des elements de la bio
- Inclure un CTA clair
- PAS de liens
- PAS de spam obvious

Reponds UNIQUEMENT avec le message DM (pas de guillemets, pas d'explications):`

    let message = await callAI(prompt, 500)

    // Clean up
    message = message.replace(/^["']|["']$/g, '').trim()

    // Ensure not too long
    if (message.length > 500) {
      message = message.substring(0, 497) + '...'
    }

    return message

  } catch (error) {
    console.error('AI DM generation failed:', error.message)
    return fallbackMessage()
  }
}

/**
 * Send DM via Python/instagrapi
 */
async function sendInstagramDM(prospect, message, orgId) {
  const db = getDb()

  // Get Instagram credentials
  const credentialsDoc = await db
    .collection('organizations')
    .doc(orgId)
    .collection('settings')
    .doc('instagram')
    .get()

  const credentials = credentialsDoc.exists ? credentialsDoc.data() : {}
  const username = credentials.username || process.env.IG_USERNAME
  const password = credentials.password || process.env.IG_PASSWORD

  if (!username || !password) {
    console.warn('Instagram credentials not configured, simulating DM')
    // In dev/test mode, simulate success
    return process.env.NODE_ENV !== 'production'
  }

  // Escape message for Python
  const escapedMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')

  const pythonScript = `
import sys
import os
import time
import random

module_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'python_modules')
if os.path.exists(module_path):
    sys.path.insert(0, module_path)

try:
    from instagrapi import Client
    import json

    username = """${username}"""
    password = """${password}"""
    recipient_pk = """${prospect.platformId || prospect.pk}"""
    message = """${escapedMessage}"""

    cl = Client()

    # Random pre-login delay (human behavior)
    time.sleep(random.uniform(2, 5))

    cl.login(username, password)

    # Random pre-send delay
    time.sleep(random.uniform(1, 3))

    # Send DM
    result = cl.direct_send(message, [int(recipient_pk)])

    print(json.dumps({"success": True, "thread_id": str(result.thread_id) if result else None}))

except Exception as e:
    import json
    print(json.dumps({"success": False, "error": str(e)}))
`

  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', pythonScript], {
      env: { ...process.env },
      timeout: 90000  // 90 seconds timeout
    })

    let output = ''
    let errorOutput = ''

    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    python.on('close', (code) => {
      try {
        const result = JSON.parse(output.trim())
        if (result.success) {
          console.log(`✅ DM sent to @${prospect.username}`)
          resolve(true)
        } else {
          console.error(`❌ DM failed: ${result.error}`)
          resolve(false)
        }
      } catch (e) {
        console.error('Failed to parse Python output:', output, errorOutput)
        resolve(false)
      }
    })

    python.on('error', (err) => {
      console.error('Failed to spawn Python:', err)
      resolve(false)
    })
  })
}

/**
 * Get DM sending statistics
 */
export const getDMStats = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, days = 7 } = data
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  const db = getDb()

  try {
    // Get stats for last N days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const statsPromises = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      statsPromises.push(
        db
          .collection('organizations')
          .doc(orgId)
          .collection('analytics')
          .doc(`dm_stats_${dateStr}`)
          .get()
      )
    }

    const statsSnapshots = await Promise.all(statsPromises)
    const dailyStats = statsSnapshots.map((snap, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        ...(snap.exists ? snap.data() : { sent: 0, failed: 0 })
      }
    }).reverse()

    // Get response rate
    const contactedSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('hunterStatus', '==', 'contacted')
      .get()

    const repliedSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('status', '==', 'replied')
      .where('source', 'in', ['instagram_hunter', 'tiktok_hunter'])
      .get()

    const contacted = contactedSnapshot.size
    const replied = repliedSnapshot.size
    const responseRate = contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : 0

    return {
      success: true,
      dailyStats,
      totals: {
        sent: dailyStats.reduce((sum, d) => sum + (d.sent || 0), 0),
        failed: dailyStats.reduce((sum, d) => sum + (d.failed || 0), 0),
        contacted,
        replied,
        responseRate: parseFloat(responseRate)
      },
      limits: {
        maxPerHour: DM_LIMITS.maxPerHour,
        maxPerDay: DM_LIMITS.maxPerDay,
        safeMode: true
      }
    }

  } catch (error) {
    console.error('Failed to get DM stats:', error)
    throw new HttpsError('internal', 'Failed to get stats')
  }
})

/**
 * Helper: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
