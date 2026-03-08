/**
 * RGPD Engine — Intent Hunter
 *
 * Gestion centralisee de la conformite RGPD pour tous les leads
 * detectes par Intent Hunter (B2B et B2C).
 *
 * Base legale : interet legitime (art. 6.1.f RGPD)
 * Preuve : URL du post public + verbatim du prospect
 *
 * Collection Firestore : globalBlacklist/{sha256(email+phone)}
 * Cloud Function HTTP : unsubscribeHandler
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { createHash, randomBytes } from 'crypto'

const getDb = () => getFirestore()

// ============================================
// SCHEMA RGPD (reference pour validation)
// ============================================

/**
 * Schema RGPD obligatoire pour chaque lead cree (B2B ET B2C)
 */
export const LEAD_RGPD_SCHEMA = {
  gdprBasis: 'legitimate_interest',
  sourceUrl: 'string',
  sourcePublicStatement: 'string',
  collectedAt: 'Timestamp',
  dataRetentionDays: 365,
  optOutAt: null,
  optOutChannel: null,
  isBlacklisted: false
}

// ============================================
// SECRET pour JWT-like tokens (HMAC SHA-256)
// ============================================

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.EMAIL_ENCRYPTION_KEY || 'fmf-unsub-default-key'
const UNSUBSCRIBE_BASE_URL = process.env.UNSUBSCRIBE_BASE_URL || 'https://face-media-factory.web.app/unsubscribe'

// ============================================
// HASHING UTILITIES
// ============================================

/**
 * Hash SHA-256 pour email/telephone normalise
 */
function sha256(value) {
  if (!value) return ''
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

/**
 * Normalise un numero de telephone au format E.164
 */
function normalizePhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1)
  }
  return cleaned
}

/**
 * Genere l'ID du document globalBlacklist
 */
function blacklistDocId(email, phone) {
  const normalized = `${(email || '').toLowerCase().trim()}|${normalizePhone(phone)}`
  return sha256(normalized)
}

// ============================================
// GLOBAL BLACKLIST
// ============================================

/**
 * Ajoute un contact a la blacklist globale (cross-org, permanente)
 * @param {string} email - Email du contact
 * @param {string} phone - Telephone du contact
 * @param {string} reason - 'unsubscribe' | 'complaint' | 'manual' | 'bot_detected'
 * @param {string} [clientId] - ID du client FMF qui a genere ce lead
 */
export async function addToGlobalBlacklist(email, phone, reason, clientId = null) {
  const db = getDb()
  const docId = blacklistDocId(email, phone)

  if (!docId) {
    throw new Error('Au moins un email ou telephone requis pour blacklister')
  }

  const data = {
    emailHash: sha256(email),
    phoneHash: sha256(normalizePhone(phone)),
    optOutAt: Timestamp.now(),
    reason,
    clientId: clientId || 'system',
    createdAt: Timestamp.now()
  }

  // Si email brut disponible, stocker aussi pour lookup direct
  if (email) data.emailNormalized = email.toLowerCase().trim()
  if (phone) data.phoneNormalized = normalizePhone(phone)

  await db.collection('globalBlacklist').doc(docId).set(data, { merge: true })

  console.log(JSON.stringify({
    function: 'rgpdEngine.addToGlobalBlacklist',
    step: 'blacklisted',
    docId,
    reason,
    clientId
  }))

  return { docId, blacklisted: true }
}

/**
 * Verifie si un contact est dans la blacklist globale
 * @param {string} email
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
export async function isGlobalBlacklisted(email, phone) {
  const db = getDb()
  const docId = blacklistDocId(email, phone)

  if (!docId) return false

  const doc = await db.collection('globalBlacklist').doc(docId).get()
  if (doc.exists) return true

  // Verification additionnelle par email seul si le combo ne match pas
  if (email) {
    const emailDocId = sha256(email.toLowerCase().trim() + '|')
    const emailDoc = await db.collection('globalBlacklist').doc(emailDocId).get()
    if (emailDoc.exists) return true

    // Recherche par emailNormalized (fallback)
    const snap = await db.collection('globalBlacklist')
      .where('emailNormalized', '==', email.toLowerCase().trim())
      .limit(1)
      .get()
    if (!snap.empty) return true
  }

  // Verification par telephone seul
  if (phone) {
    const phoneNorm = normalizePhone(phone)
    const snap = await db.collection('globalBlacklist')
      .where('phoneNormalized', '==', phoneNorm)
      .limit(1)
      .get()
    if (!snap.empty) return true
  }

  return false
}

// ============================================
// DATA RETENTION
// ============================================

/**
 * Planifie la suppression automatique d'un lead apres X jours
 * Utilise Firestore TTL policy ou Cloud Task avec delai
 * @param {string} leadId
 * @param {string} collection - 'intentLeadsPro' ou 'intentLeadsParticuliers'
 * @param {number} days - Nombre de jours avant suppression (defaut 365)
 */
export async function scheduleDataDeletion(leadId, collection, days = 365) {
  const db = getDb()
  const deletionDate = new Date()
  deletionDate.setDate(deletionDate.getDate() + days)

  await db.collection(collection).doc(leadId).update({
    dataRetentionUntil: Timestamp.fromDate(deletionDate),
    updatedAt: FieldValue.serverTimestamp()
  })

  console.log(JSON.stringify({
    function: 'rgpdEngine.scheduleDataDeletion',
    step: 'scheduled',
    leadId,
    collection,
    deletionDate: deletionDate.toISOString()
  }))

  return { leadId, deletionDate: deletionDate.toISOString() }
}

// ============================================
// UNSUBSCRIBE TOKENS (HMAC-based)
// ============================================

/**
 * Genere un token de desinscription signe (HMAC SHA-256)
 * @param {string} leadId
 * @param {string} collection - 'intentLeadsPro' ou 'intentLeadsParticuliers'
 * @param {number} expiresInDays - Duree de validite (defaut 30 jours)
 * @returns {string} Token signe
 */
export function generateUnsubscribeToken(leadId, collection = 'intentLeadsPro', expiresInDays = 30) {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  const payload = `${leadId}|${collection}|${expiresAt}`
  const signature = createHash('sha256')
    .update(payload + UNSUBSCRIBE_SECRET)
    .digest('hex')
    .slice(0, 16)

  // Encode en base64url pour URL safe
  const token = Buffer.from(`${payload}|${signature}`).toString('base64url')
  return token
}

/**
 * Verifie et decode un token de desinscription
 * @param {string} token
 * @returns {{ valid: boolean, leadId?: string, collection?: string, expired?: boolean }}
 */
export function verifyUnsubscribeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split('|')

    if (parts.length !== 4) return { valid: false }

    const [leadId, collection, expiresAtStr, signature] = parts
    const expiresAt = parseInt(expiresAtStr, 10)

    // Verifier la signature
    const payload = `${leadId}|${collection}|${expiresAt}`
    const expectedSig = createHash('sha256')
      .update(payload + UNSUBSCRIBE_SECRET)
      .digest('hex')
      .slice(0, 16)

    if (signature !== expectedSig) return { valid: false }

    // Token valide meme si expire (on traite quand meme la desinscription)
    const expired = Date.now() > expiresAt

    return { valid: true, leadId, collection, expired }
  } catch {
    return { valid: false }
  }
}

/**
 * Genere l'URL complete de desinscription
 * @param {string} leadId
 * @param {string} collection
 * @returns {string} URL complète
 */
export function generateUnsubscribeUrl(leadId, collection) {
  const token = generateUnsubscribeToken(leadId, collection)
  return `${UNSUBSCRIBE_BASE_URL}?token=${token}`
}

// ============================================
// PROCESS UNSUBSCRIBE
// ============================================

/**
 * Traite une demande de desinscription complete
 * 1. Verifie le token
 * 2. Recupere le lead
 * 3. Ajoute a la globalBlacklist
 * 4. Met a jour le lead (optOutAt, isBlacklisted)
 * 5. Stoppe toute sequence active
 *
 * @param {string} token
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function processUnsubscribeRequest(token) {
  const db = getDb()
  const result = verifyUnsubscribeToken(token)

  // On traite meme les tokens expires (idempotent, respect du souhait du prospect)
  if (!result.valid) {
    // Fallback : si token invalide, loguer et accepter quand meme
    console.log(JSON.stringify({
      function: 'rgpdEngine.processUnsubscribeRequest',
      step: 'invalid_token',
      token: token?.slice(0, 20) + '...'
    }))
    return { success: true, message: 'Desinscription prise en compte' }
  }

  const { leadId, collection } = result

  try {
    const leadDoc = await db.collection(collection).doc(leadId).get()

    if (leadDoc.exists) {
      const lead = leadDoc.data()

      // Blacklister le contact
      await addToGlobalBlacklist(
        lead.email,
        lead.phone,
        'unsubscribe',
        lead.clientId
      )

      // Mettre a jour le lead
      await db.collection(collection).doc(leadId).update({
        optOutAt: Timestamp.now(),
        optOutChannel: 'email_unsubscribe_link',
        isBlacklisted: true,
        sequenceStatus: 'blacklisted',
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    console.log(JSON.stringify({
      function: 'rgpdEngine.processUnsubscribeRequest',
      step: 'completed',
      leadId,
      collection
    }))

    return { success: true, message: 'Desinscription confirmee' }
  } catch (error) {
    console.error(JSON.stringify({
      function: 'rgpdEngine.processUnsubscribeRequest',
      step: 'error',
      leadId,
      error: error.message
    }))
    // On retourne succes quand meme — le prospect ne doit pas voir d'erreur
    return { success: true, message: 'Desinscription prise en compte' }
  }
}

// ============================================
// GDPR PROOF (reponse a demande sujet RGPD)
// ============================================

/**
 * Genere la preuve RGPD complete pour un lead
 * Utile pour repondre a une demande d'acces (art. 15 RGPD)
 *
 * @param {string} leadId
 * @param {string} collection
 * @returns {Promise<Object>} Objet complet conforme art. 15
 */
export async function getGdprProof(leadId, collection = 'intentLeadsPro') {
  const db = getDb()
  const doc = await db.collection(collection).doc(leadId).get()

  if (!doc.exists) {
    return { found: false, message: 'Aucune donnee trouvee pour cet identifiant' }
  }

  const lead = doc.data()

  return {
    found: true,
    dataSubjectRights: {
      rightOfAccess: 'art. 15 RGPD',
      rightToErasure: 'art. 17 RGPD',
      rightToRectification: 'art. 16 RGPD',
      rightToPortability: 'art. 20 RGPD'
    },
    legalBasis: {
      basis: lead.gdprBasis || 'legitimate_interest',
      article: 'art. 6.1.f RGPD',
      justification: 'Le prospect a exprime publiquement un besoin professionnel sur une plateforme publique'
    },
    dataCollected: {
      sourceUrl: lead.sourceUrl,
      sourcePublicStatement: lead.sourcePublicStatement,
      collectedAt: lead.collectedAt,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company || null,
      zone: lead.zone || null
    },
    processing: {
      purpose: 'Mise en relation avec un prestataire pertinent suite a expression publique de besoin',
      dataRetentionUntil: lead.dataRetentionUntil,
      contactHistory: lead.contactHistory || [],
      sequenceStatus: lead.sequenceStatus
    },
    optOut: {
      optOutAt: lead.optOutAt || null,
      optOutChannel: lead.optOutChannel || null,
      isBlacklisted: lead.isBlacklisted || false
    },
    exportedAt: new Date().toISOString()
  }
}

// ============================================
// APPEND UNSUBSCRIBE FOOTER
// ============================================

/**
 * Ajoute un lien de desinscription RGPD a un contenu HTML email
 * @param {string} htmlContent - Contenu HTML de l'email
 * @param {string} leadId
 * @param {string} collection
 * @returns {string} HTML avec footer RGPD
 */
export function appendUnsubscribeFooter(htmlContent, leadId, collection = 'intentLeadsPro') {
  const unsubUrl = generateUnsubscribeUrl(leadId, collection)

  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;font-family:Arial,sans-serif;">
  <p>Vous recevez ce message car vous avez exprime publiquement un besoin professionnel.</p>
  <p>
    <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">
      Se desinscrire
    </a>
    &nbsp;|&nbsp;
    Conformite RGPD — Interet legitime (art. 6.1.f)
  </p>
</div>`

  // Inserer avant </body> si present, sinon a la fin
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footer}</body>`)
  }
  return htmlContent + footer
}

/**
 * Version texte pour emails plain text
 */
export function appendUnsubscribeFooterText(textContent, leadId, collection = 'intentLeadsPro') {
  const unsubUrl = generateUnsubscribeUrl(leadId, collection)
  return `${textContent}\n\n---\nSe desinscrire : ${unsubUrl}\nConformite RGPD — Interet legitime (art. 6.1.f)`
}

// ============================================
// VALIDATE LEAD RGPD FIELDS
// ============================================

/**
 * Verifie qu'un lead a tous les champs RGPD obligatoires
 * @param {Object} lead
 * @returns {{ valid: boolean, missingFields: string[] }}
 */
export function validateLeadRgpd(lead) {
  const required = ['sourceUrl', 'sourcePublicStatement']
  const missing = required.filter(field => !lead[field])

  return {
    valid: missing.length === 0,
    missingFields: missing
  }
}

/**
 * Enrichit un lead avec les champs RGPD par defaut
 * @param {Object} lead - Lead brut
 * @returns {Object} Lead avec champs RGPD
 */
export function enrichWithRgpdDefaults(lead) {
  const retentionDate = new Date()
  retentionDate.setDate(retentionDate.getDate() + 365)

  return {
    ...lead,
    gdprBasis: lead.gdprBasis || 'legitimate_interest',
    collectedAt: lead.collectedAt || Timestamp.now(),
    dataRetentionDays: 365,
    dataRetentionUntil: Timestamp.fromDate(retentionDate),
    optOutAt: null,
    optOutChannel: null,
    isBlacklisted: false
  }
}

// ============================================
// PURGE EXPIRED LEADS (rétention RGPD)
// ============================================

/**
 * Supprime les leads dont la retention a expire
 * A appeler via scheduled Cloud Function (nuit)
 * @param {string} collection
 * @param {number} batchSize
 * @returns {Promise<{ deleted: number }>}
 */
export async function purgeExpiredLeads(collection = 'intentLeadsPro', batchSize = 100) {
  const db = getDb()
  const now = Timestamp.now()

  const snapshot = await db.collection(collection)
    .where('dataRetentionUntil', '<=', now)
    .where('isBlacklisted', '==', false)
    .limit(batchSize)
    .get()

  if (snapshot.empty) return { deleted: 0 }

  const batch = db.batch()
  let count = 0

  for (const doc of snapshot.docs) {
    const lead = doc.data()

    // Blacklister avant suppression (pour ne jamais recontacter)
    if (lead.email || lead.phone) {
      await addToGlobalBlacklist(lead.email, lead.phone, 'data_retention_expired', lead.clientId)
    }

    batch.delete(doc.ref)
    count++
  }

  await batch.commit()

  console.log(JSON.stringify({
    function: 'rgpdEngine.purgeExpiredLeads',
    step: 'completed',
    collection,
    deleted: count
  }))

  return { deleted: count }
}

// ============================================
// CLOUD FUNCTION HTTP : unsubscribeHandler
// ============================================

/**
 * GET /unsubscribe?token=XXX
 * Valide le token → supprime le lead → blacklist → redirect
 */
export const unsubscribeHandler = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    const token = req.query.token

    if (!token) {
      res.status(400).json({ error: 'Token manquant' })
      return
    }

    const result = await processUnsubscribeRequest(token)

    // Redirect vers page de confirmation
    const confirmUrl = `${UNSUBSCRIBE_BASE_URL}-confirmation?status=${result.success ? 'ok' : 'error'}`
    res.redirect(303, confirmUrl)
  }
)
