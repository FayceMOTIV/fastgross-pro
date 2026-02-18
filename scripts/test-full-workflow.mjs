#!/usr/bin/env node

/**
 * TEST FULL AUTOPILOT WORKFLOW on Firestore
 * Run from project root with:
 * GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/smmafk01_gmail_com_application_default_credentials.json node scripts/test-full-workflow.mjs
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let app
try {
  app = initializeApp({ projectId: 'face-media-factory' })
} catch (e) {}

const db = getFirestore()

async function testFullWorkflow() {
  console.log('='.repeat(70))
  console.log('  COMPLETE AUTOPILOT WORKFLOW TEST')
  console.log('='.repeat(70))

  const testOrgId = 'test-workflow-' + Date.now()
  console.log(`\nTest Organization ID: ${testOrgId}\n`)

  const stepResults = {}

  // STEP 1: Config Save
  console.log('-'.repeat(70))
  console.log('STEP 1: Saving AutoPilot config')
  console.log('-'.repeat(70))

  try {
    const config = {
      enabled: true,
      launchedAt: Timestamp.now(),
      companyProfile: {
        name: "Face Media Factory",
        service: "Creation video pour restaurants",
        uniqueValue: "Videos virales qui convertissent",
        typicalResults: "+300% engagement, +50 clients/an"
      },
      clientAvatar: {
        title: "Restaurant Owner, Food Blogger",
        industry: "Food & Drink",
        painPoints: ["Pas de visibilite", "Contenu amateur", "Pas le temps"],
        signals: ["Nouveau resto", "<10K followers", "Budget marketing"],
        location: "Paris, France"
      },
      channels: { whatsapp: true, email: true, instagram: true },
      prospectsPerDay: 20,
      autoSend: false,
      keywords: ["nouveau restaurant Paris", "food blogger Paris", "chef cuisinier"],
      stats: { totalProspects: 0, totalContacted: 0, totalResponses: 0, totalMeetings: 0 }
    }

    await db.collection('organizations').doc(testOrgId).collection('autoPilotConfig').doc('main').set(config)

    // Verify
    const configDoc = await db.collection('organizations').doc(testOrgId).collection('autoPilotConfig').doc('main').get()
    const ok = configDoc.exists && configDoc.data()?.enabled === true
    console.log(`  Save: ${ok ? 'OK' : 'FAILED'}`)
    console.log(`  Verified: enabled=${configDoc.data()?.enabled}, channels=${JSON.stringify(configDoc.data()?.channels)}`)
    stepResults.configSave = { success: ok }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.configSave = { success: false, error: e.message }
  }

  // STEP 2: Generate Prospects
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 2: Generating & saving prospects')
  console.log('-'.repeat(70))

  const mockProspects = [
    {
      name: "Bistrot Moderne",
      score: 92,
      email: "contact@bistrotmoderne.fr",
      phone: "+33142567890",
      instagram: "@bistrotmoderne",
      followers: 3200,
      bio: "Nouveau bistrot Paris 11eme. Cuisine francaise moderne. Ouvert 2024.",
      matchReason: "Nouveau restaurant, <5K followers, quartier touristique",
      hooks: [
        "Votre Bistrot Moderne a un concept unique pour le quartier...",
        "Vos 3.2K followers montrent un vrai potentiel de croissance...",
        "Vos posts irreguliers - on peut automatiser votre contenu..."
      ],
      signals: ["Ouverture recente", "< 5K followers", "Posts irreguliers"],
      status: "pending",
      channel: null,
      contactedAt: null
    },
    {
      name: "Chef Marie Food",
      score: 88,
      email: "marie@chefmarie.com",
      phone: "+33678123456",
      instagram: "@chefmariefood",
      followers: 12400,
      bio: "Food blogger Paris. Partenariats. 12.4K followers.",
      matchReason: "Audience engagee, cherche monetisation, partenariats actifs",
      hooks: [
        "Marie, votre contenu culinaire est superbe, passez a la video...",
        "Avec 12.4K followers engages, vous etes a un tournant...",
        "Passer a la video courte pour exploser sur Reels..."
      ],
      signals: ["Croissance stagnante", "Cherche partenariats", "Budget disponible"],
      status: "pending",
      channel: null,
      contactedAt: null
    },
    {
      name: "Sushi Bar Tokyo",
      score: 85,
      email: "contact@sushibartokyo.fr",
      phone: "+33145789012",
      instagram: "@sushibartokyo",
      followers: 5600,
      bio: "Sushi authentique japonais Paris. Chef Tokyo. 5.6K followers.",
      matchReason: "Expertise reconnue, presse positive, visibilite moyenne",
      hooks: [
        "Votre expertise sushi authentique merite une meilleure visibilite...",
        "Les mentions TimeOut Paris sont un atout enorme a exploiter...",
        "Vos 5.6K followers pourraient doubler avec du contenu video..."
      ],
      signals: ["Expertise reconnue", "Presse positive", "Potentiel croissance"],
      status: "pending",
      channel: null,
      contactedAt: null
    },
    {
      name: "Patisserie Artisanale",
      score: 78,
      email: "bonjour@patisserieartisanale.fr",
      phone: null,
      instagram: "@patisserieartisanale",
      followers: 4100,
      bio: "Patisserie artisanale. Livraison Paris. Commandes Instagram.",
      matchReason: "Artisanale, visuels potentiellement forts, Instagram actif",
      hooks: [
        "Vos creations patissieres meritent d'etre filmees...",
        "4.1K followers c'est un bon debut mais on peut faire x3...",
        "Des videos de vos creations feraient un carton sur Instagram..."
      ],
      signals: ["Artisanal", "Commandes Instagram", "Visuels forts"],
      status: "pending",
      channel: null,
      contactedAt: null
    },
    {
      name: "Food Truck Le Nomade",
      score: 65,
      email: null,
      phone: "+33612345678",
      instagram: "@foodtrucklenomade",
      followers: 1800,
      bio: "Food truck cuisine du monde. Paris et banlieue. 1.8K followers.",
      matchReason: "Mobile, audience locale, potentiel video street food",
      hooks: [
        "Votre food truck a un concept genial pour la video...",
        "La cuisine du monde en truck, c'est du contenu viral potentiel...",
        "1.8K followers c'est un debut - on peut accelerer..."
      ],
      signals: ["Concept mobile", "Audience locale", "Contenu potentiel"],
      status: "pending",
      channel: null,
      contactedAt: null
    }
  ]

  try {
    const batch = db.batch()
    for (let i = 0; i < mockProspects.length; i++) {
      const docRef = db.collection('organizations').doc(testOrgId).collection('autopilotProspects').doc(`prospect-${i}`)
      batch.set(docRef, {
        ...mockProspects[i],
        createdAt: FieldValue.serverTimestamp(),
        createdDate: new Date().toISOString().split('T')[0]
      })
    }
    await batch.commit()
    console.log(`  Saved ${mockProspects.length} prospects OK`)
    mockProspects.forEach(p => console.log(`    - ${p.name} (score: ${p.score}, email: ${p.email || 'none'})`))
    stepResults.prospectGeneration = { success: true, count: mockProspects.length }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.prospectGeneration = { success: false, error: e.message }
  }

  // STEP 3: Dashboard Retrieval Queries
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 3: Dashboard retrieval queries')
  console.log('-'.repeat(70))

  try {
    // All prospects
    const allSnap = await db.collection('organizations').doc(testOrgId).collection('autopilotProspects').get()
    console.log(`  All prospects: ${allSnap.size}`)

    // Hot prospects (score >= 85)
    const hotSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('score', '>=', 85).orderBy('score', 'desc').get()
    console.log(`  Hot (>=85): ${hotSnap.size}`)
    hotSnap.forEach(doc => {
      const d = doc.data()
      console.log(`    - ${d.name}: ${d.score}/100`)
    })

    // Prospects with email
    const emailSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('email', '!=', null).get()
    console.log(`  With email: ${emailSnap.size}`)

    // Pending prospects
    const pendingSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('status', '==', 'pending').get()
    console.log(`  Pending: ${pendingSnap.size}`)

    stepResults.dashboardRetrieval = {
      success: allSnap.size === 5 && hotSnap.size >= 2,
      total: allSnap.size,
      hot: hotSnap.size,
      withEmail: emailSnap.size,
      pending: pendingSnap.size
    }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.dashboardRetrieval = { success: false, error: e.message }
  }

  // STEP 4: Status Updates (simulate contacting)
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 4: Status updates (contact simulation)')
  console.log('-'.repeat(70))

  try {
    // Contact first prospect via WhatsApp
    await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').doc('prospect-0')
      .update({
        status: 'contacted',
        channel: 'whatsapp',
        contactedAt: FieldValue.serverTimestamp(),
        lastMessage: mockProspects[0].hooks[0]
      })
    console.log(`  prospect-0 -> contacted (whatsapp)`)

    // Contact second via email
    await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').doc('prospect-1')
      .update({
        status: 'contacted',
        channel: 'email',
        contactedAt: FieldValue.serverTimestamp(),
        lastMessage: mockProspects[1].hooks[0]
      })
    console.log(`  prospect-1 -> contacted (email)`)

    // Third responds positively
    await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').doc('prospect-2')
      .update({
        status: 'responded',
        channel: 'instagram',
        contactedAt: FieldValue.serverTimestamp(),
        responseAt: FieldValue.serverTimestamp(),
        responseType: 'positive',
        lastMessage: "Oui, ca m'interesse! On peut en discuter?"
      })
    console.log(`  prospect-2 -> responded (positive)`)

    // Verify
    const contactedSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('status', '==', 'contacted').get()
    const respondedSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('status', '==', 'responded').get()
    const stillPendingSnap = await db.collection('organizations').doc(testOrgId)
      .collection('autopilotProspects').where('status', '==', 'pending').get()

    console.log(`  Contacted: ${contactedSnap.size}`)
    console.log(`  Responded: ${respondedSnap.size}`)
    console.log(`  Still pending: ${stillPendingSnap.size}`)

    stepResults.statusUpdates = {
      success: contactedSnap.size === 2 && respondedSnap.size === 1 && stillPendingSnap.size === 2,
      contacted: contactedSnap.size,
      responded: respondedSnap.size,
      pending: stillPendingSnap.size
    }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.statusUpdates = { success: false, error: e.message }
  }

  // STEP 5: Stats Computation (like dashboard would)
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 5: Stats computation')
  console.log('-'.repeat(70))

  try {
    const allDocs = await db.collection('organizations').doc(testOrgId).collection('autopilotProspects').get()
    let stats = { total: 0, contacted: 0, responded: 0, pending: 0, avgScore: 0, hotCount: 0, withEmail: 0, channels: {} }

    allDocs.forEach(doc => {
      const d = doc.data()
      stats.total++
      stats.avgScore += d.score || 0
      if (d.score >= 85) stats.hotCount++
      if (d.email) stats.withEmail++
      if (d.status === 'contacted') stats.contacted++
      if (d.status === 'responded') stats.responded++
      if (d.status === 'pending') stats.pending++
      if (d.channel) stats.channels[d.channel] = (stats.channels[d.channel] || 0) + 1
    })
    stats.avgScore = stats.total > 0 ? Math.round(stats.avgScore / stats.total * 10) / 10 : 0
    stats.responseRate = stats.contacted + stats.responded > 0 ? Math.round(stats.responded / (stats.contacted + stats.responded) * 100) : 0

    console.log('  Dashboard Stats:')
    console.log(`    Total prospects:  ${stats.total}`)
    console.log(`    Hot (>=85):       ${stats.hotCount}`)
    console.log(`    With email:       ${stats.withEmail}`)
    console.log(`    Contacted:        ${stats.contacted}`)
    console.log(`    Responded:        ${stats.responded}`)
    console.log(`    Pending:          ${stats.pending}`)
    console.log(`    Avg score:        ${stats.avgScore}`)
    console.log(`    Response rate:    ${stats.responseRate}%`)
    console.log(`    Channels:         ${JSON.stringify(stats.channels)}`)

    // Update config stats
    await db.collection('organizations').doc(testOrgId).collection('autoPilotConfig').doc('main').update({
      'stats.totalProspects': stats.total,
      'stats.totalContacted': stats.contacted + stats.responded,
      'stats.totalResponses': stats.responded,
      'stats.lastRunAt': Timestamp.now()
    })
    console.log('  Config stats updated OK')

    stepResults.statsComputation = { success: true, stats }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.statsComputation = { success: false, error: e.message }
  }

  // STEP 6: Check real org data
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 6: Real organization data check')
  console.log('-'.repeat(70))

  try {
    const orgs = await db.collection('organizations').get()
    console.log(`  Total organizations: ${orgs.size}`)
    for (const orgDoc of orgs.docs) {
      const name = orgDoc.data()?.name || orgDoc.data()?.companyName || '(unnamed)'
      const prospSnap = await db.collection('organizations').doc(orgDoc.id).collection('autopilotProspects').get()
      const configSnap = await db.collection('organizations').doc(orgDoc.id).collection('autoPilotConfig').doc('main').get()
      if (orgDoc.id !== testOrgId) {
        console.log(`    ${orgDoc.id}: "${name}" | prospects: ${prospSnap.size} | autopilot: ${configSnap.exists ? 'configured' : 'not configured'}`)
      }
    }
    stepResults.realOrgCheck = { success: true, orgCount: orgs.size }
  } catch (e) {
    console.log(`  FAILED: ${e.message}`)
    stepResults.realOrgCheck = { success: false, error: e.message }
  }

  // STEP 7: Cleanup
  console.log()
  console.log('-'.repeat(70))
  console.log('STEP 7: Cleanup test data')
  console.log('-'.repeat(70))

  try {
    const prospDocs = await db.collection('organizations').doc(testOrgId).collection('autopilotProspects').get()
    const batch2 = db.batch()
    prospDocs.forEach(doc => batch2.delete(doc.ref))
    batch2.delete(db.collection('organizations').doc(testOrgId).collection('autoPilotConfig').doc('main'))
    await batch2.commit()
    await db.collection('organizations').doc(testOrgId).delete().catch(() => {})
    console.log('  Cleanup OK')
    stepResults.cleanup = { success: true }
  } catch (e) {
    console.log(`  Cleanup warning: ${e.message}`)
    stepResults.cleanup = { success: false, error: e.message }
  }

  // SUMMARY
  console.log()
  console.log('='.repeat(70))
  console.log('  WORKFLOW TEST SUMMARY')
  console.log('='.repeat(70))
  console.log()

  const steps = [
    { name: 'Config Save', result: stepResults.configSave },
    { name: 'Prospect Generation', result: stepResults.prospectGeneration },
    { name: 'Dashboard Retrieval', result: stepResults.dashboardRetrieval },
    { name: 'Status Updates', result: stepResults.statusUpdates },
    { name: 'Stats Computation', result: stepResults.statsComputation },
    { name: 'Real Org Check', result: stepResults.realOrgCheck }
  ]

  let passCount = 0
  for (const step of steps) {
    const ok = step.result?.success
    if (ok) passCount++
    console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${step.name}`)
  }

  const allPassed = passCount === steps.length
  const verdict = allPassed ? 'BIJOU' : passCount >= 4 ? 'DIAMANT_BRUT' : passCount >= 2 ? 'CAILLOU' : 'CASSE'

  console.log()
  console.log(`  Steps passed: ${passCount}/${steps.length}`)
  console.log(`  VERDICT: ${verdict}`)
  console.log()
  console.log('='.repeat(70))

  const report = {
    timestamp: new Date().toISOString(),
    success: allPassed,
    testOrgId,
    verdict,
    stepResults,
    passCount,
    totalSteps: steps.length
  }

  writeFileSync(resolve(__dirname, '../test-results-workflow.json'), JSON.stringify(report, null, 2))
  console.log('\nResults saved to test-results-workflow.json')

  process.exit(allPassed ? 0 : 1)
}

testFullWorkflow().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
