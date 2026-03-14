/**
 * Social Proof Engine — Systeme 3 (Alex V4)
 * Case studies auto-matchees par niche/signal + compteur dynamique.
 *
 * Fonctionnalites :
 *  1. Bibliotheque de case studies par secteur/signal
 *  2. Auto-match : trouve la case study la plus pertinente pour un prospect
 *  3. Compteur dynamique : "X entreprises de votre secteur font deja confiance"
 *  4. Snippets injectables dans emails, LinkedIn, WhatsApp
 *
 * Storage :
 *  - organizations/{orgId}/caseStudies/{caseId}
 *  - organizations/{orgId}/socialProofStats (compteurs dynamiques)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Default case studies library ────────────────────────────────────

const DEFAULT_CASE_STUDIES = [
  {
    id: 'restaurant_reviews',
    sectors: ['restaurant', 'restauration', 'traiteur', 'boulangerie', 'food'],
    signals: ['low_reviews', 'no_website', 'google_maps'],
    title: 'De 3 a 47 avis Google en 60 jours',
    company: 'Restaurant Le Comptoir',
    result: '+47 avis Google, note passee de 3.8 a 4.6',
    testimonial: 'On ne pensait pas que la gestion des avis pouvait avoir un tel impact sur notre frequentation. En 2 mois, on a vu une hausse de 30% des reservations.',
    metric: { value: 47, unit: 'avis Google', period: '60 jours' },
    tags: ['avis', 'reputation', 'local'],
  },
  {
    id: 'ecommerce_seo',
    sectors: ['ecommerce', 'boutique', 'commerce', 'retail', 'mode'],
    signals: ['missing_tech', 'new_domain', 'tech_stack'],
    title: '+180% de trafic organique en 90 jours',
    company: 'Boutique en ligne ModeFR',
    result: 'Trafic organique x2.8, CA en ligne +65%',
    testimonial: 'Notre site existait depuis 2 ans sans jamais decoller. L\'optimisation SEO + la refonte technique ont tout change.',
    metric: { value: 180, unit: '% de trafic', period: '90 jours' },
    tags: ['seo', 'ecommerce', 'trafic'],
  },
  {
    id: 'saas_prospection',
    sectors: ['saas', 'tech', 'startup', 'logiciel', 'software'],
    signals: ['job_posting', 'reddit_intent', 'competitor_user'],
    title: '23 RDV qualifies par mois avec la prospection automatisee',
    company: 'SaaS TechFlow',
    result: '23 RDV/mois, taux de conversion 35%, CAC divise par 3',
    testimonial: 'Avant, on passait 3h par jour a prospecter manuellement. Maintenant c\'est automatise et on se concentre sur la vente.',
    metric: { value: 23, unit: 'RDV/mois', period: 'mensuel' },
    tags: ['prospection', 'b2b', 'automatisation'],
  },
  {
    id: 'artisan_visibilite',
    sectors: ['artisan', 'plombier', 'electricien', 'btp', 'construction', 'renovation'],
    signals: ['no_website', 'low_reviews', 'google_maps'],
    title: 'De invisible a 15 demandes de devis par semaine',
    company: 'Plomberie Martin',
    result: '15 demandes/semaine, CA +40% en 6 mois',
    testimonial: 'Je n\'avais pas de site web et 2 avis Google. Maintenant les clients me trouvent directement en ligne.',
    metric: { value: 15, unit: 'demandes/semaine', period: 'hebdomadaire' },
    tags: ['local', 'artisan', 'visibilite'],
  },
  {
    id: 'agence_leads',
    sectors: ['agence', 'agency', 'marketing', 'communication', 'digital', 'conseil'],
    signals: ['job_posting', 'reddit_intent', 'tech_stack'],
    title: 'Pipeline de 120 leads qualifies en 30 jours',
    company: 'Agence DigitalPlus',
    result: '120 leads qualifies, 18 closes, ROI x5',
    testimonial: 'On utilisait LinkedIn manuellement avant. L\'automatisation nous a permis de scaler sans recruter.',
    metric: { value: 120, unit: 'leads qualifies', period: '30 jours' },
    tags: ['leads', 'agence', 'pipeline'],
  },
  {
    id: 'immobilier_mandats',
    sectors: ['immobilier', 'real estate', 'agence immobiliere', 'promoteur'],
    signals: ['new_domain', 'job_posting', 'google_maps'],
    title: '+12 mandats exclusifs en un trimestre',
    company: 'Immo Prestige Lyon',
    result: '12 mandats exclusifs, reduction du cycle de vente de 40%',
    testimonial: 'La prospection ciblee nous permet de toucher des vendeurs au bon moment, avant nos concurrents.',
    metric: { value: 12, unit: 'mandats', period: '3 mois' },
    tags: ['immobilier', 'mandats', 'exclusif'],
  },
  {
    id: 'medical_patients',
    sectors: ['medical', 'dentiste', 'kine', 'osteopathe', 'sante', 'pharmacie'],
    signals: ['low_reviews', 'no_website', 'google_maps'],
    title: 'Remplissage du planning a 95% grace a la visibilite en ligne',
    company: 'Cabinet Dentaire Sourire',
    result: 'Planning rempli a 95%, +60% de nouveaux patients',
    testimonial: 'Les patients nous trouvent sur Google Maps et prennent rendez-vous directement en ligne.',
    metric: { value: 95, unit: '% de remplissage', period: 'continu' },
    tags: ['medical', 'patients', 'rdv'],
  },
]

// ─── Callable: match case study to prospect ──────────────────────────

export const matchSocialProof = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, sector, signalType } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  let prospectSector = sector
  let prospectSignal = signalType

  // Get prospect data if prospectId provided
  if (prospectId) {
    const pDoc = await db.collection('organizations').doc(orgId)
      .collection('prospects').doc(prospectId).get()
    if (pDoc.exists) {
      const p = pDoc.data()
      prospectSector = prospectSector || p.sector || p.niche || ''
      prospectSignal = prospectSignal || p.signal_type || ''
    }
  }

  // Get org's custom case studies
  const customSnap = await db.collection('organizations').doc(orgId)
    .collection('caseStudies').limit(50).get()
  const customCases = customSnap.docs.map(d => ({ id: d.id, ...d.data(), isCustom: true }))

  // Combine with defaults
  const allCases = [...customCases, ...DEFAULT_CASE_STUDIES]

  // Match
  const match = findBestMatch(allCases, prospectSector, prospectSignal)

  // Get dynamic counter
  const counter = await getDynamicCounter(db, orgId, prospectSector)

  return {
    success: true,
    caseStudy: match,
    counter,
    snippets: generateSnippets(match, counter, prospectSector),
  }
})

// ─── Callable: add custom case study ─────────────────────────────────

export const addCaseStudy = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, caseStudy } = request.data || {}
  if (!orgId || !caseStudy) throw new HttpsError('invalid-argument', 'orgId et caseStudy requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const ref = await db.collection('organizations').doc(orgId)
    .collection('caseStudies').add({
      ...caseStudy,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    })

  return { success: true, caseStudyId: ref.id }
})

// ─── Callable: get social proof stats ────────────────────────────────

export const getSocialProofStats = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  // Count prospects by sector
  const prospectsSnap = await db.collection('organizations').doc(orgId)
    .collection('prospects')
    .where('status', 'in', ['contacted', 'responded', 'qualified', 'won'])
    .limit(500)
    .get()

  const bySector = {}
  const byStatus = {}
  for (const doc of prospectsSnap.docs) {
    const p = doc.data()
    const sector = p.sector || p.niche || 'autre'
    bySector[sector] = (bySector[sector] || 0) + 1
    const status = p.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1
  }

  // Custom case studies count
  const casesSnap = await db.collection('organizations').doc(orgId)
    .collection('caseStudies').count().get()

  return {
    totalActiveProspects: prospectsSnap.size,
    bySector,
    byStatus,
    customCaseStudies: casesSnap.data().count,
    defaultCaseStudies: DEFAULT_CASE_STUDIES.length,
  }
})

// ─── Core matching function ──────────────────────────────────────────

export function findBestMatch(caseStudies, sector, signalType) {
  const sectorLower = (sector || '').toLowerCase()
  const signalLower = (signalType || '').toLowerCase()

  let bestMatch = null
  let bestScore = -1

  for (const cs of caseStudies) {
    let matchScore = 0

    // Sector match
    if (cs.sectors && sectorLower) {
      const sectorMatch = cs.sectors.some(s => sectorLower.includes(s) || s.includes(sectorLower))
      if (sectorMatch) matchScore += 10
    }

    // Signal match
    if (cs.signals && signalLower) {
      const signalMatch = cs.signals.some(s => signalLower.includes(s) || s.includes(signalLower))
      if (signalMatch) matchScore += 5
    }

    // Tags match
    if (cs.tags && sectorLower) {
      const tagMatch = cs.tags.some(t => sectorLower.includes(t))
      if (tagMatch) matchScore += 3
    }

    if (matchScore > bestScore) {
      bestScore = matchScore
      bestMatch = cs
    }
  }

  // Fallback: return first case study if no match
  return bestMatch || caseStudies[0] || null
}

// ─── Dynamic counter ─────────────────────────────────────────────────

async function getDynamicCounter(db, orgId, sector) {
  const sectorLower = (sector || '').toLowerCase()

  // Count real prospects in this sector
  const snap = await db.collection('organizations').doc(orgId)
    .collection('prospects')
    .where('status', 'in', ['contacted', 'responded', 'qualified', 'won'])
    .limit(500)
    .get()

  let sectorCount = 0
  let totalCount = snap.size
  for (const doc of snap.docs) {
    const p = doc.data()
    const pSector = (p.sector || p.niche || '').toLowerCase()
    if (sectorLower && pSector.includes(sectorLower)) sectorCount++
  }

  // Build dynamic message
  const sectorLabel = sector || 'votre secteur'
  let message = ''
  if (sectorCount > 5) {
    message = `${sectorCount} entreprises de ${sectorLabel} nous font deja confiance`
  } else if (totalCount > 10) {
    message = `Plus de ${Math.floor(totalCount / 10) * 10} entreprises nous font deja confiance`
  } else {
    message = `Des entreprises de ${sectorLabel} nous font deja confiance`
  }

  return { sectorCount, totalCount, message, sectorLabel }
}

// ─── Snippet generation ──────────────────────────────────────────────

function generateSnippets(caseStudy, counter, sector) {
  if (!caseStudy) return { email: '', linkedin: '', sms: '' }

  const emailSnippet = `📊 **${caseStudy.title}**
"${caseStudy.testimonial}"
— ${caseStudy.company}

${counter.message}.`

  const linkedinSnippet = `${caseStudy.title} — ${caseStudy.result}. ${counter.message}.`

  const smsSnippet = `${caseStudy.company}: ${caseStudy.result}. ${counter.message}.`

  const whatsappSnippet = `💡 *${caseStudy.title}*
_"${caseStudy.testimonial}"_
— ${caseStudy.company}

${counter.message} ✅`

  return { email: emailSnippet, linkedin: linkedinSnippet, sms: smsSnippet, whatsapp: whatsappSnippet }
}
