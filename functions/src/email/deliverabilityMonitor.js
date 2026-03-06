/**
 * deliverabilityMonitor — Cron daily verification DNS + reputation + score A-F
 * Module 10: Email Deliverability Grade A+
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import dns from 'dns'
import { promisify } from 'util'

const getDb = () => getFirestore()

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)

/**
 * Score A-F basé sur 5 criteres (20 pts chacun = 100 max)
 */
function calculateGrade(score) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

/**
 * Verification DNS complete pour un domaine
 */
async function checkDomain(domain) {
  const checks = {
    spf: { valid: false, configured: false, score: 0, details: '' },
    dkim: { valid: false, configured: false, score: 0, details: '' },
    dmarc: { valid: false, configured: false, score: 0, details: '' },
    mx: { valid: false, score: 0, details: '' },
  }

  // SPF
  try {
    const records = await resolveTxt(domain)
    const spfRecord = records.flat().find((r) => r.startsWith('v=spf1'))
    if (spfRecord) {
      checks.spf.configured = true
      checks.spf.details = spfRecord
      if (!spfRecord.includes('+all')) {
        checks.spf.valid = true
        checks.spf.score = 20
      } else {
        checks.spf.score = 10
        checks.spf.details += ' (WARNING: +all detecte)'
      }
    }
  } catch { /* no SPF */ }

  // DKIM
  const selectors = ['default', 'mail', 'google', 'selector1', 'selector2', 'k1', 'dkim']
  for (const selector of selectors) {
    try {
      const records = await resolveTxt(`${selector}._domainkey.${domain}`)
      const dkimRecord = records.flat().find((r) => r.includes('v=DKIM1'))
      if (dkimRecord) {
        checks.dkim.configured = true
        checks.dkim.valid = true
        checks.dkim.score = 20
        checks.dkim.details = `Selector: ${selector}`
        break
      }
    } catch { /* try next */ }
  }

  // DMARC
  try {
    const records = await resolveTxt(`_dmarc.${domain}`)
    const dmarcRecord = records.flat().find((r) => r.startsWith('v=DMARC1'))
    if (dmarcRecord) {
      checks.dmarc.configured = true
      checks.dmarc.details = dmarcRecord
      if (dmarcRecord.includes('p=reject') || dmarcRecord.includes('p=quarantine')) {
        checks.dmarc.valid = true
        checks.dmarc.score = 20
      } else {
        checks.dmarc.score = 10
      }
    }
  } catch { /* no DMARC */ }

  // MX
  try {
    const mxRecords = await resolveMx(domain)
    if (mxRecords && mxRecords.length > 0) {
      checks.mx.valid = true
      checks.mx.score = 10
      checks.mx.details = mxRecords.map((r) => r.exchange).join(', ')
    }
  } catch { /* no MX */ }

  const dnsScore = checks.spf.score + checks.dkim.score + checks.dmarc.score + checks.mx.score

  return { checks, dnsScore }
}

/**
 * Calcule le score complet de delivrabilite pour un compte email
 */
async function calculateDeliverabilityScore(orgId, emailAccount) {
  const domain = emailAccount.email?.split('@')[1] || emailAccount.domain
  if (!domain) return { score: 0, grade: 'F' }

  // DNS check (70 pts max)
  const { checks, dnsScore } = await checkDomain(domain)

  // Bounce rate (15 pts)
  const bounceRate = emailAccount.bounceRate || 0
  let bounceScore = 15
  if (bounceRate > 5) bounceScore = 0
  else if (bounceRate > 3) bounceScore = 5
  else if (bounceRate > 1) bounceScore = 10

  // Warmup level (15 pts)
  const warmupDays = emailAccount.warmupDays || 0
  let warmupScore = 0
  if (warmupDays >= 28) warmupScore = 15
  else if (warmupDays >= 21) warmupScore = 12
  else if (warmupDays >= 14) warmupScore = 8
  else if (warmupDays >= 7) warmupScore = 4

  const totalScore = dnsScore + bounceScore + warmupScore
  const grade = calculateGrade(totalScore)

  return {
    score: totalScore,
    grade,
    dns: checks,
    dnsScore,
    bounceRate,
    bounceScore,
    warmupDays,
    warmupScore,
    domain,
    checkedAt: new Date(),
  }
}

/**
 * Cron daily: verifie delivrabilite pour toutes les orgs actives
 */
export const deliverabilityMonitorCron = onSchedule(
  {
    schedule: 'every day 05:00',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    logger.info('Deliverability Monitor cron started')

    try {
      const orgsSnap = await getDb()
        .collection('organizations')
        .where('prospectionEnabled', '==', true)
        .get()

      let checked = 0

      for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id

        // Charger les comptes email
        const accountsSnap = await getDb()
          .collection('organizations').doc(orgId)
          .collection('emailAccounts')
          .get()

        for (const accDoc of accountsSnap.docs) {
          const account = accDoc.data()
          const result = await calculateDeliverabilityScore(orgId, account)

          await accDoc.ref.update({
            deliverabilityScore: result.score,
            deliverabilityGrade: result.grade,
            deliverabilityDetails: result,
            deliverabilityCheckedAt: FieldValue.serverTimestamp(),
          })

          checked++

          // Alerte si score < 60 (grade C ou pire)
          if (result.score < 60) {
            logger.warn(`Low deliverability for ${account.email}: ${result.grade} (${result.score})`)
          }
        }
      }

      logger.info(`Deliverability Monitor complete: ${checked} accounts checked`)
    } catch (err) {
      logger.error('Deliverability Monitor error:', err.message)
    }
  }
)

/**
 * Callable: obtenir le score de delivrabilite
 */
export const getDeliverabilityScore = onCall(
  { region: 'europe-west1', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Auth required')

    const { orgId, domain } = request.data || {}
    if (!orgId || !domain) throw new HttpsError('invalid-argument', 'orgId and domain required')

    const result = await checkDomain(domain)
    return { success: true, ...result, grade: calculateGrade(result.dnsScore) }
  }
)
