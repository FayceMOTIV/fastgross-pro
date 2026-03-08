/**
 * Voisin Bienveillant — Intent Hunter B2C
 *
 * Alex ne se presente JAMAIS comme un commercial en B2C.
 * Il joue le role d'un voisin ou conseiller local bienveillant
 * qui connait les bons prestataires du coin.
 *
 * DIFFERENCE CLE B2B vs B2C :
 *   B2B : "Bonjour M. Martin, je me permets de vous contacter..."
 *   B2C : "Bonjour Marie ! J'ai vu votre message. Je connais quelqu'un de super..."
 */

const GROQ_MODEL = 'llama-3.3-70b-versatile'

/**
 * Genere un message B2C avec le ton "voisin bienveillant"
 *
 * @param {Object} lead - Lead B2C detecte
 * @param {Object} clientConfig - Config du client FMF
 * @param {string} platform - Plateforme source (nextdoor, facebook, etc.)
 * @returns {Promise<string>} Message genere
 */
export async function generateB2CMessage(lead, clientConfig, platform) {
  const systemPrompt = buildSystemPrompt(clientConfig)
  const userPrompt = buildUserPrompt(lead, clientConfig, platform)

  try {
    // Import dynamique pour eviter les problemes de circular deps
    const { callGroq } = await import('../../ai/callAI.js')

    const response = await callGroq({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    })

    const message = response?.choices?.[0]?.message?.content?.trim()

    if (!message) {
      return getFallbackMessage(lead, clientConfig, platform)
    }

    console.log(JSON.stringify({
      function: 'voisinBienveillant.generateB2CMessage',
      step: 'generated',
      platform,
      leadId: lead.id,
      messageLength: message.length
    }))

    return message
  } catch (error) {
    console.error(JSON.stringify({
      function: 'voisinBienveillant.generateB2CMessage',
      step: 'error',
      error: error.message,
      platform
    }))

    return getFallbackMessage(lead, clientConfig, platform)
  }
}

/**
 * Construit le system prompt pour le generateur B2C
 */
function buildSystemPrompt(clientConfig) {
  return `Tu es Alex, un conseiller local bienveillant. Tu aides les particuliers a trouver de bons prestataires dans leur region. Tu ne vends rien directement.

REGLES ABSOLUES :
- Tu es sympa, naturel, jamais vendeur
- 2-3 lignes maximum
- NE JAMAIS mentionner que c'est une entreprise qui paie pour ce contact
- Toujours proposer d'aider, jamais pousser
- Laisser le particulier decider
- Utiliser le tutoiement si la plateforme est informelle (Nextdoor, Facebook local)
- Vouvoyer sur les plateformes plus formelles (PagesJaunes, forums)
- Si evenement de vie (mariage, naissance) → feliciter d'abord, proposer ensuite

PRESTATAIRE A RECOMMANDER :
- Nom : ${clientConfig.companyName || 'un excellent prestataire local'}
- Service : ${clientConfig.serviceDescription || 'services professionnels'}
- Zone : ${clientConfig.zone || 'votre region'}`
}

/**
 * Construit le user prompt avec le contexte du lead
 */
function buildUserPrompt(lead, clientConfig, platform) {
  const toneHint = getToneForPlatform(platform)
  const lifeEventContext = lead.lifeEvent ? `Evenement de vie detecte : ${lead.lifeEvent}` : 'Pas d\'evenement de vie particulier'

  return `Post du particulier : "${lead.intentSignal || lead.sourcePublicStatement}"
Plateforme : ${platform}
Prenom du particulier : ${lead.firstName || 'cette personne'}
Zone : ${lead.zone || clientConfig.zone || 'non precisee'}
${lifeEventContext}
Urgence detectee : ${lead.urgencyDetected ? 'OUI — repondre vite' : 'non'}
Ton recommande : ${toneHint}

Genere une reponse courte, chaleureuse et naturelle.`
}

/**
 * Adapte le ton selon la plateforme
 */
function getToneForPlatform(platform) {
  const tones = {
    nextdoor: 'Tres informel, tutoiement, comme un vrai voisin. Emojis ok.',
    facebook_local: 'Informel, tutoiement. Amical comme dans un groupe de quartier.',
    whatsapp_group: 'Court et direct. Tutoiement. Un message vocal transcrit.',
    leboncoin: 'Poli mais direct. Vouvoiement. Aller droit au but.',
    pagesjaunes: 'Professionnel mais accessible. Vouvoiement.',
    forum_sante: 'Empathique et respectueux. Vouvoiement. Pas de conseil medical.',
    forum_auto: 'Decontracte. Tutoiement ok. Entre passionnes.',
    forum_maison: 'Pratique et utile. Tutoiement ok. Ton bricoleur.',
    instagram_local: 'Cool et naturel. Tutoiement. Court.',
    tiktok: 'Ultra court. Tutoiement. Gen Z friendly si le profil correspond.',
    tripadvisor: 'Poli. Vouvoiement. Compassion pour la mauvaise experience.',
    permis_construire: 'Professionnel. Vouvoiement. Mention du projet specifique.',
    bans_mariage: 'Chaleureux. Felicitations d\'abord. Vouvoiement.',
    pinterest: 'Creatif. Tutoiement. Complimenter le board.',
    facebook_events: 'Chaleureux. Felicitations. Tutoiement ok.',
    allovoisins: 'Voisin sympa. Tutoiement. Proposer aide.',
    houzz: 'Professionnel mais accessible. Vouvoiement.',
    seloger_pap: 'Poli. Vouvoiement. Pratique.'
  }

  return tones[platform] || 'Naturel et bienveillant. Adapter au contexte.'
}

/**
 * Message de fallback si l'IA echoue
 */
function getFallbackMessage(lead, clientConfig, platform) {
  const name = lead.firstName || ''
  const informal = ['nextdoor', 'facebook_local', 'whatsapp_group', 'instagram_local', 'tiktok', 'forum_auto', 'forum_maison']
  const isInformal = informal.includes(platform)

  if (isInformal) {
    return `Salut${name ? ' ' + name : ''} ! J'ai vu ton message. Je connais quelqu'un de top pour ca dans le coin, je te mets en contact si tu veux ?`
  }

  return `Bonjour${name ? ' ' + name : ''}, j'ai vu votre message. Je connais un excellent prestataire dans votre secteur pour ce type de besoin. Souhaitez-vous que je vous mette en relation ? C'est gratuit et sans engagement.`
}

/**
 * Genere un message de relance B2C (max 1 relance)
 */
export async function generateB2CFollowup(lead, clientConfig, platform, step) {
  if (step >= 2) {
    // Max 1 relance en B2C
    return null
  }

  const systemPrompt = `Tu es Alex, conseiller local bienveillant. Tu fais une relance douce et unique.
REGLES : 1 seule phrase. Pas insistant. Si pas de reponse apres ca, on arrete.`

  const userPrompt = `Le particulier "${lead.firstName || 'cette personne'}" n'a pas repondu a ton premier message.
Plateforme : ${platform}
Message initial : reponse publique/DM sur ${platform}
Genere une relance courte et respectueuse. Question ouverte type "Votre probleme a-t-il ete resolu ?"
`

  try {
    const { callGroq } = await import('../../ai/callAI.js')

    const response = await callGroq({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7
    })

    return response?.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return `${lead.firstName ? lead.firstName + ', v' : 'V'}otre probleme a-t-il ete resolu ? N'hesitez pas si vous avez encore besoin d'aide.`
  }
}
