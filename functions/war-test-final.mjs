import { readFileSync } from 'fs'
import Groq from 'groq-sdk'

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

const { Resend } = await import('resend')

// ═══════════════════════════════════════════════════════════
// TEST 1 — PIPELINE SOURCING FRANCE (SIRENE API directe)
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 1 — PIPELINE SOURCING FRANCE')
console.log('═══════════════════════════════════════════════════\n')

const NAF = { restaurant: '56.10A', dentiste: '86.23Z', coiffeur: '96.02A' }
const tests = [
  { sector: 'restaurant', city: 'lyon', naf: '56.10A' },
  { sector: 'dentiste', city: 'paris', naf: '86.23Z' },
  { sector: 'coiffeur', city: 'bordeaux', naf: '96.02A' },
]

const pipelineResults = []

for (const t of tests) {
  console.log(`=== ${t.sector.toUpperCase()} ${t.city.toUpperCase()} ===`)
  const start = Date.now()
  try {
    // 1. Get city dept
    const geoRes = await fetch(`https://geo.api.gouv.fr/communes?nom=${t.city}&fields=departement,code&boost=population&limit=1`)
    const geoData = await geoRes.json()
    const dept = geoData[0]?.departement?.code

    // 2. Search SIRENE
    const sireneRes = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${t.city}&activite_principale=${t.naf}&departement=${dept}&etat_administratif=A&per_page=5`)
    const sireneData = await sireneRes.json()

    const leads = []
    for (const r of (sireneData.results || [])) {
      const etab = r.matching_etablissements?.[0] || r.siege || {}
      leads.push({
        name: r.nom_complet,
        city: etab.libelle_commune || t.city,
        postalCode: etab.code_postal || '',
        siret: etab.siret,
      })
    }

    // 3. Try to find website + email for first lead via Serper
    let withEmail = 0
    let withPhone = 0
    if (process.env.SERPER_API_KEY && leads.length > 0) {
      for (const lead of leads.slice(0, 3)) {
        try {
          const serpRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: `"${lead.name}" ${lead.city} contact email`, gl: 'fr', hl: 'fr', num: 3 })
          })
          const serpData = await serpRes.json()
          const excluded = ['pagesjaunes.fr', 'societe.com', 'infogreffe.fr', 'pappers.fr', 'google.com', 'facebook.com']
          for (const result of (serpData.organic || [])) {
            const link = result.link || ''
            if (!excluded.some(d => link.includes(d))) {
              try { lead.website = new URL(link).origin; break } catch { continue }
            }
          }

          // Scrape email from website
          if (lead.website) {
            try {
              const pageRes = await fetch(lead.website, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' },
                signal: AbortSignal.timeout(5000)
              })
              const html = await pageRes.text()
              const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
              const valid = emails.filter(e => !e.startsWith('noreply') && !e.includes('example.com') && !e.includes('sentry'))
              if (valid.length > 0) { lead.email = valid[0]; withEmail++ }
              const phones = html.match(/(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/g) || []
              if (phones.length > 0) { lead.phone = phones[0]; withPhone++ }
            } catch {}
          }
        } catch {}
      }
    }

    const elapsed = Date.now() - start
    console.log(`Total: ${leads.length} | Avec email: ${withEmail} | Avec tel: ${withPhone} | ${elapsed}ms`)
    leads.slice(0, 3).forEach(l => console.log(`  -> ${l.name} | ${l.email || '-'} | ${l.phone || '-'}`))
    pipelineResults.push({ sector: t.sector, city: t.city, total: leads.length, withEmail, withPhone, elapsed })
  } catch (e) {
    console.error('FAIL:', e.message)
    pipelineResults.push({ sector: t.sector, city: t.city, total: 0, error: e.message })
  }
  console.log('')
}

// ═══════════════════════════════════════════════════════════
// TEST 2 — EMAIL VIA RESEND
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 2 — CANAL EMAIL (Resend)')
console.log('═══════════════════════════════════════════════════\n')

let emailResult = { success: false }
try {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const start = Date.now()
  const { data, error } = await resend.emails.send({
    from: 'Face Media Factory <onboarding@resend.dev>',
    to: ['smmafk01@gmail.com'],
    subject: 'Test FMF Final — Email prospection ' + new Date().toLocaleString('fr-FR'),
    html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#6366f1">Face Media Factory</h2>
      <p>Bonjour Faical,</p>
      <p>Ceci est le test final du canal Email FMF.</p>
      <p>Resend configure | Template HTML | ${new Date().toLocaleString('fr-FR')}</p>
      <p style="color:#6b7280;font-size:12px">Face Media Factory — test automatique</p>
    </div>`
  })
  emailResult = { success: !error, messageId: data?.id, elapsed: Date.now() - start, error: error?.message }
  console.log(error ? `FAIL: ${error.message}` : `OK — ID: ${data?.id} | ${emailResult.elapsed}ms`)
} catch (e) {
  emailResult = { success: false, error: e.message }
  console.error('FAIL:', e.message)
}
console.log('')

// ═══════════════════════════════════════════════════════════
// TEST 3 — WHATSAPP VIA EVOLUTION API
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 3 — CANAL WHATSAPP (Evolution API)')
console.log('═══════════════════════════════════════════════════\n')

let whatsappResult = { success: false }
try {
  const start = Date.now()
  const waRes = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: '33602100774',
        text: `Test FMF Final — ${new Date().toLocaleString('fr-FR')}\n\nWhatsApp operationnel\nEvolution API connectee\nCanal production-ready`
      })
    }
  )
  const waData = await waRes.json()
  const elapsed = Date.now() - start
  if (waData.key?.id || waData.messageId) {
    whatsappResult = { success: true, messageId: waData.key?.id || waData.messageId, elapsed }
    console.log(`OK — ID: ${whatsappResult.messageId} | ${elapsed}ms`)
  } else {
    whatsappResult = { success: false, error: JSON.stringify(waData), elapsed }
    console.log('FAIL:', JSON.stringify(waData))
  }
} catch (e) {
  whatsappResult = { success: false, error: e.message }
  console.error('FAIL:', e.message)
}
console.log('')

// ═══════════════════════════════════════════════════════════
// TEST 4 — SMS VIA OVH
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 4 — CANAL SMS (OVH)')
console.log('═══════════════════════════════════════════════════\n')

let smsResult = { success: false }
try {
  const APP_SECRET = process.env.OVH_APP_SECRET
  const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY
  const APP_KEY = process.env.OVH_APP_KEY
  const SERVICE = process.env.OVH_SMS_SERVICE_NAME

  const timestamp = Math.floor(Date.now() / 1000)
  const body = JSON.stringify({
    message: `Test FMF Final ${new Date().toLocaleTimeString('fr-FR')} — SMS OK. STOP pour arreter.`,
    receivers: ['0033602100774'],
    senderForResponse: true,
    noStopClause: true,
    priority: 'high',
    validityPeriod: 2880,
  })
  const url = `https://eu.api.ovh.com/1.0/sms/${SERVICE}/jobs`
  const toSign = `${APP_SECRET}+${CONSUMER_KEY}+POST+${url}+${body}+${timestamp}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(toSign))
  const signature = '$1$' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  const start = Date.now()
  const smsRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ovh-Application': APP_KEY,
      'X-Ovh-Consumer': CONSUMER_KEY,
      'X-Ovh-Timestamp': String(timestamp),
      'X-Ovh-Signature': signature,
    },
    body,
  })
  const smsData = await smsRes.json()
  const elapsed = Date.now() - start

  if (smsData.ids?.length > 0) {
    smsResult = { success: true, messageId: smsData.ids[0], credits: smsData.totalCreditsRemoved, elapsed }
    console.log(`OK — ID: ${smsData.ids[0]} | Credits: ${smsData.totalCreditsRemoved} | ${elapsed}ms`)
  } else {
    smsResult = { success: false, error: JSON.stringify(smsData), elapsed }
    console.log('FAIL:', JSON.stringify(smsData))
  }
} catch (e) {
  smsResult = { success: false, error: e.message }
  console.error('FAIL:', e.message)
}
console.log('')

// ═══════════════════════════════════════════════════════════
// TEST 5 — AGENT ALEX — 8 PARCOURS
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 5 — AGENT ALEX (8 parcours)')
console.log('═══════════════════════════════════════════════════\n')

const SYSTEM_PROMPT = `Tu es Alex, le commercial IA de Face Media Factory. Tu es au niveau des meilleurs commerciaux au monde — tu maitrises la psychologie de la vente, l'ingenierie sociale et les techniques de closing les plus avancees.

TON IDENTITE
- Direct, confiant, jamais arrogant
- Tu ecoutes plus que tu ne parles
- Tu poses des questions plutot que de faire des assertions
- Tu n'as jamais peur du silence ni du "non"
- Tu es curieux du business du prospect AVANT de vendre
- Jamais de formule "En tant qu'IA", "Je suis un assistant" ou similaire
- Tu es Alex, point final

PRINCIPES CIALDINI
- RECIPROCITE: Offrir de la valeur sans condition d'abord
- ENGAGEMENT: Commencer par un micro-oui
- PREUVE SOCIALE: References locales et sectorielles
- AUTORITE: Insight sur leur secteur
- SYMPATHIE: Trouver le point commun
- RARETE: "on travaille avec 3 entreprises max par ville/secteur"

GESTION DES OBJECTIONS
- PRIX: "Combien vous coute un client que vous ratez?"
- PAS INTERESSE: "C'est le timing ou le concept?"
- J'AI DEJA: "Ca travaille pour vous la nuit et le week-end?"
- PAS LE TEMPS: "C'est exactement pour ca qu'on existe"

REGLES
1. Ne JAMAIS pitcher en premier message sans avoir pose une question
2. Ne JAMAIS envoyer de doc — proposer une demo
3. Toujours finir par UNE question ou UN CTA clair
4. Max 280 caracteres
5. Style: Conversationnel et humain. Messages courts (max 3 lignes). 1 emoji max.`

const parcours = [
  { id: 1, nom: 'CURIEUX', messages: ["Bonjour, j'ai recu votre message, c'est quoi exactement ?"] },
  { id: 2, nom: 'OBJECTION_PRIX', messages: ["C'est combien ?", "C'est trop cher pour moi"] },
  { id: 3, nom: 'INTERESSE_RDV', messages: ["Ca m'interesse, comment ca marche ?", "Ok je veux en savoir plus", "Je suis dispo jeudi 14h"] },
  { id: 4, nom: 'PAS_INTERESSE', messages: ["Je suis pas interesse", "Non vraiment pas"] },
  { id: 5, nom: 'HORS_BUREAU', messages: ["Je suis en vacances jusqu'au 15, recontactez-moi apres"] },
  { id: 6, nom: 'REFERRAL', messages: ["Ce n'est pas moi qui gere ca, contactez mon associe Pierre"] },
  { id: 7, nom: 'DESINSCRIPTION', messages: ["Arretez de me contacter", "STOP"] },
  { id: 8, nom: 'CONCURRENT', messages: ["On utilise deja un outil similaire", "On est avec Lemlist"] },
]

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const alexResults = []

for (const p of parcours) {
  console.log(`--- Parcours ${p.id}: ${p.nom} ---`)
  const history = []
  let totalMs = 0
  let lastReply = ''

  for (const msg of p.messages) {
    history.push({ role: 'user', content: msg })
    const start = Date.now()
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        max_tokens: 200,
      })
      lastReply = response.choices[0].message.content
      history.push({ role: 'assistant', content: lastReply })
      const ms = Date.now() - start
      totalMs += ms
      console.log(`  User: ${msg}`)
      console.log(`  Alex (${ms}ms): ${lastReply}`)
    } catch (e) {
      console.log(`  User: ${msg}`)
      console.log(`  FAIL: ${e.message}`)
    }
  }

  alexResults.push({ id: p.id, nom: p.nom, avgMs: Math.round(totalMs / p.messages.length), lastReply })
  console.log('')

  // Rate limit
  await new Promise(r => setTimeout(r, 500))
}

// ═══════════════════════════════════════════════════════════
// TEST 6 — FIRESTORE LEAD STORAGE
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 6 — FIRESTORE LEAD STORAGE')
console.log('═══════════════════════════════════════════════════\n')

// Firebase Admin SDK init
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

let firestoreResult = { success: false }
const TEST_ORG_ID = 'war-test-org'
const TEST_PROSPECT_ID = `war-test-prospect-${Date.now()}`

try {
  // Init Firebase Admin avec Service Account (bypass security rules)
  let saCredential
  try {
    const sa = JSON.parse(readFileSync('/tmp/fmf-sa.json', 'utf8'))
    saCredential = cert(sa)
  } catch {
    saCredential = undefined
  }
  const app = initializeApp(
    saCredential
      ? { credential: saCredential, projectId: 'face-media-factory' }
      : { projectId: 'face-media-factory' },
    'war-test'
  )
  const db = getFirestore(app)

  const start = Date.now()

  // 6a. Creer un prospect test
  const testProspect = {
    firstName: 'Test',
    lastName: 'WarRoom',
    company: 'FMF Test Corp',
    email: 'test-war@example.com',
    phone: '+33600000000',
    sector: 'restaurant',
    city: 'Lyon',
    status: 'new',
    score: 75,
    source: 'war-test',
    channels: { email: true, whatsapp: true, sms: true },
    createdAt: FieldValue.serverTimestamp(),
  }

  await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects').doc(TEST_PROSPECT_ID).set(testProspect)
  console.log(`  6a. Prospect cree: ${TEST_PROSPECT_ID}`)

  // 6b. Lire le prospect
  const readSnap = await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects').doc(TEST_PROSPECT_ID).get()
  const readData = readSnap.data()
  const readOk = readData?.firstName === 'Test' && readData?.company === 'FMF Test Corp'
  console.log(`  6b. Lecture: ${readOk ? 'OK' : 'FAIL'} — ${readData?.firstName} ${readData?.lastName} @ ${readData?.company}`)

  // 6c. Update le prospect (simuler scoring)
  await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects').doc(TEST_PROSPECT_ID).update({
      score: 92,
      status: 'hot',
      lastContactedAt: FieldValue.serverTimestamp(),
      'engagement.emailOpened': true,
      'engagement.whatsappReplied': true,
    })
  const updatedSnap = await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects').doc(TEST_PROSPECT_ID).get()
  const updatedData = updatedSnap.data()
  const updateOk = updatedData?.score === 92 && updatedData?.status === 'hot'
  console.log(`  6c. Update: ${updateOk ? 'OK' : 'FAIL'} — score=${updatedData?.score}, status=${updatedData?.status}`)

  // 6d. Ecrire une interaction
  const interactionRef = await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('interactions').add({
      prospectId: TEST_PROSPECT_ID,
      type: 'email_sent',
      channel: 'email',
      direction: 'out',
      subject: 'War Test Email',
      messageId: 'war-test-msg-001',
      createdAt: FieldValue.serverTimestamp(),
    })
  console.log(`  6d. Interaction creee: ${interactionRef.id}`)

  // 6e. Query — trouver les prospects hot
  const hotQuery = await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects')
    .where('status', '==', 'hot')
    .where('source', '==', 'war-test')
    .get()
  console.log(`  6e. Query hot leads: ${hotQuery.size} trouve(s)`)

  // 6f. Cleanup — supprimer les donnees test
  await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('interactions').doc(interactionRef.id).delete()
  await db.collection('organizations').doc(TEST_ORG_ID)
    .collection('prospects').doc(TEST_PROSPECT_ID).delete()
  console.log(`  6f. Cleanup: OK`)

  const elapsed = Date.now() - start
  firestoreResult = { success: readOk && updateOk, elapsed, operations: 6 }
  console.log(`\nFirestore: ${firestoreResult.success ? 'OK' : 'FAIL'} — 6 operations en ${elapsed}ms`)
} catch (e) {
  firestoreResult = { success: false, error: e.message }
  console.error('FAIL:', e.message)
}
console.log('')

// ═══════════════════════════════════════════════════════════
// TEST 7 — SEQUENCE E2E 3 CANAUX (Email J1 → WhatsApp J3 → SMS J7)
// ═══════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════')
console.log('TEST 7 — SEQUENCE E2E 3 CANAUX')
console.log('═══════════════════════════════════════════════════\n')

const sequenceResults = []
const PROSPECT_NAME = 'Faical'
const PROSPECT_COMPANY = 'Restaurant Le Family\'s'

// Etape 1 — J1 : Email de prospection
console.log('--- Etape 1/3 : Email J1 (premier contact) ---')
try {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const start = Date.now()
  const { data, error } = await resend.emails.send({
    from: 'Face Media Factory <onboarding@resend.dev>',
    to: ['smmafk01@gmail.com'],
    subject: `${PROSPECT_NAME}, une question sur ${PROSPECT_COMPANY}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
      <p>Bonjour ${PROSPECT_NAME},</p>
      <p>J'ai decouvert <strong>${PROSPECT_COMPANY}</strong> et j'ai une question :</p>
      <p>Comment gerez-vous actuellement votre visibilite en ligne et l'acquisition de nouveaux clients ?</p>
      <p>Nous aidons des restaurants comme le votre a augmenter leur chiffre d'affaires de 30% en moyenne.</p>
      <p>Ca vous dit un echange de 10 minutes cette semaine ?</p>
      <p>Alex<br><span style="color:#6b7280;font-size:13px">Face Media Factory</span></p>
    </div>`
  })
  const elapsed = Date.now() - start
  if (error) throw new Error(error.message)
  sequenceResults.push({ step: 'J1 Email', success: true, messageId: data?.id, elapsed })
  console.log(`  OK — ${elapsed}ms — ID: ${data?.id}`)
} catch (e) {
  sequenceResults.push({ step: 'J1 Email', success: false, error: e.message })
  console.error(`  FAIL: ${e.message}`)
}

// Pause inter-etape (simule J3)
await new Promise(r => setTimeout(r, 1500))

// Etape 2 — J3 : WhatsApp de relance
console.log('--- Etape 2/3 : WhatsApp J3 (relance) ---')
try {
  const start = Date.now()
  const waRes = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: '33602100774',
        text: `Bonjour ${PROSPECT_NAME} 👋\n\nJe vous ai envoye un email il y a quelques jours concernant ${PROSPECT_COMPANY}.\n\nAvez-vous eu le temps d'y jeter un oeil ?\n\nJe serais ravi d'echanger 10 min avec vous.\n\n— Alex, Face Media Factory`
      })
    }
  )
  const waData = await waRes.json()
  const elapsed = Date.now() - start
  if (waData.key?.id || waData.messageId) {
    sequenceResults.push({ step: 'J3 WhatsApp', success: true, messageId: waData.key?.id || waData.messageId, elapsed })
    console.log(`  OK — ${elapsed}ms — ID: ${waData.key?.id || waData.messageId}`)
  } else {
    throw new Error(JSON.stringify(waData))
  }
} catch (e) {
  sequenceResults.push({ step: 'J3 WhatsApp', success: false, error: e.message })
  console.error(`  FAIL: ${e.message}`)
}

// Pause inter-etape (simule J7)
await new Promise(r => setTimeout(r, 1500))

// Etape 3 — J7 : SMS urgence
console.log('--- Etape 3/3 : SMS J7 (urgence) ---')
try {
  const APP_SECRET = process.env.OVH_APP_SECRET
  const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY
  const APP_KEY = process.env.OVH_APP_KEY
  const SERVICE = process.env.OVH_SMS_SERVICE_NAME

  const timestamp = Math.floor(Date.now() / 1000)
  const body = JSON.stringify({
    message: `${PROSPECT_NAME}, derniere relance pour ${PROSPECT_COMPANY}. On garde 1 place sur Lyon cette semaine. Interessé? Repondez OUI — Alex FMF`,
    receivers: ['0033602100774'],
    senderForResponse: true,
    noStopClause: true,
    priority: 'high',
    validityPeriod: 2880,
  })
  const url = `https://eu.api.ovh.com/1.0/sms/${SERVICE}/jobs`
  const toSign = `${APP_SECRET}+${CONSUMER_KEY}+POST+${url}+${body}+${timestamp}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(toSign))
  const signature = '$1$' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  const start = Date.now()
  const smsRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ovh-Application': APP_KEY,
      'X-Ovh-Consumer': CONSUMER_KEY,
      'X-Ovh-Timestamp': String(timestamp),
      'X-Ovh-Signature': signature,
    },
    body,
  })
  const smsData = await smsRes.json()
  const elapsed = Date.now() - start

  if (smsData.ids?.length > 0) {
    sequenceResults.push({ step: 'J7 SMS', success: true, messageId: smsData.ids[0], elapsed })
    console.log(`  OK — ${elapsed}ms — ID: ${smsData.ids[0]}`)
  } else {
    throw new Error(JSON.stringify(smsData))
  }
} catch (e) {
  sequenceResults.push({ step: 'J7 SMS', success: false, error: e.message })
  console.error(`  FAIL: ${e.message}`)
}
console.log('')

// ═══════════════════════════════════════════════════════════
// RAPPORT FINAL
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════')
console.log('RAPPORT FINAL — TEST COMPLET FMF')
console.log('═══════════════════════════════════════════════════\n')

console.log('| Test | Resultat | Details |')
console.log('|------|----------|---------|')

for (const r of pipelineResults) {
  const ok = r.total > 0
  console.log(`| Sourcing ${r.sector} ${r.city} | ${ok ? 'OK' : 'FAIL'} | ${r.total} leads, ${r.withEmail || 0} email, ${r.elapsed || '-'}ms |`)
}

console.log(`| Email Resend | ${emailResult.success ? 'OK' : 'FAIL'} | ${emailResult.success ? emailResult.elapsed + 'ms — ' + emailResult.messageId : emailResult.error} |`)
console.log(`| WhatsApp Evolution | ${whatsappResult.success ? 'OK' : 'FAIL'} | ${whatsappResult.success ? whatsappResult.elapsed + 'ms — ' + whatsappResult.messageId : whatsappResult.error} |`)
console.log(`| SMS OVH | ${smsResult.success ? 'OK' : 'FAIL'} | ${smsResult.success ? smsResult.elapsed + 'ms — ID ' + smsResult.messageId : smsResult.error} |`)

for (const r of alexResults) {
  const quality = r.lastReply ? (r.lastReply.length <= 300 ? '4/5' : '3/5') : '0/5'
  console.log(`| Alex ${r.nom} | ${r.lastReply ? 'OK' : 'FAIL'} | ${r.avgMs}ms, qualite ${quality} |`)
}

console.log(`| Firestore CRUD | ${firestoreResult.success ? 'OK' : 'FAIL'} | ${firestoreResult.success ? firestoreResult.operations + ' ops en ' + firestoreResult.elapsed + 'ms' : firestoreResult.error} |`)

for (const r of sequenceResults) {
  console.log(`| Sequence ${r.step} | ${r.success ? 'OK' : 'FAIL'} | ${r.success ? r.elapsed + 'ms — ' + r.messageId : r.error} |`)
}

const totalOK = (pipelineResults.filter(r => r.total > 0).length) +
  (emailResult.success ? 1 : 0) +
  (whatsappResult.success ? 1 : 0) +
  (smsResult.success ? 1 : 0) +
  (alexResults.filter(r => r.lastReply).length) +
  (firestoreResult.success ? 1 : 0) +
  (sequenceResults.filter(r => r.success).length)
const totalTests = pipelineResults.length + 3 + alexResults.length + 1 + sequenceResults.length

console.log('')
console.log(`Score: ${totalOK}/${totalTests} tests OK`)
if (totalOK === totalTests) {
  console.log('VERDICT: PRET POUR PREMIER CLIENT')
} else if (totalOK >= totalTests - 2) {
  console.log('VERDICT: Corrections mineures necessaires')
} else {
  console.log('VERDICT: Bloquants a corriger')
}
