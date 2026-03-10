/**
 * scanResultsAggregator.js — Fonctions utilitaires pour extraire les signaux
 * de chaque module d'analyse et les agreger en un diagnostic unifie
 */

import { buildSignal, SIGNAL_SCORES } from './signalScorer.js';

/**
 * Extrait les signaux a partir des resultats du websiteAnalyzer
 * @param {object} website - Resultats de analyzeWebsite()
 * @returns {Array<object>} Signaux detectes
 */
export function extractWebsiteSignals(website) {
  const signals = [];
  const src = 'websiteAnalyzer';

  if (!website) return signals;

  // Site not found
  if (!website.exists) {
    signals.push(buildSignal('site_not_found', src));
    return signals;
  }

  // Site timeout
  if (website.timeout) {
    signals.push(buildSignal('site_timeout', src));
    return signals;
  }

  // Not responsive
  if (website.exists && !website.isResponsive) {
    signals.push(buildSignal('site_not_responsive', src));
  }

  // No contact form
  if (website.exists && !website.hasContactForm) {
    signals.push(buildSignal('no_contact_form', src));
  }

  // No analytics
  if (website.exists && !website.hasAnalytics) {
    signals.push(buildSignal('no_analytics', src));
  }

  // No Facebook Pixel
  if (website.exists && !website.hasFacebookPixel) {
    signals.push(buildSignal('no_facebook_pixel', src));
  }

  // No chat widget
  if (website.exists && !website.hasChatWidget) {
    signals.push(buildSignal('no_chat_widget', src));
  }

  // Outdated copyright
  if (website.copyrightYear) {
    const currentYear = new Date().getFullYear();
    if (website.copyrightYear < currentYear - 1) {
      signals.push(buildSignal('copyright_outdated', src, website.copyrightYear));
    }
  }

  // Uses free email on website
  if (website.usesFreeMail) {
    signals.push(buildSignal('uses_free_email', src));
  }

  // Hiring page detected
  if (website.hasHiringPage) {
    signals.push(buildSignal('has_hiring_page', src));
  }

  // No social presence at all
  if (website.socialLinks) {
    const hasSocial = Object.values(website.socialLinks).some((v) => v);
    if (!hasSocial) {
      signals.push(buildSignal('no_social_presence', src));
    }
  }

  return signals;
}

/**
 * Extrait les signaux a partir des resultats du techStackDetector
 * @param {object} techStack - Resultats de detectTechStack()
 * @returns {Array<object>} Signaux detectes
 */
export function extractTechSignals(techStack) {
  const signals = [];
  const src = 'techStackDetector';

  if (!techStack) return signals;

  // Wix basic site
  if (techStack.cms === 'Wix') {
    signals.push(buildSignal('wix_basic', src));
  }

  // No marketing stack at all
  if (
    (!techStack.marketing || techStack.marketing.length === 0) &&
    (!techStack.analytics || techStack.analytics.length === 0)
  ) {
    signals.push(buildSignal('no_marketing_stack', src));
  }

  // Check for competitor tools (examples)
  const competitors = ['HubSpot', 'Salesforce', 'ActiveCampaign'];
  for (const comp of competitors) {
    const allTechNames = (techStack.allTechnologies || []).map((t) => t.name);
    if (allTechNames.includes(comp) || techStack.marketing?.includes(comp)) {
      signals.push(buildSignal('uses_competitor', src, comp));
    }
  }

  // Only free tier tools detected
  const freeTierIndicators = ['Google Analytics', 'Mailchimp'];
  const allTechNames = (techStack.allTechnologies || []).map((t) => t.name);
  const hasOnlyFree = allTechNames.length > 0 &&
    allTechNames.every((t) => freeTierIndicators.includes(t));
  if (hasOnlyFree) {
    signals.push(buildSignal('free_tier_tools', src));
  }

  return signals;
}

/**
 * Extrait les signaux a partir des resultats du seoHealthScanner
 * @param {object} seo - Resultats de scanSeoHealth()
 * @returns {Array<object>} Signaux detectes
 */
export function extractSeoSignals(seo) {
  const signals = [];
  const src = 'seoHealthScanner';

  if (!seo) return signals;

  // No sitemap
  if (!seo.hasSitemap) {
    signals.push(buildSignal('no_sitemap', src));
  }

  // No robots.txt
  if (!seo.hasRobotsTxt) {
    signals.push(buildSignal('no_robots_txt', src));
  }

  // No Schema.org
  if (!seo.hasSchemaOrg) {
    signals.push(buildSignal('no_schema_org', src));
  }

  // Stale sitemap (> 6 months)
  if (seo.lastSitemapUpdate) {
    const lastUpdate = new Date(seo.lastSitemapUpdate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (lastUpdate < sixMonthsAgo) {
      signals.push(buildSignal('sitemap_stale', src));
    }
  }

  // Few indexed pages
  if (seo.sitemapPageCount > 0 && seo.sitemapPageCount < 10) {
    signals.push(buildSignal('few_indexed_pages', src));
  }

  // Low lighthouse score
  if (seo.lighthouseScore !== null && seo.lighthouseScore < 50) {
    signals.push(buildSignal('lighthouse_under_50', src));
  }

  // Staging detected
  if (seo.stagingDetected) {
    signals.push(buildSignal('staging_detected', src));
  }

  return signals;
}

/**
 * Extrait les signaux a partir des resultats de l'emailInfraAnalyzer
 * @param {object} email - Resultats de analyzeEmailInfra()
 * @returns {Array<object>} Signaux detectes
 */
export function extractEmailSignals(email) {
  const signals = [];
  const src = 'emailInfraAnalyzer';

  if (!email) return signals;

  // No MX record
  if (!email.hasMX) {
    signals.push(buildSignal('no_mx_record', src));
    return signals; // No point checking SPF/DKIM/DMARC without MX
  }

  // No SPF
  if (!email.hasSPF) {
    signals.push(buildSignal('no_spf', src));
  } else if (email.spfRecord && email.spfRecord.includes('~all')) {
    signals.push(buildSignal('spf_softfail', src));
  }

  // No DKIM
  if (!email.hasDKIM) {
    signals.push(buildSignal('no_dkim', src));
  }

  // No DMARC
  if (!email.hasDMARC) {
    signals.push(buildSignal('no_dmarc', src));
  }

  return signals;
}

/**
 * Extrait les signaux SSL
 * @param {object} ssl - Resultats de analyzeSSLCert()
 * @returns {Array<object>} Signaux detectes
 */
export function extractSSLSignals(ssl) {
  const signals = [];
  const src = 'sslCertAnalyzer';

  if (!ssl) return signals;

  if (!ssl.hasSSL) {
    signals.push(buildSignal('no_ssl', src));
    return signals;
  }

  if (ssl.isExpired) {
    signals.push(buildSignal('ssl_expired', src));
  } else if (ssl.expiringSoon) {
    signals.push(buildSignal('ssl_expiring_soon', src));
  }

  if (ssl.isLetsEncrypt) {
    signals.push(buildSignal('ssl_lets_encrypt', src));
  }

  return signals;
}

/**
 * Extrait les signaux de stagnation Wayback Machine
 * @param {object} wayback - Resultats de detectWaybackDelta()
 * @returns {Array<object>} Signaux detectes
 */
export function extractWaybackSignals(wayback) {
  const signals = [];
  const src = 'waybackDeltaDetector';

  if (!wayback) return signals;

  if (wayback.unchanged && wayback.monthsSinceChange >= 12) {
    signals.push(buildSignal('site_unchanged_12m', src));
  }

  return signals;
}
