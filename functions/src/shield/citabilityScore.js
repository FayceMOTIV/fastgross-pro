/**
 * Citability Score — Module 10 (Alex V4 SHIELD)
 * Mesure la probabilite qu'une marque soit citee par les IA.
 *
 * Methode : 10 prompts x 2 IA (Groq + Gemini) = 20 requetes
 * Score 0-100 base sur :
 *  - Nombre de mentions (0-40)
 *  - Position dans la reponse (0-20)
 *  - Contexte positif vs negatif (0-20)
 *  - Diversite des prompts qui mentionnent (0-20)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── 10 prompt templates ─────────────────────────────────────────────

function buildPrompts(brandName, niche, location) {
  const loc = location || 'France'
  const nicheLabel = niche || 'services professionnels'

  return [
    {
      id: 'recommend',
      category: 'recommendation',
      prompt: `Quelles sont les meilleures entreprises de ${nicheLabel} en ${loc} ? Donne une liste avec une courte description de chacune.`,
    },
    {
      id: 'alternative',
      category: 'comparison',
      prompt: `Quelles sont les alternatives a ${brandName} dans le domaine ${nicheLabel} ?`,
    },
    {
      id: 'best_provider',
      category: 'recommendation',
      prompt: `Quel est le meilleur prestataire de ${nicheLabel} pour une PME en ${loc} ?`,
    },
    {
      id: 'review',
      category: 'reputation',
      prompt: `Que penses-tu de ${brandName} ? Quels sont les avis et la reputation de cette entreprise ?`,
    },
    {
      id: 'comparison',
      category: 'comparison',
      prompt: `Compare les principaux acteurs du marche ${nicheLabel} en ${loc}. Avantages et inconvenients de chacun.`,
    },
    {
      id: 'search',
      category: 'discovery',
      prompt: `Je cherche un prestataire de ${nicheLabel} fiable en ${loc}. Que me recommandes-tu ?`,
    },
    {
      id: 'expert',
      category: 'authority',
      prompt: `Qui sont les experts reconnus en ${nicheLabel} en ${loc} ? Quelles entreprises sont considerees comme leaders ?`,
    },
    {
      id: 'startup',
      category: 'discovery',
      prompt: `Quelles sont les startups et entreprises innovantes dans le secteur ${nicheLabel} en ${loc} ?`,
    },
    {
      id: 'problem_solving',
      category: 'recommendation',
      prompt: `J'ai un probleme de ${nicheLabel}. Quelles entreprises peuvent m'aider en ${loc} ?`,
    },
    {
      id: 'trustworthy',
      category: 'reputation',
      prompt: `Quelles sont les entreprises les plus fiables et de confiance pour ${nicheLabel} en ${loc} ?`,
    },
  ]
}

// ─── Callable: calculate citability ──────────────────────────────────

export const calculateCitability = onCall({
  region: 'europe-west1',
  timeoutSeconds: 300,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, brandName, niche, location } = request.data || {}
  if (!orgId || !brandName) throw new HttpsError('invalid-argument', 'orgId et brandName requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const result = await computeCitabilityScore(brandName, niche, location)

  // Save to Firestore
  const db = getDb()
  await db.collection('organizations').doc(orgId).collection('citabilityScores').doc().set({
    brandName,
    niche: niche || null,
    location: location || null,
    ...result,
    calculatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Citability Score: ${brandName} → ${result.score}/100`)
  return { success: true, ...result }
})

// ─── Core scoring function ───────────────────────────────────────────

export async function computeCitabilityScore(brandName, niche, location) {
  const prompts = buildPrompts(brandName, niche, location)
  const brandLower = brandName.toLowerCase()
  const brandWords = brandLower.split(/\s+/).filter(w => w.length > 2)

  // Query both providers in parallel for all prompts
  const allResults = []

  for (const p of prompts) {
    const [groqResult, geminiResult] = await Promise.allSettled([
      queryGroq(p.prompt),
      queryGemini(p.prompt),
    ])

    if (groqResult.status === 'fulfilled' && groqResult.value) {
      allResults.push({
        promptId: p.id,
        category: p.category,
        provider: 'groq',
        response: groqResult.value,
        analysis: analyzeMention(groqResult.value, brandName, brandWords),
      })
    }

    if (geminiResult.status === 'fulfilled' && geminiResult.value) {
      allResults.push({
        promptId: p.id,
        category: p.category,
        provider: 'gemini',
        response: geminiResult.value,
        analysis: analyzeMention(geminiResult.value, brandName, brandWords),
      })
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  // Calculate scores
  const totalResponses = allResults.length
  const mentionedResponses = allResults.filter(r => r.analysis.mentioned)
  const mentionCount = mentionedResponses.length

  // Dimension 1: Mention frequency (0-40)
  const mentionRate = totalResponses > 0 ? mentionCount / totalResponses : 0
  const mentionScore = Math.round(mentionRate * 40)

  // Dimension 2: Position score — earlier mention = better (0-20)
  let positionTotal = 0
  for (const r of mentionedResponses) {
    const position = r.analysis.firstMentionPosition
    const responseLength = r.response.length
    if (position >= 0 && responseLength > 0) {
      const relativePos = 1 - (position / responseLength) // 1 = top, 0 = bottom
      positionTotal += relativePos
    }
  }
  const positionScore = mentionCount > 0
    ? Math.round((positionTotal / mentionCount) * 20)
    : 0

  // Dimension 3: Sentiment (0-20)
  let positiveCount = 0
  let negativeCount = 0
  for (const r of mentionedResponses) {
    if (r.analysis.sentiment === 'positive') positiveCount++
    else if (r.analysis.sentiment === 'negative') negativeCount++
  }
  const sentimentRatio = mentionCount > 0
    ? (positiveCount - negativeCount) / mentionCount
    : 0
  const sentimentScore = Math.round(((sentimentRatio + 1) / 2) * 20)

  // Dimension 4: Prompt diversity (0-20)
  const uniquePromptsMentioned = new Set(mentionedResponses.map(r => r.promptId)).size
  const diversityScore = Math.round((uniquePromptsMentioned / prompts.length) * 20)

  // Total score
  const score = Math.min(mentionScore + positionScore + sentimentScore + diversityScore, 100)

  // Grade
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : score >= 40 ? 'Moyen' : score >= 20 ? 'Faible' : 'Invisible'

  // Provider breakdown
  const groqMentions = allResults.filter(r => r.provider === 'groq' && r.analysis.mentioned).length
  const geminiMentions = allResults.filter(r => r.provider === 'gemini' && r.analysis.mentioned).length
  const groqTotal = allResults.filter(r => r.provider === 'groq').length
  const geminiTotal = allResults.filter(r => r.provider === 'gemini').length

  // Category breakdown
  const categoryBreakdown = {}
  for (const r of allResults) {
    if (!categoryBreakdown[r.category]) {
      categoryBreakdown[r.category] = { total: 0, mentioned: 0 }
    }
    categoryBreakdown[r.category].total++
    if (r.analysis.mentioned) categoryBreakdown[r.category].mentioned++
  }

  // Top mentions (excerpts)
  const topMentions = mentionedResponses
    .slice(0, 5)
    .map(r => ({
      promptId: r.promptId,
      provider: r.provider,
      excerpt: r.analysis.excerpt,
      sentiment: r.analysis.sentiment,
    }))

  // Recommendations
  const recommendations = []
  if (mentionScore < 20) recommendations.push('Augmentez votre presence en ligne (site web, blog, reseaux sociaux) pour etre mieux indexe par les IA')
  if (positionScore < 10) recommendations.push('Creez du contenu de reference dans votre niche pour apparaitre en priorite dans les reponses IA')
  if (sentimentScore < 10) recommendations.push('Ameliorez votre e-reputation : repondez aux avis, publiez des temoignages clients')
  if (diversityScore < 10) recommendations.push('Diversifiez votre visibilite : interviews, articles invites, partenariats pour etre cite dans differents contextes')

  return {
    score,
    grade,
    breakdown: {
      mention: { score: mentionScore, max: 40, detail: `${mentionCount}/${totalResponses} reponses mentionnent la marque` },
      position: { score: positionScore, max: 20, detail: 'Position moyenne de la mention dans la reponse' },
      sentiment: { score: sentimentScore, max: 20, detail: `${positiveCount} positives, ${negativeCount} negatives` },
      diversity: { score: diversityScore, max: 20, detail: `${uniquePromptsMentioned}/${prompts.length} types de prompts` },
    },
    providers: {
      groq: { mentions: groqMentions, total: groqTotal },
      gemini: { mentions: geminiMentions, total: geminiTotal },
    },
    categoryBreakdown,
    topMentions,
    recommendations,
    totalPrompts: prompts.length,
    totalResponses,
    totalMentions: mentionCount,
  }
}

// ─── Mention analysis ────────────────────────────────────────────────

function analyzeMention(response, brandName, brandWords) {
  const responseLower = response.toLowerCase()
  const brandLower = brandName.toLowerCase()

  // Check exact brand match
  let mentioned = responseLower.includes(brandLower)

  // Check partial match (all significant words)
  if (!mentioned && brandWords.length > 1) {
    mentioned = brandWords.every(w => responseLower.includes(w))
  }

  if (!mentioned) {
    return { mentioned: false, firstMentionPosition: -1, sentiment: 'neutral', excerpt: null }
  }

  // Find first mention position
  const firstMentionPosition = responseLower.indexOf(brandLower)

  // Extract excerpt (50 chars around mention)
  const start = Math.max(0, firstMentionPosition - 30)
  const end = Math.min(response.length, firstMentionPosition + brandName.length + 50)
  const excerpt = '...' + response.substring(start, end).trim() + '...'

  // Basic sentiment detection around the mention
  const contextWindow = response.substring(
    Math.max(0, firstMentionPosition - 100),
    Math.min(response.length, firstMentionPosition + brandName.length + 100)
  ).toLowerCase()

  const positiveWords = /excellent|fiable|leader|recommand|qualit[ée]|professionnel|expert|reconnu|innovant|performant|meilleur|top|incontournable/i
  const negativeWords = /mediocre|mauvais|cher|lent|probleme|eviter|deconseill|limite|faible|decevant|critique/i

  let sentiment = 'neutral'
  if (positiveWords.test(contextWindow)) sentiment = 'positive'
  if (negativeWords.test(contextWindow)) sentiment = 'negative'

  return { mentioned, firstMentionPosition, sentiment, excerpt }
}

// ─── AI Provider calls ───────────────────────────────────────────────

async function queryGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

async function queryGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    )
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch {
    return null
  }
}
