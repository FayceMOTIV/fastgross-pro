/**
 * prospectQualifier.js — La qualification contextuelle (BANT)
 * B (Budget) : Ce prospect a-t-il les moyens ?
 * A (Authority) : On parle au decideur ?
 * N (Need) : Le besoin est-il confirme par les signaux ?
 * T (Timing) : Le moment est-il bon ?
 */
import Groq from 'groq-sdk';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function qualifyProspect(prospect, businessProfile, scanResult, searchPlan, missionCriteria = null) {
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

  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let response;
  for (const model of MODELS) {
    try {
      response = await getGroq().chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });
      break;
    } catch (e) {
      if (e.status === 429 && model === MODELS[0]) {
        console.warn(`[Qualifier] Rate limit 70b, fallback → ${MODELS[1]}`);
        continue;
      }
      throw e;
    }
  }

  return JSON.parse(response.choices[0].message.content);
}

function formatEuros(amount) {
  if (!amount) return '0';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toString();
}
