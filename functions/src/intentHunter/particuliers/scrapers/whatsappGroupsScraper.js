import axios from 'axios';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const RATE_LIMIT_MS = 15000; // 4/min

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

const extractPhoneFromJid = (jid) => {
  if (!jid) return null;
  const match = jid.match(/^(\d+)@/);
  return match ? `+${match[1]}` : null;
};

const extractNameFromContact = (contact) => {
  if (!contact) return { firstName: null, lastName: null };
  const pushName = contact.pushName || contact.name || contact.verifiedName || '';
  const parts = pushName.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const fetchGroups = async (instanceName) => {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${instanceName}`,
      {
        headers: { apikey: EVOLUTION_API_KEY },
        timeout: 30000
      }
    );
    return response.data || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'whatsapp_groups_fetch_error',
      instanceName,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const fetchGroupMessages = async (instanceName, groupJid, limit = 50) => {
  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`,
      {
        where: {
          key: { remoteJid: groupJid }
        },
        limit
      },
      {
        headers: { apikey: EVOLUTION_API_KEY },
        timeout: 30000
      }
    );
    return response.data?.messages || response.data || [];
  } catch (error) {
    console.log(JSON.stringify({
      event: 'whatsapp_group_messages_error',
      instanceName,
      groupJid,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};

const buildLead = (message, groupName, keywords, zone) => {
  const text = message.message?.conversation
    || message.message?.extendedTextMessage?.text
    || '';
  const { firstName, lastName } = extractNameFromContact(message);
  const senderJid = message.key?.participant || message.key?.remoteJid || '';
  const phone = extractPhoneFromJid(senderJid);

  return {
    source: 'whatsapp_groups',
    sourceUrl: null,
    sourcePublicStatement: text.substring(0, 500),
    platform: 'whatsapp',
    firstName,
    lastName,
    email: null,
    phone,
    company: null,
    nativeContactId: senderJid || null,
    intentSignal: `[${groupName}] ${text.substring(0, 200)}`,
    intentKeywordsCount: countIntentKeywords(text, keywords),
    urgencyDetected: detectUrgency(text),
    budgetMentioned: detectBudget(text),
    postedAt: message.messageTimestamp
      ? new Date(message.messageTimestamp * 1000).toISOString()
      : null,
    zone: zone || null,
    rawData: {
      groupName,
      senderJid,
      pushName: message.pushName || null,
      messageId: message.key?.id || null
    }
  };
};

export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    zone,
    maxResults = 50,
    instanceName = 'fmf-whatsapp3'
  } = config;

  console.log(JSON.stringify({
    event: 'whatsapp_groups_scraper_start',
    clientId,
    keywords,
    zone,
    instanceName,
    maxResults,
    timestamp: Date.now()
  }));

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log(JSON.stringify({
      event: 'whatsapp_groups_scraper_error',
      error: 'EVOLUTION_API_URL or EVOLUTION_API_KEY not configured',
      timestamp: Date.now()
    }));
    return [];
  }

  try {
    const groups = await fetchGroups(instanceName);

    console.log(JSON.stringify({
      event: 'whatsapp_groups_found',
      count: groups.length,
      timestamp: Date.now()
    }));

    const relevantGroups = groups.filter((group) => {
      const name = (group.subject || group.name || '').toLowerCase();
      if (zone && name.includes(zone.toLowerCase())) return true;
      return keywords.some((kw) => name.includes(kw.toLowerCase()));
    });

    console.log(JSON.stringify({
      event: 'whatsapp_groups_filtered',
      total: groups.length,
      relevant: relevantGroups.length,
      timestamp: Date.now()
    }));

    const results = [];

    for (const group of relevantGroups) {
      if (results.length >= maxResults) break;

      await sleepWithJitter(RATE_LIMIT_MS);

      const groupJid = group.id || group.jid;
      const groupName = group.subject || group.name || 'Unknown Group';

      const messages = await fetchGroupMessages(instanceName, groupJid, 50);

      for (const msg of messages) {
        if (results.length >= maxResults) break;

        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || '';
        if (!text) continue;

        const matchCount = countIntentKeywords(text, keywords);
        if (matchCount > 0) {
          results.push(buildLead(msg, groupName, keywords, zone));
        }
      }
    }

    console.log(JSON.stringify({
      event: 'whatsapp_groups_scraper_complete',
      clientId,
      groupsScanned: relevantGroups.length,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'whatsapp_groups_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
