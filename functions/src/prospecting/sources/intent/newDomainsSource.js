/**
 * New Domains Source — WhoisDS / nouveaux domaines .fr
 *
 * Source: WhoisDS free daily CSV (nrd .fr) or web scraping fallback
 * Pipeline: Download CSV → filter pro domains → extract emails
 * Estimated: ~15K leads/mois (500/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads, withRateLimit } from '../_baseSource.js'

const SOURCE_ID = 'new_domains'
const SOURCE_GROUP = 'intent'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 50) {
  const tlds = ['.fr', '.com', '.io']
  const prefixes = ['digital', 'tech', 'consulting', 'studio', 'agency', 'solutions', 'lab']

  return Array.from({ length: count }, (_, i) => {
    const prefix = prefixes[i % prefixes.length]
    const tld = tlds[i % tlds.length]
    const domain = `${prefix}-${i + 1}${tld}`
    return normalizeToLead({
      companyName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} ${i + 1}`,
      website: `https://${domain}`,
      email: `contact@${domain}`,
      country: 'FR',
      intentSignals: [{
        type: 'professional_site',
        detail: `Nouveau domaine: ${domain}`,
        registeredDate: new Date().toISOString().split('T')[0],
      }],
    }, SOURCE_ID, SOURCE_GROUP)
  })
}

// ─── HUNTER DOMAIN SEARCH ───────────────────────────────────────────────────

const enrichWithHunter = withRateLimit(async (domain) => {
  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) return null

  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}&limit=3`
  )

  if (!response.ok) return null

  const data = await response.json()
  return {
    emails: data.data?.emails || [],
    organization: data.data?.organization || '',
  }
}, 2000)

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect new domain registrations
 * @param {string} orgId
 * @param {Object} config - { tlds, maxResults }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const { runId } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const maxResults = config.maxResults || 500
    const leads = []

    // Try WhoisDS free NRD feed
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    // WhoisDS provides free daily domain lists
    const whoisUrl = `https://www.whoisds.com/newly-registered-domains/${dateStr}/nrd`

    let domains = []

    try {
      const response = await fetch(whoisUrl)
      if (response.ok) {
        const text = await response.text()
        domains = text.split('\n')
          .map(line => line.trim())
          .filter(d => d && !d.startsWith('#'))
      }
    } catch (error) {
      logger.warn(`[newDomainsSource] WhoisDS fetch failed:`, error.message)
    }

    // Filter by configured TLDs
    const tlds = config.tlds || ['.fr']
    const filteredDomains = domains.filter(d =>
      tlds.some(tld => d.endsWith(tld))
    )

    // Filter out obviously non-business domains
    const proDomains = filteredDomains
      .filter(d => !isParkedOrJunk(d))
      .slice(0, maxResults)

    // If we got no domains from WhoisDS, use mock
    if (proDomains.length === 0) {
      logger.info(`[newDomainsSource] No domains from WhoisDS, using mock data`)
      const mockLeads = generateMockLeads(maxResults)
      await saveRawLeads(orgId, mockLeads, SOURCE_ID, `mock-${Date.now()}`)
      await updateSourceRun(orgId, runId, {
        status: 'completed',
        stats: { collected: mockLeads.length },
      })
      return { leads: mockLeads, isMock: true }
    }

    // Enrich top domains with Hunter
    for (const domain of proDomains.slice(0, maxResults)) {
      const hunterData = await enrichWithHunter(domain)

      const email = hunterData?.emails?.[0]?.value || ''
      const firstName = hunterData?.emails?.[0]?.first_name || ''
      const lastName = hunterData?.emails?.[0]?.last_name || ''
      const companyName = hunterData?.organization || domain.split('.')[0]

      const isPro = !!email || (hunterData?.emails?.length || 0) > 0

      const lead = normalizeToLead({
        companyName,
        email,
        firstName,
        lastName,
        website: `https://${domain}`,
        country: 'FR',
        intentSignals: [{
          type: isPro ? 'professional_site' : 'new_domain',
          detail: `Nouveau domaine: ${domain}`,
          registeredDate: dateStr,
        }],
      }, SOURCE_ID, SOURCE_GROUP)

      leads.push(lead)
    }

    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[newDomainsSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[newDomainsSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })

    const mockLeads = generateMockLeads(50)
    await saveRawLeads(orgId, mockLeads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads: mockLeads, isMock: true, error: error.message }
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function isParkedOrJunk(domain) {
  const junkPatterns = [
    /^[a-z]{1,3}\d{3,}/,    // random alphanumeric
    /^xn--/,                  // punycode
    /\d{5,}/,                 // too many numbers
    /(casino|poker|bet|porn|xxx|adult)/i,
  ]
  return junkPatterns.some(p => p.test(domain))
}
