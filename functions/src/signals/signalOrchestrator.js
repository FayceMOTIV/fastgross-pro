/**
 * signalOrchestrator.js
 * Lance les 8 dimensions en parallele, agrege les resultats.
 *
 * Timeout global : 15 secondes (toutes les sources en parallele)
 * Chaque source a un timeout individuel de 10s.
 *
 * Export principal : orchestrateSignals(lead, options)
 * Export avec cache : orchestrateSignalsWithCache(lead, options)
 */

import { detectIntentSignals }    from './intentSignals.js'
import { analyzeTechnography }    from './technographyEngine.js'
import { findDirector }           from './directorEngine.js'
import { calculateGrowthScore }   from './growthScoreEngine.js'
import { detectActivePains }      from './activePainEngine.js'
import { getSectorTiming }        from './sectorTimingEngine.js'
import { checkCertifications }    from './certificationEngine.js'
import { analyzeSocialPresenceV2 } from './socialPresenceEngine.js'
import { logger }                 from 'firebase-functions/v2'
import { getFirestore }           from 'firebase-admin/firestore'

const SIGNALS_CACHE_TTL = 7 * 24 * 3600 * 1000 // 7 jours

export async function orchestrateSignals(lead, options = {}) {
  const start = Date.now()
  const siren = lead?.siren || lead?.sirenNumber || null
  logger.info(`[Signals] Orchestration start for ${siren || lead?.nom || '?'}`)

  // Lancer 7 dimensions en parallele (pain depend de techno)
  const [intent, techno, director, growth, timing, certs, social] = await Promise.all([
    safeRun('intent',   () => detectIntentSignals(lead)),
    safeRun('techno',   () => analyzeTechnography(lead)),
    safeRun('director', () => findDirector(lead)),
    safeRun('growth',   () => calculateGrowthScore(lead)),
    safeRun('timing',   () => getSectorTiming(lead)),
    safeRun('certs',    () => checkCertifications(lead)),
    safeRun('social',   () => analyzeSocialPresenceV2(lead)),
  ])

  // Pain depend de techno — lancer apres
  const pain = await safeRun('pain', () => detectActivePains(lead, techno))

  // DScore bonus total (plafonne a +60)
  const totalDScoreBonus = Math.min(60, [
    intent?.urgencyScore ? Math.round(intent.urgencyScore * 0.15) : 0,
    techno?.dScoreBonus || 0,
    director?.dScoreBonus || 0,
    growth?.dScoreBonus || 0,
    pain?.dScoreBonus || 0,
    timing?.dScoreBonus || 0,
    certs?.dScoreBonus || 0,
    social?.dScoreBonus || 0,
  ].reduce((s, v) => s + v, 0))

  // Lead enrichi
  const enrichedLead = {
    ...lead,
    prenomDirigeant: director?.prenom || null,
    nomDirigeant: director?.nom || null,
    fullNameDirigeant: director?.fullName || null,
    linkedInDirigeant: director?.linkedInUrl || null,
    isNewDirector: director?.isNew || false,
    hasIntentSignals: intent?.hasPositiveSignals || false,
    topIntentSignal: intent?.topSignal || null,
    icebreaker: intent?.icebreaker || null,
    isInOptimalWindow: timing?.isInOptimalWindow || false,
    timingRecommendation: timing?.recommendation || null,
    growthTendance: growth?.tendance || 'INCONNU',
    certifications: certs?.certifications || [],
    maturiteDigitale: techno?.maturiteScore ?? null,
    maturiteLabel: techno?.maturiteLabel || null,
    topPain: pain?.topPain || null,
    _signalsDScoreBonus: totalDScoreBonus,
    _signalsEnriched: true,
    _signalsTimestamp: new Date().toISOString(),
    _signalsElapsed: Date.now() - start,
  }

  logger.info(`[Signals] Done for ${siren || '?'} in ${Date.now() - start}ms — DScore bonus: +${totalDScoreBonus}`)

  return {
    intent, techno, director, growth, pain, timing, certs, social,
    totalDScoreBonus,
    enrichedLead,
  }
}

/**
 * Version avec cache Firestore (7 jours TTL)
 */
export async function orchestrateSignalsWithCache(lead, options = {}) {
  const siren = lead?.siren || lead?.sirenNumber || null
  if (!siren) return orchestrateSignals(lead, options)

  const db = getFirestore()

  // Verifier le cache
  try {
    const cacheDoc = await db.collection('leadSignals').doc(siren).get()
    if (cacheDoc.exists) {
      const cached = cacheDoc.data()
      const age = Date.now() - (cached._timestamp?.toMillis?.() || 0)
      if (age < SIGNALS_CACHE_TTL) {
        logger.info(`[Signals] Cache HIT for ${siren}`)
        return {
          ...cached,
          enrichedLead: { ...lead, ...(cached.enrichedFields || {}), _fromCache: true },
        }
      }
    }
  } catch (e) { /* cache miss */ }

  // Cache miss — enrichir
  const result = await orchestrateSignals(lead, options)

  // Sauvegarder en cache (fire & forget)
  db.collection('leadSignals').doc(siren).set({
    intent: result.intent,
    techno: result.techno,
    director: result.director,
    growth: result.growth,
    pain: result.pain,
    timing: result.timing,
    certs: result.certs,
    social: result.social,
    totalDScoreBonus: result.totalDScoreBonus,
    enrichedFields: {
      prenomDirigeant: result.enrichedLead.prenomDirigeant,
      nomDirigeant: result.enrichedLead.nomDirigeant,
      fullNameDirigeant: result.enrichedLead.fullNameDirigeant,
      linkedInDirigeant: result.enrichedLead.linkedInDirigeant,
      isNewDirector: result.enrichedLead.isNewDirector,
      hasIntentSignals: result.enrichedLead.hasIntentSignals,
      topIntentSignal: result.enrichedLead.topIntentSignal,
      icebreaker: result.enrichedLead.icebreaker,
      isInOptimalWindow: result.enrichedLead.isInOptimalWindow,
      timingRecommendation: result.enrichedLead.timingRecommendation,
      growthTendance: result.enrichedLead.growthTendance,
      certifications: result.enrichedLead.certifications,
      maturiteDigitale: result.enrichedLead.maturiteDigitale,
      maturiteLabel: result.enrichedLead.maturiteLabel,
      topPain: result.enrichedLead.topPain,
    },
    _timestamp: new Date(),
    _siren: siren,
  }, { merge: true }).catch(() => {})

  return result
}

async function safeRun(name, fn) {
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout_${name}`)), 10000)),
    ])
  } catch (e) {
    logger.warn(`[Signals] ${name} failed:`, e.message)
    return null
  }
}
