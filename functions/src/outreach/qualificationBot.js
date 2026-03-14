/**
 * Qualification Bot IA — Systeme 1 (Alex V4)
 * Classifie chaque reponse et gere la qualification automatique.
 *
 * Classification (5 categories):
 *  - POSITIVE   → reponse instantanee + 2-3 questions qualification
 *  - QUESTION   → reponse informative rapide
 *  - OBJECTION  → playbook 20+ objections contextualisees
 *  - NEGATIVE   → remerciement + suppression sequence
 *  - OOO        → reprogrammer la sequence
 *
 * Qualification BANT:
 *  - Budget    → fourchette
 *  - Authority → decideur / influenceur / utilisateur
 *  - Need      → besoin identifie + urgence
 *  - Timeline  → delai de decision
 *
 * Route vers le user si qualifie (score BANT >= 70/100).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Reply classification ───────────────────────────────────────────

const REPLY_CATEGORIES = {
  positive: {
    label: 'Positive',
    keywords: [
      /int[eé]ress/i, /pourquoi pas/i, /dites.?m.?en plus/i, /j.?aimerais/i,
      /volontiers/i, /super/i, /parfait/i, /ok pour/i, /on peut/i,
      /quand .*(dispon|libre)/i, /cr[eé]neau/i, /rdv/i, /call/i,
      /je veux/i, /allons-y/i, /go/i, /banco/i, /envoye/i
    ],
    action: 'qualify',
    stopSequence: true,
    priority: 'high'
  },
  question: {
    label: 'Question',
    keywords: [
      /combien/i, /quel.*prix/i, /tarif/i, /comment.*march/i,
      /c.?est quoi/i, /pouvez.?vous.*expliquer/i, /en quoi/i,
      /diff[eé]rence/i, /par rapport/i, /fonctionn/i,
      /quelle.*garantie/i, /r[eé]sultat/i, /example/i, /t[eé]moignage/i
    ],
    action: 'answer',
    stopSequence: true,
    priority: 'medium'
  },
  objection: {
    label: 'Objection',
    keywords: [
      /pas.*budget/i, /trop cher/i, /pas.*moment/i, /d[eé]j[aà].*fournisseur/i,
      /pas.*besoin/i, /pas.*int[eé]ress/i, /on.*d[eé]j[aà]/i, /on utilise/i,
      /pas.*priorit/i, /plus tard/i, /rappel.*dans/i, /pas.*d[eé]cideur/i,
      /faut.*que.*j.*en.*parle/i, /comit[eé]/i, /pas.*convaincu/i,
      /concurrent/i, /on.*a.*choisi/i, /en.*contrat/i
    ],
    action: 'handle_objection',
    stopSequence: true,
    priority: 'medium'
  },
  negative: {
    label: 'Negative',
    keywords: [
      /arr[eê]te/i, /stop/i, /d[eé]sinscri/i, /ne.*m.*[eé]criv/i,
      /spam/i, /harcel/i, /rgpd/i, /supprim/i, /bloqu/i,
      /jamais/i, /aucun.*int[eé]r[eê]t/i, /foutez.?moi.*paix/i,
      /ne.*contactez.*plus/i, /retirez/i, /enlev/i
    ],
    action: 'stop_and_suppress',
    stopSequence: true,
    priority: 'critical'
  },
  ooo: {
    label: 'Absent / OOO',
    keywords: [
      /absent/i, /cong[eé]/i, /vacance/i, /out.*of.*office/i,
      /indisponible/i, /de.*retour.*le/i, /sera.*de.*retour/i,
      /r[eé]ponse.*automatique/i, /auto-?reply/i, /hors.*bureau/i
    ],
    action: 'reschedule',
    stopSequence: false,
    priority: 'low'
  }
}

// ─── Objection playbook (20+) ───────────────────────────────────────

const OBJECTION_PLAYBOOK = [
  {
    id: 'no_budget',
    pattern: /pas.*budget|trop.*cher|co[uû]t|prix.*[eé]lev/i,
    response: `Je comprends la question du budget. En fait, {solution} se rentabilise generalement en {delai} grace a {benefice}. Et si on regardait ensemble le ROI concret sur 3 mois ? Ca ne prend que 10 min.`,
    category: 'budget'
  },
  {
    id: 'bad_timing',
    pattern: /pas.*moment|plus.*tard|pas.*priorit|dans.*quelques.*mois/i,
    response: `Aucun souci, le timing est important. Je me permets de noter de revenir vers vous dans {delai}. En attendant, je vous envoie {ressource} qui pourrait vous etre utile — sans engagement.`,
    category: 'timing'
  },
  {
    id: 'has_provider',
    pattern: /d[eé]j[aà].*fournisseur|on.*utilise|on.*a.*d[eé]j[aà]|en.*contrat/i,
    response: `Tout a fait, et c'est normal d'avoir deja une solution en place. La question n'est pas de remplacer, mais de voir si {avantage_differentiel}. Beaucoup de nos clients utilisaient {concurrent_type} avant. 5 min pour comparer ?`,
    category: 'competition'
  },
  {
    id: 'no_need',
    pattern: /pas.*besoin|on.*n.*a.*pas|ca.*ne.*nous/i,
    response: `Je comprends. En fait, c'est exactement ce que nous disaient {reference} avant de decouvrir que {insight}. Pas de pression — je vous envoie juste un cas concret similaire a votre situation.`,
    category: 'need'
  },
  {
    id: 'not_decider',
    pattern: /pas.*d[eé]cideur|faut.*que.*j.*en.*parle|mon.*responsable|comit[eé]/i,
    response: `Bien sur, c'est normal de consulter en equipe. Je peux vous envoyer un document de synthese que vous pourrez partager ? Ca facilite souvent la discussion interne.`,
    category: 'authority'
  },
  {
    id: 'send_info',
    pattern: /envoyez.*info|envoyez.*doc|plus.*d.*info/i,
    response: `Avec plaisir ! Je vous envoie {document} adapte a votre situation. Par curiosite, quel est votre principal defi en ce moment sur {sujet} ?`,
    category: 'interest'
  },
  {
    id: 'no_time',
    pattern: /pas.*temps|tr[eè]s.*occup|surcharg/i,
    response: `Je comprends parfaitement. Un call de 10 minutes maximum — je chronometre. Quel creneau vous arrangerait cette semaine ? Meme 8h ou 18h si c'est plus simple.`,
    category: 'timing'
  },
  {
    id: 'how_you_found_me',
    pattern: /comment.*trouv|o[uù].*trouv.*mon|d.*o[uù].*venez/i,
    response: `Bonne question ! J'ai decouvert {entreprise} via {signal_source}. {signal_context}. C'est ce qui m'a donne envie de vous contacter.`,
    category: 'trust'
  },
  {
    id: 'too_small',
    pattern: /trop.*petit|pas.*assez.*grand|petite.*structure/i,
    response: `Justement ! {solution} est concu pour les structures de votre taille. Nos meilleurs resultats viennent d'entreprises de {taille_min} a {taille_max} personnes.`,
    category: 'fit'
  },
  {
    id: 'bad_experience',
    pattern: /mauvaise.*exp[eé]rience|d[eé][cç]u|arnaque|essay[eé].*avant/i,
    response: `Je suis desole pour cette experience. C'est justement pour ca qu'on propose {garantie}. On peut commencer par un test gratuit pour que vous jugiez par vous-meme ?`,
    category: 'trust'
  },
  {
    id: 'working_fine',
    pattern: /[cç]a.*marche.*bien|satisfait|content.*de|pas.*de.*probl[eè]me/i,
    response: `Tant mieux si ca fonctionne bien ! La question est : pourriez-vous obtenir {X}% de plus avec {solution} ? Nos clients qui etaient satisfaits de leur solution precedente ont vu {stat}. Ca vaut le coup de regarder ?`,
    category: 'complacency'
  },
  {
    id: 'results_guarantee',
    pattern: /garanti|r[eé]sultat.*assur|promesse|certitude/i,
    response: `On ne fait pas de promesses en l'air. Voici ce qu'on garantit : {garantie_specifique}. Et si on n'atteint pas {objectif}, {consequence}. C'est dans le contrat.`,
    category: 'trust'
  },
  {
    id: 'referral',
    pattern: /pas.*moi|colleg|quelqu.*d.*autre|transf[eé]r/i,
    response: `Merci pour la redirection ! Qui serait la bonne personne a contacter ? Je me permets de mentionner notre echange pour faciliter la prise de contact.`,
    category: 'authority'
  },
  {
    id: 'competitor_locked',
    pattern: /engag[eé]|contrat.*en.*cours|jusqu.*[aà]|fin.*de.*contrat/i,
    response: `Je comprends. Votre contrat se termine quand ? Je peux revenir vers vous 2 mois avant pour que vous ayez le temps de comparer sereinement. En attendant, {ressource_gratuite}.`,
    category: 'competition'
  },
  {
    id: 'internal_solution',
    pattern: /en.*interne|on.*fait.*nous|notre.*[eé]quipe/i,
    response: `C'est une approche courante. La question est souvent celle du temps : combien d'heures par semaine votre equipe y consacre ? {solution} libere {heures}h/semaine pour {activite_strategique}.`,
    category: 'competition'
  },
  {
    id: 'too_complex',
    pattern: /compliqu[eé]|complexe|lour|difficile.*[aà].*mettre/i,
    response: `C'est une preoccupation legitime. En realite, la mise en place prend {delai_setup}. On s'occupe de tout : migration, configuration, formation. Vos equipes sont operationnelles en {delai}.`,
    category: 'implementation'
  },
  {
    id: 'need_references',
    pattern: /r[eé]f[eé]rence|client.*similaire|t[eé]moignage|cas.*client/i,
    response: `Bien sur ! Voici {nombre} cas clients dans votre secteur : {reference_1} ({resultat_1}), {reference_2} ({resultat_2}). Je peux aussi organiser un echange direct avec l'un d'eux.`,
    category: 'trust'
  },
  {
    id: 'data_security',
    pattern: /donn[eé]es|s[eé]curit[eé]|rgpd|confidentialit[eé]|h[eé]berg/i,
    response: `Question essentielle. Nos donnees sont hebergees en {localisation}, conformes RGPD. On a {certification}. Je peux vous envoyer notre documentation securite ?`,
    category: 'security'
  },
  {
    id: 'free_trial',
    pattern: /essai.*gratuit|test.*gratuit|d[eé]mo|version.*d.*essai/i,
    response: `Exactement ce que j'allais proposer ! On offre {duree_essai} gratuit, sans carte bancaire. Ca vous permet de tester avec vos propres donnees. Je vous cree un acces ?`,
    category: 'commitment'
  },
  {
    id: 'generic_no',
    pattern: /non.*merci|pas.*pour.*nous|d[eé]clin/i,
    response: `Pas de probleme, je respecte ca. Juste par curiosite : c'est un sujet de timing, de budget, ou autre chose ? Ca m'aide a mieux comprendre votre marche.`,
    category: 'generic'
  }
]

// ─── Classify reply (callable) ──────────────────────────────────────

export const classifyAndRespond = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '256MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectId, replyText, channel } = request.data || {}
  if (!orgId || !prospectId || !replyText) {
    throw new HttpsError('invalid-argument', 'orgId, prospectId et replyText requis')
  }

  const db = getDb()
  const result = await processReply(db, orgId, prospectId, replyText, channel)

  return { success: true, ...result }
})

// ─── Core: process a reply ──────────────────────────────────────────

export async function processReply(db, orgId, prospectId, replyText, channel) {
  // Load prospect
  const prospectSnap = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()

  if (!prospectSnap.exists) {
    return { error: 'Prospect non trouve' }
  }

  const prospect = { id: prospectSnap.id, ...prospectSnap.data() }

  // Classify the reply
  const classification = classifyReply(replyText)

  // Log the inbound interaction
  await db.collection('organizations').doc(orgId).collection('interactions').add({
    prospectId,
    channel: channel || 'email',
    direction: 'inbound',
    type: 'reply',
    body: replyText.substring(0, 2000),
    classification: classification.category,
    classificationLabel: classification.label,
    createdAt: FieldValue.serverTimestamp()
  })

  // Pause any active sniper sequence
  if (classification.stopSequence) {
    await pauseActiveSequences(db, orgId, prospectId, `reply_${classification.category}`)
  }

  // Generate response based on classification
  const response = await generateResponse(db, orgId, prospect, replyText, classification)

  // Log the classification
  await db.collection('organizations').doc(orgId).collection('alexActionLogs').add({
    action: 'qualification_bot',
    prospectId,
    replyText: replyText.substring(0, 500),
    classification: classification.category,
    objectionId: classification.objectionId || null,
    responseGenerated: !!response,
    channel,
    createdAt: FieldValue.serverTimestamp()
  })

  return {
    classification,
    response,
    prospectStatus: getNewStatus(classification)
  }
}

// ─── Reply classification (keyword-based, fast) ─────────────────────

export function classifyReply(replyText) {
  const text = replyText.toLowerCase().trim()

  // Check each category's keywords
  for (const [category, config] of Object.entries(REPLY_CATEGORIES)) {
    for (const pattern of config.keywords) {
      if (pattern.test(text)) {
        // For objections, also identify the specific objection
        let objectionId = null
        let objectionResponse = null

        if (category === 'objection') {
          const match = matchObjection(text)
          if (match) {
            objectionId = match.id
            objectionResponse = match.response
          }
        }

        return {
          category,
          label: config.label,
          action: config.action,
          stopSequence: config.stopSequence,
          priority: config.priority,
          confidence: 'keyword',
          objectionId,
          objectionResponse
        }
      }
    }
  }

  // Default: treat as question (safest assumption)
  return {
    category: 'question',
    label: 'Question',
    action: 'answer',
    stopSequence: true,
    priority: 'medium',
    confidence: 'default'
  }
}

// ─── Objection matching ─────────────────────────────────────────────

function matchObjection(text) {
  for (const objection of OBJECTION_PLAYBOOK) {
    if (objection.pattern.test(text)) {
      return objection
    }
  }
  return null
}

// ─── Response generation ────────────────────────────────────────────

async function generateResponse(db, orgId, prospect, replyText, classification) {
  // Load org context for variable substitution
  const profileSnap = await db.collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile').get()
  const profile = profileSnap.exists ? profileSnap.data() : {}

  const vars = buildResponseVars(prospect, profile)

  switch (classification.category) {
    case 'positive':
      return {
        type: 'qualification',
        message: renderTemplate(POSITIVE_RESPONSE, vars),
        nextAction: 'Send qualification questions',
        qualification: {
          questions: [
            `Quel est votre principal objectif avec ${vars.sujet} pour les 3 prochains mois ?`,
            `Vous avez deja un budget defini pour ce type de projet ?`,
            `Qui d'autre dans votre equipe serait implique dans la decision ?`
          ]
        }
      }

    case 'question':
      return {
        type: 'answer',
        message: renderTemplate(QUESTION_RESPONSE, vars),
        nextAction: 'Answer the specific question',
        note: 'Repondre a la question specifique puis relancer avec une question de qualification'
      }

    case 'objection':
      if (classification.objectionResponse) {
        return {
          type: 'objection_handling',
          message: renderTemplate(classification.objectionResponse, vars),
          objectionId: classification.objectionId,
          nextAction: 'Send objection response'
        }
      }
      return {
        type: 'objection_handling',
        message: renderTemplate(GENERIC_OBJECTION_RESPONSE, vars),
        nextAction: 'Handle objection manually'
      }

    case 'negative':
      // Update prospect status and suppress
      await db.collection('organizations').doc(orgId)
        .collection('prospects').doc(prospect.id)
        .update({
          status: 'lost',
          lostReason: 'negative_reply',
          lostAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        })
      return {
        type: 'suppression',
        message: renderTemplate(NEGATIVE_RESPONSE, vars),
        nextAction: 'Remove from all sequences and suppress'
      }

    case 'ooo':
      return {
        type: 'reschedule',
        message: null,
        nextAction: 'Reschedule sequence for return date',
        note: 'Extraire la date de retour et reprogrammer'
      }

    default:
      return null
  }
}

// ─── Response templates ─────────────────────────────────────────────

const POSITIVE_RESPONSE = `Merci {prenom} ! Super de vous lire.

Pour bien preparer notre echange, j'ai 2 questions rapides :
1. Quel est votre principal defi sur {sujet} en ce moment ?
2. Vous avez un timing en tete (ce mois-ci, ce trimestre) ?

Ensuite je vous propose un creneau de 15 min. Quel jour vous arrange ?`

const QUESTION_RESPONSE = `Bonne question {prenom} !

{answer_placeholder}

Par curiosite : c'est un sujet que vous explorez pour bientot ou plutot a moyen terme ?`

const GENERIC_OBJECTION_RESPONSE = `Je comprends {prenom}, c'est une remarque pertinente.

En fait, {solution} est concu justement pour repondre a ce type de preoccupation. On peut en discuter 10 min pour que je vous montre concretement ?`

const NEGATIVE_RESPONSE = `Merci pour votre franchise {prenom}. Je respecte votre decision et je retire votre contact de notre liste.

Si jamais le sujet revient un jour, n'hesitez pas. Bonne continuation !`

// ─── Qualification scoring (BANT) ───────────────────────────────────

export function qualifyFromConversation(answers) {
  let score = 0
  const qualification = {
    budget: { score: 0, detail: null },
    authority: { score: 0, detail: null },
    need: { score: 0, detail: null },
    timeline: { score: 0, detail: null }
  }

  // Budget (0-25)
  if (answers.budget) {
    const budget = answers.budget.toLowerCase()
    if (/defini|allou[eé]|pr[eé]vu/i.test(budget)) {
      qualification.budget = { score: 25, detail: 'Budget defini' }
    } else if (/en.*discussion|pas.*encore|a.*definir/i.test(budget)) {
      qualification.budget = { score: 15, detail: 'Budget en discussion' }
    } else if (/pas.*de.*budget|zero|rien/i.test(budget)) {
      qualification.budget = { score: 5, detail: 'Pas de budget' }
    } else {
      qualification.budget = { score: 10, detail: 'Budget inconnu' }
    }
    score += qualification.budget.score
  }

  // Authority (0-25)
  if (answers.authority) {
    const auth = answers.authority.toLowerCase()
    if (/je.*d[eé]cide|c.*est.*moi|patron|dirigeant|g[eé]rant/i.test(auth)) {
      qualification.authority = { score: 25, detail: 'Decideur' }
    } else if (/influence|recommand|pr[eé]sente|propose/i.test(auth)) {
      qualification.authority = { score: 15, detail: 'Influenceur' }
    } else if (/utilisateur|op[eé]rationnel/i.test(auth)) {
      qualification.authority = { score: 10, detail: 'Utilisateur' }
    } else {
      qualification.authority = { score: 10, detail: 'Role inconnu' }
    }
    score += qualification.authority.score
  }

  // Need (0-25)
  if (answers.need) {
    const need = answers.need.toLowerCase()
    if (/urgent|critique|maintenant|tout.*de.*suite/i.test(need)) {
      qualification.need = { score: 25, detail: 'Besoin urgent' }
    } else if (/important|priorit|bient[oô]t/i.test(need)) {
      qualification.need = { score: 20, detail: 'Besoin important' }
    } else if (/int[eé]ress|curieux|explorer/i.test(need)) {
      qualification.need = { score: 10, detail: 'En exploration' }
    } else {
      qualification.need = { score: 5, detail: 'Besoin flou' }
    }
    score += qualification.need.score
  }

  // Timeline (0-25)
  if (answers.timeline) {
    const timeline = answers.timeline.toLowerCase()
    if (/cette.*semaine|maintenant|asap|urgent/i.test(timeline)) {
      qualification.timeline = { score: 25, detail: 'Immediat' }
    } else if (/ce.*mois|dans.*les.*30.*jours/i.test(timeline)) {
      qualification.timeline = { score: 20, detail: 'Ce mois-ci' }
    } else if (/ce.*trimestre|2.*3.*mois/i.test(timeline)) {
      qualification.timeline = { score: 15, detail: 'Ce trimestre' }
    } else if (/cette.*ann[eé]e|6.*mois/i.test(timeline)) {
      qualification.timeline = { score: 10, detail: 'Cette annee' }
    } else {
      qualification.timeline = { score: 5, detail: 'Pas de timeline' }
    }
    score += qualification.timeline.score
  }

  const isQualified = score >= 70

  return {
    score,
    isQualified,
    tier: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
    qualification,
    recommendation: isQualified
      ? 'Lead qualifie — transferer au commercial IMMEDIATEMENT'
      : score >= 50
        ? 'Lead tiede — continuer le nurturing'
        : 'Lead froid — mettre en pipeline long terme'
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function pauseActiveSequences(db, orgId, prospectId, reason) {
  const seqSnap = await db.collection('organizations').doc(orgId)
    .collection('sniperSequences')
    .where('prospectId', '==', prospectId)
    .where('status', '==', 'active')
    .get()

  const batch = db.batch()
  for (const doc of seqSnap.docs) {
    batch.update(doc.ref, {
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      pauseReason: reason,
      updatedAt: FieldValue.serverTimestamp()
    })
  }
  if (!seqSnap.empty) await batch.commit()
}

function getNewStatus(classification) {
  switch (classification.category) {
    case 'positive': return 'responded'
    case 'question': return 'responded'
    case 'objection': return 'responded'
    case 'negative': return 'lost'
    case 'ooo': return 'contacted'
    default: return 'contacted'
  }
}

function buildResponseVars(prospect, profile) {
  return {
    prenom: prospect.firstName || prospect.fullName?.split(' ')[0] || '',
    entreprise: prospect.companyName || prospect.businessName || '',
    solution: profile.service || profile.offer || 'notre solution',
    sujet: profile.niche || profile.sector || 'ce sujet',
    signal_source: prospect.signal_detail || 'notre recherche',
    signal_context: prospect.signal_detail || '',
    concurrent_type: 'leur solution precedente',
    reference: profile.reference || 'plusieurs entreprises de votre secteur',
    avantage_differentiel: 'vous pourriez obtenir de meilleurs resultats',
    garantie: 'un essai gratuit sans engagement',
    garantie_specifique: 'des resultats mesurables sous 30 jours',
    delai: '2-3 mois',
    delai_setup: 'moins d\'une semaine',
    benefice: 'l\'acquisition de nouveaux clients',
    ressource: 'un guide gratuit',
    ressource_gratuite: 'un audit gratuit',
    taille_min: '1', taille_max: '50',
    localisation: 'France (OVH)',
    certification: 'conformite RGPD',
    duree_essai: '14 jours',
    heures: '5',
    activite_strategique: 'la croissance',
    nombre: '50',
    stat: '+35% de resultats en moyenne',
    objectif: 'les objectifs fixes',
    consequence: 'on prolonge gratuitement',
    answer_placeholder: '',
    document: 'un resume complet',
    X: '30',
    reference_1: 'Client A', resultat_1: '+40% en 3 mois',
    reference_2: 'Client B', resultat_2: 'ROI positif en 6 semaines'
  }
}

function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== '' ? vars[key] : match
  })
}
