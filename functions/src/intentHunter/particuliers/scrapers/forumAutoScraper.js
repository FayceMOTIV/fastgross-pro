import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const RATE_LIMIT_MS = 5000; // 12/min

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
    'en panne', 'tombe en panne', 'ne demarre plus', 'voyant allume',
    'controle technique', 'ct a passer', 'accident', 'casse',
    'immobilise', 'coincee', 'fumee', 'bruit suspect'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /pas cher/i, /economique/i, /bon rapport/i
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
  const cleaned = nameStr.replace(/\d+/g, '').trim();
  const parts = cleaned.split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const extractZoneFromText = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  const cityPattern = /(?:a|sur|dans|pres de|region|secteur|departement)\s+([a-z\u00C0-\u024F\s-]+?)(?:\s*[.,!?)]|$)/i;
  const match = lower.match(cityPattern);
  if (match) return match[1].trim();
  const postalMatch = lower.match(/(\d{5})/);
  if (postalMatch) return postalMatch[1];
  return null;
};

const AUTO_FORUMS = [
  {
    name: 'Caradisiac',
    searchUrl: (query) => `https://forum.caradisiac.com/search/?q=${encodeURIComponent(query)}&type=forums_topic`
  },
  {
    name: 'LArgus',
    searchUrl: (query) => `https://forum.largus.fr/search/?q=${encodeURIComponent(query)}`
  },
  {
    name: 'ForumAuto',
    searchUrl: (query) => `https://www.forum-auto.com/recherche/?q=${encodeURIComponent(query)}`
  }
];

const AUTO_SERVICE_KEYWORDS = [
  'garagiste', 'mecanicien', 'carrossier', 'electricien auto',
  'controle technique', 'revision', 'vidange', 'freins', 'embrayage',
  'distribution', 'pneus', 'amortisseurs', 'echappement',
  'climatisation auto', 'diagnostic', 'reparation', 'depannage'
];

const buildLead = (item, forumName, keywords, zone) => {
  const title = item.title || '';
  const content = item.content || item.text || item.body || '';
  const fullText = `${title} ${content}`;
  const { firstName, lastName } = extractName(item.author || item.userName || item.pseudo);
  const detectedZone = extractZoneFromText(fullText);

  const matchedAutoServices = AUTO_SERVICE_KEYWORDS.filter((service) =>
    fullText.toLowerCase().includes(service)
  );

  return {
    source: 'forum_auto',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: forumName.toLowerCase().replace(/[^a-z]/g, ''),
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: item.userId || item.authorId || item.id || null,
    intentSignal: `[${forumName}] ${title.substring(0, 150)}${matchedAutoServices.length > 0 ? ` | ${matchedAutoServices.join(', ')}` : ''}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.createdAt || item.publishedAt || null,
    zone: detectedZone || zone || null,
    rawData: { ...item, forumName, matchedAutoServices }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'forum_auto_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'forum_auto_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    for (const forum of AUTO_FORUMS) {
      if (results.length >= maxResults) break;

      for (const keyword of keywords) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const query = zone ? `${keyword} ${zone}` : keyword;
        const searchUrl = forum.searchUrl(query);

        console.log(JSON.stringify({
          event: 'forum_auto_scraper_crawl',
          forum: forum.name,
          query,
          timestamp: Date.now()
        }));

        const items = await runApifyActor('apify~web-scraper', {
          startUrls: [{ url: searchUrl }],
          maxRequestsPerCrawl: Math.min(maxResults - results.length, 20),
          linkSelector: 'a[href*="topic"], a[href*="sujet"], a[href*="discussion"], a[href*="viewtopic"]',
          pageFunction: `async function pageFunction(context) {
            var $ = context.$;
            var request = context.request;
            var results = [];

            // Search result items
            $('.ipsDataItem, .topic-item, .thread-item, .result-item, .searchResult').each(function(i, el) {
              var $el = $(el);
              results.push({
                title: $el.find('.ipsDataItem_title, .topic-title, h3, h2, a.title').first().text().trim(),
                content: $el.find('.ipsDataItem_content, .topic-excerpt, .result-snippet, p').first().text().trim(),
                author: $el.find('.ipsDataItem_meta a, .author, .user-name, .pseudo').first().text().trim(),
                date: $el.find('.ipsDataItem_date, .date, time').first().text().trim(),
                url: $el.find('a').first().attr('href')
              });
            });

            // Forum post page
            if (results.length === 0) {
              var postTitle = $('h1, .ipsType_pageTitle, .topic-title').first().text().trim();
              $('.ipsComment, .post, .message, .forum-post').each(function(i, el) {
                var $el = $(el);
                results.push({
                  title: postTitle,
                  content: $el.find('.ipsComment_content, .post-body, .message-body, [data-role="commentContent"]').first().text().trim(),
                  author: $el.find('.ipsComment_author a, .author, .username').first().text().trim(),
                  date: $el.find('.ipsComment_meta time, .post-date, time').first().text().trim(),
                  url: request.url
                });
              });
            }

            return results;
          }`,
          proxy: { useApifyProxy: true }
        });

        for (const item of items) {
          const flatItems = Array.isArray(item) ? item : [item];
          for (const flatItem of flatItems) {
            if (results.length >= maxResults) break;
            const lead = buildLead(flatItem, forum.name, keywords, zone);
            if (lead.intentKeywordsCount > 0) {
              results.push(lead);
            }
          }
        }
      }
    }

    console.log(JSON.stringify({
      event: 'forum_auto_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'forum_auto_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
