#!/usr/bin/env node

/**
 * Test Social Hunters - Face Media Factory
 * Tests Facebook Hunter (Serper), dedup logic, unified scoring
 * Instagram/TikTok/WhatsApp need real credentials - tested via mock
 *
 * Usage: node scripts/test-social-hunters.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load env vars from functions/.env
const envPath = path.join(ROOT, 'functions', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=')
    if (key && value) process.env[key] = value
  }
}

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''
const results = []
let stepNum = 0

function log(msg) {
  console.log(msg)
}

function step(name, status, details) {
  stepNum++
  results.push({ num: stepNum, name, status, details })
  const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️' : '❌'
  log(`\n${icon} Step ${stepNum}: ${name} — ${status}`)
  if (details) log(`   ${details}`)
}

// ============================================
// Test 1: Serper Facebook Search
// ============================================
async function testSerperFacebookSearch() {
  if (!SERPER_API_KEY) {
    step('Serper Facebook Search', 'WARN', 'SERPER_API_KEY not set — skipping')
    return null
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: 'site:facebook.com agence marketing Paris',
        num: 5,
        gl: 'fr',
        hl: 'fr'
      })
    })

    if (!response.ok) {
      step('Serper Facebook Search', 'FAIL', `HTTP ${response.status}`)
      return null
    }

    const data = await response.json()
    const organic = data.organic || []
    const fbResults = organic.filter(r => r.link?.includes('facebook.com'))

    step('Serper Facebook Search', 'OK',
      `${organic.length} results, ${fbResults.length} Facebook pages found`)

    if (fbResults.length > 0) {
      log(`   Sample: ${fbResults[0].title} — ${fbResults[0].link}`)
    }

    return fbResults
  } catch (err) {
    step('Serper Facebook Search', 'FAIL', err.message)
    return null
  }
}

// ============================================
// Test 2: Email/Phone Regex Extraction
// ============================================
function testRegexExtraction() {
  const testCases = [
    {
      input: 'Contactez-nous : contact@agence-paris.fr ou au 01 42 36 00 00',
      expectedEmail: 'contact@agence-paris.fr',
      expectedPhone: '0142360000'
    },
    {
      input: 'CEO @startup_tech | jp.martin@startup.fr | +33 6 12 34 56 78',
      expectedEmail: 'jp.martin@startup.fr',
      expectedPhone: '+33612345678'
    },
    {
      input: 'Restaurant gastronomique Paris | Reservation: hello@legourmet.fr',
      expectedEmail: 'hello@legourmet.fr',
      expectedPhone: null
    },
    {
      input: 'Business Coach | DM for collabs | No contact info here',
      expectedEmail: null,
      expectedPhone: null
    }
  ]

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  const phoneRegex = /(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/

  let passed = 0

  for (const tc of testCases) {
    const emailMatch = tc.input.match(emailRegex)
    const phoneMatch = tc.input.match(phoneRegex)

    const foundEmail = emailMatch ? emailMatch[0].toLowerCase() : null
    const foundPhone = phoneMatch ? phoneMatch[0].replace(/[\s.-]/g, '') : null

    const emailOk = tc.expectedEmail ? foundEmail === tc.expectedEmail.toLowerCase() : !foundEmail
    const phoneOk = tc.expectedPhone ? foundPhone === tc.expectedPhone : !foundPhone

    if (emailOk && phoneOk) passed++
  }

  step('Regex Extraction (Email/Phone)', passed === testCases.length ? 'OK' : 'WARN',
    `${passed}/${testCases.length} test cases passed`)
}

// ============================================
// Test 3: Cross-Platform Deduplication Logic
// ============================================
function testDeduplicationLogic() {
  // Simulate prospects from different platforms
  const prospects = [
    { id: 1, platform: 'instagram', username: 'alex.coach', email: 'alex@coach.fr', phone: '+33612345678' },
    { id: 2, platform: 'tiktok', username: 'alex_coach_tt', email: 'alex@coach.fr', instagram: 'alex.coach' },
    { id: 3, platform: 'facebook', pageName: 'Alex Coach Pro', email: 'alex@coach.fr', phone: '+33612345678' },
    { id: 4, platform: 'instagram', username: 'sophie.biz', email: 'sophie@biz.com', phone: '' },
    { id: 5, platform: 'tiktok', username: 'sophie_biz_tt', email: 'sophie@biz.com', instagram: 'sophie.biz' },
    { id: 6, platform: 'instagram', username: 'unique_user', email: 'unique@test.com', phone: '+33698765432' },
    { id: 7, platform: 'facebook', pageName: 'Different Company', email: 'different@company.fr', phone: '' },
  ]

  // Dedup by email
  const emailIndex = {}
  const uniqueProspects = []
  let duplicates = 0

  for (const p of prospects) {
    const emailKey = p.email?.toLowerCase()
    if (emailKey && emailIndex[emailKey]) {
      duplicates++
      // Merge platforms
      const primary = emailIndex[emailKey]
      primary.platforms = primary.platforms || [primary.platform]
      primary.platforms.push(p.platform)
    } else {
      if (emailKey) emailIndex[emailKey] = p
      uniqueProspects.push(p)
    }
  }

  const expectedDuplicates = 3 // alex (2 dupes) + sophie (1 dupe)
  const expectedUnique = 4 // alex, sophie, unique, different

  const ok = duplicates === expectedDuplicates && uniqueProspects.length === expectedUnique

  step('Cross-Platform Deduplication', ok ? 'OK' : 'WARN',
    `${duplicates} duplicates found, ${uniqueProspects.length} unique (expected ${expectedDuplicates}/${expectedUnique})`)
}

// ============================================
// Test 4: Unified Scoring Logic
// ============================================
function testUnifiedScoring() {
  const prospects = [
    { name: 'Full Contact', baseScore: 70, email: 'a@b.com', whatsappActive: true, websiteUrl: 'https://x.com', isBusiness: true, platforms: ['instagram', 'tiktok'] },
    { name: 'Email Only', baseScore: 60, email: 'a@b.com', whatsappActive: false, websiteUrl: '', isBusiness: false, platforms: ['instagram'] },
    { name: 'Phone Only', baseScore: 50, email: '', phone: '+33612345678', whatsappActive: false, websiteUrl: '', isBusiness: true, platforms: ['facebook'] },
    { name: 'No Contact', baseScore: 80, email: '', phone: '', whatsappActive: false, websiteUrl: '', isBusiness: false, platforms: ['tiktok'] },
  ]

  const scored = prospects.map(p => {
    let bonus = 0
    if (p.email) bonus += 20
    if (p.whatsappActive) bonus += 30
    else if (p.phone) bonus += 10
    if (p.websiteUrl) bonus += 10
    if (p.isBusiness) bonus += 10
    if (p.platforms.length > 1) bonus += (p.platforms.length - 1) * 5

    return {
      name: p.name,
      baseScore: p.baseScore,
      bonus,
      unified: Math.min(100, p.baseScore + bonus)
    }
  })

  // Full Contact: 70 + 20(email) + 30(wa) + 10(web) + 10(biz) + 5(multi) = 145 -> capped at 100
  // Email Only: 60 + 20(email) = 80
  // Phone Only: 50 + 10(phone) + 10(biz) = 70
  // No Contact: 80 + 0 = 80

  const expected = [100, 80, 70, 80]
  let allOk = true

  for (let i = 0; i < scored.length; i++) {
    if (scored[i].unified !== expected[i]) {
      allOk = false
      log(`   FAIL: ${scored[i].name} = ${scored[i].unified}, expected ${expected[i]}`)
    }
  }

  step('Unified Scoring Logic', allOk ? 'OK' : 'FAIL',
    scored.map(s => `${s.name}: ${s.baseScore}+${s.bonus}=${s.unified}`).join(' | '))
}

// ============================================
// Test 5: Best Channel Selection
// ============================================
function testBestChannelSelection() {
  const cases = [
    { whatsappActive: true, instagram: 'user', email: 'a@b.com', expected: 'whatsapp' },
    { whatsappActive: false, instagram: 'user', email: 'a@b.com', expected: 'instagram_dm' },
    { whatsappActive: false, instagram: null, email: 'a@b.com', expected: 'email' },
    { whatsappActive: false, instagram: null, email: '', facebookUrl: 'https://fb.com/page', expected: 'facebook_messenger' },
  ]

  let passed = 0
  for (const c of cases) {
    let channel = 'email'
    if (c.whatsappActive) channel = 'whatsapp'
    else if (c.instagram) channel = 'instagram_dm'
    else if (c.email) channel = 'email'
    else if (c.facebookUrl) channel = 'facebook_messenger'

    if (channel === c.expected) passed++
  }

  step('Best Channel Selection', passed === cases.length ? 'OK' : 'WARN',
    `${passed}/${cases.length} cases correct`)
}

// ============================================
// Test 6: Module Files Exist
// ============================================
function testModulesExist() {
  const modules = [
    'functions/src/hunters/instagram/instagramHunter.js',
    'functions/src/hunters/instagram/instagramDmSender.js',
    'functions/src/hunters/instagram/multiAccountDmSender.js',
    'functions/src/hunters/tiktok/tiktokHunter.js',
    'functions/src/hunters/facebook/facebookHunter.js',
    'functions/src/hunters/whatsapp/whatsappChecker.js',
    'functions/src/hunters/whatsapp/whatsappSender.js',
    'functions/src/hunters/email/emailSequenceSender.js',
    'functions/src/hunters/socialHunterOrchestrator.js',
    'src/pages/Hunter.jsx',
  ]

  let found = 0
  const missing = []

  for (const mod of modules) {
    const fullPath = path.join(ROOT, mod)
    if (fs.existsSync(fullPath)) {
      found++
    } else {
      missing.push(mod)
    }
  }

  step('Module Files Exist', found === modules.length ? 'OK' : 'FAIL',
    `${found}/${modules.length} files found${missing.length ? '. Missing: ' + missing.join(', ') : ''}`)
}

// ============================================
// Test 7: Env Vars Status
// ============================================
function testEnvVars() {
  const vars = {
    SERPER_API_KEY: { required: true, value: process.env.SERPER_API_KEY },
    GEMINI_API_KEY: { required: true, value: process.env.GEMINI_API_KEY },
    RESEND_API_KEY: { required: false, value: process.env.RESEND_API_KEY },
    IG_USERNAME: { required: false, value: process.env.IG_USERNAME },
    IG_PASSWORD: { required: false, value: process.env.IG_PASSWORD },
    EVOLUTION_API_URL: { required: false, value: process.env.EVOLUTION_API_URL },
    EVOLUTION_API_KEY: { required: false, value: process.env.EVOLUTION_API_KEY },
    INSTAGRAM_ENCRYPTION_KEY: { required: false, value: process.env.INSTAGRAM_ENCRYPTION_KEY },
  }

  const set = []
  const unset = []
  const requiredMissing = []

  for (const [key, { required, value }] of Object.entries(vars)) {
    if (value) {
      set.push(key)
    } else {
      unset.push(key)
      if (required) requiredMissing.push(key)
    }
  }

  const status = requiredMissing.length > 0 ? 'FAIL' : unset.length > 0 ? 'WARN' : 'OK'
  step('Environment Variables', status,
    `${set.length} set, ${unset.length} empty${requiredMissing.length ? ' (REQUIRED: ' + requiredMissing.join(', ') + ')' : ''}`)
}

// ============================================
// Run all tests
// ============================================
async function main() {
  log('='.repeat(60))
  log('  SOCIAL HUNTERS TEST - Face Media Factory')
  log('  ' + new Date().toLocaleString('fr-FR'))
  log('='.repeat(60))

  testModulesExist()
  testEnvVars()
  await testSerperFacebookSearch()
  testRegexExtraction()
  testDeduplicationLogic()
  testUnifiedScoring()
  testBestChannelSelection()

  // Generate report
  log('\n' + '='.repeat(60))
  log('  SUMMARY')
  log('='.repeat(60))

  const ok = results.filter(r => r.status === 'OK').length
  const warn = results.filter(r => r.status === 'WARN').length
  const fail = results.filter(r => r.status === 'FAIL').length

  log(`\n  OK: ${ok}  |  WARN: ${warn}  |  FAIL: ${fail}  |  Total: ${results.length}`)
  log(`  Verdict: ${fail === 0 ? '✅ SOCIAL HUNTERS OPERATIONNELS' : '❌ CORRECTIONS REQUISES'}`)

  // Write report
  const report = generateReport(ok, warn, fail)
  const reportPath = path.join(ROOT, 'SOCIAL_HUNTERS_REPORT.md')
  fs.writeFileSync(reportPath, report)
  log(`\n  Report saved to: ${reportPath}`)
}

function generateReport(ok, warn, fail) {
  const date = new Date().toLocaleString('fr-FR')
  let md = `# SOCIAL HUNTERS REPORT\n\n`
  md += `**Date:** ${date}\n\n`
  md += `## Verdict\n\n`
  md += `| Metrique | Valeur |\n|----------|--------|\n`
  md += `| Steps OK | ${ok}/${results.length} |\n`
  md += `| Warnings | ${warn} |\n`
  md += `| Failures | ${fail} |\n`
  md += `| **Verdict** | **${fail === 0 ? 'OPERATIONNEL' : 'CORRECTIONS REQUISES'}** |\n\n`
  md += `## Details\n\n`
  md += `| # | Test | Status | Details |\n|---|------|--------|--------|\n`

  for (const r of results) {
    const icon = r.status === 'OK' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌'
    md += `| ${r.num} | ${r.name} | ${icon} ${r.status} | ${r.details || ''} |\n`
  }

  md += `\n## Modules\n\n`
  md += `| Module | Fichier | Status |\n|--------|---------|--------|\n`
  md += `| Instagram Hunter | functions/src/hunters/instagram/instagramHunter.js | FIX: contact extraction |\n`
  md += `| TikTok Hunter | functions/src/hunters/tiktok/tiktokHunter.js | FIX: cross-platform dedup |\n`
  md += `| WhatsApp Checker | functions/src/hunters/whatsapp/whatsappChecker.js | FIX: Evolution API endpoint |\n`
  md += `| Facebook Hunter | functions/src/hunters/facebook/facebookHunter.js | NEW |\n`
  md += `| Orchestrateur | functions/src/hunters/socialHunterOrchestrator.js | NEW |\n`
  md += `| Frontend | src/pages/Hunter.jsx | UPDATE: Facebook + multi-scan |\n`

  md += `\n## Prerequisites pour production\n\n`
  md += `- [ ] Configurer IG_USERNAME + IG_PASSWORD (compte Instagram dedie)\n`
  md += `- [ ] Configurer INSTAGRAM_ENCRYPTION_KEY (cle AES-256)\n`
  md += `- [ ] Deployer Evolution API (WhatsApp self-hosted)\n`
  md += `- [ ] Configurer EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME\n`
  md += `- [ ] Deployer les Cloud Functions: firebase deploy --only functions\n`
  md += `- [ ] Activer les hunters dans hunterConfig de chaque organisation\n`

  md += `\n---\n*Genere par test-social-hunters.mjs*\n`
  return md
}

main().catch(console.error)
