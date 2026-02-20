#!/usr/bin/env node
/**
 * API Key Checker - Face Media Factory
 * Validates all API keys are configured and not placeholder values.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../functions/.env')

// Known test/placeholder patterns
const PLACEHOLDER_PATTERNS = [
  /^$/, // empty
  /your_.*_here/i,
  /placeholder/i,
  /change_me/i,
  /xxx+/i,
  /TODO/i,
]

const KEYS_CONFIG = {
  // REQUIRED - System won't work without these
  required: {
    'GROQ_API_KEY': { prefix: 'gsk_', description: 'AI Generation (primary)' },
  },
  // RECOMMENDED - System works but limited without these
  recommended: {
    'OPENROUTER_API_KEY': { prefix: 'sk-or-', description: 'AI Fallback provider' },
    'GEMINI_API_KEY': { prefix: 'AIzaSy', description: 'AI Backup provider' },
    'RESEND_API_KEY': { prefix: 're_', description: 'Email sending (primary)' },
  },
  // OPTIONAL - Nice to have
  optional: {
    'SMTP_HOST': { prefix: null, description: 'SMTP fallback for email' },
    'SMTP_USER': { prefix: null, description: 'SMTP username' },
    'SMTP_PASS': { prefix: null, description: 'SMTP password' },
    'SERPER_API_KEY': { prefix: null, description: 'Serper.dev prospect search' },
    'EVOLUTION_API_URL': { prefix: 'http', description: 'WhatsApp API URL' },
    'EVOLUTION_API_KEY': { prefix: null, description: 'WhatsApp API key' },
  }
}

function checkKeys() {
  console.log('\n========================================')
  console.log(' FACE MEDIA FACTORY - API KEY CHECKER')
  console.log('========================================\n')

  let envContent
  try {
    envContent = readFileSync(envPath, 'utf-8')
  } catch (err) {
    console.error('ERROR: Cannot read functions/.env file')
    console.error(`Path: ${envPath}`)
    process.exit(1)
  }

  // Parse .env
  const envVars = {}
  envContent.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const [key, ...valueParts] = line.split('=')
    envVars[key.trim()] = valueParts.join('=').trim()
  })

  let allOk = true
  let warnings = 0
  const results = []

  function checkCategory(category, keys, required) {
    console.log(`--- ${category.toUpperCase()} ---`)

    for (const [key, config] of Object.entries(keys)) {
      const value = envVars[key] || ''
      const isPlaceholder = PLACEHOLDER_PATTERNS.some(p => p.test(value))
      const hasPrefix = config.prefix ? value.startsWith(config.prefix) : true
      const isConfigured = value.length > 0 && !isPlaceholder

      let status
      if (isConfigured && hasPrefix) {
        status = 'OK'
        console.log(`  [OK]  ${key} - ${config.description}`)
      } else if (isConfigured && !hasPrefix) {
        status = 'WARN'
        warnings++
        console.log(`  [??]  ${key} - Unexpected format (expected prefix: ${config.prefix})`)
      } else if (required) {
        status = 'FAIL'
        allOk = false
        console.log(`  [!!]  ${key} - MISSING (${config.description})`)
      } else {
        status = 'SKIP'
        console.log(`  [--]  ${key} - Not configured (${config.description})`)
      }

      results.push({ key, status, required, description: config.description })
    }
    console.log()
  }

  checkCategory('Required', KEYS_CONFIG.required, true)
  checkCategory('Recommended', KEYS_CONFIG.recommended, false)
  checkCategory('Optional', KEYS_CONFIG.optional, false)

  // Summary
  const okCount = results.filter(r => r.status === 'OK').length
  const failCount = results.filter(r => r.status === 'FAIL').length
  const skipCount = results.filter(r => r.status === 'SKIP').length

  console.log('========================================')
  console.log(` SUMMARY: ${okCount} configured, ${failCount} missing required, ${skipCount} skipped`)

  if (failCount > 0) {
    console.log('\n [!!] CRITICAL: Missing required API keys!')
    console.log(' The system will NOT function without them.')
    process.exit(1)
  }

  if (warnings > 0) {
    console.log(`\n [??] ${warnings} key(s) have unexpected format`)
  }

  // Check if keys look like they might be shared/temporary
  // (keys that were set during initial testing session should be rotated)
  const tempKeyIndicators = envContent.includes('TEMPORAIRES') || envContent.includes('CHANGER')
  if (tempKeyIndicators) {
    console.log('\n WARNING: .env file contains "TEMPORAIRES" marker.')
    console.log(' API keys may need rotation. See CLEANUP_INSTRUCTIONS.md')
  }

  console.log('\n========================================\n')
  return { allOk, results }
}

checkKeys()
