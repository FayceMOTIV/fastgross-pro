/**
 * France Travail Source — Offres d'emploi (signal de croissance)
 *
 * API: https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search
 * Auth: OAuth2 client_credentials
 * Signal: entreprise qui recrute = croissance = besoin de services
 * Estimated: ~3K leads/mois (100-150/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads } from '../_baseSource.js'

const SOURCE_ID = 'france_travail'
const SOURCE_GROUP = 'registries'
const TOKEN_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token'
const API_BASE = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 25) {
  const jobs = ['Developpeur', 'Commercial', 'Comptable', 'RH', 'Marketing Manager']
  const cities = ['Paris', 'Lyon', 'Toulouse', 'Nantes', 'Bordeaux']

  return Array.from({ length: count }, (_, i) => {
    const city = cities[i % cities.length]
    return normalizeToLead({
      companyName: `Recruteur FR ${i + 1} SAS`,
      city,
      postalCode: `${String(30 + (i % 70)).padStart(2, '0')}000`,
      country: 'FR',
      jobTitle: jobs[i % jobs.length],
      intentSignals: [{ type: 'recruiting', detail: `Recrute: ${jobs[i % jobs.length]}` }],
    }, SOURCE_ID, SOURCE_GROUP)
  })
}

// ─── OAUTH2 TOKEN ───────────────────────────────────────────────────────────

async function getAccessToken() {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('FRANCE_TRAVAIL_CLIENT_ID and FRANCE_TRAVAIL_CLIENT_SECRET required')
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: `api_offresdemploiv2 o2dsoffre`,
  })

  const response = await fetch(`${TOKEN_URL}?realm=%2Fpartenaire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  if (!response.ok) {
    throw new Error(`France Travail auth failed: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect leads from France Travail API
 * @param {string} orgId
 * @param {Object} config - { keywords, dateRange, maxResults }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const hasCredentials = process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET

  if (!hasCredentials) {
    logger.info(`[franceTravailSource] No credentials, using mock data`)
    const leads = generateMockLeads(config.maxResults || 25)
    await saveRawLeads(orgId, leads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads, isMock: true }
  }

  const { runId } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const token = await getAccessToken()
    const maxResults = config.maxResults || 150
    const leads = []
    const seenCompanies = new Set()

    // Default keywords if none configured
    const keywords = config.keywords?.length > 0
      ? config.keywords
      : ['commercial', 'marketing', 'developpeur', 'chef de projet']

    for (const keyword of keywords) {
      const params = new URLSearchParams({
        motsCles: keyword,
        range: `0-${Math.min(49, Math.floor(maxResults / keywords.length))}`,
        sort: '1',  // date desc
      })

      // Filter by date
      if (config.dateRange) {
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - config.dateRange)
        params.set('minCreationDate', dateFrom.toISOString().split('T')[0])
      }

      const response = await fetch(`${API_BASE}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        logger.warn(`[franceTravailSource] API error for keyword "${keyword}": ${response.status}`)
        continue
      }

      const data = await response.json()
      const resultats = data.resultats || []

      for (const offre of resultats) {
        const companyName = offre.entreprise?.nom || ''
        if (!companyName || seenCompanies.has(companyName.toLowerCase())) continue
        seenCompanies.add(companyName.toLowerCase())

        const lead = normalizeToLead({
          companyName,
          city: offre.lieuTravail?.libelle || '',
          postalCode: offre.lieuTravail?.codePostal || '',
          country: 'FR',
          naf: offre.codeNAF || '',
          nafLabel: offre.secteurActiviteLibelle || '',
          website: offre.entreprise?.url || '',
          jobTitle: offre.intitule || '',
          intentSignals: [{
            type: 'recruiting',
            detail: `Recrute: ${offre.intitule || keyword}`,
            contractType: offre.typeContratLibelle || '',
            date: offre.dateCreation,
          }],
        }, SOURCE_ID, SOURCE_GROUP)

        leads.push(lead)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[franceTravailSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[franceTravailSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })
    throw error
  }
}
