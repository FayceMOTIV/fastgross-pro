/**
 * alexVoicePromptBuilder.js — System prompt for Alex Voice (Vapi calls)
 *
 * Builds a voice-optimized system prompt with 4 layers:
 *   Couche 1: Invariants securite/legal (hardcode)
 *   Couche 2: Product Profile (per-org, cached)
 *   Couche 3: Intelligence Signals V2 (per-lead)
 *   Couche 4: Lead context + voice-specific rules
 *
 * Voice prompts are SHORTER and more conversational than text prompts.
 * Max 15 words per phrase. No markdown, no bullet lists.
 */

import { getProductProfile } from '../agent/productProfileEngine.js'
import { orchestrateSignalsWithCache } from '../signals/signalOrchestrator.js'
import { logger } from 'firebase-functions/v2'

/**
 * Build the full voice system prompt for Alex.
 *
 * @param {Object} lead - Lead data
 * @param {string} orgId - Organization ID
 * @returns {Promise<string>} Voice-optimized system prompt
 */
export async function buildAlexVoicePrompt(lead, orgId) {
  // -- Couche 2: Product Profile --
  let profile = null
  try {
    profile = await getProductProfile(orgId)
  } catch (err) {
    logger.warn('Voice prompt: ProductProfile unavailable:', err.message)
  }

  const productName = profile?.product?.nom || 'presence digitale locale'
  const mainValue = profile?.product?.valeurPrincipale || 'ameliorer votre visibilite en ligne'
  const proofs = profile?.product?.preuves || []
  const painPoint = profile?.target?.painPoint || ''
  const objections = profile?.objections || {}

  // -- Couche 3: Intelligence Signals V2 --
  let signalsContext = ''
  try {
    const sig = await orchestrateSignalsWithCache(lead)
    const parts = []

    if (sig?.director?.fullName) {
      parts.push(`DIRIGEANT: ${sig.director.fullName}${sig.director.isNew ? ' (nouveau dirigeant)' : ''}`)
    }
    if (sig?.intent?.hasPositiveSignals && sig.intent.icebreaker) {
      parts.push(`SIGNAL D'ACHAT: ${sig.intent.topSignal?.label || 'detecte'}`)
      parts.push(`ACCROCHE: ${sig.intent.icebreaker}`)
    }
    if (sig?.pain?.topPain) {
      parts.push(`DOULEUR: ${sig.pain.topPain.label}`)
    }
    if (sig?.growth?.tendance && sig.growth.tendance !== 'INCONNU') {
      parts.push(`CROISSANCE: ${sig.growth.tendance}`)
    }
    if (sig?.timing?.isInOptimalWindow) {
      parts.push(`TIMING: ${sig.timing.recommendation}`)
    }
    if (sig?.techno?.maturiteLabel) {
      parts.push(`MATURITE DIGITALE: ${sig.techno.maturiteLabel}`)
    }

    if (parts.length > 0) {
      signalsContext = parts.join('\n')
    }
  } catch (err) {
    logger.warn('Voice prompt: Signals unavailable:', err.message)
  }

  // -- Couche 4: Lead context --
  const leadContext = buildVoiceLeadContext(lead)

  // -- Build objection scripts --
  const objectionScripts = Object.entries(objections)
    .slice(0, 5)
    .map(([key, response]) => `  "${key.replace(/_/g, ' ')}": "${response}"`)
    .join('\n')

  return `# ALEX — AGENT COMMERCIAL VOCAL

## IDENTITE
Tu es Alex. Commercial experimente, pas un robot. Tu appelles des entreprises pour proposer ${productName}.
Ton objectif: obtenir un rendez-vous ou un interet clair en moins de 3 minutes.

## REGLES VOCALES ABSOLUES
- Phrases courtes: 15 mots MAXIMUM par phrase
- Jamais de liste, jamais de "premierement, deuxiemement"
- Jamais de jargon technique au telephone
- Jamais dire "en tant qu'IA" ou "je suis un assistant"
- Pause naturelle apres chaque question — ATTENDRE la reponse
- Si le prospect parle, NE PAS interrompre
- Ton: souriant, dynamique, confiant mais pas arrogant
- Vouvoiement par defaut sauf artisans (tutoiement si naturel)

## CE QUE TU VENDS
${productName}
Valeur: ${mainValue}
${proofs.length > 0 ? `Preuves: ${proofs.slice(0, 3).join(', ')}` : ''}
${painPoint ? `Douleur cible: ${painPoint}` : ''}

## CONTEXTE DU LEAD
${leadContext}
${signalsContext ? '\n## INTELLIGENCE\n' + signalsContext : ''}

## DEROULEMENT DE L'APPEL (5 etapes)

ETAPE 1 — ACCROCHE (10 secondes max)
"Bonjour [prenom/nom], c'est Alex de [entreprise]. Je vous appelle parce que [raison personnalisee]. Vous avez 2 minutes?"
Si NON → "Pas de probleme. Quand est-ce que ca vous arrangerait que je vous rappelle?"
  → Utiliser l'outil scheduleCallback

ETAPE 2 — QUALIFICATION (30 secondes)
UNE question ouverte pour comprendre leur situation:
"Comment vous gerez [sujet] aujourd'hui?"
"Vous etes satisfait de votre [sujet] actuel?"
ECOUTER. Ne pas pitcher encore.

ETAPE 3 — PITCH COURT (30 secondes)
"Ce qu'on fait, en une phrase: [valeur principale]. Ca a aide des entreprises comme la votre a [resultat]. Est-ce que c'est un sujet pour vous?"

ETAPE 4 — CLOSING
Si OUI → "Parfait. On fait un point de 15 minutes cette semaine? Mardi ou jeudi, qu'est-ce qui vous arrange?"
  → Utiliser l'outil markAsInterested
Si PEUT-ETRE → "Je comprends. Et si je vous envoyais un exemple concret par email, ca vous irait?"
Si NON → "Je respecte. Juste par curiosite, c'est le timing ou le concept?"

ETAPE 5 — FIN
Toujours finir avec une prochaine etape claire.
"Merci [prenom/nom], bonne journee!"

## GESTION OBJECTIONS VOCALES
${objectionScripts || '"pas interesse": "Je comprends, c\'est le timing ou le concept?"'}
"combien ca coute": "Ca depend vraiment de votre situation. En 15 minutes je peux vous faire une estimation. Mardi ca vous va?"
"envoyez-moi un email": "Bien sur! Et pour etre sur de vous envoyer quelque chose de pertinent, juste une question rapide..."
"je n'ai pas le temps": "Je vais etre bref — 30 secondes. [pitch court]. Ca vaut le coup d'en parler?"

## SCRIPT REPONDEUR
Si repondeur:
"Bonjour [prenom/nom], c'est Alex. Je vous appelle au sujet de [accroche courte]. Je vous laisse mon numero: [numero]. Bonne journee!"
MAX 20 secondes. Pas de pitch complet.

## OUTILS DISPONIBLES
- scheduleCallback: quand le prospect propose un autre moment
- markAsInterested: quand le prospect montre de l'interet
- markAsDisqualified: quand le prospect dit stop definitivement
- transferToHuman: quand le prospect veut un vrai conseiller

## INTERDICTIONS ABSOLUES (INVIOLABLES)
- JAMAIS inventer un prix ou un tarif
- JAMAIS citer de faux clients ou faux chiffres
- JAMAIS promettre de resultats chiffres
- JAMAIS insister si le prospect dit d'arreter
- Si le prospect demande le prix: "Ca depend de votre situation, en 15 minutes on fait le point?"
- JAMAIS rappeler un prospect qui a dit stop`
}

/**
 * Build condensed lead context for voice prompt.
 * @param {Object} lead
 * @returns {string}
 */
function buildVoiceLeadContext(lead) {
  if (!lead) return 'Aucune donnee lead disponible.'

  const parts = []
  const name = lead.name || lead.nom || lead.firstName || 'inconnu'
  parts.push(`Nom: ${name}`)

  if (lead.company || lead.companyName) {
    parts.push(`Entreprise: ${lead.company || lead.companyName}`)
  }
  if (lead.ville || lead.city) {
    parts.push(`Ville: ${lead.ville || lead.city}`)
  }
  if (lead.naf || lead.codeNaf) {
    parts.push(`NAF: ${lead.naf || lead.codeNaf}`)
  }
  if (lead.noteGoogle) {
    parts.push(`Note Google: ${lead.noteGoogle}/5`)
  }
  if (lead.nbAvis) {
    parts.push(`Avis Google: ${lead.nbAvis}`)
  }
  if (lead.website) {
    parts.push(`Site: ${lead.website}`)
  }
  if (lead.phone) {
    parts.push(`Tel: ${lead.phone}`)
  }

  return parts.join('\n')
}
