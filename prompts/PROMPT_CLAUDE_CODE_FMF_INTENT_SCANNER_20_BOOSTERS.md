# MISSION : IMPLÉMENTER LES 20 BOOSTERS WEB SCANNING — FMF INTENT SCANNER
# Projet : ~/Projects/face-media-factory
# Stack : React/Vite/Tailwind + Firebase (Auth, Firestore, Cloud Functions europe-west1) + Groq + VPS Python 94.130.184.44
# Objectif : Chaque prospect FMF reçoit un audit digital complet automatique en 30 secondes

Lis d'abord l'architecture existante dans `functions/src/` pour comprendre les patterns en place.
Travaille de manière autonome, phase par phase, sans attendre de validation intermédiaire.
Commit et push après chaque phase complétée.
Ne mets JAMAIS de secrets en dur. Utilise les variables d'environnement.
Région Cloud Functions : TOUJOURS `europe-west1`.
Toutes les fonctions utilisent Firebase Cloud Functions v2 (firebase-functions/v2).

---

## ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────────────────┐
│                    FMF INTENT SCANNER                            │
│                                                                  │
│  SOURCES GRATUITES (12)              SOURCES PAYANTES (8)        │
│  ├─ crt.sh (CT Logs)                ├─ Apify Google Maps Reviews │
│  ├─ France Travail API              ├─ Apify Instagram/TikTok    │
│  ├─ Wayback Machine API             ├─ Apify LeBonCoin           │
│  ├─ DNS MX/SPF/DKIM (dig)           ├─ Pappers API               │
│  ├─ data.gouv.fr subventions        ├─ Apify Google Business     │
│  ├─ sitemap.xml + robots.txt        │                             │
│  ├─ Schema.org analysis             │                             │
│  ├─ PageSpeed API                   │                             │
│  ├─ OpenWeatherMap                  │                             │
│  ├─ Wappalyzer open-source          │                             │
│  ├─ Google Rich Results API         │                             │
│  └─ WHOIS (domaines)                │                             │
│                                                                  │
│  PIPELINE UNIFIÉ :                                                │
│  Source détecte signal → enrichProspect() → scoreSignal()         │
│  → updateFirestore() → triggerAlex() si score >= seuil            │
│                                                                  │
│  COLLECTIONS FIRESTORE :                                          │
│  scanResults/{prospectId}     — résultat complet du scan          │
│  scanSignals/{signalId}       — signaux d'achat individuels       │
│  scanSchedules/{scheduleId}   — planification des scans           │
└─────────────────────────────────────────────────────────────────┘
```

---

## STRUCTURE FICHIERS À CRÉER

```
functions/src/
  scanner/
    index.js                        — Export de toutes les Cloud Functions scanner
    
    # CORE
    scanOrchestrator.js             — Orchestre un scan complet pour un prospect
    signalScorer.js                 — Score un signal d'achat (0-100)
    scanScheduler.js                — Planifie les scans (cron + on-demand)
    scanResultsAggregator.js        — Agrège tous les résultats en un diagnostic
    
    # SOURCES SITE WEB (scannent le site du prospect)
    sources/
      websiteAnalyzer.js            — Claygent maison : visite le site, extrait insights
      techStackDetector.js          — Wappalyzer open-source : détecte la stack techno
      seoHealthScanner.js           — PageSpeed + sitemap + robots.txt + Schema.org
      emailInfraAnalyzer.js         — MX/SPF/DKIM/DMARC analysis via DNS
      waybackDeltaDetector.js       — Compare version actuelle vs Wayback Machine
      sslCertAnalyzer.js            — Certificat SSL : expiration, émetteur, âge
    
    # SOURCES EXTERNES (scannent des APIs tierces)
    sources/
      ctLogsMonitor.js              — crt.sh : nouveaux certificats .fr
      franceTravailMonitor.js       — API France Travail : offres d'emploi
      subventionsMonitor.js         — data.gouv.fr : aides aux entreprises
      googleBusinessAnalyzer.js     — Fiche Google Business Profile
      googleReviewsMonitor.js       — Avis Google Maps en continu
      socialEngagementTracker.js    — Instagram/TikTok engagement monitoring
      leboncoinCessionsMonitor.js   — Cessions de fonds de commerce
      pappersFinancialMonitor.js    — Données financières Pappers
      weatherSeasonalityEngine.js   — Météo + saisonnalité par secteur
    
    # INTELLIGENCE
    reverseEnrichment.js            — Signal détecté → identification du prospect
    prospectDiagnosticGenerator.js  — Génère le rapport diagnostic complet
    pixelVisitorTracker.js          — Script pixel + reverse DNS → identification

src/
  components/scanner/
    ProspectDiagnostic.jsx          — Composant qui affiche le diagnostic complet
    ScannerDashboard.jsx            — Dashboard des scans en cours
    SignalsFeed.jsx                 — Feed temps réel des signaux détectés
```

---

## PHASE 1 : CORE SCANNER (implémenter en premier)

### 1.1 Schéma de données Firestore

**Collection `scanResults/{prospectId}`**
```javascript
{
  prospectId: "string",               // référence vers le prospect
  organizationId: "string",           // tenant
  domain: "string",                   // "restaurant-example.fr"
  scannedAt: "timestamp",
  scanVersion: "1.0",
  
  // RÉSULTATS PAR MODULE
  website: {
    exists: true,
    lastModified: "2024-03-15",        // extrait du footer/meta
    copyrightYear: 2024,
    isResponsive: true,
    hasContactForm: true,
    hasAnalytics: false,
    hasFacebookPixel: false,
    hasChatWidget: false,
    pageCount: 8,                      // depuis sitemap
    loadTimeMs: 3200,
    lighthouseScore: 45,               // 0-100
    brokenLinks: 2,
  },
  
  techStack: {
    cms: "WordPress",                  // ou "Wix", "Squarespace", null
    cmsVersion: "6.2.1",
    ecommerce: null,                   // "WooCommerce", "Shopify"...
    analytics: [],                     // ["Google Analytics 4"]
    marketing: [],                     // ["Mailchimp", "HubSpot"]
    chat: null,                        // "Crisp", "Intercom"
    payment: null,                     // "Stripe", "PayPal"
    framework: "PHP",
    hosting: "OVH",
  },
  
  seo: {
    lighthouseScore: 45,
    hasSitemap: true,
    sitemapPageCount: 8,
    hasRobotsTxt: true,
    hasSchemaOrg: false,
    schemaTypes: [],                   // ["LocalBusiness", "Restaurant"]
    lastSitemapUpdate: "2024-01-10",
    googleIndexedPages: 12,
    hasSSL: true,
    sslExpiresAt: "2026-08-15",
    sslIssuer: "Let's Encrypt",
  },
  
  email: {
    mxProvider: "Google Workspace",    // ou "OVH", "iCloud", null
    hasSPF: true,
    spfValid: true,
    hasDKIM: false,
    hasDMARC: false,
    usesFreeMail: false,               // true si @gmail.com
    professionalEmail: "contact@restaurant-example.fr",
  },
  
  googleBusiness: {
    exists: true,
    rating: 4.2,
    totalReviews: 127,
    recentReviewsTrend: "declining",   // "improving", "stable", "declining"
    responseRate: 0.15,                // 15% des avis avec réponse
    lastPhotoDate: "2023-06-20",
    photosCount: 12,
    hasWebsiteLink: true,
    hasHours: true,
    hoursAccurate: true,
    categories: ["Restaurant français"],
  },
  
  social: {
    instagram: {
      handle: "@restaurantexample",
      followers: 2340,
      avgEngagement: 1.2,             // en %
      lastPostDate: "2025-12-01",
      postFrequency: "rare",          // "daily", "weekly", "monthly", "rare", "dead"
      engagementTrend: "declining",
    },
    facebook: { /* même structure */ },
    tiktok: null,
  },
  
  financial: {                         // depuis Pappers
    chiffreAffaires: 450000,
    resultatNet: 25000,
    effectif: 8,
    revenueGrowthYoY: 0.12,           // +12%
    lastDirectorChange: null,
    capitalIncrease: false,
  },
  
  signals: [                           // liste des signaux détectés
    {
      type: "no_analytics",
      source: "techStackDetector",
      score: 20,
      message: "Aucun outil d'analytics détecté sur le site",
      detectedAt: "timestamp",
    },
    {
      type: "declining_reviews",
      source: "googleReviewsMonitor",
      score: 25,
      message: "Note Google passée de 4.5 à 4.2 en 3 mois",
      detectedAt: "timestamp",
    }
  ],
  
  // SCORE AGRÉGÉ
  totalSignalScore: 65,                // somme des scores signals
  diagnosticSummary: "string",         // résumé IA du diagnostic
  recommendedApproach: "string",       // message suggéré pour Alex
  priority: "high",                    // "critical", "high", "medium", "low"
}
```

**Collection `scanSignals/{signalId}`**
```javascript
{
  signalId: "string",
  organizationId: "string",
  prospectId: "string",               // null si prospect pas encore identifié (reverse enrichment)
  type: "string",                      // "hiring_signal", "new_domain", "negative_review"...
  source: "string",                    // "franceTravailMonitor", "ctLogsMonitor"...
  rawData: {},                         // données brutes de la source
  score: 25,                           // 0-100
  status: "new",                       // "new", "processed", "linked", "dismissed"
  message: "string",                   // message humain décrivant le signal
  actionable: true,                    // le signal mène à une action concrète ?
  detectedAt: "timestamp",
  processedAt: "timestamp",
}
```

### 1.2 scanOrchestrator.js — Orchestre un scan complet

```javascript
// Cloud Function callable : lancée manuellement ou par scheduler
// Input : { prospectId, domain, organizationId }
// Output : scanResults document complet

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const runProspectScan = onCall(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const { prospectId, domain, organizationId } = request.data;
    if (!domain || !organizationId) {
      throw new HttpsError('invalid-argument', 'domain et organizationId requis');
    }

    console.log(`🔍 Scan complet lancé pour ${domain}`);

    // Exécuter tous les modules en parallèle (ceux qui scannent le site)
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

    // Collecter les signaux
    const signals = [];
    
    // Extraire les résultats (avec gestion d'erreur par module)
    const website = websiteResult.status === 'fulfilled' ? websiteResult.value : null;
    const techStack = techStackResult.status === 'fulfilled' ? techStackResult.value : null;
    const seo = seoResult.status === 'fulfilled' ? seoResult.value : null;
    const email = emailResult.status === 'fulfilled' ? emailResult.value : null;

    // Scorer chaque résultat et extraire les signaux
    if (website) signals.push(...extractWebsiteSignals(website));
    if (techStack) signals.push(...extractTechSignals(techStack));
    if (seo) signals.push(...extractSeoSignals(seo));
    if (email) signals.push(...extractEmailSignals(email));

    // Calculer score total
    const totalSignalScore = signals.reduce((sum, s) => sum + s.score, 0);
    
    // Déterminer priorité
    const priority = totalSignalScore >= 80 ? 'critical' 
                   : totalSignalScore >= 50 ? 'high'
                   : totalSignalScore >= 25 ? 'medium' 
                   : 'low';

    // Générer diagnostic IA (Groq)
    const diagnosticSummary = await generateDiagnosticSummary(domain, signals, website, techStack, seo, email);

    // Sauvegarder
    const scanResult = {
      prospectId: prospectId || null,
      organizationId,
      domain,
      scannedAt: new Date(),
      scanVersion: '1.0',
      website,
      techStack,
      seo,
      email,
      signals,
      totalSignalScore,
      diagnosticSummary,
      priority,
    };

    const docRef = prospectId 
      ? db.collection('scanResults').doc(prospectId)
      : db.collection('scanResults').doc();
    
    await docRef.set(scanResult, { merge: true });

    // Sauvegarder chaque signal individuellement
    const batch = db.batch();
    for (const signal of signals) {
      const signalRef = db.collection('scanSignals').doc();
      batch.set(signalRef, {
        ...signal,
        organizationId,
        prospectId: prospectId || null,
        status: 'new',
        detectedAt: new Date(),
      });
    }
    await batch.commit();

    console.log(`✅ Scan terminé pour ${domain} : ${signals.length} signaux, score ${totalSignalScore}, priorité ${priority}`);
    return { scanResultId: docRef.id, totalSignalScore, priority, signalsCount: signals.length };
  }
);
```

Note : les fonctions `analyzeWebsite()`, `detectTechStack()`, `scanSeoHealth()`, `analyzeEmailInfra()`, `analyzeSSLCert()`, `detectWaybackDelta()` sont importées depuis les fichiers sources/ respectifs. Implémente chacune ci-dessous.

### 1.3 signalScorer.js — Scoring centralisé des signaux

```javascript
// Référentiel de scoring centralisé pour TOUS les types de signaux

export const SIGNAL_SCORES = {
  // WEBSITE
  'site_not_found':           { score: 35, category: 'website', msg: 'Site web introuvable ou hors ligne' },
  'site_not_responsive':      { score: 15, category: 'website', msg: 'Site non adapté au mobile' },
  'no_contact_form':          { score: 10, category: 'website', msg: 'Pas de formulaire de contact' },
  'no_analytics':             { score: 20, category: 'website', msg: 'Aucun outil analytics détecté' },
  'no_facebook_pixel':        { score: 15, category: 'website', msg: 'Pas de pixel Facebook/Meta' },
  'no_chat_widget':           { score: 10, category: 'website', msg: 'Pas de chat en ligne' },
  'slow_site':                { score: 15, category: 'website', msg: 'Site lent (> 3 secondes)' },
  'lighthouse_under_50':      { score: 20, category: 'website', msg: 'Score PageSpeed critique (< 50/100)' },
  'broken_links':             { score: 10, category: 'website', msg: 'Liens cassés détectés sur le site' },
  'copyright_outdated':       { score: 15, category: 'website', msg: (year) => `Copyright obsolète (© ${year})` },
  
  // TECH STACK
  'wix_basic':                { score: 15, category: 'tech', msg: 'Site sur Wix (basique)' },
  'wordpress_outdated':       { score: 25, category: 'tech', msg: 'WordPress non mis à jour' },
  'no_marketing_stack':       { score: 30, category: 'tech', msg: 'Aucun outil marketing détecté' },
  'uses_competitor':          { score: 35, category: 'tech', msg: (comp) => `Utilise ${comp} (concurrent)` },
  'free_tier_tools':          { score: 10, category: 'tech', msg: 'Outils gratuits uniquement détectés' },
  
  // SEO
  'no_sitemap':               { score: 20, category: 'seo', msg: 'Pas de sitemap.xml' },
  'no_robots_txt':            { score: 10, category: 'seo', msg: 'Pas de robots.txt' },
  'no_schema_org':            { score: 25, category: 'seo', msg: 'Pas de données structurées Schema.org' },
  'sitemap_stale':            { score: 15, category: 'seo', msg: 'Sitemap non mis à jour depuis > 6 mois' },
  'few_indexed_pages':        { score: 15, category: 'seo', msg: 'Moins de 10 pages indexées par Google' },
  'ssl_expiring_soon':        { score: 20, category: 'seo', msg: 'Certificat SSL expire dans < 30 jours' },
  'ssl_expired':              { score: 35, category: 'seo', msg: 'Certificat SSL expiré !' },
  'staging_detected':         { score: 30, category: 'seo', msg: 'Site en refonte détecté (staging/dev)' },
  
  // EMAIL INFRA
  'no_mx_record':             { score: 30, category: 'email', msg: 'Aucun email professionnel configuré' },
  'uses_free_email':          { score: 20, category: 'email', msg: 'Utilise @gmail.com au lieu de @domaine.fr' },
  'no_spf':                   { score: 15, category: 'email', msg: 'Pas de SPF — emails risquent le spam' },
  'no_dkim':                  { score: 10, category: 'email', msg: 'Pas de DKIM — emails non authentifiés' },
  'no_dmarc':                 { score: 10, category: 'email', msg: 'Pas de DMARC — vulnérable à l\'usurpation' },
  
  // GOOGLE BUSINESS
  'no_google_business':       { score: 25, category: 'google', msg: 'Pas de fiche Google Business' },
  'low_review_response':      { score: 20, category: 'google', msg: 'Moins de 20% des avis Google ont une réponse' },
  'declining_rating':         { score: 25, category: 'google', msg: 'Note Google en baisse ces 3 derniers mois' },
  'old_photos':               { score: 15, category: 'google', msg: 'Photos Google datent de > 12 mois' },
  'no_website_on_gmb':        { score: 20, category: 'google', msg: 'Pas de lien site web sur la fiche Google' },
  'recently_reopened':        { score: 30, category: 'google', msg: 'Commerce récemment réouvert' },
  
  // SOCIAL
  'instagram_dead':           { score: 25, category: 'social', msg: 'Pas de post Instagram depuis > 30 jours' },
  'engagement_drop':          { score: 20, category: 'social', msg: 'Engagement Instagram en forte baisse' },
  'no_social_presence':       { score: 20, category: 'social', msg: 'Aucune présence réseaux sociaux détectée' },
  
  // BUSINESS SIGNALS
  'hiring_marketing':         { score: 35, category: 'business', msg: 'Recrute un profil marketing/com' },
  'hiring_commercial':        { score: 25, category: 'business', msg: 'Recrute un profil commercial' },
  'received_subsidy':         { score: 30, category: 'business', msg: 'A reçu une aide/subvention digitale' },
  'new_domain':               { score: 25, category: 'business', msg: 'Domaine créé récemment' },
  'revenue_growth':           { score: 20, category: 'business', msg: 'Chiffre d\'affaires en croissance' },
  'new_director':             { score: 35, category: 'business', msg: 'Nouveau dirigeant — nouveau budget' },
  'capital_increase':         { score: 30, category: 'business', msg: 'Augmentation de capital récente' },
  'business_acquisition':     { score: 45, category: 'business', msg: 'Cession/reprise de fonds de commerce' },
  'competitor_closed':        { score: 20, category: 'business', msg: 'Un concurrent à proximité a fermé' },
  
  // WAYBACK / STAGNATION
  'site_unchanged_12m':       { score: 25, category: 'stagnation', msg: 'Site identique depuis > 12 mois' },
  'blog_dead':                { score: 15, category: 'stagnation', msg: 'Blog inactif depuis > 12 mois' },
  
  // WEATHER / TIMING
  'seasonal_opportunity':     { score: 15, category: 'timing', msg: (detail) => `Opportunité saisonnière : ${detail}` },
};
```

---

## PHASE 2 : SOURCES SITE WEB (6 modules qui scannent le domaine du prospect)

### 2.1 websiteAnalyzer.js — Claygent maison

```javascript
// Visite le site web du prospect et extrait des insights
// Utilise fetch pour le HTML + Groq pour analyser le contenu

export async function analyzeWebsite(domain) {
  const url = `https://${domain}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FMF-Scanner/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return { exists: false, statusCode: response.status };
    }
    
    const html = await response.text();
    
    // Extractions par regex (rapide, pas besoin de parser le DOM complet)
    const result = {
      exists: true,
      statusCode: 200,
      lastModified: response.headers.get('last-modified') || null,
      
      // Copyright year
      copyrightYear: extractCopyrightYear(html),
      
      // Responsive (viewport meta)
      isResponsive: /name=["']viewport["']/i.test(html),
      
      // Contact form
      hasContactForm: /<form[^>]*>/i.test(html) && /type=["'](?:email|submit)["']/i.test(html),
      
      // Analytics
      hasAnalytics: /google-analytics\.com|gtag|googletagmanager\.com|analytics\.js/i.test(html),
      hasGA4: /gtag.*G-[A-Z0-9]+/i.test(html),
      
      // Facebook Pixel
      hasFacebookPixel: /fbq\(|facebook\.net\/en_US\/fbevents/i.test(html),
      
      // Chat widgets
      hasChatWidget: /crisp\.chat|intercom|drift\.com|tawk\.to|livechat|tidio/i.test(html),
      
      // Social links
      socialLinks: {
        instagram: extractSocialLink(html, 'instagram.com'),
        facebook: extractSocialLink(html, 'facebook.com'),
        tiktok: extractSocialLink(html, 'tiktok.com'),
        linkedin: extractSocialLink(html, 'linkedin.com'),
        twitter: extractSocialLink(html, 'twitter.com') || extractSocialLink(html, 'x.com'),
      },
      
      // Hiring signals in content
      hasHiringPage: /recrut|carrière|career|rejoignez|on\s+recrute|job|offre\s+d'emploi/i.test(html),
      
      // E-commerce signals
      hasEcommerce: /add.to.cart|panier|checkout|boutique|shop/i.test(html),
      
      // Last blog post date (heuristic)
      lastBlogDate: extractLastBlogDate(html),
    };
    
    return result;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return { exists: true, timeout: true, loadTimeMs: 10000 };
    }
    return { exists: false, error: error.message };
  }
}

function extractCopyrightYear(html) {
  const match = html.match(/©\s*(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function extractSocialLink(html, platform) {
  const regex = new RegExp(`href=["'](https?://(?:www\\.)?${platform.replace('.', '\\.')}[^"']+)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

function extractLastBlogDate(html) {
  // Cherche des patterns de dates dans des sections blog/actualités
  const datePatterns = html.match(/(?:publi|écrit|posté|date)[^>]*>.*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/gi);
  if (!datePatterns || datePatterns.length === 0) return null;
  // Retourner la date la plus récente trouvée
  return datePatterns[0]; // Simplifié, Groq peut affiner
}
```

### 2.2 techStackDetector.js — Wappalyzer open-source

```javascript
// Installe wappalyzer via : npm install wappalyzer
// IMPORTANT : Wappalyzer nécessite Puppeteer. Si indisponible en Cloud Function,
// utiliser le VPS Python (94.130.184.44) comme microservice.
// Alternative légère : analyser le HTML avec des regex patterns Wappalyzer

import Wappalyzer from 'wappalyzer';

export async function detectTechStack(domain) {
  const url = `https://${domain}`;
  
  try {
    const wappalyzer = new Wappalyzer();
    await wappalyzer.init();
    
    const headers = {};
    const storage = { local: {}, session: {} };
    
    const site = await wappalyzer.open(url, headers, storage);
    const results = await site.analyze();
    await wappalyzer.destroy();
    
    // Parser les résultats
    const techStack = {
      cms: null,
      cmsVersion: null,
      ecommerce: null,
      analytics: [],
      marketing: [],
      chat: null,
      payment: null,
      framework: null,
      hosting: null,
      cdn: null,
      allTechnologies: [],
    };
    
    for (const tech of results.technologies) {
      const entry = { name: tech.name, version: tech.version, confidence: tech.confidence };
      techStack.allTechnologies.push(entry);
      
      // Classifier par catégorie
      for (const cat of tech.categories) {
        switch (cat.slug) {
          case 'cms': techStack.cms = tech.name; techStack.cmsVersion = tech.version; break;
          case 'ecommerce': techStack.ecommerce = tech.name; break;
          case 'analytics': techStack.analytics.push(tech.name); break;
          case 'marketing-automation': techStack.marketing.push(tech.name); break;
          case 'live-chat': techStack.chat = tech.name; break;
          case 'payment-processors': techStack.payment = tech.name; break;
          case 'javascript-frameworks':
          case 'web-frameworks': techStack.framework = tech.name; break;
          case 'hosting': techStack.hosting = tech.name; break;
          case 'cdn': techStack.cdn = tech.name; break;
        }
      }
    }
    
    return techStack;
  } catch (error) {
    console.error(`Tech stack detection failed for ${domain}:`, error.message);
    // Fallback : analyse HTML basique sans Wappalyzer
    return await detectTechStackFallback(domain);
  }
}

// Fallback léger si Wappalyzer échoue (regex sur le HTML)
async function detectTechStackFallback(domain) {
  try {
    const response = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'FMF-Scanner/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const headers = Object.fromEntries(response.headers);
    
    return {
      cms: detectCMS(html, headers),
      analytics: detectAnalytics(html),
      marketing: detectMarketing(html),
      chat: detectChat(html),
      ecommerce: detectEcommerce(html),
      payment: detectPayment(html),
      framework: null,
      hosting: detectHosting(headers),
      allTechnologies: [],
    };
  } catch (error) {
    return null;
  }
}

function detectCMS(html, headers) {
  if (/wp-content|wp-includes|wordpress/i.test(html)) return 'WordPress';
  if (/wix\.com|_wix/i.test(html)) return 'Wix';
  if (/squarespace/i.test(html)) return 'Squarespace';
  if (/shopify/i.test(html)) return 'Shopify';
  if (/prestashop/i.test(html)) return 'PrestaShop';
  if (/joomla/i.test(html)) return 'Joomla';
  if (/drupal/i.test(html)) return 'Drupal';
  if (headers['x-powered-by']?.includes('Next.js')) return 'Next.js';
  return null;
}

function detectAnalytics(html) {
  const found = [];
  if (/google-analytics\.com|gtag|G-[A-Z0-9]{5,}/i.test(html)) found.push('Google Analytics');
  if (/matomo|piwik/i.test(html)) found.push('Matomo');
  if (/hotjar/i.test(html)) found.push('Hotjar');
  if (/mixpanel/i.test(html)) found.push('Mixpanel');
  if (/plausible/i.test(html)) found.push('Plausible');
  return found;
}

function detectMarketing(html) {
  const found = [];
  if (/mailchimp/i.test(html)) found.push('Mailchimp');
  if (/hubspot/i.test(html)) found.push('HubSpot');
  if (/sendinblue|brevo/i.test(html)) found.push('Brevo');
  if (/activecampaign/i.test(html)) found.push('ActiveCampaign');
  if (/klaviyo/i.test(html)) found.push('Klaviyo');
  return found;
}

function detectChat(html) {
  if (/crisp\.chat/i.test(html)) return 'Crisp';
  if (/intercom/i.test(html)) return 'Intercom';
  if (/drift/i.test(html)) return 'Drift';
  if (/tawk\.to/i.test(html)) return 'Tawk.to';
  if (/tidio/i.test(html)) return 'Tidio';
  if (/livechat/i.test(html)) return 'LiveChat';
  return null;
}

function detectEcommerce(html) {
  if (/woocommerce/i.test(html)) return 'WooCommerce';
  if (/shopify/i.test(html)) return 'Shopify';
  if (/prestashop/i.test(html)) return 'PrestaShop';
  if (/magento/i.test(html)) return 'Magento';
  return null;
}

function detectPayment(html) {
  if (/stripe/i.test(html)) return 'Stripe';
  if (/paypal/i.test(html)) return 'PayPal';
  if (/mollie/i.test(html)) return 'Mollie';
  return null;
}

function detectHosting(headers) {
  const server = headers['server'] || '';
  if (/nginx/i.test(server)) return 'Nginx';
  if (/apache/i.test(server)) return 'Apache';
  if (/cloudflare/i.test(server)) return 'Cloudflare';
  if (headers['x-powered-by']?.includes('Express')) return 'Node.js/Express';
  return null;
}
```

### 2.3 seoHealthScanner.js — PageSpeed + Sitemap + Robots + Schema

```javascript
export async function scanSeoHealth(domain) {
  const [
    pagespeed,
    sitemap,
    robotsTxt,
    schemaOrg,
  ] = await Promise.allSettled([
    fetchPageSpeed(domain),
    fetchSitemap(domain),
    fetchRobotsTxt(domain),
    fetchSchemaOrg(domain),
  ]);

  return {
    lighthouseScore: pagespeed.status === 'fulfilled' ? pagespeed.value.score : null,
    lighthouseDetails: pagespeed.status === 'fulfilled' ? pagespeed.value.details : null,
    
    hasSitemap: sitemap.status === 'fulfilled' && sitemap.value.exists,
    sitemapPageCount: sitemap.status === 'fulfilled' ? sitemap.value.pageCount : 0,
    lastSitemapUpdate: sitemap.status === 'fulfilled' ? sitemap.value.lastUpdate : null,
    
    hasRobotsTxt: robotsTxt.status === 'fulfilled' && robotsTxt.value.exists,
    stagingDetected: robotsTxt.status === 'fulfilled' ? robotsTxt.value.stagingDetected : false,
    sitemapInRobots: robotsTxt.status === 'fulfilled' ? robotsTxt.value.sitemapUrl : null,
    
    hasSchemaOrg: schemaOrg.status === 'fulfilled' && schemaOrg.value.found,
    schemaTypes: schemaOrg.status === 'fulfilled' ? schemaOrg.value.types : [],
  };
}

async function fetchPageSpeed(domain) {
  // API PageSpeed Insights — GRATUITE, pas de clé requise (rate limited)
  // Avec clé API : 25 000 req/jour (gratuit sur Google Cloud Console)
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || '';
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&category=performance${keyParam}`;
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    
    const score = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);
    
    return {
      score,
      details: {
        firstContentfulPaint: data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue,
        largestContentfulPaint: data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue,
        totalBlockingTime: data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue,
      },
    };
  } catch (error) {
    return { score: null, details: null };
  }
}

async function fetchSitemap(domain) {
  const urls = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://www.${domain}/sitemap.xml`,
  ];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'FMF-Scanner/1.0' },
      });
      
      if (response.ok) {
        const xml = await response.text();
        
        // Compter les URLs
        const urlMatches = xml.match(/<loc>/gi);
        const pageCount = urlMatches ? urlMatches.length : 0;
        
        // Dernière modification
        const lastmods = xml.match(/<lastmod>([^<]+)<\/lastmod>/gi);
        let lastUpdate = null;
        if (lastmods && lastmods.length > 0) {
          const dates = lastmods.map(lm => lm.replace(/<\/?lastmod>/g, ''));
          dates.sort();
          lastUpdate = dates[dates.length - 1]; // la plus récente
        }
        
        return { exists: true, pageCount, lastUpdate };
      }
    } catch (error) {
      continue;
    }
  }
  
  return { exists: false, pageCount: 0, lastUpdate: null };
}

async function fetchRobotsTxt(domain) {
  try {
    const response = await fetch(`https://${domain}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0' },
    });
    
    if (!response.ok) return { exists: false, stagingDetected: false, sitemapUrl: null };
    
    const content = await response.text();
    
    // Détecter staging/dev dans les Disallow
    const stagingDetected = /staging|dev\.|preprod|test\./i.test(content);
    
    // Extraire l'URL du sitemap
    const sitemapMatch = content.match(/Sitemap:\s*(.+)/i);
    const sitemapUrl = sitemapMatch ? sitemapMatch[1].trim() : null;
    
    return { exists: true, stagingDetected, sitemapUrl, raw: content.substring(0, 500) };
  } catch (error) {
    return { exists: false, stagingDetected: false, sitemapUrl: null };
  }
}

async function fetchSchemaOrg(domain) {
  try {
    const response = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0' },
    });
    const html = await response.text();
    
    // Chercher JSON-LD
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    const types = [];
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<\/?script[^>]*>/gi, '');
          const parsed = JSON.parse(jsonContent);
          if (parsed['@type']) {
            types.push(Array.isArray(parsed['@type']) ? parsed['@type'][0] : parsed['@type']);
          }
        } catch (e) {
          // JSON malformé, continuer
        }
      }
    }
    
    // Chercher microdata
    const microdataTypes = html.match(/itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi);
    if (microdataTypes) {
      for (const m of microdataTypes) {
        const typeMatch = m.match(/schema\.org\/(\w+)/i);
        if (typeMatch && !types.includes(typeMatch[1])) {
          types.push(typeMatch[1]);
        }
      }
    }
    
    return { found: types.length > 0, types };
  } catch (error) {
    return { found: false, types: [] };
  }
}
```

### 2.4 emailInfraAnalyzer.js — MX/SPF/DKIM/DMARC via DNS

```javascript
import { Resolver } from 'dns/promises';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

export async function analyzeEmailInfra(domain) {
  const [mx, spf, dkim, dmarc] = await Promise.allSettled([
    resolveMX(domain),
    resolveSPF(domain),
    resolveDKIM(domain),
    resolveDMARC(domain),
  ]);
  
  const mxRecords = mx.status === 'fulfilled' ? mx.value : [];
  const spfRecord = spf.status === 'fulfilled' ? spf.value : null;
  const dkimRecord = dkim.status === 'fulfilled' ? dkim.value : null;
  const dmarcRecord = dmarc.status === 'fulfilled' ? dmarc.value : null;
  
  // Identifier le provider email
  let mxProvider = null;
  if (mxRecords.length > 0) {
    const mxHost = mxRecords[0].exchange.toLowerCase();
    if (mxHost.includes('google') || mxHost.includes('gmail')) mxProvider = 'Google Workspace';
    else if (mxHost.includes('outlook') || mxHost.includes('microsoft')) mxProvider = 'Microsoft 365';
    else if (mxHost.includes('ovh')) mxProvider = 'OVH';
    else if (mxHost.includes('ionos') || mxHost.includes('1and1')) mxProvider = 'IONOS';
    else if (mxHost.includes('gandi')) mxProvider = 'Gandi';
    else if (mxHost.includes('icloud') || mxHost.includes('apple')) mxProvider = 'iCloud';
    else if (mxHost.includes('protonmail') || mxHost.includes('proton')) mxProvider = 'ProtonMail';
    else mxProvider = mxHost;
  }
  
  return {
    hasMX: mxRecords.length > 0,
    mxProvider,
    mxRecords: mxRecords.map(r => ({ exchange: r.exchange, priority: r.priority })),
    
    hasSPF: !!spfRecord,
    spfValid: spfRecord ? !spfRecord.includes('~all') : false, // ~all = softfail
    spfRecord,
    
    hasDKIM: !!dkimRecord,
    dkimRecord,
    
    hasDMARC: !!dmarcRecord,
    dmarcPolicy: dmarcRecord ? extractDMARCPolicy(dmarcRecord) : null,
    dmarcRecord,
    
    usesFreeMail: false, // sera déterminé par le websiteAnalyzer (contact@gmail.com dans le HTML)
  };
}

async function resolveMX(domain) {
  try {
    return await resolver.resolveMx(domain);
  } catch { return []; }
}

async function resolveSPF(domain) {
  try {
    const records = await resolver.resolveTxt(domain);
    for (const record of records) {
      const txt = record.join('');
      if (txt.startsWith('v=spf1')) return txt;
    }
    return null;
  } catch { return null; }
}

async function resolveDKIM(domain) {
  // Tester les sélecteurs DKIM courants
  const selectors = ['default', 'google', 'k1', 'selector1', 'selector2', 'mail', 'dkim'];
  for (const selector of selectors) {
    try {
      const records = await resolver.resolveTxt(`${selector}._domainkey.${domain}`);
      if (records.length > 0) return records[0].join('');
    } catch { continue; }
  }
  return null;
}

async function resolveDMARC(domain) {
  try {
    const records = await resolver.resolveTxt(`_dmarc.${domain}`);
    for (const record of records) {
      const txt = record.join('');
      if (txt.startsWith('v=DMARC1')) return txt;
    }
    return null;
  } catch { return null; }
}

function extractDMARCPolicy(record) {
  const match = record.match(/p=(\w+)/);
  return match ? match[1] : null; // "none", "quarantine", "reject"
}
```

### 2.5 waybackDeltaDetector.js — Détection de stagnation

```javascript
export async function detectWaybackDelta(domain) {
  try {
    // Récupérer la version d'il y a 12 mois
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const timestamp = oneYearAgo.toISOString().replace(/[-:T]/g, '').substring(0, 8);
    
    const waybackUrl = `https://archive.org/wayback/available?url=${domain}&timestamp=${timestamp}`;
    const response = await fetch(waybackUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    
    if (!data.archived_snapshots?.closest?.available) {
      return { hasArchive: false, unchanged: false };
    }
    
    const archivedUrl = data.archived_snapshots.closest.url;
    const archivedTimestamp = data.archived_snapshots.closest.timestamp;
    
    // Récupérer le contenu archivé (seulement le title + meta description pour comparer)
    const [archivedResponse, currentResponse] = await Promise.allSettled([
      fetch(archivedUrl, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://${domain}`, { signal: AbortSignal.timeout(10000) }),
    ]);
    
    if (archivedResponse.status !== 'fulfilled' || currentResponse.status !== 'fulfilled') {
      return { hasArchive: true, archivedTimestamp, unchanged: false };
    }
    
    const archivedHtml = await archivedResponse.value.text();
    const currentHtml = await currentResponse.value.text();
    
    // Comparer les titres
    const archivedTitle = extractTitle(archivedHtml);
    const currentTitle = extractTitle(currentHtml);
    
    // Comparer les footers (copyright year)
    const archivedCopyright = extractCopyrightYear(archivedHtml);
    const currentCopyright = extractCopyrightYear(currentHtml);
    
    // Comparer la longueur du contenu (heuristique grossière)
    const contentSimilarity = calculateSimilarity(
      stripHtml(archivedHtml).substring(0, 2000),
      stripHtml(currentHtml).substring(0, 2000)
    );
    
    return {
      hasArchive: true,
      archivedTimestamp,
      archivedTitle,
      currentTitle,
      titleChanged: archivedTitle !== currentTitle,
      copyrightChanged: archivedCopyright !== currentCopyright,
      archivedCopyright,
      currentCopyright,
      contentSimilarity, // 0-1, 1 = identique
      unchanged: contentSimilarity > 0.85 && !archivedTitle !== currentTitle,
      monthsSinceChange: contentSimilarity > 0.85 ? 12 : 0,
    };
  } catch (error) {
    return { hasArchive: false, error: error.message };
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractCopyrightYear(html) {
  const match = html.match(/©\s*(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size; // Jaccard similarity
}
```

### 2.6 sslCertAnalyzer.js — Analyse du certificat SSL

```javascript
import tls from 'tls';

export async function analyzeSSLCert(domain) {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(443, domain, { servername: domain }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        
        if (!cert || !cert.valid_to) {
          resolve({ hasSSL: false });
          return;
        }
        
        const expiresAt = new Date(cert.valid_to);
        const issuedAt = new Date(cert.valid_from);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
        const certAgedays = Math.floor((now - issuedAt) / (1000 * 60 * 60 * 24));
        
        resolve({
          hasSSL: true,
          issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
          subject: cert.subject?.CN || domain,
          issuedAt: issuedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          daysUntilExpiry,
          isExpired: daysUntilExpiry < 0,
          expiringSoon: daysUntilExpiry > 0 && daysUntilExpiry < 30,
          isLetsEncrypt: (cert.issuer?.O || '').toLowerCase().includes('encrypt'),
          certAgeDays: certAgedays,
          serialNumber: cert.serialNumber,
        });
      });
      
      socket.on('error', () => {
        resolve({ hasSSL: false, error: 'Connection failed' });
      });
      
      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ hasSSL: false, error: 'Timeout' });
      });
    } catch (error) {
      resolve({ hasSSL: false, error: error.message });
    }
  });
}
```

---

## PHASE 3 : SOURCES EXTERNES (9 modules qui scannent des APIs tierces)

### 3.1 ctLogsMonitor.js — crt.sh Certificate Transparency

```javascript
// Scheduler : quotidien à 3h du matin
// Détecte les NOUVEAUX domaines .fr qui viennent d'obtenir un certificat SSL
// API crt.sh : gratuite, sans auth, sans rate limit strict

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const monitorCTLogs = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    console.log('🔐 CT Logs Monitor : Scanning nouveaux domaines .fr...');
    
    // Récupérer les certificats des dernières 24h pour les TLD .fr
    // crt.sh JSON API
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Requête par lots de mots-clés métier
    const keywords = [
      'restaurant', 'boulangerie', 'coiffeur', 'plombier', 'artisan',
      'garage', 'pizzeria', 'brasserie', 'traiteur', 'fleuriste',
      'dentiste', 'avocat', 'architecte', 'electricien', 'menuisier',
    ];
    
    const allNewDomains = [];
    
    for (const keyword of keywords) {
      try {
        const url = `https://crt.sh/?q=%25${keyword}%25.fr&output=json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        
        if (!response.ok) continue;
        
        const certs = await response.json();
        
        // Filtrer : certificats émis dans les dernières 48h
        const recentCerts = certs.filter(cert => {
          const entryDate = new Date(cert.entry_timestamp);
          return (Date.now() - entryDate.getTime()) < 48 * 60 * 60 * 1000;
        });
        
        // Extraire les domaines uniques
        for (const cert of recentCerts) {
          const domain = cert.common_name.replace('*.', '');
          if (domain.endsWith('.fr') && !domain.includes('*')) {
            allNewDomains.push({
              domain,
              keyword,
              issuedAt: cert.entry_timestamp,
              issuer: cert.issuer_name,
            });
          }
        }
        
        // Rate limiting : 1 seconde entre chaque requête crt.sh
        await sleep(1000);
      } catch (error) {
        console.warn(`CT Logs: erreur pour keyword ${keyword}:`, error.message);
      }
    }
    
    // Dédupliquer par domaine
    const uniqueDomains = [...new Map(allNewDomains.map(d => [d.domain, d])).values()];
    
    console.log(`🔐 CT Logs : ${uniqueDomains.length} nouveaux domaines .fr détectés`);
    
    // Sauvegarder comme signaux
    const batch = db.batch();
    for (const entry of uniqueDomains.slice(0, 500)) { // max 500 par batch Firestore
      const signalRef = db.collection('scanSignals').doc();
      batch.set(signalRef, {
        type: 'new_domain',
        source: 'ctLogsMonitor',
        rawData: entry,
        score: 25,
        status: 'new',
        message: `Nouveau domaine détecté : ${entry.domain} (mot-clé: ${entry.keyword})`,
        actionable: true,
        detectedAt: new Date(),
      });
    }
    await batch.commit();
    
    console.log(`✅ CT Logs : ${uniqueDomains.length} signaux sauvegardés`);
  }
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3.2 franceTravailMonitor.js — API Offres d'Emploi

```javascript
// Scheduler : quotidien à 7h du matin
// Détecte les entreprises qui recrutent des profils marketing/com/digital
// API France Travail : gratuite, OAuth2

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Mots-clés de recrutement qui signalent un besoin marketing/digital
const HIRING_KEYWORDS = [
  { keyword: 'community manager', signal: 'social_media', score: 30 },
  { keyword: 'responsable marketing', signal: 'marketing_global', score: 35 },
  { keyword: 'responsable communication', signal: 'communication', score: 35 },
  { keyword: 'webmaster', signal: 'website_management', score: 25 },
  { keyword: 'chef de projet digital', signal: 'digital_transformation', score: 40 },
  { keyword: 'graphiste', signal: 'visual_identity', score: 20 },
  { keyword: 'chargé de communication', signal: 'communication', score: 25 },
  { keyword: 'social media manager', signal: 'social_media', score: 30 },
  { keyword: 'responsable e-commerce', signal: 'ecommerce', score: 30 },
  { keyword: 'web designer', signal: 'website_redesign', score: 30 },
];

export const monitorFranceTravail = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    console.log('💼 France Travail Monitor : Scanning offres emploi...');
    
    // 1. Obtenir un token OAuth2
    const token = await getFranceTravailToken();
    if (!token) {
      console.error('❌ France Travail : impossible d\'obtenir le token OAuth2');
      return;
    }
    
    const allSignals = [];
    
    for (const { keyword, signal, score } of HIRING_KEYWORDS) {
      try {
        const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(keyword)}&range=0-49&publieeDepuis=1`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const offres = data.resultats || [];
        
        for (const offre of offres) {
          if (!offre.entreprise?.nom) continue;
          
          allSignals.push({
            type: 'hiring_signal',
            subType: signal,
            source: 'franceTravailMonitor',
            rawData: {
              offreId: offre.id,
              entreprise: offre.entreprise.nom,
              lieu: offre.lieuTravail?.libelle || null,
              codePostal: offre.lieuTravail?.codePostal || null,
              intitule: offre.intitule,
              dateCreation: offre.dateCreation,
              typeContrat: offre.typeContrat,
              secteur: offre.secteurActiviteLibelle || null,
              siret: offre.entreprise?.siret || null,
            },
            score,
            message: `${offre.entreprise.nom} recrute : "${offre.intitule}" (${keyword})`,
            actionable: true,
          });
        }
        
        await sleep(500); // Rate limiting
      } catch (error) {
        console.warn(`France Travail: erreur pour "${keyword}":`, error.message);
      }
    }
    
    console.log(`💼 France Travail : ${allSignals.length} signaux de recrutement détectés`);
    
    // Sauvegarder
    const batchSize = 500;
    for (let i = 0; i < allSignals.length; i += batchSize) {
      const batch = db.batch();
      const chunk = allSignals.slice(i, i + batchSize);
      
      for (const signal of chunk) {
        const ref = db.collection('scanSignals').doc();
        batch.set(ref, {
          ...signal,
          status: 'new',
          detectedAt: new Date(),
        });
      }
      await batch.commit();
    }
    
    console.log(`✅ France Travail : ${allSignals.length} signaux sauvegardés`);
  }
);

async function getFranceTravailToken() {
  // OAuth2 Client Credentials
  // Env vars : FRANCE_TRAVAIL_CLIENT_ID, FRANCE_TRAVAIL_CLIENT_SECRET
  // Inscription gratuite sur https://francetravail.io/portail-api
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn('⚠️ France Travail : credentials manquants');
    return null;
  }
  
  try {
    const response = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=api_offresdemploiv2 o2dsoffre`,
    });
    
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('France Travail token error:', error.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3.3 subventionsMonitor.js — Open Data Subventions

```javascript
// Scheduler : hebdomadaire (lundi 6h)
// Détecte les entreprises qui reçoivent des aides publiques digitales

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const monitorSubventions = onSchedule(
  {
    schedule: '0 6 * * 1', // Lundi 6h
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    console.log('💰 Subventions Monitor : Scanning aides aux entreprises...');
    
    // API data.gouv.fr — Subventions aux associations et entreprises
    // Dataset : https://www.data.gouv.fr/fr/datasets/subventions-aux-associations/
    // Filtrer sur les aides numériques / digitales
    
    const keywords = ['numerique', 'digital', 'site web', 'internet', 'commerce en ligne'];
    const allSignals = [];
    
    for (const keyword of keywords) {
      try {
        const url = `https://www.data.gouv.fr/api/2/datasets/community_resources/?q=${encodeURIComponent(keyword)}&page_size=50`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        // Note : la structure exacte des données dépend du dataset
        // Adapter le parsing selon les datasets disponibles
        // Les datasets France Num sont les plus pertinents
        
      } catch (error) {
        console.warn(`Subventions: erreur pour "${keyword}":`, error.message);
      }
    }
    
    // Alternative : scraper directement les listes France Num
    // https://www.francenum.gouv.fr/activateurs
    // Entreprises référencées = ont reçu ou demandé de l'aide digitale
    
    try {
      const francenumUrl = 'https://www.francenum.gouv.fr/api/node/activateur?page[limit]=100&sort=-changed';
      const response = await fetch(francenumUrl, { signal: AbortSignal.timeout(10000) });
      
      if (response.ok) {
        const data = await response.json();
        // Parser les activateurs France Num si l'API est accessible
        // Chaque activateur = entreprise qui aide les TPE/PME = partenaire potentiel
      }
    } catch (error) {
      console.warn('France Num API non accessible:', error.message);
    }
    
    console.log(`💰 Subventions : ${allSignals.length} signaux détectés`);
  }
);
```

### 3.4 weatherSeasonalityEngine.js — Météo + Saisonnalité

```javascript
// Scheduler : quotidien à 6h
// Génère des opportunités saisonnières par secteur et localisation

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Règles saisonnières par code NAF / secteur
const SEASONAL_RULES = [
  {
    sectors: ['5610A', '5610C'], // Restaurants, restauration rapide
    rules: [
      { months: [3, 4], condition: 'temp_rising', msg: 'Saison terrasse : temps de mettre à jour photos et menus en ligne' },
      { months: [11, 12], condition: 'holiday_season', msg: 'Fêtes de fin d\'année : boostez votre visibilité pour les réservations' },
    ]
  },
  {
    sectors: ['4771Z'], // Habillement
    rules: [
      { months: [1], condition: 'soldes_hiver', msg: 'Soldes d\'hiver : votre e-commerce est-il prêt ?' },
      { months: [6], condition: 'soldes_ete', msg: 'Soldes d\'été : maximisez votre visibilité en ligne' },
    ]
  },
  {
    sectors: ['4322A', '4322B', '4329A'], // Plomberie, chauffage
    rules: [
      { months: [10, 11], condition: 'cold_coming', msg: 'L\'hiver approche : les recherches "plombier urgence" vont exploser' },
    ]
  },
  {
    sectors: ['4776Z'], // Fleuristes
    rules: [
      { months: [1, 2], condition: 'before_valentine', msg: 'Saint-Valentin dans quelques semaines : êtes-vous visible en ligne ?' },
      { months: [4, 5], condition: 'before_mothers_day', msg: 'Fête des mères : boostez votre présence Google' },
    ]
  },
  {
    sectors: ['9602A', '9602B'], // Coiffure, soins
    rules: [
      { months: [5, 6], condition: 'wedding_season', msg: 'Saison des mariages : mettez en avant vos prestations' },
      { months: [8, 9], condition: 'back_to_school', msg: 'Rentrée : vos clients cherchent un nouveau look' },
    ]
  },
];

export const runSeasonalityCheck = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    console.log(`🌡️ Seasonality Engine : Mois ${currentMonth}`);
    
    // Trouver les règles actives ce mois
    const activeRules = [];
    for (const sector of SEASONAL_RULES) {
      for (const rule of sector.rules) {
        if (rule.months.includes(currentMonth)) {
          activeRules.push({
            sectors: sector.sectors,
            ...rule,
          });
        }
      }
    }
    
    if (activeRules.length === 0) {
      console.log('🌡️ Aucune règle saisonnière active ce mois');
      return;
    }
    
    console.log(`🌡️ ${activeRules.length} règles saisonnières actives`);
    
    // Optionnel : récupérer la météo pour affiner
    // API OpenWeatherMap : gratuit 1000 appels/jour
    // Env var : OPENWEATHERMAP_API_KEY (gratuit sur openweathermap.org)
    let weatherData = null;
    const weatherKey = process.env.OPENWEATHERMAP_API_KEY;
    if (weatherKey) {
      try {
        // Météo Paris comme référence France
        const url = `https://api.openweathermap.org/data/2.5/weather?q=Paris,FR&appid=${weatherKey}&units=metric`;
        const response = await fetch(url);
        weatherData = await response.json();
      } catch (error) {
        console.warn('Weather API error:', error.message);
      }
    }
    
    // Sauvegarder les opportunités saisonnières actives
    // Elles seront utilisées par le scanOrchestrator pour scorer les prospects
    await db.collection('scanSchedules').doc('seasonal_active').set({
      activeRules,
      currentMonth,
      weather: weatherData ? {
        temp: weatherData.main?.temp,
        description: weatherData.weather?.[0]?.description,
      } : null,
      updatedAt: new Date(),
    });
    
    console.log(`✅ Seasonality : ${activeRules.length} règles activées`);
  }
);
```

### 3.5 pappersFinancialMonitor.js — Données financières

```javascript
// Appelé par le scanOrchestrator pour enrichir un prospect spécifique
// API Pappers : gratuit 100 req/mois, puis €0.05/req
// Env var : PAPPERS_API_KEY (gratuit sur pappers.fr)

export async function fetchPappersData(siret) {
  const apiKey = process.env.PAPPERS_API_KEY;
  if (!apiKey || !siret) return null;
  
  try {
    const url = `https://api.pappers.fr/v2/entreprise?siret=${siret}&api_token=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      denomination: data.denomination,
      siret: data.siege?.siret,
      siren: data.siren,
      codeNaf: data.code_naf,
      libelleNaf: data.libelle_code_naf,
      dateCreation: data.date_creation,
      effectif: data.effectifs_finances || data.tranche_effectif,
      
      // Finances
      chiffreAffaires: data.finances?.[0]?.chiffre_affaires || null,
      resultatNet: data.finances?.[0]?.resultat || null,
      anneeFinances: data.finances?.[0]?.annee || null,
      
      // Dirigeants
      dirigeants: (data.representants || []).map(r => ({
        nom: `${r.prenom || ''} ${r.nom || ''}`.trim(),
        qualite: r.qualite,
        dateNaissance: r.date_de_naissance_formate,
      })),
      
      // Événements récents (BODACC)
      publications: (data.derniers_statuts || []).slice(0, 5).map(p => ({
        type: p.type,
        date: p.date_acte,
        description: p.decision,
      })),
      
      // Procédures collectives
      proceduresCollectives: data.procedure_collective || false,
      
      // Capital
      capital: data.capital,
    };
  } catch (error) {
    console.warn(`Pappers API error for ${siret}:`, error.message);
    return null;
  }
}

// Extraire les signaux financiers
export function extractFinancialSignals(pappersData) {
  if (!pappersData) return [];
  
  const signals = [];
  
  // Nouveau dirigeant (changement récent)
  // On vérifie si un dirigeant a été nommé récemment
  // (Simplifié : vérifier les publications BODACC type "nomination")
  for (const pub of (pappersData.publications || [])) {
    if (pub.type?.toLowerCase().includes('nomination') || pub.description?.toLowerCase().includes('nouveau')) {
      signals.push({
        type: 'new_director',
        source: 'pappersFinancialMonitor',
        score: 35,
        message: `Nouveau dirigeant détecté chez ${pappersData.denomination}`,
        rawData: pub,
      });
    }
  }
  
  // Procédure collective = changement de stratégie
  if (pappersData.proceduresCollectives) {
    signals.push({
      type: 'collective_procedure',
      source: 'pappersFinancialMonitor',
      score: 20,
      message: `${pappersData.denomination} : procédure collective en cours`,
    });
  }
  
  // Entreprise récente (< 12 mois)
  if (pappersData.dateCreation) {
    const creationDate = new Date(pappersData.dateCreation);
    const monthsOld = (Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 12) {
      signals.push({
        type: 'new_business',
        source: 'pappersFinancialMonitor',
        score: 25,
        message: `${pappersData.denomination} créée il y a ${Math.round(monthsOld)} mois`,
      });
    }
  }
  
  return signals;
}
```

### 3.6 à 3.9 — Modules restants (Google Business, Reviews, Social, LeBonCoin)

Pour chacun de ces modules, crée un fichier séparé dans `functions/src/scanner/sources/` en suivant le même pattern :
- Export d'une fonction principale async qui retourne des données structurées
- Export d'une fonction `extractXxxSignals()` qui retourne un tableau de signaux
- Gestion des erreurs avec try/catch et fallback gracieux
- Rate limiting entre les appels API
- Sauvegarde dans `scanSignals` collection

**googleBusinessAnalyzer.js** : Utilise l'acteur Apify `compass/google-maps-scraper` pour récupérer les données d'une fiche Google Business par nom + adresse. Extrait : rating, totalReviews, responseRate, lastPhotoDate, hasWebsiteLink, categories.

**googleReviewsMonitor.js** : Scheduler quotidien. Utilise l'acteur Apify `compass/google-maps-reviews-scraper`. Analyse le sentiment des 10 derniers avis avec Groq. Détecte les baisses de note sur 30 jours.

**socialEngagementTracker.js** : Utilise Apify pour scraper les métriques Instagram/TikTok d'un prospect. Compare avec la baseline (dernière mesure). Détecte les drops d'engagement > 30%. Détecte les comptes inactifs (pas de post depuis > 30 jours).

**leboncoinCessionsMonitor.js** : Scheduler quotidien. Utilise l'acteur Apify LeBonCoin pour scanner la catégorie "Cessions de fonds de commerce". Filtre par localisation. Le vendeur = prospect (besoin de visibilité pour vendre). L'acheteur = prospect encore plus chaud (besoin de tout).

---

## PHASE 4 : INTELLIGENCE (3 modules)

### 4.1 reverseEnrichment.js — Signal → Identification du prospect

```javascript
// Quand un signal est détecté SANS prospect associé,
// ce module tente d'identifier le prospect à partir du signal

import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function reverseEnrichFromSignal(signal) {
  let prospect = null;
  
  switch (signal.source) {
    case 'ctLogsMonitor':
      // Nouveau domaine → WHOIS → SIRENE
      prospect = await identifyFromDomain(signal.rawData.domain);
      break;
      
    case 'franceTravailMonitor':
      // Offre d'emploi → SIRET si dispo, sinon nom entreprise → SIRENE
      if (signal.rawData.siret) {
        prospect = await identifyFromSiret(signal.rawData.siret);
      } else {
        prospect = await identifyFromCompanyName(signal.rawData.entreprise, signal.rawData.codePostal);
      }
      break;
      
    case 'leboncoinCessionsMonitor':
      // Annonce cession → localisation + type de commerce → SIRENE
      prospect = await identifyFromLocation(signal.rawData.adresse, signal.rawData.secteur);
      break;
      
    default:
      break;
  }
  
  if (prospect) {
    // Lier le signal au prospect
    await db.collection('scanSignals').doc(signal.id).update({
      prospectId: prospect.id,
      status: 'linked',
      processedAt: new Date(),
    });
    
    // Déclencher un scan complet du prospect si c'est un nouveau
    return prospect;
  }
  
  return null;
}

async function identifyFromDomain(domain) {
  // 1. Essayer de trouver dans les prospects existants
  const existing = await db.collection('prospects')
    .where('website', '==', domain)
    .limit(1)
    .get();
  
  if (!existing.empty) {
    return { id: existing.docs[0].id, ...existing.docs[0].data() };
  }
  
  // 2. SIRENE lookup via le domaine
  // Utiliser l'API Recherche Entreprises existante dans le projet
  // L'appel exact dépend de l'implémentation existante dans functions/src/
  
  return null;
}

async function identifyFromSiret(siret) {
  const existing = await db.collection('prospects')
    .where('siret', '==', siret)
    .limit(1)
    .get();
  
  if (!existing.empty) {
    return { id: existing.docs[0].id, ...existing.docs[0].data() };
  }
  
  // Appeler l'API SIRENE pour récupérer les infos
  try {
    const url = `https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`;
    const token = process.env.INSEE_API_KEY;
    if (!token) return null;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    
    return {
      id: null, // nouveau prospect à créer
      siret,
      companyName: data.etablissement?.uniteLegale?.denominationUniteLegale,
      address: data.etablissement?.adresseEtablissement,
      codeNaf: data.etablissement?.uniteLegale?.activitePrincipaleUniteLegale,
    };
  } catch (error) {
    return null;
  }
}

async function identifyFromCompanyName(name, codePostal) {
  // Recherche floue dans Firestore existant
  // Puis fallback sur API Recherche Entreprises
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}${codePostal ? `&code_postal=${codePostal}` : ''}&per_page=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.results?.length > 0) {
      const result = data.results[0];
      return {
        id: null,
        siret: result.siege?.siret,
        siren: result.siren,
        companyName: result.nom_complet,
        address: result.siege?.adresse,
        codeNaf: result.activite_principale,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function identifyFromLocation(adresse, secteur) {
  // Recherche par adresse + secteur dans SIRENE
  // Utiliser geo.api.gouv.fr pour géocoder l'adresse
  return null; // Implémenter selon les besoins
}
```

### 4.2 prospectDiagnosticGenerator.js — Génère le rapport diagnostic IA

```javascript
// Utilise Groq pour générer un résumé actionnable du diagnostic

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateDiagnosticSummary(domain, signals, website, techStack, seo, email) {
  const signalsList = signals.map(s => `- ${s.message} (score: ${s.score})`).join('\n');
  
  const prompt = `Tu es un expert en marketing digital pour les TPE/PME françaises.
Analyse ce diagnostic et génère :
1. Un résumé en 2-3 phrases des problèmes principaux
2. Le message d'approche idéal pour contacter ce prospect (max 3 phrases, ton amical et professionnel)

DOMAINE : ${domain}

SIGNAUX DÉTECTÉS :
${signalsList}

SITE WEB :
- CMS : ${techStack?.cms || 'non détecté'}
- Analytics : ${website?.hasAnalytics ? 'oui' : 'non'}
- Responsive : ${website?.isResponsive ? 'oui' : 'non'}
- Score PageSpeed : ${seo?.lighthouseScore || 'N/A'}/100
- Schema.org : ${seo?.hasSchemaOrg ? 'oui' : 'non'}

EMAIL :
- Provider : ${email?.mxProvider || 'non détecté'}
- SPF : ${email?.hasSPF ? 'oui' : 'non'}
- DKIM : ${email?.hasDKIM ? 'oui' : 'non'}

Réponds UNIQUEMENT en JSON :
{
  "summary": "...",
  "approachMessage": "...",
  "topPriority": "..." // le problème le plus urgent
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Groq diagnostic error:', error.message);
    return {
      summary: `${signals.length} points d'amélioration détectés sur ${domain}`,
      approachMessage: `Bonjour, j'ai analysé votre présence digitale et identifié ${signals.length} opportunités d'amélioration. Puis-je vous en parler ?`,
      topPriority: signals[0]?.message || 'Amélioration de la présence digitale',
    };
  }
}
```

### 4.3 pixelVisitorTracker.js — Script pixel + reverse DNS

```javascript
// Cloud Function HTTP : reçoit les pings du pixel installé sur les sites clients
// Identifie les entreprises visitant le site du client

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import dns from 'dns/promises';

const db = getFirestore();

export const pixelTracker = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    memory: '256MiB',
  },
  async (req, res) => {
    // Le pixel envoie : organizationId, page visitée, IP du visiteur
    const { orgId, page, referrer } = req.query;
    const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    
    if (!orgId || !visitorIP) {
      res.status(200).send(''); // Toujours 200 (c'est un pixel)
      return;
    }
    
    try {
      // Reverse DNS pour identifier l'entreprise
      let companyName = null;
      try {
        const hostnames = await dns.reverse(visitorIP);
        if (hostnames.length > 0) {
          companyName = hostnames[0]; // ex: "host-XXX.ovh.net" ou "proxy.entreprise.fr"
        }
      } catch (error) {
        // Reverse DNS échoue souvent, c'est normal
      }
      
      // Sauvegarder la visite
      await db.collection('pixelVisits').add({
        organizationId: orgId,
        visitorIP,
        companyName,
        page: page || '/',
        referrer: referrer || null,
        visitedAt: new Date(),
        identified: !!companyName,
      });
    } catch (error) {
      console.error('Pixel tracker error:', error.message);
    }
    
    // Retourner un pixel 1x1 transparent
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.status(200).send(pixel);
  }
);

// Le script pixel à fournir aux clients FMF :
// <script>
//   (function(){
//     var img = new Image();
//     img.src = 'https://europe-west1-face-media-factory.cloudfunctions.net/pixelTracker?orgId=CLIENT_ORG_ID&page=' + encodeURIComponent(window.location.pathname) + '&referrer=' + encodeURIComponent(document.referrer);
//   })();
// </script>
```

---

## PHASE 5 : FRONTEND (3 composants React)

### 5.1 ProspectDiagnostic.jsx

Crée un composant React dans `src/components/scanner/ProspectDiagnostic.jsx` qui affiche le diagnostic complet d'un prospect. Structure :

- Header avec le domaine, le score total, et la priorité (badge coloré)
- Section "Signaux d'achat" : liste des signaux détectés avec icônes et scores
- Section "Site Web" : état du site, CMS, analytics, PageSpeed
- Section "Email" : MX provider, SPF, DKIM, DMARC avec indicateurs vert/rouge
- Section "Google Business" : note, réponses aux avis, photos
- Section "Réseaux sociaux" : engagement, fréquence de post
- Section "Message suggéré" : le message d'approche généré par Groq, avec bouton "Copier"
- Utilise Tailwind CSS, design cohérent avec le reste du dashboard FMF
- Données chargées depuis `scanResults/{prospectId}` en temps réel via `onSnapshot`

### 5.2 ScannerDashboard.jsx

Dashboard dans `src/components/scanner/ScannerDashboard.jsx` :

- Compteurs en haut : Scans aujourd'hui, Signaux détectés, Prospects haute priorité
- Tableau des derniers scans avec colonnes : Domaine, Score, Priorité, Signaux, Date
- Filtres : par priorité (critical/high/medium/low), par type de signal, par date
- Bouton "Lancer un scan" (appelle la Cloud Function `runProspectScan`)
- Graphique : répartition des signaux par catégorie (recharts)

### 5.3 SignalsFeed.jsx

Feed temps réel dans `src/components/scanner/SignalsFeed.jsx` :

- Liste scrollable des derniers signaux détectés (depuis `scanSignals`)
- Chaque signal : icône par catégorie, message, score, date, source
- Badge "Nouveau" pour les signaux status === 'new'
- Clic sur un signal → ouvre le diagnostic du prospect associé
- Filtre par source (France Travail, CT Logs, Google Reviews...)
- Pagination infinie

---

## PHASE 6 : INTÉGRATION ET TESTS

### 6.1 Export des Cloud Functions

Dans `functions/src/scanner/index.js`, exporte toutes les Cloud Functions :

```javascript
export { runProspectScan } from './scanOrchestrator.js';
export { monitorCTLogs } from './sources/ctLogsMonitor.js';
export { monitorFranceTravail } from './sources/franceTravailMonitor.js';
export { monitorSubventions } from './sources/subventionsMonitor.js';
export { runSeasonalityCheck } from './sources/weatherSeasonalityEngine.js';
export { pixelTracker } from './pixelVisitorTracker.js';
```

Puis dans le fichier principal `functions/index.js`, importe et ré-exporte.

### 6.2 Variables d'environnement à configurer

```bash
# Gratuites — Inscription requise
FRANCE_TRAVAIL_CLIENT_ID=xxx          # francetravail.io/portail-api (gratuit)
FRANCE_TRAVAIL_CLIENT_SECRET=xxx
PAPPERS_API_KEY=xxx                    # pappers.fr (gratuit 100 req/mois)
OPENWEATHERMAP_API_KEY=xxx             # openweathermap.org (gratuit 1000/jour)
GOOGLE_PAGESPEED_API_KEY=xxx           # console.cloud.google.com (gratuit 25K/jour)

# Déjà configurées dans le projet
GROQ_API_KEY=xxx                       # déjà en place
INSEE_API_KEY=xxx                      # déjà en place
```

### 6.3 Index Firestore à créer

```
# scanSignals
scanSignals: source ASC, detectedAt DESC
scanSignals: organizationId ASC, status ASC, detectedAt DESC
scanSignals: type ASC, detectedAt DESC
scanSignals: prospectId ASC, detectedAt DESC

# scanResults
scanResults: organizationId ASC, priority ASC, scannedAt DESC
scanResults: domain ASC

# pixelVisits
pixelVisits: organizationId ASC, visitedAt DESC
```

### 6.4 Tests de validation

```bash
# Après déploiement, tester chaque module manuellement :

# 1. Scan d'un site web connu
curl -X POST https://europe-west1-face-media-factory.cloudfunctions.net/runProspectScan \
  -H "Content-Type: application/json" \
  -d '{"data":{"domain":"restaurant-example.fr","organizationId":"test"}}'

# 2. Vérifier les Cloud Functions déployées
firebase functions:list

# 3. Vérifier les schedulers
firebase functions:log --only monitorCTLogs
firebase functions:log --only monitorFranceTravail

# 4. Vérifier les données Firestore
# Dans la console Firebase, vérifier les collections :
# - scanResults (doit contenir le résultat du test)
# - scanSignals (doit contenir les signaux détectés)

# 5. Tester le pixel
curl "https://europe-west1-face-media-factory.cloudfunctions.net/pixelTracker?orgId=test&page=/test"
# Doit retourner un GIF 1x1

# 6. Build frontend
npm run build
# 0 erreurs
```

### 6.5 Commandes de vérification finales

```bash
# TypeScript / ESLint
npx eslint functions/src/scanner/ --ext .js

# Pas de secrets en dur
grep -rn "sk-\|api_key.*=.*['\"]" functions/src/scanner/ 
# → doit retourner 0 résultats

# Toutes les fonctions exportées
grep -c "export" functions/src/scanner/index.js
# → doit correspondre au nombre de Cloud Functions

# Build
cd functions && npm run build
npm run build
# 0 erreurs

# Deploy
firebase deploy --only functions
firebase deploy --only hosting
```

---

## ORDRE D'EXÉCUTION STRICT

1. **Phase 1** : Core (scanOrchestrator + signalScorer + schéma Firestore)
2. **Phase 2** : Sources site web (6 modules)
   - Tester avec `runProspectScan` sur un vrai domaine
   - Vérifier que les signaux sont bien détectés et scorés
3. **Phase 3** : Sources externes (CT Logs + France Travail en priorité, puis les autres)
   - Configurer les variables d'env
   - Tester chaque scheduler manuellement une fois
4. **Phase 4** : Intelligence (reverseEnrichment + diagnostic Groq + pixel)
5. **Phase 5** : Frontend (ProspectDiagnostic + Dashboard + Feed)
6. **Phase 6** : Tests complets + déploiement

Commence par Phase 1. Lis l'architecture existante dans `functions/src/` pour comprendre les imports et patterns en place (ESM, admin SDK init, etc). Adapte le code ci-dessus aux conventions du projet.
