/**
 * distributedCounters.js — Compteurs distribues pour eviter les hotspots Firestore
 * 10 shards = 10 ecritures/seconde par compteur
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();
const NUM_SHARDS = 10;

export async function incrementCounter(counterId, value = 1) {
  const db = getDb();
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = db
    .collection('counters')
    .doc(counterId)
    .collection('shards')
    .doc(String(shardId));

  await shardRef.set({ count: FieldValue.increment(value) }, { merge: true });
}

export async function getCounter(counterId) {
  const db = getDb();
  const shards = await db.collection('counters').doc(counterId).collection('shards').get();

  let total = 0;
  for (const shard of shards.docs) {
    total += shard.data().count || 0;
  }
  return total;
}
