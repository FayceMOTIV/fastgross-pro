#!/usr/bin/env node

/**
 * Test Firestore Access + AutoPilot Workflow
 * Run from functions/ directory
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

let app
try {
  app = initializeApp({ projectId: 'face-media-factory' })
} catch (e) {
  // Already initialized
}

const db = getFirestore()

async function testFirestore() {
  console.log('='.repeat(60))
  console.log('  FIRESTORE & AUTOPILOT WORKFLOW TEST')
  console.log('='.repeat(60))
  console.log()

  const results = {}

  // ---- Test 1: Read Access ----
  console.log('-'.repeat(60))
  console.log('TEST 1: Read Access')
  console.log('-'.repeat(60))

  try {
    const orgsSnapshot = await db.collection('organizations').limit(5).get()
    console.log(`  organizations: ${orgsSnapshot.size} docs found`)
    results.readOrganizations = { success: true, count: orgsSnapshot.size }

    if (orgsSnapshot.size > 0) {
      orgsSnapshot.forEach(doc => {
        console.log(`    - ${doc.id}: ${doc.data().name || doc.data().companyName || '(unnamed)'}`)
      })
    }
  } catch (error) {
    console.log(`  organizations: FAILED - ${error.message}`)
    results.readOrganizations = { success: false, error: error.message }
  }

  try {
    const usersSnapshot = await db.collection('users').limit(3).get()
    console.log(`  users: ${usersSnapshot.size} docs found`)
    results.readUsers = { success: true, count: usersSnapshot.size }
  } catch (error) {
    console.log(`  users: FAILED - ${error.message}`)
    results.readUsers = { success: false, error: error.message }
  }

  // ---- Test 2: Write Access ----
  console.log()
  console.log('-'.repeat(60))
  console.log('TEST 2: Write Access')
  console.log('-'.repeat(60))

  const testDocRef = db.collection('_test_autopilot').doc('connection-test')
  try {
    await testDocRef.set({
      tested: true,
      timestamp: FieldValue.serverTimestamp(),
      agent: 'claude-code-test'
    })
    console.log('  Write: OK')

    const readBack = await testDocRef.get()
    console.log(`  Read-back: OK (tested=${readBack.data()?.tested})`)

    await testDocRef.delete()
    console.log('  Cleanup: OK')
    results.writeAccess = { success: true }
  } catch (error) {
    console.log(`  Write: FAILED - ${error.message}`)
    results.writeAccess = { success: false, error: error.message }
  }

  // ---- Test 3: AutoPilot Workflow Simulation ----
  console.log()
  console.log('-'.repeat(60))
  console.log('TEST 3: AutoPilot Workflow Simulation')
  console.log('-'.repeat(60))

  const testOrgId = 'test-org-' + Date.now()
  const config = {
    companyName: "Face Media Factory",
    companyService: "Creation de contenu video professionnel",
    uniqueValue: "Videos virales qui convertissent en clients reels",
    provenResults: "+300% engagement Instagram"
  }

  const mockProspects = [
    {
      name: "Bistrot des Amis",
      score: 92,
      matchReason: "Nouveau restaurant, 2.1K followers, budget marketing",
      contact: { email: "test@bistrotdesamis.fr", instagram: "@bistrotdesamis" },
      signals: ["Ouverture recente", "< 5K followers", "Posts irreguliers"],
      hooks: [
        "J'ai remarque votre Bistrot des Amis recemment ouvert.",
        "Vos 2.1K followers montrent un potentiel enorme.",
        "Et si on automatisait votre creation de contenu ?"
      ],
      status: 'pending'
    },
    {
      name: "Chef Claire - Food Blogger",
      score: 88,
      matchReason: "Food blogger active, 11.5K followers, cherche croissance",
      contact: { email: "claire@chefclaire.com", instagram: "@chefclaireofficial" },
      signals: ["Croissance stagnante", "Cherche partenariats"],
      hooks: [
        "Claire, la video courte pourrait vous faire exploser sur Reels.",
        "Avec vos 11.5K followers, des videos pros attireraient des marques."
      ],
      status: 'pending'
    },
    {
      name: "La Petite Boulangerie",
      score: 75,
      matchReason: "Boulangerie artisanale, 3.8K followers, contenu faible",
      contact: { email: "hello@petiteboulangerie.fr", instagram: "@lapetiteboulangerie" },
      signals: ["Artisanal", "Contenu rare", "Potentiel visuel fort"],
      hooks: [
        "Votre boulangerie a un potentiel Instagram incroyable.",
        "3.8K followers c'est bien - mais on peut faire x5."
      ],
      status: 'pending'
    }
  ]

  try {
    // Step 1: Save prospects
    console.log(`\n  Step 1: Saving ${mockProspects.length} prospects...`)
    const batch = db.batch()

    for (let i = 0; i < mockProspects.length; i++) {
      const docRef = db
        .collection('organizations')
        .doc(testOrgId)
        .collection('autopilotProspects')
        .doc(`prospect-${i}`)

      batch.set(docRef, {
        ...mockProspects[i],
        createdAt: FieldValue.serverTimestamp(),
        autopilotConfig: config
      })
    }

    await batch.commit()
    console.log(`  Saved ${mockProspects.length} prospects OK`)

    // Step 2: Verify
    console.log(`\n  Step 2: Verifying data...`)
    const snapshot = await db
      .collection('organizations')
      .doc(testOrgId)
      .collection('autopilotProspects')
      .get()

    console.log(`  Verified: ${snapshot.size} prospects in database`)
    snapshot.forEach(doc => {
      const data = doc.data()
      console.log(`    - ${data.name} (score: ${data.score})`)
    })

    // Step 3: Dashboard query
    console.log(`\n  Step 3: Dashboard query (score >= 80)...`)
    const hotProspects = await db
      .collection('organizations')
      .doc(testOrgId)
      .collection('autopilotProspects')
      .where('score', '>=', 80)
      .orderBy('score', 'desc')
      .get()

    console.log(`  Hot prospects: ${hotProspects.size}`)
    hotProspects.forEach(doc => {
      const data = doc.data()
      console.log(`    - ${data.name}: ${data.score}/100`)
    })

    // Step 4: Save config
    console.log(`\n  Step 4: Saving autopilot config...`)
    await db
      .collection('organizations')
      .doc(testOrgId)
      .collection('autoPilotConfig')
      .doc('main')
      .set({
        enabled: true,
        launchedAt: Timestamp.now(),
        companyProfile: config,
        stats: {
          totalProspects: mockProspects.length,
          totalContacted: 0,
          totalResponses: 0,
          totalMeetings: 0
        }
      })
    console.log('  Config saved OK')

    // Step 5: Verify config
    const configDoc = await db
      .collection('organizations')
      .doc(testOrgId)
      .collection('autoPilotConfig')
      .doc('main')
      .get()

    console.log(`  Config verified: enabled=${configDoc.data()?.enabled}, prospects=${configDoc.data()?.stats?.totalProspects}`)

    // Step 6: Cleanup
    console.log(`\n  Step 6: Cleaning up test data...`)
    const prospectsDocs = await db.collection('organizations').doc(testOrgId).collection('autopilotProspects').get()
    const cleanBatch = db.batch()
    prospectsDocs.forEach(doc => cleanBatch.delete(doc.ref))
    cleanBatch.delete(db.collection('organizations').doc(testOrgId).collection('autoPilotConfig').doc('main'))
    await cleanBatch.commit()
    // Also clean org doc if created
    await db.collection('organizations').doc(testOrgId).delete().catch(() => {})
    console.log('  Cleanup OK')

    results.autopilotWorkflow = {
      success: true,
      prospectsSaved: mockProspects.length,
      prospectsVerified: snapshot.size,
      hotProspects: hotProspects.size,
      configSaved: true
    }

  } catch (error) {
    console.log(`  FAILED - ${error.message}`)
    results.autopilotWorkflow = { success: false, error: error.message }
  }

  // ---- Test 4: Check existing orgs ----
  console.log()
  console.log('-'.repeat(60))
  console.log('TEST 4: Existing AutoPilot Data')
  console.log('-'.repeat(60))

  try {
    const orgs = await db.collection('organizations').get()
    let autopilotOrgs = 0

    for (const orgDoc of orgs.docs) {
      const configSnap = await db
        .collection('organizations')
        .doc(orgDoc.id)
        .collection('autoPilotConfig')
        .doc('main')
        .get()

      if (configSnap.exists) {
        autopilotOrgs++
        const data = configSnap.data()
        console.log(`  Org ${orgDoc.id}: autopilot=${data.enabled ? 'ENABLED' : 'DISABLED'}`)
      }
    }

    console.log(`  Total orgs with autopilot: ${autopilotOrgs}/${orgs.size}`)
    results.existingData = { success: true, totalOrgs: orgs.size, autopilotOrgs }
  } catch (error) {
    console.log(`  FAILED - ${error.message}`)
    results.existingData = { success: false, error: error.message }
  }

  // ---- Summary ----
  console.log()
  console.log('='.repeat(60))
  console.log('  SUMMARY')
  console.log('='.repeat(60))
  console.log()

  const tests = [
    { name: 'Read Access', result: results.readOrganizations },
    { name: 'Write Access', result: results.writeAccess },
    { name: 'AutoPilot Workflow', result: results.autopilotWorkflow },
    { name: 'Existing Data', result: results.existingData }
  ]

  let allPassed = true
  for (const test of tests) {
    const status = test.result?.success ? 'PASS' : 'FAIL'
    if (!test.result?.success) allPassed = false
    console.log(`  ${status}: ${test.name}`)
  }

  console.log()
  console.log(`  VERDICT: ${allPassed ? 'FIRESTORE & WORKFLOW OK!' : 'ISSUES DETECTED'}`)
  console.log()
  console.log('='.repeat(60))

  console.log('\nJSON_REPORT_START')
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), results, verdict: allPassed }, null, 2))
  console.log('JSON_REPORT_END')

  process.exit(allPassed ? 0 : 1)
}

testFirestore().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
