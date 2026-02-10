/**
 * A/B Testing System - Test automatique de variantes
 * Niveau Instantly : Optimisation continue des messages
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// Configuration A/B testing
const MIN_SAMPLE_SIZE = 50 // Minimum d'envois avant de declarer un gagnant
const CONFIDENCE_THRESHOLD = 0.95 // 95% de confiance
const AUTO_SELECT_WINNER = true // Selectionner automatiquement le gagnant

/**
 * Cree un test A/B pour une campagne
 */
export async function createABTest(orgId, campaignId, variantA, variantB, options = {}) {
  const db = getDb()

  const test = {
    campaignId,
    status: 'running',
    startedAt: new Date(),

    variantA: {
      id: 'A',
      subject: variantA.steps?.[0]?.subject || variantA.subject,
      content: variantA.steps?.[0]?.content || variantA.content,
      style: variantA.style || 'direct',
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      unsubscribed: 0
    },

    variantB: {
      id: 'B',
      subject: variantB.steps?.[0]?.subject || variantB.subject,
      content: variantB.steps?.[0]?.content || variantB.content,
      style: variantB.style || 'question',
      sent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      unsubscribed: 0
    },

    metric: options.metric || 'replyRate', // openRate, clickRate, replyRate
    minSampleSize: options.minSampleSize || MIN_SAMPLE_SIZE,
    autoSelectWinner: options.autoSelectWinner ?? AUTO_SELECT_WINNER,

    winner: null,
    winnerSelectedAt: null,
    winnerReason: null
  }

  const docRef = await db.collection(`organizations/${orgId}/abTests`).add(test)
  return { id: docRef.id, ...test }
}

/**
 * Selectionne la variante a utiliser pour un envoi
 * Distribution 50/50 equilibree
 */
export async function selectVariant(orgId, testId) {
  const db = getDb()
  const testDoc = await db.doc(`organizations/${orgId}/abTests/${testId}`).get()

  if (!testDoc.exists) {
    return { variant: 'A', error: 'Test not found' }
  }

  const test = testDoc.data()

  // Si un gagnant a ete selectionne, toujours utiliser cette variante
  if (test.winner) {
    return {
      variant: test.winner,
      reason: 'winner_selected',
      variantData: test.winner === 'A' ? test.variantA : test.variantB
    }
  }

  // Distribution 50/50 basee sur le nombre d'envois
  const sentA = test.variantA.sent || 0
  const sentB = test.variantB.sent || 0

  // Choisir la variante avec le moins d'envois (equilibrage)
  const selectedVariant = sentA <= sentB ? 'A' : 'B'

  return {
    variant: selectedVariant,
    reason: 'balanced_distribution',
    variantData: selectedVariant === 'A' ? test.variantA : test.variantB
  }
}

/**
 * Enregistre un evenement pour une variante
 */
export async function recordEvent(orgId, testId, variant, event) {
  const db = getDb()
  const testRef = db.doc(`organizations/${orgId}/abTests/${testId}`)

  const validEvents = ['sent', 'opened', 'clicked', 'replied', 'unsubscribed']
  if (!validEvents.includes(event)) {
    return { success: false, error: 'Invalid event' }
  }

  const variantField = variant === 'A' ? 'variantA' : 'variantB'

  await db.runTransaction(async (transaction) => {
    const testDoc = await transaction.get(testRef)
    if (!testDoc.exists) return

    const test = testDoc.data()
    const variantData = test[variantField]

    transaction.update(testRef, {
      [`${variantField}.${event}`]: (variantData[event] || 0) + 1,
      lastEventAt: new Date()
    })
  })

  // Verifier si on peut determiner un gagnant
  await checkForWinner(orgId, testId)

  return { success: true }
}

/**
 * Calcule les statistiques d'un test A/B
 */
export function calculateTestStats(test) {
  const metric = test.metric || 'replyRate'

  const statsA = calculateVariantStats(test.variantA)
  const statsB = calculateVariantStats(test.variantB)

  // Determiner le leader actuel
  const metricA = statsA[metric] || 0
  const metricB = statsB[metric] || 0

  let leader = null
  let difference = 0
  let percentDifference = 0

  if (metricA !== metricB) {
    leader = metricA > metricB ? 'A' : 'B'
    difference = Math.abs(metricA - metricB)
    percentDifference = metricA > 0 ? (difference / metricA) * 100 : 100
  }

  // Calculer la signification statistique (simplifiee)
  const significance = calculateSignificance(test.variantA, test.variantB, metric)

  return {
    variantA: statsA,
    variantB: statsB,
    metric,
    leader,
    difference: difference.toFixed(2),
    percentDifference: percentDifference.toFixed(1),
    significance,
    isSignificant: significance >= CONFIDENCE_THRESHOLD,
    totalSent: (test.variantA.sent || 0) + (test.variantB.sent || 0),
    canDeclareWinner:
      (test.variantA.sent || 0) >= test.minSampleSize &&
      (test.variantB.sent || 0) >= test.minSampleSize &&
      significance >= CONFIDENCE_THRESHOLD
  }
}

function calculateVariantStats(variant) {
  const sent = variant.sent || 0
  const opened = variant.opened || 0
  const clicked = variant.clicked || 0
  const replied = variant.replied || 0
  const unsubscribed = variant.unsubscribed || 0

  return {
    sent,
    opened,
    clicked,
    replied,
    unsubscribed,
    openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0,
    clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0,
    replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(2) : 0,
    unsubscribeRate: sent > 0 ? ((unsubscribed / sent) * 100).toFixed(2) : 0
  }
}

/**
 * Calcule la signification statistique (test de proportion z)
 * Simplifie pour l'implementation
 */
function calculateSignificance(variantA, variantB, metric) {
  const rateField = metric.replace('Rate', '')

  const n1 = variantA.sent || 1
  const n2 = variantB.sent || 1
  const x1 = variantA[rateField] || 0
  const x2 = variantB[rateField] || 0

  const p1 = x1 / n1
  const p2 = x2 / n2
  const pPooled = (x1 + x2) / (n1 + n2)

  if (pPooled === 0 || pPooled === 1) return 0

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2))
  if (se === 0) return 0

  const z = Math.abs(p1 - p2) / se

  // Convertir z-score en confiance (approximation)
  // z = 1.96 -> 95%, z = 2.58 -> 99%
  if (z >= 2.58) return 0.99
  if (z >= 1.96) return 0.95
  if (z >= 1.65) return 0.90
  if (z >= 1.28) return 0.80
  return z / 2 // Approximation lineaire pour les valeurs basses
}

/**
 * Verifie si on peut declarer un gagnant
 */
async function checkForWinner(orgId, testId) {
  const db = getDb()
  const testDoc = await db.doc(`organizations/${orgId}/abTests/${testId}`).get()

  if (!testDoc.exists) return

  const test = testDoc.data()

  // Deja un gagnant?
  if (test.winner) return

  // Auto-selection desactivee?
  if (!test.autoSelectWinner) return

  const stats = calculateTestStats(test)

  if (stats.canDeclareWinner && stats.leader) {
    await db.doc(`organizations/${orgId}/abTests/${testId}`).update({
      winner: stats.leader,
      winnerSelectedAt: new Date(),
      winnerReason: `Variante ${stats.leader} gagnante avec ${stats.significance * 100}% de confiance. ${test.metric}: ${stats.leader === 'A' ? stats.variantA[test.metric] : stats.variantB[test.metric]}% vs ${stats.leader === 'A' ? stats.variantB[test.metric] : stats.variantA[test.metric]}%`,
      status: 'completed'
    })

    // Notifier
    await db.collection(`organizations/${orgId}/notifications`).add({
      type: 'ab_test_winner',
      testId,
      winner: stats.leader,
      message: `Test A/B termine : Variante ${stats.leader} gagnante !`,
      createdAt: new Date(),
      read: false
    })
  }
}

/**
 * Force la selection d'un gagnant manuellement
 */
export async function selectWinnerManually(orgId, testId, winner, reason) {
  const db = getDb()

  await db.doc(`organizations/${orgId}/abTests/${testId}`).update({
    winner,
    winnerSelectedAt: new Date(),
    winnerReason: reason || `Selection manuelle de la variante ${winner}`,
    status: 'completed'
  })

  return { success: true }
}

/**
 * Recupere tous les tests A/B actifs
 */
export async function getActiveTests(orgId) {
  const db = getDb()
  const testsSnap = await db.collection(`organizations/${orgId}/abTests`)
    .where('status', '==', 'running')
    .orderBy('startedAt', 'desc')
    .get()

  return testsSnap.docs.map(doc => {
    const test = { id: doc.id, ...doc.data() }
    return {
      ...test,
      stats: calculateTestStats(test)
    }
  })
}

/**
 * Recupere l'historique des tests A/B
 */
export async function getTestHistory(orgId, limit = 20) {
  const db = getDb()
  const testsSnap = await db.collection(`organizations/${orgId}/abTests`)
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .get()

  return testsSnap.docs.map(doc => {
    const test = { id: doc.id, ...doc.data() }
    return {
      ...test,
      stats: calculateTestStats(test)
    }
  })
}

/**
 * Genere des insights a partir des tests passes
 */
export async function getTestInsights(orgId) {
  const db = getDb()
  const testsSnap = await db.collection(`organizations/${orgId}/abTests`)
    .where('status', '==', 'completed')
    .where('winner', '!=', null)
    .orderBy('winner')
    .orderBy('winnerSelectedAt', 'desc')
    .limit(50)
    .get()

  if (testsSnap.empty) {
    return { insights: [], message: 'Pas assez de donnees pour generer des insights' }
  }

  const insights = {
    totalTests: testsSnap.size,
    winsByVariant: { A: 0, B: 0 },
    winsByStyle: {},
    averageImprovements: [],
    bestPerformingPatterns: []
  }

  testsSnap.docs.forEach(doc => {
    const test = doc.data()
    insights.winsByVariant[test.winner]++

    const winnerData = test.winner === 'A' ? test.variantA : test.variantB
    const style = winnerData.style || 'unknown'
    insights.winsByStyle[style] = (insights.winsByStyle[style] || 0) + 1
  })

  // Determiner le style le plus performant
  const topStyle = Object.entries(insights.winsByStyle)
    .sort((a, b) => b[1] - a[1])[0]

  if (topStyle) {
    insights.bestPerformingPatterns.push({
      type: 'style',
      value: topStyle[0],
      wins: topStyle[1],
      recommendation: `Le style "${topStyle[0]}" gagne le plus souvent. Utilisez-le par defaut.`
    })
  }

  return insights
}
