/**
 * Script de test REEL du prospectEngine
 * Execute les memes operations que la Cloud Function
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as cheerio from 'cheerio'

// Initialize Firebase Admin (uses default credentials)
initializeApp({
  projectId: 'face-media-factory'
})

const db = getFirestore()

// Configuration du test
const TEST_ICP = {
  businessName: 'CleanPro Services',
  sector: 'Nettoyage professionnel',
  offer: 'Nettoyage et entretien de bureaux, locaux professionnels',
  target: 'Dirigeants PME, Office Managers, DAF',
  zone: 'Paris et Ile-de-France',
  volume: 'PME',
  channels: ['email', 'sms', 'whatsapp'],
  tone: 'professional',
  frequency: 'balanced',
}

// Gemini API call
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      }),
    }
  )

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// Parse JSON from AI response
function parseJsonResponse(text) {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch (e) {}

  // Try to extract from code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch (e) {}
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {}
  }

  return null
}

// Scrape website
async function scrapeWebsite(url) {
  try {
    let normalizedUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = 'https://' + url
    }

    console.log(`  Scraping ${normalizedUrl}...`)

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, nav, footer, header, iframe, noscript, svg').remove()

    const title = $('title').text().trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 5)
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((p) => p.length > 30)
      .slice(0, 10)

    // Extract emails
    const bodyText = $('body').text()
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [...new Set(bodyText.match(emailRegex) || [])]
      .filter(e => !e.includes('example') && !e.includes('test@') && !e.includes('sentry'))
      .slice(0, 3)

    // Extract phones
    const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g
    const phones = [...new Set(bodyText.match(phoneRegex) || [])].slice(0, 2)

    return {
      success: true,
      title,
      metaDescription,
      headings: h1s,
      content: paragraphs.join(' ').substring(0, 1500),
      emails,
      phones,
      url: normalizedUrl,
    }
  } catch (error) {
    console.log(`  ❌ Erreur scraping: ${error.message}`)
    return {
      success: false,
      error: error.message,
      url,
      title: '',
      emails: [],
      phones: [],
    }
  }
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Main test function
async function runTest() {
  console.log('=' .repeat(60))
  console.log('🚀 TEST REEL DU MOTEUR DE PROSPECTION')
  console.log('=' .repeat(60))
  console.log('')
  console.log('📋 ICP Configure:')
  console.log(`   Entreprise: ${TEST_ICP.businessName}`)
  console.log(`   Secteur: ${TEST_ICP.sector}`)
  console.log(`   Offre: ${TEST_ICP.offer}`)
  console.log(`   Cible: ${TEST_ICP.target}`)
  console.log(`   Zone: ${TEST_ICP.zone}`)
  console.log('')

  // Step 1: Find companies with Gemini
  console.log('🔍 Etape 1: Recherche d\'entreprises avec Gemini...')

  const findCompaniesPrompt = `Tu es un expert en prospection B2B.
Genere une liste de 10 entreprises REELLES en France qui pourraient avoir besoin de services de nettoyage de bureaux.

Cible: ${TEST_ICP.target}
Zone: ${TEST_ICP.zone}
Volume: ${TEST_ICP.volume}

IMPORTANT:
- Ces entreprises doivent etre REELLES et avoir un site web FONCTIONNEL
- Inclus des PME de differents secteurs (tech, juridique, medical, immobilier, etc.)
- Le site web doit etre une URL valide

Reponds UNIQUEMENT en JSON:
{
  "companies": [
    {
      "name": "Nom reel de l'entreprise",
      "website": "https://www.sitevalide.fr",
      "sector": "Secteur",
      "description": "Description courte",
      "size": "PME",
      "city": "Ville"
    }
  ]
}`

  let companies = []
  try {
    const response = await callGemini(findCompaniesPrompt)
    const parsed = parseJsonResponse(response)
    companies = parsed?.companies || []
    console.log(`   ✅ ${companies.length} entreprises trouvees`)
  } catch (error) {
    console.log(`   ❌ Erreur Gemini: ${error.message}`)
    // Fallback avec des entreprises connues
    companies = [
      { name: 'Doctolib', website: 'https://www.doctolib.fr', sector: 'Tech/Sante', city: 'Paris' },
      { name: 'Alan', website: 'https://alan.com', sector: 'Assurance/Tech', city: 'Paris' },
      { name: 'Swile', website: 'https://www.swile.co', sector: 'Tech/RH', city: 'Paris' },
      { name: 'Qonto', website: 'https://qonto.com', sector: 'Fintech', city: 'Paris' },
      { name: 'ManoMano', website: 'https://www.manomano.fr', sector: 'E-commerce', city: 'Paris' },
    ]
    console.log(`   ⚠️ Utilisation de ${companies.length} entreprises de fallback`)
  }

  console.log('')
  console.log('📊 Entreprises a analyser:')
  companies.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.name} (${c.sector}) - ${c.website}`)
  })
  console.log('')

  // Step 2: Scrape each website
  console.log('🌐 Etape 2: Scraping des sites web...')

  const prospects = []

  for (let i = 0; i < Math.min(companies.length, 5); i++) {
    const company = companies[i]
    console.log(`\n   [${i + 1}/${Math.min(companies.length, 5)}] ${company.name}`)

    const scrapedData = await scrapeWebsite(company.website)

    if (scrapedData.success) {
      console.log(`   ✅ Scrape reussi`)
      console.log(`      Titre: ${scrapedData.title?.substring(0, 50)}...`)
      console.log(`      Emails: ${scrapedData.emails.length > 0 ? scrapedData.emails.join(', ') : 'Aucun trouve'}`)
      console.log(`      Telephones: ${scrapedData.phones.length > 0 ? scrapedData.phones.join(', ') : 'Aucun trouve'}`)

      // Create prospect
      const prospect = {
        firstName: 'Responsable',
        lastName: company.name.split(' ')[0],
        jobTitle: 'Office Manager',
        email: scrapedData.emails[0] || `contact@${new URL(company.website).hostname.replace('www.', '')}`,
        phone: scrapedData.phones[0] || null,
        company: company.name,
        website: company.website,
        industry: company.sector,
        companySize: company.size || 'PME',
        city: company.city || 'Paris',
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        status: 'new',
        source: 'engine-test',
        scrapedData: {
          title: scrapedData.title,
          metaDescription: scrapedData.metaDescription,
          success: true,
        },
        createdAt: FieldValue.serverTimestamp(),
      }

      prospects.push(prospect)
    } else {
      console.log(`   ❌ Echec du scraping`)
    }

    await delay(1000) // Rate limit
  }

  console.log('')
  console.log(`📈 ${prospects.length} prospects crees`)
  console.log('')

  // Step 3: Save to Firestore
  console.log('💾 Etape 3: Sauvegarde dans Firestore...')

  // Create a test organization if needed
  const testOrgId = 'test-nettoyage-' + Date.now()
  const orgRef = db.collection('organizations').doc(testOrgId)

  await orgRef.set({
    name: TEST_ICP.businessName,
    createdAt: FieldValue.serverTimestamp(),
    testMode: true,
    icp: TEST_ICP,
  })
  console.log(`   ✅ Organisation test creee: ${testOrgId}`)

  // Save prospects
  const batch = db.batch()
  const savedProspects = []

  for (const prospect of prospects) {
    const prospectRef = orgRef.collection('prospects').doc()
    batch.set(prospectRef, prospect)
    savedProspects.push({ id: prospectRef.id, ...prospect })
  }

  await batch.commit()
  console.log(`   ✅ ${prospects.length} prospects sauvegardes`)

  // Step 4: Generate sequences for top prospects
  console.log('')
  console.log('✍️ Etape 4: Generation des sequences...')

  const topProspects = savedProspects.filter(p => p.score >= 75).slice(0, 3)

  for (const prospect of topProspects) {
    console.log(`   Sequence pour ${prospect.company}...`)

    // Simple sequence without AI (to avoid rate limits)
    const sequence = [
      {
        day: 0,
        channel: 'email',
        subject: `Question sur l'entretien de vos locaux`,
        content: `Bonjour,

Je me permets de vous contacter car nous accompagnons les entreprises comme ${prospect.company} dans l'entretien de leurs locaux professionnels.

Seriez-vous disponible pour un echange de 10 minutes cette semaine ?

Cordialement,
CleanPro Services`,
        cta: 'Planifier un appel',
      },
      {
        day: 4,
        channel: 'email',
        subject: `Re: Question sur l'entretien de vos locaux`,
        content: `Bonjour,

Je reviens vers vous suite a mon precedent message.

Un environnement de travail propre augmente la productivite de 15% selon les etudes.

Avez-vous 10 minutes pour en discuter ?

Cordialement`,
        cta: 'Repondre',
      },
      {
        day: 7,
        channel: 'sms',
        content: `Bonjour, suite a mes emails concernant l'entretien de vos locaux chez ${prospect.company}. Disponible pour un call ? CleanPro`,
        cta: 'Appeler',
      },
    ]

    // Update prospect with sequence
    await orgRef.collection('prospects').doc(prospect.id).update({
      sequenceSteps: sequence,
      sequenceGeneratedAt: FieldValue.serverTimestamp(),
      status: 'ready',
    })

    // Create campaign
    await orgRef.collection('campaigns').add({
      prospectId: prospect.id,
      prospectName: `${prospect.firstName} ${prospect.lastName}`,
      prospectCompany: prospect.company,
      steps: sequence,
      currentStep: 0,
      status: 'pending',
      channels: TEST_ICP.channels,
      createdAt: FieldValue.serverTimestamp(),
    })

    console.log(`   ✅ Sequence creee (${sequence.length} etapes)`)
  }

  // Final report
  console.log('')
  console.log('=' .repeat(60))
  console.log('📊 RAPPORT FINAL')
  console.log('=' .repeat(60))
  console.log('')
  console.log(`Organisation ID: ${testOrgId}`)
  console.log('')
  console.log('Resultats:')
  console.log(`   - Entreprises analysees: ${companies.length}`)
  console.log(`   - Sites scraped avec succes: ${prospects.length}`)
  console.log(`   - Prospects crees: ${prospects.length}`)
  console.log(`   - Sequences generees: ${topProspects.length}`)
  console.log('')
  console.log('Prospects dans Firestore:')
  savedProspects.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.company} (Score: ${p.score}) - ${p.email}`)
  })
  console.log('')
  console.log('🔗 Voir dans Firebase Console:')
  console.log(`   https://console.firebase.google.com/project/face-media-factory/firestore/data/organizations/${testOrgId}`)
  console.log('')
  console.log('✅ Test termine!')
}

// Run
runTest().catch(console.error)
