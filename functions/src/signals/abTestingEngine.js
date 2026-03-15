/**
 * A/B Testing Engine — Thompson Sampling
 * Face Media Factory v5
 *
 * Generates message variants via Groq, selects the best performer
 * using Thompson Sampling (Beta distribution), and auto-concludes
 * tests when a winner is statistically clear.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Groq from 'groq-sdk'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

// ── Configuration ────────────────────────────────────────────────
const MIN_SAMPLE_SIZE = 50
const WINNER_LIFT_THRESHOLD = 0.20 // 20% above average to declare winner
const VARIANT_STYLES = ['direct', 'curiosity', 'social_proof']

// ── Groq client (lazy) ──────────────────────────────────────────
let groqClient = null
function getGroq() {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

// ── Private helpers: Beta / Gamma sampling ──────────────────────

/**
 * Marsaglia-Tsang method for Gamma(a, 1) where a >= 1.
 * Returns a single sample from Gamma(alpha, 1).
 */
function gammaSample(alpha) {
  if (alpha < 1) {
    // Boost: Gamma(alpha, 1) = Gamma(alpha+1, 1) * U^(1/alpha)
    const u = Math.random()
    return gammaSample(alpha + 1) * Math.pow(u, 1 / alpha)
  }

  const d = alpha - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x, v
    do {
      x = randn()
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = Math.random()

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/**
 * Standard normal sample via Box-Muller.
 */
function randn() {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Sample from Beta(alpha, beta) using two Gamma samples.
 */
function betaSample(alpha, beta) {
  const x = gammaSample(alpha)
  const y = gammaSample(beta)
  return x / (x + y)
}

// ── Variant generation via Groq ─────────────────────────────────

/**
 * Generates 3 A/B variants (direct, curiosity, social_proof)
 * for a given niche + channel combination.
 *
 * @param {string} niche       - Business niche (e.g. "restaurant", "immobilier")
 * @param {string} channel     - Outreach channel (email, sms, whatsapp, instagram, linkedin)
 * @param {object} icpContext  - ICP context { sector, painPoints, tone, language }
 * @returns {Promise<Array<{id: string, style: string, subject: string, body: string}>>}
 */
export async function generateABVariants(niche, channel, icpContext = {}) {
  const groq = getGroq()

  const prompt = `Tu es un expert en copywriting B2B multicanal.

CONTEXTE :
- Niche : ${niche}
- Canal : ${channel}
- Secteur : ${icpContext.sector || niche}
- Points de douleur : ${icpContext.painPoints || 'non specifies'}
- Ton : ${icpContext.tone || 'professionnel'}
- Langue : ${icpContext.language || 'francais'}

GENERE 3 VARIANTES de messages de prospection pour le canal ${channel}.
Chaque variante a un style different :

1. "direct" — va droit au but, proposition de valeur claire
2. "curiosity" — question ouverte, suscite la curiosite
3. "social_proof" — preuve sociale, resultats chiffres, temoignages

Pour chaque variante, fournis :
- subject : objet du message (pour email) ou premiere ligne (pour sms/whatsapp/instagram/linkedin)
- body : corps du message (2-4 phrases max)

FORMAT JSON strict :
{
  "variants": [
    { "style": "direct", "subject": "...", "body": "..." },
    { "style": "curiosity", "subject": "...", "body": "..." },
    { "style": "social_proof", "subject": "...", "body": "..." }
  ]
}

REPONSE :`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  })

  const parsed = safeParseLLMJson(completion.choices[0].message.content)
  const variants = (parsed.variants || []).map((v, i) => ({
    id: `variant_${i}`,
    style: v.style || VARIANT_STYLES[i],
    subject: v.subject,
    body: v.body,
  }))

  return variants
}

// ── A/B Test CRUD ───────────────────────────────────────────────

/**
 * Creates a new A/B test in Firestore.
 * Skips creation if an active test already exists for the same (userId, niche, channel).
 *
 * @param {string} userId     - Organization or user ID
 * @param {string} niche      - Niche key
 * @param {string} channel    - Channel key
 * @param {object} icpContext - ICP context for variant generation
 * @returns {Promise<{id: string, variants: Array, status: string}>}
 */
export async function createABTest(userId, niche, channel, icpContext = {}) {
  const db = getDb()
  const col = db.collection(`organizations/${userId}/abTests`)

  // Check for an existing active test on the same niche + channel
  const existing = await col
    .where('niche', '==', niche)
    .where('channel', '==', channel)
    .where('status', '==', 'running')
    .limit(1)
    .get()

  if (!existing.empty) {
    const doc = existing.docs[0]
    return { id: doc.id, ...doc.data(), alreadyExists: true }
  }

  // Generate fresh variants
  const variants = await generateABVariants(niche, channel, icpContext)

  // Initialize each variant with Thompson Sampling priors (Beta(1,1) = uniform)
  const enrichedVariants = variants.map((v) => ({
    ...v,
    sent: 0,
    replied: 0,
    interested: 0,
    alpha: 1, // successes + 1 (prior)
    beta: 1,  // failures + 1  (prior)
  }))

  const test = {
    userId,
    niche,
    channel,
    status: 'running',
    variants: enrichedVariants,
    minSampleSize: MIN_SAMPLE_SIZE,
    winnerLiftThreshold: WINNER_LIFT_THRESHOLD,
    winner: null,
    concludedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const ref = await col.add(test)
  return { id: ref.id, ...test, alreadyExists: false }
}

// ── Thompson Sampling selection ─────────────────────────────────

/**
 * Selects the best variant using Thompson Sampling.
 * Draws a sample from each variant's Beta(alpha, beta) distribution
 * and returns the variant with the highest sample.
 *
 * @param {Array} variants - Array of variant objects with {alpha, beta, ...}
 * @returns {object} The selected variant
 */
export function selectVariantThompson(variants) {
  if (!variants || variants.length === 0) {
    throw new Error('No variants provided for Thompson Sampling')
  }

  let bestSample = -1
  let bestVariant = variants[0]

  for (const variant of variants) {
    const a = variant.alpha || 1
    const b = variant.beta || 1
    const sample = betaSample(a, b)

    if (sample > bestSample) {
      bestSample = sample
      bestVariant = variant
    }
  }

  return { ...bestVariant, _thompsonSample: bestSample }
}

// ── Record results ──────────────────────────────────────────────

/**
 * Records an A/B test result for a specific variant (transaction-safe).
 * After recording, checks whether the test can be concluded.
 *
 * @param {string} testId      - Firestore document ID of the test
 * @param {string} variantId   - Variant ID within the test (e.g. "variant_0")
 * @param {boolean} replied    - Whether the prospect replied
 * @param {boolean} interested - Whether the reply was positive/interested
 * @returns {Promise<{success: boolean, concluded: boolean, winner: string|null}>}
 */
export async function recordABTestResult(testId, variantId, replied = false, interested = false) {
  const db = getDb()

  // Find the test document across all orgs (testId is globally unique)
  // We use a collectionGroup query
  const snap = await db.collectionGroup('abTests').where('__name__', '==', testId).limit(1).get()

  // If collectionGroup does not match by __name__, fallback: caller must provide orgId context
  // For safety, we scan by testId with a broader approach
  let testRef = null
  let testData = null

  if (!snap.empty) {
    testRef = snap.docs[0].ref
    testData = snap.docs[0].data()
  } else {
    // Try to find by iterating (should rarely happen)
    const allOrgs = await db.collection('organizations').select().get()
    for (const orgDoc of allOrgs.docs) {
      const ref = db.doc(`organizations/${orgDoc.id}/abTests/${testId}`)
      const doc = await ref.get()
      if (doc.exists) {
        testRef = ref
        testData = doc.data()
        break
      }
    }
  }

  if (!testRef || !testData) {
    return { success: false, error: 'Test not found' }
  }

  if (testData.status !== 'running') {
    return { success: false, error: 'Test already concluded' }
  }

  // Transaction: update variant stats
  let concluded = false
  let winner = null

  await db.runTransaction(async (transaction) => {
    const freshDoc = await transaction.get(testRef)
    const fresh = freshDoc.data()
    const variants = [...fresh.variants]

    const idx = variants.findIndex((v) => v.id === variantId)
    if (idx === -1) return

    variants[idx] = {
      ...variants[idx],
      sent: (variants[idx].sent || 0) + 1,
      replied: (variants[idx].replied || 0) + (replied ? 1 : 0),
      interested: (variants[idx].interested || 0) + (interested ? 1 : 0),
      // Thompson Sampling: alpha = successes + 1, beta = failures + 1
      alpha: (variants[idx].alpha || 1) + (replied ? 1 : 0),
      beta: (variants[idx].beta || 1) + (replied ? 0 : 1),
    }

    const updates = {
      variants,
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Check if test can be concluded
    const allAboveMin = variants.every((v) => (v.sent || 0) >= fresh.minSampleSize)
    if (allAboveMin) {
      const replyRates = variants.map((v) => {
        const sent = v.sent || 1
        return { id: v.id, rate: (v.replied || 0) / sent }
      })

      const avgRate = replyRates.reduce((sum, r) => sum + r.rate, 0) / replyRates.length
      const threshold = fresh.winnerLiftThreshold || WINNER_LIFT_THRESHOLD

      // Winner must be at least threshold% above the average
      const potentialWinner = replyRates.reduce((best, r) => (r.rate > best.rate ? r : best), replyRates[0])

      if (avgRate > 0 && potentialWinner.rate >= avgRate * (1 + threshold)) {
        updates.status = 'concluded'
        updates.winner = potentialWinner.id
        updates.concludedAt = FieldValue.serverTimestamp()
        concluded = true
        winner = potentialWinner.id
      }
    }

    transaction.update(testRef, updates)
  })

  return { success: true, concluded, winner }
}

// ── Get variant for a lead ──────────────────────────────────────

/**
 * Returns the best variant for a given lead context.
 * If a winner has been declared, returns the winner.
 * Otherwise, uses Thompson Sampling.
 *
 * @param {string} userId  - Organization ID
 * @param {string} niche   - Niche key
 * @param {string} channel - Channel key
 * @returns {Promise<{variant: object, source: string}|null>}
 */
export async function getVariantForLead(userId, niche, channel) {
  const db = getDb()
  const col = db.collection(`organizations/${userId}/abTests`)

  // Look for a concluded test with a winner first
  const concludedSnap = await col
    .where('niche', '==', niche)
    .where('channel', '==', channel)
    .where('status', '==', 'concluded')
    .orderBy('concludedAt', 'desc')
    .limit(1)
    .get()

  if (!concludedSnap.empty) {
    const test = concludedSnap.docs[0].data()
    const winnerVariant = test.variants.find((v) => v.id === test.winner)
    if (winnerVariant) {
      return {
        variant: winnerVariant,
        source: 'winner',
        testId: concludedSnap.docs[0].id,
      }
    }
  }

  // Look for an active running test
  const activeSnap = await col
    .where('niche', '==', niche)
    .where('channel', '==', channel)
    .where('status', '==', 'running')
    .limit(1)
    .get()

  if (!activeSnap.empty) {
    const test = activeSnap.docs[0].data()
    const selected = selectVariantThompson(test.variants)
    return {
      variant: selected,
      source: 'thompson_sampling',
      testId: activeSnap.docs[0].id,
    }
  }

  // No test found for this combination
  return null
}

// ── Dashboard stats ─────────────────────────────────────────────

/**
 * Returns A/B test stats for the dashboard.
 *
 * @param {string} userId - Organization ID
 * @param {string} niche  - Optional niche filter
 * @returns {Promise<{active: Array, concluded: Array, totalTests: number}>}
 */
export async function getABTestStats(userId, niche = null) {
  const db = getDb()
  let query = db.collection(`organizations/${userId}/abTests`)
    .orderBy('createdAt', 'desc')
    .limit(50)

  if (niche) {
    query = db.collection(`organizations/${userId}/abTests`)
      .where('niche', '==', niche)
      .orderBy('createdAt', 'desc')
      .limit(50)
  }

  const snap = await query.get()

  const active = []
  const concluded = []

  for (const doc of snap.docs) {
    const data = { id: doc.id, ...doc.data() }

    // Compute per-variant reply rates
    const variantsWithStats = (data.variants || []).map((v) => {
      const sent = v.sent || 0
      const replied = v.replied || 0
      const interested = v.interested || 0
      return {
        ...v,
        replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0.0',
        interestRate: sent > 0 ? ((interested / sent) * 100).toFixed(1) : '0.0',
      }
    })

    const enriched = { ...data, variants: variantsWithStats }

    if (data.status === 'running') {
      active.push(enriched)
    } else {
      concluded.push(enriched)
    }
  }

  return {
    active,
    concluded,
    totalTests: snap.size,
    activeCount: active.length,
    concludedCount: concluded.length,
  }
}
