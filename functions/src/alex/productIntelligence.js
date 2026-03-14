/**
 * Product Intelligence — Recherche mensuelle + IA pour enrichir les connaissances produit
 *
 * Scheduled monthly (1er du mois 3h) + callable :
 * - Recherche Serper : site web, concurrents, marche, avis
 * - AI extrait : USPs, objections, arguments de vente, positionnement
 * - Stocke dans Firestore pour personnaliser les emails
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ============================================
// SCHEDULED — monthlyProductRefresh
// ============================================

export const monthlyProductRefresh = onSchedule({
  schedule: '0 3 1 * *', // 1er du mois a 3h
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
}, async () => {
  console.log('[ProductIntel] Refresh mensuel demarrage...')
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()

  let refreshed = 0
  for (const orgDoc of orgsSnap.docs) {
    try {
      await refreshOrgProductIntel(db, orgDoc.id, orgDoc.data())
      refreshed++
    } catch (err) {
      console.error(`[ProductIntel] Erreur org ${orgDoc.id}:`, err.message)
    }
  }

  console.log(`[ProductIntel] ${refreshed}/${orgsSnap.size} orgs refreshed.`)
})

// ============================================
// CORE — refreshOrgProductIntel
// ============================================

export async function refreshOrgProductIntel(db, orgId, orgData) {
  const website = orgData.website || orgData.domain || ''
  const companyName = orgData.companyName || orgData.name || ''
  const sector = orgData.niche || orgData.sector || ''

  if (!website && !companyName) {
    console.log(`[ProductIntel] Org ${orgId} — pas de website/company, skip`)
    return
  }

  // 1. Recherche Serper multi-requetes
  const searchResults = await runProductSearches(companyName, website, sector)

  // 2. Analyse IA
  const analysis = await analyzeWithAI(companyName, website, sector, searchResults)

  // 3. Stocke
  await db.doc(`organizations/${orgId}/alexMemory/productIntelligence`).set({
    companyName,
    website,
    sector,
    ...analysis,
    searchSources: searchResults.map(r => r.query),
    updatedAt: FieldValue.serverTimestamp(),
    refreshCount: FieldValue.increment(1),
  }, { merge: true })

  console.log(`[ProductIntel] Org ${orgId} refreshed — ${analysis.usps?.length || 0} USPs, ${analysis.objections?.length || 0} objections`)
}

// ============================================
// SERPER SEARCH
// ============================================

async function runProductSearches(company, website, sector) {
  const { cachedSerperFetch } = await import('../utils/serperCache.js')

  const queries = [
    website ? `site:${website}` : `"${company}" site officiel`,
    `"${company}" avis clients`,
    `"${company}" concurrent alternative`,
    sector ? `${sector} tendances 2026` : null,
    `"${company}" tarif prix`,
  ].filter(Boolean)

  const results = []

  for (const query of queries) {
    try {
      const data = await cachedSerperFetch('search', { q: query, gl: 'fr', hl: 'fr', num: 5 })
      if (!data.error) {
        results.push({
          query,
          organic: (data.organic || []).slice(0, 3).map(r => ({
            title: r.title, snippet: r.snippet, link: r.link,
          })),
        })
      }
    } catch {
      // Skip failed search
    }
  }

  return results
}

// ============================================
// AI ANALYSIS
// ============================================

async function analyzeWithAI(company, website, sector, searchResults) {
  const fallback = {
    usps: [],
    objections: [],
    salesArguments: [],
    pricing: 'Non determine',
    competitors: [],
    marketInsights: '',
  }

  if (!searchResults.length) return fallback

  const searchContext = searchResults.map(r =>
    `[${r.query}]\n${r.organic.map(o => `- ${o.title}: ${o.snippet}`).join('\n')}`
  ).join('\n\n')

  const prompt = `Analyse ces resultats de recherche pour l'entreprise "${company}" (${website || 'pas de site'}, secteur: ${sector || 'non precise'}).

Extrais en JSON strict:
{
  "usps": ["USP 1", "USP 2", ...],
  "objections": ["Objection courante 1", ...],
  "salesArguments": ["Argument de vente 1", ...],
  "pricing": "Positionnement prix (low/mid/high/premium)",
  "competitors": ["Concurrent 1", "Concurrent 2", ...],
  "marketInsights": "Resume du marche en 2 phrases"
}

Resultats de recherche:
${searchContext}`

  try {
    const { callAI } = await import('../ai/callAI.js')
    const response = await callAI({
      prompt,
      maxTokens: 1000,
      temperature: 0.3,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    })

    const text = response?.text || response?.content || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        usps: parsed.usps || [],
        objections: parsed.objections || [],
        salesArguments: parsed.salesArguments || [],
        pricing: parsed.pricing || 'Non determine',
        competitors: parsed.competitors || [],
        marketInsights: parsed.marketInsights || '',
      }
    }
  } catch (err) {
    console.warn(`[ProductIntel] AI analysis failed:`, err.message)
  }

  return fallback
}

// ============================================
// CALLABLE — refreshProductIntelligence
// ============================================

export const refreshProductIntelligence = onCall({
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 120,
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const orgDoc = await db.doc(`organizations/${orgId}`).get()
  if (!orgDoc.exists) throw new HttpsError('not-found', 'Org non trouvee')

  await refreshOrgProductIntel(db, orgId, orgDoc.data())
  return { status: 'refreshed', orgId }
})

// ============================================
// CALLABLE — getProductIntelligence
// ============================================

export const getProductIntelligence = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const db = getDb()
  const doc = await db.doc(`organizations/${orgId}/alexMemory/productIntelligence`).get()

  if (!doc.exists) {
    return { exists: false, message: 'Pas encore de donnees. Lancez un refresh.' }
  }

  const data = doc.data()
  return {
    exists: true,
    ...data,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  }
})
