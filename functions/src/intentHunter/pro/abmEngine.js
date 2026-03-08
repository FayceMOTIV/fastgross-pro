/**
 * Intent Hunter Pro — ABM Engine (Account-Based Marketing)
 *
 * Pour chaque entreprise identifiee (SIRET connu), contacte jusqu'a
 * 3 decideurs avec des messages coordonnes mais differencies
 * selon leur role dans l'entreprise.
 *
 * Disponible : plan Business uniquement.
 *
 * Logique :
 *   1. Identifier l'entreprise par SIRET
 *   2. Trouver les decideurs (DG, DAF, CTO, DRH, etc.)
 *   3. Generer un angle de message adapte au role
 *   4. Lancer des sequences coordonnees mais decalees dans le temps
 *
 * Utilise le systeme IA multi-provider via callAI pour la generation
 * de messages personnalises par role.
 */

import { callAI, extractJSON } from '../../ai/callAI.js'

// ============================================
// ROLE ANGLES — Personnalisation par role
// ============================================

/**
 * Angles de message B2B par role decideur.
 * Chaque angle definit l'axe de persuasion principal.
 *
 * @type {Record<string, { angle: string, painPoints: string[], tone: string, cta: string }>}
 */
const ROLE_ANGLES = {
  ceo: {
    angle: 'vision_strategique',
    painPoints: ['croissance', 'competitivite', 'innovation', 'parts de marche'],
    tone: 'strategique_concis',
    cta: 'Echange de 15 min sur votre strategie de croissance'
  },
  dg: {
    angle: 'vision_strategique',
    painPoints: ['croissance', 'competitivite', 'innovation', 'parts de marche'],
    tone: 'strategique_concis',
    cta: 'Echange de 15 min sur votre strategie de croissance'
  },
  cto: {
    angle: 'technique_innovation',
    painPoints: ['scalabilite', 'dette technique', 'productivite equipe', 'time-to-market'],
    tone: 'technique_pragmatique',
    cta: 'Demo technique de 20 min adaptee a votre stack'
  },
  dsi: {
    angle: 'technique_innovation',
    painPoints: ['securite', 'integration SI', 'migration cloud', 'conformite'],
    tone: 'technique_pragmatique',
    cta: 'Presentation architecture et securite'
  },
  daf: {
    angle: 'roi_financier',
    painPoints: ['reduction couts', 'ROI mesurable', 'optimisation budget', 'predictibilite'],
    tone: 'factuel_chiffre',
    cta: 'Etude ROI personnalisee pour votre secteur'
  },
  cfo: {
    angle: 'roi_financier',
    painPoints: ['reduction couts', 'ROI mesurable', 'optimisation budget', 'predictibilite'],
    tone: 'factuel_chiffre',
    cta: 'Etude ROI personnalisee pour votre secteur'
  },
  drh: {
    angle: 'impact_humain',
    painPoints: ['retention talents', 'productivite', 'bien-etre', 'marque employeur'],
    tone: 'empathique_humain',
    cta: 'Comment nos clients ont ameliore la retention de 30%'
  },
  cmo: {
    angle: 'acquisition_croissance',
    painPoints: ['acquisition clients', 'conversion', 'brand awareness', 'ROI marketing'],
    tone: 'creatif_data_driven',
    cta: 'Benchmark acquisition dans votre secteur'
  },
  directeur_commercial: {
    angle: 'performance_ventes',
    painPoints: ['pipeline', 'conversion', 'cycle de vente', 'productivite commerciale'],
    tone: 'direct_resultats',
    cta: 'Comment doubler votre pipeline en 90 jours'
  },
  responsable_achats: {
    angle: 'optimisation_fournisseurs',
    painPoints: ['reduction couts', 'qualite fournisseurs', 'delais', 'conformite'],
    tone: 'factuel_comparatif',
    cta: 'Comparatif detaille vs votre solution actuelle'
  },
  autre: {
    angle: 'valeur_generique',
    painPoints: ['efficacite', 'productivite', 'innovation'],
    tone: 'professionnel',
    cta: 'Echange de 15 min sur vos enjeux actuels'
  }
}

/**
 * Nombre maximum de decideurs contactes par entreprise
 */
const MAX_STAKEHOLDERS = 3

/**
 * Delai minimum entre les contacts de la meme entreprise (en heures)
 * Pour eviter que les decideurs se parlent et detectent une approche coordonnee
 */
const STAGGER_HOURS = 48

// ============================================
// ROLE ANGLE RESOLVER
// ============================================

/**
 * Determine l'angle de message optimal pour un role donne.
 * Normalise les variations de titres de poste.
 *
 * @param {string} role - Titre de poste ou role du decideur
 * @returns {{ angle: string, painPoints: string[], tone: string, cta: string }}
 */
export function getRoleAngle(role) {
  if (!role) return ROLE_ANGLES.autre

  const normalized = role.toLowerCase().trim()

  // Mapping des variations courantes
  const roleMapping = {
    'ceo': 'ceo',
    'chief executive officer': 'ceo',
    'pdg': 'ceo',
    'president': 'ceo',
    'fondateur': 'ceo',
    'founder': 'ceo',
    'co-fondateur': 'ceo',
    'co-founder': 'ceo',
    'directeur general': 'dg',
    'dg': 'dg',
    'gerant': 'dg',
    'managing director': 'dg',
    'cto': 'cto',
    'chief technology officer': 'cto',
    'directeur technique': 'cto',
    'vp engineering': 'cto',
    'head of engineering': 'cto',
    'dsi': 'dsi',
    'directeur systemes information': 'dsi',
    'chief information officer': 'dsi',
    'cio': 'dsi',
    'daf': 'daf',
    'directeur administratif financier': 'daf',
    'directeur financier': 'daf',
    'cfo': 'cfo',
    'chief financial officer': 'cfo',
    'finance director': 'cfo',
    'drh': 'drh',
    'directeur ressources humaines': 'drh',
    'chief people officer': 'drh',
    'head of hr': 'drh',
    'vp people': 'drh',
    'cmo': 'cmo',
    'chief marketing officer': 'cmo',
    'directeur marketing': 'cmo',
    'head of marketing': 'cmo',
    'vp marketing': 'cmo',
    'directeur commercial': 'directeur_commercial',
    'head of sales': 'directeur_commercial',
    'vp sales': 'directeur_commercial',
    'chief revenue officer': 'directeur_commercial',
    'responsable achats': 'responsable_achats',
    'directeur achats': 'responsable_achats',
    'head of procurement': 'responsable_achats',
    'chief procurement officer': 'responsable_achats'
  }

  // Chercher une correspondance exacte d'abord
  if (roleMapping[normalized]) {
    return ROLE_ANGLES[roleMapping[normalized]]
  }

  // Chercher une correspondance partielle
  for (const [pattern, roleKey] of Object.entries(roleMapping)) {
    if (normalized.includes(pattern)) {
      return ROLE_ANGLES[roleKey]
    }
  }

  return ROLE_ANGLES.autre
}

// ============================================
// ABM GROUP TAGGING
// ============================================

/**
 * Associe un groupe ABM a des contacts appartenant a la meme entreprise (SIRET).
 * Permet de coordonner les sequences entre decideurs de la meme societe.
 *
 * @param {Object[]} contacts - Contacts identifies pour l'entreprise
 * @param {string} contacts[].email - Email du contact
 * @param {string} [contacts[].role] - Role / titre du contact
 * @param {string} [contacts[].linkedinUrl] - URL LinkedIn du contact
 * @param {string} [contacts[].firstName] - Prenom
 * @param {string} [contacts[].lastName] - Nom
 * @param {string} siret - SIRET de l'entreprise
 * @returns {Array<{ contact: Object, roleAngle: Object, abmGroupId: string, staggerDelay: number, stakeholderRank: number }>}
 */
export function tagABMGroup(contacts, siret) {
  if (!contacts || contacts.length === 0 || !siret) {
    console.log(JSON.stringify({
      function: 'abmEngine.tagABMGroup',
      step: 'invalid_input',
      contactCount: contacts?.length || 0,
      hasSiret: Boolean(siret)
    }))
    return []
  }

  const abmGroupId = `abm_${siret}_${Date.now()}`

  // Limiter au nombre max de stakeholders
  const selected = contacts.slice(0, MAX_STAKEHOLDERS)

  const tagged = selected.map((contact, index) => {
    const roleAngle = getRoleAngle(contact.role)
    const staggerDelay = index * STAGGER_HOURS

    return {
      contact,
      roleAngle,
      abmGroupId,
      staggerDelay,
      stakeholderRank: index + 1
    }
  })

  console.log(JSON.stringify({
    function: 'abmEngine.tagABMGroup',
    step: 'group_tagged',
    siret,
    abmGroupId,
    stakeholderCount: tagged.length,
    roles: tagged.map(t => t.roleAngle.angle)
  }))

  return tagged
}

// ============================================
// ABM CAMPAIGN LAUNCHER
// ============================================

/**
 * Lance une campagne ABM coordonnee pour une entreprise.
 * Genere des messages personnalises par role via l'IA et planifie
 * les envois avec un decalage temporel entre decideurs.
 *
 * @param {Object} company - Entreprise cible
 * @param {string} company.siret - SIRET de l'entreprise
 * @param {string} company.name - Nom de l'entreprise
 * @param {string} [company.sector] - Secteur d'activite
 * @param {string} [company.size] - Taille (TPE, PME, ETI, GE)
 * @param {string} [company.revenue] - Chiffre d'affaires
 * @param {Object[]} company.contacts - Decideurs identifies
 * @param {Object} clientConfig - Configuration du client FMF
 * @param {string} clientConfig.orgId - ID de l'organisation
 * @param {string} clientConfig.plan - Plan du client
 * @param {string} clientConfig.product - Produit/service a promouvoir
 * @param {string} [clientConfig.valueProposition] - Proposition de valeur
 * @param {string} [clientConfig.companyName] - Nom de l'entreprise cliente
 * @returns {Promise<{ success: boolean, abmGroupId: string, stakeholders: Object[], errors: string[] }>}
 */
export async function launchABMCampaign(company, clientConfig) {
  const errors = []

  // Validation plan Business
  const planLevel = { starter: 0, pro: 1, business: 2, enterprise: 3 }
  if ((planLevel[clientConfig.plan] ?? 0) < 2) {
    console.log(JSON.stringify({
      function: 'abmEngine.launchABMCampaign',
      step: 'plan_insufficient',
      plan: clientConfig.plan,
      required: 'business'
    }))
    return {
      success: false,
      abmGroupId: null,
      stakeholders: [],
      errors: ['ABM disponible uniquement sur le plan Business ou superieur']
    }
  }

  // Validation inputs
  if (!company?.siret || !company?.contacts || company.contacts.length === 0) {
    return {
      success: false,
      abmGroupId: null,
      stakeholders: [],
      errors: ['SIRET et au moins 1 contact requis']
    }
  }

  // Tagger les contacts avec leur groupe ABM
  const taggedContacts = tagABMGroup(company.contacts, company.siret)
  if (taggedContacts.length === 0) {
    return {
      success: false,
      abmGroupId: null,
      stakeholders: [],
      errors: ['Aucun contact valide pour la campagne ABM']
    }
  }

  const abmGroupId = taggedContacts[0].abmGroupId

  // Generer les messages personnalises par role
  const stakeholders = []

  for (const tagged of taggedContacts) {
    try {
      const message = await generateRoleMessage(
        tagged.contact,
        tagged.roleAngle,
        company,
        clientConfig
      )

      stakeholders.push({
        contact: tagged.contact,
        roleAngle: tagged.roleAngle,
        abmGroupId,
        stakeholderRank: tagged.stakeholderRank,
        staggerDelay: tagged.staggerDelay,
        generatedMessage: message,
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + tagged.staggerDelay * 3_600_000).toISOString()
      })
    } catch (error) {
      console.log(JSON.stringify({
        function: 'abmEngine.launchABMCampaign',
        step: 'message_generation_error',
        role: tagged.contact.role,
        error: error.message
      }))
      errors.push(`Generation message echouee pour ${tagged.contact.role}: ${error.message}`)
    }
  }

  console.log(JSON.stringify({
    function: 'abmEngine.launchABMCampaign',
    step: 'campaign_created',
    abmGroupId,
    company: company.name,
    siret: company.siret,
    stakeholderCount: stakeholders.length,
    errorCount: errors.length
  }))

  return {
    success: stakeholders.length > 0,
    abmGroupId,
    stakeholders,
    errors
  }
}

// ============================================
// MESSAGE GENERATION (via callAI)
// ============================================

/**
 * Genere un message personnalise pour un decideur selon son role.
 * Utilise le router IA multi-provider (Groq -> OpenRouter -> Gemini).
 *
 * @param {Object} contact - Decideur cible
 * @param {Object} roleAngle - Angle de message pour ce role
 * @param {Object} company - Entreprise cible
 * @param {Object} clientConfig - Configuration du client FMF
 * @returns {Promise<{ subject: string, body: string, cta: string }>}
 */
async function generateRoleMessage(contact, roleAngle, company, clientConfig) {
  const prompt = buildABMPrompt(contact, roleAngle, company, clientConfig)

  const response = await callAI(prompt, 500)
  const parsed = extractJSON(response)

  if (parsed?.subject && parsed?.body) {
    return {
      subject: parsed.subject,
      body: parsed.body,
      cta: parsed.cta || roleAngle.cta
    }
  }

  // Fallback si le JSON n'est pas parsable
  console.log(JSON.stringify({
    function: 'abmEngine.generateRoleMessage',
    step: 'json_parse_fallback',
    role: contact.role,
    responseLength: response?.length || 0
  }))

  return {
    subject: `${clientConfig.product} — pour ${company.name}`,
    body: response || '',
    cta: roleAngle.cta
  }
}

/**
 * Construit le prompt IA pour la generation de message ABM.
 *
 * @param {Object} contact
 * @param {Object} roleAngle
 * @param {Object} company
 * @param {Object} clientConfig
 * @returns {string}
 */
function buildABMPrompt(contact, roleAngle, company, clientConfig) {
  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'le decideur'

  return `Tu es un expert en prospection B2B en France. Genere un email de premier contact personnalise.

CONTEXTE ENTREPRISE CIBLE :
- Nom : ${company.name}
- Secteur : ${company.sector || 'non precise'}
- Taille : ${company.size || 'non precisee'}
- SIRET : ${company.siret}

DECIDEUR CIBLE :
- Nom : ${contactName}
- Role : ${contact.role || 'non precise'}
- Angle de message : ${roleAngle.angle}
- Pain points prioritaires : ${roleAngle.painPoints.join(', ')}
- Ton attendu : ${roleAngle.tone}

NOTRE OFFRE :
- Entreprise : ${clientConfig.companyName || 'notre entreprise'}
- Produit : ${clientConfig.product || 'notre solution'}
- Proposition de valeur : ${clientConfig.valueProposition || 'non precisee'}

CONSIGNES :
- Email court (max 120 mots pour le body)
- Sujet accrocheur (max 60 caracteres)
- Ton ${roleAngle.tone} — jamais agressif
- Personnalise au role et aux pain points
- CTA clair : "${roleAngle.cta}"
- Pas de formule generique type "j'espere que vous allez bien"
- En francais

Reponds UNIQUEMENT en JSON valide :
{
  "subject": "...",
  "body": "...",
  "cta": "..."
}`
}

// ============================================
// EXPORTS SUPPLEMENTAIRES
// ============================================

export { ROLE_ANGLES, MAX_STAKEHOLDERS, STAGGER_HOURS }
