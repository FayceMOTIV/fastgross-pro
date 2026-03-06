/**
 * Send WhatsApp to Autopilot Prospect
 * Sends personalized message to prospect from daily automation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()

// Evolution API config
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

async function getInstanceName(orgId) {
  if (orgId) {
    try {
      const configSnap = await getDb()
        .collection('organizations').doc(orgId)
        .collection('integrations').doc('whatsapp')
        .get()
      if (configSnap.exists) {
        const data = configSnap.data()
        if (data?.instanceName && data?.status === 'connected') {
          return data.instanceName
        }
      }
    } catch { /* fallback */ }
  }
  return process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3'
}

/**
 * Send WhatsApp message to a prospect from the autopilot system
 */
export const sendWhatsAppToProspect = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { prospectId, orgId } = request.data
    const db = getDb()

    if (!prospectId || !orgId) {
      throw new HttpsError('invalid-argument', 'prospectId et orgId sont requis')
    }

    // Verify user has access to this org
    const memberDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('members')
      .doc(request.auth.uid)
      .get()

    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Acces refuse a cette organisation')
    }

    // Get prospect
    const prospectDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .doc(prospectId)
      .get()

    if (!prospectDoc.exists) {
      throw new HttpsError('not-found', 'Prospect non trouve')
    }

    const prospect = prospectDoc.data()

    if (!prospect.phone) {
      throw new HttpsError('failed-precondition', 'Ce prospect n\'a pas de numero de telephone')
    }

    if (prospect.sentVia === 'whatsapp' || prospect.whatsappSent) {
      throw new HttpsError('already-exists', 'Ce prospect a deja ete contacte par WhatsApp')
    }

    // Get org config for template
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    const orgData = orgDoc.data() || {}

    // Build WhatsApp message from prospect data
    let message = buildWhatsAppMessage(prospect, orgData)

    // Check Evolution API config
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new HttpsError('failed-precondition', 'Evolution API n\'est pas configure')
    }

    try {
      // Clean phone number
      const cleanPhone = prospect.phone.replace(/[^\d]/g, '')

      // Send via Evolution API (multi-tenant)
      const instanceName = await getInstanceName(orgId)
      const response = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
        {
          number: cleanPhone,
          text: message,
        },
        {
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )

      // Update prospect
      await prospectDoc.ref.update({
        sentVia: 'whatsapp',
        whatsappSent: true,
        whatsappSentAt: FieldValue.serverTimestamp(),
        whatsappMessageId: response.data?.key?.id || null,
        whatsappMessage: message,
        status: 'contacted',
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log(`WhatsApp sent to prospect ${prospectId}: ${cleanPhone}`)

      return {
        success: true,
        phone: cleanPhone,
        messageId: response.data?.key?.id,
        sentAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('WhatsApp send error:', error.response?.data || error.message)

      // Log error on prospect
      await prospectDoc.ref.update({
        whatsappError: error.message,
        whatsappErrorAt: FieldValue.serverTimestamp(),
      })

      throw new HttpsError('internal', `Erreur d'envoi: ${error.message}`)
    }
  }
)

/**
 * Build WhatsApp message from prospect data
 */
function buildWhatsAppMessage(prospect, orgData) {
  // If we have a generated email, adapt it for WhatsApp
  if (prospect.generatedEmail && prospect.generatedEmail.body) {
    // WhatsApp version: shorter, more conversational
    const emailBody = prospect.generatedEmail.body

    // Extract first paragraph and key points
    const paragraphs = emailBody.split('\n\n').filter(p => p.trim())
    const intro = paragraphs[0] || ''

    // Build WhatsApp message
    let message = intro

    // Add call to action
    if (!message.includes('disponible') && !message.includes('discuter')) {
      message += '\n\nOn en discute rapidement ?'
    }

    // Ensure not too long for WhatsApp
    if (message.length > 500) {
      message = message.substring(0, 450) + '...\n\nOn en discute ?'
    }

    return message
  }

  // Fallback: generate from scratch
  const name = prospect.contactName || prospect.name || ''
  const firstName = name.split(' ')[0] || ''
  const company = prospect.name || prospect.domain?.replace(/\.[a-z]+$/i, '').replace(/-/g, ' ') || ''

  const template = orgData.whatsappTemplate || `Salut ${firstName ? firstName : ''}!

J'ai vu votre site ${company} et j'aurais une idee pour booster votre visibilite en ligne.

La video courte est le format le plus engageant aujourd'hui (+80% de visibilite).

Seriez-vous disponible pour en discuter 15 min cette semaine ?

Bonne journee,
Face Media Factory`

  return template
    .replace(/{firstName}/g, firstName)
    .replace(/{name}/g, name)
    .replace(/{company}/g, company)
    .replace(/{domain}/g, prospect.domain || '')
    .trim()
}
