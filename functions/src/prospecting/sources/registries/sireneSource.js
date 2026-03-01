/**
 * SIRENE Source — INSEE SIRENE API (registre national des entreprises)
 *
 * API: https://api.insee.fr/entreprises/sirene/V3.11/siret
 * Auth: Bearer token via INSEE_API_KEY
 * Estimated: ~15K leads/mois (500-700/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads, withRateLimit } from '../_baseSource.js'

const SOURCE_ID = 'sirene'
const SOURCE_GROUP = 'registries'
const API_BASE = 'https://api.insee.fr/entreprises/sirene/V3.11'

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

function generateMockLeads(count = 50) {
  const sectors = [
    { naf: '6201Z', label: 'Programmation informatique' },
    { naf: '6311Z', label: 'Traitement de donnees' },
    { naf: '7022Z', label: 'Conseil en gestion' },
    { naf: '4711F', label: 'Commerce de detail' },
    { naf: '5610A', label: 'Restauration traditionnelle' },
  ]
  const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nantes', 'Lille', 'Strasbourg']

  return Array.from({ length: count }, (_, i) => {
    const sector = sectors[i % sectors.length]
    const city = cities[i % cities.length]
    return normalizeToLead({
      companyName: `Entreprise Mock ${i + 1} SAS`,
      siret: `${String(80000000 + i).padStart(9, '0')}00001`,
      naf: sector.naf,
      nafLabel: sector.label,
      city,
      postalCode: `${String(10 + (i % 90)).padStart(2, '0')}000`,
      address: `${i + 1} rue de la Paix`,
      country: 'FR',
      website: `https://entreprise-mock-${i + 1}.fr`,
      employeeCount: Math.floor(Math.random() * 50) + 1,
      intentSignals: i % 3 === 0 ? [{ type: 'recent_creation', detail: 'Cree il y a moins de 6 mois' }] : [],
    }, SOURCE_ID, SOURCE_GROUP)
  })
}

// ─── COLLECT ────────────────────────────────────────────────────────────────

/**
 * Collect leads from SIRENE API
 * @param {string} orgId
 * @param {Object} config - { nafCodes, etatAdministratif, maxResults, dateRange }
 * @returns {Object} { leads, isMock }
 */
export async function collect(orgId, config = {}) {
  const apiKey = process.env.INSEE_API_KEY

  // Mock fallback
  if (!apiKey) {
    logger.info(`[sireneSource] No INSEE_API_KEY, using mock data`)
    const leads = generateMockLeads(config.maxResults || 50)
    await saveRawLeads(orgId, leads, SOURCE_ID, `mock-${Date.now()}`)
    return { leads, isMock: true }
  }

  const { runId, runRef } = await createSourceRun(orgId, SOURCE_ID)

  try {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - (config.dateRange || 30))
    const dateStr = dateFrom.toISOString().split('T')[0]

    // Build query
    let query = `dateCreationEtablissement:[${dateStr} TO *] AND etatAdministratifEtablissement:${config.etatAdministratif || 'A'}`

    if (config.nafCodes?.length > 0) {
      const nafFilter = config.nafCodes.map(c => `activitePrincipaleEtablissement:${c}`).join(' OR ')
      query += ` AND (${nafFilter})`
    }

    const maxResults = Math.min(config.maxResults || 700, 1000)
    const leads = []
    let cursor = '*'
    let fetched = 0

    const fetchPage = withRateLimit(async (cursorVal) => {
      const params = new URLSearchParams({
        q: query,
        nombre: String(Math.min(100, maxResults - fetched)),
        curseur: cursorVal,
      })

      const response = await fetch(`${API_BASE}/siret?${params}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`SIRENE API ${response.status}: ${response.statusText}`)
      }

      return response.json()
    }, 2000)  // 30 req/min = 1 every 2s

    while (fetched < maxResults) {
      const data = await fetchPage(cursor)
      const etablissements = data.etablissements || []

      if (etablissements.length === 0) break

      for (const etab of etablissements) {
        const uniteLegale = etab.uniteLegale || {}
        const adresse = etab.adresseEtablissement || {}
        const periodes = etab.periodesEtablissement?.[0] || {}

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const creationDate = new Date(etab.dateCreationEtablissement || '')
        const isRecent = creationDate > sixMonthsAgo

        const lead = normalizeToLead({
          companyName: uniteLegale.denominationUniteLegale || periodes.denominationUsuelleEtablissement || '',
          siret: etab.siret || '',
          naf: periodes.activitePrincipaleEtablissement || '',
          nafLabel: periodes.activitePrincipaleEtablissementLibelle || '',
          address: [adresse.numeroVoieEtablissement, adresse.typeVoieEtablissement, adresse.libelleVoieEtablissement].filter(Boolean).join(' '),
          city: adresse.libelleCommuneEtablissement || '',
          postalCode: adresse.codePostalEtablissement || '',
          country: 'FR',
          employeeCount: parseEmployeeRange(periodes.trancheEffectifsEtablissement),
          intentSignals: isRecent ? [{ type: 'recent_creation', detail: `Cree le ${etab.dateCreationEtablissement}` }] : [],
        }, SOURCE_ID, SOURCE_GROUP)

        leads.push(lead)
        fetched++
      }

      cursor = data.header?.curseurSuivant || '*'
      if (cursor === '*') break
    }

    // Save to Firestore
    const saveResult = await saveRawLeads(orgId, leads, SOURCE_ID, runId)

    await updateSourceRun(orgId, runId, {
      status: 'completed',
      stats: { collected: leads.length, ...saveResult },
    })

    logger.info(`[sireneSource] Collected ${leads.length} leads for org ${orgId}`)
    return { leads, isMock: false }
  } catch (error) {
    logger.error(`[sireneSource] Error:`, error)
    await updateSourceRun(orgId, runId, {
      status: 'failed',
      error: error.message,
    })
    throw error
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function parseEmployeeRange(tranche) {
  const ranges = {
    '00': 0, '01': 2, '02': 5, '03': 8, '11': 15, '12': 35,
    '21': 75, '22': 150, '31': 350, '32': 750, '41': 1500, '42': 3500, '51': 7500, '52': 9999,
  }
  return ranges[tranche] || null
}
