/**
 * Email Marketing Bible — Knowledge Base pour prompts Groq
 * Pépite #5 : 55K mots de best practices distillés en patterns actionnables
 * Source : Email Marketing Bible (community skill) + données terrain FMF 2025
 */

// ─── HOOKS PROUVÉS (taux ouverture > 40%) ────────────────────────────────────

export const SUBJECT_PATTERNS = {
  curiosity: [
    "Question rapide sur {pain_point}",
    "{firstName}, avez-vous 2 minutes ?",
    "J'ai remarqué quelque chose sur votre site",
    "Idée pour {companyName}",
    "Est-ce que vous avez déjà essayé ça ?",
  ],
  directValue: [
    "{competitor} fait X — vous pouvez faire mieux",
    "Comment {industry_leader} génère 3x plus de {metric}",
    "{firstName}, votre {page/site/compte} mérite mieux",
    "Résultat : +{result}% pour {similar_company}",
  ],
  personal: [
    "Suite à votre avis Google sur {companyName}",
    "J'ai vu que vous avez ouvert {n} établissements récemment",
    "Félicitations pour {recent_achievement}",
    "J'ai visité votre site hier — une idée s'est imposée",
  ],
  urgency: [
    "Dernière chance cette semaine",
    "Disponible jeudi ou vendredi ?",
    "Je ferme mes dossiers vendredi — {firstName} ?",
  ],
};

// ─── STRUCTURES DE MESSAGE ────────────────────────────────────────────────────

export const MESSAGE_STRUCTURES = {
  PAS: {
    name: "Problème → Agitation → Solution",
    template: `{problem_observed}. Ce type de situation {agitation_consequence}. Nous aidons des {industry} comme vous à {solution_result}. Ça vaut 15 minutes ?`,
    wordCount: [75, 100],
    bestFor: ['restaurant', 'commerce', 'service_local'],
  },
  AIDA: {
    name: "Attention → Intérêt → Désir → Action",
    template: `{attention_hook}. {interest_fact}. {desire_social_proof}. {cta}`,
    wordCount: [90, 120],
    bestFor: ['immobilier', 'finance', 'b2b_services'],
  },
  BAB: {
    name: "Before → After → Bridge",
    template: `Avant : {before_state}. Après : {after_state}. Ce qui a changé : {bridge_solution}. Curieux d'en savoir plus ?`,
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

// ─── CTA CONVERTISSEURS ───────────────────────────────────────────────────────

export const CTA_PATTERNS = {
  soft: [
    "Ça vous dirait qu'on en parle ?",
    "Vous voulez qu'on creuse ça ensemble ?",
    "Curieux d'avoir votre avis là-dessus",
  ],
  direct: [
    "15 minutes cette semaine ?",
    "On se parle jeudi ou vendredi ?",
    "Je peux vous montrer ça en 10min — dispo quand ?",
  ],
  valueFirst: [
    "Je vous envoie l'analyse gratuite ?",
    "Je prépare une démo sur votre cas ?",
    "Je vous partage les résultats d'un cas similaire ?",
  ],
};

// ─── FOLLOW-UPS ANGLES ────────────────────────────────────────────────────────

export const FOLLOWUP_ANGLES = {
  followUp1: {
    angle: 'different_value',
    subject: "Autre angle — {companyName}",
    intro: "Je m'aperçois que mon message n'a peut-être pas répondu à votre vrai défi...",
    timing: 3, // jours après email 1
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
    intro: "Pas de réponse, deux scénarios : soit pas le bon moment, soit pas le bon sujet...",
    timing: 10,
  },
  breakup: {
    angle: 'final_value',
    subject: "Je referme mon dossier {companyName}",
    intro: "Je ne veux pas vous déranger davantage. Voici une ressource utile pour {industry} : [lien]. Si ça change, vous savez où me trouver.",
    timing: 14,
  },
};

// ─── RÈGLES DE RÉDACTION ──────────────────────────────────────────────────────

export const WRITING_RULES = {
  email: {
    wordCount: { min: 75, max: 125 },
    personalizationElements: 3, // minimum 3 éléments spécifiques au prospect
    paragraphs: 3, // max 3 paragraphes
    sentences: { maxPerParagraph: 3 },
    forbidden: [
      "Je me permets de vous contacter",
      "Dans le cadre de",
      "Suite à votre annonce",
      "Nous sommes une société spécialisée dans",
      "N'hésitez pas à",
      "Cordialement",
      "Bien à vous",
    ],
    required: ['firstName ou companyName dans les 10 premiers mots'],
  },
  whatsapp: {
    wordCount: { min: 30, max: 70 },
    tone: 'conversational_informal',
    noEmojis: false, // 1-2 emojis max
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

// ─── PERFORMANCE PAR INDUSTRIE ────────────────────────────────────────────────

export const INDUSTRY_PATTERNS = {
  restaurant: {
    bestHooks: ['google_reviews', 'new_menu', 'delivery_optimization'],
    bestStructure: 'PAS',
    bestCTA: 'direct',
    topPainPoints: ['visibilité Google Maps', 'commandes en ligne', 'fidélisation clients', 'photos professionnelles'],
    respondsBestTo: 'social_proof + résultats chiffrés',
  },
  immobilier: {
    bestHooks: ['new_listings', 'market_insight', 'competitor_analysis'],
    bestStructure: 'AIDA',
    bestCTA: 'valueFirst',
    topPainPoints: ['génération de leads vendeurs', 'estimation automatique', 'vitrine digitale'],
    respondsBestTo: 'ROI chiffré + cas similaires',
  },
  commerce_local: {
    bestHooks: ['local_seo', 'google_maps_visibility', 'competitor_doing_better'],
    bestStructure: 'BAB',
    bestCTA: 'soft',
    topPainPoints: ['attirer plus de clients locaux', 'concurrence en ligne', 'avis Google'],
    respondsBestTo: 'simplicité + résultats rapides',
  },
  ecommerce: {
    bestHooks: ['conversion_rate', 'abandoned_cart', 'retargeting'],
    bestStructure: 'AIDA',
    bestCTA: 'direct',
    topPainPoints: ['taux conversion', 'panier abandonné', 'coût acquisition'],
    respondsBestTo: 'métriques + benchmarks secteur',
  },
};

// ─── GÉNÉRATEUR DE SYSTEM PROMPT GROQ ENRICHI ────────────────────────────────

export function buildEmailSystemPrompt(prospect, channel = 'email', extraContext = '') {
  const industry = prospect.industry || 'commerce';
  const patterns = INDUSTRY_PATTERNS[industry] || INDUSTRY_PATTERNS.commerce_local;
  const channelRules = WRITING_RULES[channel];
  const structure = MESSAGE_STRUCTURES[patterns.bestStructure];
  const intentContext = prospect.intentLabel ? `\n**Signal d'intention détecté :** ${prospect.intentLabel}` : '';
  const socialContext = prospect.engagement?.socialInteractions?.length
    ? `\n**Engagement social :** Le prospect a récemment interagi avec le contenu social du client.`
    : '';

  return `Tu es un expert en cold outreach B2B pour les TPE/PME françaises.
Tu génères des messages ULTRA-PERSONNALISÉS qui obtiennent des taux de réponse de 8-15%.

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
- Structure recommandée : ${structure.name}
- ${channelRules.personalizationElements} éléments spécifiques obligatoires
- Paragraphes : max ${channelRules.paragraphs}
- INTERDIT : ${channelRules.forbidden.join(', ')}
` : `
- Longueur : ${channelRules.wordCount.min}-${channelRules.wordCount.max} mots
- Ton : ${channelRules.tone}
`}

## Ce qui fonctionne dans ce secteur
- Meilleurs hooks : ${patterns.topPainPoints.slice(0, 2).join(', ')}
- Ce prospect répond mieux à : ${patterns.respondsBestTo}
- CTA recommandé : "${CTA_PATTERNS[patterns.bestCTA][0]}"

## Règle d'or
Commence PAR le prénom ou le nom de l'entreprise. Sois SPÉCIFIQUE.
Montre que tu as regardé leur situation. Jamais de template générique.

Réponds UNIQUEMENT avec le JSON structuré demandé.`;
}
