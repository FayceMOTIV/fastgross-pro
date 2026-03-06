/**
 * psychSequenceEngine — Moteur de sequences psychologiques multi-canal
 * J1 curiosite, J3 valeur, J7 preuve sociale, J10 urgence, J14 rupture
 */

import { logger } from 'firebase-functions/v2'

// Techniques psychologiques par etape
export const PSYCH_TECHNIQUES = {
  curiosity: {
    name: 'Curiosite',
    day: 1,
    description: 'Question intrigante qui cree le desir d\'en savoir plus',
    promptInstruction: `Technique: CURIOSITE. Pose une question intrigante sur leur business. Ne vends rien. Cree un gap d'information. Ex: "J'ai remarque quelque chose d'interessant sur [entreprise]... est-ce que vous gerez [probleme] en interne?" Maximum 2 phrases.`,
    channels: ['email', 'linkedin'],
  },
  value: {
    name: 'Valeur',
    day: 3,
    description: 'Insight gratuit qui demontre expertise sans rien demander',
    promptInstruction: `Technique: VALEUR GRATUITE. Offre un insight concret sur leur secteur qu'ils ne connaissent probablement pas. Partage une stat, un benchmark, ou un conseil actionnable. Pas de CTA commercial. Principe Cialdini: reciprocite. Ex: "J'ai analyse votre secteur — 67% des entreprises comme la votre perdent X par mois a cause de Y. Voici comment les meilleures font..."`,
    channels: ['email', 'whatsapp'],
  },
  social_proof: {
    name: 'Preuve sociale',
    day: 7,
    description: 'Cas client similaire avec resultats concrets',
    promptInstruction: `Technique: PREUVE SOCIALE. Mentionne un cas client concret dans leur secteur ou leur ville avec des resultats chiffres. Ex: "Un [type entreprise] a [ville] est passe de X a Y en Z mois avec notre approche." Propose une courte demo. Principe Cialdini: preuve sociale + autorite.`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  urgency: {
    name: 'Urgence',
    day: 10,
    description: 'Limitation reelle qui cree le besoin d\'agir',
    promptInstruction: `Technique: URGENCE REELLE. Cree une urgence authentique — limite de places, exclusivite geographique, offre limitee dans le temps. Ex: "On ne prend que 3 entreprises par secteur/ville pour garantir l'exclusivite. Il reste 1 place sur [ville]." Ne mens jamais sur l'urgence. Principe Cialdini: rarete.`,
    channels: ['whatsapp', 'sms', 'email'],
  },
  rupture: {
    name: 'Rupture',
    day: 14,
    description: 'Message de cloture qui inverse la dynamique',
    promptInstruction: `Technique: RUPTURE. C'est le dernier message. Sois direct et humain. Ex: "Je vais etre honnete — je referme votre dossier. Si le timing n'est pas bon, aucun souci. Mais si c'est un oui ou un peut-etre, c'est maintenant." Pas de negativite, juste de la clarte. Si pas de reponse apres ca, on arrete.`,
    channels: ['email', 'whatsapp'],
  },
}

// Sequence par defaut
export const DEFAULT_PSYCH_SEQUENCE = [
  { step: 1, day: 1, technique: 'curiosity', channel: 'email' },
  { step: 2, day: 3, technique: 'value', channel: 'email' },
  { step: 3, day: 5, technique: 'value', channel: 'whatsapp' },
  { step: 4, day: 7, technique: 'social_proof', channel: 'email' },
  { step: 5, day: 10, technique: 'urgency', channel: 'sms' },
  { step: 6, day: 14, technique: 'rupture', channel: 'email' },
]

/**
 * Determine l'etape actuelle du prospect dans la sequence psychologique
 */
export function getCurrentPsychStep(prospect) {
  const sequenceStep = prospect.sequenceStep || 0
  const sequence = prospect.psychSequence || DEFAULT_PSYCH_SEQUENCE

  if (sequenceStep >= sequence.length) {
    return { completed: true, step: null, technique: null }
  }

  const currentStep = sequence[sequenceStep]
  const technique = PSYCH_TECHNIQUES[currentStep.technique]

  return {
    completed: false,
    stepIndex: sequenceStep,
    step: currentStep,
    technique,
    day: currentStep.day,
    channel: currentStep.channel,
  }
}

/**
 * Genere le prompt IA pour l'etape psychologique courante
 */
export function buildPsychPrompt({ prospect, technique, channel, orgData }) {
  if (!technique) return null

  const orgName = orgData?.name || 'notre entreprise'
  const services = orgData?.services || 'services de prospection digitale'

  return `Tu es Alex, commercial IA de ${orgName} (${services}).

PROSPECT:
- Nom: ${prospect.name || prospect.firstName || 'Inconnu'}
- Entreprise: ${prospect.company || 'inconnue'}
- Secteur: ${prospect.industry || 'non specifie'}
- Ville: ${prospect.city || prospect.address || 'non specifiee'}

CANAL: ${channel}

STRATEGIE A APPLIQUER:
${technique.promptInstruction}

REGLES:
- Reponds en francais
- Message court (max 3 phrases pour WhatsApp/SMS, max 5 pour email)
- Personnalise avec le nom et l'entreprise
- Pas de formule type "En tant qu'IA"
- Finis par UNE question ou UN CTA (pas les deux)`
}

/**
 * Determine si le prospect doit passer a l'etape suivante
 * Basé sur le temps écoulé depuis le premier contact
 */
export function shouldAdvanceStep(prospect) {
  const firstContactDate = prospect.firstContactedAt?.toDate?.() || prospect.firstContactedAt
  if (!firstContactDate) return false

  const now = new Date()
  const daysSinceFirstContact = Math.floor((now - new Date(firstContactDate)) / (1000 * 60 * 60 * 24))

  const psych = getCurrentPsychStep(prospect)
  if (psych.completed) return false

  return daysSinceFirstContact >= psych.day
}

/**
 * Selectionne le canal adaptatif selon les performances passees
 * Si email pas ouvert → switch WhatsApp a l'etape suivante
 */
export function selectAdaptiveChannel(prospect, step) {
  const defaultChannel = step.channel

  // Si l'email precedent n'a pas ete ouvert, switcher vers WhatsApp
  if (defaultChannel === 'email' && prospect.lastEmailOpened === false && prospect.phone) {
    logger.info(`Adaptive channel switch: email → whatsapp for ${prospect.name || prospect.id}`)
    return 'whatsapp'
  }

  // Si WhatsApp pas de reponse apres 2 tentatives, switcher vers SMS
  if (defaultChannel === 'whatsapp' && (prospect.whatsappAttempts || 0) >= 2 && prospect.phone) {
    return 'sms'
  }

  return defaultChannel
}

/**
 * Avance le prospect a l'etape suivante
 * Retourne les champs a mettre a jour dans Firestore
 */
export function advanceProspectStep(prospect) {
  const currentStep = prospect.sequenceStep || 0
  const sequence = prospect.psychSequence || DEFAULT_PSYCH_SEQUENCE

  if (currentStep >= sequence.length - 1) {
    return {
      sequenceStep: currentStep + 1,
      sequenceCompleted: true,
      sequenceCompletedAt: new Date(),
    }
  }

  return {
    sequenceStep: currentStep + 1,
  }
}
