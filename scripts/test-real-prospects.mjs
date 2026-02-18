#!/usr/bin/env node

/**
 * TEST AI QUALITY WITH 5 REALISTIC PROSPECTS
 * Calls Groq, OpenRouter, Gemini directly to test quality
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
const envPath = resolve(__dirname, '../functions/.env')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...valueParts] = trimmed.split('=')
  const value = valueParts.join('=')
  if (key && value) process.env[key.trim()] = value.trim()
}

const GROQ_API_KEY = process.env.GROQ_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// 5 realistic prospect profiles
const realProspects = [
  {
    name: "Le Comptoir du Marais",
    bio: "Restaurant bistronomique au coeur du Marais. Cuisine francaise moderne avec produits locaux. Ouvert Mars 2024. Chef forme chez Alain Ducasse. 2.3K followers Instagram.",
    category: "Food & Drink",
    followers: "2300",
    instagram: "@lecomptoirdumarais",
    signals: ["Nouveau (9 mois)", "< 5K followers", "Chef renomme", "Quartier touristique"],
    expectedQuality: 9
  },
  {
    name: "Sophie Food Stories",
    bio: "Food blogger Paris. Critiques restaurants & recettes. 14.2K followers. Partenariats DM. Clients: Airbnb, HelloFresh",
    category: "Food & Drink",
    followers: "14200",
    instagram: "@sophiefoodstories",
    signals: ["Audience engagee", "Partenariats actifs", "Croissance stagnante"],
    expectedQuality: 8
  },
  {
    name: "Sushi Master Takeshi",
    bio: "Chef sushi japonais authentique. 20 ans experience Tokyo. Restaurant Paris 11eme depuis 2023. Meilleur sushi selon TimeOut Paris. 5.8K followers.",
    category: "Food & Drink",
    followers: "5800",
    instagram: "@sushimastertakeshi",
    signals: ["Expertise reconnue", "Presse positive", "Visibilite moyenne"],
    expectedQuality: 8
  },
  {
    name: "La Patisserie de Luna",
    bio: "Patisserie artisanale francaise. Creations uniques. Commandes Instagram. Livraison Paris. Chef patissiere formee MOF. 11.5K followers",
    category: "Food & Drink",
    followers: "11500",
    instagram: "@patisserieluna",
    signals: ["Commandes Instagram", "Qualite artisanale", "Audience fidele"],
    expectedQuality: 9
  },
  {
    name: "Chef Martin - Cours Cuisine",
    bio: "Chef a domicile & cours de cuisine Paris. 18 ans experience restaurants etoiles. Specialiste cuisine francaise. Reservations par DM. 7.2K followers.",
    category: "Food & Drink",
    followers: "7200",
    instagram: "@chefmartinparis",
    signals: ["Service premium", "Clientele aisee", "Reservations actives"],
    expectedQuality: 7
  }
]

function buildPrompt(prospect) {
  return `Tu es un expert en prospection B2B pour une agence de creation de contenu video.

PROSPECT:
- Nom: ${prospect.name}
- Bio: ${prospect.bio}
- Categorie: ${prospect.category}
- Followers: ${prospect.followers}
- Instagram: ${prospect.instagram}

SERVICE PROPOSE:
Creation de contenu video professionnel pour restaurants et food creators.
Proposition de valeur: Videos virales Instagram/TikTok qui convertissent en clients reels. ROI mesurable et garanti.
Resultats typiques: +300% engagement Instagram, +50 nouveaux clients/an.

MISSION:
Genere 3 angles de prospection personnalises pour ce prospect.
Chaque angle doit etre une accroche de 2-3 phrases, personnalisee avec les details specifiques du prospect.
Chaque angle doit inclure un appel a l'action (discuter, rdv, echanger, appel...).

Reponds en JSON strict:
{
  "angle1": "Premiere accroche personnalisee...",
  "angle2": "Deuxieme accroche personnalisee...",
  "angle3": "Troisieme accroche personnalisee..."
}`
}

async function callGroq(prompt) {
  if (!GROQ_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    })
    const data = await resp.json()
    const latency = Date.now() - start
    if (data.error) return { success: false, error: data.error.message, latency }
    return { success: true, content: data.choices?.[0]?.message?.content || '', latency, provider: 'groq' }
  } catch (e) {
    return { success: false, error: e.message, latency: Date.now() - start }
  }
}

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://face-media-factory.web.app',
        'X-Title': 'Face Media Factory'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    })
    const data = await resp.json()
    const latency = Date.now() - start
    if (data.error) return { success: false, error: data.error?.message || JSON.stringify(data.error), latency }
    return { success: true, content: data.choices?.[0]?.message?.content || '', latency, provider: 'openrouter' }
  } catch (e) {
    return { success: false, error: e.message, latency: Date.now() - start }
  }
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
  // Try gemini-2.0-flash first, then gemini-1.5-flash
  for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
          })
        }
      )
      const data = await resp.json()
      const latency = Date.now() - start
      if (data.error) continue // Try next model
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (content) return { success: true, content, latency, provider: 'gemini', model }
    } catch (e) {
      continue
    }
  }
  return { success: false, error: 'All Gemini models failed', latency: Date.now() - start }
}

function parseAngles(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return [parsed.angle1, parsed.angle2, parsed.angle3].filter(Boolean)
    }
  } catch {}
  // Fallback: extract quoted strings
  const matches = content.match(/"([^"]{50,})"/g)
  if (matches && matches.length >= 2) {
    return matches.map(m => m.replace(/^"|"$/g, '')).slice(0, 3)
  }
  return []
}

function analyzeQuality(angles, prospect) {
  if (!angles || angles.length === 0) {
    return { score: 0, personalized: false, relevant: false, actionable: false, creative: false, details: ["No angles generated"] }
  }

  let score = 0
  const details = []
  const allText = angles.join(' ').toLowerCase()
  const nameLower = prospect.name.toLowerCase()
  const bio = prospect.bio.toLowerCase()

  // 1. PERSONALIZATION (30 pts)
  let personalized = false
  if (allText.includes(nameLower) || allText.includes(prospect.instagram.toLowerCase())) {
    score += 10
    personalized = true
    details.push("Mentionne le nom/instagram du prospect")
  } else {
    details.push("Ne mentionne PAS le nom du prospect")
  }

  // Specific details from bio
  let specificCount = 0
  const bioKeywords = bio.split(/\s+/).filter(w => w.length > 5)
  for (const kw of bioKeywords) {
    if (allText.includes(kw) && !['depuis', 'french', 'cuisine', 'paris'].includes(kw)) specificCount++
  }
  if (allText.includes(prospect.followers) || allText.match(/\d+[\s.]?\d*k?\s*followers/i)) specificCount++

  if (specificCount >= 3) {
    score += 20
    details.push(`Mentionne ${specificCount} details specifiques de la bio`)
  } else if (specificCount >= 1) {
    score += 10
    details.push(`Mentionne ${specificCount} detail(s) specifique(s) (insuffisant)`)
  } else {
    details.push("Aucun detail specifique de la bio")
  }

  // 2. RELEVANCE (25 pts)
  let relevant = false
  const relevantKeywords = ['video', 'contenu', 'instagram', 'visibilite', 'clients', 'engagement', 'reels', 'tiktok']
  const foundKeywords = relevantKeywords.filter(k => allText.includes(k))
  if (foundKeywords.length >= 4) {
    score += 25
    relevant = true
    details.push(`Pertinent (${foundKeywords.length}/${relevantKeywords.length} mots-cles)`)
  } else {
    score += foundKeywords.length * 3
    details.push(`Pertinence partielle (${foundKeywords.length}/${relevantKeywords.length} mots-cles)`)
  }

  // 3. ACTIONABLE (25 pts)
  let actionable = false
  const ctaWords = ['appel', 'rdv', 'discuter', 'echanger', 'rencontrer', 'call', 'demo', 'contactez', 'echangeons', 'parlons', 'rendez-vous']
  const hasCTA = ctaWords.some(c => allText.includes(c))
  if (hasCTA) {
    score += 15
    actionable = true
    details.push("Appel a l'action present")
  } else {
    details.push("Aucun appel a l'action clair")
  }

  const hasResults = allText.includes('resultat') || allText.includes('roi') ||
    allText.includes('croissance') || allText.includes('tripler') || allText.includes('doubler')
  if (hasResults) {
    score += 10
    details.push("Mentionne des resultats concrets")
  }

  // 4. CREATIVITY (20 pts)
  let creative = false
  const genericPhrases = ['je peux vous aider', 'nous proposons', 'nos services', 'contactez-nous', 'n\'hesitez pas']
  const isGeneric = genericPhrases.some(p => allText.includes(p))
  if (!isGeneric) {
    score += 10
    details.push("Approche creative (pas de phrases bateau)")
  } else {
    details.push("Utilise des phrases generiques")
  }

  const hasHook = angles[0] && angles[0].length > 50 &&
    (angles[0].includes('?') || allText.includes('remarque') || allText.includes('decouvert') || allText.includes('imagine'))
  if (hasHook) {
    score += 10
    creative = true
    details.push("Accroche storytelling originale")
  }

  return { score: Math.min(score, 100), personalized, relevant, actionable, creative, details }
}

// ===== MAIN TEST =====

async function main() {
  console.log('='.repeat(70))
  console.log('  AI QUALITY TEST WITH 5 REALISTIC PROSPECTS')
  console.log('='.repeat(70))
  console.log()

  // Phase 1: Provider health check
  console.log('-'.repeat(70))
  console.log('PHASE 1: Provider Health Check')
  console.log('-'.repeat(70))

  const healthPrompt = buildPrompt(realProspects[0])
  const [groqR, openrouterR, geminiR] = await Promise.allSettled([
    callGroq(healthPrompt),
    callOpenRouter(healthPrompt),
    callGemini(healthPrompt)
  ])

  const providers = [
    { name: 'Groq', result: groqR.status === 'fulfilled' ? groqR.value : { success: false, error: groqR.reason?.message } },
    { name: 'OpenRouter', result: openrouterR.status === 'fulfilled' ? openrouterR.value : { success: false, error: openrouterR.reason?.message } },
    { name: 'Gemini', result: geminiR.status === 'fulfilled' ? geminiR.value : { success: false, error: geminiR.reason?.message } }
  ]

  for (const p of providers) {
    if (p.result.success) {
      const angles = parseAngles(p.result.content)
      console.log(`  ${p.name}: ONLINE (${p.result.latency}ms, ${angles.length} angles)`)
    } else {
      console.log(`  ${p.name}: OFFLINE - ${p.result.error}`)
    }
  }

  // Pick working provider
  const workingProvider = providers.find(p => p.result.success)
  if (!workingProvider) {
    console.log('\nFATAL: No AI providers working.')
    writeFileSync(resolve(__dirname, '../test-results-ai.json'), JSON.stringify({
      success: false,
      verdict: 'CASSE - Aucun provider AI ne fonctionne',
      icon: 'BROKEN',
      summary: { total: 0, successful: 0, meetsExpectations: 0, avgQuality: '0', allPersonalized: false, allRelevant: false, allActionable: false },
      results: [],
      providers: providers.map(p => ({ name: p.name, status: p.result.success ? 'ONLINE' : 'OFFLINE', latency: p.result.latency, error: p.result.error }))
    }, null, 2))
    process.exit(1)
  }

  const testFn = workingProvider.name === 'Groq' ? callGroq
    : workingProvider.name === 'OpenRouter' ? callOpenRouter
    : callGemini

  // Also use the health check result for prospect 0
  const healthAngles = parseAngles(workingProvider.result.content)
  const healthQuality = analyzeQuality(healthAngles, realProspects[0])

  console.log(`\nUsing ${workingProvider.name} for full tests.\n`)

  // Phase 2: Full tests
  console.log('-'.repeat(70))
  console.log('PHASE 2: Full Prospect AI Generation (5 prospects)')
  console.log('-'.repeat(70))

  const allResults = []

  // Use health check result for prospect 0
  console.log(`\n  PROSPECT 1/5: ${realProspects[0].name}`)
  console.log(`  Bio: ${realProspects[0].bio.substring(0, 80)}...`)
  console.log(`  Status: OK (${workingProvider.result.latency}ms) - from health check`)
  console.log(`  Angles: ${healthAngles.length}`)
  console.log(`  Quality: ${healthQuality.score}/100 (expected: ${realProspects[0].expectedQuality * 10}/100)`)
  if (healthAngles.length > 0) {
    console.log(`  Sample: "${healthAngles[0].substring(0, 120)}..."`)
  }
  console.log(`  ${healthQuality.details.map(d => '    ' + d).join('\n')}`)
  allResults.push({
    prospect: realProspects[0].name,
    success: true,
    angles: healthAngles,
    quality: healthQuality,
    latency: workingProvider.result.latency,
    meetsExpectation: healthQuality.score >= (realProspects[0].expectedQuality * 10 - 15),
    provider: workingProvider.name
  })

  // Test remaining prospects
  for (let i = 1; i < realProspects.length; i++) {
    const prospect = realProspects[i]
    console.log(`\n  PROSPECT ${i + 1}/5: ${prospect.name}`)
    console.log(`  Bio: ${prospect.bio.substring(0, 80)}...`)

    const prompt = buildPrompt(prospect)
    const result = await testFn(prompt)

    if (result.success) {
      const angles = parseAngles(result.content)
      const quality = analyzeQuality(angles, prospect)
      const meets = quality.score >= (prospect.expectedQuality * 10 - 15)

      console.log(`  Status: OK (${result.latency}ms)`)
      console.log(`  Angles: ${angles.length}`)
      console.log(`  Quality: ${quality.score}/100 (expected: ${prospect.expectedQuality * 10}/100)`)
      if (angles.length > 0) {
        console.log(`  Sample: "${angles[0].substring(0, 120)}..."`)
      }
      console.log(`  ${quality.details.map(d => '    ' + d).join('\n')}`)
      console.log(`  ${meets ? 'MEETS' : 'BELOW'} expectations`)

      allResults.push({
        prospect: prospect.name,
        success: true,
        angles,
        quality,
        latency: result.latency,
        meetsExpectation: meets,
        provider: workingProvider.name
      })
    } else {
      console.log(`  Status: FAILED - ${result.error}`)
      allResults.push({ prospect: prospect.name, success: false, error: result.error, meetsExpectation: false })
    }

    await new Promise(r => setTimeout(r, 800))
  }

  // Summary
  const successful = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)
  const avgQuality = successful.length > 0
    ? (successful.reduce((sum, r) => sum + r.quality.score, 0) / successful.length)
    : 0
  const avgLatency = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.latency, 0) / successful.length)
    : 0
  const meetsExpectations = allResults.filter(r => r.meetsExpectation).length
  const allPersonalized = successful.every(r => r.quality.personalized)
  const allRelevant = successful.every(r => r.quality.relevant)
  const allActionable = successful.every(r => r.quality.actionable)

  console.log('\n' + '='.repeat(70))
  console.log('  FINAL SUMMARY')
  console.log('='.repeat(70))
  console.log()
  console.log(`  Provider:            ${workingProvider.name}`)
  console.log(`  Tests run:           ${allResults.length}`)
  console.log(`  Successful:          ${successful.length}/${allResults.length}`)
  console.log(`  Meets expectations:  ${meetsExpectations}/${successful.length}`)
  console.log(`  Average quality:     ${avgQuality.toFixed(1)}/100`)
  console.log(`  Average latency:     ${avgLatency}ms`)
  console.log()
  console.log('  Quality criteria:')
  console.log(`    Personalization:   ${allPersonalized ? 'ALL' : `${successful.filter(r => r.quality.personalized).length}/${successful.length}`}`)
  console.log(`    Relevance:         ${allRelevant ? 'ALL' : `${successful.filter(r => r.quality.relevant).length}/${successful.length}`}`)
  console.log(`    Actionable:        ${allActionable ? 'ALL' : `${successful.filter(r => r.quality.actionable).length}/${successful.length}`}`)
  console.log(`    Creative:          ${successful.filter(r => r.quality.creative).length}/${successful.length}`)
  console.log()

  // Providers status
  console.log('  Providers:')
  for (const p of providers) {
    console.log(`    ${p.name}: ${p.result.success ? 'ONLINE' : 'OFFLINE'} ${p.result.latency ? `(${p.result.latency}ms)` : ''} ${p.result.error ? `- ${p.result.error.substring(0, 60)}` : ''}`)
  }

  // Verdict
  let verdict, icon
  if (successful.length === 5 && avgQuality >= 80 && meetsExpectations >= 4) {
    verdict = 'BIJOU! AI genere des angles EXCELLENTS'
    icon = 'BIJOU'
  } else if (successful.length >= 4 && avgQuality >= 60 && meetsExpectations >= 3) {
    verdict = 'DIAMANT BRUT - Qualite correcte, besoin de polish'
    icon = 'DIAMANT_BRUT'
  } else if (successful.length >= 3 && avgQuality >= 40) {
    verdict = 'CAILLOU - AI fonctionne mais qualite insuffisante'
    icon = 'CAILLOU'
  } else {
    verdict = 'CASSE - AI ne fonctionne pas correctement'
    icon = 'CASSE'
  }

  console.log()
  console.log(`  VERDICT: ${verdict}`)
  console.log()
  console.log('='.repeat(70))

  const report = {
    timestamp: new Date().toISOString(),
    success: successful.length === 5 && avgQuality >= 70,
    verdict,
    icon,
    providers: providers.map(p => ({
      name: p.name,
      status: p.result.success ? 'ONLINE' : 'OFFLINE',
      latency: p.result.latency || null,
      error: p.result.error || null,
      model: p.result.model || null
    })),
    providerUsed: workingProvider.name,
    results: allResults.map(r => ({
      prospect: r.prospect,
      success: r.success,
      angles: r.angles || [],
      qualityScore: r.quality?.score || 0,
      personalized: r.quality?.personalized || false,
      relevant: r.quality?.relevant || false,
      actionable: r.quality?.actionable || false,
      creative: r.quality?.creative || false,
      details: r.quality?.details || [],
      latency: r.latency || 0,
      meetsExpectation: r.meetsExpectation || false,
      error: r.error || null
    })),
    summary: {
      total: allResults.length,
      successful: successful.length,
      meetsExpectations,
      avgQuality: avgQuality.toFixed(1),
      avgLatency,
      allPersonalized,
      allRelevant,
      allActionable
    }
  }

  writeFileSync(resolve(__dirname, '../test-results-ai.json'), JSON.stringify(report, null, 2))
  console.log('\nResults saved to test-results-ai.json')

  process.exit(report.success ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
