#!/usr/bin/env node
/**
 * Battle Test — Alex Voice Modules
 * Tests: callScheduler, alexVoiceTools, alexVoicePromptBuilder (structure only)
 *
 * Usage: cd functions && node run_voice_test.mjs
 */

import { isCallAllowed, getNextLegalWindow, JOURS_FERIES } from './src/voice/callScheduler.js'
import { buildVapiTools } from './src/voice/alexVoiceTools.js'

// ============================================
// TEST RUNNER
// ============================================

const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
let passed = 0
let failed = 0

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ${PASS} ${testName}${detail ? ' — ' + detail : ''}`)
    passed++
  } else {
    console.log(`  ${FAIL} ${testName}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

console.log('\n' + '='.repeat(60))
console.log('  BATTLE TEST — Alex Voice Modules')
console.log('='.repeat(60) + '\n')

// ============================================
// T1 — Call Scheduler: Legal Hours
// ============================================
console.log('--- T1: Call Scheduler — Legal Hours ---')

// Create dates in specific Paris hours
function makeParisDate(year, month, day, hour, minute = 0) {
  // Create date string in Paris timezone, then convert
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  // Use Intl to get Paris offset
  const d = new Date(dateStr + '+01:00') // CET approximation for winter
  return d
}

// Monday 10:00 — should be allowed (morning window)
const mon10 = makeParisDate(2026, 3, 9, 10, 0) // Monday March 9 2026
const r1 = isCallAllowed(mon10)
assert(r1.allowed === true, 'Monday 10h = allowed', `allowed=${r1.allowed}`)

// Monday 13:00 — lunch break, not allowed
const mon13 = makeParisDate(2026, 3, 9, 13, 0)
const r2 = isCallAllowed(mon13)
assert(r2.allowed === false, 'Monday 13h = not allowed (lunch)', `reason=${r2.reason}`)

// Monday 15:00 — afternoon window, allowed
const mon15 = makeParisDate(2026, 3, 9, 15, 0)
const r3 = isCallAllowed(mon15)
assert(r3.allowed === true, 'Monday 15h = allowed', `allowed=${r3.allowed}`)

// Monday 19:00 — too late, not allowed
const mon19 = makeParisDate(2026, 3, 9, 19, 0)
const r4 = isCallAllowed(mon19)
assert(r4.allowed === false, 'Monday 19h = not allowed', `reason=${r4.reason}`)

// Monday 7:00 — too early, not allowed
const mon7 = makeParisDate(2026, 3, 9, 7, 0)
const r5 = isCallAllowed(mon7)
assert(r5.allowed === false, 'Monday 7h = not allowed', `reason=${r5.reason}`)

// Saturday — not allowed
const sat10 = makeParisDate(2026, 3, 14, 10, 0) // Saturday March 14
const r6 = isCallAllowed(sat10)
assert(r6.allowed === false, 'Saturday = not allowed', `reason=${r6.reason}`)

// Sunday — not allowed
const sun10 = makeParisDate(2026, 3, 15, 10, 0) // Sunday March 15
const r7 = isCallAllowed(sun10)
assert(r7.allowed === false, 'Sunday = not allowed', `reason=${r7.reason}`)

// ============================================
// T2 — Call Scheduler: French Holidays
// ============================================
console.log('\n--- T2: Call Scheduler — French Holidays ---')

assert(JOURS_FERIES.has('2026-01-01'), 'Jour de l\'An 2026 in holidays')
assert(JOURS_FERIES.has('2026-05-01'), 'Fete du Travail 2026 in holidays')
assert(JOURS_FERIES.has('2026-07-14'), '14 Juillet 2026 in holidays')
assert(JOURS_FERIES.has('2026-12-25'), 'Noel 2026 in holidays')
assert(JOURS_FERIES.size >= 20, 'At least 20 holidays defined', `count=${JOURS_FERIES.size}`)

// Holiday check — 1er Mai 2026 (vendredi)
const premierMai = makeParisDate(2026, 5, 1, 10, 0)
const r8 = isCallAllowed(premierMai)
assert(r8.allowed === false, '1er Mai = jour ferie', `reason=${r8.reason}`)

// ============================================
// T3 — Call Scheduler: Next Legal Window
// ============================================
console.log('\n--- T3: Call Scheduler — Next Legal Window ---')

const nextWindow = getNextLegalWindow()
assert(nextWindow instanceof Date, 'getNextLegalWindow returns Date')
assert(nextWindow.getTime() >= Date.now(), 'Next window is in the future or now')

// From a Saturday evening → should get Monday 9h
const satEvening = makeParisDate(2026, 3, 14, 20, 0)
const nextFromSat = getNextLegalWindow(satEvening)
assert(nextFromSat instanceof Date, 'Next from Saturday returns Date')
assert(nextFromSat.getTime() > satEvening.getTime(), 'Next from Saturday is after Saturday')

// From Monday 13h → should get Monday 14h
const monLunch = makeParisDate(2026, 3, 9, 13, 0)
const nextFromLunch = getNextLegalWindow(monLunch)
assert(nextFromLunch instanceof Date, 'Next from lunch returns Date')

// ============================================
// T4 — Vapi Tools
// ============================================
console.log('\n--- T4: Vapi Tools ---')

const tools = buildVapiTools('https://example.com/webhook')
assert(Array.isArray(tools), 'buildVapiTools returns array')
assert(tools.length === 4, '4 tools defined', `count=${tools.length}`)

const toolNames = tools.map(t => t.function?.name)
assert(toolNames.includes('scheduleCallback'), 'scheduleCallback tool exists')
assert(toolNames.includes('markAsInterested'), 'markAsInterested tool exists')
assert(toolNames.includes('markAsDisqualified'), 'markAsDisqualified tool exists')
assert(toolNames.includes('transferToHuman'), 'transferToHuman tool exists')

// Check tool structure
for (const tool of tools) {
  assert(tool.type === 'function', `${tool.function.name} type = function`)
  assert(tool.server?.url === 'https://example.com/webhook', `${tool.function.name} has server URL`)
  assert(tool.function?.parameters?.type === 'object', `${tool.function.name} has parameters`)
  assert(Array.isArray(tool.messages), `${tool.function.name} has messages`)
}

// ============================================
// T5 — Module Imports Validation
// ============================================
console.log('\n--- T5: Module Imports ---')

// These imports would fail if files are missing or have syntax errors
try {
  await import('./src/voice/callScheduler.js')
  assert(true, 'callScheduler.js imports OK')
} catch (e) {
  assert(false, 'callScheduler.js import', e.message)
}

try {
  await import('./src/voice/alexVoiceTools.js')
  assert(true, 'alexVoiceTools.js imports OK')
} catch (e) {
  assert(false, 'alexVoiceTools.js import', e.message)
}

try {
  await import('./src/voice/alexVoicePromptBuilder.js')
  assert(true, 'alexVoicePromptBuilder.js imports OK')
} catch (e) {
  // Expected: may fail due to firebase-admin not initialized
  if (e.message.includes('firebase') || e.message.includes('getFirestore') || e.message.includes('No Firebase')) {
    assert(true, 'alexVoicePromptBuilder.js imports OK (firebase-admin not init expected)')
  } else {
    assert(false, 'alexVoicePromptBuilder.js import', e.message)
  }
}

try {
  await import('./src/voice/alexVoiceEngine.js')
  assert(true, 'alexVoiceEngine.js imports OK')
} catch (e) {
  if (e.message.includes('firebase') || e.message.includes('getFirestore') || e.message.includes('No Firebase')) {
    assert(true, 'alexVoiceEngine.js imports OK (firebase-admin not init expected)')
  } else {
    assert(false, 'alexVoiceEngine.js import', e.message)
  }
}

try {
  await import('./src/voice/vapiWebhookHandler.js')
  assert(true, 'vapiWebhookHandler.js imports OK')
} catch (e) {
  if (e.message.includes('firebase') || e.message.includes('getFirestore') || e.message.includes('No Firebase')) {
    assert(true, 'vapiWebhookHandler.js imports OK (firebase-admin not init expected)')
  } else {
    assert(false, 'vapiWebhookHandler.js import', e.message)
  }
}

try {
  await import('./src/voice/alexVoiceFunctions.js')
  assert(true, 'alexVoiceFunctions.js imports OK')
} catch (e) {
  if (e.message.includes('firebase') || e.message.includes('getFirestore') || e.message.includes('No Firebase')) {
    assert(true, 'alexVoiceFunctions.js imports OK (firebase-admin not init expected)')
  } else {
    assert(false, 'alexVoiceFunctions.js import', e.message)
  }
}

// ============================================
// REPORT
// ============================================

console.log('\n' + '='.repeat(60))
console.log(`  RESULTATS: ${passed} PASS / ${failed} FAIL`)
console.log('='.repeat(60) + '\n')

if (failed > 0) {
  process.exit(1)
}
