/**
 * Intent Signals Detection - Detection des signaux d'achat
 * Niveau 6sense/Bombora : Detecter quand une entreprise est prete a acheter
 */

/**
 * Detecte les signaux d'achat d'un prospect enrichi
 * @param {Object} prospect - Prospect avec donnees enrichies
 * @param {Object} icp - Profil client ideal
 * @returns {Object} Signaux detectes et score d'intention
 */
export function detectBuyingSignals(prospect, icp) {
  const signals = []
  let intentScore = 0

  const enrichment = prospect.enrichment || prospect

  // ============================================
  // SIGNAL 1: Recrutement en cours (ils grandissent)
  // ============================================
  if (detectHiringSignals(enrichment)) {
    signals.push({
      type: 'hiring',
      strength: 'strong',
      score: 15,
      detail: 'Recrutement actif detecte',
      source: 'linkedin/website',
      insight: 'Entreprise en croissance = nouveaux besoins en services'
    })
    intentScore += 15
  }

  // ============================================
  // SIGNAL 2: Avis negatifs mentionnant le probleme
  // ============================================
  const painInReviews = detectPainInReviews(enrichment, icp)
  if (painInReviews.found) {
    signals.push({
      type: 'pain_visible',
      strength: 'very_strong',
      score: 25,
      detail: `Avis negatifs lies au service: "${painInReviews.keywords.join(', ')}"`,
      source: 'google_reviews',
      insight: 'Le prospect a un probleme VISIBLE que vous pouvez resoudre',
      reviews: painInReviews.reviews
    })
    intentScore += 25
  }

  // ============================================
  // SIGNAL 3: Pas de prestataire existant
  // ============================================
  const hasExistingProvider = detectExistingProvider(enrichment, icp)
  if (!hasExistingProvider) {
    signals.push({
      type: 'no_provider',
      strength: 'medium',
      score: 10,
      detail: 'Pas de prestataire actuel identifie',
      source: 'website_analysis',
      insight: 'Opportunite de premiere relation'
    })
    intentScore += 10
  }

  // ============================================
  // SIGNAL 4: Entreprise recente (< 2 ans)
  // ============================================
  const companyAge = calculateCompanyAge(enrichment)
  if (companyAge && companyAge.years < 2) {
    signals.push({
      type: 'new_company',
      strength: 'medium',
      score: 10,
      detail: `Entreprise creee il y a ${companyAge.months} mois`,
      source: 'legal_data',
      insight: 'Nouvelle entreprise = construction du stack de prestataires'
    })
    intentScore += 10
  }

  // ============================================
  // SIGNAL 5: Croissance rapide
  // ============================================
  const growth = detectGrowthSignals(enrichment)
  if (growth.isGrowing) {
    signals.push({
      type: 'growing_fast',
      strength: 'strong',
      score: 15,
      detail: growth.detail,
      source: growth.source,
      insight: 'Croissance = nouveaux besoins + budget disponible'
    })
    intentScore += 15
  }

  // ============================================
  // SIGNAL 6: Levee de fonds recente
  // ============================================
  const funding = detectFundingSignals(enrichment)
  if (funding.found) {
    signals.push({
      type: 'funding',
      strength: 'very_strong',
      score: 20,
      detail: funding.detail,
      source: 'news/press',
      insight: 'Levee de fonds = budget pour investir dans les services'
    })
    intentScore += 20
  }

  // ============================================
  // SIGNAL 7: Changement de dirigeant/management
  // ============================================
  const managementChange = detectManagementChange(enrichment)
  if (managementChange) {
    signals.push({
      type: 'management_change',
      strength: 'strong',
      score: 12,
      detail: 'Changement de direction recent',
      source: 'legal_data',
      insight: 'Nouveau dirigeant = nouvelles decisions, nouveaux prestataires'
    })
    intentScore += 12
  }

  // ============================================
  // SIGNAL 8: Demenagement / Nouveaux locaux
  // ============================================
  const relocation = detectRelocationSignals(enrichment)
  if (relocation.found) {
    signals.push({
      type: 'relocation',
      strength: 'strong',
      score: 18,
      detail: relocation.detail,
      source: relocation.source,
      insight: 'Nouveaux locaux = nouveaux besoins en services'
    })
    intentScore += 18
  }

  // ============================================
  // SIGNAL 9: Site web obsolete / Refonte recente
  // ============================================
  const websiteSignal = detectWebsiteSignals(enrichment, icp)
  if (websiteSignal.found) {
    signals.push({
      type: 'website_signal',
      strength: websiteSignal.strength,
      score: websiteSignal.score,
      detail: websiteSignal.detail,
      source: 'website_analysis',
      insight: websiteSignal.insight
    })
    intentScore += websiteSignal.score
  }

  // ============================================
  // SIGNAL 10: Activite recente (mise a jour site, posts)
  // ============================================
  const recentActivity = detectRecentActivity(enrichment)
  if (recentActivity.active) {
    signals.push({
      type: 'recent_activity',
      strength: 'medium',
      score: 8,
      detail: recentActivity.detail,
      source: recentActivity.source,
      insight: 'Entreprise active = reactive aux sollicitations'
    })
    intentScore += 8
  }

  // ============================================
  // Calculer la priorite globale
  // ============================================
  let priority
  if (intentScore >= 30) priority = 'high'
  else if (intentScore >= 15) priority = 'medium'
  else priority = 'low'

  return {
    signals,
    intentScore: Math.min(100, intentScore), // Plafonner a 100
    signalCount: signals.length,
    priority,
    strongestSignal: signals.sort((a, b) => b.score - a.score)[0] || null,
    recommendation: getIntentRecommendation(priority, signals)
  }
}

// ============================================
// Fonctions de detection individuelles
// ============================================

function detectHiringSignals(enrichment) {
  // Verifier les signaux de recrutement
  const indicators = [
    enrichment.linkedin?.isHiring,
    enrichment.siteData?.content?.toLowerCase().includes('recrutement'),
    enrichment.siteData?.content?.toLowerCase().includes('nous rejoindre'),
    enrichment.siteData?.content?.toLowerCase().includes('offres d\'emploi'),
    enrichment.siteData?.headings?.some(h =>
      h.toLowerCase().includes('carrière') ||
      h.toLowerCase().includes('recrutement')
    )
  ]
  return indicators.some(Boolean)
}

function detectPainInReviews(enrichment, icp) {
  const result = { found: false, keywords: [], reviews: [] }
  const reviews = enrichment.reviews || enrichment.googleMaps?.reviews || []

  if (!reviews.length) return result

  // Mots-cles de douleur selon le secteur
  const painKeywords = getPainKeywords(icp.sector)

  reviews.forEach(review => {
    const text = (review.text || review.comment || '').toLowerCase()
    const rating = review.rating || review.stars || 5

    // Ne considerer que les avis negatifs (< 4 etoiles)
    if (rating < 4) {
      const matchedKeywords = painKeywords.filter(kw => text.includes(kw))
      if (matchedKeywords.length > 0) {
        result.found = true
        result.keywords.push(...matchedKeywords)
        result.reviews.push({
          text: text.substring(0, 200),
          rating,
          keywords: matchedKeywords
        })
      }
    }
  })

  result.keywords = [...new Set(result.keywords)]
  return result
}

function getPainKeywords(sector) {
  const sectorKeywords = {
    'nettoyage': ['sale', 'propre', 'propreté', 'entretien', 'ménage', 'poussière', 'odeur', 'hygiène'],
    'web': ['site', 'lent', 'bug', 'obsolète', 'ancien', 'design', 'mobile', 'responsive'],
    'comptabilité': ['retard', 'erreur', 'déclaration', 'délai', 'réponse'],
    'marketing': ['visibilité', 'clients', 'ventes', 'leads', 'conversion'],
    'rh': ['recrutement', 'turnover', 'formation', 'embauche'],
    'default': ['problème', 'mauvais', 'nul', 'déçu', 'insatisfait', 'attendre']
  }

  const normalized = (sector || '').toLowerCase()
  for (const [key, keywords] of Object.entries(sectorKeywords)) {
    if (normalized.includes(key)) {
      return [...keywords, ...sectorKeywords.default]
    }
  }
  return sectorKeywords.default
}

function detectExistingProvider(enrichment, icp) {
  // Verifier si un prestataire concurrent est mentionne
  const content = (enrichment.siteData?.content || '').toLowerCase()
  const description = (enrichment.description || '').toLowerCase()

  // Mots-cles indiquant un prestataire existant
  const providerKeywords = ['partenaire', 'prestataire', 'fournisseur', 'collaboration']

  // Cette detection est tres basique - en prod, on croiserait avec plus de sources
  return providerKeywords.some(kw => content.includes(kw) || description.includes(kw))
}

function calculateCompanyAge(enrichment) {
  const creationDate = enrichment.creationDate || enrichment.legalData?.createdAt
  if (!creationDate) return null

  const created = new Date(creationDate)
  const now = new Date()
  const diffMs = now - created
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365)
  const diffMonths = Math.round(diffYears * 12)

  return {
    years: Math.floor(diffYears),
    months: diffMonths,
    date: created
  }
}

function detectGrowthSignals(enrichment) {
  const result = { isGrowing: false, detail: '', source: '' }

  // Verifier l'evolution de l'effectif
  const currentEmployees = enrichment.employeeCount || enrichment.legalData?.employees
  const previousEmployees = enrichment.previousEmployeeCount

  if (currentEmployees && previousEmployees && currentEmployees > previousEmployees) {
    const growthRate = Math.round(((currentEmployees - previousEmployees) / previousEmployees) * 100)
    if (growthRate >= 20) {
      result.isGrowing = true
      result.detail = `+${growthRate}% d'effectif`
      result.source = 'legal_data'
      return result
    }
  }

  // Verifier l'evolution du CA
  const currentRevenue = enrichment.revenue || enrichment.legalData?.revenue
  const previousRevenue = enrichment.previousRevenue

  if (currentRevenue && previousRevenue && currentRevenue > previousRevenue) {
    const growthRate = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    if (growthRate >= 15) {
      result.isGrowing = true
      result.detail = `+${growthRate}% de CA`
      result.source = 'legal_data'
      return result
    }
  }

  // Verifier les avis recents positifs (activite croissante)
  const reviews = enrichment.reviews || enrichment.googleMaps?.reviews || []
  const recentPositiveReviews = reviews.filter(r => {
    const isRecent = r.date && (new Date() - new Date(r.date)) < 90 * 24 * 60 * 60 * 1000
    const isPositive = (r.rating || r.stars || 0) >= 4
    return isRecent && isPositive
  }).length

  if (recentPositiveReviews >= 5) {
    result.isGrowing = true
    result.detail = `${recentPositiveReviews} avis positifs recents`
    result.source = 'google_reviews'
  }

  return result
}

function detectFundingSignals(enrichment) {
  const result = { found: false, detail: '' }

  // Verifier les mentions de levee de fonds
  const content = (enrichment.siteData?.content || '').toLowerCase()
  const headings = (enrichment.siteData?.headings || []).join(' ').toLowerCase()

  const fundingKeywords = ['levée de fonds', 'série a', 'série b', 'seed', 'investissement',
                           'million', 'financement', 'bpifrance', 'capital']

  for (const keyword of fundingKeywords) {
    if (content.includes(keyword) || headings.includes(keyword)) {
      result.found = true
      result.detail = `Mention de "${keyword}" detectee`
      break
    }
  }

  return result
}

function detectManagementChange(enrichment) {
  // En production, on comparerait avec les donnees historiques
  // Pour l'instant, on verifie si la date de nomination est recente

  const creationDate = enrichment.legalData?.createdAt
  const companyAge = calculateCompanyAge(enrichment)

  // Si l'entreprise a plus de 2 ans mais le dirigeant est different du fondateur
  // C'est une approximation - en prod, on aurait l'historique

  return false // Desactive pour l'instant sans donnees historiques
}

function detectRelocationSignals(enrichment) {
  const result = { found: false, detail: '', source: '' }

  // Verifier les mentions de demenagement
  const content = (enrichment.siteData?.content || '').toLowerCase()

  const relocationKeywords = ['nouveaux locaux', 'déménagement', 'nouvelle adresse',
                              'nous avons déménagé', 'nouvelle agence', 'ouverture']

  for (const keyword of relocationKeywords) {
    if (content.includes(keyword)) {
      result.found = true
      result.detail = `"${keyword}" mentionne sur le site`
      result.source = 'website'
      break
    }
  }

  return result
}

function detectWebsiteSignals(enrichment, icp) {
  const result = { found: false, strength: '', score: 0, detail: '', insight: '' }

  // Verifier l'age du site (copyright, mentions)
  const content = (enrichment.siteData?.content || '').toLowerCase()
  const currentYear = new Date().getFullYear()

  // Site obsolete (copyright vieux)
  const oldCopyrightMatch = content.match(/©\s*(201[0-8]|200\d)/)
  if (oldCopyrightMatch) {
    result.found = true
    result.strength = 'medium'
    result.score = 10
    result.detail = `Site avec copyright ${oldCopyrightMatch[1]} (obsolete)`
    result.insight = 'Site non maintenu = entreprise potentiellement en recherche de prestataire'
    return result
  }

  // Site recemment refait (copyright actuel + mentions)
  const recentKeywords = ['nouveau site', 'refonte', `© ${currentYear}`, 'bienvenue sur notre nouveau']
  for (const keyword of recentKeywords) {
    if (content.includes(keyword)) {
      result.found = true
      result.strength = 'medium'
      result.score = 8
      result.detail = 'Site recemment refait'
      result.insight = 'Refonte recente = investissement dans l\'image, ouverture aux prestataires'
      return result
    }
  }

  return result
}

function detectRecentActivity(enrichment) {
  const result = { active: false, detail: '', source: '' }

  // Verifier la date du dernier avis Google
  const reviews = enrichment.reviews || enrichment.googleMaps?.reviews || []
  const recentReviews = reviews.filter(r => {
    const reviewDate = r.date || r.time
    if (!reviewDate) return false
    return (new Date() - new Date(reviewDate)) < 30 * 24 * 60 * 60 * 1000 // 30 jours
  })

  if (recentReviews.length >= 2) {
    result.active = true
    result.detail = `${recentReviews.length} avis dans les 30 derniers jours`
    result.source = 'google_reviews'
    return result
  }

  // Verifier si le site a du contenu recent (dates, actualites)
  const content = (enrichment.siteData?.content || '')
  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  if (content.includes(currentMonth) || content.includes(lastMonth)) {
    result.active = true
    result.detail = 'Contenu recent sur le site'
    result.source = 'website'
  }

  return result
}

function getIntentRecommendation(priority, signals) {
  switch (priority) {
    case 'high':
      return {
        action: 'Contacter en priorite absolue',
        urgency: 'Cette semaine',
        approach: 'Sequence multicanale complete',
        reasoning: signals.length > 0
          ? `${signals.length} signaux forts detectes dont: ${signals[0]?.detail}`
          : 'Score d\'intention eleve'
      }
    case 'medium':
      return {
        action: 'Contacter cette semaine',
        urgency: 'Sous 7 jours',
        approach: 'Email + 1-2 relances',
        reasoning: 'Signaux d\'interet moderes'
      }
    case 'low':
      return {
        action: 'Ajouter a la sequence longue',
        urgency: 'Quand disponible',
        approach: 'Nurturing email',
        reasoning: 'Peu de signaux - cultiver la relation'
      }
    default:
      return {
        action: 'Evaluer manuellement',
        urgency: '-',
        approach: '-',
        reasoning: '-'
      }
  }
}

/**
 * Analyse un lot de prospects et trie par intention
 */
export function sortProspectsByIntent(prospects, icp) {
  return prospects
    .map(prospect => {
      const intentData = detectBuyingSignals(prospect, icp)
      return {
        ...prospect,
        intent: intentData
      }
    })
    .sort((a, b) => b.intent.intentScore - a.intent.intentScore)
}
