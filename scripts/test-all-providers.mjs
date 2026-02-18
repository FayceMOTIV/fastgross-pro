#!/usr/bin/env node
/**
 * Test All AI Providers - Face Media Factory
 * Tests each provider individually with a demo prospect
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env from functions/.env
const envContent = readFileSync(resolve(__dirname, '../functions/.env'), 'utf-8')
envContent.split('\n').forEach(line => {
  line = line.trim()
  if (!line || line.startsWith('#')) return
  const [key, ...val] = line.split('=')
  if (!process.env[key.trim()]) process.env[key.trim()] = val.join('=').trim()
})

const TEST_PROSPECT = {
  name: 'Le Petit Bistro',
  bio: 'Restaurant bistronomique Paris 11e - Chef Julien, produits frais du marche - Ouvert midi et soir - Terrasse',
  category: 'Restaurant',
  followers: 3200,
  service: 'Creation de videos courtes pour Instagram/TikTok'
}

const PROVIDERS = [
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    type: 'openai'
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY,
    model: 'nvidia/nemotron-nano-9b-v2:free',
    type: 'openai'
  },
  {
    name: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    key: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash',
    type: 'gemini'
  }
]

const PROMPT = `Tu es un expert en prospection B2B. Genere 1 message d'approche personnalise pour ce prospect.

PROSPECT: ${TEST_PROSPECT.name}
BIO: ${TEST_PROSPECT.bio}
CATEGORIE: ${TEST_PROSPECT.category}
FOLLOWERS: ${TEST_PROSPECT.followers}
SERVICE: ${TEST_PROSPECT.service}

Reponds avec UN message d'approche court (3-4 phrases max). Pas de JSON, juste le message.`

async function testProvider(provider) {
  if (!provider.key) {
    return { name: provider.name, status: 'SKIP', error: 'API key not configured', latency: 0 }
  }

  const start = Date.now()

  try {
    let response, data, content

    if (provider.type === 'gemini') {
      response = await fetch(`${provider.url}?key=${provider.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }] }],
          generationConfig: { maxOutputTokens: 1000 }
        })
      })
      data = await response.json()
      if (data.error) throw new Error(data.error.message)
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      }
      if (provider.name === 'OpenRouter') {
        headers['HTTP-Referer'] = 'https://face-media-factory.web.app'
        headers['X-Title'] = 'Face Media Factory'
      }

      response = await fetch(provider.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: PROMPT }],
          max_tokens: 1000
        })
      })
      data = await response.json()
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      content = data.choices?.[0]?.message?.content || ''
    }

    const latency = Date.now() - start

    if (!content || content.length < 20) {
      throw new Error(`Response too short (${content.length} chars)`)
    }

    return {
      name: provider.name,
      model: provider.model,
      status: 'ONLINE',
      latency,
      contentLength: content.length,
      preview: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
      error: null
    }
  } catch (error) {
    return {
      name: provider.name,
      model: provider.model,
      status: 'OFFLINE',
      latency: Date.now() - start,
      error: error.message
    }
  }
}

async function main() {
  console.log('\n========================================')
  console.log(' AI PROVIDERS TEST - Face Media Factory')
  console.log('========================================')
  console.log(`\nProspect: ${TEST_PROSPECT.name}`)
  console.log(`Service: ${TEST_PROSPECT.service}\n`)

  const results = []

  for (const provider of PROVIDERS) {
    process.stdout.write(`Testing ${provider.name}...`)
    const result = await testProvider(provider)
    results.push(result)

    if (result.status === 'ONLINE') {
      console.log(` OK (${result.latency}ms)`)
      console.log(`  Model: ${result.model}`)
      console.log(`  Preview: "${result.preview}"`)
    } else if (result.status === 'SKIP') {
      console.log(` SKIP (${result.error})`)
    } else {
      console.log(` FAIL (${result.error})`)
    }
    console.log()
  }

  // Summary
  const online = results.filter(r => r.status === 'ONLINE').length
  const total = results.filter(r => r.status !== 'SKIP').length

  console.log('========================================')
  console.log(` RESULT: ${online}/${total} providers ONLINE`)

  if (online === total && total >= 2) {
    console.log(' VERDICT: BIJOU - Failover operationnel')
  } else if (online >= 1) {
    console.log(' VERDICT: DIAMANT BRUT - Au moins 1 provider fonctionne')
  } else {
    console.log(' VERDICT: CASSE - Aucun provider disponible')
  }

  console.log('========================================\n')

  // Write results to file
  const { writeFileSync } = await import('fs')
  writeFileSync(
    resolve(__dirname, '../test-results-providers.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), results, online, total }, null, 2)
  )

  process.exit(online >= 1 ? 0 : 1)
}

main().catch(console.error)
