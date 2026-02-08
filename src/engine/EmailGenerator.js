/**
 * EmailGenerator - Generation d'emails personnalises
 * Utilise des templates avec variables pour creer des emails de prospection
 */

import { DEFAULT_EMAIL_TEMPLATE } from './config'

/**
 * Variables disponibles dans les templates
 */
export const TEMPLATE_VARIABLES = {
  // Prospect
  '{entreprise}': "Nom de l'entreprise",
  '{prenom}': 'Prenom du contact',
  '{nom}': 'Nom du contact',
  '{email_prospect}': 'Email du prospect',
  '{url}': 'URL du site',
  '{secteur}': "Secteur d'activite",
  '{ville}': 'Ville',
  // Scoring
  '{score_video}': 'Description du manque de video',
  // Expediteur
  '{sender_name}': "Nom de l'expediteur",
  '{sender_email}': "Email de l'expediteur",
  '{signature}': 'Signature HTML',
}

/**
 * Extraire le prenom depuis un nom complet ou un email
 */
export const extractFirstName = (fullName, email) => {
  // Si on a un nom complet
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/)
    return capitalizeFirst(parts[0])
  }

  // Sinon, essayer d'extraire du prefix email
  if (email) {
    const prefix = email.split('@')[0]

    // Si format prenom.nom
    if (prefix.includes('.')) {
      const firstName = prefix.split('.')[0]
      return capitalizeFirst(firstName)
    }

    // Si format prenom_nom
    if (prefix.includes('_')) {
      const firstName = prefix.split('_')[0]
      return capitalizeFirst(firstName)
    }

    // Si c'est probablement juste un prenom
    if (prefix.length >= 3 && prefix.length <= 15 && /^[a-z]+$/i.test(prefix)) {
      return capitalizeFirst(prefix)
    }
  }

  return ''
}

/**
 * Extraire le nom depuis un nom complet
 */
export const extractLastName = (fullName) => {
  if (!fullName || !fullName.trim()) return ''

  const parts = fullName.trim().split(/\s+/)
  if (parts.length > 1) {
    return capitalizeFirst(parts[parts.length - 1])
  }

  return ''
}

/**
 * Capitaliser la premiere lettre
 */
export const capitalizeFirst = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Extraire le nom d'entreprise depuis l'URL ou le nom du prospect
 */
export const extractCompanyName = (prospect) => {
  // Si on a un nom explicite
  if (prospect.name && prospect.name.trim()) {
    return prospect.name.trim()
  }

  // Sinon, extraire du domaine
  if (prospect.domain) {
    // Retirer l'extension (.com, .fr, etc.)
    let name = prospect.domain.replace(/\.[a-z]{2,}$/i, '')
    // Remplacer les tirets par des espaces
    name = name.replace(/-/g, ' ')
    // Capitaliser
    return name.split(' ').map(capitalizeFirst).join(' ')
  }

  return 'votre entreprise'
}

/**
 * Remplacer les variables dans un template
 */
export const replaceVariables = (template, variables) => {
  let result = template

  for (const [key, value] of Object.entries(variables)) {
    // Remplacer toutes les occurrences de la variable
    const regex = new RegExp(escapeRegex(key), 'g')
    result = result.replace(regex, value || '')
  }

  return result
}

/**
 * Echapper les caracteres speciaux pour regex
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generer un email personnalise pour un prospect
 */
export const generateEmail = (prospect, config, senderAccount, template = null) => {
  const emailTemplate = template || config.emailTemplate || DEFAULT_EMAIL_TEMPLATE

  // Preparer les variables
  const prenom = extractFirstName(prospect.contactName, prospect.emails?.[0])
  const nom = extractLastName(prospect.contactName)
  const entreprise = extractCompanyName(prospect)

  const variables = {
    '{entreprise}': entreprise,
    '{prenom}': prenom || 'Bonjour',
    '{nom}': nom,
    '{email_prospect}': prospect.emails?.[0] || '',
    '{url}': prospect.url || '',
    '{secteur}': config.sector || config.secteur || 'votre secteur',
    '{ville}': config.location || config.ville || 'votre region',
    '{score_video}': prospect.scoreDetails?.scoreVideoText || 'peu de contenu video',
    '{sender_name}': senderAccount?.displayName || config.senderName || 'Face Media',
    '{sender_email}': senderAccount?.email || config.senderEmail || '',
    '{signature}': config.signature || emailTemplate.signature || '',
  }

  // Generer le sujet et le corps
  const subject = replaceVariables(emailTemplate.subject, variables)
  const body = replaceVariables(emailTemplate.body, variables)

  return {
    to: prospect.emails?.[0],
    subject,
    body,
    variables, // Pour debug/preview
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Generer le lien de desinscription RGPD
 */
export const generateUnsubscribeLink = (email, orgId, baseUrl = '') => {
  const encodedEmail = encodeURIComponent(email)
  const encodedOrg = encodeURIComponent(orgId)
  return `${baseUrl}/unsubscribe?e=${encodedEmail}&o=${encodedOrg}`
}

/**
 * Ajouter le footer RGPD a un email
 */
export const addRGPDFooter = (body, unsubscribeLink) => {
  const footer = `

---
Vous recevez cet email car votre site web est public.
Pour ne plus recevoir de messages : ${unsubscribeLink}`

  return body + footer
}

/**
 * Generer les headers de desinscription pour l'envoi
 */
export const generateUnsubscribeHeaders = (unsubscribeLink) => {
  return {
    'List-Unsubscribe': `<${unsubscribeLink}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

/**
 * Generer un email complet pret a l'envoi
 */
export const generateFullEmail = (prospect, config, senderAccount, baseUrl = '') => {
  const email = generateEmail(prospect, config, senderAccount)

  // Ajouter le lien de desinscription
  const unsubscribeLink = generateUnsubscribeLink(prospect.emails?.[0], config.orgId, baseUrl)

  // Ajouter le footer RGPD
  email.body = addRGPDFooter(email.body, unsubscribeLink)

  // Ajouter les headers
  email.headers = generateUnsubscribeHeaders(unsubscribeLink)
  email.unsubscribeLink = unsubscribeLink

  return email
}

/**
 * Previsualiser un email avec des donnees de test
 */
export const previewEmail = (template, config) => {
  const testProspect = {
    name: 'Restaurant Le Petit Bistrot',
    domain: 'lepetitbistrot.fr',
    url: 'https://lepetitbistrot.fr',
    emails: ['contact@lepetitbistrot.fr'],
    contactName: 'Jean Dupont',
    scoreDetails: {
      scoreVideoText: 'pas de video sur votre site et pas de chaine YouTube',
    },
  }

  const testAccount = {
    displayName: config.senderName || 'Faical de Face Media',
    email: config.senderEmail || 'contact@facemedia.fr',
  }

  return generateEmail(testProspect, config, testAccount, template)
}

/**
 * Valider un template
 */
export const validateTemplate = (template) => {
  const errors = []

  if (!template.subject || template.subject.trim() === '') {
    errors.push('Le sujet est requis')
  }

  if (!template.body || template.body.trim() === '') {
    errors.push("Le corps de l'email est requis")
  }

  // Verifier qu'il n'y a pas de variables mal formatees
  const malformedVars = template.body.match(/\{[^}]+\s+[^}]+\}/g)
  if (malformedVars) {
    errors.push(`Variables mal formatees: ${malformedVars.join(', ')}`)
  }

  // Verifier les variables inconnues
  const usedVars = template.body.match(/\{[^}]+\}/g) || []
  const unknownVars = usedVars.filter((v) => !TEMPLATE_VARIABLES[v])
  if (unknownVars.length > 0) {
    errors.push(`Variables inconnues: ${unknownVars.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Templates alternatifs predéfinis
 */
export const ALTERNATIVE_TEMPLATES = {
  direct: {
    name: 'Direct et concis',
    subject: '{entreprise} - Multipliez votre visibilite par 3',
    body: `Bonjour {prenom},

Une video bien faite = +80% de temps passe sur votre site.

Je cree des videos courtes et percutantes pour {secteur}.

Interesse(e) par 15 min d'echange ?

{sender_name}`,
  },

  storytelling: {
    name: 'Storytelling',
    subject: 'Une question pour {entreprise}',
    body: `Bonjour {prenom},

Savez-vous pourquoi vos concurrents attirent plus l'attention ?

La reponse tient en un mot : VIDEO.

J'aide les professionnels de {secteur} a {ville} a capter l'attention de leurs clients avec des contenus video engageants.

Apres avoir visite votre site, j'ai remarque {score_video}. C'est dommage car vous avez clairement de belles choses a montrer !

Je peux realiser pour {entreprise} :
- Des videos courtes pour Instagram/TikTok
- Une video de presentation professionnelle
- Des temoignages clients filmes

Un cafe virtuel pour en discuter ?

{sender_name}`,
  },

  challenger: {
    name: 'Challenger',
    subject: '{entreprise} passe a cote de 80% de clients potentiels',
    body: `{prenom},

80% des internautes preferent regarder une video plutot que lire du texte.

En parcourant votre site, j'ai constate {score_video}.

Vos concurrents qui utilisent la video captent l'attention que vous perdez.

Je suis videaste specialise {secteur} a {ville}. Je transforme les entreprises comme {entreprise} en aimants a clients.

Une demo gratuite pour voir ce que ca donne ?

{sender_name}`,
  },
}

export default {
  TEMPLATE_VARIABLES,
  ALTERNATIVE_TEMPLATES,
  extractFirstName,
  extractLastName,
  capitalizeFirst,
  extractCompanyName,
  replaceVariables,
  generateEmail,
  generateUnsubscribeLink,
  addRGPDFooter,
  generateUnsubscribeHeaders,
  generateFullEmail,
  previewEmail,
  validateTemplate,
}
