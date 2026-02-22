#!/usr/bin/env node
/**
 * VALIDATE CHANNELS - Test every integration point before going live
 *
 * Tests each channel in isolation:
 *   1. API Keys (.env)
 *   2. Resend (email API ping)
 *   3. Serper.dev (search ping)
 *   4. Facebook Hunter (Serper site:facebook.com)
 *   5. TikTok Scraper (npm module)
 *   6. Python + instagrapi (Instagram prereqs)
 *   7. Instagram Login (if credentials provided)
 *   8. Evolution API (WhatsApp ping)
 *   9. Gemini AI (qualification ping)
 *  10. SMTP (connection test)
 *
 * Usage:
 *   node scripts/validate-channels.mjs
 *   node scripts/validate-channels.mjs --ig-user=xxx --ig-pass=xxx   # test IG login
 *   node scripts/validate-channels.mjs --evolution-url=http://localhost:8080
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Load .env ──────────────────────────────────────────────
const envPath = resolve(ROOT, 'functions/.env')
const envContent = readFileSync(envPath, 'utf8')
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

// ── Parse CLI args ─────────────────────────────────────────
const args = {}
process.argv.slice(2).forEach(arg => {
  const match = arg.match(/^--([^=]+)=(.+)$/)
  if (match) args[match[1]] = match[2]
})

// Override env with CLI args
if (args['ig-user']) process.env.IG_USERNAME = args['ig-user']
if (args['ig-pass']) process.env.IG_PASSWORD = args['ig-pass']
if (args['evolution-url']) process.env.EVOLUTION_API_URL = args['evolution-url']
if (args['evolution-key']) process.env.EVOLUTION_API_KEY = args['evolution-key']
if (args['evolution-instance']) process.env.EVOLUTION_INSTANCE_NAME = args['evolution-instance']

// ── Test framework ─────────────────────────────────────────
const results = []
let currentSection = ''

function section(name) {
  currentSection = name
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${name}`)
  console.log('='.repeat(60))
}

function pass(name, detail) {
  console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  if (detail) console.log(`    ${detail}`)
  results.push({ section: currentSection, test: name, status: 'OK', detail: detail || '' })
}

function fail(name, detail) {
  console.log(`  \x1b[31m✗\x1b[0m ${name}`)
  if (detail) console.log(`    ${detail}`)
  results.push({ section: currentSection, test: name, status: 'FAIL', detail: detail || '' })
}

function skip(name, detail) {
  console.log(`  \x1b[33m–\x1b[0m ${name}`)
  if (detail) console.log(`    ${detail}`)
  results.push({ section: currentSection, test: name, status: 'SKIP', detail: detail || '' })
}

function warn(name, detail) {
  console.log(`  \x1b[33m⚠\x1b[0m ${name}`)
  if (detail) console.log(`    ${detail}`)
  results.push({ section: currentSection, test: name, status: 'WARN', detail: detail || '' })
}

// ── Helper: run python inline ──────────────────────────────
function runPython(code) {
  return new Promise((resolve) => {
    try {
      const result = execSync(`python3 -c "${code.replace(/"/g, '\\"')}"`, {
        timeout: 10000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      })
      resolve({ ok: true, output: result.trim() })
    } catch (e) {
      resolve({ ok: false, error: e.stderr?.trim() || e.message })
    }
  })
}

// ════════════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════════════

async function main() {
  console.log('============================================================')
  console.log('  CHANNEL VALIDATION - Face Media Factory')
  console.log(`  ${new Date().toISOString()}`)
  console.log('============================================================')

  // ── 1. API Keys ────────────────────────────────────────
  section('1. API Keys (.env)')

  const keys = {
    SERPER_API_KEY:    { required: true,  label: 'Serper.dev (prospect search)' },
    GEMINI_API_KEY:    { required: true,  label: 'Gemini AI (qualification)' },
    GROQ_API_KEY:      { required: false, label: 'Groq AI (fallback)' },
    RESEND_API_KEY:    { required: true,  label: 'Resend (email sending)' },
    IG_USERNAME:       { required: false, label: 'Instagram username' },
    IG_PASSWORD:       { required: false, label: 'Instagram password' },
    INSTAGRAM_ENCRYPTION_KEY: { required: false, label: 'IG multi-account encryption' },
    EVOLUTION_API_URL: { required: false, label: 'Evolution API URL (WhatsApp)' },
    EVOLUTION_API_KEY: { required: false, label: 'Evolution API key' },
    SMTP_HOST:         { required: false, label: 'SMTP host (email fallback)' },
  }

  for (const [key, cfg] of Object.entries(keys)) {
    const val = process.env[key]
    if (val && val.length > 0) {
      const masked = val.length > 10 ? val.substring(0, 8) + '...' : '***'
      pass(`${cfg.label}`, `${key} = ${masked}`)
    } else if (cfg.required) {
      fail(`${cfg.label}`, `${key} MANQUANT`)
    } else {
      skip(`${cfg.label}`, `${key} non configure (optionnel)`)
    }
  }

  // ── 2. Resend (email) ──────────────────────────────────
  section('2. Resend (Email API)')

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    // Try /domains first, but some keys are send-only (restricted)
    // In that case, try sending a test email to a safe address
    try {
      const resp = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${resendKey}` }
      })
      const data = await resp.json()
      if (resp.ok) {
        const domains = data.data?.map(d => `${d.name} (${d.status})`).join(', ') || 'aucun domaine'
        pass('Resend API accessible', `Domaines: ${domains}`)
      } else if (data.message?.includes('restricted')) {
        // Key is send-only — that's fine, it means it works for sending
        pass('Resend API OK (cle restreinte)', 'Cle configuree pour envoi uniquement — normal')
      } else {
        fail('Resend API error', data.message || resp.statusText)
      }
    } catch (e) {
      fail('Resend API inaccessible', e.message)
    }
  } else {
    fail('Resend non configure', 'RESEND_API_KEY manquant')
  }

  // ── 3. Serper.dev (search) ─────────────────────────────
  section('3. Serper.dev (Prospect Search)')

  const serperKey = process.env.SERPER_API_KEY
  if (serperKey) {
    try {
      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'test', num: 1 })
      })
      const data = await resp.json()
      if (resp.ok && data.organic?.length > 0) {
        pass('Serper.dev API OK', `Credits restants: ${data.credits ?? 'N/A'}`)
      } else {
        fail('Serper.dev error', data.message || 'pas de resultats')
      }
    } catch (e) {
      fail('Serper.dev inaccessible', e.message)
    }
  } else {
    fail('Serper.dev non configure', 'SERPER_API_KEY manquant')
  }

  // ── 4. Facebook Hunter (Serper site:facebook.com) ──────
  section('4. Facebook Hunter (via Serper)')

  if (serperKey) {
    try {
      const resp = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'site:facebook.com agence marketing Paris', gl: 'fr', hl: 'fr', num: 3 })
      })
      const data = await resp.json()
      if (resp.ok) {
        const count = data.organic?.length || 0
        if (count > 0) {
          pass('Facebook search OK', `${count} pages trouvees`)
          const first = data.organic[0]
          pass('Exemple', `${first.title?.substring(0, 60)} → ${first.link?.substring(0, 60)}`)
        } else {
          warn('Facebook search: 0 resultats', 'Serper OK mais aucune page FB trouvee')
        }
      } else {
        fail('Facebook search error', data.message || resp.statusText)
      }
    } catch (e) {
      fail('Facebook search inaccessible', e.message)
    }
  } else {
    skip('Facebook Hunter', 'Necessite SERPER_API_KEY')
  }

  // ── 5. TikTok Scraper ─────────────────────────────────
  section('5. TikTok Scraper (npm)')

  try {
    const tiktokPath = resolve(ROOT, 'functions/node_modules/tiktok-scraper')
    const pkg = JSON.parse(readFileSync(resolve(tiktokPath, 'package.json'), 'utf8'))
    pass('tiktok-scraper installe', `v${pkg.version}`)

    // Try dynamic import
    try {
      const TikTokScraper = await import('tiktok-scraper')
      if (TikTokScraper.hashtag || TikTokScraper.default?.hashtag) {
        pass('tiktok-scraper importable', 'hashtag() disponible')
      } else {
        warn('tiktok-scraper charge', 'hashtag() non trouve - fallback mock actif')
      }
    } catch (e) {
      warn('tiktok-scraper import echoue', `${e.message} - fallback mock actif`)
    }
  } catch (e) {
    warn('tiktok-scraper non installe', 'Le hunter utilisera les donnees mock')
  }

  // ── 6. Python + instagrapi ─────────────────────────────
  section('6. Python + instagrapi (Instagram prereqs)')

  // Python available?
  const pyResult = await runPython('import sys; print(sys.version.split()[0])')
  if (pyResult.ok) {
    pass('Python 3 disponible', `v${pyResult.output}`)
  } else {
    fail('Python 3 non trouve', 'Requis pour Instagram hunter/DM sender')
  }

  // instagrapi importable?
  if (pyResult.ok) {
    const iResult = await runPython('from instagrapi import Client; print(Client.__module__)')
    if (iResult.ok) {
      pass('instagrapi installe', iResult.output)
    } else {
      fail('instagrapi non installe', `pip install instagrapi`)
    }
  }

  // ── 7. Instagram Login ─────────────────────────────────
  section('7. Instagram Login')

  const igUser = process.env.IG_USERNAME
  const igPass = process.env.IG_PASSWORD

  if (igUser && igPass) {
    console.log(`  Tentative de login avec @${igUser}...`)
    const loginResult = await runPython(
      `from instagrapi import Client; cl = Client(); cl.login('${igUser}', '${igPass.replace(/'/g, "\\'")}'); print('OK:' + str(cl.user_id)); cl.logout()`
    )
    if (loginResult.ok && loginResult.output.startsWith('OK:')) {
      const userId = loginResult.output.split(':')[1]
      pass('Instagram login OK', `user_id: ${userId}`)
      pass('Instagram Hunter pret', 'Scraping + DMs fonctionnels')
    } else {
      fail('Instagram login echoue', loginResult.error || loginResult.output)
      console.log('    Causes possibles: mauvais credentials, 2FA, IP bloquee')
    }
  } else {
    skip('Instagram login', 'IG_USERNAME/IG_PASSWORD non configures')
    console.log('    → Le hunter utilisera les donnees mock')
    console.log('    → Pour tester: node scripts/validate-channels.mjs --ig-user=xxx --ig-pass=xxx')
  }

  // ── 8. Evolution API (WhatsApp) ────────────────────────
  section('8. Evolution API (WhatsApp)')

  const evoUrl = process.env.EVOLUTION_API_URL
  const evoKey = process.env.EVOLUTION_API_KEY
  const evoInstance = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

  if (evoUrl && evoKey) {
    // Ping the API
    try {
      const resp = await fetch(`${evoUrl}/instance/fetchInstances`, {
        headers: { 'apikey': evoKey },
        signal: AbortSignal.timeout(5000)
      })
      if (resp.ok) {
        const data = await resp.json()
        const instances = Array.isArray(data) ? data : (data.instances || [])
        pass('Evolution API accessible', `${instances.length} instance(s)`)

        // Check if our instance exists
        const ourInstance = instances.find(i =>
          (i.instance?.instanceName || i.instanceName || i.name) === evoInstance
        )
        if (ourInstance) {
          const status = ourInstance.instance?.status || ourInstance.status || 'unknown'
          if (status === 'open' || status === 'connected') {
            pass(`Instance "${evoInstance}" connectee`, `Status: ${status}`)
            pass('WhatsApp pret', 'Checker + Sender fonctionnels')
          } else {
            warn(`Instance "${evoInstance}" existe mais status: ${status}`, 'Scanner le QR code pour connecter')
          }
        } else {
          warn(`Instance "${evoInstance}" non trouvee`, `Instances disponibles: ${instances.map(i => i.instance?.instanceName || i.instanceName || '?').join(', ')}`)
        }
      } else {
        fail('Evolution API error', `HTTP ${resp.status}: ${resp.statusText}`)
      }
    } catch (e) {
      if (e.name === 'TimeoutError' || e.code === 'ECONNREFUSED') {
        fail('Evolution API inaccessible', `${evoUrl} ne repond pas`)
        console.log('    → Lancer: docker run -d -p 8080:8080 --name evolution-api atser/evolution-api:latest')
      } else {
        fail('Evolution API error', e.message)
      }
    }
  } else {
    skip('Evolution API', 'EVOLUTION_API_URL ou EVOLUTION_API_KEY non configures')
    console.log('    → WhatsApp checker/sender inactifs')
    console.log('    → Pour tester: node scripts/validate-channels.mjs --evolution-url=http://localhost:8080 --evolution-key=xxx')
  }

  // ── 9. AI Providers (Gemini + Groq fallback) ───────────
  section('9. AI Providers (Qualification)')

  let aiAvailable = false

  // Test Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reponds juste "OK" en un mot.' }] }]
          })
        }
      )
      const data = await resp.json()
      if (resp.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const answer = data.candidates[0].content.parts[0].text.trim().substring(0, 20)
        pass('Gemini API OK', `Reponse: "${answer}"`)
        aiAvailable = true
      } else {
        const errMsg = data.error?.message || ''
        if (errMsg.includes('quota') || errMsg.includes('exceeded')) {
          warn('Gemini quota epuise', 'Free tier limit atteint — fallback Groq')
        } else {
          warn('Gemini error', errMsg.substring(0, 100))
        }
      }
    } catch (e) {
      warn('Gemini inaccessible', e.message)
    }
  } else {
    skip('Gemini', 'GEMINI_API_KEY manquant')
  }

  // Test Groq (fallback)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Reponds juste "OK".' }],
          max_tokens: 5
        })
      })
      const data = await resp.json()
      if (resp.ok && data.choices?.[0]?.message?.content) {
        const answer = data.choices[0].message.content.trim().substring(0, 20)
        pass('Groq API OK', `Reponse: "${answer}"`)
        aiAvailable = true
      } else {
        warn('Groq error', data.error?.message || JSON.stringify(data).substring(0, 100))
      }
    } catch (e) {
      warn('Groq inaccessible', e.message)
    }
  } else {
    skip('Groq', 'GROQ_API_KEY manquant')
  }

  if (aiAvailable) {
    pass('AI Provider disponible', 'Au moins un provider IA fonctionne')
  } else {
    fail('Aucun AI Provider', 'Ni Gemini ni Groq ne fonctionnent — scoring impossible')
  }

  // ── 10. SMTP (optionnel) ───────────────────────────────
  section('10. SMTP (Email Fallback)')

  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const { createTransport } = await import('nodemailer')
      const transporter = createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 5000
      })
      await transporter.verify()
      pass('SMTP connexion OK', `${smtpHost}:${process.env.SMTP_PORT || '587'}`)
    } catch (e) {
      fail('SMTP connexion echouee', e.message)
    }
  } else {
    skip('SMTP non configure', 'Resend est le service principal')
  }

  // ════════════════════════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(60))
  console.log('  BILAN')
  console.log('='.repeat(60))

  const okCount = results.filter(r => r.status === 'OK').length
  const failCount = results.filter(r => r.status === 'FAIL').length
  const skipCount = results.filter(r => r.status === 'SKIP').length
  const warnCount = results.filter(r => r.status === 'WARN').length

  console.log(`  \x1b[32m✓ OK:   ${okCount}\x1b[0m`)
  console.log(`  \x1b[31m✗ FAIL: ${failCount}\x1b[0m`)
  console.log(`  \x1b[33m⚠ WARN: ${warnCount}\x1b[0m`)
  console.log(`  \x1b[33m– SKIP: ${skipCount}\x1b[0m`)

  // Channel readiness
  console.log('\n' + '─'.repeat(60))
  console.log('  CANAUX - PRETS POUR PRODUCTION ?')
  console.log('─'.repeat(60))

  const channels = [
    {
      name: 'Email (Resend)',
      ready: results.some(r => r.test.includes('Resend API') && r.status === 'OK'),
      required: true,
    },
    {
      name: 'Prospect Search (Serper)',
      ready: results.some(r => r.test.includes('Serper.dev API') && r.status === 'OK'),
      required: true,
    },
    {
      name: 'Facebook Hunter',
      ready: results.some(r => r.test.includes('Facebook search OK') && r.status === 'OK'),
      required: false,
    },
    {
      name: 'TikTok Hunter',
      ready: results.some(r => r.test.includes('tiktok-scraper install') && r.status === 'OK'),
      required: false,
    },
    {
      name: 'Instagram Hunter + DMs',
      ready: results.some(r => r.test.includes('Instagram Hunter pret') && r.status === 'OK'),
      required: false,
    },
    {
      name: 'WhatsApp (Evolution)',
      ready: results.some(r => r.test.includes('WhatsApp pret') && r.status === 'OK'),
      required: false,
    },
    {
      name: 'AI Provider (scoring)',
      ready: results.some(r => r.test.includes('AI Provider disponible') && r.status === 'OK'),
      required: true,
    },
  ]

  for (const ch of channels) {
    const icon = ch.ready ? '\x1b[32m✓ PRET\x1b[0m' : (ch.required ? '\x1b[31m✗ BLOQUE\x1b[0m' : '\x1b[33m– INACTIF\x1b[0m')
    const tag = ch.required ? '(requis)' : '(optionnel)'
    console.log(`  ${icon}  ${ch.name} ${tag}`)
  }

  const allRequiredReady = channels.filter(c => c.required).every(c => c.ready)
  const optionalReady = channels.filter(c => !c.required && c.ready).length
  const optionalTotal = channels.filter(c => !c.required).length

  console.log('\n' + '─'.repeat(60))
  if (allRequiredReady) {
    console.log('  \x1b[32m>>> PIPELINE DE BASE OPERATIONNEL <<<\x1b[0m')
    console.log(`  Canaux optionnels actifs: ${optionalReady}/${optionalTotal}`)
  } else {
    console.log('  \x1b[31m>>> PIPELINE NON PRET - corriger les erreurs ci-dessus <<<\x1b[0m')
  }
  console.log('─'.repeat(60))

  // ── Generate Report ────────────────────────────────────
  const reportPath = resolve(ROOT, 'CHANNEL_VALIDATION_REPORT.md')

  let md = `# CHANNEL VALIDATION REPORT\n\n`
  md += `**Date:** ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}\n`
  md += `**Resultat:** ${allRequiredReady ? 'PIPELINE OPERATIONNEL' : 'PIPELINE NON PRET'}\n\n`
  md += `## Resume\n\n`
  md += `| Metrique | Valeur |\n|----------|--------|\n`
  md += `| OK | **${okCount}** |\n`
  md += `| FAIL | **${failCount}** |\n`
  md += `| WARN | **${warnCount}** |\n`
  md += `| SKIP | **${skipCount}** |\n\n`

  md += `## Canaux\n\n`
  md += `| Canal | Status | Requis |\n|-------|--------|--------|\n`
  for (const ch of channels) {
    const status = ch.ready ? 'PRET' : (ch.required ? 'BLOQUE' : 'INACTIF')
    md += `| ${ch.name} | ${status} | ${ch.required ? 'Oui' : 'Non'} |\n`
  }

  md += `\n## Detail par Section\n\n`

  let prevSection = ''
  for (const r of results) {
    if (r.section !== prevSection) {
      md += `\n### ${r.section}\n\n`
      md += `| Test | Status | Detail |\n|------|--------|--------|\n`
      prevSection = r.section
    }
    md += `| ${r.test} | ${r.status} | ${r.detail.replace(/\|/g, '/').substring(0, 80)} |\n`
  }

  md += `\n## Prochaines Etapes\n\n`
  if (!allRequiredReady) {
    md += `### Corriger en priorite\n\n`
    results.filter(r => r.status === 'FAIL').forEach(r => {
      md += `- **${r.test}**: ${r.detail}\n`
    })
    md += '\n'
  }

  const inactiveChannels = channels.filter(c => !c.ready && !c.required)
  if (inactiveChannels.length > 0) {
    md += `### Pour activer les canaux optionnels\n\n`
    md += `| Canal | Action |\n|-------|--------|\n`
    for (const ch of inactiveChannels) {
      let action = ''
      if (ch.name.includes('Instagram')) action = 'Configurer IG_USERNAME + IG_PASSWORD dans functions/.env'
      if (ch.name.includes('WhatsApp')) action = 'Lancer Evolution API (Docker) + configurer EVOLUTION_API_URL/KEY'
      if (ch.name.includes('TikTok')) action = 'cd functions && npm install tiktok-scraper'
      if (ch.name.includes('Facebook')) action = 'Verifier SERPER_API_KEY'
      md += `| ${ch.name} | ${action} |\n`
    }
  }

  md += `\n---\n*Genere par validate-channels.mjs*\n`

  writeFileSync(reportPath, md)
  console.log(`\n  Report: ${reportPath}`)
}

main().catch(e => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})
