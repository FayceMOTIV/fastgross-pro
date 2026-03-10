/**
 * websiteAnalyzer.js — Visite le site web du prospect et extrait des insights
 * Utilise fetch pour le HTML + regex pour detecter les elements cles
 */

/**
 * Analyse un site web et extrait des informations structurees
 * @param {string} domain - Le domaine a analyser (ex: 'restaurant-example.fr')
 * @returns {Promise<object>} Resultats structures de l'analyse
 */
export async function analyzeWebsite(domain) {
  const url = `https://${domain}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { exists: false, statusCode: response.status };
    }

    const html = await response.text();

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
      hasHiringPage: /recrut|carri[eè]re|career|rejoignez|on\s+recrute|job|offre\s+d['']emploi/i.test(html),

      // E-commerce signals
      hasEcommerce: /add.to.cart|panier|checkout|boutique|shop/i.test(html),

      // Last blog post date (heuristic)
      lastBlogDate: extractLastBlogDate(html),

      // Detect free email on page
      usesFreeMail: /contact\s*[:@]\s*\S*@(gmail|yahoo|hotmail|outlook|orange|free|sfr|laposte)\.\w+/i.test(html),

      // Page title for reference
      pageTitle: extractTitle(html),

      // Meta description
      metaDescription: extractMetaDescription(html),
    };

    return result;
  } catch (error) {
    if (error.name === 'TimeoutError' || error.code === 'ABORT_ERR') {
      return { exists: true, timeout: true, loadTimeMs: 10000 };
    }
    return { exists: false, error: error.message };
  }
}

function extractCopyrightYear(html) {
  // Match various copyright patterns: (c) 2024, &copy; 2023, etc.
  const match = html.match(/(?:©|&copy;|\(c\))\s*(\d{4})/i);
  return match ? parseInt(match[1]) : null;
}

function extractSocialLink(html, platform) {
  const escapedPlatform = platform.replace('.', '\\.');
  const regex = new RegExp(
    `href=["'](https?://(?:www\\.)?${escapedPlatform}[^"'\\s]+)["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? match[1] : null;
}

function extractLastBlogDate(html) {
  // Search for date patterns near blog/actualites/news sections
  const datePatterns = html.match(
    /(?:publi|ecrit|poste|date|article)[^>]*>.*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/gi
  );
  if (!datePatterns || datePatterns.length === 0) return null;
  return datePatterns[0].match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/)?.[0] || null;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(html) {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (match) return match[1].trim();
  // Try reversed attribute order
  const match2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  return match2 ? match2[1].trim() : null;
}
