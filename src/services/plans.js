// Plans configuration for Face Media Factory v4.0
// Faical manages all infrastructure - clients just use the dashboard

export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 97,
    priceYearly: 77,
    description: 'Ideal pour demarrer la prospection',
    limits: {
      prospectsPerMonth: 500,
      emailsPerMonth: 1000,
      smsPerMonth: 0,
      whatsappPerMonth: 0,
      channels: ['email'],
      activeSequences: 1,
      enrichmentsPerMonth: 500,
    },
    features: [
      '500 prospects enrichis/mois',
      '1 000 emails/mois',
      '1 canal (email)',
      'Scanner basique',
      '1 sequence active',
      'Dashboard basique',
    ],
    notIncluded: [
      'SMS & WhatsApp',
      'Lead scoring IA',
      'A/B testing',
      'Rapports avances',
      'Support prioritaire',
      'Marque blanche',
    ],
    color: 'blue',
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 297,
    priceYearly: 237,
    description: 'Pour les pros de la prospection',
    limits: {
      prospectsPerMonth: 2500,
      emailsPerMonth: 5000,
      smsPerMonth: 500,
      whatsappPerMonth: 0,
      channels: ['email', 'sms'],
      activeSequences: 5,
      enrichmentsPerMonth: 2500,
    },
    features: [
      '2 500 prospects enrichis/mois',
      '5 000 emails + 500 SMS/mois',
      '3 canaux (email, SMS, +1)',
      'Scanner avance',
      '5 sequences actives',
      'Lead scoring IA',
      'A/B testing',
      'Dashboard avance + rapports',
    ],
    notIncluded: ['WhatsApp', 'Voicemail', 'Courrier', 'Support prioritaire', 'Marque blanche'],
    color: 'violet',
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 697,
    priceYearly: 557,
    description: 'Automatisation complete multicanal',
    limits: {
      prospectsPerMonth: 10000,
      emailsPerMonth: 20000,
      smsPerMonth: 2000,
      whatsappPerMonth: 1000,
      channels: ['email', 'sms', 'whatsapp', 'instagram', 'voicemail', 'courrier'],
      activeSequences: -1, // unlimited
      enrichmentsPerMonth: 10000,
    },
    features: [
      '10 000 prospects enrichis/mois',
      '20 000 emails/mois',
      '2 000 SMS/mois',
      '1 000 WhatsApp/mois',
      '6 canaux complets',
      'Scanner complet + signaux',
      'Sequences illimitees',
      'Lead scoring IA avance',
      'A/B testing + optimisation IA',
      'Rapports ROI + export',
      'Support prioritaire',
      'Marque blanche',
    ],
    notIncluded: [],
    color: 'emerald',
    popular: false,
  },
}

export const CHANNELS = {
  email: {
    id: 'email',
    name: 'Email',
    icon: 'Mail',
    color: 'emerald',
    description: 'Emails professionnels personnalises',
    maxPerSequence: 5,
    minDelayDays: 1,
  },
  sms: {
    id: 'sms',
    name: 'SMS',
    icon: 'Smartphone',
    color: 'blue',
    description: 'Messages courts et directs',
    maxPerSequence: 2,
    minDelayDays: 3,
    maxChars: 160,
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'MessageCircle',
    color: 'green',
    description: 'Conversations WhatsApp Business',
    maxPerSequence: 2,
    minDelayDays: 3,
    maxChars: 300,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram DM',
    icon: 'Instagram',
    color: 'pink',
    description: 'Messages directs Instagram',
    maxPerSequence: 1,
    minDelayDays: 5,
    maxChars: 100,
  },
  voicemail: {
    id: 'voicemail',
    name: 'Voicemail',
    icon: 'Mic',
    color: 'purple',
    description: 'Messages vocaux automatises',
    maxPerSequence: 1,
    minDelayDays: 7,
    maxDuration: 30,
  },
  courrier: {
    id: 'courrier',
    name: 'Courrier',
    icon: 'Send',
    color: 'amber',
    description: 'Lettres physiques envoyees',
    maxPerSequence: 1,
    minDelayDays: 14,
  },
}

// Check if a channel is available for a given plan
export function isChannelAvailable(planId, channelId) {
  const plan = PLANS[planId]
  if (!plan) return false
  return plan.limits.channels.includes(channelId)
}

// Get all available channels for a plan
export function getAvailableChannels(planId) {
  const plan = PLANS[planId]
  if (!plan) return []
  return plan.limits.channels.map((id) => CHANNELS[id]).filter(Boolean)
}

// Format price with currency
export function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price)
}

// Get plan by ID
export function getPlan(planId) {
  return PLANS[planId] || null
}

// Get all plans as array
export function getAllPlans() {
  return Object.values(PLANS)
}
