/**
 * caSourceSireneEffectif.js
 * Source 3 — Estimation CA via effectif SIRENE x ratio NAF
 *
 * Formule : CA = effectif_moyen(tranche) x ratio_CA_par_salarie(NAF2)
 * Fiabilite : MOYEN (fourchette large mais solide)
 *
 * Exports partages :
 *   RATIOS_CA_PAR_SALARIE — reutilise par caSourceLinkedIn et caSourceWebScraping
 *   TRANCHE_TO_EFFECTIF   — conversion tranche SIRENE vers effectif moyen
 */

import { logger } from 'firebase-functions/v2'

/**
 * Ratio CA/salarie par code NAF 2 chiffres (en EUR)
 * Source : INSEE ESANE 2023, valeurs medianes sectorielles
 */
export const RATIOS_CA_PAR_SALARIE = {
  '01': 95_000,   // Agriculture
  '10': 220_000,  // Industries alimentaires
  '13': 130_000,  // Textile
  '20': 280_000,  // Chimie
  '22': 180_000,  // Plasturgie
  '23': 200_000,  // Materiaux construction
  '25': 160_000,  // Metallurgie
  '28': 190_000,  // Machines equipements
  '29': 350_000,  // Automobile
  '31': 140_000,  // Meubles
  '35': 500_000,  // Energie
  '41': 250_000,  // Construction batiments
  '42': 280_000,  // Genie civil
  '43': 130_000,  // Travaux specialises
  '45': 400_000,  // Commerce vehicules
  '46': 600_000,  // Commerce gros
  '47': 200_000,  // Commerce detail
  '49': 170_000,  // Transport terrestre
  '52': 250_000,  // Entreposage
  '55': 70_000,   // Hebergement
  '56': 65_000,   // Restauration
  '58': 180_000,  // Edition
  '62': 120_000,  // Programmation informatique
  '63': 150_000,  // Services information
  '64': 300_000,  // Services financiers
  '66': 200_000,  // Activites auxiliaires finance
  '68': 250_000,  // Immobilier
  '69': 100_000,  // Juridique comptabilite
  '70': 130_000,  // Conseil gestion
  '71': 110_000,  // Architecture ingenierie
  '72': 100_000,  // R&D
  '73': 120_000,  // Publicite
  '74': 90_000,   // Autres activites specialisees
  '77': 200_000,  // Location
  '78': 50_000,   // Interim (CA/salarie bas car interimaures)
  '80': 100_000,  // Securite
  '81': 60_000,   // Services batiments
  '82': 80_000,   // Services admin
  '85': 50_000,   // Enseignement
  '86': 90_000,   // Sante
  '88': 45_000,   // Action sociale
  '90': 70_000,   // Arts spectacles
  '93': 60_000,   // Sport loisirs
  '95': 100_000,  // Reparation
  '96': 55_000,   // Autres services personnels
}

/** Ratio par defaut si NAF inconnu */
const DEFAULT_RATIO = 130_000

/**
 * Conversion tranche effectif SIRENE → effectif moyen
 * Codes officiels INSEE
 */
export const TRANCHE_TO_EFFECTIF = {
  'NN': 0,    // Non renseigne
  '00': 0,    // 0 salarie
  '01': 1,    // 1-2
  '02': 3,    // 3-5
  '03': 8,    // 6-9
  '11': 15,   // 10-19
  '12': 35,   // 20-49
  '21': 75,   // 50-99
  '22': 150,  // 100-199
  '31': 350,  // 200-249
  '32': 375,  // 250-499
  '33': 750,  // 500-999
  '41': 1500, // 1000-1999
  '42': 3500, // 2000-4999
  '51': 7500, // 5000-9999
  '53': 15000, // 10000+
}

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromSireneEffectif(lead) {
  const trancheCode = lead?.trancheEffectif || lead?.tranche_effectif || null
  const nafCode = lead?.naf || lead?.codeNaf || lead?.activitePrincipale || null

  if (!trancheCode || trancheCode === 'NN' || trancheCode === '00') {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de tranche effectif SIRENE' }
  }

  const effectif = TRANCHE_TO_EFFECTIF[trancheCode]
  if (!effectif) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `Tranche inconnue: ${trancheCode}` }
  }

  const naf2 = nafCode ? nafCode.slice(0, 2) : null
  const ratio = (naf2 && RATIOS_CA_PAR_SALARIE[naf2]) || DEFAULT_RATIO
  const isDefaultRatio = !naf2 || !RATIOS_CA_PAR_SALARIE[naf2]

  const estimate = effectif * ratio
  const low = Math.round(estimate * 0.6)
  const high = Math.round(estimate * 1.5)

  // Confiance : 60 de base, -15 si ratio par defaut, +10 si tranche precise (21+)
  let confidence = 60
  if (isDefaultRatio) confidence -= 15
  if (parseInt(trancheCode) >= 21) confidence += 10

  logger.info(`[CA-SireneEffectif] tranche=${trancheCode} effectif=${effectif} naf2=${naf2} ratio=${ratio} => ${estimate}`)

  return {
    estimate: Math.round(estimate),
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `Effectif ~${effectif} x ${ratio} EUR/sal (NAF ${naf2 || '??'})${isDefaultRatio ? ' [ratio defaut]' : ''}`,
  }
}
