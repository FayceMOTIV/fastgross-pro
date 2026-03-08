/**
 * caSourceLinkedIn.js
 * Source 6 — Estimation CA via nombre d'employes LinkedIn (via Serper cache)
 *
 * Formule : CA = nb_employes_linkedin x ratio_CA_par_salarie(NAF2)
 * Fiabilite : MOYEN (LinkedIn souvent surcote de 10-20%)
 */

import { logger } from 'firebase-functions/v2'

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromLinkedIn(lead) {
  const linkedinEmployees = lead?.linkedin_employees
    || lead?.linkedinData?.employees
    || lead?.linkedinData?.employeeCount
    || lead?.nbEmployesLinkedin
    || null

  if (!linkedinEmployees || linkedinEmployees <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de donnees employes LinkedIn' }
  }

  // Import dynamique pour reutiliser les ratios de SireneEffectif
  let RATIOS_CA_PAR_SALARIE
  try {
    const sireneModule = await import('./caSourceSireneEffectif.js')
    RATIOS_CA_PAR_SALARIE = sireneModule.RATIOS_CA_PAR_SALARIE
  } catch {
    RATIOS_CA_PAR_SALARIE = {}
  }

  const nafCode = lead?.naf || lead?.codeNaf || lead?.activitePrincipale || null
  const naf2 = nafCode ? nafCode.slice(0, 2) : null
  const ratio = (naf2 && RATIOS_CA_PAR_SALARIE[naf2]) || 130_000

  // LinkedIn surestime de ~15% en moyenne (stagiaires, consultants externes, etc.)
  const employesCorriges = Math.round(linkedinEmployees * 0.85)
  const estimate = employesCorriges * ratio
  const low = Math.round(estimate * 0.7)
  const high = Math.round(estimate * 1.4)

  // Confiance : 50 de base, +10 si NAF connu, +5 si > 10 employes
  let confidence = 50
  if (naf2 && RATIOS_CA_PAR_SALARIE[naf2]) confidence += 10
  if (linkedinEmployees > 10) confidence += 5
  if (linkedinEmployees > 50) confidence += 5

  logger.info(`[CA-LinkedIn] employees=${linkedinEmployees} corriges=${employesCorriges} naf2=${naf2} ratio=${ratio} => ${estimate}`)

  return {
    estimate: Math.round(estimate),
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `LinkedIn ~${linkedinEmployees} employes (corrige ${employesCorriges}) x ${ratio} EUR/sal`,
  }
}
