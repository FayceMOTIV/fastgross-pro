/**
 * Deliverability Testing - Tests de delivrabilite et verification DNS
 * Niveau Apollo : Verifier SPF, DKIM, DMARC avant d'envoyer
 */

import dns from 'dns'
import { promisify } from 'util'
import { getFirestore } from 'firebase-admin/firestore'

const resolveTxt = promisify(dns.resolveTxt)
const resolveMx = promisify(dns.resolveMx)

const getDb = () => getFirestore()

/**
 * Verifie la configuration DNS d'un domaine
 */
export async function verifyDNSConfiguration(domain) {
  const results = {
    domain,
    timestamp: new Date(),
    spf: { configured: false, valid: false, record: null, issues: [] },
    dkim: { configured: false, valid: false, record: null, issues: [] },
    dmarc: { configured: false, valid: false, record: null, issues: [] },
    mx: { configured: false, records: [], issues: [] },
    overallScore: 0,
    status: 'incomplete',
    recommendations: []
  }

  // Verifier SPF
  try {
    const txtRecords = await resolveTxt(domain)
    const spfRecord = txtRecords.flat().find(r => r.startsWith('v=spf1'))

    if (spfRecord) {
      results.spf.configured = true
      results.spf.record = spfRecord

      // Validation basique
      if (spfRecord.includes('include:') || spfRecord.includes('a') || spfRecord.includes('mx')) {
        results.spf.valid = true
      }

      // Verifier les problemes courants
      if (spfRecord.includes('+all')) {
        results.spf.issues.push('SPF trop permissif (+all detecte)')
      }
      if (spfRecord.length > 255) {
        results.spf.issues.push('SPF trop long (>255 caracteres)')
      }
    } else {
      results.spf.issues.push('Aucun enregistrement SPF trouve')
      results.recommendations.push({
        type: 'spf',
        priority: 'high',
        message: 'Ajoutez un enregistrement SPF pour authentifier vos emails',
        example: 'v=spf1 include:_spf.google.com ~all'
      })
    }
  } catch (error) {
    results.spf.issues.push(`Erreur DNS: ${error.message}`)
  }

  // Verifier DKIM (on verifie les selecteurs courants)
  const dkimSelectors = ['default', 'mail', 'google', 'selector1', 'selector2', 'k1', 'dkim']
  for (const selector of dkimSelectors) {
    try {
      const dkimRecords = await resolveTxt(`${selector}._domainkey.${domain}`)
      if (dkimRecords && dkimRecords.length > 0) {
        results.dkim.configured = true
        results.dkim.record = dkimRecords[0].join('')
        results.dkim.selector = selector
        if (results.dkim.record.includes('v=DKIM1')) {
          results.dkim.valid = true
        }
        break
      }
    } catch {
      // Selector non trouve, continuer
    }
  }

  if (!results.dkim.configured) {
    results.dkim.issues.push('Aucun enregistrement DKIM trouve')
    results.recommendations.push({
      type: 'dkim',
      priority: 'high',
      message: 'Configurez DKIM pour signer cryptographiquement vos emails',
      example: 'Generez une cle DKIM via votre fournisseur email'
    })
  }

  // Verifier DMARC
  try {
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`)
    const dmarcRecord = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1'))

    if (dmarcRecord) {
      results.dmarc.configured = true
      results.dmarc.record = dmarcRecord

      // Verifier la politique
      if (dmarcRecord.includes('p=reject') || dmarcRecord.includes('p=quarantine')) {
        results.dmarc.valid = true
      } else if (dmarcRecord.includes('p=none')) {
        results.dmarc.valid = true
        results.dmarc.issues.push('DMARC en mode surveillance (p=none)')
      }

      // Verifier les rapports
      if (!dmarcRecord.includes('rua=')) {
        results.dmarc.issues.push('Pas d\'adresse de rapport configuree')
      }
    } else {
      results.dmarc.issues.push('Aucun enregistrement DMARC trouve')
      results.recommendations.push({
        type: 'dmarc',
        priority: 'medium',
        message: 'Ajoutez un enregistrement DMARC pour proteger votre domaine',
        example: 'v=DMARC1; p=none; rua=mailto:dmarc@votredomaine.fr'
      })
    }
  } catch (error) {
    results.dmarc.issues.push(`Erreur DNS: ${error.message}`)
  }

  // Verifier MX
  try {
    const mxRecords = await resolveMx(domain)
    if (mxRecords && mxRecords.length > 0) {
      results.mx.configured = true
      results.mx.records = mxRecords.map(r => ({
        exchange: r.exchange,
        priority: r.priority
      }))
    } else {
      results.mx.issues.push('Aucun enregistrement MX trouve')
    }
  } catch (error) {
    results.mx.issues.push(`Erreur DNS: ${error.message}`)
  }

  // Calculer le score global
  let score = 0
  if (results.spf.valid) score += 30
  else if (results.spf.configured) score += 15
  if (results.dkim.valid) score += 35
  else if (results.dkim.configured) score += 15
  if (results.dmarc.valid) score += 25
  else if (results.dmarc.configured) score += 10
  if (results.mx.configured) score += 10

  results.overallScore = score

  // Determiner le statut
  if (score >= 90) {
    results.status = 'excellent'
    results.statusMessage = 'Configuration DNS optimale'
  } else if (score >= 70) {
    results.status = 'good'
    results.statusMessage = 'Configuration DNS correcte, quelques ameliorations possibles'
  } else if (score >= 50) {
    results.status = 'fair'
    results.statusMessage = 'Configuration DNS incomplete, risque de spam'
  } else {
    results.status = 'poor'
    results.statusMessage = 'Configuration DNS insuffisante, emails probablement en spam'
  }

  return results
}

/**
 * Genere les enregistrements DNS recommandes
 */
export function generateDNSRecords(domain, options = {}) {
  const records = []

  // SPF
  const spfIncludes = options.spfIncludes || ['_spf.google.com']
  records.push({
    type: 'TXT',
    name: '@',
    value: `v=spf1 ${spfIncludes.map(i => `include:${i}`).join(' ')} ~all`,
    purpose: 'SPF - Authentifie les serveurs autorises',
    priority: 'high'
  })

  // DMARC
  const dmarcEmail = options.dmarcEmail || `dmarc@${domain}`
  records.push({
    type: 'TXT',
    name: '_dmarc',
    value: `v=DMARC1; p=none; rua=mailto:${dmarcEmail}; ruf=mailto:${dmarcEmail}; fo=1`,
    purpose: 'DMARC - Protection contre l\'usurpation',
    priority: 'medium'
  })

  // DKIM (placeholder - la vraie cle vient du fournisseur)
  records.push({
    type: 'TXT',
    name: 'mail._domainkey',
    value: 'v=DKIM1; k=rsa; p=VOTRE_CLE_PUBLIQUE',
    purpose: 'DKIM - Signature cryptographique',
    priority: 'high',
    note: 'Generez cette cle via votre fournisseur email'
  })

  return records
}

/**
 * Sauvegarde les resultats de verification DNS
 */
export async function saveDNSVerification(orgId, domain, results) {
  const db = getDb()
  await db.collection(`organizations/${orgId}/dnsVerifications`).add({
    domain,
    ...results,
    createdAt: new Date()
  })
}

/**
 * Test d'envoi vers les principaux fournisseurs
 */
export async function runDeliverabilityTest(orgId, inboxId) {
  // En production, ceci enverrait des emails de test vers des adresses
  // Gmail, Outlook, Yahoo pour verifier l'arrivee en inbox
  // Pour l'instant, on simule les resultats

  const results = {
    testedAt: new Date(),
    providers: [
      {
        name: 'Gmail',
        result: 'pending',
        folder: null,
        note: 'Test en cours...'
      },
      {
        name: 'Outlook',
        result: 'pending',
        folder: null,
        note: 'Test en cours...'
      },
      {
        name: 'Yahoo',
        result: 'pending',
        folder: null,
        note: 'Test en cours...'
      }
    ],
    overallStatus: 'testing'
  }

  return results
}

/**
 * Verifie si un domaine est blackliste
 */
export async function checkBlacklists(domain) {
  // En production, on verifierait les principales blacklists
  // Spamhaus, Barracuda, SpamCop, etc.

  const blacklists = [
    'zen.spamhaus.org',
    'bl.spamcop.net',
    'dnsbl.sorbs.net',
    'b.barracudacentral.org'
  ]

  const results = {
    domain,
    checkedAt: new Date(),
    blacklisted: false,
    lists: []
  }

  // Simulation - en prod, faire de vraies requetes DNS
  for (const list of blacklists) {
    results.lists.push({
      name: list,
      listed: false
    })
  }

  return results
}

/**
 * Score de reputation du domaine d'envoi
 */
export async function getDomainReputationScore(orgId, domain) {
  const db = getDb()

  // Recuperer les stats d'envoi du domaine
  const sentEmails = await db.collection(`organizations/${orgId}/sent`)
    .where('fromDomain', '==', domain)
    .limit(1000)
    .get()

  let delivered = 0
  let bounced = 0
  let opened = 0
  let complained = 0

  sentEmails.docs.forEach(doc => {
    const data = doc.data()
    if (data.status === 'delivered') delivered++
    if (data.status === 'bounced') bounced++
    if (data.opened) opened++
    if (data.complained) complained++
  })

  const total = sentEmails.size
  if (total === 0) {
    return {
      score: 100,
      status: 'new',
      message: 'Nouveau domaine, pas encore de donnees'
    }
  }

  // Calculer le score
  let score = 100
  const bounceRate = (bounced / total) * 100
  const complaintRate = (complained / total) * 100
  const openRate = (opened / delivered) * 100 || 0

  // Penalites
  if (bounceRate > 5) score -= 30
  else if (bounceRate > 2) score -= 15
  if (complaintRate > 0.5) score -= 40
  else if (complaintRate > 0.1) score -= 20
  if (openRate < 10) score -= 10

  return {
    score: Math.max(0, score),
    status: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor',
    metrics: {
      total,
      delivered,
      bounced,
      bounceRate: bounceRate.toFixed(2),
      complaintRate: complaintRate.toFixed(2),
      openRate: openRate.toFixed(2)
    }
  }
}
