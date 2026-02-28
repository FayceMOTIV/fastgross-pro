/**
 * Migration: Ajouter les parametres leadFactory a toutes les organisations
 * Usage: node scripts/migrations/addLeadFactorySettings.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialiser Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (serviceAccountPath) {
  const { default: serviceAccount } = await import(serviceAccountPath, { assert: { type: 'json' } })
  initializeApp({ credential: cert(serviceAccount) })
} else {
  initializeApp()
}

const db = getFirestore()

const DEFAULT_LEAD_FACTORY = {
  threshold: 50,
  autoRefill: true,
  queries: ['restaurant', 'salon coiffure', 'agence immobiliere', 'commerce'],
  locations: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse'],
  minRating: 3.5,
  minReviews: 5,
}

async function migrate() {
  console.log('--- Migration: addLeadFactorySettings ---')

  const orgsSnap = await db.collection('organizations').get()
  console.log(`Found ${orgsSnap.size} organizations`)

  let updated = 0
  let skipped = 0

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data()

    if (orgData.leadFactory) {
      console.log(`  [SKIP] ${orgDoc.id} — leadFactory already configured`)
      skipped++
      continue
    }

    await db.collection('organizations').doc(orgDoc.id).update({
      leadFactory: DEFAULT_LEAD_FACTORY,
    })

    console.log(`  [OK] ${orgDoc.id} — leadFactory defaults added`)
    updated++
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`)
}

migrate().catch(console.error)
