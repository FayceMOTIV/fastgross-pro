/**
 * Sniper Follow-Up Sequence — Super Pouvoir 9 (Alex V4)
 * 8 touchpoints multicanal, chaque relance change d'angle ET de format.
 *
 * REGLE CRITIQUE: Si le prospect REPOND sur N'IMPORTE QUEL canal,
 * TOUS les autres canaux se mettent en pause immediatement.
 *
 * Steps:
 *  1. Email   — Texte signal-based        (J0)
 *  2. LinkedIn — Connexion + note          (J2)
 *  3. Email   — Micro-gift attache         (J5)
 *  4. LinkedIn — Note vocale 30s           (J8)
 *  5. Email   — Video personnalisee        (J11)
 *  6. WhatsApp/SMS — Message court         (J14)
 *  7. LinkedIn — Commentaire sur post      (J17)
 *  8. Email   — Breakup email              (J21)
 *
 * Storage: organizations/{orgId}/sniperSequences/{sequenceId}
 * Worker: scheduled every hour to process due steps
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { canSendSafely } from '../safety/preSendSafetyGateway.js'
import { validateEmailContent } from '../safety/antiSpamContentGuard.js'
import { appendUnsubscribeFooter } from '../compliance/rgpdEngine.js'

const getDb = () => getFirestore()

// ─── Sequence steps definition ──────────────────────────────────────

const SEQUENCE_STEPS = [
  {
    step: 1, day: 0, channel: 'email',
    format: 'signal_text', angle: 'signal_reference',
    description: 'Email signal-based — reference le signal + question'
  },
  {
    step: 2, day: 2, channel: 'linkedin',
    format: 'connection_note', angle: 'casual',
    description: 'LinkedIn connexion + note — ton decontracte, mention du signal'
  },
  {
    step: 3, day: 5, channel: 'email',
    format: 'micro_gift', angle: 'value_first',
    description: 'Email avec micro-gift — PDF audit / liste prospects'
  },
  {
    step: 4, day: 8, channel: 'linkedin',
    format: 'voice_note', angle: 'human_touch',
    description: 'LinkedIn note vocale 30s — voix humaine, mentionne le signal'
  },
  {
    step: 5, day: 11, channel: 'email',
    format: 'video', angle: 'personalized_demo',
    description: 'Email video personnalisee — Loom/Sendspark avec site en fond'
  },
  {
    step: 6, day: 14, channel: 'sms',
    format: 'short_message', angle: 'direct',
    description: 'SMS/WhatsApp message court — "J\'ai essaye de vous joindre"'
  },
  {
    step: 7, day: 17, channel: 'linkedin',
    format: 'public_comment', angle: 'social_proof',
    description: 'LinkedIn commentaire sur post — interaction publique de valeur'
  },
  {
    step: 8, day: 21, channel: 'email',
    format: 'breakup', angle: 'light_goodbye',
    description: 'Email breakup — ton leger, derniere chance'
  }
]

// ─── Content templates per step ─────────────────────────────────────

const STEP_CONTENT = {
  // Step 3: Micro-gift email
  micro_gift: {
    subject: '{prenom}, un cadeau pour {entreprise}',
    body: `Bonjour {prenom},

Suite a mon message, j'ai prepare un document gratuit pour {entreprise} :
"{gift_title}"

C'est un {gift_type} personnalise base sur {signal_source}. Aucune contrepartie.

{gift_link}

Bonne lecture !`
  },

  // Step 5: Video email
  video: {
    subject: 'J\'ai fait une video de 60s pour {entreprise}',
    body: `Bonjour {prenom},

J'ai pris 60 secondes pour analyser {domain} et j'ai decouvert 3 choses interessantes.

Plutot que de vous les ecrire, j'ai fait une courte video : {video_link}

Ca vaut le coup d'oeil (vraiment 60s, pas plus).`
  },

  // Step 6: SMS/WhatsApp short
  short_message: {
    body: `Bonjour {prenom}, j'ai essaye de vous joindre par email. J'ai {value_prop} pour {entreprise}. 5 min ? {link}`
  },

  // Step 8: Breakup email
  breakup: {
    subject: 'Derniere tentative — {prenom}',
    body: `Bonjour {prenom},

C'est mon dernier message. Si le timing n'est pas bon, je comprends parfaitement.

Juste au cas ou : {one_liner_value}.

Si un jour le sujet revient, vous savez ou me trouver. Je vous souhaite une excellente continuation !

PS: Pas de rancune, je retire votre email de ma liste.`
  },

  // Step 2: LinkedIn connection note
  connection_note: {
    body: `Bonjour {prenom} ! J'ai decouvert {entreprise} via {signal_source} et je trouve {element_positif} impressionnant. J'adorerais echanger.`
  },

  // Step 7: LinkedIn public comment
  public_comment: {
    body: `Excellent post {prenom} ! {comment_value}. On accompagne des {niche} sur ce sujet — les retours sont {social_proof_stat}.`
  }
}

// ─── Create sequence ────────────────────────────────────────────────

export const createSniperSequence = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '256MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectId, signalType, customSteps } = request.data || {}
  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  }
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const result = await initSniperSequence(db, orgId, prospectId, signalType, request.auth.uid, customSteps)

  return { success: true, ...result }
})

// ─── Scheduled worker: process due steps ────────────────────────────

export const sniperSequenceWorker = onSchedule({
  schedule: 'every 1 hours',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  logger.info('🎯 Sniper Worker: processing due steps')

  const db = getDb()
  const now = new Date()
  const stats = { processed: 0, sent: 0, paused: 0, completed: 0, errors: 0 }

  // Find all active sequences with due steps
  const sequencesSnap = await db.collectionGroup('sniperSequences')
    .where('status', '==', 'active')
    .where('nextStepDate', '<=', now)
    .limit(50)
    .get()

  for (const seqDoc of sequencesSnap.docs) {
    try {
      const sequence = { id: seqDoc.id, ...seqDoc.data() }
      const orgId = seqDoc.ref.parent.parent.id
      stats.processed++

      // Check for cross-channel reply before processing
      const hasReply = await checkCrossChannelReply(db, orgId, sequence.prospectId, sequence.createdAt)
      if (hasReply) {
        await pauseSequence(db, orgId, sequence.id, 'reply_detected')
        stats.paused++
        continue
      }

      // Check business hours (8h-20h Europe/Paris)
      const parisHour = getParisHour()
      if (parisHour < 8 || parisHour >= 20) {
        continue // Skip, will retry next hour
      }

      // Execute current step
      const stepResult = await executeStep(db, orgId, sequence)
      if (stepResult.sent) stats.sent++
      if (stepResult.completed) stats.completed++

    } catch (err) {
      logger.error(`Error processing sequence ${seqDoc.id}:`, err)
      stats.errors++
    }
  }

  logger.info('🎯 Sniper Worker: done', stats)
})

// ─── Pause sequence (callable — for manual or auto pause) ───────────

export const pauseSniperSequence = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, sequenceId, reason } = request.data || {}
  if (!orgId || !sequenceId) {
    throw new HttpsError('invalid-argument', 'orgId et sequenceId requis')
  }
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  await pauseSequence(db, orgId, sequenceId, reason || 'manual')

  return { success: true }
})

// ─── Get sequence status ────────────────────────────────────────────

export const getSniperSequenceStatus = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectId } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  let query = db.collection('organizations').doc(orgId)
    .collection('sniperSequences')
    .orderBy('createdAt', 'desc')
    .limit(20)

  if (prospectId) {
    query = db.collection('organizations').doc(orgId)
      .collection('sniperSequences')
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(5)
  }

  const snap = await query.get()
  const sequences = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || null,
    nextStepDate: d.data().nextStepDate?.toDate?.() || null
  }))

  return { success: true, sequences }
})

// ─── Core: initialize sequence ──────────────────────────────────────

export async function initSniperSequence(db, orgId, prospectId, signalType, userId, customSteps) {
  // Load prospect
  const prospectSnap = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()

  if (!prospectSnap.exists) {
    throw new HttpsError('not-found', 'Prospect non trouve')
  }

  const prospect = prospectSnap.data()

  // Check if there's already an active sequence for this prospect
  const existingSnap = await db.collection('organizations').doc(orgId)
    .collection('sniperSequences')
    .where('prospectId', '==', prospectId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return {
      sequenceId: existingSnap.docs[0].id,
      status: 'already_active',
      message: 'Sequence deja active pour ce prospect'
    }
  }

  // Determine available channels
  const availableChannels = detectAvailableChannels(prospect)

  // Build steps (filter by available channels)
  const steps = (customSteps || SEQUENCE_STEPS).map(step => {
    const available = availableChannels.includes(step.channel)
    return {
      ...step,
      status: available ? 'pending' : 'skipped',
      skipReason: available ? null : `Canal ${step.channel} non disponible`,
      scheduledDate: addDays(new Date(), step.day),
      sentAt: null,
      response: null
    }
  })

  // Find first pending step
  const firstPending = steps.find(s => s.status === 'pending')

  // Create sequence document
  const sequenceRef = db.collection('organizations').doc(orgId)
    .collection('sniperSequences').doc()

  await sequenceRef.set({
    prospectId,
    prospectName: prospect.fullName || prospect.companyName || '',
    prospectEmail: prospect.email || '',
    signalType: signalType || prospect.signal_type || 'unknown',
    signalDetail: prospect.signal_detail || '',
    status: 'active',
    currentStep: firstPending?.step || 1,
    totalSteps: steps.length,
    activeSteps: steps.filter(s => s.status === 'pending').length,
    steps,
    availableChannels,
    nextStepDate: firstPending?.scheduledDate || null,
    pausedAt: null,
    pauseReason: null,
    completedAt: null,
    createdBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })

  // Update prospect status
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)
    .update({
      status: 'warming',
      sniperSequenceId: sequenceRef.id,
      sniperSequenceStep: 1,
      updatedAt: FieldValue.serverTimestamp()
    })

  logger.info(`🎯 Sniper sequence created for prospect ${prospectId} in org ${orgId}`)

  return {
    sequenceId: sequenceRef.id,
    status: 'created',
    activeSteps: steps.filter(s => s.status === 'pending').length,
    totalSteps: steps.length,
    firstStepDate: firstPending?.scheduledDate || null
  }
}

// ─── Execute a single step ──────────────────────────────────────────

async function executeStep(db, orgId, sequence) {
  const currentStepIndex = sequence.steps.findIndex(s => s.step === sequence.currentStep && s.status === 'pending')
  if (currentStepIndex === -1) {
    // No more pending steps — mark complete
    await completeSequence(db, orgId, sequence.id)
    return { sent: false, completed: true }
  }

  const step = sequence.steps[currentStepIndex]
  let sent = false

  try {
    // Execute based on channel
    switch (step.channel) {
      case 'email': {
        // Safety gateway check before send
        const safetyResult = await canSendSafely(orgId, sequence.prospectId, sequence.prospectEmail, 'email')
        if (!safetyResult.allowed) {
          logger.warn(`[SniperSeq] Blocked by safety: ${safetyResult.reasons.join(', ')}`)
          break
        }

        // Touchpoint limiter check
        const { canAddTouchpoint: canAddEmailTp, recordTouchpoint: recordEmailTp } = await import('../engine/touchpointLimiter.js')
        const emailTpCheck = await canAddEmailTp(orgId, sequence.prospectId, 'email')
        if (!emailTpCheck.allowed) {
          logger.warn(`[SniperSeq] Touchpoint limit reached for email: ${emailTpCheck.reason}`)
          break
        }

        const { generateEmail } = await import('./signalEmail.js')
        const emailData = await generateEmail(db, orgId, sequence.prospectId, sequence.signalType)

        // Si step video → generer la video personnalisee avant d'envoyer
        let videoUrl = null
        if (step.format === 'video') {
          try {
            const { generatePersonalizedVideo } = await import('../superPowers/personalizedVideo.js')
            const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${sequence.prospectId}`).get()
            const prospect = prospectDoc.exists ? { id: prospectDoc.id, ...prospectDoc.data(), orgId } : { id: sequence.prospectId, name: sequence.prospectName, orgId }
            const orgDoc = await db.doc(`organizations/${orgId}`).get()
            const orgData = orgDoc.data() || {}
            const clientConfig = {
              orgId,
              companyName: orgData.companyName || orgData.name || 'Face Media Factory',
              niche: orgData.niche || orgData.sector || 'B2B',
              value_prop: orgData.valueProp || orgData.value_prop || 'nos services',
              tavusReplicaId: orgData.videoConfig?.tavusReplicaId,
              heygenAvatarId: orgData.videoConfig?.heygenAvatarId,
            }
            const videoResult = await generatePersonalizedVideo(prospect, clientConfig)
            if (videoResult.success && videoResult.videoUrl) {
              videoUrl = videoResult.videoUrl
            }
          } catch (videoErr) {
            console.warn('[SniperSeq] Video generation failed, sending email without video:', videoErr.message)
          }
        }

        // Adapt email based on step format
        const adaptedEmail = adaptEmailForStep(emailData, step, sequence, videoUrl)
        await validateEmailContent(adaptedEmail.subject, adaptedEmail.body)

        const { sendEmail } = await import('../email/emailRouter.js')
        const htmlWithFooter = appendUnsubscribeFooter(formatHtml(adaptedEmail.body), sequence.prospectId, 'prospects')
        await sendEmail({
          to: sequence.prospectEmail,
          subject: adaptedEmail.subject,
          html: htmlWithFooter,
          from: 'Alex <alex@facemedia.app>',
          orgId,
          prospectId: sequence.prospectId
        })
        await recordEmailTp(orgId, sequence.prospectId, 'email')
        sent = true
        break
      }

      case 'sms': {
        if (sequence.availableChannels.includes('sms')) {
          // Touchpoint limiter check
          const { canAddTouchpoint: canAddSmsTp, recordTouchpoint: recordSmsTp } = await import('../engine/touchpointLimiter.js')
          const smsTpCheck = await canAddSmsTp(orgId, sequence.prospectId, 'sms')
          if (!smsTpCheck.allowed) {
            logger.warn(`[SniperSeq] Touchpoint limit reached for sms: ${smsTpCheck.reason}`)
            break
          }
          // Generate short message
          const content = renderStepContent(STEP_CONTENT.short_message, sequence)
          const { dispatchMessage } = await import('../engine/channelDispatcher.js')
          await dispatchMessage(
            orgId,
            sequence.prospectId,
            { channel: 'sms', message: content.body }
          ).catch(() => { /* SMS fallback — non-blocking */ })
          await recordSmsTp(orgId, sequence.prospectId, 'sms')
          sent = true
        }
        break
      }

      case 'linkedin': {
        const { canAddTouchpoint: canAddLiTp, recordTouchpoint: recordLiTp } = await import('../engine/touchpointLimiter.js')
        const liTpCheck = await canAddLiTp(orgId, sequence.prospectId, 'linkedin')
        if (!liTpCheck.allowed) break

        // Load LinkedIn config for this org
        const liConfigDoc = await db.doc(`organizations/${orgId}/integrations/linkedin`).get()
        const liConfig = liConfigDoc.exists ? liConfigDoc.data() : null
        const liAccountId = liConfig?.accountId || liConfig?.defaultAccountId

        if (!liAccountId || !liConfig?.apiKey) {
          logger.info(`[sniperSequence] LinkedIn skipped for ${sequence.id}: no accountId/apiKey configured`)
          break // sent stays false → marked as 'failed'
        }

        const linkedinUrl = sequence.linkedinUrl || sequence.prospectLinkedinUrl
        if (!linkedinUrl) {
          logger.info(`[sniperSequence] LinkedIn skipped for ${sequence.id}: no prospect LinkedIn URL`)
          break
        }

        try {
          const { sendConnectionRequest, sendMessage: sendLiMessage } = await import('../hunters/linkedin/linkedinService.js')
          const content = renderStepContent(STEP_CONTENT.linkedin_message || STEP_CONTENT.short_message, sequence)
          const stepType = step.subType || step.linkedinAction || 'connection'

          let result
          if (stepType === 'message' || stepType === 'voice_note') {
            result = await sendLiMessage(liAccountId, linkedinUrl, content.body, { apiKey: liConfig.apiKey })
          } else {
            // Default: connection request
            result = await sendLiMessage ? await sendConnectionRequest(liAccountId, linkedinUrl, content.body, { apiKey: liConfig.apiKey }) : null
          }

          if (result?.success) {
            await recordLiTp(orgId, sequence.prospectId, 'linkedin')
            sent = true
          } else {
            logger.warn(`[sniperSequence] LinkedIn API failed for ${sequence.id}:`, result?.error)
          }
        } catch (liErr) {
          logger.warn(`[sniperSequence] LinkedIn error for ${sequence.id}:`, liErr.message)
        }
        break
      }
    }
  } catch (err) {
    logger.warn(`Error executing step ${step.step} for sequence ${sequence.id}:`, err.message)
  }

  // Update step status and advance to next
  const updatedSteps = [...sequence.steps]
  updatedSteps[currentStepIndex] = {
    ...step,
    status: sent ? 'sent' : 'failed',
    sentAt: new Date().toISOString()
  }

  // Find next pending step
  const nextStep = updatedSteps.find(s => s.status === 'pending')

  const updateData = {
    steps: updatedSteps,
    currentStep: nextStep ? nextStep.step : sequence.currentStep,
    nextStepDate: nextStep ? nextStep.scheduledDate : null,
    updatedAt: FieldValue.serverTimestamp()
  }

  if (!nextStep) {
    updateData.status = 'completed'
    updateData.completedAt = FieldValue.serverTimestamp()
  }

  await db.collection('organizations').doc(orgId)
    .collection('sniperSequences').doc(sequence.id)
    .update(updateData)

  // Update prospect
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(sequence.prospectId)
    .update({
      status: sent ? 'contacted' : 'warming',
      sniperSequenceStep: step.step,
      lastContactedAt: sent ? FieldValue.serverTimestamp() : null,
      lastContactChannel: sent ? step.channel : null,
      updatedAt: FieldValue.serverTimestamp()
    })

  // Log interaction
  if (sent) {
    await db.collection('organizations').doc(orgId)
      .collection('interactions').add({
        prospectId: sequence.prospectId,
        channel: step.channel,
        direction: 'outbound',
        type: 'sniper_sequence',
        sequenceId: sequence.id,
        step: step.step,
        format: step.format,
        angle: step.angle,
        description: step.description,
        createdAt: FieldValue.serverTimestamp()
      })
  }

  return { sent, completed: !nextStep }
}

// ─── Cross-channel reply detection ──────────────────────────────────

async function checkCrossChannelReply(db, orgId, prospectId, sequenceCreatedAt) {
  // Check interactions for ANY inbound reply after sequence start
  const repliesSnap = await db.collection('organizations').doc(orgId)
    .collection('interactions')
    .where('prospectId', '==', prospectId)
    .where('direction', '==', 'inbound')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get()

  if (repliesSnap.empty) return false

  // Check if any reply came after the sequence started
  const startDate = sequenceCreatedAt?.toDate?.() || new Date(0)
  return repliesSnap.docs.some(doc => {
    const replyDate = doc.data().createdAt?.toDate?.() || new Date(0)
    return replyDate > startDate
  })
}

// ─── Pause all channels ─────────────────────────────────────────────

async function pauseSequence(db, orgId, sequenceId, reason) {
  await db.collection('organizations').doc(orgId)
    .collection('sniperSequences').doc(sequenceId)
    .update({
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      pauseReason: reason,
      updatedAt: FieldValue.serverTimestamp()
    })

  logger.info(`🎯 Sequence ${sequenceId} paused: ${reason}`)
}

async function completeSequence(db, orgId, sequenceId) {
  await db.collection('organizations').doc(orgId)
    .collection('sniperSequences').doc(sequenceId)
    .update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
}

// ─── Helpers ────────────────────────────────────────────────────────

function detectAvailableChannels(prospect) {
  const channels = ['email'] // Email is always attempted (even without address, for enrichment)

  if (prospect.email) channels.push('email')
  if (prospect.phone) channels.push('sms')
  if (prospect.linkedin || prospect.linkedinUrl) channels.push('linkedin')
  if (prospect.whatsappNumber || prospect.phone) channels.push('whatsapp')

  return [...new Set(channels)]
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getParisHour() {
  const now = new Date()
  const parisTime = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false
  }).format(now)
  return parseInt(parisTime, 10)
}

function adaptEmailForStep(emailData, step, sequence, videoUrl) {
  if (step.format === 'breakup') {
    return {
      subject: `Derniere tentative — ${sequence.prospectName?.split(' ')[0] || ''}`,
      body: renderStepContent(STEP_CONTENT.breakup, sequence).body
    }
  }

  if (step.format === 'micro_gift') {
    return {
      subject: renderTemplate(STEP_CONTENT.micro_gift.subject, sequence),
      body: renderTemplate(STEP_CONTENT.micro_gift.body, {
        ...sequence,
        gift_title: '5 actions prioritaires pour votre activite',
        gift_type: 'mini-audit',
        gift_link: '[lien genere automatiquement]',
        signal_source: sequence.signalDetail || 'notre analyse'
      })
    }
  }

  if (step.format === 'video') {
    const link = videoUrl || '[video en cours de generation]'
    return {
      subject: renderTemplate(STEP_CONTENT.video.subject, sequence),
      body: renderTemplate(STEP_CONTENT.video.body, {
        ...sequence,
        domain: sequence.prospectEmail?.split('@')[1] || '',
        video_link: link
      })
    }
  }

  // Default: use signal email as-is
  return emailData
}

function renderStepContent(template, context) {
  const vars = {
    prenom: context.prospectName?.split(' ')[0] || '',
    entreprise: context.prospectName || '',
    domain: context.prospectEmail?.split('@')[1] || '',
    signal_source: context.signalDetail || '',
    niche: context.signalType || '',
    value_prop: 'une analyse gratuite',
    one_liner_value: 'on aide des entreprises comme la votre a obtenir plus de clients',
    link: '',
    ...context
  }

  return {
    subject: template.subject ? renderTemplate(template.subject, vars) : null,
    body: renderTemplate(template.body, vars)
  }
}

function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== '' ? vars[key] : match
  })
}

function formatHtml(body) {
  return body.split('\n\n').filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.5;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
