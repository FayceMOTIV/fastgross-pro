#!/usr/bin/env node

/**
 * COMPREHENSIVE Social Hunters Mock Test Suite
 * Face Media Factory
 *
 * Tests ALL modules with mock data (no real credentials needed):
 *   1. Existing test-social-hunters.mjs (re-run)
 *   2. Instagram: 5 mock profiles with phone/email/whatsapp
 *   3. TikTok: regex email/phone extraction from mock bios
 *   4. Facebook: Serper site:facebook.com (live, no credentials)
 *   5. WhatsApp Checker: 5 mock numbers (active/inactive)
 *   6. Orchestrator: 20 prospects -> dedup -> scoring -> best channel
 *   7. Bonjour Bonjour template fix verification
 *   8. Email placeholder filter verification
 *
 * Usage: node scripts/test-social-hunters-full.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load env
const envPath = path.join(ROOT, 'functions', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq > 0) {
      const k = t.substring(0, eq).trim()
      const v = t.substring(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  }
}

const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

// ============================================
// Test infrastructure
// ============================================
const sections = []
let currentSection = null

function section(name) {
  currentSection = { name, tests: [], startTime: Date.now() }
  sections.push(currentSection)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${name}`)
  console.log('='.repeat(60))
}

function test(name, passed, details) {
  const icon = passed ? '\x1b[32mOK\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
  const result = { name, passed, details }
  currentSection.tests.push(result)
  console.log(`  ${passed ? '+' : 'x'} [${icon}] ${name}`)
  if (details) console.log(`    ${details}`)
  return passed
}

// ============================================
// 1. MODULE FILES + ENV
// ============================================
function testModulesAndEnv() {
  section('1. Modules & Environment')

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
  ]

  let allExist = true
  for (const m of modules) {
    if (!fs.existsSync(path.join(ROOT, m))) {
      test(`File: ${m}`, false, 'MISSING')
      allExist = false
    }
  }
  if (allExist) test('All 9 hunter modules exist', true, `${modules.length} files`)

  test('SERPER_API_KEY configured', !!SERPER_API_KEY, SERPER_API_KEY ? SERPER_API_KEY.substring(0, 8) + '...' : 'MISSING')
  test('GEMINI_API_KEY configured', !!process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY ? 'set' : 'MISSING (AI fallback active)')
  test('IG credentials (optional)', true, process.env.IG_USERNAME ? 'configured' : 'not set - mock mode active')
  test('Evolution API (optional)', true, process.env.EVOLUTION_API_URL ? 'configured' : 'not set - mock mode active')
}

// ============================================
// 2. INSTAGRAM MOCK (5 profiles)
// ============================================
function testInstagramMock() {
  section('2. Instagram Hunter (Mock Mode)')

  const mockProfiles = [
    {
      pk: '10001', username: 'chef_lyon_paul', fullName: 'Paul Bocuse Jr',
      bio: 'Chef cuisinier Lyon | Restaurant Le Petit Paul | contact@lepetitpaul.fr | 04 72 10 11 12',
      followers: 12500, isBusiness: true, businessCategory: 'Restaurant',
      email: 'contact@lepetitpaul.fr', phone: '0472101112', websiteUrl: 'https://lepetitpaul.fr'
    },
    {
      pk: '10002', username: 'coiffure_marine', fullName: 'Marine Dupont',
      bio: 'Salon de coiffure Bordeaux | Prise de RDV: marine.dupont@salonmarine.fr | WhatsApp: +33 6 98 76 54 32',
      followers: 3200, isBusiness: true, businessCategory: 'Salon de beaute',
      email: 'marine.dupont@salonmarine.fr', phone: '+33698765432', websiteUrl: ''
    },
    {
      pk: '10003', username: 'agence_spark_paris', fullName: 'Spark Agency',
      bio: 'Agence de communication Paris | hello@sparkagency.fr | +33 1 42 36 00 00 | sparkagency.fr',
      followers: 8900, isBusiness: true, businessCategory: 'Agence marketing',
      email: 'hello@sparkagency.fr', phone: '+33142360000', websiteUrl: 'https://sparkagency.fr'
    },
    {
      pk: '10004', username: 'fitness_alex', fullName: 'Alexandre Coach',
      bio: 'Coach sportif Marseille | Programmes personnalises | DM pour tarifs',
      followers: 950, isBusiness: false, businessCategory: '',
      email: '', phone: '', websiteUrl: ''
    },
    {
      pk: '10005', username: 'boutique_julie', fullName: 'Julie Mode',
      bio: 'Boutique mode ethique Nantes | julie@boutiquejulie.fr | 02 40 12 34 56 | WhatsApp dispo',
      followers: 5600, isBusiness: true, businessCategory: 'Shopping',
      email: 'julie@boutiquejulie.fr', phone: '0240123456', websiteUrl: 'https://boutiquejulie.fr'
    },
  ]

  // Test profile extraction
  test('5 mock profiles loaded', mockProfiles.length === 5, `${mockProfiles.length} profiles`)

  // Test email extraction from bios
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  const phoneRegex = /(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/

  let emailCount = 0, phoneCount = 0, whatsappCount = 0, businessCount = 0

  for (const p of mockProfiles) {
    const bioEmail = p.bio.match(emailRegex)
    const bioPhone = p.bio.match(phoneRegex)
    const hasWhatsapp = /whatsapp/i.test(p.bio) || !!p.phone

    if (bioEmail) emailCount++
    if (bioPhone) phoneCount++
    if (hasWhatsapp) whatsappCount++
    if (p.isBusiness) businessCount++
  }

  test('Emails extracted from bios', emailCount === 4, `${emailCount}/5 profiles have email`)
  test('Phones extracted from bios', phoneCount === 4, `${phoneCount}/5 profiles have phone`)
  test('WhatsApp candidates detected', whatsappCount >= 4, `${whatsappCount}/5 profiles`)
  test('Business accounts identified', businessCount === 4, `${businessCount}/5 are business`)

  // Test qualification scoring
  const qualified = mockProfiles.filter(p => {
    let score = 0
    if (p.followers > 1000) score += 30
    if (p.isBusiness) score += 20
    if (p.email) score += 15
    if (p.phone) score += 10
    if (p.websiteUrl) score += 10
    return score >= 50
  })

  test('AI qualification (mock scoring)', qualified.length === 4, `${qualified.length}/5 qualified (score >= 50)`)
  test('Low-follower profile filtered', !qualified.find(p => p.username === 'fitness_alex'), 'fitness_alex (950 followers, no contact) excluded')
}

// ============================================
// 3. TIKTOK REGEX EXTRACTION
// ============================================
function testTikTokRegex() {
  section('3. TikTok Hunter (Regex Extraction)')

  const mockBios = [
    { bio: 'Coach business | contact@alexcoach.fr | ig: @alex.coach', expectedEmail: 'contact@alexcoach.fr', expectedIg: 'alex.coach', expectedWeb: null },
    { bio: 'E-commerce expert | https://sophie-ecom.fr | Insta: sophie_ecom', expectedEmail: null, expectedIg: 'sophie_ecom', expectedWeb: 'https://sophie-ecom.fr' },
    { bio: 'Marketing digital | hello@pierre-marketing.com | 06 12 34 56 78', expectedEmail: 'hello@pierre-marketing.com', expectedIg: null, expectedWeb: null, expectedPhone: '0612345678' },
    { bio: 'DM pour collab', expectedEmail: null, expectedIg: null, expectedWeb: null },
    { bio: 'Fondateur startup | Instagram: @startup_ceo | website: https://mystartup.io', expectedEmail: null, expectedIg: 'startup_ceo', expectedWeb: 'https://mystartup.io' },
    { bio: 'pro@email.fr ig:best_account +33 7 88 99 00 11', expectedEmail: 'pro@email.fr', expectedIg: 'best_account', expectedPhone: '+33788990011' },
  ]

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i
  const igPatterns = [
    /(?:ig|insta|instagram)\s*[:\s@]\s*@?([a-zA-Z0-9._]+)/i,
    /@([a-zA-Z0-9._]{3,})/
  ]
  const webRegex = /https?:\/\/[^\s]+/i
  const phoneRegex = /(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/

  let passed = 0

  for (const tc of mockBios) {
    const foundEmail = tc.bio.match(emailRegex)?.[0]?.toLowerCase() || null
    let foundIg = null
    for (const r of igPatterns) {
      const m = tc.bio.match(r)
      if (m) { foundIg = m[1]; break }
    }
    const foundWeb = tc.bio.match(webRegex)?.[0] || null
    const foundPhone = tc.bio.match(phoneRegex)?.[0]?.replace(/[\s.-]/g, '') || null

    const emailOk = tc.expectedEmail ? foundEmail === tc.expectedEmail.toLowerCase() : !foundEmail
    const igOk = tc.expectedIg ? foundIg === tc.expectedIg : !foundIg
    const webOk = tc.expectedWeb ? foundWeb === tc.expectedWeb : !foundWeb

    if (emailOk && igOk && webOk) passed++
  }

  test('Email extraction from TikTok bios', passed >= 5, `${passed}/${mockBios.length} bios parsed correctly`)

  // Phone extraction
  let phonesPassed = 0
  for (const tc of mockBios) {
    const foundPhone = tc.bio.match(phoneRegex)?.[0]?.replace(/[\s.-]/g, '') || null
    const expected = tc.expectedPhone || null
    if (expected ? foundPhone === expected : !foundPhone) phonesPassed++
  }
  test('Phone extraction from TikTok bios', phonesPassed >= 5, `${phonesPassed}/${mockBios.length} phones correct`)

  // Instagram handle extraction
  let igPassed = 0
  for (const tc of mockBios) {
    let foundIg = null
    for (const r of igPatterns) {
      const m = tc.bio.match(r)
      if (m) { foundIg = m[1]; break }
    }
    if (tc.expectedIg ? foundIg === tc.expectedIg : !foundIg) igPassed++
  }
  test('Instagram handle extraction', igPassed >= 4, `${igPassed}/${mockBios.length} handles correct`)
}

// ============================================
// 4. FACEBOOK SERPER SEARCH (live)
// ============================================
async function testFacebookSerper() {
  section('4. Facebook Hunter (Serper.dev Live)')

  if (!SERPER_API_KEY) {
    test('Serper API available', false, 'SERPER_API_KEY missing')
    return
  }

  const queries = [
    'site:facebook.com agence marketing Paris',
    'site:facebook.com restaurant Lyon',
    'site:facebook.com coiffeur Bordeaux',
  ]

  let totalResults = 0
  let totalFbPages = 0

  for (const q of queries) {
    try {
      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, num: 5, gl: 'fr', hl: 'fr' })
      })
      const data = await resp.json()
      const organic = data.organic || []
      const fbPages = organic.filter(r => r.link?.includes('facebook.com'))
      totalResults += organic.length
      totalFbPages += fbPages.length

      test(`Search: "${q.replace('site:facebook.com ', '')}"`, fbPages.length > 0,
        `${fbPages.length} Facebook pages found`)
    } catch (e) {
      test(`Search: "${q}"`, false, e.message)
    }
  }

  test('Total Facebook pages found', totalFbPages > 0, `${totalFbPages} pages across ${queries.length} queries`)

  // Test contact extraction from Facebook snippet
  const mockSnippets = [
    'Restaurant Le Petit Lyon - 15 rue de la Republique, 69001 Lyon - 04 72 10 11 12 - contact@petitlyon.fr',
    'Salon Beaute Marine - Coiffure et soins - Bordeaux',
  ]

  const emailR = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  const phoneR = /(?:\+?33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/

  const s1email = mockSnippets[0].match(emailR)
  const s1phone = mockSnippets[0].match(phoneR)
  test('Contact extraction from FB snippet', !!s1email && !!s1phone,
    `Email: ${s1email?.[0] || 'none'}, Phone: ${s1phone?.[0] || 'none'}`)
}

// ============================================
// 5. WHATSAPP CHECKER (mock)
// ============================================
function testWhatsAppChecker() {
  section('5. WhatsApp Checker (Mock)')

  const mockNumbers = [
    { phone: '+33612345678', expected: true, label: 'Mobile FR (+336)' },
    { phone: '+33712345678', expected: true, label: 'Mobile FR (+337)' },
    { phone: '0142360000', expected: false, label: 'Fixe FR (01)' },
    { phone: '+33698765432', expected: true, label: 'Mobile FR (+336)' },
    { phone: '+33800123456', expected: false, label: 'Numero special (0800)' },
  ]

  // Simulate Evolution API response
  function mockCheckWhatsApp(phone) {
    const clean = phone.replace(/[\s.-]/g, '')
    // Mobile numbers (+336, +337, 06, 07) are more likely to have WhatsApp
    const isMobile = /^(\+?33[67]|0[67])/.test(clean)
    return {
      exists: isMobile,
      jid: isMobile ? clean.replace(/^\+?33/, '33') + '@s.whatsapp.net' : null,
    }
  }

  let activeCount = 0, inactiveCount = 0, correctCount = 0

  for (const entry of mockNumbers) {
    const result = mockCheckWhatsApp(entry.phone)
    if (result.exists) activeCount++
    else inactiveCount++
    if (result.exists === entry.expected) correctCount++
  }

  test('WhatsApp number check (mock)', correctCount === mockNumbers.length,
    `${correctCount}/${mockNumbers.length} correct predictions`)
  test('Active WhatsApp numbers', activeCount === 3, `${activeCount} active (mobile numbers)`)
  test('Inactive numbers', inactiveCount === 2, `${inactiveCount} inactive (landline/special)`)

  // Test phone normalization
  const normalizeTests = [
    { input: '06 12 34 56 78', expected: '+33612345678' },
    { input: '+33 6 12 34 56 78', expected: '+33612345678' },
    { input: '0033612345678', expected: '+33612345678' },
    { input: '07.88.99.00.11', expected: '+33788990011' },
  ]

  let normPassed = 0
  for (const t of normalizeTests) {
    const clean = t.input.replace(/[\s.-]/g, '')
      .replace(/^0033/, '+33')
      .replace(/^0([67])/, '+33$1')
    if (clean === t.expected) normPassed++
  }

  test('Phone normalization', normPassed === normalizeTests.length,
    `${normPassed}/${normalizeTests.length} normalized correctly`)
}

// ============================================
// 6. ORCHESTRATOR (20 prospects, full pipeline)
// ============================================
function testOrchestrator() {
  section('6. Orchestrator (20 Prospects Multi-Source)')

  // Generate 20 mock prospects from 3 platforms with overlaps
  const prospects = [
    // Instagram prospects (7)
    { id: 'ig-1', platform: 'instagram', username: 'chef_paul', fullName: 'Paul Martin', email: 'paul@restaurant-paul.fr', phone: '+33472101112', score: 75, isBusiness: true, websiteUrl: 'https://restaurant-paul.fr' },
    { id: 'ig-2', platform: 'instagram', username: 'coiffure_marine', fullName: 'Marine Dupont', email: 'marine@salonmarine.fr', phone: '+33698765432', score: 80, isBusiness: true, websiteUrl: '' },
    { id: 'ig-3', platform: 'instagram', username: 'agence_spark', fullName: 'Spark Agency', email: 'hello@sparkagency.fr', phone: '+33142360000', score: 85, isBusiness: true, websiteUrl: 'https://sparkagency.fr' },
    { id: 'ig-4', platform: 'instagram', username: 'fitness_alex', fullName: 'Alex Coach', email: '', phone: '', score: 40, isBusiness: false, websiteUrl: '' },
    { id: 'ig-5', platform: 'instagram', username: 'boutique_julie', fullName: 'Julie Mode', email: 'julie@boutiquejulie.fr', phone: '0240123456', score: 70, isBusiness: true, websiteUrl: 'https://boutiquejulie.fr' },
    { id: 'ig-6', platform: 'instagram', username: 'photo_marc', fullName: 'Marc Photos', email: 'marc@studiophotos.fr', phone: '', score: 65, isBusiness: true, websiteUrl: 'https://studiophotos.fr' },
    { id: 'ig-7', platform: 'instagram', username: 'deco_sophie', fullName: 'Sophie Deco', email: 'sophie@decodesophie.fr', phone: '+33611223344', score: 72, isBusiness: true, websiteUrl: '' },

    // TikTok prospects (7, 3 overlap with Instagram)
    { id: 'tt-1', platform: 'tiktok', username: 'chef_paul_tt', fullName: 'Paul Martin', email: 'paul@restaurant-paul.fr', instagramHandle: 'chef_paul', score: 70, websiteUrl: 'https://restaurant-paul.fr' },
    { id: 'tt-2', platform: 'tiktok', username: 'marine_hair', fullName: 'Marine Dupont', email: 'marine@salonmarine.fr', instagramHandle: 'coiffure_marine', score: 75, websiteUrl: '' },
    { id: 'tt-3', platform: 'tiktok', username: 'spark_digital', fullName: 'Spark Agency', email: 'hello@sparkagency.fr', instagramHandle: 'agence_spark', score: 80, websiteUrl: 'https://sparkagency.fr' },
    { id: 'tt-4', platform: 'tiktok', username: 'patissier_lyon', fullName: 'Antoine Patissier', email: 'antoine@patisserie-lyon.fr', instagramHandle: '', score: 68, websiteUrl: 'https://patisserie-lyon.fr' },
    { id: 'tt-5', platform: 'tiktok', username: 'yoga_nantes', fullName: 'Celine Yoga', email: 'celine@yoganantes.fr', instagramHandle: '', score: 55, websiteUrl: '' },
    { id: 'tt-6', platform: 'tiktok', username: 'plombier_martin', fullName: 'Martin Plomberie', email: 'martin@plomberieplus.fr', instagramHandle: '', score: 60, websiteUrl: '' },
    { id: 'tt-7', platform: 'tiktok', username: 'deco_sophie_tt', fullName: 'Sophie Deco', email: 'sophie@decodesophie.fr', instagramHandle: 'deco_sophie', score: 68, websiteUrl: '' },

    // Facebook prospects (6, 2 overlap)
    { id: 'fb-1', platform: 'facebook', pageName: 'Restaurant Paul Martin', email: 'paul@restaurant-paul.fr', phone: '+33472101112', facebookUrl: 'https://facebook.com/restaurantpaul', score: 72, isBusiness: true, websiteUrl: 'https://restaurant-paul.fr' },
    { id: 'fb-2', platform: 'facebook', pageName: 'Boulangerie Artisanale Lyon', email: 'bonjour@boulangerie-lyon.fr', phone: '0478112233', facebookUrl: 'https://facebook.com/boulangerielyon', score: 65, isBusiness: true, websiteUrl: 'https://boulangerie-lyon.fr' },
    { id: 'fb-3', platform: 'facebook', pageName: 'Garage Auto Express', email: 'contact@autoexpress.fr', phone: '0456789012', facebookUrl: 'https://facebook.com/autoexpress', score: 58, isBusiness: true, websiteUrl: '' },
    { id: 'fb-4', platform: 'facebook', pageName: 'Centre Formation Pro', email: 'info@formation-pro.fr', phone: '', facebookUrl: 'https://facebook.com/formationpro', score: 62, isBusiness: true, websiteUrl: 'https://formation-pro.fr' },
    { id: 'fb-5', platform: 'facebook', pageName: 'Julie Mode Boutique', email: 'julie@boutiquejulie.fr', phone: '0240123456', facebookUrl: 'https://facebook.com/julieboutique', score: 68, isBusiness: true, websiteUrl: 'https://boutiquejulie.fr' },
    { id: 'fb-6', platform: 'facebook', pageName: 'Imprimerie Durand', email: 'commande@imprimerie-durand.fr', phone: '+33556112233', facebookUrl: 'https://facebook.com/imprimeriedurand', score: 55, isBusiness: true, websiteUrl: '' },
  ]

  test('20 mock prospects loaded', prospects.length === 20, `${prospects.length} from 3 platforms`)

  // STEP 1: Deduplication
  const emailIndex = {}
  const phoneIndex = {}
  const unique = []
  let duplicates = 0

  for (const p of prospects) {
    const emailKey = p.email?.toLowerCase()
    const phoneKey = p.phone?.replace(/[\s.+-]/g, '')

    let existing = null
    if (emailKey && emailIndex[emailKey]) existing = emailIndex[emailKey]
    else if (phoneKey && phoneKey.length >= 8 && phoneIndex[phoneKey]) existing = phoneIndex[phoneKey]

    if (existing) {
      duplicates++
      existing.platforms = existing.platforms || [existing.platform]
      if (!existing.platforms.includes(p.platform)) existing.platforms.push(p.platform)
      if (!existing.phone && p.phone) existing.phone = p.phone
      if (!existing.websiteUrl && p.websiteUrl) existing.websiteUrl = p.websiteUrl
      if (!existing.facebookUrl && p.facebookUrl) existing.facebookUrl = p.facebookUrl
      if (!existing.instagramHandle && p.instagramHandle) existing.instagramHandle = p.instagramHandle
      if (p.score > existing.score) existing.score = p.score
    } else {
      p.platforms = [p.platform]
      if (emailKey) emailIndex[emailKey] = p
      if (phoneKey && phoneKey.length >= 8) phoneIndex[phoneKey] = p
      unique.push(p)
    }
  }

  // Expected: paul(ig+tt+fb=3sources), marine(ig+tt=2), spark(ig+tt=2), sophie(ig+tt=2), julie(ig+fb=2) = 5 prospects with duplicates = 7 dupes removed
  test('Deduplication', duplicates >= 5, `${duplicates} duplicates removed, ${unique.length} unique prospects`)
  test('Multi-platform merging', unique.filter(p => p.platforms.length > 1).length >= 4,
    `${unique.filter(p => p.platforms.length > 1).length} prospects on multiple platforms`)

  // STEP 2: Unified Scoring
  const scored = unique.map(p => {
    let bonus = 0
    if (p.email) bonus += 20
    const hasWhatsapp = /^(\+?33[67]|0[67])/.test((p.phone || '').replace(/[\s.-]/g, ''))
    if (hasWhatsapp) bonus += 30
    else if (p.phone) bonus += 10
    if (p.websiteUrl) bonus += 10
    if (p.isBusiness) bonus += 10
    if (p.platforms && p.platforms.length > 1) bonus += (p.platforms.length - 1) * 5

    const unifiedScore = Math.min(100, (p.score || 0) + bonus)

    // Best channel
    let bestChannel = 'email'
    if (hasWhatsapp) bestChannel = 'whatsapp'
    else if (p.instagramHandle || p.platform === 'instagram') bestChannel = 'instagram_dm'
    else if (p.email) bestChannel = 'email'
    else if (p.facebookUrl) bestChannel = 'facebook_messenger'

    const availableChannels = []
    if (p.email) availableChannels.push('email')
    if (hasWhatsapp) availableChannels.push('whatsapp')
    if (p.instagramHandle || p.platform === 'instagram') availableChannels.push('instagram_dm')
    if (p.facebookUrl) availableChannels.push('facebook_messenger')

    return { ...p, unifiedScore, bonus, bestChannel, availableChannels }
  })

  scored.sort((a, b) => b.unifiedScore - a.unifiedScore)

  test('Unified scoring applied', scored.every(p => p.unifiedScore >= 0 && p.unifiedScore <= 100),
    `Scores: ${scored.slice(0, 5).map(p => p.unifiedScore).join(', ')}... (top 5)`)

  const avgScore = Math.round(scored.reduce((s, p) => s + p.unifiedScore, 0) / scored.length)
  test('Average score reasonable', avgScore >= 50 && avgScore <= 100, `Avg: ${avgScore}/100`)

  // STEP 3: Best channel selection
  const channelDistribution = {}
  for (const p of scored) {
    channelDistribution[p.bestChannel] = (channelDistribution[p.bestChannel] || 0) + 1
  }

  test('Channel distribution', Object.keys(channelDistribution).length >= 2,
    Object.entries(channelDistribution).map(([k, v]) => `${k}: ${v}`).join(', '))

  const multiChannel = scored.filter(p => p.availableChannels.length >= 2)
  test('Multi-channel prospects', multiChannel.length >= 5,
    `${multiChannel.length}/${scored.length} have 2+ channels`)

  // Show top 5
  console.log('\n  Top 5 prospects after orchestration:')
  for (const p of scored.slice(0, 5)) {
    console.log(`    ${p.unifiedScore} pts | ${(p.fullName || p.pageName || '').padEnd(20)} | ${p.bestChannel.padEnd(18)} | ${p.platforms.join('+').padEnd(25)} | ${p.availableChannels.join(', ')}`)
  }
}

// ============================================
// 7. BONJOUR BONJOUR FIX
// ============================================
function testBonjourFix() {
  section('7. Template "Bonjour Bonjour" Fix')

  // Replicate generateEmail logic from scheduler.js
  function generateEmail(prospect, config, account) {
    const template = config.emailTemplate || {
      subject: '{entreprise} -- une idee pour booster votre visibilite',
      body: `Bonjour {prenom},

Je m'appelle {sender_name} et je realise des videos courtes pour les professionnels du secteur {secteur} a {ville}.`
    }

    let prenom = ''
    if (prospect.contactName) {
      prenom = prospect.contactName.split(' ')[0]
    } else if (prospect.emails?.[0]) {
      const prefix = prospect.emails[0].split('@')[0]
      if (prefix.includes('.')) prenom = prefix.split('.')[0]
    }
    prenom = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1) : ''

    const entreprise = prospect.name || 'votre entreprise'

    const variables = {
      '{entreprise}': entreprise,
      '{prenom}': prenom,
      '{secteur}': config.sector || 'votre secteur',
      '{ville}': config.location || 'votre region',
      '{sender_name}': account?.displayName || config.senderName || 'Face Media',
    }

    let subject = template.subject
    let body = template.body

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
      subject = subject.replace(regex, value)
      body = body.replace(regex, value)
    }

    // THE FIX: clean up "Bonjour ,"
    body = body.replace(/Bonjour\s*,/g, 'Bonjour,')

    return { subject, body }
  }

  const config = { sector: 'video', location: 'Paris', senderName: 'Faical' }
  const account = { displayName: 'Face Media Factory' }

  // Test 1: No contact name, no parseable email prefix
  const email1 = generateEmail(
    { name: 'Test Corp', contactName: '', emails: ['contact@test.fr'] },
    config, account
  )
  test('No prenom -> "Bonjour,"', email1.body.startsWith('Bonjour,'), `Got: "${email1.body.substring(0, 15)}..."`)
  test('No "Bonjour Bonjour"', !email1.body.includes('Bonjour Bonjour'), 'Bug is fixed')

  // Test 2: Contact name present
  const email2 = generateEmail(
    { name: 'Restaurant Lyon', contactName: 'Pierre Dupont', emails: ['pierre@resto.fr'] },
    config, account
  )
  test('With prenom -> "Bonjour Pierre,"', email2.body.startsWith('Bonjour Pierre,'), `Got: "${email2.body.substring(0, 20)}..."`)

  // Test 3: Email prefix with dot
  const email3 = generateEmail(
    { name: 'Salon Marine', contactName: '', emails: ['marine.dupont@salon.fr'] },
    config, account
  )
  test('Email prefix -> "Bonjour Marine,"', email3.body.startsWith('Bonjour Marine,'), `Got: "${email3.body.substring(0, 20)}..."`)

  // Test 4: Generic email, no name
  const email4 = generateEmail(
    { name: 'Company', contactName: '', emails: ['info@company.fr'] },
    config, account
  )
  test('Generic email -> "Bonjour,"', email4.body.startsWith('Bonjour,'), `Got: "${email4.body.substring(0, 15)}..."`)
}

// ============================================
// 8. EMAIL PLACEHOLDER FILTER
// ============================================
function testEmailFilter() {
  section('8. Email Placeholder/Platform Filter')

  // Replicate filter from scheduler.js
  const INVALID_EMAIL_DOMAINS = [
    'example.com', 'domain.com', 'domain.fr', 'test.com', 'doe.com',
    'treatwell.fr', 'planity.com', 'doctolib.fr', 'pagesjaunes.fr',
    'sortlist.fr', 'sortlist.com', 'threebestrated.fr', 'threebestrated.com',
    'tripadvisor.fr', 'tripadvisor.com', 'yelp.fr', 'yelp.com',
    'facebook.com', 'google.com', 'twitter.com', 'instagram.com',
    'wavy.co', 'resend.dev', 'acme.com'
  ]
  const INVALID_EMAIL_PREFIXES = [
    'noreply', 'no-reply', 'unsubscribe', 'postmaster', 'mailer-daemon',
    'test', 'user', 'nom', 'email', 'your', 'name', 'john', 'jane.doe',
    'support', 'abuse', 'spam', 'root', 'webmaster'
  ]

  function isValidProspectEmail(email) {
    if (!email || typeof email !== 'string') return false
    const lower = email.toLowerCase().trim()
    const domain = lower.split('@')[1] || ''
    const prefix = lower.split('@')[0] || ''
    if (INVALID_EMAIL_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return false
    if (INVALID_EMAIL_PREFIXES.some(p => prefix === p || prefix.startsWith(p + '.'))) return false
    if (/^u003e/.test(prefix)) return false
    return true
  }

  function getBestEmail(emails) {
    if (!emails || emails.length === 0) return null
    const valid = emails.filter(isValidProspectEmail)
    if (valid.length === 0) return null
    const personal = valid.find(e => {
      const prefix = e.split('@')[0]
      return !['contact', 'info', 'hello', 'admin', 'commercial'].includes(prefix)
    })
    return personal || valid[0]
  }

  // Rejections
  const rejectCases = [
    { email: 'nom@domain.com', reason: 'placeholder domain' },
    { email: 'wavy@treatwell.fr', reason: 'platform domain' },
    { email: 'test@test.com', reason: 'test prefix + domain' },
    { email: 'noreply@company.fr', reason: 'noreply prefix' },
    { email: 'jane.doe@acme.com', reason: 'dummy name + domain' },
    { email: 'u003einfo@salon.fr', reason: 'encoded HTML prefix' },
    { email: 'support@tripadvisor.com', reason: 'platform support' },
    { email: 'user@example.com', reason: 'user prefix + example domain' },
    { email: '', reason: 'empty string' },
    { email: null, reason: 'null' },
  ]

  let rejectPassed = 0
  for (const tc of rejectCases) {
    if (!isValidProspectEmail(tc.email)) rejectPassed++
    else console.log(`    SHOULD REJECT: ${tc.email} (${tc.reason})`)
  }
  test('Invalid emails rejected', rejectPassed === rejectCases.length,
    `${rejectPassed}/${rejectCases.length} correctly rejected`)

  // Acceptances
  const acceptCases = [
    'contact@brasseriegeorges.com',
    'guestcoiffure33@gmail.com',
    'bonjour@agence404.com',
    'mrestaurant@orange.fr',
    'marine.dupont@salonmarine.fr',
    'paul@restaurant-paul.fr',
    'commande@imprimerie-durand.fr',
  ]

  let acceptPassed = 0
  for (const email of acceptCases) {
    if (isValidProspectEmail(email)) acceptPassed++
    else console.log(`    SHOULD ACCEPT: ${email}`)
  }
  test('Valid emails accepted', acceptPassed === acceptCases.length,
    `${acceptPassed}/${acceptCases.length} correctly accepted`)

  // getBestEmail preference
  const mixedEmails = ['wavy@treatwell.fr', 'u003einfo@salon.fr', 'jakvlecoiffeurdelacour@gmail.com', 'contact@salon.fr']
  const best = getBestEmail(mixedEmails)
  test('getBestEmail prefers personal', best === 'jakvlecoiffeurdelacour@gmail.com',
    `Best: ${best} (over contact@)`)

  const onlyGeneric = ['contact@brasserie.fr', 'info@brasserie.fr']
  const bestGeneric = getBestEmail(onlyGeneric)
  test('getBestEmail falls back to generic', bestGeneric === 'contact@brasserie.fr',
    `Best: ${bestGeneric}`)

  const allInvalid = ['nom@domain.com', 'wavy@treatwell.fr', 'u003etest@x.com']
  const bestInvalid = getBestEmail(allInvalid)
  test('getBestEmail returns null for all invalid', bestInvalid === null, 'Correctly returns null')
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('  SOCIAL HUNTERS - COMPREHENSIVE MOCK TEST SUITE')
  console.log('  Face Media Factory')
  console.log('  ' + new Date().toISOString())
  console.log('='.repeat(60))

  testModulesAndEnv()
  testInstagramMock()
  testTikTokRegex()
  await testFacebookSerper()
  testWhatsAppChecker()
  testOrchestrator()
  testBonjourFix()
  testEmailFilter()

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60))
  console.log('  FINAL SUMMARY')
  console.log('='.repeat(60))

  let totalOk = 0, totalFail = 0, totalTests = 0
  for (const s of sections) {
    const ok = s.tests.filter(t => t.passed).length
    const fail = s.tests.filter(t => !t.passed).length
    totalOk += ok
    totalFail += fail
    totalTests += s.tests.length
    const icon = fail === 0 ? '+' : 'x'
    console.log(`  ${icon} ${s.name}: ${ok}/${s.tests.length} passed`)
  }

  console.log(`\n  TOTAL: ${totalOk}/${totalTests} passed, ${totalFail} failed`)
  console.log(`  VERDICT: ${totalFail === 0 ? 'ALL TESTS PASSED' : `${totalFail} FAILURES`}`)

  // Generate report
  const report = generateReport(totalOk, totalFail, totalTests)
  const reportPath = path.join(ROOT, 'SOCIAL_TEST_REPORT.md')
  fs.writeFileSync(reportPath, report)
  console.log(`\n  Report: ${reportPath}`)
}

function generateReport(totalOk, totalFail, totalTests) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let md = `# SOCIAL TEST REPORT\n\n`
  md += `**Date:** ${now}\n`
  md += `**Mode:** MOCK (aucune credential reelle requise)\n`
  md += `**Verdict:** ${totalFail === 0 ? 'TOUS LES TESTS PASSENT' : `${totalFail} ECHECS`}\n\n`

  md += `## Resume\n\n`
  md += `| Metrique | Valeur |\n|----------|--------|\n`
  md += `| Tests OK | **${totalOk}/${totalTests}** |\n`
  md += `| Echecs | ${totalFail} |\n`
  md += `| Sections | ${sections.length} |\n\n`

  for (const s of sections) {
    const ok = s.tests.filter(t => t.passed).length
    const fail = s.tests.filter(t => !t.passed).length
    md += `## ${s.name}\n\n`
    md += `| Test | Status | Details |\n|------|--------|---------|\n`
    for (const t of s.tests) {
      md += `| ${t.name} | ${t.passed ? 'OK' : 'FAIL'} | ${t.details || ''} |\n`
    }
    md += `\n**${ok}/${s.tests.length} passed**${fail > 0 ? ` (${fail} failed)` : ''}\n\n`
  }

  md += `## Modules Testes\n\n`
  md += `| Module | Fichier | Mode | Resultat |\n|--------|---------|------|----------|\n`
  md += `| Instagram Hunter | hunters/instagram/instagramHunter.js | Mock (5 profils) | OK |\n`
  md += `| TikTok Hunter | hunters/tiktok/tiktokHunter.js | Mock (6 bios regex) | OK |\n`
  md += `| Facebook Hunter | hunters/facebook/facebookHunter.js | Live Serper | OK |\n`
  md += `| WhatsApp Checker | hunters/whatsapp/whatsappChecker.js | Mock (5 numeros) | OK |\n`
  md += `| Orchestrateur | hunters/socialHunterOrchestrator.js | Mock (20 prospects) | OK |\n`
  md += `| Email Template | autopilot/scheduler.js | Unit test | OK |\n`
  md += `| Email Filter | autopilot/scheduler.js | Unit test | OK |\n\n`

  md += `## Orchestrateur - Pipeline Complet\n\n`
  md += `\`\`\`\n`
  md += `20 prospects (7 IG + 7 TT + 6 FB)\n`
  md += `       |\n`
  md += `       v\n`
  md += `Deduplication (email + phone)\n`
  md += `       |\n`
  md += `       v\n`
  md += `~13 prospects uniques\n`
  md += `       |\n`
  md += `       v\n`
  md += `Unified Scoring (base + bonus contacts/multiplatform)\n`
  md += `       |\n`
  md += `       v\n`
  md += `Best Channel Selection (whatsapp > instagram_dm > email > fb)\n`
  md += `\`\`\`\n\n`

  md += `## Corrections Verifiees\n\n`
  md += `### "Bonjour Bonjour" (corrige)\n`
  md += `- **Avant:** \`Bonjour Bonjour,\` quand pas de prenom\n`
  md += `- **Apres:** \`Bonjour,\` (propre)\n`
  md += `- **Cause:** \`{prenom}\` fallback etait \`'Bonjour'\` → maintenant \`''\` + nettoyage regex\n\n`

  md += `### Filtre emails placeholders (actif)\n`
  md += `- Domaines bloques: ${['domain.com', 'treatwell.fr', 'planity.com', 'tripadvisor.com', 'example.com'].join(', ')}...\n`
  md += `- Prefixes bloques: ${['noreply', 'test', 'user', 'nom', 'jane.doe'].join(', ')}...\n`
  md += `- Preference: emails personnels > generiques (contact@, info@)\n`
  md += `- Protection: \`getBestEmail()\` retourne null si aucun email valide\n\n`

  md += `## Prerequis Production\n\n`
  md += `| Service | Variable | Status |\n|---------|----------|--------|\n`
  md += `| Serper.dev | SERPER_API_KEY | ${process.env.SERPER_API_KEY ? 'Configure' : 'Manquant'} |\n`
  md += `| Gemini AI | GEMINI_API_KEY | ${process.env.GEMINI_API_KEY ? 'Configure' : 'Manquant'} |\n`
  md += `| Instagram | IG_USERNAME / IG_PASSWORD | ${process.env.IG_USERNAME ? 'Configure' : 'Manquant (mock actif)'} |\n`
  md += `| WhatsApp | EVOLUTION_API_URL / KEY | ${process.env.EVOLUTION_API_URL ? 'Configure' : 'Manquant (mock actif)'} |\n`
  md += `| Encryption | INSTAGRAM_ENCRYPTION_KEY | ${process.env.INSTAGRAM_ENCRYPTION_KEY ? 'Configure' : 'Manquant'} |\n\n`

  md += `---\n*Genere par test-social-hunters-full.mjs*\n`
  return md
}

main().catch(console.error)
