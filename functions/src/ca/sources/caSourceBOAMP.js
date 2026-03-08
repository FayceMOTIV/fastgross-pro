/**
 * caSourceBOAMP.js
 * Source 9 — Estimation CA via marches publics (BOAMP)
 *
 * Si l'entreprise remporte des marches publics, on peut estimer un CA minimum.
 * Fiabilite : MOYEN pour les entreprises concernees (peu frequent)
 * Utilise les donnees deja enrichies dans le lead.
 */

import { logger } from 'firebase-functions/v2'

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromBOAMP(lead) {
  const marches = lead?.marchesPublics
    || lead?.boampData
    || lead?.pappersData?.marches_publics
    || lead?.pappiersData?.marches_publics
    || null

  if (!marches || !Array.isArray(marches) || marches.length === 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de marches publics connus' }
  }

  // Sommer les montants des marches
  let totalMarches = 0
  let nbMarches = 0

  for (const marche of marches) {
    const montant = marche.montant || marche.valeur || marche.amount || 0
    const montantNum = typeof montant === 'string'
      ? parseFloat(montant.replace(/[\s€EUR]/gi, '').replace(',', '.'))
      : montant

    if (montantNum > 0) {
      totalMarches += montantNum
      nbMarches++
    }
  }

  if (totalMarches <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `${marches.length} marches sans montant exploitable` }
  }

  // Les marches publics representent en general 20-60% du CA total
  // On prend 35% comme hypothese mediane
  const estimate = Math.round(totalMarches / 0.35)
  const low = Math.round(totalMarches / 0.6)  // Si marches = 60% du CA
  const high = Math.round(totalMarches / 0.15) // Si marches = 15% du CA

  // Confiance : 45 de base, +5 par marche (max +15)
  let confidence = 45 + Math.min(nbMarches * 5, 15)

  logger.info(`[CA-BOAMP] totalMarches=${totalMarches} nbMarches=${nbMarches} => estimate=${estimate}`)

  return {
    estimate,
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `${nbMarches} marches publics totalisant ${totalMarches} EUR (~35% du CA estime)`,
  }
}
