/**
 * Moteur de prospection multicanale
 * Orchestre les contacts sur 5 canaux : email, SMS, Instagram, voicemail, courrier
 */

// Styles et icones par canal
export const CHANNEL_STYLES = {
  email: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'Mail',
    emoji: '✉️',
    color: 'text-emerald-400',
    label: 'Email',
  },
  sms: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'Smartphone',
    emoji: '📱',
    color: 'text-blue-400',
    label: 'SMS',
  },
  whatsapp: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: 'MessageCircle',
    emoji: '💬',
    color: 'text-green-400',
    label: 'WhatsApp',
  },
  instagram_dm: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    icon: 'Instagram',
    emoji: '📸',
    color: 'text-pink-400',
    label: 'Instagram',
  },
  facebook_dm: {
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/20',
    icon: 'Facebook',
    emoji: '📘',
    color: 'text-blue-300',
    label: 'Facebook',
  },
  voicemail: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'Mic',
    emoji: '🎙️',
    color: 'text-purple-400',
    label: 'Vocal',
  },
  courrier: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'Mail',
    emoji: '💌',
    color: 'text-amber-400',
    label: 'Courrier',
  },
  reply: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'MessageSquare',
    emoji: '💬',
    color: 'text-red-400',
    label: 'Reponse',
  },
  stopped: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: 'Square',
    emoji: '⏹️',
    color: 'text-gray-500',
    label: 'Stoppe',
  },
};

// Regles d'orchestration
export const ORCHESTRATION_RULES = {
  // 1. ADAPTATION AU TYPE DE PROSPECT
  channelPriority: {
    commerce_local: ['email', 'instagram_dm', 'sms', 'voicemail'],
    restaurant: ['email', 'instagram_dm', 'sms', 'voicemail'],
    salon_beaute: ['email', 'instagram_dm', 'sms', 'voicemail'],
    boutique: ['email', 'instagram_dm', 'sms', 'voicemail'],
    entreprise_b2b: ['email', 'sms', 'voicemail', 'courrier'],
    profession_liberale: ['email', 'sms', 'courrier', 'voicemail'],
    artisan: ['email', 'sms', 'voicemail', 'courrier'],
    default: ['email', 'sms', 'instagram_dm', 'voicemail'],
  },

  // 2. JAMAIS 2 CONTACTS LE MEME JOUR (meme sur des canaux differents)
  minDelayBetweenContacts: 24, // heures

  // 3. STOP GLOBAL — reponse sur N'IMPORTE QUEL canal = tout s'arrete
  stopAllOnAnyReply: true,

  // 4. COURRIER = DERNIER RECOURS PREMIUM
  courrier: {
    onlyForHotProspects: true, // score >= 70
    orLastStep: true,
    maxPerMonth: 20,
  },

  // 5. COOLDOWNS ENTRE CANAUX (heures)
  cooldowns: {
    email_to_email: 72,
    email_to_sms: 48,
    email_to_instagram: 24,
    sms_to_email: 48,
    sms_to_sms: 168, // 7 jours entre 2 SMS
    any_to_voicemail: 72,
    any_to_postal: 336, // 14 jours min avant courrier
  },

  // 6. LIMITES PAR CANAL PAR PROSPECT
  maxPerProspect: {
    email: 5,
    sms: 2, // MAX 2 SMS
    whatsapp: 2,
    instagram_dm: 1, // UN SEUL DM
    voicemail: 1, // UN SEUL voicemail
    courrier: 1, // UN SEUL courrier
  },
};

// Sequences predefinies
export const SEQUENCE_TEMPLATES = {
  // Sequence 3 etapes (version courte)
  short: {
    name: '3 etapes',
    description: 'Sequence rapide pour prospects chauds',
    steps: [
      { day: 0, channel: 'email', label: 'Email 1 — Accroche personnalisee' },
      { day: 4, channel: 'sms', label: 'SMS — Relance directe' },
      { day: 10, channel: 'email', label: 'Email 2 — Break-up' },
    ],
  },

  // Sequence 5 etapes (RECOMMANDEE)
  standard: {
    name: '5 etapes',
    description: 'Sequence equilibree, recommandee',
    recommended: true,
    steps: [
      { day: 0, channel: 'email', label: 'Email 1 — Accroche personnalisee' },
      { day: 3, channel: 'sms', label: 'SMS — Relance courte "30 sec ?"' },
      { day: 7, channel: 'instagram_dm', label: 'Instagram DM — Approche sociale' },
      { day: 12, channel: 'email', label: 'Email 2 — Valeur ajoutee (cas client)' },
      { day: 20, channel: 'voicemail', label: 'Message vocal — Touche humaine finale' },
    ],
  },

  // Sequence 7 etapes (version persistante)
  long: {
    name: '7 etapes',
    description: 'Sequence complete pour maximiser les chances',
    steps: [
      { day: 0, channel: 'email', label: 'Email 1 — Accroche personnalisee' },
      { day: 2, channel: 'instagram_dm', label: 'Instagram DM — Approche sociale' },
      { day: 5, channel: 'sms', label: 'SMS — Relance courte' },
      { day: 8, channel: 'email', label: 'Email 2 — Valeur ajoutee (cas client)' },
      { day: 12, channel: 'voicemail', label: 'Message vocal — Contact humain' },
      { day: 16, channel: 'email', label: 'Email 3 — Ton direct' },
      { day: 22, channel: 'courrier', label: 'Courrier postal — Carte personnalisee' },
    ],
  },
};

// Templates SMS / WhatsApp
export const SMS_TEMPLATES = {
  relance_courte: [
    'Bonjour {{firstName}}, je vous ai envoye un email au sujet de {{company}}. 30 sec pour en discuter ? {{senderName}}',
    '{{firstName}}, avez-vous vu mon email ? J\'ai une idee pour {{company}}. {{senderName}}',
  ],
  relance_directe: [
    '{{firstName}}, derniere tentative ! Un simple "oui" ou "non" me suffit. {{senderName}}',
  ],
  whatsapp_intro: [
    'Bonjour {{firstName}} ! Je suis {{senderName}}. J\'ai remarque {{company}} et j\'ai une proposition qui pourrait vous interesser. 2 min ?',
  ],
};

export const SMS_RULES = {
  maxLength: 160, // SMS standard
  whatsappMaxLength: 500,
  preferWhatsApp: true, // Si dispo, preferer WhatsApp
  sendingHours: { start: 9, end: 19 }, // JAMAIS apres 19h
  neverOnSunday: true,
};

// Templates Instagram / Facebook DM
export const SOCIAL_TEMPLATES = {
  instagram_dm: [
    'Bonjour {{firstName}} ! Je suivais {{company}} et j\'adore ce que vous faites. Je vous ai envoye un email — est-ce que vous avez eu le temps de le voir ?',
    'Hey {{firstName}} ! Je suis {{senderName}}. J\'ai decouvert {{company}} recemment et j\'ai une idee qui pourrait vous aider. Ca vous dit d\'en parler ?',
  ],
  facebook_dm: [
    'Bonjour {{firstName}}, je me permets de vous contacter car je pense pouvoir aider {{company}}. Seriez-vous ouvert a un echange rapide ?',
  ],
};

export const SOCIAL_RULES = {
  neverColdDM: true, // JAMAIS de DM a froid
  maxDMsPerDay: 10,
  dmHours: { start: 9, end: 19 },
};

// Templates Courrier postal
export const POSTAL_TEMPLATES = {
  carte_personnalisee: {
    format: 'carte_postale_A5',
    template: `Bonjour {{firstName}},

Je me suis permis de vous ecrire car je pense
sincerement pouvoir aider {{company}}.

Scannez ce QR code pour en savoir plus :
[QR CODE -> URL personnalisee avec tracking]

Au plaisir d'echanger,
{{senderName}}`,
  },
};

export const POSTAL_RULES = {
  maxPerProspect: 1,
  maxPerMonth: 20,
  minScore: 70,
  includeQRCode: true,
  costPerUnit: 2.5,
};

// Templates Message vocal
export const VOICEMAIL_TEMPLATES = {
  message_personnel: [
    'Bonjour {{firstName}}, c\'est {{senderName}}. Je vous ai envoye un email il y a quelques jours au sujet de {{company}}. J\'avais une idee qui pourrait vraiment vous interesser. N\'hesitez pas a me rappeler au {{senderPhone}} ou a repondre a mon email. Bonne journee !',
  ],
};

export const VOICEMAIL_RULES = {
  maxPerProspect: 1,
  maxDuration: 30, // secondes
  sendingHours: { start: 9, end: 18 },
  neverOnWeekend: true,
  method: 'tts', // text-to-speech ou 'recorded'
  // Le telephone NE SONNE PAS — message depose directement dans la messagerie
};

// Utilitaire pour obtenir le style d'un canal
export const getChannelStyle = (channel) => {
  return CHANNEL_STYLES[channel] || CHANNEL_STYLES.email;
};

// Utilitaire pour verifier si un canal est disponible pour un prospect
export const isChannelAvailable = (prospect, channel) => {
  if (!prospect.channels) return channel === 'email';
  return prospect.channels[channel]?.available === true;
};

// Utilitaire pour obtenir les canaux disponibles pour un prospect
export const getAvailableChannels = (prospect) => {
  if (!prospect.channels) return ['email'];
  return Object.entries(prospect.channels)
    .filter(([_, config]) => config?.available)
    .map(([channel]) => channel);
};

// Utilitaire pour generer une sequence adaptee au prospect
export const generateSequenceForProspect = (prospect, templateKey = 'standard') => {
  const template = SEQUENCE_TEMPLATES[templateKey];
  if (!template) return null;

  const availableChannels = getAvailableChannels(prospect);

  return template.steps.map((step, index) => ({
    number: index + 1,
    ...step,
    available: availableChannels.includes(step.channel),
    fallbackChannel: !availableChannels.includes(step.channel)
      ? availableChannels.find((c) => c !== 'email') || 'email'
      : null,
  }));
};

// Stats par canal (pour les KPIs)
export const calculateChannelStats = (prospects) => {
  const stats = {
    total: prospects.length,
    byChannel: {
      email: { sent: 0, opened: 0, replied: 0 },
      sms: { sent: 0, delivered: 0, replied: 0 },
      instagram_dm: { sent: 0, seen: 0, replied: 0 },
      voicemail: { sent: 0, listened: 0, callback: 0 },
      courrier: { sent: 0, scanned: 0 },
    },
    replies: {
      total: 0,
      byChannel: {},
    },
  };

  prospects.forEach((prospect) => {
    if (prospect.sequence?.steps) {
      prospect.sequence.steps.forEach((step) => {
        if (step.status === 'sent' && stats.byChannel[step.channel]) {
          stats.byChannel[step.channel].sent++;
          if (step.tracking?.opened) stats.byChannel[step.channel].opened++;
          if (step.tracking?.delivered) stats.byChannel[step.channel].delivered++;
          if (step.tracking?.seen) stats.byChannel[step.channel].seen++;
        }
      });
    }

    if (prospect.reply) {
      stats.replies.total++;
      const channel = prospect.reply.channel || 'email';
      stats.replies.byChannel[channel] = (stats.replies.byChannel[channel] || 0) + 1;
      if (stats.byChannel[channel]) {
        stats.byChannel[channel].replied++;
      }
    }
  });

  return stats;
};
