/**
 * alexAutopilotEngine.js — Le cerveau autonome d'Alex
 *
 * Daily Pipeline Orchestrator + Smart Escalation
 *
 * 6H chaque matin (Europe/Paris) :
 *   1. Detecter nouveaux prospects (hunters ont tourne la nuit)
 *   2. Batch scoring de tous les non-scores
 *   3. Score > 70  → Social Warming
 *   4. Score > 60 + warming termine → Signal-Based Email
 *   5. Score > 80  → Sniper Follow-Up Sequence
 *   6. Score 90+ no-reply apres sequence complete → Smart Escalation
 *   7. Reddit < 1h  → contact immediat (bypass warming)
 *
 * Exports:
 *   - alexDailyPipeline (onSchedule 6h)
 *   - alexSmartEscalation (onSchedule every 2 hours)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'alexAutopilot', event, ...data, ts: new Date().toISOString() }))

const LOCK_TTL_MS = 30 * 60 * 1000 // 30 min

async function acquireLock(db, lockName) {
  const lockRef = db.doc(`_locks/${lockName}`)
  try {
    const acquired = await db.runTransaction(async (tx) => {
      const lockDoc = await tx.get(lockRef)
      if (lockDoc.exists) {
        const data = lockDoc.data()
        const age = Date.now() - (data.startedAt?.toMillis?.() || 0)
        if (age < LOCK_TTL_MS) {
          return false // Still locked
        }
      }
      tx.set(lockRef, { startedAt: new Date(), lockedBy: lockName })
      return true
    })
    return acquired
  } catch {
    return false
  }
}

async function releaseLock(db, lockName) {
  try {
    await db.doc(`_locks/${lockName}`).delete()
  } catch { /* best effort */ }
}

// ============================================
// DAILY PIPELINE — 6H CHAQUE MATIN
// ============================================
export const alexDailyPipeline = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb()

    if (!await acquireLock(db, 'alexDailyPipeline')) {
      log('pipeline_skipped_locked', {})
      return
    }

    try {
      log('pipeline_start', {})

      const orgsSnap = await db.collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      if (orgsSnap.empty) {
        log('pipeline_no_active_orgs', {})
        return
      }

      const results = []

      for (const orgDoc of orgsSnap.docs) {
        try {
          const orgResult = await runOrgPipeline(db, orgDoc.id, orgDoc.data())
          results.push({ orgId: orgDoc.id, ...orgResult })
        } catch (error) {
          log('pipeline_org_error', { orgId: orgDoc.id, error: error.message })
          results.push({ orgId: orgDoc.id, error: error.message })
        }
      }

      log('pipeline_complete', { orgs: results.length, results })
    } finally {
      await releaseLock(db, 'alexDailyPipeline')
    }
  }
)

async function runOrgPipeline(db, orgId, orgData) {
  const stats = { scored: 0, warmed: 0, emailed: 0, snipered: 0, escalated: 0, redditBypassed: 0 }

  // ---- STEP 1 : Trouver les nouveaux prospects non-scores (dernieres 24h) ----
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const newProspectsSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .where('createdAt', '>=', yesterday)
    .limit(200)
    .get()

  const unscoredIds = []
  for (const doc of newProspectsSnap.docs) {
    const data = doc.data()
    if (!data.alexScore && data.alexScore !== 0) {
      unscoredIds.push(doc.id)
    }
  }

  log('step1_new_prospects', { orgId, total: newProspectsSnap.size, unscored: unscoredIds.length })

  // ---- STEP 2 : Batch scoring ----
  if (unscoredIds.length > 0) {
    try {
      const { batchScoreProspects } = await import('../outreach/prospectScorer.js')
      const scoreResult = await batchScoreProspects(db, orgId, unscoredIds)
      stats.scored = scoreResult?.scored || unscoredIds.length
      log('step2_scored', { orgId, scored: stats.scored })
    } catch (e) {
      log('step2_score_error', { orgId, error: e.message })
    }
  }

  // ---- Recharger les prospects avec scores ----
  const allScoredSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .where('createdAt', '>=', yesterday)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get()

  const prospects = allScoredSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // ---- STEP 3 : Social Warming pour score > 70 ----
  const warmTargets = prospects.filter(p =>
    (p.alexScore || p.score || 0) >= 70 &&
    !p.socialWarmingId &&
    p.status !== 'contacted' &&
    p.status !== 'hot' &&
    p.status !== 'won'
  )

  for (const prospect of warmTargets.slice(0, 20)) {
    try {
      const { enrollProspectWarming } = await import('../outreach/socialWarming.js')
      await enrollProspectWarming(db, orgId, prospect.id, prospect.linkedinUrl || prospect.linkedin)
      stats.warmed++
    } catch (e) {
      log('step3_warming_error', { orgId, prospectId: prospect.id, error: e.message })
    }
  }
  log('step3_warming', { orgId, enrolled: stats.warmed })

  // ---- STEP 4 : Signal-Based Email pour score > 60 + warming termine ----
  const emailTargets = await findWarmedProspects(db, orgId, 60)

  for (const prospect of emailTargets.slice(0, 30)) {
    try {
      const { sendSignalEmail } = await import('../outreach/signalEmail.js')
      await sendSignalEmail(db, orgId, prospect.id, prospect.signalType || 'generic')
      stats.emailed++
    } catch (e) {
      log('step4_email_error', { orgId, prospectId: prospect.id, error: e.message })
    }
  }
  log('step4_emails', { orgId, sent: stats.emailed })

  // ---- STEP 5 : Sniper Follow-Up Sequence pour score > 80 ----
  const sniperTargets = prospects.filter(p =>
    (p.alexScore || p.score || 0) >= 80 &&
    !p.sniperSequenceId &&
    p.status !== 'hot' &&
    p.status !== 'won' &&
    (p.contactedAt || p.contactedVia)
  )

  for (const prospect of sniperTargets.slice(0, 15)) {
    try {
      const { initSniperSequence } = await import('../outreach/sniperSequence.js')
      const seqResult = await initSniperSequence(db, orgId, prospect.id, prospect.signalType || 'generic')
      // initSniperSequence ecrit deja le sniperSequenceId sur le prospect — pas besoin de re-ecrire
      if (seqResult?.sequenceId) stats.snipered++
    } catch (e) {
      log('step5_sniper_error', { orgId, prospectId: prospect.id, error: e.message })
    }
  }
  log('step5_sniper', { orgId, enrolled: stats.snipered })

  // ---- STEP 6 : Reddit bypass (< 1h detection → contact immediat) ----
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const redditSnap = await db
    .collection(`organizations/${orgId}/prospects`)
    .where('source', '==', 'reddit')
    .where('createdAt', '>=', oneHourAgo)
    .where('status', '==', 'new')
    .limit(10)
    .get()

  for (const rdoc of redditSnap.docs) {
    try {
      const prospect = { id: rdoc.id, ...rdoc.data() }
      const { sendSignalEmail } = await import('../outreach/signalEmail.js')
      await sendSignalEmail(db, orgId, prospect.id, 'reddit_intent')
      await db.doc(`organizations/${orgId}/prospects/${prospect.id}`).update({
        status: 'contacted', contactedAt: FieldValue.serverTimestamp(),
        contactChannel: 'email', warmingBypassed: true, bypassReason: 'reddit_fresh_intent',
      })
      stats.redditBypassed++
    } catch (e) {
      log('step6_reddit_error', { orgId, prospectId: rdoc.id, error: e.message })
    }
  }
  if (stats.redditBypassed > 0) log('step6_reddit_bypass', { orgId, bypassed: stats.redditBypassed })

  // ---- Sauvegarder le log du pipeline ----
  const dateKey = new Date().toISOString().split('T')[0]
  await db.doc(`organizations/${orgId}/alexPipelineLogs/${dateKey}`).set({
    ...stats,
    executedAt: FieldValue.serverTimestamp(),
    newProspects: newProspectsSnap.size,
    pipeline: 'v1',
  })

  return stats
}

/**
 * Trouver les prospects qui ont fini le social warming et ont un score >= minScore
 */
async function findWarmedProspects(db, orgId, minScore) {
  // Chercher les warmings termines
  const warmingsSnap = await db
    .collection(`organizations/${orgId}/socialWarming`)
    .where('status', '==', 'completed')
    .where('emailSent', '!=', true)
    .limit(30)
    .get()

  if (warmingsSnap.empty) return []

  // Collecter les IDs et charger les prospects en parallele (evite N+1)
  const warmingMap = new Map()
  for (const wDoc of warmingsSnap.docs) {
    const warmData = wDoc.data()
    if (warmData.prospectId) {
      warmingMap.set(warmData.prospectId, { signalType: warmData.signalType || 'generic', warmingDocId: wDoc.id })
    }
  }

  const prospectIds = [...warmingMap.keys()]
  if (prospectIds.length === 0) return []

  // Batch read — max 10 parallel reads
  const chunks = []
  for (let i = 0; i < prospectIds.length; i += 10) {
    chunks.push(prospectIds.slice(i, i + 10))
  }

  const warmedProspects = []
  for (const chunk of chunks) {
    const reads = chunk.map(id => db.doc(`organizations/${orgId}/prospects/${id}`).get())
    const docs = await Promise.all(reads)

    for (const prospectDoc of docs) {
      if (!prospectDoc.exists) continue
      const prospect = prospectDoc.data()
      const score = prospect.alexScore || prospect.score || 0
      if (score >= minScore && prospect.status !== 'hot' && prospect.status !== 'won') {
        const warmData = warmingMap.get(prospectDoc.id)
        warmedProspects.push({ id: prospectDoc.id, ...prospect, ...warmData })
      }
    }
  }

  return warmedProspects
}

// ============================================
// SMART ESCALATION — EVERY 2 HOURS
// ============================================
export const alexSmartEscalation = onSchedule(
  {
    schedule: 'every 2 hours',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getDb()
    const now = new Date()
    const parisHour = parseInt(now.toLocaleString('fr-FR', {
      hour: '2-digit', hour12: false, timeZone: 'Europe/Paris',
    }), 10)

    // Business hours only (8h-20h)
    if (parisHour < 8 || parisHour >= 20) return

    if (!await acquireLock(db, 'alexSmartEscalation')) {
      log('escalation_skipped_locked', {})
      return
    }

    try {
      log('escalation_start', {})

      const orgsSnap = await db.collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      for (const orgDoc of orgsSnap.docs) {
        try {
          await runSmartEscalation(db, orgDoc.id, orgDoc.data())
        } catch (error) {
          log('escalation_org_error', { orgId: orgDoc.id, error: error.message })
        }
      }
    } finally {
      await releaseLock(db, 'alexSmartEscalation')
    }
  }
)

async function runSmartEscalation(db, orgId, orgData) {
  // Trouver les prospects score 90+ qui ont fini leur sequence sniper sans reponse
  const completedSequences = await db
    .collection(`organizations/${orgId}/sniperSequences`)
    .where('status', '==', 'completed')
    .where('escalated', '!=', true)
    .limit(10)
    .get()

  let escalated = 0

  for (const seqDoc of completedSequences.docs) {
    const seq = seqDoc.data()
    const prospectId = seq.prospectId
    if (!prospectId) continue

    const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
    if (!prospectDoc.exists) continue

    const prospect = prospectDoc.data()
    const score = prospect.alexScore || prospect.score || 0

    // Seulement score 90+ sans reponse
    if (score < 90 || prospect.status === 'hot' || prospect.status === 'won' || prospect.lastReply) continue

    try {
      // Generer un micro-gift PDF (audit digital)
      const { generateGiftForProspect } = await import('../outreach/microGiftGenerator.js')
      const giftResult = await generateGiftForProspect(db, orgId, prospectId, 'digital_maturity')

      // Generer le script de video/loom audit
      const { generateVideoScript } = await import('../superPowers/personalizedVideo.js')
      const scriptResult = await generateVideoScript(prospect, {
        companyName: orgData.companyName || orgData.name || 'Face Media Factory',
        niche: orgData.niche || orgData.sector || 'B2B',
        value_prop: orgData.valueProp || 'nos services',
      })

      // Envoyer l'email de derniere chance avec le gift
      const { sendSignalEmail } = await import('../outreach/signalEmail.js')
      await sendSignalEmail(db, orgId, prospectId, 'last_chance_escalation', null, {
        gift_link: giftResult?.giftId ? `https://face-media-factory.web.app/gift/${giftResult.giftId}` : '',
        loom_script: scriptResult?.script || '',
      })

      // Marquer la sequence comme escaladee
      await seqDoc.ref.update({ escalated: true, escalatedAt: FieldValue.serverTimestamp() })
      await db.doc(`organizations/${orgId}/prospects/${prospectId}`).update({
        escalatedAt: FieldValue.serverTimestamp(), escalationType: 'smart_90plus',
      })

      escalated++
      log('escalation_sent', { orgId, prospectId, score, giftId: giftResult?.giftId })
    } catch (e) {
      log('escalation_error', { orgId, prospectId, error: e.message })
    }
  }

  if (escalated > 0) log('escalation_complete', { orgId, escalated })
}
