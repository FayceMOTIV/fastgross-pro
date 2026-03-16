/**
 * Evolution API Webhook Handler
 *
 * Recoit les events de toutes les instances Evolution API :
 * - CONNECTION_UPDATE : mise a jour statut connexion dans Firestore
 * - MESSAGES_UPSERT : messages entrants routes vers replyHandler
 *
 * L'instance name suit le format "whatsapp-{orgId}"
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { handleIncomingReply } from '../../services/replyHandler.js'

const getDb = () => getFirestore()

function extractOrgIdFromInstance(instanceName) {
  if (!instanceName || !instanceName.startsWith('whatsapp-')) return null
  return instanceName.replace('whatsapp-', '')
}

async function handleConnectionUpdate(orgId, instanceName, data) {
  const state = data?.state || data?.status || 'disconnected'
  const integrationRef = getDb()
    .collection('organizations').doc(orgId)
    .collection('integrations').doc('whatsapp')

  const isConnected = state === 'open'

  const updateData = {
    status: isConnected ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (isConnected) {
    updateData.connectedAt = FieldValue.serverTimestamp()
  }

  if (state === 'close' || state === 'disconnected') {
    updateData.phoneNumber = null
    updateData.connectedAt = null
  }

  await integrationRef.update(updateData)

  console.log(JSON.stringify({
    event: 'whatsapp_connection_update',
    orgId,
    instanceName,
    state,
    status: updateData.status,
  }))
}

async function handleIncomingMessage(orgId, data) {
  // Ignorer les messages sortants
  if (data?.key?.fromMe) return

  const from = data?.key?.remoteJid?.replace(/@s\.whatsapp\.net$/, '') || null
  const text = data?.message?.conversation
    || data?.message?.extendedTextMessage?.text
    || data?.message?.imageMessage?.caption
    || data?.message?.documentMessage?.caption
    || null

  // Extract attachment info from WhatsApp media messages
  const documentMsg = data?.message?.documentMessage
  const imageMsg = data?.message?.imageMessage
  const hasAttachment = !!(documentMsg || imageMsg)
  const attachmentUrl = documentMsg?.url || imageMsg?.url || null
  const attachmentMimeType = documentMsg?.mimetype || imageMsg?.mimetype || null

  if (!from || (!text && !hasAttachment)) return

  // Chercher le prospect par numero de telephone
  const prospectsRef = getDb()
    .collection('organizations').doc(orgId)
    .collection('prospects')

  // Normaliser le numero (retirer le +)
  const normalizedFrom = from.replace(/^\+/, '')

  const snapshot = await prospectsRef
    .where('phone', '>=', normalizedFrom.slice(-9))
    .where('phone', '<=', normalizedFrom.slice(-9) + '\uf8ff')
    .limit(5)
    .get()

  let prospectId = null

  if (!snapshot.empty) {
    // Trouver le match exact
    for (const doc of snapshot.docs) {
      const prospectPhone = (doc.data().phone || doc.data().mobile || '').replace(/[\s\-\.\(\)\+]/g, '')
      if (prospectPhone.endsWith(normalizedFrom.slice(-9))) {
        prospectId = doc.id
        break
      }
    }
  }

  if (!prospectId) {
    // Essayer avec le champ mobile
    const mobileSnapshot = await prospectsRef
      .where('mobile', '>=', normalizedFrom.slice(-9))
      .where('mobile', '<=', normalizedFrom.slice(-9) + '\uf8ff')
      .limit(5)
      .get()

    if (!mobileSnapshot.empty) {
      for (const doc of mobileSnapshot.docs) {
        const mobilePhone = (doc.data().mobile || '').replace(/[\s\-\.\(\)\+]/g, '')
        if (mobilePhone.endsWith(normalizedFrom.slice(-9))) {
          prospectId = doc.id
          break
        }
      }
    }
  }

  if (!prospectId) {
    console.log(JSON.stringify({
      event: 'whatsapp_incoming_no_prospect',
      orgId,
      from: normalizedFrom,
    }))
    return
  }

  // Router vers le replyHandler existant
  await handleIncomingReply(orgId, prospectId, 'whatsapp', text || '', normalizedFrom)

  // Check for conversion action (document upload, positive reply, etc.)
  try {
    const { checkAndHandleConversion } = await import('../../alex/documentCollector.js')
    await checkAndHandleConversion({
      orgId,
      prospectId,
      text: text || '',
      hasAttachment,
      attachmentUrl,
      attachmentMimeType,
      channel: 'whatsapp',
    })
  } catch (err) {
    console.error('Conversion check failed (non-blocking):', err.message)
  }

  console.log(JSON.stringify({
    event: 'whatsapp_incoming_routed',
    orgId,
    prospectId,
    from: normalizedFrom,
  }))
}

export const evolutionWebhookHandler = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    // Fast ack — toujours repondre 200 immediatement
    res.status(200).send('OK')

    try {
      const body = req.body || {}
      const event = body.event
      const instance = body.instance || body.instanceName || body.sender?.instanceName
      const data = body.data || body

      if (!event || !instance) return

      const orgId = extractOrgIdFromInstance(instance)
      if (!orgId) {
        console.log(JSON.stringify({
          event: 'whatsapp_webhook_unknown_instance',
          instance,
        }))
        return
      }

      switch (event) {
        case 'connection.update':
          await handleConnectionUpdate(orgId, instance, data)
          break

        case 'messages.upsert':
          if (Array.isArray(data)) {
            for (const msg of data) {
              await handleIncomingMessage(orgId, msg)
            }
          } else {
            await handleIncomingMessage(orgId, data)
          }
          break

        default:
          // Ignorer les autres events
          break
      }
    } catch (error) {
      console.error('Evolution webhook error:', error)
    }
  }
)
