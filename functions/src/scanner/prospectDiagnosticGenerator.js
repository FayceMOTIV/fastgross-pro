/**
 * prospectDiagnosticGenerator.js — Genere le rapport diagnostic IA
 * Utilise Groq pour produire un resume actionnable en francais
 */

import Groq from 'groq-sdk';

/**
 * Genere un diagnostic IA a partir des signaux detectes
 * @param {string} domain - Domaine du prospect
 * @param {Array<object>} signals - Signaux detectes
 * @param {object|null} website - Resultats websiteAnalyzer
 * @param {object|null} techStack - Resultats techStackDetector
 * @param {object|null} seo - Resultats seoHealthScanner
 * @param {object|null} email - Resultats emailInfraAnalyzer
 * @returns {Promise<object>} Diagnostic structure { summary, approachMessage, topPriority }
 */
export async function generateDiagnosticSummary(
  domain,
  signals,
  website,
  techStack,
  seo,
  email
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[Diagnostic] GROQ_API_KEY manquant — fallback sans IA');
    return buildFallbackDiagnostic(domain, signals);
  }

  const groq = new Groq({ apiKey });

  const signalsList = signals
    .map((s) => `- ${s.message} (score: ${s.score})`)
    .join('\n');

  const prompt = `Tu es un expert en marketing digital pour les TPE/PME francaises.
Analyse ce diagnostic et genere :
1. Un resume en 2-3 phrases des problemes principaux
2. Le message d'approche ideal pour contacter ce prospect (max 3 phrases, ton amical et professionnel)

DOMAINE : ${domain}

SIGNAUX DETECTES :
${signalsList || 'Aucun signal critique detecte'}

SITE WEB :
- CMS : ${techStack?.cms || 'non detecte'}
- Analytics : ${website?.hasAnalytics ? 'oui' : 'non'}
- Responsive : ${website?.isResponsive ? 'oui' : 'non'}
- Score PageSpeed : ${seo?.lighthouseScore ?? 'N/A'}/100
- Schema.org : ${seo?.hasSchemaOrg ? 'oui' : 'non'}
- Sitemap : ${seo?.hasSitemap ? 'oui' : 'non'}

EMAIL :
- Provider : ${email?.mxProvider || 'non detecte'}
- SPF : ${email?.hasSPF ? 'oui' : 'non'}
- DKIM : ${email?.hasDKIM ? 'oui' : 'non'}
- DMARC : ${email?.hasDMARC ? 'oui' : 'non'}

Reponds UNIQUEMENT en JSON :
{
  "summary": "...",
  "approachMessage": "...",
  "topPriority": "..."
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return buildFallbackDiagnostic(domain, signals);
    }

    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || '',
      approachMessage: parsed.approachMessage || '',
      topPriority: parsed.topPriority || '',
    };
  } catch (error) {
    console.error('[Diagnostic] Groq error:', error.message);
    return buildFallbackDiagnostic(domain, signals);
  }
}

/**
 * Diagnostic de fallback si Groq est indisponible
 */
function buildFallbackDiagnostic(domain, signals) {
  const signalCount = signals.length;
  const topSignal = signals.sort((a, b) => b.score - a.score)[0];

  return {
    summary: `${signalCount} point${signalCount > 1 ? 's' : ''} d'amelioration detecte${signalCount > 1 ? 's' : ''} sur ${domain}. ${topSignal ? `Priorite : ${topSignal.message}.` : ''}`,
    approachMessage: `Bonjour, j'ai analyse votre presence digitale et identifie ${signalCount} opportunite${signalCount > 1 ? 's' : ''} d'amelioration. Puis-je vous en parler ?`,
    topPriority: topSignal?.message || 'Amelioration de la presence digitale',
  };
}
