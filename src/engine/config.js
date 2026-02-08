/**
 * Configuration du moteur de prospection autonome
 * Phase 4 - Face Media Factory
 */

// Limites de warmup progressif (emails par jour)
export const WARMUP_LIMITS = {
  1: 5, // Jour 1-3 : 5 emails/jour
  4: 15, // Jour 4-7 : 15/jour
  8: 30, // Jour 8-14 : 30/jour
  15: 60, // Jour 15-21 : 60/jour
  22: 100, // Jour 22-30 : 100/jour
  31: null, // Apres 30 jours : quota max du compte
}

// Quotas par type de compte
export const ACCOUNT_QUOTAS = {
  gmail: {
    free: 500, // Gmail gratuit : 500/jour
    workspace: 2000, // Google Workspace : 2000/jour
  },
  outlook: {
    free: 300, // Outlook gratuit : 300/jour
    business: 10000, // Microsoft 365 Business : 10000/jour
  },
  smtp: {
    default: 500, // Par defaut, ajustable par l'utilisateur
  },
}

// Configuration Google OAuth2
export const GOOGLE_OAUTH_CONFIG = {
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ],
}

// Configuration Microsoft OAuth2
export const MICROSOFT_OAUTH_CONFIG = {
  scopes: ['Mail.Send', 'Mail.ReadWrite', 'offline_access'],
}

// Configuration Amazon SES (pour plus tard)
export const SES_CONFIG = {
  enabled: false,
  region: 'eu-west-3', // Paris
  pricePerEmail: 0.005, // ~0.90 EUR/1000 emails
}

// Delais et limites de protection anti-spam
export const DELIVERABILITY_CONFIG = {
  minDelayBetweenEmails: 60, // 1 minute minimum
  maxDelayBetweenEmails: 180, // 3 minutes maximum
  maxBounceRate: 0.05, // 5% max de bounces avant pause
  domainCooldownDays: 7, // 1 contact par domaine par semaine
  maxProspectsPerRun: 30, // Max prospects a scraper par run
  maxEmailsPerRun: 50, // Max emails a scorer par run
}

// Configuration du chercheur de prospects
export const PROSPECT_FINDER_CONFIG = {
  maxQueriesPerRun: 10,
  resultsPerQuery: 10,
  defaultSources: ['google_cse', 'pagesjaunes', 'societe'],
}

// Pages a checker pour l'extraction d'emails
export const EMAIL_EXTRACTION_PAGES = [
  '', // Page d'accueil
  '/contact',
  '/contact.html',
  '/contactez-nous',
  '/nous-contacter',
  '/a-propos',
  '/about',
  '/mentions-legales',
  '/legal',
  '/equipe',
  '/qui-sommes-nous',
]

// Emails a filtrer (inutiles)
export const JUNK_EMAIL_PATTERNS = [
  'noreply',
  'no-reply',
  'unsubscribe',
  'mailer-daemon',
  'postmaster',
  'webmaster',
  'example.com',
  'wixpress.com',
  'wordpress.com',
  'squarespace.com',
  '.png',
  '.jpg',
  '.svg',
  '.gif',
  'sentry.io',
  'cloudflare.com',
]

// Priorites des prefixes d'email (plus haut = meilleur)
export const EMAIL_PRIORITY_PREFIXES = {
  // Emails personnels (100)
  personal: 100,
  // Commercial/Sales (70)
  commercial: 70,
  vente: 70,
  ventes: 70,
  sales: 70,
  // Contact general (60)
  contact: 60,
  // Info (50)
  info: 50,
  hello: 50,
  bonjour: 50,
  // Admin (40)
  admin: 40,
  administration: 40,
  // Autres (30)
  default: 30,
}

// Criteres de scoring des prospects
export const SCORING_CONFIG = {
  hasWebsite: 10,
  hasPersonalEmail: 30,
  hasGenericEmail: 20,
  highPotential: 25, // Fort potentiel de developpement
  oldSite: 15, // Site vieillot = besoin de modernisation
  noSocialMedia: 10, // Pas de presence sociale
  hasInstagram: 5, // Sensible au digital
  hasContactName: 5,
  maxScore: 100,
}

// Template email par defaut
export const DEFAULT_EMAIL_TEMPLATE = {
  subject: '{entreprise} -- une question rapide',
  body: `Bonjour {prenom},

Je m'appelle {sender_name} et j'accompagne les professionnels du secteur {secteur} a {ville} dans leur developpement commercial.

En analysant votre marche, j'ai identifie un fort potentiel de croissance pour {entreprise}. Mes clients dans votre secteur obtiennent en moyenne 40% de clients supplementaires grace a notre approche.

Je pourrais vous aider a :
- Trouver de nouveaux clients qualifies
- Automatiser votre prospection
- Augmenter votre visibilite

Seriez-vous disponible pour un appel de 15 minutes ?

Bonne journee,
{sender_name}`,
  signature: '',
}

// Statuts des prospects
export const PROSPECT_STATUS = {
  FOUND: 'found',
  SCRAPED: 'scraped',
  NO_EMAIL: 'no_email',
  SCORED: 'scored',
  READY: 'ready',
  SENT: 'sent',
  OPENED: 'opened',
  REPLIED: 'replied',
  CONVERTED: 'converted',
  BOUNCED: 'bounced',
  UNSUBSCRIBED: 'unsubscribed',
  SEND_FAILED: 'send_failed',
}

// Statuts des comptes email
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
  WARMING_UP: 'warming_up',
}

// Types de comptes email
export const ACCOUNT_TYPES = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
  SMTP: 'smtp',
}

// Configuration de l'autopilot
export const AUTOPILOT_CONFIG = {
  defaultSendHour: 9, // 9h du matin
  defaultSendMinute: 0,
  defaultTimezone: 'Europe/Paris',
  defaultEmailsPerDay: 20,
  defaultProspectsPerDay: 30,
  defaultPauseWeekends: true,
}

// Utilitaire pour obtenir la limite effective d'un compte en warmup
export const getEffectiveLimit = (account) => {
  const day = account.warmupDay || 1
  let limit = 5

  for (const [startDay, dayLimit] of Object.entries(WARMUP_LIMITS)) {
    if (day >= parseInt(startDay)) {
      limit = dayLimit !== null ? dayLimit : account.dailyLimit
    }
  }

  return Math.min(limit, account.dailyLimit || 500)
}

// Utilitaire pour generer un delai aleatoire entre les envois
export const getRandomDelay = () => {
  const { minDelayBetweenEmails, maxDelayBetweenEmails } = DELIVERABILITY_CONFIG
  return minDelayBetweenEmails + Math.random() * (maxDelayBetweenEmails - minDelayBetweenEmails)
}

// Utilitaire sleep
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
