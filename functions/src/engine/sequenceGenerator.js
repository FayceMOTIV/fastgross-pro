/**
 * Sequence Generator - Expert Copywriting avec frameworks adaptatifs
 * Niveau Apollo/Instantly : PAS, AIDA, BAB, 3P selon le prospect
 */

import { getOptimalSendTime } from './sendTimeOptimizer.js'

// Delai Gemini
const GEMINI_DELAY = 4000
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Genere une sequence complete avec framework adapte
 */
export async function generateExpertSequence(prospect, icp, geminiCall) {
  // Determiner le meilleur framework
  const framework = selectFramework(prospect, icp)

  // Generer la sequence via Gemini
  const prompt = buildExpertPrompt(prospect, icp, framework)

  try {
    const response = await geminiCall(prompt)
    const sequence = parseSequenceResponse(response)

    if (sequence && sequence.steps) {
      // Ajouter les timings optimaux
      sequence.steps = sequence.steps.map((step, index) => ({
        ...step,
        ...getOptimalSendTime(prospect, step.channel, index),
        order: index + 1
      }))

      return {
        success: true,
        framework: sequence.framework || framework.name,
        frameworkReason: sequence.frameworkReason || framework.reason,
        steps: sequence.steps,
        prospectId: prospect.id,
        generatedAt: new Date()
      }
    }
  } catch (error) {
    console.log('Sequence generation error:', error.message)
  }

  // Fallback vers generation locale
  return generateLocalSequence(prospect, icp, framework)
}

/**
 * Selectionne le framework le plus adapte au prospect
 */
function selectFramework(prospect, icp) {
  const enrichment = prospect.enrichment || prospect
  const intent = prospect.intent || prospect.scoring?.intent || {}
  const signals = intent.signals || []

  // PAS (Problem-Agitate-Solve) - Quand le prospect a un probleme VISIBLE
  const hasPainVisible = signals.some(s => s.type === 'pain_visible')
  if (hasPainVisible) {
    return {
      name: 'PAS',
      reason: 'Probleme visible dans les avis - approche directe sur la douleur',
      approach: 'problem_first'
    }
  }

  // 3P (Praise-Picture-Push) - Quand le prospect a des reussites visibles
  const hasGoodReviews = (enrichment.rating || 0) >= 4.5
  const isGrowing = signals.some(s => s.type === 'growing_fast' || s.type === 'funding')
  if (hasGoodReviews || isGrowing) {
    return {
      name: '3P',
      reason: 'Entreprise avec reussites visibles - approche compliment',
      approach: 'praise_first'
    }
  }

  // BAB (Before-After-Bridge) - Quand on peut peindre une transformation
  const offer = (icp.offer || '').toLowerCase()
  const hasTransformativeOffer = ['nettoyage', 'web', 'marketing', 'design', 'renovation'].some(k => offer.includes(k))
  if (hasTransformativeOffer) {
    return {
      name: 'BAB',
      reason: 'Offre avec transformation visible - approche avant/apres',
      approach: 'transformation'
    }
  }

  // AIDA (Attention-Interest-Desire-Action) - Par defaut pour prospects froids
  return {
    name: 'AIDA',
    reason: 'Prospect sans signal fort - approche progressive classique',
    approach: 'attention_first'
  }
}

/**
 * Construit le prompt expert pour Gemini
 */
function buildExpertPrompt(prospect, icp, framework) {
  const enrichment = prospect.enrichment || prospect
  const scoring = prospect.scoring || {}
  const intent = scoring.intent || {}

  // Determiner le ton (tu/vous)
  const employeeCount = enrichment.employeeCount || 50
  const tone = employeeCount < 10 ? 'tutoiement' : 'vouvoiement'

  // Extraire les donnees pertinentes
  const firstName = enrichment.ceo?.split(' ')[0] || enrichment.decisionMakers?.[0]?.firstName || ''
  const companyName = enrichment.company || prospect.company
  const positioning = enrichment.description || enrichment.siteData?.metaDescription || ''
  const signals = (intent.signals || []).map(s => s.detail).join(', ') || 'Aucun signal specifique'
  const rating = enrichment.rating ? `${enrichment.rating}/5` : 'N/A'

  return `Tu es un expert copywriter B2B specialise en cold outreach francais.

FRAMEWORK A UTILISER: ${framework.name} (${framework.reason})

Rappel des frameworks :
- PAS (Problem-Agitate-Solve) : Identifier le probleme, l'amplifier, proposer la solution
- AIDA (Attention-Interest-Desire-Action) : Capter l'attention, creer l'interet, susciter le desir, inciter a l'action
- BAB (Before-After-Bridge) : Situation actuelle, situation ideale, comment y arriver
- 3P (Praise-Picture-Push) : Complimenter, montrer la vision, pousser a l'action

DONNEES DU PROSPECT:
- Entreprise : ${companyName}
- Secteur : ${enrichment.industry || enrichment.sector || 'Non specifie'}
- Decideur : ${firstName || 'Non identifie'} ${enrichment.ceo ? `(${enrichment.ceo})` : ''}
- Ville : ${enrichment.city || 'Non specifiee'}
- Signaux d'achat : ${signals}
- Avis Google : ${rating}
- Positionnement : ${positioning.substring(0, 150)}

MON CLIENT:
- Offre : ${icp.offer || icp.business?.offer}
- Secteur : ${icp.sector || icp.business?.sector}
- Zone : ${icp.zone}
- Preuve sociale : ${icp.socialProof || 'Clients satisfaits dans la region'}

REGLES ABSOLUES:
1. Utilise le ${tone} pour ce prospect
2. Email 1 : MAX 100 mots — accroche personnalisee, PAS de pitch complet
3. Chaque follow-up apporte un ANGLE DIFFERENT
4. SMS/WhatsApp : MAX 40 mots
5. JAMAIS de "Je me permets de vous contacter"
6. JAMAIS de "Suite a mon precedent email" (ennuyeux)
7. UN SEUL call-to-action par message (question ouverte > lien)
8. L'objet doit etre court (3-6 mots), intriguant, pas clickbait
9. Si tu as le prenom (${firstName || 'non'}), utilise-le
10. Inclure le nom de l'entreprise naturellement

EXEMPLES D'OBJETS:
✅ "Question sur vos locaux"
✅ "Une idee pour ${companyName}"
✅ "${firstName}, 3 min ?"
❌ "Offre exceptionnelle de nettoyage"
❌ "RE: Votre demande" (faux RE: = spam)

ANGLES DE RELANCE (utilise un different par etape):
1. Accroche personnalisee (Email 1)
2. Preuve sociale - "J'ai aide [client similaire] a [resultat]"
3. Valeur gratuite - Conseil, stat, audit rapide
4. Urgence douce - "Derniere tentative"
5. Break-up - "Ce sera mon dernier message"

SEQUENCE A GENERER:
- Email 1 : Jour 0 (Mardi ou Jeudi, 9h30)
- Email 2 : Jour +3 (angle different)
- SMS/WhatsApp : Jour +6 (court, direct)
- Email 3 : Jour +10 (valeur ou preuve sociale)
- Email 4 (break-up) : Jour +14

Retourne UNIQUEMENT ce JSON (pas de commentaires):
{
  "framework": "${framework.name}",
  "frameworkReason": "Pourquoi ce framework pour ce prospect",
  "steps": [
    {
      "day": 0,
      "channel": "email",
      "subject": "Objet court et intriguant",
      "content": "Corps du message (75-125 mots max)",
      "angle": "personalization|social_proof|value|urgency|breakup"
    }
  ]
}`
}

/**
 * Parse la reponse JSON de Gemini
 */
function parseSequenceResponse(text) {
  try {
    return JSON.parse(text)
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim())
      } catch {}
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {}
    }
  }
  return null
}

/**
 * Generation locale de sequence (fallback)
 */
function generateLocalSequence(prospect, icp, framework) {
  const enrichment = prospect.enrichment || prospect
  const companyName = enrichment.company || prospect.company
  const firstName = enrichment.ceo?.split(' ')[0] || ''
  const city = enrichment.city || icp.zone?.split(' ')[0] || 'votre region'
  const offer = icp.offer || 'nos services'
  const businessName = icp.businessName || 'notre equipe'

  // Determiner le ton
  const employeeCount = enrichment.employeeCount || 50
  const isTPE = employeeCount < 10
  const vous = isTPE ? 'tu' : 'vous'
  const votre = isTPE ? 'ton' : 'votre'
  const vos = isTPE ? 'tes' : 'vos'
  const etes = isTPE ? 'es' : 'etes'
  const avez = isTPE ? 'as' : 'avez'

  const steps = []

  // Email 1 - Accroche personnalisee
  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour'
  steps.push({
    day: 0,
    channel: 'email',
    subject: firstName ? `${firstName}, une question rapide` : `Question pour ${companyName}`,
    content: `${greeting},

${framework.name === 'PAS' ?
`J'ai vu que certains clients mentionnaient des soucis d'entretien dans les avis de ${companyName}. C'est un point qui peut vraiment impacter l'image aupres de ${vos} visiteurs.` :
framework.name === '3P' ?
`Felicitations pour le developpement de ${companyName} ! ${enrichment.rating ? `${enrichment.rating}/5 sur Google, c'est remarquable.` : 'Une belle dynamique.'}` :
framework.name === 'BAB' ?
`Imagin${isTPE ? 'e' : 'ez'} ${votre} espace de travail impeccable chaque matin, sans ${vous} en soucier.` :
`Je travaille avec des entreprises comme ${companyName} a ${city} sur ${offer}.`}

Ser${isTPE ? 'ais-tu' : 'iez-vous'} disponible pour un echange de 10 minutes ?

Cordialement,
${businessName}`,
    angle: 'personalization'
  })

  // Email 2 - Preuve sociale
  steps.push({
    day: 3,
    channel: 'email',
    subject: `Resultats chez un ${enrichment.industry || 'client'} similaire`,
    content: `${greeting},

Un de nos clients dans ${votre} secteur a reduit son turnover de prestataires de 40% en travaillant avec nous.

La difference ? Un interlocuteur unique et une qualite constante.

Qu'est-ce qui compte le plus pour ${vous} dans ce type de service ?

${businessName}`,
    angle: 'social_proof'
  })

  // SMS/WhatsApp - Court et direct
  steps.push({
    day: 6,
    channel: icp.channels?.includes('whatsapp') ? 'whatsapp' : 'sms',
    content: `${greeting}, suite a mes emails sur ${offer}. Disponible pour un appel de 10min cette semaine ? ${businessName}`,
    angle: 'followup'
  })

  // Email 3 - Valeur
  steps.push({
    day: 10,
    channel: 'email',
    subject: `Un conseil pour ${companyName}`,
    content: `${greeting},

Saviez-${vous} qu'un espace de travail bien entretenu augmente la productivite de 15% selon les dernieres etudes ?

Je serais ravi de ${vous} partager quelques bonnes pratiques lors d'un echange rapide - sans engagement.

${etes.charAt(0).toUpperCase() + etes.slice(1)}-${vous} ouvert${isTPE ? '' : 's'} a cette idee ?

${businessName}`,
    angle: 'value'
  })

  // Email 4 - Break-up
  steps.push({
    day: 14,
    channel: 'email',
    subject: 'Mon dernier message',
    content: `${greeting},

Ce sera mon dernier message - je ne veux pas ${vous} importuner.

Si a l'avenir ${vous} cherch${isTPE ? 'es' : 'ez'} un partenaire fiable pour ${offer}, pensez a nous.

Bonne continuation !

${businessName}`,
    angle: 'breakup'
  })

  return {
    success: true,
    framework: framework.name,
    frameworkReason: framework.reason,
    steps,
    isLocalFallback: true,
    prospectId: prospect.id,
    generatedAt: new Date()
  }
}

/**
 * Genere des variantes A/B pour test
 */
export async function generateABVariants(prospect, icp, geminiCall) {
  const variants = []

  // Variante A - Style direct
  const directFramework = { name: 'AIDA', reason: 'Approche directe', approach: 'direct' }
  const variantA = await generateExpertSequence(
    { ...prospect, abVariant: 'A' },
    { ...icp, style: 'direct' },
    geminiCall
  )
  variantA.variant = 'A'
  variantA.style = 'direct'
  variants.push(variantA)

  await delay(GEMINI_DELAY)

  // Variante B - Style question
  const questionFramework = { name: 'PAS', reason: 'Approche question', approach: 'question' }
  const variantB = await generateExpertSequence(
    { ...prospect, abVariant: 'B' },
    { ...icp, style: 'question' },
    geminiCall
  )
  variantB.variant = 'B'
  variantB.style = 'question'
  variants.push(variantB)

  return variants
}

/**
 * Genere une reponse a une objection
 */
export async function generateObjectionResponse(objection, originalEmail, prospect, icp, geminiCall) {
  const prompt = `Tu es un expert en reponse aux objections commerciales B2B.

OBJECTION RECUE:
"${objection}"

CONTEXTE:
- Email original envoye : ${originalEmail}
- Entreprise : ${prospect.company}
- Offre : ${icp.offer}

Genere une reponse courte (max 80 mots) qui :
1. Accuse reception de l'objection
2. Apporte une vraie reponse/valeur
3. Laisse la porte ouverte

Retourne UNIQUEMENT le texte de la reponse.`

  try {
    const response = await geminiCall(prompt)
    return {
      success: true,
      response: response.trim()
    }
  } catch (error) {
    return {
      success: false,
      response: `Merci pour votre retour. Je comprends tout a fait. Si votre situation evolue, n'hesitez pas a me recontacter.`
    }
  }
}
