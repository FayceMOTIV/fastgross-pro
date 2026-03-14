/**
 * Reverse Enrichment Engine — Intent Hunter
 *
 * Enrichit un prospect a partir d'un simple username ou pseudo
 * (cas Reddit, Discord, Slack, forums).
 *
 * Pipeline :
 *   1. Cross-platform username search
 *   2. Analyse contenu public via Groq
 *   3. Si entreprise → waterfall SIRENE existant
 *   4. Si email partiel → permutation + verification
 *   5. Si nom + domaine → waterfall Hunter/Apollo
 *   6. Fallback → contact natif sur plateforme source
 *
 * S'ajoute au waterfall existant dans enrichment/ sans le remplacer.
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Enrichit un prospect a partir d'un username
 * @param {string} username
 * @param {string} platform
 * @param {string} rawPost - Texte du post source
 * @returns {Promise<Object>} Lead enrichi
 */
export async function reverseEnrich(username, platform, rawPost) {

  // ETAPE 1 : Cross-platform username search
  const profiles = await searchUsernameCrossPlatform(username)

  // ETAPE 2 : Analyse contenu public via Groq
  const context = await analyzePublicContent(username, platform, rawPost, profiles)

  // ETAPE 3 : Si entreprise detectee → lookup SIRENE puis Pappers
  if (context.company || context.companyHint) {
    const companyName = context.company || context.companyHint
    const sireneResult = await lookupSirene(companyName, context.city)
    if (sireneResult) {
      // Enrichir via Pappers si SIREN disponible (donnees plus riches)
      const pappersData = await enrichWithPappers(sireneResult.siret || sireneResult.siren, companyName, context.city)
      return {
        ...sireneResult,
        ...pappersData,
        sourceUsername: username,
        sourcePlatform: platform,
        enrichmentLevel: 'full',
        enrichmentMethod: pappersData ? 'sirene_pappers' : 'sirene_company'
      }
    }

    // Fallback : Pappers direct si SIRENE n'a rien trouve
    const pappersOnly = await enrichWithPappers(null, companyName, context.city)
    if (pappersOnly) {
      return {
        ...pappersOnly,
        sourceUsername: username,
        sourcePlatform: platform,
        enrichmentLevel: 'full',
        enrichmentMethod: 'pappers_direct'
      }
    }
  }

  // ETAPE 4 : Si email partiel dans bio
  if (context.partialEmail) {
    const verified = await tryEmailPermutations(context)
    if (verified) {
      return {
        email: verified,
        firstName: context.firstName,
        lastName: context.lastName,
        sourceUsername: username,
        sourcePlatform: platform,
        enrichmentLevel: 'email_only',
        enrichmentMethod: 'email_permutation'
      }
    }
  }

  // ETAPE 5 : Si nom + domaine → appeler le waterfall existant
  if (context.fullName && context.domain) {
    try {
      const { enrichEmail } = await import('./enrichEmail.js')
      const result = await enrichEmail({
        firstName: context.firstName,
        lastName: context.lastName,
        domain: context.domain,
        company: context.company
      })
      if (result?.email) {
        return {
          ...result,
          sourceUsername: username,
          sourcePlatform: platform,
          enrichmentLevel: 'email_enriched',
          enrichmentMethod: 'waterfall'
        }
      }
    } catch {
      // Waterfall non disponible, continuer
    }
  }

  // ETAPE 5b : enrichFromWebsite — si domaine detecte, scrape via Firecrawl
  if (context.domain) {
    const websiteData = await enrichFromWebsite(`https://${context.domain}`)
    if (websiteData) {
      return {
        ...websiteData,
        sourceUsername: username,
        sourcePlatform: platform,
        enrichmentLevel: 'website_enriched',
        enrichmentMethod: 'firecrawl'
      }
    }
  }

  // ETAPE 6 : Fallback — contact natif uniquement
  return {
    nativeContactOnly: true,
    platform,
    username,
    firstName: context.firstName || null,
    lastName: context.lastName || null,
    city: context.city || null,
    company: context.company || null,
    enrichmentLevel: 'minimal',
    enrichmentMethod: 'native_only'
  }
}

/**
 * Cherche un username sur plusieurs plateformes via Serper
 */
async function searchUsernameCrossPlatform(username) {
  if (!username) return {}

  const { cachedSerperFetch } = await import('../utils/serperCache.js')

  const platforms = [
    { name: 'linkedin', query: `site:linkedin.com/in "${username}"` },
    { name: 'twitter', query: `site:twitter.com "${username}"` },
    { name: 'github', query: `site:github.com "${username}"` }
  ]

  const results = {}

  for (const p of platforms) {
    try {
      const data = await cachedSerperFetch('search', { q: p.query, num: 3, gl: 'fr', hl: 'fr' })
      const firstResult = data.organic?.[0]
      if (firstResult) {
        results[p.name] = {
          url: firstResult.link,
          title: firstResult.title,
          snippet: firstResult.snippet
        }
      }

      // Rate limiting — attente entre requetes
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500))
    } catch {
      // Continue si une plateforme echoue
    }
  }

  return results
}

/**
 * Analyse le contenu public via Groq pour extraire des infos
 */
async function analyzePublicContent(username, platform, rawPost, profiles) {
  try {
    const { callGroq } = await import('../ai/callAI.js')

    const linkedinSnippet = profiles.linkedin?.snippet || ''
    const twitterSnippet = profiles.twitter?.snippet || ''

    const response = await callGroq({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Analyse ces informations et extrait le maximum de donnees sur cette personne.

Username : ${username}
Plateforme : ${platform}
Post : "${rawPost?.slice(0, 500)}"
LinkedIn : "${linkedinSnippet}"
Twitter : "${twitterSnippet}"

Reponds en JSON strict :
{
  "firstName": null,
  "lastName": null,
  "fullName": null,
  "company": null,
  "companyHint": null,
  "domain": null,
  "city": null,
  "sector": null,
  "jobTitle": null,
  "partialEmail": null
}`
      }],
      max_tokens: 200,
      temperature: 0.1
    })

    const content = response?.choices?.[0]?.message?.content?.trim()
    const jsonMatch = content?.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch {
    // Fallback silencieux
  }

  return {}
}

/**
 * Lookup SIRENE simplifie (reutilise le pipeline France existant si disponible)
 */
async function lookupSirene(companyName, city) {
  try {
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(companyName)}${city ? '&commune=' + encodeURIComponent(city) : ''}&per_page=3`
    )
    if (!response.ok) return null

    const data = await response.json()
    const first = data.results?.[0]
    if (!first) return null

    return {
      company: first.nom_complet,
      siret: first.siege?.siret,
      city: first.siege?.libelle_commune,
      naf: first.activite_principale,
      dirigeant: first.dirigeants?.[0]?.nom ? `${first.dirigeants[0].prenom} ${first.dirigeants[0].nom}` : null
    }
  } catch {
    return null
  }
}

/**
 * Enrichit un prospect a partir de l'URL de son site web via Firecrawl.
 * Extrait: email, telephone, adresse, description activite, reseaux sociaux.
 *
 * @param {string} websiteUrl - URL du site web
 * @returns {Promise<Object|null>} Donnees extraites ou null
 */
export async function enrichFromWebsite(websiteUrl) {
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
  if (!FIRECRAWL_API_KEY || !websiteUrl) return null

  try {
    // Scrape via Firecrawl — retourne du markdown LLM-ready
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ['markdown', 'extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              companyName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' },
              description: { type: 'string' },
              sector: { type: 'string' },
              linkedinUrl: { type: 'string' },
              twitterUrl: { type: 'string' },
              employeeCount: { type: 'string' }
            }
          }
        }
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const extracted = data?.data?.extract

    if (!extracted || (!extracted.email && !extracted.phone)) return null

    console.log(JSON.stringify({
      event: 'enrichFromWebsite_success',
      url: websiteUrl,
      hasEmail: Boolean(extracted.email),
      hasPhone: Boolean(extracted.phone),
      timestamp: Date.now()
    }))

    return {
      company: extracted.companyName || null,
      email: extracted.email || null,
      phone: extracted.phone || null,
      address: extracted.address || null,
      description: extracted.description || null,
      sector: extracted.sector || null,
      linkedinUrl: extracted.linkedinUrl || null,
      twitterUrl: extracted.twitterUrl || null,
      employeeCount: extracted.employeeCount || null,
      websiteUrl
    }
  } catch (error) {
    console.log(JSON.stringify({
      event: 'enrichFromWebsite_error',
      url: websiteUrl,
      error: error.message,
      timestamp: Date.now()
    }))
    return null
  }
}

/**
 * Enrichit via Pappers (apres SIRENE, pour donnees supplementaires)
 * Silencieux si PAPPERS_API_TOKEN non configure
 */
async function enrichWithPappers(sirenOrSiret, companyName, city) {
  if (!process.env.PAPPERS_API_TOKEN) return null

  try {
    const { enrichBySiren, enrichByName } = await import('./pappersEnricher.js')

    if (sirenOrSiret) {
      const result = await enrichBySiren(sirenOrSiret)
      if (result) return result
    }

    if (companyName) {
      return await enrichByName(companyName, city)
    }
  } catch {
    // Pappers non disponible — continuer sans
  }

  return null
}

/**
 * Tente des permutations email et verifie
 */
async function tryEmailPermutations(context) {
  if (!context.firstName || !context.domain) return null

  const first = context.firstName.toLowerCase()
  const last = (context.lastName || '').toLowerCase()
  const domain = context.domain

  const permutations = [
    `${first}@${domain}`,
    `${first}.${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first}-${last}@${domain}`
  ].filter(e => e.includes('@') && !e.includes('undefined'))

  // Verification basique (format valide)
  // La verification SMTP se fait via NeverBounce dans un second temps
  return permutations[0] || null
}
