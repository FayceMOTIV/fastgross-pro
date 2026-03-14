/**
 * Signal-Based Email — Super Pouvoir 1 (Alex V4)
 * Generates hyper-personalized emails referencing the EXACT signal that
 * triggered the outreach. Each signal type has 5 templates.
 *
 * Supported signal types:
 *  - new_domain       → Felicitations pour le lancement
 *  - reddit_intent     → J'ai lu votre post
 *  - google_maps       → Votre entreprise sur Google Maps
 *  - missing_tech      → Observation technique
 *  - job_posting       → Votre recrutement
 *
 * Rules:
 *  - 4-6 lines MAX per email
 *  - ONE idea, ONE signal, ONE CTA (question, not "book a demo")
 *  - French language
 *  - No salesy tone
 *  - Template selection based on signal sub-type and prospect data
 *
 * Can be used standalone or via IA personalization (Groq/Claude) for
 * deeper customization of the template variables.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { canSendSafely } from '../safety/preSendSafetyGateway.js'
import { validateEmailContent } from '../safety/antiSpamContentGuard.js'
import { appendUnsubscribeFooter } from '../compliance/rgpdEngine.js'

const getDb = () => getFirestore()

// ─── Template Registry ──────────────────────────────────────────────

const SIGNAL_TEMPLATES = {

  // ═══════════════════════════════════════════════════════════════════
  // NEW DOMAIN — Prospects from Module 1
  // ═══════════════════════════════════════════════════════════════════
  new_domain: [
    {
      id: 'nd_launch',
      name: 'Felicitations lancement',
      subject: 'Felicitations pour le lancement de {domain} !',
      body: `Bonjour {prenom},

J'ai vu que {domain} vient d'etre cree. Les entreprises de {niche} qui demarrent ont generalement 3 priorites : visibilite en ligne, premiers clients, et credibilite.

On aide des {niche} a {resultat} des les premieres semaines.

Est-ce que la visibilite est un sujet pour vous en ce moment ?`,
      when: 'default'
    },
    {
      id: 'nd_nosite',
      name: 'Pas encore de site',
      subject: '{domain} — votre site est en construction ?',
      body: `Bonjour {prenom},

J'ai remarque que {domain} est enregistre mais pas encore en ligne. C'est souvent le moment ou on se pose la question : par quoi commencer ?

On a aide +{nombre} {niche} a lancer leur presence web en moins de 2 semaines.

Vous avez deja un plan pour votre site ?`,
      when: (prospect) => !prospect.hasWebsite || prospect.httpStatus !== 200
    },
    {
      id: 'nd_tech',
      name: 'Observation technique',
      subject: 'Un detail sur {domain}',
      body: `Bonjour {prenom},

En visitant {domain}, j'ai remarque que le site est sur {tech} mais sans {missing}. Pour un {niche}, c'est souvent le premier levier de croissance.

Ca vous dirait un mini-audit gratuit de 5 min ?`,
      when: (prospect) => prospect.techStack?.cms && prospect.techSignals?.length > 0
    },
    {
      id: 'nd_fr',
      name: 'Domaine .fr',
      subject: 'Bienvenue dans le {niche} francais !',
      body: `Bonjour {prenom},

J'ai vu le lancement de {domain} — le .fr est un excellent choix pour le marche francais.

Les {niche} qui demarrent avec une bonne strategie locale ont 3x plus de chances de percer la premiere annee.

Vous avez deja reflechi a votre strategie d'acquisition clients ?`,
      when: (prospect) => prospect.tld === 'fr'
    },
    {
      id: 'nd_speed',
      name: 'Rapidite reaction',
      subject: '{domain} vient de naitre — une idee pour vous',
      body: `Bonjour {prenom},

Votre domaine {domain} a ete enregistre il y a {age} jours. Je me permets de vous ecrire maintenant car les 30 premiers jours sont critiques pour poser les bases.

Une question rapide : quel est votre objectif numero 1 pour les 3 prochains mois ?`,
      when: (prospect) => prospect.domainAge <= 3
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // REDDIT INTENT — Prospects from Module 3
  // ═══════════════════════════════════════════════════════════════════
  reddit_intent: [
    {
      id: 'ri_direct',
      name: 'Reponse directe au post',
      subject: 'J\'ai lu votre post sur r/{subreddit}',
      body: `Bonjour {prenom},

J'ai vu votre message sur r/{subreddit} ou vous mentionnez {probleme_exact}. C'est un point de douleur que beaucoup de {persona} rencontrent.

On a construit {solution} specifiquement pour ca — {resultat_concret}.

Ca vaudrait le coup d'en discuter 10 min ?`,
      when: 'default'
    },
    {
      id: 'ri_alternative',
      name: 'Alternative au concurrent',
      subject: 'A propos de {concurrent} — une alternative',
      body: `Bonjour {prenom},

J'ai vu que vous cherchez une alternative a {concurrent}. On entend ca souvent — les principales frustrations sont {frustrations}.

{solution} regle exactement ces points, et {avantage_cle}.

Vous voulez que je vous montre la difference en 5 min ?`,
      when: (prospect) => prospect.intentCategory === 'burning' || prospect.intentCategory === 'very_hot'
    },
    {
      id: 'ri_recommend',
      name: 'Recommandation',
      subject: 'Suite a votre question sur r/{subreddit}',
      body: `Bonjour {prenom},

J'ai vu que vous demandiez des recommandations pour {categorie} sur Reddit. Plutot que de vous vendre quoi que ce soit, voici 3 criteres a verifier :

1. {critere_1}
2. {critere_2}
3. {critere_3}

Si vous voulez, je peux vous faire un comparatif rapide gratuit.`,
      when: (prospect) => prospect.intentCategory === 'warm'
    },
    {
      id: 'ri_frustrated',
      name: 'Empathie frustration',
      subject: 'Je comprends votre frustration',
      body: `Bonjour {prenom},

J'ai lu votre retour sur r/{subreddit} — la frustration avec {probleme} est reelle et vous n'etes pas seul.

On a travaille avec {nombre} {persona} qui avaient exactement ce probleme. La solution a ete {solution_courte}.

Ca vous parle ?`,
      when: (prospect) => prospect.intentCategory === 'hot'
    },
    {
      id: 'ri_urgent',
      name: 'Reponse rapide (< 3h)',
      subject: 'Re: votre recherche de {categorie}',
      body: `Bonjour {prenom},

Je viens de voir votre post (il y a {heures}h). Avant que vous ne soyez submerge de propositions, voici mon meilleur conseil gratuit : {conseil}.

Si vous voulez aller plus loin, je suis dispo pour un call de 10 min aujourd'hui.`,
      when: (prospect) => prospect.intentFreshness === 'very_fresh'
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // GOOGLE MAPS — Prospects from Module 5
  // ═══════════════════════════════════════════════════════════════════
  google_maps: [
    {
      id: 'gm_nosite',
      name: 'Pas de site web',
      subject: '{entreprise} merite d\'etre visible en ligne',
      body: `Bonjour {prenom},

J'ai vu {entreprise} sur Google Maps — {avis} avis avec une note de {note}/5, c'est solide.

Mais sans site web, vous perdez les clients qui vous cherchent sur Google. 70% des gens verifient le site avant de se deplacer.

Vous avez deja pense a creer un site simple ?`,
      when: (prospect) => prospect.signal_type === 'no_website'
    },
    {
      id: 'gm_lowreviews',
      name: 'Peu d\'avis',
      subject: '{entreprise} — une idee pour plus de clients',
      body: `Bonjour {prenom},

J'ai vu {entreprise} sur Google Maps. Votre activite a l'air top, mais avec {avis} avis seulement, vous etes invisible face aux concurrents qui en ont 50+.

On aide des {niche} a passer de {avis} a 50+ avis en 3 mois, sans rien demander a vos clients.

Ca vous interesse ?`,
      when: (prospect) => prospect.signal_type === 'low_reviews'
    },
    {
      id: 'gm_lowrating',
      name: 'Note faible',
      subject: '{entreprise} — un levier pour ameliorer votre note',
      body: `Bonjour {prenom},

J'ai vu {entreprise} sur Google Maps avec une note de {note}/5. Les clients potentiels hesitent souvent en dessous de 4.0.

Bonne nouvelle : il existe des strategies simples pour remonter la note en quelques semaines, sans tricher.

Vous voulez que je vous partage les 3 leviers qui fonctionnent ?`,
      when: (prospect) => prospect.signal_type === 'low_rating'
    },
    {
      id: 'gm_competitor',
      name: 'Concurrent mal note',
      subject: 'Les clients de {concurrent} cherchent des alternatives',
      body: `Bonjour {prenom},

J'ai analyse les avis Google de {concurrent} dans votre zone — beaucoup de clients se plaignent de {probleme_frequent}.

C'est une opportunite : ces clients cherchent activement une alternative. Avec la bonne strategie, vous pouvez les capter.

Ca vous dirait d'en discuter ?`,
      when: (prospect) => prospect.signal_type === 'competitor_user'
    },
    {
      id: 'gm_phone',
      name: 'Contact direct (telephone dispo)',
      subject: 'Question rapide pour {entreprise}',
      body: `Bonjour {prenom},

J'ai decouvert {entreprise} sur Google Maps et j'ai ete impressionne par {element_positif}. J'ai essaye de vous appeler mais je prefere ne pas vous deranger.

J'ai une idee qui pourrait vous aider a {objectif}. Ca prend 5 min a expliquer.

Quel serait le meilleur moment pour en discuter ?`,
      when: (prospect) => prospect.phone || prospect.channels?.phone
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // MISSING TECH — Prospects from Module 4
  // ═══════════════════════════════════════════════════════════════════
  missing_tech: [
    {
      id: 'mt_generic',
      name: 'Stack manquante generique',
      subject: 'J\'ai remarque quelque chose sur {domain}',
      body: `Bonjour {prenom},

En visitant {domain} j'ai note que vous n'utilisez pas de {outil_manquant}. Les {niche} qui ajoutent un {outil_manquant} voient en moyenne +{stat}% de {metrique}.

C'est un quick win qui prend souvent moins d'une semaine a mettre en place.

C'est quelque chose que vous avez envisage ?`,
      when: 'default'
    },
    {
      id: 'mt_noseo',
      name: 'WordPress sans SEO',
      subject: 'Votre WordPress manque un element cle',
      body: `Bonjour {prenom},

J'ai visite {domain} — votre site WordPress est bien construit, mais il manque un plugin SEO (Yoast, RankMath...).

Sans ca, Google ne comprend pas bien votre contenu et vous perdez du trafic gratuit. La mise en place prend 30 minutes.

Vous voulez que je vous envoie un guide rapide ?`,
      when: (prospect) => prospect.techSignals?.some(s => s.type === 'wordpress_no_seo')
    },
    {
      id: 'mt_noanalytics',
      name: 'Pas d\'analytics',
      subject: '{domain} — vous volez a l\'aveugle',
      body: `Bonjour {prenom},

En regardant {domain}, j'ai remarque qu'il n'y a aucun outil de suivi (Google Analytics, Matomo, etc.).

Ca veut dire que vous ne savez pas combien de visiteurs vous avez, d'ou ils viennent, ni ce qu'ils font sur votre site. C'est comme conduire sans tableau de bord.

Ca vous dirait un setup gratuit en 15 min ?`,
      when: (prospect) => prospect.techSignals?.some(s => s.type === 'no_analytics')
    },
    {
      id: 'mt_competitor_tool',
      name: 'Utilise outil concurrent',
      subject: 'Vous utilisez {concurrent} — une question',
      body: `Bonjour {prenom},

J'ai vu que {domain} utilise {concurrent}. Beaucoup de {niche} nous disent que {frustration_commune}.

On a cree {solution} qui regle exactement ca, avec en plus {avantage}.

Vous seriez ouvert a un comparatif rapide ?`,
      when: (prospect) => prospect.techSignals?.some(s => s.type === 'uses_competitor')
    },
    {
      id: 'mt_nochat',
      name: 'Pas de chat widget',
      subject: 'Vos visiteurs repartent sans vous parler',
      body: `Bonjour {prenom},

J'ai visite {domain} et j'ai remarque qu'il n'y a pas de chat en ligne. Les sites avec un chat convertissent en moyenne 3x plus que ceux sans.

Un chatbot simple peut repondre aux questions courantes 24h/24 et capter des leads pendant que vous dormez.

C'est un sujet qui vous interesse ?`,
      when: (prospect) => prospect.techSignals?.some(s => s.type === 'no_chat')
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // JOB POSTING — Prospects from Module 2 (future)
  // ═══════════════════════════════════════════════════════════════════
  job_posting: [
    {
      id: 'jp_growth',
      name: 'Recrutement growth/marketing',
      subject: 'Votre recrutement {poste} — une idee',
      body: `Bonjour {prenom},

J'ai note que {entreprise} recrute un {poste}. Les equipes qui scalent le marketing rencontrent souvent un probleme : les premiers mois sont improductifs sans les bons outils.

On peut {solution} pour que la personne soit productive des J1.

C'est un sujet pour vous ?`,
      when: (prospect) => /market|growth|acqui|brand/i.test(prospect.jobTitle || '')
    },
    {
      id: 'jp_sales',
      name: 'Recrutement commercial',
      subject: '{entreprise} recrute un {poste} — un outil qui change tout',
      body: `Bonjour {prenom},

J'ai vu que {entreprise} cherche un {poste}. Quand on scale une equipe commerciale, le plus gros challenge c'est l'outillage et les process.

On aide des equipes sales a {resultat} — ca pourrait accelerer votre recrutement.

Vous avez 10 min cette semaine ?`,
      when: (prospect) => /sales|commercial|business.dev|account/i.test(prospect.jobTitle || '')
    },
    {
      id: 'jp_tech',
      name: 'Recrutement tech/dev',
      subject: '{entreprise} scale sa tech — une reflexion',
      body: `Bonjour {prenom},

J'ai vu que {entreprise} recrute un {poste}. Quand on scale l'equipe tech, les couts d'infrastructure explosent souvent.

On aide des entreprises comme la votre a {solution}.

Ca vaut le coup d'en discuter 10 min ?`,
      when: (prospect) => /dev|engineer|cto|tech|devops|infra/i.test(prospect.jobTitle || '')
    },
    {
      id: 'jp_generic',
      name: 'Recrutement generique',
      subject: '{entreprise} grandit — felicitations',
      body: `Bonjour {prenom},

J'ai vu que {entreprise} recrute. C'est toujours un bon signe de croissance.

Quand les equipes grandissent, les besoins en {domaine} evoluent aussi. On accompagne des {niche} dans cette phase.

C'est un sujet qui resonne avec vous en ce moment ?`,
      when: 'default'
    },
    {
      id: 'jp_executive',
      name: 'Recrutement dirigeant',
      subject: '{entreprise} recrute un {poste} — le bon moment pour optimiser',
      body: `Bonjour {prenom},

J'ai vu que {entreprise} cherche un {poste}. Les transitions de leadership sont souvent le moment ideal pour revoir les outils et process.

On a aide +{nombre} entreprises a optimiser leur {domaine} pendant ce type de transition.

Vous voulez qu'on en discute ?`,
      when: (prospect) => /head|director|vp|chief|lead|manager/i.test(prospect.jobTitle || '')
    }
  ]
}

// ─── Main: generate signal-based email ──────────────────────────────

export const generateSignalEmail = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '256MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { orgId, prospectId, signalType, templateId, customVars } = request.data || {}
  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  }
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const result = await generateEmail(db, orgId, prospectId, signalType, templateId, customVars)

  return { success: true, ...result }
})

// ─── Core generation ────────────────────────────────────────────────

export async function generateEmail(db, orgId, prospectId, signalType, templateId, customVars) {
  // Load prospect
  const prospectSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)
    .get()

  if (!prospectSnap.exists) {
    throw new HttpsError('not-found', 'Prospect non trouve')
  }

  const prospect = { id: prospectSnap.id, ...prospectSnap.data() }

  // Load org context for variables
  const profileSnap = await db
    .collection('organizations').doc(orgId)
    .collection('alexMemory').doc('businessProfile')
    .get()

  const profile = profileSnap.exists ? profileSnap.data() : {}

  // Determine signal type from prospect if not specified
  const effectiveSignalType = signalType || prospect.signal_type || detectSignalType(prospect)

  // Get templates for this signal type
  const templates = SIGNAL_TEMPLATES[effectiveSignalType]
  if (!templates) {
    throw new HttpsError('invalid-argument', `Signal type inconnu: ${effectiveSignalType}`)
  }

  // Select best template
  const template = templateId
    ? templates.find(t => t.id === templateId)
    : selectBestTemplate(templates, prospect)

  if (!template) {
    throw new HttpsError('not-found', 'Aucun template adapte trouve')
  }

  // Build variables
  const vars = buildVariables(prospect, profile, customVars)

  // Render template
  const renderedSubject = renderTemplate(template.subject, vars)
  const renderedBody = renderTemplate(template.body, vars)

  // Log generation
  await db.collection('organizations').doc(orgId).collection('alexActionLogs').add({
    action: 'signal_email_generated',
    prospectId,
    signalType: effectiveSignalType,
    templateId: template.id,
    templateName: template.name,
    createdAt: FieldValue.serverTimestamp()
  })

  return {
    subject: renderedSubject,
    body: renderedBody,
    templateId: template.id,
    templateName: template.name,
    signalType: effectiveSignalType,
    prospect: {
      id: prospect.id,
      name: prospect.fullName || prospect.companyName,
      email: prospect.email
    }
  }
}

// ─── Send signal email ──────────────────────────────────────────────

export async function sendSignalEmail(db, orgId, prospectId, signalType, templateId, customVars) {
  const emailData = await generateEmail(db, orgId, prospectId, signalType, templateId, customVars)

  // Load prospect for email address
  const prospectSnap = await db
    .collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)
    .get()

  const prospect = prospectSnap.data()
  if (!prospect.email) {
    return { success: false, error: 'Prospect sans adresse email' }
  }

  // Safety gateway check
  const safetyResult = await canSendSafely(orgId, prospectId, prospect.email, 'email')
  if (!safetyResult.allowed) {
    console.warn(`[SignalEmail] Blocked by safety: ${safetyResult.reasons.join(', ')}`)
    return { sent: false, reason: safetyResult.reasons.join(', ') }
  }

  // Touchpoint limiter check
  const { canAddTouchpoint, recordTouchpoint } = await import('../engine/touchpointLimiter.js')
  const tpCheck = await canAddTouchpoint(orgId, prospectId, 'email')
  if (!tpCheck.allowed) {
    return { skipped: true, reason: tpCheck.reason }
  }

  await validateEmailContent(emailData.subject, emailData.body)

  // Lazy import email router
  const { sendEmail } = await import('../email/emailRouter.js')

  const htmlBody = appendUnsubscribeFooter(formatEmailHtml(emailData.body), prospectId, 'prospects')

  await sendEmail({
    to: prospect.email,
    subject: emailData.subject,
    html: htmlBody,
    from: 'Alex <alex@facemedia.app>',
    orgId,
    prospectId
  })
  await recordTouchpoint(orgId, prospectId, 'email')

  // Update prospect status
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId)
    .update({
      status: 'contacted',
      lastContactedAt: FieldValue.serverTimestamp(),
      lastContactChannel: 'email',
      lastContactSignal: emailData.signalType,
      lastContactTemplate: emailData.templateId,
      updatedAt: FieldValue.serverTimestamp()
    })

  // Log interaction
  await db.collection('organizations').doc(orgId)
    .collection('interactions').add({
      prospectId,
      channel: 'email',
      direction: 'outbound',
      type: 'signal_email',
      subject: emailData.subject,
      body: emailData.body,
      signalType: emailData.signalType,
      templateId: emailData.templateId,
      createdAt: FieldValue.serverTimestamp()
    })

  return { success: true, emailData }
}

// ─── Template selection ─────────────────────────────────────────────

function selectBestTemplate(templates, prospect) {
  // Try conditional templates first (most specific → least specific)
  for (const template of templates) {
    if (typeof template.when === 'function' && template.when(prospect)) {
      return template
    }
  }

  // Fall back to default template
  const defaultTemplate = templates.find(t => t.when === 'default')
  return defaultTemplate || templates[0]
}

// ─── Variable building ──────────────────────────────────────────────

function buildVariables(prospect, profile, customVars) {
  return {
    // Prospect variables
    prenom: prospect.firstName || prospect.fullName?.split(' ')[0] || 'Bonjour',
    nom: prospect.lastName || prospect.fullName?.split(' ').slice(1).join(' ') || '',
    entreprise: prospect.companyName || prospect.businessName || prospect.company || '',
    domain: extractDomainName(prospect.website || prospect.websiteUrl || ''),
    email: prospect.email || '',
    poste: prospect.jobTitle || prospect.title || '',
    phone: prospect.phone || '',

    // Signal-specific
    niche: profile.niche || profile.sector || 'votre secteur',
    resultat: profile.valueProposition || 'obtenir plus de clients',
    solution: profile.service || profile.offer || 'notre solution',
    nombre: profile.clientCount || '50',
    persona: profile.targetPersona || 'professionnels',

    // Google Maps
    note: prospect.googleMapsRating || '',
    avis: prospect.googleMapsReviews || '0',
    element_positif: prospect.googleMapsRating >= 4
      ? `votre note de ${prospect.googleMapsRating}/5`
      : 'votre activite',

    // Reddit
    subreddit: prospect.redditSubreddit || '',
    probleme_exact: extractProblem(prospect),
    heures: prospect.intentFreshness === 'very_fresh' ? '2' : '12',
    concurrent: extractCompetitor(prospect),

    // Tech stack
    tech: prospect.techStack?.cms || prospect.techStack?.framework || 'votre stack',
    outil_manquant: extractMissingTool(prospect),
    missing: extractMissingTool(prospect),
    stat: '30',
    metrique: 'conversion',

    // Job posting
    departement: extractDepartment(prospect),
    domaine: profile.niche || 'votre domaine',

    // Domain
    age: prospect.domainAge || '7',

    // Generic
    frustrations: 'le manque de flexibilite et le support',
    avantage_cle: 'sans engagement et avec support reactif',
    frustration_commune: 'le manque de personnalisation',
    avantage: 'une mise en place en 24h',
    categorie: profile.niche || 'votre domaine',
    critere_1: 'La facilite d\'integration avec vos outils existants',
    critere_2: 'Le support client en francais',
    critere_3: 'La transparence des prix (pas de frais caches)',
    conseil: 'commencez par definir vos 3 criteres non-negociables',
    probleme_frequent: 'la lenteur et le manque de reactivite',
    objectif: 'obtenir plus de clients',
    solution_courte: 'de simplifier et automatiser le processus',
    resultat_concret: 'avec des resultats visibles en 2 semaines',

    // Custom overrides
    ...(customVars || {})
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== '' ? vars[key] : match
  })
}

function formatEmailHtml(body) {
  const paragraphs = body.split('\n\n').filter(p => p.trim())
  return paragraphs
    .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.5;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function detectSignalType(prospect) {
  if (prospect.source === 'new_domain_hunter') return 'new_domain'
  if (prospect.source === 'reddit_intent_hunter') return 'reddit_intent'
  if (prospect.source === 'google_maps_miner' || prospect.source === 'googlemaps_hunter') return 'google_maps'
  if (prospect.signal_type === 'missing_tech') return 'missing_tech'
  if (prospect.signal_type === 'job_posting') return 'job_posting'
  return 'new_domain' // Safe default
}

function extractDomainName(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function extractProblem(prospect) {
  if (prospect.redditTitle) {
    // Extract the core problem from the title
    const title = prospect.redditTitle
    if (title.length < 80) return title
    return title.substring(0, 77) + '...'
  }
  return prospect.signal_detail || 'ce probleme'
}

function extractCompetitor(prospect) {
  if (prospect.signal_detail) {
    const match = prospect.signal_detail.match(/alternative (?:a|to) (\w+)/i)
    if (match) return match[1]
  }
  return 'votre solution actuelle'
}

function extractMissingTool(prospect) {
  if (prospect.techSignals?.length > 0) {
    const first = prospect.techSignals[0]
    if (first.tool) return translateTool(first.tool)
    return first.message?.split('—')[0]?.trim() || 'outil'
  }
  return 'outil'
}

function translateTool(tool) {
  const translations = {
    analytics: 'outil analytics',
    chat: 'chat en ligne',
    marketing: 'outil marketing',
    ecommerce: 'plateforme e-commerce',
    payment: 'solution de paiement',
    cdn: 'CDN'
  }
  return translations[tool] || tool
}

function extractDepartment(prospect) {
  const title = (prospect.jobTitle || '').toLowerCase()
  if (/market|growth|brand|content/i.test(title)) return 'marketing'
  if (/sales|commercial|business/i.test(title)) return 'commercial'
  if (/dev|engineer|tech|cto/i.test(title)) return 'technique'
  if (/hr|rh|talent|people/i.test(title)) return 'RH'
  if (/finance|cfo|comptab/i.test(title)) return 'finance'
  return 'operations'
}

// ─── List available templates ───────────────────────────────────────

export function listSignalTemplates(signalType) {
  if (signalType) {
    return (SIGNAL_TEMPLATES[signalType] || []).map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject
    }))
  }

  const all = {}
  for (const [type, templates] of Object.entries(SIGNAL_TEMPLATES)) {
    all[type] = templates.map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject
    }))
  }
  return all
}
