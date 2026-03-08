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
    'des que possible', 'en urgence', 'vite', 'pressé',
    'aujourd\'hui', 'demain', 'cette semaine', 'besoin rapidement'
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

const extractName = (nameStr) => {
  if (!nameStr) return { firstName: null, lastName: null };
  const parts = nameStr.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const QA_PATTERNS = [
  'Ou trouver {keyword} a {zone}',
  'Cherche {keyword} {zone}',
  'Recommandation {keyword} {zone}',
  'Besoin {keyword} {zone}',
  'Bon {keyword} {zone}'
];

const buildSearchUrl = (keyword, zone) => {
  const query = zone ? `${keyword} ${zone}` : keyword;
  return `https://www.pagesjaunes.fr/pagesblanches/recherche?quoiqui=${encodeURIComponent(query)}&ou=${encodeURIComponent(zone || '')}`;
};

const buildLead = (item, keywords, zone) => {
  const question = item.question || item.title || '';
  const answer = item.answer || item.description || item.text || '';
  const fullText = `${question} ${answer}`;
  const { firstName, lastName } = extractName(item.author || item.userName);

  return {
    source: 'pagesjaunes_qa',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'pagesjaunes',
    firstName,
    lastName,
    email: null,
    phone: item.phone || null,
    company: null,
    nativeContactId: item.userId || item.id || null,
    intentSignal: question.substring(0, 200),
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.publishedAt || null,
    zone: item.city || item.location || zone || null,
    rawData: item
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'pagesjaunes_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'pagesjaunes_scraper_error',
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
        event: 'pagesjaunes_scraper_query',
        keyword,
        zone,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~web-scraper', {
        startUrls: [{ url: searchUrl }],
        maxRequestsPerCrawl: Math.min(maxResults - results.length, 30),
        linkSelector: 'a[href*="question"], a[href*="avis"]',
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          const results = [];

          // Q&A section entries
          $('.question-item, .qa-item, .avis-item, .review-item').each((i, el) => {
            const $el = $(el);
            results.push({
              question: $el.find('.question-text, .qa-question, h3').first().text().trim(),
              answer: $el.find('.answer-text, .qa-answer, .response').first().text().trim(),
              author: $el.find('.author, .user-name, .reviewer-name').first().text().trim(),
              city: $el.find('.location, .city').first().text().trim(),
              date: $el.find('.date, time').first().text().trim(),
              url: request.url
            });
          });

          // Also capture search questions from community
          $('.community-question, .forum-post').each((i, el) => {
            const $el = $(el);
            results.push({
              question: $el.find('.post-title, .question-title').first().text().trim(),
              description: $el.find('.post-body, .question-body').first().text().trim(),
              author: $el.find('.post-author').first().text().trim(),
              city: $el.find('.post-location').first().text().trim(),
              date: $el.find('.post-date').first().text().trim(),
              url: $el.find('a').first().attr('href')
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
      event: 'pagesjaunes_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pagesjaunes_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
