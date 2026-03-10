/**
 * seoHealthScanner.js — PageSpeed + Sitemap + robots.txt + Schema.org
 */

export async function scanSeoHealth(domain) {
  const [pagespeed, sitemap, robotsTxt, schemaOrg] = await Promise.allSettled([
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
        headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
      });
      if (response.ok) {
        const xml = await response.text();
        const urlMatches = xml.match(/<loc>/gi);
        const pageCount = urlMatches ? urlMatches.length : 0;
        const lastmods = xml.match(/<lastmod>([^<]+)<\/lastmod>/gi);
        let lastUpdate = null;
        if (lastmods && lastmods.length > 0) {
          const dates = lastmods.map(lm => lm.replace(/<\/?lastmod>/g, ''));
          dates.sort();
          lastUpdate = dates[dates.length - 1];
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
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    });
    if (!response.ok) return { exists: false, stagingDetected: false, sitemapUrl: null };
    const content = await response.text();
    const stagingDetected = /staging|dev\.|preprod|test\./i.test(content);
    const sitemapMatch = content.match(/Sitemap:\s*(.+)/i);
    const sitemapUrl = sitemapMatch ? sitemapMatch[1].trim() : null;
    return { exists: true, stagingDetected, sitemapUrl };
  } catch (error) {
    return { exists: false, stagingDetected: false, sitemapUrl: null };
  }
}

async function fetchSchemaOrg(domain) {
  try {
    const response = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    });
    const html = await response.text();
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
        } catch (e) { /* JSON malformed */ }
      }
    }
    const microdataTypes = html.match(/itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi);
    if (microdataTypes) {
      for (const m of microdataTypes) {
        const typeMatch = m.match(/schema\.org\/(\w+)/i);
        if (typeMatch && !types.includes(typeMatch[1])) types.push(typeMatch[1]);
      }
    }
    return { found: types.length > 0, types };
  } catch (error) {
    return { found: false, types: [] };
  }
}
