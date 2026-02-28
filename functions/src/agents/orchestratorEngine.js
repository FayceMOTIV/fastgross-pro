/**
 * Orchestrator Engine — Logique Comportementale Multi-Canal
 * Décide la prochaine action selon l'engagement du prospect
 * +287% de réponses vs envoi linéaire (données 2025)
 */

const DAY = 24 * 60 * 60 * 1000; // 1 jour en ms

/**
 * Calcule le nombre de jours depuis qu'un prospect a été ajouté à la séquence
 */
function daysSinceStart(prospect) {
  const start = prospect.engagement?.sequenceStartAt || prospect.createdAt;
  if (!start) return 0;
  const startDate = start instanceof Date ? start : new Date(start);
  return Math.floor((Date.now() - startDate.getTime()) / DAY);
}

/**
 * Vérifie si une action a déjà été faite
 */
function hasEngagement(prospect, field) {
  return !!prospect.engagement?.[field];
}

/**
 * Vérifie si l'email initial a été envoyé
 */
function emailSentAt(prospect) {
  return !!prospect.engagement?.emailSentAt;
}

/**
 * Décide la prochaine action pour un prospect
 * @returns {object|null} { action, channel, delay } ou null si rien à faire
 */
export async function getNextAction(prospect) {
  const {
    emailOpenedAt,
    emailClickedAt,
    emailRepliedAt,
    linkedinVisitedAt,
    linkedinConnectSentAt,
    linkedinConnectedAt,
    linkedinMessagedAt,
    whatsappSentAt,
    whatsappReadAt,
    whatsappRepliedAt,
    instagramDMedAt,
    instagramRepliedAt,
    socialInteractions, // engagement Typefully
    touchpoints = 0,
  } = prospect.engagement || {};

  const days = daysSinceStart(prospect);

  // ─── RÈGLES DE SORTIE ────────────────────────────────────────────

  // 1. Réponse reçue → handoff humain URGENT
  if (whatsappRepliedAt || emailRepliedAt || instagramRepliedAt) {
    return null; // L'humain prend le relais, plus d'automation
  }

  // 2. Prospect chaud via Typefully (engagement récent < 24h)
  const recentSocialEngagement = socialInteractions?.some(i => {
    const age = Date.now() - new Date(i.at).getTime();
    return age < 24 * 60 * 60 * 1000;
  });

  if (recentSocialEngagement && !whatsappSentAt) {
    // Envoyer WA dans 2h (prospect vient d'engager avec le contenu)
    return {
      action: 'sendDM',
      channel: 'whatsapp',
      delay: 2 * 60 * 60 * 1000, // 2h delay
      reason: 'social_engagement_trigger',
    };
  }

  // ─── SÉQUENCE COMPORTEMENTALE ────────────────────────────────────

  // Jour 1 — Email initial
  if (days === 0 && !emailSentAt(prospect)) {
    return { action: 'sendEmail', channel: 'email', delay: 0, reason: 'day1_initial_email' };
  }

  // Jour 2 — LinkedIn : visite profil (notification de présence)
  if (days >= 2 && !linkedinVisitedAt) {
    return { action: 'visitProfile', channel: 'linkedin', delay: 0, reason: 'day2_linkedin_visit' };
  }

  // Jour 3 — LinkedIn : demande connexion avec note
  if (days >= 3 && linkedinVisitedAt && !linkedinConnectSentAt) {
    return { action: 'sendConnectionRequest', channel: 'linkedin', delay: 0, reason: 'day3_connect' };
  }

  // Jour 5 — Branching selon ouverture email
  if (days >= 5) {
    if (emailOpenedAt && !whatsappSentAt) {
      // Email ouvert → WhatsApp contextualisé
      return { action: 'sendDM', channel: 'whatsapp', delay: 0, reason: 'day5_email_opened_wa' };
    }
    if (!emailOpenedAt && touchpoints < 3) {
      // Email pas ouvert → relance email angle différent
      return { action: 'sendFollowUp', channel: 'email', delay: 0, reason: 'day5_no_open_followup' };
    }
  }

  // Jour 7 — LinkedIn message si connexion acceptée
  if (days >= 7) {
    if (linkedinConnectedAt && !linkedinMessagedAt) {
      return { action: 'sendMessage', channel: 'linkedin', delay: 0, reason: 'day7_li_message' };
    }
    if (!linkedinConnectedAt && touchpoints < 4) {
      // Pas accepté → Instagram warmup (follow)
      if (prospect.instagram && !hasEngagement(prospect, 'instagramFollowedAt')) {
        return { action: 'warmup_follow', channel: 'instagram', delay: 0, reason: 'day7_ig_warmup' };
      }
    }
  }

  // Jour 8 — Instagram : liker des posts (si warmup follow fait)
  if (days >= 8 && hasEngagement(prospect, 'instagramFollowedAt') && !hasEngagement(prospect, 'instagramLikedAt')) {
    return { action: 'warmup_likes', channel: 'instagram', delay: 0, reason: 'day8_ig_likes' };
  }

  // Jour 9 — Instagram DM (après warmup)
  if (days >= 9 && hasEngagement(prospect, 'instagramLikedAt') && !instagramDMedAt) {
    return { action: 'sendDM', channel: 'instagram', delay: 0, reason: 'day9_ig_dm' };
  }

  // Jour 10 — WhatsApp final ou breakup
  if (days >= 10 && !whatsappSentAt) {
    return { action: 'sendDM', channel: 'whatsapp', delay: 0, reason: 'day10_wa_final' };
  }

  if (days >= 10 && whatsappSentAt && !whatsappReadAt) {
    // WA envoyé mais pas lu → breakup email
    return { action: 'sendFollowUp', channel: 'email', delay: 0, reason: 'day10_breakup_email', followUpType: 'breakup' };
  }

  // Jour 14 — Breakup email final
  if (days >= 14 && touchpoints >= 5) {
    return { action: 'sendFollowUp', channel: 'email', delay: 0, reason: 'day14_final_breakup', followUpType: 'final_breakup' };
  }

  // Séquence terminée
  if (days > 14) {
    return null; // Marquer prospect comme "sequence_done"
  }

  return null; // Rien à faire pour le moment
}

/**
 * Marque le démarrage de séquence pour un nouveau prospect
 */
export function initSequence(prospect) {
  return {
    sequenceStartAt: new Date().toISOString(),
    activeChannel: 'email',
    touchpoints: 0,
    status: 'in_sequence',
  };
}
