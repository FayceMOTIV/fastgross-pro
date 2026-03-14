/**
 * Social Warming — Super Pouvoir 8 (Alex V4)
 * Sequence de pre-chauffage LinkedIn J-7 a J0 avant le premier email.
 *
 * Flow :
 *  1. Prospect inscrit en warming (via Alex ou manuellement)
 *  2. J-7 : Visite profil LinkedIn
 *  3. J-5 : Like un post recent
 *  4. J-3 : Commentaire pertinent sur un post
 *  5. J-1 : Follow / connexion LinkedIn
 *  6. J0  : Premier email envoye (le prospect "connait" deja la marque)
 *
 * Resultat : taux d'ouverture x2-3 vs cold email pur.
 *
 * Storage: organizations/{orgId}/socialWarming/{warmingId}
 * Worker: toutes les 2h — execute les touchpoints dus
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Warming sequence definition ─────────────────────────────────────

const WARMING_STEPS = [
  {
    day: -7,
    type: 'profile_visit',
    label: 'Visite du profil LinkedIn',
    channel: 'linkedin',
    instruction: 'Visiter le profil LinkedIn du prospect pour generer une notification',
  },
  {
    day: -5,
    type: 'like_post',
    label: 'Like d\'un post recent',
    channel: 'linkedin',
    instruction: 'Liker le post le plus recent du prospect sur LinkedIn',
  },
  {
    day: -3,
    type: 'comment_post',
    label: 'Commentaire pertinent',
    channel: 'linkedin',
    instruction: 'Commenter de maniere pertinente et utile sur un post du prospect',
  },
  {
    day: -1,
    type: 'connect',
    label: 'Demande de connexion',
    channel: 'linkedin',
    instruction: 'Envoyer une demande de connexion avec note personnalisee',
  },
  {
    day: 0,
    type: 'first_email',
    label: 'Premier email personnalise',
    channel: 'email',
    instruction: 'Envoyer le premier email — le prospect connait deja la marque',
  },
]

// ─── Callable: enroll prospect in warming ────────────────────────────

export const enrollInSocialWarming = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, emailDay0Subject, emailDay0Body, linkedinProfileUrl } = request.data || {}
  if (!orgId || !prospectId) throw new HttpsError('invalid-argument', 'orgId et prospectId requis')

  const db = getDb()

  // Check prospect exists
  const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!pDoc.exists) throw new HttpsError('not-found', 'Prospect introuvable')

  // Check not already warming
  const existingSnap = await db.collection(`organizations/${orgId}/socialWarming`)
    .where('prospectId', '==', prospectId)
    .where('status', '==', 'active')
    .limit(1)
    .get()
  if (!existingSnap.empty) throw new HttpsError('already-exists', 'Prospect deja en warming')

  const prospect = pDoc.data()
  const now = new Date()

  // Build warming timeline
  const steps = WARMING_STEPS.map(step => {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + (step.day + 7)) // shift so J-7 = today
    return {
      ...step,
      targetDate: targetDate.toISOString().split('T')[0],
      status: 'pending',
      executedAt: null,
    }
  })

  const ref = await db.collection(`organizations/${orgId}/socialWarming`).add({
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    prospectEmail: prospect.email || '',
    linkedinUrl: linkedinProfileUrl || prospect.linkedin || '',
    emailDay0Subject: emailDay0Subject || '',
    emailDay0Body: emailDay0Body || '',
    steps,
    status: 'active',
    currentStep: 0,
    enrolledAt: FieldValue.serverTimestamp(),
    enrolledBy: request.auth.uid,
    completedAt: null,
  })

  logger.info(`Social Warming: prospect ${prospectId} enrolled for org ${orgId}`)
  return { success: true, warmingId: ref.id, steps: steps.length, startDate: steps[0].targetDate, emailDate: steps[steps.length - 1].targetDate }
})

// ─── Callable: get warming status ────────────────────────────────────

export const getSocialWarmingStatus = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  let query = db.collection(`organizations/${orgId}/socialWarming`)
    .orderBy('enrolledAt', 'desc')
    .limit(50)

  if (prospectId) {
    query = db.collection(`organizations/${orgId}/socialWarming`)
      .where('prospectId', '==', prospectId)
      .orderBy('enrolledAt', 'desc')
      .limit(10)
  }

  const snap = await query.get()
  const warmings = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  const byStatus = {}
  for (const w of warmings) byStatus[w.status] = (byStatus[w.status] || 0) + 1

  return { warmings, total: warmings.length, byStatus }
})

// ─── Callable: cancel warming ────────────────────────────────────────

export const cancelSocialWarming = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, warmingId } = request.data || {}
  if (!orgId || !warmingId) throw new HttpsError('invalid-argument', 'orgId et warmingId requis')

  const db = getDb()
  const ref = db.doc(`organizations/${orgId}/socialWarming/${warmingId}`)
  const doc = await ref.get()
  if (!doc.exists) throw new HttpsError('not-found', 'Warming introuvable')

  await ref.update({
    status: 'cancelled',
    cancelledAt: FieldValue.serverTimestamp(),
    cancelledBy: request.auth.uid,
  })

  return { success: true, warmingId }
})

// ─── Worker: execute due warming steps ───────────────────────────────

export const socialWarmingWorker = onSchedule({
  schedule: 'every 2 hours',
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
}, async () => {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()

  // Business hours check (8h-20h)
  if (hour < 8 || hour >= 20) {
    logger.info('Social Warming: hors heures ouvrables, skip')
    return
  }

  // Get all active warmings
  const snap = await db.collectionGroup('socialWarming')
    .where('status', '==', 'active')
    .limit(100)
    .get()

  let executed = 0
  let completed = 0

  for (const doc of snap.docs) {
    const warming = doc.data()
    const steps = warming.steps || []
    const currentStep = warming.currentStep || 0

    if (currentStep >= steps.length) {
      // All steps done
      await doc.ref.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() })
      completed++
      continue
    }

    const step = steps[currentStep]
    if (!step || step.targetDate > today) continue // Not due yet

    // Execute the step
    try {
      const instruction = await generateWarmingInstruction(warming, step)

      // Mark step as executed
      steps[currentStep] = {
        ...step,
        status: 'executed',
        executedAt: new Date().toISOString(),
        generatedInstruction: instruction,
      }

      const nextStep = currentStep + 1
      const updateData = {
        steps,
        currentStep: nextStep,
        lastExecutedAt: FieldValue.serverTimestamp(),
      }

      // If last step, mark as completed
      if (nextStep >= steps.length) {
        updateData.status = 'completed'
        updateData.completedAt = FieldValue.serverTimestamp()
        completed++
      }

      await doc.ref.update(updateData)
      executed++

      // Log the action for the org
      const orgPath = doc.ref.path.split('/socialWarming')[0]
      await db.collection(`${orgPath}/alexActionLogs`).add({
        actions: [{ type: 'social_warming_step', params: { step: step.type, prospectId: warming.prospectId } }],
        results: [{ type: 'social_warming_step', status: 'executed', stepType: step.type, instruction }],
        executedAt: FieldValue.serverTimestamp(),
      })
    } catch (error) {
      logger.warn(`Social Warming error for ${doc.id}:`, error.message)
      steps[currentStep] = { ...step, status: 'error', error: error.message }
      await doc.ref.update({ steps })
    }
  }

  logger.info(`Social Warming worker: ${executed} steps executed, ${completed} warmings completed`)
})

// ─── Generate warming instruction (AI-powered) ──────────────────────

async function generateWarmingInstruction(warming, step) {
  if (step.type === 'first_email') {
    // For the final email step, return the pre-configured email
    return {
      action: 'send_email',
      subject: warming.emailDay0Subject || 'Suite a notre echange LinkedIn',
      body: warming.emailDay0Body || '',
      note: 'Email J0 apres 7 jours de warming LinkedIn',
    }
  }

  if (step.type === 'profile_visit') {
    return {
      action: 'visit_linkedin_profile',
      url: warming.linkedinUrl,
      note: 'Visiter le profil pour generer une notification chez le prospect',
    }
  }

  if (step.type === 'connect') {
    return {
      action: 'send_linkedin_connection',
      url: warming.linkedinUrl,
      message: `Bonjour ${warming.prospectName?.split(' ')[0] || ''}, j'ai vu votre profil et vos publications sont tres pertinentes. Serait-il possible d'echanger ?`,
      note: 'Connexion LinkedIn avec note personnalisee courte',
    }
  }

  // For like_post and comment_post, use AI to generate relevant content
  try {
    const { callAI, extractJSON } = await import('../ai/callAI.js')

    const prompt = `Tu dois generer une instruction pour une action LinkedIn de type "${step.type}".

Contexte :
- Prospect : ${warming.prospectName}
- Profil LinkedIn : ${warming.linkedinUrl}
- Objectif : Pre-chauffer la relation avant un premier email commercial

${step.type === 'like_post' ? 'Genere une instruction simple pour liker le post le plus recent du prospect.' : ''}
${step.type === 'comment_post' ? `Genere un commentaire LinkedIn court (2-3 phrases max), pertinent et authentique.
Le commentaire doit :
1. Apporter de la valeur (pas un simple "super post")
2. Poser une question ou partager une experience
3. Ne PAS mentionner de produit/service
4. Etre naturel et professionnel` : ''}

Reponds en JSON :
{
  "action": "${step.type}",
  "content": "le contenu (commentaire si comment_post, sinon vide)",
  "note": "instruction pour l'utilisateur"
}`

    const aiResponse = await callAI(prompt, 500)
    const parsed = extractJSON(aiResponse)
    return parsed || { action: step.type, content: '', note: step.instruction }
  } catch {
    return { action: step.type, content: '', note: step.instruction }
  }
}

// ─── Internal: enroll for alexActionExecutor ─────────────────────────

export async function enrollProspectWarming(db, orgId, prospectId, linkedinUrl) {
  const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!pDoc.exists) return { error: 'Prospect introuvable' }

  const prospect = pDoc.data()
  const now = new Date()

  const steps = WARMING_STEPS.map(step => {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + (step.day + 7))
    return {
      ...step,
      targetDate: targetDate.toISOString().split('T')[0],
      status: 'pending',
      executedAt: null,
    }
  })

  const ref = await db.collection(`organizations/${orgId}/socialWarming`).add({
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    prospectEmail: prospect.email || '',
    linkedinUrl: linkedinUrl || prospect.linkedin || '',
    steps,
    status: 'active',
    currentStep: 0,
    enrolledAt: FieldValue.serverTimestamp(),
    completedAt: null,
  })

  return { warmingId: ref.id, steps: steps.length, startDate: steps[0].targetDate }
}
