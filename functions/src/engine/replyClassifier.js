/**
 * Reply Classifier - Classification automatique des reponses
 * Niveau Apollo/Instantly : Categorisation IA + actions automatiques
 */

import { getFirestore } from 'firebase-admin/firestore'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

// Categories de reponses
export const REPLY_CATEGORIES = {
  POSITIVE: {
    code: 'POSITIVE',
    label: 'Interesse',
    description: 'Interesse, veut un RDV, demande plus d\'infos',
    color: 'green',
    action: 'notify_urgent',
    stopSequence: true,
    priority: 'high'
  },
  NEGATIVE: {
    code: 'NEGATIVE',
    label: 'Pas interesse',
    description: 'Pas interesse, ne pas recontacter',
    color: 'red',
    action: 'add_to_suppression',
    stopSequence: true,
    priority: 'low'
  },
  OBJECTION: {
    code: 'OBJECTION',
    label: 'Objection',
    description: 'Pose une question, a un doute - on peut repondre',
    color: 'orange',
    action: 'suggest_reply',
    stopSequence: false,
    priority: 'medium'
  },
  REFERRAL: {
    code: 'REFERRAL',
    label: 'Renvoi',
    description: 'Renvoie vers quelqu\'un d\'autre',
    color: 'blue',
    action: 'add_new_contact',
    stopSequence: true,
    priority: 'medium'
  },
  OOO: {
    code: 'OOO',
    label: 'Absent',
    description: 'Absent du bureau / conge',
    color: 'gray',
    action: 'reschedule',
    stopSequence: false,
    priority: 'low'
  },
  WRONG_PERSON: {
    code: 'WRONG_PERSON',
    label: 'Mauvais contact',
    description: 'Mauvaise personne, pas le decideur',
    color: 'purple',
    action: 'ask_right_contact',
    stopSequence: true,
    priority: 'medium'
  },
  UNSUBSCRIBE: {
    code: 'UNSUBSCRIBE',
    label: 'Desinscription',
    description: 'Demande de ne plus etre contacte',
    color: 'red',
    action: 'add_to_suppression',
    stopSequence: true,
    priority: 'critical'
  },
  NOT_NOW: {
    code: 'NOT_NOW',
    label: 'Pas maintenant',
    description: 'Interesse mais pas le bon moment, relancer plus tard',
    color: 'yellow',
    action: 'reschedule_later',
    stopSequence: true,
    priority: 'medium'
  },
  NEUTRAL: {
    code: 'NEUTRAL',
    label: 'Neutre',
    description: 'Reponse neutre, difficile a classifier',
    color: 'gray',
    action: 'manual_review',
    stopSequence: false,
    priority: 'low'
  }
}

// Mots-cles par categorie pour classification rapide
const CATEGORY_KEYWORDS = {
  POSITIVE: [
    'interesse', 'oui', 'ok', 'daccord', 'd\'accord', 'rdv', 'rendez-vous',
    'rappeler', 'appelez', 'contactez', 'disponible', 'créneau', 'creneau',
    'quand', 'combien', 'tarif', 'devis', 'proposition', 'plus d\'infos'
  ],
  NEGATIVE: [
    'non merci', 'pas interesse', 'pas intéressé', 'ne m\'interesse pas',
    'ne m\'intéresse pas', 'deja un prestataire', 'déjà un prestataire',
    'pas pour nous', 'pas pour moi', 'pas le moment', 'pas besoin',
    'stop', 'arretez', 'arrêtez'
  ],
  OBJECTION: [
    'trop cher', 'budget', 'prix', 'concurrence', 'concurrent',
    'pourquoi', 'comment', 'difference', 'différence', 'garantie',
    'mais', 'cependant', 'toutefois', 'sauf que', 'probleme'
  ],
  OOO: [
    'absent', 'vacances', 'congé', 'conge', 'retour le', 'de retour',
    'hors bureau', 'out of office', 'automatique', 'auto-reply'
  ],
  UNSUBSCRIBE: [
    'desabonner', 'désabonner', 'desinscription', 'désinscription',
    'desinscrire', 'désinscrire', 'ne plus recevoir', 'spam',
    'supprimer', 'retirer', 'stop'
  ],
  WRONG_PERSON: [
    'mauvaise personne', 'pas moi', 'pas le bon', 'pas la bonne',
    'contacter plutot', 'contacter plutôt', 'adressez', 'dirigez',
    'pas mon domaine', 'pas ma responsabilite'
  ],
  REFERRAL: [
    'contactez plutot', 'contactez plutôt', 'mon collegue', 'mon collègue',
    'responsable', 'transfere', 'transféré', 'dirigez-vous', 'voici le contact',
    'voici son email', 'voici son mail', 'je vous mets en contact'
  ],
  NOT_NOW: [
    'pas le moment', 'pas maintenant', 'revenez', 'recontactez',
    'dans quelques mois', 'apres l\'ete', 'après l\'été', 'debut d\'annee',
    'début d\'année', 'plus tard', 'fin d\'annee', 'fin d\'année',
    'en janvier', 'en septembre', 'prochainement', 'rappeler dans'
  ]
}

/**
 * Classifie une reponse avec l'IA
 * @param {string} replyText - Texte de la reponse
 * @param {Object} prospect - Prospect concerne
 * @param {Function} geminiCall - Fonction d'appel Gemini
 * @returns {Object} Classification detaillee
 */
export async function classifyReply(replyText, prospect, geminiCall) {
  // Premiere passe: classification par mots-cles (rapide)
  const keywordResult = classifyByKeywords(replyText)

  // Si classification claire par mots-cles, on peut eviter l'appel IA
  if (keywordResult.confidence === 'high') {
    return {
      ...keywordResult,
      method: 'keywords',
      suggestedReply: getSuggestedReply(keywordResult.category, prospect)
    }
  }

  // Deuxieme passe: classification IA
  try {
    const aiResult = await classifyWithAI(replyText, prospect, geminiCall)
    return {
      ...aiResult,
      method: 'ai',
      keywordHint: keywordResult.category
    }
  } catch (error) {
    console.log('AI classification error, falling back to keywords:', error.message)
    return {
      ...keywordResult,
      method: 'keywords_fallback',
      suggestedReply: getSuggestedReply(keywordResult.category, prospect)
    }
  }
}

/**
 * Classification rapide par mots-cles
 */
function classifyByKeywords(replyText) {
  const normalizedText = replyText.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  let bestMatch = { category: 'NEUTRAL', score: 0, confidence: 'low' }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => normalizedText.includes(kw))
    const score = matches.length

    if (score > bestMatch.score) {
      bestMatch = {
        category,
        score,
        matchedKeywords: matches,
        confidence: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low'
      }
    }
  }

  return {
    category: bestMatch.category,
    categoryInfo: REPLY_CATEGORIES[bestMatch.category],
    confidence: bestMatch.confidence,
    matchedKeywords: bestMatch.matchedKeywords || [],
    sentiment: getSentimentFromCategory(bestMatch.category)
  }
}

/**
 * Classification IA avec Gemini
 */
async function classifyWithAI(replyText, prospect, geminiCall) {
  const prompt = `Tu es un expert en classification de reponses email B2B.

REPONSE A CLASSIFIER:
"${replyText}"

CONTEXTE:
- Prospect : ${prospect.company || 'Entreprise'}
- Email original : Cold email de prospection commerciale

CATEGORIES POSSIBLES:
1. POSITIVE — Interesse, veut un RDV, demande plus d'infos, pose des questions sur l'offre
2. NEGATIVE — Pas interesse, refuse clairement, demande de ne plus contacter
3. OBJECTION — Pose une question/doute mais pas de refus clair (prix, timing, besoin de reflechir)
4. REFERRAL — Renvoie vers quelqu'un d'autre, donne un autre contact
5. OOO — Absent du bureau, message automatique de vacances
6. WRONG_PERSON — Dit que ce n'est pas la bonne personne pour ce sujet
7. UNSUBSCRIBE — Demande explicite de desinscription ou arret des emails
8. NOT_NOW — Interesse mais pas le bon moment, demande de revenir plus tard

ANALYSE REQUISE:
1. Identifie la categorie principale
2. Determine le sentiment (positive, neutral, negative)
3. Si categorie = OBJECTION, identifie le type d'objection
4. Suggere une reponse appropriee (max 50 mots)

Retourne UNIQUEMENT ce JSON:
{
  "category": "POSITIVE|NEGATIVE|OBJECTION|REFERRAL|OOO|WRONG_PERSON|UNSUBSCRIBE|NOT_NOW",
  "sentiment": "positive|neutral|negative",
  "confidence": "high|medium|low",
  "objectionType": "price|timing|competitor|other|null",
  "extractedInfo": {
    "returnDate": "date si OOO",
    "referredContact": "nom/email si REFERRAL",
    "specificQuestion": "question posee si OBJECTION"
  },
  "suggestedReply": "Reponse suggeree...",
  "suggestedAction": "Action recommandee..."
}`

  const response = await geminiCall(prompt)

  try {
    const parsed = safeParseLLMJson(response)
    return {
      category: parsed.category,
      categoryInfo: REPLY_CATEGORIES[parsed.category] || REPLY_CATEGORIES.NEUTRAL,
      sentiment: parsed.sentiment,
      confidence: parsed.confidence,
      objectionType: parsed.objectionType,
      extractedInfo: parsed.extractedInfo || {},
      suggestedReply: parsed.suggestedReply,
      suggestedAction: parsed.suggestedAction
    }
  } catch {
    // Essayer d'extraire le JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = safeParseLLMJson(jsonMatch[0])
        return {
          category: parsed.category || 'NEUTRAL',
          categoryInfo: REPLY_CATEGORIES[parsed.category] || REPLY_CATEGORIES.NEUTRAL,
          sentiment: parsed.sentiment || 'neutral',
          confidence: parsed.confidence || 'low',
          suggestedReply: parsed.suggestedReply || ''
        }
      } catch {}
    }
    throw new Error('Failed to parse AI response')
  }
}

function getSentimentFromCategory(category) {
  const sentimentMap = {
    POSITIVE: 'positive',
    NEGATIVE: 'negative',
    OBJECTION: 'neutral',
    REFERRAL: 'neutral',
    OOO: 'neutral',
    WRONG_PERSON: 'neutral',
    UNSUBSCRIBE: 'negative',
    NOT_NOW: 'neutral',
    NEUTRAL: 'neutral'
  }
  return sentimentMap[category] || 'neutral'
}

function getSuggestedReply(category, prospect) {
  const replies = {
    POSITIVE: `Merci pour votre interet ! Je vous propose un creneaux cette semaine. Quelles sont vos disponibilites ?`,
    NEGATIVE: null, // Pas de reponse
    OBJECTION: `Je comprends votre question. Permettez-moi de vous apporter quelques precisions...`,
    REFERRAL: `Merci pour cette redirection. Je vais contacter [nom] de votre part.`,
    OOO: null, // Replanifier
    WRONG_PERSON: `Merci de me l'indiquer. Pourriez-vous me diriger vers la bonne personne ?`,
    UNSUBSCRIBE: null, // Pas de reponse, juste desinscription
    NOT_NOW: `Pas de souci, je note. Je me permettrai de revenir vers vous dans quelques semaines. Bonne continuation !`,
    NEUTRAL: `Merci pour votre retour. Y a-t-il des informations supplementaires que je puisse vous apporter ?`
  }
  return replies[category]
}

/**
 * Execute les actions automatiques selon la classification
 */
export async function executeReplyActions(classification, prospect, orgId, campaignId) {
  const db = getDb()
  const actions = []

  const category = classification.category
  const categoryInfo = REPLY_CATEGORIES[category]

  // 1. Stopper la sequence si necessaire
  if (categoryInfo.stopSequence) {
    await db.collection(`organizations/${orgId}/campaigns`).doc(campaignId).update({
      status: 'replied',
      stoppedAt: new Date(),
      stoppedReason: `Reponse classifiee: ${categoryInfo.label}`
    })
    actions.push({ action: 'stop_sequence', success: true })
  }

  // 2. Actions specifiques par categorie
  switch (category) {
    case 'POSITIVE':
      // Notifier le client en urgence
      await db.collection(`organizations/${orgId}/notifications`).add({
        type: 'positive_reply',
        prospectId: prospect.id,
        prospectName: prospect.company,
        message: 'Un prospect a repondu positivement !',
        priority: 'high',
        createdAt: new Date(),
        read: false
      })
      actions.push({ action: 'notify_positive', success: true })
      break

    case 'NEGATIVE':
      // Ajouter a la liste de suppression
      await db.collection(`organizations/${orgId}/suppression`).add({
        email: prospect.email,
        prospectId: prospect.id,
        reason: 'negative_reply',
        addedAt: new Date()
      })
      actions.push({ action: 'add_suppression', success: true })
      break

    case 'UNSUBSCRIBE':
      // Ajouter a la blacklist + suppression
      await db.collection(`organizations/${orgId}/suppression`).add({
        email: prospect.email,
        prospectId: prospect.id,
        reason: 'unsubscribe_request',
        addedAt: new Date()
      })
      // Mark prospect as blacklisted
      if (prospect.id) {
        await db.collection(`organizations/${orgId}/prospects`).doc(prospect.id).update({
          crmColumn: 'LOST',
          blacklisted: true,
          blacklistedAt: new Date(),
          blacklistedReason: 'unsubscribe_request',
          updatedAt: new Date(),
        })
      }
      actions.push({ action: 'blacklist_unsubscribe', success: true })
      break

    case 'REFERRAL': {
      // Extraire email/nom du contact refere via IA et creer nouveau prospect
      const referred = classification.extractedInfo?.referredContact
      if (referred) {
        const emailMatch = referred.match(/[\w.-]+@[\w.-]+\.\w+/)
        const newProspect = {
          source: 'referral',
          referredBy: prospect.id,
          referredByName: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim(),
          status: 'new',
          crmColumn: 'NEW',
          createdAt: new Date(),
        }
        if (emailMatch) {
          newProspect.email = emailMatch[0]
        }
        // Extract name if not just an email
        const nameOnly = referred.replace(/[\w.-]+@[\w.-]+\.\w+/g, '').trim()
        if (nameOnly) {
          const parts = nameOnly.split(/\s+/)
          newProspect.firstName = parts[0] || ''
          newProspect.lastName = parts.slice(1).join(' ') || ''
        }
        await db.collection(`organizations/${orgId}/prospects`).add(newProspect)
        actions.push({ action: 'create_referral', success: true, referredContact: referred })
      }
      // Notify tenant
      await db.collection(`organizations/${orgId}/notifications`).add({
        type: 'referral',
        prospectId: prospect.id,
        prospectName: prospect.company,
        message: `Renvoi vers: ${referred || 'contact non extrait'}`,
        priority: 'medium',
        createdAt: new Date(),
        read: false,
      })
      actions.push({ action: 'notify_referral', success: true })
      break
    }

    case 'OOO': {
      // Extraire date de retour et reprogrammer
      const returnDateStr = classification.extractedInfo?.returnDate
      let resumeDate
      if (returnDateStr) {
        resumeDate = new Date(returnDateStr)
        if (isNaN(resumeDate.getTime())) resumeDate = null
      }
      if (!resumeDate) {
        // Default: +7 jours si pas de date extraite
        resumeDate = new Date()
        resumeDate.setDate(resumeDate.getDate() + 7)
      }
      resumeDate.setDate(resumeDate.getDate() + 2) // +2 jours apres retour

      if (campaignId) {
        await db.collection(`organizations/${orgId}/campaigns`).doc(campaignId).update({
          pausedUntil: resumeDate,
          status: 'paused',
          pauseReason: 'Prospect absent - reprise automatique',
        })
      }
      // Schedule followup
      await db.collection(`organizations/${orgId}/scheduledFollowups`).add({
        leadId: prospect.id,
        scheduledDate: resumeDate,
        note: 'Relance post-absence (OOO detecte)',
        status: 'pending',
        createdAt: new Date(),
      })
      actions.push({ action: 'reschedule_ooo', success: true, resumeDate })
      break
    }

    case 'NOT_NOW': {
      // Programmer une relance +30 jours par defaut
      const followupDate = new Date()
      followupDate.setDate(followupDate.getDate() + 30)

      await db.collection(`organizations/${orgId}/scheduledFollowups`).add({
        leadId: prospect.id,
        scheduledDate: followupDate,
        note: 'Relance - prospect interesse mais pas le bon moment',
        status: 'pending',
        createdAt: new Date(),
      })
      // Update prospect CRM
      if (prospect.id) {
        await db.collection(`organizations/${orgId}/prospects`).doc(prospect.id).update({
          crmColumn: 'CONTACTED',
          agentNotes: 'Pas le bon moment - relance programmee +30j',
          updatedAt: new Date(),
        })
      }
      actions.push({ action: 'reschedule_not_now', success: true, followupDate })
      break
    }

    case 'WRONG_PERSON':
      // Stopper sequence + marquer LOST + notifier
      if (prospect.id) {
        await db.collection(`organizations/${orgId}/prospects`).doc(prospect.id).update({
          crmColumn: 'LOST',
          lostReason: 'wrong_person',
          updatedAt: new Date(),
        })
      }
      await db.collection(`organizations/${orgId}/notifications`).add({
        type: 'wrong_person',
        prospectId: prospect.id,
        prospectName: prospect.company,
        message: 'Mauvais contact detecte - sequence arretee',
        priority: 'low',
        createdAt: new Date(),
        read: false,
      })
      actions.push({ action: 'mark_wrong_person', success: true })
      break

    case 'OBJECTION':
      // Suggerer une reponse au client
      await db.collection(`organizations/${orgId}/notifications`).add({
        type: 'objection',
        prospectId: prospect.id,
        prospectName: prospect.company,
        message: `Objection recue: ${classification.objectionType || 'generale'}`,
        suggestedReply: classification.suggestedReply,
        priority: 'medium',
        createdAt: new Date(),
        read: false
      })
      actions.push({ action: 'notify_objection', success: true })
      break
  }

  // 3. Logger la classification
  await db.collection(`organizations/${orgId}/replyLogs`).add({
    prospectId: prospect.id,
    campaignId,
    classification,
    actionsExecuted: actions,
    createdAt: new Date()
  })

  return {
    category,
    categoryInfo,
    actionsExecuted: actions
  }
}

/**
 * Stats de classification pour analytics
 */
export async function getReplyClassificationStats(orgId) {
  const db = getDb()
  const logsSnap = await db.collection(`organizations/${orgId}/replyLogs`)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get()

  const stats = {
    total: logsSnap.size,
    byCategory: {},
    bySentiment: { positive: 0, neutral: 0, negative: 0 },
    positiveRate: 0,
    objectionTypes: {}
  }

  // Initialiser les categories
  Object.keys(REPLY_CATEGORIES).forEach(cat => {
    stats.byCategory[cat] = 0
  })

  logsSnap.docs.forEach(doc => {
    const data = doc.data()
    const cat = data.classification?.category || 'NEUTRAL'
    const sentiment = data.classification?.sentiment || 'neutral'

    stats.byCategory[cat]++
    stats.bySentiment[sentiment]++

    if (data.classification?.objectionType) {
      stats.objectionTypes[data.classification.objectionType] =
        (stats.objectionTypes[data.classification.objectionType] || 0) + 1
    }
  })

  stats.positiveRate = stats.total > 0
    ? Math.round((stats.byCategory.POSITIVE / stats.total) * 100)
    : 0

  return stats
}
