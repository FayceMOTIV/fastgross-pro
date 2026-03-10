/**
 * prospectQualifier.js — La qualification contextuelle (BANT)
 * B (Budget) : Ce prospect a-t-il les moyens ?
 * A (Authority) : On parle au decideur ?
 * N (Need) : Le besoin est-il confirme par les signaux ?
 * T (Timing) : Le moment est-il bon ?
 */
import Groq from 'groq-sdk';

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function qualifyProspect(prospect, businessProfile, scanResult, searchPlan) {
  const prompt = `Tu es un expert en qualification de prospects B2B.

LE USER (celui qui vend) :
- Activite : ${businessProfile.activity || 'non renseigne'}
- Services : ${businessProfile.services || 'non renseigne'}
- Tarif moyen : ${businessProfile.averagePrice || 'non renseigne'}
- Cible : ${businessProfile.targetAudience || 'non renseigne'}

LE PROSPECT (celui qu'on evalue) :
- Nom : ${prospect.companyName || prospect.contactName || 'non renseigne'}
- Secteur : ${prospect.sector || 'non renseigne'}
- Localisation : ${prospect.city || prospect.codePostal || 'non renseigne'}
- Taille : ${prospect.effectif || 'non renseigne'} employes
- Site web : ${prospect.website || 'non renseigne'}
${scanResult ? `
DIAGNOSTIC DU PROSPECT :
- Score PageSpeed : ${scanResult.seo?.lighthouseScore || 'N/A'}
- Note Google : ${scanResult.googleBusiness?.rating || 'N/A'}
- Nombre d'avis : ${scanResult.googleBusiness?.totalReviews || 'N/A'}
- CMS : ${scanResult.techStack?.cms || 'non detecte'}
- Analytics : ${scanResult.website?.hasAnalytics ? 'oui' : 'non'}
- Signaux detectes : ${scanResult.signals?.map(s => s.message).join('; ') || 'aucun'}
` : 'Pas de diagnostic disponible'}

EVALUE ce prospect selon 4 criteres (score 0-25 chacun, total /100) :

1. BUDGET (0-25) : Ce prospect a-t-il les moyens de payer ${businessProfile.averagePrice || 'le service'} ?
2. AUTORITE (0-25) : Est-ce qu'on a identifie le decideur ?
3. BESOIN (0-25) : Le besoin est-il confirme par les signaux ?
4. TIMING (0-25) : Le moment est-il bon pour contacter ?

Reponds en JSON :
{
  "budget": { "score": 0, "reasoning": "..." },
  "authority": { "score": 0, "reasoning": "..." },
  "need": { "score": 0, "reasoning": "..." },
  "timing": { "score": 0, "reasoning": "..." },
  "totalScore": 0,
  "recommendation": "contact_now",
  "suggestedMessage": "Le premier message ideal pour ce prospect (1-2 phrases)"
}`;

  const response = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
