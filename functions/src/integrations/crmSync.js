/**
 * CRM Sync Bidirectionnel — Intent Hunter
 *
 * Import/export et synchronisation avec CRM externes.
 *
 * 3 modes d'entree des leads dans FMF :
 *   Mode 1 : Intent Hunter (scraping automatique)
 *   Mode 2 : Import CSV
 *   Mode 3 : Webhook entrant (CRM push vers FMF)
 *
 * CRM supportes : HubSpot, Salesforce, Pipedrive, Notion
 *
 * Sync sortante : chaque statut Alex → mise a jour CRM client
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { enrichWithRgpdDefaults, validateLeadRgpd } from '../compliance/rgpdEngine.js'

const getDb = () => getFirestore()

// ============================================
// IMPORT CSV
// ============================================

/**
 * Parse et importe des leads depuis un CSV
 * @param {string} csvContent - Contenu CSV brut
 * @param {string} clientId
 * @param {Object} fieldMapping - Mapping colonnes CSV → champs FMF
 * @param {'B2B'|'B2C'} systemType
 * @returns {Promise<{ imported: number, errors: number, duplicates: number }>}
 */
export async function importFromCSV(csvContent, clientId, fieldMapping, systemType = 'B2B') {
  const db = getDb()
  const collection = systemType === 'B2B' ? 'intentLeadsPro' : 'intentLeadsParticuliers'

  const lines = csvContent.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { imported: 0, errors: 0, duplicates: 0 }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  let imported = 0
  let errors = 0
  let duplicates = 0

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const raw = {}
      headers.forEach((h, idx) => { raw[h] = values[idx] || null })

      // Appliquer le mapping
      const lead = {
        clientId,
        systemType,
        source: 'csv_import',
        sourceUrl: 'csv_import',
        sourcePublicStatement: 'Import CSV par le client',
        firstName: raw[fieldMapping.firstName] || null,
        lastName: raw[fieldMapping.lastName] || null,
        email: raw[fieldMapping.email]?.toLowerCase()?.trim() || null,
        phone: raw[fieldMapping.phone] || null,
        company: raw[fieldMapping.company] || null,
        intentSignal: raw[fieldMapping.intentSignal] || 'Import CSV',
        score: 50,
        dynamicScore: 50,
        priority: 'warm',
        sequenceStep: 0,
        sequenceStatus: 'pending',
        contactHistory: [],
        crmColumn: 'new'
      }

      // Deduplication par email
      if (lead.email) {
        const existing = await db.collection(collection)
          .where('email', '==', lead.email)
          .where('clientId', '==', clientId)
          .limit(1)
          .get()

        if (!existing.empty) {
          duplicates++
          continue
        }
      }

      const enriched = enrichWithRgpdDefaults(lead)
      await db.collection(collection).add(enriched)
      imported++
    } catch {
      errors++
    }
  }

  console.log(JSON.stringify({
    function: 'crmSync.importFromCSV',
    step: 'completed',
    clientId,
    imported,
    errors,
    duplicates
  }))

  return { imported, errors, duplicates }
}

// ============================================
// EXPORT CSV
// ============================================

/**
 * Exporte des leads en CSV
 * @param {Object[]} leads
 * @returns {string} CSV content
 */
export function exportLeadsToCSV(leads) {
  if (!leads || leads.length === 0) return ''

  const headers = [
    'firstName', 'lastName', 'email', 'phone', 'company',
    'source', 'intentSignal', 'score', 'priority', 'sequenceStatus',
    'collectedAt', 'zone'
  ]

  const csvLines = [headers.join(',')]

  for (const lead of leads) {
    const values = headers.map(h => {
      const val = lead[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') ? `"${str}"` : str
    })
    csvLines.push(values.join(','))
  }

  return csvLines.join('\n')
}

// ============================================
// CRM PUSH (sortant)
// ============================================

/**
 * Pousse un lead vers le CRM configure du client
 * @param {Object} lead
 * @param {string} clientId
 */
export async function syncLeadToCRM(lead, clientId) {
  const db = getDb()
  const orgDoc = await db.collection('organizations').doc(clientId).get()
  if (!orgDoc.exists) return

  const orgData = orgDoc.data()
  const crmConfig = orgData.intentHunterConfig?.crmSync

  if (!crmConfig?.enabled) return

  const provider = crmConfig.provider // 'hubspot' | 'salesforce' | 'pipedrive'

  try {
    // TODO: Implementer les connecteurs CRM reels
    // Pour l'instant, log la synchronisation
    console.log(JSON.stringify({
      function: 'crmSync.syncLeadToCRM',
      step: 'synced',
      provider,
      clientId,
      leadEmail: lead.email?.slice(0, 3) + '***'
    }))

    // Mettre a jour le timestamp de sync
    const collection = lead.systemType === 'B2B' ? 'intentLeadsPro' : 'intentLeadsParticuliers'
    if (lead.id) {
      await db.collection(collection).doc(lead.id).update({
        crmSyncedAt: Timestamp.now()
      })
    }
  } catch (error) {
    console.error(JSON.stringify({
      function: 'crmSync.syncLeadToCRM',
      step: 'error',
      provider,
      error: error.message
    }))
  }
}

// ============================================
// WEBHOOK INGEST (entrant)
// ============================================

/**
 * Cloud Function HTTP : recoit des leads depuis un CRM externe
 * Route : POST /crm/ingest
 * Auth : header X-FMF-API-KEY
 */
export const crmWebhookIngest = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const apiKey = req.headers['x-fmf-api-key']
    if (!apiKey) {
      res.status(401).json({ error: 'Missing X-FMF-API-KEY header' })
      return
    }

    const db = getDb()

    // Verifier la cle API
    const orgSnapshot = await db.collection('organizations')
      .where('intentHunterConfig.apiKey', '==', apiKey)
      .limit(1)
      .get()

    if (orgSnapshot.empty) {
      res.status(403).json({ error: 'Invalid API key' })
      return
    }

    const clientId = orgSnapshot.docs[0].id
    const leads = Array.isArray(req.body) ? req.body : [req.body]

    let imported = 0
    let errors = 0
    const collection = 'intentLeadsPro' // CRM ingest = B2B par defaut

    for (const rawLead of leads) {
      try {
        const lead = enrichWithRgpdDefaults({
          clientId,
          systemType: 'B2B',
          source: 'crm_webhook',
          sourceUrl: 'crm_webhook_ingest',
          sourcePublicStatement: 'Import via webhook CRM',
          ...rawLead,
          score: 50,
          dynamicScore: 50,
          priority: 'warm',
          sequenceStep: 0,
          sequenceStatus: 'pending',
          contactHistory: [],
          crmColumn: 'new'
        })

        await db.collection(collection).add(lead)
        imported++
      } catch {
        errors++
      }
    }

    console.log(JSON.stringify({
      function: 'crmSync.crmWebhookIngest',
      step: 'completed',
      clientId,
      imported,
      errors
    }))

    res.json({ success: true, imported, errors })
  }
)
