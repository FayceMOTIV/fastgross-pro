/**
 * caSourceBODACC.js
 * Source 2 — Indices CA depuis BODACC (annonces legales)
 *
 * Fiabilite : MOYEN (indices indirects — augmentations capital, fusions, cessions)
 * Utilise les donnees deja enrichies dans le lead
 */

import { logger } from 'firebase-functions/v2'

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromBODACC(lead) {
  const bodacc = lead?.bodacc || lead?.pappersData?.bodacc || lead?.pappiersData?.bodacc || null
  const capital = lead?.capital_social || lead?.pappersData?.capital || lead?.pappiersData?.capital || null

  if (!bodacc && !capital) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de donnees BODACC' }
  }

  // Chercher les indices de CA dans les annonces BODACC
  let estimatedCA = null
  let details = []
  let confidence = 0

  // 1. Verifier si une procedure collective mentionne un CA
  if (Array.isArray(bodacc)) {
    for (const annonce of bodacc.slice(0, 10)) {
      const text = (annonce.description || annonce.texte || '').toLowerCase()

      // Procedure collective : souvent le CA est mentionne
      const caMatch = text.match(/chiffre[s]?\s*d['']affaire[s]?\s*(?:de\s*)?(\d[\d\s,.]*)\s*(k|m|eur|euro)/i)
      if (caMatch) {
        let val = parseFloat(caMatch[1].replace(/[\s,]/g, '').replace(',', '.'))
        const unit = caMatch[2].toLowerCase()
        if (unit === 'k') val *= 1000
        if (unit === 'm') val *= 1_000_000
        if (val > 10_000 && val < 10_000_000_000) {
          estimatedCA = val
          details.push(`CA mentionne dans annonce BODACC: ${val} EUR`)
          confidence = 70
          break
        }
      }

      // Augmentation de capital significative → indice de croissance
      if (text.includes('augmentation') && text.includes('capital') && capital) {
        const capitalNum = typeof capital === 'string' ? parseInt(capital.replace(/\s/g, ''), 10) : capital
        if (capitalNum > 100_000) {
          // Regle empirique : CA ~ 5-15x capital social pour les PME en croissance
          estimatedCA = capitalNum * 8
          details.push(`Augmentation capital detectee, CA estime ~8x capital (${capitalNum} EUR)`)
          confidence = 35
        }
      }
    }
  }

  if (!estimatedCA) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'BODACC sans indice de CA exploitable' }
  }

  logger.info(`[CA-BODACC] estimate=${estimatedCA} confidence=${confidence}`)

  return {
    estimate: Math.round(estimatedCA),
    low: Math.round(estimatedCA * 0.5),
    high: Math.round(estimatedCA * 2),
    confidence,
    details: details.join(' | '),
  }
}
