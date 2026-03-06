// ─────────────────────────────────────────────────────
// Cloud Functions — Pipeline Prospection France
// ─────────────────────────────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { ALLOWED_ORIGINS } from '../utils/corsConfig.js'
import { db } from '../index.js'
import { FieldValue } from 'firebase-admin/firestore'
import { runPipelineFrance, NAF_CODES, SECTOR_LABELS } from './pipelineFrance.js'

/**
 * runProspectionFrance — Pipeline complet : SIRENE → enrichissement → scoring → import CRM
 */
export const runProspectionFrance = onCall({
  cors: ALLOWED_ORIGINS,
  region: 'europe-west1',
  timeoutSeconds: 540,
  memory: '1GiB',
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  const { sector, city, limit = 50, orgId } = request.data

  if (!sector || !city) {
    throw new HttpsError('invalid-argument', 'sector et city sont requis')
  }
  if (!NAF_CODES[sector]) {
    throw new HttpsError('invalid-argument', `Secteur inconnu: "${sector}". Disponibles: ${Object.keys(NAF_CODES).join(', ')}`)
  }
  if (limit > 200) {
    throw new HttpsError('invalid-argument', 'Limite max: 200')
  }

  // Determiner l'orgId (passe en param ou depuis le profil)
  let targetOrgId = orgId
  if (!targetOrgId) {
    const userDoc = await db.collection('users').doc(request.auth.uid).get()
    targetOrgId = userDoc.data()?.currentOrgId
  }
  if (!targetOrgId) {
    throw new HttpsError('failed-precondition', 'Aucune organisation trouvee')
  }

  try {
    const results = await runPipelineFrance(sector, city, limit)

    // Sauvegarder les leads dans Firestore (batch max 500)
    const prospectsRef = db.collection('organizations').doc(targetOrgId).collection('prospects')
    const batchSize = 400
    let imported = 0

    for (let i = 0; i < results.leads.length; i += batchSize) {
      const batch = db.batch()
      const chunk = results.leads.slice(i, i + batchSize)

      for (const lead of chunk) {
        // Dedup par SIRET
        const existing = await prospectsRef
          .where('enrichment.siret', '==', lead.siret)
          .limit(1)
          .get()

        if (!existing.empty) continue

        const ref = prospectsRef.doc()
        batch.set(ref, {
          // Identite
          firstName: '',
          lastName: '',
          company: lead.name,
          email: lead.email || null,
          phone: lead.phone || null,
          jobTitle: '',
          // Localisation
          city: lead.city,
          postalCode: lead.postalCode,
          address: lead.address,
          country: 'FR',
          // Web
          website: lead.website || null,
          linkedinUrl: null,
          // CRM
          status: 'new',
          score: lead.score,
          priority: lead.score >= 70 ? 'A' : lead.score >= 40 ? 'B' : 'C',
          category: lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold',
          crmColumn: 'NEW',
          // Source tracking
          source: 'pipeline_france',
          sourceId: 'sirene_fr',
          sourceGroup: 'registries',
          sourceDetails: {
            siret: lead.siret,
            siren: lead.siren,
            nafCode: lead.nafCode,
            nafLabel: lead.nafLabel,
            sector,
            city,
            scoreBreakdown: lead.scoreBreakdown,
            emailVerified: lead.emailVerified,
          },
          // Enrichissement
          enrichment: {
            siret: lead.siret,
            siren: lead.siren,
            naf: lead.nafCode,
            nafLabel: lead.nafLabel,
            domain: lead.website ? extractDomain(lead.website) : null,
            employeeCount: lead.employeeCount,
          },
          // Canaux disponibles
          channels: detectChannels(lead),
          // Engagement
          engagement: {
            touchpoints: 0,
            lastTouchAt: null,
          },
          // Timestamps
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          sourcePipeline: 'france_v1',
          tags: [SECTOR_LABELS[sector] || sector],
        })
        imported++
      }

      await batch.commit()
    }

    return {
      success: true,
      imported,
      stats: results.stats,
      errors: results.errors.slice(0, 10),
    }
  } catch (err) {
    console.error('[runProspectionFrance] Error:', err)
    throw new HttpsError('internal', err.message)
  }
})

/**
 * getSecteursFrance — Retourne la liste des secteurs disponibles
 */
export const getSecteursFrance = onCall({
  cors: ALLOWED_ORIGINS,
  region: 'europe-west1',
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise')
  }

  return {
    sectors: Object.entries(SECTOR_LABELS).map(([id, label]) => ({
      id,
      label,
      nafCodes: NAF_CODES[id],
    })),
  }
})

function extractDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname
  } catch {
    return null
  }
}

function detectChannels(lead) {
  const channels = []
  if (lead.email) channels.push('email')
  if (lead.phone) {
    channels.push('sms')
    if (lead.phone.startsWith('06') || lead.phone.startsWith('07')) {
      channels.push('whatsapp')
    }
  }
  return channels
}
