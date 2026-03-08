/**
 * caEstimationEngine.js
 * Orchestrateur principal — croise 10 sources pour estimer le CA d'un lead.
 *
 * Usage :
 *   import { estimateCA } from './ca/caEstimationEngine.js'
 *   const result = await estimateCA(lead, { caMinSeuil: 2_000_000, timeoutMs: 12_000 })
 *
 * Architecture :
 *   - Les 10 sources tournent en parallele avec Promise.allSettled
 *   - Chaque source a un timeout individuel (8s par defaut)
 *   - Le scorer croise les resultats et produit un verdict
 *   - Pas d'appels API externes (tout est base sur les donnees du lead deja enrichi)
 *
 * Integration :
 *   - DScore : result.caEstime et result.confidence injectables dans le scoring
 *   - Alex : result.verdictSeuil et result.caEstime dans le system prompt
 */

import { logger } from 'firebase-functions/v2'
import { crossAndScore } from './caScorer.js'

// Sources
import { estimateFromINPI } from './sources/caSourceINPI.js'
import { estimateFromBODACC } from './sources/caSourceBODACC.js'
import { estimateFromSireneEffectif } from './sources/caSourceSireneEffectif.js'
import { estimateFromCapitalSocial } from './sources/caSourceCapitalSocial.js'
import { estimateFromAnciennete } from './sources/caSourceAnciennete.js'
import { estimateFromLinkedIn } from './sources/caSourceLinkedIn.js'
import { estimateFromGoogleMaps } from './sources/caSourceGoogleMaps.js'
import { estimateFromWebScraping } from './sources/caSourceWebScraping.js'
import { estimateFromBOAMP } from './sources/caSourceBOAMP.js'
import { estimateFromInseeRatios } from './sources/caSourceInseeRatios.js'

/**
 * Wrapper timeout pour une source individuelle
 */
function withTimeout(promise, ms, sourceName) {
  return Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(() => {
        logger.warn(`[CA] Source ${sourceName} timeout apres ${ms}ms`)
        resolve({ estimate: null, low: null, high: null, confidence: 0, details: `Timeout ${ms}ms` })
      }, ms),
    ),
  ])
}

/**
 * Liste des sources avec leur nom et fonction
 */
const SOURCES = [
  { name: 'INPI/Pappers',       fn: estimateFromINPI },
  { name: 'BODACC',             fn: estimateFromBODACC },
  { name: 'SIRENE-Effectif',    fn: estimateFromSireneEffectif },
  { name: 'Capital-Social',     fn: estimateFromCapitalSocial },
  { name: 'Anciennete',         fn: estimateFromAnciennete },
  { name: 'LinkedIn',           fn: estimateFromLinkedIn },
  { name: 'Google-Maps',        fn: estimateFromGoogleMaps },
  { name: 'Web-Scraping',       fn: estimateFromWebScraping },
  { name: 'BOAMP',              fn: estimateFromBOAMP },
  { name: 'INSEE-Ratios',       fn: estimateFromInseeRatios },
]

/**
 * Estime le CA d'un lead en croisant 10 sources de donnees.
 *
 * @param {Object} lead - Donnees du lead (prospect enrichi)
 * @param {Object} [options={}]
 * @param {number} [options.caMinSeuil=0] - Seuil minimum CA en EUR (0 = pas de filtre)
 * @param {number} [options.timeoutMs=12000] - Timeout global en ms
 * @param {number} [options.sourceTimeoutMs=8000] - Timeout par source en ms
 * @returns {Promise<{
 *   caEstime: number|null,
 *   caLow: number|null,
 *   caHigh: number|null,
 *   confidence: number,
 *   label: string,
 *   nbSources: number,
 *   sources: Array,
 *   convergence: boolean,
 *   aboveSeuil: boolean|null,
 *   verdictSeuil: string,
 *   durationMs: number
 * }>}
 */
export async function estimateCA(lead, options = {}) {
  const { caMinSeuil = 0, timeoutMs = 12_000, sourceTimeoutMs = 8_000 } = options
  const startTime = Date.now()

  if (!lead || typeof lead !== 'object') {
    logger.warn('[CA] Lead invalide')
    return {
      caEstime: null, caLow: null, caHigh: null,
      confidence: 0, label: 'INCONNU', nbSources: 0,
      sources: [], convergence: false,
      aboveSeuil: null, verdictSeuil: caMinSeuil > 0 ? 'INDETERMINE' : 'PAS_DE_SEUIL',
      durationMs: 0,
    }
  }

  const leadName = lead?.company || lead?.companyName || lead?.nom || lead?.name || 'inconnu'
  logger.info(`[CA] Estimation CA pour "${leadName}" — ${SOURCES.length} sources, seuil=${caMinSeuil}`)

  // Execute toutes les sources en parallele avec timeout individuel
  const promises = SOURCES.map(({ name, fn }) =>
    withTimeout(
      fn(lead).catch((err) => {
        logger.warn(`[CA] Source ${name} erreur:`, err.message)
        return { estimate: null, low: null, high: null, confidence: 0, details: `Erreur: ${err.message}` }
      }),
      sourceTimeoutMs,
      name,
    ).then((result) => ({
      source: name,
      ...result,
    })),
  )

  // Timeout global
  const globalTimeout = new Promise((resolve) =>
    setTimeout(() => {
      logger.warn(`[CA] Timeout global ${timeoutMs}ms`)
      resolve(null)
    }, timeoutMs),
  )

  const allResults = await Promise.race([
    Promise.all(promises),
    globalTimeout,
  ])

  // Si timeout global, on prend ce qu'on a
  const sourceResults = allResults || []

  // Cross-reference et scoring
  const scored = crossAndScore(sourceResults, caMinSeuil, lead)
  const durationMs = Date.now() - startTime

  logger.info(`[CA] Resultat pour "${leadName}": CA=${scored.caEstime} label=${scored.label} sources=${scored.nbSources}/${SOURCES.length} en ${durationMs}ms`)

  return {
    ...scored,
    durationMs,
  }
}

/**
 * Version legere pour le DScore (pas de timeout global, juste les sources rapides)
 * Utilise uniquement les sources qui ne font pas d'appels externes.
 */
export async function estimateCALight(lead) {
  const FAST_SOURCES = [
    { name: 'INPI/Pappers', fn: estimateFromINPI },
    { name: 'SIRENE-Effectif', fn: estimateFromSireneEffectif },
    { name: 'Capital-Social', fn: estimateFromCapitalSocial },
    { name: 'Anciennete', fn: estimateFromAnciennete },
    { name: 'Google-Maps', fn: estimateFromGoogleMaps },
    { name: 'INSEE-Ratios', fn: estimateFromInseeRatios },
  ]

  const promises = FAST_SOURCES.map(({ name, fn }) =>
    fn(lead)
      .then((result) => ({ source: name, ...result }))
      .catch(() => ({ source: name, estimate: null, low: null, high: null, confidence: 0, details: 'Erreur' })),
  )

  const sourceResults = await Promise.all(promises)
  return crossAndScore(sourceResults, 0, lead)
}
