/**
 * Long-Term Memory - Memoire prospect a travers les sequences
 *
 * Business Plan only. Alex ne repete jamais la meme approche.
 *
 * Collection: organizations/{orgId}/prospectMemory/{leadId}
 * Fields: contactsHistory, preferredChannel, preferredTone,
 *         bestContactTime, objections, topicsUsed, emailOpenCount, etc.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI, extractJSON } from '../ai/callAI.js'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'longTermMemory', event, ...data, timestamp: new Date().toISOString() }))

const MAX_HISTORY_ENTRIES = 50
const MAX_TOPICS = 20
const MAX_OBJECTIONS = 10

/**
 * Recupere la memoire d'un prospect. Retourne null si aucune memoire existante.
 *
 * @param {string} leadId - ID du prospect
 * @param {string} orgId - Organisation ID
 * @returns {Promise<Object|null>} Memoire du prospect ou null
 */
export async function getProspectMemory(leadId, orgId) {
  if (!leadId || !orgId) return null

  try {
    const db = getDb()
    const doc = await db.doc(`organizations/${orgId}/prospectMemory/${leadId}`).get()

    if (!doc.exists) {
      log('memory_not_found', { leadId, orgId })
      return null
    }

    log('memory_retrieved', { leadId, entriesCount: doc.data()?.contactsHistory?.length || 0 })
    return doc.data()
  } catch (error) {
    log('memory_read_error', { leadId, error: error.message })
    return null
  }
}

/**
 * Met a jour la memoire du prospect apres chaque interaction.
 * Cree la memoire si elle n'existe pas encore.
 *
 * @param {string} leadId - ID du prospect
 * @param {string} orgId - Organisation ID
 * @param {Object} contactEvent - Evenement de contact
 * @param {string} contactEvent.channel - Canal utilise (email, sms, whatsapp, etc.)
 * @param {string} contactEvent.direction - Direction (outbound, inbound)
 * @param {string} [contactEvent.content] - Contenu du message
 * @param {string} [contactEvent.outcome] - Resultat (opened, replied, bounced, etc.)
 * @param {string} [contactEvent.tone] - Ton utilise (formal, casual, humorous)
 * @param {string} [contactEvent.topic] - Sujet aborde
 * @param {string} [contactEvent.objection] - Objection recue
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProspectMemory(leadId, orgId, contactEvent) {
  if (!leadId || !orgId || !contactEvent) {
    return { success: false, error: 'missing_params' }
  }

  try {
    const db = getDb()
    const memRef = db.doc(`organizations/${orgId}/prospectMemory/${leadId}`)
    const doc = await memRef.get()

    const entry = {
      channel: contactEvent.channel,
      direction: contactEvent.direction || 'outbound',
      outcome: contactEvent.outcome || null,
      tone: contactEvent.tone || null,
      topic: contactEvent.topic || null,
      timestamp: new Date().toISOString()
    }

    if (doc.exists) {
      const current = doc.data()
      const history = current.contactsHistory || []

      // Garder seulement les N derniers contacts
      const trimmedHistory = history.length >= MAX_HISTORY_ENTRIES
        ? history.slice(-MAX_HISTORY_ENTRIES + 1)
        : history

      const updates = {
        contactsHistory: [...trimmedHistory, entry],
        lastContactAt: FieldValue.serverTimestamp(),
        totalContacts: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      }

      // Mettre a jour les compteurs par canal
      if (contactEvent.channel) {
        updates[`channelCounts.${contactEvent.channel}`] = FieldValue.increment(1)
      }

      // Tracker les ouvertures email
      if (contactEvent.outcome === 'opened' && contactEvent.channel === 'email') {
        updates.emailOpenCount = FieldValue.increment(1)
      }

      // Tracker les reponses
      if (contactEvent.direction === 'inbound') {
        updates.replyCount = FieldValue.increment(1)
        updates.lastReplyAt = FieldValue.serverTimestamp()
      }

      // Ajouter le topic s'il est nouveau
      if (contactEvent.topic) {
        const topics = current.topicsUsed || []
        if (!topics.includes(contactEvent.topic) && topics.length < MAX_TOPICS) {
          updates.topicsUsed = FieldValue.arrayUnion(contactEvent.topic)
        }
      }

      // Ajouter l'objection si nouvelle
      if (contactEvent.objection) {
        const objections = current.objections || []
        if (!objections.includes(contactEvent.objection) && objections.length < MAX_OBJECTIONS) {
          updates.objections = FieldValue.arrayUnion(contactEvent.objection)
        }
      }

      await memRef.update(updates)
    } else {
      // Creer la memoire initiale
      await memRef.set({
        leadId,
        orgId,
        contactsHistory: [entry],
        topicsUsed: contactEvent.topic ? [contactEvent.topic] : [],
        objections: contactEvent.objection ? [contactEvent.objection] : [],
        channelCounts: contactEvent.channel ? { [contactEvent.channel]: 1 } : {},
        emailOpenCount: 0,
        replyCount: 0,
        totalContacts: 1,
        preferredChannel: null,
        preferredTone: null,
        bestContactTime: null,
        lastContactAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    log('memory_updated', { leadId, channel: contactEvent.channel, outcome: contactEvent.outcome })
    return { success: true }
  } catch (error) {
    log('memory_update_error', { leadId, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Analyse l'historique de contact via Groq pour deduire les preferences du prospect.
 * Met a jour preferredChannel, preferredTone, bestContactTime.
 *
 * @param {Object[]} contactHistory - Historique des contacts
 * @returns {Promise<{preferredChannel?: string, preferredTone?: string, bestContactTime?: string, insights?: string}>}
 */
export async function extractPreferences(contactHistory) {
  if (!contactHistory?.length || contactHistory.length < 2) {
    return {}
  }

  try {
    const historyText = contactHistory
      .slice(-20)
      .map(c => `[${c.timestamp}] ${c.channel} ${c.direction} — outcome: ${c.outcome || 'none'}, tone: ${c.tone || 'none'}`)
      .join('\n')

    const prompt = `Analyse cet historique de contacts commerciaux et deduis les preferences du prospect.

Historique:
${historyText}

Reponds en JSON strict :
{
  "preferredChannel": "le canal ou le prospect repond le plus (email/sms/whatsapp/linkedin) ou null",
  "preferredTone": "le ton qui marche le mieux (formal/casual/humorous/direct) ou null",
  "bestContactTime": "le meilleur moment pour contacter (morning/afternoon/evening) ou null",
  "insights": "1 phrase resume des preferences detectees"
}`

    const result = await callAI(prompt, 300)
    const parsed = extractJSON(result)

    if (!parsed) return {}

    log('preferences_extracted', { preferences: parsed })
    return {
      preferredChannel: parsed.preferredChannel || null,
      preferredTone: parsed.preferredTone || null,
      bestContactTime: parsed.bestContactTime || null,
      insights: parsed.insights || null
    }
  } catch (error) {
    log('preferences_error', { error: error.message })
    return {}
  }
}

/**
 * Construit un prompt enrichi avec la memoire du prospect pour Alex.
 * Inclut l'historique, les objections, les topics deja abordes et les preferences.
 *
 * @param {Object} lead - Le lead
 * @param {Object} clientConfig - Config organisation
 * @param {number} step - Etape actuelle dans la sequence (1, 2, 3...)
 * @returns {Promise<string>} Prompt enrichi pour l'IA
 */
export async function buildAlexPromptWithMemory(lead, clientConfig, step) {
  const orgId = lead?.orgId || clientConfig?.orgId
  const memory = orgId ? await getProspectMemory(lead?.id, orgId) : null

  const baseParts = [
    `Tu es Alex, assistant commercial de ${clientConfig?.companyName || 'notre entreprise'}.`,
    `Etape ${step} de la sequence pour ${lead?.name || 'le prospect'} (${lead?.company || 'entreprise'}).`,
    `Secteur: ${clientConfig?.niche || 'B2B'}.`
  ]

  if (!memory) {
    baseParts.push('Aucun historique avec ce prospect. Premier contact.')
    return baseParts.join('\n')
  }

  const memoryParts = []

  if (memory.totalContacts) {
    memoryParts.push(`Nombre de contacts precedents: ${memory.totalContacts}`)
  }

  if (memory.topicsUsed?.length) {
    memoryParts.push(`Sujets DEJA abordes (NE PAS repeter): ${memory.topicsUsed.join(', ')}`)
  }

  if (memory.objections?.length) {
    memoryParts.push(`Objections exprimees: ${memory.objections.join(', ')}`)
  }

  if (memory.preferredChannel) {
    memoryParts.push(`Canal prefere: ${memory.preferredChannel}`)
  }

  if (memory.preferredTone) {
    memoryParts.push(`Ton prefere: ${memory.preferredTone}`)
  }

  if (memory.bestContactTime) {
    memoryParts.push(`Meilleur moment: ${memory.bestContactTime}`)
  }

  if (memory.replyCount > 0) {
    memoryParts.push(`Le prospect a deja repondu ${memory.replyCount} fois — c'est un lead engage.`)
  }

  if (memoryParts.length > 0) {
    baseParts.push('\n--- MEMOIRE PROSPECT ---')
    baseParts.push(...memoryParts)
    baseParts.push('--- FIN MEMOIRE ---')
    baseParts.push('\nUtilise cette memoire pour personnaliser ton message. Ne repete JAMAIS un sujet deja aborde.')
  }

  return baseParts.join('\n')
}
