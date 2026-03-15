/**
 * Competitor Reviews Source — G2/Trustpilot via Serper
 *
 * Method: Search for negative reviews of competitors on G2/Trustpilot
 * Signal: unhappy users = potential customers looking for alternatives
 * Uses Groq for intent analysis when available
 * Estimated: ~4K leads/mois (100-200/run, 2x/semaine)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads, withRateLimit } from '../_baseSource.js'
import { safeParseLLMJson } from '../../../utils/safeParseLLMJson.js'

const SOURCE_ID = 'competitor_reviews'
const SOURCE_GROUP = 'intent'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 20) {
  const competitors = ['HubSpot', 'Salesforce', 'Mailchimp']
  const sentiments = ['Decu par le support', 'Trop cher pour une PME', 'Cherche une alternative plus simple']

  return Array.from({ length: count }, (_, i) => normalizeToLead({
    companyName: `Reviewer Company ${i + 1}`,
    email: `user${i + 1}@review-company-${i + 1}.fr`,
    website: `https://review-company-${i + 1}.fr`,
    country: 'FR',
    intentSignals: [{
      type: 'actively_searching',
      detail: `Avis negatif sur ${competitors[i % competitors.length]}: "${sentiments[i % sentiments.length]}"`,
      competitor: competitors[i % competitors.length],
      rating: 1 + (i % 2),
    }],
  }, SOURCE_ID, SOURCE_GROUP))
}

// ─── SERPER SEARCH ──────────────────────────────────────────────────────────

const searchSerper = withRateLimit(async (query) => {
  const { cachedSerperFetch } = await import('../../../utils/serperCache.js')
  const data = await cachedSerperFetch('search', { q: query, gl: 'fr', hl: 'fr', num: 20 })

  if (data.error) {
    throw new Error(data.error)
  }

  return data
}, 2000)

// ─── AI INTENT ANALYSIS (optional) ──────────────────────────────────────────

async function analyzeIntentWithAI(reviewText, competitor) {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey || !reviewText) {
    return { activelySearching: false, sentiment: 'unknown' }
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `Analyze this review of ${competitor}. Is the user actively searching for an alternative? Reply in JSON: { "activelySearching": true/false, "sentiment": "negative/neutral/positive", "needs": ["list of needs"] }\n\nReview: "${reviewText.slice(0, 500)}"`,
        }],
        max_tokens: 200,
        temperature: 0.1,
      }),
    })

    if (!response.ok) return { activelySearching: false, sentiment: 'unknown' }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return safeParseLLMJson(jsonMatch[0])
    }
  } catch (error) {
    logger.warn(`[competitorReviewsSource] AI analysis failed:`, error.message)
  }

  return { activelySearching: false, sentiment: 'unknown' }
}

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect leads from competitor review sites
 * @param {string} orgId
 * @param {Object} config - { competitors, maxRating, maxResults }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const serperKey = process.env.SERPER_API_KEY

  if (!serperKey) {
    logger.info(`[competitorReviewsSource] No SERPER_API_KEY, using mock data`)
    const leads = generateMockLeads(20)
    await saveRawLeads(orgId, leads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads, isMock: true }
  }

  const { runId } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const leads = []
    const seenUrls = new Set()

    // Competitors to monitor
    const competitors = config.competitors?.length > 0
      ? config.competitors
      : ['hubspot', 'salesforce', 'mailchimp', 'sendinblue', 'activecampaign']

    const reviewSites = ['g2.com', 'trustpilot.com', 'capterra.com']

    for (const competitor of competitors) {
      for (const site of reviewSites) {
        try {
          // Search for negative reviews
          const query = `site:${site} "${competitor}" avis negatif OR "cherche alternative" OR "decu" OR "trop cher"`

          const serpData = await searchSerper(query)
          const results = serpData.organic || []

          for (const result of results) {
            if (seenUrls.has(result.link)) continue
            seenUrls.add(result.link)

            // Extract snippet for intent analysis
            const snippet = result.snippet || ''

            // AI intent analysis (if Groq available)
            const intentAnalysis = await analyzeIntentWithAI(snippet, competitor)

            // Extract domain from reviewer if possible
            let reviewerDomain = ''
            const domainMatch = snippet.match(/(?:@|from\s+)([a-z0-9-]+\.[a-z]{2,})/i)
            if (domainMatch) {
              reviewerDomain = domainMatch[1]
            }

            const lead = normalizeToLead({
              companyName: reviewerDomain ? reviewerDomain.split('.')[0] : `${competitor} Reviewer`,
              website: reviewerDomain ? `https://${reviewerDomain}` : '',
              country: 'FR',
              intentSignals: [{
                type: intentAnalysis.activelySearching ? 'actively_searching' : 'dissatisfied',
                detail: `Avis sur ${competitor}: "${snippet.slice(0, 200)}"`,
                competitor,
                reviewSite: site,
                sentiment: intentAnalysis.sentiment,
                needs: intentAnalysis.needs || [],
                activelySearching: intentAnalysis.activelySearching,
              }],
            }, SOURCE_ID, SOURCE_GROUP)

            leads.push(lead)
          }
        } catch (error) {
          logger.warn(`[competitorReviewsSource] Search failed for ${competitor}/${site}:`, error.message)
        }
      }
    }

    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[competitorReviewsSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[competitorReviewsSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })
    throw error
  }
}
