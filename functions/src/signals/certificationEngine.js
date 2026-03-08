/**
 * certificationEngine.js
 * Dimension 7 — Certifications & Labels
 *
 * Sources gratuites open data :
 * - ADEME (RGE)
 * - data.gouv.fr / DGEFP (Qualiopi)
 * - Agence Bio (Agriculture Biologique)
 */

import { logger } from 'firebase-functions/v2'

export async function checkCertifications(lead) {
  const siren = lead?.siren || lead?.sirenNumber || null
  const naf2 = (lead?.naf || lead?.codeNaf || '').slice(0, 2)

  const results = await Promise.allSettled([
    withTimeout(checkRGE(siren, naf2), 5000),
    withTimeout(checkQualiopi(siren), 5000),
    withTimeout(checkBio(siren, naf2), 5000),
  ])

  const rge      = results[0].status === 'fulfilled' ? results[0].value : false
  const qualiopi = results[1].status === 'fulfilled' ? results[1].value : false
  const bio      = results[2].status === 'fulfilled' ? results[2].value : false

  const certifications = []
  if (rge) certifications.push('RGE')
  if (qualiopi) certifications.push('Qualiopi')
  if (bio) certifications.push('Agriculture Biologique')

  const certScore = Math.min(100, certifications.length * 35)
  const dScoreBonus = certifications.length > 0 ? 15 : 0

  let label = null
  let alexContext = null
  if (rge) {
    label = 'Artisan/entreprise certifie RGE'
    alexContext = 'Entreprise certifiee RGE — respecte les normes de renovation energetique et investit dans la qualite.'
  } else if (qualiopi) {
    label = 'Organisme de formation certifie Qualiopi'
    alexContext = 'Structure certifiee Qualiopi — activite de formation reconnue, CA stable et regulier.'
  } else if (bio) {
    label = 'Producteur agriculture biologique certifie'
    alexContext = 'Agriculture biologique certifiee — positionnement premium, marges plus elevees.'
  }

  return {
    certifications,
    isRGE: rge,
    isQualiopi: qualiopi,
    isBio: bio,
    certScore,
    label,
    alexContext,
    dScoreBonus,
    source: 'certifications',
  }
}

async function checkRGE(siren, naf2) {
  if (!siren) return false

  const nafRGE = ['41', '43', '33', '35', '71']
  if (!nafRGE.includes(naf2)) return false

  try {
    const url = `https://data.ademe.fr/api/explore/v2.1/catalog/datasets/liste-des-entreprises-rge-2/records` +
      `?where=siret%20LIKE%20%22${siren}%25%22&limit=1`

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false

    const data = await res.json()
    return (data.total_count || 0) > 0
  } catch (e) {
    return false
  }
}

async function checkQualiopi(siren) {
  if (!siren) return false

  try {
    const searchUrl = `https://dgefp.opendatasoft.com/api/explore/v2.1/catalog/datasets/liste-publique-des-of-v2/records?where=siret%20LIKE%20%22${siren}%25%22&limit=1`

    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false

    const data = await res.json()
    return (data.total_count || 0) > 0
  } catch (e) {
    return false
  }
}

async function checkBio(siren, naf2) {
  if (!siren) return false

  if (!['01', '02', '10', '11'].includes(naf2)) return false

  try {
    const url = `https://opendata.agencebio.org/api/gouv/operateurs/?siret=${siren}000*&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false

    const data = await res.json()
    return (data.items?.length || 0) > 0
  } catch (e) {
    return false
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}
