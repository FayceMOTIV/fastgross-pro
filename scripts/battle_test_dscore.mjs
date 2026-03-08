/**
 * BATTLE TEST — DScore sur 5 avatars
 * Vérifie que les scores sont cohérents avec les profils
 */
import { writeFileSync, mkdirSync } from 'fs';
import Groq from 'groq-sdk';

mkdirSync('/tmp/fmf_battle_test/dscore', { recursive: true });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AVATARS = [
  {
    id: 'michel_plombier',
    companyName: 'Plomberie Dupont',
    siret: '12345678901234',
    naf: '4322A',
    city: 'Lyon',
    employees: 2,
    placeData: { found: false, rating: null, reviewCount: 0, hasPhotos: false, ownerResponseRate: 0 },
    socialData: { facebookLastPost: null, instagramFollowers: 0, hasLinkedinPage: false },
    reviewsData: { trustpilotScore: 2.1, unrepliedNegative: 3 },
    // DScore = NEED score (high = more digital gaps = CRITIQUE)
    expectedDScore: { min: 78, max: 95 },
    expectedUrgency: 'CRITIQUE'
  },
  {
    id: 'sarah_restauratrice',
    companyName: 'Le Petit Comptoir',
    siret: '23456789012345',
    naf: '5610A',
    city: 'Bordeaux',
    employees: 5,
    placeData: { found: true, rating: 4.2, reviewCount: 87, hasPhotos: true, ownerResponseRate: 0.45 },
    socialData: { facebookLastPost: new Date(Date.now() - 24*60*60*1000).toISOString(), instagramFollowers: 450, hasLinkedinPage: false },
    reviewsData: { trustpilotScore: null, unrepliedNegative: 1 },
    // Partial presence — medium need
    expectedDScore: { min: 45, max: 70 },
    expectedUrgency: 'LATENT'
  },
  {
    id: 'thomas_dg_pme',
    companyName: 'Leroux Industries',
    siret: '34567890123456',
    naf: '2562A',
    city: 'Nantes',
    employees: 47,
    placeData: { found: true, rating: 3.8, reviewCount: 12, hasPhotos: true, ownerResponseRate: 0.7 },
    socialData: { facebookLastPost: new Date(Date.now() - 15*24*60*60*1000).toISOString(), instagramFollowers: 0, hasLinkedinPage: true, linkedinEmployees: 47 },
    reviewsData: { trustpilotScore: 3.5, unrepliedNegative: 0 },
    // Good presence but gaps — medium need (no website = +30% weight)
    expectedDScore: { min: 50, max: 75 },
    expectedUrgency: 'LATENT'
  },
  {
    id: 'nadia_coiffeuse',
    companyName: 'Salon Nadia',
    siret: '45678901234567',
    naf: '9602A',
    city: 'Paris 18',
    employees: 1,
    placeData: { found: false, rating: null, reviewCount: 0, hasPhotos: false, ownerResponseRate: 0 },
    socialData: { facebookLastPost: new Date(Date.now() - 1*60*60*1000).toISOString(), instagramFollowers: 2300, hasLinkedinPage: false },
    reviewsData: { trustpilotScore: null, unrepliedNegative: 0 },
    // Social only, no Maps, no website — high need
    expectedDScore: { min: 65, max: 85 },
    expectedUrgency: 'CRITIQUE'
  },
  {
    id: 'pierre_yves_expert_comptable',
    companyName: 'Cabinet Moreau & Associés',
    siret: '56789012345678',
    naf: '6920Z',
    city: 'Lille',
    employees: 8,
    placeData: { found: true, rating: 4.7, reviewCount: 34, hasPhotos: true, ownerResponseRate: 0.85 },
    socialData: { facebookLastPost: new Date(Date.now() - 3*24*60*60*1000).toISOString(), instagramFollowers: 120, hasLinkedinPage: true, linkedinEmployees: 8 },
    reviewsData: { trustpilotScore: 4.5, unrepliedNegative: 0 },
    // Best presence — lowest need (but no website = still +30%)
    expectedDScore: { min: 40, max: 65 },
    expectedUrgency: 'LATENT'
  }
];

// Calcul DScore simulé (en attendant d'importer le vrai moteur)
async function calculateDScoreSimulated(avatar) {
  const prompt = `Tu es un moteur de scoring de présence digitale pour TPE/PME françaises.
Calcule un DScore entre 0 et 100 pour cette entreprise selon ses données digitales.

Données :
- Secteur NAF : ${avatar.naf}
- Employés : ${avatar.employees}
- Google Maps : ${avatar.placeData.found ? `Oui — ${avatar.placeData.rating}⭐ (${avatar.placeData.reviewCount} avis)` : 'Non trouvé'}
- Instagram : ${avatar.socialData.instagramFollowers} abonnés
- LinkedIn : ${avatar.socialData.hasLinkedinPage ? 'Oui' : 'Non'}
- Dernière pub Facebook : ${avatar.socialData.facebookLastPost ? new Date(avatar.socialData.facebookLastPost).toLocaleDateString('fr-FR') : 'Jamais'}
- Trustpilot : ${avatar.reviewsData.trustpilotScore || 'N/A'}

Règles :
- Score bas (0-25) = CRITIQUE : très peu de présence digitale
- Score moyen (26-55) = LATENT : présence partielle, besoins latents
- Score élevé (56-85) = MATURE : présence développée

Réponds UNIQUEMENT en JSON : {"dScore": <number>, "urgency": "CRITIQUE|LATENT|MATURE", "summary": "<1 phrase>", "topSignals": ["signal1", "signal2", "signal3"]}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 200,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  });

  return JSON.parse(completion.choices[0]?.message?.content || '{}');
}

async function testDScore(avatar) {
  console.log(`\n🎯 Test DScore — ${avatar.companyName} (${avatar.id})`);

  try {
    // Essaie d'importer le vrai moteur d'abord
    let result;
    try {
      const { calculateDScore } = await import('../functions/src/intelligence/dScoreEngine.js');
      result = await calculateDScore(avatar);
      console.log('   (moteur réel utilisé)');
    } catch {
      result = await calculateDScoreSimulated(avatar);
      console.log('   (moteur simulé via Groq)');
    }

    const passed = result.dScore >= avatar.expectedDScore.min && result.dScore <= avatar.expectedDScore.max;
    const urgencyPassed = result.urgency === avatar.expectedUrgency;

    const report = {
      avatar: avatar.id,
      companyName: avatar.companyName,
      dScore: result.dScore,
      expectedRange: avatar.expectedDScore,
      scorePassed: passed,
      urgency: result.urgency,
      expectedUrgency: avatar.expectedUrgency,
      urgencyPassed,
      summary: result.summary,
      topSignals: result.topSignals,
      overallPassed: passed && urgencyPassed
    };

    console.log(`   DScore: ${result.dScore}/100 ${passed ? '✅' : '❌ HORS RANGE'} (attendu: ${avatar.expectedDScore.min}-${avatar.expectedDScore.max})`);
    console.log(`   Urgency: ${result.urgency} ${urgencyPassed ? '✅' : '❌ FAUX'} (attendu: ${avatar.expectedUrgency})`);
    console.log(`   Summary: "${result.summary}"`);
    result.topSignals?.forEach(s => console.log(`   • ${s}`));

    writeFileSync(`/tmp/fmf_battle_test/dscore/${avatar.id}.json`, JSON.stringify(report, null, 2));
    return report;
  } catch (err) {
    console.error(`   ❌ ERREUR: ${err.message}`);
    return { avatar: avatar.id, overallPassed: false, error: err.message };
  }
}

const results = [];
for (const avatar of AVATARS) {
  results.push(await testDScore(avatar));
  await new Promise(r => setTimeout(r, 800));
}

const passed = results.filter(r => r.overallPassed).length;
console.log(`\n📊 DScore: ${passed}/${AVATARS.length} avatars PASSED`);
writeFileSync('/tmp/fmf_battle_test/dscore/summary.json', JSON.stringify(results, null, 2));
