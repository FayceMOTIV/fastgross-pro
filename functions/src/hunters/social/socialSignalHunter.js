/**
 * Social Signal Hunter — Detect buying signals via Serper
 *
 * Scans Twitter/LinkedIn/G2/Capterra for signals:
 * - Hiring/recruitment → company growing
 * - Funding rounds → budget available
 * - Product launches → active & investing
 * - Competitor complaints → pain point detected
 *
 * Uses cachedSerperFetch() (24h cache) — zero extra API cost.
 * Collection: organizations/{orgId}/socialSignals/{prospectId}
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'
import { cachedSerperFetch } from '../../utils/serperCache.js'
import { logAlexActivity } from '../../utils/logAlexActivity.js'

const getDb = () => getFirestore()

const SIGNAL_QUERIES = [
  { type: 'hiring', template: '"{company}" hiring OR recrute OR recrutement', weight: 8 },
  { type: 'funding', template: '"{company}" funding OR levee de fonds OR serie', weight: 9 },
  { type: 'launch', template: '"{company}" launch OR lancement OR nouveau produit', weight: 7 },
  { type: 'complaint', template: '"{company}" avis negatif OR plainte OR probleme', weight: 6 },
]

/**
 * Score a single search result as a signal
 */
function scoreSignal(type, result, companyName) {
  let score = 0
  const title = (result.title || '').toLowerCase()
  const snippet = (result.snippet || '').toLowerCase()
  const company = companyName.toLowerCase()

  // Company name appears in result
  if (title.includes(company) || snippet.includes(company)) score += 3

  // Recency bonus (prefer recent results)
  if (result.date) {
    const daysAgo = (Date.now() - new Date(result.date).getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo < 7) score += 3
    else if (daysAgo < 30) score += 2
    else if (daysAgo < 90) score += 1
  } else {
    score += 1 // Unknown date = moderate score
  }

  // Type-specific keywords
  const typeKeywords = {
    hiring: ['recrute', 'embauche', 'hiring', 'poste', 'cdi', 'cdd', 'offre emploi'],
    funding: ['leve', 'million', 'investissement', 'serie a', 'serie b', 'seed', 'financement'],
    launch: ['lance', 'nouveau', 'annonce', 'sortie', 'disponible', 'release'],
    complaint: ['probleme', 'bug', 'plainte', 'decu', 'alternative', 'migration'],
  }

  const keywords = typeKeywords[type] || []
  const matchCount = keywords.filter(kw => title.includes(kw) || snippet.includes(kw)).length
  score += Math.min(matchCount * 2, 4)

  return Math.min(score, 10)
}

/**
 * Core scan logic — scan prospects for social signals
 */
async function runCoreScan(orgId) {
  const db = getDb()
  const stats = { scanned: 0, signals: 0, highPriority: 0, errors: 0 }

  // Get top 50 prospects by score
  const prospectsSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .orderBy('score', 'desc')
    .limit(50)
    .get()

  if (prospectsSnap.empty) return stats

  for (const doc of prospectsSnap.docs) {
    const prospect = { id: doc.id, ...doc.data() }
    const company = prospect.companyName || prospect.company || ''
    if (!company || company.length < 2) continue

    stats.scanned++
    const allSignals = []

    for (const sq of SIGNAL_QUERIES) {
      try {
        const query = sq.template.replace('{company}', company)
        const data = await cachedSerperFetch('search', {
          q: query, gl: 'fr', hl: 'fr', num: 5,
        }, { timeoutMs: 10000 })

        for (const item of (data.organic || [])) {
          const score = scoreSignal(sq.type, item, company)
          if (score >= 4) {
            allSignals.push({
              type: sq.type,
              title: (item.title || '').substring(0, 200),
              url: item.link || '',
              snippet: (item.snippet || '').substring(0, 300),
              score,
              detectedAt: new Date().toISOString(),
            })
          }
        }
      } catch (e) {
        stats.errors++
      }
    }

    if (allSignals.length > 0) {
      // Sort by score desc and keep top 10
      allSignals.sort((a, b) => b.score - a.score)
      const topSignals = allSignals.slice(0, 10)
      const highestScore = topSignals[0].score

      // Save to Firestore
      await db.doc(`organizations/${orgId}/socialSignals/${prospect.id}`).set({
        companyName: company,
        signals: topSignals,
        lastScanAt: FieldValue.serverTimestamp(),
        totalSignals: topSignals.length,
        highestScore,
      }, { merge: true })

      stats.signals += topSignals.length

      // If high-priority signal → update prospect
      if (highestScore >= 7) {
        stats.highPriority++
        await doc.ref.update({
          intentSignals: FieldValue.arrayUnion(...topSignals.filter(s => s.score >= 7).map(s => ({
            type: s.type, title: s.title, score: s.score, detectedAt: s.detectedAt,
          }))),
          lastSignalAt: FieldValue.serverTimestamp(),
        })

        await logAlexActivity(orgId, {
          type: 'signal_detected',
          title: `Signal ${topSignals[0].type} detecte: ${company}`,
          details: topSignals[0].title,
          status: 'success',
          prospectId: prospect.id,
        })
      }
    }
  }

  return stats
}

/**
 * Scheduled: every 4 hours
 */
export const socialSignalHunterCron = onSchedule({
  schedule: '0 */4 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540,
}, async () => {
  console.log('[SocialSignalHunter] Starting scheduled scan...')
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()
  let totalStats = { scanned: 0, signals: 0, highPriority: 0, errors: 0 }

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data()
    if (!orgData.hunterConfig?.socialSignalEnabled) continue

    try {
      const stats = await runCoreScan(orgDoc.id)
      totalStats.scanned += stats.scanned
      totalStats.signals += stats.signals
      totalStats.highPriority += stats.highPriority
      totalStats.errors += stats.errors
    } catch (e) {
      console.error(`[SocialSignalHunter] Org ${orgDoc.id} failed:`, e.message)
      totalStats.errors++
    }
  }

  console.log('[SocialSignalHunter] Complete:', totalStats)
  return totalStats
})

/**
 * Manual trigger (callable)
 */
export const runSocialSignalHunterManual = onCall({
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

/**
 * Get social signal stats (callable)
 */
export const getSocialSignalStats = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication requise')
  const { orgId } = data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  const signalsSnap = await db
    .collection(`organizations/${orgId}/socialSignals`)
    .orderBy('highestScore', 'desc')
    .limit(50)
    .get()

  const signals = signalsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const byType = { hiring: 0, funding: 0, launch: 0, complaint: 0 }
  let totalSignals = 0

  for (const s of signals) {
    totalSignals += s.totalSignals || 0
    for (const sig of (s.signals || [])) {
      if (byType[sig.type] !== undefined) byType[sig.type]++
    }
  }

  return {
    success: true,
    totalProspects: signals.length,
    totalSignals,
    byType,
    topSignals: signals.slice(0, 10),
  }
})
