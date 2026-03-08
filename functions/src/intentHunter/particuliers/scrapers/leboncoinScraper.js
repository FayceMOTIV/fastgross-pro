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
    'aujourd\'hui', 'ce soir', 'demain', 'cette semaine'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i
  ];
  return budgetPatterns.some((pattern) => pattern.test(text));
};

const countIntentKeywords = (text, keywords) => {
  if (!text || !keywords?.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
};

const extractPhoneFromText = (text) => {
  if (!text) return null;
  const phonePattern = /(?:(?:\+33|0033|0)\s*[1-9])(?:[\s.-]*\d{2}){4}/;
  const match = text.match(phonePattern);
  return match ? match[0].replace(/[\s.-]/g, '') : null;
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
  const title = item.title || item.subject || '';
  const description = item.description || item.body || item.text || '';
  const fullText = `${title} ${description}`;
  const { firstName, lastName } = extractName(
    item.owner?.name || item.sellerName || item.author || null
  );
  const phone = item.phone || item.owner?.phone || extractPhoneFromText(description);

  return {
    source: 'leboncoin',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'leboncoin',
    firstName,
    lastName,
    email: item.email || null,
    phone,
    company: null,
    nativeContactId: item.listId || item.id || item.owner?.storeId || null,
    intentSignal: title.substring(0, 200),
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.firstPublicationDate || item.indexDate || item.date || null,
    zone: item.location?.city || item.location?.department_name || zone || null,
    rawData: item
  };
};

const buildSearchUrl = (keyword, zone) => {
  const baseUrl = 'https://www.leboncoin.fr/recherche';
  const params = new URLSearchParams({
    text: keyword,
    category: '92' // Services category
  });
  if (zone) {
    params.set('locations', zone);
  }
  return `${baseUrl}?${params.toString()}`;
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'leboncoin_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'leboncoin_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    for (const keyword of keywords) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      const searchUrl = buildSearchUrl(keyword, zone);

      console.log(JSON.stringify({
        event: 'leboncoin_scraper_query',
        keyword,
        zone,
        url: searchUrl,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~web-scraper', {
        startUrls: [{ url: searchUrl }],
        maxRequestsPerCrawl: Math.min(maxResults - results.length, 30),
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          const results = [];
          $('[data-qa-id="aditem_container"], .styles_adCard, .aditem_container').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a').first().attr('href');
            results.push({
              title: $el.find('[data-qa-id="aditem_title"], .aditem_title').first().text().trim(),
              description: $el.find('[data-qa-id="aditem_description"]').first().text().trim(),
              price: $el.find('[data-qa-id="aditem_price"]').first().text().trim(),
              location: {
                city: $el.find('[data-qa-id="aditem_location"]').first().text().trim()
              },
              date: $el.find('[data-qa-id="aditem_date"]').first().text().trim(),
              url: link ? (link.startsWith('http') ? link : 'https://www.leboncoin.fr' + link) : null
            });
          });
          return results;
        }`,
        proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
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
      event: 'leboncoin_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'leboncoin_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
