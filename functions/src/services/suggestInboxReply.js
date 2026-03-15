/**
 * suggestInboxReply — AI-powered reply suggestion for Unified Inbox
 *
 * Uses Groq (free tier) to generate a professional reply suggestion.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { getFirestore } from 'firebase-admin/firestore'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'
import { callAI } from '../ai/callAI.js'

const getDb = () => getFirestore()

export const suggestInboxReply = onCall({
  region: 'europe-west1',
  cors: ALLOWED_ORIGINS,
  memory: '512MiB',
  timeoutSeconds: 30,
}, async (request) => {
  const { auth, data } = request
  if (!auth) throw new HttpsError('unauthenticated', 'Authentication requise')

  const { orgId, prospectId, lastMessages } = data || {}
  if (!orgId || !prospectId) {
    throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  }

  await verifyOrgMembership(auth.uid, orgId)

  const db = getDb()

  // Load prospect context
  const prospectDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!prospectDoc.exists) throw new HttpsError('not-found', 'Prospect introuvable')
  const prospect = prospectDoc.data()

  // Load org context for niche/company info
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const org = orgDoc.exists ? orgDoc.data() : {}

  // Build conversation context
  const conversationContext = (lastMessages || [])
    .slice(-5)
    .map(m => `[${m.direction === 'inbound' ? 'Prospect' : 'Nous'}] ${m.message}`)
    .join('\n')

  const prompt = `Tu es un commercial B2B professionnel pour ${org.companyName || 'notre entreprise'} (secteur: ${org.niche || org.sector || 'B2B'}).

Prospect: ${prospect.companyName || prospect.contactName || 'Prospect'}
Secteur prospect: ${prospect.sector || prospect.niche || 'inconnu'}
Score: ${prospect.score || prospect.finalScore || 'N/A'}

Derniers messages:
${conversationContext || '(pas de messages precedents)'}

Genere une reponse courte (max 3 phrases), professionnelle et engageante.
- Sois direct et utile
- Propose une prochaine etape concrete (appel, demo, rdv)
- Ne sois pas trop formel, reste humain
- Reponds en francais

Reponds UNIQUEMENT avec le message suggere, rien d'autre.`

  try {
    const suggestion = await callAI(prompt, 300)
    return {
      success: true,
      suggestion: (suggestion || '').trim(),
      confidence: suggestion ? 0.8 : 0.3,
    }
  } catch (e) {
    console.error('[SuggestReply] AI error:', e.message)
    return {
      success: false,
      suggestion: 'Merci pour votre message. Seriez-vous disponible pour un echange rapide cette semaine ?',
      confidence: 0.2,
    }
  }
})
