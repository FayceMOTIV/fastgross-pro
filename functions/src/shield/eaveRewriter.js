/**
 * EAV-E Content Rewriter — Module 8 (Alex V4 SHIELD)
 * Reecrit du contenu selon les criteres Google E-E-A-T (E-A-V-E en francais) :
 *  - Experience : temoignages, cas concrets, vecu personnel
 *  - Autorite : citations, donnees, sources fiables
 *  - Valeur : contenu actionnable, conseils pratiques
 *  - Expertise : precision technique, profondeur du sujet
 *
 * Input : texte brut ou URL
 * Output : texte reecrit + score E-A-V-E avant/apres
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── E-A-V-E Scoring criteria ────────────────────────────────────────

const EAVE_CRITERIA = {
  experience: {
    label: 'Experience',
    description: 'Temoignages, cas concrets, exemples vecus',
    maxScore: 25,
    signals: [
      { pattern: /j'ai|nous avons|mon experience|notre equipe|en pratique|concretement|sur le terrain|dans notre cas/gi, points: 5, label: 'Experience personnelle' },
      { pattern: /client|cas concret|exemple reel|temoignage|retour d'experience|cas d'usage|mis en place/gi, points: 5, label: 'Cas concrets' },
      { pattern: /resultat|chiffre|pourcentage|\d+\s*%|augment|reduit|amelior/gi, points: 5, label: 'Resultats mesurables' },
      { pattern: /avant|apres|transformation|evolution|progression/gi, points: 5, label: 'Avant/apres' },
      { pattern: /erreur|piege|eviter|attention|ne pas|lecon apprise/gi, points: 5, label: 'Lecons apprises' },
    ]
  },
  authority: {
    label: 'Autorite',
    description: 'Citations, sources, donnees verifiables',
    maxScore: 25,
    signals: [
      { pattern: /selon|d'apres|etude|recherche|rapport|source|reference/gi, points: 5, label: 'Sources citees' },
      { pattern: /expert|specialiste|professionnel|certifi|diplom|reconnu/gi, points: 5, label: 'Credibilite auteur' },
      { pattern: /statistique|donnee|chiffre|mesure|\d{4}|enquete|sondage/gi, points: 5, label: 'Donnees factuelles' },
      { pattern: /norme|standard|regulation|loi|directive|conformit/gi, points: 5, label: 'References normatives' },
      { pattern: /partenaire|collaboration|publie|interview|conference/gi, points: 5, label: 'Reconnaissance externe' },
    ]
  },
  value: {
    label: 'Valeur',
    description: 'Contenu actionnable, conseils pratiques',
    maxScore: 25,
    signals: [
      { pattern: /etape|methode|guide|tutoriel|comment|mode d'emploi/gi, points: 5, label: 'Guide actionnable' },
      { pattern: /conseil|astuce|recommandation|bonne pratique|a faire/gi, points: 5, label: 'Conseils pratiques' },
      { pattern: /outil|ressource|template|modele|checklist|gratuit/gi, points: 5, label: 'Ressources utiles' },
      { pattern: /solution|resoudre|reponse|alternative|option/gi, points: 5, label: 'Solutions concretes' },
      { pattern: /economiser|gagner|optimiser|simplifier|accelerer/gi, points: 5, label: 'Benefices clairs' },
    ]
  },
  expertise: {
    label: 'Expertise',
    description: 'Precision technique, profondeur du sujet',
    maxScore: 25,
    signals: [
      { pattern: /technique|technologie|algorithme|architecture|framework|infrastructure/gi, points: 5, label: 'Vocabulaire technique' },
      { pattern: /detail|approfondi|nuance|subtilite|complexit|en profondeur/gi, points: 5, label: 'Profondeur d\'analyse' },
      { pattern: /comparaison|avantage|inconvenient|limite|trade-off|compromis/gi, points: 5, label: 'Analyse critique' },
      { pattern: /tendance|evolution|futur|prediction|innovation|emergence/gi, points: 5, label: 'Vision prospective' },
      { pattern: /prerequis|condition|contexte|situation|cas particulier|exception/gi, points: 5, label: 'Contextualisation' },
    ]
  }
}

// ─── Callable: rewrite content ───────────────────────────────────────

export const rewriteContent = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, content, url, focus, tone } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')
  if (!content && !url) throw new HttpsError('invalid-argument', 'content ou url requis')

  // Fetch content from URL if needed
  let inputContent = content
  if (!inputContent && url) {
    inputContent = await fetchContentFromUrl(url)
    if (!inputContent) throw new HttpsError('failed-precondition', 'Impossible de recuperer le contenu de l\'URL')
  }

  const result = await rewriteWithEave(inputContent, focus, tone)

  // Save to Firestore
  const db = getDb()
  await db.collection('organizations').doc(orgId).collection('eaveRewrites').doc().set({
    originalContent: inputContent.substring(0, 2000),
    rewrittenContent: result.rewrittenContent,
    scoresBefore: result.scoresBefore,
    scoresAfter: result.scoresAfter,
    url: url || null,
    focus: focus || null,
    createdAt: FieldValue.serverTimestamp(),
  })

  logger.info(`EAV-E Rewrite: ${result.scoresBefore.total} → ${result.scoresAfter.total}`)
  return { success: true, ...result }
})

// ─── Core rewrite function ───────────────────────────────────────────

export async function rewriteWithEave(content, focus, tone) {
  // Score original content
  const scoresBefore = scoreEave(content)

  // Identify weakest dimensions
  const dimensions = ['experience', 'authority', 'value', 'expertise']
  const weakest = dimensions
    .map(d => ({ dim: d, score: scoresBefore[d].score, max: scoresBefore[d].max }))
    .sort((a, b) => (a.score / a.max) - (b.score / b.max))
    .slice(0, 2)
    .map(d => d.dim)

  // Build rewrite prompt
  const focusInstructions = focus
    ? `\nFocus principal : ameliorer "${focus}".`
    : `\nDimensions les plus faibles a ameliorer : ${weakest.map(w => EAVE_CRITERIA[w].label).join(', ')}.`

  const toneInstruction = tone
    ? `\nTon souhaite : ${tone}.`
    : '\nTon : professionnel mais accessible.'

  const { callAI } = await import('../ai/callAI.js')

  const prompt = `Tu es un expert en content marketing et SEO E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).

Reecris ce contenu en ameliorant significativement les criteres E-A-V-E (Experience, Autorite, Valeur, Expertise) tout en gardant le meme sujet et la meme longueur approximative.
${focusInstructions}
${toneInstruction}

Regles :
- Ajoute des exemples concrets et des resultats mesurables (Experience)
- Cite des sources, etudes ou donnees factuelles (Autorite)
- Inclus des conseils actionnables et des etapes claires (Valeur)
- Approfondis les points techniques avec des nuances (Expertise)
- Garde un style naturel, pas sur-optimise
- Ecris en francais
- Ne mets PAS de titre ni de metadata, juste le contenu reecrit

Contenu original :
---
${content.substring(0, 3000)}
---

Contenu reecrit :`

  const rewrittenContent = await callAI(prompt, 3000)

  // Score rewritten content
  const scoresAfter = scoreEave(rewrittenContent)

  // Calculate improvement
  const improvement = {
    total: scoresAfter.total - scoresBefore.total,
    experience: scoresAfter.experience.score - scoresBefore.experience.score,
    authority: scoresAfter.authority.score - scoresBefore.authority.score,
    value: scoresAfter.value.score - scoresBefore.value.score,
    expertise: scoresAfter.expertise.score - scoresBefore.expertise.score,
  }

  return {
    rewrittenContent,
    scoresBefore,
    scoresAfter,
    improvement,
    weakestDimensions: weakest,
    wordCountBefore: content.split(/\s+/).length,
    wordCountAfter: rewrittenContent.split(/\s+/).length,
  }
}

// ─── E-A-V-E Scoring ─────────────────────────────────────────────────

export function scoreEave(content) {
  const result = {}
  let total = 0

  for (const [key, criteria] of Object.entries(EAVE_CRITERIA)) {
    let dimensionScore = 0
    const matchedSignals = []

    for (const signal of criteria.signals) {
      const matches = content.match(signal.pattern) || []
      if (matches.length > 0) {
        dimensionScore += signal.points
        matchedSignals.push({ label: signal.label, count: matches.length })
      }
    }

    const cappedScore = Math.min(dimensionScore, criteria.maxScore)
    total += cappedScore

    result[key] = {
      score: cappedScore,
      max: criteria.maxScore,
      percentage: Math.round((cappedScore / criteria.maxScore) * 100),
      matchedSignals,
      label: criteria.label,
    }
  }

  result.total = Math.min(total, 100)
  result.grade = total >= 80 ? 'Excellent' : total >= 60 ? 'Bon' : total >= 40 ? 'Acceptable' : total >= 20 ? 'Faible' : 'A retravailler'

  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchContentFromUrl(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
      redirect: 'follow',
    })
    if (!response.ok) return null

    const html = await response.text()

    // Extract main content (remove nav, header, footer, scripts, styles)
    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return content.length > 50 ? content.substring(0, 5000) : null
  } catch {
    return null
  }
}
