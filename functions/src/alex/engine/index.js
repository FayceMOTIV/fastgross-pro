/**
 * Alex Engine — Barrel export
 * Le Reacteur Nucleaire: moteur de recherche intelligent de prospects
 */

// Niche Config (from Prompt 2)
export { updateNicheConfig, getNicheConfig } from './nicheConfig.js';

// Search Plan Builder
export { buildSearchPlan } from './nicheReasoner.js';

// Intelligent Source Selection
export { selectSources } from './smartSourceSelector.js';

// Niche Normalizer (maps raw niche names → 16 sourceRegistry types)
export { normalizeNicheType } from './nicheNormalizer.js';

// Multi-Signal Correlation
export { correlateSignals } from './signalCorrelator.js';

// Lookalike Prospect Finder
export { findLookalikes } from './lookalikeFinder.js';

// Adaptive Scoring (learns from outcomes)
export { learnFromOutcome, applyLearnedWeights, generateLearningInsights } from './adaptiveScorer.js';

// BANT Qualification
export { qualifyProspect } from './prospectQualifier.js';

// Main Search Orchestrator
export { intelligentProspectSearch } from './searchOrchestrator.js';

// Firestore Learning Trigger
export { learnFromProspectOutcome } from './learningTrigger.js';
