/**
 * growthScoreEngine.js
 * Dimension 4 — Score de croissance
 *
 * Calcule la trajectoire de croissance via :
 * - Evolution CA (INPI bilans N vs N-1)
 * - Evolution effectifs (SIRENE tranche + date MAJ)
 * - Evolution avis Google (proxy croissance B2C)
 */

import { logger } from 'firebase-functions/v2'

export async function calculateGrowthScore(lead) {
  const siren = lead?.siren || lead?.sirenNumber || null
  const results = await Promise.allSettled([
    withTimeout(getCaGrowth(siren), 8000),
    Promise.resolve(getEffectifGrowth(lead)),
    Promise.resolve(getAvisGrowth(lead)),
  ])

  const caGrowth       = results[0].status === 'fulfilled' ? results[0].value : null
  const effectifGrowth = results[1].status === 'fulfilled' ? results[1].value : null
  const avisGrowth     = results[2].status === 'fulfilled' ? results[2].value : false

  let growthScore = 50
  let caCroissancePct = null
  let effectifsTendance = 'UNKNOWN'

  if (caGrowth?.croissancePct !== null && caGrowth?.croissancePct !== undefined) {
    caCroissancePct = caGrowth.croissancePct
    if (caCroissancePct > 20) growthScore += 25
    else if (caCroissancePct > 5) growthScore += 15
    else if (caCroissancePct < -10) growthScore -= 20
    else if (caCroissancePct < 0) growthScore -= 10
  }

  if (effectifGrowth?.tendance) {
    effectifsTendance = effectifGrowth.tendance
    if (effectifsTendance === 'UP') growthScore += 20
    else if (effectifsTendance === 'DOWN') growthScore -= 15
  }

  if (avisGrowth) growthScore += 10

  growthScore = Math.max(0, Math.min(100, growthScore))

  const tendance = growthScore >= 70 ? 'CROISSANCE'
                 : growthScore >= 40 ? 'STABLE'
                 : 'DECLIN'

  let label = null
  if (caCroissancePct !== null && caCroissancePct > 10) {
    label = `Entreprise en forte croissance (+${Math.round(caCroissancePct)}% CA)`
  } else if (caCroissancePct !== null && caCroissancePct > 0) {
    label = `Croissance saine (+${Math.round(caCroissancePct)}% CA)`
  } else if (effectifsTendance === 'UP') {
    label = 'Effectifs en hausse — expansion en cours'
  } else if (avisGrowth) {
    label = 'Activite commerciale en progression (avis Google)'
  }

  return {
    tendance,
    caCroissancePct,
    effectifsTendance,
    avisGrowth,
    growthScore,
    dScoreBonus: tendance === 'CROISSANCE' ? 12 : tendance === 'DECLIN' ? -8 : 0,
    label,
    source: 'growth_score',
  }
}

async function getCaGrowth(siren) {
  if (!siren) return null

  try {
    const headers = { Accept: 'application/json' }
    if (process.env.INPI_API_KEY) headers.Authorization = `Bearer ${process.env.INPI_API_KEY}`

    const url = `https://registre-national-entreprises.inpi.fr/api/companies/${siren}/attachments`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(7000) })
    if (!res.ok) return null

    const data = await res.json()
    const bilans = (data.attachments || [])
      .filter(a => a.type === 'comptes_annuels' && !a.confidentiel)
      .sort((a, b) => (b.anneeExercice || '').localeCompare(a.anneeExercice || ''))
      .slice(0, 2)

    if (bilans.length < 2) return null

    const caN = bilans[0].chiffreAffaires || null
    const caN1 = bilans[1].chiffreAffaires || null

    if (!caN || !caN1 || caN1 === 0) return null

    const croissancePct = Math.round(((caN - caN1) / caN1) * 100)
    return { caN, caN1, croissancePct }
  } catch (e) {
    return null
  }
}

function getEffectifGrowth(lead) {
  const tranche = lead?.trancheEffectifs || lead?.trancheEffectif || null
  const dateMaj = lead?.dateMiseAJourEffectif || lead?.dateCreation || null

  if (!tranche || !dateMaj) return { tendance: 'UNKNOWN' }

  const majRecente = (Date.now() - new Date(dateMaj).getTime()) < (365 * 24 * 3600 * 1000)

  if (majRecente && !['NN', '00', '01'].includes(tranche)) {
    return { tendance: 'UP', dateMaj }
  }

  return { tendance: 'STABLE' }
}

function getAvisGrowth(lead) {
  const nbAvis = lead?.nbAvis || lead?.userRatingsTotal || 0
  const note = lead?.noteGoogle || lead?.rating || 0
  return nbAvis > 100 && note >= 4.0
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}
