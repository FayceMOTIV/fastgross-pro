// ─────────────────────────────────────────────────────
// PIPELINE PROSPECTION FRANCE
// Sources officielles → enrichissement → score
// Cout : $5/mois (Apify uniquement pour gold sources)
// ─────────────────────────────────────────────────────

import axios from 'axios'
import * as cheerio from 'cheerio'

// ─── MAPPING NAF ─────────────────────────────────────
export const NAF_CODES = {
  restaurant:    ['56.10A', '56.10B', '56.10C'],
  dentiste:      ['86.23Z'],
  coiffeur:      ['96.02A'],
  beaute:        ['96.02B', '96.04Z'],
  garage:        ['45.20A', '45.20B'],
  btp:           ['43.21A', '43.22A', '43.31Z', '43.32A'],
  immobilier:    ['68.31Z'],
  avocat:        ['69.10Z'],
  sport:         ['93.13Z'],
  veterinaire:   ['75.00Z'],
  pharmacie:     ['47.73Z'],
  auto_ecole:    ['85.53Z'],
  hotel:         ['55.10Z'],
  photographe:   ['74.20Z'],
  traiteur:      ['56.21Z'],
  boulangerie:   ['10.71C', '10.71D'],
  formation:     ['85.41Z', '85.59A'],
}

// ─── MAPPING VILLE → DÉPARTEMENT ─────────────────────
const CITY_TO_DEPT = {
  paris: '75', lyon: '69', marseille: '13', toulouse: '31',
  nice: '06', nantes: '44', montpellier: '34', strasbourg: '67',
  bordeaux: '33', lille: '59', rennes: '35', reims: '51',
  'saint-etienne': '42', toulon: '83', grenoble: '38',
  dijon: '21', nimes: '30', angers: '49', brest: '29',
  tours: '37', rouen: '76', caen: '14', nancy: '54',
  'clermont-ferrand': '63', annecy: '74', avignon: '84',
  'aix-en-provence': '13', cannes: '06',
}

// ─── LABELS SECTEUR ──────────────────────────────────
export const SECTOR_LABELS = {
  restaurant: 'Restaurant',
  boulangerie: 'Boulangerie',
  traiteur: 'Traiteur',
  dentiste: 'Dentiste',
  coiffeur: 'Coiffeur',
  beaute: 'Beaute / Spa',
  garage: 'Garage auto',
  btp: 'BTP / Artisans',
  immobilier: 'Immobilier',
  avocat: 'Avocat',
  sport: 'Sport / Fitness',
  veterinaire: 'Veterinaire',
  pharmacie: 'Pharmacie',
  auto_ecole: 'Auto-ecole',
  hotel: 'Hotel',
  photographe: 'Photographe',
  formation: 'Formation',
}

// Emails a exclure lors du scraping
const EXCLUDED_EMAIL_PREFIXES = [
  'noreply', 'no-reply', 'no_reply', 'exemple', 'example',
  'test', 'admin', 'webmaster', 'postmaster', 'mailer-daemon',
  'root', 'hostmaster', 'abuse', 'support@google', 'support@facebook',
]

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/g

/**
 * Normalise une chaine (lowercase, supprime accents)
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// ─────────────────────────────────────────────────────
// FONCTION 1 : getCityInfo (departement + code commune INSEE)
// ─────────────────────────────────────────────────────
export async function getCityInfo(city) {
  const normalized = normalize(city)

  // Toujours appeler l'API geo.gouv.fr pour obtenir le code commune INSEE
  try {
    const { data } = await axios.get('https://geo.api.gouv.fr/communes', {
      params: { nom: city, fields: 'departement,codesPostaux,code', boost: 'population', limit: 1 },
      timeout: 5000,
    })
    if (data?.[0]) {
      return {
        departement: data[0].departement?.code,
        commune: data[0].code, // Code INSEE (ex: 69123 pour Lyon)
        nom: data[0].nom,
      }
    }
  } catch (err) {
    console.error(`[PipelineFrance] geo.api.gouv.fr error for "${city}":`, err.message)
  }

  // Fallback local (departement seulement)
  if (CITY_TO_DEPT[normalized]) {
    return { departement: CITY_TO_DEPT[normalized], commune: null, nom: city }
  }

  throw new Error(`Impossible de trouver la ville "${city}"`)
}

// ─────────────────────────────────────────────────────
// FONCTION 2 : searchSIRENE
// ─────────────────────────────────────────────────────
export async function searchSIRENE(sector, city, limit = 50) {
  const nafCodes = NAF_CODES[sector]
  if (!nafCodes) {
    throw new Error(`Secteur inconnu: "${sector}". Secteurs disponibles: ${Object.keys(NAF_CODES).join(', ')}`)
  }

  const cityInfo = await getCityInfo(city)
  const perPage = Math.min(25, Math.ceil(limit / nafCodes.length))
  const allResults = []
  const seenSirets = new Set()

  for (const nafCode of nafCodes) {
    try {
      // q=ville + departement pour filtrer localement
      const params = {
        q: cityInfo.nom || city,
        activite_principale: nafCode,
        departement: cityInfo.departement,
        etat_administratif: 'A',
        per_page: perPage,
      }

      const { data } = await axios.get('https://recherche-entreprises.api.gouv.fr/search', {
        params,
        timeout: 10000,
      })

      for (const result of (data?.results || [])) {
        // Utiliser l'etablissement local (matching_etablissements) plutot que le siege
        const localEtab = result.matching_etablissements?.[0]
        const etab = localEtab || result.siege || {}
        const siret = etab.siret || result.siege?.siret
        if (!siret || seenSirets.has(siret)) continue
        seenSirets.add(siret)

        allResults.push({
          siret,
          siren: result.siren,
          name: result.nom_complet || result.nom_raison_sociale || '',
          address: etab.adresse || [etab.numero_voie, etab.type_voie, etab.libelle_voie].filter(Boolean).join(' '),
          city: etab.libelle_commune || cityInfo.nom || city,
          postalCode: etab.code_postal || '',
          nafCode: etab.activite_principale || result.siege?.activite_principale || nafCode,
          nafLabel: etab.activite_principale_libelle || result.siege?.activite_principale_libelle || '',
          website: null,
          phone: null,
          createdDate: result.date_creation,
          employeeCount: etab.tranche_effectif_salarie || result.siege?.tranche_effectif_salarie || null,
          isHeadquarters: !localEtab, // true si c'est le siege, false si etablissement local
          establishmentCount: result.nombre_etablissements || 1,
        })
      }
    } catch (err) {
      console.error(`[PipelineFrance] SIRENE error for NAF ${nafCode}:`, err.message)
    }
  }

  // Trier : petites entreprises d'abord (plus pertinentes pour la prospection)
  allResults.sort((a, b) => a.establishmentCount - b.establishmentCount)

  return allResults.slice(0, limit)
}

// ─────────────────────────────────────────────────────
// FONCTION 3 : scrapeWebsiteEmail
// ─────────────────────────────────────────────────────
export async function scrapeWebsiteEmail(websiteUrl) {
  if (!websiteUrl) return null

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  const pagesToTry = [url]
  for (const suffix of ['/contact', '/nous-contacter', '/a-propos', '/contactez-nous']) {
    try {
      const base = new URL(url)
      pagesToTry.push(`${base.origin}${suffix}`)
    } catch { break }
  }

  for (const pageUrl of pagesToTry) {
    try {
      const { data } = await axios.get(pageUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' },
        maxRedirects: 3,
      })

      const $ = cheerio.load(data)
      const emails = new Set()

      // mailto: links
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href')?.replace('mailto:', '').split('?')[0]?.trim()
        if (href) emails.add(href.toLowerCase())
      })

      // Regex dans le body
      const bodyText = $('body').text()
      const regexMatches = bodyText.match(EMAIL_REGEX) || []
      for (const m of regexMatches) {
        emails.add(m.toLowerCase())
      }

      // Filtrer les emails exclus
      const validEmails = [...emails].filter(email => {
        return !EXCLUDED_EMAIL_PREFIXES.some(prefix => email.startsWith(prefix))
          && !email.includes('example.com')
          && !email.includes('sentry.io')
          && email.length < 100
      })

      if (validEmails.length > 0) return validEmails[0]
    } catch {
      // Page inaccessible, on essaie la suivante
    }
  }

  return null
}

// ─────────────────────────────────────────────────────
// FONCTION 4 : scrapeWebsitePhone
// ─────────────────────────────────────────────────────
export async function scrapeWebsitePhone(websiteUrl) {
  if (!websiteUrl) return null

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  const pagesToTry = [url]
  try {
    const base = new URL(url)
    pagesToTry.push(`${base.origin}/contact`)
  } catch { /* ignore */ }

  for (const pageUrl of pagesToTry) {
    try {
      const { data } = await axios.get(pageUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' },
        maxRedirects: 3,
      })

      const $ = cheerio.load(data)
      const bodyText = $('body').text()
      const phones = bodyText.match(PHONE_REGEX) || []

      if (phones.length === 0) continue

      // Normaliser au format 0XXXXXXXXX
      const normalized = phones.map(p => {
        let clean = p.replace(/[\s.\-]/g, '')
        if (clean.startsWith('+33')) clean = '0' + clean.slice(3)
        if (clean.startsWith('0033')) clean = '0' + clean.slice(4)
        return clean
      }).filter(p => p.length === 10)

      if (normalized.length === 0) continue

      // Priorite aux mobiles (06/07) pour WhatsApp
      const mobile = normalized.find(p => p.startsWith('06') || p.startsWith('07'))
      return mobile || normalized[0]
    } catch {
      // Page inaccessible
    }
  }

  return null
}

// ─────────────────────────────────────────────────────
// FONCTION 5 : verifyEmail
// ─────────────────────────────────────────────────────
export async function verifyEmail(email) {
  if (!email) return { valid: null, mxFound: null, disposable: false }

  try {
    const { data } = await axios.get(`https://api.mailcheck.ai/email/${encodeURIComponent(email)}`, {
      timeout: 5000,
    })
    return {
      valid: data?.status === 'valid' || data?.mx === true,
      mxFound: data?.mx ?? null,
      disposable: data?.disposable ?? false,
    }
  } catch {
    return { valid: null, mxFound: null, disposable: false }
  }
}

// ─────────────────────────────────────────────────────
// FONCTION 6 : calculateLeadScore
// ─────────────────────────────────────────────────────
export function calculateLeadScore(lead) {
  let score = 0
  const breakdown = { email: 0, phone: 0, web: 0, social: 0, source: 0 }

  // Email
  if (lead.email) {
    if (lead.emailVerified?.mxFound === true) {
      score += 30
      breakdown.email = 30
    } else if (lead.emailVerified?.mxFound === false) {
      score -= 20
      breakdown.email = -20
    } else {
      score += 15
      breakdown.email = 15
    }
    if (lead.emailVerified?.disposable) {
      score -= 30
      breakdown.email -= 30
    }
  }

  // Telephone
  if (lead.phone) {
    const isMobile = lead.phone.startsWith('06') || lead.phone.startsWith('07')
    if (isMobile) {
      score += 25
      breakdown.phone = 25
    } else {
      score += 15
      breakdown.phone = 15
    }
  }

  // Site web
  if (lead.website) {
    score += 20
    breakdown.web = 20
  }

  // Source officielle
  if (['sirene_fr', 'doctolib', 'cnb', 'qualiopi'].includes(lead.source)) {
    score += 15
    breakdown.source = 15
  }

  // Reseaux sociaux
  if (lead.instagram) {
    score += 10
    breakdown.social += 10
  }
  if (lead.facebook) {
    score += 5
    breakdown.social += 5
  }

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}

// ─────────────────────────────────────────────────────
// FONCTION 7 : runPipelineFrance (Pipeline principal)
// ─────────────────────────────────────────────────────
export async function runPipelineFrance(sector, city, limit = 50) {
  const results = { leads: [], stats: {}, errors: [] }

  // 1. Source SIRENE
  const businesses = await searchSIRENE(sector, city, limit)
  results.stats.fromSirene = businesses.length

  // 2. Enrichissement
  for (const biz of businesses) {
    try {
      let email = null
      let phone = biz.phone || null
      let emailVerified = null
      let website = biz.website || null

      // Tenter de trouver le site web via Google (SIRENE ne le fournit pas)
      // On utilise le nom de l'entreprise + ville
      if (!website) {
        website = await findWebsite(biz.name, biz.city)
      }

      // Enrichissement depuis le site web
      if (website) {
        email = await scrapeWebsiteEmail(website)
        if (!phone) {
          phone = await scrapeWebsitePhone(website)
        }
      }

      // Verification email
      if (email) {
        emailVerified = await verifyEmail(email)
        if (emailVerified.disposable) email = null
      }

      // Score
      const lead = { ...biz, email, phone, website, emailVerified, source: 'sirene_fr' }
      const { score, breakdown } = calculateLeadScore(lead)

      results.leads.push({
        ...lead,
        score,
        scoreBreakdown: breakdown,
      })
    } catch (err) {
      results.errors.push({ siret: biz.siret, name: biz.name, error: err.message })
    }

    // Pause anti-ban : 500ms entre chaque requete website
    await new Promise(r => setTimeout(r, 500))
  }

  // 3. Trier par score decroissant
  results.leads.sort((a, b) => b.score - a.score)

  // 4. Stats
  results.stats.total = results.leads.length
  results.stats.withEmail = results.leads.filter(l => l.email).length
  results.stats.withPhone = results.leads.filter(l => l.phone).length
  results.stats.withWebsite = results.leads.filter(l => l.website).length
  results.stats.highScore = results.leads.filter(l => l.score >= 70).length
  results.stats.avgScore = results.leads.length > 0
    ? Math.round(results.leads.reduce((sum, l) => sum + l.score, 0) / results.leads.length)
    : 0
  results.stats.errors = results.errors.length

  return results
}

// ─────────────────────────────────────────────────────
// HELPER : findWebsite (recherche Google via nom entreprise)
// ─────────────────────────────────────────────────────
async function findWebsite(companyName, city) {
  if (!companyName) return null

  try {
    // Utiliser recherche-entreprises API qui retourne parfois un site web
    // ou Serper si disponible
    const serperKey = process.env.SERPER_API_KEY
    if (!serperKey) return null

    const { data } = await axios.post('https://google.serper.dev/search', {
      q: `"${companyName}" ${city} site web`,
      gl: 'fr',
      hl: 'fr',
      num: 3,
    }, {
      headers: { 'X-API-KEY': serperKey },
      timeout: 5000,
    })

    // Prendre le premier resultat qui n'est pas un annuaire
    const excludedDomains = [
      'pagesjaunes.fr', 'societe.com', 'infogreffe.fr', 'pappers.fr',
      'google.com', 'facebook.com', 'linkedin.com', 'instagram.com',
      'yelp.fr', 'tripadvisor.fr', 'lafourchette.com',
    ]

    for (const result of (data?.organic || [])) {
      const link = result.link || ''
      if (!excludedDomains.some(d => link.includes(d))) {
        try {
          return new URL(link).origin
        } catch { continue }
      }
    }
  } catch {
    // Serper non disponible ou erreur
  }

  return null
}
