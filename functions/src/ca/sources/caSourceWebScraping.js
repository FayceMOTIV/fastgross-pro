/**
 * caSourceWebScraping.js
 * Source 8 — Estimation CA via mentions legales du site web
 *
 * Cherche : capital social mentionne, effectif, CA mentionne, SIRET
 * Fiabilite : MOYEN si trouve, FAIBLE sinon
 * NOTE : utilise les donnees deja scrapees (pas de nouveau scraping)
 */

import { logger } from 'firebase-functions/v2'

/**
 * @param {Object} lead
 * @returns {{ estimate: number|null, low: number|null, high: number|null, confidence: number, details: string }}
 */
export async function estimateFromWebScraping(lead) {
  const website = lead?.website || lead?.site_web || lead?.url || null
  const scrapedData = lead?.scrapedData || lead?.scannerData || lead?.websiteData || null

  if (!website && !scrapedData) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Pas de site web ni de donnees scrapees' }
  }

  // Utiliser les donnees deja scrapees (mentions legales, a-propos, etc.)
  const textes = []
  if (scrapedData?.mentionsLegales) textes.push(scrapedData.mentionsLegales)
  if (scrapedData?.aPropos) textes.push(scrapedData.aPropos)
  if (scrapedData?.textContent) textes.push(scrapedData.textContent)
  if (lead?.description) textes.push(lead.description)

  const fullText = textes.join(' ').toLowerCase()
  if (!fullText || fullText.length < 50) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Contenu web insuffisant' }
  }

  let estimate = null
  let confidence = 0
  const details = []

  // 1. CA mentionne directement
  const caPatterns = [
    /chiffre[s]?\s*d['']affaire[s]?\s*(?:de\s*)?(\d[\d\s,.]*)\s*(k|m|millions?|milliards?|eur|€)/i,
    /(\d[\d\s,.]*)\s*(k|m|millions?|milliards?)\s*(?:eur|€|euros?)?\s*de\s*(?:ca|chiffre)/i,
    /ca\s*(?:de\s*)?(\d[\d\s,.]*)\s*(k|m|millions?|milliards?|eur|€)/i,
  ]

  for (const pattern of caPatterns) {
    const match = fullText.match(pattern)
    if (match) {
      let val = parseFloat(match[1].replace(/[\s]/g, '').replace(',', '.'))
      const unit = match[2].toLowerCase()
      if (unit === 'k') val *= 1_000
      if (unit.startsWith('m')) val *= 1_000_000
      if (unit.startsWith('milliard')) val *= 1_000_000_000
      if (val > 10_000 && val < 100_000_000_000) {
        estimate = val
        confidence = 75
        details.push(`CA mentionne sur le site : ${val} EUR`)
        break
      }
    }
  }

  // 2. Effectif mentionne
  if (!estimate) {
    const effectifPatterns = [
      /(\d+)\s*(?:salaries?|collaborateurs?|employes?|personnes?)/i,
      /equipe\s*de\s*(\d+)/i,
      /(?:plus de|environ|pres de)\s*(\d+)\s*(?:salaries?|collaborateurs?)/i,
    ]

    for (const pattern of effectifPatterns) {
      const match = fullText.match(pattern)
      if (match) {
        const nb = parseInt(match[1])
        if (nb > 0 && nb < 100_000) {
          // Import ratios
          let ratio = 130_000
          try {
            const { RATIOS_CA_PAR_SALARIE } = await import('./caSourceSireneEffectif.js')
            const nafCode = lead?.naf || lead?.codeNaf || null
            const naf2 = nafCode ? nafCode.slice(0, 2) : null
            if (naf2 && RATIOS_CA_PAR_SALARIE[naf2]) ratio = RATIOS_CA_PAR_SALARIE[naf2]
          } catch { /* use default */ }

          estimate = nb * ratio
          confidence = 45
          details.push(`${nb} employes mentionnes sur le site x ${ratio} EUR/sal`)
          break
        }
      }
    }
  }

  if (!estimate) {
    return { estimate: null, low: null, high: null, confidence: 0, details: 'Aucun indice CA sur le site web' }
  }

  logger.info(`[CA-WebScraping] estimate=${estimate} confidence=${confidence}`)

  return {
    estimate: Math.round(estimate),
    low: Math.round(estimate * 0.6),
    high: Math.round(estimate * 1.6),
    confidence: Math.min(confidence, 100),
    details: details.join(' | '),
  }
}
