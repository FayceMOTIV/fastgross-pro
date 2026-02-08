/**
 * ProspectFinder - Recherche de prospects via Google CSE et scraping annuaires
 * Source 1: Google Custom Search Engine (100 requetes/jour gratuites)
 * Source 2: Scraping annuaires francais (Pages Jaunes, Societe.com)
 */

import { db } from '../lib/firebase'
import { collection, doc, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { PROSPECT_FINDER_CONFIG, PROSPECT_STATUS, sleep } from './config'

/**
 * Nettoyer le titre d'un resultat de recherche
 */
const cleanTitle = (title) => {
  if (!title) return ''
  return title
    .replace(/\s*[-|]\s*.*/g, '') // Retire tout apres un tiret ou pipe
    .replace(/\s*\|\s*.*/g, '')
    .replace(/^\s+|\s+$/g, '') // Trim
    .substring(0, 100) // Max 100 caracteres
}

/**
 * Verifier si un prospect existe deja (par domaine)
 */
const isDuplicate = async (domain, orgId) => {
  const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
  const q = query(prospectsRef, where('domain', '==', domain))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

/**
 * Construire les requetes de recherche a partir de la config niche
 */
export const buildSearchQueries = (config) => {
  const queries = []

  for (const keyword of config.keywords || []) {
    // Recherche de base
    queries.push(`${keyword} ${config.location}`)
    // Avec "contact" pour trouver des pages de contact
    queries.push(`${keyword} ${config.location} contact`)
    // Exclure YouTube et videos
    queries.push(`${keyword} ${config.location} -youtube -video`)
  }

  // Limiter au nombre max de requetes par run
  return queries.slice(0, PROSPECT_FINDER_CONFIG.maxQueriesPerRun)
}

/**
 * Recherche via Google Custom Search Engine
 * Chaque utilisateur utilise sa propre cle API (gratuit)
 */
export const searchViaGoogleCSE = async (config) => {
  const { googleCseApiKey, googleCseCxId, orgId } = config

  if (!googleCseApiKey || !googleCseCxId) {
    console.warn('Google CSE non configure, fallback vers annuaires')
    return []
  }

  const queries = buildSearchQueries(config)
  const results = []

  for (const queryText of queries) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1` +
          `?key=${googleCseApiKey}` +
          `&cx=${googleCseCxId}` +
          `&q=${encodeURIComponent(queryText)}` +
          `&num=${PROSPECT_FINDER_CONFIG.resultsPerQuery}`
      )

      const data = await response.json()

      if (data.error) {
        console.warn('Google CSE error:', data.error.message)
        continue
      }

      for (const item of data.items || []) {
        try {
          const url = new URL(item.link)
          const domain = url.hostname.replace(/^www\./, '')

          // Verifier les doublons
          if (await isDuplicate(domain, orgId)) continue

          // Verifier les exclusions
          if (config.excludeKeywords && config.excludeKeywords.length > 0) {
            const titleLower = (item.title || '').toLowerCase()
            const snippetLower = (item.snippet || '').toLowerCase()
            const shouldExclude = config.excludeKeywords.some(
              (keyword) =>
                titleLower.includes(keyword.toLowerCase()) ||
                snippetLower.includes(keyword.toLowerCase())
            )
            if (shouldExclude) continue
          }

          results.push({
            name: cleanTitle(item.title),
            url: item.link,
            domain,
            snippet: item.snippet || '',
            source: 'google_cse',
            status: PROSPECT_STATUS.FOUND,
            foundAt: new Date(),
          })
        } catch (urlError) {
          console.warn('Invalid URL:', item.link)
        }
      }

      // Petit delai entre les requetes pour respecter les quotas
      await sleep(500)
    } catch (error) {
      console.error('Google CSE search error:', error)
    }
  }

  return results
}

/**
 * Scraping Pages Jaunes (fallback si pas de cle Google CSE)
 * NOTE: A implementer avec une Cloud Function pour eviter les problemes CORS
 * Cette fonction est un placeholder qui sera appelee depuis une Cloud Function
 */
export const scrapePageJaunes = async (config) => {
  // Cette fonction doit etre implementee cote serveur (Cloud Function)
  // car le scraping direct depuis le navigateur pose des problemes de CORS
  console.warn('scrapePageJaunes doit etre appele via Cloud Function')
  return []
}

/**
 * Scraping Societe.com (fallback si pas de cle Google CSE)
 * NOTE: Meme remarque que Pages Jaunes
 */
export const scrapeSocieteCom = async (config) => {
  console.warn('scrapeSocieteCom doit etre appele via Cloud Function')
  return []
}

/**
 * Sauvegarder les prospects trouves dans Firestore
 */
export const saveProspects = async (orgId, prospects) => {
  const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
  const savedIds = []

  for (const prospect of prospects) {
    try {
      // Verifier une derniere fois les doublons
      if (await isDuplicate(prospect.domain, orgId)) continue

      const docRef = await addDoc(prospectsRef, {
        ...prospect,
        emails: [],
        contactName: '',
        phone: '',
        score: 0,
        scoreDetails: {},
        generatedEmail: { subject: '', body: '' },
        sentVia: null,
        orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      savedIds.push(docRef.id)
    } catch (error) {
      console.error('Error saving prospect:', error)
    }
  }

  return savedIds
}

/**
 * Recherche principale de prospects
 * Utilise Google CSE si configure, sinon fallback vers annuaires
 */
export const searchProspects = async (config) => {
  let results = []

  // Essayer Google CSE d'abord
  if (config.googleCseApiKey && config.googleCseCxId) {
    results = await searchViaGoogleCSE(config)
  }

  // Si pas assez de resultats, completer avec les annuaires
  // (sera implemente via Cloud Functions)
  if (results.length < 10 && config.useDirectories !== false) {
    // Les resultats des annuaires seront ajoutes ici
    // via les Cloud Functions scrapePageJaunes et scrapeSocieteCom
  }

  // Sauvegarder les prospects trouves
  const savedIds = await saveProspects(config.orgId, results)

  return {
    found: results.length,
    saved: savedIds.length,
    prospects: results.map((p, i) => ({
      ...p,
      id: savedIds[i] || null,
    })),
  }
}

/**
 * Obtenir les prospects par statut
 */
export const getProspectsByStatus = async (orgId, status, limit = 50) => {
  const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
  const q = query(prospectsRef, where('status', '==', status))
  const snapshot = await getDocs(q)

  const prospects = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Trier par date et limiter
  return prospects
    .sort((a, b) => {
      const dateA = a.foundAt?.toDate?.() || new Date(a.foundAt)
      const dateB = b.foundAt?.toDate?.() || new Date(b.foundAt)
      return dateA - dateB
    })
    .slice(0, limit)
}

/**
 * Obtenir les meilleurs prospects (top scores) prets a etre contactes
 */
export const getTopScoredProspects = async (orgId, limit = 20, minScore = 50) => {
  const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
  const q = query(prospectsRef, where('status', '==', PROSPECT_STATUS.SCORED))
  const snapshot = await getDocs(q)

  const prospects = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Filtrer par score minimum et trier par score decroissant
  return prospects
    .filter((p) => p.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Mettre a jour un prospect
 */
export const updateProspect = async (orgId, prospectId, updates) => {
  const prospectRef = doc(db, 'organizations', orgId, 'prospects', prospectId)
  const { updateDoc } = await import('firebase/firestore')
  await updateDoc(prospectRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export default {
  buildSearchQueries,
  searchViaGoogleCSE,
  scrapePageJaunes,
  scrapeSocieteCom,
  saveProspects,
  searchProspects,
  getProspectsByStatus,
  getTopScoredProspects,
  updateProspect,
}
