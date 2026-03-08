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
    'besoin rapidement', 'sos'
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

const extractZoneFromHashtags = (hashtags, zone) => {
  if (!hashtags?.length) return zone || null;
  const zoneHashtags = hashtags.filter((h) => {
    const lower = h.toLowerCase();
    return lower.includes('paris') || lower.includes('lyon') || lower.includes('marseille')
      || lower.includes('toulouse') || lower.includes('bordeaux') || lower.includes('nantes')
      || lower.includes('strasbourg') || lower.includes('lille') || lower.includes('nice')
      || lower.includes('montpellier') || lower.includes('rennes')
      || (zone && lower.includes(zone.toLowerCase()));
  });
  return zoneHashtags.length > 0 ? zoneHashtags[0].replace('#', '') : zone || null;
};

const INTENT_HASHTAGS = [
  '#besoinartisan', '#rechercheplombier', '#rechercheelectricien',
  '#cherchepeintre', '#besoinrenovation', '#travauxmaison',
  '#rechercheartisan', '#besoinservice', '#aidemaison',
  '#rechercheprestataire', '#besoinpro', '#conseilrenovation',
  '#recherchegaragiste', '#besoincoiffeur', '#recherchecoach',
  '#besoinmenage', '#recherchejardinier', '#besoindemenagement',
  '#recherchetraiteur', '#besoinphotographe', '#recherchedj'
];

const buildHashtagQueries = (keywords, zone) => {
  const hashtags = [];

  // Intent hashtags
  hashtags.push(...INTENT_HASHTAGS);

  // Keyword-based hashtags
  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase().replace(/\s+/g, '');
    hashtags.push(`#besoin${normalized}`);
    hashtags.push(`#recherche${normalized}`);
    hashtags.push(`#cherche${normalized}`);
    if (zone) {
      const normalizedZone = zone.toLowerCase().replace(/\s+/g, '');
      hashtags.push(`#${normalized}${normalizedZone}`);
      hashtags.push(`#besoin${normalized}${normalizedZone}`);
    }
  }

  // Zone-based hashtags
  if (zone) {
    const normalizedZone = zone.toLowerCase().replace(/\s+/g, '');
    hashtags.push(`#services${normalizedZone}`);
    hashtags.push(`#artisan${normalizedZone}`);
    hashtags.push(`#bonplan${normalizedZone}`);
  }

  return [...new Set(hashtags)];
};

const buildLead = (post, keywords, zone) => {
  const caption = post.caption || post.text || '';
  const hashtags = post.hashtags || [];
  const fullText = `${caption} ${hashtags.join(' ')}`;
  const detectedZone = extractZoneFromHashtags(hashtags, zone);

  const ownerUsername = post.ownerUsername || post.username || '';
  const ownerFullName = post.ownerFullName || post.fullName || '';
  const nameParts = ownerFullName.trim().split(/\s+/);
  const firstName = nameParts[0] || ownerUsername || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  return {
    source: 'instagram_local',
    sourceUrl: post.url || post.shortCode ? `https://www.instagram.com/p/${post.shortCode}/` : null,
    sourcePublicStatement: caption.substring(0, 500),
    platform: 'instagram',
    firstName,
    lastName,
    email: post.ownerEmail || null,
    phone: post.ownerPhone || null,
    company: null,
    nativeContactId: post.ownerId || post.ownerUsername || null,
    intentSignal: `${caption.substring(0, 150)} [${hashtags.slice(0, 5).join(', ')}]`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: post.timestamp || post.takenAtTimestamp
      ? new Date((post.timestamp || post.takenAtTimestamp) * 1000).toISOString()
      : null,
    zone: detectedZone,
    rawData: {
      shortCode: post.shortCode || null,
      ownerId: post.ownerId || null,
      ownerUsername,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      hashtags
    }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'instagram_local_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'instagram_local_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];
    const hashtagQueries = buildHashtagQueries(keywords, zone);

    // Process hashtags in batches
    const batchSize = 5;
    for (let i = 0; i < hashtagQueries.length; i += batchSize) {
      if (results.length >= maxResults) break;

      const batch = hashtagQueries.slice(i, i + batchSize);

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'instagram_local_scraper_batch',
        hashtags: batch,
        batchIndex: Math.floor(i / batchSize) + 1,
        timestamp: Date.now()
      }));

      const items = await runApifyActor('apify~instagram-hashtag-scraper', {
        hashtags: batch.map((h) => h.replace('#', '')),
        resultsLimit: Math.min(maxResults - results.length, 30),
        proxy: { useApifyProxy: true }
      });

      for (const item of items) {
        if (results.length >= maxResults) break;

        const lead = buildLead(item, keywords, zone);

        if (lead.intentKeywordsCount > 0) {
          // Deduplicate by nativeContactId
          const isDuplicate = results.some((r) =>
            r.nativeContactId && r.nativeContactId === lead.nativeContactId
          );
          if (!isDuplicate) {
            results.push(lead);
          }
        }
      }
    }

    console.log(JSON.stringify({
      event: 'instagram_local_scraper_complete',
      clientId,
      hashtagsSearched: hashtagQueries.length,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'instagram_local_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
