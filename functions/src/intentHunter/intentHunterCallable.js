/**
 * Intent Hunter — Callable Cloud Functions
 *
 * Points d'entree pour le frontend :
 *   - launchIntentHunterPro : lance un scan B2B
 *   - launchIntentHunterParticuliers : lance un scan B2C
 *   - getIntentHunterStats : retourne les stats aggregees
 *
 * Toutes les fonctions verifient l'auth et le plan avant execution.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SOURCE_CONFIGS_PRO, SOURCES_BY_ID } from './pro/sourcesPro.js'
import { SOURCE_CONFIGS_PARTICULIERS } from './particuliers/sourcesParticuliers.js'
import { scoreLeadsBatch } from './pro/scoringPro.js'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'intentHunterCallable', event, ...data, timestamp: new Date().toISOString() }))

// ============================================
// PLAN GATES
// ============================================

const PLAN_GATES = {
  essentiel: {
    maxSourcesPro: 5,
    maxSourcesParticuliers: 4,
    maxLeadsPerScan: 50,
    allowedProGroups: ['B'],
    allowedParticuliersGroups: ['B', 'C']
  },
  pro: {
    maxSourcesPro: 15,
    maxSourcesParticuliers: 10,
    maxLeadsPerScan: 200,
    allowedProGroups: ['A', 'B', 'C'],
    allowedParticuliersGroups: ['A', 'B', 'C']
  },
  business: {
    maxSourcesPro: 26,
    maxSourcesParticuliers: 18,
    maxLeadsPerScan: 500,
    allowedProGroups: ['A', 'B', 'C', 'D'],
    allowedParticuliersGroups: ['A', 'B', 'C', 'D']
  }
}

function getPlanGates(plan) {
  return PLAN_GATES[plan] || PLAN_GATES.essentiel
}

// ============================================
// SCRAPER REGISTRY — dynamic imports
// ============================================

const PRO_SCRAPERS = {
  reddit: () => import('./pro/scrapers/redditScraper.js'),
  bodacc: () => import('./pro/scrapers/bodaccScraper.js'),
  boamp: () => import('./pro/scrapers/boampScraper.js'),
  offres_emploi: () => import('./pro/scrapers/offresEmploiScraper.js'),
  crunchbase: () => import('./pro/scrapers/crunchbaseScraper.js'),
  avis_concurrent: () => import('./pro/scrapers/avisGoogleScraper.js'),
  linkedin: () => import('./pro/scrapers/linkedinScraper.js'),
  twitter: () => import('./pro/scrapers/twitterScraper.js'),
  discord: () => import('./pro/scrapers/discordScraper.js'),
  slack: () => import('./pro/scrapers/slackScraper.js'),
  telegram: () => import('./pro/scrapers/telegramScraper.js'),
  facebook_pro: () => import('./pro/scrapers/facebookProScraper.js'),
  instagram_b2b: () => import('./pro/scrapers/instagramProScraper.js'),
  quora: () => import('./pro/scrapers/quoraScraper.js'),
  hacker_news: () => import('./pro/scrapers/hackerNewsScraper.js'),
  product_hunt: () => import('./pro/scrapers/productHuntScraper.js'),
  trustpilot_g2: () => import('./pro/scrapers/trustpilotG2Scraper.js'),
  glassdoor: () => import('./pro/scrapers/glassdoorScraper.js'),
  malt: () => import('./pro/scrapers/maltScraper.js'),
  upwork: () => import('./pro/scrapers/upworkScraper.js'),
  eventbrite_meetup: () => import('./pro/scrapers/eventbriteScraper.js'),
  google_news: () => import('./pro/scrapers/googleNewsScraper.js'),
  linkedin_events: () => import('./pro/scrapers/linkedinEventsScraper.js'),
  indie_hackers: () => import('./pro/scrapers/indieHackersScraper.js'),
  pixel_visiteur: () => import('./pro/scrapers/pixelTrackerScraper.js'),
  boamp_historique: () => import('./pro/scrapers/boampHistoriqueScraper.js')
}

const PARTICULIERS_SCRAPERS = {
  nextdoor: () => import('./particuliers/scrapers/nextdoorScraper.js'),
  facebook_local: () => import('./particuliers/scrapers/facebookLocalScraper.js'),
  whatsapp_group: () => import('./particuliers/scrapers/whatsappGroupsScraper.js'),
  allovoisins: () => import('./particuliers/scrapers/allovoisinsScraper.js'),
  leboncoin: () => import('./particuliers/scrapers/leboncoinScraper.js'),
  pagesjaunes: () => import('./particuliers/scrapers/pagesJaunesScraper.js'),
  houzz: () => import('./particuliers/scrapers/houzzScraper.js'),
  seloger_pap: () => import('./particuliers/scrapers/selogerPapScraper.js'),
  permis_construire: () => import('./particuliers/scrapers/permisConstructionScraper.js'),
  bans_mariage: () => import('./particuliers/scrapers/bansMariageScraper.js'),
  facebook_events: () => import('./particuliers/scrapers/facebookLifeEventsScraper.js'),
  pinterest: () => import('./particuliers/scrapers/pinterestScraper.js'),
  forum_sante: () => import('./particuliers/scrapers/forumSanteScraper.js'),
  forum_auto: () => import('./particuliers/scrapers/forumAutoScraper.js'),
  forum_maison: () => import('./particuliers/scrapers/forumMaisonScraper.js'),
  instagram_local: () => import('./particuliers/scrapers/instagramLocalScraper.js'),
  tiktok: () => import('./particuliers/scrapers/tiktokScraper.js'),
  tripadvisor: () => import('./particuliers/scrapers/tripAdvisorScraper.js')
}

// ============================================
// launchIntentHunterPro
// ============================================

export const launchIntentHunterPro = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '1GiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required')

  const uid = request.auth.uid
  const { orgId, sources, keywords, maxResults, filters } = request.data || {}

  if (!orgId) throw new HttpsError('invalid-argument', 'orgId required')
  if (!keywords?.length) throw new HttpsError('invalid-argument', 'keywords required')

  const db = getDb()

  // Verifier appartenance org
  const memberSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get()
  if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org')

  // Recuperer plan
  const orgSnap = await db.doc(`organizations/${orgId}`).get()
  const orgData = orgSnap.data() || {}
  const plan = orgData.subscription?.plan || 'essentiel'
  const gates = getPlanGates(plan)

  // Filtrer sources autorisees par plan
  const requestedSources = sources?.length
    ? sources.filter(s => {
        const src = SOURCES_BY_ID[s]
        return src && gates.allowedProGroups.includes(src.group)
      })
    : SOURCE_CONFIGS_PRO
        .filter(s => s.enabled && gates.allowedProGroups.includes(s.group))
        .map(s => s.id)
        .slice(0, gates.maxSourcesPro)

  const effectiveMaxResults = Math.min(maxResults || 100, gates.maxLeadsPerScan)

  log('launch_pro', { orgId, uid, plan, sources: requestedSources, keywords, maxResults: effectiveMaxResults })

  // Creer un document de scan pour tracking
  const scanRef = db.collection(`organizations/${orgId}/intentHunterScans`).doc()
  await scanRef.set({
    type: 'pro',
    status: 'running',
    sources: requestedSources,
    keywords,
    filters: filters || {},
    maxResults: effectiveMaxResults,
    startedAt: FieldValue.serverTimestamp(),
    startedBy: uid,
    leadsFound: 0
  })

  // Executer les scrapers
  const allLeads = []
  const sourceResults = {}
  const perSource = Math.ceil(effectiveMaxResults / requestedSources.length)

  for (const sourceId of requestedSources) {
    const scraperLoader = PRO_SCRAPERS[sourceId]
    if (!scraperLoader) {
      sourceResults[sourceId] = { status: 'no_scraper', leads: 0 }
      continue
    }

    try {
      const scraperModule = await scraperLoader()
      const leads = await scraperModule.scrape({
        clientId: orgId,
        keywords,
        maxResults: perSource,
        ...filters
      })

      allLeads.push(...leads)
      sourceResults[sourceId] = { status: 'success', leads: leads.length }
    } catch (error) {
      log('scraper_error', { sourceId, error: error.message })
      sourceResults[sourceId] = { status: 'error', error: error.message, leads: 0 }
    }
  }

  // Scorer les leads
  const scoredLeads = scoreLeadsBatch(allLeads)

  // Sauvegarder dans Firestore (max 500 pour perf)
  const leadsToSave = scoredLeads.slice(0, 500)
  const batch = db.batch()
  const savedIds = []

  for (const { lead, score, priority, immediate } of leadsToSave) {
    const leadRef = db.collection(`organizations/${orgId}/intentHunterLeads`).doc()
    batch.set(leadRef, {
      ...lead,
      score,
      priority,
      immediate,
      system: 'pro',
      status: 'new',
      sequenceStep: 0,
      createdAt: FieldValue.serverTimestamp()
    })
    savedIds.push(leadRef.id)
  }

  await batch.commit()

  // Mettre a jour le scan
  await scanRef.update({
    status: 'completed',
    leadsFound: scoredLeads.length,
    leadsSaved: leadsToSave.length,
    sourceResults,
    completedAt: FieldValue.serverTimestamp(),
    breakdown: {
      ultra_hot: scoredLeads.filter(s => s.priority === 'ultra_hot').length,
      hot: scoredLeads.filter(s => s.priority === 'hot').length,
      warm: scoredLeads.filter(s => s.priority === 'warm').length,
      cold: scoredLeads.filter(s => s.priority === 'cold').length
    }
  })

  log('launch_pro_complete', {
    orgId,
    totalLeads: scoredLeads.length,
    saved: leadsToSave.length,
    sourceResults
  })

  return {
    success: true,
    scanId: scanRef.id,
    totalLeads: scoredLeads.length,
    savedLeads: leadsToSave.length,
    sourceResults,
    breakdown: {
      ultra_hot: scoredLeads.filter(s => s.priority === 'ultra_hot').length,
      hot: scoredLeads.filter(s => s.priority === 'hot').length,
      warm: scoredLeads.filter(s => s.priority === 'warm').length,
      cold: scoredLeads.filter(s => s.priority === 'cold').length
    }
  }
})

// ============================================
// launchIntentHunterParticuliers
// ============================================

export const launchIntentHunterParticuliers = onCall({
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '1GiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required')

  const uid = request.auth.uid
  const { orgId, sources, keywords, zone, maxResults, filters } = request.data || {}

  if (!orgId) throw new HttpsError('invalid-argument', 'orgId required')
  if (!keywords?.length) throw new HttpsError('invalid-argument', 'keywords required')

  const db = getDb()

  const memberSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get()
  if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org')

  const orgSnap = await db.doc(`organizations/${orgId}`).get()
  const orgData = orgSnap.data() || {}
  const plan = orgData.subscription?.plan || 'essentiel'
  const gates = getPlanGates(plan)

  const requestedSources = sources?.length
    ? sources.filter(s => {
        const src = SOURCE_CONFIGS_PARTICULIERS.find(sc => sc.id === s)
        return src && gates.allowedParticuliersGroups.includes(src.group)
      })
    : SOURCE_CONFIGS_PARTICULIERS
        .filter(s => s.enabled && gates.allowedParticuliersGroups.includes(s.group))
        .map(s => s.id)
        .slice(0, gates.maxSourcesParticuliers)

  const effectiveMaxResults = Math.min(maxResults || 100, gates.maxLeadsPerScan)

  log('launch_particuliers', { orgId, uid, plan, sources: requestedSources, keywords, zone, maxResults: effectiveMaxResults })

  const scanRef = db.collection(`organizations/${orgId}/intentHunterScans`).doc()
  await scanRef.set({
    type: 'particuliers',
    status: 'running',
    sources: requestedSources,
    keywords,
    zone: zone || null,
    filters: filters || {},
    maxResults: effectiveMaxResults,
    startedAt: FieldValue.serverTimestamp(),
    startedBy: uid,
    leadsFound: 0
  })

  const allLeads = []
  const sourceResults = {}
  const perSource = Math.ceil(effectiveMaxResults / requestedSources.length)

  for (const sourceId of requestedSources) {
    const scraperLoader = PARTICULIERS_SCRAPERS[sourceId]
    if (!scraperLoader) {
      sourceResults[sourceId] = { status: 'no_scraper', leads: 0 }
      continue
    }

    try {
      const scraperModule = await scraperLoader()
      const leads = await scraperModule.scrape({
        clientId: orgId,
        keywords,
        zone: zone || null,
        maxResults: perSource,
        ...filters
      })

      allLeads.push(...leads)
      sourceResults[sourceId] = { status: 'success', leads: leads.length }
    } catch (error) {
      log('scraper_error', { sourceId, error: error.message })
      sourceResults[sourceId] = { status: 'error', error: error.message, leads: 0 }
    }
  }

  // Score B2C — utiliser le scoring particuliers
  let scoredLeads
  try {
    const { scoreLeadsBatch: scoreB2C } = await import('./particuliers/scoringParticuliers.js')
    scoredLeads = scoreB2C(allLeads)
  } catch {
    // Fallback: score basique
    scoredLeads = allLeads.map(lead => ({
      lead,
      score: lead.intentKeywordsCount ? Math.min(lead.intentKeywordsCount * 20 + 30, 100) : 40,
      priority: lead.urgencyDetected ? 'hot' : 'warm'
    }))
  }

  const leadsToSave = scoredLeads.slice(0, 500)
  const batch = db.batch()

  for (const item of leadsToSave) {
    const leadRef = db.collection(`organizations/${orgId}/intentHunterLeads`).doc()
    batch.set(leadRef, {
      ...(item.lead || item),
      score: item.score || 50,
      priority: item.priority || 'warm',
      system: 'particuliers',
      zone: zone || null,
      status: 'new',
      sequenceStep: 0,
      createdAt: FieldValue.serverTimestamp()
    })
  }

  await batch.commit()

  await scanRef.update({
    status: 'completed',
    leadsFound: scoredLeads.length,
    leadsSaved: leadsToSave.length,
    sourceResults,
    completedAt: FieldValue.serverTimestamp()
  })

  log('launch_particuliers_complete', {
    orgId,
    totalLeads: scoredLeads.length,
    saved: leadsToSave.length,
    sourceResults
  })

  return {
    success: true,
    scanId: scanRef.id,
    totalLeads: scoredLeads.length,
    savedLeads: leadsToSave.length,
    sourceResults
  }
})

// ============================================
// getIntentHunterStats
// ============================================

export const getIntentHunterStats = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required')

  const uid = request.auth.uid
  const { orgId, period } = request.data || {}

  if (!orgId) throw new HttpsError('invalid-argument', 'orgId required')

  const db = getDb()

  const memberSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get()
  if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Not a member of this org')

  // Determiner la periode
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
  const since = new Date(Date.now() - periodDays * 86_400_000)

  // Recuperer les leads
  const leadsSnap = await db.collection(`organizations/${orgId}/intentHunterLeads`)
    .where('createdAt', '>=', since)
    .orderBy('createdAt', 'desc')
    .limit(1000)
    .get()

  const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Aggreger les stats
  const bySource = {}
  const byPriority = { ultra_hot: 0, hot: 0, warm: 0, cold: 0 }
  const bySystem = { pro: 0, particuliers: 0 }
  const byStatus = { new: 0, contacted: 0, replied: 0, converted: 0 }
  let totalScore = 0

  for (const lead of leads) {
    // Par source
    const src = lead.source || 'unknown'
    bySource[src] = (bySource[src] || 0) + 1

    // Par priorite
    const prio = lead.priority || 'warm'
    byPriority[prio] = (byPriority[prio] || 0) + 1

    // Par systeme
    const sys = lead.system || 'pro'
    bySystem[sys] = (bySystem[sys] || 0) + 1

    // Par statut
    const status = lead.status || 'new'
    byStatus[status] = (byStatus[status] || 0) + 1

    totalScore += lead.score || 0
  }

  // Recuperer les scans recents
  const scansSnap = await db.collection(`organizations/${orgId}/intentHunterScans`)
    .orderBy('startedAt', 'desc')
    .limit(10)
    .get()

  const recentScans = scansSnap.docs.map(d => ({
    id: d.id,
    type: d.data().type,
    status: d.data().status,
    leadsFound: d.data().leadsFound || 0,
    startedAt: d.data().startedAt?.toDate?.()?.toISOString() || null,
    completedAt: d.data().completedAt?.toDate?.()?.toISOString() || null
  }))

  const stats = {
    period: `${periodDays}d`,
    totalLeads: leads.length,
    averageScore: leads.length > 0 ? Math.round(totalScore / leads.length) : 0,
    bySource,
    byPriority,
    bySystem,
    byStatus,
    recentScans,
    topSources: Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }

  log('get_stats', { orgId, period: `${periodDays}d`, totalLeads: leads.length })

  return { success: true, stats }
})
