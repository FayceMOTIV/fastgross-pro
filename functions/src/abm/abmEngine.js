/**
 * ABM Engine — Account-Based Marketing Multi-Decideurs
 *
 * Identifie les decideurs d'une entreprise (10+ salaries)
 * et genere des messages personnalises par role.
 *
 * Sources :
 *   1. Pappers API (representants legaux via SIREN)
 *   2. SIRENE/INSEE API (fallback dirigeants)
 *
 * Roles normalises : DG, DAF, COMEX_COMMERCIAL, CMO, DSI, DRH, dirigeant
 *
 * IA : Groq llama-3.3-70b-versatile pour personnalisation par role
 *
 * Export : identifyDecisionMakers(companyData)
 */

import Groq from 'groq-sdk'
import { logger } from 'firebase-functions/v2'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

// ============================================
// CONFIGURATION
// ============================================

const PAPPERS_BASE = 'https://api.pappers.fr/v2'
const SIRENE_BASE = 'https://api.insee.fr/entreprises/sirene/V3.11'

const MIN_EMPLOYEES_ABM = 10

/** Mapping qualites Pappers → roles normalises */
const ROLE_MAP = {
  'president': 'DG',
  'president du conseil d\'administration': 'DG',
  'president-directeur general': 'DG',
  'directeur general': 'DG',
  'gerant': 'DG',
  'co-gerant': 'DG',
  'directeur general delegue': 'DG',

  'directeur administratif et financier': 'DAF',
  'directeur financier': 'DAF',
  'responsable financier': 'DAF',
  'chef comptable': 'DAF',

  'directeur commercial': 'COMEX_COMMERCIAL',
  'directeur des ventes': 'COMEX_COMMERCIAL',
  'responsable commercial': 'COMEX_COMMERCIAL',
  'directeur du developpement': 'COMEX_COMMERCIAL',

  'directeur marketing': 'CMO',
  'responsable marketing': 'CMO',
  'directeur de la communication': 'CMO',
  'responsable communication': 'CMO',

  'directeur des systemes d\'information': 'DSI',
  'directeur informatique': 'DSI',
  'directeur technique': 'DSI',
  'responsable informatique': 'DSI',
  'chief technology officer': 'DSI',
  'cto': 'DSI',

  'directeur des ressources humaines': 'DRH',
  'responsable des ressources humaines': 'DRH',
  'drh': 'DRH',
}

/** Angles de personnalisation par role */
const ROLE_ANGLES = {
  DG: {
    angle: 'ROI et croissance',
    focus: 'retour sur investissement, croissance du chiffre d\'affaires, avantage concurrentiel, vision strategique',
  },
  DAF: {
    angle: 'Reduction des couts',
    focus: 'reduction des couts d\'acquisition client, optimisation du budget marketing, ROI mesurable, previsibilite des depenses',
  },
  COMEX_COMMERCIAL: {
    angle: 'Pipeline de leads',
    focus: 'generation de leads qualifies, augmentation du pipeline commercial, taux de conversion, acceleration du cycle de vente',
  },
  CMO: {
    angle: 'Strategie multicanale',
    focus: 'prospection multicanale automatisee, visibilite de marque, engagement prospects, personnalisation a grande echelle',
  },
  DSI: {
    angle: 'Integration API',
    focus: 'integration API simple, securite des donnees, conformite RGPD, architecture scalable, zero maintenance serveur',
  },
  DRH: {
    angle: 'Marque employeur',
    focus: 'marque employeur, recrutement digital, visibilite entreprise, communication RH externe',
  },
  dirigeant: {
    angle: 'ROI et croissance',
    focus: 'retour sur investissement, croissance, simplification de la prospection, gain de temps',
  },
}

// ============================================
// SOURCES DE DONNEES
// ============================================

/**
 * Source 1 : Pappers API — representants legaux
 */
async function fetchPappersRepresentants(siren) {
  const token = process.env.PAPPERS_API_TOKEN
  if (!token) {
    logger.warn('[ABM] PAPPERS_API_TOKEN non configure — skip Pappers')
    return []
  }

  const cleaned = siren.replace(/\s/g, '')
  if (!/^\d{9,14}$/.test(cleaned)) {
    logger.warn(`[ABM] SIREN invalide pour Pappers: ${siren}`)
    return []
  }

  try {
    const url = `${PAPPERS_BASE}/entreprise?api_token=${token}&siren=${cleaned}`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) {
      logger.warn(`[ABM] Pappers HTTP ${response.status} pour SIREN ${cleaned}`)
      return []
    }

    const data = await response.json()
    const representants = data.representants || []

    return representants
      .filter((r) => r.nom || r.nom_patronymique)
      .map((r) => ({
        prenom: r.prenom || '',
        nom: r.nom_patronymique || r.nom || '',
        qualite: (r.qualite || '').toLowerCase().trim(),
        dateNaissance: r.date_de_naissance || null,
        source: 'pappers',
      }))
  } catch (error) {
    logger.error(`[ABM] Erreur Pappers representants: ${error.message}`)
    return []
  }
}

/**
 * Source 2 : SIRENE/INSEE API — fallback dirigeants
 */
async function fetchSireneRepresentants(siren) {
  const token = process.env.INSEE_API_TOKEN
  if (!token) {
    logger.warn('[ABM] INSEE_API_TOKEN non configure — skip SIRENE')
    return []
  }

  const cleaned = siren.replace(/\s/g, '')

  try {
    const url = `${SIRENE_BASE}/siren/${cleaned}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      logger.warn(`[ABM] SIRENE HTTP ${response.status} pour SIREN ${cleaned}`)
      return []
    }

    const data = await response.json()
    const uniteLegale = data.uniteLegale

    if (!uniteLegale) return []

    // SIRENE fournit le dirigeant principal
    const results = []

    if (uniteLegale.prenom1UniteLegale || uniteLegale.nomUniteLegale) {
      results.push({
        prenom: uniteLegale.prenom1UniteLegale || '',
        nom: uniteLegale.nomUniteLegale || '',
        qualite: 'dirigeant',
        dateNaissance: null,
        source: 'sirene',
      })
    }

    return results
  } catch (error) {
    logger.error(`[ABM] Erreur SIRENE representants: ${error.message}`)
    return []
  }
}

// ============================================
// DEDUPLICATION & NORMALISATION
// ============================================

/**
 * Normalise un role brut en role standard ABM
 */
function normalizeRole(qualite) {
  if (!qualite) return 'dirigeant'

  const normalized = qualite.toLowerCase().trim()
  const mapped = ROLE_MAP[normalized]
  if (mapped) return mapped

  // Recherche partielle
  for (const [pattern, role] of Object.entries(ROLE_MAP)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return role
    }
  }

  return 'dirigeant'
}

/**
 * Cle de deduplication basee sur le nom
 */
function deduplicationKey(contact) {
  return `${contact.prenom.toLowerCase().trim()}_${contact.nom.toLowerCase().trim()}`
}

/**
 * Deduplique les contacts par nom (prenom + nom)
 * Priorite : pappers > sirene
 */
function deduplicateContacts(contacts) {
  const seen = new Map()

  for (const contact of contacts) {
    const key = deduplicationKey(contact)
    if (!key || key === '_') continue

    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, contact)
    } else if (contact.source === 'pappers' && existing.source !== 'pappers') {
      // Pappers est plus fiable — remplacer
      seen.set(key, contact)
    }
    // Sinon garder l'existant
  }

  return Array.from(seen.values())
}

// ============================================
// GENERATION MESSAGES IA (GROQ)
// ============================================

/**
 * Genere un message personnalise par role via Groq
 */
async function generateRoleMessages(contact, companyData, groqClient) {
  const role = contact.role
  const roleConfig = ROLE_ANGLES[role] || ROLE_ANGLES.dirigeant
  const fullName = [contact.prenom, contact.nom].filter(Boolean).join(' ')

  const prompt = `Tu es un expert en prospection B2B ABM (Account-Based Marketing).
Genere 2 messages de prospection ultra-personnalises pour ce decideur.

ENTREPRISE :
- Nom : ${companyData.nom_entreprise || companyData.company || 'N/A'}
- Secteur : ${companyData.libelle_naf || companyData.sector || 'N/A'}
- Effectif : ${companyData.effectif || companyData.employees || 'N/A'}
- CA : ${companyData.chiffre_affaires || 'N/A'}
- Ville : ${companyData.ville || companyData.city || 'N/A'}

DECIDEUR :
- Nom : ${fullName}
- Role : ${contact.qualite || role}
- Role normalise : ${role}

ANGLE DE PERSONNALISATION : ${roleConfig.angle}
FOCUS : ${roleConfig.focus}

SERVICE PROPOSE : Face Media Factory — plateforme de prospection multicanale IA (email, SMS, WhatsApp, LinkedIn, Instagram, courrier).

GENERE 2 MESSAGES :
1. Un message WhatsApp court (max 300 caracteres, tutoiement, direct, sans emoji excessif)
2. Un email professionnel (objet + corps, vouvoiement, max 150 mots)

FORMAT JSON STRICT :
{
  "whatsapp": "message whatsapp ici",
  "email_subject": "objet email ici",
  "email_body": "corps email ici"
}

IMPORTANT : Adapte le message au ROLE du decideur. Un DG veut du ROI, un DAF veut des chiffres de reduction, un CMO veut du multicanal, un DSI veut de la tech.

REPONSE :`

  try {
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      logger.warn(`[ABM] Groq reponse vide pour ${fullName}`)
      return null
    }

    const parsed = safeParseLLMJson(content)

    return {
      whatsapp: parsed.whatsapp || null,
      email_subject: parsed.email_subject || null,
      email_body: parsed.email_body || null,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
      tokensUsed: completion.usage?.total_tokens || 0,
    }
  } catch (error) {
    logger.error(`[ABM] Erreur Groq pour ${fullName}: ${error.message}`)
    return null
  }
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Identifie les decideurs d'une entreprise et genere des messages personnalises
 *
 * @param {Object} companyData - Donnees entreprise (siren, nom_entreprise, effectif, etc.)
 * @returns {Promise<Object>} {
 *   eligible: boolean,
 *   reason?: string,
 *   contacts: Array<{
 *     prenom, nom, qualite, role, source,
 *     messages: { whatsapp, email_subject, email_body, model, provider, tokensUsed }
 *   }>,
 *   companyName: string,
 *   siren: string,
 *   totalDecisionMakers: number,
 *   rolesFound: string[],
 *   generatedAt: string,
 * }
 */
export async function identifyDecisionMakers(companyData) {
  const siren = companyData.siren || companyData.siret?.substring(0, 9)

  if (!siren) {
    return {
      eligible: false,
      reason: 'SIREN manquant — impossible d\'identifier les decideurs',
      contacts: [],
      companyName: companyData.nom_entreprise || companyData.company || null,
      siren: null,
      totalDecisionMakers: 0,
      rolesFound: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // Verifier effectif minimum
  const effectif = companyData.effectif_min || companyData.employees || 0
  const effectifNum = typeof effectif === 'string' ? parseInt(effectif, 10) : effectif

  if (effectifNum > 0 && effectifNum < MIN_EMPLOYEES_ABM) {
    return {
      eligible: false,
      reason: `Effectif insuffisant (${effectifNum} < ${MIN_EMPLOYEES_ABM}) — ABM non recommande`,
      contacts: [],
      companyName: companyData.nom_entreprise || companyData.company || null,
      siren,
      totalDecisionMakers: 0,
      rolesFound: [],
      generatedAt: new Date().toISOString(),
    }
  }

  logger.info(`[ABM] Identification decideurs pour SIREN ${siren} (${companyData.nom_entreprise || 'N/A'})`)

  // Fetch representants depuis les 2 sources
  const [pappersContacts, sireneContacts] = await Promise.all([
    fetchPappersRepresentants(siren),
    fetchSireneRepresentants(siren),
  ])

  logger.info(`[ABM] Sources: Pappers=${pappersContacts.length}, SIRENE=${sireneContacts.length}`)

  // Merge + deduplication
  const allContacts = [...pappersContacts, ...sireneContacts]
  const deduplicated = deduplicateContacts(allContacts)

  if (deduplicated.length === 0) {
    return {
      eligible: false,
      reason: 'Aucun decideur trouve via Pappers ni SIRENE',
      contacts: [],
      companyName: companyData.nom_entreprise || companyData.company || null,
      siren,
      totalDecisionMakers: 0,
      rolesFound: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // Normaliser les roles
  const contactsWithRoles = deduplicated.map((c) => ({
    ...c,
    role: normalizeRole(c.qualite),
    fullName: [c.prenom, c.nom].filter(Boolean).join(' '),
  }))

  // Generer messages personnalises via Groq
  const apiKey = process.env.GROQ_API_KEY
  let contactsWithMessages

  if (!apiKey) {
    logger.warn('[ABM] GROQ_API_KEY non configure — messages non generes')
    contactsWithMessages = contactsWithRoles.map((c) => ({
      ...c,
      messages: null,
    }))
  } else {
    const groqClient = new Groq({ apiKey })

    // Generation sequentielle pour respecter les rate limits Groq
    contactsWithMessages = []
    for (const contact of contactsWithRoles) {
      const messages = await generateRoleMessages(contact, companyData, groqClient)
      contactsWithMessages.push({ ...contact, messages })
    }
  }

  const rolesFound = [...new Set(contactsWithMessages.map((c) => c.role))]

  logger.info(JSON.stringify({
    event: 'abm_decision_makers_identified',
    siren,
    company: companyData.nom_entreprise || null,
    totalFound: contactsWithMessages.length,
    roles: rolesFound,
    timestamp: Date.now(),
  }))

  return {
    eligible: true,
    contacts: contactsWithMessages,
    companyName: companyData.nom_entreprise || companyData.company || null,
    siren,
    totalDecisionMakers: contactsWithMessages.length,
    rolesFound,
    generatedAt: new Date().toISOString(),
  }
}
