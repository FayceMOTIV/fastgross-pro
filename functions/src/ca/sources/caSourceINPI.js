/**
 * caSourceINPI.js
 * Source 1 — CA officiel depuis Pappers/INPI (bilans deposes)
 *
 * Fiabilite : EXACT (source officielle)
 * Limite : 40-50% des entreprises seulement publient leurs comptes
 */

import { logger } from 'firebase-functions/v2'

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromINPI(lead) {
  const siren = lead?.siren || lead?.siret?.slice(0, 9) || null

  if (!siren || siren.length < 9) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de SIREN' }
  }

  // Check if lead already has Pappers enrichment data with CA
  const ca = lead?.pappiersData?.chiffre_affaires
    || lead?.pappersData?.chiffre_affaires
    || lead?.bilans?.[0]?.chiffre_affaires
    || lead?.ca_officiel
    || null

  if (!ca || ca <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'CA non publie ou non disponible via INPI/Pappers' }
  }

  const annee = lead?.pappiersData?.annee_bilan
    || lead?.pappersData?.annee_bilan
    || lead?.bilans?.[0]?.annee
    || null

  const caNum = typeof ca === 'string' ? parseInt(ca.replace(/\s/g, ''), 10) : ca
  if (isNaN(caNum) || caNum <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: `CA invalide: ${ca}` }
  }

  // Confiance : 95 si < 2 ans, 80 si 2-3 ans, 65 si > 3 ans
  const currentYear = new Date().getFullYear()
  const age = annee ? currentYear - parseInt(annee) : 3
  let confidence = age <= 1 ? 95 : age <= 3 ? 80 : 65

  logger.info(`[CA-INPI] siren=${siren} ca=${caNum} annee=${annee} confidence=${confidence}`)

  return {
    estimate: caNum,
    low: Math.round(caNum * 0.95),
    high: Math.round(caNum * 1.05),
    confidence,
    details: `CA officiel INPI/Pappers : ${caNum} EUR${annee ? ` (bilan ${annee})` : ''}`,
  }
}
