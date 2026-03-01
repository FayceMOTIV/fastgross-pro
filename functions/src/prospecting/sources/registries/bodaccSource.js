/**
 * BODACC Source — Bulletin Officiel des Annonces Civiles et Commerciales
 *
 * API: https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/
 * Auth: aucune (API ouverte)
 * Estimated: ~5K leads/mois (150-200/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads } from '../_baseSource.js'

const SOURCE_ID = 'bodacc'
const SOURCE_GROUP = 'registries'
const API_BASE = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 30) {
  const types = ['creation', 'modification']
  const cities = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes']

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % 2]
    const city = cities[i % cities.length]
    return normalizeToLead({
      companyName: `Societe BODACC ${i + 1} SARL`,
      siret: `${String(90000000 + i).padStart(9, '0')}`,
      city,
      postalCode: `${String(10 + (i % 90)).padStart(2, '0')}000`,
      country: 'FR',
      intentSignals: [{ type, detail: `Annonce BODACC: ${type}` }],
    }, SOURCE_ID, SOURCE_GROUP)
  })
}

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect leads from BODACC Open Data API
 * @param {string} orgId
 * @param {Object} config - { typeAvis, maxResults, dateRange }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const { runId } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - (config.dateRange || 30))
    const dateStr = dateFrom.toISOString().split('T')[0]

    const typeAvis = config.typeAvis || ['creation', 'modification']
    const maxResults = config.maxResults || 200
    const leads = []

    for (const type of typeAvis) {
      const params = new URLSearchParams({
        limit: String(Math.min(100, maxResults)),
        offset: '0',
        where: `dateparution >= '${dateStr}' AND typeavis = '${type}'`,
        order_by: 'dateparution DESC',
      })

      let fetched = 0
      let offset = 0

      while (fetched < maxResults / typeAvis.length) {
        params.set('offset', String(offset))

        const response = await fetch(`${API_BASE}?${params}`)

        if (!response.ok) {
          throw new Error(`BODACC API ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const records = data.results || []

        if (records.length === 0) break

        for (const record of records) {
          const fields = record
          const lead = normalizeToLead({
            companyName: fields.denomination || fields.commercant || '',
            siret: fields.registre || '',
            address: fields.adresse || '',
            city: fields.ville || '',
            postalCode: fields.codepostal || '',
            country: 'FR',
            naf: fields.activite || '',
            intentSignals: [{
              type: type === 'creation' ? 'creation' : 'modification',
              detail: `Annonce BODACC ${type}: ${fields.dateparution || ''}`,
              date: fields.dateparution,
            }],
          }, SOURCE_ID, SOURCE_GROUP)

          if (lead.companyName) {
            leads.push(lead)
            fetched++
          }
        }

        offset += records.length
        if (records.length < 100) break

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[bodaccSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[bodaccSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })

    // Fallback to mock
    const mockLeads = generateMockLeads(30)
    await saveRawLeads(orgId, mockLeads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads: mockLeads, isMock: true, error: error.message }
  }
}
