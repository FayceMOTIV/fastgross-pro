import axios from 'axios';

const RATE_LIMIT_MS = 1000; // 60/min — free official API

const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3);
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
};

const detectUrgency = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  const urgencyTerms = [
    'construction neuve', 'demolition', 'gros oeuvre',
    'permis accorde', 'travaux commences'
  ];
  return urgencyTerms.some((term) => lower.includes(term));
};

const detectBudget = (text) => {
  if (!text) return false;
  const budgetPatterns = [
    /\d+\s*€/, /\d+\s*euros?/, /\d+\s*m2/i, /\d+\s*m²/,
    /surface\s*:\s*\d+/i
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
  const cleaned = nameStr.replace(/^(m\.|mme|mr|monsieur|madame)\s+/i, '');
  const parts = cleaned.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  };
};

const estimateProjectValue = (surface, type) => {
  if (!surface) return null;
  const sqm = parseInt(surface, 10);
  if (isNaN(sqm)) return null;

  const costPerSqm = {
    'maison individuelle': 1800,
    'logement collectif': 1500,
    'bureaux': 1600,
    'commerce': 1400,
    'industrie': 800,
    'default': 1500
  };

  const rate = costPerSqm[type?.toLowerCase()] || costPerSqm['default'];
  return sqm * rate;
};

const SITADEL_BASE_URL = 'https://data.ademe.fr/data-fair/api/v1/datasets';
const DATAGOUV_BASE_URL = 'https://tabular-api.data.gouv.fr/api/resources';

const SITADEL_DATASETS = [
  'sitadel-permis-de-construire',
  'base-des-permis-de-construire'
];

const fetchFromDataGouv = async (zone, maxResults) => {
  const results = [];

  try {
    const searchResponse = await axios.get(
      'https://www.data.gouv.fr/api/1/datasets/',
      {
        params: {
          q: 'permis construire sitadel',
          page_size: 5
        },
        timeout: 30000
      }
    );

    const datasets = searchResponse.data?.data || [];
    if (datasets.length === 0) return results;

    for (const dataset of datasets.slice(0, 2)) {
      if (results.length >= maxResults) break;

      const resources = dataset.resources || [];
      const csvResources = resources.filter((r) =>
        r.format === 'csv' || r.url?.endsWith('.csv')
      );

      for (const resource of csvResources.slice(0, 1)) {
        if (results.length >= maxResults) break;

        await sleepWithJitter(RATE_LIMIT_MS);

        try {
          const response = await axios.get(resource.url, {
            timeout: 60000,
            responseType: 'text',
            headers: { 'Accept': 'text/csv' }
          });

          const lines = response.data.split('\n');
          if (lines.length < 2) continue;

          const headers = lines[0].split(';').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
          const communeIdx = headers.findIndex((h) =>
            h.includes('commune') || h.includes('ville') || h.includes('localite')
          );
          const depIdx = headers.findIndex((h) =>
            h.includes('departement') || h.includes('dep') || h.includes('dept')
          );
          const typeIdx = headers.findIndex((h) =>
            h.includes('type') || h.includes('nature') || h.includes('destination')
          );
          const surfaceIdx = headers.findIndex((h) =>
            h.includes('surface') || h.includes('shon') || h.includes('shab')
          );
          const dateIdx = headers.findIndex((h) =>
            h.includes('date') || h.includes('mois')
          );
          const demandeurIdx = headers.findIndex((h) =>
            h.includes('demandeur') || h.includes('petitionnaire') || h.includes('nom')
          );
          const adresseIdx = headers.findIndex((h) =>
            h.includes('adresse') || h.includes('rue')
          );

          for (let i = 1; i < lines.length && results.length < maxResults; i++) {
            const values = lines[i].split(';').map((v) => v.trim().replace(/"/g, ''));
            if (values.length < 3) continue;

            const commune = communeIdx >= 0 ? values[communeIdx] : '';
            const dept = depIdx >= 0 ? values[depIdx] : '';
            const location = `${commune} ${dept}`.trim();

            if (zone && !location.toLowerCase().includes(zone.toLowerCase())) {
              continue;
            }

            const type = typeIdx >= 0 ? values[typeIdx] : '';
            const surface = surfaceIdx >= 0 ? values[surfaceIdx] : '';
            const date = dateIdx >= 0 ? values[dateIdx] : '';
            const demandeur = demandeurIdx >= 0 ? values[demandeurIdx] : '';
            const adresse = adresseIdx >= 0 ? values[adresseIdx] : '';

            results.push({
              commune,
              departement: dept,
              type,
              surface,
              date,
              demandeur,
              adresse,
              location
            });
          }
        } catch (csvError) {
          console.log(JSON.stringify({
            event: 'permis_construction_csv_error',
            resourceUrl: resource.url,
            error: csvError.message,
            timestamp: Date.now()
          }));
        }
      }
    }
  } catch (error) {
    console.log(JSON.stringify({
      event: 'permis_construction_datagouv_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }

  return results;
};

const fetchFromOpenDataSoft = async (zone, maxResults) => {
  const results = [];

  try {
    await sleepWithJitter(RATE_LIMIT_MS);

    const params = {
      dataset: 'sitadel-permis-de-construire',
      rows: Math.min(maxResults, 100),
      sort: '-date_reelle_autorisation'
    };

    if (zone) {
      params.refine = `commune:${zone}`;
    }

    const response = await axios.get(
      'https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles',
      {
        params: {
          millesime: '2024',
          withColumnDescription: false,
          withColumnUnit: false,
          orderBy: '-ANNEE_AUTORISATION',
          pageSize: Math.min(maxResults, 100)
        },
        timeout: 30000
      }
    );

    const records = response.data?.data || response.data?.records || [];

    for (const record of records) {
      const fields = record.fields || record;
      results.push({
        commune: fields.commune || fields.COMMUNE || '',
        departement: fields.departement || fields.DEP || '',
        type: fields.type_construction || fields.NATURE || fields.destination || '',
        surface: fields.surface || fields.SHON || fields.surface_plancher || '',
        date: fields.date_autorisation || fields.DATE_REELLE_AUTORISATION || '',
        demandeur: fields.demandeur || fields.petitionnaire || '',
        adresse: fields.adresse || '',
        location: `${fields.commune || ''} ${fields.departement || ''}`.trim()
      });
    }
  } catch (error) {
    console.log(JSON.stringify({
      event: 'permis_construction_opendatasoft_error',
      error: error.message,
      timestamp: Date.now()
    }));
  }

  return results;
};

const buildLead = (record, keywords, zone) => {
  const fullText = [
    record.type, record.commune, record.surface,
    record.adresse, record.demandeur
  ].filter(Boolean).join(' ');

  const { firstName, lastName } = extractName(record.demandeur);
  const estimatedValue = estimateProjectValue(record.surface, record.type);

  return {
    source: 'permis_construction_sitadel',
    sourceUrl: 'https://www.data.gouv.fr/fr/datasets/base-des-permis-de-construire-sitadel/',
    sourcePublicStatement: `Permis de construire: ${record.type || 'Non specifie'} - ${record.commune || ''} - ${record.surface || ''}m2`,
    platform: 'data_gouv_fr',
    firstName,
    lastName,
    email: null,
    phone: null,
    company: null,
    nativeContactId: record.numero_permis || record.id || null,
    intentSignal: `Permis construire ${record.type || ''} ${record.surface ? record.surface + 'm2' : ''} ${record.commune || ''}${estimatedValue ? ` [Valeur estimee: ${estimatedValue}€]` : ''}`,
    intentKeywordsCount: countIntentKeywords(fullText, keywords),
    urgencyDetected: true, // Building permits are always high intent
    budgetMentioned: !!record.surface,
    postedAt: record.date || null,
    zone: record.commune || record.location || zone || null,
    rawData: { ...record, estimatedProjectValue: estimatedValue }
  };
};

export const scrape = async (config) => {
  const { clientId, keywords = [], zone, maxResults = 50 } = config;

  console.log(JSON.stringify({
    event: 'permis_construction_scraper_start',
    clientId,
    keywords,
    zone,
    maxResults,
    timestamp: Date.now()
  }));

  try {
    let rawRecords = [];

    // Try OpenDataSoft first (structured API)
    rawRecords = await fetchFromOpenDataSoft(zone, maxResults);

    console.log(JSON.stringify({
      event: 'permis_construction_opendatasoft_result',
      recordsFound: rawRecords.length,
      timestamp: Date.now()
    }));

    // Fallback to data.gouv.fr CSV
    if (rawRecords.length === 0) {
      rawRecords = await fetchFromDataGouv(zone, maxResults);

      console.log(JSON.stringify({
        event: 'permis_construction_datagouv_result',
        recordsFound: rawRecords.length,
        timestamp: Date.now()
      }));
    }

    const results = [];

    for (const record of rawRecords) {
      if (results.length >= maxResults) break;

      const lead = buildLead(record, keywords, zone);

      // For building permits, always include — they are gold leads
      // But still check keywords if provided
      if (keywords.length === 0 || lead.intentKeywordsCount > 0 || lead.urgencyDetected) {
        results.push(lead);
      }
    }

    console.log(JSON.stringify({
      event: 'permis_construction_scraper_complete',
      clientId,
      rawRecords: rawRecords.length,
      leadsFound: results.length,
      timestamp: Date.now()
    }));

    return results.slice(0, maxResults);
  } catch (error) {
    console.log(JSON.stringify({
      event: 'permis_construction_scraper_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }));
    return [];
  }
};
