/**
 * Wikidata Entity Creator — Module 6 (Alex V4 SHIELD)
 * Genere un JSON d'entite Wikidata-compatible pour ameliorer
 * la visibilite de la marque sur les knowledge graphs.
 *
 * Fonctionnalites :
 *  1. Collecte les infos publiques (site web, reseaux sociaux, description)
 *  2. Genere un JSON conforme au format Wikidata
 *  3. Fournit les instructions pour soumettre sur wikidata.org
 *  4. Verifie si l'entite existe deja (recherche Wikidata API)
 *
 * IMPORTANT : Pas de creation automatique sur Wikidata.
 * L'utilisateur doit soumettre manuellement pour respecter les guidelines Wikidata.
 *
 * Storage: organizations/{orgId}/wikidataEntities/{entityId}
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const WIKIDATA_SEARCH_URL = 'https://www.wikidata.org/w/api.php'

// ─── Wikidata property mapping ───────────────────────────────────────

const PROPERTIES = {
  instanceOf: 'P31',
  officialWebsite: 'P856',
  countryOfOrigin: 'P495',
  inception: 'P571',
  industry: 'P452',
  headquarters: 'P159',
  founderName: 'P112',
  officialName: 'P1448',
  shortName: 'P1813',
  twitterUsername: 'P2002',
  facebookId: 'P2013',
  linkedInOrgId: 'P4264',
  instagramUsername: 'P2003',
  legalForm: 'P1454',
  sirenNumber: 'P1616',
  description: 'description',
}

// ─── Entity types ────────────────────────────────────────────────────

const ENTITY_TYPES = {
  company: { qid: 'Q4830453', label: 'entreprise' },
  startup: { qid: 'Q7723358', label: 'startup' },
  organization: { qid: 'Q43229', label: 'organisation' },
  brand: { qid: 'Q431289', label: 'marque' },
  software: { qid: 'Q7397', label: 'logiciel' },
  saas: { qid: 'Q1254596', label: 'SaaS' },
}

// ─── Callable: check if entity exists ────────────────────────────────

export const checkWikidataEntity = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { brandName } = request.data || {}
  if (!brandName) throw new HttpsError('invalid-argument', 'brandName requis')

  const results = await searchWikidata(brandName)
  return {
    success: true,
    exists: results.length > 0,
    results: results.slice(0, 5),
    brandName,
  }
})

// ─── Callable: generate Wikidata entity JSON ─────────────────────────

export const generateWikidataEntity = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, brandName, entityType, companyInfo } = request.data || {}
  if (!orgId || !brandName) throw new HttpsError('invalid-argument', 'orgId et brandName requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  // Check if entity already exists on Wikidata
  const existing = await searchWikidata(brandName)

  // Get org data for auto-fill
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const org = orgDoc.data() || {}

  // Build entity info from org + manual input
  const info = {
    name: brandName,
    description: companyInfo?.description || org.activity || org.description || '',
    website: companyInfo?.website || org.website || '',
    country: companyInfo?.country || 'France',
    city: companyInfo?.city || org.city || '',
    foundedYear: companyInfo?.foundedYear || org.foundedYear || '',
    founder: companyInfo?.founder || org.founderName || '',
    industry: companyInfo?.industry || org.niche || org.sector || '',
    siren: companyInfo?.siren || org.siren || '',
    twitter: companyInfo?.twitter || org.twitter || '',
    facebook: companyInfo?.facebook || org.facebook || '',
    linkedin: companyInfo?.linkedin || org.linkedin || '',
    instagram: companyInfo?.instagram || org.instagram || '',
    legalForm: companyInfo?.legalForm || org.legalForm || '',
  }

  // Generate Wikidata-compatible JSON
  const type = ENTITY_TYPES[entityType] || ENTITY_TYPES.company
  const entityJSON = buildWikidataJSON(info, type)

  // Generate AI-enhanced description if needed
  let enhancedDescription = info.description
  if (!enhancedDescription || enhancedDescription.length < 20) {
    enhancedDescription = await generateDescription(info)
  }
  entityJSON.descriptions.fr.value = enhancedDescription

  // Generate submission instructions
  const instructions = generateInstructions(brandName, existing.length > 0)

  // Save to Firestore
  const ref = await db.collection(`organizations/${orgId}/wikidataEntities`).add({
    brandName,
    entityType: entityType || 'company',
    entityJSON,
    enhancedDescription,
    existingEntities: existing.slice(0, 3),
    instructions,
    status: existing.length > 0 ? 'already_exists' : 'ready_to_submit',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    submittedAt: null,
  })

  logger.info(`Wikidata entity generated for ${brandName}, org ${orgId}`)
  return {
    success: true,
    entityId: ref.id,
    entityJSON,
    description: enhancedDescription,
    alreadyExists: existing.length > 0,
    existingEntities: existing.slice(0, 3),
    instructions,
  }
})

// ─── Callable: get entity generation stats ───────────────────────────

export const getWikidataStats = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const snap = await db.collection(`organizations/${orgId}/wikidataEntities`)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  const entities = snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, brandName: data.brandName, status: data.status, entityType: data.entityType, createdAt: data.createdAt }
  })

  const byStatus = {}
  for (const e of entities) byStatus[e.status] = (byStatus[e.status] || 0) + 1

  return { entities, total: entities.length, byStatus }
})

// ─── Core: search Wikidata ───────────────────────────────────────────

async function searchWikidata(query) {
  try {
    const url = `${WIKIDATA_SEARCH_URL}?action=wbsearchentities&search=${encodeURIComponent(query)}&language=fr&format=json&type=item&limit=5`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-WikidataChecker/1.0 (+https://facemedia.tech)' },
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.search || []).map(item => ({
      id: item.id,
      label: item.label || '',
      description: item.description || '',
      url: `https://www.wikidata.org/wiki/${item.id}`,
    }))
  } catch {
    return []
  }
}

// ─── Core: build Wikidata JSON ───────────────────────────────────────

function buildWikidataJSON(info, type) {
  const entity = {
    type: 'item',
    labels: {
      fr: { language: 'fr', value: info.name },
      en: { language: 'en', value: info.name },
    },
    descriptions: {
      fr: { language: 'fr', value: info.description || `${type.label} francaise` },
      en: { language: 'en', value: info.description || `French ${type.label}` },
    },
    aliases: {},
    claims: {},
  }

  // Instance of (P31)
  entity.claims[PROPERTIES.instanceOf] = [{
    mainsnak: {
      snaktype: 'value',
      property: PROPERTIES.instanceOf,
      datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', 'numeric-id': parseInt(type.qid.substring(1)) } },
    },
    type: 'statement',
    rank: 'normal',
  }]

  // Official website (P856)
  if (info.website) {
    entity.claims[PROPERTIES.officialWebsite] = [{
      mainsnak: {
        snaktype: 'value',
        property: PROPERTIES.officialWebsite,
        datavalue: { type: 'string', value: info.website.startsWith('http') ? info.website : `https://${info.website}` },
      },
      type: 'statement',
      rank: 'normal',
    }]
  }

  // Country of origin (P495) — France by default
  if (info.country === 'France') {
    entity.claims[PROPERTIES.countryOfOrigin] = [{
      mainsnak: {
        snaktype: 'value',
        property: PROPERTIES.countryOfOrigin,
        datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', 'numeric-id': 142 } }, // Q142 = France
      },
      type: 'statement',
      rank: 'normal',
    }]
  }

  // Inception (P571)
  if (info.foundedYear) {
    entity.claims[PROPERTIES.inception] = [{
      mainsnak: {
        snaktype: 'value',
        property: PROPERTIES.inception,
        datavalue: {
          type: 'time',
          value: {
            time: `+${info.foundedYear}-01-01T00:00:00Z`,
            timezone: 0,
            before: 0,
            after: 0,
            precision: 9, // year precision
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
          },
        },
      },
      type: 'statement',
      rank: 'normal',
    }]
  }

  // SIREN (P1616)
  if (info.siren) {
    entity.claims[PROPERTIES.sirenNumber] = [{
      mainsnak: {
        snaktype: 'value',
        property: PROPERTIES.sirenNumber,
        datavalue: { type: 'string', value: info.siren },
      },
      type: 'statement',
      rank: 'normal',
    }]
  }

  // Social media
  const socialProps = [
    { key: 'twitter', prop: PROPERTIES.twitterUsername },
    { key: 'facebook', prop: PROPERTIES.facebookId },
    { key: 'linkedin', prop: PROPERTIES.linkedInOrgId },
    { key: 'instagram', prop: PROPERTIES.instagramUsername },
  ]

  for (const { key, prop } of socialProps) {
    if (info[key]) {
      entity.claims[prop] = [{
        mainsnak: {
          snaktype: 'value',
          property: prop,
          datavalue: { type: 'string', value: info[key] },
        },
        type: 'statement',
        rank: 'normal',
      }]
    }
  }

  return entity
}

// ─── AI description generation ───────────────────────────────────────

async function generateDescription(info) {
  try {
    const { callAI } = await import('../ai/callAI.js')

    const prompt = `Genere une description Wikidata courte (1 phrase, max 100 caracteres) pour cette entite :
- Nom : ${info.name}
- Type : entreprise
- Secteur : ${info.industry || 'non specifie'}
- Pays : ${info.country || 'France'}
- Site : ${info.website || ''}

La description doit etre factuelle, neutre, encyclopedique (style Wikidata).
Exemples : "entreprise francaise de services numeriques", "editeur de logiciel SaaS base a Paris"

Reponds UNIQUEMENT avec la description, sans guillemets.`

    const result = await callAI(prompt, 100)
    return result.trim().replace(/^["']|["']$/g, '').substring(0, 200)
  } catch {
    return `entreprise francaise${info.industry ? ` du secteur ${info.industry}` : ''}`
  }
}

// ─── Submission instructions ─────────────────────────────────────────

function generateInstructions(brandName, alreadyExists) {
  if (alreadyExists) {
    return {
      status: 'already_exists',
      message: `Une entite pour "${brandName}" semble deja exister sur Wikidata. Verifiez si c'est bien votre entreprise avant de creer un doublon.`,
      steps: [
        'Verifiez les entites existantes listees ci-dessus',
        'Si c\'est votre entreprise, vous pouvez enrichir l\'entite existante',
        'Si ce n\'est pas la meme entreprise, vous pouvez creer une nouvelle entite',
      ],
    }
  }

  return {
    status: 'ready',
    message: `L'entite Wikidata pour "${brandName}" est prete a etre soumise.`,
    steps: [
      '1. Allez sur https://www.wikidata.org/wiki/Special:NewItem',
      '2. Connectez-vous avec un compte Wikidata (creez-en un si necessaire)',
      '3. Remplissez les champs Label et Description avec les valeurs generees',
      '4. Ajoutez les proprietes (claims) une par une depuis le JSON genere',
      '5. Ajoutez des sources fiables pour chaque propriete (site web officiel, registre SIREN)',
      '6. Soumettez l\'entite pour review',
    ],
    tips: [
      'Ajoutez toujours des sources (references) pour eviter la suppression',
      'La description doit etre neutre et factuelle',
      'Liez l\'entite a d\'autres entites Wikidata existantes (ville, pays, secteur)',
      'Les entites sans sources fiables sont souvent supprimees rapidement',
    ],
    wikidataUrl: 'https://www.wikidata.org/wiki/Special:NewItem',
  }
}

// ─── Internal: generate entity for alexActionExecutor ────────────────

export async function generateEntityForBrand(db, orgId, brandName, entityType) {
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const org = orgDoc.data() || {}

  const info = {
    name: brandName,
    description: org.activity || org.description || '',
    website: org.website || '',
    country: 'France',
    city: org.city || '',
    industry: org.niche || org.sector || '',
    siren: org.siren || '',
    twitter: org.twitter || '',
    facebook: org.facebook || '',
    linkedin: org.linkedin || '',
    instagram: org.instagram || '',
  }

  const existing = await searchWikidata(brandName)
  const type = ENTITY_TYPES[entityType] || ENTITY_TYPES.company
  const entityJSON = buildWikidataJSON(info, type)

  const description = await generateDescription(info)
  entityJSON.descriptions.fr.value = description

  const ref = await db.collection(`organizations/${orgId}/wikidataEntities`).add({
    brandName,
    entityType: entityType || 'company',
    entityJSON,
    enhancedDescription: description,
    existingEntities: existing.slice(0, 3),
    status: existing.length > 0 ? 'already_exists' : 'ready_to_submit',
    createdAt: FieldValue.serverTimestamp(),
  })

  return {
    entityId: ref.id,
    alreadyExists: existing.length > 0,
    description,
    existingCount: existing.length,
  }
}
