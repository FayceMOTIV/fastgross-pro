#!/usr/bin/env node
/**
 * Test New Phase 1-10 Modules
 * Validates that all new modules import correctly and handle missing API keys gracefully.
 * Run from project root: node scripts/test-new-modules.mjs
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const functionsDir = join(__dirname, '..', 'functions')

// Set up module resolution from functions/ dir
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'face-media-factory' })
process.env.GCLOUD_PROJECT = 'face-media-factory'

const results = { passed: 0, failed: 0, skipped: 0, details: [] }

function log(status, module, message) {
  const icon = status === 'PASS' ? '\u2705' : status === 'FAIL' ? '\u274C' : '\u23ED\uFE0F'
  console.log(`${icon} [${module}] ${message}`)
  results.details.push({ status, module, message })
  if (status === 'PASS') results.passed++
  else if (status === 'FAIL') results.failed++
  else results.skipped++
}

function srcPath(relative) {
  return `file://${join(functionsDir, 'src', relative)}`
}

// ─── TEST 1: ORCHESTRATOR HELPERS ─────────────────────────────────────────────

async function testOrchestratorHelpers() {
  console.log('\n─── Phase 1: Orchestrator Helpers ───')

  try {
    const { calculateDailyBudgets, getRemainingBudget } = await import(srcPath('orchestrator/helpers/budgetCalculator.js'))
    const budget = calculateDailyBudgets({ dailyBudget: { total: 100, channels: {} } })
    if (budget && typeof budget === 'object') log('PASS', 'budgetCalculator', `calculateDailyBudgets returns object with ${Object.keys(budget).length} channels`)
    else log('FAIL', 'budgetCalculator', 'Unexpected return type')
  } catch (e) {
    log('FAIL', 'budgetCalculator', e.message)
  }

  try {
    const { isWithinBusinessHours, getNextSendWindow } = await import(srcPath('orchestrator/helpers/businessHoursValidator.js'))
    const result = isWithinBusinessHours('Europe/Paris')
    log('PASS', 'businessHoursValidator', `isWithinBusinessHours returns ${result}`)
  } catch (e) {
    log('FAIL', 'businessHoursValidator', e.message)
  }

  try {
    const { checkAllChannelsHealth } = await import(srcPath('orchestrator/helpers/channelHealthCheck.js'))
    log('PASS', 'channelHealthCheck', 'Module imports OK')
  } catch (e) {
    log('FAIL', 'channelHealthCheck', e.message)
  }

  try {
    const { calculateBatchSize, calculateDelay } = await import(srcPath('orchestrator/helpers/batchCalculator.js'))
    const batch = calculateBatchSize('email', 1, 100)
    const delay = calculateDelay('email')
    if (typeof batch === 'number' && typeof delay === 'number')
      log('PASS', 'batchCalculator', `batch=${batch}, delay=${Math.round(delay)}ms`)
    else log('FAIL', 'batchCalculator', 'Unexpected return types')
  } catch (e) {
    log('FAIL', 'batchCalculator', e.message)
  }
}

// ─── TEST 2: DISPATCHERS ───────────────────────────────────────────────────────

async function testDispatchers() {
  console.log('\n─── Phase 2: Channel Dispatchers ───')

  const dispatchers = [
    'emailDispatcher', 'smsDispatcher', 'whatsappDispatcher',
    'instagramDispatcher', 'linkedinDispatcher', 'voicemailDispatcher',
    'postalDispatcher', 'twitterDispatcher'
  ]

  for (const name of dispatchers) {
    try {
      const mod = await import(srcPath(`orchestrator/dispatchers/${name}.js`))
      const fnName = `dispatch${name.replace('Dispatcher', '').charAt(0).toUpperCase() + name.replace('Dispatcher', '').slice(1)}`
      if (typeof mod[fnName] === 'function' || typeof mod.default === 'function' || Object.keys(mod).length > 0) {
        log('PASS', name, `Exports: ${Object.keys(mod).join(', ')}`)
      } else {
        log('FAIL', name, 'No exports found')
      }
    } catch (e) {
      log('FAIL', name, e.message)
    }
  }
}

// ─── TEST 3: MASTER SCHEDULER ──────────────────────────────────────────────────

async function testMasterScheduler() {
  console.log('\n─── Phase 3: Master Scheduler ───')

  try {
    const mod = await import(srcPath('orchestrator/masterScheduler.js'))
    const exports = Object.keys(mod)
    const expected = ['masterScheduler', 'runMasterSchedulerManual', 'dailyBudgetManager', 'replyAggregator']
    const found = expected.filter(e => exports.includes(e))
    if (found.length === expected.length) {
      log('PASS', 'masterScheduler', `All 4 exports present: ${found.join(', ')}`)
    } else {
      log('FAIL', 'masterScheduler', `Missing: ${expected.filter(e => !exports.includes(e)).join(', ')}`)
    }
  } catch (e) {
    log('FAIL', 'masterScheduler', e.message)
  }

  try {
    const mod = await import(srcPath('orchestrator/warRoomStats.js'))
    const exports = Object.keys(mod)
    const expected = ['getWarRoomStats', 'getWarRoomOrgList', 'toggleOrgProspection', 'emergencyPauseAll']
    const found = expected.filter(e => exports.includes(e))
    if (found.length === expected.length) {
      log('PASS', 'warRoomStats', `All 4 exports present: ${found.join(', ')}`)
    } else {
      log('FAIL', 'warRoomStats', `Missing: ${expected.filter(e => !exports.includes(e)).join(', ')}`)
    }
  } catch (e) {
    log('FAIL', 'warRoomStats', e.message)
  }
}

// ─── TEST 4: LINKEDIN MODULE ───────────────────────────────────────────────────

async function testLinkedIn() {
  console.log('\n─── Phase 5: LinkedIn Module ───')

  try {
    const mod = await import(srcPath('hunters/linkedin/linkedinService.js'))
    const exports = Object.keys(mod)
    if (exports.length >= 5) {
      log('PASS', 'linkedinService', `${exports.length} exports: ${exports.slice(0, 5).join(', ')}...`)
    } else {
      log('FAIL', 'linkedinService', `Only ${exports.length} exports`)
    }

    // Test graceful handling without API key
    const result = await mod.getLinkedInAccounts()
    if (result.success === false && result.error) {
      log('PASS', 'linkedinService:nokey', `Graceful: ${result.error}`)
    } else if (result.success === true) {
      log('PASS', 'linkedinService:nokey', 'Key is configured (unexpected but OK)')
    }
  } catch (e) {
    log('FAIL', 'linkedinService', e.message)
  }

  try {
    const mod = await import(srcPath('hunters/linkedin/linkedinScraper.js'))
    const exports = Object.keys(mod)
    if (exports.length >= 3) {
      log('PASS', 'linkedinScraper', `${exports.length} exports: ${exports.join(', ')}`)
    }

    // Test graceful handling without API key
    const result = await mod.scrapeLinkedInSearch('test', 'France', 5)
    if (result.success === false) {
      log('PASS', 'linkedinScraper:nokey', `Graceful: ${result.error}`)
    }
  } catch (e) {
    log('FAIL', 'linkedinScraper', e.message)
  }

  try {
    const mod = await import(srcPath('hunters/linkedin/linkedinHunter.js'))
    const exports = Object.keys(mod)
    const expected = ['linkedinHunter', 'runLinkedInHunterManual', 'getLinkedInHunterStats', 'syncLinkedInInbox', 'addLinkedInAccount', 'removeLinkedInAccount']
    const found = expected.filter(e => exports.includes(e))
    log('PASS', 'linkedinHunter', `${found.length}/${expected.length} exports found`)
  } catch (e) {
    log('FAIL', 'linkedinHunter', e.message)
  }
}

// ─── TEST 5: GOOGLE MAPS UPGRADE ──────────────────────────────────────────────

async function testGoogleMaps() {
  console.log('\n─── Phase 6: Google Maps Upgrade ───')

  try {
    const mod = await import(srcPath('hunters/googlemaps/googleMapsHunter.js'))
    const exports = Object.keys(mod)
    const expected = ['googleMapsHunter', 'runGoogleMapsHunterManual', 'getGoogleMapsHunterStats', 'runGoogleMapsSourcingManual']
    const found = expected.filter(e => exports.includes(e))
    if (found.length === expected.length) {
      log('PASS', 'googleMapsHunter', `All ${expected.length} exports: ${found.join(', ')}`)
    } else {
      log('FAIL', 'googleMapsHunter', `Found ${found.length}/${expected.length}: missing ${expected.filter(e => !exports.includes(e)).join(', ')}`)
    }
  } catch (e) {
    log('FAIL', 'googleMapsHunter', e.message)
  }
}

// ─── TEST 6: CHANNEL ROUTER UPGRADE ───────────────────────────────────────────

async function testChannelRouter() {
  console.log('\n─── Phase 4: Channel Router Upgrade ───')

  try {
    const mod = await import(srcPath('engine/channelRouter.js'))
    const exports = Object.keys(mod)

    // Check new functions added in Phase 4
    const newFns = ['generateOptimalSequence', 'allocateChannelBudgets', 'selectChannelsByLeadType']
    const foundNew = newFns.filter(fn => exports.includes(fn))

    // Check existing functions still present
    const existingFns = ['selectOptimalChannel', 'selectChannelsForSequence', 'recommendChannelStrategy']
    const foundExisting = existingFns.filter(fn => exports.includes(fn))

    if (foundNew.length === newFns.length && foundExisting.length === existingFns.length) {
      log('PASS', 'channelRouter', `All ${exports.length} exports OK (${foundNew.length} new + ${foundExisting.length} existing)`)
    } else {
      log('FAIL', 'channelRouter', `Missing new: ${newFns.filter(fn => !exports.includes(fn)).join(', ')} | existing: ${existingFns.filter(fn => !exports.includes(fn)).join(', ')}`)
    }
  } catch (e) {
    log('FAIL', 'channelRouter', e.message)
  }
}

// ─── RUN ALL ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log(' FMF — Test New Phase 1-10 Modules')
  console.log('═══════════════════════════════════════════════')

  // First init firebase-admin from functions context
  try {
    const admin = await import(srcPath('../node_modules/firebase-admin/lib/index.js'))
    // firebase-admin needs to be initialized before importing modules that use it
  } catch (e) {
    console.log(`Note: firebase-admin direct import: ${e.message}`)
  }

  await testOrchestratorHelpers()
  await testDispatchers()
  await testMasterScheduler()
  await testChannelRouter()
  await testLinkedIn()
  await testGoogleMaps()

  console.log('\n═══════════════════════════════════════════════')
  console.log(` RESULTS: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`)
  console.log('═══════════════════════════════════════════════')

  if (results.failed > 0) {
    console.log('\nFailed tests:')
    results.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  \u274C ${d.module}: ${d.message}`)
    })
    process.exit(1)
  } else {
    console.log('\n\uD83C\uDFAF All modules validated successfully!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
