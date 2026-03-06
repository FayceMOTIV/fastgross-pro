/**
 * signalMonitor — Cron scan periodique des signaux d'achat (Serper + enrichment)
 * Module 1: Signal-Based Selling Engine
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()
const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

// 5 nouveaux signaux avec scores
const SIGNAL_DEFINITIONS = {
  tech_change: {
    label: 'Changement techno',
    score: 20,
    keywords: ['migration', 'nouveau CRM', 'nouveau site', 'refonte', 'changement ERP', 'transformation digitale'],
    color: 'blue',
  },
  competitor_issue: {
    label: 'Probleme concurrent',
    score: 25,
    keywords: ['avis negatif', 'insatisfait', 'decu', 'probleme service', 'quitter', 'alternative'],
    color: 'red',
  },
  seasonal: {
    label: 'Haute saison',
    score: 15,
    keywords: ['rentree', 'soldes', 'noel', 'ete', 'black friday', 'saint valentin', 'haute saison'],
    color: 'amber',
  },
  regulatory: {
    label: 'Changement reglementaire',
    score: 15,
    keywords: ['nouvelle loi', 'rgpd', 'mise en conformite', 'obligation legale', 'reglementation'],
    color: 'purple',
  },
  social_engagement: {
    label: 'Engagement social',
    score: 10,
    keywords: ['publication', 'like', 'commentaire', 'partage', 'post linkedin'],
    color: 'green',
  },
}

/**
 * Detecte les signaux pour un prospect via recherche web
 */
async function detectSignalsForProspect(prospect) {
  const signals = []
  const company = prospect.company || prospect.name || ''
  if (!company || !SERPER_API_KEY) return signals

  try {
    const response = await axios.post(
      'https://google.serper.dev/search',
      {
        q: `"${company}" ${prospect.city || ''} actualites`,
        num: 10,
        gl: 'fr',
        hl: 'fr',
        tbs: 'qdr:m', // Dernier mois
      },
      {
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    )

    const results = response.data?.organic || []
    const combinedText = results.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase()

    // Checker chaque signal
    for (const [signalId, def] of Object.entries(SIGNAL_DEFINITIONS)) {
      const matched = def.keywords.some((kw) => combinedText.includes(kw.toLowerCase()))
      if (matched) {
        const matchingResult = results.find((r) =>
          def.keywords.some((kw) => `${r.title} ${r.snippet}`.toLowerCase().includes(kw.toLowerCase()))
        )
        signals.push({
          type: signalId,
          label: def.label,
          score: def.score,
          color: def.color,
          source: matchingResult?.link || null,
          snippet: matchingResult?.snippet?.slice(0, 150) || null,
          detectedAt: new Date(),
        })
      }
    }
  } catch (err) {
    logger.warn(`Signal detection failed for ${company}:`, err.message)
  }

  return signals
}

/**
 * Scheduled: scan quotidien des signaux pour les prospects actifs
 * Tourne 1 fois/jour, traite max 50 prospects
 */
export const signalMonitorCron = onSchedule(
  {
    schedule: 'every day 06:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    logger.info('Signal Monitor cron started')

    try {
      // Recuperer toutes les orgs actives
      const orgsSnap = await getDb()
        .collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      let totalSignals = 0
      let totalProspects = 0

      for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id

        // Prospects actifs (hot/warm) non scrapes recemment
        const prospectsSnap = await getDb()
          .collection('organizations').doc(orgId)
          .collection('prospects')
          .where('alexStatus', 'in', ['hot', 'warm', 'contacted'])
          .limit(50)
          .get()

        for (const pDoc of prospectsSnap.docs) {
          const prospect = { id: pDoc.id, ...pDoc.data() }

          // Skip si deja scanne aujourd'hui
          const lastScan = prospect.signalsScannedAt?.toDate?.()
          if (lastScan && (Date.now() - lastScan.getTime()) < 24 * 60 * 60 * 1000) {
            continue
          }

          const signals = await detectSignalsForProspect(prospect)

          if (signals.length > 0) {
            // Calculer bonus signal
            const signalBonus = signals.reduce((sum, s) => sum + s.score, 0)

            await pDoc.ref.update({
              signals,
              signalBonus: Math.min(50, signalBonus),
              signalsScannedAt: FieldValue.serverTimestamp(),
            })

            totalSignals += signals.length
          } else {
            await pDoc.ref.update({
              signalsScannedAt: FieldValue.serverTimestamp(),
            })
          }

          totalProspects++

          // Rate limit
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      logger.info(`Signal Monitor complete: ${totalProspects} prospects scanned, ${totalSignals} signals found`)
    } catch (err) {
      logger.error('Signal Monitor error:', err.message)
    }
  }
)

export { SIGNAL_DEFINITIONS, detectSignalsForProspect }
