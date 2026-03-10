/**
 * signalCorrelator.js — La correlation multi-signaux
 * Un signal seul = faible. Plusieurs signaux combines = prospect brulant.
 * C'est ce qui differencie FMF de TOUS les concurrents.
 */

/**
 * Correle les signaux d'un prospect pour calculer un score composite.
 */
export function correlateSignals(signals, searchPlan) {
  let totalScore = 0;
  const correlations = [];

  // 1. Score individuel de chaque signal
  for (const signal of signals) {
    totalScore += signal.adjustedScore || signal.score || 0;
  }

  // 2. Bonus de correlation — signaux qui se renforcent mutuellement
  const signalTypes = new Set(signals.map(s => s.type));

  if (searchPlan?.correlationCombos) {
    for (const combo of searchPlan.correlationCombos) {
      const matchedSignals = combo.signals.filter(s => signalTypes.has(s));

      if (matchedSignals.length >= 2) {
        const comboBonus = Math.round(combo.combinedScore * (matchedSignals.length / combo.signals.length));
        totalScore += comboBonus;

        correlations.push({
          combo: combo.signals,
          matched: matchedSignals,
          bonus: comboBonus,
          explanation: combo.explanation,
        });
      }
    }
  }

  // 3. Bonus de fraicheur — signaux recents valent plus
  const now = Date.now();
  for (const signal of signals) {
    if (!signal.detectedAt) continue;
    const ageHours = (now - new Date(signal.detectedAt).getTime()) / (1000 * 60 * 60);

    if (ageHours < 24) {
      totalScore += 10;
    } else if (ageHours < 72) {
      totalScore += 5;
    }
    if (ageHours > 168) {
      totalScore -= 5;
    }
  }

  // 4. Bonus de diversite — des signaux de sources DIFFERENTES valent plus
  const uniqueSources = new Set(signals.map(s => s.source));
  if (uniqueSources.size >= 3) {
    totalScore += 15;
  }
  if (uniqueSources.size >= 5) {
    totalScore += 10;
  }

  // 5. Verifier les disqualifiants
  let disqualified = false;
  if (searchPlan?.disqualifiers) {
    for (const disq of searchPlan.disqualifiers) {
      if (signals.some(s => s.message?.toLowerCase().includes(disq.toLowerCase()))) {
        disqualified = true;
        totalScore = Math.max(totalScore - 50, 0);
      }
    }
  }

  // 6. Plafonner le score a 100
  totalScore = Math.min(Math.max(totalScore, 0), 100);

  // 7. Determiner la priorite
  const priority = totalScore >= 80 ? 'critical'
    : totalScore >= 60 ? 'high'
    : totalScore >= 35 ? 'medium'
    : 'low';

  const individualTotal = signals.reduce((sum, s) => sum + (s.adjustedScore || s.score || 0), 0);
  const correlationTotal = correlations.reduce((sum, c) => sum + c.bonus, 0);

  return {
    totalScore,
    priority,
    signalCount: signals.length,
    uniqueSources: uniqueSources.size,
    correlations,
    disqualified,
    breakdown: {
      individualSignals: individualTotal,
      correlationBonus: correlationTotal,
      freshnessBonus: totalScore - Math.min(individualTotal + correlationTotal, 100),
    },
  };
}
