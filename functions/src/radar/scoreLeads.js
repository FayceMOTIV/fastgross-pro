/**
 * Cloud Function: scoreLeads
 * AI-powered lead scoring using Gemini
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, parseJsonResponse } from '../utils/gemini.js'
import { checkQuota, incrementUsage } from '../utils/quotas.js'

const db = getFirestore()

/**
 * Score a single lead or batch of leads
 */
export const scoreLeads = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { leads, orgId } = request.data
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      throw new HttpsError('invalid-argument', 'leads array requis')
    }

    if (leads.length > 50) {
      throw new HttpsError('invalid-argument', 'Maximum 50 leads par appel')
    }

    const userId = request.auth.uid

    // Check quota (each lead counts as 1 enrichment)
    const quotaCheck = await checkQuota(userId, 'enrichments', leads.length)
    if (!quotaCheck.allowed) {
      throw new HttpsError('resource-exhausted', 'Quota de scoring atteint')
    }

    try {
      const scoredLeads = await scoreWithAI(leads)

      // Save scores to Firestore if orgId provided
      if (orgId) {
        const batch = db.batch()
        for (const lead of scoredLeads) {
          if (lead.id) {
            const leadRef = db
              .collection('organizations')
              .doc(orgId)
              .collection('prospects')
              .doc(lead.id)

            batch.update(leadRef, {
              score: lead.score,
              scoreBreakdown: lead.breakdown,
              scoreCategory: lead.category,
              scoredAt: FieldValue.serverTimestamp(),
            })
          }
        }
        await batch.commit()
      }

      // Increment usage
      await incrementUsage(userId, 'enrichments', leads.length)

      return { leads: scoredLeads, count: scoredLeads.length }
    } catch (error) {
      console.error('Score leads error:', error)
      throw new HttpsError('internal', `Erreur: ${error.message}`)
    }
  }
)

/**
 * Score leads using AI
 */
async function scoreWithAI(leads) {
  const prompt = `Tu es un expert en qualification de leads B2B.
Analyse ces prospects et attribue un score de 0 a 100 a chacun.

PROSPECTS:
${JSON.stringify(leads.map((l) => ({
  id: l.id,
  name: `${l.firstName || ''} ${l.lastName || ''}`.trim(),
  email: l.email,
  company: l.company,
  title: l.title || l.jobTitle,
  phone: l.phone,
  website: l.website,
  industry: l.industry,
  employees: l.employees || l.companySize,
  lastActivity: l.lastActivity,
  emailOpened: l.emailOpened,
  emailClicked: l.emailClicked,
  source: l.source,
})), null, 2)}

CRITERES DE SCORING (chaque critere sur 20 points):
1. PROFIL (20 pts): Qualite du contact (email pro, titre senior, entreprise identifiee)
2. TAILLE (20 pts): Taille entreprise adaptee (PME > ETI > TPE > Grands groupes pour B2B)
3. ENGAGEMENT (20 pts): Interactions passees (ouvertures, clics, reponses)
4. SIGNAUX (20 pts): Signaux d'achat (site recemment mis a jour, recrutement, levee)
5. RECENCE (20 pts): Fraicheur du lead (< 7j = max, > 30j = min)

CATEGORIES:
- hot: score >= 80
- warm: score 50-79
- cold: score 25-49
- ice: score < 25

Reponds UNIQUEMENT en JSON:
{
  "leads": [
    {
      "id": "id du lead",
      "score": 85,
      "category": "hot",
      "breakdown": {
        "profile": 18,
        "size": 16,
        "engagement": 19,
        "signals": 17,
        "recency": 15
      },
      "reason": "Pourquoi ce score (1 phrase)"
    }
  ]
}`

  const response = await callAI(prompt, { maxTokens: 3000 })
  const parsed = parseJsonResponse(response)

  return parsed.leads || []
}

/**
 * Get scoring insights for a single lead (more detailed)
 */
export const getLeadInsights = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { lead } = request.data
    if (!lead) {
      throw new HttpsError('invalid-argument', 'lead requis')
    }

    try {
      const prompt = `Tu es un expert en sales intelligence B2B.
Analyse ce prospect en profondeur et fournis des insights actionnables.

PROSPECT:
${JSON.stringify(lead, null, 2)}

Reponds UNIQUEMENT en JSON:
{
  "summary": "Resume en 2 phrases du profil",
  "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
  "concerns": ["Point de vigilance 1", "Point de vigilance 2"],
  "bestApproach": "La meilleure approche pour contacter ce prospect",
  "suggestedTiming": "Le meilleur moment pour le contacter",
  "icebreakers": ["Accroche 1 personnalisee", "Accroche 2 personnalisee"],
  "objectionHandling": {
    "likely_objection": "L'objection probable",
    "response": "Comment y repondre"
  }
}`

      const response = await callAI(prompt, { maxTokens: 1500 })
      return parseJsonResponse(response)
    } catch (error) {
      console.error('Get lead insights error:', error)
      throw new HttpsError('internal', `Erreur: ${error.message}`)
    }
  }
)
