/**
 * scanScheduler.js — Planification des scans prospect
 * Placeholder pour la logique de scheduling (cron + on-demand)
 *
 * A implementer :
 * - Scheduler qui parcourt les prospects sans scan recent (> 30 jours)
 * - Re-scan automatique des prospects haute priorite (hebdomadaire)
 * - File d'attente de scans prioritises
 * - Integration avec Cloud Tasks pour le rate limiting
 */

// Placeholder export — sera implemente dans une phase ulterieure
export const scanSchedulerConfig = {
  rescanIntervalDays: 30,
  highPriorityRescanDays: 7,
  maxScansPerHour: 60,
  maxScansPerDay: 500,
};
