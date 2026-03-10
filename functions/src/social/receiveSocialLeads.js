/**
 * receiveSocialLeads.js — Webhook pour recevoir les leads du VPS Social Scanner
 * Le VPS envoie un POST ici apres chaque lead enrichi
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const getDb = () => getFirestore();

const getWebhookSecret = () => process.env.VPS_WEBHOOK_SECRET || '';
const ALLOWED_VPS_IPS = ['94.130.184.44'];

export const receiveSocialLeads = onRequest(
  {
    region: 'europe-west1',
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verifier le secret
    const secret = req.headers['x-webhook-secret'];
    if (secret !== getWebhookSecret()) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Warning IP (pas blocage — les IPs Cloud Functions peuvent varier)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (ALLOWED_VPS_IPS.length > 0 && !ALLOWED_VPS_IPS.includes(clientIp)) {
      console.warn(`[receiveSocialLeads] Unexpected IP: ${clientIp}`);
    }

    try {
      const { type, lead } = req.body || {};

      if (type !== 'new_lead' || !lead) {
        res.status(400).json({ error: 'Invalid payload: expected { type: "new_lead", lead: {...} }' });
        return;
      }

      const tenantId = lead.tenantId;
      if (!tenantId) {
        res.status(400).json({ error: 'Missing tenantId in lead' });
        return;
      }

      const db = getDb();

      // Verifier si le lead existe deja (dedup par email ou platformId)
      let existingLeadRef = null;

      if (lead.emailNormalized) {
        const emailQuery = await db.collection(`organizations/${tenantId}/socialLeads`)
          .where('emailNormalized', '==', lead.emailNormalized)
          .limit(1)
          .get();

        if (!emailQuery.empty) {
          existingLeadRef = emailQuery.docs[0].ref;
        }
      }

      if (!existingLeadRef && lead.platformId && lead.platform) {
        const platformQuery = await db.collection(`organizations/${tenantId}/socialLeads`)
          .where(`platformIds.${lead.platform}`, '==', lead.platformId)
          .limit(1)
          .get();

        if (!platformQuery.empty) {
          existingLeadRef = platformQuery.docs[0].ref;
        }
      }

      if (existingLeadRef) {
        // Merge avec le lead existant
        const updateData = {
          [`platformIds.${lead.platform}`]: lead.platformId,
          [`platforms.${lead.platform}`]: {
            platformId: lead.platformId,
            profileUrl: lead.profileUrl || lead.channelUrl || null,
            detectedAt: lead.detectedAt,
            description: (lead.description || '').substring(0, 500),
            buyingSignals: lead.buyingSignals || null,
          },
          updatedAt: FieldValue.serverTimestamp(),
          score: lead.score || 0,
          grade: lead.grade || 'D',
        };

        if (lead.email) {
          updateData.email = lead.email;
          updateData.emailNormalized = lead.emailNormalized || lead.email.toLowerCase().trim();
        }
        if (lead.phoneE164) updateData.phoneE164 = lead.phoneE164;
        if (lead.siret) updateData.siret = lead.siret;

        await existingLeadRef.update(updateData);
        res.json({ status: 'merged', leadId: existingLeadRef.id });
      } else {
        // Creer un nouveau lead
        const newLead = {
          businessName: lead.businessName || null,
          email: lead.email || null,
          emailNormalized: lead.emailNormalized || null,
          phone: lead.phone || null,
          phoneE164: lead.phoneE164 || null,
          website: lead.website || null,
          domainNormalized: lead.domainNormalized || null,
          nameNormalized: lead.nameNormalized || null,
          businessCategory: lead.businessCategory || null,
          address: lead.address || null,
          city: lead.city || null,
          postalCode: lead.postalCode || null,
          siret: lead.siret || null,
          nafCode: lead.nafCode || null,
          score: lead.score || 0,
          grade: lead.grade || 'D',
          platformIds: {
            [lead.platform]: lead.platformId,
          },
          platforms: {
            [lead.platform]: {
              platformId: lead.platformId,
              profileUrl: lead.profileUrl || lead.channelUrl || null,
              detectedAt: lead.detectedAt,
              description: (lead.description || '').substring(0, 500),
              buyingSignals: lead.buyingSignals || null,
            },
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          status: 'new',
        };

        const docRef = await db.collection(`organizations/${tenantId}/socialLeads`).add(newLead);
        res.json({ status: 'created', leadId: docRef.id });
      }
    } catch (err) {
      console.error('[receiveSocialLeads] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);
