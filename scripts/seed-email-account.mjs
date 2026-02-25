/**
 * Seed emailAccount pour l'organisation de production
 * Usage: node scripts/seed-email-account.mjs
 *
 * Prerequis: GOOGLE_APPLICATION_CREDENTIALS ou emulateur Firebase
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ORG_ID = 'IGtZSfpd8eyoIzn6W0ba'

// Init Firebase Admin
const useEmulator = process.env.FIRESTORE_EMULATOR_HOST
if (useEmulator) {
  console.log(`Mode emulateur: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  initializeApp({ projectId: 'demo-project' })
} else {
  initializeApp({ credential: applicationDefault() })
}

const db = getFirestore()

async function seedEmailAccount() {
  const accountRef = db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('emailAccounts')
    .doc('main')

  const existing = await accountRef.get()
  if (existing.exists) {
    console.log('emailAccount "main" existe deja:', existing.data())
    console.log('Mise a jour...')
  }

  await accountRef.set({
    email: 'onboarding@resend.dev',
    displayName: 'Faical de Face Media',
    provider: 'resend',
    status: 'active',
    warmupDay: 31,
    dailyLimit: 100,
    sentToday: 0,
    createdAt: existing.exists ? existing.data().createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true })

  console.log(`emailAccount seeded pour org ${ORG_ID}`)

  // Verification
  const check = await accountRef.get()
  console.log('Verification:', check.data())
}

seedEmailAccount()
  .then(() => {
    console.log('Done.')
    process.exit(0)
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
