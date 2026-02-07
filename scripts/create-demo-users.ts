/**
 * Script de création des utilisateurs de démonstration DISTRAM
 *
 * Exécuter avec: npx tsx scripts/create-demo-users.ts
 *
 * Ce script crée 4 utilisateurs de démonstration:
 * - admin@distram.fr (Administrateur)
 * - commercial@distram.fr (Commercial terrain)
 * - livreur@distram.fr (Livreur)
 * - kebab.istanbul@test.fr (Client B2B - restaurant)
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Configuration Firebase (même que dans le projet)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Utilisateurs de démonstration
const DEMO_USERS = [
  {
    email: 'admin@distram.fr',
    password: 'Demo2024!',
    displayName: 'Faiçal Admin',
    role: 'admin',
    depot: 'lyon',
    telephone: '06 00 00 00 01',
  },
  {
    email: 'commercial@distram.fr',
    password: 'Demo2024!',
    displayName: 'Hamza Commercial',
    role: 'commercial',
    depot: 'lyon',
    telephone: '06 00 00 00 02',
    zone: 'lyon-centre',
  },
  {
    email: 'livreur@distram.fr',
    password: 'Demo2024!',
    displayName: 'Ali Livreur',
    role: 'livreur',
    depot: 'lyon',
    telephone: '06 00 00 00 03',
    vehicleInfo: {
      type: 'Camionnette',
      plate: 'AB-123-CD',
      model: 'Renault Trafic',
    },
  },
  {
    email: 'kebab.istanbul@test.fr',
    password: 'Demo2024!',
    displayName: 'Kebab Istanbul',
    role: 'client',
    telephone: '04 78 00 00 01',
    clientInfo: {
      siret: '12345678901234',
      adresse: '15 Rue de la République',
      codePostal: '69001',
      ville: 'Lyon',
      type: 'kebab',
    },
  },
];

async function createDemoUsers() {
  console.log('🚀 Initialisation Firebase...');

  // Vérifier la configuration
  if (!firebaseConfig.apiKey) {
    console.error('❌ Variables d\'environnement Firebase manquantes!');
    console.log('Assurez-vous que .env.local contient les variables NEXT_PUBLIC_FIREBASE_*');
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`\n📝 Création de ${DEMO_USERS.length} utilisateurs de démonstration...\n`);

  for (const userData of DEMO_USERS) {
    try {
      console.log(`Creating: ${userData.email}...`);

      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const uid = userCredential.user.uid;

      // Créer le document utilisateur dans Firestore
      const userDoc = {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        depot: userData.depot,
        telephone: userData.telephone,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(userData.zone && { assignedZone: userData.zone }),
        ...(userData.vehicleInfo && { vehicleInfo: userData.vehicleInfo }),
        ...(userData.clientInfo && { clientInfo: userData.clientInfo }),
      };

      await setDoc(doc(db, 'users', uid), userDoc);

      console.log(`  ✅ ${userData.displayName} (${userData.role})`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('email-already-in-use')) {
        console.log(`  ⚠️  ${userData.email} existe déjà`);
      } else {
        console.error(`  ❌ Erreur: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  console.log('\n✨ Script terminé!\n');
  console.log('Comptes de démonstration créés:');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ Email                      │ Mot de passe │ Rôle            │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  for (const user of DEMO_USERS) {
    const email = user.email.padEnd(26);
    const pwd = user.password.padEnd(12);
    const role = user.role.padEnd(15);
    console.log(`│ ${email} │ ${pwd} │ ${role} │`);
  }
  console.log('└──────────────────────────────────────────────────────────────┘');

  process.exit(0);
}

createDemoUsers().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
