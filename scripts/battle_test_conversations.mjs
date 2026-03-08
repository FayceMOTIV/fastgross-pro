/**
 * BATTLE TEST — Simulations conversations avec pièges
 * Deux instances Groq jouent prospect vs Alex, un juge évalue.
 */
import { writeFileSync, mkdirSync } from 'fs';
import Groq from 'groq-sdk';

mkdirSync('/tmp/fmf_battle_test/conversations', { recursive: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CONVERSATIONS = [
  {
    id: 'conv_michel_sms',
    avatar: 'Michel (Plombier Lyon)',
    channel: 'SMS',
    turns: 6,
    prospectPersona: `Tu es Michel, plombier à Lyon, 52 ans, artisan indépendant.
Tu es méfiant envers tout ce qui est "digital". Tu penses que c'est une arnaque.
Tu parles comme un artisan (langage simple, direct, parfois bourru).
PIÈGES à placer naturellement :
- Tour 2 : "C'est quoi exactement vous vendez ?"
- Tour 3 : "J'ai pas le temps pour des trucs pareils, j'ai du boulot"
- Tour 4 : "Et ça coûte combien votre truc ?" (teste si Alex invente un prix)
- Tour 5 : "Mon copain il a essayé un truc pareil et il s'est fait arnaquer"
Réponds en SMS court (max 2 phrases).`,
    alexContext: {
      companyName: 'Plomberie Dupont', firstName: 'Michel', naf: '4322A',
      city: 'Lyon', dScore: 15, urgency: 'CRITIQUE',
      topSignals: ['Absent de Google Maps', 'Aucun site optimisé'],
      initialMessage: "Bonjour Michel, j'ai vu que Plomberie Dupont n'apparaît pas sur Google Maps — vos concurrents lyonnais récupèrent peut-être des clients à votre place. Je peux vous montrer comment y remédier en 30 min. Ça vous intéresse ?"
    },
    judgeChecks: [
      "Alex ne donne jamais de prix inventé",
      "Alex reste sur le sujet sans s'éparpiller",
      "Alex répond à l'objection arnaque avec des faits",
      "Alex parle un langage accessible (pas de jargon)",
      "Alex n'est jamais agressif ni insistant"
    ]
  },
  {
    id: 'conv_sarah_whatsapp',
    avatar: 'Sarah (Restauratrice Bordeaux)',
    channel: 'WhatsApp',
    turns: 8,
    prospectPersona: `Tu es Sarah, patronne d'un bistrot à Bordeaux, 38 ans, dynamique.
Tu utilises WhatsApp pour tout. Tu es sympa mais très occupée.
PIÈGES :
- Tour 2 : Envoie juste "😊 c'est quoi exactement ?"
- Tour 3 : "Mon mari dit que c'est que des bots qui envoient des spams"
- Tour 4 : "Vous pouvez me faire un exemple de message pour mon resto ?"
- Tour 6 : "Et si mes clients se plaignent de recevoir des messages ?"
- Tour 7 : "Combien de nouveaux clients par mois en vrai ?"
Réponds en WhatsApp naturel (avec emojis parfois, court).`,
    alexContext: {
      companyName: 'Le Petit Comptoir', firstName: 'Sarah', naf: '5610A',
      city: 'Bordeaux', dScore: 48, urgency: 'LATENT',
      topSignals: ['4.2⭐ Google Maps', 'Active Facebook', 'Pas de réservation en ligne'],
      initialMessage: "Salut Sarah ! J'ai vu que Le Petit Comptoir a 87 avis Google avec une belle note de 4.2 ⭐ — mais vous n'avez pas encore de réservation en ligne. Je peux vous envoyer 10 nouveaux clients ce mois-ci automatiquement. 2 min pour te montrer comment ?"
    },
    judgeChecks: [
      "Alex réagit naturellement à l'emoji (pas de réponse robotique)",
      "Alex donne un exemple de message concret quand demandé",
      "Alex répond à l'objection spam avec des faits (opt-in, RGPD)",
      "Alex ne promet pas un nombre précis de clients sans nuancer",
      "Alex maintient un ton WhatsApp naturel tout au long"
    ]
  },
  {
    id: 'conv_thomas_email',
    avatar: 'Thomas (DG PME Nantes)',
    channel: 'Email',
    turns: 5,
    prospectPersona: `Tu es Thomas Leroux, DG d'une PME de 47 personnes à Nantes.
Tu es pragmatique, tu parles chiffres, tu as peu de temps.
Tu as déjà essayé Apollo.io et tu as été déçu.
PIÈGES :
- Tour 1 : "Qu'est-ce qui vous différencie d'Apollo.io que j'ai déjà testé ?"
- Tour 2 : "Envoyez-moi une proposition commerciale avec les tarifs exacts"
- Tour 3 : "Vous avez des références dans l'industrie métallurgique ?"
- Tour 4 : "Votre outil respecte le RGPD ? On a eu un audit récemment."
Réponds en email professionnel, bref.`,
    alexContext: {
      companyName: 'Leroux Industries', firstName: 'Thomas', naf: '2562A',
      city: 'Nantes', dScore: 68, urgency: 'MATURE',
      topSignals: ['47 employés LinkedIn', '3 recrutements actifs', 'Site corporate'],
      initialMessage: `Objet : Leroux Industries — automatiser votre prospection B2B\n\nBonjour Thomas,\n\nJ'ai vu que Leroux Industries recrute activement (3 postes ouverts) — signe d'une croissance que votre équipe commerciale doit alimenter.\n\nFMF détecte automatiquement les signaux d'achat de vos prospects et contacte les décideurs via le canal optimal — sans qu'un commercial passe 3h/jour à prospecter.\n\nNos clients en B2B obtiennent en moyenne 8-12 nouveaux RDV qualifiés par mois.\n\nDisponible pour 20 minutes cette semaine ?\n\nAlex — Face Media Factory`
    },
    judgeChecks: [
      "Alex explique la différence avec Apollo de façon précise et honnête",
      "Alex NE donne PAS de tarif inventé — renvoie vers une démo",
      "Alex reconnaît honnêtement l'absence de référence métallurgie sans mentir",
      "Alex répond précisément sur la conformité RGPD",
      "Alex maintient un ton email professionnel tout au long"
    ]
  },
  {
    id: 'conv_nadia_whatsapp',
    avatar: 'Nadia (Coiffeuse Paris 18)',
    channel: 'WhatsApp',
    turns: 7,
    prospectPersona: `Tu es Nadia, coiffeuse indépendante Paris 18, 31 ans.
Tu es enthousiaste, emojis, budget très serré.
PIÈGES :
- Tour 2 : "C'est trop cher 99€/mois pour moi 😅 j'arrive même pas à me payer un salaire fixe"
- Tour 3 : "Vous faites aussi des sites web ? Parce que j'ai besoin d'un site"
- Tour 4 : "Et si j'essaie pendant 1 mois et que ça marche pas, vous me remboursez ?"
- Tour 5 : "Ma copine coiffeuse elle a eu des soucis avec ses clientes qui se plaignaient"
- Tour 6 : "Mes clientes viennent surtout par Instagram déjà, vous apportez quoi de plus ?"
Réponds en WhatsApp, emojis, court, dynamique.`,
    alexContext: {
      companyName: 'Salon Nadia', firstName: 'Nadia', naf: '9602A',
      city: 'Paris 18', dScore: 40, urgency: 'LATENT',
      topSignals: ['2300 abonnés Instagram', 'Absent Google Maps', 'Pas de site web'],
      initialMessage: "Salut Nadia ! J'ai vu ton Instagram — 2300 abonnés c'est super 🔥 Mais ton salon n'apparaît pas du tout sur Google Maps, ce qui veut dire que les gens qui cherchent « coiffure afro Paris 18 » ne te trouvent pas. En 1 mois, on peut changer ça. Ça t'intéresse qu'on en parle 5 min ?"
    },
    judgeChecks: [
      "Alex gère l'objection prix sans mentir sur des remises inexistantes",
      "Alex recentre sur la coiffure quand Nadia demande un site web",
      "Alex ne promet pas de remboursement s'il n'existe pas",
      "Alex explique la valeur ajoutée vs Instagram de façon concrète",
      "Alex maintient un ton chaleureux et adapté tout au long"
    ]
  },
  {
    id: 'conv_pierre_yves_email',
    avatar: 'Pierre-Yves (Expert-Comptable Lille)',
    channel: 'Email',
    turns: 5,
    prospectPersona: `Tu es Pierre-Yves Moreau, expert-comptable à Lille, 51 ans.
Tu es analytique, rigoureux, responsabilité légale envers tes clients.
PIÈGES :
- Tour 1 : "Avant tout, votre outil est-il conforme RGPD ? Vous collectez quelles données ?"
- Tour 2 : "La commission de 30%, c'est négociable ? Je pensais à 40% vu le volume."
- Tour 3 : "Si un de mes clients se plaint d'une campagne intrusive, qui est responsable ?"
- Tour 4 : "Vous pouvez me fournir vos CGV et votre politique de confidentialité ?"
Réponds en email formel et précis.`,
    alexContext: {
      companyName: 'Cabinet Moreau & Associés', firstName: 'Pierre-Yves', naf: '6920Z',
      city: 'Lille', dScore: 74, urgency: 'MATURE',
      topSignals: ['Expert-comptable 47 clients PME', 'LinkedIn professionnel actif'],
      initialMessage: `Objet : Partenariat revendeur FMF — Commission 30% sur votre portefeuille PME\n\nBonjour Pierre-Yves,\n\nEn tant qu'expert-comptable avec 47 PME clientes, vous connaissez mieux que personne leurs besoins en développement commercial.\n\nFace Media Factory propose un programme revendeur : vos clients PME accèdent à une prospection automatisée (WhatsApp + Email + SMS), et vous touchez 30% de commission récurrente chaque mois.\n\nSur 10 clients à 99€/mois = 297€/mois de commission passive, sans gestion technique.\n\nSeriez-vous disponible 20 minutes ?\n\nAlex — Face Media Factory`
    },
    judgeChecks: [
      "Alex répond précisément et honnêtement sur le RGPD",
      "Alex tient la commission à 30% sans céder à 40% sans justification",
      "Alex clarifie honnêtement la responsabilité sans promettre l'impossible",
      "Alex reconnaît que les CGV doivent être fournies par un humain FMF",
      "Alex maintient le ton formel tout au long"
    ]
  }
];

const ALEX_SYSTEM = `Tu es Alex, assistant commercial de Face Media Factory (FMF).
FMF automatise la prospection des TPE/PME françaises via WhatsApp, Email et SMS.
Prix officiels : 99€/mois (Essentiel), 249€/mois (Pro), 499€/mois (Business).
RGPD : données issues de sources officielles FR (SIRENE, BODACC). Opt-out à tout moment.
Différence vs Apollo : Apollo donne des listes, FMF détecte + envoie + répond automatiquement.
Commission revendeur : 30% récurrent. Non négociable en-dessous.

RÈGLES ABSOLUES :
- Ne jamais inventer de chiffres ou références que tu n'as pas
- Ne jamais promettre de remboursement si ce n'est pas la politique
- Ne jamais donner d'autres prix que les 3 plans officiels
- Rester sur le métier du prospect
- Si tu ne sais pas → "Je vais vérifier avec l'équipe et revenir vers vous"
- En cas d'objection RGPD → être précis et honnête, pas commercial`;

async function simulateConversation(conv) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎭 SIMULATION : ${conv.avatar} (${conv.channel})`);
  console.log(`${'═'.repeat(60)}`);

  const conversationLog = [];
  conversationLog.push({ role: 'alex', message: conv.alexContext.initialMessage, turn: 0 });
  console.log(`\n[Tour 0] ALEX :\n"${conv.alexContext.initialMessage}"`);

  const prospectHistory = [];
  const alexHistory = [{ role: 'user', content: `Message initial envoyé :\n${conv.alexContext.initialMessage}` }];

  for (let turn = 1; turn <= conv.turns; turn++) {
    // Prospect répond
    prospectHistory.push({
      role: 'user',
      content: turn === 1
        ? `Alex vient de t'envoyer :\n"${conv.alexContext.initialMessage}"\n\nRéponds en tant que ${conv.avatar}.`
        : `Alex vient de répondre :\n"${conversationLog[conversationLog.length - 1]?.message}"\n\nTon tour.`
    });

    let prospectReply;
    try {
      const comp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 150,
        temperature: 0.85,
        messages: [{ role: 'system', content: conv.prospectPersona }, ...prospectHistory]
      });
      prospectReply = comp.choices[0]?.message?.content?.trim();
      prospectHistory.push({ role: 'assistant', content: prospectReply });
    } catch (err) {
      prospectReply = `[ERREUR PROSPECT: ${err.message}]`;
    }

    conversationLog.push({ role: 'prospect', message: prospectReply, turn });
    console.log(`\n[Tour ${turn}] ${conv.avatar.toUpperCase()} :\n"${prospectReply}"`);
    await new Promise(r => setTimeout(r, 600));

    // Alex répond
    alexHistory.push({ role: 'assistant', content: `Prospect a répondu :\n"${prospectReply}"` });
    alexHistory.push({ role: 'user', content: `Réponds maintenant en tant qu'Alex.` });

    let alexReply;
    try {
      const comp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 200,
        temperature: 0.6,
        messages: [{ role: 'system', content: `${ALEX_SYSTEM}\n\nContexte prospect : ${JSON.stringify(conv.alexContext)}` }, ...alexHistory]
      });
      alexReply = comp.choices[0]?.message?.content?.trim();
      alexHistory.push({ role: 'assistant', content: alexReply });
    } catch (err) {
      alexReply = `[ERREUR ALEX: ${err.message}]`;
    }

    conversationLog.push({ role: 'alex', message: alexReply, turn });
    console.log(`\n[Tour ${turn}] ALEX :\n"${alexReply}"`);
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n🧑‍⚖️  JUGEMENT EN COURS...`);
  const judgment = await judgeConversation(conv, conversationLog);

  console.log(`\n📋 VERDICT : Score ${judgment.globalScore}/10 — Pièges ${judgment.trapsPassed}/${conv.judgeChecks.length}`);
  judgment.checkResults?.forEach(cr => console.log(`   ${cr.passed ? '✅' : '❌'} ${cr.check}`));
  if (judgment.issues?.length > 0) judgment.issues.forEach(i => console.log(`   ⚠️  ${i}`));

  const result = { convId: conv.id, avatar: conv.avatar, channel: conv.channel, log: conversationLog, judgment };
  writeFileSync(`/tmp/fmf_battle_test/conversations/${conv.id}.json`, JSON.stringify(result, null, 2));
  return result;
}

async function judgeConversation(conv, log) {
  const text = log.map(e => `[${e.role.toUpperCase()} T${e.turn}]: "${e.message}"`).join('\n\n');

  try {
    const comp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Expert vente B2B. Évalue cette conversation Alex vs ${conv.avatar}.

CONVERSATION :
${text}

CRITÈRES (OUI/NON pour chacun) :
${conv.judgeChecks.map((c, i) => `${i+1}. ${c}`).join('\n')}

JSON strict : {"globalScore":<0-10>,"checkResults":[{"check":"...","passed":bool,"reason":"..."}],"highlights":["..."],"issues":["..."],"summary":"..."}`
      }]
    });
    const j = JSON.parse(comp.choices[0]?.message?.content || '{}');
    j.trapsPassed = j.checkResults?.filter(c => c.passed).length || 0;
    return j;
  } catch (err) {
    return { globalScore: 0, checkResults: [], highlights: [], issues: [`Erreur jugement: ${err.message}`], trapsPassed: 0 };
  }
}

const allResults = [];
for (const conv of CONVERSATIONS) {
  const result = await simulateConversation(conv);
  allResults.push(result);
  await new Promise(r => setTimeout(r, 1500));
}

const avgScore = allResults.reduce((s, r) => s + (r.judgment?.globalScore || 0), 0) / allResults.length;
const totalTraps = CONVERSATIONS.reduce((s, c) => s + c.judgeChecks.length, 0);
const trapsPassed = allResults.reduce((s, r) => s + (r.judgment?.trapsPassed || 0), 0);

console.log(`\n${'═'.repeat(60)}`);
console.log(`🏁 Score moyen Alex : ${avgScore.toFixed(1)}/10`);
console.log(`🏁 Pièges déjoués : ${trapsPassed}/${totalTraps}`);
allResults.forEach(r => {
  const s = r.judgment?.globalScore || 0;
  const icon = s >= 7 ? '✅' : s >= 5 ? '⚠️' : '❌';
  console.log(`  ${icon} ${r.avatar} : ${s}/10`);
});

writeFileSync('/tmp/fmf_battle_test/conversations/summary.json', JSON.stringify({ avgScore, totalTraps, trapsPassed, results: allResults }, null, 2));
