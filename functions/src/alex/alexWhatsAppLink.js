/**
 * alexWhatsAppLink.js — Lier le WhatsApp du user a son compte FMF
 * Flow : envoyer code 6 chiffres → verifier → creer mapping
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

/**
 * Etape 1 : Envoyer un code de verification par WhatsApp
 */
export const sendWhatsAppVerification = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const { phone } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis');
    if (!phone) throw new HttpsError('invalid-argument', 'Numero de telephone requis');

    const db = getDb();
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new HttpsError('invalid-argument', 'Numero invalide');
    }

    // Generer un code a 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Sauvegarder le code (expire dans 10 minutes)
    await db.collection('whatsappVerifications').doc(uid).set({
      phone: cleanPhone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Envoyer le code par WhatsApp
    const { sendTextMessage } = await import('./alexWhatsAppSender.js');
    await sendTextMessage(
      cleanPhone,
      `Votre code de verification Face Media Factory : *${code}*\n\nCe code expire dans 10 minutes.`
    );

    console.log(`[AlexWA Link] Code envoye a ${cleanPhone} pour user ${uid}`);
    return { sent: true };
  }
);

/**
 * Etape 2 : Verifier le code et lier le compte
 */
export const verifyWhatsAppCode = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const { code } = request.data || {};
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis');
    if (!code) throw new HttpsError('invalid-argument', 'Code requis');

    const db = getDb();
    const verif = await db.collection('whatsappVerifications').doc(uid).get();
    if (!verif.exists) throw new HttpsError('not-found', 'Aucune verification en cours');

    const data = verif.data();
    if (data.code !== String(code)) throw new HttpsError('permission-denied', 'Code incorrect');

    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (new Date() > expiresAt) throw new HttpsError('deadline-exceeded', 'Code expire');

    // Recuperer l'organizationId du user
    const userDoc = await db.collection('users').doc(uid).get();
    const organizationId = userDoc.data()?.organizationId || userDoc.data()?.currentOrganizationId;
    if (!organizationId) throw new HttpsError('failed-precondition', 'Organisation introuvable');

    // Creer le mapping WhatsApp → user FMF
    await db.collection('whatsappUserMappings').doc(data.phone).set({
      phone: data.phone,
      userId: uid,
      organizationId,
      linkedAt: FieldValue.serverTimestamp(),
      active: true,
    });

    // Sauvegarder dans les preferences Alex
    await db.doc(`organizations/${organizationId}/alexMemory/preferences`).set({
      userWhatsApp: data.phone,
    }, { merge: true });

    // Marquer comme verifie
    await db.collection('whatsappVerifications').doc(uid).update({ verified: true });

    // Envoyer le message de bienvenue
    const { sendTextMessage } = await import('./alexWhatsAppSender.js');
    await sendTextMessage(
      data.phone,
      `Ton WhatsApp est connecte a Face Media Factory !\n\nJe suis Alex, ton associe commercial. Tu peux me parler ici comme sur l'app.\n\nEssaie : "Salut Alex, c'est quoi mes stats ?"`,
    );

    console.log(`[AlexWA Link] WhatsApp ${data.phone} lie a user ${uid} (org: ${organizationId})`);
    return { verified: true, phone: data.phone };
  }
);

/**
 * Deconnecter WhatsApp du compte FMF
 */
export const unlinkWhatsApp = onCall(
  { region: 'europe-west1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Auth requis');

    const db = getDb();
    const userDoc = await db.collection('users').doc(uid).get();
    const organizationId = userDoc.data()?.organizationId || userDoc.data()?.currentOrganizationId;

    // Trouver et supprimer le mapping
    const mappings = await db.collection('whatsappUserMappings')
      .where('userId', '==', uid)
      .limit(1)
      .get();

    if (!mappings.empty) {
      await mappings.docs[0].ref.delete();
    }

    // Supprimer des preferences Alex
    if (organizationId) {
      await db.doc(`organizations/${organizationId}/alexMemory/preferences`).set({
        userWhatsApp: null,
      }, { merge: true });
    }

    console.log(`[AlexWA Link] WhatsApp delie pour user ${uid}`);
    return { unlinked: true };
  }
);
