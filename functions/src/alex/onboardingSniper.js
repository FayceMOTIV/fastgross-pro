/**
 * Onboarding Sniper — Alex pose les bonnes questions (Alex V4)
 *
 * Flow de questions intelligentes quand un user configure Alex
 * pour la premiere fois OU change de cible.
 *
 * 8 questions cles :
 *  1. Client ideal en une phrase
 *  2. Produit/service exact
 *  3. Probleme resolu
 *  4. Concurrent principal
 *  5. Zone geographique
 *  6. Volume prospects/semaine
 *  7. Budget par client
 *  8. B2B ou B2C
 *
 * Alex fait ses propres recherches (Serper) sur le marche.
 * Stocke tout dans alexMemory/businessProfile.
 *
 * QI 200 = il comprend la niche mieux que le user.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Onboarding questions ────────────────────────────────────────────

const ONBOARDING_QUESTIONS = [
  {
    id: 'ideal_client',
    question: 'Decris ton client ideal en une phrase (ex: "restaurateurs gastronomiques a Lyon avec 50-200 couverts")',
    whatsappText: 'Pour commencer, decris-moi ton client ideal en une phrase. Sois aussi precis ou aussi large que tu veux !',
    required: true,
    category: 'targeting',
  },
  {
    id: 'product_service',
    question: 'Quel est ton produit ou service exactement ?',
    whatsappText: 'Quel est ton produit ou service ? Dis-moi exactement ce que tu vends.',
    required: true,
    category: 'offer',
  },
  {
    id: 'problem_solved',
    question: 'Quel probleme tu resous pour tes clients ?',
    whatsappText: 'Quel probleme principal tu resous pour tes clients ? La douleur que tu soulages.',
    required: true,
    category: 'offer',
  },
  {
    id: 'main_competitor',
    question: 'Qui est ton concurrent principal ? (nom ou type)',
    whatsappText: 'Qui est ton concurrent principal ? Un nom, un type, ou "pas de concurrent direct".',
    required: false,
    category: 'market',
  },
  {
    id: 'geo_zone',
    question: 'Quelle zone geographique ? (ville, region, France entiere, etc.)',
    whatsappText: 'Quelle zone geographique tu cibles ? (ex: Lyon, Ile-de-France, France entiere)',
    required: true,
    category: 'targeting',
  },
  {
    id: 'volume_per_week',
    question: 'Combien de prospects par semaine tu veux ? (5, 20, 50, 100+)',
    whatsappText: 'Combien de prospects par semaine tu veux que je te trouve ? (5, 20, 50, 100+)',
    required: false,
    category: 'volume',
  },
  {
    id: 'budget_per_client',
    question: 'Quel est le panier moyen / budget par client ? (ex: 500EUR, 5000EUR, 50000EUR)',
    whatsappText: 'Quel est ton panier moyen par client ? Ca m\'aide a prioriser les prospects.',
    required: false,
    category: 'business',
  },
  {
    id: 'b2b_or_b2c',
    question: 'C\'est du B2B (entreprises) ou B2C (particuliers) ?',
    whatsappText: 'Tu cibles des entreprises (B2B) ou des particuliers (B2C) ?',
    required: true,
    category: 'targeting',
  },
  {
    id: 'conversion_action',
    question: 'Quand est-ce qu\'un prospect est CHAUD pour toi ? (ex: envoie sa facture, prend RDV, s\'inscrit...)',
    whatsappText: 'Derniere question : qu\'est-ce qu\'un prospect doit faire pour que tu le consideres qualifie ?',
    required: false,
    category: 'conversion',
  },
]

// ─── Callable: start onboarding flow ─────────────────────────────────

export const startOnboardingSniper = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, channel } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()

  // Create or reset onboarding session
  await db.doc(`organizations/${orgId}/alexMemory/onboardingSession`).set({
    status: 'in_progress',
    currentQuestionIndex: 0,
    answers: {},
    channel: channel || 'dashboard',
    startedAt: FieldValue.serverTimestamp(),
    startedBy: request.auth.uid,
    completedAt: null,
  })

  const firstQuestion = ONBOARDING_QUESTIONS[0]
  return {
    success: true,
    question: firstQuestion,
    totalQuestions: ONBOARDING_QUESTIONS.length,
    currentIndex: 0,
  }
})

// ─── Callable: answer onboarding question ────────────────────────────

export const answerOnboardingQuestion = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, questionId, answer } = request.data || {}
  if (!orgId || !questionId || !answer) throw new HttpsError('invalid-argument', 'orgId, questionId et answer requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const sessionRef = db.doc(`organizations/${orgId}/alexMemory/onboardingSession`)
  const sessionDoc = await sessionRef.get()

  if (!sessionDoc.exists || sessionDoc.data().status !== 'in_progress') {
    throw new HttpsError('failed-precondition', 'Pas de session d\'onboarding active')
  }

  const session = sessionDoc.data()
  const answers = session.answers || {}
  answers[questionId] = answer

  const currentIndex = session.currentQuestionIndex || 0
  const nextIndex = currentIndex + 1

  // Check if onboarding is complete
  if (nextIndex >= ONBOARDING_QUESTIONS.length) {
    // Onboarding complete — build business profile
    await sessionRef.update({
      answers,
      currentQuestionIndex: nextIndex,
      status: 'analyzing',
    })

    // Build comprehensive business profile
    const profile = await buildBusinessProfile(db, orgId, answers)

    // Save profile
    await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).set({
      ...profile,
      answers,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sessionRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
    })

    // Trigger product intelligence refresh in background
    try {
      const { refreshOrgProductIntel } = await import('./productIntelligence.js')
      const orgDoc = await db.doc(`organizations/${orgId}`).get()
      if (orgDoc.exists) {
        refreshOrgProductIntel(db, orgId, orgDoc.data()).catch(e => logger.warn('Background product intel refresh failed:', e.message))
      }
    } catch { /* non-blocking */ }

    return {
      success: true,
      complete: true,
      profile,
      message: 'Onboarding termine ! Je connais maintenant ton business par coeur.',
    }
  }

  // Save answer and move to next question
  await sessionRef.update({
    answers,
    currentQuestionIndex: nextIndex,
  })

  const nextQuestion = ONBOARDING_QUESTIONS[nextIndex]
  return {
    success: true,
    complete: false,
    question: nextQuestion,
    totalQuestions: ONBOARDING_QUESTIONS.length,
    currentIndex: nextIndex,
    progress: Math.round((nextIndex / ONBOARDING_QUESTIONS.length) * 100),
  }
})

// ─── Callable: get onboarding status ─────────────────────────────────

export const getOnboardingStatus = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const [sessionDoc, profileDoc] = await Promise.all([
    db.doc(`organizations/${orgId}/alexMemory/onboardingSession`).get(),
    db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get(),
  ])

  return {
    hasSession: sessionDoc.exists,
    session: sessionDoc.exists ? sessionDoc.data() : null,
    hasProfile: profileDoc.exists,
    profile: profileDoc.exists ? profileDoc.data() : null,
    questions: ONBOARDING_QUESTIONS,
  }
})

// ─── Callable: get business profile ──────────────────────────────────

export const getBusinessProfile = onCall({
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const doc = await db.doc(`organizations/${orgId}/alexMemory/businessProfile`).get()

  if (!doc.exists) return { success: true, hasProfile: false }
  return { success: true, hasProfile: true, profile: doc.data() }
})

// ─── Core: build business profile from answers ──────────────────────

async function buildBusinessProfile(db, orgId, answers) {
  const profile = {
    // Direct from answers
    idealClient: answers.ideal_client || '',
    productService: answers.product_service || '',
    problemSolved: answers.problem_solved || '',
    mainCompetitor: answers.main_competitor || '',
    geoZone: answers.geo_zone || '',
    volumePerWeek: parseVolume(answers.volume_per_week),
    budgetPerClient: answers.budget_per_client || '',
    businessType: detectBusinessType(answers.b2b_or_b2c),

    // Derived
    niche: '',
    keywords: [],
    competitors: [],
    targetSectors: [],
    valueProposition: '',
    marketInsights: null,
  }

  // Extract keywords from ideal client description
  profile.keywords = extractKeywords(answers.ideal_client, answers.product_service)

  // Detect niche from answers
  profile.niche = detectNiche(answers)

  // Build value proposition
  profile.valueProposition = `${answers.product_service} — ${answers.problem_solved}`

  // Web search for market insights
  try {
    profile.marketInsights = await researchMarket(
      answers.product_service,
      answers.main_competitor,
      answers.ideal_client,
      profile.niche
    )
    profile.competitors = profile.marketInsights.competitors || [answers.main_competitor].filter(Boolean)
    profile.targetSectors = profile.marketInsights.sectors || []
  } catch (error) {
    logger.warn('Market research failed:', error.message)
    profile.competitors = [answers.main_competitor].filter(Boolean)
  }

  // Build conversion action from answer
  profile.conversionAction = buildConversionAction(answers.conversion_action, profile.niche)

  // Update org document with niche/sector info + conversionAction
  const orgUpdate = {
    niche: profile.niche,
    idealClient: profile.idealClient,
    businessType: profile.businessType,
    valueProp: profile.valueProposition,
    geoZone: profile.geoZone,
    updatedAt: FieldValue.serverTimestamp(),
  }
  if (profile.conversionAction) {
    orgUpdate.conversionAction = profile.conversionAction
  }

  await db.doc(`organizations/${orgId}`).update(orgUpdate)

  return profile
}

// ─── Market research via Serper ──────────────────────────────────────

async function researchMarket(product, competitor, idealClient, niche) {
  const { cachedSerperFetch } = await import('../utils/serperCache.js')

  const queries = [
    competitor ? `${competitor} alternatives concurrents` : `${niche} solutions France`,
    `${product} marche France 2026`,
  ]

  const results = []
  for (const query of queries) {
    try {
      const data = await cachedSerperFetch('search', { q: query, gl: 'fr', hl: 'fr', num: 5 }, { timeoutMs: 10000 })
      for (const item of (data.organic || []).slice(0, 3)) {
        results.push({ title: item.title, snippet: item.snippet })
      }
    } catch { /* continue */ }
  }

  // Use AI to extract insights
  try {
    const { callAI, extractJSON } = await import('../ai/callAI.js')
    const prompt = `Analyse ces resultats de recherche et extrais des insights marche.

Produit/Service : ${product}
Concurrent principal : ${competitor || 'non specifie'}
Client ideal : ${idealClient}
Niche : ${niche}

Resultats de recherche :
${results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}

Reponds en JSON :
{
  "competitors": ["concurrent 1", "concurrent 2", "concurrent 3"],
  "sectors": ["secteur cible 1", "secteur cible 2"],
  "insights": "2-3 phrases sur le marche et les opportunites",
  "sellingPoints": ["argument 1", "argument 2", "argument 3"],
  "objections": ["objection courante 1", "objection courante 2"],
  "pricingRange": "estimation fourchette prix marche"
}`

    const aiResponse = await callAI(prompt, 800)
    return extractJSON(aiResponse) || { competitors: [], sectors: [], insights: '' }
  } catch {
    return { competitors: [], sectors: [], insights: '' }
  }
}

// ─── Conversion Action parser ────────────────────────────────────────

function buildConversionAction(answer, niche) {
  if (!answer) {
    return { type: 'reply_positive', label: 'Reponse positive du prospect', description: '', landingPageEnabled: false, attachmentKeywords: [], ctaUrl: null }
  }

  const lower = answer.toLowerCase()

  if (/facture|contrat|bilan|document|upload|devis|kbis|rib|attestation|justificatif|piece/i.test(lower)) {
    const keywords = extractAttachmentKeywords(lower, niche)
    return {
      type: 'document_upload',
      label: extractLabel(lower, 'Envoyez votre document'),
      description: answer,
      landingPageEnabled: true,
      attachmentKeywords: keywords,
      ctaUrl: null,
    }
  }

  if (/rdv|rendez|calendly|creneau|appel|demo|visio|meeting|point/i.test(lower)) {
    return {
      type: 'booking',
      label: 'Reservez votre creneau',
      description: answer,
      landingPageEnabled: false,
      attachmentKeywords: [],
      ctaUrl: null,
    }
  }

  if (/inscri|compte|essai|sign.?up|test gratuit|freemium/i.test(lower)) {
    return {
      type: 'signup',
      label: 'Creez votre compte',
      description: answer,
      landingPageEnabled: false,
      attachmentKeywords: [],
      ctaUrl: null,
    }
  }

  if (/formulaire|form|questionnaire|sondage|audit/i.test(lower)) {
    return {
      type: 'form_fill',
      label: 'Remplissez le formulaire',
      description: answer,
      landingPageEnabled: false,
      attachmentKeywords: [],
      ctaUrl: null,
    }
  }

  return {
    type: 'reply_positive',
    label: 'Reponse positive du prospect',
    description: answer,
    landingPageEnabled: false,
    attachmentKeywords: [],
    ctaUrl: null,
  }
}

function extractLabel(text, fallback) {
  if (/facture.*electri/i.test(text)) return 'Envoyez votre facture d\'electricite'
  if (/facture/i.test(text)) return 'Envoyez votre facture'
  if (/contrat/i.test(text)) return 'Envoyez votre contrat actuel'
  if (/bilan/i.test(text)) return 'Envoyez votre bilan comptable'
  if (/devis/i.test(text)) return 'Envoyez votre devis actuel'
  if (/kbis/i.test(text)) return 'Envoyez votre Kbis'
  return fallback
}

function extractAttachmentKeywords(text, niche) {
  const base = []
  if (/facture/i.test(text)) base.push('facture')
  if (/electricite|energie|kwh|edf|engie/i.test(text)) base.push('kWh', 'EDF', 'Engie', 'electricite', 'TotalEnergies')
  if (/contrat/i.test(text)) base.push('contrat')
  if (/bilan|comptab/i.test(text)) base.push('bilan', 'exercice', 'resultat')
  if (/assurance/i.test(text)) base.push('assurance', 'prime', 'cotisation', 'sinistre')

  const nicheKeywords = {
    energie: ['kWh', 'MWh', 'facture', 'EDF', 'Engie', 'TotalEnergies', 'consommation'],
    liberal: ['bilan', 'liasse fiscale', 'comptabilite'],
    immobilier: ['mandat', 'compromis', 'diagnostics'],
    artisan: ['devis', 'facture', 'assurance decennale'],
  }

  if (niche && nicheKeywords[niche]) {
    for (const kw of nicheKeywords[niche]) {
      if (!base.includes(kw)) base.push(kw)
    }
  }

  return base.length > 0 ? base : ['document', 'fichier']
}

// ─── Callable: update conversion action (from Settings UI) ──────────

export const updateConversionAction = onCall({
  region: 'europe-west1',
  timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, conversionAction } = request.data || {}
  if (!orgId || !conversionAction) throw new HttpsError('invalid-argument', 'orgId et conversionAction requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const validTypes = ['document_upload', 'booking', 'signup', 'form_fill', 'reply_positive', 'custom']
  if (!validTypes.includes(conversionAction.type)) {
    throw new HttpsError('invalid-argument', `Type invalide: ${conversionAction.type}`)
  }

  const sanitized = {
    type: conversionAction.type,
    label: String(conversionAction.label || '').slice(0, 200),
    description: String(conversionAction.description || '').slice(0, 500),
    landingPageEnabled: conversionAction.type === 'document_upload' ? Boolean(conversionAction.landingPageEnabled) : false,
    attachmentKeywords: Array.isArray(conversionAction.attachmentKeywords) ? conversionAction.attachmentKeywords.slice(0, 20).map(k => String(k).slice(0, 50)) : [],
    ctaUrl: conversionAction.ctaUrl ? String(conversionAction.ctaUrl).slice(0, 500) : null,
  }

  // Update both org doc and businessProfile
  await Promise.all([
    db.doc(`organizations/${orgId}`).update({
      conversionAction: sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    db.doc(`organizations/${orgId}/alexMemory/businessProfile`).update({
      conversionAction: sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {
      // businessProfile may not exist yet
    }),
  ])

  return { success: true, conversionAction: sanitized }
})

// ─── Helpers ─────────────────────────────────────────────────────────

function parseVolume(answer) {
  if (!answer) return 20
  const num = parseInt(String(answer).replace(/[^0-9]/g, ''))
  if (num > 0) return Math.min(num, 500)
  if (/beaucoup|max|tout/i.test(answer)) return 100
  return 20
}

function detectBusinessType(answer) {
  if (!answer) return 'b2b'
  const lower = answer.toLowerCase()
  if (/b2c|particulier|consommateur|client final/i.test(lower)) return 'b2c'
  if (/les deux|both|mixte/i.test(lower)) return 'mixed'
  return 'b2b'
}

function detectNiche(answers) {
  const combined = [
    answers.ideal_client,
    answers.product_service,
    answers.problem_solved,
  ].filter(Boolean).join(' ').toLowerCase()

  const niches = [
    { keywords: ['restaurant', 'food', 'cuisine', 'traiteur', 'boulanger'], niche: 'restauration' },
    { keywords: ['immobilier', 'agence immo', 'mandat', 'bien'], niche: 'immobilier' },
    { keywords: ['saas', 'logiciel', 'software', 'app'], niche: 'saas' },
    { keywords: ['ecommerce', 'boutique', 'vente en ligne', 'shopify'], niche: 'ecommerce' },
    { keywords: ['artisan', 'plombier', 'electricien', 'btp', 'renovation'], niche: 'artisan' },
    { keywords: ['agence', 'marketing', 'communication', 'digital', 'seo'], niche: 'agence' },
    { keywords: ['medical', 'dentiste', 'kine', 'sante', 'pharmacie'], niche: 'medical' },
    { keywords: ['formation', 'coaching', 'consultant', 'conseil'], niche: 'conseil' },
    { keywords: ['avocat', 'juridique', 'comptable', 'expert-comptable'], niche: 'liberal' },
    { keywords: ['startup', 'tech', 'innovation', 'ia'], niche: 'startup' },
  ]

  for (const { keywords, niche } of niches) {
    if (keywords.some(k => combined.includes(k))) return niche
  }

  return 'pme'
}

function extractKeywords(idealClient, product) {
  const combined = [idealClient, product].filter(Boolean).join(' ')
  const words = combined.toLowerCase()
    .replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)

  const stopWords = new Set(['avec', 'pour', 'dans', 'plus', 'sont', 'leur', 'cette', 'sans', 'tout', 'mais', 'comme', 'etre', 'avoir', 'faire'])
  return [...new Set(words.filter(w => !stopWords.has(w)))].slice(0, 15)
}
