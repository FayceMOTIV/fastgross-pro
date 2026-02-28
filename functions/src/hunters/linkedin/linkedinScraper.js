/**
 * LinkedIn Scraper — Apify Integration
 *
 * Scraping LinkedIn via Apify actors :
 * - Recherche profils
 * - Scrape entreprise
 * - Scrape profil individuel
 *
 * Pattern: ApifyClient.actor(actorId).call(input) → poll run → get dataset items
 */

import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || ''
const APIFY_BASE_URL = 'https://api.apify.com/v2'

// Actor IDs
const ACTORS = {
  linkedinSearch: 'apify/linkedin-scraper',
  linkedinCompany: 'anchor/linkedin-company-scraper',
  linkedinProfile: 'apify/linkedin-profile-scraper',
}

// ============================================
// HELPER: Run Apify Actor
// ============================================
async function runApifyActor(actorId, input, options = {}) {
  const token = options.apiToken || APIFY_API_TOKEN
  if (!token) {
    throw new Error('APIFY_API_TOKEN not configured')
  }

  const client = axios.create({
    baseURL: APIFY_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    params: { token },
    timeout: 120000,
  })

  // 1. Lancer le run
  const actorPath = actorId.replace('/', '~')
  const runResponse = await client.post(`/acts/${actorPath}/runs`, input, {
    params: {
      token,
      waitForFinish: options.waitForFinish || 120,
      memory: options.memory || 1024,
    },
  })

  const run = runResponse.data?.data
  if (!run) {
    throw new Error('Failed to start Apify actor run')
  }

  logger.info(`[linkedinScraper] Actor ${actorId} run started: ${run.id}, status: ${run.status}`)

  // 2. Si pas fini, poller
  let status = run.status
  let attempts = 0
  const maxAttempts = options.maxPollAttempts || 30

  while (status === 'RUNNING' && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 5000))
    const statusResponse = await client.get(`/actor-runs/${run.id}`, { params: { token } })
    status = statusResponse.data?.data?.status || 'FAILED'
    attempts++
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify actor run failed with status: ${status}`)
  }

  // 3. Recuperer le dataset
  const datasetId = run.defaultDatasetId
  const datasetResponse = await client.get(`/datasets/${datasetId}/items`, {
    params: { token, format: 'json' },
  })

  return datasetResponse.data || []
}

// ============================================
// SEARCH LINKEDIN PROFILES
// ============================================

/**
 * Rechercher des profils LinkedIn
 * @param {string} keywords - Mots cles de recherche
 * @param {string} location - Localisation
 * @param {number} limit - Nombre max de resultats
 * @param {Object} options - Options supplementaires
 * @returns {Array} Liste de profils
 */
export async function scrapeLinkedInSearch(keywords, location = '', limit = 50, options = {}) {
  try {
    const input = {
      searchUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}${location ? `&geoId=${location}` : ''}`,
      maxResults: limit,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }

    const items = await runApifyActor(ACTORS.linkedinSearch, input, options)

    // Normaliser les resultats
    const profiles = items.map((item) => ({
      fullName: item.fullName || item.name || '',
      firstName: item.firstName || (item.fullName || '').split(' ')[0] || '',
      lastName: item.lastName || (item.fullName || '').split(' ').slice(1).join(' ') || '',
      headline: item.headline || item.title || '',
      location: item.location || '',
      profileUrl: item.url || item.profileUrl || item.linkedinUrl || '',
      company: item.companyName || item.company || '',
      jobTitle: item.jobTitle || item.position || item.headline || '',
      connectionDegree: item.connectionDegree || item.degree || null,
      profileImage: item.profileImageUrl || item.imageUrl || '',
    }))

    logger.info(`[linkedinScraper] Search "${keywords}" returned ${profiles.length} profiles`)
    return { success: true, profiles, total: profiles.length }
  } catch (error) {
    logger.error('[linkedinScraper] scrapeLinkedInSearch error:', error.message)
    return { success: false, profiles: [], error: error.message }
  }
}

// ============================================
// SCRAPE COMPANY PAGE
// ============================================

/**
 * Scraper une page entreprise LinkedIn
 * @param {string} companyUrl - URL de la page entreprise
 * @param {Object} options
 * @returns {Object} Donnees entreprise
 */
export async function scrapeLinkedInCompany(companyUrl, options = {}) {
  try {
    const input = {
      urls: [companyUrl],
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }

    const items = await runApifyActor(ACTORS.linkedinCompany, input, options)
    const company = items[0] || null

    if (!company) {
      return { success: false, error: 'No data returned' }
    }

    const result = {
      name: company.name || '',
      description: company.description || '',
      website: company.website || '',
      industry: company.industry || '',
      size: company.companySize || company.employeeCount || '',
      headquarters: company.headquarters || company.location || '',
      founded: company.founded || '',
      specialties: company.specialties || [],
      linkedinUrl: companyUrl,
      followers: company.followersCount || 0,
      employees: company.employees || [],
    }

    logger.info(`[linkedinScraper] Company "${result.name}" scraped successfully`)
    return { success: true, company: result }
  } catch (error) {
    logger.error('[linkedinScraper] scrapeLinkedInCompany error:', error.message)
    return { success: false, error: error.message }
  }
}

// ============================================
// SCRAPE INDIVIDUAL PROFILE
// ============================================

/**
 * Scraper un profil LinkedIn individuel
 * @param {string} profileUrl - URL du profil
 * @param {Object} options
 * @returns {Object} Donnees profil
 */
export async function scrapeLinkedInProfile(profileUrl, options = {}) {
  try {
    const input = {
      profileUrls: [profileUrl],
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    }

    const items = await runApifyActor(ACTORS.linkedinProfile, input, options)
    const profile = items[0] || null

    if (!profile) {
      return { success: false, error: 'No data returned' }
    }

    const result = {
      fullName: profile.fullName || profile.name || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      headline: profile.headline || '',
      location: profile.location || '',
      about: profile.about || profile.summary || '',
      profileUrl,
      company: profile.companyName || '',
      jobTitle: profile.jobTitle || profile.position || '',
      email: profile.email || '',
      phone: profile.phone || '',
      website: profile.website || '',
      connections: profile.connectionsCount || 0,
      experience: (profile.experience || []).map((exp) => ({
        title: exp.title || '',
        company: exp.companyName || '',
        duration: exp.duration || '',
        location: exp.location || '',
      })),
      education: (profile.education || []).map((edu) => ({
        school: edu.schoolName || '',
        degree: edu.degree || '',
        field: edu.fieldOfStudy || '',
      })),
      skills: profile.skills || [],
    }

    logger.info(`[linkedinScraper] Profile "${result.fullName}" scraped successfully`)
    return { success: true, profile: result }
  } catch (error) {
    logger.error('[linkedinScraper] scrapeLinkedInProfile error:', error.message)
    return { success: false, error: error.message }
  }
}
