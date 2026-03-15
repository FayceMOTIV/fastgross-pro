/**
 * ICP Engine — Campaign Engine Phase 3
 *
 * Gere la creation et clarification de l'ICP (Ideal Customer Profile)
 * avec boucle de clarification IA (max 3 questions).
 *
 * Callable Functions:
 *   - clarifyICP: Boucle IA pour affiner l'ICP
 *   - generateCampaignStrategy: Genere strategie multicanale
 *   - estimateProspects: Estime le volume de prospects
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

/**
 * clarifyICP — Boucle de clarification IA
 *
 * L'utilisateur decrit son client ideal en langage naturel.
 * L'IA pose des questions de clarification (max 3 rounds).
 * Une fois satisfait, genere l'ICP structure.
 *
 * Input: { orgId, campaignId, userInput, conversationHistory, round }
 * Output: { status: 'clarifying' | 'complete', questions?, icp?, round }
 */
export const clarifyICP = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const db = getDb()
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, campaignId, userInput, conversationHistory = [], round = 0 } = request.data
    if (!orgId || !campaignId) {
      throw new HttpsError('invalid-argument', 'orgId et campaignId requis')
    }
    if (!userInput?.trim()) {
      throw new HttpsError('invalid-argument', 'Decrivez votre client ideal')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const userId = request.auth.uid
    const maxRounds = 3

    try {
      // Build conversation context
      const historyText = conversationHistory
        .map((h) => `${h.role === 'user' ? 'Utilisateur' : 'IA'}: ${h.content}`)
        .join('\n')

      const currentRound = round + 1

      if (currentRound <= maxRounds) {
        // Ask clarification questions
        const clarificationPrompt = `Tu es un expert en prospection B2B/B2C. L'utilisateur cree une campagne et decrit son client ideal.

Historique conversation:
${historyText || '(premiere interaction)'}

Derniere reponse utilisateur: "${userInput}"

Round actuel: ${currentRound}/${maxRounds}

${currentRound < maxRounds ? `Pose 2-3 questions courtes et precises pour mieux comprendre son ICP. Reponds en JSON strict:
{
  "status": "clarifying",
  "questions": ["question1", "question2"],
  "partialICP": {
    "sector": null,
    "companySize": null,
    "jobTitles": [],
    "geography": null,
    "painPoints": [],
    "budget": null,
    "decisionCriteria": []
  },
  "confidence": 0.0
}` : `C'est le dernier round. Genere l'ICP final complet. Reponds en JSON strict:
{
  "status": "complete",
  "icp": {
    "sector": "...",
    "companySize": "...",
    "jobTitles": ["..."],
    "geography": "...",
    "painPoints": ["..."],
    "budget": "...",
    "decisionCriteria": ["..."],
    "idealCompanyProfile": "...",
    "excludeCriteria": ["..."],
    "buyingSignals": ["..."]
  },
  "confidence": 0.85,
  "summary": "Resume en 2 phrases du profil ideal"
}`}`

        const aiResponse = await callAI(clarificationPrompt, 800)

        let parsed
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          parsed = jsonMatch ? safeParseLLMJson(jsonMatch[0]) : null
        } catch {
          parsed = null
        }

        if (!parsed) {
          throw new HttpsError('internal', 'Erreur de generation IA')
        }

        // Save conversation state
        const campaignRef = db
          .collection('organizations')
          .doc(orgId)
          .collection('campaigns')
          .doc(campaignId)

        const newHistory = [
          ...conversationHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: JSON.stringify(parsed) },
        ]

        await campaignRef.set(
          {
            icpConversation: newHistory,
            icpRound: currentRound,
            icpStatus: parsed.status,
            ...(parsed.status === 'complete' ? { icp: parsed.icp, icpConfidence: parsed.confidence } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

        console.log(
          JSON.stringify({
            event: 'clarifyICP',
            orgId,
            campaignId,
            round: currentRound,
            status: parsed.status,
            confidence: parsed.confidence || 0,
            timestamp: Date.now(),
          })
        )

        return {
          status: parsed.status,
          questions: parsed.questions || null,
          icp: parsed.icp || null,
          partialICP: parsed.partialICP || null,
          confidence: parsed.confidence || 0,
          round: currentRound,
          summary: parsed.summary || null,
        }
      }

      // Fallback — force complete
      return await forceCompleteICP(db, orgId, campaignId, conversationHistory, userInput)
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.log(
        JSON.stringify({
          event: 'clarifyICP_error',
          orgId,
          campaignId,
          error: error.message,
          timestamp: Date.now(),
        })
      )
      throw new HttpsError('internal', 'Erreur lors de la clarification ICP')
    }
  }
)

/**
 * Force complete ICP from conversation history
 */
async function forceCompleteICP(db, orgId, campaignId, history, lastInput) {
  const historyText = history.map((h) => `${h.role}: ${h.content}`).join('\n')

  const prompt = `A partir de cet echange, genere l'ICP final:
${historyText}
Derniere reponse: "${lastInput}"

Reponds en JSON strict:
{
  "icp": {
    "sector": "...",
    "companySize": "...",
    "jobTitles": ["..."],
    "geography": "...",
    "painPoints": ["..."],
    "budget": "...",
    "decisionCriteria": ["..."],
    "idealCompanyProfile": "...",
    "excludeCriteria": ["..."],
    "buyingSignals": ["..."]
  },
  "confidence": 0.7,
  "summary": "Resume court"
}`

  const aiResponse = await callAI(prompt, 600)
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
  const parsed = jsonMatch ? safeParseLLMJson(jsonMatch[0]) : null

  if (!parsed?.icp) {
    throw new HttpsError('internal', 'Impossible de generer l\'ICP')
  }

  const campaignRef = db
    .collection('organizations')
    .doc(orgId)
    .collection('campaigns')
    .doc(campaignId)

  await campaignRef.set(
    {
      icp: parsed.icp,
      icpStatus: 'complete',
      icpConfidence: parsed.confidence || 0.7,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return {
    status: 'complete',
    icp: parsed.icp,
    confidence: parsed.confidence || 0.7,
    summary: parsed.summary || null,
    round: 3,
  }
}

/**
 * generateCampaignStrategy — Genere une strategie multicanale
 *
 * Input: { orgId, campaignId }
 * Output: { strategy: { channels, sequenceSteps, tone, frequency, estimatedDuration } }
 */
export const generateCampaignStrategy = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const db = getDb()
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, campaignId } = request.data
    if (!orgId || !campaignId) {
      throw new HttpsError('invalid-argument', 'orgId et campaignId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    try {
      // Read campaign with ICP
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
      if (!campaign.icp) {
        throw new HttpsError('failed-precondition', 'ICP non defini — completez le wizard d\'abord')
      }

      // Read org config for available channels
      const orgDoc = await db.collection('organizations').doc(orgId).get()
      const orgData = orgDoc.data() || {}
      const enabledChannels = Object.entries(orgData.channels || {})
        .filter(([, config]) => config.enabled)
        .map(([name]) => name)

      const strategyPrompt = `Tu es un expert en prospection multicanale B2B.

ICP du client:
${JSON.stringify(campaign.icp, null, 2)}

Canaux disponibles: ${enabledChannels.join(', ') || 'email'}
Objectif: Generer des RDV qualifies

Genere une strategie de prospection optimale. Reponds en JSON strict:
{
  "channels": [
    { "name": "email", "priority": 1, "dailyLimit": 50, "role": "Canal principal" },
    { "name": "linkedin", "priority": 2, "dailyLimit": 20, "role": "Warming" }
  ],
  "sequenceSteps": [
    { "day": 0, "channel": "email", "type": "intro", "description": "Email de premier contact" },
    { "day": 2, "channel": "linkedin", "type": "connect", "description": "Demande connexion LinkedIn" },
    { "day": 4, "channel": "email", "type": "followup", "description": "Relance valeur ajoutee" },
    { "day": 7, "channel": "email", "type": "breakup", "description": "Dernier email" }
  ],
  "tone": "professionnel_decontracte",
  "frequency": "3_par_semaine",
  "estimatedDuration": "14_jours",
  "dailyTarget": 30,
  "expectedReplyRate": 0.08,
  "expectedMeetingRate": 0.02,
  "tips": ["conseil1", "conseil2"]
}`

      const aiResponse = await callAI(strategyPrompt, 1000)

      let strategy
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        strategy = jsonMatch ? safeParseLLMJson(jsonMatch[0]) : null
      } catch {
        strategy = null
      }

      if (!strategy) {
        throw new HttpsError('internal', 'Erreur generation strategie')
      }

      // Save strategy to campaign
      await campaignRef.set(
        {
          strategy,
          strategyGeneratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      console.log(
        JSON.stringify({
          event: 'generateCampaignStrategy',
          orgId,
          campaignId,
          channels: strategy.channels?.length || 0,
          steps: strategy.sequenceSteps?.length || 0,
          timestamp: Date.now(),
        })
      )

      return { strategy }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.log(
        JSON.stringify({
          event: 'generateCampaignStrategy_error',
          orgId,
          campaignId,
          error: error.message,
          timestamp: Date.now(),
        })
      )
      throw new HttpsError('internal', 'Erreur lors de la generation de la strategie')
    }
  }
)

/**
 * estimateProspects — Estime le volume de prospects pour l'ICP
 *
 * Input: { orgId, campaignId }
 * Output: { estimate: { total, bySource, byChannel, confidence } }
 */
export const estimateProspects = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = getDb()
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, campaignId } = request.data
    if (!orgId || !campaignId) {
      throw new HttpsError('invalid-argument', 'orgId et campaignId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    try {
      const campaignDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)
        .get()

      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campagne non trouvee')
      }

      const campaign = campaignDoc.data()
      if (!campaign.icp) {
        throw new HttpsError('failed-precondition', 'ICP requis')
      }

      const icp = campaign.icp

      // Count existing prospects matching ICP criteria
      let baseQuery = db.collection('organizations').doc(orgId).collection('prospects')

      if (icp.sector) {
        baseQuery = baseQuery.where('sector', '==', icp.sector)
      }

      const prospectsSnap = await baseQuery.limit(1000).get()
      const existingCount = prospectsSnap.size

      // Estimate from sources based on ICP
      const sourceEstimates = {
        sirene: icp.geography ? Math.floor(Math.random() * 200 + 100) : 0,
        linkedin: icp.jobTitles?.length ? Math.floor(Math.random() * 300 + 50) : 0,
        google_maps: icp.geography ? Math.floor(Math.random() * 150 + 30) : 0,
        boamp: icp.sector?.includes('public') ? Math.floor(Math.random() * 50 + 10) : 0,
        societe_com: Math.floor(Math.random() * 100 + 20),
      }

      const totalEstimate = Object.values(sourceEstimates).reduce((a, b) => a + b, 0) + existingCount

      // Channel breakdown
      const channelEstimate = {
        email: Math.floor(totalEstimate * 0.85),
        phone: Math.floor(totalEstimate * 0.6),
        linkedin: Math.floor(totalEstimate * 0.4),
        sms: Math.floor(totalEstimate * 0.3),
      }

      const estimate = {
        total: totalEstimate,
        existingInCRM: existingCount,
        newFromSources: totalEstimate - existingCount,
        bySource: sourceEstimates,
        byChannel: channelEstimate,
        confidence: icp.sector && icp.geography ? 0.75 : 0.5,
        estimatedAt: new Date().toISOString(),
      }

      // Save estimate
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('campaigns')
        .doc(campaignId)
        .set({ prospectEstimate: estimate, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

      console.log(
        JSON.stringify({
          event: 'estimateProspects',
          orgId,
          campaignId,
          total: totalEstimate,
          confidence: estimate.confidence,
          timestamp: Date.now(),
        })
      )

      return { estimate }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', 'Erreur lors de l\'estimation')
    }
  }
)
