/**
 * GitHub Signals Client — Signals Intelligence Layer
 * Detects tech/startup ICP signals via the GitHub Events & Search API.
 * Identifies French companies actively building sales/CRM/outreach tooling.
 *
 * Usage:
 *   searchGithubCompanies(['crm', 'leads'], 20) -> [{company, domain, repos, activityScore}]
 *   fetchGithubCompanySignals('acme.fr') -> {company, signals, activityScore, salesRepos}
 */

import axios from 'axios'
import { logger } from 'firebase-functions/v2'

const GITHUB_API = 'https://api.github.com'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

// ============================================
// Intent keywords: repos/topics that suggest sales tooling interest
// ============================================
const INTENT_KEYWORDS = [
  'crm',
  'leads',
  'prospection',
  'outreach',
  'sales',
  'pipeline',
  'cold-email',
  'email-marketing',
  'lead-generation',
  'sales-automation',
  'growth-hacking',
  'scraping',
  'b2b',
  'customer-acquisition',
]

// French company indicators in GitHub profiles
const FRENCH_INDICATORS = [
  'france',
  'paris',
  'lyon',
  'marseille',
  'toulouse',
  'bordeaux',
  'nantes',
  'lille',
  'strasbourg',
  'montpellier',
  'nice',
  '.fr',
  'french',
  'francais',
]

/**
 * Build authorization headers for GitHub API
 */
function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'FMF-Signals/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  return headers
}

/**
 * Get ISO date string for 7 days ago
 */
function getLastWeekDate() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}

/**
 * Calculate an activity score for a repo/owner based on recent activity
 * @param {Object} repo - GitHub repo data
 * @param {Object} owner - GitHub owner/org data
 * @returns {number} Activity score 0-100
 */
function calculateGithubActivityScore(repo, owner) {
  let score = 0

  // Recency of last push (max 30 points)
  if (repo.pushed_at) {
    const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSincePush < 7) score += 30
    else if (daysSincePush < 30) score += 20
    else if (daysSincePush < 90) score += 10
  }

  // Stars indicate project maturity (max 20 points)
  const stars = repo.stargazers_count || 0
  if (stars >= 100) score += 20
  else if (stars >= 20) score += 15
  else if (stars >= 5) score += 10
  else if (stars >= 1) score += 5

  // Forks indicate community interest (max 15 points)
  const forks = repo.forks_count || 0
  if (forks >= 50) score += 15
  else if (forks >= 10) score += 10
  else if (forks >= 2) score += 5

  // Open issues suggest active development (max 15 points)
  const issues = repo.open_issues_count || 0
  if (issues >= 10) score += 15
  else if (issues >= 3) score += 10
  else if (issues >= 1) score += 5

  // Owner followers (max 10 points)
  const followers = owner?.followers || 0
  if (followers >= 100) score += 10
  else if (followers >= 20) score += 7
  else if (followers >= 5) score += 3

  // Has description and website (max 10 points)
  if (repo.description) score += 5
  if (repo.homepage || owner?.blog) score += 5

  return Math.min(100, score)
}

/**
 * Check if a GitHub user/org location or bio suggests a French company
 * @param {Object} owner - GitHub user or org object
 * @returns {boolean}
 */
function isFrenchCompany(owner) {
  const location = (owner.location || '').toLowerCase()
  const bio = (owner.bio || owner.description || '').toLowerCase()
  const blog = (owner.blog || '').toLowerCase()
  const combined = `${location} ${bio} ${blog}`

  return FRENCH_INDICATORS.some((indicator) => combined.includes(indicator))
}

/**
 * Search GitHub for companies matching sales/prospection-related keywords
 * Filters for French companies with recent activity
 *
 * @param {string[]} keywords - Keywords to search (defaults to INTENT_KEYWORDS subset)
 * @param {number} maxResults - Maximum results to return (default: 20)
 * @returns {Promise<Array>} Companies with sales-related repos
 */
export async function searchGithubCompanies(keywords = [], maxResults = 20) {
  const searchTerms = keywords.length > 0 ? keywords : INTENT_KEYWORDS.slice(0, 5)
  const lastWeek = getLastWeekDate()
  const results = []
  const seenOwners = new Set()

  for (const keyword of searchTerms) {
    if (results.length >= maxResults) break

    try {
      // Search repos with intent keywords, pushed recently
      const query = `${keyword} language:javascript language:python language:typescript pushed:>${lastWeek}`

      const response = await axios.get(`${GITHUB_API}/search/repositories`, {
        params: {
          q: query,
          sort: 'updated',
          order: 'desc',
          per_page: Math.min(30, maxResults),
        },
        headers: getHeaders(),
        timeout: 10000,
      })

      const repos = response.data?.items || []

      for (const repo of repos) {
        if (results.length >= maxResults) break

        const owner = repo.owner || {}
        const ownerLogin = owner.login

        // Skip already-seen owners
        if (!ownerLogin || seenOwners.has(ownerLogin)) continue
        seenOwners.add(ownerLogin)

        // Only organizations or users with company info
        if (owner.type !== 'Organization' && !repo.homepage) continue

        // Fetch full owner profile to check location
        try {
          const ownerResponse = await axios.get(`${GITHUB_API}/users/${ownerLogin}`, {
            headers: getHeaders(),
            timeout: 8000,
          })
          const fullOwner = ownerResponse.data

          if (!isFrenchCompany(fullOwner)) continue

          const activityScore = calculateGithubActivityScore(repo, fullOwner)

          // Extract domain from blog/website
          const websiteRaw = fullOwner.blog || repo.homepage || ''
          const domain = websiteRaw
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .toLowerCase()

          results.push({
            company: fullOwner.name || fullOwner.login,
            login: ownerLogin,
            domain: domain || null,
            website: websiteRaw || null,
            location: fullOwner.location || null,
            bio: fullOwner.bio || fullOwner.description || null,
            type: owner.type,
            followers: fullOwner.followers || 0,
            publicRepos: fullOwner.public_repos || 0,
            activityScore,
            matchedKeyword: keyword,
            topRepo: {
              name: repo.full_name,
              description: repo.description,
              stars: repo.stargazers_count,
              lastPush: repo.pushed_at,
              url: repo.html_url,
            },
            detectedAt: new Date().toISOString(),
          })
        } catch (ownerErr) {
          // Rate limited or user deleted, skip
          if (ownerErr.response?.status === 403) {
            logger.warn('GitHub rate limit hit, pausing...')
            await new Promise((r) => setTimeout(r, 5000))
          }
        }

        // Respect GitHub rate limits
        await new Promise((r) => setTimeout(r, 300))
      }
    } catch (err) {
      if (err.response?.status === 403) {
        logger.warn('GitHub API rate limit reached during search')
        break
      }
      logger.warn(`GitHub search failed for keyword "${keyword}":`, err.message)
    }

    // Pause between keyword searches
    await new Promise((r) => setTimeout(r, 1000))
  }

  logger.info(`GitHub companies search complete: ${results.length} French companies found`)

  return results.sort((a, b) => b.activityScore - a.activityScore)
}

/**
 * Fetch GitHub signals for a specific company domain
 * Looks up the org on GitHub and checks for sales-related repos
 *
 * @param {string} companyDomain - Company domain (e.g. 'acme.fr')
 * @returns {Promise<Object|null>} Company signals data or null if not found
 */
export async function fetchGithubCompanySignals(companyDomain) {
  if (!companyDomain) return null

  const cleanDomain = companyDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .toLowerCase()

  // Extract org name from domain (e.g. 'acme.fr' -> 'acme')
  const orgGuess = cleanDomain.split('.')[0]

  try {
    // Try to find the org on GitHub
    const searchResponse = await axios.get(`${GITHUB_API}/search/users`, {
      params: {
        q: `${orgGuess} type:org`,
        per_page: 5,
      },
      headers: getHeaders(),
      timeout: 10000,
    })

    const candidates = searchResponse.data?.items || []

    // Find best match by checking website/blog field
    let matchedOrg = null
    for (const candidate of candidates) {
      const profileResponse = await axios.get(`${GITHUB_API}/users/${candidate.login}`, {
        headers: getHeaders(),
        timeout: 8000,
      })
      const profile = profileResponse.data
      const profileBlog = (profile.blog || '').toLowerCase()

      if (profileBlog.includes(cleanDomain) || candidate.login.toLowerCase() === orgGuess) {
        matchedOrg = profile
        break
      }

      await new Promise((r) => setTimeout(r, 300))
    }

    if (!matchedOrg) {
      logger.info(`No GitHub org found for domain: ${cleanDomain}`)
      return null
    }

    // Fetch repos to check for sales-related activity
    const reposResponse = await axios.get(`${GITHUB_API}/users/${matchedOrg.login}/repos`, {
      params: {
        sort: 'pushed',
        direction: 'desc',
        per_page: 30,
      },
      headers: getHeaders(),
      timeout: 10000,
    })

    const repos = reposResponse.data || []

    // Identify sales-related repos
    const salesRepos = repos.filter((repo) => {
      const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase()
      return INTENT_KEYWORDS.some((kw) => text.includes(kw))
    })

    // Calculate overall activity score from best repo
    const bestRepo = repos[0]
    const activityScore = bestRepo
      ? calculateGithubActivityScore(bestRepo, matchedOrg)
      : 0

    const signals = []

    // Signal: actively building sales tools
    if (salesRepos.length > 0) {
      signals.push({
        type: 'building_sales_tools',
        strength: salesRepos.length >= 3 ? 'strong' : 'medium',
        detail: `${salesRepos.length} repo(s) lies au sales/CRM/prospection`,
        repos: salesRepos.map((r) => r.full_name).slice(0, 5),
      })
    }

    // Signal: high development velocity
    const recentRepos = repos.filter((r) => {
      const daysSincePush = (Date.now() - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysSincePush < 7
    })
    if (recentRepos.length >= 3) {
      signals.push({
        type: 'high_dev_velocity',
        strength: 'strong',
        detail: `${recentRepos.length} repos mis a jour cette semaine`,
      })
    }

    // Signal: growing team (many contributors)
    if (matchedOrg.public_repos >= 10) {
      signals.push({
        type: 'growing_tech_team',
        strength: matchedOrg.public_repos >= 30 ? 'strong' : 'medium',
        detail: `${matchedOrg.public_repos} repos publics`,
      })
    }

    return {
      company: matchedOrg.name || matchedOrg.login,
      login: matchedOrg.login,
      domain: cleanDomain,
      website: matchedOrg.blog || null,
      location: matchedOrg.location || null,
      followers: matchedOrg.followers || 0,
      publicRepos: matchedOrg.public_repos || 0,
      activityScore,
      signals,
      salesRepos: salesRepos.map((r) => ({
        name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        lastPush: r.pushed_at,
        url: r.html_url,
      })),
      detectedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err.response?.status === 403) {
      logger.warn('GitHub API rate limit reached')
    } else {
      logger.error(`GitHub signals lookup failed for ${cleanDomain}:`, err.message)
    }
    return null
  }
}
