/**
 * Cloud Function: analyzeProspectProfile
 * Analyse approfondie d'un prospect via LinkedIn, site web, avis Google et actualites
 *
 * Pipeline :
 *   1. Lecture prospect Firestore
 *   2. Analyse parallele (LinkedIn, Website, Google Reviews, News)
 *   3. Synthese IA actionable
 *   4. Sauvegarde deepProfile sur le prospect
 *
 * Exports: analyzeProspectProfile
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

// ============================================
// Internal Helpers
// ============================================

/**
 * Search Google via Serper API
 * @param {{ query: string, num?: number }} params
 * @returns {Promise<Array>} Search results or empty array on error
 */
async function searchSerper({ query, num = 5 }) {
  try {
    const { cachedSerperFetch } = await import('../utils/serperCache.js')
    const data = await cachedSerperFetch('search', { q: query, num })
    const results = data.organic || []

    console.log(JSON.stringify({
      event: 'serper_success',
      data: { query, resultCount: results.length },
      timestamp: Date.now()
    }))

    return results
  } catch (error) {
    console.log(JSON.stringify({
      event: 'serper_error',
      data: { query, error: error.message },
      timestamp: Date.now()
    }))
    return []
  }
}

/**
 * Scrape a website via Firecrawl API
 * @param {{ url: string }} params
 * @returns {Promise<object|null>} Extracted data or null on error
 */
async function scrapeWebsite({ url }) {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.log(JSON.stringify({
      event: 'firecrawl_skip',
      data: { reason: 'FIRECRAWL_API_KEY not configured' },
      timestamp: Date.now()
    }))
    return null
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              companyName: { type: 'string' },
              description: { type: 'string' },
              sector: { type: 'string' },
              employeeCount: { type: 'string' },
              technologies: { type: 'array', items: { type: 'string' } },
              recentNews: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Firecrawl API ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    const extracted = data.data?.extract || null

    console.log(JSON.stringify({
      event: 'firecrawl_success',
      data: { url, hasExtract: !!extracted },
      timestamp: Date.now()
    }))

    return extracted
  } catch (error) {
    console.log(JSON.stringify({
      event: 'firecrawl_error',
      data: { url, error: error.message },
      timestamp: Date.now()
    }))
    return null
  }
}

// ============================================
// Main Cloud Function
// ============================================

/**
 * Analyse approfondie d'un prospect
 *
 * Input: { orgId: string, prospectId: string }
 * Output: { profile: object, summary: string, analyzedAt: string }
 */
export const analyzeProspectProfile = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB'
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, prospectId } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const db = getDb()
    const userId = request.auth.uid

    console.log(JSON.stringify({
      event: 'profile_analysis_start',
      data: { orgId, prospectId, userId },
      timestamp: Date.now()
    }))

    try {
      // 1. Read prospect from Firestore
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const prospectDoc = await prospectRef.get()
      if (!prospectDoc.exists) {
        throw new HttpsError('not-found', 'Prospect non trouve')
      }

      const prospect = prospectDoc.data()
      const companyName = prospect.company || prospect.companyName || ''
      const companyDomain = prospect.domain || prospect.website || prospect.companyDomain || ''
      const linkedinUrl = prospect.linkedinUrl || prospect.linkedin || ''
      const fullName = [prospect.firstName, prospect.lastName].filter(Boolean).join(' ')

      // 2. Run analysis pipeline in parallel
      const [linkedinResult, websiteResult, reviewsResult, newsResult] = await Promise.allSettled([
        // a. LinkedIn analysis
        linkedinUrl
          ? searchSerper({ query: `site:linkedin.com "${linkedinUrl.split('/').pop()}" recent activity posts`, num: 5 })
          : Promise.resolve([]),

        // b. Website analysis via Firecrawl
        companyDomain
          ? scrapeWebsite({ url: companyDomain.startsWith('http') ? companyDomain : `https://${companyDomain}` })
          : Promise.resolve(null),

        // c. Google Reviews
        companyName
          ? searchSerper({ query: `"${companyName}" avis Google reviews`, num: 5 })
          : Promise.resolve([]),

        // d. News search
        companyName
          ? searchSerper({ query: `"${companyName}" actualites news 2026`, num: 5 })
          : Promise.resolve([])
      ])

      // 3. Aggregate results
      const linkedinData = linkedinResult.status === 'fulfilled' ? linkedinResult.value : []
      const websiteData = websiteResult.status === 'fulfilled' ? websiteResult.value : null
      const reviewsData = reviewsResult.status === 'fulfilled' ? reviewsResult.value : []
      const newsData = newsResult.status === 'fulfilled' ? newsResult.value : []

      const enrichedProfile = {
        prospect: {
          name: fullName,
          company: companyName,
          domain: companyDomain,
          linkedinUrl
        },
        linkedin: {
          found: linkedinData.length > 0,
          results: linkedinData.map((r) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            link: r.link || ''
          }))
        },
        website: {
          found: !!websiteData,
          data: websiteData
        },
        reviews: {
          found: reviewsData.length > 0,
          results: reviewsData.map((r) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            link: r.link || ''
          }))
        },
        news: {
          found: newsData.length > 0,
          results: newsData.map((r) => ({
            title: r.title || '',
            snippet: r.snippet || '',
            date: r.date || '',
            link: r.link || ''
          }))
        }
      }

      // 4. Generate AI summary
      const profileContext = JSON.stringify(enrichedProfile, null, 2)
      const prompt = `Analyse ce profil prospect et genere un resume actionable pour un commercial B2B.

Profil prospect :
${profileContext}

Instructions :
- Resume en francais
- Identifie les points cles pour une approche commerciale
- Mets en avant les signaux d'achat potentiels
- Suggere des angles d'approche personnalises
- Mentionne les actualites recentes si disponibles
- Evalue le potentiel du prospect (faible/moyen/fort)

Reponds en JSON avec cette structure :
{
  "summary": "Resume court (2-3 phrases)",
  "keyInsights": ["insight 1", "insight 2", ...],
  "buyingSignals": ["signal 1", "signal 2", ...],
  "approachAngles": ["angle 1", "angle 2", ...],
  "potential": "faible|moyen|fort",
  "recommendedChannel": "email|linkedin|whatsapp|phone",
  "personalizedOpener": "Phrase d'accroche personnalisee"
}`

      let summary = null
      try {
        const aiResponse = await callAI(prompt, 1500)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          summary = safeParseLLMJson(jsonMatch[0])
        } else {
          summary = { summary: aiResponse }
        }
      } catch (aiError) {
        console.log(JSON.stringify({
          event: 'profile_ai_error',
          data: { prospectId, error: aiError.message },
          timestamp: Date.now()
        }))
        summary = { summary: 'Analyse IA indisponible', error: aiError.message }
      }

      // 5. Save enriched profile to Firestore
      const analyzedAt = new Date().toISOString()
      await prospectRef.update({
        deepProfile: {
          ...enrichedProfile,
          aiSummary: summary,
          analyzedAt,
          analyzedBy: userId
        },
        updatedAt: FieldValue.serverTimestamp()
      })

      console.log(JSON.stringify({
        event: 'profile_analysis_complete',
        data: {
          orgId,
          prospectId,
          hasLinkedin: linkedinData.length > 0,
          hasWebsite: !!websiteData,
          hasReviews: reviewsData.length > 0,
          hasNews: newsData.length > 0,
          potential: summary?.potential || 'unknown'
        },
        timestamp: Date.now()
      }))

      return {
        profile: enrichedProfile,
        summary,
        analyzedAt
      }
    } catch (error) {
      console.log(JSON.stringify({
        event: 'profile_analysis_error',
        data: { orgId, prospectId, error: error.message },
        timestamp: Date.now()
      }))

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', error.message || 'Erreur lors de l\'analyse du profil')
    }
  }
)
