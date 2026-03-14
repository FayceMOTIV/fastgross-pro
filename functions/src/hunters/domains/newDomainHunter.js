/**
 * New Domain Hunter — Module 1 (Alex V4)
 * Detects newly registered domains matching org niche keywords.
 *
 * Sources (free, 0€):
 *  - domainsdb.info API (keyword search + creation date filter)
 *  - Lightweight HTTP probe to check if site is live
 *
 * Scoring:
 *  +20 if domain < 7 days old
 *  +25 if niche keyword match
 *  +15 if site not yet built (no HTTP 200 or empty page)
 *  +10 if .fr TLD (France-focused)
 *  +10 if contains business-intent keywords (shop, pro, agency, etc.)
 *
 * Schedule: daily 6AM Paris time
 * Storage: organizations/{orgId}/prospects  (source = 'new_domain_hunter')
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import axios from 'axios'

const getDb = () => getFirestore()

const DOMAINSDB_BASE = 'https://api.domainsdb.info/v1/domains/search'

const RATE_LIMITS = {
  maxKeywords: 5,
  maxDomainsPerKeyword: 50,
  maxHttpProbes: 30,
  httpTimeoutMs: 5000,
  delayBetweenProbes: 300
}

const BUSINESS_KEYWORDS = [
  'agency', 'agence', 'studio', 'consulting', 'conseil',
  'shop', 'store', 'boutique', 'pro', 'expert',
  'digital', 'tech', 'solutions', 'services', 'group',
  'lab', 'hub', 'media', 'design', 'dev'
]

// ─── Scheduled: daily 6AM ───────────────────────────────────────────

export const newDomainHunter = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  logger.info('🆕 New Domain Hunter: starting daily scan')

  const db = getDb()
  const globalStats = { orgsProcessed: 0, scanned: 0, qualified: 0, saved: 0, errors: 0 }

  try {
    const orgsSnap = await db.collection('organizations').get()

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      if (!orgData.hunterConfig?.newDomainsEnabled) continue

      try {
        const stats = await runNewDomainScan(db, orgId)
        globalStats.orgsProcessed++
        globalStats.scanned += stats.scanned
        globalStats.qualified += stats.qualified
        globalStats.saved += stats.saved
        globalStats.errors += stats.errors
      } catch (err) {
        logger.error(`Error processing org ${orgId}:`, err)
        globalStats.errors++
      }
    }
  } catch (err) {
    logger.error('New Domain Hunter fatal error:', err)
  }

  logger.info('🆕 New Domain Hunter: done', globalStats)
})

// ─── Manual trigger ─────────────────────────────────────────────────

export const runNewDomainHunterManual = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, keywords } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  const db = getDb()
  const stats = await runNewDomainScan(db, orgId, keywords)

  return { success: true, stats }
})

// ─── Stats ──────────────────────────────────────────────────────────

export const getNewDomainHunterStats = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  const db = getDb()
  const prospectsSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'new_domain_hunter')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  const prospects = prospectsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const total = prospects.length
  const last7days = prospects.filter(p => {
    const created = p.createdAt?.toDate?.() || new Date(p.createdAt)
    return (Date.now() - created.getTime()) < 7 * 24 * 3600 * 1000
  }).length

  return {
    success: true,
    stats: {
      total,
      last7days,
      avgScore: total > 0 ? Math.round(prospects.reduce((s, p) => s + (p.score || 0), 0) / total) : 0
    }
  }
})

// ─── Core scan logic ────────────────────────────────────────────────

export async function runNewDomainScan(db, orgId, overrideKeywords) {
  const stats = { scanned: 0, qualified: 0, saved: 0, errors: 0 }

  // Load niche keywords from businessProfile or ICP
  const keywords = overrideKeywords || await loadNicheKeywords(db, orgId)
  if (!keywords.length) {
    logger.warn(`Org ${orgId}: no niche keywords configured, skipping`)
    return stats
  }

  logger.info(`🆕 Org ${orgId}: scanning for keywords: ${keywords.join(', ')}`)

  // Collect candidate domains from domainsdb.info
  const candidates = []
  for (const keyword of keywords.slice(0, RATE_LIMITS.maxKeywords)) {
    try {
      const domains = await fetchDomainsDb(keyword)
      candidates.push(...domains.map(d => ({ ...d, matchedKeyword: keyword })))
    } catch (err) {
      logger.warn(`domainsdb.info error for "${keyword}":`, err.message)
      stats.errors++
    }
  }

  // Dedup by domain name
  const uniqueDomains = dedup(candidates, 'domain')
  stats.scanned = uniqueDomains.length
  logger.info(`🆕 Org ${orgId}: ${uniqueDomains.length} unique domains to process`)

  // HTTP probe (parallel, limited)
  const toProbe = uniqueDomains.slice(0, RATE_LIMITS.maxHttpProbes)
  const probed = await probeDomainsParallel(toProbe)

  // Score and filter
  const qualified = probed
    .map(d => ({ ...d, score: scoreDomain(d) }))
    .filter(d => d.score >= 40)
    .sort((a, b) => b.score - a.score)

  stats.qualified = qualified.length

  // Dedup against existing prospects
  const existingSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects')
    .where('source', '==', 'new_domain_hunter')
    .get()

  const existingDomains = new Set(
    existingSnap.docs.map(d => d.data().website?.replace(/^https?:\/\//, '').replace(/\/$/, ''))
  )

  const newProspects = qualified.filter(d => !existingDomains.has(d.domain))

  // Save to Firestore
  const batch = db.batch()
  for (const prospect of newProspects.slice(0, 50)) {
    const ref = db.collection('organizations').doc(orgId).collection('prospects').doc()
    batch.set(ref, {
      companyName: prospect.domain.replace(/\.(com|fr|io|net|org|co)$/i, '').replace(/[-_]/g, ' '),
      website: `https://${prospect.domain}`,
      source: 'new_domain_hunter',
      signal_type: 'new_domain',
      signal_detail: `Domaine enregistre le ${prospect.create_date || 'recemment'}. Keyword: "${prospect.matchedKeyword}".`,
      score: prospect.score,
      status: 'new',
      foundByAlex: true,
      domainAge: prospect.domainAgeDays,
      hasWebsite: prospect.httpStatus === 200,
      httpStatus: prospect.httpStatus,
      tld: prospect.domain.split('.').pop(),
      matchedKeyword: prospect.matchedKeyword,
      platforms: ['web'],
      channels: { email: false, phone: false, linkedin: false },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    stats.saved++
  }

  if (stats.saved > 0) {
    await batch.commit()

    // Notification
    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'new_domain_hunter_complete',
      title: 'Domaines Neufs: Scan termine',
      message: `${stats.scanned} domaines scannes, ${stats.qualified} qualifies, ${stats.saved} nouveaux prospects`,
      data: stats,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  }

  // Log run
  await db.collection('organizations').doc(orgId).collection('hunterLogs').add({
    hunter: 'new_domain_hunter',
    stats,
    keywords,
    runAt: FieldValue.serverTimestamp()
  })

  logger.info(`🆕 Org ${orgId}: done`, stats)
  return stats
}

// ─── domainsdb.info API ─────────────────────────────────────────────

async function fetchDomainsDb(keyword) {
  const zones = ['com', 'fr', 'io', 'net']
  const results = []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  for (const zone of zones) {
    try {
      const response = await axios.get(DOMAINSDB_BASE, {
        params: {
          domain: keyword,
          zone,
          page: 1,
          limit: RATE_LIMITS.maxDomainsPerKeyword
        },
        timeout: 10000
      })

      if (response.data?.domains) {
        for (const d of response.data.domains) {
          const createDate = d.create_date ? new Date(d.create_date) : null
          const ageDays = createDate
            ? Math.floor((Date.now() - createDate.getTime()) / (1000 * 3600 * 24))
            : null

          // Filter: only domains created in the last 30 days (or unknown date)
          if (ageDays !== null && ageDays > 30) continue
          if (d.isDead === 'True') continue

          results.push({
            domain: d.domain,
            create_date: d.create_date || null,
            domainAgeDays: ageDays,
            zone
          })
        }
      }
    } catch (err) {
      // Zone might not have results — skip silently
      if (err.response?.status !== 404) {
        logger.warn(`domainsdb.info error for ${keyword}.${zone}:`, err.message)
      }
    }
  }

  return results
}

// ─── HTTP probe ─────────────────────────────────────────────────────

async function probeDomainsParallel(domains) {
  const results = []
  const batchSize = 5

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize)
    const probed = await Promise.allSettled(
      batch.map(d => probeSingleDomain(d))
    )

    for (const result of probed) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    }

    // Delay between batches
    if (i + batchSize < domains.length) {
      await new Promise(r => setTimeout(r, RATE_LIMITS.delayBetweenProbes))
    }
  }

  return results
}

async function probeSingleDomain(domain) {
  try {
    const response = await axios.get(`https://${domain.domain}`, {
      timeout: RATE_LIMITS.httpTimeoutMs,
      maxRedirects: 3,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FMF-Hunter/1.0)'
      }
    })

    const contentLength = parseInt(response.headers['content-length'] || '0', 10)
    const html = typeof response.data === 'string' ? response.data : ''
    const hasContent = html.length > 500 || contentLength > 1000

    return {
      ...domain,
      httpStatus: response.status,
      hasContent,
      server: response.headers['server'] || null,
      generator: extractGenerator(html)
    }
  } catch {
    // Domain not reachable — high signal (site not built yet)
    return {
      ...domain,
      httpStatus: 0,
      hasContent: false,
      server: null,
      generator: null
    }
  }
}

function extractGenerator(html) {
  if (!html) return null
  const match = html.match(/<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/i)
  return match ? match[1] : null
}

// ─── Scoring ────────────────────────────────────────────────────────

function scoreDomain(domain) {
  let score = 0

  // Fresh domain bonus (+20 if < 7 days)
  if (domain.domainAgeDays !== null && domain.domainAgeDays <= 7) {
    score += 20
  } else if (domain.domainAgeDays !== null && domain.domainAgeDays <= 14) {
    score += 12
  } else if (domain.domainAgeDays !== null && domain.domainAgeDays <= 30) {
    score += 5
  }

  // Niche keyword match (+25)
  if (domain.matchedKeyword) {
    score += 25
  }

  // No site built yet (+15)
  if (!domain.hasContent || domain.httpStatus === 0 || domain.httpStatus >= 400) {
    score += 15
  }

  // France TLD bonus (+10)
  if (domain.domain.endsWith('.fr')) {
    score += 10
  }

  // Business-intent keyword in domain (+10)
  const domainLower = domain.domain.toLowerCase()
  if (BUSINESS_KEYWORDS.some(kw => domainLower.includes(kw))) {
    score += 10
  }

  // Parked / placeholder detection (-10)
  if (domain.generator && /wix|squarespace|wordpress\.com|godaddy|parking/i.test(domain.generator)) {
    // Parked on a builder = less urgent need (already using a tool)
    score -= 5
  }

  return Math.min(Math.max(score, 0), 100)
}

// ─── Helpers ────────────────────────────────────────────────────────

async function loadNicheKeywords(db, orgId) {
  // Try businessProfile first (Alex ecosystem)
  const profileSnap = await db
    .collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile')
    .get()

  if (profileSnap.exists) {
    const profile = profileSnap.data()
    const keywords = []
    if (profile.niche) keywords.push(profile.niche)
    if (profile.keywords) keywords.push(...profile.keywords)
    if (profile.sector) keywords.push(profile.sector)
    if (keywords.length) return [...new Set(keywords.map(k => k.toLowerCase().trim()).filter(Boolean))]
  }

  // Fallback to ICP settings
  const icpSnap = await db
    .collection('organizations').doc(orgId)
    .collection('settings').doc('icp')
    .get()

  if (icpSnap.exists) {
    const icp = icpSnap.data()
    const keywords = icp.targetKeywords || icp.mapsKeywords || []
    if (keywords.length) return keywords.map(k => k.toLowerCase().trim())
  }

  return []
}

function dedup(items, key) {
  const seen = new Set()
  return items.filter(item => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}
