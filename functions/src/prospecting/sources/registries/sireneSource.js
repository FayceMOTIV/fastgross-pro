/**
 * SIRENE Source — INSEE SIRENE API (registre national des entreprises)
 *
 * API: https://api.insee.fr/entreprises/sirene/V3.11/siret
 * Auth: Bearer token via INSEE_API_KEY
 * Estimated: ~15K leads/mois (500-700/run quotidien)
 */

import { logger } from 'firebase-functions/v2'
import { normalizeToLead, createSourceRun, updateSourceRun, saveRawLeads, withRateLimit } from '../_baseSource.js'
import { getClientGeoSettings } from '../../../geo/clientGeoSettings.js'

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

    // Load client geo settings for geographic filtering
    let geoSettings = null
    try {
      geoSettings = await getClientGeoSettings(orgId)
    } catch (geoErr) {
      logger.warn(`[sireneSource] Could not load geoSettings (non-blocking):`, geoErr.message)
    }

    // Build query
    let query = `dateCreationEtablissement:[${dateStr} TO *] AND etatAdministratifEtablissement:${config.etatAdministratif || 'A'}`

    if (config.nafCodes?.length > 0) {
      const nafFilter = config.nafCodes.map(c => `activitePrincipaleEtablissement:${c}`).join(' OR ')
      query += ` AND (${nafFilter})`
    }

    // Geo filter from client settings
    if (geoSettings?.zones?.length > 0) {
      const geoFilters = []
      for (const zone of geoSettings.zones) {
        const sf = zone.sireneFilter || {}
        if (sf.code_postal) {
          geoFilters.push(`codePostalEtablissement:${sf.code_postal}`)
        } else if (sf.code_commune) {
          geoFilters.push(`codeCommuneEtablissement:${sf.code_commune}`)
        } else if (sf.departement) {
          geoFilters.push(`codePostalEtablissement:${sf.departement}*`)
        } else if (sf.region) {
          const REGIONS_DEPTS = { '11': ['75','77','78','91','92','93','94','95'], '24': ['18','28','36','37','41','45'], '27': ['21','25','39','58','70','71','89','90'], '28': ['14','27','50','61','76'], '32': ['02','59','60','62','80'], '44': ['08','10','51','52','54','55','57','67','68','88'], '52': ['44','49','53','72','85'], '53': ['22','29','35','56'], '75': ['16','17','19','23','24','33','40','47','64','79','86','87'], '76': ['09','11','12','30','31','32','34','46','48','65','66','81','82'], '84': ['01','03','07','15','26','38','42','43','63','69','73','74'], '93': ['04','05','06','13','83','84'], '94': ['2A','2B'] }
          const depts = REGIONS_DEPTS[sf.region] || []
          if (depts.length > 0) {
            const deptFilter = depts.map(d => `codePostalEtablissement:${d}*`).join(' OR ')
            geoFilters.push(`(${deptFilter})`)
          }
        }
        // type 'france' or empty sireneFilter → no filter (national)
      }
      if (geoFilters.length > 0) {
        query += ` AND (${geoFilters.join(' OR ')})`
      }
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
