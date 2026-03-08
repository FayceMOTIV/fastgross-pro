/**
 * BOAMP Scraper — Intent Hunter Pro
 *
 * Scrapes the Bulletin Officiel des Annonces de Marches Publics
 * for public procurement / tender notices. These are high-intent
 * leads with guaranteed budget.
 *
 * API: https://boamp-datadila.opendatasoft.com/api/ (free, no auth)
 * Updated: 2x/day
 * FORCED SCORE 100: all BOAMP leads get boampMarket: true
 *
 * @module intentHunter/pro/scrapers/boampScraper
 */

import axios from 'axios'

const BASE_URL = 'https://boamp-datadila.opendatasoft.com/api/records/1.0/search/'
const DATASET = 'boamp'

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
 * Extract buyer / contact info from BOAMP record
 * @param {object} fields - Record fields
 * @returns {{ buyer: string|null, contact: string|null, location: string|null }}
 */
const extractBuyerInfo = (fields) => ({
  buyer: fields.denomination || fields.nom_acheteur || fields.organisme || null,
  contact: fields.email || fields.contact || null,
  location: [fields.ville, fields.cp].filter(Boolean).join(' ') || null
})

/**
 * Parse estimated amount from text fields
 * @param {object} fields - Record fields
 * @returns {number|null} Estimated amount in EUR
 */
const parseAmount = (fields) => {
  const amountStr = fields.montant || fields.valeur_estimee || ''
  const match = amountStr.toString().match(/([\d\s,.]+)/)
  if (!match) return null

  const cleaned = match[1].replace(/\s/g, '').replace(',', '.')
  const value = parseFloat(cleaned)
  return isNaN(value) ? null : value
}

/**
 * Parse deadline date from fields
 * @param {object} fields
 * @returns {number|null} Timestamp
 */
const parseDeadline = (fields) => {
  const dateStr = fields.date_limite_reponse || fields.datelimiteremiseoffres || null
  if (!dateStr) return null

  const parsed = new Date(dateStr).getTime()
  return isNaN(parsed) ? null : parsed
}

/**
 * Analyze keyword relevance in tender description
 * @param {string} text
 * @param {Array<string>} keywords
 * @returns {{ matchCount: number, signal: string }}
 */
const analyzeRelevance = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const signal = matched.length > 0
    ? `Marche public detecte — mots-cles: ${matched.join(', ')}`
    : 'Marche public detecte (correspondance globale)'

  return { matchCount: Math.max(matched.length, 1), signal }
}

/**
 * Scrape BOAMP for public procurement leads
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=30] - Max total results
 * @param {string} [config.departement] - Filter by departement
 * @param {number} [config.minAmount] - Min estimated amount in EUR
 * @returns {Promise<Array>} Standardized leads with boampMarket: true
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 30, departement, minAmount } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'boamp_scraper_start',
    clientId,
    keywords,
    maxResults,
    departement: departement || 'all',
    minAmount: minAmount || 'none',
    timestamp: Date.now()
  }))

  try {
    const batchSize = 20

    for (let offset = 0; offset < maxResults * 2 && leads.length < maxResults; offset += batchSize) {
      try {
        const params = {
          dataset: DATASET,
          q: keywords.join(' OR '),
          rows: batchSize,
          start: offset,
          sort: '-dateparution'
        }

        if (departement) {
          params.refine = `departement:${departement}`
        }

        const response = await axios.get(BASE_URL, { params, timeout: 15000 })
        const records = response.data?.records || []

        if (records.length === 0) break

        for (const record of records) {
          if (leads.length >= maxResults) break

          const fields = record.fields || {}
          const description = fields.objet || fields.descripteurs || ''
          const amount = parseAmount(fields)

          if (minAmount && amount !== null && amount < minAmount) continue

          const relevance = analyzeRelevance(description, keywords)
          const buyer = extractBuyerInfo(fields)
          const deadline = parseDeadline(fields)

          leads.push({
            source: 'boamp',
            sourceUrl: fields.url || `https://boamp-datadila.opendatasoft.com/explore/dataset/boamp/table/?q=${encodeURIComponent(description.slice(0, 80))}`,
            sourcePublicStatement: description.slice(0, 500),
            platform: 'boamp',
            firstName: null,
            lastName: null,
            email: buyer.contact,
            phone: null,
            company: buyer.buyer,
            linkedinUrl: null,
            nativeContactId: fields.idweb || record.recordid,
            intentSignal: relevance.signal,
            intentKeywordsCount: relevance.matchCount,
            urgencyDetected: deadline ? deadline < Date.now() + 7 * 24 * 3600 * 1000 : false,
            budgetMentioned: amount !== null,
            boampMarket: true,
            postedAt: fields.dateparution
              ? new Date(fields.dateparution).getTime()
              : Date.now(),
            rawData: {
              recordId: record.recordid,
              estimatedAmount: amount,
              deadline,
              location: buyer.location,
              nature: fields.nature || null,
              procedure: fields.procedure || null,
              cpv: fields.cpv || null
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'boamp_scraper_page_error',
          offset,
          error: pageError.message,
          timestamp: Date.now()
        }))
        break
      }
    }

    console.log(JSON.stringify({
      event: 'boamp_scraper_complete',
      clientId,
      leadsFound: leads.length,
      allBoampMarket: true,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'boamp_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
