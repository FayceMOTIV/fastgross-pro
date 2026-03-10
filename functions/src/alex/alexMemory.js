/**
 * alexMemory.js — La memoire d'Alex
 * Tout ce qu'Alex sait sur le user et son business.
 */
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export async function loadUserContext(organizationId, userId) {
  const db = getDb();

  // Charger tout en parallele
  const [
    businessProfileDoc,
    activeStrategyDoc,
    kpisDoc,
    recentProspects,
    preferencesDoc,
  ] = await Promise.all([
    db.doc(`organizations/${organizationId}/alexMemory/businessProfile`).get(),
    db.doc(`organizations/${organizationId}/alexMemory/activeStrategy`).get(),
    db.doc(`organizations/${organizationId}/alexMemory/kpis`).get(),
    db.collection(`organizations/${organizationId}/prospects`)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    db.doc(`organizations/${organizationId}/alexMemory/preferences`).get(),
  ]);

  return {
    businessProfile: businessProfileDoc.exists ? businessProfileDoc.data() : null,
    activeStrategy: activeStrategyDoc.exists ? activeStrategyDoc.data() : null,
    kpis: kpisDoc.exists ? kpisDoc.data() : null,
    recentResults: recentProspects.docs.map(d => ({ id: d.id, ...d.data() })),
    preferences: preferencesDoc.exists ? preferencesDoc.data() : null,
  };
}

export async function loadConversationHistory(organizationId, limit = 20) {
  const db = getDb();
  const snapshot = await db.collection(`organizations/${organizationId}/alexConversations`)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  // Inverser pour avoir l'ordre chronologique
  return snapshot.docs.reverse().map(d => ({
    role: d.data().role,
    content: d.data().content,
  }));
}
