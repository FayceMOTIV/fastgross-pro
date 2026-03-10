/**
 * scanMonitor.js — Rapport quotidien des scans + alerting
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

export const dailyScanReport = onSchedule(
  {
    schedule: '0 20 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scansToday = await db
      .collection('scanResults')
      .where('scannedAt', '>=', today)
      .count()
      .get();

    const signalsToday = await db
      .collection('scanSignals')
      .where('detectedAt', '>=', today)
      .count()
      .get();

    const criticalSignals = await db
      .collection('scanResults')
      .where('scannedAt', '>=', today)
      .where('priority', 'in', ['critical', 'high'])
      .count()
      .get();

    const errors = await db
      .collection('scanErrors')
      .where('occurredAt', '>=', today)
      .count()
      .get();

    const report = {
      date: today.toISOString().split('T')[0],
      scansCompleted: scansToday.data().count,
      signalsDetected: signalsToday.data().count,
      criticalSignals: criticalSignals.data().count,
      errors: errors.data().count,
      generatedAt: new Date(),
    };

    await db.collection('scanReports').add(report);

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const message = `FMF Scanner Daily Report\nScans : ${report.scansCompleted}\nSignaux : ${report.signalsDetected}\nCritiques : ${report.criticalSignals}\nErreurs : ${report.errors}`;

      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
          }),
        }
      );
    }

    console.log(`[ScanReport] Daily:`, report);
  }
);
