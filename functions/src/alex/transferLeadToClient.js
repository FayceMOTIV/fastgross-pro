/**
 * transferLeadToClient — Genere une fiche prospect et l'envoie au client via WhatsApp (Evolution API)
 * Utilise pour transferer un lead qualifie au commercial du client
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

/**
 * Transfere un lead qualifie au client via WhatsApp
 * @param {object} data
 * @param {string} data.orgId - ID organisation
 * @param {string} data.prospectId - ID prospect
 * @param {string} [data.clientPhone] - Telephone du client (override)
 * @param {string} [data.note] - Note supplementaire pour le client
 */
export const transferLeadToClient = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    const { orgId, prospectId, clientPhone, note } = request.data || {}

    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'orgId and prospectId are required')
    }

    const db = getDb()

    // Charger le prospect
    const prospectSnap = await db
      .collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .get()

    if (!prospectSnap.exists) {
      throw new HttpsError('not-found', 'Prospect not found')
    }

    const prospect = { id: prospectSnap.id, ...prospectSnap.data() }

    // Charger l'organisation
    const orgSnap = await db.collection('organizations').doc(orgId).get()
    if (!orgSnap.exists) {
      throw new HttpsError('not-found', 'Organization not found')
    }
    const orgData = orgSnap.data()

    // Determiner le numero du client
    const targetPhone = clientPhone || orgData.ownerPhone || orgData.contactPhone
    if (!targetPhone) {
      throw new HttpsError(
        'failed-precondition',
        'No client phone configured. Set ownerPhone in organization settings.'
      )
    }

    // Charger les dernieres interactions
    let interactions = []
    try {
      const interSnap = await db
        .collection('organizations').doc(orgId)
        .collection('interactions')
        .where('prospectId', '==', prospectId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
      interactions = interSnap.docs.map((d) => d.data())
    } catch (err) {
      logger.warn('Could not load interactions for transfer:', err.message)
    }

    // Generer la fiche prospect
    const card = generateProspectCard(prospect, interactions, orgData, note)

    // Envoyer via WhatsApp (Evolution API)
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new HttpsError('failed-precondition', 'Evolution API not configured')
    }

    const cleanPhone = targetPhone.replace(/[^\d]/g, '')

    try {
      const response = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          number: cleanPhone,
          text: card,
        },
        {
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      // Logger le transfert
      await db
        .collection('organizations').doc(orgId)
        .collection('interactions').add({
          prospectId,
          channel: 'whatsapp',
          direction: 'transfer',
          message: card,
          to: cleanPhone,
          source: 'alex_transfer',
          messageId: response.data?.key?.id || response.data?.messageId || null,
          createdAt: FieldValue.serverTimestamp(),
        })

      // Mettre a jour le prospect
      await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          alexStatus: 'transferred',
          transferredAt: FieldValue.serverTimestamp(),
          transferredTo: cleanPhone,
        })

      logger.info(`Lead ${prospectId} transferred to ${cleanPhone} for org ${orgId}`)

      return {
        success: true,
        messageId: response.data?.key?.id || response.data?.messageId,
        transferredTo: cleanPhone,
      }
    } catch (error) {
      logger.error('Transfer WhatsApp send failed:', error.response?.data || error.message)
      throw new HttpsError('internal', `WhatsApp send failed: ${error.message}`)
    }
  }
)

/**
 * Genere une fiche prospect formatee pour WhatsApp
 */
function generateProspectCard(prospect, interactions, orgData, note) {
  const score = prospect.alexScore || 0
  const scoreEmoji = score >= 90 ? '🔥🔥🔥' : score >= 80 ? '🔥🔥' : score >= 60 ? '🔥' : '📊'

  const inboundMessages = interactions
    .filter((i) => i.direction === 'in')
    .slice(0, 5)

  const outboundMessages = interactions
    .filter((i) => i.direction === 'out')
    .slice(0, 3)

  const lines = [
    `${scoreEmoji} *LEAD QUALIFIE — Score ${score}/100*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `👤 *${prospect.name || 'Nom inconnu'}*`,
  ]

  if (prospect.company) {
    lines.push(`🏢 ${prospect.company}`)
  }
  if (prospect.industry) {
    lines.push(`📂 ${prospect.industry}`)
  }
  if (prospect.phone) {
    lines.push(`📞 ${prospect.phone}`)
  }
  if (prospect.email) {
    lines.push(`📧 ${prospect.email}`)
  }
  if (prospect.instagramHandle) {
    lines.push(`📸 ${prospect.instagramHandle}`)
  }
  if (prospect.linkedinUrl) {
    lines.push(`💼 ${prospect.linkedinUrl}`)
  }
  if (prospect.website) {
    lines.push(`🌐 ${prospect.website}`)
  }

  lines.push('')
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)

  // Scoring details
  if (prospect.alexScoring) {
    const s = prospect.alexScoring
    lines.push(`📊 *Analyse IA:*`)
    if (s.intent) lines.push(`  • Intent: ${s.intent}`)
    if (s.urgency) lines.push(`  • Urgence: ${s.urgency}`)
    if (s.sentiment) lines.push(`  • Sentiment: ${s.sentiment}`)
    if (s.summary) lines.push(`  • ${s.summary}`)
    lines.push('')
  }

  // Derniers messages du prospect
  if (inboundMessages.length > 0) {
    lines.push(`💬 *Messages du prospect:*`)
    inboundMessages.forEach((msg) => {
      const text = (msg.message || '').slice(0, 200)
      lines.push(`  📩 "${text}"`)
    })
    lines.push('')
  }

  // Reponses Alex
  if (outboundMessages.length > 0) {
    lines.push(`🤖 *Reponses Alex:*`)
    outboundMessages.forEach((msg) => {
      const text = (msg.message || '').slice(0, 150)
      lines.push(`  📤 "${text}"`)
    })
    lines.push('')
  }

  // Note supplementaire
  if (note) {
    lines.push(`📝 *Note:* ${note}`)
    lines.push('')
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🏷 Client: ${orgData.name || 'Non specifie'}`)
  lines.push(`⏰ ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`)
  lines.push(`🤖 Genere par Alex — Face Media Factory`)

  return lines.join('\n')
}
