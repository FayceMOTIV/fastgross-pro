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
    'plus jamais', 'a eviter', 'scandaleux', 'honteux', 'inadmissible',
    'catastrophe', 'desastre', 'horrible', 'nul', 'arnaque',
    'je cherche', 'besoin', 'alternative', 'autre adresse',
    'recommandez', 'conseillez'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /trop cher/i, /hors de prix/i,
    /prix excessif/i, /surfactur/i, /arnaque au prix/i,
    /rapport qualite.prix/i, /pas donne/i
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

const extractDissatisfactionSignals = (text, rating) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const signals = [];

  if (rating && rating <= 2) signals.push('note_basse');
  if (lower.includes('plus jamais') || lower.includes('a eviter')) signals.push('boycott');
  if (lower.includes('arnaque') || lower.includes('surfactur')) signals.push('prix_excessif');
  if (lower.includes('sale') || lower.includes('hygiene')) signals.push('hygiene');
  if (lower.includes('froid') || lower.includes('immangeable')) signals.push('qualite_nourriture');
  if (lower.includes('impoli') || lower.includes('desagreable') || lower.includes('accueil')) signals.push('service_client');
  if (lower.includes('attente') || lower.includes('lent') || lower.includes('heure')) signals.push('lenteur');
  if (lower.includes('bruyant') || lower.includes('bruit')) signals.push('ambiance');

  return signals;
};

const REVIEW_PLATFORMS = {
  tripadvisor: {
    actorId: 'maxcopell~tripadvisor-reviews',
    buildInput: (keyword, zone, maxResults) => ({
      searchQuery: zone ? `${keyword} ${zone}` : keyword,
      maxReviews: maxResults,
      reviewRatings: ['1', '2', '3'],
      language: 'fr',
      proxy: { useApifyProxy: true }
    })
  },
  yelp: {
    actorId: 'apify~yelp-scraper',
    buildInput: (keyword, zone, maxResults) => ({
      searchTerms: [zone ? `${keyword} ${zone}` : keyword],
      maxItems: maxResults,
      reviewsLanguage: 'fr',
      proxy: { useApifyProxy: true }
    })
  },
  google_reviews: {
    actorId: 'apify~google-maps-reviews-scraper',
    buildInput: (keyword, zone, maxResults) => ({
      searchQueries: [zone ? `${keyword} ${zone}` : keyword],
      maxReviews: maxResults,
      reviewsSort: 'newest',
      language: 'fr',
      proxy: { useApifyProxy: true }
    })
  }
};

const buildLeadFromTripadvisor = (review, keywords, zone) => {
  const text = review.text || review.reviewText || review.content || '';
  const title = review.title || review.reviewTitle || '';
  const fullText = `${title} ${text}`;
  const { firstName, lastName } = extractName(
    review.userName || review.author || review.reviewer?.name
  );
  const rating = review.rating || review.stars || review.reviewRating;
  const dissatisfactionSignals = extractDissatisfactionSignals(fullText, rating);
  const businessName = review.businessName || review.placeName || review.restaurantName || '';

  return {
    source: 'tripadvisor_negative_reviews',
    sourceUrl: review.url || review.reviewUrl || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'tripadvisor',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: review.reviewerId || review.userId || review.authorId || null,
    intentSignal: `[${rating || '?'}/5 - ${businessName}] ${title.substring(0, 100)} | Signaux: ${dissatisfactionSignals.join(', ')}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: review.date || review.publishedDate || review.createdAt || null,
    zone: review.location || review.city || zone || null,
    rawData: {
      ...review,
      rating,
      businessName,
      dissatisfactionSignals
    }
  };
};

const buildLeadFromYelp = (review, keywords, zone) => {
  const text = review.text || review.reviewText || '';
  const { firstName, lastName } = extractName(
    review.userName || review.author || review.reviewer
  );
  const rating = review.rating || review.stars;
  const dissatisfactionSignals = extractDissatisfactionSignals(text, rating);
  const businessName = review.businessName || review.name || '';

  return {
    source: 'yelp_negative_reviews',
    sourceUrl: review.url || review.reviewUrl || null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'yelp',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: review.reviewerId || review.userId || null,
    intentSignal: `[${rating || '?'}/5 - ${businessName}] ${text.substring(0, 150)} | Signaux: ${dissatisfactionSignals.join(', ')}`,
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text),
    budgetMentioned: detectBudget(text),
    postedAt: review.date || review.publishedDate || null,
    zone: review.location || review.city || zone || null,
    rawData: {
      ...review,
      rating,
      businessName,
      dissatisfactionSignals
    }
  };
};

const isNegativeReview = (review) => {
  const rating = review.rating || review.stars || review.reviewRating;
  if (rating && rating <= 3) return true;

  const text = (review.text || review.reviewText || review.content || '').toLowerCase();
  const negativeTerms = [
    'decu', 'decevant', 'mauvais', 'nul', 'horrible', 'terrible',
    'a eviter', 'plus jamais', 'catastrophe', 'arnaque', 'mediocre'
  ];
  return negativeTerms.some((term) => text.includes(term));
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'tripadvisor_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'tripadvisor_scraper_error',
      error: 'APIFY_API_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    // TripAdvisor reviews
    for (const keyword of keywords) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      const platformConfig = REVIEW_PLATFORMS.tripadvisor;

      console.log(JSON.stringify({
        event: 'tripadvisor_scraper_search',
        keyword,
        zone,
        platform: 'tripadvisor',
        timestamp: Date.now()
      }));

      const reviews = await runApifyActor(
        platformConfig.actorId,
        platformConfig.buildInput(keyword, zone, Math.min(maxResults - results.length, 30))
      );

      for (const review of reviews) {
        if (results.length >= maxResults) break;

        if (!isNegativeReview(review)) continue;

        const lead = buildLeadFromTripadvisor(review, keywords, zone);

        const isDuplicate = results.some((r) =>
          r.nativeContactId && r.nativeContactId === lead.nativeContactId
        );
        if (!isDuplicate) {
          results.push(lead);
        }
      }
    }

    // Yelp reviews (supplementary)
    if (results.length < maxResults) {
      for (const keyword of keywords.slice(0, 2)) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const platformConfig = REVIEW_PLATFORMS.yelp;

        console.log(JSON.stringify({
          event: 'tripadvisor_scraper_search',
          keyword,
          zone,
          platform: 'yelp',
          timestamp: Date.now()
        }));

        const reviews = await runApifyActor(
          platformConfig.actorId,
          platformConfig.buildInput(keyword, zone, Math.min(maxResults - results.length, 20))
        );

        for (const review of reviews) {
          if (results.length >= maxResults) break;

          if (!isNegativeReview(review)) continue;

          const lead = buildLeadFromYelp(review, keywords, zone);

          const isDuplicate = results.some((r) =>
            r.nativeContactId && r.nativeContactId === lead.nativeContactId
          );
          if (!isDuplicate) {
            results.push(lead);
          }
        }
      }
    }

    // Google Reviews (supplementary)
    if (results.length < maxResults) {
      for (const keyword of keywords.slice(0, 2)) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const platformConfig = REVIEW_PLATFORMS.google_reviews;

        console.log(JSON.stringify({
          event: 'tripadvisor_scraper_search',
          keyword,
          zone,
          platform: 'google_reviews',
          timestamp: Date.now()
        }));

        const reviews = await runApifyActor(
          platformConfig.actorId,
          platformConfig.buildInput(keyword, zone, Math.min(maxResults - results.length, 20))
        );

        for (const review of reviews) {
          if (results.length >= maxResults) break;

          if (!isNegativeReview(review)) continue;

          const text = review.text || review.reviewText || review.content || '';
          const { firstName, lastName } = extractName(
            review.userName || review.author || review.name
          );
          const rating = review.rating || review.stars;
          const dissatisfactionSignals = extractDissatisfactionSignals(text, rating);

          const lead = {
            source: 'google_negative_reviews',
            sourceUrl: review.url || review.reviewUrl || null,
            sourcePublicStatement: text.substring(0, 500),
            platform: 'google_reviews',
            firstName,
            lastName,
            email: null,
            phone: null,
            company: null,
            nativeContactId: review.reviewerId || review.authorId || null,
            intentSignal: `[${rating || '?'}/5 - ${review.placeName || ''}] ${text.substring(0, 150)} | Signaux: ${dissatisfactionSignals.join(', ')}`,
            intentKeywordsCount: countIntentKeywords(text, keywords),
            urgencyDetected: detectUrgency(text),
            budgetMentioned: detectBudget(text),
            postedAt: review.publishedAtDate || review.date || null,
            zone: review.location || review.city || zone || null,
            rawData: {
              ...review,
              rating,
              dissatisfactionSignals
            }
          };

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
      event: 'tripadvisor_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'tripadvisor_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
