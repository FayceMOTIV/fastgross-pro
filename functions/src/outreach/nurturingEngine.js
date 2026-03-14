/**
 * Nurturing Perpetuel — Systeme 2 (Alex V4)
 * Categorise les prospects en A/B/C et envoie des touchpoints automatiques.
 *
 * Categories :
 *  - A (Hot)  : score >= 70, touchpoint every 3 jours
 *  - B (Warm) : score >= 40, touchpoint every 7 jours
 *  - C (Cold) : score < 40,  touchpoint every 14 jours
 *
 * Touchpoint types (rotation) :
 *  1. Email contenu de valeur (tip, article, etude de cas)
 *  2. LinkedIn interaction (like, comment, share)
 *  3. Email social proof (temoignage client du meme secteur)
 *  4. SMS/WhatsApp micro-message personnel
 *  5. Email invite evenement/webinar
 *
 * Storage: organizations/{orgId}/nurturingQueues/{prospectId}
 * Worker: onSchedule every 2 hours — process due touchpoints
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Categories ──────────────────────────────────────────────────────

const CATEGORIES = {
  A: { label: 'Hot', minScore: 70, intervalDays: 3, maxTouchpoints: 15, color: '#EF4444' },
  B: { label: 'Warm', minScore: 40, intervalDays: 7, maxTouchpoints: 10, color: '#F59E0B' },
  C: { label: 'Cold', minScore: 0, intervalDays: 14, maxTouchpoints: 6, color: '#6B7280' },
}

// ─── Touchpoint templates (rotate through these) ─────────────────────

const TOUCHPOINT_TYPES = [
  {
    id: 'value_content',
    channel: 'email',
    label: 'Contenu de valeur',
    subjectTemplate: '💡 {tip_title} — pour {company}',
    bodyTemplate: `Bonjour {prenom},

Je partage regulierement des conseils pratiques pour les entreprises de {sector}.

Voici une astuce que nos clients appliquent souvent avec succes :

**{tip_title}**

{tip_content}

Si ca vous interesse, je peux vous montrer comment on le met en place concretement.

Bonne journee,
{sender_name}`,
  },
  {
    id: 'social_interaction',
    channel: 'linkedin',
    label: 'Interaction LinkedIn',
    actionTemplate: 'like_or_comment',
    messageTemplate: 'Excellent point {prenom} ! {comment}',
  },
  {
    id: 'social_proof',
    channel: 'email',
    label: 'Social proof',
    subjectTemplate: 'Comment {case_company} a obtenu {case_result}',
    bodyTemplate: `Bonjour {prenom},

Un de nos clients dans le secteur {sector} a recemment partage son experience :

"{case_testimonial}"
— {case_company}

Resultat : {case_result}

Souhaitez-vous qu'on regarde ensemble comment adapter cela a {company} ?

{sender_name}`,
  },
  {
    id: 'micro_message',
    channel: 'sms',
    label: 'Micro-message',
    messageTemplate: '{prenom}, petit check-in rapide : vous avez avance sur {topic} ? Je reste dispo si besoin. — {sender_name}',
  },
  {
    id: 'event_invite',
    channel: 'email',
    label: 'Invitation evenement',
    subjectTemplate: '📅 Webinar : {event_title}',
    bodyTemplate: `Bonjour {prenom},

On organise un webinar sur "{event_title}" le {event_date}.

C'est gratuit et ca dure 30 min. On y partage des strategies concretes pour {sector}.

Lien d'inscription : {event_link}

A bientot,
{sender_name}`,
  },
]

// ─── Callable: enroll prospect in nurturing ──────────────────────────

export const enrollInNurturing = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, category: forcedCategory } = request.data || {}
  if (!orgId || !prospectId) throw new HttpsError('invalid-argument', 'orgId et prospectId requis')

  const db = getDb()
  const result = await enrollProspect(db, orgId, prospectId, forcedCategory)
  return { success: true, ...result }
})

// ─── Callable: get nurturing status ──────────────────────────────────

export const getNurturingStatus = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  const snap = await db.collection('organizations').doc(orgId)
    .collection('nurturingQueues')
    .where('status', '==', 'active')
    .orderBy('nextTouchpointAt', 'asc')
    .limit(100)
    .get()

  const prospects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const byCategory = { A: 0, B: 0, C: 0 }
  for (const p of prospects) byCategory[p.category] = (byCategory[p.category] || 0) + 1

  return { total: prospects.length, byCategory, queue: prospects.slice(0, 20) }
})

// ─── Callable: pause/resume nurturing ────────────────────────────────

export const toggleNurturing = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, action } = request.data || {}
  if (!orgId || !prospectId || !action) throw new HttpsError('invalid-argument', 'orgId, prospectId, action requis')

  const db = getDb()
  const ref = db.collection('organizations').doc(orgId).collection('nurturingQueues').doc(prospectId)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Prospect non enregistre dans le nurturing')

  if (action === 'pause') {
    await ref.update({ status: 'paused', pausedAt: FieldValue.serverTimestamp() })
  } else if (action === 'resume') {
    await ref.update({ status: 'active', resumedAt: FieldValue.serverTimestamp(), nextTouchpointAt: new Date() })
  } else if (action === 'stop') {
    await ref.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() })
  }

  return { success: true, action, prospectId }
})

// ─── Worker: process due touchpoints ─────────────────────────────────

export const nurturingWorker = onSchedule({
  schedule: 'every 2 hours',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  const db = getDb()
  const now = new Date()

  // Check business hours (8h-20h Europe/Paris)
  const parisHour = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getHours()
  if (parisHour < 8 || parisHour >= 20) {
    logger.info('Nurturing Worker: hors heures ouvrables')
    return
  }

  // Get all orgs with nurturing enabled
  const orgsSnap = await db.collection('organizations').get()
  let totalProcessed = 0

  for (const orgDoc of orgsSnap.docs) {
    try {
      const orgData = orgDoc.data()
      if (orgData.prospectionEnabled === false) continue

      // Get due touchpoints
      const dueSnap = await db.collection('organizations').doc(orgDoc.id)
        .collection('nurturingQueues')
        .where('status', '==', 'active')
        .where('nextTouchpointAt', '<=', now)
        .limit(20)
        .get()

      if (dueSnap.empty) continue

      for (const qDoc of dueSnap.docs) {
        const queue = qDoc.data()
        const processed = await processTouchpoint(db, orgDoc.id, qDoc.id, queue)
        if (processed) totalProcessed++
      }
    } catch (error) {
      logger.error(`Nurturing error for org=${orgDoc.id}:`, error.message)
    }
  }

  logger.info(`Nurturing Worker: ${totalProcessed} touchpoints traites`)
})

// ─── Core functions ──────────────────────────────────────────────────

export async function enrollProspect(db, orgId, prospectId, forcedCategory) {
  // Get prospect data
  const prospectDoc = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()

  if (!prospectDoc.exists) throw new Error('Prospect introuvable')
  const prospect = { id: prospectDoc.id, ...prospectDoc.data() }

  // Determine category
  const score = prospect.score || prospect.bantScore || 0
  let category = forcedCategory
  if (!category) {
    if (score >= CATEGORIES.A.minScore) category = 'A'
    else if (score >= CATEGORIES.B.minScore) category = 'B'
    else category = 'C'
  }

  const catConfig = CATEGORIES[category]
  const nextTouchpoint = new Date()
  nextTouchpoint.setDate(nextTouchpoint.getDate() + 1) // First touchpoint in 1 day

  const queueData = {
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    company: prospect.company || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    sector: prospect.sector || prospect.niche || '',
    score,
    category,
    categoryLabel: catConfig.label,
    intervalDays: catConfig.intervalDays,
    maxTouchpoints: catConfig.maxTouchpoints,
    touchpointCount: 0,
    currentStep: 0,
    status: 'active',
    enrolledAt: FieldValue.serverTimestamp(),
    nextTouchpointAt: nextTouchpoint,
    lastTouchpointAt: null,
    touchpointHistory: [],
  }

  await db.collection('organizations').doc(orgId)
    .collection('nurturingQueues').doc(prospectId).set(queueData)

  // Update prospect status
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).update({
      nurturingCategory: category,
      nurturingStatus: 'active',
      nurturingEnrolledAt: FieldValue.serverTimestamp(),
    })

  logger.info(`Enrolled prospect ${prospectId} in nurturing category ${category}`)
  return { category, categoryLabel: catConfig.label, intervalDays: catConfig.intervalDays }
}

async function processTouchpoint(db, orgId, prospectId, queue) {
  // Check max touchpoints
  if (queue.touchpointCount >= queue.maxTouchpoints) {
    await db.collection('organizations').doc(orgId)
      .collection('nurturingQueues').doc(prospectId).update({
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        completionReason: 'max_touchpoints_reached',
      })
    return false
  }

  // Check if prospect has replied (pause nurturing)
  const repliedSnap = await db.collection('organizations').doc(orgId)
    .collection('interactions')
    .where('prospectId', '==', prospectId)
    .where('direction', '==', 'inbound')
    .where('createdAt', '>', queue.enrolledAt || new Date(0))
    .limit(1)
    .get()

  if (!repliedSnap.empty) {
    await db.collection('organizations').doc(orgId)
      .collection('nurturingQueues').doc(prospectId).update({
        status: 'paused',
        pausedAt: FieldValue.serverTimestamp(),
        pauseReason: 'prospect_replied',
      })
    return false
  }

  // Get current touchpoint type (rotate through types)
  const stepIndex = queue.currentStep % TOUCHPOINT_TYPES.length
  const touchpoint = TOUCHPOINT_TYPES[stepIndex]

  // Generate content
  const content = generateTouchpointContent(touchpoint, queue)

  // Log the touchpoint (actual sending delegated to channel dispatcher)
  const touchpointLog = {
    step: queue.currentStep + 1,
    type: touchpoint.id,
    channel: touchpoint.channel,
    label: touchpoint.label,
    content: content.preview,
    scheduledAt: FieldValue.serverTimestamp(),
    status: 'queued',
  }

  // Try to dispatch via channel
  try {
    if (touchpoint.channel === 'email' && queue.email) {
      const { sendEmail } = await import('../email/emailRouter.js')
      await sendEmail({
        to: queue.email,
        subject: content.subject,
        html: `<p>${content.body.replace(/\n/g, '<br>')}</p>`,
        from: 'Alex <alex@facemedia.app>',
        orgId,
      })
      touchpointLog.status = 'sent'
    } else if (touchpoint.channel === 'sms' && queue.phone) {
      const { sendSMS } = await import('../channels/sms/ovhSmsProvider.js')
      await sendSMS(orgId, prospectId, content.message)
      touchpointLog.status = 'sent'
    } else {
      touchpointLog.status = 'skipped'
      touchpointLog.skipReason = `${touchpoint.channel}: pas de coordonnees`
    }
  } catch (error) {
    touchpointLog.status = 'error'
    touchpointLog.error = error.message
  }

  // Calculate next touchpoint
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + queue.intervalDays)

  // Update queue
  await db.collection('organizations').doc(orgId)
    .collection('nurturingQueues').doc(prospectId).update({
      touchpointCount: FieldValue.increment(1),
      currentStep: queue.currentStep + 1,
      lastTouchpointAt: FieldValue.serverTimestamp(),
      nextTouchpointAt: nextDate,
      touchpointHistory: FieldValue.arrayUnion(touchpointLog),
    })

  // Log interaction
  await db.collection('organizations').doc(orgId)
    .collection('interactions').add({
      prospectId,
      prospectName: queue.prospectName,
      channel: touchpoint.channel,
      type: 'nurturing',
      direction: 'outbound',
      content: content.preview,
      status: touchpointLog.status,
      nurturingStep: queue.currentStep + 1,
      nurturingCategory: queue.category,
      createdAt: FieldValue.serverTimestamp(),
    })

  return true
}

function generateTouchpointContent(touchpoint, queue) {
  const vars = {
    prenom: (queue.prospectName || '').split(' ')[0] || 'Bonjour',
    company: queue.company || 'votre entreprise',
    sector: queue.sector || 'votre secteur',
    sender_name: 'Alex',
    tip_title: getTipForSector(queue.sector),
    tip_content: getTipContent(queue.sector),
    case_company: 'un client du meme secteur',
    case_result: 'des resultats concrets en 30 jours',
    case_testimonial: 'L\'accompagnement nous a permis de structurer notre prospection et d\'obtenir des resultats mesurables.',
    topic: queue.sector || 'votre projet',
    event_title: `Strategies ${queue.sector || 'business'} 2026`,
    event_date: 'bientot',
    event_link: '#',
    comment: 'Tres pertinent !',
  }

  const render = (template) => {
    if (!template) return ''
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`)
  }

  if (touchpoint.channel === 'email') {
    return {
      subject: render(touchpoint.subjectTemplate),
      body: render(touchpoint.bodyTemplate),
      preview: render(touchpoint.subjectTemplate),
    }
  } else if (touchpoint.channel === 'sms') {
    return {
      message: render(touchpoint.messageTemplate),
      preview: render(touchpoint.messageTemplate).substring(0, 80),
    }
  } else {
    return {
      message: render(touchpoint.messageTemplate || touchpoint.actionTemplate),
      preview: touchpoint.label,
    }
  }
}

function getTipForSector(sector) {
  const tips = {
    restaurant: '3 strategies pour doubler vos reservations en ligne',
    immobilier: 'Comment generer 5x plus de leads vendeurs',
    ecommerce: 'Les 3 leviers pour augmenter votre panier moyen de 25%',
    saas: 'Comment reduire votre churn de 40% en 90 jours',
    artisan: 'Comment obtenir 10 avis Google en 30 jours',
    default: '3 strategies de croissance testees par nos clients',
  }
  return tips[sector?.toLowerCase()] || tips.default
}

function getTipContent(sector) {
  return 'Nos clients qui appliquent cette methode voient en moyenne une amelioration de 30% de leurs resultats en 60 jours.'
}
