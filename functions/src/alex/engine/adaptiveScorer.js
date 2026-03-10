/**
 * adaptiveScorer.js — Le scoring qui APPREND
 * Le scoring adaptatif apprend de CHAQUE resultat :
 * - Ce prospect a converti → augmenter le poids de ces signaux
 * - Ce prospect n'a pas repondu → diminuer le poids
 *
 * C'est un feedback loop qui rend FMF de plus en plus precis avec le temps.
 */
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

/**
 * Appele quand un prospect change de statut (converti, perdu, pas de reponse)
 */
export async function learnFromOutcome(organizationId, prospectId, outcome) {
  // outcome : 'converted' | 'meeting_booked' | 'replied_positive' | 'replied_negative' | 'no_reply' | 'lost'
  const db = getDb();

  const prospect = (await db.doc(`organizations/${organizationId}/prospects/${prospectId}`).get()).data();
  if (!prospect || !prospect.signals) return;

  // Charger les poids actuels
  const weightsDoc = await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).get();
  const weights = weightsDoc.exists ? weightsDoc.data() : {};

  // Ajuster les poids selon le resultat
  const adjustment = getAdjustment(outcome);

  for (const signal of prospect.signals) {
    const signalType = signal.type;
    const currentWeight = weights[signalType] || 1.0;

    // Multiplicateur : bons resultats augmentent le poids, mauvais le diminuent
    const newWeight = Math.max(0.1, Math.min(3.0, currentWeight * adjustment));
    weights[signalType] = newWeight;
  }

  // Sauvegarder les poids mis a jour
  await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).set(weights, { merge: true });

  // Sauvegarder dans l'historique d'apprentissage
  await db.collection(`organizations/${organizationId}/alexLearning`).add({
    prospectId,
    outcome,
    signals: prospect.signals.map(s => s.type),
    source: prospect.source,
    sector: prospect.sector,
    learnedAt: new Date(),
  });

  return { adjusted: Object.keys(weights).length, outcome };
}

function getAdjustment(outcome) {
  switch (outcome) {
    case 'converted': return 1.3;
    case 'meeting_booked': return 1.2;
    case 'replied_positive': return 1.15;
    case 'replied_negative': return 0.95;
    case 'no_reply': return 0.9;
    case 'lost': return 0.8;
    default: return 1.0;
  }
}

/**
 * Applique les poids appris au scoring d'un prospect
 */
export async function applyLearnedWeights(organizationId, signals) {
  const db = getDb();
  const weightsDoc = await db.doc(`organizations/${organizationId}/alexMemory/signalWeights`).get();
  const weights = weightsDoc.exists ? weightsDoc.data() : {};

  return signals.map(signal => ({
    ...signal,
    rawScore: signal.score,
    adjustedScore: Math.round(signal.score * (weights[signal.type] || 1.0)),
    weight: weights[signal.type] || 1.0,
  }));
}

/**
 * Genere un rapport d'apprentissage pour le user
 * "Voici ce que j'ai appris sur tes meilleurs prospects"
 */
export async function generateLearningInsights(organizationId) {
  const db = getDb();
  const learning = await db.collection(`organizations/${organizationId}/alexLearning`)
    .orderBy('learnedAt', 'desc')
    .limit(100)
    .get();

  if (learning.empty) return null;

  const outcomes = learning.docs.map(d => d.data());

  // Analyser les patterns
  const convertedSignals = {};
  const lostSignals = {};

  for (const outcome of outcomes) {
    const bucket = outcome.outcome === 'converted' || outcome.outcome === 'meeting_booked'
      ? convertedSignals : lostSignals;

    for (const signal of (outcome.signals || [])) {
      bucket[signal] = (bucket[signal] || 0) + 1;
    }
  }

  // Trouver les signaux les plus predictifs de conversion
  const bestSignals = Object.entries(convertedSignals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([signal, count]) => ({ signal, conversions: count }));

  // Trouver les signaux qui menent le plus souvent a rien
  const worstSignals = Object.entries(lostSignals)
    .filter(([signal]) => !convertedSignals[signal] || convertedSignals[signal] < lostSignals[signal])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([signal, count]) => ({ signal, losses: count }));

  return {
    totalOutcomes: outcomes.length,
    conversionRate: outcomes.filter(o => o.outcome === 'converted' || o.outcome === 'meeting_booked').length / outcomes.length,
    bestSignals,
    worstSignals,
    recommendation: bestSignals.length > 0
      ? `Tes meilleurs prospects ont souvent ces signaux : ${bestSignals.map(s => s.signal).join(', ')}. Je me concentre dessus.`
      : 'Pas encore assez de donnees pour optimiser. Continue a prospecter, j\'apprends de chaque resultat.',
  };
}
