/**
 * Sequences Particuliers (B2C) — Intent Hunter
 *
 * Sequences plus courtes et moins agressives qu'en B2B.
 * Maximum 5 jours, maximum 4 touchpoints pour ULTRA HOT.
 * Messages generes via voisinBienveillant.js obligatoire.
 *
 * REGLES SPECIALES B2C :
 *   - JAMAIS plus de 2 relances
 *   - Si "c'est bon j'ai trouve" → arret immediat + felicitations
 *   - Si annonce Leboncoin supprimee → besoin resolu → supprimer
 *   - Si REPLIED_POSITIVELY → HITL : transmettre coordonnees client
 *   - Si REPLIED_NEGATIVELY → stopper + blacklist 180 jours
 *   - Jamais de retargeting pub en B2C
 */

// ============================================
// SEQUENCE DEFINITIONS
// ============================================

export const SEQUENCES_PARTICULIERS = {
  ultra_hot: {
    priority: 'ultra_hot',
    scoreRange: [80, 100],
    maxDays: 5,
    maxTouchpoints: 4,
    steps: [
      {
        step: 1,
        day: 0,
        delayMinutes: 0,
        channel: 'native',
        type: 'public_reply',
        description: 'Reponse publique "voisin bienveillant" sous le post',
        useVoisinBienveillant: true
      },
      {
        step: 2,
        day: 0,
        delayMinutes: 60, // 30min a 2h apres le public (jitter ajoute au runtime)
        channel: 'dm',
        type: 'private_message',
        description: 'DM prive ou WhatsApp si disponible',
        condition: 'no_response_to_step_1',
        useVoisinBienveillant: true
      },
      {
        step: 3,
        day: 1,
        channel: 'voice',
        type: 'alex_voice',
        description: 'Alex Voice si numero dispo + plan Business (60s max)',
        condition: 'phone_available && plan_business',
        useVoisinBienveillant: false // script voice separe
      },
      {
        step: 4,
        day: 5,
        channel: 'native',
        type: 'followup',
        description: 'Derniere relance : "Votre probleme a-t-il ete resolu ?"',
        useVoisinBienveillant: true,
        isFinalStep: true
      }
    ]
  },

  hot: {
    priority: 'hot',
    scoreRange: [60, 79],
    maxDays: 3,
    maxTouchpoints: 3,
    steps: [
      {
        step: 1,
        day: 0,
        channel: 'native',
        type: 'public_reply',
        description: 'Reponse publique',
        useVoisinBienveillant: true
      },
      {
        step: 2,
        day: 1,
        channel: 'dm',
        type: 'private_message',
        description: 'DM prive ou WhatsApp',
        useVoisinBienveillant: true
      },
      {
        step: 3,
        day: 3,
        channel: 'native',
        type: 'followup',
        description: 'Relance courte (unique)',
        useVoisinBienveillant: true,
        isFinalStep: true
      }
    ]
  },

  warm: {
    priority: 'warm',
    scoreRange: [40, 59],
    maxDays: 2,
    maxTouchpoints: 2,
    steps: [
      {
        step: 1,
        day: 0,
        channel: 'native',
        type: 'simple_message',
        description: 'Message simple',
        useVoisinBienveillant: true
      },
      {
        step: 2,
        day: 2,
        channel: 'native',
        type: 'followup',
        description: 'Une seule relance',
        useVoisinBienveillant: true,
        isFinalStep: true
      }
    ]
  },

  cold: {
    priority: 'cold',
    scoreRange: [0, 39],
    maxDays: 0,
    maxTouchpoints: 0,
    steps: [],
    action: 'archive_and_monitor'
  }
}

// ============================================
// SEQUENCE RESOLUTION
// ============================================

/**
 * Retourne la definition de sequence pour un lead selon sa priorite
 * @param {string} priority - 'ultra_hot' | 'hot' | 'warm' | 'cold'
 * @returns {Object} Sequence definition
 */
export function getSequenceForPriority(priority) {
  return SEQUENCES_PARTICULIERS[priority] || SEQUENCES_PARTICULIERS.cold
}

/**
 * Retourne l'etape suivante de la sequence pour un lead
 * @param {Object} lead - Lead avec sequenceStep actuel
 * @returns {Object|null} Prochaine etape ou null si sequence terminee
 */
export function getNextStep(lead) {
  const sequence = getSequenceForPriority(lead.priority)
  const currentStep = lead.sequenceStep || 0
  const nextStep = sequence.steps.find(s => s.step === currentStep + 1)
  return nextStep || null
}

/**
 * Verifie si la sequence est terminee pour un lead
 * @param {Object} lead
 * @returns {boolean}
 */
export function isSequenceComplete(lead) {
  const sequence = getSequenceForPriority(lead.priority)
  return (lead.sequenceStep || 0) >= sequence.maxTouchpoints
}

// ============================================
// STOP SIGNALS B2C
// ============================================

/**
 * Detecte si le message du particulier indique que le besoin est resolu
 * @param {string} message - Reponse du particulier
 * @returns {boolean}
 */
export function isNeedResolved(message) {
  if (!message) return false
  const text = message.toLowerCase()

  const resolvedSignals = [
    'c\'est bon', 'c bon', 'j\'ai trouve', 'j ai trouve',
    'merci ca marche', 'ca marche', 'c\'est fait', 'c fait',
    'on a trouve', 'deja trouve', 'plus besoin', 'pas besoin',
    'c\'est regle', 'c regle', 'probleme resolu', 'resolu',
    'quelqu\'un est venu', 'on a fait appel', 'j\'ai fait appel',
    'merci beaucoup', 'top merci', 'parfait merci'
  ]

  return resolvedSignals.some(signal => text.includes(signal))
}

/**
 * Determine l'action a prendre apres une reponse B2C
 * @param {string} responseType - 'positive' | 'negative' | 'neutral' | 'resolved'
 * @returns {{ action: string, blacklistDays: number }}
 */
export function getResponseAction(responseType) {
  const actions = {
    positive: { action: 'hitl_transfer_coordinates', blacklistDays: 0 },
    negative: { action: 'stop_and_blacklist', blacklistDays: 180 },
    neutral: { action: 'continue_sequence', blacklistDays: 0 },
    resolved: { action: 'stop_and_congratulate', blacklistDays: 90 }
  }

  return actions[responseType] || actions.neutral
}
