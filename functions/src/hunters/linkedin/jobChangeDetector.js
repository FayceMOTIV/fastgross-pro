/**
 * Job Change Detector — Detect LinkedIn job changes via Serper
 *
 * Scans LinkedIn for job title changes (new role, promotion, company switch).
 * New position = ideal prospecting moment (decision-maker in new role).
 *
 * Uses cachedSerperFetch() (24h cache) — zero extra API cost.
 * Collection: organizations/{orgId}/jobChanges/{prospectId}
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'
import { cachedSerperFetch } from '../../utils/serperCache.js'
import { logAlexActivity } from '../../utils/logAlexActivity.js'

const getDb = () => getFirestore()

/**
 * Parse Serper results to detect job changes
 */
function detectJobChange(results, contactName, currentTitle, company) {
  const name = (contactName || '').toLowerCase()
  if (!name || name.length < 3) return null

  for (const item of (results.organic || [])) {
    const title = (item.title || '').toLowerCase()
    const snippet = (item.snippet || '').toLowerCase()
    const combined = `${title} ${snippet}`

    // Must mention the contact name
    const nameParts = name.split(' ').filter(p => p.length > 2)
    const nameMatch = nameParts.some(p => combined.includes(p))
    if (!nameMatch) continue

    // Look for job change indicators
    const changeIndicators = [
      'joined', 'rejoint', 'new role', 'nouveau poste', 'promoted',
      'promu', 'nommé', 'appointed', 'directeur', 'director',
      'head of', 'responsable', 'vp', 'chief', 'fondateur', 'co-founder',
    ]

    const hasChange = changeIndicators.some(ind => combined.includes(ind))
    if (!hasChange) continue

    // Extract potential new title from snippet
    const titlePatterns = [
      /(?:as|comme|poste de|role de)\s+([^.|,]+)/i,
      /(?:nommé|appointed|promoted to)\s+([^.|,]+)/i,
      /(?:now|maintenant|désormais)\s+([^.|,]+)/i,
    ]

    let newTitle = null
    for (const pattern of titlePatterns) {
      const match = snippet.match(pattern)
      if (match) {
        newTitle = match[1].trim().substring(0, 100)
        break
      }
    }

    // If we found a change but no parsed title, use a generic one
    if (!newTitle) {
      newTitle = 'Nouveau poste detecte (voir lien)'
    }

    // Skip if same as current title
    if (currentTitle && newTitle.toLowerCase() === currentTitle.toLowerCase()) continue

    return {
      newTitle,
      snippet: (item.snippet || '').substring(0, 300),
      linkedinUrl: item.link || '',
      source: item.title || '',
    }
  }

  return null
}

/**
 * Core scan logic — detect job changes for an org's prospects
 */
async function runCoreScan(orgId) {
  const db = getDb()
  const stats = { scanned: 0, detected: 0, errors: 0 }

  // Get prospects with contact names
  const prospectsSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .orderBy('score', 'desc')
    .limit(100)
    .get()

  if (prospectsSnap.empty) return stats

  // Filter to those with contact names
  const candidates = prospectsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.contactName || p.fullName)
    .slice(0, 50)

  // Process in batches of 20
  for (let i = 0; i < candidates.length; i += 20) {
    const batch = candidates.slice(i, i + 20)

    for (const prospect of batch) {
      const contactName = prospect.contactName || prospect.fullName || ''
      const company = prospect.companyName || prospect.company || ''
      if (!contactName) continue

      stats.scanned++

      try {
        const query = `site:linkedin.com/in/ "${contactName}" ${company} new role OR joined OR promoted OR rejoint OR nomme`
        const data = await cachedSerperFetch('search', {
          q: query, gl: 'fr', hl: 'fr', num: 5,
        }, { timeoutMs: 10000 })

        const change = detectJobChange(data, contactName, prospect.jobTitle, company)

        if (change) {
          stats.detected++

          // Save job change
          await db.doc(`organizations/${orgId}/jobChanges/${prospect.id}`).set({
            contactName,
            previousTitle: prospect.jobTitle || null,
            newTitle: change.newTitle,
            company,
            detectedAt: FieldValue.serverTimestamp(),
            linkedinUrl: change.linkedinUrl || prospect.linkedinUrl || null,
            snippet: change.snippet,
          })

          // Update prospect
          await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
            jobChangeDetected: true,
            jobChangeAt: FieldValue.serverTimestamp(),
            jobChangeTitle: change.newTitle,
          })

          await logAlexActivity(orgId, {
            type: 'job_change',
            title: `Changement poste: ${contactName}`,
            details: `${prospect.jobTitle || '?'} → ${change.newTitle}`,
            status: 'success',
            prospectId: prospect.id,
          })
        }
      } catch (e) {
        stats.errors++
      }
    }
  }

  return stats
}

/**
 * Scheduled: daily at 6:30 Paris time
 */
export const jobChangeDetectorCron = onSchedule({
  schedule: '30 6 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540,
}, async () => {
  console.log('[JobChangeDetector] Starting daily scan...')
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()
  let totalStats = { scanned: 0, detected: 0, errors: 0 }

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data()
    if (!orgData.hunterConfig?.jobChangeEnabled) continue

    try {
      const stats = await runCoreScan(orgDoc.id)
      totalStats.scanned += stats.scanned
      totalStats.detected += stats.detected
      totalStats.errors += stats.errors
    } catch (e) {
      console.error(`[JobChangeDetector] Org ${orgDoc.id} failed:`, e.message)
      totalStats.errors++
    }
  }

  console.log('[JobChangeDetector] Complete:', totalStats)
  return totalStats
})

/**
 * Manual trigger (callable)
 */
export const runJobChangeDetectorManual = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '1GiB',
  timeoutSeconds: 300,
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication requise')
  const { orgId } = data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(auth.uid, orgId)

  const stats = await runCoreScan(orgId)
  return { success: true, stats }
})
