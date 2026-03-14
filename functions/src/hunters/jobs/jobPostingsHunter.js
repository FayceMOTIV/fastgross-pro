/**
 * Job Postings Hunter — Module 2 (Alex V4)
 * Scrape les offres d'emploi pour detecter les besoins des entreprises.
 *
 * Logique :
 *  - Recrute "Growth Marketer" → besoin marketing
 *  - Recrute "DevOps" → scale infra
 *  - Recrute "Head of Sales" → besoin outils sales
 *
 * Sources : Serper.dev (site:linkedin.com/jobs, site:indeed.fr, site:welcometothejungle.com)
 * Budget : 0 EUR — utilise le free tier Serper (2500 req/mois)
 *
 * Exports :
 *  - jobPostingsHunter (onSchedule every day 9h)
 *  - runJobPostingsHunterManual (onCall)
 *  - getJobPostingsHunterStats (onCall)
 *  - runJobPostingsScan (internal)
 */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const SERPER_URL = 'https://google.serper.dev/search'

// ─── Job platforms ───────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'linkedin_jobs', siteFilter: 'site:linkedin.com/jobs', name: 'LinkedIn Jobs' },
  { id: 'indeed', siteFilter: 'site:indeed.fr OR site:indeed.com', name: 'Indeed' },
  { id: 'wttj', siteFilter: 'site:welcometothejungle.com', name: 'Welcome to the Jungle' },
  { id: 'glassdoor', siteFilter: 'site:glassdoor.fr OR site:glassdoor.com', name: 'Glassdoor' },
]

// ─── Hiring signal detection ─────────────────────────────────────────

const HIRING_SIGNALS = {
  commercial: {
    keywords: ['commercial', 'sales', 'business developer', 'business development', 'account executive', 'sdr', 'bdr'],
    need: 'CRM / Prospection / Outils de vente',
    score: 25,
  },
  marketing: {
    keywords: ['marketing', 'growth', 'growth hacker', 'content manager', 'brand manager', 'acquisition'],
    need: 'Marketing digital / Acquisition / Publicite',
    score: 25,
  },
  tech: {
    keywords: ['developpeur', 'developer', 'devops', 'cto', 'lead tech', 'fullstack', 'frontend', 'backend', 'data engineer'],
    need: 'Infrastructure tech / Outils dev',
    score: 20,
  },
  customer_success: {
    keywords: ['customer success', 'account manager', 'support', 'chargé de clientele', 'relation client'],
    need: 'Satisfaction client / Retention',
    score: 15,
  },
  rh: {
    keywords: ['rh', 'recruteur', 'talent acquisition', 'people', 'office manager'],
    need: 'Outils RH / Recrutement',
    score: 15,
  },
  direction: {
    keywords: ['directeur', 'head of', 'vp ', 'chief', 'responsable', 'manager'],
    need: 'Transformation / Croissance structurelle',
    score: 20,
  },
}

// ─── Scheduled hunter ────────────────────────────────────────────────

export const jobPostingsHunter = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540,
}, async () => {
  const db = getDb()
  const orgsSnap = await db.collection('organizations')
    .where('hunterConfig.jobPostingsEnabled', '==', true)
    .get()

  if (orgsSnap.empty) {
    logger.info('Job Postings Hunter: aucune org activee')
    return
  }

  for (const orgDoc of orgsSnap.docs) {
    try {
      const org = orgDoc.data()
      const keywords = org.hunterConfig?.nicheKeywords || org.nicheKeywords || []
      if (keywords.length === 0) continue

      const stats = await runJobPostingsScan(db, orgDoc.id, keywords, org.hunterConfig?.jobLocation)
      logger.info(`Job Postings Hunter: org=${orgDoc.id}`, stats)
    } catch (error) {
      logger.error(`Job Postings Hunter error for org=${orgDoc.id}:`, error.message)
    }
  }
})

// ─── Manual trigger ──────────────────────────────────────────────────

export const runJobPostingsHunterManual = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, keywords, location } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  if (!keywords?.length) throw new HttpsError('invalid-argument', 'keywords requis (array)')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const stats = await runJobPostingsScan(db, orgId, keywords, location)
  return { success: true, ...stats }
})

// ─── Stats ───────────────────────────────────────────────────────────

export const getJobPostingsHunterStats = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const snap = await db.collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'job_postings_hunter')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  const prospects = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const bySignal = {}
  const byPlatform = {}
  for (const p of prospects) {
    const sig = p.hiringSignalType || 'unknown'
    bySignal[sig] = (bySignal[sig] || 0) + 1
    const plat = p.jobPlatform || 'unknown'
    byPlatform[plat] = (byPlatform[plat] || 0) + 1
  }

  return { total: prospects.length, bySignal, byPlatform, latest: prospects.slice(0, 10) }
})

// ─── Core scan function ──────────────────────────────────────────────

export async function runJobPostingsScan(db, orgId, keywords, location) {
  const SERPER_API_KEY = process.env.SERPER_API_KEY
  if (!SERPER_API_KEY) {
    logger.warn('SERPER_API_KEY not set — skipping job postings scan')
    return { scanned: 0, saved: 0, duplicates: 0 }
  }

  const loc = location || 'France'
  const stats = { scanned: 0, saved: 0, duplicates: 0, errors: 0, bySignal: {} }

  // Build search queries
  const queries = []
  for (const keyword of keywords.slice(0, 5)) {
    for (const platform of PLATFORMS) {
      queries.push({
        query: `"recrute" OR "hiring" "${keyword}" ${loc} ${platform.siteFilter}`,
        keyword,
        platform: platform.id,
        platformName: platform.name,
      })
    }
  }

  // Execute queries with rate limiting
  const allResults = []
  for (const q of queries) {
    try {
      const results = await searchSerper(SERPER_API_KEY, q.query, 10)
      for (const result of results) {
        allResults.push({
          ...result,
          keyword: q.keyword,
          platform: q.platform,
          platformName: q.platformName,
        })
      }
      stats.scanned += results.length

      // Rate limit: 12s between Serper calls
      await sleep(12000 + Math.random() * 3000)
    } catch (error) {
      logger.warn(`Job search error: ${q.query}`, error.message)
      stats.errors++
    }
  }

  // Deduplicate by title + company similarity
  const seen = new Set()
  const uniqueResults = []
  for (const r of allResults) {
    const key = normalizeForDedup(r.title) + '|' + normalizeForDedup(extractCompanyFromResult(r))
    if (seen.has(key)) {
      stats.duplicates++
      continue
    }
    seen.add(key)
    uniqueResults.push(r)
  }

  // Analyze and save
  const batch = db.batch()
  let batchCount = 0

  for (const result of uniqueResults) {
    const analysis = analyzeJobPosting(result, keywords)
    if (!analysis.hiringSignal) continue // Skip non-matching results

    const company = extractCompanyFromResult(result)
    if (!company || company.length < 2) continue

    // Check for existing prospect
    const existingSnap = await db.collection('organizations').doc(orgId)
      .collection('prospects')
      .where('company', '==', company)
      .where('source', '==', 'job_postings_hunter')
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      stats.duplicates++
      continue
    }

    const prospectRef = db.collection('organizations').doc(orgId)
      .collection('prospects').doc()

    batch.set(prospectRef, {
      name: company,
      company,
      source: 'job_postings_hunter',
      signal_type: 'job_posting',
      status: 'new',
      score: analysis.score,
      jobTitle: analysis.jobTitle,
      jobUrl: result.link || null,
      jobPlatform: result.platform,
      jobPlatformName: result.platformName,
      hiringSignalType: analysis.hiringSignal.type,
      hiringSignalNeed: analysis.hiringSignal.need,
      hiringSignalDetail: analysis.detail,
      matchedKeyword: result.keyword,
      location: extractLocation(result),
      website: extractCompanyWebsite(result),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batchCount++
    stats.saved++
    stats.bySignal[analysis.hiringSignal.type] = (stats.bySignal[analysis.hiringSignal.type] || 0) + 1

    // Commit every 50 docs
    if (batchCount >= 50) {
      await batch.commit()
      batchCount = 0
    }
  }

  if (batchCount > 0) await batch.commit()

  // Log run
  await db.collection('organizations').doc(orgId).collection('hunterRuns').add({
    hunter: 'job_postings',
    stats,
    runAt: FieldValue.serverTimestamp(),
  })

  return stats
}

// ─── Analysis helpers ────────────────────────────────────────────────

function analyzeJobPosting(result, nicheKeywords) {
  const text = `${result.title || ''} ${result.snippet || ''}`.toLowerCase()
  let bestSignal = null
  let bestScore = 0

  for (const [type, signal] of Object.entries(HIRING_SIGNALS)) {
    for (const keyword of signal.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        if (signal.score > bestScore) {
          bestScore = signal.score
          bestSignal = { type, ...signal }
        }
        break
      }
    }
  }

  if (!bestSignal) return { hiringSignal: null, score: 0 }

  let score = bestSignal.score

  // Bonus: niche keyword match
  const nicheMatch = nicheKeywords.some(k => text.includes(k.toLowerCase()))
  if (nicheMatch) score += 10

  // Bonus: senior/head level
  if (/head of|directeur|vp |chief|lead|senior|responsable/i.test(text)) score += 10

  // Bonus: urgency signals
  if (/urgent|asap|immediately|des que possible|rapidement/i.test(text)) score += 5

  // Bonus: growth signals
  if (/croissance|growth|scale|expansion|nouveau|creation de poste/i.test(text)) score += 5

  score = Math.min(score, 100)

  const jobTitle = extractJobTitle(result.title || '')

  return {
    hiringSignal: bestSignal,
    score,
    jobTitle,
    detail: `${result.platformName}: ${jobTitle} — ${bestSignal.need}`,
  }
}

function extractCompanyFromResult(result) {
  // Try to extract company from title (often: "Job Title - Company | Platform")
  const title = result.title || ''
  const parts = title.split(/\s*[-–|]\s*/)
  if (parts.length >= 2) {
    // Last meaningful part is often the platform, second-to-last is the company
    const candidate = parts.length >= 3 ? parts[1].trim() : parts[parts.length - 1].trim()
    // Remove platform names
    const cleaned = candidate.replace(/\b(Indeed|LinkedIn|Glassdoor|Welcome|WTTJ)\b/gi, '').trim()
    if (cleaned.length > 2) return cleaned
  }

  // Fallback: check snippet for company patterns
  const snippet = result.snippet || ''
  const companyMatch = snippet.match(/(?:chez|at|pour|par)\s+([A-Z][A-Za-z0-9\s&]+)/i)
  if (companyMatch) return companyMatch[1].trim()

  return parts[0]?.trim() || null
}

function extractJobTitle(title) {
  const parts = title.split(/\s*[-–|]\s*/)
  return parts[0]?.trim() || title
}

function extractLocation(result) {
  const text = `${result.title || ''} ${result.snippet || ''}`
  // French cities/regions
  const locMatch = text.match(/(?:a|en|sur)\s+(Paris|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|Strasbourg|Nice|Rennes|Montpellier|France|Ile-de-France|Remote|Teletravail)/i)
  return locMatch ? locMatch[1] : null
}

function extractCompanyWebsite(result) {
  const link = result.link || ''
  // If it's a job board link, we can't extract the company website directly
  if (/linkedin\.com|indeed\.|glassdoor\.|welcometothejungle/i.test(link)) return null
  return null
}

function normalizeForDedup(str) {
  if (!str) return ''
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30)
}

// ─── Serper search ───────────────────────────────────────────────────

async function searchSerper(apiKey, query, num = 10) {
  try {
    const response = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        gl: 'fr',
        hl: 'fr',
        num,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await response.json()
    return data.organic || []
  } catch (error) {
    logger.warn(`Serper search error: ${error.message}`)
    return []
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
