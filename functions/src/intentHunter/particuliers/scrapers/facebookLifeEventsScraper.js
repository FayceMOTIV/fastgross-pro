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
    'urgent', 'urgence', 'au plus vite', 'rapidement',
    'bientot', 'prochain', 'cette semaine', 'ce mois'
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

const LIFE_EVENT_TYPES = {
  'engaged': {
    label: 'Fiance(e)',
    services: ['wedding planner', 'traiteur', 'photographe', 'salle', 'robe', 'alliance']
  },
  'married': {
    label: 'Marie(e)',
    services: ['demenagement', 'immobilier', 'assurance', 'notaire', 'voyage']
  },
  'new_baby': {
    label: 'Nouveau bebe',
    services: ['puericulture', 'garde enfant', 'pediatre', 'amenagement', 'assurance']
  },
  'moved': {
    label: 'Demenagement',
    services: ['demenageur', 'plombier', 'electricien', 'peintre', 'internet', 'assurance']
  },
  'new_job': {
    label: 'Nouveau travail',
    services: ['transport', 'immobilier', 'formation', 'costume', 'coaching']
  },
  'graduated': {
    label: 'Diplome',
    services: ['emploi', 'logement', 'voiture', 'banque', 'assurance']
  },
  'new_home': {
    label: 'Nouveau logement',
    services: ['demenagement', 'renovation', 'meuble', 'decoration', 'jardin', 'assurance']
  },
  'retired': {
    label: 'Retraite',
    services: ['voyage', 'immobilier', 'assurance', 'sante', 'loisirs']
  }
};

const LIFE_EVENT_KEYWORDS = {
  engaged: ['fiance', 'fiancee', 'demande en mariage', 'elle a dit oui', 'il a dit oui', 'bague'],
  married: ['marie', 'mariee', 'mariage', 'noces', 'ceremonie'],
  new_baby: ['bebe', 'naissance', 'enceinte', 'maman', 'papa', 'nouveau-ne'],
  moved: ['demenage', 'emmenage', 'nouvelle maison', 'nouvel appart', 'changement adresse'],
  new_job: ['nouveau travail', 'nouveau poste', 'embauche', 'prise de fonction'],
  graduated: ['diplome', 'diplome obtenu', 'remise des diplomes'],
  new_home: ['nouvelle maison', 'achat immobilier', 'propriétaire', 'cles en main'],
  retired: ['retraite', 'dernier jour', 'carriere terminee']
};

const detectLifeEventType = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const [eventType, eventKeywords] of Object.entries(LIFE_EVENT_KEYWORDS)) {
    if (eventKeywords.some((kw) => lower.includes(kw))) {
      return eventType;
    }
  }
  return null;
};

const searchPosts = async (query, limit = 25) => {
  try {
    const response = await axios.get('https://graph.facebook.com/v19.0/search', {
      params: {
        q: query,
        type: 'post',
        limit,
        fields: 'id,message,from,created_time,permalink_url,place',
        access_token: FACEBOOK_TOKEN
      },
      timeout: 30000
    });
    return response.data?.data || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'facebook_life_events_search_error',
      query,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const fetchUserLifeEvents = async (userId) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/${userId}/life_events`, {
      params: {
        fields: 'id,title,description,created_time,start_time,end_time',
        access_token: FACEBOOK_TOKEN
      },
      timeout: 30000
    });
    return response.data?.data || [];
  } catch (error) {
    // life_events endpoint requires specific permissions — graceful fallback
    return [];
  }
};

const buildLead = (post, lifeEventType, keywords, zone) => {
  const text = post.message || post.description || '';
  const from = post.from || {};
  const nameParts = (from.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  const eventInfo = LIFE_EVENT_TYPES[lifeEventType] || { label: 'Evenement de vie', services: [] };
  const matchedServices = eventInfo.services.filter((service) =>
    keywords.some((kw) => kw.toLowerCase().includes(service))
  );

  const placeCity = post.place?.location?.city || post.place?.name || null;

  return {
    source: 'facebook_life_events',
    sourceUrl: post.permalink_url || null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'facebook',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: from.id || null,
    intentSignal: `[${eventInfo.label}] ${text.substring(0, 150)}${matchedServices.length > 0 ? ` | Services: ${matchedServices.join(', ')}` : ''}`,
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text) || ['engaged', 'moved', 'new_baby'].includes(lifeEventType),
    budgetMentioned: detectBudget(text),
    postedAt: post.created_time || null,
    zone: placeCity || zone || null,
    rawData: {
      ...post,
      lifeEventType,
      matchedServices,
      eventLabel: eventInfo.label
    }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'facebook_life_events_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!FACEBOOK_TOKEN) {
    console.log(JSON.stringify({
      event: 'facebook_life_events_scraper_error',
      error: 'FACEBOOK_ACCESS_TOKEN not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    // Build search queries from life event keywords + user keywords + zone
    const searchQueries = [];

    for (const [eventType, eventKeywords] of Object.entries(LIFE_EVENT_KEYWORDS)) {
      for (const ekw of eventKeywords.slice(0, 2)) {
        const query = zone ? `${ekw} ${zone}` : ekw;
        searchQueries.push({ query, eventType });
      }
    }

    // Also search with user-provided keywords combined with life events
    for (const keyword of keywords) {
      for (const [eventType, eventKeywords] of Object.entries(LIFE_EVENT_KEYWORDS)) {
        const topKeyword = eventKeywords[0];
        searchQueries.push({
          query: zone ? `${keyword} ${topKeyword} ${zone}` : `${keyword} ${topKeyword}`,
          eventType
        });
      }
    }

    for (const { query, eventType } of searchQueries) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'facebook_life_events_search',
        query,
        eventType,
        timestamp: Date.now()
      }));

      const posts = await searchPosts(query, 10);

      for (const post of posts) {
        if (results.length >= maxResults) break;

        const text = post.message || '';
        if (!text) continue;

        const detectedType = detectLifeEventType(text) || eventType;

        if (detectedType) {
          const lead = buildLead(post, detectedType, keywords, zone);

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
      event: 'facebook_life_events_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'facebook_life_events_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
