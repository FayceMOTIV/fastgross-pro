/**
 * Detect Competitor Mentions — Intent Hunter (Shared B2B + B2C)
 *
 * Scheduled job : tourne toutes les 4 heures.
 * Surveille les mentions des concurrents definis par le client.
 *
 * Signaux cibles :
 *   "[Concurrent] + decu/probleme/bug/erreur/cherche alternative"
 *   "passer de [Concurrent] a ?"
 *   "avis sur [Concurrent] ?"
 *   "[Concurrent] a augmente ses prix"
 *
 * Score auto : 95/100 (intention de changement = signal maximal)
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'

const getDb = () => getFirestore()

const NEGATIVE_SIGNALS = [
  'decu', 'decue', 'probleme', 'problemes', 'bug', 'bugs',
  'erreur', 'erreurs', 'nul', 'nulle', 'mauvais', 'mauvaise',
  'horrible', 'terrible', 'catastrophe', 'arnaque', 'escroc',
  'cherche alternative', 'alternative a', 'remplacer',
  'passer de', 'quitter', 'changer de', 'migrer',
  'augmente ses prix', 'trop cher', 'hors de prix',
  'service client inexistant', 'pas de support', 'aucune reponse',
  'je deconseille', 'a eviter', 'fuyez'
]

/**
 * Verifie si un texte contient une mention negative d'un concurrent
 * @param {string} text - Texte a analyser
 * @param {string[]} competitors - Noms des concurrents
 * @returns {{ isMatch: boolean, competitor: string|null, signal: string|null }}
 */
export function detectNegativeMention(text, competitors) {
  if (!text || !competitors?.length) return { isMatch: false }

  const lowerText = text.toLowerCase()

  for (const competitor of competitors) {
    const lowerComp = competitor.toLowerCase()

    if (!lowerText.includes(lowerComp)) continue

    // Verifier si un signal negatif est present
    const matchedSignal = NEGATIVE_SIGNALS.find(signal => lowerText.includes(signal))

    if (matchedSignal) {
      return {
        isMatch: true,
        competitor,
        signal: matchedSignal
      }
    }
  }

  return { isMatch: false, competitor: null, signal: null }
}

/**
 * Scheduled Cloud Function : detecte les mentions concurrents
 * Tourne toutes les 4 heures
 */
export const detectCompetitorMentionsCron = onSchedule(
  {
    schedule: 'every 4 hours',
    region: 'europe-west1',
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async () => {
    const db = getDb()

    console.log(JSON.stringify({
      function: 'detectCompetitorMentions',
      step: 'started'
    }))

    // Recuperer les orgs avec veille concurrentielle activee
    const orgsSnap = await db.collection('organizations')
      .where('intentHunterConfig.detectCompetitor', '==', true)
      .get()

    if (orgsSnap.empty) {
      console.log(JSON.stringify({
        function: 'detectCompetitorMentions',
        step: 'no_orgs_configured'
      }))
      return
    }

    let totalDetected = 0

    for (const orgDoc of orgsSnap.docs) {
      const orgData = orgDoc.data()
      const competitors = orgData.intentHunterConfig?.competitors || []

      if (competitors.length === 0) continue

      // TODO: Integrer les sources reelles (Reddit, Twitter, Google Reviews, etc.)
      // Pour l'instant, on log la configuration pour le monitoring
      console.log(JSON.stringify({
        function: 'detectCompetitorMentions',
        step: 'scanning_org',
        orgId: orgDoc.id,
        competitorCount: competitors.length
      }))
    }

    console.log(JSON.stringify({
      function: 'detectCompetitorMentions',
      step: 'completed',
      totalDetected
    }))
  }
)
