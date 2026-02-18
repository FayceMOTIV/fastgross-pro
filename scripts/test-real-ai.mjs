#!/usr/bin/env node

/**
 * Test AI Providers with Real Prospect Data
 * Tests Groq, OpenRouter, and Gemini directly
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from functions directory
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

// Real prospect data
const realProspects = [
  {
    name: "Le Comptoir du 6eme",
    bio: "Restaurant bistronomique au coeur de Paris. Cuisine francaise moderne. Ouvert en 2024. Chef etoile. 2.8K followers.",
    category: "Food & Drink",
    followers: "2800",
    instagram: "@lecomptoirdu6"
  },
  {
    name: "Marie Cuisine - Food Blog",
    bio: "Food blogger parisienne. Critiques de restaurants & recettes maison. Partenariats bienvenue. 12K followers.",
    category: "Food & Drink",
    followers: "12000",
    instagram: "@mariecuisine"
  },
  {
    name: "Sushi Bar Takumi",
    bio: "Meilleur sushi de Paris selon Le Figaro. Chef japonais authentique. Ouvert depuis 2023. 4.2K followers.",
    category: "Food & Drink",
    followers: "4200",
    instagram: "@sushibartakumi"
  },
  {
    name: "Patisserie Douce",
    bio: "Patisserie artisanale francaise. Creations uniques. Livraison Paris. Instagram pour commandes. 8.5K followers.",
    category: "Food & Drink",
    followers: "8500",
    instagram: "@patisseriedouce"
  },
  {
    name: "Chef Thomas - Cooking Classes",
    bio: "Chef a domicile & cours de cuisine Paris. 15 ans d'experience. Specialite francaise. DM pour reservations. 6.1K followers.",
    category: "Food & Drink",
    followers: "6100",
    instagram: "@chefthomasparis"
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
Proposition de valeur: Videos virales qui convertissent en clients reels. ROI mesurable et garanti.
Resultats typiques: +300% engagement Instagram, +50 nouveaux clients/an.

MISSION:
Genere 3 angles de prospection personnalises pour ce prospect.
Chaque angle doit etre une accroche de 2-3 phrases, personnalisee avec les details du prospect.

Reponds en JSON strict:
{
  "angle1": "Premiere accroche personnalisee...",
  "angle2": "Deuxieme accroche personnalisee...",
  "angle3": "Troisieme accroche personnalisee..."
}`
}

// ---- PROVIDER FUNCTIONS ----

async function testGroq(prompt) {
  if (!GROQ_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7
    })
  })
  const data = await resp.json()
  const latency = Date.now() - start
  if (data.error) return { success: false, error: data.error.message, latency }
  const content = data.choices?.[0]?.message?.content || ''
  return { success: true, content, latency, provider: 'groq', model: 'llama-3.3-70b-versatile' }
}

async function testOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
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
      max_tokens: 800,
      temperature: 0.7
    })
  })
  const data = await resp.json()
  const latency = Date.now() - start
  if (data.error) return { success: false, error: data.error.message || JSON.stringify(data.error), latency }
  const content = data.choices?.[0]?.message?.content || ''
  return { success: true, content, latency, provider: 'openrouter', model: 'llama-3.3-70b-instruct:free' }
}

async function testGemini(prompt) {
  if (!GEMINI_API_KEY) return { success: false, error: 'No API key' }
  const start = Date.now()
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    }
  )
  const data = await resp.json()
  const latency = Date.now() - start
  if (data.error) return { success: false, error: data.error.message, latency }
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return { success: true, content, latency, provider: 'gemini', model: 'gemini-1.5-flash' }
}

function parseAngles(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return [parsed.angle1, parsed.angle2, parsed.angle3].filter(Boolean)
    }
  } catch {}
  return []
}

function analyzeQuality(angles, prospect) {
  if (!angles || angles.length === 0) {
    return { score: 0, personalized: false, relevant: false, actionable: false }
  }

  let score = 5
  let personalized = false
  let relevant = false
  let actionable = false

  const allText = angles.join(' ').toLowerCase()
  const nameLower = prospect.name.toLowerCase()

  // Check personalization
  if (allText.includes(nameLower) || allText.includes(prospect.instagram?.toLowerCase()) ||
      allText.includes(prospect.followers)) {
    personalized = true
    score += 2
  }

  // Check relevance
  if (allText.includes('restaurant') || allText.includes('food') ||
      allText.includes('video') || allText.includes('contenu') ||
      allText.includes('instagram') || allText.includes('clients')) {
    relevant = true
    score += 2
  }

  // Check actionability
  if (allText.includes('appel') || allText.includes('rdv') ||
      allText.includes('discuter') || allText.includes('resultats') ||
      allText.includes('clients') || allText.includes('visibilite')) {
    actionable = true
    score += 1
  }

  return { score, personalized, relevant, actionable }
}

// ---- MAIN TEST ----

async function main() {
  console.log('='.repeat(60))
  console.log('  AI PROVIDERS TEST WITH REAL PROSPECT DATA')
  console.log('='.repeat(60))
  console.log()

  console.log('API Keys status:')
  console.log(`  Groq:       ${GROQ_API_KEY ? 'CONFIGURED' : 'MISSING'}`)
  console.log(`  OpenRouter: ${OPENROUTER_API_KEY ? 'CONFIGURED' : 'MISSING'}`)
  console.log(`  Gemini:     ${GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING'}`)
  console.log()

  // --- Test 1: Provider Health Check (one call each) ---
  console.log('-'.repeat(60))
  console.log('PHASE 1: Provider Health Check')
  console.log('-'.repeat(60))

  const healthPrompt = buildPrompt(realProspects[0])

  const [groqResult, openrouterResult, geminiResult] = await Promise.allSettled([
    testGroq(healthPrompt),
    testOpenRouter(healthPrompt),
    testGemini(healthPrompt)
  ])

  const providers = [
    { name: 'Groq', result: groqResult.status === 'fulfilled' ? groqResult.value : { success: false, error: groqResult.reason?.message } },
    { name: 'OpenRouter', result: openrouterResult.status === 'fulfilled' ? openrouterResult.value : { success: false, error: openrouterResult.reason?.message } },
    { name: 'Gemini', result: geminiResult.status === 'fulfilled' ? geminiResult.value : { success: false, error: geminiResult.reason?.message } }
  ]

  for (const p of providers) {
    if (p.result.success) {
      const angles = parseAngles(p.result.content)
      console.log(`  ${p.name}: OK (${p.result.latency}ms, ${angles.length} angles)`)
    } else {
      console.log(`  ${p.name}: FAILED - ${p.result.error}`)
    }
  }

  // Pick the first working provider for the full test
  const workingProvider = providers.find(p => p.result.success)
  if (!workingProvider) {
    console.log('\nFATAL: No AI providers are working. Cannot continue tests.')
    process.exit(1)
  }

  const testFn = workingProvider.name === 'Groq' ? testGroq
    : workingProvider.name === 'OpenRouter' ? testOpenRouter
    : testGemini

  console.log(`\nUsing ${workingProvider.name} for full prospect tests.\n`)

  // --- Test 2: Full Prospect Tests ---
  console.log('-'.repeat(60))
  console.log('PHASE 2: Full Prospect AI Generation')
  console.log('-'.repeat(60))

  const allResults = []

  for (const prospect of realProspects) {
    console.log(`\n  Prospect: ${prospect.name}`)
    console.log(`  Bio: ${prospect.bio.substring(0, 80)}...`)

    const prompt = buildPrompt(prospect)
    const result = await testFn(prompt)

    if (result.success) {
      const angles = parseAngles(result.content)
      const quality = analyzeQuality(angles, prospect)

      console.log(`  Status: OK (${result.latency}ms)`)
      console.log(`  Angles: ${angles.length}`)
      console.log(`  Quality: ${quality.score}/10 (P:${quality.personalized} R:${quality.relevant} A:${quality.actionable})`)

      if (angles.length > 0) {
        console.log(`  Sample: "${angles[0].substring(0, 120)}..."`)
      }

      allResults.push({ prospect: prospect.name, success: true, angles, quality, latency: result.latency })
    } else {
      console.log(`  Status: FAILED - ${result.error}`)
      allResults.push({ prospect: prospect.name, success: false, error: result.error })
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000))
  }

  // --- Summary ---
  console.log('\n' + '='.repeat(60))
  console.log('  SUMMARY')
  console.log('='.repeat(60))

  const successful = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)
  const avgQuality = successful.length > 0
    ? (successful.reduce((sum, r) => sum + r.quality.score, 0) / successful.length).toFixed(1)
    : 0
  const avgLatency = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.latency, 0) / successful.length)
    : 0
  const allPersonalized = successful.every(r => r.quality.personalized)
  const allRelevant = successful.every(r => r.quality.relevant)

  console.log()
  console.log(`  Provider tested:     ${workingProvider.name}`)
  console.log(`  Total prospects:     ${realProspects.length}`)
  console.log(`  Successful:          ${successful.length}/${realProspects.length}`)
  console.log(`  Failed:              ${failed.length}`)
  console.log(`  Avg quality:         ${avgQuality}/10`)
  console.log(`  Avg latency:         ${avgLatency}ms`)
  console.log(`  All personalized:    ${allPersonalized ? 'YES' : 'NO'}`)
  console.log(`  All relevant:        ${allRelevant ? 'YES' : 'NO'}`)
  console.log()

  // Provider status summary
  console.log('  Provider Status:')
  for (const p of providers) {
    console.log(`    ${p.name}: ${p.result.success ? 'ONLINE' : 'OFFLINE'} ${p.result.latency ? `(${p.result.latency}ms)` : ''}`)
  }
  console.log()

  const verdict = successful.length === realProspects.length && parseFloat(avgQuality) >= 5
  console.log(`  VERDICT: ${verdict ? 'AI SYSTEM WORKS!' : 'AI NEEDS ATTENTION'}`)
  console.log()
  console.log('='.repeat(60))

  // Output structured results for the report
  const report = {
    timestamp: new Date().toISOString(),
    providers: providers.map(p => ({
      name: p.name,
      status: p.result.success ? 'ONLINE' : 'OFFLINE',
      latency: p.result.latency || null,
      error: p.result.error || null
    })),
    providerUsed: workingProvider.name,
    results: allResults.map(r => ({
      prospect: r.prospect,
      success: r.success,
      angles: r.angles?.length || 0,
      quality: r.quality?.score || 0,
      latency: r.latency || 0,
      error: r.error || null
    })),
    summary: {
      total: realProspects.length,
      successful: successful.length,
      avgQuality,
      avgLatency,
      allPersonalized,
      allRelevant,
      verdict
    }
  }

  console.log('\nJSON_REPORT_START')
  console.log(JSON.stringify(report, null, 2))
  console.log('JSON_REPORT_END')

  process.exit(verdict ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
