const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'face-media-factory' });
const db = admin.firestore();

const statusMap = { replied: 'CONTACTED', converted: 'SIGNED', lost: 'LOST' };

db.collectionGroup('prospects').get().then(async s => {
  console.log('Total prospects:', s.size);
  let batch = db.batch();
  let count = 0;
  const batches = [];

  s.docs.forEach(doc => {
    const data = doc.data();
    if (!data.crmColumn) {
      const crmColumn = statusMap[data.status] || 'NEW';
      batch.update(doc.ref, { crmColumn, agentNotes: '', agentTurnCount: 0, inboxStatus: 'unread' });
      count++;
      if (count % 500 === 0) { batches.push(batch.commit()); batch = db.batch(); }
    }
  });

  batches.push(batch.commit());
  await Promise.all(batches);
  console.log('Migres:', count);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
