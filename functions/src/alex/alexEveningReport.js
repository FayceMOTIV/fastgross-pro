/**
 * alexEveningReport.js — Rapport du soir 20H
 *
 * Chaque soir a 20H, Alex envoie un resume WhatsApp au user :
 * "Aujourd'hui : X prospects trouves, Y emails envoyes, Z reponses,
 *  N calls bookes. Top prospect : {nom}. Action requise : {si applicable}."
 *
 * Export:
 *   - alexEveningReport (onSchedule 20h daily)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'alexEveningReport', event, ...data, ts: new Date().toISOString() }))

export const alexEveningReport = onSchedule(
  {
    schedule: '0 20 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = getDb()
    log('evening_report_start', {})

    const orgsSnap = await db.collection('organizations')
      .where('prospectionEnabled', '==', true)
      .get()

    for (const orgDoc of orgsSnap.docs) {
      try {
        await sendEveningReport(db, orgDoc.id, orgDoc.data())
      } catch (error) {
        log('evening_report_error', { orgId: orgDoc.id, error: error.message })
      }
    }
  }
)

async function sendEveningReport(db, orgId, orgData) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Charger toutes les stats en parallele
  const [
    foundSnap,
    contactedSnap,
    repliedSnap,
    bookingsSnap,
    hotSnap,
    topProspectSnap,
    pipelineSnap,
    emailsSentSnap,
  ] = await Promise.all([
    db.collection(`organizations/${orgId}/prospects`)
      .where('createdAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${orgId}/prospects`)
      .where('contactedAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${orgId}/prospects`)
      .where('repliedAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${orgId}/bookings`)
      .where('createdAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${orgId}/prospects`)
      .where('status', '==', 'hot')
      .count().get(),
    db.collection(`organizations/${orgId}/prospects`)
      .where('createdAt', '>=', today)
      .orderBy('alexScore', 'desc')
      .limit(1)
      .get(),
    db.collection(`organizations/${orgId}/pipeline`)
      .where('createdAt', '>=', today)
      .count().get(),
    db.collection(`organizations/${orgId}/interactions`)
      .where('channel', '==', 'email')
      .where('direction', '==', 'outbound')
      .where('createdAt', '>=', today)
      .count().get(),
  ])

  const stats = {
    found: foundSnap.data().count,
    contacted: contactedSnap.data().count,
    replied: repliedSnap.data().count,
    booked: bookingsSnap.data().count,
    hotTotal: hotSnap.data().count,
    pipeline: pipelineSnap.data().count,
    emailsSent: emailsSentSnap.data().count,
  }

  // Top prospect du jour
  let topProspect = null
  if (!topProspectSnap.empty) {
    const td = topProspectSnap.docs[0].data()
    topProspect = {
      name: td.name || td.company || td.companyName || 'Inconnu',
      company: td.company || td.companyName || '',
      score: td.alexScore || td.score || 0,
    }
  }

  // Determiner les actions requises
  const actions = []
  if (stats.replied > 0) {
    actions.push(`${stats.replied} reponse(s) a traiter`)
  }
  if (stats.booked > 0) {
    actions.push(`${stats.booked} call(s) a preparer`)
  }
  if (stats.hotTotal > 0 && stats.booked === 0) {
    actions.push(`${stats.hotTotal} prospect(s) chaud(s) en attente`)
  }

  // Construire le message
  let message = `📊 *BILAN DU JOUR — 20H*\n\n`

  // KPIs principaux
  message += `Prospects trouves : *${stats.found}*\n`
  message += `Emails envoyes : *${stats.emailsSent}*\n`
  message += `Reponses : *${stats.replied}*`
  if (stats.contacted > 0 && stats.replied > 0) {
    const rate = Math.round((stats.replied / stats.contacted) * 100)
    message += ` (${rate}%)`
  }
  message += '\n'
  message += `Calls bookes : *${stats.booked}*\n`

  // Taux de conversion funnel
  if (stats.found > 0) {
    message += `\n📈 Funnel : ${stats.found} → ${stats.contacted} → ${stats.replied} → ${stats.booked}\n`
  }

  // Top prospect
  if (topProspect) {
    message += `\n⭐ *Top prospect :* ${topProspect.name}`
    if (topProspect.company) message += ` (${topProspect.company})`
    message += ` — score ${topProspect.score}/100\n`
  }

  // Actions requises
  if (actions.length > 0) {
    message += `\n⚡ *Action requise :*\n`
    message += actions.map(a => `→ ${a}`).join('\n')
    message += '\n'
  } else {
    message += `\n✅ Rien a faire ce soir, je gere.\n`
  }

  // Phrase de cloture
  if (stats.replied > 3) {
    message += `\n🔥 Belle journee ! ${stats.replied} reponses, c'est solide.`
  } else if (stats.found > 20) {
    message += `\n💪 ${stats.found} nouveaux prospects dans le pipe. Demain on accelere.`
  } else {
    message += `\nA demain matin pour le briefing.`
  }

  // Envoyer via WhatsApp
  const prefsDoc = await db.doc(`organizations/${orgId}/alexMemory/preferences`).get()
  const prefs = prefsDoc.exists ? prefsDoc.data() : {}
  const userPhone = prefs.userWhatsApp || orgData.ownerPhone

  if (userPhone) {
    try {
      const { sendTextMessage } = await import('./alexWhatsAppSender.js')
      await sendTextMessage(userPhone, message)
      log('evening_report_sent', { orgId, stats })
    } catch (e) {
      log('evening_report_send_error', { orgId, error: e.message })
    }
  }

  // Sauvegarder le rapport
  const dateKey = new Date().toISOString().split('T')[0]
  await db.doc(`organizations/${orgId}/alexReports/${dateKey}_evening_20h`).set({
    type: 'evening_20h',
    stats,
    topProspect,
    actions,
    message,
    sentVia: userPhone ? 'whatsapp' : 'saas_only',
    sentAt: FieldValue.serverTimestamp(),
  })
}
