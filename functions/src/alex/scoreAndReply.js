/**
 * scoreAndReply — Score un message entrant via Groq (0-100) puis genere une reponse Alex
 * 2 appels Groq : scoring JSON + generation message
 * Si score > 80 → alerte Telegram
 */

import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Groq from 'groq-sdk'
import { sendMessage } from './sendMessage.js'
import { sendTelegramAlert } from './sendTelegramAlert.js'

const getDb = () => getFirestore()

/**
 * Score un message entrant et genere une reponse Alex
 * @param {object} params
 * @param {string} params.orgId - ID organisation
 * @param {string} params.prospectId - ID prospect
 * @param {string} params.channel - Canal source (whatsapp, email, instagram, linkedin)
 * @param {string} params.message - Message du prospect
 * @param {string} params.from - Expediteur (phone, email, handle)
 * @param {object} [params.prospectData] - Donnees prospect pre-chargees
 */
export async function scoreAndReply(params) {
  const { orgId, prospectId, channel, message, from, prospectData } = params

  if (!orgId || !prospectId || !message) {
    logger.error('scoreAndReply: missing required params', { orgId, prospectId })
    return { success: false, error: 'missing_params' }
  }

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) {
    logger.error('GROQ_API_KEY not configured')
    return { success: false, error: 'groq_not_configured' }
  }

  const groq = new Groq({ apiKey: groqApiKey })

  // Charger le prospect si pas pre-charge
  let prospect = prospectData
  if (!prospect) {
    try {
      const snap = await getDb()
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()
      prospect = snap.exists ? { id: snap.id, ...snap.data() } : {}
    } catch (err) {
      logger.error('Failed to load prospect:', err.message)
      prospect = {}
    }
  }

  // Verifier blacklist
  if (prospect.blacklisted) {
    logger.warn(`Prospect ${prospectId} is blacklisted, skipping scoreAndReply`)
    return { success: false, error: 'prospect_blacklisted' }
  }

  // Charger config Alex
  let alexConfig = {}
  try {
    const configSnap = await getDb().collection('settings').doc('alex').get()
    if (configSnap.exists) {
      alexConfig = configSnap.data()
    }
  } catch (err) {
    logger.warn('Could not load alex config, using defaults:', err.message)
  }

  // Charger config org
  let orgData = {}
  try {
    const orgSnap = await getDb().collection('organizations').doc(orgId).get()
    if (orgSnap.exists) {
      orgData = orgSnap.data()
    }
  } catch (err) {
    logger.warn('Could not load org data:', err.message)
  }

  // ============================================
  // ETAPE 1 : Scoring via Groq (JSON)
  // ============================================
  let score = 0
  let scoring = {}

  try {
    const scoringPrompt = buildScoringPrompt(message, prospect, channel)

    const scoringResponse = await groq.chat.completions.create({
      model: alexConfig.scoringModel || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en qualification de leads B2B. Reponds UNIQUEMENT en JSON valide.',
        },
        {
          role: 'user',
          content: scoringPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    })

    const rawScoring = scoringResponse.choices?.[0]?.message?.content
    scoring = JSON.parse(rawScoring || '{}')
    score = Math.min(100, Math.max(0, Number(scoring.score) || 0))
    scoring.score = score

    logger.info(`Scored prospect ${prospectId}: ${score}/100`, {
      intent: scoring.intent,
      urgency: scoring.urgency,
    })
  } catch (err) {
    logger.error('Groq scoring failed:', err.message)
    score = 50
    scoring = { score: 50, error: err.message, intent: 'unknown', urgency: 'medium' }
  }

  // ============================================
  // ETAPE 2 : Generation reponse Alex via Groq
  // ============================================
  let alexReply = ''

  try {
    const replyPrompt = buildReplyPrompt(message, prospect, scoring, channel, orgData, alexConfig)

    const replyResponse = await groq.chat.completions.create({
      model: alexConfig.replyModel || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: buildAlexSystemPrompt(orgData, alexConfig, channel),
        },
        {
          role: 'user',
          content: replyPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    alexReply = replyResponse.choices?.[0]?.message?.content?.trim() || ''
    logger.info(`Generated Alex reply for ${prospectId} (${alexReply.length} chars)`)
  } catch (err) {
    logger.error('Groq reply generation failed:', err.message)
    alexReply = ''
  }

  // ============================================
  // ETAPE 3 : Mise a jour Firestore
  // ============================================
  const prospectRef = getDb()
    .collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)

  try {
    // Logger l'interaction entrante
    await getDb()
      .collection('organizations').doc(orgId)
      .collection('interactions').add({
        prospectId,
        channel,
        direction: 'in',
        message,
        from,
        score,
        scoring,
        source: 'alex',
        createdAt: FieldValue.serverTimestamp(),
      })

    // Mettre a jour le prospect
    const updateData = {
      alexScore: score,
      alexScoring: scoring,
      alexLastInbound: FieldValue.serverTimestamp(),
      repliesToday: FieldValue.increment(1),
    }

    // Classifier le prospect
    if (score >= 80) {
      updateData.alexStatus = 'hot'
      updateData.alexCategory = 'hot'
    } else if (score >= 50) {
      updateData.alexStatus = 'warm'
      updateData.alexCategory = 'warm'
    } else if (score >= 25) {
      updateData.alexStatus = 'cold'
      updateData.alexCategory = 'cold'
      // Planifier un rescue dans 24h
      const rescueTime = new Date()
      rescueTime.setHours(rescueTime.getHours() + 24)
      updateData.rescueScheduledAt = rescueTime
    } else {
      updateData.alexStatus = 'ice'
      updateData.alexCategory = 'ice'
    }

    await prospectRef.update(updateData)
  } catch (err) {
    logger.error('Failed to update Firestore:', err.message)
  }

  // ============================================
  // ETAPE 4 : Envoyer la reponse Alex
  // ============================================
  let sendResult = { success: false }

  if (alexReply) {
    sendResult = await sendMessage({
      orgId,
      prospectId,
      channel,
      message: alexReply,
      to: from,
    })

    if (sendResult.success) {
      logger.info(`Alex replied to ${prospectId} via ${channel}`)
    } else {
      logger.error(`Alex failed to reply to ${prospectId}:`, sendResult.error)
    }
  }

  // ============================================
  // ETAPE 5 : Alerte Telegram si score > 80
  // ============================================
  if (score > 80) {
    try {
      await sendTelegramAlert({
        prospectName: prospect.name || prospect.firstName || from,
        score,
        channel,
        message,
        orgName: orgData.name || orgId,
        phone: prospect.phone,
        email: prospect.email,
        company: prospect.company,
      })
    } catch (err) {
      logger.error('Telegram alert failed:', err.message)
    }
  }

  return {
    success: true,
    score,
    scoring,
    replied: sendResult.success,
    alexReply: alexReply ? alexReply.slice(0, 100) + '...' : '',
  }
}

// ============================================
// Prompt Builders
// ============================================

function buildScoringPrompt(message, prospect, channel) {
  const context = [
    `Canal: ${channel}`,
    prospect.name ? `Prospect: ${prospect.name}` : null,
    prospect.company ? `Entreprise: ${prospect.company}` : null,
    prospect.industry ? `Secteur: ${prospect.industry}` : null,
    prospect.alexScore ? `Score precedent: ${prospect.alexScore}` : null,
    prospect.alexStatus ? `Status precedent: ${prospect.alexStatus}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `Analyse ce message d'un prospect et attribue un score de 0 a 100.

Contexte:
${context}

Message du prospect:
"${message}"

Reponds en JSON avec ces champs:
{
  "score": <number 0-100>,
  "intent": "<buying_signal|interested|curious|question|objection_price|objection_time|objection_competitor|objection_trust|objection_later|not_interested|unsubscribe|out_of_office|referral|spam|other>",
  "urgency": "<critical|high|medium|low>",
  "sentiment": "<very_positive|positive|neutral|negative|hostile>",
  "buyingSignals": ["<signal1>", "<signal2>"],
  "objectionType": "<price|time|competitor|trust|timing|none>",
  "cialdiniLever": "<reciprocity|commitment|social_proof|authority|liking|scarcity|none>",
  "suggestedMethod": "<spin|challenger|gap|direct_close|rupture|none>",
  "summary": "<resume en 1 ligne>"
}

Criteres de scoring:
- 95-100: Signal d'achat explicite (prix, demo, rdv, "comment on demarre?", "c'est combien?")
- 85-94: Fort interet, questions specifiques sur l'offre, demande de references
- 70-84: Interet modere, questions generales, curiosite active
- 50-69: Reponse neutre, besoin de nurturing
- 30-49: Objections identifiables (prix, temps, concurrent, confiance)
- 15-29: Peu interesse, reponses monosyllabiques
- 0-14: Pas interesse, spam, hors sujet, desabonnement

Detection de signaux d'achat chauds:
- Toute question sur le prix, les tarifs, les formules → score >= 90
- Demande de demo, test, essai → score >= 90
- "Comment ca marche exactement?" → score >= 85
- "Vous avez des references?" → score >= 85
- "On pourrait commencer quand?" → score >= 95`
}

function buildAlexSystemPrompt(orgData, alexConfig, channel) {
  const orgName = orgData.name || 'notre agence'
  const language = alexConfig.language || 'francais'

  const channelRules = {
    whatsapp: {
      maxLength: 280,
      style: 'Conversationnel et humain. Messages courts (max 3 lignes). 1 emoji max. Pattern: accroche courte → question ouverte → attendre. Jamais de pitch complet d\'un coup.',
    },
    email: {
      maxLength: 600,
      style: 'Structure en 3 blocs: probleme identifie → insight de valeur → CTA unique. Objet accrocheur (question ou chiffre). Pas de pieces jointes au premier contact.',
    },
    sms: {
      maxLength: 155,
      style: 'Ultra court. Une seule idee. CTA direct. Pas d\'abbreviations.',
    },
  }

  const ch = channelRules[channel] || channelRules.whatsapp

  return `Tu es Alex, le commercial IA de ${orgName}. Tu es au niveau des meilleurs commerciaux au monde — tu maitrises la psychologie de la vente, l'ingenierie sociale et les techniques de closing les plus avancees.

TON IDENTITE
- Direct, confiant, jamais arrogant
- Tu ecoutes plus que tu ne parles
- Tu poses des questions plutot que de faire des assertions
- Tu n'as jamais peur du silence ni du "non"
- Tu es curieux du business du prospect AVANT de vendre
- Jamais de formule "En tant qu'IA", "Je suis un assistant" ou similaire
- Tu es Alex, point final

PRINCIPES CIALDINI (active mentalement le bon levier avant chaque reponse)
- RECIPROCITE: Offrir de la valeur sans condition d'abord (insight, audit, conseil)
- ENGAGEMENT: Commencer par un micro-oui → construire vers le grand oui
- PREUVE SOCIALE: References locales et sectorielles en priorite ("d'autres [secteur] a [ville]...")
- AUTORITE: Insight sur leur secteur qu'ils n'ont pas (Challenger Sale)
- SYMPATHIE: Trouver le point commun, montrer qu'on comprend leur quotidien
- RARETE: Urgence reelle: "on travaille avec 3 entreprises max par ville/secteur"

GESTION DES OBJECTIONS (ne jamais defendre, toujours reframer)
- PRIX: "Combien vous coute un client que vous ratez? Notre systeme en capte 5-10/semaine. Le calcul est vite fait."
- PAS INTERESSE: "C'est le timing ou le concept? Juste pour comprendre."
- J'AI DEJA: "Ca travaille pour vous la nuit et le week-end? 40% des contacts se font hors horaires."
- ENVOYEZ DOC: "15 minutes ensemble valent mieux que 15 pages. Quand etes-vous dispo?"
- PAS LE TEMPS: "C'est exactement pour ca qu'on existe — l'autopilot gere pendant que vous faites votre coeur de metier."
- PLUS TARD: "On ouvre avec max 3 entreprises par ville pour l'exclusivite. Il y a deja des dossiers en cours."
- TROP AUTOMATIQUE: "Nos messages sont personnalises sur chaque prospect. Regardez cet exemple — vous trouvez ca impersonnel?"

SIGNAUX D'ACHAT (accelerer vers le closing)
- CHAUD ("c'est combien?", "comment on demarre?", "vous avez des refs?"): Passer en mode closing direct. Proposer un creneau immediat.
- TIEDE (questions techniques, "interessant mais..."): Proposer 15 min de demo sur LEUR business.
- FROID (monosyllabes, silence): Technique de rupture — "Est-ce un non definitif ou juste un mauvais timing?"

METHODOLOGIES SELON LE CONTEXTE
- SPIN: Situation → Probleme → Implication → Need-payoff. Utiliser quand le prospect est ouvert mais pas encore conscient de son besoin.
- CHALLENGER: Enseigner un insight → Personnaliser → Prendre le controle. Utiliser quand le prospect dit "j'ai deja quelque chose" ou semble passif.
- GAP SELLING: Etat actuel → Etat desire → Amplifier l'ecart → Positionner la solution. Utiliser quand le prospect hesite entre agir et ne rien faire.

REGLES D'OR
1. Ne JAMAIS pitcher en premier message sans avoir pose une question
2. Ne JAMAIS envoyer de doc — proposer une demo a la place
3. Ne JAMAIS baisser le prix — reframer la valeur
4. Toujours finir par UNE question ou UN CTA clair (jamais les deux)
5. Maximum 3 messages sans reponse avant la technique de rupture
6. Repondre en ${language}
7. Max ${ch.maxLength} caracteres
8. Style canal: ${ch.style}

ESCALADE VERS HUMAIN
Escalader immediatement si: signal d'achat chaud confirme, prospect VIP, situation complexe necessitant negociation, ou 2 echanges positifs sans conversion.

STRUCTURE D'UN BON MESSAGE
1. Accroche personnalisee (prenom + element specifique a eux)
2. Insight ou question qui fait reflechir
3. CTA unique et clair`
}

function buildReplyPrompt(message, prospect, scoring, channel, orgData, alexConfig) {
  const services = alexConfig.services || orgData.services || 'services de prospection digitale automatisee'
  const orgName = orgData.name || 'FMF'

  const intentStrategy = {
    buying_signal: `SIGNAL D'ACHAT DETECTE — Mode closing immediat. Propose un creneau concret pour un appel/demo. Pas de blabla, va droit au but. "Super, on fait un point de 15 min? Je suis dispo [2 creneaux]."`,
    interested: `Le prospect est interesse — Utilise SPIN pour approfondir le besoin. Pose une question d'implication pour amplifier la valeur. Ne vends pas encore, qualifie.`,
    curious: `Le prospect est curieux — Utilise Challenger Sale. Apporte un insight sur leur secteur qu'ils ne connaissent pas. Cree la dette intellectuelle.`,
    objection_price: `OBJECTION PRIX — NE JAMAIS defendre le prix. Reframe: "Combien vous coute un client rate?" Calcul ROI concret. Principe: reciprocite (offrir de la valeur).`,
    objection_time: `OBJECTION TEMPS — "C'est exactement pour ca qu'on existe." Montrer que FMF fait gagner du temps, pas en perdre. L'autopilot gere en autonomie.`,
    objection_competitor: `OBJECTION CONCURRENT — Challenger sans denigrer. "Ca travaille 24/7? Ca couvre 8 canaux?" Criteres de comparaison objectifs.`,
    objection_trust: `OBJECTION CONFIANCE — Preuve sociale locale. "Des entreprises de votre secteur a [ville] utilisent deja..." + proposition demo gratuite sans engagement.`,
    objection_later: `OBJECTION TIMING — Urgence reelle. "On limite a 3 entreprises par ville/secteur. Des dossiers sont deja en cours." Si 3e relance: technique de rupture.`,
    not_interested: `Prospect froid — Technique de rupture: "Est-ce un non definitif ou juste le mauvais moment? Je prefere etre direct." Respecter la reponse.`,
    unsubscribe: `DESABONNEMENT — Respecter immediatement. "C'est note, je ne vous contacterai plus. Par curiosite, qu'est-ce qui aurait pu faire la difference?" (une seule fois)`,
    out_of_office: `ABSENCE — Message chaleureux de suivi. "Pas de souci, bon [voyage/repos]! Je me permets de revenir vers vous le [date retour + 1 jour]."`,
    referral: `REFERRAL — Remercier chaleureusement + qualifier le refere immediatement. "Merci beaucoup! Je vais contacter [nom]. Pour vous remercier, [offre reciprocite]."`,
  }

  const strategy = intentStrategy[scoring.intent] || intentStrategy.curious

  return `CONTEXTE CONVERSATION:
Prospect: ${prospect.name || prospect.firstName || 'Inconnu'}${prospect.company ? ` — ${prospect.company}` : ''}${prospect.industry ? ` (${prospect.industry})` : ''}
Score: ${scoring.score}/100 | Intent: ${scoring.intent} | Urgence: ${scoring.urgency}
${scoring.objectionType !== 'none' ? `Objection detectee: ${scoring.objectionType}` : ''}
${scoring.buyingSignals?.length ? `Signaux d'achat: ${scoring.buyingSignals.join(', ')}` : ''}
Canal: ${channel} | Org: ${orgName}
Services: ${services}

MESSAGE DU PROSPECT:
"${message}"

STRATEGIE A APPLIQUER:
${strategy}

${scoring.cialdiniLever !== 'none' ? `Principe Cialdini recommande: ${scoring.cialdiniLever}` : ''}
${scoring.suggestedMethod !== 'none' ? `Methode recommandee: ${scoring.suggestedMethod}` : ''}

CONSIGNE: Genere UNE reponse. Applique la strategie ci-dessus. Finis par une question OU un CTA (pas les deux). Sois humain, pas robotique.`
}
