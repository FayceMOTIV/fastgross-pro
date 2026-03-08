/**
 * caSourceAnciennete.js
 * Source 5 — Estimation CA via anciennete + NAF + forme juridique
 *
 * Hypothese : une entreprise qui survit X annees a un CA minimum viable
 * Fiabilite : FAIBLE (fourchette tres large)
 */

import { logger } from 'firebase-functions/v2'

/**
 * CA minimum viable par tranche d'anciennete (en EUR)
 * Source : INSEE, taux de survie + CA moyen par age
 */
const CA_MINIMUM_PAR_AGE = {
  0: 30_000,     // Premiere annee
  1: 60_000,     // 1-2 ans
  3: 120_000,    // 3-5 ans
  5: 200_000,    // 5-10 ans
  10: 350_000,   // 10-20 ans
  20: 500_000,   // 20+ ans
}

/**
 * Multiplicateur par forme juridique (les SA/SAS sont generalement plus grosses)
 */
const MULT_FORME = {
  'SA':   2.5,
  'SAS':  1.5,
  'SARL': 1.0,
  'SASU': 0.8,
  'EURL': 0.6,
  'EI':   0.4,
  'SCI':  0.5,
}

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromAnciennete(lead) {
  const dateCreation = lead?.date_creation
    || lead?.pappersData?.date_creation
    || lead?.pappiersData?.date_creation
    || lead?.dateCreation
    || null

  if (!dateCreation) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de date de creation' }
  }

  const created = new Date(dateCreation)
  if (isNaN(created.getTime())) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `Date invalide: ${dateCreation}` }
  }

  const ageAns = Math.floor((Date.now() - created.getTime()) / (365.25 * 24 * 3600 * 1000))
  if (ageAns < 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Date creation future' }
  }

  // Trouver la tranche d'age
  let caMinimum = CA_MINIMUM_PAR_AGE[0]
  for (const [seuil, ca] of Object.entries(CA_MINIMUM_PAR_AGE).sort((a, b) => b[0] - a[0])) {
    if (ageAns >= parseInt(seuil)) {
      caMinimum = ca
      break
    }
  }

  // Ajuster par forme juridique
  const formeJuridique = (lead?.forme_juridique || lead?.pappersData?.forme_juridique || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
  const multForme = MULT_FORME[formeJuridique] || 1.0

  const estimate = Math.round(caMinimum * multForme)
  const low = Math.round(estimate * 0.5)
  const high = Math.round(estimate * 3)

  // Confiance : 20 de base (tres faible), +5 si > 10 ans, +5 si forme juridique connue
  let confidence = 20
  if (ageAns > 10) confidence += 5
  if (MULT_FORME[formeJuridique]) confidence += 5

  logger.info(`[CA-Anciennete] age=${ageAns}ans forme=${formeJuridique || '?'} caMin=${caMinimum} mult=${multForme} => ${estimate}`)

  return {
    estimate,
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `Entreprise ${ageAns} ans, CA minimum viable ${caMinimum} EUR x ${multForme} (${formeJuridique || 'defaut'})`,
  }
}
