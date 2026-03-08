import { readFileSync } from 'fs'
import { Resend } from 'resend'

// Load env
try {
  const envContent = readFileSync('.env', 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch {}

const RESEND_KEY = process.env.RESEND_API_KEY
console.log('RESEND_API_KEY set:', !!RESEND_KEY)
console.log('Key prefix:', RESEND_KEY?.substring(0, 5) + '...')

if (!RESEND_KEY) {
  console.error('RESEND_API_KEY not found in .env')
  process.exit(1)
}

const resend = new Resend(RESEND_KEY)

// ============================================
// TEST 1: Envoi d'un email simple
// ============================================
console.log('')
console.log('=== TEST 1: Envoi email via Resend ===')
const start1 = Date.now()

try {
  const { data, error } = await resend.emails.send({
    from: 'Face Media Factory <onboarding@resend.dev>',
    to: ['smmafk01@gmail.com'],
    subject: 'War Test FMF Email — ' + new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F6EF7;">Canal Email operationnel</h2>
        <p>Envoye le ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Provider :</strong> Resend</p>
        <p>Ce message confirme que FMF peut envoyer des emails de prospection.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Face Media Factory — War Test</p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend error:', JSON.stringify(error))
  } else {
    console.log('Email envoye en', Date.now() - start1, 'ms')
    console.log('Message ID:', data?.id)
  }
} catch (e) {
  console.error('FAIL:', e.message)
}

// ============================================
// TEST 2: 5 emails en sequence (simulation campagne)
// ============================================
console.log('')
console.log('=== TEST 2: 5 emails en sequence ===')
let sent = 0
let failed = 0
const start2 = Date.now()

for (let i = 1; i <= 5; i++) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Face Media Factory <onboarding@resend.dev>',
      to: ['smmafk01@gmail.com'],
      subject: `Sequence test FMF — prospect ${i}/5`,
      html: `<p>Message de prospection #${i} — ${new Date().toISOString()}</p>`,
    })

    if (error) {
      failed++
      console.log(`Email ${i}: FAIL -`, error.message || JSON.stringify(error))
    } else {
      sent++
      console.log(`Email ${i}: OK - ${data?.id}`)
    }

    await new Promise((r) => setTimeout(r, 500))
  } catch (e) {
    failed++
    console.log(`Email ${i}: ERROR - ${e.message}`)
  }
}

console.log('')
console.log(`Resultat: ${sent}/5 envoyes en ${Date.now() - start2}ms`)
console.log(`Taux: ${(sent / 5) * 100}%`)
