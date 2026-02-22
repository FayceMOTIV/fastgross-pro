/**
 * Email Sequence Sender
 * Multi-step email sequences with automatic follow-ups
 * Uses Resend API for high deliverability
 *
 * Features:
 * - Multi-step sequences (up to 7 steps)
 * - Configurable delays between steps
 * - AI-powered personalization
 * - Open/click tracking
 * - Automatic stop on reply/unsubscribe
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { callAI } from '../../ai/callAI.js'

const getDb = () => getFirestore()

// Get Resend API key from environment
const getResendApiKey = () => process.env.RESEND_API_KEY || null

/**
 * EMAIL SEQUENCE SENDER
 * Runs every hour, sends scheduled emails in active campaigns
 */
export const emailSequenceSender = onSchedule({
  schedule: '0 * * * *',  // Every hour
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '1GiB',
  timeoutSeconds: 540
}, async () => {
  console.log('📧 Email Sequence Sender starting...')

  const db = getDb()
  const now = Timestamp.now()
  const stats = { sent: 0, failed: 0, skipped: 0 }

  try {
    // Get all organizations
    const orgsSnapshot = await db.collection('organizations').get()

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      // Check if email sequences are enabled
      const hunterConfig = orgData.hunterConfig || {}
      if (!hunterConfig.emailSequencesEnabled) continue

      // Get active campaigns with scheduled emails
      const campaignsSnapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailCampaigns')
        .where('status', '==', 'active')
        .get()

      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaign = campaignDoc.data()

        // Find next step to send
        const nextStep = campaign.steps?.find(step =>
          step.status === 'scheduled' &&
          step.scheduledFor?.toMillis?.() <= now.toMillis()
        )

        if (!nextStep) continue

        // Get prospect
        const prospectDoc = await db
          .collection('organizations')
          .doc(orgId)
          .collection('prospects')
          .doc(campaign.prospectId)
          .get()

        if (!prospectDoc.exists) {
          console.log(`Prospect ${campaign.prospectId} not found, skipping`)
          stats.skipped++
          continue
        }

        const prospect = prospectDoc.data()

        // Check if prospect has email
        if (!prospect.email) {
          console.log(`Prospect ${campaign.prospectId} has no email, skipping`)
          stats.skipped++
          continue
        }

        // Check if prospect unsubscribed or replied
        if (prospect.status === 'unsubscribed' || prospect.status === 'replied') {
          await campaignDoc.ref.update({
            status: prospect.status === 'replied' ? 'replied' : 'unsubscribed',
            completedAt: FieldValue.serverTimestamp()
          })
          stats.skipped++
          continue
        }

        // Get sequence template
        const sequenceDoc = await db
          .collection('organizations')
          .doc(orgId)
          .collection('emailSequences')
          .doc(campaign.sequenceId)
          .get()

        if (!sequenceDoc.exists) {
          console.log(`Sequence ${campaign.sequenceId} not found, skipping`)
          stats.skipped++
          continue
        }

        const sequence = sequenceDoc.data()
        const stepTemplate = sequence.steps?.find(s => s.stepNumber === nextStep.stepNumber)

        if (!stepTemplate) {
          console.log(`Step template ${nextStep.stepNumber} not found, skipping`)
          stats.skipped++
          continue
        }

        // Personalize email
        const personalizedSubject = await personalizeTemplate(stepTemplate.subject, prospect, orgData)
        const personalizedBody = await personalizeTemplate(stepTemplate.template, prospect, orgData)

        // Get sender config
        const senderEmail = orgData.senderEmail || 'hello@facemediafactory.com'
        const senderName = orgData.senderName || orgData.name || 'Face Media Factory'

        // Send email
        const emailSent = await sendEmailViaResend({
          from: `${senderName} <${senderEmail}>`,
          to: prospect.email,
          subject: personalizedSubject,
          html: wrapEmailHtml(personalizedBody, orgId, campaign.prospectId, campaignDoc.id),
          replyTo: orgData.replyToEmail || senderEmail
        })

        if (emailSent) {
          stats.sent++

          // Update campaign step
          const stepIndex = campaign.steps.findIndex(s => s.stepNumber === nextStep.stepNumber)
          const updatedSteps = [...campaign.steps]
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            status: 'sent',
            sentAt: FieldValue.serverTimestamp()
          }

          // Schedule next step if exists
          const nextStepNumber = nextStep.stepNumber + 1
          const nextStepTemplate = sequence.steps?.find(s => s.stepNumber === nextStepNumber)

          if (nextStepTemplate) {
            const nextStepIndex = updatedSteps.findIndex(s => s.stepNumber === nextStepNumber)
            if (nextStepIndex !== -1) {
              const scheduledFor = new Date()
              scheduledFor.setDate(scheduledFor.getDate() + (nextStepTemplate.delayDays || 3))
              updatedSteps[nextStepIndex] = {
                ...updatedSteps[nextStepIndex],
                scheduledFor: Timestamp.fromDate(scheduledFor),
                status: 'scheduled'
              }
            }
          }

          // Check if campaign complete
          const allSent = updatedSteps.every(s => s.status === 'sent')

          await campaignDoc.ref.update({
            steps: updatedSteps,
            currentStep: nextStep.stepNumber,
            status: allSent ? 'completed' : 'active',
            ...(allSent ? { completedAt: FieldValue.serverTimestamp() } : {})
          })

          // Log interaction
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('interactions')
            .add({
              prospectId: campaign.prospectId,
              type: 'email_sent',
              channel: 'email',
              direction: 'outbound',
              subject: personalizedSubject,
              content: personalizedBody,
              step: nextStep.stepNumber,
              sequenceId: campaign.sequenceId,
              campaignId: campaignDoc.id,
              status: 'sent',
              createdAt: FieldValue.serverTimestamp()
            })

          console.log(`✅ Email step ${nextStep.stepNumber} sent to ${prospect.email}`)

        } else {
          stats.failed++
          console.error(`❌ Failed to send email to ${prospect.email}`)

          // Mark step as failed
          const stepIndex = campaign.steps.findIndex(s => s.stepNumber === nextStep.stepNumber)
          const updatedSteps = [...campaign.steps]
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            status: 'failed',
            failedAt: FieldValue.serverTimestamp()
          }

          await campaignDoc.ref.update({ steps: updatedSteps })
        }
      }

      // Update org analytics
      const today = new Date().toISOString().split('T')[0]
      if (stats.sent > 0 || stats.failed > 0) {
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('analytics')
          .doc(`email_sequence_${today}`)
          .set({
            sent: FieldValue.increment(stats.sent),
            failed: FieldValue.increment(stats.failed),
            lastRun: FieldValue.serverTimestamp()
          }, { merge: true })
      }
    }

    console.log('📧 Email Sequence Sender complete:', stats)
    return stats

  } catch (error) {
    console.error('❌ Email Sequence Sender failed:', error)
    throw error
  }
})

/**
 * Send email via Resend API
 */
async function sendEmailViaResend({ from, to, subject, html, replyTo }) {
  const apiKey = getResendApiKey()

  if (!apiKey) {
    console.warn('Resend API key not configured')
    // Simulate success in dev mode
    return process.env.NODE_ENV !== 'production'
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        reply_to: replyTo
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', result)
      return false
    }

    return true

  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

/**
 * Personalize template with prospect data and optional AI
 */
async function personalizeTemplate(template, prospect, orgData) {
  // Basic variable replacement
  let personalized = template
    .replace(/{firstName}/g, prospect.firstName || prospect.fullName?.split(' ')[0] || 'there')
    .replace(/{fullName}/g, prospect.fullName || prospect.firstName || 'there')
    .replace(/{username}/g, prospect.username || '')
    .replace(/{email}/g, prospect.email || '')
    .replace(/{company}/g, prospect.company || '')
    .replace(/{industry}/g, prospect.industry || 'votre secteur')
    .replace(/{orgName}/g, orgData.name || 'Face Media Factory')
    .replace(/{bio}/g, prospect.bio || '')

  // Check for AI personalization tags
  if (personalized.includes('{ai:')) {
    personalized = await applyAiPersonalization(personalized, prospect, orgData)
  }

  return personalized
}

/**
 * Apply AI personalization to template sections
 */
async function applyAiPersonalization(template, prospect, orgData) {
  try {
    // Find all AI placeholders
    const aiMatches = [...template.matchAll(/{ai:([^}]+)}/g)]
    if (aiMatches.length === 0) return template

    for (const match of aiMatches) {
      const instruction = match[1]

      const prompt = `Tu es un expert en cold email B2B.

PROSPECT:
- Nom: ${prospect.fullName || 'Non specifie'}
- Entreprise: ${prospect.company || 'Non specifie'}
- Bio: "${prospect.bio || 'Pas de bio'}"
- Secteur: ${prospect.industry || 'Non specifie'}

ENTREPRISE EXPEDITRICE:
- Nom: ${orgData.name || 'Face Media Factory'}
- Offre: ${orgData.offer || 'prospection automatisee'}

INSTRUCTION: ${instruction}

Reponds UNIQUEMENT avec le texte demande (1-2 phrases max, pas de guillemets):`

      const aiText = (await callAI(prompt, 200)).trim().replace(/^["']|["']$/g, '')
      template = template.replace(match[0], aiText)
    }

    return template

  } catch (error) {
    console.error('AI personalization error:', error.message)
    return template.replace(/{ai:[^}]+}/g, '')
  }
}

/**
 * Wrap email HTML with tracking and unsubscribe link
 */
function wrapEmailHtml(content, orgId, prospectId, campaignId) {
  const unsubscribeUrl = `https://face-media-factory.web.app/unsubscribe?org=${orgId}&prospect=${prospectId}&campaign=${campaignId}`
  const trackingPixel = `<img src="https://europe-west1-face-media-factory.cloudfunctions.net/trackEmailOpen?org=${orgId}&prospect=${prospectId}&campaign=${campaignId}" width="1" height="1" style="display:none" />`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${content}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    <p>
      Vous recevez cet email car vous avez ete identifie comme un contact potentiel.
      <a href="${unsubscribeUrl}" style="color: #666;">Se desabonner</a>
    </p>
  </div>

  ${trackingPixel}
</body>
</html>
`
}

/**
 * Create email sequence (callable)
 */
export const createEmailSequence = onCall({
  region: 'europe-west1',
  cors: true,
  memory: '512MiB'
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, name, steps } = data

  if (!orgId || !name || !steps || !Array.isArray(steps) || steps.length === 0) {
    throw new HttpsError('invalid-argument', 'orgId, name, and steps array are required')
  }

  if (steps.length > 7) {
    throw new HttpsError('invalid-argument', 'Maximum 7 steps allowed')
  }

  const db = getDb()

  // Validate steps
  const validatedSteps = steps.map((step, index) => ({
    stepNumber: index + 1,
    delayDays: step.delayDays || (index === 0 ? 0 : 3),
    subject: step.subject || `Follow-up ${index + 1}`,
    template: step.template || ''
  }))

  const sequenceRef = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailSequences')
    .add({
      name,
      steps: validatedSteps,
      status: 'active',
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp()
    })

  return {
    success: true,
    sequenceId: sequenceRef.id,
    message: `Sequence "${name}" created with ${validatedSteps.length} steps`
  }
})

/**
 * Start email campaign for prospect (callable)
 */
export const startEmailCampaign = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, prospectId, sequenceId } = data

  if (!orgId || !prospectId || !sequenceId) {
    throw new HttpsError('invalid-argument', 'orgId, prospectId, and sequenceId are required')
  }

  const db = getDb()

  // Get sequence
  const sequenceDoc = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailSequences')
    .doc(sequenceId)
    .get()

  if (!sequenceDoc.exists) {
    throw new HttpsError('not-found', 'Sequence not found')
  }

  const sequence = sequenceDoc.data()

  // Get prospect
  const prospectDoc = await db
    .collection('organizations')
    .doc(orgId)
    .collection('prospects')
    .doc(prospectId)
    .get()

  if (!prospectDoc.exists) {
    throw new HttpsError('not-found', 'Prospect not found')
  }

  const prospect = prospectDoc.data()

  if (!prospect.email) {
    throw new HttpsError('failed-precondition', 'Prospect has no email address')
  }

  // Check if campaign already exists
  const existingCampaign = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailCampaigns')
    .where('prospectId', '==', prospectId)
    .where('status', 'in', ['active', 'scheduled'])
    .limit(1)
    .get()

  if (!existingCampaign.empty) {
    throw new HttpsError('already-exists', 'Active campaign already exists for this prospect')
  }

  // Create campaign steps from sequence
  const campaignSteps = sequence.steps.map((step, index) => {
    const scheduledFor = new Date()
    scheduledFor.setDate(scheduledFor.getDate() + step.delayDays)

    return {
      stepNumber: step.stepNumber,
      scheduledFor: index === 0 ? Timestamp.now() : Timestamp.fromDate(scheduledFor),
      status: index === 0 ? 'scheduled' : 'pending',
      sentAt: null,
      openedAt: null,
      clickedAt: null
    }
  })

  // Create campaign
  const campaignRef = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailCampaigns')
    .add({
      prospectId,
      sequenceId,
      currentStep: 0,
      steps: campaignSteps,
      status: 'active',
      createdBy: auth.uid,
      createdAt: FieldValue.serverTimestamp()
    })

  return {
    success: true,
    campaignId: campaignRef.id,
    message: `Email campaign started for ${prospect.email}`
  }
})

/**
 * List email sequences (callable)
 */
export const listEmailSequences = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId } = data

  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  const db = getDb()

  const sequencesSnapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailSequences')
    .orderBy('createdAt', 'desc')
    .get()

  const sequences = sequencesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
  }))

  return {
    success: true,
    count: sequences.length,
    sequences
  }
})

/**
 * Get email campaign stats (callable)
 */
export const getEmailCampaignStats = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, days = 7 } = data

  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  const db = getDb()

  // Get campaigns
  const campaignsSnapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('emailCampaigns')
    .get()

  const campaigns = campaignsSnapshot.docs.map(doc => doc.data())

  // Calculate stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    replied: campaigns.filter(c => c.status === 'replied').length,
    unsubscribed: campaigns.filter(c => c.status === 'unsubscribed').length
  }

  // Calculate email stats
  let totalSent = 0
  let totalOpened = 0
  let totalClicked = 0

  campaigns.forEach(campaign => {
    campaign.steps?.forEach(step => {
      if (step.status === 'sent') totalSent++
      if (step.openedAt) totalOpened++
      if (step.clickedAt) totalClicked++
    })
  })

  return {
    success: true,
    stats,
    emails: {
      sent: totalSent,
      opened: totalOpened,
      clicked: totalClicked,
      openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
      clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0
    }
  }
})

/**
 * Track email open (HTTP endpoint)
 */
export const trackEmailOpen = onCall({
  region: 'europe-west1',
  cors: true
}, async (request) => {
  const { data } = request
  const { org, prospect, campaign } = data

  if (!org || !prospect || !campaign) return { success: false }

  const db = getDb()

  try {
    const campaignDoc = await db
      .collection('organizations')
      .doc(org)
      .collection('emailCampaigns')
      .doc(campaign)
      .get()

    if (campaignDoc.exists) {
      const campaignData = campaignDoc.data()
      const currentStep = campaignData.currentStep || 1

      const updatedSteps = campaignData.steps.map(step => {
        if (step.stepNumber === currentStep && !step.openedAt) {
          return { ...step, openedAt: FieldValue.serverTimestamp() }
        }
        return step
      })

      await campaignDoc.ref.update({ steps: updatedSteps })
    }

    return { success: true }
  } catch (error) {
    return { success: false }
  }
})
