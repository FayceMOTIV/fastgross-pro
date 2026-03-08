/**
 * technographyEngine.js
 * Dimension 2 — Detecte le stack technique d'un site web
 *
 * 100% gratuit — scraping HTML/headers/scripts.
 */

const TECH_SIGNATURES = {
  cms: {
    'WordPress':   [/wp-content\//i, /wp-includes\//i, /wordpress/i],
    'Wix':         [/wix\.com/i, /X-Wix-/i],
    'Squarespace': [/squarespace\.com/i, /static\.squarespace/i],
    'Webflow':     [/webflow\.io/i, /\.webflow\.com/i],
    'Jimdo':       [/jimdo\.com/i, /cdn\.jim-static/i],
    'PrestaShop':  [/prestashop/i, /modules\/ps_/i],
    'Shopify':     [/cdn\.shopify\.com/i, /myshopify\.com/i, /Shopify\.theme/i],
    'WooCommerce': [/woocommerce/i, /wc-api/i],
    'Drupal':      [/drupal/i, /sites\/default\/files/i],
    'Joomla':      [/joomla/i, /\/components\/com_/i],
    'SPIP':        [/spip\.php/i, /\/spip\//i],
  },
  analytics: {
    'Google Analytics 4': [/gtag\('config',\s*'G-/i, /googletagmanager\.com\/gtag/i],
    'Google Tag Manager': [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]+/],
    'Meta Pixel':         [/connect\.facebook\.net/i, /fbq\('init'/i, /fbevents\.js/i],
    'Hotjar':             [/hotjar\.com/i, /hjid/i],
    'Matomo':             [/matomo\.js/i, /piwik\.js/i],
    'Plausible':          [/plausible\.io/i],
  },
  crm_marketing: {
    'HubSpot':         [/hubspot\.com/i, /hs-analytics/i, /hbspt\./i],
    'Mailchimp':       [/mailchimp\.com/i, /list-manage\.com/i],
    'Brevo':           [/sendinblue\.com/i, /brevo\.com/i],
    'ActiveCampaign':  [/activecampaign\.com/i],
    'Calendly':        [/calendly\.com/i],
  },
  ads: {
    'Google Ads':  [/googleadservices\.com/i, /googlesyndication/i, /AW-[0-9]+/],
    'Meta Ads':    [/connect\.facebook\.net\/.*fbevents/i],
    'LinkedIn Ads':[/snap\.licdn\.com/i],
  },
}

export async function analyzeTechnography(lead) {
  const website = lead?.website || lead?.website_url || null

  if (!website) {
    return buildDefaultResult('no_website')
  }

  const url = normalizeUrl(website)

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })

    const hasHttps = url.startsWith('https://')
    const headers = Object.fromEntries(res.headers.entries())
    const html = await res.text()

    const detected = {}
    for (const [category, techs] of Object.entries(TECH_SIGNATURES)) {
      detected[category] = {}
      for (const [techName, patterns] of Object.entries(techs)) {
        const found = patterns.some(p => p.test(html) || p.test(JSON.stringify(headers)))
        if (found) detected[category][techName] = true
      }
    }

    const { maturiteScore, maturiteLabel, opportunities, dScoreBonus } =
      calculateMaturiteScore(detected, hasHttps, html)

    return {
      cms: Object.keys(detected.cms || {}).find(Boolean) || null,
      ecommerce: detectEcommerce(detected),
      analytics: Object.keys(detected.analytics || {}),
      crm: Object.keys(detected.crm_marketing || {}).find(Boolean) || null,
      ads: Object.keys(detected.ads || {}),
      hasHttps,
      hasMobileViewport: /<meta[^>]+viewport/i.test(html),
      hasModernStack: maturiteScore >= 60,
      maturiteScore,
      maturiteLabel,
      opportunities,
      dScoreBonus,
      source: 'technography',
    }
  } catch (e) {
    return {
      cms: null, ecommerce: null, analytics: [], crm: null, ads: [],
      hasHttps: false,
      siteInaccessible: true,
      maturiteScore: 0,
      maturiteLabel: 'NEANDERTAL',
      opportunities: ['Site inaccessible ou inexistant — douleur digitale critique'],
      dScoreBonus: -5,
      source: 'technography',
    }
  }
}

function calculateMaturiteScore(detected, hasHttps, html) {
  let score = 0
  const opportunities = []

  if (hasHttps) score += 15
  else opportunities.push('Site non securise (HTTP) — risque SEO et confiance')

  const analytics = Object.keys(detected.analytics || {})
  if (analytics.includes('Google Analytics 4')) score += 20
  else if (analytics.includes('Google Tag Manager')) score += 15
  else opportunities.push('Aucun outil analytics — mesure de performance absente')

  if (analytics.includes('Meta Pixel')) score += 15
  else opportunities.push('Pas de pixel Meta — campagnes Facebook/Instagram non optimisables')

  const modernCMS = ['Webflow', 'Shopify', 'WordPress']
  const cms = Object.keys(detected.cms || {}).find(Boolean)
  if (cms && modernCMS.includes(cms)) score += 10

  if (Object.keys(detected.crm_marketing || {}).length > 0) score += 15
  else opportunities.push('Pas d\'outil CRM/email marketing detecte')

  if (Object.keys(detected.ads || {}).length > 0) score += 15
  else opportunities.push('Aucune campagne ads detectee')

  if (/<meta[^>]+viewport/i.test(html)) score += 10

  const label = score >= 85 ? 'EXPERT'
              : score >= 65 ? 'AVANCE'
              : score >= 45 ? 'MOYEN'
              : score >= 20 ? 'BASIQUE'
              : 'NEANDERTAL'

  const dScoreBonus = score < 30 ? 12
                    : score < 50 ? 8
                    : score < 70 ? 4
                    : 2

  return { maturiteScore: Math.min(100, score), maturiteLabel: label, opportunities, dScoreBonus }
}

function detectEcommerce(detected) {
  const cms = detected.cms || {}
  if (cms.Shopify) return 'Shopify'
  if (cms.WooCommerce) return 'WooCommerce'
  if (cms.PrestaShop) return 'PrestaShop'
  return null
}

function normalizeUrl(url) {
  if (!url.startsWith('http')) url = 'https://' + url
  return url.replace(/\/$/, '')
}

function buildDefaultResult(reason) {
  return {
    cms: null, ecommerce: null, analytics: [], crm: null, ads: [],
    hasHttps: false, hasModernStack: false,
    maturiteScore: 0, maturiteLabel: 'NEANDERTAL',
    opportunities: [], dScoreBonus: 0,
    reason, source: 'technography',
  }
}
