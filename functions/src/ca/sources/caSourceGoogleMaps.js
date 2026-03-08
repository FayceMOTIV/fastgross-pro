/**
 * caSourceGoogleMaps.js
 * Source 7 — Estimation CA via signaux Google Maps (cache DScore)
 *
 * Signaux : nombre avis, note, photos, horaires, type d'etablissement
 * Fiabilite : FAIBLE (correle mais pas causal)
 */

import { logger } from 'firebase-functions/v2'

/**
 * Grilles de CA estime par secteur NAF2 selon nombre d'avis Google
 * Plus d'avis → plus de clients → plus de CA (correle pour B2C/local)
 */
const GRILLES_AVIS = {
  '56': { // Restauration
    seuils: [
      { maxAvis: 50,   ca: 150_000 },
      { maxAvis: 200,  ca: 350_000 },
      { maxAvis: 500,  ca: 600_000 },
      { maxAvis: 1000, ca: 1_000_000 },
      { maxAvis: Infinity, ca: 2_000_000 },
    ],
  },
  '55': { // Hebergement
    seuils: [
      { maxAvis: 100,  ca: 200_000 },
      { maxAvis: 500,  ca: 800_000 },
      { maxAvis: 1000, ca: 1_500_000 },
      { maxAvis: Infinity, ca: 3_000_000 },
    ],
  },
  '47': { // Commerce detail
    seuils: [
      { maxAvis: 30,   ca: 100_000 },
      { maxAvis: 100,  ca: 300_000 },
      { maxAvis: 300,  ca: 600_000 },
      { maxAvis: Infinity, ca: 1_200_000 },
    ],
  },
  DEFAULT: {
    seuils: [
      { maxAvis: 50,   ca: 200_000 },
      { maxAvis: 200,  ca: 500_000 },
      { maxAvis: 500,  ca: 1_000_000 },
      { maxAvis: Infinity, ca: 2_000_000 },
    ],
  },
}

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromGoogleMaps(lead) {
  const nbAvis = lead?.noteGoogle ? (lead?.nbAvis || lead?.nb_avis || 0) : 0
  const note = lead?.noteGoogle || lead?.note_google || 0

  if (!nbAvis || nbAvis <= 0) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas d\'avis Google Maps' }
  }

  const nafCode = lead?.naf || lead?.codeNaf || lead?.activitePrincipale || null
  const naf2 = nafCode ? nafCode.slice(0, 2) : null
  const grille = GRILLES_AVIS[naf2] || GRILLES_AVIS.DEFAULT

  // Trouver la tranche
  let estimate = grille.seuils[0].ca
  for (const { maxAvis, ca } of grille.seuils) {
    if (nbAvis <= maxAvis) {
      estimate = ca
      break
    }
  }

  // Bonus note : > 4.5 = +10%, < 3.5 = -20%
  if (note >= 4.5) estimate = Math.round(estimate * 1.1)
  else if (note < 3.5 && note > 0) estimate = Math.round(estimate * 0.8)

  const low = Math.round(estimate * 0.5)
  const high = Math.round(estimate * 2)

  // Confiance : 25 de base (correle mais pas causal), +10 si > 200 avis, +5 si secteur connu
  let confidence = 25
  if (nbAvis > 200) confidence += 10
  if (nbAvis > 500) confidence += 5
  if (naf2 && GRILLES_AVIS[naf2]) confidence += 5

  logger.info(`[CA-GoogleMaps] nbAvis=${nbAvis} note=${note} naf2=${naf2} => ${estimate}`)

  return {
    estimate,
    low,
    high,
    confidence: Math.min(confidence, 100),
    details: `${nbAvis} avis Google (note ${note}/5) → CA estime ${estimate} EUR (secteur ${naf2 || '?'})`,
  }
}
