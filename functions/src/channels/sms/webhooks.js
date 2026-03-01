/**
 * SMS Webhooks - BudgetSMS DLR + Inbound
 *
 * Traitement des callbacks BudgetSMS:
 * - Delivery reports (DLR) via GET callback
 * - Inbound messages (replies, STOP)
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { processInboundSMS } from './compliance.js'

const getDb = () => getFirestore()

// ============================================
// VALIDER REQUETE BUDGETSMS
// ============================================
function validateBudgetSMSRequest(req) {
  // BudgetSMS identifie via le handle dans les parametres
  // En production, on verifie que le handle correspond
  const handle = req.query.handle || req.body?.handle
  if (!handle) return false
  return handle === process.env.BUDGETSMS_HANDLE
}

// ============================================
// WEBHOOK STATUS CALLBACK (DLR)
// ============================================
// BudgetSMS envoie les DLR en GET avec:
// ?id=<messageId>&status=<1=delivered|2=failed>&to=<number>
export const smsStatusWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
      }

      const params = req.method === 'GET' ? req.query : req.body

      const {
        id: messageId,
        status: dlrStatus,
        to
      } = params

      if (!messageId) {
        return res.status(400).send('Missing message id')
      }

      // Mapper le statut BudgetSMS
      const statusMap = {
        '1': 'delivered',
        '2': 'failed',
        '3': 'sent',
      }
      const normalizedStatus = statusMap[dlrStatus] || 'unknown'

      console.log(`SMS DLR: ${messageId} -> ${normalizedStatus}`)

      // Chercher l'interaction correspondante
      const interaction = await findInteractionByMessageSid(messageId)

      if (interaction) {
        await updateInteractionStatus(interaction.orgId, interaction.id, {
          status: normalizedStatus,
          updatedAt: FieldValue.serverTimestamp()
        })

        await handleStatusChange(interaction, normalizedStatus, {})
        await updateChannelAnalytics(interaction.orgId, 'sms', normalizedStatus)
      } else {
        console.warn(`Interaction not found for messageId: ${messageId}`)
        await logOrphanedWebhook('sms_status', params)
      }

      res.status(200).send('OK')

    } catch (error) {
      console.error('smsStatusWebhook error:', error)
      res.status(500).send('Internal error')
    }
  }
)

// ============================================
// WEBHOOK INBOUND SMS
// ============================================
export const smsInboundWebhook = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
      }

      const params = req.method === 'GET' ? req.query : req.body

      const {
        from: senderPhone,
        to,
        msg: body,
        id: messageId
      } = params

      console.log(`Inbound SMS from ${senderPhone}: ${body?.substring(0, 50)}...`)

      // Traiter le message (STOP, reponse, etc.)
      const result = await processInboundSMS(senderPhone, body)

      if (result.isOptOut) {
        console.log(`Opt-out processed for ${senderPhone}`)
      }

      // BudgetSMS attend un 200 OK simple
      res.status(200).send('OK')

    } catch (error) {
      console.error('smsInboundWebhook error:', error)
      res.status(500).send('Internal error')
    }
  }
)

// ============================================
// TROUVER INTERACTION PAR MESSAGE SID
// ============================================
async function findInteractionByMessageSid(messageSid) {
  try {
    const snapshot = await getDb().collectionGroup('interactions')
      .where('messageSid', '==', messageSid)
      .where('channel', '==', 'sms')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const pathSegments = doc.ref.path.split('/')
    // path: organizations/{orgId}/interactions/{id}
    const orgId = pathSegments[1]

    return {
      id: doc.id,
      orgId,
      ...doc.data()
    }

  } catch (error) {
    console.error('findInteractionByMessageSid error:', error)
    return null
  }
}

// ============================================
// METTRE A JOUR STATUT INTERACTION
// ============================================
async function updateInteractionStatus(orgId, interactionId, updates) {
  try {
    await getDb().collection('organizations').doc(orgId)
      .collection('interactions').doc(interactionId)
      .update(updates)
  } catch (error) {
    console.error('updateInteractionStatus error:', error)
  }
}

// ============================================
// GERER CHANGEMENT DE STATUT
// ============================================
async function handleStatusChange(interaction, status, errorInfo) {
  const { orgId, prospectId } = interaction

  switch (status) {
    case 'delivered':
      await getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          lastSMSDelivered: FieldValue.serverTimestamp(),
          'channels.sms.lastDelivered': FieldValue.serverTimestamp()
        })
      break

    case 'failed':
      console.warn(`SMS failed for prospect ${prospectId}`)
      await getDb().collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .update({
          'channels.sms.lastError': {
            message: 'Delivery failed',
            at: FieldValue.serverTimestamp()
          }
        })
      break
  }
}

// ============================================
// METTRE A JOUR ANALYTICS CANAL
// ============================================
async function updateChannelAnalytics(orgId, channel, status) {
  const today = new Date().toISOString().split('T')[0]

  try {
    const analyticsRef = getDb().collection('organizations').doc(orgId)
      .collection('channelAnalytics').doc(today)

    const statusField = mapStatusToField(status)
    if (statusField) {
      await analyticsRef.set({
        date: today,
        [`channels.${channel}.${statusField}`]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true })
    }

  } catch (error) {
    console.error('updateChannelAnalytics error:', error)
  }
}

function mapStatusToField(status) {
  const mapping = {
    'sent': 'sent',
    'delivered': 'delivered',
    'failed': 'failed',
    'read': 'read'
  }
  return mapping[status] || null
}

// ============================================
// LOGGER WEBHOOK ORPHELIN
// ============================================
async function logOrphanedWebhook(type, data) {
  try {
    await getDb().collection('orphanedWebhooks').add({
      type,
      data,
      createdAt: FieldValue.serverTimestamp()
    })
  } catch (error) {
    console.error('logOrphanedWebhook error:', error)
  }
}
