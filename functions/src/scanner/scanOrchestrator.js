/**
 * scanOrchestrator.js — Orchestre un scan complet pour un prospect
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { analyzeWebsite } from './sources/websiteAnalyzer.js';
import { detectTechStack } from './sources/techStackDetector.js';
import { scanSeoHealth } from './sources/seoHealthScanner.js';
import { analyzeEmailInfra } from './sources/emailInfraAnalyzer.js';
import { analyzeSSLCert } from './sources/sslCertAnalyzer.js';
import { detectWaybackDelta } from './sources/waybackDeltaDetector.js';
import { analyzeGoogleBusiness } from './sources/googleBusinessAnalyzer.js';
import { analyzeGoogleReviews } from './sources/googleReviewsMonitor.js';
import { trackSocialEngagement } from './sources/socialEngagementTracker.js';
import { analyzePappersFinancial } from './sources/pappersFinancialMonitor.js';
import { buildSignal, scoreToPriority } from './signalScorer.js';
import { extractWebsiteSignals, extractTechSignals, extractSeoSignals, extractEmailSignals, extractSSLSignals, extractWaybackSignals } from './scanResultsAggregator.js';
import { generateDiagnosticSummary as generateDiagnostic } from './prospectDiagnosticGenerator.js';

const getDb = () => getFirestore();

export const runProspectScan = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const { prospectId, domain, organizationId, businessName, location, siren } = request.data;
    if (!domain || !organizationId) {
      throw new HttpsError('invalid-argument', 'domain et organizationId requis');
    }

    console.log(`[Scan] Lancement scan complet pour ${domain}`);

    // Phase 1: Scan site web en parallele
    const [
      websiteResult,
      techStackResult,
      seoResult,
      emailResult,
      sslResult,
      waybackResult,
    ] = await Promise.allSettled([
      analyzeWebsite(domain),
      detectTechStack(domain),
      scanSeoHealth(domain),
      analyzeEmailInfra(domain),
      analyzeSSLCert(domain),
      detectWaybackDelta(domain),
    ]);

    const website = websiteResult.status === 'fulfilled' ? websiteResult.value : null;
    const techStack = techStackResult.status === 'fulfilled' ? techStackResult.value : null;
    const seo = seoResult.status === 'fulfilled' ? seoResult.value : null;
    const email = emailResult.status === 'fulfilled' ? emailResult.value : null;
    const ssl = sslResult.status === 'fulfilled' ? sslResult.value : null;
    const wayback = waybackResult.status === 'fulfilled' ? waybackResult.value : null;

    // Phase 2: Sources externes en parallele
    const [gbpResult, reviewsResult, socialResult, financialResult] = await Promise.allSettled([
      businessName ? analyzeGoogleBusiness(businessName, location) : Promise.resolve(null),
      businessName ? analyzeGoogleReviews(null, businessName) : Promise.resolve(null),
      website?.socialLinks ? trackSocialEngagement(website.socialLinks) : Promise.resolve(null),
      siren ? analyzePappersFinancial(siren) : Promise.resolve(null),
    ]);

    const googleBusiness = gbpResult.status === 'fulfilled' ? gbpResult.value : null;
    const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : null;
    const social = socialResult.status === 'fulfilled' ? socialResult.value : null;
    const financial = financialResult.status === 'fulfilled' ? financialResult.value : null;

    // Phase 3: Extraction de signaux
    const signals = [];
    if (website) signals.push(...extractWebsiteSignals(website));
    if (techStack) signals.push(...extractTechSignals(techStack));
    if (seo) signals.push(...extractSeoSignals(seo));
    if (ssl) signals.push(...extractSSLSignals(ssl));
    if (email) signals.push(...extractEmailSignals(email));
    if (wayback) signals.push(...extractWaybackSignals(wayback));
    if (googleBusiness) signals.push(...extractGBPSignals(googleBusiness));
    if (reviews) signals.push(...extractReviewSignals(reviews));
    if (social) signals.push(...extractSocialSignals(social));
    if (financial) signals.push(...extractFinancialSignals(financial));

    const totalSignalScore = signals.reduce((sum, s) => sum + s.score, 0);
    const priority = scoreToPriority(totalSignalScore);

    // Phase 4: Diagnostic IA
    const diagnosticSummary = await generateDiagnostic(domain, signals, website, techStack, seo, email);

    // Phase 5: Sauvegarde
    const db = getDb();
    const scanResult = {
      prospectId: prospectId || null,
      organizationId,
      domain,
      scannedAt: FieldValue.serverTimestamp(),
      scanVersion: '1.0',
      website,
      techStack,
      seo,
      email,
      ssl,
      wayback,
      googleBusiness,
      reviews,
      social,
      financial,
      signals,
      totalSignalScore,
      diagnosticSummary,
      priority,
    };

    const docRef = prospectId
      ? db.collection('scanResults').doc(prospectId)
      : db.collection('scanResults').doc();

    await docRef.set(scanResult, { merge: true });

    // Sauvegarder signaux individuels
    const CHUNK = 499;
    for (let i = 0; i < signals.length; i += CHUNK) {
      const chunk = signals.slice(i, i + CHUNK);
      const batch = db.batch();
      for (const signal of chunk) {
        const signalRef = db.collection('scanSignals').doc();
        batch.set(signalRef, {
          ...signal,
          organizationId,
          prospectId: prospectId || null,
          status: 'new',
          detectedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    console.log(`[Scan] Termine ${domain}: ${signals.length} signaux, score ${totalSignalScore}, priorite ${priority}`);
    return { scanResultId: docRef.id, totalSignalScore, priority, signalsCount: signals.length };
  }
);

// Local signal extractors for sources not in scanResultsAggregator
function extractGBPSignals(g) {
  const signals = [];
  if (!g || !g.exists) {
    signals.push(buildSignal('no_google_business', 'googleBusinessAnalyzer'));
    return signals;
  }
  if (!g.hasWebsiteLink) signals.push(buildSignal('no_website_on_gmb', 'googleBusinessAnalyzer'));
  if (g.totalReviews < 10) signals.push(buildSignal('few_reviews', 'googleBusinessAnalyzer'));
  if (g.rating < 3.5) signals.push(buildSignal('low_rating', 'googleBusinessAnalyzer'));
  return signals;
}

function extractReviewSignals(r) {
  const signals = [];
  if (!r || !r.hasReviews) return signals;
  if (r.responseRate < 0.2) signals.push(buildSignal('low_review_response', 'googleReviewsMonitor'));
  if (r.recentReviewsTrend === 'declining') signals.push(buildSignal('declining_rating', 'googleReviewsMonitor'));
  return signals;
}

function extractSocialSignals(s) {
  const signals = [];
  if (!s) return signals;
  if (!s.hasAnySocial) {
    signals.push(buildSignal('no_social_presence', 'socialEngagementTracker'));
    return signals;
  }
  if (s.instagram?.accessible === false && !s.instagram?.followers) {
    signals.push(buildSignal('instagram_dead', 'socialEngagementTracker'));
  }
  return signals;
}

function extractFinancialSignals(f) {
  const signals = [];
  if (!f) return signals;
  if (f.revenueGrowthYoY && f.revenueGrowthYoY > 0.1) {
    signals.push(buildSignal('revenue_growth', 'pappersFinancialMonitor'));
  }
  if (f.isNewDirector) signals.push(buildSignal('new_director', 'pappersFinancialMonitor'));
  if (f.procedureCollective) signals.push(buildSignal('collective_procedure', 'pappersFinancialMonitor'));
  if (f.dateCreation) {
    const created = new Date(f.dateCreation);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (created > oneYearAgo) signals.push(buildSignal('new_business', 'pappersFinancialMonitor'));
  }
  return signals;
}

