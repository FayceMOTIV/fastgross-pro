/**
 * socialPresenceEngine.js
 * Dimension 8 — Presence reseaux sociaux
 *
 * Sources : Serper (1-2 requetes max) + donnees deja en cache
 */

import { logger } from 'firebase-functions/v2'

export async function analyzeSocialPresenceV2(lead) {
  const serperKey = process.env.SERPER_API_KEY
  const nom = lead?.nom || lead?.denominationUsuelleUniteLegale || lead?.raisonSociale || lead?.company || null

  if (!nom || !serperKey) {
    return buildEmptySocial('no_data')
  }

  try {
    const query = `"${nom}" (site:facebook.com OR site:instagram.com OR site:linkedin.com/company)`

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 10 }),
      signal: AbortSignal.timeout(7000),
    })

    if (!res.ok) return buildEmptySocial('serper_error')

    const data = await res.json()
    const results = data.organic || []

    const facebook  = extractSocialProfile(results, 'facebook.com')
    const instagram = extractSocialProfile(results, 'instagram.com')
    const linkedin  = extractSocialProfile(results, 'linkedin.com/company')

    const pagesJaunes = await checkPagesJaunes(nom, lead?.codePostal, serperKey)

    let socialScore = 0
    const found = []
    const missingPlatforms = []

    if (facebook.found)  { socialScore += 25; found.push('Facebook') }
    else missingPlatforms.push('Facebook')

    if (instagram.found) { socialScore += 20; found.push('Instagram') }
    else missingPlatforms.push('Instagram')

    if (linkedin.found)  { socialScore += 25; found.push('LinkedIn') }
    else missingPlatforms.push('LinkedIn Entreprise')

    if (pagesJaunes.found) { socialScore += 15; found.push('PagesJaunes') }

    if (lead?.website) socialScore += 15
    else missingPlatforms.push('Site web')

    let alexContext = null
    if (found.length === 0) {
      alexContext = 'Aucune presence sur les reseaux sociaux detectee — presence digitale quasi absente.'
    } else if (found.length === 1) {
      alexContext = `Present uniquement sur ${found[0]} — presence digitale limitee.`
    } else if (missingPlatforms.length > 0) {
      alexContext = `Actif sur ${found.join(' et ')} mais absent sur ${missingPlatforms.slice(0, 2).join(', ')}.`
    } else {
      alexContext = `Bonne presence sociale : ${found.join(', ')}.`
    }

    const dScoreBonus = socialScore < 30 ? 8 : socialScore < 60 ? 4 : 1

    return {
      facebook,
      instagram,
      linkedin,
      pagesJaunes,
      socialScore,
      missingPlatforms,
      presentPlatforms: found,
      alexContext,
      dScoreBonus,
      source: 'social_presence',
    }
  } catch (e) {
    logger.warn('Social presence analysis error:', e.message)
    return buildEmptySocial('error')
  }
}

function extractSocialProfile(results, domain) {
  const match = results.find(r => r.link?.includes(domain))
  if (!match) return { found: false }

  const snippet = match.snippet || ''
  const followersMatch = snippet.match(/(\d[\d\s,.]+)\s*(?:abonnes?|followers?|likes?)/i)
  const followers = followersMatch
    ? parseInt(followersMatch[1].replace(/[\s,.]/g, ''))
    : null

  return {
    found: true,
    url: match.link,
    followers,
    snippet: snippet.slice(0, 200),
  }
}

async function checkPagesJaunes(nom, codePostal, serperKey) {
  try {
    const query = `"${nom}" site:pagesjaunes.fr${codePostal ? ' ' + codePostal : ''}`
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'fr', num: 3 }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return { found: false }
    const data = await res.json()
    const match = (data.organic || []).find(r => r.link?.includes('pagesjaunes.fr'))
    return match ? { found: true, url: match.link } : { found: false }
  } catch (e) {
    return { found: false }
  }
}

function buildEmptySocial(reason) {
  return {
    facebook: { found: false }, instagram: { found: false },
    linkedin: { found: false }, pagesJaunes: { found: false },
    socialScore: 0, missingPlatforms: [], presentPlatforms: [],
    alexContext: null, dScoreBonus: 0, reason,
    source: 'social_presence',
  }
}
