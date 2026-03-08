/**
 * Intent Hunter Pro — Contact Channels Matrix B2B
 *
 * Matrice de contact pour les 26 sources B2B.
 * Chaque source a un canal primaire (natif) et un fallback.
 *
 * Le canal primaire est toujours le canal natif de la plateforme
 * pour maximiser le contexte et la pertinence du premier contact.
 *
 * Le fallback est utilise si le canal primaire est indisponible
 * (pas de DM ouverts, pas d'email, etc.).
 */

// ============================================
// B2B CONTACT MATRIX — 26 sources
// ============================================

/**
 * @type {Record<string, { primary: string, fallback: string }>}
 */
export const B2B_CONTACT_MATRIX = {
  // === Group A — Social / Communities ===
  reddit: { primary: 'reddit_public_reply', fallback: 'reddit_dm' },
  linkedin: { primary: 'heyreach_sequence', fallback: 'email_waterfall' },
  twitter: { primary: 'twitter_reply', fallback: 'twitter_dm' },
  discord: { primary: 'discord_public_reply', fallback: 'discord_dm' },
  slack: { primary: 'slack_public_reply', fallback: 'slack_dm' },
  telegram: { primary: 'telegram_group_reply', fallback: 'telegram_dm' },
  facebook_pro: { primary: 'facebook_comment', fallback: 'facebook_dm' },
  instagram_b2b: { primary: 'instagram_comment', fallback: 'instagram_dm' },
  quora: { primary: 'quora_answer', fallback: 'email_waterfall' },
  hacker_news: { primary: 'hn_comment', fallback: 'email_waterfall' },
  product_hunt: { primary: 'ph_comment', fallback: 'email_waterfall' },

  // === Group B — Business Events ===
  bodacc: { primary: 'email_waterfall', fallback: 'postal' },
  boamp: { primary: 'email_waterfall', fallback: 'postal' },
  offres_emploi: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  crunchbase: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  avis_concurrent: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  trustpilot_g2: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  glassdoor: { primary: 'email_waterfall', fallback: 'linkedin_connect' },

  // === Group C — Mission Platforms ===
  malt: { primary: 'malt_message', fallback: 'email_waterfall' },
  upwork: { primary: 'upwork_proposal', fallback: 'email_waterfall' },

  // === Group D — Events / Behavior ===
  eventbrite_meetup: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  google_news: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  linkedin_events: { primary: 'heyreach_sequence', fallback: 'email_waterfall' },
  indie_hackers: { primary: 'ih_comment', fallback: 'email_waterfall' },
  pixel_visiteur: { primary: 'email_waterfall', fallback: 'linkedin_connect' },
  boamp_historique: { primary: 'email_waterfall', fallback: 'postal' }
}

// ============================================
// CHANNEL CAPABILITIES — quels canaux exigent quoi
// ============================================

/**
 * Champs requis sur le lead pour chaque type de canal
 * @type {Record<string, string[]>}
 */
const CHANNEL_REQUIREMENTS = {
  email_waterfall: ['email'],
  heyreach_sequence: ['linkedinUrl'],
  linkedin_connect: ['linkedinUrl'],
  postal: ['address'],
  reddit_dm: ['redditUsername'],
  reddit_public_reply: ['redditPostUrl'],
  twitter_reply: ['tweetUrl'],
  twitter_dm: ['twitterUsername'],
  discord_public_reply: ['discordChannelId'],
  discord_dm: ['discordUserId'],
  slack_public_reply: ['slackChannelId'],
  slack_dm: ['slackUserId'],
  telegram_group_reply: ['telegramGroupId'],
  telegram_dm: ['telegramUserId'],
  facebook_comment: ['facebookPostUrl'],
  facebook_dm: ['facebookUserId'],
  instagram_comment: ['instagramPostUrl'],
  instagram_dm: ['instagramUsername'],
  quora_answer: ['quoraQuestionUrl'],
  hn_comment: ['hnItemId'],
  ph_comment: ['productHuntPostUrl'],
  ih_comment: ['indieHackersPostUrl'],
  malt_message: ['maltProfileUrl'],
  upwork_proposal: ['upworkJobUrl']
}

// ============================================
// CHANNEL SELECTION
// ============================================

/**
 * Determine le meilleur canal de contact pour un lead selon sa source.
 *
 * Logique :
 *   1. Verifier si le canal primaire est utilisable (champs requis presents)
 *   2. Sinon, utiliser le fallback
 *   3. Si aucun canal n'est utilisable, retourner null
 *
 * @param {string} sourceId - ID de la source (ex: 'reddit', 'linkedin')
 * @param {Object} lead - Lead avec ses champs de contact
 * @returns {{ channel: string, type: 'primary'|'fallback' } | null}
 */
export function getContactChannel(sourceId, lead) {
  const matrix = B2B_CONTACT_MATRIX[sourceId]
  if (!matrix) {
    console.log(JSON.stringify({
      function: 'contactChannelsPro.getContactChannel',
      step: 'unknown_source',
      sourceId
    }))
    return null
  }

  // Verifier canal primaire
  if (isChannelAvailable(matrix.primary, lead)) {
    return { channel: matrix.primary, type: 'primary' }
  }

  // Verifier fallback
  if (isChannelAvailable(matrix.fallback, lead)) {
    console.log(JSON.stringify({
      function: 'contactChannelsPro.getContactChannel',
      step: 'fallback_used',
      sourceId,
      primary: matrix.primary,
      fallback: matrix.fallback
    }))
    return { channel: matrix.fallback, type: 'fallback' }
  }

  // Aucun canal disponible
  console.log(JSON.stringify({
    function: 'contactChannelsPro.getContactChannel',
    step: 'no_channel_available',
    sourceId,
    primary: matrix.primary,
    fallback: matrix.fallback,
    leadHasEmail: Boolean(lead.email),
    leadHasLinkedin: Boolean(lead.linkedinUrl)
  }))

  return null
}

/**
 * Verifie si un canal est utilisable pour un lead donne
 * @param {string} channel - Nom du canal
 * @param {Object} lead - Lead avec ses champs de contact
 * @returns {boolean}
 */
function isChannelAvailable(channel, lead) {
  const requirements = CHANNEL_REQUIREMENTS[channel]

  // Si aucune exigence definie, considerer disponible
  if (!requirements) return true

  // Verifier que tous les champs requis sont presents et non vides
  return requirements.every(field => {
    const value = lead[field]
    return value !== undefined && value !== null && value !== ''
  })
}

/**
 * Retourne tous les canaux disponibles pour un lead (primaire + fallback + extras)
 * @param {string} sourceId - ID de la source
 * @param {Object} lead - Lead avec ses champs de contact
 * @returns {string[]} Liste des canaux disponibles, tries par priorite
 */
export function getAllAvailableChannels(sourceId, lead) {
  const matrix = B2B_CONTACT_MATRIX[sourceId]
  if (!matrix) return []

  const available = []

  if (isChannelAvailable(matrix.primary, lead)) {
    available.push(matrix.primary)
  }

  if (isChannelAvailable(matrix.fallback, lead)) {
    available.push(matrix.fallback)
  }

  // Canaux universels supplementaires
  if (lead.email && !available.includes('email_waterfall')) {
    available.push('email_waterfall')
  }
  if (lead.linkedinUrl && !available.includes('linkedin_connect') && !available.includes('heyreach_sequence')) {
    available.push('linkedin_connect')
  }
  if (lead.phone) {
    available.push('sms')
  }

  return available
}
