/**
 * Pappers Enricher — Enrichissement entreprise via Pappers.fr API
 *
 * Free tier : 10 000 fiches entreprises/mois (token requis)
 * Docs : https://www.pappers.fr/api/documentation
 *
 * Exports :
 *   - enrichBySiren(siren) : enrichissement par SIREN/SIRET
 *   - enrichByName(nom, codePostal) : recherche par nom + CP
 *   - checkPappersQuota() : solde jetons via /suivi-jetons
 *   - enrichCompanyPappers (onCall) : callable Cloud Function
 *   - getPappersQuota (onCall) : callable Cloud Function
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

const PAPPERS_BASE = 'https://api.pappers.fr/v2'

function getToken() {
  const token = process.env.PAPPERS_API_TOKEN
  if (!token) {
    throw new Error('PAPPERS_API_TOKEN non configure')
  }
  return token
}

/**
 * Normalise la reponse Pappers en format FMF standard
 */
function normalizeCompany(data) {
  if (!data) return null

  const dirigeant = {}
  if (data.representants?.length > 0) {
    const rep = data.representants[0]
    dirigeant.prenom = rep.prenom || ''
    dirigeant.nom = rep.nom_patronymique || rep.nom || ''
    dirigeant.qualite = rep.qualite || ''
    dirigeant.fullName = [dirigeant.prenom, dirigeant.nom].filter(Boolean).join(' ')
  }

  const siege = data.siege || {}

  return {
    siren: data.siren || null,
    siret: siege.siret || data.siret || null,
    nom_entreprise: data.nom_entreprise || data.denomination || null,
    nom_commercial: data.nom_commercial || null,
    dirigeant: dirigeant.fullName ? dirigeant : null,
    adresse: siege.adresse_ligne_1 || null,
    complement_adresse: siege.adresse_ligne_2 || null,
    code_postal: siege.code_postal || null,
    ville: siege.ville || null,
    forme_juridique: data.forme_juridique || null,
    date_creation: data.date_creation || null,
    effectif: data.tranche_effectif || null,
    effectif_min: data.effectif_min || null,
    effectif_max: data.effectif_max || null,
    chiffre_affaires: data.chiffre_affaires || null,
    resultat: data.resultat || null,
    code_naf: data.code_naf || siege.code_naf || null,
    libelle_naf: data.libelle_code_naf || siege.libelle_code_naf || null,
    capital: data.capital || null,
    statut_rcs: data.statut_rcs || null,
    greffe: data.greffe || null,
    convention_collective: data.convention_collective || null,
    source: 'pappers',
  }
}

/**
 * Enrichit une entreprise par son SIREN ou SIRET
 *
 * @param {string} siren — SIREN (9 chiffres) ou SIRET (14 chiffres)
 * @returns {Promise<Object|null>} Donnees entreprise normalisees
 */
export async function enrichBySiren(siren) {
  if (!siren) return null

  const cleaned = siren.replace(/\s/g, '')
  if (!/^\d{9,14}$/.test(cleaned)) {
    logger.warn(`[PappersEnricher] SIREN/SIRET invalide: ${siren}`)
    return null
  }

  const token = getToken()
  const paramName = cleaned.length === 14 ? 'siret' : 'siren'

  try {
    const url = `${PAPPERS_BASE}/entreprise?api_token=${token}&${paramName}=${cleaned}`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (response.status === 404) {
      logger.info(`[PappersEnricher] Entreprise non trouvee: ${cleaned}`)
      return null
    }

    if (response.status === 401) {
      logger.error('[PappersEnricher] Token invalide ou expire')
      throw new Error('Token Pappers invalide')
    }

    if (response.status === 429) {
      logger.warn('[PappersEnricher] Quota Pappers depasse')
      throw new Error('Quota Pappers depasse')
    }

    if (!response.ok) {
      logger.error(`[PappersEnricher] HTTP ${response.status}`)
      return null
    }

    const data = await response.json()
    const result = normalizeCompany(data)

    logger.info(JSON.stringify({
      event: 'pappers_enrich_siren',
      siren: cleaned,
      found: Boolean(result),
      timestamp: Date.now(),
    }))

    return result
  } catch (error) {
    if (error.message === 'Token Pappers invalide' || error.message === 'Quota Pappers depasse') {
      throw error
    }
    logger.error(`[PappersEnricher] Erreur enrichBySiren: ${error.message}`)
    return null
  }
}

/**
 * Recherche une entreprise par nom et code postal
 *
 * @param {string} nom — Nom de l'entreprise
 * @param {string} codePostal — Code postal (optionnel)
 * @returns {Promise<Object|null>} Premier resultat normalise
 */
export async function enrichByName(nom, codePostal) {
  if (!nom) return null

  const token = getToken()
  const params = new URLSearchParams({
    api_token: token,
    q: nom,
    par_page: '5',
  })

  if (codePostal) {
    params.set('code_postal', codePostal.replace(/\s/g, ''))
  }

  try {
    const url = `${PAPPERS_BASE}/recherche?${params.toString()}`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (response.status === 401) {
      throw new Error('Token Pappers invalide')
    }
    if (response.status === 429) {
      throw new Error('Quota Pappers depasse')
    }
    if (!response.ok) {
      logger.error(`[PappersEnricher] HTTP ${response.status} pour recherche "${nom}"`)
      return null
    }

    const data = await response.json()
    const results = data.resultats || data.results || []

    if (results.length === 0) {
      logger.info(`[PappersEnricher] Aucun resultat pour "${nom}" (CP: ${codePostal || 'none'})`)
      return null
    }

    // Prendre le meilleur match
    const best = results[0]
    const result = normalizeCompany(best)

    logger.info(JSON.stringify({
      event: 'pappers_enrich_name',
      query: nom,
      codePostal: codePostal || null,
      resultsCount: results.length,
      matchedSiren: result?.siren,
      timestamp: Date.now(),
    }))

    return result
  } catch (error) {
    if (error.message === 'Token Pappers invalide' || error.message === 'Quota Pappers depasse') {
      throw error
    }
    logger.error(`[PappersEnricher] Erreur enrichByName: ${error.message}`)
    return null
  }
}

/**
 * Verifie le solde de jetons Pappers
 *
 * @returns {Promise<Object>} { jetons_utilises, jetons_restants, pourcentage_utilise }
 */
export async function checkPappersQuota() {
  const token = getToken()

  try {
    const url = `${PAPPERS_BASE}/suivi-jetons?api_token=${token}`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    return {
      jetons_utilises: data.jetons_utilises ?? data.nb_jetons_utilises ?? 0,
      jetons_restants: data.jetons_restants ?? data.nb_jetons_restants ?? 0,
      pourcentage_utilise: data.pourcentage_utilise ?? 0,
      limite_mensuelle: data.limite_mensuelle ?? 10000,
    }
  } catch (error) {
    logger.error(`[PappersEnricher] Erreur checkQuota: ${error.message}`)
    return null
  }
}

// ============================================
// CALLABLE CLOUD FUNCTIONS
// ============================================

/**
 * Callable : Enrichissement entreprise via Pappers
 *
 * Input: { siren?: string, nom?: string, codePostal?: string }
 * Output: { success, data, source: 'pappers' }
 */
export const enrichCompanyPappers = onCall(
  { region: 'europe-west1', timeoutSeconds: 15, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { siren, nom, codePostal } = request.data || {}

    if (!siren && !nom) {
      throw new HttpsError('invalid-argument', 'siren ou nom requis')
    }

    try {
      let result = null

      if (siren) {
        result = await enrichBySiren(siren)
      } else {
        result = await enrichByName(nom, codePostal)
      }

      if (!result) {
        return { success: false, data: null, message: 'Entreprise non trouvee' }
      }

      return { success: true, data: result, source: 'pappers' }
    } catch (error) {
      logger.error(`[enrichCompanyPappers] ${error.message}`)
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Callable : Solde jetons Pappers
 */
export const getPappersQuota = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    try {
      const quota = await checkPappersQuota()
      if (!quota) {
        return { success: false, message: 'Impossible de verifier le quota' }
      }
      return { success: true, ...quota }
    } catch (error) {
      throw new HttpsError('internal', error.message)
    }
  }
)
