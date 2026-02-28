/**
 * Email Marketing Bible — Knowledge Base pour prompts Groq
 * Pepite #5 : 55K mots de best practices distilles en patterns actionnables
 * Source : Email Marketing Bible (community skill) + donnees terrain FMF 2025
 *
 * CJS version for VPS Worker
 */

// --- HOOKS PROUVES (taux ouverture > 40%) ---

const SUBJECT_PATTERNS = {
  curiosity: [
    "Question rapide sur {pain_point}",
    "{firstName}, avez-vous 2 minutes ?",
    "J'ai remarque quelque chose sur votre site",
    "Idee pour {companyName}",
    "Est-ce que vous avez deja essaye ca ?",
  ],
  directValue: [
    "{competitor} fait X — vous pouvez faire mieux",
    "Comment {industry_leader} genere 3x plus de {metric}",
    "{firstName}, votre {page/site/compte} merite mieux",
    "Resultat : +{result}% pour {similar_company}",
  ],
  personal: [
    "Suite a votre avis Google sur {companyName}",
    "J'ai vu que vous avez ouvert {n} etablissements recemment",
    "Felicitations pour {recent_achievement}",
    "J'ai visite votre site hier — une idee s'est imposee",
  ],
  urgency: [
    "Derniere chance cette semaine",
    "Disponible jeudi ou vendredi ?",
    "Je ferme mes dossiers vendredi — {firstName} ?",
  ],
};

// --- STRUCTURES DE MESSAGE ---

const MESSAGE_STRUCTURES = {
  PAS: {
    name: "Probleme → Agitation → Solution",
    template: `{problem_observed}. Ce type de situation {agitation_consequence}. Nous aidons des {industry} comme vous a {solution_result}. Ca vaut 15 minutes ?`,
    wordCount: [75, 100],
    bestFor: ['restaurant', 'commerce', 'service_local'],
  },
  AIDA: {
    name: "Attention → Interet → Desir → Action",
    template: `{attention_hook}. {interest_fact}. {desire_social_proof}. {cta}`,
    wordCount: [90, 120],
    bestFor: ['immobilier', 'finance', 'b2b_services'],
  },
  BAB: {
    name: "Before → After → Bridge",
    template: `Avant : {before_state}. Apres : {after_state}. Ce qui a change : {bridge_solution}. Curieux d'en savoir plus ?`,
    wordCount: [80, 110],
    bestFor: ['ecommerce', 'saas', 'consulting'],
  },
  DIRECT: {
    name: "Direct Offer (haute confiance)",
    template: `{observation_specific}. {value_proposition_one_line}. Disponible {cta_time} ?`,
    wordCount: [50, 75],
    bestFor: ['hot_leads', 'referrals', 'high_score'],
  },
};

// --- CTA CONVERTISSEURS ---

const CTA_PATTERNS = {
  soft: [
    "Ca vous dirait qu'on en parle ?",
    "Vous voulez qu'on creuse ca ensemble ?",
    "Curieux d'avoir votre avis la-dessus",
  ],
  direct: [
    "15 minutes cette semaine ?",
    "On se parle jeudi ou vendredi ?",
    "Je peux vous montrer ca en 10min — dispo quand ?",
  ],
  valueFirst: [
    "Je vous envoie l'analyse gratuite ?",
    "Je prepare une demo sur votre cas ?",
    "Je vous partage les resultats d'un cas similaire ?",
  ],
};

// --- FOLLOW-UPS ANGLES ---

const FOLLOWUP_ANGLES = {
  followUp1: {
    angle: 'different_value',
    subject: "Autre angle — {companyName}",
    intro: "Je m'apercois que mon message n'a peut-etre pas repondu a votre vrai defi...",
    timing: 3,
  },
  followUp2: {
    angle: 'social_proof',
    subject: "Ce que {similar_client} dit de nous",
    intro: "Voici ce qu'un {industry} comme vous a obtenu en 30 jours...",
    timing: 7,
  },
  followUp3: {
    angle: 'direct_ask',
    subject: "Toujours pertinent ?",
    intro: "Pas de reponse, deux scenarios : soit pas le bon moment, soit pas le bon sujet...",
    timing: 10,
  },
  breakup: {
    angle: 'final_value',
    subject: "Je referme mon dossier {companyName}",
    intro: "Je ne veux pas vous deranger davantage. Voici une ressource utile pour {industry} : [lien]. Si ca change, vous savez ou me trouver.",
    timing: 14,
  },
};

// --- REGLES DE REDACTION ---

const WRITING_RULES = {
  email: {
    wordCount: { min: 75, max: 125 },
    personalizationElements: 3,
    paragraphs: 3,
    sentences: { maxPerParagraph: 3 },
    forbidden: [
      "Je me permets de vous contacter",
      "Dans le cadre de",
      "Suite a votre annonce",
      "Nous sommes une societe specialisee dans",
      "N'hesitez pas a",
      "Cordialement",
      "Bien a vous",
    ],
    required: ['firstName ou companyName dans les 10 premiers mots'],
  },
  whatsapp: {
    wordCount: { min: 30, max: 70 },
    tone: 'conversational_informal',
    noEmojis: false,
    paragraphs: 2,
    required: ['question en fin de message'],
  },
  linkedin: {
    wordCount: { min: 100, max: 300 },
    connectionNote: { max: 40, required: ['common_point', 'specific_reason'] },
    tone: 'professional_warm',
  },
  instagram: {
    wordCount: { min: 25, max: 60 },
    tone: 'casual_authentic',
    required: ['mention observation sur leur contenu IG'],
  },
};

// --- PERFORMANCE PAR INDUSTRIE ---

const INDUSTRY_PATTERNS = {
  restaurant: {
    bestHooks: ['google_reviews', 'new_menu', 'delivery_optimization'],
    bestStructure: 'PAS',
    bestCTA: 'direct',
    topPainPoints: ['visibilite Google Maps', 'commandes en ligne', 'fidelisation clients', 'photos professionnelles'],
    respondsBestTo: 'social_proof + resultats chiffres',
  },
  immobilier: {
    bestHooks: ['new_listings', 'market_insight', 'competitor_analysis'],
    bestStructure: 'AIDA',
    bestCTA: 'valueFirst',
    topPainPoints: ['generation de leads vendeurs', 'estimation automatique', 'vitrine digitale'],
    respondsBestTo: 'ROI chiffre + cas similaires',
  },
  commerce_local: {
    bestHooks: ['local_seo', 'google_maps_visibility', 'competitor_doing_better'],
    bestStructure: 'BAB',
    bestCTA: 'soft',
    topPainPoints: ['attirer plus de clients locaux', 'concurrence en ligne', 'avis Google'],
    respondsBestTo: 'simplicite + resultats rapides',
  },
  ecommerce: {
    bestHooks: ['conversion_rate', 'abandoned_cart', 'retargeting'],
    bestStructure: 'AIDA',
    bestCTA: 'direct',
    topPainPoints: ['taux conversion', 'panier abandonne', 'cout acquisition'],
    respondsBestTo: 'metriques + benchmarks secteur',
  },
};

// --- GENERATEUR DE SYSTEM PROMPT GROQ ENRICHI ---

function buildEmailSystemPrompt(prospect, channel = 'email', extraContext = '') {
  const industry = prospect.industry || 'commerce';
  const patterns = INDUSTRY_PATTERNS[industry] || INDUSTRY_PATTERNS.commerce_local;
  const channelRules = WRITING_RULES[channel];
  const structure = MESSAGE_STRUCTURES[patterns.bestStructure];
  const intentContext = prospect.intentLabel ? `\n**Signal d'intention detecte :** ${prospect.intentLabel}` : '';
  const socialContext = prospect.engagement?.socialInteractions?.length
    ? `\n**Engagement social :** Le prospect a recemment interagi avec le contenu social du client.`
    : '';

  return `Tu es un expert en cold outreach B2B pour les TPE/PME francaises.
Tu generes des messages ULTRA-PERSONNALISES qui obtiennent des taux de reponse de 8-15%.

## Prospect cible
- Nom : ${prospect.directorFirstName || ''} ${prospect.directorLastName || ''}
- Entreprise : ${prospect.name}
- Secteur : ${industry}
- Score intention : ${prospect.score}/100
- Note Google : ${prospect.googleRating || 'N/A'}/5 (${prospect.reviewCount || 0} avis)${intentContext}${socialContext}
${extraContext}

## Canal : ${channel.toUpperCase()}
${channel === 'email' ? `
- Longueur : ${channelRules.wordCount.min}-${channelRules.wordCount.max} mots MAXIMUM
- Structure recommandee : ${structure.name}
- ${channelRules.personalizationElements} elements specifiques obligatoires
- Paragraphes : max ${channelRules.paragraphs}
- INTERDIT : ${channelRules.forbidden.join(', ')}
` : `
- Longueur : ${channelRules.wordCount.min}-${channelRules.wordCount.max} mots
- Ton : ${channelRules.tone}
`}

## Ce qui fonctionne dans ce secteur
- Meilleurs hooks : ${patterns.topPainPoints.slice(0, 2).join(', ')}
- Ce prospect repond mieux a : ${patterns.respondsBestTo}
- CTA recommande : "${CTA_PATTERNS[patterns.bestCTA][0]}"

## Regle d'or
Commence PAR le prenom ou le nom de l'entreprise. Sois SPECIFIQUE.
Montre que tu as regarde leur situation. Jamais de template generique.

Reponds UNIQUEMENT avec le JSON structure demande.`;
}

module.exports = {
  SUBJECT_PATTERNS,
  MESSAGE_STRUCTURES,
  CTA_PATTERNS,
  FOLLOWUP_ANGLES,
  WRITING_RULES,
  INDUSTRY_PATTERNS,
  buildEmailSystemPrompt,
};
