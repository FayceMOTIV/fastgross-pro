/**
 * Personalized Video - Video personnalisee via Tavus (primary) / HeyGen (fallback)
 *
 * Business Plan only. L'avatar prononce le prenom du prospect.
 *
 * Stack:
 *   - Tavus : generation video personnalisee (primary)
 *   - HeyGen : fallback si Tavus indisponible
 *   - Groq : generation du script (45s max)
 *
 * Variables: TAVUS_API_KEY, HEYGEN_API_KEY
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'

const getDb = () => getFirestore()

const TAVUS_API_BASE = 'https://tavusapi.com'
const HEYGEN_API_BASE = 'https://api.heygen.com'
const MAX_SCRIPT_DURATION_SEC = 45
const MAX_SCRIPT_WORDS = 120

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'personalizedVideo', event, ...data, timestamp: new Date().toISOString() }))

/**
 * Genere un script video personnalise de 45 secondes max via Groq.
 *
 * @param {Object} lead - Le lead (name, company, sector, pain)
 * @param {Object} clientConfig - Config organisation (companyName, niche, value_prop)
 * @returns {Promise<{script: string, wordCount: number, estimatedDurationSec: number}>}
 */
export async function generateVideoScript(lead, clientConfig) {
  const companyName = clientConfig?.companyName || 'notre entreprise'
  const niche = clientConfig?.niche || 'B2B'
  const valueProp = clientConfig?.value_prop || 'nos services'
  const prospectName = lead?.name?.split(' ')[0] || 'cher prospect'

  const prompt = `Ecris un script video de 45 secondes max (${MAX_SCRIPT_WORDS} mots max) pour un message commercial personnalise.

Contexte:
- Tu es le representant de ${companyName} (secteur: ${niche})
- Tu t'adresses a ${prospectName} de ${lead?.company || 'son entreprise'}
- Proposition de valeur: ${valueProp}

Regles du script:
1. Commence par "Bonjour ${prospectName}" (l'avatar prononcera le prenom)
2. 1 phrase d'accroche liee a leur activite
3. 1 phrase sur le benefice concret qu'on apporte
4. 1 call-to-action simple (proposer un echange de 15 min)
5. Ton: chaleureux, direct, pas commercial agressif
6. PAS de guillemets, PAS de directions de camera, juste le texte a lire
7. Francais courant

Reponds UNIQUEMENT avec le script, rien d'autre.`

  try {
    const script = await callAI(prompt, 300)

    if (!script || script.trim().length < 20) {
      log('script_generation_empty', { leadId: lead?.id })
      return { script: '', wordCount: 0, estimatedDurationSec: 0 }
    }

    const cleaned = script.trim().replace(/^["']|["']$/g, '')
    const wordCount = cleaned.split(/\s+/).length
    const estimatedDurationSec = Math.round(wordCount / 2.5) // ~150 mots/min en francais

    log('script_generated', { leadId: lead?.id, wordCount, estimatedDurationSec })
    return { script: cleaned, wordCount, estimatedDurationSec }
  } catch (error) {
    log('script_error', { leadId: lead?.id, error: error.message })
    return { script: '', wordCount: 0, estimatedDurationSec: 0 }
  }
}

/**
 * Genere une video personnalisee pour un prospect.
 * Utilise Tavus en priorite, fallback sur HeyGen.
 *
 * @param {Object} lead - Le lead (id, name, company, email, orgId)
 * @param {Object} clientConfig - Config organisation (tavusReplicaId, heygenAvatarId, companyName, niche, value_prop)
 * @returns {Promise<{success: boolean, videoUrl?: string, thumbnailUrl?: string, duration?: number, provider?: string, error?: string}>}
 */
export async function generatePersonalizedVideo(lead, clientConfig) {
  const orgId = lead?.orgId || clientConfig?.orgId

  if (!lead?.name || !orgId) {
    log('error', { error: 'Missing lead name or orgId' })
    return { success: false, error: 'missing_params' }
  }

  try {
    // Generer le script
    const { script, estimatedDurationSec } = await generateVideoScript(lead, clientConfig)

    if (!script) {
      return { success: false, error: 'script_generation_failed' }
    }

    // Essayer Tavus en priorite
    const tavusKey = process.env.TAVUS_API_KEY
    if (tavusKey) {
      const tavusResult = await createTavusVideo(lead, script, clientConfig, tavusKey)
      if (tavusResult.success) {
        await saveVideoRecord(orgId, lead.id, tavusResult, 'tavus')
        return { ...tavusResult, provider: 'tavus' }
      }
      log('tavus_fallback', { leadId: lead.id, error: tavusResult.error })
    }

    // Fallback HeyGen
    const heygenKey = process.env.HEYGEN_API_KEY
    if (heygenKey) {
      const heygenResult = await createHeyGenVideo(lead, script, clientConfig, heygenKey)
      if (heygenResult.success) {
        await saveVideoRecord(orgId, lead.id, heygenResult, 'heygen')
        return { ...heygenResult, provider: 'heygen' }
      }
      log('heygen_failed', { leadId: lead.id, error: heygenResult.error })
    }

    log('all_providers_failed', { leadId: lead.id })
    return { success: false, error: 'all_video_providers_failed' }
  } catch (error) {
    log('video_error', { leadId: lead.id, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Cree une video via Tavus API
 * @param {Object} lead - Le lead
 * @param {string} script - Script genere
 * @param {Object} clientConfig - Config client
 * @param {string} apiKey - Tavus API key
 * @returns {Promise<{success: boolean, videoUrl?: string, thumbnailUrl?: string, duration?: number, error?: string}>}
 */
async function createTavusVideo(lead, script, clientConfig, apiKey) {
  try {
    const response = await fetch(`${TAVUS_API_BASE}/v2/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        replica_id: clientConfig?.tavusReplicaId || undefined,
        script,
        video_name: `FMF - ${lead.name} - ${lead.company || 'prospect'}`,
        variables: {
          prospect_name: lead.name?.split(' ')[0] || 'prospect',
          company: lead.company || ''
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message || `tavus_${response.status}` }
    }

    log('tavus_created', { leadId: lead.id, videoId: data.video_id })

    return {
      success: true,
      videoUrl: data.download_url || data.hosted_url || null,
      thumbnailUrl: data.thumbnail_url || null,
      duration: data.duration || null,
      videoId: data.video_id
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Cree une video via HeyGen API (fallback)
 * @param {Object} lead - Le lead
 * @param {string} script - Script genere
 * @param {Object} clientConfig - Config client
 * @param {string} apiKey - HeyGen API key
 * @returns {Promise<{success: boolean, videoUrl?: string, thumbnailUrl?: string, duration?: number, error?: string}>}
 */
async function createHeyGenVideo(lead, script, clientConfig, apiKey) {
  try {
    const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: clientConfig?.heygenAvatarId || 'default'
          },
          voice: {
            type: 'text',
            input_text: script
          }
        }],
        title: `FMF - ${lead.name}`,
        dimension: { width: 1280, height: 720 }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data?.message || `heygen_${response.status}` }
    }

    log('heygen_created', { leadId: lead.id, videoId: data.data?.video_id })

    return {
      success: true,
      videoUrl: data.data?.video_url || null,
      thumbnailUrl: data.data?.thumbnail_url || null,
      duration: data.data?.duration || null,
      videoId: data.data?.video_id
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Sauvegarde le record video dans Firestore
 * @param {string} orgId - Organisation ID
 * @param {string} leadId - Lead ID
 * @param {Object} videoResult - Resultat generation
 * @param {string} provider - Provider utilise
 */
async function saveVideoRecord(orgId, leadId, videoResult, provider) {
  try {
    const db = getDb()
    await db.collection(`organizations/${orgId}/interactions`).add({
      prospectId: leadId,
      channel: 'video',
      direction: 'outbound',
      source: 'personalizedVideo',
      provider,
      videoUrl: videoResult.videoUrl || null,
      thumbnailUrl: videoResult.thumbnailUrl || null,
      status: 'created',
      createdAt: FieldValue.serverTimestamp()
    })
  } catch (error) {
    log('save_record_error', { leadId, error: error.message })
  }
}
