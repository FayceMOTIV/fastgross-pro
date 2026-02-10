/**
 * Advanced Scoring System - Fit + Intent + Data Quality
 * Niveau Apollo : Scoring multi-dimensionnel pour prioriser les prospects
 */

import { detectBuyingSignals } from './intentSignals.js'

/**
 * Score avance combinant 3 dimensions
 * @param {Object} prospect - Prospect enrichi
 * @param {Object} icp - Profil client ideal
 * @returns {Object} Score detaille avec priorite
 */
export function advancedScoring(prospect, icp) {
  // ============================================
  // FIT SCORE (0-50) — Correspond-il au profil ?
  // ============================================
  const fitResult = calculateFitScore(prospect, icp)

  // ============================================
  // INTENT SCORE (0-30) — Montre-t-il des signaux d'achat ?
  // ============================================
  const intentResult = detectBuyingSignals(prospect, icp)
  const intentScore = Math.min(30, intentResult.intentScore)

  // ============================================
  // DATA QUALITY SCORE (0-20) — A-t-on assez de donnees ?
  // ============================================
  const dataResult = calculateDataQuality(prospect)

  // ============================================
  // CALCUL DU SCORE TOTAL
  // ============================================
  const total = fitResult.score + intentScore + dataResult.score

  // ============================================
  // PRIORITE basee sur le combo Fit + Intent
  // ============================================
  let priority
  let category

  if (fitResult.score >= 35 && intentScore >= 20) {
    priority = 'A'
    category = 'hot'
  } else if (fitResult.score >= 30 && intentScore >= 10) {
    priority = 'B'
    category = 'warm'
  } else if (fitResult.score >= 30 || intentScore >= 15) {
    priority = 'B'
    category = 'warm'
  } else if (fitResult.score >= 25) {
    priority = 'C'
    category = 'cold'
  } else {
    priority = 'D'
    category = 'nurture'
  }

  return {
    total: Math.min(100, total),
    priority,
    category,

    // Details par dimension
    fit: {
      score: fitResult.score,
      maxScore: 50,
      breakdown: fitResult.breakdown,
      matches: fitResult.matches,
      mismatches: fitResult.mismatches
    },

    intent: {
      score: intentScore,
      maxScore: 30,
      signals: intentResult.signals,
      signalCount: intentResult.signalCount,
      strongestSignal: intentResult.strongestSignal
    },

    data: {
      score: dataResult.score,
      maxScore: 20,
      breakdown: dataResult.breakdown,
      completeness: dataResult.completeness,
      missing: dataResult.missing
    },

    // Recommandation d'action
    recommendation: getRecommendation(priority, fitResult, intentResult, dataResult),

    // Scores normalises pour comparaison
    normalized: {
      fit: Math.round((fitResult.score / 50) * 100),
      intent: Math.round((intentScore / 30) * 100),
      data: Math.round((dataResult.score / 20) * 100),
      overall: Math.round((total / 100) * 100)
    }
  }
}

/**
 * Calcule le FIT score (correspondance avec l'ICP)
 */
function calculateFitScore(prospect, icp) {
  let score = 0
  const breakdown = {}
  const matches = []
  const mismatches = []

  const enrichment = prospect.enrichment || prospect

  // ============================================
  // 1. SECTEUR D'ACTIVITE (0-15 pts)
  // ============================================
  const sectorScore = calculateSectorMatch(enrichment, icp)
  breakdown.sector = sectorScore.score
  score += sectorScore.score
  if (sectorScore.match) matches.push(sectorScore.detail)
  else mismatches.push(sectorScore.detail)

  // ============================================
  // 2. TAILLE D'ENTREPRISE (0-12 pts)
  // ============================================
  const sizeScore = calculateSizeMatch(enrichment, icp)
  breakdown.size = sizeScore.score
  score += sizeScore.score
  if (sizeScore.match) matches.push(sizeScore.detail)
  else if (sizeScore.detail) mismatches.push(sizeScore.detail)

  // ============================================
  // 3. LOCALISATION (0-10 pts)
  // ============================================
  const locationScore = calculateLocationMatch(enrichment, icp)
  breakdown.location = locationScore.score
  score += locationScore.score
  if (locationScore.match) matches.push(locationScore.detail)
  else if (locationScore.detail) mismatches.push(locationScore.detail)

  // ============================================
  // 4. CHIFFRE D'AFFAIRES (0-8 pts)
  // ============================================
  const revenueScore = calculateRevenueMatch(enrichment, icp)
  breakdown.revenue = revenueScore.score
  score += revenueScore.score
  if (revenueScore.match) matches.push(revenueScore.detail)

  // ============================================
  // 5. PROFIL DU DECIDEUR (0-5 pts)
  // ============================================
  const deciderScore = calculateDeciderMatch(enrichment, icp)
  breakdown.decider = deciderScore.score
  score += deciderScore.score
  if (deciderScore.match) matches.push(deciderScore.detail)

  return {
    score: Math.min(50, score),
    breakdown,
    matches,
    mismatches
  }
}

function calculateSectorMatch(enrichment, icp) {
  const prospectSector = (enrichment.industry || enrichment.sector || enrichment.nafLabel || '').toLowerCase()
  const targetSectors = (icp.targetSectors || [icp.sector] || []).map(s => s.toLowerCase())
  const offer = (icp.offer || '').toLowerCase()

  // Correspondance directe
  for (const target of targetSectors) {
    if (prospectSector.includes(target) || target.includes(prospectSector)) {
      return { score: 15, match: true, detail: `Secteur: ${prospectSector} (cible directe)` }
    }
  }

  // Correspondance par keywords de l'offre
  const sectorKeywords = {
    'nettoyage': ['bureau', 'cabinet', 'clinique', 'medical', 'veterinaire', 'immobilier', 'agence', 'commerce', 'restaurant'],
    'web': ['commerce', 'artisan', 'restaurant', 'hotel', 'boutique', 'magasin', 'pme'],
    'comptabilite': ['tpe', 'pme', 'startup', 'commerce', 'artisan'],
    'marketing': ['commerce', 'e-commerce', 'startup', 'saas'],
    'rh': ['tech', 'startup', 'scale-up', 'pme']
  }

  for (const [key, keywords] of Object.entries(sectorKeywords)) {
    if (offer.includes(key)) {
      if (keywords.some(kw => prospectSector.includes(kw))) {
        return { score: 12, match: true, detail: `Secteur compatible: ${prospectSector}` }
      }
    }
  }

  // Secteur generique PME
  if (prospectSector.includes('pme') || prospectSector.includes('tpe')) {
    return { score: 8, match: true, detail: 'PME/TPE (cible generique)' }
  }

  // Pas de correspondance claire
  if (prospectSector) {
    return { score: 5, match: false, detail: `Secteur non cible: ${prospectSector}` }
  }

  return { score: 3, match: false, detail: 'Secteur inconnu' }
}

function calculateSizeMatch(enrichment, icp) {
  const employeeCount = enrichment.employeeCount || enrichment.legalData?.employees
  const targetSize = (icp.volume || icp.targetSize || 'PME').toUpperCase()

  if (!employeeCount) {
    return { score: 4, match: false, detail: '' }
  }

  // Mapping taille -> effectif
  const sizeRanges = {
    'TPE': { min: 1, max: 10, score: 12 },
    'PME': { min: 10, max: 250, score: 12 },
    'ETI': { min: 250, max: 5000, score: 10 },
    'GE': { min: 5000, max: Infinity, score: 8 }
  }

  // Trouver la taille du prospect
  let prospectSize = 'TPE'
  if (employeeCount >= 5000) prospectSize = 'GE'
  else if (employeeCount >= 250) prospectSize = 'ETI'
  else if (employeeCount >= 10) prospectSize = 'PME'

  // Correspondance
  if (targetSize === prospectSize) {
    return { score: 12, match: true, detail: `${prospectSize} (${employeeCount} employes)` }
  }

  // Correspondance proche
  const sizeOrder = ['TPE', 'PME', 'ETI', 'GE']
  const targetIndex = sizeOrder.indexOf(targetSize)
  const prospectIndex = sizeOrder.indexOf(prospectSize)
  const distance = Math.abs(targetIndex - prospectIndex)

  if (distance === 1) {
    return { score: 8, match: true, detail: `${prospectSize} proche de ${targetSize}` }
  }

  return { score: 4, match: false, detail: `${prospectSize} (cible: ${targetSize})` }
}

function calculateLocationMatch(enrichment, icp) {
  const prospectCity = (enrichment.city || enrichment.address || '').toLowerCase()
  const targetZone = (icp.zone || '').toLowerCase()

  if (!prospectCity || !targetZone) {
    return { score: 3, match: false, detail: '' }
  }

  // Correspondance directe ville
  if (targetZone.includes(prospectCity) || prospectCity.includes(targetZone.split(' ')[0])) {
    return { score: 10, match: true, detail: `${prospectCity} (zone cible)` }
  }

  // Correspondance region IDF
  const idfCities = ['paris', 'boulogne', 'neuilly', 'levallois', 'puteaux', 'la defense',
                     'saint-denis', 'montreuil', 'nanterre', 'versailles', 'creteil']
  if (targetZone.includes('ile-de-france') || targetZone.includes('idf') || targetZone.includes('paris')) {
    if (idfCities.some(city => prospectCity.includes(city))) {
      return { score: 9, match: true, detail: `${prospectCity} (IDF)` }
    }
  }

  // Meme departement (approximatif)
  const prospectDept = prospectCity.match(/\d{2}/)
  const targetDept = targetZone.match(/\d{2}/)
  if (prospectDept && targetDept && prospectDept[0] === targetDept[0]) {
    return { score: 8, match: true, detail: `Departement ${prospectDept[0]}` }
  }

  return { score: 2, match: false, detail: `${prospectCity} (hors zone)` }
}

function calculateRevenueMatch(enrichment, icp) {
  const revenue = enrichment.revenue || enrichment.legalData?.revenue
  const targetRevenue = icp.targetRevenue || null

  if (!revenue) {
    return { score: 2, match: false, detail: '' }
  }

  // Si pas de cible, donner des points pour avoir la donnee
  if (!targetRevenue) {
    return { score: 5, match: true, detail: `CA: ${formatRevenue(revenue)}` }
  }

  // Correspondance avec la cible
  const revenueK = revenue / 1000
  if (revenueK >= targetRevenue.min && revenueK <= targetRevenue.max) {
    return { score: 8, match: true, detail: `CA: ${formatRevenue(revenue)} (dans la cible)` }
  }

  return { score: 3, match: false, detail: `CA: ${formatRevenue(revenue)}` }
}

function calculateDeciderMatch(enrichment, icp) {
  const ceo = enrichment.ceo || enrichment.legalData?.dirigeant
  const decisionMakers = enrichment.decisionMakers || []
  const targetRoles = (icp.target || '').toLowerCase()

  if (ceo || decisionMakers.length > 0) {
    return { score: 5, match: true, detail: `Decideur identifie: ${ceo || decisionMakers[0]?.name}` }
  }

  return { score: 1, match: false, detail: '' }
}

/**
 * Calcule le score de qualite des donnees
 */
function calculateDataQuality(prospect) {
  let score = 0
  const breakdown = {}
  const missing = []

  const enrichment = prospect.enrichment || prospect

  // Email direct trouve (+8 pts)
  const hasDirectEmail = enrichment.emails?.some(e => !isGenericEmail(e))
  if (hasDirectEmail) {
    breakdown.directEmail = 8
    score += 8
  } else if (enrichment.emails?.length > 0) {
    breakdown.genericEmail = 4
    score += 4
  } else {
    missing.push('Email')
  }

  // Nom du decideur (+5 pts)
  if (enrichment.ceo || enrichment.decisionMakers?.length > 0) {
    breakdown.decisionMaker = 5
    score += 5
  } else {
    missing.push('Decideur')
  }

  // Telephone (+4 pts)
  if (enrichment.phones?.length > 0) {
    breakdown.phone = 4
    score += 4
  } else {
    missing.push('Telephone')
  }

  // LinkedIn (+3 pts)
  if (enrichment.linkedinUrl || enrichment.socialLinks?.linkedin) {
    breakdown.linkedin = 3
    score += 3
  }

  // Completude globale (bonus)
  const completeness = enrichment.dataCompleteness?.score || 0
  if (completeness >= 80) {
    breakdown.completenessBonus = 2
    score += 2
  }

  return {
    score: Math.min(20, score),
    breakdown,
    completeness,
    missing
  }
}

function isGenericEmail(email) {
  if (!email) return true
  const genericPrefixes = ['info', 'contact', 'admin', 'hello', 'bonjour', 'accueil', 'general']
  const prefix = email.split('@')[0].toLowerCase()
  return genericPrefixes.includes(prefix)
}

function formatRevenue(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M€`
  if (amount >= 1000) return `${Math.round(amount / 1000)}k€`
  return `${amount}€`
}

/**
 * Genere la recommandation d'action
 */
function getRecommendation(priority, fitResult, intentResult, dataResult) {
  const recommendations = {
    A: {
      action: 'Contacter en priorite — sequence complete multicanale',
      urgency: 'high',
      sequence: 'full_multichannel',
      channels: ['email', 'sms', 'whatsapp', 'phone'],
      reasoning: `Excellent fit (${fitResult.score}/50) + signaux d'achat forts (${intentResult.signalCount} signaux)`
    },
    B: {
      action: 'Contacter cette semaine — sequence email + relances',
      urgency: 'medium',
      sequence: 'email_followup',
      channels: ['email', 'sms'],
      reasoning: `Bon fit (${fitResult.score}/50) ou signaux d'interet`
    },
    C: {
      action: 'Ajouter a la sequence longue — nurturing',
      urgency: 'low',
      sequence: 'nurture',
      channels: ['email'],
      reasoning: 'Potentiel mais pas de signaux immediats'
    },
    D: {
      action: 'Mettre en veille — pas prioritaire',
      urgency: 'none',
      sequence: 'skip',
      channels: [],
      reasoning: 'Ne correspond pas suffisamment au profil cible'
    }
  }

  const rec = recommendations[priority]

  // Ajouter les points d'attention
  rec.warnings = []
  if (dataResult.missing.includes('Email')) {
    rec.warnings.push('Pas d\'email direct - enrichissement necessaire')
  }
  if (dataResult.missing.includes('Decideur')) {
    rec.warnings.push('Decideur non identifie - cibler le contact generique')
  }

  // Ajouter les points forts
  rec.strengths = []
  if (intentResult.strongestSignal) {
    rec.strengths.push(`Signal fort: ${intentResult.strongestSignal.detail}`)
  }
  if (fitResult.matches.length > 0) {
    rec.strengths.push(...fitResult.matches.slice(0, 2))
  }

  return rec
}

/**
 * Score batch de prospects avec tri
 */
export function scoreAndSortProspects(prospects, icp) {
  return prospects
    .map(prospect => ({
      ...prospect,
      scoring: advancedScoring(prospect, icp)
    }))
    .sort((a, b) => {
      // Trier par priorite puis par score total
      const priorityOrder = { A: 0, B: 1, C: 2, D: 3 }
      const priorityDiff = priorityOrder[a.scoring.priority] - priorityOrder[b.scoring.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.scoring.total - a.scoring.total
    })
}

/**
 * Statistiques de scoring pour un lot
 */
export function getScoringStats(scoredProspects) {
  const stats = {
    total: scoredProspects.length,
    byPriority: { A: 0, B: 0, C: 0, D: 0 },
    byCategory: { hot: 0, warm: 0, cold: 0, nurture: 0 },
    averageScores: { fit: 0, intent: 0, data: 0, total: 0 },
    topSignals: {}
  }

  scoredProspects.forEach(p => {
    const s = p.scoring
    stats.byPriority[s.priority]++
    stats.byCategory[s.category]++
    stats.averageScores.fit += s.fit.score
    stats.averageScores.intent += s.intent.score
    stats.averageScores.data += s.data.score
    stats.averageScores.total += s.total

    // Compter les signaux
    s.intent.signals.forEach(signal => {
      stats.topSignals[signal.type] = (stats.topSignals[signal.type] || 0) + 1
    })
  })

  const n = stats.total || 1
  stats.averageScores.fit = Math.round(stats.averageScores.fit / n)
  stats.averageScores.intent = Math.round(stats.averageScores.intent / n)
  stats.averageScores.data = Math.round(stats.averageScores.data / n)
  stats.averageScores.total = Math.round(stats.averageScores.total / n)

  // Trier les signaux par frequence
  stats.topSignals = Object.entries(stats.topSignals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }))

  return stats
}
