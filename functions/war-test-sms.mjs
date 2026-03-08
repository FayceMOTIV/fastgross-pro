import { readFileSync } from 'fs'

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

const APP_KEY = process.env.OVH_APP_KEY
const APP_SECRET = process.env.OVH_APP_SECRET
const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY
const SERVICE_NAME = process.env.OVH_SMS_SERVICE_NAME
const SENDER = process.env.OVH_SMS_SENDER || 'FMF'

console.log('OVH_APP_KEY set:', !!APP_KEY)
console.log('OVH_APP_SECRET set:', !!APP_SECRET)
console.log('OVH_CONSUMER_KEY set:', !!CONSUMER_KEY)
console.log('OVH_SMS_SERVICE_NAME:', SERVICE_NAME)
console.log('OVH_SMS_SENDER:', SENDER)

if (!APP_KEY || !APP_SECRET || !CONSUMER_KEY || !SERVICE_NAME) {
  console.error('Missing OVH credentials')
  process.exit(1)
}

const OVH_API_BASE = 'https://eu.api.ovh.com/1.0'

async function ovhRequest(method, path, body) {
  const timestamp = Math.floor(Date.now() / 1000)
  const bodyStr = body ? JSON.stringify(body) : ''
  const url = `${OVH_API_BASE}${path}`

  const toSign = `${APP_SECRET}+${CONSUMER_KEY}+${method}+${url}+${bodyStr}+${timestamp}`
  const encoder = new TextEncoder()
  const data = encoder.encode(toSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const signature = '$1$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  const headers = {
    'Content-Type': 'application/json',
    'X-Ovh-Application': APP_KEY,
    'X-Ovh-Consumer': CONSUMER_KEY,
    'X-Ovh-Timestamp': String(timestamp),
    'X-Ovh-Signature': signature,
  }

  const fetchOptions = { method, headers }
  if (body && method === 'POST') fetchOptions.body = bodyStr

  const response = await fetch(url, fetchOptions)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`OVH ${response.status}: ${text}`)
  }

  return JSON.parse(text)
}

// ============================================
// TEST 1: Check credits
// ============================================
console.log('')
console.log('=== TEST 1: Check OVH SMS credits ===')
try {
  const account = await ovhRequest('GET', `/sms/${SERVICE_NAME}`, null)
  console.log('Credits restants:', account.creditsLeft)
  console.log('Status:', account.status)
  console.log('Description:', account.description || '-')
} catch (e) {
  console.error('Credits check FAIL:', e.message)
}

// ============================================
// TEST 2: Send real SMS to 0602100774
// ============================================
console.log('')
console.log('=== TEST 2: Envoi SMS reel sur 0602100774 ===')
const start = Date.now()

try {
  const result = await ovhRequest('POST', `/sms/${SERVICE_NAME}/jobs`, {
    message: `Face Media Factory - Test SMS OVH OK ! ${new Date().toLocaleString('fr-FR')}`,
    receivers: ['0033602100774'],
    senderForResponse: true,
    noStopClause: true,
    priority: 'high',
    validityPeriod: 2880,
  })

  console.log('Envoye en', Date.now() - start, 'ms')
  console.log('IDs:', result.ids)
  console.log('Credits utilises:', result.totalCreditsRemoved)
  console.log('Receivers valides:', result.validReceivers)
  console.log('Receivers invalides:', result.invalidReceivers)
} catch (e) {
  console.error('SMS FAIL:', e.message)
}
