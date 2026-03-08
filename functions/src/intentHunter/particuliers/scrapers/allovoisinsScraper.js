import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const RATE_LIMIT_MS = 6000; // 10/min

const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
};

const runApifyActor = async (actorId, input) => {
  const response = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { timeout: 120000 }
  );
  const runId = response.data?.data?.id;
  if (!runId) throw new Error('No run ID');

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const status = statusRes.data?.data?.status;
    if (status === 'SUCCEEDED') {
      const datasetId = statusRes.data?.data?.defaultDatasetId;
      const itemsRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
      );
      return itemsRes.data || [];
    }
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Actor ${status}`);
    }
  }
  throw new Error('Actor run timeout');
};

const detectUrgency = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  const urgencyTerms = [
    'urgent', 'urgence', 'au plus vite', 'rapidement', 'immediatement',
    'des que possible', 'asap', 'en urgence', 'vite', 'pressé',
    'aujourd\'hui', 'ce soir', 'demain', 'cette semaine', 'degat des eaux',
    'fuite', 'panne', 'casse', 'bloque'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /gratuit/i, /remunere/i, /paye/i
  ];
  return budgetPatterns.some((pattern) => pattern.test(text));
};

const countIntentKeywords = (text, keywords) => {
  if (!text || !keywords?.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
};

const extractName = (nameStr) => {
  if (!nameStr) return { firstName: null, lastName: null };
  const parts = nameStr.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const buildLead = (item, keywords, zone) => {
  const title = item.title || '';
  const description = item.description || item.text || '';
  const fullText = `${title} ${description}`;
  const { firstName, lastName } = extractName(item.author || item.userName || item.name);

  return {
    source: 'allovoisins',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'allovoisins',
    firstName,
    lastName,
    email: item.email || null,
    phone: item.phone || null,
    company: null,
    nativeContactId: item.userId || item.authorId || null,
    intentSignal: `${title.substring(0, 200)}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.createdAt || item.publishedAt || null,
    zone: item.city || item.location || item.postalCode || zone || null,
    rawData: item
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'allovoisins_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'allovoisins_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const searchUrls = keywords.map((kw) => {
      const searchTerm = zone ? `${kw} ${zone}` : kw;
      return `https://www.allovoisins.com/recherche?q=${encodeURIComponent(searchTerm)}`;
    });

    const results = [];

    for (const startUrl of searchUrls) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'allovoisins_scraper_crawl',
        url: startUrl,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~web-scraper', {
        startUrls: [{ url: startUrl }],
        maxRequestsPerCrawl: Math.min(maxResults - results.length, 30),
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          const results = [];
          $('.ad-card, .service-card, .annonce-item, [data-testid="ad-card"]').each((i, el) => {
            const $el = $(el);
            results.push({
              title: $el.find('.ad-title, .service-title, h3, h2').first().text().trim(),
              description: $el.find('.ad-description, .service-description, p').first().text().trim(),
              author: $el.find('.user-name, .author-name').first().text().trim(),
              city: $el.find('.location, .city, .ad-location').first().text().trim(),
              date: $el.find('.date, .ad-date, time').first().text().trim(),
              url: $el.find('a').first().attr('href'),
              phone: $el.find('[href^="tel:"]').first().attr('href')?.replace('tel:', '')
            });
          });
          return results;
        }`,
        proxy: { useApifyProxy: true }
      });

      for (const item of items) {
        const flatItems = Array.isArray(item) ? item : [item];
        for (const flatItem of flatItems) {
          if (results.length >= maxResults) break;
          const lead = buildLead(flatItem, keywords, zone);
          if (lead.intentKeywordsCount > 0) {
            results.push(lead);
          }
        }
      }
    }

    console.log(JSON.stringify({
      event: 'allovoisins_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'allovoisins_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
