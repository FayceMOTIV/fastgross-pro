/**
 * Seed multi-niches config pour l'organisation de production
 * Usage: node scripts/seed-niches.mjs
 *
 * Configure 5 niches dans autopilotConfig/settings
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const ORG_ID = 'IGtZSfpd8eyoIzn6W0ba'

const useEmulator = process.env.FIRESTORE_EMULATOR_HOST
if (useEmulator) {
  console.log(`Mode emulateur: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  initializeApp({ projectId: 'demo-project' })
} else {
  initializeApp({ credential: applicationDefault() })
}

const db = getFirestore()

const NICHES = [
  {
    name: 'emballage',
    keywords: ['fabricant emballage', 'fournisseur packaging', 'emballage alimentaire'],
    location: 'France'
  },
  {
    name: 'restauration',
    keywords: ['restaurant gastronomique', 'chef cuisinier', 'traiteur evenementiel'],
    location: 'Paris'
  },
  {
    name: 'agence_marketing',
    keywords: ['agence marketing digital', 'agence communication', 'agence web'],
    location: 'France'
  },
  {
    name: 'ecommerce',
    keywords: ['boutique en ligne', 'e-commerce mode', 'shop en ligne'],
    location: 'France'
  },
  {
    name: 'coiffeur',
    keywords: ['salon de coiffure', 'coiffeur visagiste', 'barbier'],
    location: 'Paris'
  }
]

async function seedNiches() {
  const configRef = db
    .collection('organizations')
    .doc(ORG_ID)
    .collection('autopilotConfig')
    .doc('settings')

  const existing = await configRef.get()
  const currentConfig = existing.exists ? existing.data() : {}

  await configRef.set({
    ...currentConfig,
    niches: NICHES,
    // Garder keywords/location pour backward compat
    keywords: currentConfig.keywords || ['video production', 'agence web'],
    location: currentConfig.location || 'France',
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true })

  console.log(`5 niches configurees pour org ${ORG_ID}:`)
  NICHES.forEach(n => console.log(`  - ${n.name}: ${n.keywords.join(', ')} (${n.location})`))

  // Verification
  const check = await configRef.get()
  console.log('\nConfig actuelle:', JSON.stringify(check.data().niches, null, 2))
}

seedNiches()
  .then(() => {
    console.log('Done.')
    process.exit(0)
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
