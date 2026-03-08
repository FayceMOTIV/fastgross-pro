/**
 * caSourceInseeRatios.js
 * Source 10 — Estimation CA via ratios INSEE sectoriels
 *
 * Utilise le code NAF + departement pour estimer le CA moyen du secteur.
 * Source : INSEE ESANE 2023 (CA moyen par division NAF et taille)
 * Fiabilite : FAIBLE (moyenne sectorielle, pas individuelle)
 */

import { logger } from 'firebase-functions/v2'

/**
 * CA moyen par division NAF2 pour une PME typique (10-49 salaries)
 * Source : INSEE ESANE 2023
 */
const CA_MOYEN_PME_PAR_NAF2 = {
  '01': 800_000,
  '10': 3_000_000,
  '13': 2_000_000,
  '20': 5_000_000,
  '22': 3_500_000,
  '23': 3_000_000,
  '25': 2_500_000,
  '28': 4_000_000,
  '29': 8_000_000,
  '31': 2_000_000,
  '35': 10_000_000,
  '41': 5_000_000,
  '42': 6_000_000,
  '43': 2_000_000,
  '45': 8_000_000,
  '46': 12_000_000,
  '47': 3_000_000,
  '49': 3_000_000,
  '52': 5_000_000,
  '55': 1_500_000,
  '56': 800_000,
  '58': 3_000_000,
  '62': 2_000_000,
  '63': 2_500_000,
  '64': 5_000_000,
  '66': 3_000_000,
  '68': 4_000_000,
  '69': 1_500_000,
  '70': 2_000_000,
  '71': 2_000_000,
  '72': 2_000_000,
  '73': 2_000_000,
  '74': 1_500_000,
  '77': 3_000_000,
  '78': 5_000_000,
  '80': 2_000_000,
  '81': 1_500_000,
  '82': 1_500_000,
  '85': 800_000,
  '86': 2_000_000,
  '88': 800_000,
  '90': 1_000_000,
  '93': 1_000_000,
  '95': 1_500_000,
  '96': 600_000,
}

/**
 * Coefficients correcteurs par departement (IDF plus cher, rural moins)
 */
const COEFF_DEPARTEMENT = {
  '75': 1.5,  // Paris
  '92': 1.4,  // Hauts-de-Seine
  '93': 1.1,  // Seine-Saint-Denis
  '94': 1.2,  // Val-de-Marne
  '78': 1.2,  // Yvelines
  '91': 1.1,  // Essonne
  '95': 1.1,  // Val-d'Oise
  '77': 1.0,  // Seine-et-Marne
  '69': 1.2,  // Rhone (Lyon)
  '13': 1.1,  // Bouches-du-Rhone
  '31': 1.1,  // Haute-Garonne (Toulouse)
  '33': 1.1,  // Gironde (Bordeaux)
  '06': 1.2,  // Alpes-Maritimes (Nice)
  '59': 1.1,  // Nord (Lille)
  '67': 1.1,  // Bas-Rhin (Strasbourg)
}

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromInseeRatios(lead) {
  const nafCode = lead?.naf || lead?.codeNaf || lead?.activitePrincipale || null
  const naf2 = nafCode ? nafCode.slice(0, 2) : null

  if (!naf2 || !CA_MOYEN_PME_PAR_NAF2[naf2]) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Code NAF inconnu ou non couvert' }
  }

  const caBase = CA_MOYEN_PME_PAR_NAF2[naf2]
  const dept = lead?.departement || lead?.code_postal?.slice(0, 2) || null
  const coeffDept = (dept && COEFF_DEPARTEMENT[dept]) || 1.0

  const estimate = Math.round(caBase * coeffDept)
  const low = Math.round(estimate * 0.3)  // Fourchette tres large pour une moyenne
  const high = Math.round(estimate * 3)

  // Confiance : 15 de base (c'est une moyenne sectorielle)
  // +5 si departement connu
  let confidence = 15
  if (dept && COEFF_DEPARTEMENT[dept]) confidence += 5

  logger.info(`[CA-InseeRatios] naf2=${naf2} dept=${dept} coeff=${coeffDept} => ${estimate}`)

  return {
    estimate,
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `Moyenne INSEE NAF ${naf2} (PME 10-49 sal) : ${caBase} EUR${coeffDept !== 1 ? ` x ${coeffDept} (dept ${dept})` : ''}`,
  }
}
