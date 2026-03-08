/**
 * caScorer.js
 * Croise les estimations de N sources et produit un score de confiance unifie.
 *
 * Algorithme :
 *   1. Filtrer les sources sans resultat (estimate null ou confidence 0)
 *   2. Moyenne ponderee par confidence de chaque source
 *   3. Bonus convergence : si 3+ sources dans une fourchette de 30%, +15 confiance
 *   4. Label final : EXACT / ELEVE / MOYEN / FAIBLE / INCONNU
 *   5. Verdict par rapport au seuil client (caMinSeuil)
 */

import { logger } from 'firebase-functions/v2'

/**
 * Labels de confiance
 */
const LABELS = {
  EXACT: 'EXACT',         // >= 85 (source officielle)
  ELEVE: 'ELEVE',         // >= 60
  MOYEN: 'MOYEN',         // >= 40
  FAIBLE: 'FAIBLE',       // >= 15
  INCONNU: 'INCONNU',     // < 15 ou pas de source
}

/**
 * Croise et score les estimations de toutes les sources.
 *
 * @param {Array<{source: string, estimate: number|null, low: number|null, high: number|null, confidence: number, details: string}>} sourceResults
 * @param {number} [seuil=0] - Seuil minimum CA en EUR (0 = pas de seuil)
 * @param {Object} [lead={}] - Lead data pour enrichir le resultat
 * @returns {{
 *   caEstime: number|null,
 *   caLow: number|null,
 *   caHigh: number|null,
 *   confidence: number,
 *   label: string,
 *   nbSources: number,
 *   sources: Array,
 *   convergence: boolean,
 *   aboveSeuil: boolean|null,
 *   verdictSeuil: string
 * }}
 */
export function crossAndScore(sourceResults, seuil = 0, lead = {}) {
  // 1. Filtrer sources avec resultat
  const valid = sourceResults.filter(
    (s) => s.estimate !== null && s.estimate > 0 && s.confidence > 0,
  )

  if (valid.length === 0) {
    return {
      caEstime: null,
      caLow: null,
      caHigh: null,
      confidence: 0,
      label: LABELS.INCONNU,
      nbSources: 0,
      sources: sourceResults.map((s) => ({ source: s.source, details: s.details })),
      convergence: false,
      aboveSeuil: null,
      verdictSeuil: seuil > 0 ? 'INDETERMINE' : 'PAS_DE_SEUIL',
    }
  }

  // 2. Moyenne ponderee par confidence
  let sumWeighted = 0
  let sumWeights = 0
  let sumLow = 0
  let sumHigh = 0
  let weightedLow = 0
  let weightedHigh = 0

  for (const s of valid) {
    const w = s.confidence / 100
    sumWeighted += s.estimate * w
    sumWeights += w
    if (s.low) { sumLow += s.low * w; weightedLow += w }
    if (s.high) { sumHigh += s.high * w; weightedHigh += w }
  }

  const caEstime = Math.round(sumWeighted / sumWeights)
  const caLow = weightedLow > 0 ? Math.round(sumLow / weightedLow) : Math.round(caEstime * 0.5)
  const caHigh = weightedHigh > 0 ? Math.round(sumHigh / weightedHigh) : Math.round(caEstime * 2)

  // 3. Confiance composite
  // Base : max de toutes les confidences (la source la plus fiable)
  let confidence = Math.max(...valid.map((s) => s.confidence))

  // Bonus convergence : si 3+ sources dans une fourchette de 30% autour de la mediane
  const sorted = [...valid].sort((a, b) => a.estimate - b.estimate)
  const median = sorted[Math.floor(sorted.length / 2)].estimate
  const converging = valid.filter(
    (s) => Math.abs(s.estimate - median) / median < 0.3,
  )
  const convergence = converging.length >= 3

  if (convergence) {
    confidence = Math.min(confidence + 15, 100)
  }

  // Bonus : 2+ sources independantes = +5
  if (valid.length >= 2) confidence = Math.min(confidence + 5, 100)
  if (valid.length >= 4) confidence = Math.min(confidence + 5, 100)

  // 4. Label
  let label = LABELS.INCONNU
  if (confidence >= 85) label = LABELS.EXACT
  else if (confidence >= 60) label = LABELS.ELEVE
  else if (confidence >= 40) label = LABELS.MOYEN
  else if (confidence >= 15) label = LABELS.FAIBLE

  // 5. Verdict seuil
  let aboveSeuil = null
  let verdictSeuil = 'PAS_DE_SEUIL'
  if (seuil > 0) {
    if (caLow >= seuil) {
      aboveSeuil = true
      verdictSeuil = 'AU_DESSUS'
    } else if (caHigh < seuil) {
      aboveSeuil = false
      verdictSeuil = 'EN_DESSOUS'
    } else {
      aboveSeuil = null
      verdictSeuil = 'ZONE_GRISE'
    }
  }

  logger.info(`[CA-Scorer] caEstime=${caEstime} confidence=${confidence} label=${label} nbSources=${valid.length} convergence=${convergence} verdict=${verdictSeuil}`)

  return {
    caEstime,
    caLow,
    caHigh,
    confidence,
    label,
    nbSources: valid.length,
    sources: sourceResults.map((s) => ({
      source: s.source,
      estimate: s.estimate,
      confidence: s.confidence,
      details: s.details,
    })),
    convergence,
    aboveSeuil,
    verdictSeuil,
  }
}
