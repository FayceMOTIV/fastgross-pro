import { readFileSync, writeFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Groq from 'groq-sdk'

// ── Load .env ──
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

// ── Firebase Admin (service account) ──
const sa = JSON.parse(readFileSync('/tmp/fmf-sa.json', 'utf8'))
const app = initializeApp({ credential: cert(sa), projectId: 'face-media-factory' }, 'a2z-test')
const db = getFirestore(app)

// ── Config ──
const ADMIN_EMAIL = 'smmafk01@gmail.com'
const ADMIN_WHATSAPP = '33602100774'
const results = []

function report(step, action, success, details, elapsed) {
  results.push({ step, action, success, details, elapsed })
  const icon = success ? 'OK' : 'FAIL'
  console.log(`  ${icon} — ${details} (${elapsed}ms)`)
}

// ── Alex System Prompt (complet) ──
const ALEX_PROMPT = `Tu es Alex, le commercial IA de Face Media Factory. Tu maitrises la psychologie de la vente.

TON IDENTITE
- Direct, confiant, jamais arrogant
- Tu ecoutes plus que tu ne parles
- Tu poses des questions plutot que de faire des assertions
- Jamais de "En tant qu'IA" — tu es Alex, point final

PRINCIPES CIALDINI
- RECIPROCITE: Offrir de la valeur sans condition d'abord
- PREUVE SOCIALE: References locales et sectorielles
- RARETE: "on travaille avec 3 restaurants max par ville"

GESTION DES OBJECTIONS
- PRIX: "Combien vous coute un client que vous ratez?"
- PAS INTERESSE: "C'est le timing ou le concept?"

REGLES
1. Ne JAMAIS pitcher sans avoir pose une question
2. Toujours finir par UNE question ou UN CTA clair
3. Max 280 caracteres
4. Style conversationnel, max 3 lignes, 1 emoji max`

// ═══════════════════════════════════════════════════════════
// ETAPE 1 — TROUVER UN VRAI PROSPECT
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 1 — TROUVER UN VRAI PROSPECT (restaurant lyon)')
console.log('='.repeat(60) + '\n')

let prospect = null
const step1Start = Date.now()

try {
  // 1a. Geo API — trouver le departement
  const geoRes = await fetch('https://geo.api.gouv.fr/communes?nom=lyon&fields=departement,code&boost=population&limit=1')
  const geoData = await geoRes.json()
  const dept = geoData[0]?.departement?.code
  console.log(`  Departement: ${dept}`)

  // 1b. SIRENE — chercher des restaurants
  const sireneRes = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=restaurant+lyon&activite_principale=56.10A&departement=${dept}&etat_administratif=A&per_page=10`)
  const sireneData = await sireneRes.json()
  console.log(`  SIRENE: ${sireneData.results?.length || 0} resultats`)

  const leads = []
  for (const r of (sireneData.results || [])) {
    const etab = r.matching_etablissements?.[0] || r.siege || {}
    leads.push({
      name: r.nom_complet,
      city: etab.libelle_commune || 'Lyon',
      postalCode: etab.code_postal || '',
      siret: etab.siret,
      address: `${etab.adresse || ''}, ${etab.code_postal || ''} ${etab.libelle_commune || ''}`.trim(),
      email: null,
      phone: null,
      website: null,
      score: 50,
    })
  }

  // 1c. Serper — chercher sites web + scraper emails
  if (process.env.SERPER_API_KEY) {
    for (const lead of leads) {
      try {
        const serpRes = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: `"${lead.name}" ${lead.city} restaurant site contact`, gl: 'fr', hl: 'fr', num: 3 })
        })
        const serpData = await serpRes.json()
        const excluded = ['pagesjaunes.fr', 'societe.com', 'infogreffe.fr', 'pappers.fr', 'google.com', 'facebook.com', 'tripadvisor']

        for (const result of (serpData.organic || [])) {
          const link = result.link || ''
          if (!excluded.some(d => link.includes(d))) {
            try { lead.website = new URL(link).origin; break } catch { continue }
          }
        }

        // Scrape email + phone from website
        if (lead.website) {
          try {
            const pageRes = await fetch(lead.website, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMFBot/1.0)' },
              signal: AbortSignal.timeout(5000)
            })
            const html = await pageRes.text()
            const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
            const valid = emails.filter(e =>
              !e.startsWith('noreply') && !e.includes('example.com') &&
              !e.includes('sentry') && !e.includes('wixpress') &&
              !e.includes('.png') && !e.includes('.jpg') &&
              e.length < 50
            )
            if (valid.length > 0) lead.email = valid[0]
            const phones = html.match(/(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/g) || []
            if (phones.length > 0) lead.phone = phones[0]
            // Boost score
            if (lead.email) lead.score += 25
            if (lead.phone) lead.score += 15
            if (lead.website) lead.score += 10
          } catch {}
        }
      } catch {}
    }
  }

  // 1d. Selectionner le meilleur lead avec email
  leads.sort((a, b) => b.score - a.score)
  prospect = leads.find(l => l.email) || leads[0]

  if (!prospect) throw new Error('Aucun lead trouve')

  const elapsed = Date.now() - step1Start
  console.log('')
  console.log('  === PROSPECT SELECTIONNE ===')
  console.log(`  Nom:      ${prospect.name}`)
  console.log(`  Email:    ${prospect.email || '(aucun)'}`)
  console.log(`  Tel:      ${prospect.phone || '(aucun)'}`)
  console.log(`  Website:  ${prospect.website || '(aucun)'}`)
  console.log(`  Adresse:  ${prospect.address}`)
  console.log(`  SIRET:    ${prospect.siret}`)
  console.log(`  Score:    ${prospect.score}/100`)

  report('1', 'Sourcing prospect', true, `${prospect.name} — score ${prospect.score}/100`, elapsed)
  writeFileSync('/tmp/fmf-test-prospect.json', JSON.stringify(prospect, null, 2))
} catch (e) {
  report('1', 'Sourcing prospect', false, e.message, Date.now() - step1Start)
  console.error('  FAIL:', e.message)
  process.exit(1)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 2 — SAUVEGARDER DANS LE CRM (Firestore)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 2 — SAUVEGARDER DANS FIRESTORE')
console.log('='.repeat(60) + '\n')

let orgId = null
let prospectId = null
const step2Start = Date.now()

try {
  // Trouver la premiere org
  const orgsSnap = await db.collection('organizations').limit(1).get()
  if (orgsSnap.empty) throw new Error('Aucune organisation trouvee')
  orgId = orgsSnap.docs[0].id
  console.log(`  Organisation: ${orgId}`)

  // Creer le prospect dans Firestore
  const prospectRef = await db.collection('organizations').doc(orgId)
    .collection('prospects').add({
      firstName: prospect.name.split(' ')[0] || prospect.name,
      lastName: prospect.name.split(' ').slice(1).join(' ') || '',
      company: prospect.name,
      email: prospect.email || 'non-trouve@test.fmf',
      phone: prospect.phone || null,
      website: prospect.website || null,
      address: prospect.address || null,
      city: prospect.city || 'Lyon',
      siret: prospect.siret || null,
      sector: 'restaurant',
      score: prospect.score,
      status: 'new',
      source: 'pipeline_france_a2z',
      tags: ['test-a2z', 'restaurant', 'lyon'],
      notes: `Lead issu du test A-Z FMF — ${new Date().toLocaleString('fr-FR')}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

  prospectId = prospectRef.id
  const elapsed = Date.now() - step2Start
  console.log(`  Prospect ID: ${prospectId}`)
  report('2', 'CRM Firestore', true, `ID ${prospectId} dans org ${orgId}`, elapsed)

  writeFileSync('/tmp/fmf-test-lead.json', JSON.stringify({ prospectId, orgId, ...prospect }, null, 2))
} catch (e) {
  report('2', 'CRM Firestore', false, e.message, Date.now() - step2Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 3 — EMAIL J1 (Premier contact)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 3 — EMAIL J1 (Premier contact)')
console.log('='.repeat(60) + '\n')

let emailJ1Id = null
const step3Start = Date.now()

try {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'Face Media Factory <onboarding@resend.dev>',
    to: [ADMIN_EMAIL],
    subject: `[TEST A→Z] Email J1 vers ${prospect.name}`,
    html: `
      <div style="background:#f3f4f6;padding:10px;margin-bottom:20px;border-radius:8px;font-size:12px;color:#6b7280">
        Test A-Z — Simulation envoi vers <strong>${prospect.email || 'N/A'}</strong> (${prospect.name})
      </div>
      <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
        <p>Bonjour,</p>
        <p>Je tombe sur <strong>${prospect.name}</strong> en cherchant des restaurants a Lyon,
        et je voulais vous poser une question rapide.</p>
        <p>Est-ce que vous cherchez a attirer plus de clients sans passer des heures
        sur les reseaux sociaux ?</p>
        <p>On aide des restaurants comme le votre a automatiser leur prospection
        — Email, WhatsApp, SMS — sans effort de votre part.</p>
        <p>Ca vaut 5 minutes d'appel cette semaine ?</p>
        <p>Cordialement,<br>
        <strong>Alex</strong><br>
        Face Media Factory</p>
      </div>
    `
  })

  if (error) throw new Error(error.message || JSON.stringify(error))
  emailJ1Id = data?.id
  const elapsed = Date.now() - step3Start
  console.log(`  Destinataire reel: ${ADMIN_EMAIL}`)
  console.log(`  Destinataire simule: ${prospect.email}`)
  report('3', 'Email J1', true, `ID ${emailJ1Id}`, elapsed)

  // Logger interaction dans Firestore
  if (orgId && prospectId) {
    await db.collection('organizations').doc(orgId).collection('interactions').add({
      prospectId,
      type: 'email_sent',
      channel: 'email',
      direction: 'out',
      subject: `Premier contact — ${prospect.name}`,
      messageId: emailJ1Id,
      step: 'J1',
      createdAt: FieldValue.serverTimestamp(),
    })
    console.log('  Interaction loggee dans Firestore')
  }
} catch (e) {
  report('3', 'Email J1', false, e.message, Date.now() - step3Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 4 — SIMULER REPONSE PROSPECT + ALEX REPOND
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 4 — ALEX REPOND A "C\'est combien ?"')
console.log('='.repeat(60) + '\n')

let alexReply = null
const step4Start = Date.now()

try {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const prospectMessage = "Bonjour, j'ai recu votre email. C'est combien exactement ?"

  console.log(`  Prospect (${prospect.name}): "${prospectMessage}"`)
  console.log('')

  const contextPrompt = ALEX_PROMPT + `\n\nCONTEXTE PROSPECT:
- Nom: ${prospect.name}
- Secteur: Restaurant a Lyon
- Source: Pipeline France — trouve via SIRENE
- Scoring: ${prospect.score}/100
- Site web: ${prospect.website || 'non trouve'}
- C'est le premier echange. Tu as envoye un email de prospection, il repond "c'est combien ?"`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: contextPrompt },
      { role: 'user', content: prospectMessage }
    ],
    max_tokens: 200,
  })

  alexReply = response.choices[0].message.content
  const elapsed = Date.now() - step4Start
  console.log(`  Alex (${elapsed}ms): "${alexReply}"`)
  console.log(`  Tokens: ${response.usage.total_tokens}`)
  report('4', 'Alex repond', true, `${alexReply.length} chars, ${response.usage.total_tokens} tokens`, elapsed)

  // Logger dans Firestore
  if (orgId && prospectId) {
    await db.collection('organizations').doc(orgId).collection('interactions').add({
      prospectId,
      type: 'message_received',
      channel: 'email',
      direction: 'in',
      content: prospectMessage,
      step: 'J1-reply',
      createdAt: FieldValue.serverTimestamp(),
    })
    await db.collection('organizations').doc(orgId).collection('interactions').add({
      prospectId,
      type: 'ai_reply',
      channel: 'email',
      direction: 'out',
      content: alexReply,
      source: 'alex_ai',
      model: 'llama-3.3-70b-versatile',
      step: 'J1-alex',
      createdAt: FieldValue.serverTimestamp(),
    })
  }
} catch (e) {
  report('4', 'Alex repond', false, e.message, Date.now() - step4Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 5 — ENVOYER LA REPONSE D'ALEX PAR EMAIL
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 5 — EMAIL J2 (Reponse Alex)')
console.log('='.repeat(60) + '\n')

const step5Start = Date.now()

try {
  if (!alexReply) throw new Error('Pas de reponse Alex disponible')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'Face Media Factory <onboarding@resend.dev>',
    to: [ADMIN_EMAIL],
    subject: `[TEST A→Z] Reponse Alex a ${prospect.name}`,
    html: `
      <div style="background:#f3f4f6;padding:10px;margin-bottom:20px;border-radius:8px;font-size:12px;color:#6b7280">
        Test A-Z — Reponse automatique Alex a <strong>${prospect.name}</strong>
        <br>Prospect avait dit : "C'est combien exactement ?"
      </div>
      <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
        <p>Bonjour,</p>
        <p>${alexReply}</p>
        <p>Cordialement,<br>
        <strong>Alex</strong><br>
        Face Media Factory</p>
      </div>
    `
  })

  if (error) throw new Error(error.message || JSON.stringify(error))
  const elapsed = Date.now() - step5Start
  report('5', 'Email J2 Alex', true, `ID ${data?.id}`, elapsed)

  if (orgId && prospectId) {
    await db.collection('organizations').doc(orgId).collection('interactions').add({
      prospectId,
      type: 'email_sent',
      channel: 'email',
      direction: 'out',
      content: alexReply,
      source: 'alex_ai',
      messageId: data?.id,
      step: 'J2',
      createdAt: FieldValue.serverTimestamp(),
    })
  }
} catch (e) {
  report('5', 'Email J2 Alex', false, e.message, Date.now() - step5Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 6 — WHATSAPP J3 (Suivi)
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 6 — WHATSAPP J3 (Suivi)')
console.log('='.repeat(60) + '\n')

const step6Start = Date.now()

try {
  const waText = `[Test A-Z — simulation vers ${prospect.name}]\n\nBonjour 👋\n\nJe vous ai envoye un email il y a 2 jours concernant ${prospect.name}.\n\nVous avez eu le temps de le lire ?\n\nEn 5 min je vous montre comment automatiser votre prospection.\n\n— Alex, Face Media Factory`

  const waRes = await fetch(
    `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_NAME || 'fmf-whatsapp3'}`,
    {
      method: 'POST',
      headers: { apikey: process.env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: ADMIN_WHATSAPP, text: waText })
    }
  )
  const waData = await waRes.json()
  const elapsed = Date.now() - step6Start

  if (waData.key?.id || waData.messageId) {
    const msgId = waData.key?.id || waData.messageId
    report('6', 'WhatsApp J3', true, `ID ${msgId}`, elapsed)

    if (orgId && prospectId) {
      await db.collection('organizations').doc(orgId).collection('interactions').add({
        prospectId,
        type: 'whatsapp_sent',
        channel: 'whatsapp',
        direction: 'out',
        content: waText,
        messageId: msgId,
        step: 'J3',
        createdAt: FieldValue.serverTimestamp(),
      })
    }
  } else {
    throw new Error(JSON.stringify(waData))
  }
} catch (e) {
  report('6', 'WhatsApp J3', false, e.message, Date.now() - step6Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// ETAPE 7 — VERIFIER PARCOURS COMPLET DANS FIRESTORE
// ═══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60))
console.log('ETAPE 7 — VERIFICATION FIRESTORE + UPDATE CRM')
console.log('='.repeat(60) + '\n')

const step7Start = Date.now()

try {
  if (!orgId || !prospectId) throw new Error('Pas d\'orgId/prospectId')

  // 7a. Lire le prospect
  const prospectSnap = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()
  const pData = prospectSnap.data()
  console.log(`  7a. Prospect: ${pData.company} | ${pData.email} | score=${pData.score} | status=${pData.status}`)

  // 7b. Compter les interactions
  const interactionsSnap = await db.collection('organizations').doc(orgId)
    .collection('interactions')
    .where('prospectId', '==', prospectId)
    .get()
  console.log(`  7b. Interactions enregistrees: ${interactionsSnap.size}`)
  interactionsSnap.docs.forEach(doc => {
    const d = doc.data()
    console.log(`      - ${d.step || '?'} | ${d.channel} | ${d.direction} | ${d.type}`)
  })

  // 7c. Mettre a jour le statut CRM
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).update({
      status: 'contacted',
      score: Math.min(100, (pData.score || 50) + 20),
      lastContactedAt: FieldValue.serverTimestamp(),
      contactedVia: ['email', 'whatsapp'],
      updatedAt: FieldValue.serverTimestamp(),
    })

  const updatedSnap = await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).get()
  const uData = updatedSnap.data()
  console.log(`  7c. CRM mis a jour: status=${uData.status}, score=${uData.score}`)

  const elapsed = Date.now() - step7Start
  report('7', 'Verification Firestore', true, `${interactionsSnap.size} interactions, status=contacted`, elapsed)

  // 7d. Cleanup — supprimer les donnees test
  console.log('\n  Cleanup...')
  for (const doc of interactionsSnap.docs) {
    await db.collection('organizations').doc(orgId).collection('interactions').doc(doc.id).delete()
  }
  await db.collection('organizations').doc(orgId)
    .collection('prospects').doc(prospectId).delete()
  console.log('  Cleanup OK — donnees test supprimees')
} catch (e) {
  report('7', 'Verification Firestore', false, e.message, Date.now() - step7Start)
  console.error('  FAIL:', e.message)
}

// ═══════════════════════════════════════════════════════════
// RAPPORT FINAL A→Z
// ═══════════════════════════════════════════════════════════
console.log('\n\n' + '='.repeat(60))
console.log('RAPPORT FINAL — TEST CLIENT REEL A→Z')
console.log('='.repeat(60) + '\n')

console.log('| Etape | Action | Resultat | Details | Temps |')
console.log('|-------|--------|----------|---------|-------|')
for (const r of results) {
  console.log(`| ${r.step} | ${r.action} | ${r.success ? 'OK' : 'FAIL'} | ${r.details} | ${r.elapsed}ms |`)
}

const okCount = results.filter(r => r.success).length
const total = results.length

console.log('')
console.log(`Prospect teste: ${prospect?.name || '?'} | Email: ${prospect?.email || '?'} | Score: ${prospect?.score || '?'}/100`)
console.log('')

if (alexReply) {
  console.log('Reponse Alex a "C\'est combien ?":')
  console.log(`  "${alexReply}"`)
  console.log('')
}

console.log(`Score: ${okCount}/${total} etapes OK`)

if (okCount === total) {
  console.log('VERDICT: PARCOURS COMPLET VALIDE — Premier client cette semaine')
} else if (okCount >= total - 1) {
  console.log('VERDICT: Corrections mineures — quasi pret')
} else {
  console.log(`VERDICT: ${total - okCount} etapes a corriger`)
}
