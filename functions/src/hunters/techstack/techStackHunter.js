/**
 * Tech Stack Hunter — Module 4 (Alex V4)
 * Enriches existing prospects by scanning their website tech stack.
 * Identifies missing tools per niche to generate outreach opportunities.
 *
 * Uses the existing detectTechStack() from scanner/sources/techStackDetector.js
 * Cost: 0€ (pure HTTP fetch + HTML parsing)
 *
 * Signals detected:
 *  - Missing CRM / chat widget / analytics / ecommerce / payment
 *  - Uses a direct competitor's tool
 *  - Recent tech change (via generator version mismatch)
 *  - WordPress without SEO plugin
 *  - Shopify without advanced analytics
 *
 * Scoring:
 *  +25 uses competitor tool
 *  +15 missing critical tool for niche
 *  +10 missing optional tool
 *  +10 WordPress without SEO
 *  +10 no analytics at all
 *  +5  outdated CMS version
 *
 * Schedule: daily 8AM (after new domain hunter at 6AM, before Maps at 7AM)
 * Storage: updates organizations/{orgId}/prospects with techStack + techSignals fields
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

const RATE_LIMITS = {
  maxProspectsPerRun: 30,
  delayBetweenScans: 1000,
  batchSize: 5
}

// Niche-specific expected tech stacks
const NICHE_EXPECTED_TECH = {
  default: {
    critical: ['analytics'],
    recommended: ['chat', 'marketing'],
    optional: ['payment', 'cdn']
  },
  ecommerce: {
    critical: ['analytics', 'ecommerce', 'payment'],
    recommended: ['chat', 'marketing', 'cdn'],
    optional: []
  },
  restaurant: {
    critical: [],
    recommended: ['analytics'],
    optional: ['chat', 'marketing']
  },
  saas: {
    critical: ['analytics', 'chat'],
    recommended: ['marketing', 'cdn', 'payment'],
    optional: []
  },
  agency: {
    critical: ['analytics'],
    recommended: ['chat', 'marketing'],
    optional: ['cdn']
  },
  artisan: {
    critical: [],
    recommended: ['analytics'],
    optional: ['chat']
  },
  medical: {
    critical: [],
    recommended: ['analytics'],
    optional: ['chat']
  },
  immobilier: {
    critical: ['analytics'],
    recommended: ['chat', 'marketing'],
    optional: ['cdn']
  }
}

// ─── Scheduled: daily 8AM ───────────────────────────────────────────

export const techStackHunter = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 540
}, async () => {
  logger.info('🔧 Tech Stack Hunter: starting daily enrichment')

  const db = getDb()
  const globalStats = { orgsProcessed: 0, scanned: 0, enriched: 0, signalsFound: 0, errors: 0 }

  try {
    const orgsSnap = await db.collection('organizations').get()

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      if (!orgData.hunterConfig?.techStackEnabled) continue

      try {
        const stats = await runTechStackScan(db, orgId)
        globalStats.orgsProcessed++
        globalStats.scanned += stats.scanned
        globalStats.enriched += stats.enriched
        globalStats.signalsFound += stats.signalsFound
        globalStats.errors += stats.errors
      } catch (err) {
        logger.error(`Error processing org ${orgId}:`, err)
        globalStats.errors++
      }
    }
  } catch (err) {
    logger.error('Tech Stack Hunter fatal error:', err)
  }

  logger.info('🔧 Tech Stack Hunter: done', globalStats)
})

// ─── Manual trigger ─────────────────────────────────────────────────

export const runTechStackHunterManual = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectIds } = request.data || {}
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId requis')
  }

  const db = getDb()
  const stats = await runTechStackScan(db, orgId, prospectIds)

  return { success: true, stats }
})

// ─── Stats ──────────────────────────────────────────────────────────

export const getTechStackHunterStats = onCall({
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
    .where('techStack', '!=', null)
    .limit(200)
    .get()

  const prospects = prospectsSnap.docs.map(d => d.data())
  const withSignals = prospects.filter(p => p.techSignals?.length > 0)

  // Aggregate missing tools
  const missingTools = {}
  for (const p of prospects) {
    for (const signal of (p.techSignals || [])) {
      if (signal.type === 'missing_tool') {
        missingTools[signal.tool] = (missingTools[signal.tool] || 0) + 1
      }
    }
  }

  return {
    success: true,
    stats: {
      totalScanned: prospects.length,
      withSignals: withSignals.length,
      missingTools,
      topCMS: aggregateField(prospects, 'techStack.cms'),
      topFramework: aggregateField(prospects, 'techStack.framework')
    }
  }
})

// ─── Core scan logic ────────────────────────────────────────────────

export async function runTechStackScan(db, orgId, targetProspectIds) {
  const stats = { scanned: 0, enriched: 0, signalsFound: 0, errors: 0 }

  // Load org context
  const profileSnap = await db
    .collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile')
    .get()

  const profile = profileSnap.exists ? profileSnap.data() : {}
  const nicheType = detectNicheType(profile)
  const competitors = profile.competitors || []

  // Get prospects to scan (with website, without tech stack data)
  let prospectsQuery

  if (targetProspectIds?.length) {
    // Scan specific prospects
    const prospects = []
    for (const id of targetProspectIds.slice(0, RATE_LIMITS.maxProspectsPerRun)) {
      const snap = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(id)
        .get()
      if (snap.exists) prospects.push({ id: snap.id, ...snap.data() })
    }
    prospectsQuery = prospects
  } else {
    // Scan prospects with websites that haven't been tech-scanned yet
    const snap = await db
      .collection('organizations').doc(orgId)
      .collection('prospects')
      .where('techStackScannedAt', '==', null)
      .limit(RATE_LIMITS.maxProspectsPerRun * 2)
      .get()

    // Filter to those with a website URL
    prospectsQuery = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.website || p.websiteUrl)
      .slice(0, RATE_LIMITS.maxProspectsPerRun)
  }

  if (!prospectsQuery.length) {
    logger.info(`Org ${orgId}: no prospects to scan for tech stack`)
    return stats
  }

  logger.info(`🔧 Org ${orgId}: scanning ${prospectsQuery.length} prospects (niche: ${nicheType})`)

  // Lazy import of tech stack detector
  const { detectTechStack } = await import('../../scanner/sources/techStackDetector.js')

  // Process in batches
  for (let i = 0; i < prospectsQuery.length; i += RATE_LIMITS.batchSize) {
    const batch = prospectsQuery.slice(i, i + RATE_LIMITS.batchSize)

    const results = await Promise.allSettled(
      batch.map(async (prospect) => {
        const domain = extractDomain(prospect.website || prospect.websiteUrl)
        if (!domain) return null

        try {
          const techStack = await detectTechStack(domain)
          if (!techStack) return { prospect, techStack: null, signals: [] }

          const signals = analyzeTechGaps(techStack, nicheType, competitors)
          const techScore = calculateTechScore(signals)

          return { prospect, techStack, signals, techScore }
        } catch (err) {
          logger.warn(`Error scanning ${domain}:`, err.message)
          return null
        }
      })
    )

    // Save results
    const writeBatch = db.batch()
    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) {
        stats.errors++
        continue
      }

      const { prospect, techStack, signals, techScore } = result.value
      stats.scanned++

      const ref = db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospect.id)

      const updateData = {
        techStackScannedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }

      if (techStack) {
        updateData.techStack = {
          cms: techStack.cms,
          ecommerce: techStack.ecommerce,
          analytics: techStack.analytics?.slice(0, 5) || [],
          marketing: techStack.marketing?.slice(0, 5) || [],
          chat: techStack.chat,
          payment: techStack.payment,
          framework: techStack.framework,
          hosting: techStack.hosting
        }
        stats.enriched++
      }

      if (signals.length > 0) {
        updateData.techSignals = signals
        updateData.techSignalScore = techScore
        stats.signalsFound += signals.length

        // Update signal_type if this is the strongest signal
        if (techScore >= 15 && (!prospect.signal_type || prospect.source === 'new_domain_hunter')) {
          updateData.signal_type = 'missing_tech'
          updateData.signal_detail = signals
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.message)
            .join('. ')
        }

        // Boost prospect score
        const currentScore = prospect.score || 0
        updateData.score = Math.min(currentScore + techScore, 100)
      }

      writeBatch.update(ref, updateData)
    }

    await writeBatch.commit()

    // Delay between batches
    if (i + RATE_LIMITS.batchSize < prospectsQuery.length) {
      await new Promise(r => setTimeout(r, RATE_LIMITS.delayBetweenScans))
    }
  }

  // Log run
  await db.collection('organizations').doc(orgId).collection('hunterLogs').add({
    hunter: 'tech_stack_hunter',
    stats,
    nicheType,
    runAt: FieldValue.serverTimestamp()
  })

  // Notification if signals found
  if (stats.signalsFound > 0) {
    await db.collection('organizations').doc(orgId).collection('notifications').add({
      type: 'tech_stack_hunter_complete',
      title: 'Tech Stack: Analyse terminee',
      message: `${stats.scanned} sites scannes, ${stats.enriched} enrichis, ${stats.signalsFound} signaux detectes`,
      data: stats,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    })
  }

  logger.info(`🔧 Org ${orgId}: done`, stats)
  return stats
}

// ─── Gap analysis ───────────────────────────────────────────────────

function analyzeTechGaps(techStack, nicheType, competitors) {
  const signals = []
  const expected = NICHE_EXPECTED_TECH[nicheType] || NICHE_EXPECTED_TECH.default

  // Check for missing critical tools
  for (const category of expected.critical) {
    const value = techStack[category]
    const isEmpty = !value || (Array.isArray(value) && value.length === 0)

    if (isEmpty) {
      signals.push({
        type: 'missing_tool',
        tool: category,
        severity: 'critical',
        score: 15,
        message: `Pas de ${translateCategory(category)} detecte — critique pour un ${nicheType}`
      })
    }
  }

  // Check for missing recommended tools
  for (const category of expected.recommended) {
    const value = techStack[category]
    const isEmpty = !value || (Array.isArray(value) && value.length === 0)

    if (isEmpty) {
      signals.push({
        type: 'missing_tool',
        tool: category,
        severity: 'recommended',
        score: 10,
        message: `Pas de ${translateCategory(category)} — recommande pour ce secteur`
      })
    }
  }

  // WordPress without SEO plugin (check marketing array for SEO tools)
  if (techStack.cms === 'WordPress') {
    const hasYoast = techStack.allTechnologies?.some(t =>
      /yoast|rank\s*math|all.in.one.seo|seo.press/i.test(t.name)
    )
    if (!hasYoast) {
      signals.push({
        type: 'wordpress_no_seo',
        severity: 'critical',
        score: 10,
        message: 'WordPress sans plugin SEO (Yoast, RankMath, etc.) — opportunite SEO'
      })
    }
  }

  // Shopify without advanced analytics
  if (techStack.ecommerce === 'Shopify' || techStack.cms === 'Shopify') {
    const hasAdvancedAnalytics = techStack.analytics?.some(a =>
      /hotjar|mixpanel|amplitude|heap|segment/i.test(a)
    )
    if (!hasAdvancedAnalytics) {
      signals.push({
        type: 'shopify_no_analytics',
        severity: 'recommended',
        score: 10,
        message: 'Shopify sans analytics avance (Hotjar, Mixpanel) — proposer tracking'
      })
    }
  }

  // No analytics at all
  if (!techStack.analytics || techStack.analytics.length === 0) {
    signals.push({
      type: 'no_analytics',
      severity: 'critical',
      score: 10,
      message: 'Aucun outil analytics detecte — site invisible sur ses metriques'
    })
  }

  // Uses competitor tool
  if (competitors.length > 0) {
    const allTechNames = (techStack.allTechnologies || []).map(t => t.name.toLowerCase())
    for (const competitor of competitors) {
      const compLower = competitor.toLowerCase()
      if (allTechNames.some(t => t.includes(compLower))) {
        signals.push({
          type: 'uses_competitor',
          competitor,
          severity: 'high',
          score: 25,
          message: `Utilise ${competitor} — prospect chaud pour une alternative`
        })
      }
    }
  }

  // No chat widget (universal signal for B2B)
  if (!techStack.chat) {
    signals.push({
      type: 'no_chat',
      severity: 'recommended',
      score: 5,
      message: 'Pas de chat widget — proposer chatbot/live chat'
    })
  }

  return signals
}

function calculateTechScore(signals) {
  return Math.min(
    signals.reduce((sum, s) => sum + s.score, 0),
    50 // Cap the tech score bonus
  )
}

// ─── Helpers ────────────────────────────────────────────────────────

function extractDomain(url) {
  if (!url) return null
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}

function detectNicheType(profile) {
  const niche = (profile.niche || profile.sector || '').toLowerCase()
  if (/e-?commerce|boutique|shop|magasin|vente/i.test(niche)) return 'ecommerce'
  if (/restaurant|traiteur|food|boulangerie|patisserie/i.test(niche)) return 'restaurant'
  if (/saas|logiciel|software|app|startup/i.test(niche)) return 'saas'
  if (/agence|agency|marketing|communication|web/i.test(niche)) return 'agency'
  if (/artisan|plombier|electricien|menuisier|btp|renovation/i.test(niche)) return 'artisan'
  if (/medical|medecin|dentiste|kine|osteo|sante/i.test(niche)) return 'medical'
  if (/immobilier|real.estate|agent|mandataire/i.test(niche)) return 'immobilier'
  return 'default'
}

function translateCategory(category) {
  const translations = {
    analytics: 'outil analytics',
    chat: 'chat widget',
    marketing: 'outil marketing',
    ecommerce: 'plateforme e-commerce',
    payment: 'solution de paiement',
    cdn: 'CDN'
  }
  return translations[category] || category
}

function aggregateField(prospects, path) {
  const counts = {}
  for (const p of prospects) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], p)
    if (value && typeof value === 'string') {
      counts[value] = (counts[value] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
}
