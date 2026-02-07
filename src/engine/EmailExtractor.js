/**
 * EmailExtractor - Extraction d'emails depuis sites web
 * Parcourt plusieurs pages d'un site pour trouver les emails de contact
 */

import {
  EMAIL_EXTRACTION_PAGES,
  JUNK_EMAIL_PATTERNS,
  EMAIL_PRIORITY_PREFIXES,
  sleep
} from './config';

/**
 * Verifier si un email est "junk" (inutile)
 */
export const isJunkEmail = (email) => {
  const emailLower = email.toLowerCase();
  return JUNK_EMAIL_PATTERNS.some(pattern =>
    emailLower.includes(pattern.toLowerCase())
  );
};

/**
 * Calculer la priorite d'un email selon son prefixe
 * Plus le score est eleve, plus l'email est interessant
 */
export const getEmailPriority = (email) => {
  const prefix = email.split('@')[0].toLowerCase();

  // Email personnel (prenom.nom ou prenom)
  // Detecte par la presence d'un point ou si ce n'est pas un prefixe generique
  const genericPrefixes = Object.keys(EMAIL_PRIORITY_PREFIXES).filter(k => k !== 'personal' && k !== 'default');

  if (prefix.includes('.') && !genericPrefixes.includes(prefix)) {
    return EMAIL_PRIORITY_PREFIXES.personal; // 100
  }

  // Verifier les prefixes connus
  for (const [key, priority] of Object.entries(EMAIL_PRIORITY_PREFIXES)) {
    if (key === 'personal' || key === 'default') continue;
    if (prefix === key || prefix.startsWith(key)) {
      return priority;
    }
  }

  // Si c'est un prenom simple (pas de prefixe generique)
  if (!genericPrefixes.some(g => prefix.includes(g)) && prefix.length > 2 && prefix.length < 20) {
    return 80; // Probablement un prenom
  }

  return EMAIL_PRIORITY_PREFIXES.default; // 30
};

/**
 * Prioriser une liste d'emails
 */
export const prioritizeEmails = (emails) => {
  return [...emails]
    .map(email => ({
      email,
      priority: getEmailPriority(email)
    }))
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.email);
};

/**
 * Extraire les emails d'un texte HTML
 */
export const extractEmailsFromHtml = (html) => {
  const emails = new Set();

  // Regex email standard
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];

  matches.forEach(email => {
    const emailLower = email.toLowerCase();
    if (!isJunkEmail(emailLower)) {
      emails.add(emailLower);
    }
  });

  // Emails obfusques : "contact [at] domaine [dot] fr"
  const obfuscatedRegex = /([a-zA-Z0-9._%+-]+)\s*[\[\(]?\s*(?:at|@|arobase)\s*[\]\)]?\s*([a-zA-Z0-9.-]+)\s*[\[\(]?\s*(?:dot|\.)\s*[\]\)]?\s*([a-zA-Z]{2,})/gi;
  const obfuscatedMatches = html.match(obfuscatedRegex) || [];

  obfuscatedMatches.forEach(match => {
    // Reconstruire l'email
    const cleaned = match
      .replace(/[\[\]\(\)]/g, '')
      .replace(/\s*(?:at|arobase)\s*/gi, '@')
      .replace(/\s*(?:dot)\s*/gi, '.')
      .toLowerCase()
      .trim();

    if (cleaned.includes('@') && !isJunkEmail(cleaned)) {
      emails.add(cleaned);
    }
  });

  return [...emails];
};

/**
 * Extraire le telephone francais d'un texte HTML
 */
export const extractPhoneFromHtml = (html) => {
  // Regex telephone francais (formats varies)
  const phoneRegex = /(?:(?:\+33|0033|0)\s*[1-9])(?:[\s.-]*\d{2}){4}/g;
  const matches = html.match(phoneRegex) || [];

  if (matches.length > 0) {
    // Normaliser le premier numero trouve
    return matches[0]
      .replace(/[\s.-]/g, '')
      .replace(/^(?:\+33|0033)/, '0');
  }

  return '';
};

/**
 * Extraire le nom du contact depuis le HTML
 * Recherche des patterns comme "Fondateur", "Gerant", "Directeur"
 */
export const extractContactNameFromHtml = (html) => {
  // Patterns pour trouver des noms associes a des titres
  const patterns = [
    /(?:fondateur|fondatrice|gerant|gerante|directeur|directrice|pdg|ceo|responsable)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]*(?:fondateur|fondatrice|gerant|gerante|directeur|directrice|pdg|ceo)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const name = match[1].trim();
      // Verifier que ca ressemble a un nom (2-40 caracteres, lettres uniquement)
      if (name.length >= 2 && name.length <= 40 && /^[A-Za-zÀ-ÿ\s-]+$/.test(name)) {
        return name;
      }
    }
  }

  return '';
};

/**
 * Extraire les emails et informations de contact d'un site web
 * NOTE: Cette fonction doit etre appelee depuis une Cloud Function
 * car le fetch direct depuis le navigateur pose des problemes CORS
 */
export const extractEmailsFromSite = async (url) => {
  const result = {
    emails: [],
    contactName: '',
    phone: '',
    pagesChecked: 0,
    error: null
  };

  try {
    const baseUrl = new URL(url).origin;

    // Construire la liste des pages a verifier
    const pagesToCheck = EMAIL_EXTRACTION_PAGES.map(page =>
      page ? `${baseUrl}${page}` : url
    );

    const allEmails = new Set();

    for (const pageUrl of pagesToCheck) {
      try {
        const response = await fetch(pageUrl, {
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();
        result.pagesChecked++;

        // Extraire les emails
        const emails = extractEmailsFromHtml(html);
        emails.forEach(e => allEmails.add(e));

        // Extraire le telephone (premier trouve)
        if (!result.phone) {
          result.phone = extractPhoneFromHtml(html);
        }

        // Extraire le nom du contact (premier trouve)
        if (!result.contactName) {
          result.contactName = extractContactNameFromHtml(html);
        }

        // Delai entre les requetes (respecter le site)
        await sleep(1000);

      } catch (pageError) {
        // Page non accessible, on continue
        continue;
      }
    }

    // Prioriser les emails trouves
    result.emails = prioritizeEmails([...allEmails]);

  } catch (error) {
    result.error = error.message;
  }

  return result;
};

/**
 * Version pour appel depuis Cloud Function
 * Recoit le HTML deja recupere
 */
export const extractFromHtml = (html) => {
  return {
    emails: prioritizeEmails(extractEmailsFromHtml(html)),
    phone: extractPhoneFromHtml(html),
    contactName: extractContactNameFromHtml(html)
  };
};

/**
 * Valider un email (format et domaine)
 */
export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return { valid: false, reason: 'format_invalid' };
  }

  if (isJunkEmail(email)) {
    return { valid: false, reason: 'junk_email' };
  }

  return { valid: true };
};

export default {
  isJunkEmail,
  getEmailPriority,
  prioritizeEmails,
  extractEmailsFromHtml,
  extractPhoneFromHtml,
  extractContactNameFromHtml,
  extractEmailsFromSite,
  extractFromHtml,
  validateEmail
};
