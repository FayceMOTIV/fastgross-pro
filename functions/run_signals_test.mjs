#!/usr/bin/env node
/**
 * Battle Test — Intelligence Signals V2
 * Teste les 8 dimensions + orchestrator avec des leads de test.
 *
 * Usage: cd functions && node run_signals_test.mjs
 */

import { detectIntentSignals }    from './src/signals/intentSignals.js'
import { analyzeTechnography }    from './src/signals/technographyEngine.js'
import { findDirector }           from './src/signals/directorEngine.js'
import { calculateGrowthScore }   from './src/signals/growthScoreEngine.js'
import { detectActivePains }      from './src/signals/activePainEngine.js'
import { getSectorTiming }        from './src/signals/sectorTimingEngine.js'
import { checkCertifications }    from './src/signals/certificationEngine.js'
import { analyzeSocialPresenceV2 } from './src/signals/socialPresenceEngine.js'
import { orchestrateSignals }     from './src/signals/signalOrchestrator.js'

// ============================================
// TEST LEADS
// ============================================

const LEADS = [
  {
    name: 'Boulangerie Dupont',
    siren: '443061841',
    nom: 'Boulangerie Dupont',
    naf: '1071C',
    codePostal: '75011',
    ville: 'Paris',
    noteGoogle: 3.2,
    nbAvis: 45,
    website: 'http://boulangerie-dupont.fr',
  },
  {
    name: 'Garage Martin SARL',
    siren: '501234567',
    nom: 'Garage Martin',
    naf: '4520A',
    codePostal: '69003',
    ville: 'Lyon',
    noteGoogle: 4.5,
    nbAvis: 120,
    website: null,
  },
  {
    name: 'Cabinet Leroy Architectes',
    siren: '812345678',
    nom: 'Cabinet Leroy Architectes',
    naf: '7111Z',
    codePostal: '33000',
    ville: 'Bordeaux',
    noteGoogle: 4.8,
    nbAvis: 8,
    website: 'https://leroy-archi.fr',
  },
  {
    name: 'Restaurant Le Comptoir',
    siren: '423456789',
    nom: 'Le Comptoir',
    naf: '5610A',
    codePostal: '13001',
    ville: 'Marseille',
    noteGoogle: 3.8,
    nbAvis: 230,
    website: 'https://lecomptoir-marseille.fr',
  },
  {
    name: 'FormaPro SAS (Qualiopi)',
    siren: '901234567',
    nom: 'FormaPro SAS',
    naf: '8559A',
    codePostal: '44000',
    ville: 'Nantes',
    noteGoogle: 4.2,
    nbAvis: 15,
    website: 'https://formapro.fr',
  },
]

// ============================================
// TEST RUNNER
// ============================================

const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const SKIP = '\x1b[33mSKIP\x1b[0m'
let passed = 0
let failed = 0
let skipped = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${testName}${detail ? ' — ' + detail : ''}`)
    passed++
  } else {
    console.log(`  ${FAIL} ${testName}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function skip(testName, reason) {
  console.log(`  ${SKIP} ${testName} — ${reason}`)
  skipped++
}

async function safeTest(name, fn) {
  try {
    return await fn()
  } catch (e) {
    console.log(`  ${FAIL} ${name} — threw: ${e.message}`)
    failed++
    return null
  }
}

// ============================================
// TESTS
// ============================================

console.log('\n' + '='.repeat(60))
console.log('  BATTLE TEST — Intelligence Signals V2')
console.log('='.repeat(60) + '\n')

// T1 — Sector Timing (pure logic, no API)
console.log('--- T1: Sector Timing (statique) ---')
for (const lead of LEADS) {
  const result = await safeTest(`timing_${lead.name}`, () => getSectorTiming(lead))
  if (result) {
    assert(typeof result.isInOptimalWindow === 'boolean', `${lead.name} isInOptimalWindow is boolean`)
    assert(typeof result.recommendation === 'string' && result.recommendation.length > 0, `${lead.name} has recommendation`, result.recommendation.slice(0, 60))
    assert(result.dScoreBonus >= 0 && result.dScoreBonus <= 12, `${lead.name} dScoreBonus valid`, `+${result.dScoreBonus}`)
    assert(result.source === 'sector_timing', `${lead.name} source correct`)
  }
}

// T2 — Active Pains (logic only, depends on lead data + mock techno)
console.log('\n--- T2: Active Pains ---')
const mockTechno = { hasHttps: false, siteInaccessible: false, maturiteScore: 15, analytics: [], source: 'technography' }
const mockTechnoNull = null

for (const lead of LEADS) {
  const techno = lead.website ? mockTechno : mockTechnoNull
  const result = await safeTest(`pain_${lead.name}`, () => detectActivePains(lead, techno))
  if (result) {
    assert(Array.isArray(result.pains), `${lead.name} pains is array`, `${result.pains.length} pains`)
    assert(typeof result.painScore === 'number', `${lead.name} painScore is number`, `${result.painScore}/100`)
    assert(result.dScoreBonus >= 0 && result.dScoreBonus <= 25, `${lead.name} dScoreBonus capped`, `+${result.dScoreBonus}`)
    assert(result.source === 'active_pain', `${lead.name} source correct`)

    // Specific pain checks
    if (lead.noteGoogle < 3.5 && lead.nbAvis > 5) {
      const hasBadReview = result.pains.some(p => p.type === 'BAD_REVIEWS' || p.type === 'LOW_GOOGLE_RATING')
      assert(hasBadReview, `${lead.name} detects bad review pain`, `note=${lead.noteGoogle}`)
    }
    if (!lead.website) {
      const noSite = result.pains.some(p => p.type === 'NO_WEBSITE')
      assert(noSite, `${lead.name} detects no website pain`)
    }
  }
}

// T3 — Certifications (requires API, may skip if no network)
console.log('\n--- T3: Certifications ---')
for (const lead of LEADS) {
  const result = await safeTest(`certs_${lead.name}`, () => checkCertifications(lead))
  if (result) {
    assert(Array.isArray(result.certifications), `${lead.name} certifications is array`)
    assert(typeof result.certScore === 'number', `${lead.name} certScore is number`, `${result.certScore}/100`)
    assert(result.source === 'certifications', `${lead.name} source correct`)
  }
}

// T4 — Social Presence (requires SERPER_API_KEY)
console.log('\n--- T4: Social Presence ---')
const hasSerper = !!process.env.SERPER_API_KEY
if (hasSerper) {
  for (const lead of LEADS.slice(0, 2)) {
    const result = await safeTest(`social_${lead.name}`, () => analyzeSocialPresenceV2(lead))
    if (result) {
      assert(typeof result.socialScore === 'number', `${lead.name} socialScore is number`, `${result.socialScore}/100`)
      assert(Array.isArray(result.presentPlatforms), `${lead.name} presentPlatforms is array`)
      assert(result.source === 'social_presence', `${lead.name} source correct`)
    }
  }
} else {
  skip('Social Presence', 'SERPER_API_KEY not set')
}

// T5 — Intent Signals (requires SERPER_API_KEY for job detection)
console.log('\n--- T5: Intent Signals ---')
if (hasSerper) {
  for (const lead of LEADS.slice(0, 2)) {
    const result = await safeTest(`intent_${lead.name}`, () => detectIntentSignals(lead))
    if (result) {
      assert(Array.isArray(result.signals), `${lead.name} signals is array`)
      assert(typeof result.urgencyScore === 'number', `${lead.name} urgencyScore is number`, `${result.urgencyScore}/100`)
      assert(result.source === 'intent_signals', `${lead.name} source correct`)
    }
  }
} else {
  skip('Intent Signals', 'SERPER_API_KEY not set')
}

// T6 — Technography (requires network for website fetch)
console.log('\n--- T6: Technography ---')
for (const lead of LEADS.filter(l => l.website)) {
  const result = await safeTest(`techno_${lead.name}`, () => analyzeTechnography(lead))
  if (result) {
    assert(typeof result.maturiteScore === 'number' || result.maturiteScore === null, `${lead.name} maturiteScore valid`, `${result.maturiteScore}/100`)
    assert(typeof result.maturiteLabel === 'string' || result.maturiteLabel === null, `${lead.name} maturiteLabel valid`, result.maturiteLabel)
    assert(result.source === 'technography' || result.source === 'no_website', `${lead.name} source correct`)
  }
}

// T7 — Director (requires PAPPERS or network)
console.log('\n--- T7: Director ---')
const hasPappers = !!process.env.PAPPERS_API_KEY
if (hasPappers) {
  for (const lead of LEADS.slice(0, 2)) {
    const result = await safeTest(`director_${lead.name}`, () => findDirector(lead))
    if (result) {
      assert(result.source !== undefined, `${lead.name} has source`, result.source)
      assert(typeof result.dScoreBonus === 'number', `${lead.name} dScoreBonus is number`, `+${result.dScoreBonus}`)
    }
  }
} else {
  skip('Director', 'PAPPERS_API_KEY not set')
}

// T8 — Growth Score (requires network for INPI/SIRENE)
console.log('\n--- T8: Growth Score ---')
for (const lead of LEADS.slice(0, 2)) {
  const result = await safeTest(`growth_${lead.name}`, () => calculateGrowthScore(lead))
  if (result) {
    assert(['CROISSANCE', 'STABLE', 'DECLIN', 'INCONNU'].includes(result.tendance), `${lead.name} tendance valid`, result.tendance)
    assert(typeof result.growthScore === 'number', `${lead.name} growthScore is number`, `${result.growthScore}/100`)
    assert(result.source === 'growth_score', `${lead.name} source correct`)
  }
}

// T9 — Orchestrator (full pipeline, mocked Firestore)
console.log('\n--- T9: Orchestrator (sans Firestore) ---')
const testLead = LEADS[0]
const orchResult = await safeTest('orchestrator_full', () => orchestrateSignals(testLead))
if (orchResult) {
  assert(typeof orchResult.totalDScoreBonus === 'number', 'totalDScoreBonus is number', `+${orchResult.totalDScoreBonus}`)
  assert(orchResult.totalDScoreBonus >= 0 && orchResult.totalDScoreBonus <= 60, 'totalDScoreBonus capped at 60')
  assert(orchResult.enrichedLead !== undefined, 'enrichedLead exists')
  assert(orchResult.enrichedLead._signalsEnriched === true, 'enrichedLead._signalsEnriched = true')
  assert(typeof orchResult.enrichedLead._signalsElapsed === 'number', 'elapsed tracked', `${orchResult.enrichedLead._signalsElapsed}ms`)

  // Check all 8 dimension keys present
  const keys = ['intent', 'techno', 'director', 'growth', 'pain', 'timing', 'certs', 'social']
  for (const key of keys) {
    assert(key in orchResult, `orchestrator returns ${key}`)
  }
}

// ============================================
// REPORT
// ============================================

console.log('\n' + '='.repeat(60))
console.log(`  RESULTATS: ${passed} PASS / ${failed} FAIL / ${skipped} SKIP`)
console.log('='.repeat(60) + '\n')

if (failed > 0) {
  process.exit(1)
}
