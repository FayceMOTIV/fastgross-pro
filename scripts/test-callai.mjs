#!/usr/bin/env node
/**
 * Test callAI fallback chain: Groq → OpenRouter → Gemini
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env
const envContent = readFileSync(resolve(__dirname, '../functions/.env'), 'utf8')
envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim()
    const val = trimmed.substring(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
})

const { callAI, extractJSON } = await import('../functions/src/ai/callAI.js')

console.log('=== Test callAI (Groq → OpenRouter → Gemini) ===\n')
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'set' : 'MISSING')
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'set' : 'MISSING')
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'set' : 'MISSING')

// Test 1: Simple text response
console.log('\n--- Test 1: Simple text ---')
try {
  const result = await callAI('Reponds juste "OK" en un seul mot.', 10)
  console.log('Response:', result.trim())
  console.log('✓ PASS')
} catch (e) {
  console.log('✗ FAIL:', e.message)
}

// Test 2: extractJSON utility
console.log('\n--- Test 2: extractJSON ---')
const json1 = extractJSON('Some text {"score": 85, "reason": "test"} more text')
console.log('Parsed:', JSON.stringify(json1))
console.log(json1?.score === 85 ? '✓ PASS' : '✗ FAIL')

// Test 3: JSON response (simulates qualification)
console.log('\n--- Test 3: Qualification-like prompt ---')
try {
  const qualResult = await callAI(`Tu es un expert. Analyse ce profil et donne un score.

PROFIL: Restaurant Le Petit Lyon, 500 followers, bio "Cuisine traditionnelle lyonnaise"

Reponds UNIQUEMENT avec ce JSON:
{"score": 75, "reason": "explication", "approach": "approche"}`, 200)

  const parsed = extractJSON(qualResult)
  console.log('Response:', qualResult.substring(0, 100))
  console.log('Parsed score:', parsed?.score)
  console.log(parsed?.score >= 0 && parsed?.score <= 100 ? '✓ PASS' : '✗ FAIL')
} catch (e) {
  console.log('✗ FAIL:', e.message)
}

// Test 4: Verify modules import correctly
console.log('\n--- Test 4: Hunter imports ---')
try {
  await import('../functions/src/hunters/instagram/instagramHunter.js')
  console.log('instagramHunter: ✓ imports OK')
} catch (e) {
  console.log('instagramHunter: ✗', e.message.substring(0, 80))
}

try {
  await import('../functions/src/hunters/tiktok/tiktokHunter.js')
  console.log('tiktokHunter: ✓ imports OK')
} catch (e) {
  console.log('tiktokHunter: ✗', e.message.substring(0, 80))
}

try {
  await import('../functions/src/hunters/facebook/facebookHunter.js')
  console.log('facebookHunter: ✓ imports OK')
} catch (e) {
  console.log('facebookHunter: ✗', e.message.substring(0, 80))
}

try {
  await import('../functions/src/hunters/instagram/instagramDmSender.js')
  console.log('instagramDmSender: ✓ imports OK')
} catch (e) {
  console.log('instagramDmSender: ✗', e.message.substring(0, 80))
}

try {
  await import('../functions/src/hunters/email/emailSequenceSender.js')
  console.log('emailSequenceSender: ✓ imports OK')
} catch (e) {
  console.log('emailSequenceSender: ✗', e.message.substring(0, 80))
}

console.log('\n=== Done ===')
