/**
 * Multi-Source Enrichment - Enrichissement en cascade ("waterfall")
 * Niveau Apollo : Croiser plusieurs sources pour des donnees completes
 */

import * as cheerio from 'cheerio'

// Delais entre requetes
const FETCH_DELAY = 1500
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Enrichissement complet d'un prospect via multiples sources
 */
export async function enrichProspect(company, icp) {
  const enriched = {
    company: company.name,
    website: company.website,
    originalData: { ...company },
    sources: [],
    enrichedAt: new Date()
  }

  // SOURCE 1: Scraping du site web (base)
  try {
    const siteData = await scrapeWebsiteDeep(company.website)
    if (siteData.success) {
      enriched.siteData = siteData
      enriched.sources.push('website')

      // Extraire les donnees de base
      enriched.description = siteData.metaDescription
      enriched.emails = siteData.emails || []
      enriched.phones = siteData.phones || []
      enriched.socialLinks = siteData.socialLinks || {}
      enriched.headings = siteData.headings || []
      enriched.services = siteData.services || []
    }
  } catch (e) {
    console.log('Enrichment: Website scrape failed:', e.message)
  }

  await delay(FETCH_DELAY)

  // SOURCE 2: Google Maps API (Places)
  // Trouve le vrai numero, les avis, les horaires
  try {
    const googleData = await searchGoogleMaps(company.name, company.city)
    if (googleData) {
      enriched.googleMaps = googleData
      enriched.sources.push('google_maps')

      // Priorite aux donnees Google (plus fiables)
      if (googleData.phone && !enriched.phones?.length) {
        enriched.phones = [googleData.phone]
      }
      enriched.address = googleData.address || enriched.address
      enriched.rating = googleData.rating
      enriched.reviewCount = googleData.reviewCount
      enriched.reviews = googleData.reviews || []
      enriched.openingHours = googleData.openingHours
      enriched.googleMapsUrl = googleData.url
      enriched.placeId = googleData.placeId
    }
  } catch (e) {
    console.log('Enrichment: Google Maps failed:', e.message)
  }

  await delay(FETCH_DELAY)

  // SOURCE 3: Societe.com / Pappers (donnees legales)
  try {
    const legalData = await scrapeSocieteInfo(company.name, company.city)
    if (legalData) {
      enriched.legalData = legalData
      enriched.sources.push('societe_com')

      enriched.siret = legalData.siret
      enriched.siren = legalData.siren
      enriched.revenue = legalData.revenue
      enriched.revenueFormatted = legalData.revenueFormatted
      enriched.employeeCount = legalData.employees
      enriched.employeeRange = legalData.employeeRange
      enriched.legalForm = legalData.legalForm
      enriched.ceo = legalData.dirigeant
      enriched.creationDate = legalData.createdAt
      enriched.nafCode = legalData.nafCode
      enriched.nafLabel = legalData.nafLabel
      enriched.capital = legalData.capital
    }
  } catch (e) {
    console.log('Enrichment: Societe.com failed:', e.message)
  }

  await delay(FETCH_DELAY)

  // SOURCE 4: LinkedIn (via scraping prudent)
  try {
    const linkedinData = await searchLinkedInCompany(company.name, company.city)
    if (linkedinData) {
      enriched.linkedin = linkedinData
      enriched.sources.push('linkedin')

      enriched.linkedinUrl = linkedinData.companyUrl
      enriched.decisionMakers = linkedinData.decisionMakers || []
      enriched.linkedinEmployees = linkedinData.employeeCount
      enriched.linkedinIndustry = linkedinData.industry
    }
  } catch (e) {
    console.log('Enrichment: LinkedIn failed:', e.message)
  }

  // Calculer la completude des donnees
  enriched.dataCompleteness = calculateDataCompleteness(enriched)

  return enriched
}

/**
 * Scraping approfondi d'un site web
 */
async function scrapeWebsiteDeep(url) {
  let normalizedUrl = url
  if (!url.startsWith('http')) {
    normalizedUrl = 'https://' + url
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Nettoyer
    $('script, style, nav, footer, header, iframe, noscript, svg').remove()

    // Extraction standard
    const title = $('title').text().trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1')
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 5)
    const h2s = $('h2')
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 10)

    // Emails
    const bodyText = $('body').text()
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [
      ...new Set(
        (bodyText.match(emailRegex) || []).filter(
          (e) =>
            !e.includes('example') &&
            !e.includes('test@') &&
            !e.includes('sentry') &&
            !e.includes('webpack') &&
            !e.includes('wixpress')
        )
      )
    ].slice(0, 5)

    // Telephones
    const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g
    const phones = [...new Set(bodyText.match(phoneRegex) || [])].slice(0, 3)

    // Reseaux sociaux
    const socialLinks = {
      linkedin: $('a[href*="linkedin.com"]').first().attr('href') || null,
      facebook: $('a[href*="facebook.com"]').first().attr('href') || null,
      twitter: $('a[href*="twitter.com"], a[href*="x.com"]').first().attr('href') || null,
      instagram: $('a[href*="instagram.com"]').first().attr('href') || null
    }

    // Extraire les services/offres (basé sur les H2, listes, etc.)
    const services = []
    $('h2, h3').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 5 && text.length < 100 && !text.includes('©')) {
        services.push(text)
      }
    })

    // Paragraphes cles
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((p) => p.length > 50)
      .slice(0, 5)

    // Mots cles de la page
    const metaKeywords = $('meta[name="keywords"]').attr('content') || ''
    const keywords = metaKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k)

    return {
      success: true,
      url: normalizedUrl,
      title,
      metaDescription,
      headings: h1s,
      subheadings: h2s,
      paragraphs,
      emails,
      phones,
      socialLinks,
      services: services.slice(0, 10),
      keywords,
      contentLength: bodyText.length
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Recherche Google Maps / Places API
 * Note: Necessite une API key Google Places en production
 */
async function searchGoogleMaps(companyName, city) {
  // En production, utiliser l'API Google Places
  // Pour l'instant, on fait du scraping prudent de la recherche Google

  const query = encodeURIComponent(`${companyName} ${city || ''} france`)

  try {
    // Simulation de recherche - en prod, utiliser Places API
    // const apiKey = process.env.GOOGLE_PLACES_API_KEY
    // const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`)

    // Pour l'instant, retourner null (API non configuree)
    // L'utilisateur devra configurer son API key Google
    return null
  } catch (error) {
    console.log('Google Maps search error:', error.message)
    return null
  }
}

/**
 * Scraping Societe.com pour les donnees legales
 * Alternative: API Pappers (payante mais complete)
 */
async function scrapeSocieteInfo(companyName, city) {
  // Recherche sur Societe.com
  const searchQuery = encodeURIComponent(`${companyName} ${city || ''}`)

  try {
    // Premiere requete: recherche
    const searchResponse = await fetch(
      `https://www.societe.com/cgi-bin/search?champs=${searchQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html',
          'Accept-Language': 'fr-FR,fr;q=0.9'
        },
        signal: AbortSignal.timeout(10000)
      }
    )

    if (!searchResponse.ok) {
      return null
    }

    const searchHtml = await searchResponse.text()
    const $search = cheerio.load(searchHtml)

    // Trouver le premier resultat
    const firstResult = $search('.societe a.txt-no-style').first().attr('href')
    if (!firstResult) {
      return null
    }

    await delay(1500)

    // Deuxieme requete: page de la societe
    const companyUrl = `https://www.societe.com${firstResult}`
    const companyResponse = await fetch(companyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!companyResponse.ok) {
      return null
    }

    const companyHtml = await companyResponse.text()
    const $ = cheerio.load(companyHtml)

    // Extraire les donnees
    const data = {
      sourceUrl: companyUrl
    }

    // SIRET/SIREN
    const identiteText = $('body').text()
    const siretMatch = identiteText.match(/SIRET\s*[:\s]*(\d{14})/i)
    if (siretMatch) {
      data.siret = siretMatch[1]
      data.siren = siretMatch[1].substring(0, 9)
    }

    // Chiffre d'affaires
    const caMatch = identiteText.match(
      /Chiffre d'affaires\s*[:\s]*(\d[\d\s,]*)\s*(k?€|euros?)/i
    )
    if (caMatch) {
      data.revenueFormatted = caMatch[0]
      const amount = parseFloat(caMatch[1].replace(/\s/g, '').replace(',', '.'))
      data.revenue = caMatch[2].toLowerCase().includes('k') ? amount * 1000 : amount
    }

    // Effectif
    const effectifMatch = identiteText.match(/Effectif\s*[:\s]*(\d+)\s*(?:a|à)\s*(\d+)/i)
    if (effectifMatch) {
      data.employeeRange = `${effectifMatch[1]}-${effectifMatch[2]}`
      data.employees = parseInt(effectifMatch[2])
    } else {
      const effectifSimple = identiteText.match(/Effectif\s*[:\s]*(\d+)/i)
      if (effectifSimple) {
        data.employees = parseInt(effectifSimple[1])
      }
    }

    // Dirigeant
    const dirigeantMatch = identiteText.match(
      /(?:Dirigeant|Gérant|Président)\s*[:\s]*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇa-zàâäéèêëïîôùûüç\-\s]+)/
    )
    if (dirigeantMatch) {
      data.dirigeant = dirigeantMatch[1].trim()
    }

    // Date de creation
    const creationMatch = identiteText.match(/(?:Création|Immatriculation)\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i)
    if (creationMatch) {
      const parts = creationMatch[1].split('/')
      data.createdAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    }

    // Code NAF
    const nafMatch = identiteText.match(/(?:Code NAF|APE)\s*[:\s]*(\d{2}\.\d{2}[A-Z]?)\s*[-–]\s*([^\n]+)/i)
    if (nafMatch) {
      data.nafCode = nafMatch[1]
      data.nafLabel = nafMatch[2].trim()
    }

    // Forme juridique
    const formeMatch = identiteText.match(/(?:Forme juridique|Statut)\s*[:\s]*(SAS|SARL|SA|EURL|SCI|SNC|Auto-entrepreneur)/i)
    if (formeMatch) {
      data.legalForm = formeMatch[1]
    }

    return Object.keys(data).length > 1 ? data : null
  } catch (error) {
    console.log('Societe.com scrape error:', error.message)
    return null
  }
}

/**
 * Recherche LinkedIn pour trouver les decideurs
 * Note: LinkedIn bloque le scraping, utiliser avec precaution
 */
async function searchLinkedInCompany(companyName, city) {
  // LinkedIn bloque agressivement le scraping
  // En production, utiliser une API tierce comme Proxycurl ou Apollo
  // Pour l'instant, on retourne null

  return null
}

/**
 * Calcule le score de completude des donnees
 */
function calculateDataCompleteness(enriched) {
  const fields = [
    { name: 'email', value: enriched.emails?.length > 0, weight: 20 },
    { name: 'phone', value: enriched.phones?.length > 0, weight: 15 },
    { name: 'description', value: !!enriched.description, weight: 10 },
    { name: 'address', value: !!enriched.address, weight: 5 },
    { name: 'siret', value: !!enriched.siret, weight: 10 },
    { name: 'revenue', value: !!enriched.revenue, weight: 10 },
    { name: 'employees', value: !!enriched.employeeCount, weight: 10 },
    { name: 'ceo', value: !!enriched.ceo, weight: 10 },
    { name: 'rating', value: !!enriched.rating, weight: 5 },
    { name: 'linkedin', value: !!enriched.linkedinUrl, weight: 5 }
  ]

  let score = 0
  let maxScore = 0
  const missing = []

  fields.forEach((field) => {
    maxScore += field.weight
    if (field.value) {
      score += field.weight
    } else {
      missing.push(field.name)
    }
  })

  return {
    score: Math.round((score / maxScore) * 100),
    sources: enriched.sources,
    fieldsFound: fields.filter((f) => f.value).map((f) => f.name),
    fieldsMissing: missing
  }
}

/**
 * Enrichissement batch de plusieurs prospects
 */
export async function enrichProspectsBatch(companies, icp, options = {}) {
  const results = []
  const maxConcurrent = options.maxConcurrent || 1 // Sequentiel pour eviter les rate limits

  for (const company of companies) {
    try {
      const enriched = await enrichProspect(company, icp)
      results.push(enriched)

      if (options.onProgress) {
        options.onProgress(results.length, companies.length, enriched)
      }
    } catch (error) {
      results.push({
        company: company.name,
        error: error.message,
        success: false
      })
    }

    await delay(2000) // Pause entre chaque entreprise
  }

  return results
}
