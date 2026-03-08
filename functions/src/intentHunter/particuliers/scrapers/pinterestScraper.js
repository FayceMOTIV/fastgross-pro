import axios from 'axios';

const PINTEREST_API_KEY = process.env.PINTEREST_API_KEY;
const RATE_LIMIT_MS = 3000; // 20/min

const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
};

const detectUrgency = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  const urgencyTerms = [
    'urgent', 'urgence', 'au plus vite', 'rapidement',
    '2026', '2025', 'cette annee', 'ce mois', 'bientot',
    'en cours', 'projet actuel'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /budget\s*(de|:)?\s*\d+/i,
    /devis/, /prix/, /tarif/, /combien/i, /cout/i,
    /pas cher/i, /petit budget/i, /economique/i
  ];
  return budgetPatterns.some((pattern) => pattern.test(text));
};

const countIntentKeywords = (text, keywords) => {
  if (!text || !keywords?.length) return 0;
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
};

const PROJECT_BOARD_PATTERNS = [
  'renovation {keyword}',
  '{keyword} 2026',
  '{keyword} 2025',
  'mariage {keyword}',
  'projet {keyword}',
  'idees {keyword}',
  'inspiration {keyword}',
  'deco {keyword}',
  'amenagement {keyword}'
];

const INTENT_BOARD_KEYWORDS = [
  'renovation cuisine', 'renovation salle de bain', 'renovation maison',
  'mariage 2026', 'mariage 2025', 'decoration mariage',
  'amenagement jardin', 'piscine', 'extension maison',
  'deco salon', 'chambre bebe', 'bureau maison',
  'terrasse', 'veranda', 'dressing', 'cave a vin'
];

const searchPins = async (query, bookmark = null) => {
  try {
    const params = {
      query,
      page_size: 25,
      access_token: PINTEREST_API_KEY
    };
    if (bookmark) {
      params.bookmark = bookmark;
    }

    const response = await axios.get('https://api.pinterest.com/v5/search/pins', {
      params,
      headers: {
        'Authorization': `Bearer ${PINTEREST_API_KEY}`
      },
      timeout: 30000
    });

    return {
      items: response.data?.items || [],
      bookmark: response.data?.bookmark || null
    };
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pinterest_search_pins_error',
      query,
      error: error.message,
      status: error.response?.status,
      timestamp: Date.now()
    }));
    return { items: [], bookmark: null };
  }
};

const searchBoards = async (query) => {
  try {
    const response = await axios.get('https://api.pinterest.com/v5/search/boards', {
      params: {
        query,
        page_size: 10,
        access_token: PINTEREST_API_KEY
      },
      headers: {
        'Authorization': `Bearer ${PINTEREST_API_KEY}`
      },
      timeout: 30000
    });

    return response.data?.items || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pinterest_search_boards_error',
      query,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const fetchBoardPins = async (boardId) => {
  try {
    const response = await axios.get(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
      params: {
        page_size: 25,
        access_token: PINTEREST_API_KEY
      },
      headers: {
        'Authorization': `Bearer ${PINTEREST_API_KEY}`
      },
      timeout: 30000
    });

    return response.data?.items || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pinterest_fetch_board_pins_error',
      boardId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const fetchUserInfo = async (userId) => {
  try {
    const response = await axios.get(`https://api.pinterest.com/v5/users/${userId}`, {
      params: { access_token: PINTEREST_API_KEY },
      headers: { 'Authorization': `Bearer ${PINTEREST_API_KEY}` },
      timeout: 15000
    });
    return response.data || null;
  } catch (error) {
    return null;
  }
};

const buildLeadFromPin = (pin, keywords, zone) => {
  const title = pin.title || '';
  const description = pin.description || pin.note || '';
  const boardName = pin.board?.name || pin.board_id || '';
  const fullText = `${title} ${description} ${boardName}`;

  const owner = pin.board_owner || pin.pinner || {};
  const nameParts = (owner.username || owner.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  return {
    source: 'pinterest',
    sourceUrl: pin.link || `https://www.pinterest.fr/pin/${pin.id}/` || null,
    sourcePublicStatement: fullText.substring(0, 500),
    platform: 'pinterest',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: owner.id || pin.board_owner?.id || null,
    intentSignal: `[Board: ${boardName}] ${title.substring(0, 150)}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: pin.created_at || null,
    zone: zone || null,
    rawData: {
      pinId: pin.id,
      boardName,
      ownerUsername: owner.username || null,
      imageUrl: pin.media?.images?.originals?.url || null
    }
  };
};

const buildLeadFromBoard = (board, pins, keywords, zone) => {
  const boardName = board.name || '';
  const boardDescription = board.description || '';
  const fullText = `${boardName} ${boardDescription}`;

  const owner = board.owner || {};
  const nameParts = (owner.username || '').trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  return {
    source: 'pinterest',
    sourceUrl: `https://www.pinterest.fr/board/${board.id}/` || null,
    sourcePublicStatement: `Board: ${boardName} - ${boardDescription.substring(0, 400)}`,
    platform: 'pinterest',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: owner.id || null,
    intentSignal: `Board actif: "${boardName}" (${pins.length} pins) - Projet en preparation`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: detectUrgency(fullText),
    budgetMentioned: detectBudget(fullText),
    postedAt: board.created_at || null,
    zone: zone || null,
    rawData: {
      boardId: board.id,
      boardName,
      pinCount: board.pin_count || pins.length,
      ownerUsername: owner.username || null
    }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'pinterest_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  if (!PINTEREST_API_KEY) {
    console.log(JSON.stringify({
      event: 'pinterest_scraper_error',
      error: 'PINTEREST_API_KEY not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const results = [];

    // Phase 1: Search boards for active project planning
    const boardQueries = [];
    for (const keyword of keywords) {
      for (const pattern of PROJECT_BOARD_PATTERNS.slice(0, 3)) {
        boardQueries.push(pattern.replace('{keyword}', keyword));
      }
    }

    for (const query of boardQueries) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'pinterest_search_boards',
        query,
        timestamp: Date.now()
      }));

      const boards = await searchBoards(query);

      for (const board of boards) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        const pins = await fetchBoardPins(board.id);
        const lead = buildLeadFromBoard(board, pins, keywords, zone);

        if (lead.intentKeywordsCount > 0) {
          const isDuplicate = results.some((r) =>
            r.nativeContactId && r.nativeContactId === lead.nativeContactId
          );
          if (!isDuplicate) {
            results.push(lead);
          }
        }
      }
    }

    // Phase 2: Search pins directly
    for (const keyword of keywords) {
      if (results.length >= maxResults) break;

      const query = zone ? `${keyword} ${zone}` : keyword;

      await sleepWithJitter(RATE_LIMIT_MS);

      console.log(JSON.stringify({
        event: 'pinterest_search_pins',
        query,
        timestamp: Date.now()
      }));

      const { items: pins } = await searchPins(query);

      for (const pin of pins) {
        if (results.length >= maxResults) break;

        const lead = buildLeadFromPin(pin, keywords, zone);

        if (lead.intentKeywordsCount > 0) {
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
      event: 'pinterest_scraper_complete',
      clientId,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'pinterest_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
