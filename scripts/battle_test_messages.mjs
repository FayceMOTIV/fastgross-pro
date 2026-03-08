/**
 * BATTLE TEST — Génération des messages Alex pour chaque avatar
 */
import { writeFileSync, mkdirSync } from 'fs';
import Groq from 'groq-sdk';

mkdirSync('/tmp/fmf_battle_test/messages', { recursive: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AVATAR_CONTEXTS = [
  {
    id: 'michel_plombier',
    profile: { companyName: 'Plomberie Dupont', firstName: 'Michel', naf: '4322A', city: 'Lyon', employees: 2 },
    dScore: { dScore: 15, urgency: 'CRITIQUE', topSignals: ['Absent de Google Maps', 'Site web non optimisé', 'Aucune présence réseaux sociaux'] },
    expectedChannel: 'sms',
    tone: 'direct, artisan, pas de jargon digital',
    mustContain: ['Lyon', 'clients'],
    mustNOTContain: ['digitalisation', 'SEO', 'automatisation', 'algorithme', 'synergie'],
    maxLength: { sms: 160, whatsapp: 200, email: 400 }
  },
  {
    id: 'sarah_restauratrice',
    profile: { companyName: 'Le Petit Comptoir', firstName: 'Sarah', naf: '5610A', city: 'Bordeaux', employees: 5 },
    dScore: { dScore: 48, urgency: 'LATENT', topSignals: ['4.2⭐ Google Maps (87 avis)', 'Active Facebook', 'Pas de réservation en ligne'] },
    expectedChannel: 'whatsapp',
    tone: 'décontracté, WhatsApp friendly, court',
    mustContain: ['restaurant', 'clients'],
    mustNOTContain: ['Madame', 'cordialement', 'veuillez'],
    maxLength: { sms: 160, whatsapp: 250, email: 500 }
  },
  {
    id: 'thomas_dg_pme',
    profile: { companyName: 'Leroux Industries', firstName: 'Thomas', naf: '2562A', city: 'Nantes', employees: 47 },
    dScore: { dScore: 68, urgency: 'MATURE', topSignals: ['LinkedIn avec 47 employés', 'Recrutement actif (3 offres)', 'Site corporate'] },
    expectedChannel: 'email',
    tone: 'professionnel, chiffres, ROI, bref',
    mustContain: ['ROI', 'automatiser'],
    mustNOTContain: ['cool', 'super', '😊', 'coucou'],
    maxLength: { email: 600 }
  },
  {
    id: 'nadia_coiffeuse',
    profile: { companyName: 'Salon Nadia', firstName: 'Nadia', naf: '9602A', city: 'Paris 18', employees: 1 },
    dScore: { dScore: 40, urgency: 'LATENT', topSignals: ['2300 abonnés Instagram', 'Activité quotidienne réseaux', 'Absent de Google Maps'] },
    expectedChannel: 'whatsapp',
    tone: 'chaleureux, mentionner Instagram, court',
    mustContain: ['Instagram', 'clients'],
    mustNOTContain: ['Madame', 'votre société', 'entreprise'],
    maxLength: { whatsapp: 200 }
  },
  {
    id: 'pierre_yves_expert',
    profile: { companyName: 'Cabinet Moreau & Associés', firstName: 'Pierre-Yves', naf: '6920Z', city: 'Lille', employees: 8 },
    dScore: { dScore: 74, urgency: 'MATURE', topSignals: ['Expert-comptable avec 47 clients PME', 'LinkedIn actif', 'Profil revendeur idéal'] },
    expectedChannel: 'email',
    tone: 'formel, parler de leurs clients PME, commission mentionnée',
    mustContain: ['clients', 'cabinet'],
    mustNOTContain: ['arnaque', 'gratuit', 'révolutionnaire'],
    maxLength: { email: 700 }
  }
];

const channelInstructions = {
  sms: 'SMS de 160 caractères MAX. Ultra-court. Concret. Pas de formule de politesse.',
  whatsapp: 'Message WhatsApp de 2-3 phrases MAX. Naturel. Comme un humain enverrait.',
  email: 'Email avec Objet + corps de 3-4 phrases. Professionnel mais direct.'
};

async function generateAndEvaluateMessage(ctx, channel) {
  const prompt = `Tu es Alex, assistant commercial de Face Media Factory (FMF).
FMF automatise la prospection des TPE/PME françaises via WhatsApp/Email/SMS.

Profil du prospect :
- Nom : ${ctx.profile.firstName} de ${ctx.profile.companyName}
- Secteur NAF ${ctx.profile.naf}, ${ctx.profile.employees} salariés, ${ctx.profile.city}
- Score digital (DScore) : ${ctx.dScore.dScore}/100 — ${ctx.dScore.urgency}
- Signaux détectés : ${ctx.dScore.topSignals.join(' | ')}

Canal : ${channel.toUpperCase()}
Instructions canal : ${channelInstructions[channel]}
Ton attendu : ${ctx.tone}

RÈGLES ABSOLUES :
- Jamais de "bonjour je suis une IA"
- Jamais de bullshit marketing
- Mentionne UN signal détecté de façon naturelle
- Propose UN bénéfice concret
- Termine par UNE question ouverte simple

Génère le message. UNIQUEMENT le message, rien d'autre.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const message = completion.choices[0]?.message?.content?.trim() || '';
    const issues = [];
    const maxLen = ctx.maxLength[channel];
    if (maxLen && message.length > maxLen) issues.push(`TROP LONG: ${message.length} chars (max: ${maxLen})`);
    ctx.mustContain.forEach(word => {
      if (!message.toLowerCase().includes(word.toLowerCase())) issues.push(`MANQUE: "${word}"`);
    });
    ctx.mustNOTContain.forEach(word => {
      if (message.toLowerCase().includes(word.toLowerCase())) issues.push(`INTERDIT PRÉSENT: "${word}"`);
    });

    return { channel, message, length: message.length, passed: issues.length === 0, issues };
  } catch (err) {
    return { channel, message: null, passed: false, issues: [`ERREUR: ${err.message}`] };
  }
}

const allResults = [];

for (const ctx of AVATAR_CONTEXTS) {
  console.log(`\n✍️  Messages Alex — ${ctx.profile.companyName}`);
  const ctxResults = { avatar: ctx.id, messages: [] };

  const channels = ctx.expectedChannel === 'email'
    ? ['email', 'whatsapp', 'sms']
    : ctx.expectedChannel === 'whatsapp'
    ? ['whatsapp', 'sms', 'email']
    : ['sms', 'whatsapp', 'email'];

  for (const channel of channels) {
    const result = await generateAndEvaluateMessage(ctx, channel);
    ctxResults.messages.push(result);

    console.log(`\n   [${channel.toUpperCase()}] ${result.passed ? '✅' : '❌'} ${result.length} chars`);
    console.log(`   "${result.message}"`);
    if (result.issues.length > 0) result.issues.forEach(i => console.log(`   ⚠️  ${i}`));

    await new Promise(r => setTimeout(r, 800));
  }

  allResults.push(ctxResults);
  writeFileSync(`/tmp/fmf_battle_test/messages/${ctx.id}.json`, JSON.stringify(ctxResults, null, 2));
}

console.log('\n📊 Génération messages terminée');
writeFileSync('/tmp/fmf_battle_test/messages/summary.json', JSON.stringify(allResults, null, 2));
