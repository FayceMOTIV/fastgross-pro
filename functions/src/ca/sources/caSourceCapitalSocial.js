/**
 * caSourceCapitalSocial.js
 * Source 4 — Estimation CA via capital social
 *
 * Formule : CA ~ capital x multiplicateur(forme_juridique)
 * Fiabilite : FAIBLE (tres variable, dernier recours)
 */

import { logger } from 'firebase-functions/v2'

/**
 * Multiplicateurs capital → CA selon forme juridique
 * Source : Benchmarks BPI France + experiences terrain
 */
const MULTIPLICATEURS = {
  'SAS':    { min: 5, mid: 10, max: 20 },
  'SASU':   { min: 3, mid: 8, max: 15 },
  'SARL':   { min: 3, mid: 7, max: 15 },
  'EURL':   { min: 2, mid: 5, max: 10 },
  'SA':     { min: 8, mid: 15, max: 30 },
  'SNC':    { min: 5, mid: 10, max: 20 },
  'SCI':    { min: 1, mid: 3, max: 8 },
  'EI':     { min: 2, mid: 4, max: 8 },
  'DEFAULT': { min: 3, mid: 8, max: 15 },
}

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromCapitalSocial(lead) {
  const capital = lead?.capital_social
    || lead?.pappersData?.capital
    || lead?.pappiersData?.capital
    || null

  if (!capital) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de capital social' }
  }

  const capitalNum = typeof capital === 'string'
    ? parseInt(capital.replace(/[\s€EUR]/gi, ''), 10)
    : capital

  if (isNaN(capitalNum) || capitalNum <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `Capital invalide: ${capital}` }
  }

  // Capital minimum (ex: 1 EUR pour SASU) n'est pas exploitable
  if (capitalNum <= 100) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `Capital trop faible (${capitalNum} EUR) — non exploitable` }
  }

  const formeJuridique = (lead?.forme_juridique || lead?.pappersData?.forme_juridique || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')

  const mult = MULTIPLICATEURS[formeJuridique] || MULTIPLICATEURS.DEFAULT
  const estimate = capitalNum * mult.mid
  const low = capitalNum * mult.min
  const high = capitalNum * mult.max

  // Confiance : 30 de base, +10 si SA (capital plus significatif), +5 si capital > 100k
  let confidence = 30
  if (formeJuridique === 'SA') confidence += 10
  if (capitalNum > 100_000) confidence += 5
  if (capitalNum > 1_000_000) confidence += 10

  logger.info(`[CA-CapitalSocial] capital=${capitalNum} forme=${formeJuridique || '?'} mult=${mult.mid}x => ${estimate}`)

  return {
    estimate: Math.round(estimate),
    low: Math.round(low),
    high: Math.round(high),
    confidence: Math.min(confidence, 100),
    details: `Capital ${capitalNum} EUR x ${mult.mid} (${formeJuridique || 'defaut'})`,
  }
}
