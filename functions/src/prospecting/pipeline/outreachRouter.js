/**
 * Outreach Router — Promotes qualified rawLeads to the prospects collection
 *
 * Maps rawLead fields to the existing prospect model.
 * The masterScheduler (every 15min) will detect new prospects automatically.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── PROMOTE TO PROSPECT ────────────────────────────────────────────────────

/**
 * Create a prospect document from a scored rawLead
 * @param {string} orgId
 * @param {Object} lead - Scored lead with scoring data
 * @returns {string|null} Prospect ID or null on failure
 */
export async function promoteToProspect(orgId, lead) {
  const db = getDb()

  try {
    const prospectData = {
      // Identity
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.companyName || '',
      companyName: lead.companyName || '',
      jobTitle: lead.jobTitle || '',

      // Location
      city: lead.city || '',
      postalCode: lead.postalCode || '',
      address: lead.address || '',
      country: lead.country || 'FR',

      // Web
      website: lead.website || '',
      linkedinUrl: lead.linkedinUrl || '',

      // Classification
      status: 'new',
      score: lead.scoring?.score || 0,
      priority: lead.scoring?.priority || 'C',
      category: lead.scoring?.category || 'cold',

      // Source tracking
      source: `auto_${lead.sourceId}`,
      sourceId: lead.sourceId,
      sourceGroup: lead.sourceGroup,
      sourceDetails: {
        collectedAt: new Date().toISOString(),
        pipelineScore: lead.scoring?.score || 0,
        scoringBreakdown: lead.scoring?.breakdown || {},
        intentSignals: lead.intentSignals || [],
      },

      // Enrichment data (partial — waterfall will complete)
      enrichment: {
        siret: lead.siret || '',
        naf: lead.naf || '',
        nafLabel: lead.nafLabel || '',
        domain: lead.domain || '',
        employeeCount: lead.employeeCount || null,
        revenue: lead.revenue || null,
        emails: lead.email ? [lead.email] : [],
        phones: lead.phone ? [lead.phone] : [],
      },

      // Channels (auto-detect available)
      channels: detectAvailableChannels(lead),

      // Engagement (fresh prospect)
      engagement: {
        touchpoints: 0,
        lastTouchAt: null,
        activeChannel: null,
        emailSentAt: null,
        smsSentAt: null,
        repliedAt: null,
      },

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastContactedAt: null,

      // Tags
      tags: [`source:${lead.sourceId}`, `priority:${lead.scoring?.priority || 'C'}`],
    }

    const docRef = await db
      .collection('organizations').doc(orgId)
      .collection('prospects')
      .add(prospectData)

    logger.info(`[outreachRouter] Promoted lead to prospect ${docRef.id} (source: ${lead.sourceId}, score: ${lead.scoring?.score})`)

    return docRef.id
  } catch (error) {
    logger.error(`[outreachRouter] Failed to promote lead:`, error)
    return null
  }
}

// ─── CHANNEL DETECTION ──────────────────────────────────────────────────────

function detectAvailableChannels(lead) {
  const channels = []

  if (lead.email) channels.push('email')
  if (lead.phone) {
    channels.push('sms')
    channels.push('whatsapp')
    channels.push('voicemail')
  }
  if (lead.linkedinUrl) channels.push('linkedin')

  return channels
}
