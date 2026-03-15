/**
 * Agent Learning — Weekly scheduler that analyzes conversations
 * and extracts winning patterns into the agent playbook
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { callAI } from '../ai/callAI.js'
import { safeParseLLMJson } from '../utils/safeParseLLMJson.js'

const getDb = () => getFirestore()

/**
 * Scheduled: Every Sunday at 2:00 AM
 * Analyzes the week's conversations and updates the agent playbook
 */
export const agentLearning = onSchedule({
  schedule: '0 2 * * 0',
  region: 'europe-west1',
  timeZone: 'Europe/Paris',
  timeoutSeconds: 300,
  memory: '512MiB',
}, async () => {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id

    try {
      // Get last 7 days of interactions
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const interactionsSnapshot = await db
        .collection('organizations').doc(orgId).collection('interactions')
        .where('createdAt', '>=', weekAgo)
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get()

      if (interactionsSnapshot.empty) continue

      // Separate winning vs losing conversations
      const prospectsRef = db.collection('organizations').doc(orgId).collection('prospects')
      const convertedSnapshot = await prospectsRef
        .where('crmColumn', 'in', ['MEETING', 'SIGNED'])
        .where('updatedAt', '>=', weekAgo)
        .limit(50)
        .get()

      const lostSnapshot = await prospectsRef
        .where('crmColumn', '==', 'LOST')
        .where('updatedAt', '>=', weekAgo)
        .limit(50)
        .get()

      const winningIds = new Set(convertedSnapshot.docs.map((d) => d.id))
      const losingIds = new Set(lostSnapshot.docs.map((d) => d.id))

      const interactions = interactionsSnapshot.docs.map((d) => d.data())

      const winningMessages = interactions
        .filter((i) => winningIds.has(i.prospectId))
        .map((i) => i.content || i.subject || '')
        .filter(Boolean)
        .slice(0, 20)

      const losingMessages = interactions
        .filter((i) => losingIds.has(i.prospectId))
        .map((i) => i.content || i.subject || '')
        .filter(Boolean)
        .slice(0, 20)

      if (winningMessages.length === 0 && losingMessages.length === 0) continue

      // Ask AI to extract patterns
      const analysis = await callAI(
        `Analyse ces messages de prospection commerciale et extrait les patterns.

MESSAGES GAGNANTS (ont mene a un RDV ou signature):
${winningMessages.join('\n---\n')}

MESSAGES PERDANTS (lead perdu):
${losingMessages.join('\n---\n')}

Reponds en JSON strict:
{
  "winningPatterns": ["pattern1", "pattern2", "pattern3"],
  "losingPatterns": ["pattern1", "pattern2"],
  "recommendations": ["reco1", "reco2", "reco3"],
  "bestOpeningLines": ["line1", "line2"],
  "worstMistakes": ["mistake1", "mistake2"],
  "topObjectionHandling": ["technique1", "technique2"]
}`,
        800
      )

      // Parse and store
      let playbook
      try {
        const cleaned = analysis.replace(/```json\n?|\n?```/g, '').trim()
        playbook = safeParseLLMJson(cleaned)
      } catch {
        playbook = {
          winningPatterns: [],
          losingPatterns: [],
          recommendations: [analysis.slice(0, 500)],
        }
      }

      await db.collection('organizations').doc(orgId).collection('agentPlaybook').doc('latest').set({
        ...playbook,
        weekOf: weekAgo.toISOString().slice(0, 10),
        totalInteractionsAnalyzed: interactions.length,
        totalWinning: winningMessages.length,
        totalLosing: losingMessages.length,
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log(JSON.stringify({
        event: 'agent_learning_complete',
        orgId,
        interactions: interactions.length,
        winning: winningMessages.length,
        losing: losingMessages.length,
      }))
    } catch (error) {
      console.error(JSON.stringify({
        event: 'agent_learning_error',
        orgId,
        error: error.message,
      }))
    }
  }
})
