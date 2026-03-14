/**
 * Daily Digest Engine
 *
 * Genere un resume quotidien des performances de prospection pour chaque org :
 * - Stats du jour (messages envoyes, reponses, RDV, leads)
 * - Top 3 leads chauds
 * - Resume IA genere via callAI
 * - Sauvegarde Firestore + notification email
 *
 * Exports: dailyDigestCron, generateDailyDigest, getDigestHistory
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Formater la date du jour en YYYY-MM-DD dans le timezone Paris
 */
function getTodayDate(dateOverride) {
  if (dateOverride) return dateOverride

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

/**
 * Debut et fin de journee en UTC pour une date YYYY-MM-DD en timezone Paris
 */
function getDayBounds(dateStr) {
  const startLocal = new Date(`${dateStr}T00:00:00+01:00`)
  const endLocal = new Date(`${dateStr}T23:59:59+01:00`)
  return { start: startLocal, end: endLocal }
}

/**
 * Collecter les stats du jour pour une org
 */
async function collectDailyStats(db, orgId, dateStr) {
  const { start, end } = getDayBounds(dateStr)
  const orgRef = db.collection('organizations').doc(orgId)

  // Messages envoyes aujourd'hui
  const interactionsSnap = await orgRef
    .collection('interactions')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('direction', '==', 'outbound')
    .get()

  const messagesSent = interactionsSnap.size

  // Repartition par canal
  const channelBreakdown = {}
  for (const doc of interactionsSnap.docs) {
    const channel = doc.data().channel || 'email'
    channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1
  }

  // Reponses recues aujourd'hui
  const repliesSnap = await orgRef
    .collection('interactions')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('direction', '==', 'inbound')
    .get()

  const repliesReceived = repliesSnap.size

  // Meetings booques
  const meetingsSnap = await orgRef
    .collection('interactions')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('type', '==', 'meeting_booked')
    .get()

  const meetingsBooked = meetingsSnap.size

  // Nouveaux leads importes aujourd'hui
  const newLeadsSnap = await orgRef
    .collection('prospects')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .get()

  const newLeads = newLeadsSnap.size

  return {
    messagesSent,
    repliesReceived,
    meetingsBooked,
    newLeads,
    channelBreakdown,
    replyRate: messagesSent > 0 ? Math.round((repliesReceived / messagesSent) * 100) : 0,
  }
}

/**
 * Recuperer le top 3 des leads chauds (ayant repondu avec le meilleur score)
 */
async function getTopHotLeads(db, orgId, dateStr) {
  const { start, end } = getDayBounds(dateStr)
  const orgRef = db.collection('organizations').doc(orgId)

  // Prospects ayant repondu aujourd'hui
  const repliesSnap = await orgRef
    .collection('interactions')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .where('direction', '==', 'inbound')
    .get()

  // Recuperer les IDs prospects uniques
  const prospectIds = [...new Set(repliesSnap.docs.map(d => d.data().prospectId).filter(Boolean))]

  if (prospectIds.length === 0) return []

  // Recuperer les prospects et trier par score
  const prospects = []
  for (const pid of prospectIds.slice(0, 10)) {
    const prospectSnap = await orgRef.collection('prospects').doc(pid).get()
    if (prospectSnap.exists) {
      const data = prospectSnap.data()
      prospects.push({
        id: pid,
        name: [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || 'Inconnu',
        company: data.company || '',
        score: data.score || 0,
        email: data.email || '',
        channel: data.lastChannel || '',
      })
    }
  }

  // Trier par score descendant et prendre le top 3
  return prospects.sort((a, b) => b.score - a.score).slice(0, 3)
}

/**
 * Generer le resume IA du digest
 */
async function generateSummary(stats, topLeads, orgName) {
  const leadsDescription = topLeads.length > 0
    ? topLeads.map(l => `${l.name} (${l.company}, score: ${l.score})`).join(', ')
    : 'Aucun lead chaud aujourd\'hui'

  const channelDesc = Object.entries(stats.channelBreakdown)
    .map(([ch, count]) => `${ch}: ${count}`)
    .join(', ') || 'aucun envoi'

  const prompt = `Tu es un assistant de prospection B2B. Genere un resume quotidien concis (3-4 phrases max) en francais pour l'equipe commerciale.

Donnees du jour pour ${orgName || 'l\'organisation'} :
- Messages envoyes : ${stats.messagesSent} (${channelDesc})
- Reponses recues : ${stats.repliesReceived} (taux: ${stats.replyRate}%)
- RDV pris : ${stats.meetingsBooked}
- Nouveaux leads : ${stats.newLeads}
- Top leads chauds : ${leadsDescription}

Genere un resume motivant et actionnable. Mentionne les chiffres cles et recommande une action prioritaire pour demain. Ne mets pas de titre, juste le texte du resume.`

  try {
    const text = await callAI(prompt, 300)
    return text
  } catch (error) {
    console.log(JSON.stringify({
      event: 'digest_ai_summary_error',
      data: { error: error.message },
      timestamp: Date.now(),
    }))
    return `Aujourd'hui : ${stats.messagesSent} messages envoyes, ${stats.repliesReceived} reponses (${stats.replyRate}%), ${stats.meetingsBooked} RDV pris, ${stats.newLeads} nouveaux leads.`
  }
}

/**
 * Sauvegarder le digest dans Firestore et enqueue notification email si configure
 */
async function saveDigest(db, orgId, dateStr, digest) {
  const orgRef = db.collection('organizations').doc(orgId)

  await orgRef
    .collection('dailyDigests')
    .doc(dateStr)
    .set({
      ...digest,
      createdAt: FieldValue.serverTimestamp(),
    })

  // Verifier si une notification email est configuree
  const orgSnap = await orgRef.get()
  const orgData = orgSnap.data()
  const notifEmail = orgData?.notificationEmail || orgData?.ownerEmail

  if (notifEmail) {
    // Enqueue dans la collection de notifications pour envoi asynchrone
    await db.collection('notificationQueue').add({
      type: 'daily_digest',
      orgId,
      to: notifEmail,
      subject: `Digest prospection ${dateStr} — ${digest.stats.messagesSent} envois, ${digest.stats.repliesReceived} reponses`,
      data: digest,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  return notifEmail
}

/**
 * Generer le digest complet pour une org
 */
async function buildDigestForOrg(db, orgId, dateStr, orgName) {
  const stats = await collectDailyStats(db, orgId, dateStr)
  const topLeads = await getTopHotLeads(db, orgId, dateStr)
  const summary = await generateSummary(stats, topLeads, orgName)

  const digest = {
    date: dateStr,
    stats,
    topLeads,
    summary,
    generatedAt: new Date().toISOString(),
  }

  const notifEmail = await saveDigest(db, orgId, dateStr, digest)

  return { digest, notifEmail }
}

// ─── CRON — DIGEST QUOTIDIEN 19H ───────────────────────────────────────────

export const dailyDigestCron = onSchedule(
  {
    schedule: 'every day 19:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    const db = getDb()
    const dateStr = getTodayDate()

    console.log(JSON.stringify({
      event: 'daily_digest_cron_start',
      data: { date: dateStr },
      timestamp: Date.now(),
    }))

    try {
      // Recuperer toutes les orgs avec des campagnes actives
      const orgsSnap = await db.collection('organizations').get()

      let processed = 0
      let skipped = 0
      let errors = 0

      for (const orgDoc of orgsSnap.docs) {
        const orgData = orgDoc.data()
        const orgId = orgDoc.id

        // Verifier si l'org a des campagnes actives
        const activeCampaignsSnap = await orgDoc.ref
          .collection('campaigns')
          .where('status', '==', 'active')
          .limit(1)
          .get()

        if (activeCampaignsSnap.empty) {
          skipped++
          continue
        }

        try {
          await buildDigestForOrg(db, orgId, dateStr, orgData.name)
          processed++
        } catch (orgError) {
          errors++
          console.log(JSON.stringify({
            event: 'daily_digest_org_error',
            data: { orgId, error: orgError.message },
            timestamp: Date.now(),
          }))
        }
      }

      console.log(JSON.stringify({
        event: 'daily_digest_cron_complete',
        data: { date: dateStr, processed, skipped, errors },
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.log(JSON.stringify({
        event: 'daily_digest_cron_error',
        data: { error: error.message },
        timestamp: Date.now(),
      }))
    }
  }
)

// ─── CALLABLE — GENERER DIGEST A LA DEMANDE ────────────────────────────────

export const generateDailyDigest = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, date } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const dateStr = getTodayDate(date)

    try {
      // Recuperer le nom de l'org
      const orgSnap = await db.collection('organizations').doc(orgId).get()
      if (!orgSnap.exists) {
        throw new HttpsError('not-found', 'Organisation non trouvee')
      }

      const orgName = orgSnap.data()?.name || ''

      const { digest } = await buildDigestForOrg(db, orgId, dateStr, orgName)

      console.log(JSON.stringify({
        event: 'daily_digest_generated',
        data: { orgId, date: dateStr, messagesSent: digest.stats.messagesSent },
        timestamp: Date.now(),
      }))

      return { digest }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.log(JSON.stringify({
        event: 'daily_digest_generate_error',
        data: { orgId, date: dateStr, error: error.message },
        timestamp: Date.now(),
      }))
      throw new HttpsError('internal', `Erreur generation digest: ${error.message}`)
    }
  }
)

// ─── CALLABLE — HISTORIQUE DES DIGESTS ──────────────────────────────────────

export const getDigestHistory = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, limit = 7 } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const clampedLimit = Math.min(Math.max(limit, 1), 30)

    try {
      const digestsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('dailyDigests')
        .orderBy('date', 'desc')
        .limit(clampedLimit)
        .get()

      const digests = digestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      return { digests }
    } catch (error) {
      console.log(JSON.stringify({
        event: 'digest_history_error',
        data: { orgId, error: error.message },
        timestamp: Date.now(),
      }))
      throw new HttpsError('internal', `Erreur lecture historique: ${error.message}`)
    }
  }
)
