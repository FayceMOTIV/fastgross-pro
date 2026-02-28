/**
 * seed.js — Populate Firestore with 3 fictitious clients + 5 prospects each
 * Also creates /settings/telegram and /settings/alex documents
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase-admin default credentials
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Initialize Firebase Admin
const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json')
if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
  initializeApp({ credential: cert(serviceAccount) })
} else {
  initializeApp({ projectId: 'face-media-factory' })
}

const db = getFirestore()

// ============================================
// DATA: 3 Clients (Organisations)
// ============================================
const organizations = [
  {
    id: 'org_restaurant_lyon',
    slug: 'bistrot-lyonnais',
    clientId: 'bistrot-lyonnais',
    name: 'Le Bistrot Lyonnais',
    industry: 'Restauration',
    plan: 'pro',
    ownerPhone: '33612345678',
    contactPhone: '33612345678',
    contactEmail: 'pierre@bistrotlyonnais.fr',
    prospectionEnabled: true,
    timezone: 'Europe/Paris',
    businessHours: { start: 8, end: 20 },
    channels: {
      email: { enabled: true, provider: 'ses' },
      sms: { enabled: true, provider: 'ovh' },
      whatsapp: { enabled: true, provider: 'evolution' },
      instagram: { enabled: true },
      linkedin: { enabled: false },
      voicemail: { enabled: false },
      postal: { enabled: false },
    },
    dailyBudget: { total: 50, channels: { email: 20, sms: 10, whatsapp: 15, instagram: 5 } },
    services: 'Restaurant gastronomique lyonnais, menus du jour, evenements prives, traiteur',
  },
  {
    id: 'org_agence_immo_paris',
    slug: 'prestige-paris',
    clientId: 'prestige-paris',
    name: 'Immobilier Prestige Paris',
    industry: 'Immobilier',
    plan: 'enterprise',
    ownerPhone: '33698765432',
    contactPhone: '33698765432',
    contactEmail: 'sophie@prestigeparis.fr',
    prospectionEnabled: true,
    timezone: 'Europe/Paris',
    businessHours: { start: 9, end: 19 },
    channels: {
      email: { enabled: true, provider: 'ses' },
      sms: { enabled: true, provider: 'ovh' },
      whatsapp: { enabled: true, provider: 'evolution' },
      instagram: { enabled: true },
      linkedin: { enabled: true, provider: 'heyreach' },
      voicemail: { enabled: true },
      postal: { enabled: true, provider: 'mercifacteur' },
    },
    dailyBudget: { total: 100, channels: { email: 30, sms: 15, whatsapp: 20, instagram: 15, linkedin: 10, voicemail: 5, postal: 5 } },
    services: 'Vente et location immobiliere de prestige a Paris, estimation gratuite, gestion locative',
  },
  {
    id: 'org_coach_fitness',
    slug: 'fitcoach-pro',
    clientId: 'fitcoach-pro',
    name: 'FitCoach Pro',
    industry: 'Sport & Bien-etre',
    plan: 'starter',
    ownerPhone: '33655443322',
    contactPhone: '33655443322',
    contactEmail: 'marc@fitcoachpro.fr',
    prospectionEnabled: true,
    timezone: 'Europe/Paris',
    businessHours: { start: 7, end: 21 },
    channels: {
      email: { enabled: true, provider: 'ses' },
      sms: { enabled: false },
      whatsapp: { enabled: false },
      instagram: { enabled: false },
      linkedin: { enabled: false },
      voicemail: { enabled: false },
      postal: { enabled: false },
    },
    dailyBudget: { total: 20, channels: { email: 20 } },
    services: 'Coaching fitness personnalise, programmes en ligne, nutrition, transformation physique',
  },
  {
    id: 'la-bonne-table',
    slug: 'la-bonne-table',
    clientId: 'la-bonne-table',
    name: 'La Bonne Table',
    industry: 'Restauration',
    plan: 'pro',
    ownerPhone: '33612345678',
    contactPhone: '33612345678',
    contactEmail: 'contact@labonnetable.fr',
    prospectionEnabled: true,
    timezone: 'Europe/Paris',
    businessHours: { start: 9, end: 22 },
    channels: {
      email: { enabled: true, provider: 'ses' },
      sms: { enabled: true, provider: 'ovh' },
      whatsapp: { enabled: true, provider: 'evolution' },
      instagram: { enabled: true },
      linkedin: { enabled: false },
      voicemail: { enabled: false },
      postal: { enabled: false },
    },
    dailyBudget: { total: 60, channels: { email: 25, sms: 10, whatsapp: 20, instagram: 5 } },
    services: 'Restaurant gastronomique, cuisine de saison, evenements prives, brunch weekend, service traiteur',
  },
]

// ============================================
// DATA: 5 Prospects per org at different stages
// ============================================
const prospectsByOrg = {
  org_restaurant_lyon: [
    {
      name: 'Marie Dubois',
      email: 'marie.dubois@gmail.com',
      phone: '33678901234',
      company: 'Evenements MD',
      industry: 'Evenementiel',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'hot',
      alexCategory: 'hot',
      alexScore: 92,
      alexScoring: { score: 92, intent: 'interested', urgency: 'high', sentiment: 'positive', summary: 'Veut organiser un evenement pour 50 personnes' },
      sentToday: 3,
      repliesToday: 2,
      blacklisted: false,
    },
    {
      name: 'Thomas Bernard',
      email: 'tbernard@entreprise.fr',
      phone: '33645678901',
      company: 'Bernard & Fils',
      industry: 'BTP',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'warm',
      alexCategory: 'warm',
      alexScore: 65,
      alexScoring: { score: 65, intent: 'question', urgency: 'medium', sentiment: 'neutral', summary: 'Questions sur les menus groupe' },
      sentToday: 1,
      repliesToday: 1,
      blacklisted: false,
    },
    {
      name: 'Claire Martin',
      email: 'claire.m@hotmail.fr',
      phone: '33634567890',
      instagramHandle: '@claire_events',
      company: null,
      source: 'inbound_instagram',
      channel: 'instagram',
      alexStatus: 'cold',
      alexCategory: 'cold',
      alexScore: 35,
      alexScoring: { score: 35, intent: 'other', urgency: 'low', sentiment: 'neutral', summary: 'Simple like sur une photo, pas de message' },
      sentToday: 0,
      repliesToday: 0,
      rescueScheduledAt: new Date(Date.now() + 2 * 3600000), // dans 2h
      blacklisted: false,
    },
    {
      name: 'Jean-Pierre Leroy',
      email: 'jpl@wanadoo.fr',
      phone: '33623456789',
      company: 'Leroy Consulting',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'ice',
      alexCategory: 'ice',
      alexScore: 12,
      alexScoring: { score: 12, intent: 'not_interested', urgency: 'low', sentiment: 'negative', summary: 'A dit ne pas etre interesse' },
      sentToday: 0,
      repliesToday: 0,
      rescueCount: 3,
      blacklisted: false,
    },
    {
      name: 'Spam Bot 3000',
      email: 'noreply@spam.com',
      phone: '33600000000',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'blacklisted',
      alexCategory: 'ice',
      alexScore: 0,
      blacklisted: true,
    },
  ],

  org_agence_immo_paris: [
    {
      name: 'Alexandre Fontaine',
      email: 'a.fontaine@luxurygroup.com',
      phone: '33687654321',
      linkedinUrl: 'https://linkedin.com/in/alexandrefontaine',
      company: 'Luxury Group',
      industry: 'Finance',
      source: 'inbound_linkedin',
      channel: 'linkedin',
      alexStatus: 'hot',
      alexCategory: 'hot',
      alexScore: 88,
      alexScoring: { score: 88, intent: 'interested', urgency: 'high', sentiment: 'positive', summary: 'Cherche un appartement 4 pieces dans le 16eme, budget 2M+' },
      sentToday: 4,
      repliesToday: 3,
      blacklisted: false,
    },
    {
      name: 'Nathalie Rousseau',
      email: 'n.rousseau@sfr.fr',
      phone: '33676543210',
      company: null,
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'warm',
      alexCategory: 'warm',
      alexScore: 58,
      alexScoring: { score: 58, intent: 'question', urgency: 'medium', sentiment: 'positive', summary: 'Demande estimation pour son bien, pas prete a vendre immediatement' },
      sentToday: 2,
      repliesToday: 1,
      blacklisted: false,
    },
    {
      name: 'Philippe Girard',
      email: 'pgirard@orange.fr',
      phone: '33665432109',
      company: 'Girard Patrimoine',
      industry: 'Gestion de patrimoine',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'warm',
      alexCategory: 'warm',
      alexScore: 72,
      alexScoring: { score: 72, intent: 'interested', urgency: 'medium', sentiment: 'positive', summary: 'Interessse par investissement locatif' },
      sentToday: 1,
      repliesToday: 0,
      blacklisted: false,
    },
    {
      name: 'Isabelle Morin',
      email: 'isabelle.morin@gmail.com',
      phone: '33654321098',
      instagramHandle: '@isabelle_deco',
      source: 'inbound_instagram',
      channel: 'instagram',
      alexStatus: 'cold',
      alexCategory: 'cold',
      alexScore: 28,
      alexScoring: { score: 28, intent: 'other', urgency: 'low', sentiment: 'neutral', summary: 'A suivi le compte, pas de demande specifique' },
      sentToday: 0,
      repliesToday: 0,
      rescueScheduledAt: new Date(Date.now() + 12 * 3600000),
      blacklisted: false,
    },
    {
      name: 'Robert Mercier',
      email: 'r.mercier@free.fr',
      phone: '33643210987',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'transferred',
      alexCategory: 'hot',
      alexScore: 95,
      alexScoring: { score: 95, intent: 'interested', urgency: 'high', sentiment: 'positive', summary: 'Veut visiter 3 biens cette semaine, budget confirme' },
      transferredAt: new Date(),
      transferredTo: '33698765432',
      sentToday: 5,
      repliesToday: 4,
      blacklisted: false,
    },
  ],

  'la-bonne-table': [
    {
      name: 'Prospect WhatsApp Test',
      email: 'test@example.com',
      phone: '+33612345678',
      company: null,
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'new',
      alexCategory: 'warm',
      alexScore: 0,
      sentToday: 0,
      repliesToday: 0,
      blacklisted: false,
    },
    {
      name: 'Sophie Delacroix',
      email: 'sophie.delacroix@gmail.com',
      phone: '33698712345',
      company: 'Delacroix Events',
      industry: 'Evenementiel',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'warm',
      alexCategory: 'warm',
      alexScore: 62,
      alexScoring: { score: 62, intent: 'question', urgency: 'medium', sentiment: 'positive', summary: 'Demande devis pour cocktail 80 personnes' },
      sentToday: 1,
      repliesToday: 1,
      blacklisted: false,
    },
    {
      name: 'Vincent Moreau',
      email: 'v.moreau@entreprise.fr',
      phone: '33687654309',
      company: 'Moreau & Associes',
      industry: 'Conseil',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'hot',
      alexCategory: 'hot',
      alexScore: 90,
      alexScoring: { score: 90, intent: 'interested', urgency: 'high', sentiment: 'positive', summary: 'Veut reserver salle privee pour repas affaires regulier' },
      sentToday: 3,
      repliesToday: 2,
      blacklisted: false,
    },
    {
      name: 'Amelie Roux',
      email: 'amelie.roux@hotmail.fr',
      phone: '33676543298',
      instagramHandle: '@amelie_foodie',
      source: 'inbound_instagram',
      channel: 'instagram',
      alexStatus: 'cold',
      alexCategory: 'cold',
      alexScore: 32,
      alexScoring: { score: 32, intent: 'other', urgency: 'low', sentiment: 'neutral', summary: 'Like et commentaire sur post, pas de demande concrete' },
      sentToday: 0,
      repliesToday: 0,
      blacklisted: false,
    },
    {
      name: 'Paul Durand',
      email: 'paul.d@free.fr',
      phone: '33665432187',
      source: 'inbound_whatsapp',
      channel: 'whatsapp',
      alexStatus: 'ice',
      alexCategory: 'ice',
      alexScore: 15,
      alexScoring: { score: 15, intent: 'not_interested', urgency: 'low', sentiment: 'negative', summary: 'Mauvaise experience precedente, ne souhaite pas revenir' },
      sentToday: 0,
      repliesToday: 0,
      rescueCount: 2,
      blacklisted: false,
    },
  ],

  org_coach_fitness: [
    {
      name: 'Camille Petit',
      email: 'camille.petit@yahoo.fr',
      phone: '33632109876',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'hot',
      alexCategory: 'hot',
      alexScore: 85,
      alexScoring: { score: 85, intent: 'interested', urgency: 'high', sentiment: 'positive', summary: 'Veut commencer un programme de transformation, motivee' },
      sentToday: 2,
      repliesToday: 2,
      blacklisted: false,
    },
    {
      name: 'Lucas Moreau',
      email: 'lucas.moreau@gmail.com',
      phone: '33621098765',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'warm',
      alexCategory: 'warm',
      alexScore: 55,
      alexScoring: { score: 55, intent: 'question', urgency: 'medium', sentiment: 'neutral', summary: 'Compare plusieurs coachs, demande les tarifs' },
      sentToday: 1,
      repliesToday: 0,
      blacklisted: false,
    },
    {
      name: 'Emma Laurent',
      email: 'emma.l@outlook.fr',
      phone: '33610987654',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'cold',
      alexCategory: 'cold',
      alexScore: 30,
      alexScoring: { score: 30, intent: 'other', urgency: 'low', sentiment: 'neutral', summary: 'A telecharge un ebook gratuit, pas de suite' },
      sentToday: 0,
      repliesToday: 0,
      rescueScheduledAt: new Date(Date.now() + 6 * 3600000),
      blacklisted: false,
    },
    {
      name: 'Hugo Simon',
      email: 'hugo.simon@laposte.net',
      phone: '33609876543',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'ice',
      alexCategory: 'ice',
      alexScore: 10,
      alexScoring: { score: 10, intent: 'not_interested', urgency: 'low', sentiment: 'negative', summary: 'A demande a ne plus etre contacte' },
      sentToday: 0,
      repliesToday: 0,
      rescueCount: 2,
      blacklisted: false,
    },
    {
      name: 'Julie Blanc',
      email: 'julie.blanc@gmail.com',
      phone: '33698765401',
      source: 'inbound_email',
      channel: 'email',
      alexStatus: 'new',
      alexCategory: 'warm',
      alexScore: 0,
      sentToday: 0,
      repliesToday: 0,
      blacklisted: false,
    },
  ],
}

// ============================================
// Settings documents
// ============================================
const settingsTelegram = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '8075857464:AAFkOFx-L_sNmrlFSWnKQi-gVAyIzHlh0-M',
  chatId: process.env.TELEGRAM_CHAT_ID || '1148937590',
  enabled: true,
  alertThreshold: 80,
  notifyOnTransfer: true,
  notifyOnError: true,
}

const settingsAlex = {
  enabled: true,
  scoringModel: 'llama-3.3-70b-versatile',
  replyModel: 'llama-3.3-70b-versatile',
  tone: 'professionnel et amical',
  language: 'francais',
  services: 'prospection digitale multicanale, generation de leads qualifies, automatisation commerciale',
  maxRescueAttempts: 3,
  rescueDelayHours: 24,
  hotThreshold: 80,
  warmThreshold: 50,
  coldThreshold: 25,
}

// ============================================
// SEED EXECUTION
// ============================================
async function seed() {
  console.log('🌱 Starting seed...\n')

  // 1. Create settings
  console.log('📝 Creating /settings/telegram...')
  await db.collection('settings').doc('telegram').set(settingsTelegram)
  console.log('   ✅ /settings/telegram created')

  console.log('📝 Creating /settings/alex...')
  await db.collection('settings').doc('alex').set(settingsAlex)
  console.log('   ✅ /settings/alex created')

  // 2. Create organizations + prospects
  for (const org of organizations) {
    const orgId = org.id
    const orgData = { ...org }
    delete orgData.id

    console.log(`\n🏢 Creating organization: ${org.name} (${orgId})`)
    await db.collection('organizations').doc(orgId).set({
      ...orgData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    console.log(`   ✅ Organization created`)

    // Create prospects
    const prospects = prospectsByOrg[orgId] || []
    for (const prospect of prospects) {
      const prospectData = {
        ...prospect,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      const ref = await db
        .collection('organizations').doc(orgId)
        .collection('prospects')
        .add(prospectData)

      const statusIcon = {
        hot: '🔥',
        warm: '🌤',
        cold: '❄️',
        ice: '🧊',
        transferred: '📤',
        blacklisted: '🚫',
        new: '🆕',
      }[prospect.alexStatus] || '❓'

      console.log(`   ${statusIcon} ${prospect.name} (score: ${prospect.alexScore || 0}, status: ${prospect.alexStatus}) → ${ref.id}`)

      // Create sample interactions for hot/warm prospects
      if (['hot', 'warm', 'transferred'].includes(prospect.alexStatus)) {
        await db
          .collection('organizations').doc(orgId)
          .collection('interactions')
          .add({
            prospectId: ref.id,
            channel: prospect.channel,
            direction: 'in',
            message: generateSampleMessage(prospect),
            from: prospect.phone || prospect.email || prospect.instagramHandle,
            score: prospect.alexScore,
            source: 'alex',
            createdAt: FieldValue.serverTimestamp(),
          })
      }
    }
  }

  console.log('\n✅ Seed complete!\n')
  console.log('Summary:')
  console.log(`  📊 ${organizations.length} organizations`)
  console.log(`  👥 ${Object.values(prospectsByOrg).flat().length} prospects`)
  console.log(`  ⚙️  2 settings documents (/settings/telegram, /settings/alex)`)
  console.log('\n🚀 Ready to test with:')
  console.log('  curl -X POST http://localhost:5001/face-media-factory/europe-west1/webhookIncoming \\')
  console.log('    -H "Content-Type: application/json" \\')
  console.log('    -d \'{"channel":"whatsapp","from":"+33678901234","message":"Bonjour, je suis interesse","orgId":"org_restaurant_lyon"}\'')

  process.exit(0)
}

function generateSampleMessage(prospect) {
  const messages = {
    hot: [
      'Bonjour, je suis tres interesse par vos services. Pouvez-vous me rappeler ?',
      'Je souhaite prendre rendez-vous cette semaine. Quelles sont vos disponibilites ?',
      'Super, on peut se voir mardi ? J\'ai un projet concret a discuter.',
    ],
    warm: [
      'Merci pour les informations. J\'aimerais en savoir plus sur vos tarifs.',
      'Interessant. Vous proposez une offre decouverte ?',
      'Je compare plusieurs prestataires. Qu\'est-ce qui vous differencie ?',
    ],
    transferred: [
      'Parfait, je suis disponible cette semaine pour une visite !',
    ],
  }
  const pool = messages[prospect.alexStatus] || messages.warm
  return pool[Math.floor(Math.random() * pool.length)]
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
