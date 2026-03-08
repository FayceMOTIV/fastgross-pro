/**
 * Signals Intelligence Layer — Cloud Functions Wrapper
 * Exposes signal scanners as callable + scheduled Cloud Functions.
 *
 * Exports:
 *   - scrapeCompetitorReviewsCallable (onCall)
 *   - dailyCompetitorReviewsScan (onSchedule 06:00 Europe/Paris)
 *   - fetchGithubSignalsCallable (onCall)
 *   - fetchConferenceSpeakersCron (onSchedule 07:00 Europe/Paris)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { scrapeNegativeReviews, runCompetitorReviewsScan } from './competitorReviewsScraper.js'
import { fetchGithubCompanySignals } from './githubSignalsClient.js'
import { scanConferenceSpeakers } from './conferenceSpeakersClient.js'
import { orchestrateSignalsWithCache } from './signalOrchestrator.js'

const getDb = () => getFirestore()

// ============================================
// 0. Intelligence Signals V2 — Enrich Lead (8 dimensions)
// ============================================
export const enrichLeadSignals = onCall(
  {
    region: 'europe-west1',
    cors: ALLOWED_ORIGINS,
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const { auth, data } = request
    if (!auth) throw new HttpsError('unauthenticated', 'Authentification requise')

    const lead = data?.lead
    if (!lead || typeof lead !== 'object') {
      throw new HttpsError('invalid-argument', 'lead est requis (objet prospect)')
    }

    logger.info(`[Signals V2] Enrichment requested by ${auth.uid} for ${lead.siren || lead.nom || '?'}`)

    try {
      const result = await orchestrateSignalsWithCache(lead)
      return {
        success: true,
        totalDScoreBonus: result.totalDScoreBonus,
        intent: result.intent,
        techno: result.techno,
        director: result.director,
        growth: result.growth,
        pain: result.pain,
        timing: result.timing,
        certs: result.certs,
        social: result.social,
        enrichedLead: result.enrichedLead,
      }
    } catch (err) {
      logger.error('[Signals V2] Enrichment failed:', err.message)
      throw new HttpsError('internal', `Enrichissement echoue: ${err.message}`)
    }
  }
)

// ============================================
// 1. Competitor Reviews — Callable
// ============================================
export const scrapeCompetitorReviewsCallable = onCall(
  {
    region: 'europe-west1',
    cors: ALLOWED_ORIGINS,
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { icpType } = data || {}
    if (!icpType || typeof icpType !== 'string') {
      throw new HttpsError('invalid-argument', 'icpType est requis (restaurant, prospection, compta, rh, ecommerce, reservation)')
    }

    const normalizedType = icpType.toLowerCase().trim()
    const validTypes = ['restaurant', 'prospection', 'compta', 'rh', 'ecommerce', 'reservation']
    if (!validTypes.includes(normalizedType)) {
      throw new HttpsError('invalid-argument', `icpType invalide: "${icpType}". Valeurs acceptees: ${validTypes.join(', ')}`)
    }

    logger.info(`Competitor reviews scan requested by ${auth.uid} for ICP: ${normalizedType}`)

    try {
      const results = await runCompetitorReviewsScan(normalizedType)

      // Save results to Firestore intentLeadsPro collection
      const db = getDb()
      const batch = db.batch()

      for (const competitorResult of results) {
        for (const review of competitorResult.reviews) {
          if (review.painPoints.length === 0) continue

          const docRef = db.collection('intentLeadsPro').doc()
          batch.set(docRef, {
            type: 'competitor_review',
            icpType: normalizedType,
            competitor: competitorResult.competitor,
            reviewTitle: review.title,
            reviewText: review.text,
            reviewRating: review.rating,
            painPoints: review.painPoints,
            reviewDate: review.date,
            reviewAuthor: review.author,
            source: review.source,
            scannedBy: auth.uid,
            status: 'new',
            processed: false,
            createdAt: FieldValue.serverTimestamp(),
          })
        }
      }

      await batch.commit()

      const totalReviews = results.reduce((sum, r) => sum + r.reviewCount, 0)
      const totalWithPain = results.reduce(
        (sum, r) => sum + r.reviews.filter((rv) => rv.painPoints.length > 0).length,
        0
      )

      logger.info(`Competitor reviews saved: ${totalWithPain} reviews with pain points out of ${totalReviews} total`)

      return {
        success: true,
        icpType: normalizedType,
        competitorsScanned: results.length,
        totalReviews,
        reviewsWithPainPoints: totalWithPain,
        competitors: results.map((r) => ({
          competitor: r.competitor,
          reviewCount: r.reviewCount,
          topPainPoints: r.topPainPoints.slice(0, 3),
        })),
      }
    } catch (err) {
      logger.error('Competitor reviews scan failed:', err.message)
      throw new HttpsError('internal', `Scan echoue: ${err.message}`)
    }
  }
)

// ============================================
// 2. Competitor Reviews — Daily Cron
// ============================================
export const dailyCompetitorReviewsScan = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    logger.info('Daily competitor reviews scan starting')

    const db = getDb()
    const allIcpTypes = ['restaurant', 'prospection', 'compta', 'rh', 'ecommerce', 'reservation']
    const summary = { total: 0, byType: {} }

    for (const icpType of allIcpTypes) {
      try {
        const results = await runCompetitorReviewsScan(icpType)

        let savedCount = 0
        const batch = db.batch()

        for (const competitorResult of results) {
          for (const review of competitorResult.reviews) {
            if (review.painPoints.length === 0) continue

            const docRef = db.collection('intentLeadsPro').doc()
            batch.set(docRef, {
              type: 'competitor_review',
              icpType,
              competitor: competitorResult.competitor,
              reviewTitle: review.title,
              reviewText: review.text,
              reviewRating: review.rating,
              painPoints: review.painPoints,
              reviewDate: review.date,
              reviewAuthor: review.author,
              source: review.source,
              scannedBy: 'cron',
              status: 'new',
              processed: false,
              createdAt: FieldValue.serverTimestamp(),
            })
            savedCount++
          }
        }

        await batch.commit()

        summary.byType[icpType] = {
          competitors: results.length,
          reviews: results.reduce((s, r) => s + r.reviewCount, 0),
          saved: savedCount,
        }
        summary.total += savedCount

        logger.info(`  ${icpType}: ${savedCount} reviews with pain points saved`)

        // Pause between ICP types to avoid Trustpilot rate limits
        await new Promise((r) => setTimeout(r, 5000))
      } catch (err) {
        logger.error(`Daily scan failed for ICP "${icpType}":`, err.message)
        summary.byType[icpType] = { error: err.message }
      }
    }

    // Log summary
    await db.collection('signalsScanLogs').add({
      type: 'competitor_reviews',
      summary,
      completedAt: FieldValue.serverTimestamp(),
    })

    logger.info('Daily competitor reviews scan complete:', JSON.stringify(summary))
  }
)

// ============================================
// 3. GitHub Signals — Callable
// ============================================
export const fetchGithubSignalsCallable = onCall(
  {
    region: 'europe-west1',
    cors: ALLOWED_ORIGINS,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { companyDomain } = data || {}
    if (!companyDomain || typeof companyDomain !== 'string') {
      throw new HttpsError('invalid-argument', 'companyDomain est requis (ex: "acme.fr")')
    }

    logger.info(`GitHub signals requested by ${auth.uid} for domain: ${companyDomain}`)

    try {
      const signals = await fetchGithubCompanySignals(companyDomain)

      if (!signals) {
        return {
          success: true,
          found: false,
          message: `Aucune organisation GitHub trouvee pour ${companyDomain}`,
        }
      }

      // Save to Firestore for history
      const db = getDb()
      await db.collection('intentLeadsPro').add({
        type: 'github_signal',
        company: signals.company,
        domain: signals.domain,
        login: signals.login,
        activityScore: signals.activityScore,
        signals: signals.signals,
        salesRepos: signals.salesRepos,
        scannedBy: auth.uid,
        status: 'new',
        processed: false,
        createdAt: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        found: true,
        data: signals,
      }
    } catch (err) {
      logger.error('GitHub signals fetch failed:', err.message)
      throw new HttpsError('internal', `Recherche echouee: ${err.message}`)
    }
  }
)

// ============================================
// 4. Conference Speakers — Daily Cron
// ============================================
export const fetchConferenceSpeakersCron = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    logger.info('Conference speakers cron starting')

    try {
      const summary = await scanConferenceSpeakers()

      // Log the scan result
      const db = getDb()
      await db.collection('signalsScanLogs').add({
        type: 'conference_speakers',
        summary,
        completedAt: FieldValue.serverTimestamp(),
      })

      logger.info('Conference speakers cron complete:', JSON.stringify(summary))
    } catch (err) {
      logger.error('Conference speakers cron failed:', err.message)
    }
  }
)
