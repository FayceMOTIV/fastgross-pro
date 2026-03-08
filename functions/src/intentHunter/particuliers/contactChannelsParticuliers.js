/**
 * Contact Channels Particuliers (B2C) — Intent Hunter
 *
 * Matrice de contact pour chaque source B2C.
 * Canal primaire + fallback pour chaque plateforme.
 */

export const B2C_CONTACT_MATRIX = {
  nextdoor:            { primary: 'nextdoor_public_reply',     fallback: 'tel_annuaire' },
  facebook_local:      { primary: 'facebook_public_comment',   fallback: 'messenger_dm' },
  whatsapp_group:      { primary: 'whatsapp_group_reply',      fallback: 'whatsapp_dm' },
  allovoisins:         { primary: 'platform_contact_form',     fallback: 'tel_profile' },
  leboncoin:           { primary: 'tel_direct_annonce',        fallback: 'voicemail_drop' },
  pagesjaunes:         { primary: 'public_qa_reply',           fallback: 'email' },
  houzz:               { primary: 'platform_contact_form',     fallback: 'email' },
  seloger_pap:         { primary: 'email_contact_annonce',     fallback: 'tel_annonce' },
  permis_construire:   { primary: 'tel_annuaire_nom_adresse',  fallback: 'email_mairie' },
  bans_mariage:        { primary: 'email_enrichi',             fallback: 'instagram_dm' },
  facebook_events:     { primary: 'messenger_dm',              fallback: 'email' },
  pinterest:           { primary: 'email_enrichi',             fallback: 'instagram_dm' },
  forum_sante:         { primary: 'public_forum_reply',        fallback: 'email_profile' },
  forum_auto:          { primary: 'public_forum_reply',        fallback: 'email_profile' },
  forum_maison:        { primary: 'public_forum_reply',        fallback: 'email_profile' },
  instagram_local:     { primary: 'instagram_dm',              fallback: 'email_bio' },
  tiktok:              { primary: 'tiktok_comment_reply',      fallback: 'instagram_dm' },
  tripadvisor:         { primary: 'email_enrichi',             fallback: 'tel_enrichi' }
}

/**
 * Retourne le canal de contact pour une source B2C
 * @param {string} source - ID de la source
 * @param {Object} lead - Lead avec canaux disponibles
 * @returns {{ channel: string, type: 'primary'|'fallback' }}
 */
export function getContactChannel(source, lead) {
  const matrix = B2C_CONTACT_MATRIX[source]
  if (!matrix) return { channel: 'email', type: 'fallback' }

  // Verifier si le canal primaire est accessible
  const primaryAvailable = isChannelAvailable(matrix.primary, lead)
  if (primaryAvailable) {
    return { channel: matrix.primary, type: 'primary' }
  }

  return { channel: matrix.fallback, type: 'fallback' }
}

/**
 * Verifie si un canal est disponible pour un lead
 */
function isChannelAvailable(channel, lead) {
  const channelRequirements = {
    nextdoor_public_reply: () => !!lead.nativeContactId,
    facebook_public_comment: () => !!lead.nativeContactId,
    whatsapp_group_reply: () => !!lead.nativeContactId,
    whatsapp_dm: () => !!lead.whatsapp || !!lead.phone,
    messenger_dm: () => !!lead.nativeContactId,
    tel_direct_annonce: () => !!lead.phone,
    tel_annuaire: () => !!lead.phone,
    tel_annuaire_nom_adresse: () => !!(lead.firstName && lead.zone),
    tel_profile: () => !!lead.phone,
    tel_annonce: () => !!lead.phone,
    tel_enrichi: () => !!lead.phone,
    voicemail_drop: () => !!lead.phone,
    email: () => !!lead.email,
    email_enrichi: () => !!lead.email,
    email_contact_annonce: () => !!lead.email,
    email_mairie: () => !!lead.zone,
    email_profile: () => !!lead.email,
    email_bio: () => !!lead.email,
    instagram_dm: () => !!lead.instagramUsername || !!lead.nativeContactId,
    tiktok_comment_reply: () => !!lead.nativeContactId,
    platform_contact_form: () => !!lead.sourceUrl,
    public_qa_reply: () => !!lead.sourceUrl,
    public_forum_reply: () => !!lead.sourceUrl
  }

  const check = channelRequirements[channel]
  return check ? check() : true
}
