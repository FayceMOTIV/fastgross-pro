/**
 * SERP Hunting Source — Serper.dev + Hunter.io for intent-based leads
 *
 * Pipeline: Google SERP queries → extract company URLs → Hunter domain search → emails
 * Rate limit: 2500 req/mois Serper (gratuit), ~83 req/jour
 * Estimated: ~10K leads/mois (300-400/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads, withRateLimit } from '../_baseSource.js'

const SOURCE_ID = 'serp_hunting'
const SOURCE_GROUP = 'intent'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 40) {
  const queries = ['agence web paris', 'cabinet comptable lyon', 'startup saas france']

  return Array.from({ length: count }, (_, i) => normalizeToLead({
    companyName: `SERP Company ${i + 1}`,
    email: `contact@serp-company-${i + 1}.fr`,
    website: `https://serp-company-${i + 1}.fr`,
    city: i % 2 === 0 ? 'Paris' : 'Lyon',
    country: 'FR',
    intentSignals: [{ type: 'high_intent', detail: `Trouve via SERP: ${queries[i % queries.length]}` }],
  }, SOURCE_ID, SOURCE_GROUP))
}

// ─── SERPER API ─────────────────────────────────────────────────────────────

const searchSerper = withRateLimit(async (query) => {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 20 }),
  })

  if (!response.ok) {
    throw new Error(`Serper API ${response.status}: ${response.statusText}`)
  }

  return response.json()
}, 1500)  // ~40 req/min budget

// ─── HUNTER DOMAIN SEARCH ───────────────────────────────────────────────────

const searchHunter = withRateLimit(async (domain) => {
  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) return null

  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}&limit=5`
  )

  if (!response.ok) return null

  const data = await response.json()
  return data.data?.emails || []
}, 2000)

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect leads via SERP queries + Hunter enrichment
 * @param {string} orgId
 * @param {Object} config - { queriesPerRun, maxResultsPerQuery, customQueries }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const serperKey = process.env.SERPER_API_KEY

  if (!serperKey) {
    logger.info(`[serpHuntingSource] No SERPER_API_KEY, using mock data`)
    const leads = generateMockLeads(40)
    await saveRawLeads(orgId, leads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads, isMock: true }
  }

  const { runId } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const leads = []
    const seenDomains = new Set()

    // Default intent queries (can be customized per org)
    const defaultQueries = [
      'besoin agence web',
      'cherche prestataire marketing',
      'recherche solution logiciel',
      'devis nettoyage bureaux',
      'audit gratuit site web',
      'comparatif logiciel gestion',
    ]

    const queries = config.customQueries?.length > 0 ? config.customQueries : defaultQueries
    const queriesPerRun = Math.min(config.queriesPerRun || 20, queries.length)

    // Rotate queries daily
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
    const startIdx = (dayOfYear * queriesPerRun) % queries.length

    for (let i = 0; i < queriesPerRun; i++) {
      const queryIdx = (startIdx + i) % queries.length
      const query = queries[queryIdx]

      try {
        const serpData = await searchSerper(query)
        const organicResults = serpData.organic || []

        for (const result of organicResults) {
          const url = result.link || ''
          let domain = ''

          try {
            domain = new URL(url).hostname.replace('www.', '').toLowerCase()
          } catch {
            continue
          }

          // Skip known non-business domains
          if (isNonBusinessDomain(domain) || seenDomains.has(domain)) continue
          seenDomains.add(domain)

          // Try Hunter enrichment
          let email = ''
          let firstName = ''
          let lastName = ''
          const hunterResults = await searchHunter(domain)

          if (hunterResults?.length > 0) {
            const best = hunterResults[0]
            email = best.value || ''
            firstName = best.first_name || ''
            lastName = best.last_name || ''
          }

          const lead = normalizeToLead({
            companyName: result.title || domain,
            email,
            firstName,
            lastName,
            website: url,
            country: 'FR',
            intentSignals: [{
              type: email ? 'high_intent' : 'medium_intent',
              detail: `SERP: "${query}" - ${result.title}`,
              query,
              position: result.position || 0,
            }],
          }, SOURCE_ID, SOURCE_GROUP)

          leads.push(lead)
        }
      } catch (error) {
        logger.warn(`[serpHuntingSource] Query "${query}" failed:`, error.message)
      }
    }

    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[serpHuntingSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[serpHuntingSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })
    throw error
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function isNonBusinessDomain(domain) {
  const excluded = [
    'google.com', 'google.fr', 'facebook.com', 'twitter.com', 'linkedin.com',
    'instagram.com', 'youtube.com', 'wikipedia.org', 'amazon.fr', 'amazon.com',
    'leboncoin.fr', 'pagesjaunes.fr', 'indeed.fr', 'glassdoor.fr',
    'stackoverflow.com', 'github.com', 'reddit.com', 'tiktok.com',
  ]
  return excluded.some(d => domain.includes(d))
}
