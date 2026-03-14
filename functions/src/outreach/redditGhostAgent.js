/**
 * Agent Fantome Reddit — Super Pouvoir 4 (Alex V4)
 * Genere des reponses utiles et naturelles aux posts Reddit,
 * avec validation obligatoire par l'utilisateur avant posting.
 *
 * Flow :
 *  1. Cherche des posts Reddit pertinents (Serper site:reddit.com)
 *  2. IA analyse le post et genere une reponse utile (pas de spam)
 *  3. Reponse mise en queue de validation (Firestore)
 *  4. User valide/edite/rejette dans le dashboard
 *  5. Si validee → instructions de posting fournies (Reddit ne permet pas le post via API sans OAuth)
 *
 * IMPORTANT : Pas de posting automatique. L'user doit copier-coller la reponse.
 * C'est un choix delibere pour :
 *  - Eviter le ban Reddit
 *  - Garder l'authenticite
 *  - Respecter les CGU Reddit
 *
 * Storage: organizations/{orgId}/redditDrafts/{draftId}
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()
const SERPER_URL = 'https://google.serper.dev/search'

// ─── Response styles ─────────────────────────────────────────────────

const RESPONSE_STYLES = {
  helpful: {
    label: 'Utile et informatif',
    instruction: 'Reponds de maniere utile et detaillee. Partage ton experience ou des conseils concrets. Ne mentionne AUCUNE marque ni produit specifique sauf si c\'est directement pertinent au contexte.',
  },
  experience: {
    label: 'Retour d\'experience',
    instruction: 'Reponds comme quelqu\'un qui a vecu la meme situation. Partage ton parcours, ce qui a fonctionne et ce qui n\'a pas marche. Sois authentique.',
  },
  expert: {
    label: 'Expert du domaine',
    instruction: 'Reponds avec l\'autorite d\'un expert du domaine. Cite des faits, des chiffres, des meilleures pratiques. Sois precis et technique.',
  },
  empathetic: {
    label: 'Empathique et solidaire',
    instruction: 'Reponds avec empathie. Reconnais la difficulte de la situation et propose des pistes de solution progressives.',
  },
}

// ─── Callable: find Reddit opportunities ─────────────────────────────

export const findRedditOpportunities = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, keywords, subreddits, maxResults } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  if (!keywords?.length) throw new HttpsError('invalid-argument', 'keywords requis (array)')

  const db = getDb()
  const results = await searchRedditPosts(keywords, subreddits, maxResults || 10)

  // Save found opportunities
  const batch = db.batch()
  const opportunities = []

  for (const post of results) {
    const ref = db.collection('organizations').doc(orgId).collection('redditOpportunities').doc()
    const opp = {
      title: post.title,
      url: post.link,
      snippet: post.snippet,
      subreddit: extractSubreddit(post.link),
      keyword: post.matchedKeyword,
      freshness: post.date || null,
      status: 'found',
      createdAt: FieldValue.serverTimestamp(),
    }
    batch.set(ref, opp)
    opportunities.push({ id: ref.id, ...opp })
  }

  await batch.commit()
  logger.info(`Reddit Ghost Agent: ${results.length} opportunites trouvees pour org ${orgId}`)
  return { success: true, opportunities, total: results.length }
})

// ─── Callable: generate draft response ───────────────────────────────

export const generateRedditDraft = onCall({
  region: 'europe-west1',
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, postUrl, postTitle, postContent, style, customContext } = request.data || {}
  if (!orgId || !postUrl) throw new HttpsError('invalid-argument', 'orgId et postUrl requis')

  const db = getDb()

  // Fetch post content if not provided
  let content = postContent
  let title = postTitle
  if (!content) {
    const fetched = await fetchRedditPost(postUrl)
    content = fetched.content || ''
    title = fetched.title || title || ''
  }

  if (!content && !title) throw new HttpsError('failed-precondition', 'Impossible de recuperer le contenu du post')

  // Get org context for subtle brand alignment
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const org = orgDoc.data() || {}
  const orgContext = org.activity || org.niche || ''

  // Generate response with AI
  const responseStyle = RESPONSE_STYLES[style] || RESPONSE_STYLES.helpful
  const draft = await generateResponse(title, content, responseStyle, orgContext, customContext)

  // Save draft for validation
  const draftRef = await db.collection('organizations').doc(orgId).collection('redditDrafts').add({
    postUrl,
    postTitle: title,
    postSnippet: content.substring(0, 300),
    subreddit: extractSubreddit(postUrl),
    draftContent: draft.response,
    style: style || 'helpful',
    styleLabel: responseStyle.label,
    status: 'pending_review',
    aiNotes: draft.notes,
    relevanceScore: draft.relevanceScore,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    reviewedAt: null,
    reviewedBy: null,
  })

  logger.info(`Reddit draft generated for org ${orgId}: ${draftRef.id}`)
  return {
    success: true,
    draftId: draftRef.id,
    draft: draft.response,
    notes: draft.notes,
    relevanceScore: draft.relevanceScore,
    postTitle: title,
    subreddit: extractSubreddit(postUrl),
  }
})

// ─── Callable: review draft (approve/edit/reject) ────────────────────

export const reviewRedditDraft = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, draftId, action, editedContent } = request.data || {}
  if (!orgId || !draftId || !action) throw new HttpsError('invalid-argument', 'orgId, draftId, action requis')

  const validActions = ['approve', 'edit', 'reject']
  if (!validActions.includes(action)) throw new HttpsError('invalid-argument', `Action invalide. Valides: ${validActions.join(', ')}`)

  const db = getDb()
  const ref = db.collection('organizations').doc(orgId).collection('redditDrafts').doc(draftId)
  const doc = await ref.get()
  if (!doc.exists) throw new HttpsError('not-found', 'Draft introuvable')

  const updateData = {
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: request.auth.uid,
  }

  if (action === 'approve') {
    updateData.status = 'approved'
    updateData.finalContent = doc.data().draftContent
  } else if (action === 'edit') {
    if (!editedContent) throw new HttpsError('invalid-argument', 'editedContent requis pour l\'action edit')
    updateData.status = 'approved'
    updateData.finalContent = editedContent
    updateData.wasEdited = true
  } else if (action === 'reject') {
    updateData.status = 'rejected'
  }

  await ref.update(updateData)

  return { success: true, action, draftId }
})

// ─── Callable: list drafts ───────────────────────────────────────────

export const listRedditDrafts = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, status } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  let query = db.collection('organizations').doc(orgId)
    .collection('redditDrafts')
    .orderBy('createdAt', 'desc')
    .limit(50)

  if (status) {
    query = db.collection('organizations').doc(orgId)
      .collection('redditDrafts')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(50)
  }

  const snap = await query.get()
  const drafts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  const byStatus = {}
  for (const d of drafts) byStatus[d.status] = (byStatus[d.status] || 0) + 1

  return { drafts, total: drafts.length, byStatus }
})

// ─── Core: generate AI response ──────────────────────────────────────

async function generateResponse(postTitle, postContent, style, orgContext, customContext) {
  const { callAI, extractJSON } = await import('../ai/callAI.js')

  const prompt = `Tu es un utilisateur Reddit experimenté. Tu dois ecrire une reponse utile a ce post.

POST REDDIT :
Titre : ${postTitle}
Contenu : ${postContent.substring(0, 1500)}

STYLE DE REPONSE : ${style.instruction}

REGLES ABSOLUES :
1. NE MENTIONNE AUCUNE MARQUE, produit ou service specifique dans ta reponse
2. Sois 100% utile et authentique — Reddit detecte le spam instantanement
3. Utilise un ton naturel et decontracte, comme un vrai Redditor
4. Si pertinent, pose une question de suivi pour engager la conversation
5. Maximum 150 mots — les reponses trop longues sont ignorees sur Reddit
6. Commence directement par la reponse, pas de "Bonjour" ni de formules
7. Ecris en francais si le post est en francais, sinon en anglais

${customContext ? `CONTEXTE SUPPLEMENTAIRE : ${customContext}` : ''}

Reponds en JSON :
{
  "response": "ta reponse Reddit",
  "notes": "pourquoi cette reponse est pertinente (pour le reviewer)",
  "relevanceScore": 0-100
}`

  const aiResponse = await callAI(prompt, 1000)
  const parsed = extractJSON(aiResponse)

  if (parsed) {
    return {
      response: parsed.response || '',
      notes: parsed.notes || '',
      relevanceScore: parsed.relevanceScore || 50,
    }
  }

  // Fallback: use raw response
  return {
    response: aiResponse.substring(0, 500),
    notes: 'Generation brute (JSON parsing failed)',
    relevanceScore: 50,
  }
}

// ─── Search Reddit via Serper ────────────────────────────────────────

async function searchRedditPosts(keywords, subreddits, maxResults) {
  const SERPER_API_KEY = process.env.SERPER_API_KEY
  if (!SERPER_API_KEY) {
    logger.warn('SERPER_API_KEY not set')
    return []
  }

  const results = []
  const seen = new Set()

  for (const keyword of keywords.slice(0, 5)) {
    const subredditFilter = subreddits?.length
      ? subreddits.map(s => `subreddit:${s}`).join(' OR ')
      : ''

    const query = `site:reddit.com ${keyword} ${subredditFilter}`.trim()

    try {
      const response = await fetch(SERPER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': SERPER_API_KEY,
        },
        body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 10 }),
        signal: AbortSignal.timeout(10000),
      })

      const data = await response.json()
      for (const item of (data.organic || [])) {
        if (!item.link?.includes('reddit.com')) continue
        if (seen.has(item.link)) continue
        seen.add(item.link)

        results.push({
          title: item.title || '',
          link: item.link,
          snippet: item.snippet || '',
          date: item.date || null,
          matchedKeyword: keyword,
        })
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 2000))
    } catch (error) {
      logger.warn(`Reddit search error for "${keyword}":`, error.message)
    }
  }

  return results.slice(0, maxResults)
}

// ─── Fetch Reddit post content ───────────────────────────────────────

async function fetchRedditPost(url) {
  try {
    // Reddit JSON API: append .json to the URL
    const jsonUrl = url.replace(/\/$/, '') + '.json'
    const response = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    })

    if (!response.ok) return { title: '', content: '' }

    const data = await response.json()
    const post = data?.[0]?.data?.children?.[0]?.data
    if (!post) return { title: '', content: '' }

    return {
      title: post.title || '',
      content: post.selftext || post.title || '',
      author: post.author || '',
      subreddit: post.subreddit || '',
      score: post.score || 0,
      numComments: post.num_comments || 0,
      createdUtc: post.created_utc || 0,
    }
  } catch {
    return { title: '', content: '' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function extractSubreddit(url) {
  if (!url) return null
  const match = url.match(/reddit\.com\/r\/([^/]+)/i)
  return match ? match[1] : null
}
