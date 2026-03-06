/**
 * Master Scheduler — Coeur du systeme de prospection H24
 *
 * - masterScheduler: every 15 min, orchestre tous les canaux pour toutes les orgs
 * - runMasterSchedulerManual: onCall pour test admin
 * - dailyBudgetManager: every day 00:05, reset budgets quotidiens
 * - replyAggregator: every 30 min, scan + classifie les reponses
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

import { getBusinessHoursForOrg } from './helpers/businessHoursValidator.js'
import { calculateDailyBudgets, getRemainingBudget } from './helpers/budgetCalculator.js'
import { getHealthySendableChannels } from './helpers/channelHealthCheck.js'

import { dispatchEmail } from './dispatchers/emailDispatcher.js'
import { dispatchSMS } from './dispatchers/smsDispatcher.js'
import { dispatchWhatsApp } from './dispatchers/whatsappDispatcher.js'
import { dispatchInstagram } from './dispatchers/instagramDispatcher.js'
import { dispatchLinkedIn } from './dispatchers/linkedinDispatcher.js'
import { dispatchVoicemail } from './dispatchers/voicemailDispatcher.js'
import { dispatchPostal } from './dispatchers/postalDispatcher.js'
import { dispatchTwitter } from './dispatchers/twitterDispatcher.js'

const getDb = () => getFirestore()

// Map canal → dispatcher
const DISPATCHERS = {
  email: dispatchEmail,
  sms: dispatchSMS,
  whatsapp: dispatchWhatsApp,
  instagram: dispatchInstagram,
  linkedin: dispatchLinkedIn,
  voicemail: dispatchVoicemail,
  postal: dispatchPostal,
  twitter: dispatchTwitter,
}

// ============================================
// MASTER SCHEDULER — every 15 min
// ============================================
export const masterScheduler = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    logger.info('[masterScheduler] Starting scheduled run')
    await runOrchestration()
  }
)

// ============================================
// MANUAL TRIGGER — onCall for admin
// ============================================
export const runMasterSchedulerManual = onCall(
  { region: 'europe-west1', timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const targetOrgId = request.data?.orgId || null
    logger.info(`[masterScheduler] Manual run by ${request.auth.uid}${targetOrgId ? ` for org ${targetOrgId}` : ''}`)

    const results = await runOrchestration(targetOrgId)
    return results
  }
)

// ============================================
// ORCHESTRATION CORE
// ============================================
async function runOrchestration(targetOrgId = null) {
  const db = getDb()
  const startTime = Date.now()
  const globalResults = { orgsProcessed: 0, totalSent: 0, totalFailed: 0, totalSkipped: 0, errors: [] }

  try {
    // 1. Recuperer les orgs actives
    let orgsQuery = db.collection('organizations').where('prospectionEnabled', '==', true)

    if (targetOrgId) {
      // Mode manuel: une seule org
      const orgSnap = await db.collection('organizations').doc(targetOrgId).get()
      if (!orgSnap.exists) {
        return { error: 'Organisation non trouvee' }
      }
      const orgs = [{ id: orgSnap.id, ...orgSnap.data() }]
      await processOrgBatch(orgs, globalResults)
    } else {
      const orgsSnap = await orgsQuery.get()

      if (orgsSnap.empty) {
        logger.info('[masterScheduler] Aucune org avec prospection active')
        return globalResults
      }

      const orgs = orgsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      logger.info(`[masterScheduler] ${orgs.length} orgs actives`)

      // Traiter par batch de 5 orgs en parallele
      for (let i = 0; i < orgs.length; i += 5) {
        const batch = orgs.slice(i, i + 5)
        await processOrgBatch(batch, globalResults)
      }
    }

    // 2. Logger les resultats
    const duration = Date.now() - startTime
    await db.collection('orchestratorGlobalLogs').add({
      type: 'schedulerRun',
      orgsProcessed: globalResults.orgsProcessed,
      totalSent: globalResults.totalSent,
      totalFailed: globalResults.totalFailed,
      totalSkipped: globalResults.totalSkipped,
      duration,
      errors: globalResults.errors.slice(0, 20),
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info(`[masterScheduler] Done in ${duration}ms — sent=${globalResults.totalSent} failed=${globalResults.totalFailed} skipped=${globalResults.totalSkipped}`)
    return globalResults
  } catch (error) {
    logger.error('[masterScheduler] Fatal error:', error)
    globalResults.errors.push(error.message)
    return globalResults
  }
}

async function processOrgBatch(orgs, globalResults) {
  const promises = orgs.map((org) => processOrg(org, globalResults))
  await Promise.allSettled(promises)
}

async function processOrg(org, globalResults) {
  const db = getDb()
  const orgId = org.id

  try {
    // A. Verifier business hours
    const bh = await getBusinessHoursForOrg(orgId)
    if (!bh.isOpen) {
      logger.info(`[masterScheduler] org=${orgId} hors heures ouvrables`)
      return
    }

    // B. Verifier si org en pause
    if (org.prospectionState === 'paused') {
      logger.info(`[masterScheduler] org=${orgId} en pause`)
      return
    }

    // C. Canaux sains
    const healthyChannels = await getHealthySendableChannels(orgId)
    if (healthyChannels.length === 0) {
      logger.info(`[masterScheduler] org=${orgId} aucun canal sain`)
      return
    }

    // D. Budgets
    const budgets = calculateDailyBudgets(org)

    // E. Recuperer prospects eligibles (non contactes aujourd'hui, non suppresses)
    const today = new Date().toISOString().split('T')[0]
    const prospectsSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('status', 'in', ['new', 'contacted', 'warm', 'hot'])
      .limit(200)
      .get()

    if (prospectsSnap.empty) {
      logger.info(`[masterScheduler] org=${orgId} aucun prospect eligible`)
      return
    }

    // Filtrer ceux pas encore contactes aujourd'hui
    const prospects = prospectsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p) => {
        const lastContact = p.lastContactedAt?.seconds
          ? new Date(p.lastContactedAt.seconds * 1000).toISOString().split('T')[0]
          : null
        return lastContact !== today && !p.suppressed && !p.optedOut
      })

    if (prospects.length === 0) {
      return
    }

    // F-bis. Integrate psych sequences for prospects with active sequences
    let psychEngine = null
    try {
      const mod = await import('../engine/psychSequenceEngine.js')
      psychEngine = mod
    } catch { /* psychSequenceEngine not available */ }

    if (psychEngine) {
      for (const prospect of prospects.slice(0, 20)) {
        if (prospect.sequenceStep !== undefined) {
          try {
            const step = psychEngine.getCurrentPsychStep(prospect)
            if (step) {
              const adaptiveChannel = psychEngine.selectAdaptiveChannel(prospect, step, healthyChannels)
              if (adaptiveChannel && prospect[`${adaptiveChannel}Channel`] !== false) {
                prospect._psyChannel = adaptiveChannel
                prospect._psyTechnique = step.technique
              }
            }
          } catch { /* skip psych for this prospect */ }
        }
      }
    }

    // F. Pour chaque canal sain avec budget, dispatcher
    const orgResults = { sent: 0, failed: 0, skipped: 0 }

    for (const channel of healthyChannels) {
      if (!budgets[channel] || budgets[channel] <= 0) continue

      const dispatcher = DISPATCHERS[channel]
      if (!dispatcher) continue

      // Filtrer les prospects eligibles pour ce canal
      const channelProspects = filterProspectsForChannel(prospects, channel)
      if (channelProspects.length === 0) continue

      try {
        const budget = await getRemainingBudget(orgId, channel)
        if (budget.remaining <= 0) continue

        const result = await dispatcher(orgId, channelProspects.slice(0, budget.remaining), {
          warmupDay: org.channels?.[channel]?.warmupDay || 30,
        })

        orgResults.sent += result.sent
        orgResults.failed += result.failed
        orgResults.skipped += result.skipped
      } catch (error) {
        logger.error(`[masterScheduler] org=${orgId} channel=${channel} error:`, error)
        globalResults.errors.push(`${orgId}/${channel}: ${error.message}`)
      }
    }

    // G. Logger pour cette org
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('orchestratorLogs')
      .add({
        type: 'schedulerRun',
        channels: healthyChannels,
        sent: orgResults.sent,
        failed: orgResults.failed,
        skipped: orgResults.skipped,
        prospectsAvailable: prospects.length,
        createdAt: FieldValue.serverTimestamp(),
      })

    // Mettre a jour l'etat
    await db
      .collection('organizations')
      .doc(orgId)
      .set(
        {
          prospectionState: 'running',
          lastOrchestratorRun: FieldValue.serverTimestamp(),
          lastOrchestratorResults: orgResults,
        },
        { merge: true }
      )

    globalResults.orgsProcessed++
    globalResults.totalSent += orgResults.sent
    globalResults.totalFailed += orgResults.failed
    globalResults.totalSkipped += orgResults.skipped
  } catch (error) {
    logger.error(`[masterScheduler] processOrg error org=${orgId}:`, error)
    globalResults.errors.push(`${orgId}: ${error.message}`)
  }
}

/**
 * Filtrer les prospects eligibles pour un canal specifique
 */
function filterProspectsForChannel(prospects, channel) {
  return prospects.filter((p) => {
    switch (channel) {
      case 'email':
        return !!p.email
      case 'sms':
      case 'whatsapp':
      case 'voicemail':
        return !!(p.phone || p.mobile)
      case 'instagram':
        return !!(p.channels?.instagram?.handle || p.instagramHandle)
      case 'linkedin':
        return !!(p.linkedinUrl || p.channels?.linkedin?.profileUrl)
      case 'postal':
        return !!(p.address?.line1 && p.address?.city)
      case 'twitter':
        return !!(p.channels?.twitter?.handle || p.twitterHandle)
      default:
        return false
    }
  })
}

// ============================================
// DAILY BUDGET MANAGER — every day 00:05
// ============================================
export const dailyBudgetManager = onSchedule(
  {
    schedule: 'every day 00:05',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const db = getDb()
    logger.info('[dailyBudgetManager] Starting daily budget reset')

    try {
      const orgsSnap = await db.collection('organizations').where('prospectionEnabled', '==', true).get()

      const today = new Date().toISOString().split('T')[0]
      let count = 0

      for (const doc of orgsSnap.docs) {
        const org = doc.data()
        const budgets = calculateDailyBudgets(org)

        await db
          .collection('organizations')
          .doc(doc.id)
          .collection('dailyBudgets')
          .doc(today)
          .set({
            date: today,
            budgets,
            totalBudget: Object.values(budgets).reduce((a, b) => a + b, 0),
            createdAt: FieldValue.serverTimestamp(),
          })

        count++
      }

      logger.info(`[dailyBudgetManager] Reset budgets for ${count} orgs`)
    } catch (error) {
      logger.error('[dailyBudgetManager] error:', error)
    }
  }
)

// ============================================
// REPLY AGGREGATOR — every 30 min
// ============================================
export const replyAggregator = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const db = getDb()
    logger.info('[replyAggregator] Starting reply scan')

    try {
      const cutoff = new Date()
      cutoff.setMinutes(cutoff.getMinutes() - 35)

      // Scan interactions recentes cross-org
      const orgsSnap = await db.collection('organizations').where('prospectionEnabled', '==', true).get()

      let totalReplies = 0

      for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id

        try {
          const interactionsSnap = await db
            .collection('organizations')
            .doc(orgId)
            .collection('interactions')
            .where('direction', '==', 'in')
            .where('createdAt', '>=', cutoff)
            .limit(100)
            .get()

          if (interactionsSnap.empty) continue

          // Classifier et sauvegarder dans replyFeeds
          let classifyReply
          try {
            const module = await import('../engine/replyClassifier.js')
            classifyReply = module.classifyReply
          } catch {
            classifyReply = null
          }

          for (const interDoc of interactionsSnap.docs) {
            const interaction = interDoc.data()

            // Verifier si pas deja traite
            if (interaction.aggregated) continue

            let classification = { category: 'unknown', confidence: 0 }
            if (classifyReply) {
              try {
                classification = await classifyReply(interaction.content || interaction.text || '')
              } catch {
                // Fallback
              }
            }

            // Sauvegarder dans replyFeeds
            await db
              .collection('organizations')
              .doc(orgId)
              .collection('replyFeeds')
              .add({
                interactionId: interDoc.id,
                prospectId: interaction.prospectId,
                channel: interaction.channel,
                content: interaction.content || interaction.text || '',
                classification: classification.category,
                confidence: classification.confidence,
                createdAt: interaction.createdAt || FieldValue.serverTimestamp(),
                aggregatedAt: FieldValue.serverTimestamp(),
              })

            // Marquer comme traite
            await interDoc.ref.update({ aggregated: true })
            totalReplies++
          }
        } catch (error) {
          logger.error(`[replyAggregator] org=${orgId} error:`, error)
        }
      }

      logger.info(`[replyAggregator] Aggregated ${totalReplies} replies`)
    } catch (error) {
      logger.error('[replyAggregator] error:', error)
    }
  }
)
