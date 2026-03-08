/**
 * BOAMP Historique Scraper — Intent Hunter Pro
 *
 * Searches the Bulletin Officiel des Annonces de Marches Publics
 * for EXPIRED tenders (marches publics arrives a echeance).
 * Companies that lost a public tender or whose contract expired
 * are high-intent leads — they have proven budget, defined needs,
 * and are actively looking for alternative solutions.
 *
 * API: https://boamp-datadila.opendatasoft.com/api/ (free, no auth)
 * Rate limit: 20 req/min
 * Strategy: Filter for tenders with past deadlines + attribution notices
 *
 * @module intentHunter/pro/scrapers/boampHistoriqueScraper
 */

import axios from 'axios'

const BASE_URL = 'https://boamp-datadila.opendatasoft.com/api/records/1.0/search/'
const DATASET = 'boamp'

const RATE_LIMIT_MS = 3200 // ~18 req/min to stay safe under 20

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
 * Build date string for N days ago (YYYY-MM-DD)
 * @param {number} days
 * @returns {string}
 */
const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
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
 * Determine if tender is expired / lost opportunity
 * @param {object} fields - Record fields
 * @returns {{ isExpired: boolean, expiryType: string }}
 */
const classifyExpiry = (fields) => {
  const deadline = parseDeadline(fields)
  const now = Date.now()

  // Tender deadline has passed
  if (deadline && deadline < now) {
    const daysSinceExpiry = Math.floor((now - deadline) / (24 * 3600 * 1000))

    if (daysSinceExpiry <= 30) {
      return { isExpired: true, expiryType: 'recent_deadline_passed' }
    }
    if (daysSinceExpiry <= 90) {
      return { isExpired: true, expiryType: 'deadline_expired_1_3_months' }
    }
    return { isExpired: true, expiryType: 'old_expired' }
  }

  // Check for attribution/result notices (avis d'attribution = someone else won)
  const nature = (fields.nature || '').toLowerCase()
  const typeAvis = (fields.type_avis || fields.typeavis || '').toLowerCase()

  if (nature.includes('attribution') || typeAvis.includes('attribution') || typeAvis.includes('resultat')) {
    return { isExpired: true, expiryType: 'attribution_notice' }
  }

  // Check for cancellation notices (marche infructueux, annule)
  const objet = (fields.objet || '').toLowerCase()
  if (
    objet.includes('infructueux') || objet.includes('sans suite') ||
    objet.includes('annul') || objet.includes('declare sans suite')
  ) {
    return { isExpired: true, expiryType: 'cancelled_tender' }
  }

  return { isExpired: false, expiryType: 'active' }
}

/**
 * Analyze keyword relevance in tender description
 * @param {string} text
 * @param {Array<string>} keywords
 * @param {string} expiryType
 * @returns {{ matchCount: number, signal: string }}
 */
const analyzeRelevance = (text, keywords, expiryType) => {
  const lower = (text || '').toLowerCase()
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()))

  const expiryLabels = {
    recent_deadline_passed: 'Appel d\'offres expire recemment — besoin non couvert',
    deadline_expired_1_3_months: 'Marche expire 1-3 mois — solution alternative recherchee',
    attribution_notice: 'Marche attribue — candidats perdants disponibles',
    cancelled_tender: 'Marche annule/infructueux — besoin toujours present',
    old_expired: 'Ancien marche expire'
  }

  const label = expiryLabels[expiryType] || 'Marche historique'

  const signal = [
    label,
    matched.length > 0 ? `Mots-cles: ${matched.join(', ')}` : ''
  ].filter(Boolean).join(' — ')

  return { matchCount: Math.max(matched.length, 1), signal }
}

/**
 * Scrape BOAMP for expired tender leads
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=30] - Max total results
 * @param {string} [config.departement] - Filter by departement
 * @param {number} [config.minAmount] - Min estimated amount in EUR
 * @param {number} [config.lookbackDays=90] - How far back to search (days)
 * @returns {Promise<Array>} Standardized leads with expiredTender: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 30,
    departement,
    minAmount,
    lookbackDays = 90
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'boamp_historique_scraper_start',
    clientId,
    keywords,
    maxResults,
    departement: departement || 'all',
    minAmount: minAmount || 'none',
    lookbackDays,
    timestamp: Date.now()
  }))

  try {
    const batchSize = 20
    const sinceDate = daysAgo(lookbackDays)

    for (let offset = 0; offset < maxResults * 3 && leads.length < maxResults; offset += batchSize) {
      try {
        const params = {
          dataset: DATASET,
          q: keywords.join(' OR '),
          rows: batchSize,
          start: offset,
          sort: '-dateparution'
        }

        // Filter for records published in the lookback window
        params['refine.dateparution'] = undefined
        params.q += ` AND dateparution>=${sinceDate}`

        if (departement) {
          params['refine.departement'] = departement
        }

        const response = await axios.get(BASE_URL, { params, timeout: 15000 })
        const records = response.data?.records || []

        if (records.length === 0) break

        for (const record of records) {
          if (leads.length >= maxResults) break

          const fields = record.fields || {}
          const expiry = classifyExpiry(fields)

          // Only include expired/attributed/cancelled tenders
          if (!expiry.isExpired) continue

          // Skip very old tenders (expiryType: old_expired) unless explicitly wanted
          if (expiry.expiryType === 'old_expired') continue

          const description = fields.objet || fields.descripteurs || ''
          const amount = parseAmount(fields)

          if (minAmount && amount !== null && amount < minAmount) continue

          const relevance = analyzeRelevance(description, keywords, expiry.expiryType)
          const buyer = extractBuyerInfo(fields)
          const deadline = parseDeadline(fields)

          leads.push({
            source: 'boamp_historique',
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
            urgencyDetected: expiry.expiryType === 'recent_deadline_passed' || expiry.expiryType === 'cancelled_tender',
            budgetMentioned: amount !== null,
            expiredTender: true,
            expiryType: expiry.expiryType,
            postedAt: fields.dateparution
              ? new Date(fields.dateparution).getTime()
              : Date.now(),
            rawData: {
              recordId: record.recordid,
              estimatedAmount: amount,
              deadline,
              deadlineExpiredSinceDays: deadline
                ? Math.floor((Date.now() - deadline) / (24 * 3600 * 1000))
                : null,
              location: buyer.location,
              nature: fields.nature || null,
              typeAvis: fields.type_avis || fields.typeavis || null,
              procedure: fields.procedure || null,
              cpv: fields.cpv || null,
              expiryType: expiry.expiryType
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (pageError) {
        console.log(JSON.stringify({
          event: 'boamp_historique_scraper_page_error',
          offset,
          error: pageError.message,
          timestamp: Date.now()
        }))
        break
      }
    }

    console.log(JSON.stringify({
      event: 'boamp_historique_scraper_complete',
      clientId,
      leadsFound: leads.length,
      allExpiredTenders: true,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'boamp_historique_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
