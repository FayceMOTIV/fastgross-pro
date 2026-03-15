/**
 * rescueScheduler — Cron toutes les heures
 * Trouve les prospects froids avec rescueScheduledAt <= now
 * Genere un message de relance via Groq et l'envoie
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Groq from 'groq-sdk'
import { sendMessage } from './sendMessage.js'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

/**
 * Scheduler: toutes les heures, relance les prospects froids
 */
export const rescueScheduler = onSchedule(
  {
    schedule: 'every 1 hours',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
    retryCount: 1,
  },
  async () => {
    logger.info('rescueScheduler: starting hourly rescue run')

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      logger.error('GROQ_API_KEY not configured, skipping rescue')
      return
    }

    const groq = new Groq({ apiKey: groqApiKey })
    const now = new Date()
    const db = getDb()

    // Charger config Alex
    let alexConfig = {}
    try {
      const configSnap = await db.collection('settings').doc('alex').get()
      if (configSnap.exists) {
        alexConfig = configSnap.data()
      }
    } catch (err) {
      logger.warn('Could not load alex config:', err.message)
    }

    // Trouver toutes les orgs actives
    let orgsSnap
    try {
      orgsSnap = await db.collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()
    } catch (err) {
      logger.error('Failed to fetch organizations:', err.message)
      return
    }

    if (orgsSnap.empty) {
      logger.info('rescueScheduler: no active organizations')
      return
    }

    let totalRescued = 0
    let totalErrors = 0

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id
      const orgData = orgDoc.data()

      try {
        // Verifier heures de bureau
        const timezone = orgData.timezone || 'Europe/Paris'
        const hour = getHourInTimezone(timezone)
        const businessStart = orgData.businessHours?.start ?? 8
        const businessEnd = orgData.businessHours?.end ?? 20

        if (hour < businessStart || hour >= businessEnd) {
          logger.info(`rescueScheduler: skipping org ${orgId} — outside business hours (${hour}h)`)
          continue
        }

        // Trouver les prospects a rescuer
        const prospectsSnap = await db
          .collection('organizations').doc(orgId)
          .collection('prospects')
          .where('rescueScheduledAt', '<=', now)
          .where('blacklisted', '==', false)
          .limit(20)
          .get()

        if (prospectsSnap.empty) {
          continue
        }

        logger.info(`rescueScheduler: ${prospectsSnap.size} prospects to rescue for org ${orgId}`)

        for (const prospectDoc of prospectsSnap.docs) {
          const prospect = { id: prospectDoc.id, ...prospectDoc.data() }

          try {
            const rescued = await rescueProspect({
              orgId,
              orgData,
              prospect,
              groq,
              alexConfig,
            })

            if (rescued) {
              totalRescued++
            }
          } catch (err) {
            logger.error(`rescueScheduler: failed to rescue ${prospectDoc.id}:`, err.message)
            totalErrors++
          }
        }
      } catch (err) {
        logger.error(`rescueScheduler: error processing org ${orgId}:`, err.message)
        totalErrors++
      }
    }

    logger.info(`rescueScheduler: done — ${totalRescued} rescued, ${totalErrors} errors`)
  }
)

/**
 * Genere et envoie un message de rescue pour un prospect froid
 */
async function rescueProspect({ orgId, orgData, prospect, groq, alexConfig }) {
  const db = getDb()

  // Determiner le canal et le destinataire
  const { channel, to } = resolveContactInfo(prospect)
  if (!channel || !to) {
    logger.warn(`Cannot rescue prospect ${prospect.id}: no contact info`)
    await clearRescue(db, orgId, prospect.id)
    return false
  }

  // Charger les dernieres interactions
  let lastInteractions = []
  try {
    const interSnap = await db
      .collection('organizations').doc(orgId)
      .collection('interactions')
      .where('prospectId', '==', prospect.id)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    lastInteractions = interSnap.docs.map((d) => d.data())
  } catch (err) {
    logger.warn('Could not load interactions for rescue:', err.message)
  }

  // Generer le message de rescue via Groq
  let rescueMessage = ''
  try {
    const prompt = buildRescuePrompt(prospect, lastInteractions, orgData, alexConfig, channel)

    const response = await groq.chat.completions.create({
      model: alexConfig.replyModel || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es Alex, commercial IA de ${orgData.name || 'notre agence'}. Tu maitrises la psychologie de la vente et les techniques de relance avancees.

MISSION: Relancer un prospect froid de maniere strategique.

TECHNIQUES DE RELANCE (choisis la plus adaptee):
1. RUPTURE DOUCE: "Je referme votre dossier sauf si..." — cree l'urgence sans agressivite
2. VALEUR GRATUITE: Partager un insight utile sur leur secteur sans rien demander en retour (reciprocite Cialdini)
3. PREUVE SOCIALE: "Un [meme secteur] a [meme ville] vient de demarrer et..." — declenche la peur de rater
4. QUESTION OUVERTE: "Qu'est-ce qui vous a empeche de donner suite?" — comprendre le vrai bloquant
5. CHANGEMENT D'ANGLE: Si email n'a pas marche, proposer WhatsApp. Si WhatsApp froid, proposer un call.

REGLES:
- Max 2 lignes sur WhatsApp, 3 courts paragraphes sur email
- Jamais de "je me permets de vous relancer" ou "je reviens vers vous"
- Toujours finir par une question ou un CTA unique
- 3e relance sans reponse = technique de rupture definitive`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 400,
    })

    rescueMessage = response.choices?.[0]?.message?.content?.trim() || ''
  } catch (err) {
    logger.error('Groq rescue generation failed:', err.message)
    return false
  }

  if (!rescueMessage) {
    logger.warn(`Empty rescue message for prospect ${prospect.id}`)
    return false
  }

  // Envoyer le message
  const result = await sendMessage({
    orgId,
    prospectId: prospect.id,
    channel,
    message: rescueMessage,
    to,
  })

  // Mettre a jour le prospect (clear rescue, set next rescue si besoin)
  const updateData = {
    rescueScheduledAt: null,
    alexLastRescue: FieldValue.serverTimestamp(),
    rescueCount: FieldValue.increment(1),
  }

  // Si c'est le 3eme rescue sans reponse, abandonner
  const rescueCount = (prospect.rescueCount || 0) + 1
  if (rescueCount < 3) {
    // Planifier le prochain rescue dans 48h
    const nextRescue = new Date()
    nextRescue.setHours(nextRescue.getHours() + 48)
    updateData.rescueScheduledAt = nextRescue
  } else {
    updateData.alexStatus = 'abandoned'
    logger.info(`Prospect ${prospect.id} abandoned after ${rescueCount} rescues`)
  }

  try {
    await db
      .collection('organizations').doc(orgId)
      .collection('prospects').doc(prospect.id)
      .update(updateData)
  } catch (err) {
    logger.error('Failed to update prospect after rescue:', err.message)
  }

  if (result.success) {
    logAlexActivity(orgId, {
      type: 'rescue',
      title: `Relance #${rescueCount} — ${prospect.name || prospect.company || prospect.id}`,
      details: `Canal: ${channel}. Relance ${rescueCount}/3. Message envoye.`,
      status: 'success',
      prospectId: prospect.id,
      channel,
    });
  }

  return result.success
}

/**
 * Determine le meilleur canal et destinataire pour un prospect
 */
function resolveContactInfo(prospect) {
  // Priorite: canal original, puis fallback
  if (prospect.phone) {
    return { channel: 'whatsapp', to: prospect.phone }
  }
  if (prospect.email) {
    return { channel: 'email', to: prospect.email }
  }
  if (prospect.instagramHandle) {
    return { channel: 'instagram', to: prospect.instagramHandle }
  }
  if (prospect.linkedinUrl) {
    return { channel: 'linkedin', to: prospect.linkedinUrl }
  }
  return { channel: null, to: null }
}

/**
 * Supprime le rescue programme d'un prospect
 */
async function clearRescue(db, orgId, prospectId) {
  try {
    await db
      .collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId)
      .update({ rescueScheduledAt: null })
  } catch (err) {
    logger.warn('clearRescue failed:', err.message)
  }
}

/**
 * Construit le prompt de rescue
 */
function buildRescuePrompt(prospect, interactions, orgData, alexConfig, channel) {
  const lastMessages = interactions
    .filter((i) => i.direction === 'in')
    .slice(0, 3)
    .map((i) => `- "${i.message}"`)
    .join('\n')

  const maxLen = channel === 'whatsapp' ? 250 : channel === 'email' ? 400 : 180

  return `Relance ce prospect froid de maniere naturelle.

Prospect: ${prospect.name || 'Inconnu'}
${prospect.company ? `Entreprise: ${prospect.company}` : ''}
Canal: ${channel}
Score actuel: ${prospect.alexScore || 0}/100
Nombre de relances precedentes: ${prospect.rescueCount || 0}

${lastMessages ? `Derniers messages du prospect:\n${lastMessages}` : 'Aucun message recent.'}

Nos services: ${alexConfig.services || orgData.services || 'prospection digitale'}

Regles:
- Max ${maxLen} caracteres
- Ne PAS repeter le meme message que les fois precedentes
- Apporter de la VALEUR (conseil, stat, insight)
- Poser une question ouverte pour re-engager
- Ton naturel, pas commercial
- ${prospect.rescueCount >= 2 ? 'DERNIERE tentative — sois direct et authentique' : 'Reste leger et curieux'}`
}

/**
 * Retourne l'heure actuelle dans un fuseau horaire donne
 */
function getHourInTimezone(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(new Date()), 10)
  } catch {
    return new Date().getHours()
  }
}
