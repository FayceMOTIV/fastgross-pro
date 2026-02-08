/**
 * Cloud Function: processSequence
 * Processes campaign sequences and sends messages through appropriate channels
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { checkQuota, incrementUsage, isChannelAvailable } from '../utils/quotas.js'

const db = getFirestore()

/**
 * Process a sequence step for enrolled prospects
 */
export const processSequence = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { campaignId, orgId, dryRun = false } = request.data
    if (!campaignId || !orgId) {
      throw new HttpsError('invalid-argument', 'campaignId et orgId requis')
    }

    const userId = request.auth.uid

    try {
      // Get campaign
      const campaignRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)

      const campaignDoc = await campaignRef.get()
      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campagne non trouvee')
      }

      const campaign = campaignDoc.data()
      if (campaign.status !== 'active') {
        throw new HttpsError('failed-precondition', 'Campagne non active')
      }

      // Get enrollments ready to process
      const now = new Date()
      const enrollmentsSnap = await campaignRef
        .collection('enrollments')
        .where('status', '==', 'active')
        .where('nextStepAt', '<=', now)
        .limit(100)
        .get()

      const results = {
        processed: 0,
        sent: { email: 0, sms: 0, whatsapp: 0 },
        errors: [],
        skipped: 0,
      }

      for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = enrollDoc.data()
        const currentStep = enrollment.currentStep || 0
        const steps = campaign.steps || []

        if (currentStep >= steps.length) {
          // Sequence complete
          await enrollDoc.ref.update({
            status: 'completed',
            completedAt: FieldValue.serverTimestamp(),
          })
          continue
        }

        const step = steps[currentStep]
        const channel = step.channel || 'email'

        // Check channel availability
        const channelAvailable = await isChannelAvailable(userId, channel)
        if (!channelAvailable) {
          results.skipped++
          continue
        }

        // Check quota
        const quotaCheck = await checkQuota(userId, `${channel}s`, 1)
        if (!quotaCheck.allowed) {
          results.errors.push({
            enrollmentId: enrollDoc.id,
            error: `Quota ${channel} atteint`,
          })
          continue
        }

        if (!dryRun) {
          try {
            // Send message based on channel
            await sendMessage(channel, enrollment, step, campaign, orgId)

            // Update enrollment
            const nextStepDelay = steps[currentStep + 1]?.delayDays || 0
            const nextStepAt = new Date()
            nextStepAt.setDate(nextStepAt.getDate() + nextStepDelay)

            await enrollDoc.ref.update({
              currentStep: currentStep + 1,
              nextStepAt: currentStep + 1 < steps.length ? nextStepAt : null,
              lastSentAt: FieldValue.serverTimestamp(),
              [`history.${currentStep}`]: {
                channel,
                sentAt: FieldValue.serverTimestamp(),
                status: 'sent',
              },
            })

            // Increment usage
            await incrementUsage(userId, `${channel}s`, 1)

            results.sent[channel] = (results.sent[channel] || 0) + 1
            results.processed++
          } catch (sendError) {
            results.errors.push({
              enrollmentId: enrollDoc.id,
              error: sendError.message,
            })
          }
        } else {
          results.processed++
          results.sent[channel] = (results.sent[channel] || 0) + 1
        }
      }

      // Update campaign stats
      if (!dryRun) {
        await campaignRef.update({
          'stats.sent': FieldValue.increment(results.processed),
          'stats.lastProcessedAt': FieldValue.serverTimestamp(),
        })
      }

      return {
        success: true,
        dryRun,
        results,
      }
    } catch (error) {
      console.error('Process sequence error:', error)
      throw new HttpsError('internal', `Erreur: ${error.message}`)
    }
  }
)

/**
 * Send message through appropriate channel
 */
async function sendMessage(channel, enrollment, step, campaign, orgId) {
  const prospect = enrollment.prospect

  // Replace variables in content
  const content = replaceVariables(step.content, prospect, campaign)
  const subject = step.subject ? replaceVariables(step.subject, prospect, campaign) : null

  switch (channel) {
    case 'email':
      return sendEmail(prospect.email, subject, content, orgId)
    case 'sms':
      return sendSMS(prospect.phone, content, orgId)
    case 'whatsapp':
      return sendWhatsApp(prospect.phone, content, orgId)
    default:
      throw new Error(`Canal non supporte: ${channel}`)
  }
}

/**
 * Replace template variables with actual values
 */
function replaceVariables(text, prospect, campaign) {
  if (!text) return text

  const replacements = {
    '{prenom}': prospect.firstName || '',
    '{nom}': prospect.lastName || '',
    '{entreprise}': prospect.company || '',
    '{email}': prospect.email || '',
    '{titre}': prospect.title || '',
    '{campagne}': campaign.name || '',
    '{signature}': campaign.signature || '',
  }

  let result = text
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'gi'), value)
  }

  return result
}

/**
 * Send email via configured provider
 */
async function sendEmail(to, subject, body, orgId) {
  // Get org email config
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const emailConfig = orgDoc.data()?.integrations?.email

  if (!emailConfig?.enabled) {
    throw new Error('Email non configure pour cette organisation')
  }

  // Use nodemailer (configured with SES or SMTP)
  const nodemailer = await import('nodemailer')

  const transporter = nodemailer.default.createTransport({
    host: emailConfig.smtp?.host || process.env.SMTP_HOST,
    port: emailConfig.smtp?.port || 587,
    secure: false,
    auth: {
      user: emailConfig.smtp?.user || process.env.SMTP_USER,
      pass: emailConfig.smtp?.pass || process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: emailConfig.from || process.env.EMAIL_FROM,
    to,
    subject,
    html: body,
  })

  return { success: true, channel: 'email' }
}

/**
 * Send SMS via BudgetSMS
 */
async function sendSMS(to, message, orgId) {
  const apiKey = process.env.BUDGETSMS_API_KEY
  const username = process.env.BUDGETSMS_USERNAME

  if (!apiKey || !username) {
    throw new Error('BudgetSMS non configure')
  }

  // Clean phone number
  const phone = to.replace(/\D/g, '')

  const response = await fetch('https://api.budgetsms.net/sendsms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username,
      userid: apiKey,
      handle: process.env.BUDGETSMS_HANDLE || 'FMFACTORY',
      to: phone,
      msg: message,
    }),
  })

  if (!response.ok) {
    throw new Error(`BudgetSMS error: ${response.status}`)
  }

  return { success: true, channel: 'sms' }
}

/**
 * Send WhatsApp via Evolution API
 */
async function sendWhatsApp(to, message, orgId) {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE

  if (!apiUrl || !apiKey) {
    throw new Error('Evolution API non configure')
  }

  // Clean phone number
  const phone = to.replace(/\D/g, '')

  const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  })

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`)
  }

  return { success: true, channel: 'whatsapp' }
}

/**
 * Scheduled function to process all active campaigns
 * Runs every 15 minutes
 */
export const scheduledCampaignProcessor = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    console.log('Running scheduled campaign processor')

    try {
      // Get all active campaigns
      const orgsSnap = await db.collection('organizations').get()

      for (const orgDoc of orgsSnap.docs) {
        const campaignsSnap = await orgDoc.ref
          .collection('campaigns')
          .where('status', '==', 'active')
          .get()

        for (const campaignDoc of campaignsSnap.docs) {
          try {
            // Get owner user ID
            const ownerId = campaignDoc.data().createdBy

            // Process enrollments for this campaign
            const enrollmentsSnap = await campaignDoc.ref
              .collection('enrollments')
              .where('status', '==', 'active')
              .where('nextStepAt', '<=', new Date())
              .limit(50)
              .get()

            for (const enrollDoc of enrollmentsSnap.docs) {
              const enrollment = enrollDoc.data()
              const steps = campaignDoc.data().steps || []
              const currentStep = enrollment.currentStep || 0

              if (currentStep >= steps.length) {
                await enrollDoc.ref.update({
                  status: 'completed',
                  completedAt: FieldValue.serverTimestamp(),
                })
                continue
              }

              const step = steps[currentStep]
              const channel = step.channel || 'email'

              // Check quota
              const quotaCheck = await checkQuota(ownerId, `${channel}s`, 1)
              if (!quotaCheck.allowed) continue

              try {
                await sendMessage(channel, enrollment, step, campaignDoc.data(), orgDoc.id)

                const nextStepDelay = steps[currentStep + 1]?.delayDays || 0
                const nextStepAt = new Date()
                nextStepAt.setDate(nextStepAt.getDate() + nextStepDelay)

                await enrollDoc.ref.update({
                  currentStep: currentStep + 1,
                  nextStepAt: currentStep + 1 < steps.length ? nextStepAt : null,
                  lastSentAt: FieldValue.serverTimestamp(),
                })

                await incrementUsage(ownerId, `${channel}s`, 1)
              } catch (err) {
                console.error(`Error sending to ${enrollment.prospect?.email}:`, err)
              }
            }
          } catch (err) {
            console.error(`Error processing campaign ${campaignDoc.id}:`, err)
          }
        }
      }

      console.log('Scheduled campaign processor complete')
    } catch (error) {
      console.error('Scheduled processor error:', error)
    }
  }
)
