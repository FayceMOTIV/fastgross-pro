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
    'fuite', 'inondation', 'degat des eaux', 'panne', 'casse', 'lache',
    'plus de chauffage', 'plus d\'eau chaude', 'court-circuit',
    'moisissure', 'infiltration', 'toit qui fuit', 'serrure bloquee',
    'chaudiere en panne', 'chauffe-eau', 'radiateur'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /pas cher/i, /economique/i, /raisonnable/i
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

const HOME_FORUMS = [
  {
    name: 'CommentCaMarche',
    searchUrl: (query) => `https://forums.commentcamarche.net/search?q=${encodeURIComponent(query)}`
  },
  {
    name: 'Systemed',
    searchUrl: (query) => `https://www.systemed.fr/forum/recherche/?q=${encodeURIComponent(query)}`
  },
  {
    name: 'BricoZone',
    searchUrl: (query) => `https://www.bricozone.fr/search/?q=${encodeURIComponent(query)}`
  },
  {
    name: 'ForumConstruire',
    searchUrl: (query) => `https://www.forumconstruire.com/construire/recherche.php?q=${encodeURIComponent(query)}`
  }
];

const HOME_SERVICE_KEYWORDS = [
  'plombier', 'electricien', 'chauffagiste', 'peintre', 'carreleur',
  'menuisier', 'serrurier', 'couvreur', 'macon', 'plaquiste',
  'charpentier', 'facade', 'isolation', 'climatisation', 'domotique',
  'chaudiere', 'chauffe-eau', 'cumulus', 'radiateur', 'pompe a chaleur',
  'fuite', 'renovation', 'travaux', 'depannage', 'installation'
];

const buildLead = (item, forumName, keywords, zone) => {
  const title = item.title || '';
  const content = item.content || item.text || item.body || '';
  const fullText = `${title} ${content}`;
  const { firstName, lastName } = extractName(item.author || item.userName || item.pseudo);
  const detectedZone = extractZoneFromText(fullText);

  const matchedHomeServices = HOME_SERVICE_KEYWORDS.filter((service) =>
    fullText.toLowerCase().includes(service)
  );

  return {
    source: 'forum_maison',
    sourceUrl: item.url || item.link || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: forumName.toLowerCase().replace(/[^a-z]/g, ''),
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: item.userId || item.authorId || item.id || null,
    intentSignal: `[${forumName}] ${title.substring(0, 150)}${matchedHomeServices.length > 0 ? ` | ${matchedHomeServices.join(', ')}` : ''}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: item.date || item.createdAt || item.publishedAt || null,
    zone: detectedZone || zone || null,
    rawData: { ...item, forumName, matchedHomeServices }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'forum_maison_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'forum_maison_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    for (const forum of HOME_FORUMS) {
      if (results.length >= maxResults) break;

      for (const keyword of keywords) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const query = zone ? `${keyword} ${zone}` : keyword;
        const searchUrl = forum.searchUrl(query);

        console.log(JSON.stringify({
          event: 'forum_maison_scraper_crawl',
          forum: forum.name,
          query,
          timestamp: Date.now()
        }));

        const items = await runApifyActor('apify~web-scraper', {
          startUrls: [{ url: searchUrl }],
          maxRequestsPerCrawl: Math.min(maxResults - results.length, 20),
          linkSelector: 'a[href*="topic"], a[href*="sujet"], a[href*="discussion"], a[href*="viewtopic"], a[href*="/t-"]',
          pageFunction: `async function pageFunction(context) {
            var $ = context.$;
            var request = context.request;
            var results = [];

            // Search results / topic listings
            var selectors = [
              '.ipsDataItem', '.topic-item', '.thread-item', '.result-item',
              '.searchResult', '.forum-result', '.topic', '.thread'
            ];

            for (var s = 0; s < selectors.length; s++) {
              $(selectors[s]).each(function(i, el) {
                var $el = $(el);
                results.push({
                  title: $el.find('h3, h2, .topic-title, .thread-title, a.title, .ipsDataItem_title').first().text().trim(),
                  content: $el.find('.excerpt, .snippet, p, .topic-excerpt, .ipsDataItem_content').first().text().trim(),
                  author: $el.find('.author, .user-name, .pseudo, .username').first().text().trim(),
                  date: $el.find('.date, time, .post-date').first().text().trim(),
                  url: $el.find('a').first().attr('href')
                });
              });
              if (results.length > 0) break;
            }

            // Individual post page fallback
            if (results.length === 0) {
              var pageTitle = $('h1, .topic-title, .thread-title, .page-title').first().text().trim();
              $('.post, .message, .forum-post, .post-content, .ipsComment').each(function(i, el) {
                var $el = $(el);
                results.push({
                  title: pageTitle,
                  content: $el.find('.post-body, .message-body, .post-text, .ipsComment_content').first().text().trim(),
                  author: $el.find('.author, .pseudo, .username, .ipsComment_author a').first().text().trim(),
                  date: $el.find('.post-date, time, .date').first().text().trim(),
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
      event: 'forum_maison_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'forum_maison_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
