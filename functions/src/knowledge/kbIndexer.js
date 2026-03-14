/**
 * Knowledge Base Indexer
 * Chunks text, generates embeddings, stores in Firestore with vector field
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const CHUNK_SIZE = 400
const CHUNK_OVERLAP = 50

/**
 * Split text into overlapping chunks of ~CHUNK_SIZE tokens
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= chunkSize) {
    return [words.join(' ')]
  }

  const chunks = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length)
    chunks.push(words.slice(start, end).join(' '))
    start += chunkSize - overlap
  }

  return chunks
}

/**
 * Fetch URL content and extract text (basic HTML strip)
 */
async function fetchUrlContent(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'FaceMediaFactory-KB/1.0' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`)
  }

  const html = await response.text()

  // Basic HTML to text (strip tags, decode entities)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

/**
 * Generate embedding for a text using Google text-embedding-004
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
 * Cloud Function: Index a KB document
 * Accepts raw text or URL, chunks it, embeds, stores in Firestore
 */
export const indexKBDocument = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 300,
  memory: '512MiB',
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, text, url, title, type = 'document' } = data || {}

  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required')
  }

  if (!text && !url) {
    throw new HttpsError('invalid-argument', 'Either text or url is required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  try {
    // Get content
    let content = text || ''
    if (url) {
      content = await fetchUrlContent(url)
    }

    if (!content || content.length < 20) {
      throw new HttpsError('invalid-argument', 'Content too short (min 20 characters)')
    }

    // Chunk
    const chunks = chunkText(content)

    // Create parent document reference
    const db = getDb()
    const docId = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const kbCollection = db.collection('organizations').doc(orgId).collection('kb')

    // Process chunks in batches
    let indexed = 0
    const batchSize = 5

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize)

      const embeddings = await Promise.all(
        batchChunks.map((chunk) => generateEmbedding(chunk))
      )

      const batch = db.batch()

      batchChunks.forEach((chunk, j) => {
        const chunkRef = kbCollection.doc(`${docId}-chunk-${i + j}`)
        batch.set(chunkRef, {
          parentDocId: docId,
          title: title || url || 'Document sans titre',
          type,
          content: chunk,
          chunkIndex: i + j,
          totalChunks: chunks.length,
          embedding: FieldValue.vector(embeddings[j]),
          sourceUrl: url || null,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: auth.uid,
        })
      })

      await batch.commit()
      indexed += batchChunks.length
    }

    return {
      success: true,
      docId,
      chunksCreated: indexed,
      totalChunks: chunks.length,
      message: `${indexed} chunks indexes avec succes`,
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', `Indexing failed: ${error.message}`)
  }
})

/**
 * Cloud Function: Delete a KB document (all chunks)
 */
export const deleteKBDocument = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
}, async (request) => {
  const { auth, data } = request

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const { orgId, docId } = data || {}
  if (!orgId || !docId) {
    throw new HttpsError('invalid-argument', 'orgId and docId are required')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()
  const kbRef = db.collection('organizations').doc(orgId).collection('kb')
  const snapshot = await kbRef.where('parentDocId', '==', docId).get()

  if (snapshot.empty) {
    return { success: true, deleted: 0 }
  }

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  return { success: true, deleted: snapshot.size }
})
