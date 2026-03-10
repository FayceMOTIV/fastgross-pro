/**
 * techStackDetector.js — Detecte la stack technologique d'un site web
 * Approche legere par analyse HTML + headers (pas de Wappalyzer/Puppeteer)
 */

/**
 * Detecte la stack technologique d'un domaine
 * @param {string} domain
 * @returns {Promise<object>} Stack technologique detectee
 */
export async function detectTechStack(domain) {
  try {
    const response = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const headers = Object.fromEntries(response.headers);

    return {
      cms: detectCMS(html, headers),
      cmsVersion: detectCMSVersion(html),
      ecommerce: detectEcommerce(html),
      analytics: detectAnalytics(html),
      marketing: detectMarketing(html),
      chat: detectChat(html),
      payment: detectPayment(html),
      framework: detectFramework(html, headers),
      hosting: detectHosting(headers),
      cdn: detectCDN(headers),
      allTechnologies: buildTechList(html, headers),
    };
  } catch (error) {
    console.warn(`Tech stack detection failed for ${domain}:`, error.message);
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
  if (/webflow/i.test(html)) return 'Webflow';
  if (/ghost/i.test(html) && /ghost-/i.test(html)) return 'Ghost';
  if (/jimdo/i.test(html)) return 'Jimdo';
  if (headers['x-powered-by']?.toLowerCase().includes('next.js')) return 'Next.js';
  if (headers['x-wix-request-id']) return 'Wix';
  return null;
}

function detectCMSVersion(html) {
  // WordPress version
  const wpVersion = html.match(/content=["']WordPress\s+([\d.]+)["']/i);
  if (wpVersion) return wpVersion[1];

  const wpMeta = html.match(/<meta\s+name=["']generator["']\s+content=["']WordPress\s+([\d.]+)["']/i);
  if (wpMeta) return wpMeta[1];

  // Joomla version
  const joomlaVersion = html.match(/<meta\s+name=["']generator["']\s+content=["']Joomla!\s+([\d.]+)["']/i);
  if (joomlaVersion) return joomlaVersion[1];

  return null;
}

function detectAnalytics(html) {
  const found = [];
  if (/google-analytics\.com|gtag|G-[A-Z0-9]{5,}/i.test(html)) found.push('Google Analytics');
  if (/googletagmanager\.com/i.test(html)) found.push('Google Tag Manager');
  if (/matomo|piwik/i.test(html)) found.push('Matomo');
  if (/hotjar/i.test(html)) found.push('Hotjar');
  if (/mixpanel/i.test(html)) found.push('Mixpanel');
  if (/plausible/i.test(html)) found.push('Plausible');
  if (/heap\.io|heapanalytics/i.test(html)) found.push('Heap');
  if (/amplitude/i.test(html)) found.push('Amplitude');
  if (/segment\.com|segment\.io/i.test(html)) found.push('Segment');
  return found;
}

function detectMarketing(html) {
  const found = [];
  if (/mailchimp/i.test(html)) found.push('Mailchimp');
  if (/hubspot/i.test(html)) found.push('HubSpot');
  if (/sendinblue|brevo/i.test(html)) found.push('Brevo');
  if (/activecampaign/i.test(html)) found.push('ActiveCampaign');
  if (/klaviyo/i.test(html)) found.push('Klaviyo');
  if (/convertkit/i.test(html)) found.push('ConvertKit');
  if (/getresponse/i.test(html)) found.push('GetResponse');
  if (/mailerlite/i.test(html)) found.push('MailerLite');
  if (/fbq\(|facebook\.net\/en_US\/fbevents/i.test(html)) found.push('Facebook Pixel');
  if (/snapchat\.com\/snap/i.test(html)) found.push('Snap Pixel');
  if (/pinterest\.com\/ct/i.test(html)) found.push('Pinterest Tag');
  if (/linkedin\.com\/px/i.test(html)) found.push('LinkedIn Insight Tag');
  return found;
}

function detectChat(html) {
  if (/crisp\.chat/i.test(html)) return 'Crisp';
  if (/intercom/i.test(html)) return 'Intercom';
  if (/drift\.com/i.test(html)) return 'Drift';
  if (/tawk\.to/i.test(html)) return 'Tawk.to';
  if (/tidio/i.test(html)) return 'Tidio';
  if (/livechat/i.test(html)) return 'LiveChat';
  if (/zendesk/i.test(html)) return 'Zendesk';
  if (/freshchat|freshdesk/i.test(html)) return 'Freshchat';
  if (/olark/i.test(html)) return 'Olark';
  return null;
}

function detectEcommerce(html) {
  if (/woocommerce/i.test(html)) return 'WooCommerce';
  if (/shopify/i.test(html)) return 'Shopify';
  if (/prestashop/i.test(html)) return 'PrestaShop';
  if (/magento/i.test(html)) return 'Magento';
  if (/bigcommerce/i.test(html)) return 'BigCommerce';
  if (/ecwid/i.test(html)) return 'Ecwid';
  if (/oxatis/i.test(html)) return 'Oxatis';
  return null;
}

function detectPayment(html) {
  const found = [];
  if (/stripe/i.test(html)) found.push('Stripe');
  if (/paypal/i.test(html)) found.push('PayPal');
  if (/mollie/i.test(html)) found.push('Mollie');
  if (/payplug/i.test(html)) found.push('PayPlug');
  if (/alma/i.test(html)) found.push('Alma');
  return found.length > 0 ? found[0] : null;
}

function detectFramework(html, headers) {
  const xPoweredBy = headers['x-powered-by'] || '';
  if (xPoweredBy.includes('Express')) return 'Node.js/Express';
  if (xPoweredBy.includes('PHP')) return 'PHP';
  if (xPoweredBy.includes('ASP.NET')) return 'ASP.NET';
  if (/react/i.test(html) && /__NEXT/i.test(html)) return 'Next.js';
  if (/nuxt/i.test(html)) return 'Nuxt.js';
  if (/gatsby/i.test(html)) return 'Gatsby';
  if (/vue/i.test(html) && /app\.__vue__/i.test(html)) return 'Vue.js';
  if (/angular/i.test(html) && /ng-/i.test(html)) return 'Angular';
  return null;
}

function detectHosting(headers) {
  const server = (headers['server'] || '').toLowerCase();
  if (/cloudflare/i.test(server)) return 'Cloudflare';
  if (/nginx/i.test(server)) return 'Nginx';
  if (/apache/i.test(server)) return 'Apache';
  if (/vercel/i.test(server) || headers['x-vercel-id']) return 'Vercel';
  if (/netlify/i.test(server) || headers['x-nf-request-id']) return 'Netlify';
  if (headers['x-github-request-id']) return 'GitHub Pages';
  if (/ovh/i.test(server)) return 'OVH';
  if (/litespeed/i.test(server)) return 'LiteSpeed';
  return server || null;
}

function detectCDN(headers) {
  if (headers['cf-ray']) return 'Cloudflare';
  if (headers['x-cdn'] === 'Imperva') return 'Imperva';
  if (headers['x-amz-cf-id']) return 'CloudFront';
  if (headers['x-fastly-request-id']) return 'Fastly';
  if (headers['x-cache']?.includes('keycdn')) return 'KeyCDN';
  return null;
}

function buildTechList(html, headers) {
  const techs = [];

  const cms = detectCMS(html, headers);
  if (cms) techs.push({ name: cms, category: 'cms' });

  const analytics = detectAnalytics(html);
  for (const a of analytics) techs.push({ name: a, category: 'analytics' });

  const marketing = detectMarketing(html);
  for (const m of marketing) techs.push({ name: m, category: 'marketing' });

  const chat = detectChat(html);
  if (chat) techs.push({ name: chat, category: 'chat' });

  const ecommerce = detectEcommerce(html);
  if (ecommerce) techs.push({ name: ecommerce, category: 'ecommerce' });

  const hosting = detectHosting(headers);
  if (hosting) techs.push({ name: hosting, category: 'hosting' });

  const cdn = detectCDN(headers);
  if (cdn) techs.push({ name: cdn, category: 'cdn' });

  return techs;
}
