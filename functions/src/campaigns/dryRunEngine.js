/**
 * Dry Run Engine
 *
 * Simule le lancement d'une campagne sans envoyer de messages :
 * - Recherche prospects correspondant a l'ICP de la campagne
 * - Estime le canal optimal pour chaque prospect
 * - Genere un apercu de message IA (50 mots)
 * - Calcule les couts estimes par canal
 * - Sauvegarde les resultats pour consultation ulterieure
 *
 * Exports: runDryRun, getDryRunHistory
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── COUTS ESTIMES PAR CANAL (EUR) ─────────────────────────────────────────

const CHANNEL_COSTS = {
  email: 0.001,
  sms: 0.035,
  whatsapp: 0.05,
  instagram: 0,
  linkedin: 0,
  voicemail: 0.004,
  postal: 1.50,
  twitter: 0,
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Construire la query Firestore selon les filtres ICP de la campagne
 */
function buildICPQuery(prospectsRef, icp) {
  let query = prospectsRef.orderBy('score', 'desc')

  if (icp?.sector) {
    query = query.where('sector', '==', icp.sector)
  }

  if (icp?.city) {
    query = query.where('city', '==', icp.city)
  }

  if (icp?.minScore !== undefined && icp?.minScore !== null) {
    query = query.where('score', '>=', icp.minScore)
  }

  // Limiter aux 5 meilleurs pour le dry run
  query = query.limit(5)

  return query
}

/**
 * Determiner le meilleur canal pour un prospect selon les canaux disponibles de l'org
 */
function selectChannelForProspect(prospect, enabledChannels) {
  // Priorite basee sur les donnees disponibles du prospect
  if (enabledChannels.includes('email') && prospect.email) {
    return 'email'
  }
  if (enabledChannels.includes('whatsapp') && prospect.phone) {
    return 'whatsapp'
  }
  if (enabledChannels.includes('sms') && prospect.phone) {
    return 'sms'
  }
  if (enabledChannels.includes('linkedin') && prospect.linkedinUrl) {
    return 'linkedin'
  }
  if (enabledChannels.includes('instagram') && prospect.instagramHandle) {
    return 'instagram'
  }

  // Fallback sur le premier canal active
  return enabledChannels[0] || 'email'
}

/**
 * Generer un apercu de message via IA pour un prospect donne
 */
async function generateMessagePreview(prospect, channel, campaignName) {
  const name = prospect.firstName || prospect.name || 'Prospect'
  const company = prospect.company || ''

  const prompt = `Genere un message de prospection B2B tres court (50 mots max) en francais pour le canal ${channel}.
Prospect : ${name}${company ? ` de ${company}` : ''}.
Campagne : ${campaignName || 'Prospection'}.
Sois direct, professionnel et personnalise. Pas de sujet email, juste le corps du message.`

  try {
    const text = await callAI(prompt, 100)
    return text
  } catch (error) {
    console.log(JSON.stringify({
      event: 'dry_run_ai_preview_error',
      data: { prospectId: prospect.id, error: error.message },
      timestamp: Date.now(),
    }))
    return `Bonjour ${name}, je souhaitais vous presenter nos solutions pour ${company || 'votre entreprise'}. Seriez-vous disponible pour un echange rapide ?`
  }
}

/**
 * Recuperer les canaux actives de l'org
 */
async function getEnabledChannels(db, orgId) {
  const orgSnap = await db.collection('organizations').doc(orgId).get()
  if (!orgSnap.exists) return ['email']

  const channels = orgSnap.data()?.channels || {}
  return Object.entries(channels)
    .filter(([, config]) => config?.enabled === true)
    .map(([name]) => name)
}

// ─── CALLABLE — LANCER UN DRY RUN ──────────────────────────────────────────

export const runDryRun = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, campaignId } = request.data
    if (!orgId || !campaignId) {
      throw new HttpsError('invalid-argument', 'orgId et campaignId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()

    try {
      // 1. Lire la config campagne
      const campaignRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)

      const campaignSnap = await campaignRef.get()
      if (!campaignSnap.exists) {
        throw new HttpsError('not-found', 'Campagne non trouvee')
      }

      const campaign = campaignSnap.data()
      const icp = campaign.icp || campaign.targetCriteria || {}
      const campaignChannels = campaign.channels || []

      // 2. Recuperer les canaux actives de l'org
      const enabledChannels = await getEnabledChannels(db, orgId)

      // Filtrer les canaux de la campagne selon ceux actives
      const availableChannels = campaignChannels.length > 0
        ? campaignChannels.filter(ch => enabledChannels.includes(ch))
        : enabledChannels

      // 3. Simuler la recherche : query prospects selon ICP
      const prospectsRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')

      const query = buildICPQuery(prospectsRef, icp)
      const prospectsSnap = await query.get()

      // 4. Pour chaque prospect, estimer canal + message + cout
      const previewLeads = []
      const channelBreakdown = {}
      let totalEstimatedCost = 0

      for (const doc of prospectsSnap.docs) {
        const prospect = { id: doc.id, ...doc.data() }
        const channel = selectChannelForProspect(prospect, availableChannels)
        const messagePreview = await generateMessagePreview(prospect, channel, campaign.name)
        const cost = CHANNEL_COSTS[channel] || 0

        previewLeads.push({
          prospectId: prospect.id,
          name: [prospect.firstName, prospect.lastName].filter(Boolean).join(' ') || prospect.email || 'Inconnu',
          company: prospect.company || '',
          email: prospect.email || '',
          score: prospect.score || 0,
          channel,
          messagePreview,
          estimatedCost: cost,
        })

        channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1
        totalEstimatedCost += cost
      }

      // 5. Calculer les totaux
      const totalProspectsFound = prospectsSnap.size

      // Estimer le volume quotidien en se basant sur le daily budget de l'org
      const orgSnap = await db.collection('organizations').doc(orgId).get()
      const dailyBudget = orgSnap.data()?.dailyBudget?.total || 100
      const estimatedDaily = Math.min(totalProspectsFound, dailyBudget)
      const estimatedDailyCost = estimatedDaily > 0 && totalProspectsFound > 0
        ? (totalEstimatedCost / totalProspectsFound) * estimatedDaily
        : 0

      // 6. Construire le resultat
      const dryRun = {
        previewLeads,
        totalProspectsFound,
        estimatedDaily,
        estimatedCost: Math.round(estimatedDailyCost * 100) / 100,
        channelBreakdown,
        campaignName: campaign.name || '',
        icpUsed: icp,
        timestamp: new Date().toISOString(),
      }

      // 7. Sauvegarder dans Firestore
      const dryRunRef = await campaignRef
        .collection('dryRuns')
        .add({
          ...dryRun,
          createdBy: request.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
        })

      console.log(JSON.stringify({
        event: 'dry_run_completed',
        data: {
          orgId,
          campaignId,
          dryRunId: dryRunRef.id,
          prospectsFound: totalProspectsFound,
          estimatedDaily,
          estimatedCost: dryRun.estimatedCost,
        },
        timestamp: Date.now(),
      }))

      return {
        dryRun: {
          ...dryRun,
          dryRunId: dryRunRef.id,
        },
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.log(JSON.stringify({
        event: 'dry_run_error',
        data: { orgId, campaignId, error: error.message },
        timestamp: Date.now(),
      }))
      throw new HttpsError('internal', `Erreur dry run: ${error.message}`)
    }
  }
)

// ─── CALLABLE — HISTORIQUE DES DRY RUNS ─────────────────────────────────────

export const getDryRunHistory = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, campaignId } = request.data
    if (!orgId || !campaignId) {
      throw new HttpsError('invalid-argument', 'orgId et campaignId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()

    try {
      const dryRunsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)
        .collection('dryRuns')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get()

      const dryRuns = dryRunsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      return { dryRuns }
    } catch (error) {
      console.log(JSON.stringify({
        event: 'dry_run_history_error',
        data: { orgId, campaignId, error: error.message },
        timestamp: Date.now(),
      }))
      throw new HttpsError('internal', `Erreur lecture historique dry runs: ${error.message}`)
    }
  }
)
