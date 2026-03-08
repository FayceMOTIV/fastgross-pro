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
    'des que possible', 'en urgence', 'vite', 'help', 'aide',
    'sos', 'au secours', 'besoin rapidement'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /pas cher/i, /bon plan/i
  ];
  return budgetPatterns.some((pattern) => pattern.test(text));
};

const countIntentKeywords = (text, keywords) => {
  if (!text || !keywords?.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
};

const extractZoneFromText = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  const cityPattern = /(?:a|sur|dans|pres de|region|secteur)\s+(paris|lyon|marseille|toulouse|bordeaux|nantes|strasbourg|lille|nice|montpellier|rennes|grenoble|rouen|toulon|dijon|angers|nimes|clermont|le havre|reims|saint-etienne|brest|le mans|aix|amiens|tours|limoges|metz|besancon|perpignan|orleans|caen|mulhouse|nancy)/i;
  const match = lower.match(cityPattern);
  if (match) return match[1];
  return null;
};

const INTENT_SEARCH_QUERIES = [
  'besoin artisan', 'cherche prestataire', 'recherche service',
  'qui connait un bon', 'vous connaissez', 'recommandation',
  'conseil pour trouver', 'besoin aide'
];

const buildLeadFromComment = (comment, videoInfo, keywords, zone) => {
  const text = comment.text || comment.comment || '';
  const detectedZone = extractZoneFromText(text);

  const username = comment.uniqueId || comment.username || '';
  const nickname = comment.nickname || comment.name || '';
  const nameParts = nickname.trim().split(/\s+/);
  const firstName = nameParts[0] || username || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  const videoDesc = videoInfo?.description || videoInfo?.text || '';

  return {
    source: 'tiktok_comments',
    sourceUrl: videoInfo?.webVideoUrl || videoInfo?.url || null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'tiktok',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: comment.userId || comment.uniqueId || null,
    intentSignal: `[Comment on: ${videoDesc.substring(0, 100)}] ${text.substring(0, 150)}`,
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text),
    budgetMentioned: detectBudget(text),
    postedAt: comment.createTime
      ? new Date(comment.createTime * 1000).toISOString()
      : null,
    zone: detectedZone || zone || null,
    rawData: {
      commentId: comment.cid || comment.id || null,
      username,
      videoId: videoInfo?.id || null,
      videoDesc: videoDesc.substring(0, 200),
      likesCount: comment.diggCount || comment.likes || 0
    }
  };
};

const buildLeadFromVideo = (video, keywords, zone) => {
  const description = video.description || video.text || '';
  const hashtags = video.hashtags || [];
  const fullText = `${description} ${hashtags.map((h) => h.name || h).join(' ')}`;
  const detectedZone = extractZoneFromText(fullText);

  const username = video.authorMeta?.name || video.author?.uniqueId || '';
  const nickname = video.authorMeta?.nickName || video.author?.nickname || '';
  const nameParts = nickname.trim().split(/\s+/);
  const firstName = nameParts[0] || username || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  return {
    source: 'tiktok',
    sourceUrl: video.webVideoUrl || video.url || null,
    sourcePublicStatement: description.substring(0, 500),
    platform: 'tiktok',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: video.authorMeta?.id || video.author?.id || null,
    intentSignal: description.substring(0, 200),
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: video.createTimeISO || video.createTime
      ? new Date(video.createTime * 1000).toISOString()
      : null,
    zone: detectedZone || zone || null,
    rawData: {
      videoId: video.id || null,
      username,
      playCount: video.playCount || 0,
      commentCount: video.commentCount || 0,
      hashtags: hashtags.map((h) => h.name || h)
    }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'tiktok_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'tiktok_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    // Phase 1: Search videos by keywords
    const searchQueries = [];
    for (const keyword of keywords) {
      searchQueries.push(zone ? `${keyword} ${zone}` : keyword);
    }
    for (const intentQuery of INTENT_SEARCH_QUERIES.slice(0, 3)) {
      for (const keyword of keywords.slice(0, 2)) {
        searchQueries.push(`${intentQuery} ${keyword}`);
      }
    }

    const uniqueQueries = [...new Set(searchQueries)];

    for (const query of uniqueQueries) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'tiktok_scraper_search',
        query,
        timestamp: Date.now()
      }));

      // Search for videos
      const videos = await runApifyActor('clockworks~tiktok-scraper', {
        searchQueries: [query],
        resultsPerPage: Math.min(maxResults - results.length, 20),
        shouldDownloadVideos: false,
        proxy: { useApifyProxy: true }
      });

      for (const video of videos) {
        if (results.length >= maxResults) break;

        // Check video description for intent
        const videoLead = buildLeadFromVideo(video, keywords, zone);
        if (videoLead.intentKeywordsCount > 0) {
          const isDuplicate = results.some((r) =>
            r.nativeContactId && r.nativeContactId === videoLead.nativeContactId
          );
          if (!isDuplicate) {
            results.push(videoLead);
          }
        }
      }
    }

    // Phase 2: Scrape comments on relevant videos for service requests
    if (results.length < maxResults) {
      for (const keyword of keywords.slice(0, 3)) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const query = zone ? `${keyword} ${zone}` : keyword;

        console.log(JSON.stringify({
          event: 'tiktok_scraper_comments',
          query,
          timestamp: Date.now()
        }));

        const commentResults = await runApifyActor('clockworks~tiktok-comments-scraper', {
          searchQueries: [query],
          maxComments: Math.min(maxResults - results.length, 30),
          proxy: { useApifyProxy: true }
        });

        for (const comment of commentResults) {
          if (results.length >= maxResults) break;

          const text = comment.text || comment.comment || '';
          if (countIntentKeywords(text, keywords) > 0) {
            const lead = buildLeadFromComment(
              comment,
              { description: query, url: comment.videoUrl },
              keywords,
              zone
            );

            const isDuplicate = results.some((r) =>
              r.nativeContactId && r.nativeContactId === lead.nativeContactId
            );
            if (!isDuplicate) {
              results.push(lead);
            }
          }
        }
      }
    }

    console.log(JSON.stringify({
      event: 'tiktok_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'tiktok_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
