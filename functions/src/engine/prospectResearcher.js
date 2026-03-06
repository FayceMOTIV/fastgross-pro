/**
 * prospectResearcher — Recherche web/social automatique sur chaque prospect
 * Genere des angles de personnalisation uniques (Clay-level)
 */

import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''
const RESEARCH_CACHE_DAYS = 30

/**
 * Recherche Google via Serper.dev
 */
async function searchGoogle(query, num = 5) {
  if (!SERPER_API_KEY) return []

  try {
    const response = await axios.post(
      'https://google.serper.dev/search',
      { q: query, num, gl: 'fr', hl: 'fr' },
      {
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    )
    return response.data?.organic || []
  } catch (err) {
    logger.warn('Serper search failed:', err.message)
    return []
  }
}

/**
 * Extrait des insights a partir des resultats de recherche
 */
function extractInsights(results, prospectName, company) {
  const insights = []

  for (const result of results) {
    const title = result.title || ''
    const snippet = result.snippet || ''
    const combined = `${title} ${snippet}`.toLowerCase()

    // Detecter des signaux pertinents
    if (/lev[ée]e|fund|invest|seed|serie/i.test(combined)) {
      insights.push({
        type: 'funding',
        text: `Levee de fonds recente: ${title}`,
        source: result.link,
        weight: 20,
      })
    }

    if (/recrute|hiring|embauche|rejoign/i.test(combined)) {
      insights.push({
        type: 'hiring',
        text: `En phase de recrutement: ${snippet.slice(0, 100)}`,
        source: result.link,
        weight: 15,
      })
    }

    if (/nouveau|lance|launch|announc|sortie/i.test(combined)) {
      insights.push({
        type: 'launch',
        text: `Lancement recent: ${title}`,
        source: result.link,
        weight: 15,
      })
    }

    if (/award|prix|recompense|certifi/i.test(combined)) {
      insights.push({
        type: 'achievement',
        text: `Reconnaissance: ${title}`,
        source: result.link,
        weight: 10,
      })
    }

    if (/partenariat|partnership|collaborat/i.test(combined)) {
      insights.push({
        type: 'partnership',
        text: `Partenariat: ${title}`,
        source: result.link,
        weight: 10,
      })
    }
  }

  return insights.slice(0, 5)
}

/**
 * Recherche un prospect sur le web et extrait des insights
 * @param {object} params
 * @param {string} params.orgId
 * @param {string} params.prospectId
 * @param {object} params.prospect - Donnees prospect
 * @returns {object} { insights, sources, scrapedAt }
 */
export async function researchProspect({ orgId, prospectId, prospect }) {
  if (!prospect) return { insights: [], sources: [] }

  // Verifier le cache
  if (prospect.research?.scrapedAt) {
    const scrapedDate = prospect.research.scrapedAt?.toDate?.() || new Date(prospect.research.scrapedAt)
    const daysSinceScraped = (Date.now() - scrapedDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceScraped < RESEARCH_CACHE_DAYS) {
      logger.info(`Research cache hit for ${prospectId} (${Math.floor(daysSinceScraped)}d ago)`)
      return prospect.research
    }
  }

  const name = prospect.name || prospect.firstName || ''
  const company = prospect.company || ''

  if (!name && !company) {
    return { insights: [], sources: [] }
  }

  const allInsights = []
  const sources = []

  // Recherche LinkedIn
  if (name && company) {
    const linkedInResults = await searchGoogle(`site:linkedin.com "${name}" "${company}"`, 3)
    const liInsights = extractInsights(linkedInResults, name, company)
    allInsights.push(...liInsights)
    sources.push(...linkedInResults.map((r) => r.link).filter(Boolean))
  }

  // Recherche entreprise
  if (company) {
    const companyResults = await searchGoogle(`"${company}" actualites OR news OR annonce`, 5)
    const compInsights = extractInsights(companyResults, name, company)
    allInsights.push(...compInsights)
    sources.push(...companyResults.map((r) => r.link).filter(Boolean))
  }

  // Recherche site web du prospect
  if (prospect.website) {
    const siteResults = await searchGoogle(`site:${prospect.website.replace(/^https?:\/\//, '')}`, 3)
    const siteInsights = extractInsights(siteResults, name, company)
    allInsights.push(...siteInsights)
  }

  // Dedup et limiter
  const uniqueInsights = allInsights
    .filter((v, i, a) => a.findIndex((t) => t.type === v.type) === i)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)

  const research = {
    insights: uniqueInsights,
    sources: [...new Set(sources)].slice(0, 10),
    scrapedAt: new Date(),
    insightCount: uniqueInsights.length,
  }

  // Sauvegarder dans Firestore
  if (orgId && prospectId) {
    try {
      await getDb()
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({ research })

      logger.info(`Research complete for ${prospectId}: ${uniqueInsights.length} insights`)
    } catch (err) {
      logger.warn('Failed to save research:', err.message)
    }
  }

  return research
}
