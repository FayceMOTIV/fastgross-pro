/**
 * Agent Tools — 10 utility functions for the AI agent
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { searchKnowledgeBase } from '../knowledge/kbSearch.js'
import { callAI } from '../ai/callAI.js'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

/**
 * 1. Search Knowledge Base
 */
export async function searchKB(orgId, query) {
  return searchKnowledgeBase(orgId, query, 5, 0.6)
}

/**
 * 2. Get Prospect Profile with last 10 interactions
 */
export async function getProspectProfile(orgId, leadId) {
  const db = getDb()
  const prospectDoc = await db.collection('organizations').doc(orgId).collection('prospects').doc(leadId).get()

  if (!prospectDoc.exists) return null

  const prospect = { id: prospectDoc.id, ...prospectDoc.data() }

  // Get last 10 interactions
  const interactionsSnapshot = await db
    .collection('organizations').doc(orgId).collection('interactions')
    .where('prospectId', '==', leadId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()

  prospect.recentInteractions = interactionsSnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))

  return prospect
}

/**
 * 3. Enrich Prospect (delegates to existing waterfall)
 */
export async function enrichProspect(orgId, email) {
  // Dynamic import to avoid circular deps
  const { enrichEmailWaterfall } = await import('../enrichment/emailWaterfall.js')
  return enrichEmailWaterfall(orgId, email)
}

/**
 * 4. Check Availability (placeholder — requires Google Calendar integration)
 */
export async function checkAvailability(orgId, daysAhead = 7) {
  const db = getDb()
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const calendarConfig = orgDoc.data()?.integrations?.calendar

  if (!calendarConfig?.enabled) {
    return {
      available: true,
      slots: [],
      message: 'Calendrier non configure — disponibilites manuelles',
    }
  }

  // Placeholder for Google Calendar API integration
  return {
    available: true,
    slots: ['Lundi 10h', 'Mardi 14h', 'Mercredi 11h'],
    message: `${daysAhead} prochains jours`,
  }
}

/**
 * 5. Generate Booking Link
 */
export async function generateBookingLink(orgId, prospectName) {
  const db = getDb()
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const bookingConfig = orgDoc.data()?.integrations?.booking

  if (bookingConfig?.provider === 'calendly' && bookingConfig?.url) {
    return `${bookingConfig.url}?name=${encodeURIComponent(prospectName)}`
  }

  if (bookingConfig?.provider === 'calcom' && bookingConfig?.url) {
    return `${bookingConfig.url}?name=${encodeURIComponent(prospectName)}`
  }

  return null
}

/**
 * 6. Web Search Prospect (uses Serper API)
 */
export async function webSearchProspect(companyName, domain) {
  try {
    const { cachedSerperFetch } = await import('../utils/serperCache.js')
    const query = domain ? `site:${domain} OR "${companyName}"` : companyName
    const data = await cachedSerperFetch('search', { q: query, num: 5, gl: 'fr', hl: 'fr' })
    return {
      results: (data.organic || []).slice(0, 5).map((r) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link,
      })),
    }
  } catch (error) {
    return { results: [], error: error.message }
  }
}

/**
 * 7. Update CRM
 */
export async function updateCRM(orgId, leadId, updates) {
  const db = getDb()
  await db.collection('organizations').doc(orgId).collection('prospects').doc(leadId).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { success: true }
}

/**
 * 8. Escalate to Human (creates escalation doc)
 */
export async function escalateToHuman(orgId, leadId, reason, draft) {
  const db = getDb()
  const escRef = db.collection('organizations').doc(orgId).collection('escalations').doc()

  await escRef.set({
    leadId,
    reason,
    urgency: reason === 'legal_keywords' || reason === 'vip_lead' ? 'critical' : 'normal',
    agentDraftReply: draft || '',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  return { success: true, escalationId: escRef.id }
}

/**
 * 9. Schedule Follow-up via Cloud Tasks (simplified)
 */
export async function scheduleFollowup(orgId, leadId, date, note) {
  const db = getDb()

  // Store as a scheduled task in Firestore (orchestratorCron will pick it up)
  await db.collection('organizations').doc(orgId).collection('scheduledFollowups').doc().set({
    leadId,
    scheduledDate: date,
    note: note || '',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  return { success: true }
}

/**
 * 10. Analyze Sentiment (quick Groq call)
 */
export async function analyzeSentiment(text) {
  try {
    const response = await callAI(
      `Analyse le sentiment de ce message et reponds UNIQUEMENT avec un JSON:
{"score": <number entre -1 et 1>, "label": "<positive|negative|neutral>", "confidence": <0-1>}

Message: "${text.slice(0, 500)}"`,
      150
    )

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
    return safeParseLLMJson(cleaned)
  } catch {
    return { score: 0, label: 'neutral', confidence: 0.5 }
  }
}
