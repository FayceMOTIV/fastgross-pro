/**
 * Multi-Account Instagram DM Sender V2
 * Rotates between multiple Instagram accounts for scale
 * Includes encryption for credentials and session management
 *
 * Features:
 * - Account rotation with fair distribution
 * - Per-account rate limiting
 * - Session persistence (avoid re-login)
 * - Proxy support per account (residential/datacenter)
 * - Error classification and account health monitoring
 * - Gaussian delays and human-like behavior
 * - Automatic daily/hourly counter resets
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { spawn } from 'child_process'
import * as crypto from 'crypto'

const getDb = () => getFirestore()

// Encryption key from environment (32 chars)
const ENCRYPTION_KEY = process.env.INSTAGRAM_ENCRYPTION_KEY || ''
if (!ENCRYPTION_KEY) {
  console.warn('INSTAGRAM_ENCRYPTION_KEY env var is not set — Instagram DM encryption disabled')
}

// Encryption helpers using AES-256-CBC
function encrypt(text) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encrypted) {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Safe limits per account
const LIMITS = {
  maxDmsPerHour: 4,
  maxDmsPerDay: 30,
  minDelaySeconds: 90,
  maxDelaySeconds: 420,
  fatiguePauseEvery: 3,
  fatiguePauseMinSeconds: 600,
  fatiguePauseMaxSeconds: 1200,
  sleepHoursStart: 23,
  sleepHoursEnd: 7,
  noWeekend: true
}

/**
 * Generate gaussian random delay
 */
function gaussianDelay(minSeconds, maxSeconds) {
  const mean = (minSeconds + maxSeconds) / 2
  const stdDev = (maxSeconds - minSeconds) / 6
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  const delay = mean + z0 * stdDev
  return Math.max(minSeconds, Math.min(maxSeconds, delay))
}

/**
 * Check sleep hours
 */
function isInSleepHours() {
  const hour = new Date().getHours()
  return hour >= LIMITS.sleepHoursStart || hour < LIMITS.sleepHoursEnd
}

/**
 * Check weekend
 */
function isWeekend() {
  const day = new Date().getDay()
  return day === 0 || day === 6
}

/**
 * MULTI-ACCOUNT DM SENDER
 * Runs every 15 minutes, rotates between all active accounts
 */
export const multiAccountDmSender = onSchedule({
  schedule: '*/15 8-22 * * 1-5',  // Every 15 min, 8-22h, Mon-Fri
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '2GiB',
  timeoutSeconds: 540
}, async (event) => {
  console.log('💬 Multi-Account DM Sender starting...')

  // Check sleep/weekend
  if (isInSleepHours()) {
    console.log('⏸️ Sleep hours, skipping')
    return { skipped: true, reason: 'sleep_hours' }
  }

  if (LIMITS.noWeekend && isWeekend()) {
    console.log('⏸️ Weekend, skipping')
    return { skipped: true, reason: 'weekend' }
  }

  const db = getDb()
  const stats = {
    totalProspects: 0,
    totalContacted: 0,
    accountsUsed: 0,
    errors: 0
  }

  try {
    // Get all organizations with multi-account enabled
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      // Check if multi-account DM is enabled
      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.multiAccountEnabled) continue

      // Get active Instagram accounts for this org
      const accountsSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('instagramAccounts')
        .where('status', '==', 'active')
        .get()

      if (accountsSnapshot.empty) {
        console.log(`No active accounts for org ${orgId}`)
        continue
      }

      // Get prospects to contact
      const prospectsSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .where('platform', '==', 'instagram')
        .where('hunterStatus', '==', 'qualified')
        .where('status', '==', 'new')
        .where('score', '>=', 70)
        .orderBy('score', 'desc')
        .limit(100)
        .get()

      if (prospectsSnapshot.empty) {
        console.log(`No prospects for org ${orgId}`)
        continue
      }

      const prospects = prospectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref,
        ...doc.data()
      }))

      stats.totalProspects += prospects.length

      // Sort accounts by least usage (fairest rotation)
      const accounts = accountsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data()
        }))
        .sort((a, b) => {
          const aUsage = (a.dmsSentThisHour || 0) + (a.dmsSentToday || 0)
          const bUsage = (b.dmsSentThisHour || 0) + (b.dmsSentToday || 0)
          return aUsage - bUsage
        })

      console.log(`📱 Org ${orgId}: ${accounts.length} accounts, ${prospects.length} prospects`)

      let prospectsContactedCount = 0

      // Rotate through accounts
      for (const account of accounts) {
        // Check hourly limit
        if ((account.dmsSentThisHour || 0) >= LIMITS.maxDmsPerHour) {
          console.log(`Account @${account.username} at hourly limit`)
          continue
        }

        // Check daily limit
        if ((account.dmsSentToday || 0) >= LIMITS.maxDmsPerDay) {
          console.log(`Account @${account.username} at daily limit`)
          continue
        }

        // How many can this account send this round?
        const remainingHourly = LIMITS.maxDmsPerHour - (account.dmsSentThisHour || 0)
        const remainingDaily = LIMITS.maxDmsPerDay - (account.dmsSentToday || 0)
        const remaining = Math.min(remainingHourly, remainingDaily)

        const toSend = Math.min(
          remaining,
          prospects.length - prospectsContactedCount
        )

        if (toSend === 0) continue

        // Get prospects slice for this account
        const accountProspects = prospects.slice(
          prospectsContactedCount,
          prospectsContactedCount + toSend
        )

        console.log(`📤 Account @${account.username} sending ${toSend} DMs...`)

        // Get DM template
        const templateDoc = await db
          .collection('organizations')
          .doc(orgId)
          .collection('settings')
          .doc('dmTemplate')
          .get()

        const template = templateDoc.exists ? templateDoc.data()?.content : null

        // Send DMs via this account
        const results = await sendDmsViaAccount(account, accountProspects, orgId, template || getDefaultTemplate(orgData))

        // Update prospects
        let successCount = 0
        for (let i = 0; i < accountProspects.length; i++) {
          if (results[i]) {
            successCount++
            await accountProspects[i].ref.update({
              status: 'contacted',
              hunterStatus: 'contacted',
              contactedAt: FieldValue.serverTimestamp(),
              contactedVia: account.username,
              contactedViaAccountType: account.accountType || 'client'
            })
          } else {
            stats.errors++
          }
        }

        // Update account stats
        await account.ref.update({
          dmsSentThisHour: FieldValue.increment(successCount),
          dmsSentToday: FieldValue.increment(successCount),
          lastDmAt: FieldValue.serverTimestamp()
        })

        stats.accountsUsed++
        prospectsContactedCount += successCount

        // Stop if all prospects contacted
        if (prospectsContactedCount >= prospects.length) break
      }

      stats.totalContacted += prospectsContactedCount

      // Update org analytics
      const today = new Date().toISOString().split('T')[0]
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('analytics')
        .doc(`multi_dm_${today}`)
        .set({
          sent: FieldValue.increment(prospectsContactedCount),
          accountsUsed: stats.accountsUsed,
          lastRun: FieldValue.serverTimestamp()
        }, { merge: true })

      // Create notification
      if (prospectsContactedCount > 0) {
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('notifications')
          .add({
            type: 'multi_account_dm_complete',
            title: '💬 Multi-Account DM Complete',
            message: `${prospectsContactedCount} prospects contactes via ${stats.accountsUsed} comptes`,
            data: { contacted: prospectsContactedCount, accounts: stats.accountsUsed },
            createdAt: FieldValue.serverTimestamp(),
            read: false
          })
      }
    }

    console.log('✅ Multi-Account DM Sender complete:', stats)
    return stats

  } catch (error) {
    console.error('❌ Multi-Account DM Sender failed:', error)
    throw error
  }
})

/**
 * Get default DM template
 */
function getDefaultTemplate(orgData) {
  const orgName = orgData?.name || 'Face Media Factory'
  return `Salut {fullName} 👋

J'ai decouvert ton profil et je pense que ${orgName} pourrait t'interesser.

On automatise la prospection Instagram/TikTok pour trouver des clients automatiquement.

Interesse(e) ?`
}

/**
 * Send DMs via specific account
 */
async function sendDmsViaAccount(account, prospects, orgId, template) {
  // Decrypt password
  let password
  try {
    password = decrypt(account.password)
  } catch (e) {
    // If decryption fails, assume password is plain text (legacy)
    password = account.password
  }

  const escapedTemplate = template.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  const proxyUrl = account.proxyUrl || process.env.IG_PROXY_URL || ''

  const pythonScript = `
import sys
import os
import time
import random
import math

module_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'python_modules')
if os.path.exists(module_path):
    sys.path.insert(0, module_path)

try:
    from instagrapi import Client
    import json

    username = """${account.username}"""
    password = """${password}"""
    session_data = ${JSON.stringify(account.sessionData || {})}
    proxy_url = """${proxyUrl}"""

    cl = Client()

    # Configure proxy if available
    if proxy_url:
        cl.set_proxy(proxy_url)
        print(f"Proxy configured", file=sys.stderr)

    # Try load session first
    try:
        if session_data:
            cl.set_settings(session_data)
            cl.login(username, password)
            print("Session restored", file=sys.stderr)
        else:
            raise Exception("No session")
    except:
        # Fresh login
        time.sleep(random.uniform(2, 5))
        cl.login(username, password)
        print("Fresh login", file=sys.stderr)

    print(f"Logged in as {username}", file=sys.stderr)

    prospects = ${JSON.stringify(prospects.map(p => ({ pk: p.platformId || p.pk, username: p.username, fullName: p.fullName || p.username })))}
    template = """${escapedTemplate}"""

    def gaussian_delay(min_s, max_s):
        mean = (min_s + max_s) / 2
        std = (max_s - min_s) / 6
        u1 = random.random()
        u2 = random.random()
        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        delay = mean + z0 * std
        return max(min_s, min(delay, max_s))

    results = []

    for i, prospect in enumerate(prospects):
        try:
            # Personalize message
            message = template.replace('{fullName}', prospect.get('fullName', prospect['username']))
            message = message.replace('{username}', prospect['username'])

            # Pre-action delay (thinking)
            time.sleep(gaussian_delay(5, 15))

            # Typing simulation
            typing_time = len(message) / random.uniform(3, 7)
            time.sleep(typing_time)

            # Send
            cl.direct_send(message, [int(prospect['pk'])])
            print(f"Sent to {prospect['username']}", file=sys.stderr)
            results.append(True)

            # Post-action delay (variable pattern)
            rand = random.random()
            if rand < 0.4:
                delay = gaussian_delay(${LIMITS.minDelaySeconds}, ${LIMITS.minDelaySeconds + 60})
            elif rand < 0.8:
                delay = gaussian_delay(${LIMITS.minDelaySeconds + 60}, ${LIMITS.maxDelaySeconds - 120})
            else:
                delay = gaussian_delay(${LIMITS.maxDelaySeconds - 120}, ${LIMITS.maxDelaySeconds})

            time.sleep(delay)

            # Fatigue pause
            if (i + 1) % ${LIMITS.fatiguePauseEvery} == 0 and i < len(prospects) - 1:
                pause = gaussian_delay(${LIMITS.fatiguePauseMinSeconds}, ${LIMITS.fatiguePauseMaxSeconds})
                print(f"Fatigue pause: {pause/60:.1f}min", file=sys.stderr)
                time.sleep(pause)

        except Exception as e:
            print(f"Failed {prospect['username']}: {e}", file=sys.stderr)
            results.append(False)

    # Save session
    try:
        session = cl.get_settings()
        print(f"SESSION_DATA:{json.dumps(session)}")
    except:
        pass

    print(f"RESULTS:{json.dumps(results)}")

except Exception as e:
    import json
    print(f"RESULTS:{json.dumps([])}")
    print(f"ERROR:{e}", file=sys.stderr)
`

  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', pythonScript], {
      env: { ...process.env },
      timeout: 600000  // 10 minutes timeout for batch
    })

    let output = ''
    let sessionData = null

    python.stdout.on('data', (data) => {
      const text = data.toString()
      output += text

      // Extract session data
      if (text.includes('SESSION_DATA:')) {
        try {
          const sessionLine = text.split('SESSION_DATA:')[1].split('\n')[0]
          sessionData = JSON.parse(sessionLine)
        } catch (e) {}
      }
    })

    python.stderr.on('data', (data) => {
      console.log(`[@${account.username}]`, data.toString().trim())
    })

    python.on('close', async () => {
      // Save session if available
      if (sessionData) {
        try {
          await account.ref.update({ sessionData })
          console.log(`Session saved for @${account.username}`)
        } catch (e) {
          console.error('Failed to save session:', e)
        }
      }

      // Extract results
      try {
        const resultsMatch = output.match(/RESULTS:(\[.*?\])/)
        if (resultsMatch) {
          const results = JSON.parse(resultsMatch[1])
          resolve(results)
        } else {
          resolve(prospects.map(() => false))
        }
      } catch (e) {
        console.error('Failed to parse results:', e)
        resolve(prospects.map(() => false))
      }
    })

    python.on('error', (err) => {
      console.error('Failed to spawn Python:', err)
      resolve(prospects.map(() => false))
    })
  })
}

/**
 * Reset hourly counters - runs every hour
 */
export const resetHourlyCounts = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1'
}, async () => {
  console.log('🔄 Resetting hourly DM counters...')

  const db = getDb()
  const accountsSnapshot = await db.collectionGroup('instagramAccounts').get()

  const batch = db.batch()
  let count = 0

  accountsSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { dmsSentThisHour: 0 })
    count++
  })

  if (count > 0) {
    await batch.commit()
  }

  console.log(`✅ Reset ${count} accounts hourly counters`)
  return { reset: count }
})

/**
 * Reset daily counters - runs at midnight
 */
export const resetDailyCounts = onSchedule({
  schedule: '0 0 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1'
}, async () => {
  console.log('🔄 Resetting daily DM counters...')

  const db = getDb()
  const accountsSnapshot = await db.collectionGroup('instagramAccounts').get()

  const batch = db.batch()
  let count = 0

  accountsSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      dmsSentToday: 0,
      dmsSentThisHour: 0
    })
    count++
  })

  if (count > 0) {
    await batch.commit()
  }

  console.log(`✅ Reset ${count} accounts daily counters`)
  return { reset: count }
})

/**
 * Add Instagram account (callable)
 */
export const addInstagramAccount = onCall({
  region: 'europe-west1',
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 120
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, username, password, accountType = 'client', displayName, proxyUrl } = data

  if (!orgId || !username || !password) {
    throw new HttpsError('invalid-argument', 'orgId, username, and password are required')
  }

  try {
    const db = getDb()

    // Check if account already exists
    const existingSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('instagramAccounts')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      throw new HttpsError('already-exists', 'Account already exists')
    }

    // Encrypt password
    const encryptedPassword = encrypt(password)

    // Test login before saving
    const loginSuccess = await testInstagramLogin(username, password)

    if (!loginSuccess) {
      throw new HttpsError('invalid-argument', 'Instagram login failed - check credentials')
    }

    // Add account
    const accountRef = await db
      .collection('organizations')
      .doc(orgId)
      .collection('instagramAccounts')
      .add({
        username: username.toLowerCase(),
        password: encryptedPassword,
        accountType,
        displayName: displayName || username,
        proxyUrl: proxyUrl || null,
        status: 'active',
        dmsSentToday: 0,
        dmsSentThisHour: 0,
        lastDmAt: null,
        warningsCount: 0,
        lastWarningAt: null,
        sessionData: null,
        createdAt: FieldValue.serverTimestamp(),
        addedBy: auth.uid
      })

    return {
      success: true,
      accountId: accountRef.id,
      message: `Account @${username} added successfully`
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Test Instagram login
 */
async function testInstagramLogin(username, password) {
  const pythonScript = `
import sys
import os

module_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'python_modules')
if os.path.exists(module_path):
    sys.path.insert(0, module_path)

try:
    from instagrapi import Client
    import json

    cl = Client()
    cl.login("${username}", """${password}""")
    print(json.dumps({"success": True}))
except Exception as e:
    import json
    print(json.dumps({"success": False, "error": str(e)}))
`

  return new Promise((resolve) => {
    const python = spawn('python3', ['-c', pythonScript], {
      env: { ...process.env },
      timeout: 60000
    })

    let output = ''

    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.on('close', () => {
      try {
        const result = JSON.parse(output.trim())
        resolve(result.success)
      } catch (e) {
        resolve(false)
      }
    })

    python.on('error', () => resolve(false))
  })
}

/**
 * Remove Instagram account (callable)
 */
export const removeInstagramAccount = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, accountId } = data

  if (!orgId || !accountId) {
    throw new HttpsError('invalid-argument', 'orgId and accountId are required')
  }

  try {
    const db = getDb()

    await db
      .collection('organizations')
      .doc(orgId)
      .collection('instagramAccounts')
      .doc(accountId)
      .delete()

    return { success: true, message: 'Account removed' }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * List Instagram accounts (callable)
 */
export const listInstagramAccounts = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data

  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  try {
    const db = getDb()

    const accountsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('instagramAccounts')
      .orderBy('createdAt', 'desc')
      .get()

    const accounts = accountsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        username: data.username,
        displayName: data.displayName,
        accountType: data.accountType,
        status: data.status,
        dmsSentToday: data.dmsSentToday || 0,
        dmsSentThisHour: data.dmsSentThisHour || 0,
        lastDmAt: data.lastDmAt?.toDate?.()?.toISOString() || null,
        warningsCount: data.warningsCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        // Note: password and sessionData are NOT returned for security
      }
    })

    return {
      success: true,
      count: accounts.length,
      accounts,
      limits: {
        maxPerHour: LIMITS.maxDmsPerHour,
        maxPerDay: LIMITS.maxDmsPerDay
      }
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})

/**
 * Update account status (callable)
 */
export const updateAccountStatus = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, accountId, status } = data

  if (!orgId || !accountId || !status) {
    throw new HttpsError('invalid-argument', 'orgId, accountId, and status are required')
  }

  const validStatuses = ['active', 'paused', 'warming_up', 'rate_limited', 'banned']
  if (!validStatuses.includes(status)) {
    throw new HttpsError('invalid-argument', `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  try {
    const db = getDb()

    await db
      .collection('organizations')
      .doc(orgId)
      .collection('instagramAccounts')
      .doc(accountId)
      .update({
        status,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusUpdatedBy: auth.uid
      })

    return { success: true, message: `Account status updated to ${status}` }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', error.message)
  }
})
