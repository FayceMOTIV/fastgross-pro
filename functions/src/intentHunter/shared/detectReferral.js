/**
 * Detect Referral — Intent Hunter (Shared B2B + B2C)
 *
 * Analyse le texte de chaque reponse a Alex pour detecter
 * une mention de referral (recommandation d'un tiers).
 *
 * Signaux detectes :
 *   "je connais quelqu'un qui cherche..."
 *   "mon associe a le meme besoin"
 *   "je vais en parler a..."
 *   "vous devriez contacter [Prenom]"
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const REFERRAL_PATTERNS = [
  /je connais (quelqu'?un|une personne|un ami|un collegue)/i,
  /mon (associe|collegue|ami|voisin|frere|beau-frere)/i,
  /ma (collegue|amie|voisine|soeur|belle-soeur)/i,
  /en parler (a|à) (un|mon|ma)/i,
  /vous devriez (contacter|appeler|voir)/i,
  /tu devrais (contacter|appeler|voir)/i,
  /le meme (besoin|probleme|souci)/i,
  /un autre (client|prospect|contact)/i,
  /je (te|vous) (recommande|conseille|envoie)/i,
  /qui (cherche|a besoin|recherche) (aussi|egalement)/i,
  /pareil pour (mon|ma|un|une)/i,
  /transmets? (le|ton|votre) (contact|numero)/i
]

/**
 * Detecte si une reponse contient un referral
 * @param {string} responseText - Texte de la reponse
 * @returns {{ hasReferral: boolean, confidence: number }}
 */
export function detectReferralInText(responseText) {
  if (!responseText) return { hasReferral: false, confidence: 0 }

  const text = responseText.toLowerCase()
  const matchCount = REFERRAL_PATTERNS.filter(pattern => pattern.test(text)).length

  return {
    hasReferral: matchCount > 0,
    confidence: Math.min(1, matchCount * 0.4) // 1 match = 40%, 2 = 80%, 3+ = 100%
  }
}

/**
 * Extrait les informations du referral via Groq
 * @param {string} responseText
 * @param {Object} sourceLead - Lead source du referral
 * @returns {Promise<Object|null>} Referral info ou null
 */
export async function extractReferralInfo(responseText, sourceLead) {
  try {
    const { callGroq } = await import('../../ai/callAI.js')

    const response = await callGroq({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Analyse ce message et extrait les informations du referral mentionne.
Message : "${responseText}"

Reponds en JSON strict :
{
  "firstName": "prenom mentionne ou null",
  "lastName": "nom mentionne ou null",
  "company": "entreprise mentionnee ou null",
  "context": "resume en 1 phrase du besoin du referral",
  "contactInfo": "tout info de contact mentionnee ou null"
}

Si aucun referral clair, reponds : { "firstName": null }`
      }],
      max_tokens: 200,
      temperature: 0.1
    })

    const content = response?.choices?.[0]?.message?.content?.trim()
    if (!content) return null

    // Parser le JSON de la reponse
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.firstName) return null

    return parsed
  } catch {
    return null
  }
}

/**
 * Cree un lead referral dans Firestore
 * @param {Object} referralInfo - Info extraite
 * @param {Object} sourceLead - Lead qui a fait le referral
 * @param {string} collection - Collection cible
 */
export async function createReferralLead(referralInfo, sourceLead, collection) {
  const db = getDb()

  const referralLead = {
    clientId: sourceLead.clientId,
    systemType: sourceLead.systemType,
    source: sourceLead.source,
    sourceUrl: sourceLead.sourceUrl,
    sourcePublicStatement: `Referral via ${sourceLead.firstName || 'contact'}: ${referralInfo.context}`,
    firstName: referralInfo.firstName,
    lastName: referralInfo.lastName || null,
    company: referralInfo.company || null,
    email: null,
    phone: null,
    intentSignal: referralInfo.context,
    score: 0, // Sera recalcule avec bonus +20
    dynamicScore: 0,
    priority: 'warm',
    sequenceStep: 0,
    sequenceStatus: 'pending',
    contactHistory: [],
    referredBy: sourceLead.firstName || 'contact',
    referralSourceLeadId: sourceLead.id || null,
    gdprBasis: 'legitimate_interest',
    collectedAt: Timestamp.now(),
    lastActivityAt: Timestamp.now(),
    dataRetentionUntil: new Date(Date.now() + 365 * 86400000),
    isBlacklisted: false,
    createdAt: Timestamp.now()
  }

  const docRef = await db.collection(collection).add(referralLead)

  // Aussi dans referralLeads pour tracking
  await db.collection('referralLeads').doc(docRef.id).set({
    ...referralLead,
    originalCollection: collection,
    referralDetectedAt: Timestamp.now()
  })

  console.log(JSON.stringify({
    function: 'detectReferral.createReferralLead',
    step: 'created',
    referralLeadId: docRef.id,
    referredBy: sourceLead.firstName,
    clientId: sourceLead.clientId
  }))

  return docRef.id
}
