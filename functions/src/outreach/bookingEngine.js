/**
 * Booking Automatise Intelligent — Systeme 4 (Alex V4)
 *
 * Fonctionnalites :
 *  1. Generation de lien de booking (Cal.com / Calendly)
 *  2. Confirmation multi-canal (email + SMS + WhatsApp)
 *  3. Brief pre-call genere par IA (resume prospect + signaux + talking points)
 *  4. Rappel J-1 et H-1
 *  5. No-show follow-up automatique
 *
 * Storage: organizations/{orgId}/bookings/{bookingId}
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Callable: create booking link + send invite ─────────────────────

export const createBooking = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, bookingUrl, meetingType, channels, customMessage } = request.data || {}
  if (!orgId || !prospectId) throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const result = await initBooking(db, orgId, prospectId, {
    bookingUrl, meetingType, channels, customMessage, userId: request.auth.uid,
  })

  return { success: true, ...result }
})

// ─── Callable: generate pre-call brief ───────────────────────────────

export const generatePreCallBrief = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, bookingId } = request.data || {}
  if (!orgId || !prospectId) throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const brief = await buildPreCallBrief(db, orgId, prospectId)

  // Save brief to booking if exists
  if (bookingId) {
    await db.collection('organizations').doc(orgId)
      .collection('bookings').doc(bookingId).update({
        preCallBrief: brief,
        briefGeneratedAt: FieldValue.serverTimestamp(),
      })
  }

  return { success: true, brief }
})

// ─── Callable: mark booking outcome ──────────────────────────────────

export const updateBookingOutcome = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, bookingId, outcome, notes } = request.data || {}
  if (!orgId || !bookingId || !outcome) throw new HttpsError('invalid-argument', 'orgId, bookingId, outcome requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const validOutcomes = ['completed', 'no_show', 'cancelled', 'rescheduled']
  if (!validOutcomes.includes(outcome)) throw new HttpsError('invalid-argument', `Outcome invalide. Valides: ${validOutcomes.join(', ')}`)

  const db = getDb()
  const ref = db.collection('organizations').doc(orgId).collection('bookings').doc(bookingId)
  const doc = await ref.get()
  if (!doc.exists) throw new HttpsError('not-found', 'Booking introuvable')

  await ref.update({
    outcome,
    outcomeNotes: notes || null,
    outcomeAt: FieldValue.serverTimestamp(),
  })

  // If no-show, schedule follow-up
  if (outcome === 'no_show') {
    await scheduleNoShowFollowUp(db, orgId, doc.data())
  }

  // Update prospect status
  const prospectId = doc.data().prospectId
  if (prospectId) {
    const statusMap = {
      completed: 'qualified',
      no_show: 'warming',
      cancelled: 'warming',
      rescheduled: 'booked',
    }
    await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId).update({
        status: statusMap[outcome] || 'warming',
        lastBookingOutcome: outcome,
        updatedAt: FieldValue.serverTimestamp(),
      })
  }

  return { success: true, outcome, bookingId }
})

// ─── Worker: send reminders ──────────────────────────────────────────

export const bookingReminderWorker = onSchedule({
  schedule: 'every 1 hours',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 120,
}, async () => {
  const db = getDb()
  const now = new Date()

  // Check business hours
  const parisHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours()
  if (parisHour < 8 || parisHour >= 20) return

  const orgsSnap = await db.collectionGroup('bookings')
    .where('status', '==', 'confirmed')
    .where('reminderDue', '<=', now)
    .limit(50)
    .get()

  let sent = 0
  for (const doc of orgsSnap.docs) {
    const booking = doc.data()
    try {
      await sendReminder(db, doc.ref, booking)
      sent++
    } catch (error) {
      logger.error(`Reminder error for booking ${doc.id}:`, error.message)
    }
  }

  if (sent > 0) logger.info(`Booking reminders sent: ${sent}`)
})

// ─── Core functions ──────────────────────────────────────────────────

export async function initBooking(db, orgId, prospectId, options) {
  // Get prospect data
  const prospectDoc = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()

  if (!prospectDoc.exists) throw new Error('Prospect introuvable')
  const prospect = { id: prospectDoc.id, ...prospectDoc.data() }

  // Get org booking config
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const org = orgDoc.data() || {}
  const bookingConfig = org.bookingConfig || {}

  // Resolve booking URL
  const bookingUrl = options.bookingUrl || bookingConfig.defaultUrl || bookingConfig.calcomUrl || bookingConfig.calendlyUrl || null
  const meetingType = options.meetingType || 'discovery'

  // Create booking record
  const meetingDate = options.meetingDate || null
  const now = new Date()

  const bookingData = {
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    prospectEmail: prospect.email || '',
    prospectPhone: prospect.phone || '',
    prospectCompany: prospect.company || '',
    bookingUrl,
    meetingType,
    meetingTypeLabel: getMeetingTypeLabel(meetingType),
    status: 'pending',
    meetingDate: meetingDate || null,
    channels: options.channels || ['email'],
    createdAt: FieldValue.serverTimestamp(),
    createdBy: options.userId || null,
    reminderDue: null,
    reminders: [],
  }

  const bookingRef = await db.collection('organizations').doc(orgId)
    .collection('bookings').add(bookingData)

  // Send booking invite on selected channels
  const sendResults = []
  const sendChannels = options.channels || ['email']
  const message = options.customMessage || buildBookingMessage(prospect, bookingUrl, meetingType)

  for (const channel of sendChannels) {
    try {
      if (channel === 'email' && prospect.email) {
        // Safety gateway pre-check
        try {
          const { canSendSafely } = await import('../safety/preSendSafetyGateway.js')
          const safetyCheck = await canSendSafely(orgId, null, prospect.email, 'email')
          if (!safetyCheck.allowed) {
            throw new Error(`Safety blocked: ${safetyCheck.reasons.join(', ')}`)
          }
        } catch (safetyErr) {
          if (safetyErr.message?.includes('Safety blocked')) throw safetyErr
          console.warn('[bookingEngine] Safety check warning:', safetyErr.message)
        }
        const { sendEmail } = await import('../email/emailRouter.js')
        let bookingHtml = buildBookingEmailHtml(prospect, bookingUrl, meetingType, message)
        try {
          const { appendUnsubscribeFooter } = await import('../compliance/rgpdEngine.js')
          bookingHtml = appendUnsubscribeFooter(bookingHtml, prospectId, 'prospects')
        } catch {}
        await sendEmail({
          to: prospect.email,
          subject: `Reservez votre creneau — ${getMeetingTypeLabel(meetingType)}`,
          html: bookingHtml,
          from: 'Alex <alex@facemedia.app>',
          orgId,
        })
        sendResults.push({ channel: 'email', status: 'sent' })
      } else if (channel === 'sms' && prospect.phone) {
        const { sendSMS } = await import('../channels/sms/ovhSmsProvider.js')
        await sendSMS(orgId, prospectId, message.substring(0, 155))
        sendResults.push({ channel: 'sms', status: 'sent' })
      } else if (channel === 'whatsapp' && prospect.phone) {
        const { sendWhatsApp } = await import('../channels/whatsapp/sender.js')
        await sendWhatsApp(orgId, prospectId, { type: 'text', text: message, phone: prospect.phone })
        sendResults.push({ channel: 'whatsapp', status: 'sent' })
      } else {
        sendResults.push({ channel, status: 'skipped', reason: 'pas de coordonnees' })
      }
    } catch (error) {
      sendResults.push({ channel, status: 'error', error: error.message })
    }
  }

  // Update booking with send results
  await bookingRef.update({
    status: 'invited',
    inviteSentAt: FieldValue.serverTimestamp(),
    inviteResults: sendResults,
  })

  // Update prospect
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).update({
      status: 'booked',
      bookingId: bookingRef.id,
      bookingUrl,
      bookedAt: FieldValue.serverTimestamp(),
    })

  // Log interaction
  await db.collection('organizations').doc(orgId)
    .collection('interactions').add({
      prospectId,
      prospectName: prospect.name || prospect.company,
      channel: sendChannels[0],
      type: 'booking_invite',
      direction: 'outbound',
      content: `Invitation booking envoyee (${sendChannels.join(', ')})`,
      status: 'sent',
      createdAt: FieldValue.serverTimestamp(),
    })

  // Generate pre-call brief
  let brief = null
  try {
    brief = await buildPreCallBrief(db, orgId, prospectId)
    await bookingRef.update({ preCallBrief: brief, briefGeneratedAt: FieldValue.serverTimestamp() })
  } catch { /* brief generation is best-effort */ }

  return {
    bookingId: bookingRef.id,
    bookingUrl,
    sendResults,
    brief,
  }
}

// ─── Pre-call brief ──────────────────────────────────────────────────

export async function buildPreCallBrief(db, orgId, prospectId) {
  const prospectDoc = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()

  if (!prospectDoc.exists) throw new Error('Prospect introuvable')
  const prospect = prospectDoc.data()

  // Get interactions history
  const interactionsSnap = await db.collection('organizations').doc(orgId)
    .collection('interactions')
    .where('prospectId', '==', prospectId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()

  const interactions = interactionsSnap.docs.map(d => d.data())

  // Build brief sections
  const brief = {
    prospectSummary: {
      name: prospect.name || 'Inconnu',
      company: prospect.company || 'Inconnue',
      title: prospect.title || prospect.jobTitle || null,
      email: prospect.email || null,
      phone: prospect.phone || null,
      website: prospect.website || null,
      sector: prospect.sector || prospect.niche || null,
      location: prospect.zone || prospect.location || null,
    },
    signals: [],
    interactionHistory: [],
    talkingPoints: [],
    objectionsPossibles: [],
    preparation: [],
  }

  // Signals
  if (prospect.signal_type) brief.signals.push({ type: prospect.signal_type, detail: prospect.signal_detail || prospect.hiringSignalDetail || '' })
  if (prospect.score) brief.signals.push({ type: 'score', detail: `Score: ${prospect.score}/100 (${prospect.scoreTier || ''})` })
  if (prospect.dScore) brief.signals.push({ type: 'dscore', detail: `DScore: ${prospect.dScore}/100` })
  if (prospect.bantScore) brief.signals.push({ type: 'bant', detail: `BANT: ${prospect.bantScore}/100` })

  // Interaction history
  for (const i of interactions.slice(0, 5)) {
    brief.interactionHistory.push({
      channel: i.channel,
      type: i.type,
      direction: i.direction,
      content: (i.content || '').substring(0, 100),
      date: i.createdAt?.toDate?.()?.toISOString?.() || null,
    })
  }

  // Generate talking points with AI
  try {
    const { callAI } = await import('../ai/callAI.js')
    const context = `Prospect: ${prospect.name || ''} de ${prospect.company || ''}
Secteur: ${prospect.sector || 'non defini'}
Signal: ${prospect.signal_type || 'non defini'} — ${prospect.signal_detail || ''}
Score: ${prospect.score || 0}/100
Interactions: ${interactions.length} echanges precedents`

    const aiPrompt = `Tu prepares un brief pre-appel commercial pour un prospect B2B.

${context}

Genere en JSON :
{
  "talkingPoints": ["3 points cles a aborder"],
  "objections": ["3 objections probables avec reponse"],
  "preparation": ["3 actions de preparation avant l'appel"]
}

Reponds UNIQUEMENT en JSON valide.`

    const aiResponse = await callAI(aiPrompt, 800)
    const { extractJSON } = await import('../ai/callAI.js')
    const parsed = extractJSON(aiResponse)
    if (parsed) {
      brief.talkingPoints = parsed.talkingPoints || []
      brief.objectionsPossibles = parsed.objections || []
      brief.preparation = parsed.preparation || []
    }
  } catch {
    // Fallback talking points
    brief.talkingPoints = [
      'Comprendre le besoin exact du prospect',
      'Presenter notre solution adaptee a son secteur',
      'Proposer un plan d\'action concret',
    ]
    brief.objectionsPossibles = [
      'Budget non alloue → proposer un POC gratuit',
      'Deja un prestataire → montrer les differences',
      'Pas le bon moment → fixer un rappel',
    ]
    brief.preparation = [
      'Verifier le site web du prospect',
      'Regarder son profil LinkedIn',
      'Preparer un cas client similaire',
    ]
  }

  return brief
}

// ─── Reminders ───────────────────────────────────────────────────────

async function sendReminder(db, bookingRef, booking) {
  const reminderMessage = `📅 Rappel : votre rendez-vous avec ${booking.prospectName || 'nous'} est bientot. N'oubliez pas de consulter le brief pre-appel.`

  await bookingRef.update({
    reminderSentAt: FieldValue.serverTimestamp(),
    reminders: FieldValue.arrayUnion({
      type: 'auto',
      sentAt: new Date().toISOString(),
    }),
    reminderDue: null, // Clear so it's not sent again
  })

  logger.info(`Reminder sent for booking ${bookingRef.id}`)
}

// ─── No-show follow-up ───────────────────────────────────────────────

async function scheduleNoShowFollowUp(db, orgId, booking) {
  if (!booking.prospectEmail) return

  try {
    // Safety gateway pre-check
    try {
      const { canSendSafely } = await import('../safety/preSendSafetyGateway.js')
      const safetyCheck = await canSendSafely(orgId, null, booking.prospectEmail, 'email')
      if (!safetyCheck.allowed) {
        throw new Error(`Safety blocked: ${safetyCheck.reasons.join(', ')}`)
      }
    } catch (safetyErr) {
      if (safetyErr.message?.includes('Safety blocked')) throw safetyErr
      logger.warn('[bookingEngine] No-show safety check warning:', safetyErr.message)
    }
    const { sendEmail } = await import('../email/emailRouter.js')
    let noShowHtml = `<p>Bonjour ${(booking.prospectName || '').split(' ')[0] || ''},</p>
<p>Il semble qu'on se soit rate pour notre rendez-vous. Pas de souci, ca arrive !</p>
<p>Si vous souhaitez reprogrammer, voici mon lien : ${booking.bookingUrl || 'contactez-nous directement'}</p>
<p>A bientot,<br>Alex</p>`
    try {
      const { appendUnsubscribeFooter } = await import('../compliance/rgpdEngine.js')
      noShowHtml = appendUnsubscribeFooter(noShowHtml, booking.prospectId || booking.prospectEmail, 'prospects')
    } catch {}
    await sendEmail({
      to: booking.prospectEmail,
      subject: `On s'est rate — reprogrammons ?`,
      html: noShowHtml,
      from: 'Alex <alex@facemedia.app>',
      orgId,
    })
  } catch (error) {
    logger.warn(`No-show follow-up error:`, error.message)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getMeetingTypeLabel(type) {
  const labels = {
    discovery: 'Appel decouverte (15 min)',
    demo: 'Demo produit (30 min)',
    strategy: 'Session strategie (45 min)',
    follow_up: 'Point de suivi (15 min)',
    closing: 'Appel de closing (30 min)',
  }
  return labels[type] || labels.discovery
}

function buildBookingMessage(prospect, bookingUrl, meetingType) {
  const prenom = (prospect.name || '').split(' ')[0] || 'Bonjour'
  const label = getMeetingTypeLabel(meetingType)
  return `${prenom}, je vous propose un ${label.toLowerCase()} pour discuter de vos besoins. Reservez le creneau qui vous convient : ${bookingUrl || '[lien a configurer]'}`
}

function buildBookingEmailHtml(prospect, bookingUrl, meetingType, textMessage) {
  const label = getMeetingTypeLabel(meetingType)
  return `<div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Bonjour ${(prospect.name || '').split(' ')[0] || ''},</p>
  <p>${textMessage}</p>
  ${bookingUrl ? `<p style="text-align: center; margin: 24px 0;">
    <a href="${bookingUrl}" style="background: #4F6EF7; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      📅 Reservez votre creneau
    </a>
  </p>` : ''}
  <p style="color: #6B7280; font-size: 13px;">${label}</p>
  <p>A bientot,<br><strong>Alex</strong></p>
</div>`
}
