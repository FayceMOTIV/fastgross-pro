/**
 * Intent Hunter Pro — Sequences B2B
 *
 * Definitions des sequences de contact selon la priorite du lead.
 * Chaque priorite (ultra_hot, hot, warm, cold) a sa propre sequence
 * avec un nombre de touchpoints et une duree adaptes.
 *
 * ultra_hot : 14 jours, 7 touchpoints — approche agressive multicanale
 * hot       : 10 jours, 5 touchpoints — approche soutenue
 * warm      :  7 jours, 3 touchpoints — approche douce
 * cold      : archive — pas de sequence active
 */

// ============================================
// SEQUENCES DEFINITIONS
// ============================================

/**
 * @typedef {Object} SequenceStep
 * @property {number} day - Jour de la sequence (0 = jour de detection)
 * @property {string} channel - Canal de contact ('native', 'email', 'linkedin', 'sms', 'whatsapp', 'voicemail', 'phone')
 * @property {string} type - Type de message
 * @property {string} description - Description de l'action
 * @property {boolean} [requiresPlan] - Necessite un plan specifique (Business)
 * @property {boolean} [conditional] - Etape conditionnelle (seulement si pas de reponse)
 */

/**
 * @typedef {Object} SequenceDefinition
 * @property {number} maxDays - Duree maximale de la sequence
 * @property {number} touchpoints - Nombre de touchpoints
 * @property {string} escalation - Sequence suivante si pas de reponse
 * @property {SequenceStep[]} steps - Etapes de la sequence
 */

/**
 * Sequences B2B par priorite
 * @type {Record<'ultra_hot'|'hot'|'warm'|'cold', SequenceDefinition>}
 */
export const SEQUENCES_PRO = {
  ultra_hot: {
    maxDays: 14,
    touchpoints: 7,
    escalation: null,
    steps: [
      {
        day: 0,
        channel: 'native',
        type: 'contextual_message',
        description: 'Message canal natif contextualise — reference au signal detecte'
      },
      {
        day: 1,
        channel: 'email',
        type: 'personalized_email',
        description: 'Email personnalise + video Loom si plan Business',
        requiresPlan: false
      },
      {
        day: 3,
        channel: 'linkedin',
        type: 'linkedin_connect',
        description: 'Demande de connexion LinkedIn avec note personnalisee'
      },
      {
        day: 5,
        channel: 'email',
        type: 'value_email',
        description: 'Email de valeur — etude de cas ou ressource pertinente',
        conditional: true
      },
      {
        day: 7,
        channel: 'sms',
        type: 'sms_followup',
        description: 'SMS court de relance — question ouverte'
      },
      {
        day: 10,
        channel: 'voicemail',
        type: 'voicemail_drop',
        description: 'Voicemail drop personnalise — proposition de creneau',
        requiresPlan: true
      },
      {
        day: 14,
        channel: 'email',
        type: 'breakup_email',
        description: 'Email de rupture — derniere chance, ton decontracte',
        conditional: true
      }
    ]
  },

  hot: {
    maxDays: 10,
    touchpoints: 5,
    escalation: 'warm',
    steps: [
      {
        day: 0,
        channel: 'native',
        type: 'contextual_message',
        description: 'Message canal natif contextualise — reference au signal'
      },
      {
        day: 2,
        channel: 'email',
        type: 'personalized_email',
        description: 'Email personnalise avec proposition de valeur'
      },
      {
        day: 4,
        channel: 'linkedin',
        type: 'linkedin_connect',
        description: 'Connexion LinkedIn si non connecte',
        conditional: true
      },
      {
        day: 7,
        channel: 'email',
        type: 'value_email',
        description: 'Email de relance avec contenu a valeur ajoutee',
        conditional: true
      },
      {
        day: 10,
        channel: 'email',
        type: 'breakup_email',
        description: 'Email de cloture — question directe oui/non',
        conditional: true
      }
    ]
  },

  warm: {
    maxDays: 7,
    touchpoints: 3,
    escalation: 'cold',
    steps: [
      {
        day: 0,
        channel: 'native',
        type: 'contextual_message',
        description: 'Message canal natif — approche douce, question ouverte'
      },
      {
        day: 3,
        channel: 'email',
        type: 'personalized_email',
        description: 'Email informatif — pas de pression, valeur pure',
        conditional: true
      },
      {
        day: 7,
        channel: 'email',
        type: 'nurture_email',
        description: 'Email nurturing — ressource gratuite ou invitation event',
        conditional: true
      }
    ]
  },

  cold: {
    maxDays: 0,
    touchpoints: 0,
    escalation: null,
    steps: []
  }
}

// ============================================
// SEQUENCE STEP RESOLVER
// ============================================

/**
 * Retourne l'etape courante de la sequence pour un lead donne.
 *
 * @param {Object} lead - Lead avec son historique de contact
 * @param {string} lead.priority - Priorite du lead ('ultra_hot'|'hot'|'warm'|'cold')
 * @param {Date|number} lead.detectedAt - Date de detection du lead
 * @param {number} [lead.touchpointCount] - Nombre de touchpoints deja effectues
 * @param {boolean} [lead.hasReplied] - Le lead a-t-il deja repondu
 * @returns {{ step: SequenceStep|null, stepIndex: number, sequenceComplete: boolean, daysInSequence: number }}
 */
export function getCurrentStep(lead) {
  const priority = lead.priority || 'cold'
  const sequence = SEQUENCES_PRO[priority]

  if (!sequence || sequence.steps.length === 0) {
    return { step: null, stepIndex: -1, sequenceComplete: true, daysInSequence: 0 }
  }

  // Si le lead a deja repondu, la sequence est terminee
  if (lead.hasReplied) {
    return { step: null, stepIndex: -1, sequenceComplete: true, daysInSequence: 0 }
  }

  const detectedAt = lead.detectedAt instanceof Date
    ? lead.detectedAt.getTime()
    : (typeof lead.detectedAt === 'number' ? lead.detectedAt : Date.now())

  const daysInSequence = Math.floor((Date.now() - detectedAt) / 86_400_000)
  const touchpointCount = lead.touchpointCount || 0

  // Trouver la prochaine etape non executee
  for (let i = touchpointCount; i < sequence.steps.length; i++) {
    const step = sequence.steps[i]
    if (daysInSequence >= step.day) {
      return { step, stepIndex: i, sequenceComplete: false, daysInSequence }
    }
  }

  // Sequence en cours mais pas encore le jour de la prochaine etape
  if (touchpointCount < sequence.steps.length) {
    return {
      step: null,
      stepIndex: touchpointCount,
      sequenceComplete: false,
      daysInSequence
    }
  }

  // Toutes les etapes executees
  return { step: null, stepIndex: sequence.steps.length, sequenceComplete: true, daysInSequence }
}

/**
 * Retourne toutes les etapes restantes de la sequence pour un lead.
 *
 * @param {Object} lead
 * @returns {SequenceStep[]}
 */
export function getRemainingSteps(lead) {
  const priority = lead.priority || 'cold'
  const sequence = SEQUENCES_PRO[priority]

  if (!sequence || lead.hasReplied) return []

  const touchpointCount = lead.touchpointCount || 0
  return sequence.steps.slice(touchpointCount)
}

/**
 * Verifie si une etape de la sequence est applicable
 * (plan requis, canal disponible, conditions remplies).
 *
 * @param {SequenceStep} step - Etape a verifier
 * @param {Object} lead - Lead cible
 * @param {Object} clientConfig - Config client FMF
 * @param {string} [clientConfig.plan] - Plan du client ('starter'|'pro'|'business'|'enterprise')
 * @returns {{ applicable: boolean, reason: string|null }}
 */
export function isStepApplicable(step, lead, clientConfig) {
  if (!step) return { applicable: false, reason: 'no_step' }

  // Verifier plan requis
  if (step.requiresPlan) {
    const planLevel = { starter: 0, pro: 1, business: 2, enterprise: 3 }
    const clientLevel = planLevel[clientConfig.plan] ?? 0
    if (clientLevel < 2) {
      return { applicable: false, reason: 'plan_required_business' }
    }
  }

  // Verifier condition (seulement si pas de reponse)
  if (step.conditional && lead.hasReplied) {
    return { applicable: false, reason: 'lead_already_replied' }
  }

  return { applicable: true, reason: null }
}

/**
 * Retourne un resume de la sequence pour un lead (dashboard / monitoring)
 *
 * @param {Object} lead
 * @returns {{ priority: string, totalSteps: number, completedSteps: number, daysRemaining: number, nextStepDay: number|null }}
 */
export function getSequenceSummary(lead) {
  const priority = lead.priority || 'cold'
  const sequence = SEQUENCES_PRO[priority]

  if (!sequence || sequence.steps.length === 0) {
    return { priority, totalSteps: 0, completedSteps: 0, daysRemaining: 0, nextStepDay: null }
  }

  const touchpointCount = lead.touchpointCount || 0
  const detectedAt = lead.detectedAt instanceof Date
    ? lead.detectedAt.getTime()
    : (typeof lead.detectedAt === 'number' ? lead.detectedAt : Date.now())

  const daysInSequence = Math.floor((Date.now() - detectedAt) / 86_400_000)
  const daysRemaining = Math.max(0, sequence.maxDays - daysInSequence)

  const nextStep = sequence.steps[touchpointCount]
  const nextStepDay = nextStep ? nextStep.day : null

  return {
    priority,
    totalSteps: sequence.steps.length,
    completedSteps: touchpointCount,
    daysRemaining,
    nextStepDay
  }
}
