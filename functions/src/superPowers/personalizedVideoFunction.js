/**
 * personalizedVideoFunction.js — Cloud Function callables pour la Video Personnalisee IA
 *
 * Super Pouvoir 2 : genere des videos personnalisees via Tavus/HeyGen
 * pour chaque prospect (l'avatar prononce leur prenom).
 *
 * Exports:
 *   - generatePersonalizedVideoFn (onCall) — generer une video pour un prospect
 *   - getVideoStatusFn (onCall) — verifier le statut d'une video en cours
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Generer une video personnalisee pour un prospect
 *
 * @param {string} prospectId - ID du prospect
 * @param {string} orgId - (optionnel, deduit de l'auth)
 * @returns {{ success, videoUrl, thumbnailUrl, duration, provider, error }}
 */
export const generatePersonalizedVideoFn = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis')

    const { prospectId } = request.data || {}
    if (!prospectId) throw new HttpsError('invalid-argument', 'prospectId requis')

    const db = getDb()

    // Recuperer l'org du user — JAMAIS confiance aux donnees client
    const userDoc = await db.collection('users').doc(uid).get()
    const orgId = userDoc.data()?.organizationId || userDoc.data()?.currentOrganizationId
    if (!orgId) throw new HttpsError('failed-precondition', 'Organisation introuvable')

    // Recuperer le prospect
    const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
    if (!prospectDoc.exists) throw new HttpsError('not-found', 'Prospect introuvable')
    const prospect = { id: prospectDoc.id, ...prospectDoc.data(), orgId }

    // Recuperer la config org
    const orgDoc = await db.doc(`organizations/${orgId}`).get()
    const orgData = orgDoc.data() || {}
    const clientConfig = {
      orgId,
      companyName: orgData.companyName || orgData.name || 'Face Media Factory',
      niche: orgData.niche || orgData.sector || 'B2B',
      value_prop: orgData.valueProp || orgData.value_prop || 'nos services',
      tavusReplicaId: orgData.videoConfig?.tavusReplicaId || undefined,
      heygenAvatarId: orgData.videoConfig?.heygenAvatarId || undefined,
    }

    // Generer la video
    const { generatePersonalizedVideo } = await import('./personalizedVideo.js')
    const result = await generatePersonalizedVideo(prospect, clientConfig)

    if (!result.success) {
      console.error(`[VideoFn] Echec generation video pour ${prospectId}:`, result.error)
    }

    return result
  }
)

/**
 * Verifier le statut d'une video (Tavus/HeyGen sont async)
 *
 * @param {string} videoId - ID de la video chez le provider
 * @param {string} provider - 'tavus' ou 'heygen'
 * @returns {{ status, videoUrl, thumbnailUrl, duration }}
 */
export const getVideoStatusFn = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis')

    const { videoId, provider } = request.data || {}
    if (!videoId || !provider) throw new HttpsError('invalid-argument', 'videoId et provider requis')

    if (provider === 'tavus') {
      const apiKey = process.env.TAVUS_API_KEY
      if (!apiKey) throw new HttpsError('failed-precondition', 'TAVUS_API_KEY non configure')

      const res = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
        headers: { 'x-api-key': apiKey },
      })
      if (!res.ok) throw new HttpsError('internal', `Tavus API erreur: ${res.status}`)
      const data = await res.json()

      return {
        status: data.status || 'unknown',
        videoUrl: data.download_url || data.hosted_url || null,
        thumbnailUrl: data.thumbnail_url || null,
        duration: data.duration || null,
      }
    }

    if (provider === 'heygen') {
      const apiKey = process.env.HEYGEN_API_KEY
      if (!apiKey) throw new HttpsError('failed-precondition', 'HEYGEN_API_KEY non configure')

      const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': apiKey },
      })
      if (!res.ok) throw new HttpsError('internal', `HeyGen API erreur: ${res.status}`)
      const data = await res.json()

      return {
        status: data.data?.status || 'unknown',
        videoUrl: data.data?.video_url || null,
        thumbnailUrl: data.data?.thumbnail_url || null,
        duration: data.data?.duration || null,
      }
    }

    throw new HttpsError('invalid-argument', `Provider inconnu: ${provider}`)
  }
)
