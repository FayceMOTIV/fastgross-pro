import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const RATE_LIMIT_MS = 7500; // 8/min

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
    'des que possible', 'en urgence', 'vite', 'pressé',
    'en cours', 'deja commence', 'demarrage imminent'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /\d+\s*k€/, /\d+\s*000\s*€/
  ];
  return budgetPatterns.some((pattern) => pattern.test(text));
};

const extractBudgetAmount = (text) => {
  if (!text) return null;
  const patterns = [
    /(\d+)\s*k\s*€/i,
    /(\d[\d\s]*)\s*€/,
    /budget\s*(?:de|:)?\s*(\d[\d\s]*)/i,
    /(\d[\d\s]*)\s*euros?/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1].replace(/\s/g, ''), 10);
      if (match[0].includes('k')) return value * 1000;
      return value;
    }
  }
  return null;
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

const RENOVATION_CATEGORIES = [
  'renovation-cuisine',
  'renovation-salle-de-bain',
  'extension-maison',
  'amenagement-interieur',
  'piscine-spa',
  'jardin-paysagiste',
  'toiture',
  'facade'
];

const buildLead = (item, keywords, zone) => {
  const title = item.title || item.projectTitle || '';
  const description = item.description || item.projectDescription || item.text || '';
  const fullText = `${title} ${description}`;
  const { firstName, lastName } = extractName(item.author || item.homeowner || item.userName);
  const budget = extractBudgetAmount(fullText);

  return {
    source: 'houzz',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'houzz',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: item.userId || item.projectId || item.id || null,
    intentSignal: `${title.substring(0, 150)}${budget ? ` [Budget: ${budget}€]` : ''}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.createdAt || item.publishedAt || null,
    zone: item.city || item.location || item.region || zone || null,
    rawData: { ...item, extractedBudget: budget }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'houzz_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'houzz_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];
    const searchUrls = [];

    for (const keyword of keywords) {
      const query = zone ? `${keyword} ${zone}` : keyword;
      searchUrls.push(
        `https://www.houzz.fr/discussions/recherche?q=${encodeURIComponent(query)}`
      );
    }

    for (const category of RENOVATION_CATEGORIES) {
      if (keywords.some((kw) => category.includes(kw.toLowerCase().replace(/\s+/g, '-')))) {
        searchUrls.push(`https://www.houzz.fr/discussions/${category}`);
      }
    }

    for (const startUrl of searchUrls) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'houzz_scraper_crawl',
        url: startUrl,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~web-scraper', {
        startUrls: [{ url: startUrl }],
        maxRequestsPerCrawl: Math.min(maxResults - results.length, 25),
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          const results = [];

          // Discussion/project posts
          $('.discussion-item, .project-card, .hz-discussion-feed__item, .feed-item').each((i, el) => {
            const $el = $(el);
            results.push({
              title: $el.find('.discussion-title, .project-title, h3, h2').first().text().trim(),
              description: $el.find('.discussion-body, .project-description, .excerpt, p').first().text().trim(),
              author: $el.find('.author-name, .user-name, .hz-username').first().text().trim(),
              city: $el.find('.location, .user-location').first().text().trim(),
              date: $el.find('.date, time, .timestamp').first().text().trim(),
              category: $el.find('.category, .tag').first().text().trim(),
              url: $el.find('a').first().attr('href')
            });
          });

          // Questions section
          $('.question, .hz-question').each((i, el) => {
            const $el = $(el);
            results.push({
              title: $el.find('.question-title, h3').first().text().trim(),
              description: $el.find('.question-body, .question-text').first().text().trim(),
              author: $el.find('.question-author, .hz-username').first().text().trim(),
              city: $el.find('.location').first().text().trim(),
              date: $el.find('.date, time').first().text().trim(),
              url: request.url
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
      event: 'houzz_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'houzz_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
