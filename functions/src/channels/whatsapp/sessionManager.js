/**
 * WhatsApp Session Manager - Fenetre 24h
 *
 * Gestion des sessions WhatsApp:
 * - Fenetre 24h apres dernier message utilisateur
 * - Messages libres dans la fenetre
 * - Templates obligatoires hors fenetre
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

// Duree de la session en millisecondes (24 heures)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// ============================================
// VERIFIER SI DANS FENETRE 24H
// ============================================
export async function isInSessionWindow(orgId, prospectId) {
  const result = {
    inSession: false,
    sessionId: null,
    expiresAt: null,
    remainingMs: 0,
    lastMessageAt: null
  };

  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return result;
    }

    const session = sessionSnap.data();
    const now = Date.now();

    // Verifier si la session est encore valide
    const lastMessageAt = session.lastInboundAt?.toMillis() || 0;
    const expiresAt = lastMessageAt + SESSION_DURATION_MS;

    if (now < expiresAt) {
      result.inSession = true;
      result.sessionId = sessionSnap.id;
      result.expiresAt = new Date(expiresAt);
      result.remainingMs = expiresAt - now;
      result.lastMessageAt = session.lastInboundAt?.toDate();
    }

    return result;

  } catch (error) {
    console.error('isInSessionWindow error:', error);
    return result;
  }
}

// ============================================
// CREER UNE SESSION
// ============================================
export async function createSession(orgId, prospectId, phoneNumber) {
  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);

    await sessionRef.set({
      prospectId,
      phoneNumber,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      lastOutboundAt: FieldValue.serverTimestamp(),
      lastInboundAt: null,
      messageCount: {
        inbound: 0,
        outbound: 1
      }
    }, { merge: true });

    return { success: true, sessionId: prospectId };

  } catch (error) {
    console.error('createSession error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// METTRE A JOUR SESSION (message entrant)
// ============================================
export async function updateSessionInbound(orgId, prospectId) {
  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);

    await sessionRef.set({
      lastInboundAt: FieldValue.serverTimestamp(),
      'messageCount.inbound': FieldValue.increment(1),
      status: 'active'
    }, { merge: true });

    return { success: true };

  } catch (error) {
    console.error('updateSessionInbound error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// METTRE A JOUR SESSION (message sortant)
// ============================================
export async function updateSessionOutbound(orgId, prospectId) {
  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);

    await sessionRef.set({
      lastOutboundAt: FieldValue.serverTimestamp(),
      'messageCount.outbound': FieldValue.increment(1)
    }, { merge: true });

    return { success: true };

  } catch (error) {
    console.error('updateSessionOutbound error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// OBTENIR STATUT SESSION
// ============================================
export async function getSessionStatus(orgId, prospectId) {
  const status = {
    exists: false,
    active: false,
    inSession: false,
    details: {}
  };

  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return status;
    }

    status.exists = true;
    const session = sessionSnap.data();

    status.details = {
      createdAt: session.createdAt?.toDate(),
      lastInboundAt: session.lastInboundAt?.toDate(),
      lastOutboundAt: session.lastOutboundAt?.toDate(),
      messageCount: session.messageCount,
      phoneNumber: session.phoneNumber
    };

    // Verifier si dans fenetre 24h
    const windowCheck = await isInSessionWindow(orgId, prospectId);
    status.inSession = windowCheck.inSession;
    status.active = windowCheck.inSession;
    status.expiresAt = windowCheck.expiresAt;
    status.remainingMs = windowCheck.remainingMs;

    return status;

  } catch (error) {
    console.error('getSessionStatus error:', error);
    return status;
  }
}

// ============================================
// FERMER SESSION
// ============================================
export async function closeSession(orgId, prospectId, reason = 'manual') {
  try {
    const sessionRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions').doc(prospectId);

    await sessionRef.update({
      status: 'closed',
      closedAt: FieldValue.serverTimestamp(),
      closeReason: reason
    });

    return { success: true };

  } catch (error) {
    console.error('closeSession error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// NETTOYER SESSIONS EXPIREES
// ============================================
export async function cleanupExpiredSessions(orgId) {
  const results = {
    checked: 0,
    cleaned: 0,
    errors: 0
  };

  try {
    const sessionsRef = db.collection('organizations').doc(orgId)
      .collection('whatsappSessions');

    const expiredThreshold = Timestamp.fromMillis(Date.now() - SESSION_DURATION_MS);

    const snapshot = await sessionsRef
      .where('status', '==', 'active')
      .where('lastInboundAt', '<', expiredThreshold)
      .get();

    results.checked = snapshot.size;

    const batch = db.batch();

    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: FieldValue.serverTimestamp()
      });
      results.cleaned++;
    });

    if (results.cleaned > 0) {
      await batch.commit();
    }

    return results;

  } catch (error) {
    console.error('cleanupExpiredSessions error:', error);
    results.errors++;
    return results;
  }
}

// ============================================
// OBTENIR TEMPS RESTANT FORMATE
// ============================================
export function formatRemainingTime(remainingMs) {
  if (remainingMs <= 0) {
    return 'Expire';
  }

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

// ============================================
// VERIFIER SI PEUT ENVOYER MESSAGE LIBRE
// ============================================
export async function canSendFreeformMessage(orgId, prospectId) {
  const sessionCheck = await isInSessionWindow(orgId, prospectId);

  return {
    canSend: sessionCheck.inSession,
    requiresTemplate: !sessionCheck.inSession,
    sessionDetails: sessionCheck
  };
}

// ============================================
// ALIAS POUR COMPATIBILITE
// ============================================
export const updateSession = updateSessionInbound;
