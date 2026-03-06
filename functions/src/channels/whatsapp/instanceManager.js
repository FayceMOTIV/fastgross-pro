/**
 * WhatsApp Instance Manager — Multi-Tenant Evolution API
 *
 * Gere le cycle de vie des instances WhatsApp par tenant :
 * - Creation d'instance sur Evolution API
 * - QR code pour connexion
 * - Statut de connexion
 * - Deconnexion
 *
 * Schema Firestore : organizations/{orgId}/integrations/whatsapp
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const EVOLUTION_TIMEOUT_MS = 15000
const WEBHOOK_FUNCTION_URL = 'https://europe-west1-face-media-factory.cloudfunctions.net/evolutionWebhook'

function getEvolutionBaseUrl() {
  const url = process.env.EVOLUTION_API_URL
  if (!url) throw new Error('EVOLUTION_API_URL non configure')
  return url.replace(/\/+$/, '')
}

function getEvolutionApiKey() {
  const key = process.env.EVOLUTION_API_KEY
  if (!key) throw new Error('EVOLUTION_API_KEY non configure')
  return key
}

function buildInstanceName(orgId) {
  return `whatsapp-${orgId}`
}

async function evolutionFetch(path, options = {}) {
  const baseUrl = getEvolutionBaseUrl()
  const apiKey = getEvolutionApiKey()
  const url = `${baseUrl}${path}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EVOLUTION_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const msg = data?.response?.message || data?.message || data?.error || `HTTP ${response.status}`
      throw new Error(`Evolution API error: ${msg}`)
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Evolution API timeout (15s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function getIntegrationRef(orgId) {
  return getDb()
    .collection('organizations').doc(orgId)
    .collection('integrations').doc('whatsapp')
}

// ============================================
// 1A. CREATE WHATSAPP INSTANCE
// ============================================
export async function createWhatsAppInstance(orgId) {
  const instanceName = buildInstanceName(orgId)
  const integrationRef = getIntegrationRef(orgId)

  // Verifier qu'aucune instance active n'existe
  const existing = await integrationRef.get()
  if (existing.exists) {
    const data = existing.data()
    if (data?.status === 'connected') {
      throw new Error('Une instance WhatsApp est deja connectee pour cette organisation')
    }
  }

  // Creer l'instance sur Evolution API
  await evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    }),
  })

  // Configurer le webhook sur l'instance
  try {
    await evolutionFetch(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          url: WEBHOOK_FUNCTION_URL,
          enabled: true,
          webhookByEvents: true,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      }),
    })
  } catch (err) {
    console.error(`Webhook setup failed for ${instanceName}:`, err.message)
    // Non bloquant — on continue meme si le webhook echoue
  }

  // Ecrire dans Firestore
  await integrationRef.set({
    provider: 'evolution',
    instanceName,
    status: 'connecting',
    phoneNumber: null,
    connectedAt: null,
    enabled: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  return { instanceName, status: 'connecting' }
}

// ============================================
// 1B. GET QR CODE
// ============================================
export async function getWhatsAppQRCode(orgId) {
  const integrationRef = getIntegrationRef(orgId)
  const snap = await integrationRef.get()

  if (!snap.exists || !snap.data()?.instanceName) {
    throw new Error('Aucune instance WhatsApp configuree. Creez-en une d\'abord.')
  }

  const { instanceName } = snap.data()

  const data = await evolutionFetch(`/instance/connect/${instanceName}`)

  // Si deja connecte
  if (data?.instance?.state === 'open' || data?.state === 'open') {
    await integrationRef.update({
      status: 'connected',
      updatedAt: FieldValue.serverTimestamp(),
    })
    return { status: 'connected' }
  }

  // Retourner le QR code
  const base64 = data?.base64 || data?.qrcode?.base64 || null
  const pairingCode = data?.pairingCode || data?.code || null

  if (!base64 && !pairingCode) {
    throw new Error('QR code non disponible. Reessayez dans quelques secondes.')
  }

  return {
    status: 'connecting',
    base64: base64?.startsWith('data:') ? base64 : base64 ? `data:image/png;base64,${base64}` : null,
    pairingCode,
  }
}

// ============================================
// 1C. GET CONNECTION STATUS
// ============================================
export async function getWhatsAppConnectionStatus(orgId) {
  const integrationRef = getIntegrationRef(orgId)
  const snap = await integrationRef.get()

  if (!snap.exists || !snap.data()?.instanceName) {
    return { status: 'not_configured' }
  }

  const { instanceName } = snap.data()

  try {
    const data = await evolutionFetch(`/instance/connectionState/${instanceName}`)

    const state = data?.instance?.state || data?.state || 'disconnected'
    const isConnected = state === 'open'

    const updateData = {
      status: isConnected ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Recuperer le numero si connecte
    if (isConnected) {
      try {
        const instanceInfo = await evolutionFetch(`/instance/fetchInstances?instanceName=${instanceName}`)
        const info = Array.isArray(instanceInfo) ? instanceInfo[0] : instanceInfo
        const phoneNumber = info?.instance?.owner || info?.owner || snap.data()?.phoneNumber || null
        if (phoneNumber) {
          updateData.phoneNumber = phoneNumber.replace(/@s\.whatsapp\.net$/, '')
          updateData.connectedAt = snap.data()?.connectedAt || FieldValue.serverTimestamp()
        }
      } catch {
        // Non bloquant
      }
    }

    await integrationRef.update(updateData)

    return {
      status: updateData.status,
      phoneNumber: updateData.phoneNumber || snap.data()?.phoneNumber || null,
      connectedAt: snap.data()?.connectedAt || null,
    }
  } catch (err) {
    // Instance n'existe peut-etre pas sur le serveur
    if (err.message?.includes('not found') || err.message?.includes('404')) {
      await integrationRef.update({
        status: 'disconnected',
        updatedAt: FieldValue.serverTimestamp(),
      })
      return { status: 'disconnected' }
    }
    throw err
  }
}

// ============================================
// 1D. DISCONNECT WHATSAPP
// ============================================
export async function disconnectWhatsApp(orgId) {
  const integrationRef = getIntegrationRef(orgId)
  const snap = await integrationRef.get()

  if (!snap.exists || !snap.data()?.instanceName) {
    throw new Error('Aucune instance WhatsApp configuree')
  }

  const { instanceName } = snap.data()

  // Deconnecter sur Evolution API
  try {
    await evolutionFetch(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.error(`Logout failed for ${instanceName}:`, err.message)
    // Continuer meme si le logout echoue (instance peut etre deja deconnectee)
  }

  // Mettre a jour Firestore
  await integrationRef.update({
    status: 'disconnected',
    phoneNumber: null,
    connectedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { status: 'disconnected' }
}
