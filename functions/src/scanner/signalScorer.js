/**
 * signalScorer.js — Referentiel centralis de scoring pour tous les types de signaux
 * Chaque signal a un score (0-100), une categorie, et un message descriptif.
 */

export const SIGNAL_SCORES = {
  // ========================
  // WEBSITE
  // ========================
  'site_not_found': { score: 35, category: 'website', msg: 'Site web introuvable ou hors ligne' },
  'site_not_responsive': { score: 15, category: 'website', msg: 'Site non adapte au mobile' },
  'no_contact_form': { score: 10, category: 'website', msg: 'Pas de formulaire de contact' },
  'no_analytics': { score: 20, category: 'website', msg: 'Aucun outil analytics detecte' },
  'no_facebook_pixel': { score: 15, category: 'website', msg: 'Pas de pixel Facebook/Meta' },
  'no_chat_widget': { score: 10, category: 'website', msg: 'Pas de chat en ligne' },
  'slow_site': { score: 15, category: 'website', msg: 'Site lent (> 3 secondes)' },
  'lighthouse_under_50': { score: 20, category: 'website', msg: 'Score PageSpeed critique (< 50/100)' },
  'broken_links': { score: 10, category: 'website', msg: 'Liens casses detectes sur le site' },
  'copyright_outdated': { score: 15, category: 'website', msgFn: (year) => `Copyright obsolete (${year})` },
  'site_timeout': { score: 20, category: 'website', msg: 'Site extremement lent (timeout > 10s)' },
  'no_ecommerce': { score: 10, category: 'website', msg: 'Pas de boutique en ligne detectee' },
  'has_hiring_page': { score: 15, category: 'website', msg: 'Page recrutement detectee sur le site' },

  // ========================
  // TECH STACK
  // ========================
  'wix_basic': { score: 15, category: 'tech', msg: 'Site sur Wix (basique)' },
  'wordpress_outdated': { score: 25, category: 'tech', msg: 'WordPress non mis a jour' },
  'no_marketing_stack': { score: 30, category: 'tech', msg: 'Aucun outil marketing detecte' },
  'uses_competitor': { score: 35, category: 'tech', msgFn: (comp) => `Utilise ${comp} (concurrent)` },
  'free_tier_tools': { score: 10, category: 'tech', msg: 'Outils gratuits uniquement detectes' },
  'no_cms_detected': { score: 5, category: 'tech', msg: 'Aucun CMS detecte (site custom ou statique)' },
  'outdated_framework': { score: 15, category: 'tech', msg: 'Framework ou CMS obsolete detecte' },

  // ========================
  // SEO
  // ========================
  'no_sitemap': { score: 20, category: 'seo', msg: 'Pas de sitemap.xml' },
  'no_robots_txt': { score: 10, category: 'seo', msg: 'Pas de robots.txt' },
  'no_schema_org': { score: 25, category: 'seo', msg: 'Pas de donnees structurees Schema.org' },
  'sitemap_stale': { score: 15, category: 'seo', msg: 'Sitemap non mis a jour depuis > 6 mois' },
  'few_indexed_pages': { score: 15, category: 'seo', msg: 'Moins de 10 pages indexees par Google' },
  'ssl_expiring_soon': { score: 20, category: 'seo', msg: 'Certificat SSL expire dans < 30 jours' },
  'ssl_expired': { score: 35, category: 'seo', msg: 'Certificat SSL expire !' },
  'ssl_lets_encrypt': { score: 5, category: 'seo', msg: 'SSL Let\'s Encrypt (gratuit, renouvellement manuel possible)' },
  'staging_detected': { score: 30, category: 'seo', msg: 'Site en refonte detecte (staging/dev)' },
  'no_ssl': { score: 30, category: 'seo', msg: 'Pas de certificat SSL (site non securise)' },

  // ========================
  // EMAIL INFRA
  // ========================
  'no_mx_record': { score: 30, category: 'email', msg: 'Aucun email professionnel configure' },
  'uses_free_email': { score: 20, category: 'email', msg: 'Utilise @gmail.com au lieu de @domaine.fr' },
  'no_spf': { score: 15, category: 'email', msg: 'Pas de SPF — emails risquent le spam' },
  'no_dkim': { score: 10, category: 'email', msg: 'Pas de DKIM — emails non authentifies' },
  'no_dmarc': { score: 10, category: 'email', msg: 'Pas de DMARC — vulnerable a l\'usurpation' },
  'spf_softfail': { score: 8, category: 'email', msg: 'SPF en mode softfail (~all) — protection partielle' },

  // ========================
  // GOOGLE BUSINESS
  // ========================
  'no_google_business': { score: 25, category: 'google', msg: 'Pas de fiche Google Business' },
  'low_review_response': { score: 20, category: 'google', msg: 'Moins de 20% des avis Google ont une reponse' },
  'declining_rating': { score: 25, category: 'google', msg: 'Note Google en baisse ces 3 derniers mois' },
  'old_photos': { score: 15, category: 'google', msg: 'Photos Google datent de > 12 mois' },
  'no_website_on_gmb': { score: 20, category: 'google', msg: 'Pas de lien site web sur la fiche Google' },
  'recently_reopened': { score: 30, category: 'google', msg: 'Commerce recemment reouvert' },
  'few_reviews': { score: 15, category: 'google', msg: 'Moins de 10 avis Google' },
  'low_rating': { score: 20, category: 'google', msg: 'Note Google inferieure a 3.5/5' },

  // ========================
  // SOCIAL
  // ========================
  'instagram_dead': { score: 25, category: 'social', msg: 'Pas de post Instagram depuis > 30 jours' },
  'engagement_drop': { score: 20, category: 'social', msg: 'Engagement Instagram en forte baisse' },
  'no_social_presence': { score: 20, category: 'social', msg: 'Aucune presence reseaux sociaux detectee' },
  'tiktok_absent': { score: 10, category: 'social', msg: 'Pas de presence TikTok detectee' },
  'facebook_inactive': { score: 15, category: 'social', msg: 'Page Facebook inactive ou absente' },

  // ========================
  // BUSINESS SIGNALS
  // ========================
  'hiring_marketing': { score: 35, category: 'business', msg: 'Recrute un profil marketing/com' },
  'hiring_commercial': { score: 25, category: 'business', msg: 'Recrute un profil commercial' },
  'received_subsidy': { score: 30, category: 'business', msg: 'A recu une aide/subvention digitale' },
  'new_domain': { score: 25, category: 'business', msg: 'Domaine cree recemment' },
  'revenue_growth': { score: 20, category: 'business', msg: 'Chiffre d\'affaires en croissance' },
  'new_director': { score: 35, category: 'business', msg: 'Nouveau dirigeant — nouveau budget' },
  'capital_increase': { score: 30, category: 'business', msg: 'Augmentation de capital recente' },
  'business_acquisition': { score: 45, category: 'business', msg: 'Cession/reprise de fonds de commerce' },
  'competitor_closed': { score: 20, category: 'business', msg: 'Un concurrent a proximite a ferme' },
  'new_business': { score: 25, category: 'business', msg: 'Entreprise creee recemment (< 12 mois)' },
  'collective_procedure': { score: 20, category: 'business', msg: 'Procedure collective en cours' },

  // ========================
  // WAYBACK / STAGNATION
  // ========================
  'site_unchanged_12m': { score: 25, category: 'stagnation', msg: 'Site identique depuis > 12 mois' },
  'blog_dead': { score: 15, category: 'stagnation', msg: 'Blog inactif depuis > 12 mois' },

  // ========================
  // WEATHER / TIMING
  // ========================
  'seasonal_opportunity': { score: 15, category: 'timing', msgFn: (detail) => `Opportunite saisonniere : ${detail}` },
};

/**
 * Construit un objet signal a partir d'un type de signal
 * @param {string} type - Cle dans SIGNAL_SCORES
 * @param {string} source - Module source (ex: 'websiteAnalyzer')
 * @param {*} msgParam - Parametre optionnel pour les messages dynamiques
 * @param {object} rawData - Donnees brutes optionnelles
 * @returns {object} Signal structure
 */
export function buildSignal(type, source, msgParam = null, rawData = null) {
  const def = SIGNAL_SCORES[type];
  if (!def) {
    return {
      type,
      source,
      score: 10,
      message: `Signal inconnu : ${type}`,
      actionable: true,
      rawData,
    };
  }

  const message = def.msgFn && msgParam != null ? def.msgFn(msgParam) : def.msg;

  return {
    type,
    source,
    score: def.score,
    category: def.category,
    message,
    actionable: true,
    rawData,
  };
}

/**
 * Determine la priorite a partir du score total
 * @param {number} totalScore
 * @returns {'critical'|'high'|'medium'|'low'}
 */
export function scoreToPriority(totalScore) {
  if (totalScore >= 80) return 'critical';
  if (totalScore >= 50) return 'high';
  if (totalScore >= 25) return 'medium';
  return 'low';
}
