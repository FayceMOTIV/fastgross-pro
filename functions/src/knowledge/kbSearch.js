/**
 * Knowledge Base Search
 * Vector search using Firestore findNearest
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { GoogleGenerativeAI } from '@google/generative-ai'

const getDb = () => getFirestore()

/**
 * Generate embedding for search query
 */
async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  })
  return result.embedding.values
}

/**
 * Search KB using vector similarity
 */
export async function searchKnowledgeBase(orgId, queryText, limit = 5, minScore = 0.6) {
  const db = getDb()
  const queryEmbedding = await generateEmbedding(queryText)

  const kbRef = db.collection('organizations').doc(orgId).collection('kb')

  // Fetch candidates, then compute exact cosine similarity for filtering
  const results = await kbRef
    .findNearest('embedding', FieldValue.vector(queryEmbedding), {
      limit,
      distanceMeasure: 'COSINE',
    })
    .get()

  // Compute actual cosine similarity against query embedding
  function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  const chunks = results.docs.map((doc) => {
    const data = doc.data()
    const docEmbedding = data.embedding?.toArray?.() || data.embedding || []
    const score = docEmbedding.length > 0
      ? Math.round(cosineSimilarity(queryEmbedding, docEmbedding) * 100) / 100
      : 0
    return {
      id: doc.id,
      content: data.content,
      title: data.title,
      type: data.type,
      chunkIndex: data.chunkIndex,
      parentDocId: data.parentDocId,
      score,
    }
  }).filter((chunk) => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)

  const maxScore = chunks.length > 0 ? chunks[0].score : 0

  return {
    chunks,
    maxScore,
    hasRelevantResults: chunks.length > 0,
  }
}

/**
 * Cloud Function: Search KB
 */
export const searchKB = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 30,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, query: queryText, limit = 5 } = data || {}

  if (!orgId || !queryText) {
    throw new HttpsError('invalid-argument', 'orgId and query are required')
  }

  try {
    const results = await searchKnowledgeBase(orgId, queryText, limit)
    return { success: true, ...results }
  } catch (error) {
    throw new HttpsError('internal', `KB search failed: ${error.message}`)
  }
})
