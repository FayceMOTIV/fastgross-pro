#!/usr/bin/env node
/**
 * FMF VPS Worker — Point d'entrée principal
 * Lance les 5 agents pour toutes les organisations actives
 *
 * Usage : node vps-worker/startAll.js
 * Avec PM2 : pm2 start vps-worker/startAll.js --name fmf-agents
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Init Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./service-account.json')),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const { startAllAgents } = require('./agents/fiveAgents');

async function main() {
  console.log('FMF Agent System — Starting...');
  console.log(`Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID}`);

  // Charger toutes les organisations actives depuis Firestore
  const orgsSnap = await db.collection('organizations')
    .where('status', '==', 'active')
    .get();

  const orgIds = orgsSnap.docs.map(d => d.id);
  console.log(`${orgIds.length} active organizations: ${orgIds.join(', ')}`);

  if (orgIds.length === 0) {
    console.warn('No active organizations found. Check Firestore collection.');
    process.exit(0);
  }

  // Démarrer les agents pour chaque organisation
  await startAllAgents(orgIds);

  console.log('\nAll agents started!');
  console.log('BullMQ Dashboard available at http://localhost:3001/admin');
  console.log('\nActive agents:');
  orgIds.forEach(id => {
    console.log(`  - ${id} -> email / whatsapp / instagram / linkedin / orchestrator`);
  });

  // Garder le process en vie
  process.on('SIGTERM', async () => {
    console.log('\nGraceful shutdown...');
    process.exit(0);
  });
}

// Gestion des erreurs non-capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main().catch(e => {
  console.error('Fatal error at startup:', e);
  process.exit(1);
});
