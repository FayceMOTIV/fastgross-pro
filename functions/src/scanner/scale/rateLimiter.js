/**
 * rateLimiter.js — Rate limiter global pour APIs externes
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const API_RATE_LIMITS = {
  'crt.sh': { perMinute: 10, perDay: 500 },
  france_travail: { perMinute: 20, perDay: 5000 },
  pappers: { perMinute: 5, perDay: 100 },
  pagespeed: { perMinute: 60, perDay: 25000 },
  openweathermap: { perMinute: 60, perDay: 1000 },
  wayback: { perMinute: 15, perDay: 1000 },
  apify: { perMinute: 10, perDay: 500 },
  groq: { perMinute: 30, perDay: 14400 },
};

export async function checkRateLimit(apiName) {
  const limits = API_RATE_LIMITS[apiName];
  if (!limits) return { allowed: true };

  const db = getDb();
  const now = new Date();
  const minuteKey = `ratelimit_${apiName}_${now.toISOString().substring(0, 16)}`;
  const dayKey = `ratelimit_${apiName}_${now.toISOString().substring(0, 10)}`;

  const minuteDoc = await db.collection('rateLimits').doc(minuteKey).get();
  const minuteCount = minuteDoc.exists ? minuteDoc.data().count : 0;

  if (minuteCount >= limits.perMinute) {
    return { allowed: false, reason: 'minute_limit', retryAfter: 60 };
  }

  const dayDoc = await db.collection('rateLimits').doc(dayKey).get();
  const dayCount = dayDoc.exists ? dayDoc.data().count : 0;

  if (dayCount >= limits.perDay) {
    return { allowed: false, reason: 'daily_limit', retryAfter: 3600 };
  }

  await db
    .collection('rateLimits')
    .doc(minuteKey)
    .set(
      { count: FieldValue.increment(1), expiresAt: new Date(now.getTime() + 120000) },
      { merge: true }
    );
  await db
    .collection('rateLimits')
    .doc(dayKey)
    .set(
      { count: FieldValue.increment(1), expiresAt: new Date(now.getTime() + 86400000) },
      { merge: true }
    );

  return { allowed: true, minuteCount: minuteCount + 1, dayCount: dayCount + 1 };
}

export async function callWithRateLimit(apiName, apiCall) {
  const check = await checkRateLimit(apiName);

  if (!check.allowed) {
    console.warn(
      `[RateLimit] Limite atteinte pour ${apiName} (${check.reason}). Retry dans ${check.retryAfter}s`
    );
    throw new Error(`RATE_LIMIT_${apiName.toUpperCase()}`);
  }

  return await apiCall();
}
