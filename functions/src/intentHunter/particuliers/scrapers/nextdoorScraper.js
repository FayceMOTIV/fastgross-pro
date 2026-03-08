import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const RATE_LIMIT_MS = 12000; // 5/min

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

const extractName = (displayName) => {
  if (!displayName) return { firstName: null, lastName: null };
  const parts = displayName.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const buildLead = (item, keywords, zone) => {
  const text = item.text || item.body || item.content || '';
  const { firstName, lastName } = extractName(item.author || item.authorName || item.name);

  return {
    source: 'nextdoor',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'nextdoor',
    firstName,
    lastName,
    email: item.email || null,
    phone: item.phone || null,
    company: null,
    nativeContactId: item.authorId || item.id || null,
    intentSignal: text.substring(0, 200),
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text),
    budgetMentioned: detectBudget(text),
    postedAt: item.postedAt || item.createdAt || item.date || null,
    zone: item.neighborhood || item.city || zone || null,
    rawData: item
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'nextdoor_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'nextdoor_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const searchQueries = keywords.map((kw) => {
      return zone ? `${kw} ${zone}` : kw;
    });

    const results = [];

    for (const query of searchQueries) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'nextdoor_scraper_query',
        query,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~nextdoor-scraper', {
        searchQueries: [query],
        maxItems: Math.min(maxResults - results.length, 25),
        location: zone || 'France',
        proxy: { useApifyProxy: true }
      });

      for (const item of items) {
        const lead = buildLead(item, keywords, zone);
        if (lead.intentKeywordsCount > 0) {
          results.push(lead);
        }
      }
    }

    console.log(JSON.stringify({
      event: 'nextdoor_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'nextdoor_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
