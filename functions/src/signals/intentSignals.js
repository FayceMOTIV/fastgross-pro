/**
 * intentSignals.js
 * Dimension 1 — Signaux d'intention business
 *
 * Detecte les evenements business recents d'une entreprise :
 * - BODACC : changement dirigeant, demenagement, augmentation capital, procedure
 * - Recrutement actif : Serper Indeed/WTTJ
 *
 * Toutes sources gratuites (BODACC open data, Serper existant).
 */

import { logger } from 'firebase-functions/v2'

const BODACC_SIGNAL_CONFIG = {
  'creationd\'etablissement':       { type: 'NEW_ESTABLISHMENT', urgency: 'HIGH', score: 20 },
  'modificationgenerale':           { type: 'GENERAL_MODIFICATION', urgency: 'MEDIUM', score: 10 },
  'changementdedirigeantsocial':    { type: 'NEW_DIRECTOR', urgency: 'HIGH', score: 25 },
  'transfertdesiege':               { type: 'RELOCATION', urgency: 'MEDIUM', score: 15 },
  'augmentationdecapital':          { type: 'CAPITAL_INCREASE', urgency: 'HIGH', score: 20 },
  'ouvertured\'uneprocedurecollective': { type: 'LEGAL_PROCEDURE', urgency: 'NEGATIVE', score: -50 },
  'jugementd\'ouverture':           { type: 'LEGAL_PROCEDURE', urgency: 'NEGATIVE', score: -50 },
  'ventecessiond\'unfondsdec':      { type: 'ACQUISITION', urgency: 'HIGH', score: 15 },
  'immatriculation':                { type: 'NEW_COMPANY', urgency: 'MEDIUM', score: 10 },
}

const SIGNAL_LABELS = {
  NEW_DIRECTOR:       'Nouveau dirigeant nomme recemment',
  RELOCATION:         'Demenagement du siege',
  CAPITAL_INCREASE:   'Augmentation de capital recente',
  ACTIVE_RECRUITING:  'Recrutement actif en cours',
  NEW_ESTABLISHMENT:  'Ouverture d\'un nouvel etablissement',
  ACQUISITION:        'Cession/acquisition recente',
  NEW_COMPANY:        'Entreprise recemment creee',
  GENERAL_MODIFICATION: 'Modifications legales recentes',
}

const ICEBREAKER_TEMPLATES = {
  NEW_DIRECTOR: (data) =>
    `J'ai remarque que vous venez de prendre la direction de ${data.nom || 'votre entreprise'} — ` +
    `les premiers mois sont souvent l'occasion de revoir les contrats fournisseurs.`,
  CAPITAL_INCREASE: (data) =>
    `Felicitations pour l'augmentation de capital recente chez ${data.nom || 'vous'} — ` +
    `ca signifie souvent de nouveaux projets et de nouveaux besoins.`,
  RELOCATION: (data) =>
    `J'ai vu que ${data.nom || 'votre entreprise'} vient de demenager — ` +
    `c'est souvent l'occasion de revoir et renegocier tous les contrats.`,
  ACTIVE_RECRUITING: (data) =>
    `J'ai vu que vous recrutez activement en ce moment (${data.nbOffres || 'plusieurs'} postes ouverts) — ` +
    `une croissance comme la votre genere souvent de nouveaux besoins operationnels.`,
  NEW_ESTABLISHMENT: (data) =>
    `J'ai vu l'ouverture de votre nouvel etablissement — ` +
    `au demarrage, optimiser les charges fixes fait souvent une vraie difference.`,
  DEFAULT: (data) =>
    `J'ai vu que ${data.nom || 'votre entreprise'} est en pleine evolution en ce moment.`,
}

/**
 * Detecte les signaux d'intention pour un lead donne
 */
export async function detectIntentSignals(lead) {
  const siren = lead?.siren || lead?.sirenNumber || null
  const nom = lead?.nom || lead?.denominationUsuelleUniteLegale || lead?.company || null

  const results = await Promise.allSettled([
    withTimeout(fetchBODACCEvents(siren), 8000),
    withTimeout(fetchActiveJobs(nom, lead?.naf), 8000),
  ])

  const bodaccEvents = results[0].status === 'fulfilled' ? results[0].value : []
  const jobSignals   = results[1].status === 'fulfilled' ? results[1].value : []

  const allSignals = [...bodaccEvents, ...jobSignals]
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  const positiveSignals = allSignals.filter(s => s.urgency !== 'NEGATIVE')
  const negativeSignals = allSignals.filter(s => s.urgency === 'NEGATIVE')

  const rawScore = positiveSignals.reduce((s, sig) => s + (sig.score || 0), 0)
                 + negativeSignals.reduce((s, sig) => s + (sig.score || 0), 0)
  const urgencyScore = Math.max(0, Math.min(100, rawScore))

  const topSignal = positiveSignals[0] || null

  let icebreaker = null
  if (topSignal) {
    const tpl = ICEBREAKER_TEMPLATES[topSignal.type] || ICEBREAKER_TEMPLATES.DEFAULT
    icebreaker = tpl({ ...lead, ...topSignal })
  }

  return {
    signals: allSignals,
    hasPositiveSignals: positiveSignals.length > 0,
    hasNegativeSignals: negativeSignals.length > 0,
    urgencyScore,
    topSignal,
    icebreaker,
    source: 'intent_signals',
  }
}

async function fetchBODACCEvents(siren) {
  if (!siren) return []

  const dateMin = new Date()
  dateMin.setFullYear(dateMin.getFullYear() - 1)
  const dateMinStr = dateMin.toISOString().slice(0, 10)

  try {
    const url = `https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records` +
      `?where=registre%3D%22${siren}%22%20AND%20dateparution%3E%3D%22${dateMinStr}%22` +
      `&order_by=dateparution%20DESC&limit=20`

    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (!res.ok) return []

    const data = await res.json()
    const records = data.results || []
    const events = []

    for (const record of records) {
      const typeAnnonce = (record.typeavis || record.familleavis || '').toLowerCase()
        .replace(/[\s'e]/g, '')

      for (const [key, config] of Object.entries(BODACC_SIGNAL_CONFIG)) {
        if (typeAnnonce.includes(key.replace(/[\s'e]/g, ''))) {
          events.push({
            type: config.type,
            urgency: config.urgency,
            score: config.score,
            label: SIGNAL_LABELS[config.type] || config.type,
            date: record.dateparution,
            source: 'bodacc',
            rawType: record.typeavis,
          })
          break
        }
      }
    }
    return events
  } catch (e) {
    logger.warn(`BODACC events error for ${siren}:`, e.message)
    return []
  }
}

async function fetchActiveJobs(nom, naf) {
  if (!nom) return []

  try {
    const { cachedSerperFetch } = await import('../utils/serperCache.js')
    const query = `"${nom}" site:indeed.fr OR site:welcometothejungle.com OR site:linkedin.com/jobs`

    const data = await cachedSerperFetch('search', { q: query, gl: 'fr', hl: 'fr', num: 10, tbs: 'qdr:m' }, { timeoutMs: 7000 })
    if (data.error) return []

    const results = data.organic || []

    const offres = results.filter(r =>
      r.link?.includes('indeed') || r.link?.includes('welcometothejungle') || r.link?.includes('linkedin'),
    )

    if (offres.length === 0) return []

    const postes = offres.map(r => {
      const title = r.title || ''
      return title.replace(new RegExp(nom, 'gi'), '').replace(/[|-]/g, '').trim()
    }).filter(Boolean).slice(0, 5)

    return [{
      type: 'ACTIVE_RECRUITING',
      urgency: offres.length >= 5 ? 'HIGH' : 'MEDIUM',
      score: Math.min(25, offres.length * 5),
      label: `Recrutement actif — ${offres.length} offre${offres.length > 1 ? 's' : ''} detectee${offres.length > 1 ? 's' : ''}`,
      nbOffres: offres.length,
      postes,
      date: new Date().toISOString().slice(0, 10),
      source: 'serper_jobs',
    }]
  } catch (e) {
    return []
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}
