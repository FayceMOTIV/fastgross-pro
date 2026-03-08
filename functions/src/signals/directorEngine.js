/**
 * directorEngine.js
 * Dimension 3 — Identite du dirigeant
 *
 * Sources : INPI Registre National → Pappers API → SIRENE fallback → Serper LinkedIn
 */

import { logger } from 'firebase-functions/v2'

export async function findDirector(lead) {
  const siren = lead?.siren || lead?.sirenNumber || null

  if (!siren) {
    // Fallback SIRENE EI
    if (lead?.nomUniteLegale && lead?.prenomUsuelUniteLegale) {
      return {
        prenom: capitalizeFirst(lead.prenomUsuelUniteLegale),
        nom: lead.nomUniteLegale.toUpperCase(),
        fullName: `${capitalizeFirst(lead.prenomUsuelUniteLegale)} ${lead.nomUniteLegale.toUpperCase()}`.trim(),
        poste: 'Dirigeant',
        isNew: false,
        anciennetePosteAns: null,
        linkedInUrl: null,
        dScoreBonus: 10,
        source: 'sirene_ei',
      }
    }
    return buildEmptyDirector('no_siren')
  }

  // Tentative 1 : Pappers API (gratuit 500 req/mois)
  try {
    const pappersResult = await fetchDirectorFromPappers(siren)
    if (pappersResult) {
      const linkedin = await findLinkedIn(pappersResult.fullName, lead?.nom || lead?.company)
      return {
        ...pappersResult,
        linkedInUrl: linkedin?.url || null,
        dScoreBonus: 15,
        source: 'pappers',
      }
    }
  } catch (e) {
    logger.warn('Pappers director fetch failed:', e.message)
  }

  // Tentative 2 : INPI Registre National
  try {
    const inpiResult = await fetchDirectorFromINPI(siren)
    if (inpiResult) {
      const linkedin = await findLinkedIn(inpiResult.fullName, lead?.nom || lead?.company)
      return {
        ...inpiResult,
        linkedInUrl: linkedin?.url || null,
        dScoreBonus: 15,
        source: 'inpi',
      }
    }
  } catch (e) {
    logger.warn('INPI director fetch failed:', e.message)
  }

  // Tentative 3 : SIRENE EI
  if (lead?.nomUniteLegale && lead?.prenomUsuelUniteLegale) {
    return {
      prenom: capitalizeFirst(lead.prenomUsuelUniteLegale),
      nom: lead.nomUniteLegale.toUpperCase(),
      fullName: `${capitalizeFirst(lead.prenomUsuelUniteLegale)} ${lead.nomUniteLegale.toUpperCase()}`.trim(),
      poste: 'Dirigeant',
      isNew: false,
      anciennetePosteAns: null,
      linkedInUrl: null,
      dScoreBonus: 10,
      source: 'sirene_ei',
    }
  }

  return buildEmptyDirector('not_found')
}

async function fetchDirectorFromPappers(siren) {
  const apiKey = process.env.PAPPERS_API_KEY
  if (!apiKey) return null

  const url = `https://api.pappers.fr/v2/entreprise?siren=${siren}&api_token=${apiKey}&representants=true`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return null

  const data = await res.json()
  const representants = data.representants || []

  if (representants.length === 0) return null

  const rep = representants[0]
  const prenom = rep.prenom_usuel || rep.prenom || ''
  const nom = rep.nom || ''

  if (!prenom && !nom) return null

  const dateNomination = rep.date_de_nomination || null
  const ancienneteAns = dateNomination
    ? (Date.now() - new Date(dateNomination).getTime()) / (365.25 * 24 * 3600 * 1000)
    : null

  return {
    prenom: capitalizeFirst(prenom),
    nom: nom.toUpperCase(),
    fullName: `${capitalizeFirst(prenom)} ${nom.toUpperCase()}`.trim(),
    poste: rep.qualite || rep.fonction || 'Dirigeant',
    dateNomination,
    isNew: ancienneteAns !== null && ancienneteAns < 0.5,
    anciennetePosteAns: ancienneteAns ? Math.round(ancienneteAns * 10) / 10 : null,
  }
}

async function fetchDirectorFromINPI(siren) {
  const url = `https://registre-national-entreprises.inpi.fr/api/companies/${siren}/beneficiaries`

  const headers = {}
  if (process.env.INPI_API_KEY) headers.Authorization = `Bearer ${process.env.INPI_API_KEY}`
  headers.Accept = 'application/json'

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) })
  if (!res.ok) return null

  const data = await res.json()
  const beneficiaries = data.beneficiaries || data || []

  const dirigeantRoles = ['president', 'gerant', 'directeur general', 'pdg', 'ceo', 'manager']
  let dirigeant = null

  const list = Array.isArray(beneficiaries) ? beneficiaries : [beneficiaries]
  for (const person of list) {
    const role = (person.role || person.fonction || person.quality || '').toLowerCase()
    if (dirigeantRoles.some(r => role.includes(r))) {
      dirigeant = person
      break
    }
  }

  if (!dirigeant && list.length > 0) dirigeant = list[0]
  if (!dirigeant) return null

  const prenom = dirigeant.firstName || dirigeant.prenom || dirigeant.prenomUsuel || ''
  const nom = dirigeant.lastName || dirigeant.nom || dirigeant.nomNaissance || ''
  if (!prenom && !nom) return null

  const dateNomination = dirigeant.dateNomination || dirigeant.dateDebut || null
  const ancienneteAns = dateNomination
    ? (Date.now() - new Date(dateNomination).getTime()) / (365.25 * 24 * 3600 * 1000)
    : null

  return {
    prenom: capitalizeFirst(prenom),
    nom: nom.toUpperCase(),
    fullName: `${capitalizeFirst(prenom)} ${nom.toUpperCase()}`.trim(),
    poste: dirigeant.role || dirigeant.fonction || 'Dirigeant',
    dateNomination,
    isNew: ancienneteAns !== null && ancienneteAns < 0.5,
    anciennetePosteAns: ancienneteAns ? Math.round(ancienneteAns * 10) / 10 : null,
  }
}

async function findLinkedIn(fullName, companyName) {
  const serperKey = process.env.SERPER_API_KEY
  if (!serperKey || !fullName) return null

  try {
    const query = `site:linkedin.com/in "${fullName}" "${companyName || ''}"`
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'fr', num: 3 }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const first = (data.organic || [])[0]
    if (first?.link?.includes('linkedin.com/in/')) {
      return { url: first.link, snippet: first.snippet }
    }
  } catch (e) { /* silent */ }
  return null
}

function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function buildEmptyDirector(reason) {
  return {
    prenom: null, nom: null, fullName: null, poste: null,
    isNew: false, linkedInUrl: null, anciennetePosteAns: null,
    dScoreBonus: 0, reason, source: 'director',
  }
}
