/**
 * activePainEngine.js
 * Dimension 5 — Douleurs actives detectables
 *
 * Detecte les points de souffrance business visibles publiquement.
 * Directement utilisables par Alex dans ses accroches.
 */

export async function detectActivePains(lead, technography) {
  const pains = []

  // PAIN 1 : Avis negatifs recents sur Google
  const avisNegatifs = detectBadReviews(lead)
  if (avisNegatifs) pains.push(avisNegatifs)

  // PAIN 2 : Site non securise (HTTP)
  if (technography && !technography.hasHttps && technography.source !== 'no_website' && !technography.siteInaccessible) {
    pains.push({
      type: 'NO_HTTPS',
      severity: 'MEDIUM',
      label: 'Site web non securise (HTTP)',
      alexHook: 'Votre site tourne encore en HTTP — Google le penalise en referencement depuis 2018.',
      dScoreBonus: 5,
    })
  }

  // PAIN 3 : Site inaccessible ou inexistant
  if (technography?.siteInaccessible || !lead?.website) {
    pains.push({
      type: 'NO_WEBSITE',
      severity: 'HIGH',
      label: lead?.website ? 'Site web inaccessible' : 'Pas de site web',
      alexHook: lead?.website
        ? 'Votre site web semble inaccessible en ce moment — vos clients ne peuvent pas vous trouver.'
        : 'Je n\'ai pas trouve de site web pour votre entreprise — vos clients vous cherchent en ligne.',
      dScoreBonus: 8,
    })
  }

  // PAIN 4 : Maturite digitale tres faible
  if (technography?.maturiteScore !== undefined && technography.maturiteScore < 25 && !technography.siteInaccessible) {
    pains.push({
      type: 'LOW_DIGITAL_MATURITY',
      severity: 'HIGH',
      label: `Maturite digitale faible (${technography.maturiteScore}/100)`,
      alexHook: `Votre presence digitale est peu developpee — ` +
        (technography.opportunities?.[0] || 'des opportunites concretes existent.'),
      dScoreBonus: 10,
    })
  }

  // PAIN 5 : Pas de pixel de tracking
  if (technography && !technography.siteInaccessible && technography.source !== 'no_website' && !technography.analytics?.length) {
    pains.push({
      type: 'NO_ANALYTICS',
      severity: 'MEDIUM',
      label: 'Aucun outil de mesure web',
      alexHook: 'Vous n\'avez aucun outil pour mesurer votre trafic web — vous volez a l\'aveugle.',
      dScoreBonus: 4,
    })
  }

  // PAIN 6 : Note Google faible (< 3.5)
  const note = lead?.noteGoogle || lead?.rating || 0
  if (note > 0 && note < 3.5 && (lead?.nbAvis || 0) > 5) {
    pains.push({
      type: 'LOW_GOOGLE_RATING',
      severity: 'HIGH',
      label: `Note Google critique (${note}/5)`,
      alexHook: `Votre note Google de ${note}/5 penalise activement votre acquisition — 93% des consommateurs lisent les avis avant d'acheter.`,
      dScoreBonus: 10,
    })
  }

  // PAIN 7 : Fiche Google Maps incomplete
  if (!lead?.website && (lead?.nbAvis || 0) < 5 && lead?.noteGoogle) {
    pains.push({
      type: 'INCOMPLETE_GMB',
      severity: 'MEDIUM',
      label: 'Presence Google Maps incomplete',
      alexHook: 'Votre fiche Google est peu remplie — une fiche optimisee genere en moyenne 3x plus de contacts.',
      dScoreBonus: 5,
    })
  }

  const severityMap = { HIGH: 30, MEDIUM: 15, LOW: 5 }
  const rawScore = pains.reduce((s, p) => s + (severityMap[p.severity] || 0), 0)
  const painScore = Math.min(100, rawScore)

  const totalDScoreBonus = pains.reduce((s, p) => s + (p.dScoreBonus || 0), 0)

  return {
    pains,
    topPain: [...pains].sort((a, b) => (severityMap[b.severity] || 0) - (severityMap[a.severity] || 0))[0] || null,
    painScore,
    dScoreBonus: Math.min(25, totalDScoreBonus),
    source: 'active_pain',
  }
}

function detectBadReviews(lead) {
  const note = lead?.noteGoogle || lead?.rating || 0
  const nbAvis = lead?.nbAvis || lead?.userRatingsTotal || 0

  if (note >= 3.5 && note < 4.0 && nbAvis > 10) {
    return {
      type: 'MEDIOCRE_REVIEWS',
      severity: 'MEDIUM',
      label: `Note Google correcte mais ameliorable (${note}/5 — ${nbAvis} avis)`,
      alexHook: `Votre note Google de ${note}/5 est correcte, mais sous les 4.2 qui declenchent la confiance spontanee des prospects.`,
      dScoreBonus: 5,
    }
  }

  if (note > 0 && note < 3.5 && nbAvis > 5) {
    return {
      type: 'BAD_REVIEWS',
      severity: 'HIGH',
      label: `Note Google critique (${note}/5 — ${nbAvis} avis)`,
      alexHook: `Votre note Google de ${note}/5 penalise activement votre acquisition — 93% des consommateurs lisent les avis avant d'acheter.`,
      dScoreBonus: 10,
    }
  }

  return null
}
