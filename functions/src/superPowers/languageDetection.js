/**
 * Language Detection - Detection automatique de la langue du prospect
 *
 * Business Plan only. Alex adapte ses messages a la langue et culture du prospect.
 * Langues supportees: FR, EN, ES, DE, AR
 *
 * Detection multi-signal:
 *   1. Champs explicites (lead.language, lead.country)
 *   2. TLD du domaine email (.fr, .de, .es, etc.)
 *   3. Prenom / nom (patterns linguistiques)
 *   4. Contenu des reponses precedentes (si disponible)
 *   5. Fallback Groq si ambigu
 */

import { callAI, extractJSON } from '../ai/callAI.js'

const SUPPORTED_LANGUAGES = ['FR', 'EN', 'ES', 'DE', 'AR']
const DEFAULT_LANGUAGE = 'FR'

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'languageDetection', event, ...data, timestamp: new Date().toISOString() }))

/**
 * Map TLD email -> langue probable
 */
const TLD_LANGUAGE_MAP = {
  '.fr': 'FR', '.be': 'FR', '.ch': 'FR', '.lu': 'FR', '.mc': 'FR',
  '.ca': 'FR', '.re': 'FR', '.gp': 'FR', '.mq': 'FR',
  '.uk': 'EN', '.us': 'EN', '.au': 'EN', '.nz': 'EN', '.ie': 'EN',
  '.in': 'EN', '.sg': 'EN', '.za': 'EN',
  '.es': 'ES', '.mx': 'ES', '.ar': 'ES', '.co': 'ES', '.cl': 'ES',
  '.pe': 'ES', '.ve': 'ES', '.ec': 'ES',
  '.de': 'DE', '.at': 'DE',
  '.ma': 'AR', '.dz': 'AR', '.tn': 'AR', '.eg': 'AR', '.sa': 'AR',
  '.ae': 'AR', '.qa': 'AR', '.kw': 'AR', '.bh': 'AR', '.om': 'AR',
  '.jo': 'AR', '.lb': 'AR', '.iq': 'AR', '.ly': 'AR'
}

/**
 * Map pays -> langue
 */
const COUNTRY_LANGUAGE_MAP = {
  'france': 'FR', 'belgique': 'FR', 'suisse': 'FR', 'luxembourg': 'FR',
  'canada': 'FR', 'monaco': 'FR', 'senegal': 'FR', 'cote d ivoire': 'FR',
  'united kingdom': 'EN', 'usa': 'EN', 'united states': 'EN', 'australia': 'EN',
  'ireland': 'EN', 'new zealand': 'EN', 'south africa': 'EN', 'india': 'EN',
  'spain': 'ES', 'espagne': 'ES', 'mexico': 'ES', 'argentina': 'ES',
  'colombia': 'ES', 'chile': 'ES', 'peru': 'ES',
  'germany': 'DE', 'allemagne': 'DE', 'austria': 'DE', 'autriche': 'DE',
  'morocco': 'AR', 'maroc': 'AR', 'algeria': 'AR', 'algerie': 'AR',
  'tunisia': 'AR', 'tunisie': 'AR', 'egypt': 'AR', 'egypte': 'AR',
  'saudi arabia': 'AR', 'uae': 'AR', 'emirates': 'AR'
}

/**
 * Instructions culturelles par langue
 */
const CULTURAL_INSTRUCTIONS = {
  FR: {
    greeting: 'Bonjour',
    tone: 'Professionnel mais chaleureux. Vouvoiement obligatoire. Eviter l anglicisme excessif.',
    formality: 'high',
    signOff: 'Cordialement'
  },
  EN: {
    greeting: 'Hi',
    tone: 'Professional and friendly. Direct style, get to the point quickly.',
    formality: 'medium',
    signOff: 'Best regards'
  },
  ES: {
    greeting: 'Hola',
    tone: 'Calido y profesional. Usar usted en primer contacto. Relacion personal importante.',
    formality: 'high',
    signOff: 'Un cordial saludo'
  },
  DE: {
    greeting: 'Sehr geehrte/r',
    tone: 'Formell und sachlich. Titel verwenden (Dr., Prof.). Direkt und strukturiert.',
    formality: 'very_high',
    signOff: 'Mit freundlichen Gruessen'
  },
  AR: {
    greeting: 'مرحبا',
    tone: 'Respectueux et formel. Commencer par une salutation chaleureuse. Patience dans la relation.',
    formality: 'high',
    signOff: 'مع تحياتي'
  }
}

/**
 * Detecte la langue du prospect a partir de multiples signaux.
 *
 * @param {Object} lead - Le lead (name, email, company, country, language, lastReply)
 * @returns {Promise<string>} Code langue: 'FR'|'EN'|'ES'|'DE'|'AR'
 */
export async function detectProspectLanguage(lead) {
  if (!lead) return DEFAULT_LANGUAGE

  // Signal 1: Langue explicite
  if (lead.language) {
    const explicit = lead.language.toUpperCase().slice(0, 2)
    if (SUPPORTED_LANGUAGES.includes(explicit)) {
      log('detected_explicit', { leadId: lead.id, language: explicit })
      return explicit
    }
  }

  // Signal 2: Pays
  if (lead.country) {
    const normalized = lead.country.toLowerCase().trim()
    const fromCountry = COUNTRY_LANGUAGE_MAP[normalized]
    if (fromCountry) {
      log('detected_from_country', { leadId: lead.id, country: lead.country, language: fromCountry })
      return fromCountry
    }
  }

  // Signal 3: TLD du domaine email
  if (lead.email) {
    const domain = lead.email.split('@')[1] || ''
    for (const [tld, lang] of Object.entries(TLD_LANGUAGE_MAP)) {
      if (domain.endsWith(tld)) {
        log('detected_from_tld', { leadId: lead.id, domain, language: lang })
        return lang
      }
    }
  }

  // Signal 4: Contenu de la derniere reponse
  if (lead.lastReply && lead.lastReply.length > 10) {
    const detected = await detectLanguageFromText(lead.lastReply)
    if (detected) {
      log('detected_from_reply', { leadId: lead.id, language: detected })
      return detected
    }
  }

  // Signal 5: Fallback Groq si nom de domaine .com ou ambigu
  if (lead.name || lead.company) {
    const detected = await detectLanguageViaAI(lead)
    if (detected) {
      log('detected_via_ai', { leadId: lead.id, language: detected })
      return detected
    }
  }

  log('default_language', { leadId: lead.id })
  return DEFAULT_LANGUAGE
}

/**
 * Detecte la langue d'un texte via des patterns simples (avant de recourir a l'IA)
 * @param {string} text - Texte a analyser
 * @returns {string|null} Langue detectee ou null
 */
function detectLanguageFromText(text) {
  if (!text) return null
  const lower = text.toLowerCase()

  const patterns = {
    FR: /\b(bonjour|merci|cordialement|entreprise|nous sommes|je suis|s'il vous plait|bien recu)\b/,
    EN: /\b(hello|thank you|regards|please|company|looking forward|let me know|i am)\b/,
    ES: /\b(hola|gracias|saludos|empresa|estamos|por favor|un saludo|nosotros)\b/,
    DE: /\b(hallo|danke|freundlichen|unternehmen|bitte|wir sind|mit besten)\b/,
    AR: /[\u0600-\u06FF]{3,}/ // 3+ caracteres arabes consecutifs
  }

  for (const [lang, regex] of Object.entries(patterns)) {
    if (regex.test(lower)) return lang
  }

  return null
}

/**
 * Utilise Groq pour detecter la langue quand les signaux simples ne suffisent pas
 * @param {Object} lead - Le lead
 * @returns {Promise<string|null>} Langue detectee ou null
 */
async function detectLanguageViaAI(lead) {
  try {
    const prompt = `Detecte la langue la plus probable de cette personne.
Nom: ${lead.name || 'inconnu'}
Entreprise: ${lead.company || 'inconnu'}
Email domain: ${lead.email?.split('@')[1] || 'inconnu'}
Ville: ${lead.city || 'inconnu'}

Reponds UNIQUEMENT avec un code parmi: FR, EN, ES, DE, AR
Si impossible a determiner, reponds FR.`

    const result = await callAI(prompt, 10)
    const cleaned = result?.trim().toUpperCase().slice(0, 2)

    if (SUPPORTED_LANGUAGES.includes(cleaned)) return cleaned
    return null
  } catch (error) {
    log('ai_detection_error', { error: error.message })
    return null
  }
}

/**
 * Construit un prompt multilingue enrichi avec des instructions culturelles.
 * Utilise pour qu'Alex adapte son ton, salutation et style au prospect.
 *
 * @param {Object} lead - Le lead
 * @param {Object} clientConfig - Config organisation (companyName, niche, value_prop)
 * @param {string} language - Code langue ('FR'|'EN'|'ES'|'DE'|'AR')
 * @returns {string} Prompt avec instructions linguistiques et culturelles
 */
export function buildMultilingualPrompt(lead, clientConfig, language) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE
  const cultural = CULTURAL_INSTRUCTIONS[lang]

  const parts = [
    `LANGUE OBLIGATOIRE: ${lang}`,
    `Salutation: ${cultural.greeting}`,
    `Niveau de formalite: ${cultural.formality}`,
    `Instructions culturelles: ${cultural.tone}`,
    `Signature: ${cultural.signOff}`,
    '',
    `Tu es Alex, assistant commercial de ${clientConfig?.companyName || 'notre entreprise'}.`,
    `Secteur: ${clientConfig?.niche || 'B2B'}.`,
    `Prospect: ${lead?.name || 'prospect'} chez ${lead?.company || 'son entreprise'}.`,
    '',
    `REGLE ABSOLUE: Tout le message doit etre en ${lang}. Pas de melange de langues.`
  ]

  if (lang === 'AR') {
    parts.push('IMPORTANT: Ecrire de droite a gauche. Utiliser l arabe standard moderne.')
  }

  if (lang === 'DE') {
    parts.push('IMPORTANT: Utiliser Sie (vouvoiement) et les titres professionnels si connus.')
  }

  return parts.join('\n')
}

/**
 * Traduit un texte vers la langue cible via Groq si necessaire.
 * Si le texte est deja dans la langue cible, retourne le texte original.
 *
 * @param {string} text - Texte a traduire
 * @param {string} targetLang - Langue cible ('FR'|'EN'|'ES'|'DE'|'AR')
 * @returns {Promise<string>} Texte traduit ou original si erreur
 */
export async function translateIfNeeded(text, targetLang) {
  if (!text || !targetLang) return text || ''

  const lang = SUPPORTED_LANGUAGES.includes(targetLang) ? targetLang : DEFAULT_LANGUAGE

  // Verifier si le texte semble deja dans la langue cible
  const detectedLang = detectLanguageFromText(text)
  if (detectedLang === lang) {
    return text
  }

  try {
    const langNames = { FR: 'francais', EN: 'anglais', ES: 'espagnol', DE: 'allemand', AR: 'arabe' }

    const prompt = `Traduis ce texte en ${langNames[lang] || 'francais'}.
Garde le meme ton et le meme niveau de formalite.
Reponds UNIQUEMENT avec la traduction, rien d'autre.

Texte:
${text}`

    const translated = await callAI(prompt, 500)

    if (!translated || translated.trim().length < 5) {
      log('translation_empty', { targetLang: lang })
      return text
    }

    log('translated', { targetLang: lang, originalLength: text.length, translatedLength: translated.length })
    return translated.trim()
  } catch (error) {
    log('translation_error', { targetLang: lang, error: error.message })
    return text
  }
}
