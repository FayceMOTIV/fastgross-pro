/**
 * A/B Testing Engine — Intent Hunter
 *
 * Tests A/B automatiques sur les templates de messages.
 * Algorithme multi-armed bandit epsilon-greedy (epsilon=0.2) :
 *   - 20% du temps → exploration (variante aleatoire)
 *   - 80% du temps → exploitation (meilleure variante connue)
 *
 * Declaration du winner apres 50 envois minimum par variante.
 *
 * Ce module est specifique a Intent Hunter.
 * L'A/B testing existant dans engine/abTesting.js reste intact.
 *
 * Collection Firestore : abTests/{testId}
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const EPSILON = 0.2           // 20% exploration
const MIN_SAMPLE_SIZE = 50    // Min envois par variante avant declaration winner
const P_VALUE_THRESHOLD = 0.05 // Seuil de significativite statistique

// ============================================
// CREATE / MANAGE TESTS
// ============================================

/**
 * Cree un nouveau test A/B pour un segment
 * @param {string} clientId
 * @param {string} segment - Ex: 'restauration_linkedin_first_contact'
 * @param {Array<{ id: string, template: string }>} variants
 * @returns {Promise<string>} testId
 */
export async function createABTest(clientId, segment, variants) {
  const db = getDb()

  const testData = {
    clientId,
    segment,
    variants: variants.map(v => ({
      id: v.id,
      template: v.template,
      sent: 0,
      opens: 0,
      replies: 0,
      rate: 0
    })),
    winner: null,
    minSampleSize: MIN_SAMPLE_SIZE,
    status: 'running',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }

  const ref = await db.collection('abTests').add(testData)
  return ref.id
}

// ============================================
// VARIANT SELECTION (epsilon-greedy)
// ============================================

/**
 * Selectionne la variante a utiliser pour un lead
 * @param {string} clientId
 * @param {string} segment
 * @returns {Promise<{ testId: string, variantId: string, template: string }|null>}
 */
export async function getVariantForLead(clientId, segment) {
  const db = getDb()

  // Chercher un test actif pour ce segment
  const snapshot = await db.collection('abTests')
    .where('clientId', '==', clientId)
    .where('segment', '==', segment)
    .where('status', '==', 'running')
    .limit(1)
    .get()

  if (snapshot.empty) return null

  const testDoc = snapshot.docs[0]
  const test = testDoc.data()
  const { variants } = test

  if (!variants || variants.length === 0) return null

  let selectedVariant

  // Epsilon-greedy : exploration vs exploitation
  if (Math.random() < EPSILON) {
    // Exploration : variante aleatoire
    selectedVariant = variants[Math.floor(Math.random() * variants.length)]
  } else {
    // Exploitation : meilleure variante par taux de reponse
    selectedVariant = variants.reduce((best, v) =>
      (v.rate > best.rate || (v.rate === best.rate && v.sent < best.sent)) ? v : best
    , variants[0])
  }

  return {
    testId: testDoc.id,
    variantId: selectedVariant.id,
    template: selectedVariant.template
  }
}

// ============================================
// RECORD OUTCOMES
// ============================================

/**
 * Enregistre le resultat d'un envoi
 * @param {string} testId
 * @param {string} variantId
 * @param {'sent'|'opened'|'replied'} outcome
 */
export async function recordOutcome(testId, variantId, outcome) {
  const db = getDb()
  const ref = db.collection('abTests').doc(testId)

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref)
    if (!doc.exists) return

    const test = doc.data()
    const variants = test.variants.map(v => {
      if (v.id !== variantId) return v

      const updated = { ...v }
      if (outcome === 'sent') updated.sent++
      if (outcome === 'opened') updated.opens++
      if (outcome === 'replied') updated.replies++

      // Recalculer le taux de reponse
      updated.rate = updated.sent > 0 ? updated.replies / updated.sent : 0

      return updated
    })

    transaction.update(ref, { variants, updatedAt: Timestamp.now() })
  })
}

// ============================================
// EVALUATE TEST
// ============================================

/**
 * Evalue si un test peut etre conclu (winner declare)
 * Utilise un test Z simplifie pour la significativite statistique
 *
 * @param {string} testId
 * @returns {Promise<{ concluded: boolean, winner?: string }>}
 */
export async function evaluateTest(testId) {
  const db = getDb()
  const ref = db.collection('abTests').doc(testId)
  const doc = await ref.get()

  if (!doc.exists) return { concluded: false }

  const test = doc.data()
  const { variants } = test

  // Verifier le sample size minimum
  const allAboveMin = variants.every(v => v.sent >= MIN_SAMPLE_SIZE)
  if (!allAboveMin) return { concluded: false, reason: 'insufficient_sample' }

  // Trouver les deux meilleures variantes
  const sorted = [...variants].sort((a, b) => b.rate - a.rate)
  const best = sorted[0]
  const second = sorted[1]

  if (!second) {
    // Une seule variante — pas de test possible
    return { concluded: false, reason: 'single_variant' }
  }

  // Test Z simplifie
  const pBest = best.rate
  const pSecond = second.rate
  const nBest = best.sent
  const nSecond = second.sent

  const pooledP = (best.replies + second.replies) / (nBest + nSecond)
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / nBest + 1 / nSecond))

  if (se === 0) return { concluded: false, reason: 'zero_variance' }

  const zScore = (pBest - pSecond) / se
  const pValue = 1 - normalCDF(Math.abs(zScore))

  if (pValue < P_VALUE_THRESHOLD) {
    // Significatif — declarer le winner
    await ref.update({
      winner: best.id,
      status: 'concluded',
      concludedAt: Timestamp.now(),
      pValue,
      zScore
    })

    console.log(JSON.stringify({
      function: 'abTestingEngine.evaluateTest',
      step: 'winner_declared',
      testId,
      winner: best.id,
      winnerRate: (pBest * 100).toFixed(1) + '%',
      pValue: pValue.toFixed(4)
    }))

    return { concluded: true, winner: best.id, pValue }
  }

  return { concluded: false, reason: 'not_significant', pValue }
}

/**
 * Approximation CDF normale standard
 */
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327
  const p = d * Math.exp(-x * x / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Retourne le meilleur template actuel pour un segment
 * @param {string} clientId
 * @param {string} segment
 * @returns {Promise<string|null>} Template gagnant ou null
 */
export async function getWinningTemplate(clientId, segment) {
  const db = getDb()

  // D'abord chercher un test conclu
  const concluded = await db.collection('abTests')
    .where('clientId', '==', clientId)
    .where('segment', '==', segment)
    .where('status', '==', 'concluded')
    .orderBy('concludedAt', 'desc')
    .limit(1)
    .get()

  if (!concluded.empty) {
    const test = concluded.docs[0].data()
    const winner = test.variants.find(v => v.id === test.winner)
    return winner?.template || null
  }

  return null
}

/**
 * Retourne les stats A/B d'un client
 * @param {string} clientId
 * @returns {Promise<Object>}
 */
export async function getABTestStats(clientId) {
  const db = getDb()

  const running = await db.collection('abTests')
    .where('clientId', '==', clientId)
    .where('status', '==', 'running')
    .get()

  const concluded = await db.collection('abTests')
    .where('clientId', '==', clientId)
    .where('status', '==', 'concluded')
    .get()

  return {
    runningTests: running.size,
    concludedTests: concluded.size,
    running: running.docs.map(d => ({
      id: d.id,
      segment: d.data().segment,
      variants: d.data().variants.map(v => ({
        id: v.id,
        sent: v.sent,
        replies: v.replies,
        rate: (v.rate * 100).toFixed(1) + '%'
      }))
    })),
    concluded: concluded.docs.map(d => ({
      id: d.id,
      segment: d.data().segment,
      winner: d.data().winner,
      pValue: d.data().pValue
    }))
  }
}
