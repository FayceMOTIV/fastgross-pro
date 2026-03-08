/**
 * BODACC Scraper — Intent Hunter Pro
 *
 * Scrapes the Bulletin Officiel des Annonces Civiles et Commerciales
 * for business lifecycle events (capital increase, director change,
 * new establishment, revenue growth).
 *
 * API: https://bodacc-datadila.opendatasoft.com/api/ (free, no auth)
 * Rate limit: respectful 10 req/min (public API courtesy)
 *
 * @module intentHunter/pro/scrapers/bodaccScraper
 */

import axios from 'axios'

const BASE_URL = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/'
const DATASET = 'annonces-commerciales'

/** Event types that signal business intent */
const INTENT_TYPES = {
  'Immatriculation': 'creation_entreprise',
  'Modification': 'modification_entreprise',
  'Vente': 'vente_fonds',
  'Radiation': 'radiation'
}

/** Keywords that indicate high-value business events */
const HIGH_INTENT_KEYWORDS = [
  'augmentation de capital',
  'changement de dirigeant',
  'nomination',
  'ouverture',
  'transfert de siege',
  'transformation',
  'fusion',
  'apport partiel'
]

const RATE_LIMIT_MS = 6500 // ~9 req/min for public API courtesy

/**
 * Sleep with jitter
 * @param {number} baseMs
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.25)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Detect intent signals in BODACC announcement text
 * @param {string} text - Announcement description
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, eventType: string, signal: string }}
 */
const analyzeAnnouncement = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedClient = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedIntent = HIGH_INTENT_KEYWORDS.filter((kw) => lower.includes(kw))

  const eventType = matchedIntent.length > 0 ? matchedIntent[0] : 'autre'
  const signal = matchedIntent.length > 0
    ? `Evenement BODACC: ${matchedIntent.join(', ')}${matchedClient.length > 0 ? ` + mots-cles: ${matchedClient.join(', ')}` : ''}`
    : matchedClient.length > 0
      ? `Mots-cles BODACC: ${matchedClient.join(', ')}`
      : ''

  return {
    matchCount: matchedClient.length + matchedIntent.length,
    eventType,
    signal
  }
}

/**
 * Extract company info from BODACC record fields
 * @param {object} fields - Record fields from API
 * @returns {{ company: string|null, siret: string|null, location: string|null }}
 */
const extractCompanyInfo = (fields) => ({
  company: fields.denomination || fields.commercant || null,
  siret: fields.registre || fields.numeroImmatriculation || null,
  location: [fields.ville, fields.departement].filter(Boolean).join(', ') || null
})

/**
 * Scrape BODACC for business intent signals
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {string} [config.departement] - Filter by departement code
 * @returns {Promise<Array>} Standardized leads
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, departement } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'bodacc_scraper_start',
    clientId,
    keywords,
    maxResults,
    departement: departement || 'all',
    timestamp: Date.now()
  }))

  try {
    const searchTerms = [...keywords, ...HIGH_INTENT_KEYWORDS.slice(0, 3)]
    const batchSize = 20

    for (let offset = 0; offset < maxResults && leads.length < maxResults; offset += batchSize) {
      try {
        const params = {
          dataset: DATASET,
          q: searchTerms.join(' OR '),
          rows: batchSize,
          start: offset,
          sort: '-dateparution'
        }

        if (departement) {
          params.refine = `departement_nom_officiel:${departement}`
        }

        const response = await axios.get(BASE_URL, { params, timeout: 15000 })
        const records = response.data?.records || []

        if (records.length === 0) break

        for (const record of records) {
          if (leads.length >= maxResults) break

          const fields = record.fields || {}
          const description = fields.description || fields.listeprecedentepublication || ''
          const intent = analyzeAnnouncement(description, keywords)

          if (intent.matchCount === 0) continue

          const info = extractCompanyInfo(fields)

          leads.push({
            source: 'bodacc',
            sourceUrl: `https://bodacc-datadila.opendatasoft.com/explore/dataset/${DATASET}/table/?q=${encodeURIComponent(info.company || '')}`,
            sourcePublicStatement: description.slice(0, 500),
            platform: 'bodacc',
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            company: info.company,
            linkedinUrl: null,
            nativeContactId: info.siret,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: false,
            budgetMentioned: false,
            postedAt: fields.dateparution
              ? new Date(fields.dateparution).getTime()
              : Date.now(),
            rawData: {
              recordId: record.recordid,
              eventType: intent.eventType,
              location: info.location,
              departement: fields.departement_nom_officiel || null,
              typeAnnonce: fields.typeavis || null
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'bodacc_scraper_page_error',
          offset,
          error: pageError.message,
          timestamp: Date.now()
        }))
        break
      }
    }

    console.log(JSON.stringify({
      event: 'bodacc_scraper_complete',
      clientId,
      leadsFound: leads.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'bodacc_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
