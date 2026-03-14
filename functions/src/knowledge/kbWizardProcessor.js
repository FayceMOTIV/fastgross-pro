/**
 * kbWizardProcessor — Transforme les reponses du wizard KB en documents indexes
 * Chaque section = 1 document KB passe dans le pipeline chunk + embed + store
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

const SECTION_TYPES = {
  services: { title: 'Services et produits', type: 'services' },
  pricing: { title: 'Tarifs et forfaits', type: 'pricing' },
  process: { title: 'Processus de travail', type: 'process' },
  faq: { title: 'Questions frequentes', type: 'faq' },
  competitors: { title: 'Analyse concurrentielle', type: 'competitor' },
  tone: { title: 'Ton de voix et style', type: 'tone' },
}

// Chunking simple (400 mots, 50 overlap) — compatible avec kbIndexer
const CHUNK_SIZE = 400
const CHUNK_OVERLAP = 50

function chunkText(text) {
  const words = text.split(/\s+/)
  if (words.length <= CHUNK_SIZE) return [text]

  const chunks = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE, words.length)
    chunks.push(words.slice(start, end).join(' '))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set, skipping embedding')
    return null
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
      }
    )

    const data = await response.json()
    return data?.embedding?.values || null
  } catch (err) {
    logger.error('Embedding generation failed:', err.message)
    return null
  }
}

/**
 * Callable: traite les reponses du wizard et les indexe dans la KB
 */
export const processKBWizard = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, answers } = request.data || {}

    if (!orgId || !answers || typeof answers !== 'object') {
      throw new HttpsError('invalid-argument', 'orgId and answers are required')
    }

    await verifyOrgMembership(request.auth.uid, orgId)

    const uid = request.auth.uid
    const sections = Object.entries(answers).filter(([, content]) => content?.trim())

    if (sections.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one section must be filled')
    }

    let totalChunks = 0
    let totalDocs = 0

    for (const [sectionId, content] of sections) {
      const sectionConfig = SECTION_TYPES[sectionId]
      if (!sectionConfig) continue

      const docId = `wizard-${sectionId}-${Date.now()}`
      const chunks = chunkText(content.trim())

      // Supprimer anciens chunks wizard pour cette section
      try {
        const oldChunks = await getDb()
          .collection('organizations').doc(orgId)
          .collection('kb')
          .where('source', '==', 'wizard')
          .where('type', '==', sectionConfig.type)
          .get()

        if (!oldChunks.empty) {
          const batch = getDb().batch()
          oldChunks.docs.forEach((doc) => batch.delete(doc.ref))
          await batch.commit()
          logger.info(`Deleted ${oldChunks.size} old wizard chunks for ${sectionId}`)
        }
      } catch (err) {
        logger.warn(`Could not clean old chunks for ${sectionId}:`, err.message)
      }

      // Indexer les nouveaux chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = await generateEmbedding(chunk)

        const chunkDoc = {
          parentDocId: docId,
          title: sectionConfig.title,
          type: sectionConfig.type,
          source: 'wizard',
          content: chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
          createdAt: FieldValue.serverTimestamp(),
          createdBy: uid,
        }

        if (embedding) {
          chunkDoc.embedding = FieldValue.vector(embedding)
        }

        await getDb()
          .collection('organizations').doc(orgId)
          .collection('kb')
          .doc(`${docId}-chunk-${i}`)
          .set(chunkDoc)

        totalChunks++
      }

      totalDocs++
      logger.info(`Indexed KB wizard section: ${sectionId} (${chunks.length} chunks)`)
    }

    logger.info(`KB Wizard complete for org ${orgId}: ${totalDocs} docs, ${totalChunks} chunks`)

    return {
      success: true,
      documentsIndexed: totalDocs,
      chunksCreated: totalChunks,
    }
  }
)
