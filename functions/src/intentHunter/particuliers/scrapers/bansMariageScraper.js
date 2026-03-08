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

const countIntentKeywords = (text, keywords) => {
  if (!text || !keywords?.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
};

const extractNamesFromBan = (text) => {
  if (!text) return [];
  const couples = [];

  const pattern1 = /(?:m\.|monsieur|mr)\s+([A-Z\u00C0-\u024F]+)\s+(\w+)\s+(?:et)\s+(?:mme|madame|mlle)\s+([A-Z\u00C0-\u024F]+)\s+(\w+)/gi;
  let match = pattern1.exec(text);
  while (match) {
    couples.push({
      person1: { lastName: match[1], firstName: match[2] },
      person2: { lastName: match[3], firstName: match[4] }
    });
    match = pattern1.exec(text);
  }

  if (couples.length === 0) {
    const pattern2 = /([A-Z\u00C0-\u024F]{2,})\s+(\w+)\s*[-\u2013\u2014&]+\s*([A-Z\u00C0-\u024F]{2,})\s+(\w+)/g;
    match = pattern2.exec(text);
    while (match) {
      couples.push({
        person1: { lastName: match[1], firstName: match[2] },
        person2: { lastName: match[3], firstName: match[4] }
      });
      match = pattern2.exec(text);
    }
  }

  return couples;
};

const extractDate = (text) => {
  if (!text) return null;
  const datePatterns = [
    /(\d{1,2})\s*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s*(\d{4})/i,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
};

const WEDDING_SERVICES = [
  'traiteur', 'photographe', 'dj', 'fleuriste', 'wedding planner',
  'robe de mariee', 'costume', 'alliance', 'faire-part',
  'salle de reception', 'decoration', 'coiffure', 'maquillage',
  'voiture', 'gateau', 'piece montee', 'voyage de noces',
  'lune de miel', 'animation', 'dragees'
];

const buildLeadsFromBan = (banItem, keywords, zone) => {
  const text = banItem.text || banItem.content || banItem.title || '';
  const couples = extractNamesFromBan(text);
  const leads = [];
  const marriageDate = extractDate(text);

  const matchedServices = WEDDING_SERVICES.filter((service) =>
    keywords.some((kw) => kw.toLowerCase().includes(service))
  );

  const intentSignal = [
    'Bans de mariage publies',
    marriageDate ? `Ceremonie: ${marriageDate}` : null,
    matchedServices.length > 0 ? `Services: ${matchedServices.join(', ')}` : null
  ].filter(Boolean).join(' - ');

  if (couples.length > 0) {
    for (const couple of couples) {
      leads.push({
        source: 'bans_mariage',
        sourceUrl: banItem.url || banItem.link || null,
        sourcePublicStatement: text.substring(0, 500),
        platform: 'mairie',
        firstName: couple.person1.firstName || null,
        lastName: couple.person1.lastName || null,
        email: null,
        phone: null,
        company: null,
        nativeContactId: `ban-${(couple.person1.lastName || '').toLowerCase()}-${(couple.person1.firstName || '').toLowerCase()}`,
        intentSignal,
        intentKeywordsCount: countIntentKeywords(text, keywords),
        urgencyDetected: true,
        budgetMentioned: false,
        postedAt: banItem.date || banItem.publishedAt || null,
        zone: banItem.city || banItem.commune || zone || null,
        rawData: { ...banItem, couple, marriageDate, matchedWeddingServices: matchedServices }
      });

      leads.push({
        source: 'bans_mariage',
        sourceUrl: banItem.url || banItem.link || null,
        sourcePublicStatement: text.substring(0, 500),
        platform: 'mairie',
        firstName: couple.person2.firstName || null,
        lastName: couple.person2.lastName || null,
        email: null,
        phone: null,
        company: null,
        nativeContactId: `ban-${(couple.person2.lastName || '').toLowerCase()}-${(couple.person2.firstName || '').toLowerCase()}`,
        intentSignal,
        intentKeywordsCount: countIntentKeywords(text, keywords),
        urgencyDetected: true,
        budgetMentioned: false,
        postedAt: banItem.date || banItem.publishedAt || null,
        zone: banItem.city || banItem.commune || zone || null,
        rawData: { ...banItem, couple, marriageDate, matchedWeddingServices: matchedServices }
      });
    }
  } else {
    leads.push({
      source: 'bans_mariage',
      sourceUrl: banItem.url || banItem.link || null,
      sourcePublicStatement: text.substring(0, 500),
      platform: 'mairie',
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      company: null,
      nativeContactId: banItem.id || null,
      intentSignal,
      intentKeywordsCount: countIntentKeywords(text, keywords),
      urgencyDetected: true,
      budgetMentioned: false,
      postedAt: banItem.date || null,
      zone: banItem.city || banItem.commune || zone || null,
      rawData: { ...banItem, marriageDate }
    });
  }

  return leads;
};

const buildMairieUrls = (zone) => {
  if (!zone) return [];
  const normalizedZone = zone.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return [
    `https://www.${normalizedZone}.fr/etat-civil/bans-de-mariage`,
    `https://www.mairie-${normalizedZone}.fr/bans-mariage`,
    `https://www.ville-${normalizedZone}.fr/etat-civil/publications-de-mariage`,
    `https://${normalizedZone}.fr/vie-municipale/etat-civil/bans-de-mariage`
  ];
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'bans_mariage_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'bans_mariage_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  if (!zone) {
    console.log(JSON.stringify({
      event: 'bans_mariage_scraper_error',
      error: 'Zone (city) is required for marriage bans search',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];
    const mairieUrls = buildMairieUrls(zone);

    await sleepWithJitter(RATE_LIMIT_MS);

    console.log(JSON.stringify({
      event: 'bans_mariage_scraper_crawl',
      urlCount: mairieUrls.length,
      zone,
      timestamp: Date.now()
    }));

    const sanitizedZone = zone.replace(/'/g, "\\'");

    const items = await runApifyActor('apify~web-scraper', {
      startUrls: mairieUrls.map((url) => ({ url })),
      maxRequestsPerCrawl: 30,
      pageFunction: `async function pageFunction(context) {
        const { $, request } = context;
        const results = [];
        var targetZone = '${sanitizedZone}';
        var selectors = [
          '.ban-mariage', '.publication-mariage', '.etat-civil-item',
          'article', '.content-item', '.actu-item', '.news-item',
          'tr', '.list-item', 'li'
        ];

        for (var s = 0; s < selectors.length; s++) {
          var selector = selectors[s];
          $(selector).each(function(i, el) {
            var $el = $(el);
            var text = $el.text().trim();
            var marriageTerms = ['mariage', 'bans', 'union', 'epoux', 'noce', 'ceremonie civile'];
            var isRelevant = marriageTerms.some(function(t) { return text.toLowerCase().indexOf(t) >= 0; });

            if (isRelevant && text.length > 20) {
              results.push({
                text: text.substring(0, 1000),
                title: $el.find('h1, h2, h3, h4, .title').first().text().trim(),
                date: $el.find('.date, time, .publication-date').first().text().trim(),
                city: targetZone,
                url: request.url
              });
            }
          });
          if (results.length > 0) break;
        }

        if (results.length === 0) {
          var pageText = $('main, .content, article, #content, .page-content').text();
          if (pageText && pageText.toLowerCase().indexOf('mariage') >= 0) {
            results.push({
              text: pageText.substring(0, 2000),
              city: targetZone,
              url: request.url,
              date: new Date().toISOString()
            });
          }
        }

        return results;
      }`,
      proxy: { useApifyProxy: true }
    });

    for (const item of items) {
      if (results.length >= maxResults) break;

      const flatItems = Array.isArray(item) ? item : [item];
      for (const flatItem of flatItems) {
        if (results.length >= maxResults) break;
        const banLeads = buildLeadsFromBan(flatItem, keywords, zone);
        results.push(...banLeads.slice(0, maxResults - results.length));
      }
    }

    console.log(JSON.stringify({
      event: 'bans_mariage_scraper_complete',
      clientId,
      leadsFound: results.length,
      zone,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'bans_mariage_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
