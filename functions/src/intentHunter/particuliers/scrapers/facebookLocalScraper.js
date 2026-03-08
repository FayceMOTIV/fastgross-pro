import axios from 'axios';

const FACEBOOK_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const RATE_LIMIT_MS = 2000; // 30/min

const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
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

const LOCAL_GROUP_PATTERNS = [
  'Bons Plans {zone}',
  'Entraide {zone}',
  'Services {zone}',
  'Voisins {zone}',
  'Quartier {zone}',
  'Communaute {zone}',
  'Petites annonces {zone}',
  'Recommandations {zone}'
];

const searchGroups = async (zone) => {
  const queries = LOCAL_GROUP_PATTERNS.map((p) => p.replace('{zone}', zone));
  const groups = [];

  for (const query of queries) {
    await sleepWithJitter(RATE_LIMIT_MS);

    try {
      const response = await axios.get('https://graph.facebook.com/v19.0/search', {
        params: {
          q: query,
          type: 'group',
          limit: 5,
          access_token: FACEBOOK_TOKEN
        },
        timeout: 30000
      });

      const data = response.data?.data || [];
      for (const group of data) {
        groups.push({
          id: group.id,
          name: group.name,
          privacy: group.privacy
        });
      }
    } catch (error) {
      console.log(JSON.stringify({
        event: 'facebook_local_group_search_error',
        query,
        error: error.message,
        timestamp: Date.now()
      }));
    }
  }

  const uniqueGroups = [...new Map(groups.map((g) => [g.id, g])).values()];
  return uniqueGroups;
};

const fetchGroupPosts = async (groupId, limit = 25) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/${groupId}/feed`, {
      params: {
        fields: 'id,message,from,created_time,permalink_url,type',
        limit,
        access_token: FACEBOOK_TOKEN
      },
      timeout: 30000
    });
    return response.data?.data || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'facebook_local_fetch_posts_error',
      groupId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const buildLead = (post, groupName, keywords, zone) => {
  const text = post.message || '';
  const from = post.from || {};

  const nameParts = (from.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  return {
    source: 'facebook_local_groups',
    sourceUrl: post.permalink_url || null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'facebook',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: from.id || null,
    intentSignal: `[${groupName}] ${text.substring(0, 200)}`,
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text),
    budgetMentioned: detectBudget(text),
    postedAt: post.created_time || null,
    zone: zone || null,
    rawData: { ...post, groupName }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'facebook_local_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!FACEBOOK_TOKEN) {
    console.log(JSON.stringify({
      event: 'facebook_local_scraper_error',
      error: 'FACEBOOK_ACCESS_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  if (!zone) {
    console.log(JSON.stringify({
      event: 'facebook_local_scraper_error',
      error: 'Zone is required for local group search',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const groups = await searchGroups(zone);

    console.log(JSON.stringify({
      event: 'facebook_local_groups_found',
      count: groups.length,
      zone,
      timestamp: Date.now()
    }));

    const results = [];

    for (const group of groups) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      const posts = await fetchGroupPosts(group.id, 25);

      for (const post of posts) {
        if (results.length >= maxResults) break;

        const text = post.message || '';
        if (!text) continue;

        const matchCount = countIntentKeywords(text, keywords);
        if (matchCount > 0) {
          results.push(buildLead(post, group.name, keywords, zone));
        }
      }
    }

    console.log(JSON.stringify({
      event: 'facebook_local_scraper_complete',
      clientId,
      groupsScanned: groups.length,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'facebook_local_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
