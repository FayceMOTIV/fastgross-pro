/**
 * DScore Engine — Digital Maturity Score 0-100
 * Face Media Factory
 *
 * Calcule un score de maturite digitale sur 6 dimensions :
 * 1. Website (PageSpeed, HTTPS, age du domaine)
 * 2. Google Maps (note, avis, photos, taux de reponse)
 * 3. Presence sociale (Facebook, Instagram, LinkedIn)
 * 4. Recrutement (offres digital sur France Travail)
 * 5. Avis en ligne (Trustpilot, negatifs sans reponse)
 * 6. Score global pondere + resume IA
 *
 * Urgence : CRITIQUE (0-35) / LATENT (36-65) / MATURE (66-100)
 */

import Groq from 'groq-sdk'
import axios from 'axios'

// ============================================
// CONFIGURATION
// ============================================

const WEIGHTS = {
  website: 0.30,
  googleMaps: 0.25,
  social: 0.20,
  recruitment: 0.15,
  reviews: 0.10,
}

const URGENCY_THRESHOLDS = {
  CRITIQUE: 35,
  LATENT: 65,
  // >= 66 => MATURE
}

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const RDAP_API = 'https://rdap.org/domain'
const FRANCE_TRAVAIL_API = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search'
const TRUSTPILOT_SEARCH = 'https://www.trustpilot.com/review'

// ============================================
// 1. ANALYSE WEBSITE (0-100)
// ============================================

/**
 * Analyse la maturite web : PageSpeed, HTTPS, age du domaine
 * @param {string} website - URL du site web
 * @returns {Object} { score, details }
 */
export async function analyzeWebsite(website) {
  if (!website) {
    return { score: 0, details: { reason: 'Pas de site web', hasWebsite: false } }
  }

  const url = website.startsWith('http') ? website : `https://${website}`
  const details = {
    hasWebsite: true,
    url,
    pagespeed: null,
    https: false,
    domainAge: null,
    mobileFriendly: null,
  }

  let totalScore = 0

  // --- HTTPS check (10 pts) ---
  details.https = url.startsWith('https://')
  if (details.https) totalScore += 10

  // --- PageSpeed Insights (50 pts) ---
  try {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.PAGESPEED_API_KEY
    const params = {
      url,
      category: ['performance', 'seo', 'best-practices'],
      strategy: 'mobile',
    }
    if (apiKey) params.key = apiKey

    const response = await axios.get(PAGESPEED_API, { params, timeout: 30000 })
    const categories = response.data?.lighthouseResult?.categories || {}

    const perfScore = (categories.performance?.score || 0) * 100
    const seoScore = (categories.seo?.score || 0) * 100
    const bpScore = (categories['best-practices']?.score || 0) * 100

    details.pagespeed = {
      performance: Math.round(perfScore),
      seo: Math.round(seoScore),
      bestPractices: Math.round(bpScore),
    }

    // Moyenne ponderee : perf 50%, SEO 30%, best-practices 20%
    const avgScore = perfScore * 0.5 + seoScore * 0.3 + bpScore * 0.2
    totalScore += Math.round((avgScore / 100) * 50)

    // Mobile friendly
    details.mobileFriendly = perfScore >= 50
  } catch (err) {
    console.warn('[DScore] PageSpeed failed:', err.message)
    // Si le site est accessible, 15 pts par defaut
    try {
      await axios.head(url, { timeout: 10000 })
      totalScore += 15
      details.pagespeed = { error: 'API indisponible, site accessible' }
    } catch {
      details.pagespeed = { error: 'Site inaccessible' }
    }
  }

  // --- Domain age via RDAP (20 pts) ---
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    const rdapResponse = await axios.get(`${RDAP_API}/${domain}`, { timeout: 10000 })
    const events = rdapResponse.data?.events || []
    const registration = events.find((e) => e.eventAction === 'registration')

    if (registration?.eventDate) {
      const regDate = new Date(registration.eventDate)
      const ageYears = (Date.now() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      details.domainAge = Math.round(ageYears * 10) / 10

      if (ageYears >= 10) totalScore += 20
      else if (ageYears >= 5) totalScore += 15
      else if (ageYears >= 2) totalScore += 10
      else if (ageYears >= 1) totalScore += 5
      else totalScore += 2
    }
  } catch (err) {
    console.warn('[DScore] RDAP failed:', err.message)
    // Fallback : domaine existe, 5 pts
    totalScore += 5
    details.domainAge = null
  }

  // --- Structured data / meta tags bonus (20 pts) ---
  try {
    const pageResp = await axios.get(url, { timeout: 15000, maxRedirects: 3 })
    const html = typeof pageResp.data === 'string' ? pageResp.data : ''
    const htmlLower = html.toLowerCase()

    let metaScore = 0

    // Open Graph tags
    if (htmlLower.includes('og:title') || htmlLower.includes('og:description')) metaScore += 5

    // Schema.org / JSON-LD
    if (htmlLower.includes('application/ld+json') || htmlLower.includes('schema.org')) metaScore += 5

    // Analytics / GTM
    if (htmlLower.includes('google-analytics') || htmlLower.includes('gtag') || htmlLower.includes('googletagmanager')) metaScore += 5

    // Cookie consent
    if (htmlLower.includes('cookie') && (htmlLower.includes('consent') || htmlLower.includes('rgpd') || htmlLower.includes('gdpr'))) metaScore += 3

    // Responsive viewport
    if (htmlLower.includes('viewport')) metaScore += 2

    totalScore += Math.min(20, metaScore)
    details.metaTags = {
      openGraph: htmlLower.includes('og:title'),
      structuredData: htmlLower.includes('application/ld+json'),
      analytics: htmlLower.includes('gtag') || htmlLower.includes('google-analytics'),
      cookieConsent: htmlLower.includes('cookie') && htmlLower.includes('consent'),
      responsive: htmlLower.includes('viewport'),
    }
  } catch (err) {
    console.warn('[DScore] HTML analysis failed:', err.message)
  }

  return {
    score: Math.min(100, totalScore),
    details,
  }
}

// ============================================
// 2. ANALYSE GOOGLE MAPS (0-100)
// ============================================

/**
 * Analyse la presence Google Maps : note, avis, photos, reponses
 * @param {Object} mapsData - Donnees Google Maps du lead
 * @returns {Object} { score, details }
 */
export async function analyzeGoogleMaps(mapsData) {
  if (!mapsData || (!mapsData.rating && !mapsData.name)) {
    return { score: 0, details: { reason: 'Pas de fiche Google Maps', hasMaps: false } }
  }

  const details = {
    hasMaps: true,
    rating: mapsData.rating || 0,
    totalReviews: mapsData.totalReviews || mapsData.reviewCount || 0,
    photos: mapsData.photos || mapsData.photoCount || 0,
    responseRate: mapsData.responseRate || 0,
    claimed: mapsData.claimed !== false, // assume claimed unless explicitly false
  }

  let totalScore = 0

  // --- Note Google (30 pts) ---
  const rating = details.rating
  if (rating >= 4.5) totalScore += 30
  else if (rating >= 4.0) totalScore += 25
  else if (rating >= 3.5) totalScore += 20
  else if (rating >= 3.0) totalScore += 15
  else if (rating > 0) totalScore += 5

  // --- Nombre d'avis (25 pts) ---
  const reviews = details.totalReviews
  if (reviews >= 200) totalScore += 25
  else if (reviews >= 100) totalScore += 20
  else if (reviews >= 50) totalScore += 15
  else if (reviews >= 20) totalScore += 10
  else if (reviews >= 5) totalScore += 5

  // --- Photos (15 pts) ---
  const photos = details.photos
  if (photos >= 50) totalScore += 15
  else if (photos >= 20) totalScore += 12
  else if (photos >= 10) totalScore += 8
  else if (photos >= 3) totalScore += 4

  // --- Taux de reponse aux avis (20 pts) ---
  const respRate = details.responseRate
  if (respRate >= 80) totalScore += 20
  else if (respRate >= 50) totalScore += 15
  else if (respRate >= 20) totalScore += 10
  else if (respRate > 0) totalScore += 5

  // --- Fiche revendiquee (10 pts) ---
  if (details.claimed) totalScore += 10

  return {
    score: Math.min(100, totalScore),
    details,
  }
}

// ============================================
// 3. ANALYSE PRESENCE SOCIALE (0-100)
// ============================================

/**
 * Analyse la presence sur les reseaux sociaux
 * @param {Object} socialData - Donnees sociales { facebook, instagram, linkedin }
 * @returns {Object} { score, details }
 */
export async function analyzeSocialPresence(socialData) {
  if (!socialData) {
    return { score: 0, details: { reason: 'Aucune donnee sociale', platforms: {} } }
  }

  const platforms = {}
  let totalScore = 0

  // --- Facebook (35 pts) ---
  const fb = socialData.facebook || {}
  if (fb.url || fb.exists) {
    let fbScore = 10 // Page existe
    const fbFollowers = fb.followers || fb.likes || 0

    if (fbFollowers >= 10000) fbScore += 15
    else if (fbFollowers >= 5000) fbScore += 12
    else if (fbFollowers >= 1000) fbScore += 8
    else if (fbFollowers >= 100) fbScore += 4

    // Activite recente
    if (fb.lastPost) {
      const daysSincePost = (Date.now() - new Date(fb.lastPost).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSincePost <= 7) fbScore += 10
      else if (daysSincePost <= 30) fbScore += 7
      else if (daysSincePost <= 90) fbScore += 3
    }

    platforms.facebook = { score: Math.min(35, fbScore), followers: fbFollowers, url: fb.url }
    totalScore += Math.min(35, fbScore)
  } else {
    platforms.facebook = { score: 0, exists: false }
  }

  // --- Instagram (35 pts) ---
  const ig = socialData.instagram || {}
  if (ig.url || ig.username || ig.exists) {
    let igScore = 10
    const igFollowers = ig.followers || 0

    if (igFollowers >= 10000) igScore += 15
    else if (igFollowers >= 5000) igScore += 12
    else if (igFollowers >= 1000) igScore += 8
    else if (igFollowers >= 100) igScore += 4

    // Frequence de post
    const postsPerMonth = ig.postsPerMonth || ig.postFrequency || 0
    if (postsPerMonth >= 12) igScore += 10
    else if (postsPerMonth >= 4) igScore += 7
    else if (postsPerMonth >= 1) igScore += 3

    platforms.instagram = { score: Math.min(35, igScore), followers: igFollowers, url: ig.url || ig.username }
    totalScore += Math.min(35, igScore)
  } else {
    platforms.instagram = { score: 0, exists: false }
  }

  // --- LinkedIn (30 pts) ---
  const li = socialData.linkedin || {}
  if (li.url || li.exists) {
    let liScore = 10
    const liFollowers = li.followers || li.connections || 0

    if (liFollowers >= 5000) liScore += 12
    else if (liFollowers >= 1000) liScore += 8
    else if (liFollowers >= 500) liScore += 5
    else if (liFollowers >= 100) liScore += 3

    // Page entreprise active
    if (li.hasCompanyPage) liScore += 5
    if (li.recentActivity) liScore += 3

    platforms.linkedin = { score: Math.min(30, liScore), followers: liFollowers, url: li.url }
    totalScore += Math.min(30, liScore)
  } else {
    platforms.linkedin = { score: 0, exists: false }
  }

  const activePlatforms = Object.values(platforms).filter((p) => p.score > 0).length

  return {
    score: Math.min(100, totalScore),
    details: {
      platforms,
      activePlatforms,
      totalPlatforms: 3,
    },
  }
}

// ============================================
// 4. ANALYSE RECRUTEMENT DIGITAL (0-100)
// ============================================

/**
 * Analyse les offres d'emploi digital via France Travail API
 * @param {Object} companyData - { name, siret, city }
 * @returns {Object} { score, details }
 */
export async function analyzeRecruitement(companyData) {
  if (!companyData?.name) {
    return { score: 0, details: { reason: 'Pas de nom d\'entreprise', hasDigitalJobs: false } }
  }

  const details = {
    hasDigitalJobs: false,
    digitalJobCount: 0,
    totalJobCount: 0,
    digitalRoles: [],
  }

  const digitalKeywords = [
    'digital', 'web', 'developpeur', 'community manager', 'seo', 'marketing digital',
    'traffic manager', 'growth', 'data', 'UX', 'UI', 'product', 'CRM', 'social media',
    'e-commerce', 'ecommerce', 'webmaster', 'fullstack', 'frontend', 'backend',
    'devops', 'cloud', 'cybersecurite', 'intelligence artificielle', 'IA',
  ]

  try {
    const params = {
      motsCles: companyData.name,
      range: '0-49',
    }
    if (companyData.city) {
      params.commune = companyData.city
    }

    const headers = {}
    if (process.env.FRANCE_TRAVAIL_API_KEY) {
      headers.Authorization = `Bearer ${process.env.FRANCE_TRAVAIL_API_KEY}`
    }

    const response = await axios.get(FRANCE_TRAVAIL_API, {
      params,
      headers,
      timeout: 15000,
    })

    const results = response.data?.resultats || []
    details.totalJobCount = results.length

    for (const job of results) {
      const title = (job.intitule || '').toLowerCase()
      const description = (job.description || '').toLowerCase()
      const combined = `${title} ${description}`

      const isDigital = digitalKeywords.some((kw) => combined.includes(kw.toLowerCase()))
      if (isDigital) {
        details.digitalJobCount++
        details.digitalRoles.push({
          title: job.intitule,
          type: job.typeContrat,
          date: job.dateCreation,
        })
      }
    }

    details.hasDigitalJobs = details.digitalJobCount > 0
  } catch (err) {
    console.warn('[DScore] France Travail API failed:', err.message)
    // Si l'API echoue, score neutre
    return { score: 50, details: { ...details, error: err.message, fallback: true } }
  }

  let totalScore = 0

  // Score inverse : plus ils recrutent du digital, plus ils sont matures
  // Mais pour le DScore (besoin de nos services), c'est l'inverse
  // Score eleve = PAS d'equipe digitale = ils ont besoin de nous
  if (details.digitalJobCount === 0 && details.totalJobCount === 0) {
    // Pas d'offres du tout — probablement petite entreprise, besoin fort
    totalScore = 75
  } else if (details.digitalJobCount === 0) {
    // Offres mais pas de digital — besoin fort
    totalScore = 85
  } else if (details.digitalJobCount <= 2) {
    // Debut de digitalisation — besoin modere
    totalScore = 60
  } else if (details.digitalJobCount <= 5) {
    // Equipe digitale en construction
    totalScore = 40
  } else {
    // Equipe digitale etablie — moins besoin
    totalScore = 20
  }

  return {
    score: totalScore,
    details,
  }
}

// ============================================
// 5. ANALYSE AVIS EN LIGNE (0-100)
// ============================================

/**
 * Analyse les avis en ligne (Trustpilot, Google, etc.)
 * @param {Object} reviewData - { trustpilot, google, unrepliedNegative }
 * @returns {Object} { score, details }
 */
export async function analyzeReviews(reviewData) {
  if (!reviewData) {
    return { score: 50, details: { reason: 'Pas de donnees avis', hasReviews: false } }
  }

  const details = {
    hasReviews: false,
    trustpilot: null,
    google: null,
    unrepliedNegativeCount: 0,
    eReputation: 'unknown',
  }

  let totalScore = 0

  // --- Trustpilot (40 pts) ---
  const tp = reviewData.trustpilot || {}
  if (tp.rating || tp.score) {
    details.hasReviews = true
    const tpRating = tp.rating || tp.score || 0
    const tpReviews = tp.totalReviews || tp.reviewCount || 0

    details.trustpilot = { rating: tpRating, reviews: tpReviews }

    // Score inverse — mauvais avis = besoin de gestion e-reputation
    if (tpRating >= 4.5) totalScore += 10 // Bonne reputation, moins besoin
    else if (tpRating >= 3.5) totalScore += 25 // Reputation moyenne
    else if (tpRating >= 2.0) totalScore += 35 // Reputation problematique = besoin fort
    else totalScore += 40 // Catastrophique = besoin urgent

    // Volume d'avis amplifie le signal
    if (tpReviews >= 100 && tpRating < 3.5) totalScore += 5
  }

  // --- Google Reviews (30 pts) ---
  const google = reviewData.google || {}
  if (google.rating || google.score) {
    details.hasReviews = true
    const gRating = google.rating || google.score || 0
    const gReviews = google.totalReviews || google.reviewCount || 0

    details.google = { rating: gRating, reviews: gReviews }

    if (gRating >= 4.5) totalScore += 8
    else if (gRating >= 3.5) totalScore += 20
    else if (gRating >= 2.0) totalScore += 27
    else totalScore += 30
  }

  // --- Avis negatifs sans reponse (30 pts) ---
  const unreplied = reviewData.unrepliedNegative || reviewData.unrepliedNegativeCount || 0
  details.unrepliedNegativeCount = unreplied

  if (unreplied >= 20) totalScore += 30
  else if (unreplied >= 10) totalScore += 25
  else if (unreplied >= 5) totalScore += 20
  else if (unreplied >= 2) totalScore += 10
  else if (unreplied === 1) totalScore += 5

  // --- e-Reputation globale ---
  if (totalScore >= 70) details.eReputation = 'problematique'
  else if (totalScore >= 40) details.eReputation = 'a_ameliorer'
  else details.eReputation = 'correcte'

  return {
    score: Math.min(100, totalScore),
    details,
  }
}

// ============================================
// 6. CALCUL DSCORE GLOBAL (0-100)
// ============================================

/**
 * Calcule le DScore global — maturite digitale
 * Combine les 5 dimensions avec poids + genere resume IA
 *
 * @param {Object} leadData - Donnees du lead
 * @param {string} leadData.website - URL du site web
 * @param {Object} leadData.googleMaps - Donnees Google Maps
 * @param {Object} leadData.social - Donnees reseaux sociaux
 * @param {Object} leadData.company - { name, siret, city }
 * @param {Object} leadData.reviews - Donnees avis
 * @param {Object} [options] - Options
 * @param {boolean} [options.skipAI] - Ne pas generer le resume IA
 * @param {boolean} [options.parallel] - Executer les analyses en parallele (defaut: true)
 * @returns {Object} DScore complet
 */
export async function calculateDScore(leadData, options = {}) {
  const startTime = Date.now()
  const { skipAI = false, parallel = true } = options

  // ============================================
  // NORMALISATION DES DONNEES D'ENTREE
  // ============================================

  const normalized = normalizeLeadData(leadData)

  // ============================================
  // EXECUTION DES ANALYSES
  // ============================================

  let websiteResult, mapsResult, socialResult, recruitResult, reviewsResult

  if (parallel) {
    const results = await Promise.allSettled([
      analyzeWebsite(normalized.website),
      analyzeGoogleMaps(normalized.googleMaps),
      analyzeSocialPresence(normalized.social),
      analyzeRecruitement(normalized.company),
      analyzeReviews(normalized.reviews),
    ])

    websiteResult = results[0].status === 'fulfilled' ? results[0].value : { score: 0, details: { error: results[0].reason?.message } }
    mapsResult = results[1].status === 'fulfilled' ? results[1].value : { score: 0, details: { error: results[1].reason?.message } }
    socialResult = results[2].status === 'fulfilled' ? results[2].value : { score: 0, details: { error: results[2].reason?.message } }
    recruitResult = results[3].status === 'fulfilled' ? results[3].value : { score: 50, details: { error: results[3].reason?.message } }
    reviewsResult = results[4].status === 'fulfilled' ? results[4].value : { score: 50, details: { error: results[4].reason?.message } }
  } else {
    websiteResult = await analyzeWebsite(normalized.website)
    mapsResult = await analyzeGoogleMaps(normalized.googleMaps)
    socialResult = await analyzeSocialPresence(normalized.social)
    recruitResult = await analyzeRecruitement(normalized.company)
    reviewsResult = await analyzeReviews(normalized.reviews)
  }

  // ============================================
  // CALCUL SCORE PONDERE
  // ============================================

  const dimensions = {
    website: { ...websiteResult, weight: WEIGHTS.website },
    googleMaps: { ...mapsResult, weight: WEIGHTS.googleMaps },
    social: { ...socialResult, weight: WEIGHTS.social },
    recruitment: { ...recruitResult, weight: WEIGHTS.recruitment },
    reviews: { ...reviewsResult, weight: WEIGHTS.reviews },
  }

  // Score pondere inverse : score eleve = besoin eleve (CRITIQUE)
  // Website : score bas = site mauvais = besoin fort → on inverse
  // Maps : score bas = pas de fiche = besoin fort → on inverse
  // Social : score bas = pas de presence = besoin fort → on inverse
  // Recruitment : deja inverse dans la fonction
  // Reviews : deja inverse dans la fonction

  const websiteNeed = 100 - websiteResult.score
  const mapsNeed = 100 - mapsResult.score
  const socialNeed = 100 - socialResult.score
  const recruitNeed = recruitResult.score // Deja inverse
  const reviewsNeed = reviewsResult.score // Deja inverse

  const dScore = Math.round(
    websiteNeed * WEIGHTS.website +
    mapsNeed * WEIGHTS.googleMaps +
    socialNeed * WEIGHTS.social +
    recruitNeed * WEIGHTS.recruitment +
    reviewsNeed * WEIGHTS.reviews
  )

  // ============================================
  // URGENCE
  // ============================================

  let urgency
  if (dScore >= URGENCY_THRESHOLDS.LATENT + 1) {
    urgency = 'CRITIQUE'
  } else if (dScore >= URGENCY_THRESHOLDS.CRITIQUE + 1) {
    urgency = 'LATENT'
  } else {
    urgency = 'MATURE'
  }

  // ============================================
  // STRATEGIE & TON ALEX
  // ============================================

  const strategy = getStrategy(urgency, dimensions)
  const alexTone = getAlexTone(urgency)

  // ============================================
  // TOP SIGNALS (points de douleur prioritaires)
  // ============================================

  const topSignals = extractTopSignals(dimensions, dScore)

  // ============================================
  // RESUME IA (Groq)
  // ============================================

  let summary = null
  if (!skipAI) {
    try {
      summary = await generateDScoreSummary({
        dScore,
        urgency,
        dimensions,
        topSignals,
        leadData: { ...leadData, companyName: normalized.companyName, sector: normalized.sector },
      })
    } catch (err) {
      console.warn('[DScore] AI summary failed:', err.message)
      summary = generateFallbackSummary(dScore, urgency, topSignals)
    }
  } else {
    summary = generateFallbackSummary(dScore, urgency, topSignals)
  }

  const elapsed = Date.now() - startTime

  return {
    dScore,
    urgency,
    strategy,
    alexTone,
    summary,
    dimensions,
    topSignals,
    calculatedAt: new Date().toISOString(),
    computeTimeMs: elapsed,
  }
}

// ============================================
// DATA NORMALIZATION
// ============================================

/**
 * Normalise les donnees d'entree pour gerer differents formats
 * Supporte : { googleMaps, social, reviews } (format standard)
 *            { placeData, socialData, reviewsData } (format battle test / simplifie)
 */
function normalizeLeadData(data) {
  return {
    website: data.website || null,
    googleMaps: data.googleMaps || data.maps || normalizePlaceData(data.placeData) || null,
    social: data.social || data.socialLinks || normalizeSocialData(data.socialData) || null,
    company: data.company || {
      name: data.companyName || data.nom_entreprise || data.name || null,
      siret: data.siret || null,
      city: data.city || data.ville || null,
    },
    reviews: data.reviews || normalizeReviewsData(data.reviewsData) || null,
    // Preserve original data for summary
    companyName: data.companyName || data.nom_entreprise || data.company?.name || data.name || null,
    sector: data.sector || data.industry || data.naf || data.libelle_naf || null,
  }
}

/**
 * Convertit placeData (format simplifie) vers le format attendu par analyzeGoogleMaps
 */
function normalizePlaceData(placeData) {
  if (!placeData) return null
  if (!placeData.found && !placeData.rating) return null
  return {
    rating: placeData.rating || 0,
    totalReviews: placeData.reviewCount || placeData.totalReviews || 0,
    reviewCount: placeData.reviewCount || placeData.totalReviews || 0,
    photos: placeData.photoCount || (placeData.hasPhotos ? 5 : 0),
    responseRate: typeof placeData.ownerResponseRate === 'number'
      ? placeData.ownerResponseRate * 100
      : placeData.responseRate || 0,
    claimed: placeData.claimed !== false,
    name: placeData.name || 'Fiche Maps',
  }
}

/**
 * Convertit socialData (format flat) vers le format attendu par analyzeSocialPresence
 */
function normalizeSocialData(socialData) {
  if (!socialData) return null
  return {
    facebook: socialData.facebookLastPost || socialData.facebookFollowers
      ? {
          exists: true,
          url: socialData.facebookUrl || null,
          lastPost: socialData.facebookLastPost || null,
          followers: socialData.facebookFollowers || 0,
        }
      : { exists: false },
    instagram: socialData.instagramFollowers > 0 || socialData.instagramUrl
      ? {
          exists: true,
          url: socialData.instagramUrl || null,
          username: socialData.instagramUsername || null,
          followers: socialData.instagramFollowers || 0,
          postsPerMonth: socialData.instagramPostsPerMonth || 0,
        }
      : { exists: false },
    linkedin: socialData.hasLinkedinPage
      ? {
          exists: true,
          url: socialData.linkedinUrl || null,
          hasCompanyPage: true,
          followers: socialData.linkedinEmployees || socialData.linkedinFollowers || 0,
          recentActivity: socialData.linkedinActive || false,
        }
      : { exists: false },
  }
}

/**
 * Convertit reviewsData (format simplifie) vers le format attendu par analyzeReviews
 */
function normalizeReviewsData(reviewsData) {
  if (!reviewsData) return null
  return {
    trustpilot: reviewsData.trustpilotScore
      ? { rating: reviewsData.trustpilotScore, totalReviews: reviewsData.trustpilotReviews || 0 }
      : null,
    google: reviewsData.googleScore
      ? { rating: reviewsData.googleScore, totalReviews: reviewsData.googleReviews || 0 }
      : null,
    unrepliedNegative: reviewsData.unrepliedNegative || 0,
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Determine la strategie de prospection selon l'urgence
 */
function getStrategy(urgency, dimensions) {
  switch (urgency) {
    case 'CRITIQUE':
      return {
        approach: 'direct',
        priority: 'P0',
        message: 'Approche directe — montrer les pertes immediates',
        channels: ['email', 'whatsapp', 'phone'],
        followUpDays: 2,
        maxTouchpoints: 7,
        pitch: 'audit_gratuit',
      }

    case 'LATENT':
      return {
        approach: 'educative',
        priority: 'P1',
        message: 'Approche educative — sensibiliser au digital',
        channels: ['email', 'linkedin'],
        followUpDays: 5,
        maxTouchpoints: 5,
        pitch: 'etude_de_cas',
      }

    case 'MATURE':
      return {
        approach: 'partnership',
        priority: 'P2',
        message: 'Approche partnership — proposer optimisation',
        channels: ['linkedin', 'email'],
        followUpDays: 7,
        maxTouchpoints: 3,
        pitch: 'optimisation_performance',
      }

    default:
      return {
        approach: 'standard',
        priority: 'P1',
        message: 'Approche standard',
        channels: ['email'],
        followUpDays: 5,
        maxTouchpoints: 5,
        pitch: 'decouverte',
      }
  }
}

/**
 * Determine le ton de l'agent Alex selon l'urgence
 */
function getAlexTone(urgency) {
  switch (urgency) {
    case 'CRITIQUE':
      return {
        tone: 'urgent_empathique',
        style: 'Direct mais bienveillant. Montrer les consequences concretes du retard digital.',
        opener: 'J\'ai analyse votre presence en ligne et j\'ai identifie des points critiques qui vous font perdre des clients chaque jour.',
        closingStyle: 'call_to_action_fort',
      }

    case 'LATENT':
      return {
        tone: 'consultant_expert',
        style: 'Pedagogique. Partager des insights pour creer une prise de conscience.',
        opener: 'En analysant votre secteur, j\'ai remarque des opportunites digitales que vos concurrents commencent a exploiter.',
        closingStyle: 'invitation_douce',
      }

    case 'MATURE':
      return {
        tone: 'partenaire_strategique',
        style: 'D\'egal a egal. Proposer des optimisations avancees.',
        opener: 'Votre presence digitale est solide. J\'ai identifie quelques leviers pour aller encore plus loin.',
        closingStyle: 'proposition_valeur',
      }

    default:
      return {
        tone: 'professionnel',
        style: 'Standard professionnel.',
        opener: 'Bonjour, j\'aimerais echanger avec vous sur votre strategie digitale.',
        closingStyle: 'standard',
      }
  }
}

/**
 * Extrait les top signaux / points de douleur
 */
function extractTopSignals(dimensions, dScore) {
  const signals = []

  // Website
  if (dimensions.website.score < 30) {
    signals.push({
      dimension: 'website',
      severity: 'critical',
      signal: 'Site web absent ou tres faible',
      impact: 'Perte de 70% des prospects qui cherchent en ligne',
    })
  } else if (dimensions.website.score < 60) {
    signals.push({
      dimension: 'website',
      severity: 'warning',
      signal: 'Site web sous-optimise (performance/SEO)',
      impact: 'Mauvais positionnement Google, experience mobile degradee',
    })
  }

  // Google Maps
  if (dimensions.googleMaps.score < 20) {
    signals.push({
      dimension: 'googleMaps',
      severity: 'critical',
      signal: 'Fiche Google Maps inexistante ou non optimisee',
      impact: 'Invisible en recherche locale — concurrent capte le trafic',
    })
  } else if (dimensions.googleMaps.details?.responseRate < 30) {
    signals.push({
      dimension: 'googleMaps',
      severity: 'warning',
      signal: 'Avis Google sans reponse',
      impact: 'Image de marque degradee, perte de confiance',
    })
  }

  // Social
  if (dimensions.social.score < 20) {
    signals.push({
      dimension: 'social',
      severity: 'critical',
      signal: 'Absence quasi-totale sur les reseaux sociaux',
      impact: 'Pas de visibilite aupres des 18-45 ans, zero viralite',
    })
  } else if (dimensions.social.details?.activePlatforms < 2) {
    signals.push({
      dimension: 'social',
      severity: 'warning',
      signal: 'Presence sociale limitee a 1 plateforme',
      impact: 'Dependance a un seul canal, audience limitee',
    })
  }

  // Recruitment
  if (dimensions.recruitment.score >= 75) {
    signals.push({
      dimension: 'recruitment',
      severity: 'critical',
      signal: 'Aucune competence digitale en interne',
      impact: 'Pas d\'equipe pour piloter la transformation digitale',
    })
  }

  // Reviews
  if (dimensions.reviews.details?.unrepliedNegativeCount >= 5) {
    signals.push({
      dimension: 'reviews',
      severity: 'warning',
      signal: `${dimensions.reviews.details.unrepliedNegativeCount} avis negatifs sans reponse`,
      impact: 'e-Reputation en danger, prospects dissuades',
    })
  }

  // Trier par severite
  signals.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] || 2) - (order[b.severity] || 2)
  })

  return signals.slice(0, 5)
}

/**
 * Genere un resume DScore via Groq (llama-3.3-70b-versatile)
 */
async function generateDScoreSummary({ dScore, urgency, dimensions, topSignals, leadData }) {
  if (!process.env.GROQ_API_KEY) {
    return generateFallbackSummary(dScore, urgency, topSignals)
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const companyName = leadData.companyName || leadData.name || leadData.company?.name || 'cette entreprise'
  const sector = leadData.sector || leadData.industry || 'non specifie'

  const prompt = `Tu es un expert en transformation digitale B2B.
Analyse ce diagnostic de maturite digitale et redige un resume percutant en francais (3-4 phrases).

Entreprise : ${companyName}
Secteur : ${sector}
DScore : ${dScore}/100 (${urgency})

Dimensions :
- Site web : ${dimensions.website.score}/100 (poids 30%)
- Google Maps : ${dimensions.googleMaps.score}/100 (poids 25%)
- Reseaux sociaux : ${dimensions.social.score}/100 (poids 20%)
- Recrutement digital : ${dimensions.recruitment.score}/100 (poids 15%)
- Avis en ligne : ${dimensions.reviews.score}/100 (poids 10%)

Signaux critiques :
${topSignals.map((s) => `- [${s.severity.toUpperCase()}] ${s.signal}: ${s.impact}`).join('\n')}

Redige un resume qui :
1. Commence par le constat principal (1 phrase)
2. Detaille le signal le plus critique (1 phrase)
3. Donne une recommandation actionnable (1-2 phrases)

Ton : professionnel, direct, sans jargon excessif. Pas de bullet points — du texte fluide.`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'Tu es un consultant senior en strategie digitale. Reponds en francais.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 300,
  })

  return completion.choices[0]?.message?.content?.trim() || generateFallbackSummary(dScore, urgency, topSignals)
}

/**
 * Resume de secours sans IA
 */
function generateFallbackSummary(dScore, urgency, topSignals) {
  const urgencyLabel = {
    CRITIQUE: 'en retard critique sur sa transformation digitale',
    LATENT: 'en phase de digitalisation partielle',
    MATURE: 'relativement bien positionne sur le digital',
  }

  const mainSignal = topSignals[0]
    ? `Le point le plus critique est : ${topSignals[0].signal.toLowerCase()}.`
    : ''

  return `Avec un DScore de ${dScore}/100 (${urgency}), cette entreprise est ${urgencyLabel[urgency] || 'a analyser plus en detail'}. ${mainSignal} Une action rapide permettrait d'ameliorer significativement la visibilite et la conversion en ligne.`
}
