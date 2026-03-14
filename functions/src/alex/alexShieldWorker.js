/**
 * alexShieldWorker.js — Worker SHIELD hebdomadaire
 *
 * Chaque dimanche a 9H (Europe/Paris) :
 *   1. Lance le Citability Score (visibilite IA du client)
 *   2. Lance l'AI Crawler Audit (robots.txt, llms.txt, schema.org)
 *   3. Genere un rapport SHIELD complet
 *   4. Envoie au user via WhatsApp
 *   5. Sauvegarde dans Firestore
 *
 * Export:
 *   - alexWeeklyShield (onSchedule dimanche 9h)
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const log = (event, data) =>
  console.log(JSON.stringify({ service: 'alexShieldWorker', event, ...data, ts: new Date().toISOString() }))

export const alexWeeklyShield = onSchedule(
  {
    schedule: '0 9 * * 0', // Dimanche 9H
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getDb()
    log('shield_start', {})

    const orgsSnap = await db.collection('organizations')
      .where('prospectionEnabled', '==', true)
      .get()

    for (const orgDoc of orgsSnap.docs) {
      try {
        await runShieldForOrg(db, orgDoc.id, orgDoc.data())
      } catch (error) {
        log('shield_org_error', { orgId: orgDoc.id, error: error.message })
      }
    }

    log('shield_complete', { orgs: orgsSnap.size })
  }
)

async function runShieldForOrg(db, orgId, orgData) {
  const brandName = orgData.companyName || orgData.name || ''
  const domain = orgData.domain || orgData.website || ''
  const niche = orgData.niche || orgData.sector || ''
  const location = orgData.location || orgData.city || 'France'

  if (!brandName && !domain) {
    log('shield_skip_no_brand', { orgId })
    return
  }

  let citabilityResult = null
  let crawlerResult = null

  // ---- STEP 1 : Citability Score ----
  if (brandName) {
    try {
      const { computeCitabilityScore } = await import('../shield/citabilityScore.js')
      citabilityResult = await computeCitabilityScore(brandName, niche, location)
      log('citability_done', { orgId, score: citabilityResult?.score, grade: citabilityResult?.grade })
    } catch (e) {
      log('citability_error', { orgId, error: e.message })
    }
  }

  // ---- STEP 2 : AI Crawler Audit ----
  if (domain) {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const { runAudit } = await import('../shield/aiCrawlerAudit.js')
      crawlerResult = await runAudit(cleanDomain)
      log('crawler_done', { orgId, score: crawlerResult?.score, grade: crawlerResult?.grade })
    } catch (e) {
      log('crawler_error', { orgId, error: e.message })
    }
  }

  // ---- STEP 3 : Generer le rapport SHIELD ----
  const report = buildShieldReport(orgData, citabilityResult, crawlerResult)

  // Sauvegarder dans Firestore
  const weekKey = getWeekKey()
  await db.doc(`organizations/${orgId}/shieldReports/${weekKey}`).set({
    citability: citabilityResult ? {
      score: citabilityResult.score,
      grade: citabilityResult.grade,
      totalMentions: citabilityResult.totalMentions,
      providers: citabilityResult.providers,
    } : null,
    crawlerAudit: crawlerResult ? {
      score: crawlerResult.score,
      grade: crawlerResult.grade,
      passed: crawlerResult.passed,
      failed: crawlerResult.failed,
      recommendations: crawlerResult.recommendations?.slice(0, 5),
    } : null,
    reportText: report,
    createdAt: FieldValue.serverTimestamp(),
  })

  // ---- STEP 4 : Envoyer via WhatsApp ----
  const prefsDoc = await db.doc(`organizations/${orgId}/alexMemory/preferences`).get()
  const prefs = prefsDoc.exists ? prefsDoc.data() : {}
  const userPhone = prefs.userWhatsApp || orgData.ownerPhone

  if (userPhone) {
    try {
      const { sendTextMessage } = await import('./alexWhatsAppSender.js')
      await sendTextMessage(userPhone, report)
      log('shield_sent', { orgId })
    } catch (e) {
      log('shield_send_error', { orgId, error: e.message })
    }
  }
}

function buildShieldReport(orgData, citability, crawler) {
  const brand = orgData.companyName || orgData.name || 'votre marque'
  let report = `🛡 *RAPPORT SHIELD HEBDOMADAIRE*\n`
  report += `${brand}\n\n`

  // Citability
  if (citability) {
    const emoji = citability.score >= 70 ? '🟢' : citability.score >= 40 ? '🟡' : '🔴'
    report += `*1. Visibilite IA* ${emoji}\n`
    report += `Score : ${citability.score}/100 (${citability.grade})\n`
    report += `Mentions detectees : ${citability.totalMentions || 0}\n`
    if (citability.providers) {
      const providerList = Object.entries(citability.providers)
        .map(([name, data]) => `  ${name}: ${data.mentions || 0} mentions`)
        .join('\n')
      report += providerList + '\n'
    }
    report += '\n'
  } else {
    report += `*1. Visibilite IA* — Non disponible\n\n`
  }

  // Crawler Audit
  if (crawler) {
    const emoji = crawler.score >= 70 ? '🟢' : crawler.score >= 40 ? '🟡' : '🔴'
    report += `*2. Audit Crawlers IA* ${emoji}\n`
    report += `Score : ${crawler.score}/100 (${crawler.grade})\n`
    report += `Checks : ${crawler.passed}/${crawler.passed + crawler.failed} passes\n`
    if (crawler.recommendations?.length > 0) {
      report += `Actions :\n`
      report += crawler.recommendations.slice(0, 3).map(r => `  → ${r}`).join('\n')
      report += '\n'
    }
    report += '\n'
  } else {
    report += `*2. Audit Crawlers IA* — Non disponible\n\n`
  }

  // Score global
  const scores = [citability?.score, crawler?.score].filter(s => s != null)
  if (scores.length > 0) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const globalEmoji = avg >= 70 ? '🟢' : avg >= 40 ? '🟡' : '🔴'
    report += `*Score SHIELD global : ${avg}/100* ${globalEmoji}\n\n`
  }

  report += `_Prochain rapport dimanche prochain._`

  return report
}

function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const start = new Date(year, 0, 1)
  const diff = now - start
  const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
  return `${year}-W${String(week).padStart(2, '0')}`
}
