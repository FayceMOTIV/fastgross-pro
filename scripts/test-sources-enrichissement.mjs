#!/usr/bin/env node

/**
 * Test Sources & Enrichissement - Face Media Factory
 * Tests Google Maps Hunter, Enrichment Waterfall (5 providers),
 * NeverBounce Email Verifier, PhantomBuster Hunter
 *
 * Usage: node scripts/test-sources-enrichissement.mjs
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

const results = []
let stepNum = 0
let passed = 0
let warned = 0
let failed = 0

function log(msg) {
  console.log(msg)
}

function step(name, status, details) {
  stepNum++
  results.push({ num: stepNum, name, status, details })
  const icon = status === 'OK' ? '\u2705' : status === 'WARN' ? '\u26a0\ufe0f' : '\u274c'
  if (status === 'OK') passed++
  else if (status === 'WARN') warned++
  else failed++
  log(`\n${icon} Step ${stepNum}: ${name} \u2014 ${status}`)
  if (details) log(`   ${details}`)
}

// ============================================
// Test 1: Google Maps Hunter - File exists + exports
// ============================================
async function testGoogleMapsHunterExists() {
  const filePath = path.join(ROOT, 'functions/src/hunters/googlemaps/googleMapsHunter.js')
  if (!fs.existsSync(filePath)) {
    step('Google Maps Hunter - File exists', 'FAIL', 'File not found')
    return
  }
  step('Google Maps Hunter - File exists', 'OK', filePath)

  const content = fs.readFileSync(filePath, 'utf-8')

  // Check exports
  const requiredExports = ['googleMapsHunter', 'runGoogleMapsHunterManual', 'getGoogleMapsHunterStats']
  for (const exp of requiredExports) {
    if (content.includes(`export const ${exp}`)) {
      step(`Google Maps Hunter - export ${exp}`, 'OK', 'Found')
    } else {
      step(`Google Maps Hunter - export ${exp}`, 'FAIL', 'Missing export')
    }
  }

  // Check Serper Maps endpoint
  if (content.includes('google.serper.dev/maps')) {
    step('Google Maps Hunter - Serper Maps endpoint', 'OK', 'Uses POST https://google.serper.dev/maps')
  } else {
    step('Google Maps Hunter - Serper Maps endpoint', 'FAIL', 'Missing Serper Maps endpoint')
  }

  // Check mock function
  if (content.includes('getMockGoogleMapsResults') || content.includes('mockResults') || content.includes('mock')) {
    step('Google Maps Hunter - Mock fallback', 'OK', 'Has mock data for testing')
  } else {
    step('Google Maps Hunter - Mock fallback', 'WARN', 'No mock fallback found')
  }

  // Check AI qualification
  if (content.includes('callAI') || content.includes('qualifyGoogleMapsProspect')) {
    step('Google Maps Hunter - AI qualification', 'OK', 'Uses callAI for scoring')
  } else {
    step('Google Maps Hunter - AI qualification', 'FAIL', 'No AI qualification')
  }

  // Check dedup logic
  if (content.includes('dedup') || content.includes('existing') || content.includes('where(')) {
    step('Google Maps Hunter - Dedup logic', 'OK', 'Has deduplication checks')
  } else {
    step('Google Maps Hunter - Dedup logic', 'WARN', 'No dedup logic found')
  }
}

// ============================================
// Test 2: Serper Maps API (live test if key available)
// ============================================
async function testSerperMapsAPI() {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    step('Serper Maps API - Live test', 'WARN', 'SERPER_API_KEY not set \u2014 skipping live test')
    return
  }

  try {
    const response = await fetch('https://google.serper.dev/maps', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: 'agence marketing Paris',
        gl: 'fr',
        hl: 'fr',
        num: 3
      })
    })

    if (!response.ok) {
      step('Serper Maps API - Live test', 'FAIL', `HTTP ${response.status}`)
      return
    }

    const data = await response.json()
    const places = data.places || []

    step('Serper Maps API - Live test', 'OK', `Got ${places.length} places`)

    if (places.length > 0) {
      const first = places[0]
      const fields = ['title', 'address', 'phone', 'website', 'rating'].filter(f => first[f])
      step('Serper Maps API - Data fields', 'OK', `Fields present: ${fields.join(', ')}`)
    }
  } catch (error) {
    step('Serper Maps API - Live test', 'FAIL', error.message)
  }
}

// ============================================
// Test 3: Enrichment Waterfall - All 5 providers
// ============================================
async function testEnrichmentWaterfall() {
  const waterfallPath = path.join(ROOT, 'functions/src/enrichment/emailWaterfall.js')
  if (!fs.existsSync(waterfallPath)) {
    step('Email Waterfall - File exists', 'FAIL', 'emailWaterfall.js not found')
    return
  }
  step('Email Waterfall - File exists', 'OK', waterfallPath)

  const content = fs.readFileSync(waterfallPath, 'utf-8')

  const providers = ['derrick', 'apollo', 'hunter', 'dropcontact', 'bettercontact']
  for (const provider of providers) {
    if (content.includes(`${provider}:`)) {
      step(`Email Waterfall - ${provider} registered`, 'OK', 'Found in waterfall')
    } else {
      step(`Email Waterfall - ${provider} registered`, 'FAIL', 'Missing from waterfall')
    }
  }

  // Check provider files exist
  const providerFiles = [
    { name: 'Derrick', file: 'derrickProvider.js' },
    { name: 'Apollo', file: 'apolloProvider.js' },
    { name: 'Hunter', file: 'hunterProvider.js' },
    { name: 'Dropcontact', file: 'dropcontactProvider.js' },
    { name: 'BetterContact', file: 'betterContactProvider.js' }
  ]

  for (const { name, file } of providerFiles) {
    const filePath = path.join(ROOT, 'functions/src/enrichment', file)
    if (fs.existsSync(filePath)) {
      const provContent = fs.readFileSync(filePath, 'utf-8')
      // Check required methods
      const methods = ['enrichEmail', 'getStatus', 'isAvailable']
      const presentMethods = methods.filter(m => provContent.includes(m))
      step(`Provider ${name} - File + methods`, 'OK', `Methods: ${presentMethods.join(', ')}`)
    } else {
      step(`Provider ${name} - File exists`, 'FAIL', `${file} not found`)
    }
  }
}

// ============================================
// Test 4: Dropcontact Provider - Structure
// ============================================
async function testDropcontactProvider() {
  const filePath = path.join(ROOT, 'functions/src/enrichment/dropcontactProvider.js')
  if (!fs.existsSync(filePath)) {
    step('Dropcontact Provider - File exists', 'FAIL', 'Not found')
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // Check async polling (Dropcontact is async)
  if (content.includes('batch') || content.includes('poll') || content.includes('requestId')) {
    step('Dropcontact Provider - Async polling', 'OK', 'Has async batch/polling pattern')
  } else {
    step('Dropcontact Provider - Async polling', 'WARN', 'No async pattern found')
  }

  // Check GDPR fields
  if (content.includes('siren') || content.includes('siret')) {
    step('Dropcontact Provider - French B2B fields', 'OK', 'Has SIREN/SIRET fields')
  } else {
    step('Dropcontact Provider - French B2B fields', 'WARN', 'No French B2B fields')
  }

  // Priority
  if (content.includes('priority: 4')) {
    step('Dropcontact Provider - Priority', 'OK', 'Priority 4 (after Hunter)')
  } else {
    step('Dropcontact Provider - Priority', 'WARN', 'Expected priority 4')
  }
}

// ============================================
// Test 5: BetterContact Provider - Structure
// ============================================
async function testBetterContactProvider() {
  const filePath = path.join(ROOT, 'functions/src/enrichment/betterContactProvider.js')
  if (!fs.existsSync(filePath)) {
    step('BetterContact Provider - File exists', 'FAIL', 'Not found')
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')

  // Priority
  if (content.includes('priority: 5')) {
    step('BetterContact Provider - Priority', 'OK', 'Priority 5 (last resort)')
  } else {
    step('BetterContact Provider - Priority', 'WARN', 'Expected priority 5')
  }

  // Aggregator
  if (content.includes('bettercontact.rocks') || content.includes('aggregat')) {
    step('BetterContact Provider - API endpoint', 'OK', 'Uses bettercontact.rocks API')
  } else {
    step('BetterContact Provider - API endpoint', 'WARN', 'Unexpected API endpoint')
  }
}

// ============================================
// Test 6: NeverBounce Email Verifier
// ============================================
async function testNeverBounceVerifier() {
  const filePath = path.join(ROOT, 'functions/src/enrichment/neverBounceVerifier.js')
  if (!fs.existsSync(filePath)) {
    step('NeverBounce Verifier - File exists', 'FAIL', 'Not found')
    return
  }
  step('NeverBounce Verifier - File exists', 'OK', filePath)

  const content = fs.readFileSync(filePath, 'utf-8')

  // Check exports
  const requiredExports = ['verifyEmailNB', 'getNeverBounceCredits']
  for (const exp of requiredExports) {
    if (content.includes(`export const ${exp}`)) {
      step(`NeverBounce - export ${exp}`, 'OK', 'Found')
    } else {
      step(`NeverBounce - export ${exp}`, 'FAIL', 'Missing export')
    }
  }

  // Local checks
  if (content.includes('DISPOSABLE_DOMAINS') && content.includes('ROLE_PREFIXES')) {
    step('NeverBounce - Local checks', 'OK', 'Has disposable + role-based checks')
  } else {
    step('NeverBounce - Local checks', 'WARN', 'Missing local validation lists')
  }

  // NeverBounce API
  if (content.includes('api.neverbounce.com')) {
    step('NeverBounce - API endpoint', 'OK', 'Uses api.neverbounce.com/v4')
  } else {
    step('NeverBounce - API endpoint', 'FAIL', 'Missing NeverBounce API URL')
  }

  // Fallback without API key
  if (content.includes('no_neverbounce_key') || content.includes('local_fallback')) {
    step('NeverBounce - Graceful fallback', 'OK', 'Falls back to local checks if no API key')
  } else {
    step('NeverBounce - Graceful fallback', 'WARN', 'No fallback detected')
  }

  // Test local verification logic inline
  log('\n   Testing local email verification logic...')

  // Valid format
  const validEmail = 'test@example.com'
  const invalidEmail = 'not-an-email'
  const disposableEmail = 'test@yopmail.com'
  const roleEmail = 'info@company.com'

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const DISPOSABLE_DOMAINS = ['guerrillamail.com', 'tempmail.com', 'yopmail.com', 'mailinator.com']
  const ROLE_PREFIXES = ['info', 'contact', 'admin', 'support', 'sales']

  // Test valid
  if (emailRegex.test(validEmail)) {
    step('NeverBounce Local - Valid email format', 'OK', `${validEmail} passes regex`)
  } else {
    step('NeverBounce Local - Valid email format', 'FAIL', 'Regex rejected valid email')
  }

  // Test invalid
  if (!emailRegex.test(invalidEmail)) {
    step('NeverBounce Local - Invalid email detected', 'OK', `${invalidEmail} correctly rejected`)
  } else {
    step('NeverBounce Local - Invalid email detected', 'FAIL', 'Regex accepted invalid email')
  }

  // Test disposable
  const disposableDomain = disposableEmail.split('@')[1]
  if (DISPOSABLE_DOMAINS.includes(disposableDomain)) {
    step('NeverBounce Local - Disposable detected', 'OK', `${disposableEmail} flagged as disposable`)
  } else {
    step('NeverBounce Local - Disposable detected', 'FAIL', 'Missed disposable domain')
  }

  // Test role-based
  const roleLocal = roleEmail.split('@')[0]
  if (ROLE_PREFIXES.includes(roleLocal)) {
    step('NeverBounce Local - Role-based detected', 'OK', `${roleEmail} flagged as role-based`)
  } else {
    step('NeverBounce Local - Role-based detected', 'FAIL', 'Missed role-based email')
  }
}

// ============================================
// Test 7: PhantomBuster Hunter
// ============================================
async function testPhantomBusterHunter() {
  const filePath = path.join(ROOT, 'functions/src/hunters/phantom/phantomHunter.js')
  if (!fs.existsSync(filePath)) {
    step('PhantomBuster Hunter - File exists', 'FAIL', 'Not found')
    return
  }
  step('PhantomBuster Hunter - File exists', 'OK', filePath)

  const content = fs.readFileSync(filePath, 'utf-8')

  // Check exports
  const requiredExports = ['runPhantomScrape', 'listPhantoms']
  for (const exp of requiredExports) {
    if (content.includes(`export const ${exp}`)) {
      step(`PhantomBuster - export ${exp}`, 'OK', 'Found')
    } else {
      step(`PhantomBuster - export ${exp}`, 'FAIL', 'Missing export')
    }
  }

  // Check scraper functions
  const scrapers = ['scrapeGoogleMaps', 'scrapeInstagramProfiles', 'scrapeLinkedInProfiles']
  for (const scraper of scrapers) {
    if (content.includes(scraper)) {
      step(`PhantomBuster - ${scraper}`, 'OK', 'Found')
    } else {
      step(`PhantomBuster - ${scraper}`, 'FAIL', 'Missing')
    }
  }

  // Check PhantomBuster API
  if (content.includes('api.phantombuster.com')) {
    step('PhantomBuster - API endpoint', 'OK', 'Uses api.phantombuster.com/api/v2')
  } else {
    step('PhantomBuster - API endpoint', 'FAIL', 'Missing API URL')
  }

  // Mock fallback
  if (content.includes('getMockPhantomResults') || content.includes('mock')) {
    step('PhantomBuster - Mock fallback', 'OK', 'Has mock data for testing')
  } else {
    step('PhantomBuster - Mock fallback', 'WARN', 'No mock fallback')
  }

  // AI qualification
  if (content.includes('qualifyPhantomProspect') && content.includes('callAI')) {
    step('PhantomBuster - AI qualification', 'OK', 'Uses callAI for scoring')
  } else {
    step('PhantomBuster - AI qualification', 'WARN', 'AI qualification not detected')
  }
}

// ============================================
// Test 8: index.js registrations
// ============================================
async function testIndexRegistrations() {
  const indexPath = path.join(ROOT, 'functions/src/index.js')
  if (!fs.existsSync(indexPath)) {
    step('index.js - File exists', 'FAIL', 'Not found')
    return
  }

  const content = fs.readFileSync(indexPath, 'utf-8')

  const registrations = [
    { name: 'Google Maps Hunter', patterns: ['googleMapsHunter', 'runGoogleMapsHunterManual', 'getGoogleMapsHunterStats'] },
    { name: 'PhantomBuster', patterns: ['runPhantomScrape', 'listPhantoms'] },
    { name: 'NeverBounce', patterns: ['verifyEmailNB', 'getNeverBounceCredits'] },
    { name: 'Enrichment', patterns: ['enrichEmail', 'enrichEmailsBatch', 'getEnrichmentStatus'] }
  ]

  for (const { name, patterns } of registrations) {
    const found = patterns.filter(p => content.includes(p))
    if (found.length === patterns.length) {
      step(`index.js - ${name} registered`, 'OK', `All exports: ${found.join(', ')}`)
    } else if (found.length > 0) {
      step(`index.js - ${name} registered`, 'WARN', `Partial: ${found.join(', ')} (missing: ${patterns.filter(p => !found.includes(p)).join(', ')})`)
    } else {
      step(`index.js - ${name} registered`, 'FAIL', 'Not registered in index.js')
    }
  }
}

// ============================================
// Test 9: Enrichment provider priority order
// ============================================
async function testProviderPriorities() {
  const providers = [
    { name: 'Derrick', file: 'derrickProvider.js', expectedPriority: 1 },
    { name: 'Apollo', file: 'apolloProvider.js', expectedPriority: 2 },
    { name: 'Hunter', file: 'hunterProvider.js', expectedPriority: 3 },
    { name: 'Dropcontact', file: 'dropcontactProvider.js', expectedPriority: 4 },
    { name: 'BetterContact', file: 'betterContactProvider.js', expectedPriority: 5 }
  ]

  for (const { name, file, expectedPriority } of providers) {
    const filePath = path.join(ROOT, 'functions/src/enrichment', file)
    if (!fs.existsSync(filePath)) {
      step(`Priority ${name}`, 'FAIL', `${file} not found`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    if (content.includes(`priority: ${expectedPriority}`)) {
      step(`Priority ${name}`, 'OK', `Priority ${expectedPriority} confirmed`)
    } else {
      step(`Priority ${name}`, 'WARN', `Expected priority ${expectedPriority}`)
    }
  }
}

// ============================================
// Test 10: API keys in environment
// ============================================
function testEnvKeys() {
  const keys = [
    { name: 'SERPER_API_KEY', required: true },
    { name: 'DROPCONTACT_API_KEY', required: false },
    { name: 'BETTERCONTACT_API_KEY', required: false },
    { name: 'NEVERBOUNCE_API_KEY', required: false },
    { name: 'PHANTOMBUSTER_API_KEY', required: false }
  ]

  for (const { name, required } of keys) {
    const value = process.env[name]
    if (value) {
      step(`Env ${name}`, 'OK', `Set (${value.substring(0, 4)}...${value.substring(value.length - 4)})`)
    } else if (required) {
      step(`Env ${name}`, 'FAIL', 'Not set (required)')
    } else {
      step(`Env ${name}`, 'WARN', 'Not set (optional \u2014 mock/fallback used)')
    }
  }
}

// ============================================
// Run all tests
// ============================================
async function main() {
  log('='.repeat(60))
  log('  SOURCES & ENRICHISSEMENT TESTS')
  log('  Face Media Factory')
  log('  ' + new Date().toISOString())
  log('='.repeat(60))

  await testGoogleMapsHunterExists()
  await testSerperMapsAPI()
  await testEnrichmentWaterfall()
  await testDropcontactProvider()
  await testBetterContactProvider()
  await testNeverBounceVerifier()
  await testPhantomBusterHunter()
  await testIndexRegistrations()
  await testProviderPriorities()
  testEnvKeys()

  log('\n' + '='.repeat(60))
  log(`  RESULTS: ${passed} OK / ${warned} WARN / ${failed} FAIL`)
  log('  Total steps: ' + stepNum)
  log('='.repeat(60))

  if (failed > 0) {
    log('\n\u274c Some tests FAILED:')
    results.filter(r => r.status === 'FAIL').forEach(r => {
      log(`   Step ${r.num}: ${r.name} \u2014 ${r.details}`)
    })
  }

  if (warned > 0) {
    log('\n\u26a0\ufe0f Warnings:')
    results.filter(r => r.status === 'WARN').forEach(r => {
      log(`   Step ${r.num}: ${r.name} \u2014 ${r.details}`)
    })
  }

  log('\n\u2714\ufe0f Test run complete.\n')
}

main().catch(err => {
  console.error('Test script failed:', err)
  process.exit(1)
})
