/**
 * conversionRelance.js — Sequence de relance pour prospects interesses
 * mais n'ayant pas encore realise la conversion action
 *
 * Schedule:
 * J+2  WhatsApp  ton doux      "Petit rappel — voici le lien..."
 * J+5  Email     argumentaire  "Pour info, {argument supplementaire}..."
 * J+10 WhatsApp  leger/final   "Je ne veux pas insister, mais..."
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import Groq from 'groq-sdk'
import { getConversionAction, buildCTAText } from './conversionCTA.js'
import { sendMessage } from './sendMessage.js'
import { logAlexActivity } from '../utils/logAlexActivity.js'

const getDb = () => getFirestore()

const RELANCE_SCHEDULE = [
  { days: 2, channel: 'whatsapp', tone: 'doux', angle: 'Rappel amical — petit message court, decontracte. Mentionne que tu as un lien simple pour eux.' },
  { days: 5, channel: 'email', tone: 'argumentaire', angle: 'Apporte un argument supplementaire (benefice concret, temoignage). Plus structure, avec un CTA clair.' },
  { days: 10, channel: 'whatsapp', tone: 'final', angle: 'Message final, honnete et leger. "Je ne veux pas insister..." Si pas d\'action, on arrete.' },
]

/**
 * Auto-relance des prospects interesses qui n'ont pas encore converti
 * Appele depuis alexAutonomousWorker par org
 */
export async function autoConversionRelance(orgId) {
  const db = getDb()

  const ca = await getConversionAction(orgId)
  if (!ca || ca.type === 'reply_positive') return // Pas de relance pour reply_positive

  // Charger org pour slug
  const orgSnap = await db.doc(`organizations/${orgId}`).get()
  if (!orgSnap.exists) return
  const orgData = orgSnap.data()
  const orgSlug = orgData.slug || orgId

  // Query prospects interesses mais pas encore convertis
  // alexStatus in ['hot','warm','replied'] ET pas de conversionActionDoneAt
  const interestedSnap = await db.collection(`organizations/${orgId}/prospects`)
    .where('alexStatus', 'in', ['hot', 'warm', 'replied'])
    .limit(50)
    .get()

  let relanced = 0

  for (const doc of interestedSnap.docs) {
    const prospect = doc.data()

    // Skip if already converted
    if (prospect.conversionActionDoneAt) continue

    // Skip if max relances reached
    const relanceCount = prospect.conversionRelanceCount || 0
    if (relanceCount >= 3) continue

    // Skip if blacklisted
    if (prospect.blacklisted) continue

    // Determine which relance step we're on
    const step = RELANCE_SCHEDULE[relanceCount]
    if (!step) continue

    // Check timing: prospect must have been interested for >= step.days
    const interestedSince = prospect.alexLastInbound?.toDate?.() || prospect.alexLastContact?.toDate?.()
    if (!interestedSince) continue

    const daysSince = (Date.now() - interestedSince.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < step.days) continue

    // Check we didn't already relance recently (min 24h between relances)
    if (prospect.lastConversionRelanceAt) {
      const lastRelance = prospect.lastConversionRelanceAt.toDate?.()
      if (lastRelance && (Date.now() - lastRelance.getTime()) < 24 * 60 * 60 * 1000) continue
    }

    // Get contact info for the channel
    const to = step.channel === 'email'
      ? (prospect.email || prospect.emailPro)
      : (prospect.phone || prospect.mobile || prospect.tel)

    if (!to) continue

    // Generate personalized relance message
    const message = await generateRelanceMessage(orgId, prospect, step, ca)
    if (!message) continue

    // Append CTA text
    const ctaText = buildCTAText(ca, step.channel, orgSlug, doc.id)
    const finalMessage = message + ctaText

    // Send via sendMessage with injectCTA: false (we already appended it)
    const result = await sendMessage({
      orgId,
      prospectId: doc.id,
      channel: step.channel,
      message: finalMessage,
      to,
      metadata: { injectCTA: false, source: 'conversion_relance' },
    })

    if (result.success) {
      await doc.ref.update({
        conversionRelanceCount: relanceCount + 1,
        lastConversionRelanceAt: FieldValue.serverTimestamp(),
      })

      relanced++

      if (relanced >= 10) break // Max 10 relances par run par org
    }
  }

  if (relanced > 0) {
    logger.info(`[ConversionRelance] ${relanced} relances envoyees pour ${orgId}`)
    logAlexActivity(orgId, {
      type: 'conversion_relance',
      title: `${relanced} relance(s) conversion envoyee(s)`,
      details: `Type: ${ca.type}. Label: ${ca.label || '-'}.`,
      status: 'success',
    })
  }
}

async function generateRelanceMessage(orgId, prospect, step, ca) {
  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) return null

  const db = getDb()
  const profile = (await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get()).data()

  const prospectName = prospect.name || prospect.contactName || prospect.companyName || 'Bonjour'
  const label = ca.label || 'action requise'

  try {
    const groq = new Groq({ apiKey: groqApiKey })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Tu es Alex, commercial IA de ${profile?.productService || 'notre entreprise'}.
Genere un message de RELANCE (tentative ${step.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}).

PROSPECT : ${prospectName}${prospect.company ? ` (${prospect.company})` : ''}
ACTION ATTENDUE : ${label}
TON : ${step.tone}
ANGLE : ${step.angle}

REGLES :
- Max ${step.channel === 'whatsapp' ? '3 lignes' : '5 lignes'}
- Ne mentionne PAS de lien (il sera ajoute automatiquement apres ton message)
- Ton humain et naturel
- Tutoiement si WhatsApp, vouvoiement si email

Reponds uniquement avec le message.`,
      }],
      temperature: 0.7,
      max_tokens: 300,
    })

    return response.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    logger.warn('[ConversionRelance] Message generation failed:', err.message)
    return null
  }
}
