/**
 * webhookIncoming — POST /webhook/incoming
 * Recoit les messages entrants (WhatsApp, Email, Instagram, LinkedIn)
 * Trouve ou cree le prospect, lance scoreAndReply en async, retourne {success:true} en < 200ms
 *
 * Accepte 2 formats de payload:
 *
 * Format standard (interne):
 * { channel, from, message, orgId?, prospectName?, metadata? }
 *
 * Format externe (API publique):
 * { clientId, channel, prospectIdentifier, messageContent, messageId?, timestamp? }
 */

import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { scoreAndReply } from './scoreAndReply.js'
import { handleIncomingReply } from '../services/replyHandler.js'

const getDb = () => getFirestore()

export const webhookIncoming = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
    cors: true,
  },
  async (req, res) => {
    // Uniquement POST
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' })
      return
    }

    // Normaliser les 2 formats de payload
    const body = req.body
    const channel = body.channel
    const from = body.from || body.prospectIdentifier
    const message = body.message || body.messageContent
    const orgId = body.orgId || body.clientId || null
    const prospectName = body.prospectName || null
    const metadata = body.metadata || {}
    const messageId = body.messageId || null
    const timestamp = body.timestamp || null

    // Validation minimale
    if (!channel || !from || !message) {
      res.status(400).json({
        success: false,
        error: 'channel, from/prospectIdentifier, and message/messageContent are required',
      })
      return
    }

    const validChannels = ['whatsapp', 'email', 'instagram', 'linkedin']
    if (!validChannels.includes(channel)) {
      res.status(400).json({
        success: false,
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
      })
      return
    }

    // Repondre immediatement (< 200ms)
    res.status(200).json({ success: true, received: true })

    // Traitement async apres la reponse HTTP
    try {
      const resolvedOrgId = orgId ? await resolveOrgIdByIdOrSlug(orgId) : await resolveOrgId(channel, from)

      if (!resolvedOrgId) {
        logger.warn('Could not resolve orgId for incoming message', { channel, from, clientId: orgId })
        return
      }

      // Trouver ou creer le prospect
      const prospectId = await findOrCreateProspect({
        orgId: resolvedOrgId,
        channel,
        from,
        name: prospectName,
        metadata,
      })

      if (!prospectId) {
        logger.error('Failed to find or create prospect', { orgId: resolvedOrgId, from })
        return
      }

      logger.info(`Incoming ${channel} from ${from} → org:${resolvedOrgId} prospect:${prospectId}`, {
        messageId,
        timestamp,
      })

      // Lancer le scoring + reponse (async, ne bloque pas)
      scoreAndReply({
        orgId: resolvedOrgId,
        prospectId,
        channel,
        message,
        from,
      }).catch((err) => {
        logger.error('scoreAndReply failed:', err.message)
      })

      // Classifier la reponse + generer scripts + notifier le client
      handleIncomingReply(resolvedOrgId, prospectId, channel, message, from).catch((err) => {
        logger.error('handleIncomingReply failed:', err.message)
      })
    } catch (err) {
      logger.error('webhookIncoming async processing failed:', err.message)
    }
  }
)

/**
 * Trouve un prospect existant par son identifiant canal ou en cree un nouveau
 */
async function findOrCreateProspect({ orgId, channel, from, name, metadata }) {
  const db = getDb()
  const prospectsRef = db
    .collection('organizations').doc(orgId)
    .collection('prospects')

  // Chercher par identifiant canal
  const fieldMap = {
    whatsapp: 'phone',
    email: 'email',
    instagram: 'instagramHandle',
    linkedin: 'linkedinUrl',
  }
  const searchField = fieldMap[channel] || 'phone'

  // Normaliser le from pour la recherche
  const normalizedFrom = channel === 'whatsapp'
    ? from.replace(/[^\d+]/g, '')
    : from.toLowerCase().trim()

  try {
    const existing = await prospectsRef
      .where(searchField, '==', normalizedFrom)
      .limit(1)
      .get()

    if (!existing.empty) {
      return existing.docs[0].id
    }

    // Creer un nouveau prospect
    const newProspect = {
      [searchField]: normalizedFrom,
      name: name || extractName(from, channel),
      channel,
      source: `inbound_${channel}`,
      alexStatus: 'new',
      alexScore: 0,
      sentToday: 0,
      repliesToday: 0,
      blacklisted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Ajouter les champs supplementaires selon le canal
    if (channel === 'whatsapp' && !newProspect.phone) {
      newProspect.phone = normalizedFrom
    }
    if (channel === 'email' && !newProspect.email) {
      newProspect.email = normalizedFrom
    }

    // Merge metadata
    if (metadata.company) newProspect.company = metadata.company
    if (metadata.industry) newProspect.industry = metadata.industry

    const docRef = await prospectsRef.add(newProspect)
    logger.info(`Created new prospect ${docRef.id} from ${channel}:${from}`)
    return docRef.id
  } catch (err) {
    logger.error('findOrCreateProspect error:', err.message)
    return null
  }
}

/**
 * Resout un orgId a partir d'un ID Firestore direct ou d'un slug (ex: "la-bonne-table")
 * Cherche d'abord par ID exact, puis par slug dans le champ 'slug' ou 'clientId'
 */
async function resolveOrgIdByIdOrSlug(idOrSlug) {
  const db = getDb()

  try {
    // Strategie 1: ID Firestore direct
    const directSnap = await db.collection('organizations').doc(idOrSlug).get()
    if (directSnap.exists) {
      return directSnap.id
    }

    // Strategie 2: Chercher par slug
    const bySlug = await db.collection('organizations')
      .where('slug', '==', idOrSlug)
      .limit(1)
      .get()
    if (!bySlug.empty) {
      return bySlug.docs[0].id
    }

    // Strategie 3: Chercher par clientId
    const byClientId = await db.collection('organizations')
      .where('clientId', '==', idOrSlug)
      .limit(1)
      .get()
    if (!byClientId.empty) {
      return byClientId.docs[0].id
    }

    logger.warn(`No organization found for id/slug: ${idOrSlug}`)
    return null
  } catch (err) {
    logger.error('resolveOrgIdByIdOrSlug error:', err.message)
    return null
  }
}

/**
 * Resout l'orgId a partir du canal et de l'expediteur
 * Cherche dans la config des organisations quel org gere ce canal/numero
 */
async function resolveOrgId(channel, from) {
  const db = getDb()

  try {
    // Strategie 1: Chercher dans les prospects existants (cross-org)
    const orgsSnap = await db.collection('organizations')
      .where('prospectionEnabled', '==', true)
      .limit(20)
      .get()

    for (const orgDoc of orgsSnap.docs) {
      const fieldMap = {
        whatsapp: 'phone',
        email: 'email',
        instagram: 'instagramHandle',
        linkedin: 'linkedinUrl',
      }
      const searchField = fieldMap[channel] || 'phone'
      const normalizedFrom = channel === 'whatsapp'
        ? from.replace(/[^\d+]/g, '')
        : from.toLowerCase().trim()

      const match = await db
        .collection('organizations').doc(orgDoc.id)
        .collection('prospects')
        .where(searchField, '==', normalizedFrom)
        .limit(1)
        .get()

      if (!match.empty) {
        return orgDoc.id
      }
    }

    // Strategie 2: Retourner la premiere org active
    if (!orgsSnap.empty) {
      return orgsSnap.docs[0].id
    }

    return null
  } catch (err) {
    logger.error('resolveOrgId error:', err.message)
    return null
  }
}

/**
 * Extrait un nom lisible a partir de l'identifiant canal
 */
function extractName(from, channel) {
  switch (channel) {
    case 'email': {
      const local = from.split('@')[0] || ''
      return local
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || 'Prospect'
    }
    case 'instagram':
      return from.replace('@', '') || 'Prospect'
    case 'whatsapp':
      return `WhatsApp ${from.slice(-4)}`
    case 'linkedin':
      return 'Prospect LinkedIn'
    default:
      return 'Prospect'
  }
}
