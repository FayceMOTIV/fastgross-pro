/**
 * prospectQualifier.js — La qualification contextuelle (BANT) HYBRIDE
 * B (Budget) : Ce prospect a-t-il les moyens ?
 * A (Authority) : On parle au decideur ?
 * N (Need) : Le besoin est-il confirme par les signaux ?
 * T (Timing) : Le moment est-il bon ?
 *
 * V2 : Scoring hybride rule-based + LLM
 * - Les criteres objectifs (CA, effectif, forme juridique) sont scores en rule-based
 * - Les criteres subjectifs (urgence, fit produit) sont scores par le LLM
 * - Meme si le LLM est mauvais (fallback 8b), le score de base reste correct
 *
 * Fallback chain : Groq 70b → Gemini Flash → Groq 8b → rule-based only
 */
import Groq from 'groq-sdk';
import { safeParseLLMJson } from '../../utils/safeParseLLMJson.js';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ============================================================================
// RULE-BASED BASELINE SCORING (P2 fix)
// ============================================================================

/**
 * Calcule un score BANT de base a partir de donnees objectives.
 * Retourne un objet avec les 4 scores (0-25 chacun) et les raisons.
 * Ce score est TOUJOURS correct car il ne depend pas du LLM.
 */
function computeRuleBasedScore(prospect, businessProfile, missionCriteria) {
  const ca = prospect.revenue || prospect.chiffreAffaires || 0;
  const effectif = prospect.effectif || 0;
  const hasWebsite = !!prospect.website;
  const hasEmail = !!prospect.email;
  const hasPhone = !!prospect.phone;
  const legalForm = (prospect.legalForm || prospect.formeJuridique || '').toUpperCase();

  // --- BUDGET (0-25) ---
  let budgetScore = 5; // baseline
  let budgetReason = 'Donnees financieres non disponibles';

  if (ca > 0) {
    if (ca >= 10_000_000) { budgetScore = 25; budgetReason = `CA ${formatEuros(ca)} EUR — tres gros budget`; }
    else if (ca >= 5_000_000) { budgetScore = 22; budgetReason = `CA ${formatEuros(ca)} EUR — gros budget`; }
    else if (ca >= 1_000_000) { budgetScore = 20; budgetReason = `CA ${formatEuros(ca)} EUR — budget solide`; }
    else if (ca >= 500_000) { budgetScore = 15; budgetReason = `CA ${formatEuros(ca)} EUR — budget moyen`; }
    else if (ca >= 100_000) { budgetScore = 10; budgetReason = `CA ${formatEuros(ca)} EUR — petit budget`; }
    else { budgetScore = 5; budgetReason = `CA ${formatEuros(ca)} EUR — micro budget`; }
  }

  // Bonus effectif
  if (effectif >= 200) budgetScore = Math.min(25, budgetScore + 3);
  else if (effectif >= 50) budgetScore = Math.min(25, budgetScore + 2);
  else if (effectif >= 10) budgetScore = Math.min(25, budgetScore + 1);

  // Penalty si criteres mission non remplis
  if (missionCriteria?.minRevenue && ca > 0 && ca < missionCriteria.minRevenue) {
    budgetScore = Math.max(0, budgetScore - 15);
    budgetReason += ` — SOUS le seuil demande (${formatEuros(missionCriteria.minRevenue)})`;
  }
  if (missionCriteria?.minEmployees && effectif > 0 && effectif < missionCriteria.minEmployees) {
    budgetScore = Math.max(0, budgetScore - 10);
    budgetReason += ` — effectif insuffisant (${effectif} < ${missionCriteria.minEmployees})`;
  }

  // --- AUTHORITY (0-25) ---
  let authorityScore = 10; // baseline
  let authorityReason = 'Decideur non identifie';

  if (prospect.contactName) {
    authorityScore = 15;
    authorityReason = `Contact identifie : ${prospect.contactName}`;
  }
  if (hasEmail) { authorityScore = Math.min(25, authorityScore + 5); authorityReason += ', email disponible'; }
  if (hasPhone) { authorityScore = Math.min(25, authorityScore + 3); authorityReason += ', telephone disponible'; }

  // Formes juridiques = structures etablies = plus de chance d'avoir le bon contact
  if (['SAS', 'SA', 'SARL', 'SCA'].includes(legalForm)) {
    authorityScore = Math.min(25, authorityScore + 2);
  }

  // --- NEED (0-25) ---
  let needScore = 10; // baseline
  let needReason = 'Besoin non confirme, a valider';

  if (!hasWebsite) {
    // Pas de site web = besoin probable en digital
    if (/digital|web|seo|marketing|site/.test(businessProfile.services || '')) {
      needScore = 20;
      needReason = 'Pas de site web — besoin digital probable';
    }
  }

  // Secteur aligne avec l'offre ?
  const prospectSector = (prospect.sector || '').toLowerCase();
  const targetAudience = (businessProfile.targetAudience || '').toLowerCase();
  if (prospectSector && targetAudience.includes(prospectSector.split(' ')[0])) {
    needScore = Math.min(25, needScore + 5);
    needReason += ', secteur aligne avec cible';
  }

  // --- TIMING (0-25) ---
  let timingScore = 12; // baseline neutre
  let timingReason = 'Timing neutre — pas de signal fort';

  // Levee de fonds recente → budget + timing
  if (prospect.fundingRecent || /lev[eé]e|funding|serie/i.test(prospect.snippet || '')) {
    timingScore = 22;
    timingReason = 'Levee de fonds recente — excellent timing';
    budgetScore = Math.min(25, budgetScore + 5);
  }

  // Recrutement actif → croissance → bon timing
  if (/recrut|hiring|cdi|offre.?emploi/i.test(prospect.snippet || '')) {
    timingScore = Math.min(25, timingScore + 5);
    timingReason = 'Recrutement actif — entreprise en croissance';
  }

  const totalScore = budgetScore + authorityScore + needScore + timingScore;

  return {
    budget: { score: budgetScore, reasoning: budgetReason },
    authority: { score: authorityScore, reasoning: authorityReason },
    need: { score: needScore, reasoning: needReason },
    timing: { score: timingScore, reasoning: timingReason },
    totalScore,
    recommendation: totalScore >= 70 ? 'contact_now' :
                     totalScore >= 50 ? 'contact_later' :
                     totalScore >= 30 ? 'nurture' : 'skip',
    suggestedMessage: null,
    _source: 'rule_based',
  };
}

// ============================================================================
// LLM QUALIFICATION (enrichit le rule-based)
// ============================================================================

export async function qualifyProspect(prospect, businessProfile, scanResult, searchPlan, missionCriteria = null) {
  // 1. Calculer le score rule-based (toujours fiable)
  const ruleScore = computeRuleBasedScore(prospect, businessProfile, missionCriteria);

  // 2. Tenter le LLM pour enrichir avec des criteres subjectifs
  let llmScore = null;
  try {
    llmScore = await callLLMQualification(prospect, businessProfile, scanResult, missionCriteria);
  } catch (e) {
    console.warn(`[Qualifier] LLM failed, using rule-based only:`, e.message);
  }

  // 3. Fusion hybride : prendre le MAX entre rule-based et LLM pour chaque critere
  //    Sauf si le LLM donne un score 0 (skip explicite) — dans ce cas respecter le LLM
  if (llmScore) {
    return mergeScores(ruleScore, llmScore);
  }

  return ruleScore;
}

/**
 * Fusionne les scores rule-based et LLM.
 * Pour chaque critere : prend le MAX (le rule-based empeche les scores trop bas sur des criteres objectifs).
 * Garde le suggestedMessage du LLM.
 * Garde le criteriaMatch du LLM (si present).
 */
function mergeScores(rule, llm) {
  // Si le LLM dit explicitement "skip" via criteriaMatch: false, respecter
  if (llm.criteriaMatch === false) {
    return {
      ...llm,
      _source: 'hybrid_llm_skip',
    };
  }

  const budget = {
    score: Math.max(rule.budget.score, llm.budget?.score || 0),
    reasoning: (llm.budget?.score || 0) >= rule.budget.score ? llm.budget.reasoning : rule.budget.reasoning,
  };
  const authority = {
    score: Math.max(rule.authority.score, llm.authority?.score || 0),
    reasoning: (llm.authority?.score || 0) >= rule.authority.score ? llm.authority.reasoning : rule.authority.reasoning,
  };
  const need = {
    score: Math.max(rule.need.score, llm.need?.score || 0),
    reasoning: (llm.need?.score || 0) >= rule.need.score ? llm.need.reasoning : rule.need.reasoning,
  };
  const timing = {
    score: Math.max(rule.timing.score, llm.timing?.score || 0),
    reasoning: (llm.timing?.score || 0) >= rule.timing.score ? llm.timing.reasoning : rule.timing.reasoning,
  };

  const totalScore = budget.score + authority.score + need.score + timing.score;

  return {
    budget,
    authority,
    need,
    timing,
    totalScore,
    recommendation: totalScore >= 70 ? 'contact_now' :
                     totalScore >= 50 ? 'contact_later' :
                     totalScore >= 30 ? 'nurture' : 'skip',
    suggestedMessage: llm.suggestedMessage || null,
    criteriaMatch: llm.criteriaMatch ?? undefined,
    criteriaReasoning: llm.criteriaReasoning ?? undefined,
    _source: 'hybrid',
    _llmModel: llm._model || 'unknown',
  };
}

/**
 * Appelle le LLM pour la qualification (Groq 70b → Gemini Flash → Groq 8b)
 */
async function callLLMQualification(prospect, businessProfile, scanResult, missionCriteria) {
  // Construire la section criteres si elle existe
  let criteriaSection = '';
  if (missionCriteria && Object.keys(missionCriteria).length > 0) {
    const lines = ['CRITERES OBLIGATOIRES DU USER (si un critere n\'est pas rempli → recommendation "skip") :'];
    if (missionCriteria.minRevenue) lines.push(`- CA minimum : ${formatEuros(missionCriteria.minRevenue)} EUR/an`);
    if (missionCriteria.maxRevenue) lines.push(`- CA maximum : ${formatEuros(missionCriteria.maxRevenue)} EUR/an`);
    if (missionCriteria.minEmployees) lines.push(`- Effectif minimum : ${missionCriteria.minEmployees} salaries`);
    if (missionCriteria.maxEmployees) lines.push(`- Effectif maximum : ${missionCriteria.maxEmployees} salaries`);
    if (missionCriteria.mustHaveWebsite) lines.push('- Doit avoir un site web');
    if (missionCriteria.mustHaveEmail) lines.push('- Doit avoir un email de contact');
    if (missionCriteria.mustHavePhone) lines.push('- Doit avoir un telephone');
    if (missionCriteria.excludeStatuses?.length) lines.push(`- Exclure statuts : ${missionCriteria.excludeStatuses.join(', ')}`);
    if (missionCriteria.legalForms?.length) lines.push(`- Formes juridiques acceptees : ${missionCriteria.legalForms.join(', ')}`);
    if (missionCriteria.yearFounded) {
      if (missionCriteria.yearFounded.min) lines.push(`- Creee apres ${missionCriteria.yearFounded.min}`);
      if (missionCriteria.yearFounded.max) lines.push(`- Creee avant ${missionCriteria.yearFounded.max}`);
    }
    if (missionCriteria.keywords?.length) lines.push(`- Specialites requises : ${missionCriteria.keywords.join(', ')}`);
    if (missionCriteria.customFilters) lines.push(`- Autre : ${missionCriteria.customFilters}`);
    criteriaSection = '\n' + lines.join('\n') + '\n';
  }

  // Section donnees financieres du prospect (si disponibles)
  let financialSection = '';
  if (prospect.revenue || prospect.chiffreAffaires || prospect.effectif || prospect.legalForm || prospect.dateCreation) {
    const fLines = ['DONNEES FINANCIERES DU PROSPECT :'];
    if (prospect.revenue || prospect.chiffreAffaires) fLines.push(`- CA : ${formatEuros(prospect.revenue || prospect.chiffreAffaires)} EUR/an`);
    if (prospect.effectif) fLines.push(`- Effectif : ${prospect.effectif} salaries`);
    if (prospect.legalForm || prospect.formeJuridique) fLines.push(`- Forme juridique : ${prospect.legalForm || prospect.formeJuridique}`);
    if (prospect.dateCreation) fLines.push(`- Date creation : ${prospect.dateCreation}`);
    if (prospect.status || prospect.statutRcs) fLines.push(`- Statut : ${prospect.status || prospect.statutRcs}`);
    if (prospect.siret) fLines.push(`- SIRET : ${prospect.siret}`);
    if (prospect.codeNaf) fLines.push(`- Code NAF : ${prospect.codeNaf}`);
    financialSection = '\n' + fLines.join('\n') + '\n';
  }

  const prompt = `Tu es un expert en qualification de prospects B2B.

LE USER (celui qui vend) :
- Activite : ${businessProfile.activity || 'non renseigne'}
- Services : ${businessProfile.services || 'non renseigne'}
- Tarif moyen : ${businessProfile.averagePrice || 'non renseigne'}
- Cible : ${businessProfile.targetAudience || 'non renseigne'}
${criteriaSection}
LE PROSPECT (celui qu'on evalue) :
- Nom : ${prospect.companyName || prospect.contactName || 'non renseigne'}
- Secteur : ${prospect.sector || 'non renseigne'}
- Localisation : ${prospect.city || prospect.codePostal || 'non renseigne'}
- Taille : ${prospect.effectif || 'non renseigne'} employes
- Site web : ${prospect.website || 'non renseigne'}
${financialSection}${scanResult ? `
DIAGNOSTIC DU PROSPECT :
- Score PageSpeed : ${scanResult.seo?.lighthouseScore || 'N/A'}
- Note Google : ${scanResult.googleBusiness?.rating || 'N/A'}
- Nombre d'avis : ${scanResult.googleBusiness?.totalReviews || 'N/A'}
- CMS : ${scanResult.techStack?.cms || 'non detecte'}
- Analytics : ${scanResult.website?.hasAnalytics ? 'oui' : 'non'}
- Signaux detectes : ${scanResult.signals?.map(s => s.message).join('; ') || 'aucun'}
` : 'Pas de diagnostic disponible'}

EVALUE ce prospect selon 4 criteres (score 0-25 chacun, total /100) :

1. BUDGET (0-25) : Ce prospect a-t-il les moyens de payer ${businessProfile.averagePrice || 'le service'} ?${missionCriteria?.minRevenue ? ` Le user exige un CA > ${formatEuros(missionCriteria.minRevenue)} EUR.` : ''}
2. AUTORITE (0-25) : Est-ce qu'on a identifie le decideur ?
3. BESOIN (0-25) : Le besoin est-il confirme par les signaux ?
4. TIMING (0-25) : Le moment est-il bon pour contacter ?
${missionCriteria ? `
IMPORTANT : Si le prospect ne remplit PAS les criteres obligatoires du user (CA trop bas, pas assez de salaries, mauvais statut, etc.), mets "criteriaMatch": false et "recommendation": "skip". Explique pourquoi dans "criteriaReasoning".
Si les donnees financieres ne sont pas disponibles mais que le prospect POURRAIT correspondre d'apres les indices, mets "criteriaMatch": "unknown".
` : ''}
Reponds en JSON :
{
  "budget": { "score": 0, "reasoning": "..." },
  "authority": { "score": 0, "reasoning": "..." },
  "need": { "score": 0, "reasoning": "..." },
  "timing": { "score": 0, "reasoning": "..." },
  "totalScore": 0,
  "recommendation": "contact_now | contact_later | nurture | skip",
  "suggestedMessage": "Le premier message ideal pour ce prospect (1-2 phrases)"${missionCriteria ? `,
  "criteriaMatch": true/false/"unknown",
  "criteriaReasoning": "Explication du match/non-match avec les criteres"` : ''}
}`;

  // --- Fallback chain: Groq 70b → Gemini Flash → Groq 8b ---

  // Try 1: Groq llama-3.3-70b-versatile
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });
    const result = safeParseLLMJson(response.choices[0].message.content);
    result._model = 'llama-3.3-70b-versatile';
    return result;
  } catch (e) {
    if (e.status !== 429) throw e;
    console.warn('[Qualifier] Rate limit 70b, trying Gemini Flash...');
  }

  // Try 2: Gemini 2.0 Flash (BEFORE falling back to 8b)
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set');

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await geminiResponse.json();
    if (data.error) throw new Error(data.error.message);

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');

    const result = safeParseLLMJson(rawText);
    result._model = 'gemini-2.0-flash';
    return result;
  } catch (e) {
    console.warn('[Qualifier] Gemini Flash failed, trying Groq 8b...', e.message);
  }

  // Try 3: Groq llama-3.1-8b-instant (last resort LLM)
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });
    const result = safeParseLLMJson(response.choices[0].message.content);
    result._model = 'llama-3.1-8b-instant';
    return result;
  } catch (e) {
    console.warn('[Qualifier] All LLMs failed:', e.message);
    throw e;
  }
}

// ============================================================================
// EXPORTS SUPPLEMENTAIRES (pour les tests)
// ============================================================================

export { computeRuleBasedScore, mergeScores };

function formatEuros(amount) {
  if (!amount) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toString();
}
