/**
 * countryProfiles — Profils pays pour prospection internationale
 * Timezone, prefixes tel, langue, compliance, canaux prioritaires
 */

export const COUNTRY_PROFILES = {
  FR: {
    code: 'FR',
    name: 'France',
    timezone: 'Europe/Paris',
    phonePrefix: '+33',
    language: 'fr',
    currency: 'EUR',
    compliance: {
      framework: 'RGPD',
      optInRequired: true,
      unsubscribeRequired: true,
      dataRetentionDays: 1095,
    },
    channels: {
      priority: ['email', 'sms', 'whatsapp', 'linkedin', 'instagram'],
      smsProvider: 'ovh',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 20, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Salut', closing: 'Cordialement' },
  },
  BE: {
    code: 'BE',
    name: 'Belgique',
    timezone: 'Europe/Brussels',
    phonePrefix: '+32',
    language: 'fr',
    currency: 'EUR',
    compliance: {
      framework: 'RGPD',
      optInRequired: true,
      unsubscribeRequired: true,
      dataRetentionDays: 1095,
    },
    channels: {
      priority: ['email', 'sms', 'whatsapp', 'linkedin'],
      smsProvider: 'ovh',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 19, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Salut', closing: 'Bien a vous' },
  },
  CH: {
    code: 'CH',
    name: 'Suisse',
    timezone: 'Europe/Zurich',
    phonePrefix: '+41',
    language: 'fr',
    currency: 'CHF',
    compliance: {
      framework: 'nLPD',
      optInRequired: true,
      unsubscribeRequired: true,
      dataRetentionDays: 1095,
    },
    channels: {
      priority: ['email', 'linkedin', 'whatsapp', 'sms'],
      smsProvider: 'ovh',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 18, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Bonjour', closing: 'Meilleures salutations' },
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    timezone: 'Europe/Luxembourg',
    phonePrefix: '+352',
    language: 'fr',
    currency: 'EUR',
    compliance: {
      framework: 'RGPD',
      optInRequired: true,
      unsubscribeRequired: true,
      dataRetentionDays: 1095,
    },
    channels: {
      priority: ['email', 'linkedin', 'whatsapp'],
      smsProvider: 'ovh',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 18, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Bonjour', closing: 'Cordialement' },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    timezone: 'America/Toronto',
    phonePrefix: '+1',
    language: 'fr',
    currency: 'CAD',
    compliance: {
      framework: 'CASL',
      optInRequired: true,
      unsubscribeRequired: true,
      dataRetentionDays: 1095,
      expressConsentRequired: true,
    },
    channels: {
      priority: ['email', 'linkedin', 'sms'],
      smsProvider: 'twilio',
      whatsappEnabled: false,
    },
    businessHours: { start: 9, end: 18, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Allo', closing: 'Au plaisir' },
  },
  MA: {
    code: 'MA',
    name: 'Maroc',
    timezone: 'Africa/Casablanca',
    phonePrefix: '+212',
    language: 'fr',
    currency: 'MAD',
    compliance: {
      framework: 'Loi 09-08',
      optInRequired: false,
      unsubscribeRequired: true,
      dataRetentionDays: 365,
    },
    channels: {
      priority: ['whatsapp', 'email', 'instagram', 'sms'],
      smsProvider: 'ovh',
      whatsappEnabled: true,
    },
    businessHours: { start: 9, end: 19, weekendOff: false, offDays: [5] },
    greetings: { formal: 'Bonjour', informal: 'Salam', closing: 'Cordialement' },
  },
  SN: {
    code: 'SN',
    name: 'Senegal',
    timezone: 'Africa/Dakar',
    phonePrefix: '+221',
    language: 'fr',
    currency: 'XOF',
    compliance: {
      framework: 'CDP',
      optInRequired: false,
      unsubscribeRequired: true,
      dataRetentionDays: 365,
    },
    channels: {
      priority: ['whatsapp', 'instagram', 'email', 'sms'],
      smsProvider: 'twilio',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 18, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Bonjour', closing: 'Cordialement' },
  },
  CI: {
    code: 'CI',
    name: 'Cote d\'Ivoire',
    timezone: 'Africa/Abidjan',
    phonePrefix: '+225',
    language: 'fr',
    currency: 'XOF',
    compliance: {
      framework: 'ARTCI',
      optInRequired: false,
      unsubscribeRequired: true,
      dataRetentionDays: 365,
    },
    channels: {
      priority: ['whatsapp', 'instagram', 'email', 'sms'],
      smsProvider: 'twilio',
      whatsappEnabled: true,
    },
    businessHours: { start: 8, end: 18, weekendOff: true },
    greetings: { formal: 'Bonjour', informal: 'Bonjour', closing: 'Cordialement' },
  },
}

/**
 * Detecte le pays a partir du prefixe telephonique
 */
export function detectCountryFromPhone(phone) {
  if (!phone) return null
  const clean = phone.replace(/[\s\-()]/g, '')

  const prefixMap = [
    { prefix: '+33', code: 'FR' },
    { prefix: '+32', code: 'BE' },
    { prefix: '+41', code: 'CH' },
    { prefix: '+352', code: 'LU' },
    { prefix: '+1', code: 'CA' },
    { prefix: '+212', code: 'MA' },
    { prefix: '+221', code: 'SN' },
    { prefix: '+225', code: 'CI' },
  ]

  // Trier par longueur de prefixe desc pour eviter faux positif (+1 vs +1xxx)
  const sorted = prefixMap.sort((a, b) => b.prefix.length - a.prefix.length)
  for (const entry of sorted) {
    if (clean.startsWith(entry.prefix)) {
      return entry.code
    }
  }

  return null
}

/**
 * Detecte le pays a partir de l'adresse
 */
export function detectCountryFromAddress(address) {
  if (!address) return null
  const lower = (typeof address === 'string' ? address : '').toLowerCase()

  const patterns = [
    { pattern: /france|paris|lyon|marseille|toulouse|nantes|strasbourg|bordeaux|lille/i, code: 'FR' },
    { pattern: /belgi(?:que|um)|bruxelles|brussels|gand|anvers|liege/i, code: 'BE' },
    { pattern: /suisse|switzerland|geneve|zurich|lausanne|berne/i, code: 'CH' },
    { pattern: /luxembourg/i, code: 'LU' },
    { pattern: /canada|montreal|toronto|vancouver|quebec|ottawa/i, code: 'CA' },
    { pattern: /maroc|morocco|casablanca|rabat|marrakech|tanger|fes/i, code: 'MA' },
    { pattern: /senegal|dakar/i, code: 'SN' },
    { pattern: /cote d'ivoire|ivory coast|abidjan/i, code: 'CI' },
  ]

  for (const { pattern, code } of patterns) {
    if (pattern.test(lower)) return code
  }

  return null
}

/**
 * Retourne le profil pays pour un prospect
 */
export function getCountryProfile(prospect) {
  const countryCode = prospect?.country
    || detectCountryFromPhone(prospect?.phone)
    || detectCountryFromAddress(prospect?.address || prospect?.city)
    || 'FR'

  return COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.FR
}

/**
 * Retourne la langue de communication pour un prospect
 */
export function getProspectLanguage(prospect) {
  return getCountryProfile(prospect).language
}

/**
 * Retourne les canaux prioritaires pour un pays
 */
export function getCountryChannelPriority(countryCode) {
  const profile = COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES.FR
  return profile.channels.priority
}
