/**
 * alexThreads.js — Gestion des threads de conversation Alex (style ChatGPT)
 * CRUD threads + migration anciens messages
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js';

const getDb = () => getFirestore();

/**
 * Cree un nouveau thread de conversation Alex
 */
export const createAlexThread = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    const { organizationId, title } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();
    const threadRef = db.collection(`organizations/${organizationId}/alexThreads`).doc();
    const now = FieldValue.serverTimestamp();

    const threadData = {
      title: title || 'Nouvelle conversation',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      phase: 'welcome',
      collectedData: {},
      lastMessage: '',
      messageCount: 0,
      archived: false,
    };

    await threadRef.set(threadData);

    // Set as active thread
    await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).set({
      activeThreadId: threadRef.id,
      updatedAt: now,
    }, { merge: true });

    console.log('[createAlexThread] orgId:', organizationId, '| threadId:', threadRef.id);
    return { threadId: threadRef.id };
  }
);

/**
 * Liste les threads non-archives, tries par updatedAt desc
 */
export const listAlexThreads = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    const { organizationId, limit: maxThreads } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();
    const snap = await db.collection(`organizations/${organizationId}/alexThreads`)
      .where('archived', '==', false)
      .orderBy('updatedAt', 'desc')
      .limit(maxThreads || 50)
      .get();

    const threads = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return { threads };
  }
);

/**
 * Soft-delete un thread (archived: true)
 */
export const deleteAlexThread = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    const { organizationId, threadId } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId || !threadId) throw new HttpsError('invalid-argument', 'organizationId et threadId requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();
    await db.doc(`organizations/${organizationId}/alexThreads/${threadId}`).update({
      archived: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('[deleteAlexThread] orgId:', organizationId, '| threadId:', threadId);
    return { success: true };
  }
);

/**
 * Renomme un thread
 */
export const renameAlexThread = onCall(
  { region: 'europe-west1', cors: true },
  async (request) => {
    const { organizationId, threadId, title } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId || !threadId) throw new HttpsError('invalid-argument', 'organizationId, threadId et title requis');
    if (!title || typeof title !== 'string') throw new HttpsError('invalid-argument', 'title invalide');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();
    await db.doc(`organizations/${organizationId}/alexThreads/${threadId}`).update({
      title: title.substring(0, 100),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

/**
 * Migration one-shot : cree 1 thread a partir des messages existants sans threadId
 */
export const migrateAlexConversations = onCall(
  { region: 'europe-west1', memory: '512MiB', timeoutSeconds: 120, cors: true },
  async (request) => {
    const { organizationId } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');

    await verifyOrgMembership(uid, organizationId);

    const db = getDb();

    // Check if migration already done (threads exist)
    const existingThreads = await db.collection(`organizations/${organizationId}/alexThreads`)
      .limit(1).get();
    if (!existingThreads.empty) {
      return { migrated: false, reason: 'Threads already exist' };
    }

    // Get existing messages
    const msgsSnap = await db.collection(`organizations/${organizationId}/alexConversations`)
      .orderBy('timestamp', 'asc')
      .get();

    if (msgsSnap.empty) {
      return { migrated: false, reason: 'No messages to migrate' };
    }

    // Read current state
    const stateDoc = await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).get();
    const state = stateDoc.exists ? stateDoc.data() : {};

    // Create migration thread
    const threadRef = db.collection(`organizations/${organizationId}/alexThreads`).doc();
    const firstUserMsg = msgsSnap.docs.find(d => d.data().role === 'user');
    const lastMsg = msgsSnap.docs[msgsSnap.docs.length - 1];
    const title = firstUserMsg
      ? firstUserMsg.data().content?.substring(0, 50) || 'Conversation precedente'
      : 'Conversation precedente';

    await threadRef.set({
      title,
      createdAt: msgsSnap.docs[0].data().timestamp || FieldValue.serverTimestamp(),
      updatedAt: lastMsg.data().timestamp || FieldValue.serverTimestamp(),
      createdBy: uid,
      phase: state.phase || 'ready',
      collectedData: state.collectedData || {},
      lastMessage: (lastMsg.data().content || '').substring(0, 80),
      messageCount: msgsSnap.size,
      archived: false,
    });

    // Batch update all messages with threadId (499 per batch)
    const docs = msgsSnap.docs;
    for (let i = 0; i < docs.length; i += 499) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + 499);
      for (const d of chunk) {
        batch.update(d.ref, { threadId: threadRef.id });
      }
      await batch.commit();
    }

    // Set activeThreadId
    await db.doc(`organizations/${organizationId}/alexMemory/conversationState`).set({
      activeThreadId: threadRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('[migrateAlexConversations] orgId:', organizationId, '| threadId:', threadRef.id, '| msgs:', docs.length);
    return { migrated: true, threadId: threadRef.id, messageCount: docs.length };
  }
);
