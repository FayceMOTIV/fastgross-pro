/**
 * Micro-Gift Digital — Super Pouvoir 7 (Alex V4)
 * Generation de mini-rapports personnalises pour les prospects.
 *
 * Types de micro-gifts :
 *  1. Mini-audit SEO (5 metriques cles)
 *  2. Benchmark concurrentiel (3 concurrents)
 *  3. Checklist sectorielle (10 points)
 *  4. Rapport Google Maps (visibilite locale)
 *  5. Score de maturite digitale (resume DScore)
 *
 * Output : HTML structure pret a etre converti en PDF ou envoye par email.
 *
 * Storage: organizations/{orgId}/microGifts/{giftId}
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Gift types ──────────────────────────────────────────────────────

const GIFT_TYPES = {
  seo_audit: {
    label: 'Mini-Audit SEO',
    description: 'Analyse rapide de 5 metriques SEO cles',
    icon: 'search',
  },
  competitor_benchmark: {
    label: 'Benchmark Concurrentiel',
    description: 'Comparaison avec 3 concurrents directs',
    icon: 'bar-chart',
  },
  sector_checklist: {
    label: 'Checklist Sectorielle',
    description: '10 points essentiels pour votre secteur',
    icon: 'check-square',
  },
  local_visibility: {
    label: 'Rapport Visibilite Locale',
    description: 'Analyse de votre presence Google Maps',
    icon: 'map-pin',
  },
  digital_maturity: {
    label: 'Score Maturite Digitale',
    description: 'Evaluation de votre maturite numerique',
    icon: 'activity',
  },
}

// ─── Callable: generate micro-gift ───────────────────────────────────

export const generateMicroGift = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId, giftType, customData } = request.data || {}
  if (!orgId || !prospectId) throw new HttpsError('invalid-argument', 'orgId et prospectId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const type = giftType || 'digital_maturity'
  if (!GIFT_TYPES[type]) throw new HttpsError('invalid-argument', `Type invalide. Valides: ${Object.keys(GIFT_TYPES).join(', ')}`)

  const db = getDb()

  // Get prospect data
  const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!pDoc.exists) throw new HttpsError('not-found', 'Prospect introuvable')
  const prospect = pDoc.data()

  // Get org data for branding
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const org = orgDoc.data() || {}

  // Generate the gift content
  const gift = await generateGiftContent(type, prospect, org, customData)

  // Generate HTML report
  const html = generateHTML(gift, type, prospect, org)

  // Save to Firestore
  const ref = await db.collection(`organizations/${orgId}/microGifts`).add({
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    prospectEmail: prospect.email || '',
    giftType: type,
    giftLabel: GIFT_TYPES[type].label,
    content: gift,
    htmlReport: html,
    status: 'generated',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
    sentAt: null,
    openedAt: null,
  })

  logger.info(`Micro-Gift generated: ${type} for prospect ${prospectId}, org ${orgId}`)
  return {
    success: true,
    giftId: ref.id,
    giftType: type,
    giftLabel: GIFT_TYPES[type].label,
    html,
    content: gift,
  }
})

// ─── Callable: list micro-gifts ──────────────────────────────────────

export const listMicroGifts = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, prospectId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  let query = db.collection(`organizations/${orgId}/microGifts`)
    .orderBy('createdAt', 'desc')
    .limit(50)

  if (prospectId) {
    query = db.collection(`organizations/${orgId}/microGifts`)
      .where('prospectId', '==', prospectId)
      .orderBy('createdAt', 'desc')
      .limit(20)
  }

  const snap = await query.get()
  const gifts = snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, ...data, htmlReport: undefined } // Exclude heavy HTML from list
  })

  return { gifts, total: gifts.length }
})

// ─── Callable: get gift types ────────────────────────────────────────

export const getMicroGiftTypes = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  return {
    types: Object.entries(GIFT_TYPES).map(([key, value]) => ({
      id: key,
      ...value,
    })),
  }
})

// ─── Core: generate gift content ─────────────────────────────────────

async function generateGiftContent(type, prospect, org, customData) {
  const { callAI, extractJSON } = await import('../ai/callAI.js')

  const prospectName = prospect.name || prospect.company || 'Entreprise'
  const prospectWebsite = prospect.website || ''
  const prospectSector = prospect.sector || prospect.niche || ''

  const prompts = {
    seo_audit: `Genere un mini-audit SEO pour l'entreprise "${prospectName}" (site: ${prospectWebsite || 'inconnu'}, secteur: ${prospectSector}).

Analyse 5 metriques SEO cles et donne une note /20 pour chacune :
1. Presence en ligne (site web, domaine)
2. Optimisation technique (vitesse supposee, mobile-friendly)
3. Contenu et mots-cles
4. Backlinks et autorite
5. SEO local (Google Maps, fiches)

Reponds en JSON :
{
  "title": "Mini-Audit SEO — ${prospectName}",
  "score": 0-100,
  "metrics": [
    { "name": "nom metrique", "score": 0-20, "status": "bon|moyen|critique", "detail": "explication courte", "recommendation": "conseil actionnable" }
  ],
  "summary": "resume en 2 phrases",
  "topRecommendation": "la recommandation #1 prioritaire"
}`,

    competitor_benchmark: `Genere un benchmark concurrentiel pour "${prospectName}" (secteur: ${prospectSector}).

Imagine 3 concurrents typiques du meme secteur et compare sur 5 criteres :
1. Presence web
2. Reseaux sociaux
3. Avis clients
4. Innovation/Tech
5. Marketing digital

Reponds en JSON :
{
  "title": "Benchmark Concurrentiel — ${prospectName}",
  "competitors": [
    { "name": "Concurrent 1", "scores": { "web": 0-20, "social": 0-20, "avis": 0-20, "tech": 0-20, "marketing": 0-20 } }
  ],
  "prospectScores": { "web": 0-20, "social": 0-20, "avis": 0-20, "tech": 0-20, "marketing": 0-20 },
  "gaps": ["ecart 1", "ecart 2", "ecart 3"],
  "opportunities": ["opportunite 1", "opportunite 2"],
  "summary": "resume en 2 phrases"
}`,

    sector_checklist: `Genere une checklist de 10 points essentiels pour une entreprise du secteur "${prospectSector || 'PME'}".

Chaque point doit etre concret et actionnable. Estime si ${prospectName} valide probablement chaque point ou non.

Reponds en JSON :
{
  "title": "Checklist ${prospectSector || 'PME'} — 10 Points Essentiels",
  "items": [
    { "label": "point a verifier", "description": "pourquoi c'est important", "estimated": true|false, "priority": "haute|moyenne|basse" }
  ],
  "validatedCount": 0-10,
  "summary": "resume en 2 phrases",
  "topAction": "action prioritaire #1"
}`,

    local_visibility: `Genere un rapport de visibilite locale pour "${prospectName}" (secteur: ${prospectSector}).

Analyse 5 aspects de la presence locale :
1. Fiche Google Business (estimee)
2. Avis Google (quantite et qualite)
3. Referencement local
4. Presence annuaires
5. Reseaux sociaux locaux

Reponds en JSON :
{
  "title": "Rapport Visibilite Locale — ${prospectName}",
  "score": 0-100,
  "dimensions": [
    { "name": "dimension", "score": 0-20, "status": "bon|moyen|critique", "detail": "explication", "action": "recommandation" }
  ],
  "localRank": "estimation du rang local",
  "summary": "resume en 2 phrases",
  "quickWin": "action rapide pour ameliorer"
}`,

    digital_maturity: `Genere un score de maturite digitale pour "${prospectName}" (site: ${prospectWebsite || 'inconnu'}, secteur: ${prospectSector}).

Evalue 5 dimensions :
1. Site web et UX (0-20)
2. Marketing digital (0-20)
3. Outils et automatisation (0-20)
4. Donnees et analytics (0-20)
5. Innovation et IA (0-20)

Reponds en JSON :
{
  "title": "Score Maturite Digitale — ${prospectName}",
  "totalScore": 0-100,
  "level": "debutant|intermediaire|avance|expert",
  "dimensions": [
    { "name": "dimension", "score": 0-20, "detail": "explication courte", "nextStep": "prochaine etape" }
  ],
  "strengths": ["force 1", "force 2"],
  "weaknesses": ["faiblesse 1", "faiblesse 2"],
  "summary": "resume en 2 phrases",
  "roadmap": "plan d'action en 3 etapes"
}`,
  }

  const prompt = prompts[type]
  if (!prompt) return { title: 'Rapport', summary: 'Type non supporte' }

  try {
    const aiResponse = await callAI(prompt, 2000)
    const parsed = extractJSON(aiResponse)
    if (parsed) return parsed
    return { title: `Rapport — ${prospectName}`, summary: 'Generation automatique', raw: aiResponse.substring(0, 500) }
  } catch (error) {
    logger.warn('Micro-Gift AI generation error:', error.message)
    return { title: `Rapport — ${prospectName}`, summary: 'Erreur de generation', error: error.message }
  }
}

// ─── HTML report generator ───────────────────────────────────────────

function generateHTML(gift, type, prospect, org) {
  const orgName = org.name || org.companyName || 'Face Media Factory'
  const prospectName = prospect.name || prospect.company || 'Entreprise'
  const giftLabel = GIFT_TYPES[type]?.label || 'Rapport'
  const score = gift.totalScore || gift.score || 0
  const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'

  let metricsHTML = ''

  // Build metrics section based on type
  const items = gift.metrics || gift.dimensions || gift.items || []
  for (const item of items) {
    const itemScore = item.score || 0
    const maxScore = 20
    const pct = Math.round((itemScore / maxScore) * 100)
    const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444'
    const status = item.status || item.priority || ''

    metricsHTML += `
    <div style="margin-bottom:16px;padding:16px;background:#F9FAFB;border-radius:8px;border-left:4px solid ${color}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong style="font-size:14px;color:#111827">${item.name || item.label || ''}</strong>
        <span style="font-size:14px;font-weight:700;color:${color}">${itemScore}/${maxScore}</span>
      </div>
      <p style="font-size:13px;color:#6B7280;margin:0 0 8px">${item.detail || item.description || ''}</p>
      <div style="background:#E5E7EB;border-radius:999px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:999px"></div>
      </div>
      ${item.recommendation || item.action || item.nextStep ? `<p style="font-size:12px;color:#4F6EF7;margin:8px 0 0;font-style:italic">${item.recommendation || item.action || item.nextStep}</p>` : ''}
    </div>`
  }

  // Gaps / opportunities
  let extrasHTML = ''
  if (gift.gaps?.length) {
    extrasHTML += '<div style="margin-top:24px"><h3 style="font-size:16px;color:#EF4444;margin-bottom:8px">Points d\'ecart</h3><ul style="padding-left:20px;color:#374151">'
    for (const g of gift.gaps) extrasHTML += `<li style="margin-bottom:4px">${g}</li>`
    extrasHTML += '</ul></div>'
  }
  if (gift.opportunities?.length) {
    extrasHTML += '<div style="margin-top:16px"><h3 style="font-size:16px;color:#10B981;margin-bottom:8px">Opportunites</h3><ul style="padding-left:20px;color:#374151">'
    for (const o of gift.opportunities) extrasHTML += `<li style="margin-bottom:4px">${o}</li>`
    extrasHTML += '</ul></div>'
  }
  if (gift.strengths?.length) {
    extrasHTML += '<div style="margin-top:16px"><h3 style="font-size:16px;color:#10B981;margin-bottom:8px">Points forts</h3><ul style="padding-left:20px;color:#374151">'
    for (const s of gift.strengths) extrasHTML += `<li style="margin-bottom:4px">${s}</li>`
    extrasHTML += '</ul></div>'
  }
  if (gift.weaknesses?.length) {
    extrasHTML += '<div style="margin-top:16px"><h3 style="font-size:16px;color:#F59E0B;margin-bottom:8px">Axes d\'amelioration</h3><ul style="padding-left:20px;color:#374151">'
    for (const w of gift.weaknesses) extrasHTML += `<li style="margin-bottom:4px">${w}</li>`
    extrasHTML += '</ul></div>'
  }

  const topRec = gift.topRecommendation || gift.quickWin || gift.topAction || gift.roadmap || ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${giftLabel} — ${prospectName}</title>
<style>body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#F3F4F6;color:#111827}
.container{max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07)}
.header{background:linear-gradient(135deg,#4F6EF7,#7C3AED);padding:32px;color:white;text-align:center}
.header h1{margin:0 0 8px;font-size:24px;font-weight:700}
.header p{margin:0;opacity:0.9;font-size:14px}
.score-circle{width:100px;height:100px;border-radius:50%;border:6px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;margin:20px auto;font-size:32px;font-weight:800}
.body{padding:32px}
.footer{background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB}
.footer p{margin:0;font-size:12px;color:#9CA3AF}
.cta{display:inline-block;padding:12px 32px;background:#4F6EF7;color:white;text-decoration:none;border-radius:8px;font-weight:600;margin-top:16px}
</style></head>
<body>
<div class="container">
  <div class="header">
    <p style="text-transform:uppercase;letter-spacing:2px;font-size:11px;margin-bottom:16px">${orgName}</p>
    <h1>${gift.title || giftLabel}</h1>
    <p>Prepare pour ${prospectName}</p>
    ${score ? `<div class="score-circle" style="color:white">${score}<span style="font-size:14px">/100</span></div>` : ''}
    ${gift.level ? `<p style="font-size:16px;margin-top:8px;font-weight:600">Niveau : ${gift.level}</p>` : ''}
  </div>
  <div class="body">
    ${gift.summary ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin-bottom:24px">${gift.summary}</p>` : ''}
    ${metricsHTML}
    ${extrasHTML}
    ${topRec ? `<div style="margin-top:24px;padding:16px;background:#EEF2FF;border-radius:8px;border:1px solid #C7D2FE">
      <h3 style="font-size:14px;color:#4F6EF7;margin:0 0 8px">Recommandation prioritaire</h3>
      <p style="font-size:14px;color:#374151;margin:0">${topRec}</p>
    </div>` : ''}
  </div>
  <div class="footer">
    <p>Rapport genere automatiquement par ${orgName}</p>
    <p style="margin-top:4px">Vous souhaitez aller plus loin ? Parlons-en.</p>
  </div>
</div>
</body></html>`
}

// ─── Internal: generate gift for alexActionExecutor ──────────────────

export async function generateGiftForProspect(db, orgId, prospectId, giftType) {
  const pDoc = await db.doc(`organizations/${orgId}/prospects/${prospectId}`).get()
  if (!pDoc.exists) return { error: 'Prospect introuvable' }
  const prospect = pDoc.data()

  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  const org = orgDoc.data() || {}

  const type = giftType || 'digital_maturity'
  const gift = await generateGiftContent(type, prospect, org)
  const html = generateHTML(gift, type, prospect, org)

  const ref = await db.collection(`organizations/${orgId}/microGifts`).add({
    prospectId,
    prospectName: prospect.name || prospect.company || '',
    giftType: type,
    giftLabel: GIFT_TYPES[type]?.label || type,
    content: gift,
    htmlReport: html,
    status: 'generated',
    createdAt: FieldValue.serverTimestamp(),
  })

  return { giftId: ref.id, giftType: type, title: gift.title, score: gift.totalScore || gift.score }
}
