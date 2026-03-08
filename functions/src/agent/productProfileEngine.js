/**
 * productProfileEngine.js
 * Gere le profil produit de chaque organisation cliente FMF.
 * Alex lit ce profil pour savoir ce qu'il vend, a qui, et comment.
 *
 * Architecture multi-tenant :
 * - Isolation totale par orgId (Firestore path : organizations/{orgId}/settings/product)
 * - Cache in-memory 5 minutes (profil change rarement, evite N Firestore reads)
 * - Fallback sur profil FMF par defaut si profil non configure
 */

import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onCall } from 'firebase-functions/v2/https'

// Cache in-memory par orgId { [orgId]: { data, expiresAt } }
const profileCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Profil par defaut : FMF vend sa propre solution de presence digitale.
 * Utilise si le client n'a pas configure son profil.
 */
const DEFAULT_PROFILE = {
  product: {
    nom: 'Presence digitale locale',
    description: 'Amelioration fiche Google, avis clients, visibilite locale',
    valeurPrincipale: 'Attirer plus de clients grace a une meilleure presence en ligne',
    preuves: ['Note Google amelioree', 'Plus d\'avis positifs', 'Meilleur classement local'],
    angleAccroche: 'avis_google',
  },
  target: {
    description: 'Artisans et TPE locaux (plombiers, electriciens, restaurants...)',
    painPoint: 'Clients perdus a cause d\'une fiche Google mal geree ou inexistante',
    tonalite: 'chaleureux_direct',
  },
  objections: {
    'pas_interesse': 'Je comprends. Juste une question : savez-vous combien de clients vous perdez chaque semaine a cause de vos avis Google ?',
    'deja_gere': 'Parfait ! Vous gerez vous-meme ? Ca prend combien de temps par semaine ?',
    'trop_cher': 'On commence par un audit gratuit. Zero engagement.',
    'pas_le_temps': 'Justement — on s\'occupe de tout. Vous ne touchez a rien.',
    'concurrent': 'Je ne vous demande pas de changer quoi que ce soit aujourd\'hui. Juste 10 minutes pour comparer.',
  },
  sourcing: {
    sources: ['sirene', 'serper_maps'],
    criteresLeads: { noteGoogleMax: 3.5, avisMin: 0, avisMax: 50 },
  },
}

/**
 * Recupere le profil produit d'une organisation.
 * Cache 5 minutes en memoire.
 *
 * @param {string} orgId - ID de l'organisation Firestore
 * @returns {Object} profil produit (jamais null)
 */
export async function getProductProfile(orgId) {
  if (!orgId) return DEFAULT_PROFILE

  // Verifier le cache
  const cached = profileCache.get(orgId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  try {
    const db = getFirestore()
    const doc = await db
      .collection('organizations').doc(orgId)
      .collection('settings').doc('product')
      .get()

    const profile = doc.exists
      ? deepMerge(DEFAULT_PROFILE, doc.data())
      : DEFAULT_PROFILE

    // Stocker dans le cache
    profileCache.set(orgId, { data: profile, expiresAt: Date.now() + CACHE_TTL_MS })
    return profile
  } catch (err) {
    logger.warn(`ProductProfile fetch failed for ${orgId}, using default:`, err.message)
    return DEFAULT_PROFILE
  }
}

/**
 * Sauvegarde le profil produit d'une organisation.
 *
 * @param {string} orgId
 * @param {Object} profileData - donnees partielles a merger avec le defaut
 */
export async function saveProductProfile(orgId, profileData) {
  const db = getFirestore()
  await db
    .collection('organizations').doc(orgId)
    .collection('settings').doc('product')
    .set(profileData, { merge: true })

  // Invalider le cache
  profileCache.delete(orgId)
  logger.info(`ProductProfile saved for ${orgId}`)
}

/**
 * Genere la section "product" du system prompt Alex a partir du profil.
 *
 * @param {Object} profile - resultat de getProductProfile()
 * @param {Object} lead - donnees du lead (pour personnaliser l'angle)
 * @returns {string}
 */
export function buildProductSection(profile, lead = {}) {
  const { product, target, objections } = profile || DEFAULT_PROFILE

  const angleInstructions = buildAngleInstruction(product?.angleAccroche, lead)

  const objectionsList = Object.entries(objections || {})
    .map(([key, reponse]) => `  - Si "${key.replace(/_/g, ' ')}" : "${reponse}"`)
    .join('\n')

  return `## CE QUE TU VENDS
Produit : ${product?.nom || 'Non configure'}
Valeur principale : ${product?.valeurPrincipale || 'A configurer'}
${product?.preuves?.length ? `Preuves a utiliser : ${product.preuves.join(', ')}` : ''}

## TA CIBLE
${target?.description || 'Non configure'}
Douleur principale : ${target?.painPoint || 'A configurer'}

## TON ANGLE D'ACCROCHE
${angleInstructions}

## COMMENT GERER LES OBJECTIONS
${objectionsList || '  (aucune objection configuree — improviser avec tact)'}`
}

/**
 * Traduit un code d'angle en instruction concrete pour Alex.
 */
function buildAngleInstruction(angleCode, lead) {
  const angles = {
    avis_google: `Commence par mentionner leur note Google ou leurs avis (${lead?.noteGoogle ? lead.noteGoogle + '/5' : 'a verifier'}).
C'est concret, visible, difficile a nier.`,

    ca_manque: `Commence par un constat de CA ou de visibilite manquee.
Ex : "Vos concurrents captent des clients que vous pourriez avoir."`,

    facturation: `Commence par leur facture actuelle (energie, logistique, etc.)
et l'economie potentielle. Chiffre concret si disponible.`,

    recrutement: `Commence par la difficulte a recruter dans leur secteur/zone.
Angle : "Les bons candidats ne vous trouvent pas."`,

    urgence_reglementaire: `Commence par une obligation legale ou reglementaire a venir.
Angle : "Vous avez jusqu'au [DATE] pour vous conformer."`,

    opportunite_marche: `Commence par une opportunite de marche dans leur zone/secteur.
Angle : "Votre concurrent vient de fermer / un appel d'offre est ouvert."`,

    default: `Commence par le pain point principal de ta cible.
Sois direct, concis, et pose une question ouverte a la fin.`,
  }

  return angles[angleCode] || angles.default
}

/**
 * Deep merge two objects (1 level deep for nested objects).
 */
function deepMerge(defaults, overrides) {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      defaults[key] &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = { ...defaults[key], ...overrides[key] }
    } else {
      result[key] = overrides[key]
    }
  }
  return result
}

// ============================================
// Cloud Functions (Callable)
// ============================================

export const updateProductProfile = onCall({
  region: 'europe-west1',
  enforceAppCheck: false,
}, async (request) => {
  const { orgId, profile } = request.data
  const uid = request.auth?.uid

  if (!uid) throw new Error('Non authentifie')
  if (!orgId || !profile) throw new Error('orgId et profile requis')

  await saveProductProfile(orgId, profile)
  return { success: true }
})

export const getProductProfileCallable = onCall({
  region: 'europe-west1',
  enforceAppCheck: false,
}, async (request) => {
  const { orgId } = request.data
  const uid = request.auth?.uid
  if (!uid) throw new Error('Non authentifie')

  const profile = await getProductProfile(orgId)
  return { profile }
})
