#!/usr/bin/env node
/**
 * run_ca_test.mjs
 * Test du CA Estimation Engine avec 5 profils de leads differents.
 *
 * Usage : cd functions && node run_ca_test.mjs
 */

import { estimateCA, estimateCALight } from './src/ca/caEstimationEngine.js'
import { crossAndScore } from './src/ca/caScorer.js'

const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function formatCA(ca) {
  if (!ca) return 'N/A'
  if (ca >= 1_000_000) return `${(ca / 1_000_000).toFixed(1)}M EUR`
  if (ca >= 1_000) return `${Math.round(ca / 1_000)}k EUR`
  return `${ca} EUR`
}

// ============================================
// 5 SCENARIOS DE TEST
// ============================================

const LEADS = [
  {
    name: 'PME industrielle complete (toutes sources)',
    lead: {
      siren: '123456789',
      siret: '12345678900012',
      company: 'Mecanique Dupont SAS',
      naf: '2562B',
      codeNaf: '2562B',
      trancheEffectif: '12',  // 20-49 salaries
      capital_social: 500_000,
      forme_juridique: 'SAS',
      date_creation: '2008-03-15',
      departement: '69',
      code_postal: '69001',
      city: 'Lyon',
      noteGoogle: 4.2,
      nbAvis: 87,
      website: 'www.mecanique-dupont.fr',
      linkedin_employees: 35,
      pappersData: { chiffre_affaires: 5_200_000, annee_bilan: 2024, capital: 500_000 },
    },
    expectedRange: [3_000_000, 10_000_000],
    expectedMinSources: 5,
  },
  {
    name: 'Restaurant local (Google Maps fort)',
    lead: {
      company: 'Le Petit Bistrot',
      naf: '5610A',
      codeNaf: '5610A',
      trancheEffectif: '03',  // 6-9 salaries
      forme_juridique: 'SARL',
      date_creation: '2015-06-01',
      departement: '75',
      code_postal: '75011',
      city: 'Paris',
      noteGoogle: 4.6,
      nbAvis: 342,
      capital_social: 15_000,
    },
    expectedRange: [200_000, 2_000_000],
    expectedMinSources: 3,
  },
  {
    name: 'Startup tech (LinkedIn fort, pas de CA publie)',
    lead: {
      company: 'DataFlow AI SAS',
      naf: '6201Z',
      codeNaf: '6201Z',
      trancheEffectif: '11',  // 10-19 salaries
      forme_juridique: 'SAS',
      date_creation: '2021-01-10',
      departement: '92',
      code_postal: '92100',
      city: 'Boulogne-Billancourt',
      linkedin_employees: 22,
      capital_social: 200_000,
      website: 'www.dataflow-ai.com',
    },
    expectedRange: [500_000, 5_000_000],
    expectedMinSources: 3,
  },
  {
    name: 'Artisan solo (minimum de donnees)',
    lead: {
      company: 'Plomberie Martin',
      naf: '4322A',
      codeNaf: '4322A',
      trancheEffectif: '01',  // 1-2 salaries
      forme_juridique: 'EI',
      date_creation: '2019-09-01',
      departement: '33',
      city: 'Bordeaux',
    },
    expectedRange: [30_000, 500_000],
    expectedMinSources: 2,
  },
  {
    name: 'Lead quasi-vide (stress test)',
    lead: {
      company: 'Entreprise Inconnue',
      city: 'Marseille',
    },
    expectedRange: null,  // Peut etre null
    expectedMinSources: 0,
  },
]

// ============================================
// EXECUTION
// ============================================

async function runTests() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`)
  console.log(`${BOLD}${CYAN}  CA ESTIMATION ENGINE — TEST SUITE${RESET}`)
  console.log(`${CYAN}═══════════════════════════════════════════════${RESET}\n`)

  let passed = 0
  let failed = 0

  for (let i = 0; i < LEADS.length; i++) {
    const { name, lead, expectedRange, expectedMinSources } = LEADS[i]
    console.log(`${BOLD}[${i + 1}/${LEADS.length}] ${name}${RESET}`)

    try {
      const startTime = Date.now()
      const result = await estimateCA(lead, { caMinSeuil: 2_000_000 })
      const duration = Date.now() - startTime

      // Afficher les sources actives
      const activeSources = result.sources?.filter(s => s.estimate > 0) || []
      console.log(`  Sources actives : ${activeSources.length}/${result.sources?.length || 0}`)
      for (const s of activeSources) {
        console.log(`    - ${s.source}: ${formatCA(s.estimate)} (conf ${s.confidence}%)`)
      }

      console.log(`  ${BOLD}CA estime : ${formatCA(result.caEstime)}${RESET} [${formatCA(result.caLow)} - ${formatCA(result.caHigh)}]`)
      console.log(`  Confiance : ${result.confidence}% (${result.label})`)
      console.log(`  Convergence : ${result.convergence ? 'OUI' : 'NON'}`)
      console.log(`  Verdict seuil 2M : ${result.verdictSeuil}`)
      console.log(`  Duree : ${duration}ms`)

      // Verifications
      let testPassed = true

      // Check nombre de sources
      if (activeSources.length < expectedMinSources) {
        console.log(`  ${RED}FAIL: ${activeSources.length} sources < ${expectedMinSources} attendues${RESET}`)
        testPassed = false
      }

      // Check fourchette CA
      if (expectedRange) {
        if (!result.caEstime) {
          console.log(`  ${RED}FAIL: CA null, attendu [${formatCA(expectedRange[0])} - ${formatCA(expectedRange[1])}]${RESET}`)
          testPassed = false
        } else if (result.caEstime < expectedRange[0] || result.caEstime > expectedRange[1]) {
          console.log(`  ${YELLOW}WARN: CA ${formatCA(result.caEstime)} hors fourchette attendue [${formatCA(expectedRange[0])} - ${formatCA(expectedRange[1])}]${RESET}`)
          // Warning, pas un fail
        }
      }

      // Check pas d'erreur
      if (result.label === 'INCONNU' && expectedMinSources > 0) {
        console.log(`  ${RED}FAIL: label INCONNU avec ${expectedMinSources} sources attendues${RESET}`)
        testPassed = false
      }

      if (testPassed) {
        console.log(`  ${GREEN}PASS${RESET}`)
        passed++
      } else {
        failed++
      }
    } catch (err) {
      console.log(`  ${RED}ERROR: ${err.message}${RESET}`)
      failed++
    }

    console.log('')
  }

  // Test estimateCALight separement
  console.log(`${BOLD}[BONUS] estimateCALight (sources rapides)${RESET}`)
  try {
    const result = await estimateCALight(LEADS[0].lead)
    const activeSources = result.sources?.filter(s => s.estimate > 0) || []
    console.log(`  Sources : ${activeSources.length}`)
    console.log(`  CA : ${formatCA(result.caEstime)} (${result.label})`)
    console.log(`  ${GREEN}PASS${RESET}\n`)
    passed++
  } catch (err) {
    console.log(`  ${RED}ERROR: ${err.message}${RESET}\n`)
    failed++
  }

  // Test crossAndScore avec donnees vides
  console.log(`${BOLD}[BONUS] crossAndScore vide${RESET}`)
  const emptyResult = crossAndScore([], 0, {})
  if (emptyResult.label === 'INCONNU' && emptyResult.nbSources === 0) {
    console.log(`  ${GREEN}PASS${RESET} (label=INCONNU, nbSources=0)\n`)
    passed++
  } else {
    console.log(`  ${RED}FAIL${RESET}\n`)
    failed++
  }

  // Resultat final
  const total = passed + failed
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`)
  console.log(`${BOLD}  RESULTATS: ${passed}/${total} PASS${failed > 0 ? ` | ${RED}${failed} FAIL${RESET}` : ` | ${GREEN}0 FAIL${RESET}`}${RESET}`)
  console.log(`${CYAN}═══════════════════════════════════════════════${RESET}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error(`${RED}FATAL: ${err.message}${RESET}`)
  process.exit(1)
})
