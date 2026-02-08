/**
 * ProspectScorer - Scoring automatique des prospects
 * Analyse le site web pour determiner le potentiel du prospect
 * Plus le score est eleve, plus le prospect a besoin de services video
 */

import { SCORING_CONFIG, PROSPECT_STATUS } from './config'

/**
 * Detecter si le site contient de la video
 */
export const hasVideo = (html) => {
  const videoPatterns = [
    /<video/i,
    /youtube\.com\/embed/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /wistia\.com/i,
    /vidyard\.com/i,
    /loom\.com/i,
    /player\.vimeo\.com/i,
    /youtube-nocookie\.com/i,
  ]

  return videoPatterns.some((pattern) => pattern.test(html))
}

/**
 * Detecter si le site est vieillot/obsolete
 */
export const isOldSite = (html) => {
  const oldPatterns = [
    /dreamweaver/i,
    /frontpage/i,
    /<table[^>]*bgcolor/i,
    /<font[^>]*>/i,
    /<center>/i,
    /<marquee>/i,
    /flash\.swf/i,
    /\.swf/i,
    /activex/i,
    /microsoft word/i,
    /transitional\.dtd/i,
  ]

  // Verifier les meta generators anciens
  const oldGenerators = [
    /generator.*wordpress.*[1-4]\./i,
    /generator.*joomla.*[1-2]\./i,
    /generator.*drupal.*[1-6]\./i,
  ]

  return oldPatterns.some((p) => p.test(html)) || oldGenerators.some((p) => p.test(html))
}

/**
 * Detecter si le site a une chaine YouTube
 */
export const hasYouTubeChannel = (html) => {
  const ytPatterns = [
    /youtube\.com\/channel\//i,
    /youtube\.com\/c\//i,
    /youtube\.com\/@/i,
    /youtube\.com\/user\//i,
  ]

  return ytPatterns.some((pattern) => pattern.test(html))
}

/**
 * Detecter si le site a un compte Instagram
 */
export const hasInstagram = (html) => {
  return /instagram\.com\//i.test(html)
}

/**
 * Detecter si le site a une page Facebook
 */
export const hasFacebook = (html) => {
  return /facebook\.com\//i.test(html)
}

/**
 * Detecter si le site a un compte LinkedIn
 */
export const hasLinkedIn = (html) => {
  return /linkedin\.com\/(?:company|in)\//i.test(html)
}

/**
 * Detecter si le site a un compte TikTok
 */
export const hasTikTok = (html) => {
  return /tiktok\.com\/@/i.test(html)
}

/**
 * Analyser la qualite globale du site
 */
export const analyzeSiteQuality = (html) => {
  const indicators = {
    hasResponsive: /viewport.*width=device-width/i.test(html),
    hasSSL: false, // Sera determine par l'URL
    hasModernFramework: /react|vue|angular|next|nuxt|gatsby/i.test(html),
    hasAnalytics: /google-analytics|gtag|analytics\.js|googletagmanager/i.test(html),
    hasStructuredData: /application\/ld\+json/i.test(html),
    hasFavicon: /rel=["'](?:icon|shortcut icon)["']/i.test(html),
  }

  let qualityScore = 0
  if (indicators.hasResponsive) qualityScore += 10
  if (indicators.hasModernFramework) qualityScore += 15
  if (indicators.hasAnalytics) qualityScore += 5
  if (indicators.hasStructuredData) qualityScore += 5
  if (indicators.hasFavicon) qualityScore += 5

  return {
    score: qualityScore,
    indicators,
  }
}

/**
 * Scorer un prospect
 * Retourne un score de 0 a 100 et les details
 */
export const scoreProspect = async (prospect, htmlContent = null) => {
  let score = 0
  const details = {}

  // A un site web ? (+10)
  if (prospect.url) {
    score += SCORING_CONFIG.hasWebsite
    details.hasWebsite = true
  } else {
    details.hasWebsite = false
    return { score: 0, details, status: 'no_website' }
  }

  // Email trouve ?
  if (prospect.emails && prospect.emails.length > 0) {
    // Verifier si c'est un email personnel ou generique
    const hasPersonalEmail = prospect.emails.some((email) => {
      const prefix = email.split('@')[0].toLowerCase()
      const genericPrefixes = [
        'contact',
        'info',
        'hello',
        'admin',
        'commercial',
        'vente',
        'support',
      ]
      return !genericPrefixes.includes(prefix) && !prefix.includes('noreply')
    })

    if (hasPersonalEmail) {
      score += SCORING_CONFIG.hasPersonalEmail // +30
      details.emailType = 'personal'
    } else {
      score += SCORING_CONFIG.hasGenericEmail // +20
      details.emailType = 'generic'
    }
  } else {
    // Pas d'email = prospect inutile
    details.emailType = 'none'
    return { score: 0, details, status: 'no_email' }
  }

  // Si on a le contenu HTML du site, analyser plus en detail
  if (htmlContent) {
    // Pas de video ? (+25) -> ILS ONT BESOIN DE TOI
    const siteHasVideo = hasVideo(htmlContent)
    if (!siteHasVideo) {
      score += SCORING_CONFIG.noVideo
      details.hasVideo = false
    } else {
      details.hasVideo = true
    }

    // Site vieillot ? (+15)
    const siteIsOld = isOldSite(htmlContent)
    if (siteIsOld) {
      score += SCORING_CONFIG.oldSite
      details.siteModernity = 'old'
    } else {
      details.siteModernity = 'modern'
    }

    // Pas de YouTube ? (+10)
    const hasYT = hasYouTubeChannel(htmlContent)
    if (!hasYT) {
      score += SCORING_CONFIG.noYouTube
      details.hasYouTube = false
    } else {
      details.hasYouTube = true
    }

    // A un Instagram ? (+5, sensible au visuel)
    const hasIG = hasInstagram(htmlContent)
    if (hasIG) {
      score += SCORING_CONFIG.hasInstagram
      details.hasInstagram = true
    } else {
      details.hasInstagram = false
    }

    // Analyser la qualite du site
    const quality = analyzeSiteQuality(htmlContent)
    details.siteQuality = quality

    // Presence sur les reseaux sociaux
    details.socialMedia = {
      facebook: hasFacebook(htmlContent),
      instagram: hasIG,
      youtube: hasYT,
      linkedin: hasLinkedIn(htmlContent),
      tiktok: hasTikTok(htmlContent),
    }
  }

  // Nom du contact trouve ? (+5)
  if (prospect.contactName) {
    score += SCORING_CONFIG.hasContactName
    details.hasContactName = true
  } else {
    details.hasContactName = false
  }

  // Calculer le score video pour le template email
  details.scoreVideoText = getScoreVideoText(details)

  return {
    score: Math.min(score, SCORING_CONFIG.maxScore),
    details,
    status: PROSPECT_STATUS.SCORED,
  }
}

/**
 * Generer le texte du score video pour le template email
 */
export const getScoreVideoText = (details) => {
  const issues = []

  if (details.hasVideo === false) {
    issues.push('pas de video sur votre site')
  }
  if (details.hasYouTube === false) {
    issues.push('pas de chaine YouTube')
  }
  if (details.siteModernity === 'old') {
    issues.push('un site qui meriterait une modernisation')
  }

  if (issues.length === 0) {
    return 'peu de contenu video engageant'
  }

  if (issues.length === 1) {
    return issues[0]
  }

  // Joindre les issues avec "et"
  const lastIssue = issues.pop()
  return issues.join(', ') + ' et ' + lastIssue
}

/**
 * Scorer plusieurs prospects
 */
export const scoreProspects = async (prospects, fetchHtmlFn = null) => {
  const results = []

  for (const prospect of prospects) {
    let htmlContent = null

    // Si une fonction de fetch est fournie, recuperer le HTML
    if (fetchHtmlFn && prospect.url) {
      try {
        htmlContent = await fetchHtmlFn(prospect.url)
      } catch (error) {
        console.warn(`Failed to fetch HTML for ${prospect.url}:`, error.message)
      }
    }

    const result = await scoreProspect(prospect, htmlContent)
    results.push({
      prospectId: prospect.id,
      ...result,
    })
  }

  return results
}

/**
 * Classer les prospects par score
 */
export const rankProspects = (prospects) => {
  return [...prospects].sort((a, b) => b.score - a.score)
}

/**
 * Filtrer les prospects avec un score minimum
 */
export const filterByMinScore = (prospects, minScore = 50) => {
  return prospects.filter((p) => p.score >= minScore)
}

/**
 * Obtenir les statistiques de scoring
 */
export const getScoringStats = (prospects) => {
  if (prospects.length === 0) {
    return {
      total: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      aboveThreshold: 0,
    }
  }

  const scores = prospects.map((p) => p.score || 0)
  const total = prospects.length
  const sum = scores.reduce((a, b) => a + b, 0)
  const avgScore = Math.round(sum / total)
  const maxScore = Math.max(...scores)
  const minScore = Math.min(...scores)
  const aboveThreshold = prospects.filter((p) => (p.score || 0) >= 50).length

  return {
    total,
    avgScore,
    maxScore,
    minScore,
    aboveThreshold,
    distribution: {
      excellent: prospects.filter((p) => (p.score || 0) >= 80).length,
      good: prospects.filter((p) => (p.score || 0) >= 60 && (p.score || 0) < 80).length,
      average: prospects.filter((p) => (p.score || 0) >= 40 && (p.score || 0) < 60).length,
      poor: prospects.filter((p) => (p.score || 0) < 40).length,
    },
  }
}

export default {
  hasVideo,
  isOldSite,
  hasYouTubeChannel,
  hasInstagram,
  hasFacebook,
  hasLinkedIn,
  hasTikTok,
  analyzeSiteQuality,
  scoreProspect,
  getScoreVideoText,
  scoreProspects,
  rankProspects,
  filterByMinScore,
  getScoringStats,
}
