/**
 * alexResponseWatcher.js — Watcher temps reel des reponses prospects
 *
 * Firestore trigger onDocumentUpdated sur organizations/{orgId}/prospects/{prospectId}
 *
 * Des qu'un prospect repond (email, LinkedIn, WhatsApp, n'importe quel canal) :
 *   1. Qualification Bot classifie en < 1 min
 *   2. Si positif → pause toutes les sequences + BANT
 *   3. Si qualifie → cree booking + genere brief pre-call
 *   4. Notifie le user sur WhatsApp
 *
 * Exports:
 *   - alexResponseWatcher (onDocumentUpdated)
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'alexResponseWatcher', event, ...data, ts: new Date().toISOString() }))

export const alexResponseWatcher = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()
    if (!before || !after) return

    // Detecter un NOUVEAU reply (champ lastReply ou repliedAt change)
    const hadReply = before.lastReply || before.repliedAt
    const hasNewReply = after.lastReply && after.lastReply !== before.lastReply
    const hasNewReplyAt = after.repliedAt && (!before.repliedAt || after.repliedAt !== before.repliedAt)

    if (!hasNewReply && !hasNewReplyAt) return

    // Eviter les re-traitements
    if (after._responseWatcherProcessed) return

    const orgId = event.params.orgId
    const prospectId = event.params.prospectId
    const replyText = after.lastReply || ''
    const channel = after.lastReplyChannel || after.contactChannel || 'email'

    log('reply_detected', { orgId, prospectId, channel, replyLength: replyText.length })

    const db = getDb()

    try {
      // Idempotency via transaction — evite les double-fires (at-least-once delivery)
      const prospectRef = event.data.after.ref
      const claimed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(prospectRef)
        if (snap.data()?._responseWatcherProcessed) return false
        tx.update(prospectRef, { _responseWatcherProcessed: true })
        return true
      })

      if (!claimed) {
        log('reply_already_processing', { orgId, prospectId })
        return
      }

      // ---- STEP 1 : Classification de la reponse ----
      const { processReply } = await import('../outreach/qualificationBot.js')
      const classification = await processReply(db, orgId, prospectId, replyText, channel)

      log('reply_classified', { orgId, prospectId, classification: classification?.classification })

      const category = classification?.classification?.category || classification?.category || 'neutral'
      const isPositive = ['interested', 'question', 'meeting_request'].includes(category)
      const isMeetingRequest = category === 'meeting_request'

      if (!isPositive) {
        // Reponse negative ou neutre — laisser les sequences tourner
        log('reply_negative_or_neutral', { orgId, prospectId, category })
        // Nettoyer le flag pour permettre de futurs traitements
        await event.data.after.ref.update({ _responseWatcherProcessed: FieldValue.delete() })
        return
      }

      // ---- STEP 2 : Reponse POSITIVE → Pause sequences + BANT ----
      log('reply_positive', { orgId, prospectId, category })

      // Pause toutes les sequences actives sur ce prospect
      await pauseAllSequences(db, orgId, prospectId)

      // Mettre a jour le statut du prospect
      await event.data.after.ref.update({
        status: 'hot',
        hotAt: FieldValue.serverTimestamp(),
        hotReason: `reply_${category}`,
      })

      // Qualification BANT automatique (si on a assez d'infos)
      let bantResult = null
      if (replyText.length > 20) {
        try {
          bantResult = await runAutoBant(db, orgId, prospectId, replyText, after)
          log('bant_completed', { orgId, prospectId, score: bantResult?.score, qualified: bantResult?.isQualified })
        } catch (e) {
          log('bant_error', { orgId, prospectId, error: e.message })
        }
      }

      // ---- STEP 3 : Si qualifie → Booking + Brief ----
      // meeting_request → TOUJOURS creer le booking, meme si BANT pas qualifie
      // interested + score >= 60 → aussi creer le booking
      let bookingResult = null
      const score = after.alexScore || after.score || 0
      const isQualified = bantResult?.isQualified || isMeetingRequest || (category === 'interested' && score >= 60)

      if (isQualified) {
        try {
          const { initBooking } = await import('../outreach/bookingEngine.js')
          bookingResult = await initBooking(db, orgId, prospectId, {
            meetingType: 'discovery',
            channels: [channel, 'email'],
          })
          log('booking_created', { orgId, prospectId, bookingId: bookingResult?.bookingId })
        } catch (e) {
          log('booking_error', { orgId, prospectId, error: e.message })
        }

        // Generer le brief pre-call
        let brief = null
        try {
          const { buildPreCallBrief } = await import('../outreach/bookingEngine.js')
          brief = await buildPreCallBrief(db, orgId, prospectId)
          log('brief_generated', { orgId, prospectId })
        } catch (e) {
          log('brief_error', { orgId, prospectId, error: e.message })
        }

        // ---- STEP 4 : Notifier le user sur WhatsApp ----
        await notifyUserWhatsApp(db, orgId, prospectId, after, bookingResult, brief, classification)
      } else {
        // Prospect positif mais pas encore qualifie — notifier quand meme
        await notifyUserWhatsApp(db, orgId, prospectId, after, null, null, classification)
      }

      // Nettoyer le flag
      await event.data.after.ref.update({ _responseWatcherProcessed: FieldValue.delete() })
    } catch (error) {
      log('watcher_error', { orgId, prospectId, error: error.message })
      // Nettoyer le flag en cas d'erreur
      try {
        await event.data.after.ref.update({ _responseWatcherProcessed: FieldValue.delete() })
      } catch {}
    }
  }
)

/**
 * Pause toutes les sequences actives sur un prospect
 */
async function pauseAllSequences(db, orgId, prospectId) {
  // Pause sniper sequences
  const sniperSnap = await db
    .collection(`organizations/${orgId}/sniperSequences`)
    .where('prospectId', '==', prospectId)
    .where('status', 'in', ['active', 'pending'])
    .get()

  const batch = db.batch()
  let count = 0

  for (const doc of sniperSnap.docs) {
    batch.update(doc.ref, {
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      pauseReason: 'prospect_replied',
    })
    count++
  }

  // Pause social warming
  const warmingSnap = await db
    .collection(`organizations/${orgId}/socialWarming`)
    .where('prospectId', '==', prospectId)
    .where('status', 'in', ['active', 'pending'])
    .get()

  for (const doc of warmingSnap.docs) {
    batch.update(doc.ref, {
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      pauseReason: 'prospect_replied',
    })
    count++
  }

  // Pause nurturing
  const nurturingSnap = await db
    .collection(`organizations/${orgId}/nurturing`)
    .where('prospectId', '==', prospectId)
    .where('status', 'in', ['active', 'pending'])
    .get()

  for (const doc of nurturingSnap.docs) {
    batch.update(doc.ref, {
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      pauseReason: 'prospect_replied',
    })
    count++
  }

  if (count > 0) {
    await batch.commit()
    log('sequences_paused', { orgId, prospectId, count })
  }
}

/**
 * Qualification BANT automatique basee sur le contenu de la reponse
 */
async function runAutoBant(db, orgId, prospectId, replyText, prospectData) {
  const { qualifyFromConversation } = await import('../outreach/qualificationBot.js')

  // Extraire des signaux BANT du texte de la reponse
  const answers = {}

  const textLower = replyText.toLowerCase()

  // Budget signals
  if (/budget|prix|combien|tarif|cout|devis|investir/i.test(textLower)) {
    answers.budget = 'mentioned'
  }

  // Authority signals
  if (/je decide|mon equipe|nous cherchons|je suis le|directeur|gerant|fondateur/i.test(textLower)) {
    answers.authority = 'decision_maker'
  }

  // Need signals
  if (/besoin|probleme|cherche|interesse|solution|urgent|aide/i.test(textLower)) {
    answers.need = 'expressed'
  }

  // Timeline signals
  if (/rapidement|cette semaine|ce mois|urgent|des que|bientot|maintenant/i.test(textLower)) {
    answers.timeline = 'short_term'
  }

  const result = qualifyFromConversation(answers)

  // Sauvegarder le score BANT sur le prospect
  const bantUpdate = {
    bantScore: result.score,
    bantQualified: result.isQualified,
    bantTier: result.tier,
    bantBreakdown: result.qualification,
  }
  if (result.isQualified) {
    bantUpdate.qualifiedAt = FieldValue.serverTimestamp()
  }
  await db.doc(`organizations/${orgId}/prospects/${prospectId}`).update(bantUpdate)

  return result
}

/**
 * Notifier le user via WhatsApp
 */
async function notifyUserWhatsApp(db, orgId, prospectId, prospect, booking, brief, classification) {
  // Recuperer le WhatsApp du user
  const prefsDoc = await db.doc(`organizations/${orgId}/alexMemory/preferences`).get()
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const prefs = prefsDoc.exists ? prefsDoc.data() : {}
  const orgData = orgDoc.exists ? orgDoc.data() : {}
  const userPhone = prefs.userWhatsApp || orgData.ownerPhone

  if (!userPhone) {
    log('notify_no_phone', { orgId })
    return
  }

  const name = prospect.name || prospect.companyName || prospect.company || 'Prospect'
  const company = prospect.company || prospect.companyName || ''
  const category = classification?.classification?.category || classification?.category || 'interested'
  const score = prospect.alexScore || prospect.score || 0

  let message = ''

  if (booking) {
    // Prospect qualifie avec booking
    message = `🔥 *PROSPECT CHAUD — CALL BOOKE*\n\n`
    message += `*${name}*${company ? ` de ${company}` : ''} (score ${score}/100)\n`
    message += `Canal : ${prospect.lastReplyChannel || 'email'}\n`
    message += `Reponse : "${(prospect.lastReply || '').substring(0, 100)}"\n\n`
    if (booking.bookingUrl) {
      message += `📅 Lien booking : ${booking.bookingUrl}\n\n`
    }
    if (brief) {
      const tp = brief.talkingPoints || []
      if (tp.length > 0) {
        message += `📋 *Brief pre-call :*\n`
        message += tp.slice(0, 3).map(p => `• ${p}`).join('\n')
        message += '\n'
      }
    }
    message += `\n→ Va closer ce deal.`
  } else {
    // Prospect positif, pas encore qualifie
    message = `⚡ *PROSPECT INTERESSE*\n\n`
    message += `*${name}*${company ? ` de ${company}` : ''} (score ${score}/100)\n`
    message += `Type : ${category}\n`
    message += `Canal : ${prospect.lastReplyChannel || 'email'}\n`
    message += `Reponse : "${(prospect.lastReply || '').substring(0, 150)}"\n\n`
    message += `J'ai mis toutes ses sequences en pause.\n`
    message += `→ Tu veux que je le qualifie plus en detail ?`
  }

  try {
    const { sendTextMessage } = await import('./alexWhatsAppSender.js')
    await sendTextMessage(userPhone, message)
    log('notify_sent', { orgId, prospectId, type: booking ? 'booking' : 'interested' })
  } catch (e) {
    log('notify_error', { orgId, error: e.message })
  }
}
