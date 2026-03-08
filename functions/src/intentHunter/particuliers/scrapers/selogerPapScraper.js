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
    'des que possible', 'demenagement', 'emmenager rapidement',
    'libre immediatement', 'disponible de suite', 'cherche activement'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /loyer\s*max/i, /prix\s*max/i, /\d+\s*€\s*\/\s*mois/,
    /\d+\s*€\s*cc/i, /\d+\s*€\s*hc/i
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

const estimateMovingTimeline = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('immediatement') || lower.includes('de suite')) return '0-1 mois';
  if (lower.includes('prochain') || lower.includes('bientot')) return '1-2 mois';
  if (lower.includes('recherche') || lower.includes('cherche')) return '1-3 mois';
  return '1-3 mois';
};

const SELOGER_SEARCH_TYPES = [
  { type: 'location', label: 'Location' },
  { type: 'achat', label: 'Achat' }
];

const buildLead = (item, keywords, zone, searchType) => {
  const title = item.title || '';
  const description = item.description || item.text || '';
  const fullText = `${title} ${description}`;
  const { firstName, lastName } = extractName(item.contactName || item.author || item.agentName);
  const phone = item.phone || extractPhoneFromText(description);
  const timeline = estimateMovingTimeline(fullText);

  return {
    source: 'seloger_pap',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: item.url?.includes('pap.fr') ? 'pap' : 'seloger',
    firstName,
    lastName,
    email: item.email || null,
    phone,
    company: null,
    nativeContactId: item.listingId || item.id || null,
    intentSignal: `[${searchType}] ${title.substring(0, 150)}${timeline ? ` [Emmenagement: ${timeline}]` : ''}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.publishedAt || item.firstPublicationDate || null,
    zone: item.city || item.zipCode || item.location || zone || null,
    rawData: { ...item, searchType, estimatedTimeline: timeline }
  };
};

const buildSearchUrls = (keywords, zone) => {
  const urls = [];

  if (zone) {
    urls.push(
      `https://www.seloger.com/list.htm?projects=1&types=1,2&places=[{ci:${encodeURIComponent(zone)}}]&enterprise=0&qsVersion=1.0`,
      `https://www.pap.fr/annonce/locations-${zone.toLowerCase().replace(/\s+/g, '-')}`
    );
  }

  for (const keyword of keywords) {
    const query = zone ? `${keyword} ${zone}` : keyword;
    urls.push(
      `https://www.seloger.com/list.htm?projects=1&types=1,2&enterprise=0&qsVersion=1.0&text=${encodeURIComponent(query)}`,
      `https://www.pap.fr/annonce/locations?recherche[q]=${encodeURIComponent(query)}`
    );
  }

  return urls;
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'seloger_pap_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'seloger_pap_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];
    const searchUrls = buildSearchUrls(keywords, zone);

    for (const startUrl of searchUrls) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      const searchType = startUrl.includes('pap.fr') ? 'PAP' : 'SeLoger';

      console.log(JSON.stringify({
        event: 'seloger_pap_scraper_crawl',
        platform: searchType,
        url: startUrl,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~web-scraper', {
        startUrls: [{ url: startUrl }],
        maxRequestsPerCrawl: Math.min(maxResults - results.length, 25),
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;
          const results = [];

          // SeLoger listings
          $('[data-testid="sl.card-container"], .Card__CardContainer, .listing-item').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a').first().attr('href');
            results.push({
              title: $el.find('[data-testid="sl.card-title"], .Card__Title, .listing-title').first().text().trim(),
              description: $el.find('[data-testid="sl.card-description"], .Card__Description').first().text().trim(),
              price: $el.find('[data-testid="sl.card-price"], .Card__Price, .listing-price').first().text().trim(),
              city: $el.find('[data-testid="sl.card-city"], .Card__City, .listing-city').first().text().trim(),
              surface: $el.find('[data-testid="sl.card-surface"], .Card__Surface').first().text().trim(),
              rooms: $el.find('[data-testid="sl.card-rooms"], .Card__Rooms').first().text().trim(),
              date: $el.find('.listing-date, .Card__Date').first().text().trim(),
              contactName: $el.find('.agency-name, .Card__Agency').first().text().trim(),
              url: link ? (link.startsWith('http') ? link : 'https://www.seloger.com' + link) : request.url
            });
          });

          // PAP listings
          $('.search-list-item, .search-results-item, .annonce').each((i, el) => {
            const $el = $(el);
            const link = $el.find('a').first().attr('href');
            results.push({
              title: $el.find('.item-title, .annonce-titre, h3').first().text().trim(),
              description: $el.find('.item-description, .annonce-description, p').first().text().trim(),
              price: $el.find('.item-price, .annonce-prix').first().text().trim(),
              city: $el.find('.item-locality, .annonce-ville').first().text().trim(),
              date: $el.find('.item-date, .annonce-date').first().text().trim(),
              phone: $el.find('[href^="tel:"]').first().attr('href')?.replace('tel:', ''),
              url: link ? (link.startsWith('http') ? link : 'https://www.pap.fr' + link) : request.url
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
          const lead = buildLead(flatItem, keywords, zone, searchType);
          results.push(lead);
        }
      }
    }

    console.log(JSON.stringify({
      event: 'seloger_pap_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'seloger_pap_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
