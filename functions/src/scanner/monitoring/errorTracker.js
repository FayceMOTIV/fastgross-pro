/**
 * errorTracker.js — Error tracking centralise pour le scanner
 */
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export async function trackScanError(source, domain, error, context = {}) {
  const db = getDb();
  await db.collection('scanErrors').add({
    source,
    domain,
    errorMessage: error.message || String(error),
    errorStack: error.stack || null,
    context,
    occurredAt: new Date(),
    resolved: false,
  });

  console.error(`[ScanError] [${source}] ${domain}:`, error.message);
}

export function withErrorTracking(source, scanFn) {
  return async function (domain, ...args) {
    try {
      return await scanFn(domain, ...args);
    } catch (error) {
      await trackScanError(source, domain, error);
      return null;
    }
  };
}
