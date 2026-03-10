/**
 * Scanner — Barrel export de toutes les Cloud Functions
 */

// Core: Scan orchestrator (onCall)
export { runProspectScan } from './scanOrchestrator.js';

// Scheduled monitors
export { monitorCTLogs } from './sources/ctLogsMonitor.js';
export { monitorFranceTravail } from './sources/franceTravailMonitor.js';
export { monitorSubventions } from './sources/subventionsMonitor.js';
export { checkWeatherSeasonality as runSeasonalityCheck } from './sources/weatherSeasonalityEngine.js';

// HTTP function
export { pixelTracker } from './pixelVisitorTracker.js';

// Scalability: Cloud Tasks queue + worker
export { enqueueScan, processScanTask } from './queue/scanTaskQueue.js';

// Scalability: Tenant quotas
export { resetMonthlyQuotas, resetDailyQuotas } from './queue/tenantQuotas.js';

// Monitoring: Daily scan report
export { dailyScanReport } from './monitoring/scanMonitor.js';
