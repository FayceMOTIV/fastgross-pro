/**
 * Competitor Reviews Scraper — Signals Intelligence Layer
 * Scrapes negative reviews (1-2 stars) from Trustpilot for competitors by niche.
 * Extracts pain points to fuel outreach messaging.
 *
 * Usage:
 *   scrapeNegativeReviews('hubspot', 3) -> [{title, text, rating, painPoints, date, author}]
 *   runCompetitorReviewsScan('prospection') -> [{competitor, reviews}]
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from 'firebase-functions/v2'

// ============================================
// Competitor map by ICP / niche
// ============================================
const COMPETITOR_MAP = {
  restaurant: [
    'zenchef.com',
    'thefork.com',
    'trivec.com',
    'lightspeed.com',
    'sumup.com',
  ],
  prospection: [
    'hubspot.com',
    'salesforce.com',
    'pipedrive.com',
    'lemlist.com',
    'waalaxy.com',
    'apollo.io',
  ],
  compta: [
    'pennylane.com',
    'indy.fr',
    'quickbooks.intuit.com',
    'sage.com',
    'cegid.com',
  ],
  rh: [
    'lucca.fr',
    'payfit.com',
    'factorial.fr',
    'swile.co',
    'eurecia.com',
  ],
  ecommerce: [
    'shopify.com',
    'prestashop.com',
    'woocommerce.com',
    'wix.com',
    'squarespace.com',
  ],
  reservation: [
    'doctolib.fr',
    'calendly.com',
    'treatwell.fr',
    'planity.com',
    'timify.com',
  ],
}

// ============================================
// Pain point extraction patterns
// ============================================
const PAIN_PATTERNS = [
  { category: 'prix', regex: /\b(cher|co[uû]t|prix|tarif|facturation|augment|surco[uû]t|abonnement|payant)\b/i },
  { category: 'support', regex: /\b(support|service client|r[eé]ponse|joignable|assistance|injoignable|attente|ticket)\b/i },
  { category: 'bug', regex: /\b(bug|crash|plante|erreur|dysfonctionnement|lent|lag|freeze|instable)\b/i },
  { category: 'difficile', regex: /\b(compliqu[eé]|difficile|complexe|pas intuitif|incompr[eé]hensible|galère|prise en main)\b/i },
  { category: 'fonctionnalite', regex: /\b(fonctionnalit[eé]|manque|limit[eé]|incomplet|basique|insuffisant|pas possible)\b/i },
  { category: 'contrat', regex: /\b(contrat|engagement|r[eé]siliation|annul|pi[eé]g[eé]|clause|renouvellement)\b/i },
]

/**
 * Extract pain point categories from review text
 * @param {string} text - Review text
 * @returns {string[]} Matched pain point categories
 */
export function extractPainPoint(text) {
  if (!text || typeof text !== 'string') return []

  const matched = []
  for (const { category, regex } of PAIN_PATTERNS) {
    if (regex.test(text)) {
      matched.push(category)
    }
  }
  return matched
}

/**
 * Scrape negative reviews (1-2 stars) from Trustpilot for a given product slug
 * @param {string} productSlug - Trustpilot business slug (e.g. 'hubspot.com')
 * @param {number} maxPages - Maximum number of pages to scrape (default: 2)
 * @returns {Promise<Array>} Negative reviews with pain points extracted
 */
export async function scrapeNegativeReviews(productSlug, maxPages = 2) {
  const reviews = []

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `https://www.trustpilot.com/review/${productSlug}?page=${page}&stars=1&stars=2`

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
        },
        timeout: 15000,
      })

      const $ = cheerio.load(response.data)

      // --- Strategy 1: Extract from __NEXT_DATA__ JSON (most reliable) ---
      const nextDataScript = $('#__NEXT_DATA__').html()
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript)
          const pageReviews = nextData?.props?.pageProps?.reviews || []

          for (const review of pageReviews) {
            const rating = review.rating || 0
            if (rating > 2) continue

            const text = review.text || review.title || ''
            const painPoints = extractPainPoint(text)

            reviews.push({
              title: review.title || '',
              text: text.slice(0, 500),
              rating,
              painPoints,
              date: review.dates?.publishedDate || review.createdAt || null,
              author: review.consumer?.displayName || 'Anonyme',
              source: `trustpilot/${productSlug}`,
              language: review.language || 'fr',
            })
          }
        } catch (parseErr) {
          logger.warn(`Failed to parse __NEXT_DATA__ for ${productSlug} page ${page}:`, parseErr.message)
        }
      }

      // --- Strategy 2: Fallback to HTML parsing if __NEXT_DATA__ yielded nothing ---
      if (reviews.length === 0) {
        $('article[data-service-review-card-paper]').each((_, el) => {
          const $el = $(el)
          const ratingImg = $el.find('img[alt*="star"]').attr('alt') || ''
          const ratingMatch = ratingImg.match(/(\d)/)
          const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0

          if (rating > 2) return

          const title = $el.find('h2[data-service-review-title-typography]').text().trim()
          const text = $el.find('p[data-service-review-text-typography]').text().trim()
          const fullText = `${title} ${text}`
          const painPoints = extractPainPoint(fullText)

          const dateEl = $el.find('time').attr('datetime') || null
          const author = $el.find('span[data-consumer-name-typography]').text().trim() || 'Anonyme'

          reviews.push({
            title,
            text: fullText.slice(0, 500),
            rating,
            painPoints,
            date: dateEl,
            author,
            source: `trustpilot/${productSlug}`,
            language: 'fr',
          })
        })
      }

      // Rate limit between pages
      if (page < maxPages) {
        await new Promise((r) => setTimeout(r, 1500))
      }
    } catch (err) {
      if (err.response?.status === 404) {
        logger.warn(`Trustpilot page not found: ${productSlug}`)
        break
      }
      logger.warn(`Error scraping Trustpilot ${productSlug} page ${page}:`, err.message)
    }
  }

  return reviews
}

/**
 * Run a competitor reviews scan for a given ICP type (niche)
 * Iterates through all mapped competitors and collects negative reviews
 *
 * @param {string} icpType - Niche key (restaurant, prospection, compta, rh, ecommerce, reservation)
 * @returns {Promise<Array>} Array of { competitor, slug, reviewCount, reviews, topPainPoints }
 */
export async function runCompetitorReviewsScan(icpType) {
  const normalizedType = (icpType || '').toLowerCase().trim()
  const competitors = COMPETITOR_MAP[normalizedType]

  if (!competitors || competitors.length === 0) {
    logger.warn(`No competitors mapped for ICP type: "${icpType}". Available: ${Object.keys(COMPETITOR_MAP).join(', ')}`)
    return []
  }

  logger.info(`Starting competitor reviews scan for ICP "${normalizedType}" — ${competitors.length} competitors`)

  const results = []

  for (const slug of competitors) {
    try {
      const reviews = await scrapeNegativeReviews(slug, 2)

      // Aggregate pain points across all reviews for this competitor
      const painPointCounts = {}
      for (const review of reviews) {
        for (const pp of review.painPoints) {
          painPointCounts[pp] = (painPointCounts[pp] || 0) + 1
        }
      }

      // Sort pain points by frequency
      const topPainPoints = Object.entries(painPointCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count }))

      results.push({
        competitor: slug,
        slug,
        reviewCount: reviews.length,
        reviews,
        topPainPoints,
        scannedAt: new Date().toISOString(),
      })

      logger.info(`  ${slug}: ${reviews.length} negative reviews, top pain: ${topPainPoints[0]?.category || 'none'}`)

      // Rate limit between competitors
      await new Promise((r) => setTimeout(r, 2000))
    } catch (err) {
      logger.error(`Failed to scan competitor ${slug}:`, err.message)
      results.push({
        competitor: slug,
        slug,
        reviewCount: 0,
        reviews: [],
        topPainPoints: [],
        error: err.message,
        scannedAt: new Date().toISOString(),
      })
    }
  }

  logger.info(`Competitor scan complete for "${normalizedType}": ${results.reduce((s, r) => s + r.reviewCount, 0)} total reviews across ${results.length} competitors`)

  return results
}
