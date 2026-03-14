/**
 * WhatsApp Intelligence Reports — Alex V4
 *
 * 1. Rapport quotidien 20h via WhatsApp
 * 2. Alertes temps reel :
 *    - Prospect chaud (reponse positive)
 *    - Baisse taux de reponse
 *    - Record du jour
 * 3. Demande de confirmation avant actions critiques
 * 4. Detection d'anomalies (bonnes et mauvaises)
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Scheduled: evening intelligence report ──────────────────────────

export const alexEveningIntelReport = onSchedule({
  schedule: '0 20 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  const db = getDb()

  const orgsSnap = await db.collection('organizations')
    .where('prospectionEnabled', '==', true)
    .get()

  for (const orgDoc of orgsSnap.docs) {
    try {
      await sendIntelReport(db, orgDoc.id, orgDoc.data())
    } catch (error) {
      logger.error(`Intel report error for ${orgDoc.id}:`, error.message)
    }
  }
})

async function sendIntelReport(db, orgId, orgData) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Load all metrics in parallel
  const [
    todayFound, todayContacted, todayReplied,
    weekFound, weekContacted, weekReplied,
    hotLeads, closedThisWeek, lostThisWeek,
    learningDoc,
  ] = await Promise.all([
    db.collection(`organizations/${orgId}/prospects`).where('createdAt', '>=', today).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('contactedAt', '>=', today).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('repliedAt', '>=', today).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('createdAt', '>=', weekAgo).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('contactedAt', '>=', weekAgo).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('repliedAt', '>=', weekAgo).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('status', 'in', ['hot', 'responded', 'qualified']).orderBy('score', 'desc').limit(5).get(),
    db.collection(`organizations/${orgId}/prospects`).where('status', '==', 'closed').where('updatedAt', '>=', weekAgo).count().get(),
    db.collection(`organizations/${orgId}/prospects`).where('status', '==', 'lost').where('updatedAt', '>=', weekAgo).count().get(),
    db.doc(`organizations/${orgId}/learningAggregates/weights`).get(),
  ])

  const stats = {
    today: {
      found: todayFound.data().count,
      contacted: todayContacted.data().count,
      replied: todayReplied.data().count,
    },
    week: {
      found: weekFound.data().count,
      contacted: weekContacted.data().count,
      replied: weekReplied.data().count,
    },
    closed: closedThisWeek.data().count,
    lost: lostThisWeek.data().count,
  }

  // Calculate rates
  const weekReplyRate = stats.week.contacted > 0
    ? Math.round((stats.week.replied / stats.week.contacted) * 100)
    : 0
  const weekConvRate = stats.week.found > 0
    ? Math.round((stats.closed / stats.week.found) * 100)
    : 0

  // Hot leads summary
  const hotList = hotLeads.docs.map(d => {
    const p = d.data()
    return `${p.company || p.name || '?'} (${p.score || 0}/100, ${p.status})`
  })

  // Detect anomalies
  const anomalies = await detectAnomalies(db, orgId, stats)

  // Learning insights
  const learning = learningDoc.exists ? learningDoc.data() : null
  const bestSignal = learning?.signalWeights
    ? Object.entries(learning.signalWeights).sort(([,a],[,b]) => b.conversionRate - a.conversionRate)[0]
    : null
  const bestChannel = learning?.channelPerformance
    ? Object.entries(learning.channelPerformance).sort(([,a],[,b]) => b.conversionRate - a.conversionRate)[0]
    : null

  // Build report
  let report = `📊 *RAPPORT INTELLIGENCE — ${new Date().toLocaleDateString('fr-FR')}*\n\n`
  report += `📈 *Aujourd'hui :*\n`
  report += `• ${stats.today.found} prospects trouves\n`
  report += `• ${stats.today.contacted} contactes\n`
  report += `• ${stats.today.replied} reponses\n\n`

  report += `📅 *Cette semaine :*\n`
  report += `• ${stats.week.found} trouves | ${stats.week.contacted} contactes\n`
  report += `• Taux reponse : ${weekReplyRate}%\n`
  report += `• ${stats.closed} closes | ${stats.lost} perdus\n`
  if (weekConvRate > 0) report += `• Taux conversion : ${weekConvRate}%\n`

  if (hotList.length > 0) {
    report += `\n🔥 *Hot leads a traiter :*\n`
    hotList.forEach(h => { report += `• ${h}\n` })
  }

  if (anomalies.length > 0) {
    report += `\n⚡ *Alertes :*\n`
    anomalies.forEach(a => { report += `${a.emoji} ${a.message}\n` })
  }

  if (bestSignal) {
    report += `\n🧠 *Intelligence :*\n`
    report += `• Meilleur signal : ${bestSignal[0]} (${bestSignal[1].conversionRate}% conversion)\n`
    if (bestChannel) report += `• Meilleur canal : ${bestChannel[0]} (${bestChannel[1].conversionRate}% conversion)\n`
  }

  report += `\n_Alex — votre associe commercial IA_`

  // Send via WhatsApp
  const prefsDoc = await db.doc(`organizations/${orgId}/alexMemory/preferences`).get()
  const prefs = prefsDoc.exists ? prefsDoc.data() : {}
  const phone = prefs.userWhatsApp || orgData.ownerPhone

  if (phone) {
    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js')
      await sendWhatsAppMessage({
        to: phone,
        message: report,
        organizationId: orgId,
        isNotification: true,
      })
    } catch (e) {
      logger.warn(`Intel report WhatsApp send failed for ${orgId}:`, e.message)
    }
  }

  // Save report
  const dateKey = new Date().toISOString().split('T')[0]
  await db.doc(`organizations/${orgId}/alexReports/${dateKey}_intel`).set({
    type: 'intelligence',
    stats,
    hotLeads: hotList,
    anomalies,
    weekReplyRate,
    weekConvRate,
    report,
    sentVia: phone ? 'whatsapp' : 'saas_only',
    sentAt: FieldValue.serverTimestamp(),
  })
}

// ─── Trigger: real-time alerts on prospect reply ─────────────────────

export const onProspectReplyAlert = onDocumentCreated(
  {
    document: 'organizations/{orgId}/interactions/{interactionId}',
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (event) => {
    const data = event.data?.data()
    if (!data) return
    if (data.direction !== 'inbound') return // Only inbound (replies)

    const orgId = event.params.orgId
    const db = getDb()

    try {
      // Get prospect info
      const prospectId = data.prospectId
      if (!prospectId) return

      const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
      if (!pDoc.exists) return
      const prospect = pDoc.data()

      // Only alert for prospects with score >= 60 (hot/burning)
      const score = prospect.score || 0
      if (score < 60) return

      // Get org preferences
      const [orgDoc, prefsDoc] = await Promise.all([
        db.doc(`organizations/${orgId}`).get(),
        db.doc(`organizations/${orgId}/alexMemory/preferences`).get(),
      ])
      const orgData = orgDoc.data() || {}
      const prefs = prefsDoc.exists ? prefsDoc.data() : {}
      const phone = prefs.userWhatsApp || orgData.ownerPhone
      if (!phone) return

      // Classify reply sentiment
      const sentiment = classifySentiment(data.content || data.message || '')

      let alert = ''
      if (sentiment === 'positive') {
        alert = `🔥 *PROSPECT CHAUD !*\n\n`
        alert += `*${prospect.company || prospect.name || 'Prospect'}* vient de repondre positivement !\n`
        alert += `Score : ${score}/100\n`
        alert += `Canal : ${data.channel || 'email'}\n`
        if (data.content) alert += `\n💬 _"${String(data.content).substring(0, 150)}"_\n`
        alert += `\nJe recommande de le rappeler rapidement.`
      } else if (sentiment === 'question') {
        alert = `❓ *Question d'un prospect*\n\n`
        alert += `*${prospect.company || prospect.name || 'Prospect'}* a une question.\n`
        alert += `Score : ${score}/100\n`
        if (data.content) alert += `\n💬 _"${String(data.content).substring(0, 150)}"_\n`
      } else {
        return // Don't alert for negative/neutral low-value replies
      }

      // Send alert
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js')
      await sendWhatsAppMessage({
        to: phone,
        message: alert,
        organizationId: orgId,
        isNotification: true,
      })

      logger.info(`Real-time alert sent for prospect ${prospectId} in org ${orgId}`)
    } catch (error) {
      logger.warn(`Reply alert error:`, error.message)
    }
  }
)

// ─── Callable: send confirmation request ─────────────────────────────

export const sendAlexConfirmation = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, action, details, count } = request.data || {}
  if (!orgId || !action) throw new HttpsError('invalid-argument', 'orgId et action requis')

  const db = getDb()
  const [orgDoc, prefsDoc] = await Promise.all([
    db.doc(`organizations/${orgId}`).get(),
    db.doc(`organizations/${orgId}/alexMemory/preferences`).get(),
  ])
  const orgData = orgDoc.data() || {}
  const prefs = prefsDoc.exists ? prefsDoc.data() : {}
  const phone = prefs.userWhatsApp || orgData.ownerPhone

  // Save pending confirmation
  const confirmRef = await db.collection(`organizations/${orgId}/alexConfirmations`).add({
    action,
    details: details || '',
    count: count || 0,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    respondedAt: null,
    response: null,
  })

  // Send WhatsApp confirmation request
  if (phone) {
    let message = `⚡ *CONFIRMATION REQUISE*\n\n`
    message += `${details || action}\n`
    if (count) message += `Nombre : ${count}\n`
    message += `\n_Reponds OUI pour confirmer ou NON pour annuler._`

    try {
      const { sendWhatsAppMessage } = await import('../channels/whatsapp/sender.js')
      await sendWhatsAppMessage({
        to: phone,
        message,
        organizationId: orgId,
        isNotification: true,
      })
    } catch (e) {
      logger.warn('Confirmation WhatsApp send failed:', e.message)
    }
  }

  return { success: true, confirmationId: confirmRef.id }
})

// ─── Callable: get intel reports history ──────────────────────────────

export const getIntelReports = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, limit: lim } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  const snap = await db.collection(`organizations/${orgId}/alexReports`)
    .orderBy('sentAt', 'desc')
    .limit(lim || 14)
    .get()

  const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return { reports, total: reports.length }
})

// ─── Anomaly detection ───────────────────────────────────────────────

async function detectAnomalies(db, orgId, currentStats) {
  const anomalies = []

  // Get previous week stats
  const prevWeekStart = new Date()
  prevWeekStart.setDate(prevWeekStart.getDate() - 14)
  prevWeekStart.setHours(0, 0, 0, 0)
  const prevWeekEnd = new Date()
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7)
  prevWeekEnd.setHours(0, 0, 0, 0)

  const [prevContacted, prevReplied] = await Promise.all([
    db.collection(`organizations/${orgId}/prospects`)
      .where('contactedAt', '>=', prevWeekStart)
      .where('contactedAt', '<', prevWeekEnd)
      .count().get(),
    db.collection(`organizations/${orgId}/prospects`)
      .where('repliedAt', '>=', prevWeekStart)
      .where('repliedAt', '<', prevWeekEnd)
      .count().get(),
  ])

  const prevReplyRate = prevContacted.data().count > 0
    ? (prevReplied.data().count / prevContacted.data().count) * 100
    : 0
  const currentReplyRate = currentStats.week.contacted > 0
    ? (currentStats.week.replied / currentStats.week.contacted) * 100
    : 0

  // Reply rate drop
  if (prevReplyRate > 0 && currentReplyRate < prevReplyRate * 0.6) {
    anomalies.push({
      type: 'reply_rate_drop',
      emoji: '⚠️',
      message: `Taux de reponse en baisse : ${Math.round(currentReplyRate)}% vs ${Math.round(prevReplyRate)}% la semaine derniere. Je recommande de changer de template.`,
      severity: 'warning',
    })
  }

  // Reply rate increase (good news)
  if (prevReplyRate > 0 && currentReplyRate > prevReplyRate * 1.5) {
    anomalies.push({
      type: 'reply_rate_up',
      emoji: '🎉',
      message: `Record ! Taux de reponse a ${Math.round(currentReplyRate)}% (vs ${Math.round(prevReplyRate)}% la semaine derniere).`,
      severity: 'positive',
    })
  }

  // High daily replies (record)
  if (currentStats.today.replied > 10) {
    anomalies.push({
      type: 'daily_record',
      emoji: '🏆',
      message: `${currentStats.today.replied} reponses aujourd'hui — journee exceptionnelle !`,
      severity: 'positive',
    })
  }

  // No activity
  if (currentStats.today.contacted === 0 && currentStats.today.found === 0) {
    anomalies.push({
      type: 'no_activity',
      emoji: '😴',
      message: `Aucune activite aujourd'hui. Les campagnes sont-elles en pause ?`,
      severity: 'info',
    })
  }

  return anomalies
}

// ─── Sentiment classification ────────────────────────────────────────

function classifySentiment(text) {
  if (!text) return 'neutral'
  const lower = text.toLowerCase()

  const positiveWords = ['oui', 'interesse', 'parfait', 'genial', 'super', 'merci', 'rdv', 'rendez-vous',
    'quand', 'disponible', 'combien', 'devis', 'offre', 'proposition', 'ok', 'volontiers',
    'yes', 'interested', 'great', 'amazing', 'let\'s talk', 'schedule', 'book']
  const questionWords = ['comment', 'pourquoi', 'quoi', 'quel', 'combien', 'how', 'what', 'why', 'which', '?']
  const negativeWords = ['non', 'pas interesse', 'stop', 'desabonner', 'spam', 'arretez', 'no thanks',
    'unsubscribe', 'remove']

  if (negativeWords.some(w => lower.includes(w))) return 'negative'
  if (positiveWords.some(w => lower.includes(w))) return 'positive'
  if (questionWords.some(w => lower.includes(w))) return 'question'
  return 'neutral'
}
