/**
 * tenantQuotas.js — Quotas par tenant pour le scanner
 */
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => getFirestore();

const PLAN_QUOTAS = {
  essentiel: {
    scansPerMonth: 500,
    monitorsPerMonth: 50,
    signalAlertsPerDay: 20,
    apiCallsPerDay: 1000,
  },
  pro: {
    scansPerMonth: 5000,
    monitorsPerMonth: 500,
    signalAlertsPerDay: 100,
    apiCallsPerDay: 10000,
  },
  business: {
    scansPerMonth: 50000,
    monitorsPerMonth: 5000,
    signalAlertsPerDay: 1000,
    apiCallsPerDay: 100000,
  },
};

export async function checkTenantQuota(organizationId) {
  const db = getDb();
  const quotaDoc = await db.collection('tenantQuotas').doc(organizationId).get();

  if (!quotaDoc.exists) {
    const defaultQuota = {
      plan: 'essentiel',
      ...PLAN_QUOTAS.essentiel,
      scansUsedThisMonth: 0,
      apiCallsUsedToday: 0,
      resetDate: getFirstOfNextMonth(),
    };
    await db.collection('tenantQuotas').doc(organizationId).set(defaultQuota);
    return { ...defaultQuota, remainingScans: defaultQuota.scansPerMonth };
  }

  const quota = quotaDoc.data();
  const limits = PLAN_QUOTAS[quota.plan] || PLAN_QUOTAS.essentiel;

  return {
    ...quota,
    remainingScans: limits.scansPerMonth - (quota.scansUsedThisMonth || 0),
    remainingApiCalls: limits.apiCallsPerDay - (quota.apiCallsUsedToday || 0),
  };
}

export const resetMonthlyQuotas = onSchedule(
  {
    schedule: '0 0 1 * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const db = getDb();
    const quotas = await db.collection('tenantQuotas').get();

    const BATCH_MAX = 499;
    for (let i = 0; i < quotas.docs.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = quotas.docs.slice(i, i + BATCH_MAX);
      for (const doc of chunk) {
        batch.update(doc.ref, {
          scansUsedThisMonth: 0,
          resetDate: getFirstOfNextMonth(),
        });
      }
      await batch.commit();
    }
    console.log(`[Quotas] Mensuels reinitialises pour ${quotas.size} tenants`);
  }
);

export const resetDailyQuotas = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const db = getDb();
    const quotas = await db.collection('tenantQuotas').get();

    const BATCH_MAX = 499;
    for (let i = 0; i < quotas.docs.length; i += BATCH_MAX) {
      const batch = db.batch();
      const chunk = quotas.docs.slice(i, i + BATCH_MAX);
      for (const doc of chunk) {
        batch.update(doc.ref, { apiCallsUsedToday: 0 });
      }
      await batch.commit();
    }
  }
);

function getFirstOfNextMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
