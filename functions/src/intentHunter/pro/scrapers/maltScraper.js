/**
 * Malt Scraper — Intent Hunter Pro
 *
 * Scrapes Malt.fr freelance profiles matching client keywords via Apify.
 * Freelancers on Malt are both potential clients (need tools/services)
 * and sources of referrals to their own clients.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 8 req/min
 *
 * @module intentHunter/pro/scrapers/maltScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~web-scraper'

const RATE_LIMIT_MS = 7500 // ~8 req/min

/** Freelance specialties that indicate tool/service needs */
const SPECIALTY_SIGNALS = {
  'marketing digital': 'Freelance marketing — besoin outils prospection/automation',
  'growth hacking': 'Freelance growth — besoin outils acquisition',
  'developpement web': 'Freelance dev — besoin outils gestion projet',
  'consultant': 'Consultant independant — besoin CRM/facturation',
  'commercial': 'Freelance commercial — besoin outils vente',
  'seo': 'Freelance SEO — besoin outils analyse/reporting',
  'design': 'Freelance design — besoin outils collaboration',
  'data': 'Freelance data — besoin outils analyse',
  'product management': 'Freelance PM — besoin outils gestion produit',
  'communication': 'Freelance com — besoin outils publication'
}

/**
 * Sleep with jitter to avoid thundering herd
 * @param {number} baseMs - Base delay in ms
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Run an Apify actor and wait for results
 * @param {string} actorId - Apify actor ID
 * @param {object} input - Actor input payload
 * @returns {Promise<Array>} Dataset items
 */
const runActor = async (actorId, input) => {
  const response = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { timeout: 120000 }
  )
  const runId = response.data?.data?.id
  if (!runId) throw new Error('No run ID returned')

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    if (statusRes.data?.data?.status === 'SUCCEEDED') {
      const datasetId = statusRes.data?.data?.defaultDatasetId
      const itemsRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
      )
      return itemsRes.data || []
    }
    if (statusRes.data?.data?.status === 'FAILED') throw new Error('Actor run failed')
  }
  throw new Error('Actor run timeout')
}

/**
 * Analyze freelance profile for B2B intent
 * @param {object} profile - Scraped profile data
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, specialtySignal: string|null, signal: string }}
 */
const analyzeFreelanceIntent = (profile, keywords) => {
  const text = [
    profile.title || '',
    profile.description || profile.bio || '',
    profile.skills?.join(' ') || '',
    profile.specialty || ''
  ].join(' ').toLowerCase()

  const matchedKeywords = keywords.filter((kw) => text.includes(kw.toLowerCase()))

  let specialtySignal = null
  for (const [specialty, signalText] of Object.entries(SPECIALTY_SIGNALS)) {
    if (text.includes(specialty)) {
      specialtySignal = signalText
      break
    }
  }

  const parts = []
  if (specialtySignal) parts.push(specialtySignal)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)

  const dailyRate = profile.dailyRate || profile.rate || null
  if (dailyRate) parts.push(`TJM: ${dailyRate}`)

  return {
    matchCount: matchedKeywords.length + (specialtySignal ? 1 : 0),
    specialtySignal,
    signal: parts.join(' — ') || 'Profil Malt pertinent'
  }
}

/**
 * Build Malt search URLs from keywords
 * @param {Array<string>} keywords - Search keywords
 * @returns {Array<string>} Malt search URLs
 */
const buildSearchUrls = (keywords) => {
  return keywords.map((kw) =>
    `https://www.malt.fr/s?q=${encodeURIComponent(kw)}`
  )
}

/**
 * Scrape Malt.fr freelance profiles matching keywords
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {string} [config.location] - Location filter (e.g., "Paris")
 * @returns {Promise<Array>} Standardized leads with isFreelance: true
 */
export const scrape = async (config) => {
  const { clientId, keywords = [], maxResults = 50, location } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'malt_scraper_start',
    clientId,
    keywords,
    maxResults,
    location: location || 'all',
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'malt_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const searchUrls = buildSearchUrls(keywords)

    const pageFunction = `
      async function pageFunction(context) {
        const { $, request } = context;
        const results = [];

        $('[data-testid="search-result-card"], .search-result, .freelancer-card').each(function() {
          const card = $(this);
          const name = card.find('[data-testid="freelancer-name"], .freelancer-name, h2, h3').first().text().trim();
          const title = card.find('[data-testid="freelancer-title"], .freelancer-title, .job-title').first().text().trim();
          const description = card.find('[data-testid="freelancer-description"], .freelancer-description, .bio').first().text().trim();
          const rate = card.find('[data-testid="daily-rate"], .daily-rate, .rate').first().text().trim();
          const profileUrl = card.find('a[href*="/profile/"]').first().attr('href');
          const location = card.find('[data-testid="freelancer-location"], .location').first().text().trim();
          const skills = [];
          card.find('.skill, .tag, [data-testid="skill"]').each(function() {
            skills.push($(this).text().trim());
          });
          const experience = card.find('[data-testid="experience"], .experience').first().text().trim();
          const rating = card.find('[data-testid="rating"], .rating').first().text().trim();
          const missions = card.find('[data-testid="missions-count"], .missions').first().text().trim();

          if (name) {
            results.push({
              name, title, description, dailyRate: rate,
              profileUrl: profileUrl ? 'https://www.malt.fr' + profileUrl : null,
              location, skills, experience, rating, missionsCompleted: missions
            });
          }
        });

        return results;
      }
    `

    const startUrls = searchUrls.map((url) => {
      const fullUrl = location
        ? `${url}&location=${encodeURIComponent(location)}`
        : url
      return { url: fullUrl }
    })

    const items = await runActor(ACTOR_ID, {
      startUrls,
      pageFunction,
      maxPagesPerCrawl: Math.ceil(maxResults / 10),
      proxyConfiguration: { useApifyProxy: true }
    })

    await sleepWithJitter(RATE_LIMIT_MS)

    const flatItems = Array.isArray(items)
      ? items.flat()
      : []

    for (const item of flatItems) {
      if (leads.length >= maxResults) break

      try {
        const intent = analyzeFreelanceIntent(item, keywords)

        if (intent.matchCount === 0) continue

        const nameParts = (item.name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || null
        const lastName = nameParts.slice(1).join(' ') || null

        leads.push({
          source: 'malt',
          sourceUrl: item.profileUrl || 'https://www.malt.fr',
          sourcePublicStatement: [
            item.title || '',
            item.description || ''
          ].filter(Boolean).join(' — ').slice(0, 500),
          platform: 'malt',
          firstName,
          lastName,
          email: null,
          phone: null,
          company: null,
          linkedinUrl: null,
          nativeContactId: item.profileUrl || item.name || null,
          intentSignal: intent.signal,
          intentKeywordsCount: intent.matchCount,
          urgencyDetected: false,
          budgetMentioned: item.dailyRate ? true : false,
          isFreelance: true,
          postedAt: Date.now(),
          rawData: {
            title: item.title || null,
            dailyRate: item.dailyRate || null,
            location: item.location || null,
            skills: item.skills || [],
            experience: item.experience || null,
            rating: item.rating || null,
            missionsCompleted: item.missionsCompleted || null,
            specialtySignal: intent.specialtySignal
          }
        })
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'malt_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'malt_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: flatItems.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'malt_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
