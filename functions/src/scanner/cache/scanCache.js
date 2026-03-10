/**
 * scanCache.js — Cache intelligent avec TTL par type de scan
 */
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const CACHE_TTL = {
  website: 168,
  techStack: 168,
  seo: 72,
  email: 720,
  googleBusiness: 24,
  social: 48,
  financial: 720,
  wayback: 720,
};

export async function getCachedResult(domain, scanType) {
  const db = getDb();
  const ttlHours = CACHE_TTL[scanType] || 168;
  const expiryDate = new Date(Date.now() - ttlHours * 60 * 60 * 1000);

  const cached = await db
    .collection('scanCache')
    .where('domain', '==', domain)
    .where('scanType', '==', scanType)
    .where('cachedAt', '>', expiryDate)
    .orderBy('cachedAt', 'desc')
    .limit(1)
    .get();

  if (cached.empty) return null;
  return cached.docs[0].data().result;
}

export async function setCachedResult(domain, scanType, result) {
  const db = getDb();
  const ttlHours = CACHE_TTL[scanType] || 168;

  await db.collection('scanCache').add({
    domain,
    scanType,
    result,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  });
}

export async function cleanExpiredCache() {
  const db = getDb();
  const now = new Date();

  const expired = await db.collection('scanCache').where('expiresAt', '<', now).limit(500).get();

  if (expired.empty) return { deleted: 0 };

  const BATCH_MAX = 499;
  for (let i = 0; i < expired.docs.length; i += BATCH_MAX) {
    const batch = db.batch();
    const chunk = expired.docs.slice(i, i + BATCH_MAX);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  return { deleted: expired.size };
}
