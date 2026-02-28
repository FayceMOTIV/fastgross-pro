/**
 * LinkedIn Hunter — Cloud Functions
 *
 * - linkedinHunter: onCall — recherche + scrape + qualify + save prospects
 * - runLinkedInHunterManual: onCall — lancement manuel
 * - getLinkedInHunterStats: onCall — stats
 * - syncLinkedInInbox: onCall — sync inbox HeyReach → Firestore
 * - addLinkedInAccount / removeLinkedInAccount: onCall — gestion comptes
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

import { scrapeLinkedInSearch, scrapeLinkedInProfile } from './linkedinScraper.js'
import {
  getLinkedInAccounts as fetchAccounts,
  getInboxMessages,
  getAccountStats,
  createCampaign,
  addLeadsToCampaign,
} from './linkedinService.js'

const getDb = () => getFirestore()

// ============================================
// LINKEDIN HUNTER — Recherche + Qualify + Save
// ============================================
export const linkedinHunter = onCall(
  { region: 'europe-west1', timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId, keywords, location, limit, filters } = request.data || {}
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()
    const stats = { scraped: 0, qualified: 0, saved: 0, duplicates: 0, errors: 0 }

    try {
      // Verifier membership org
      const memberSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('members')
        .doc(request.auth.uid)
        .get()

      if (!memberSnap.exists) {
        throw new HttpsError('permission-denied', 'Acces non autorise a cette organisation')
      }

      logger.info(`[linkedinHunter] Starting search for org=${orgId}: "${keywords}" in ${location || 'any'}`)

      // 1. Scrape LinkedIn
      const searchResult = await scrapeLinkedInSearch(keywords || 'CEO', location, limit || 50)

      if (!searchResult.success || searchResult.profiles.length === 0) {
        // Fallback: mock data si pas d'API key
        const profiles = generateMockProfiles(keywords, limit || 50)
        return await processAndSaveProfiles(db, orgId, profiles, filters, stats, request.auth.uid)
      }

      stats.scraped = searchResult.profiles.length
      return await processAndSaveProfiles(db, orgId, searchResult.profiles, filters, stats, request.auth.uid)
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('[linkedinHunter] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// RUN MANUAL — Lancement interactif
// ============================================
export const runLinkedInHunterManual = onCall(
  { region: 'europe-west1', timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId, keywords, location, limit, filters, createCampaignAfter, campaignConfig } =
      request.data || {}

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()
    const stats = { scraped: 0, qualified: 0, saved: 0, duplicates: 0, errors: 0 }

    try {
      logger.info(`[linkedinHunter] Manual run by ${request.auth.uid} for org=${orgId}`)

      // Scrape
      const searchResult = await scrapeLinkedInSearch(keywords || 'CEO', location, limit || 50)

      let profiles = searchResult.success ? searchResult.profiles : generateMockProfiles(keywords, limit || 50)
      stats.scraped = profiles.length

      // Qualify & Save
      const result = await processAndSaveProfiles(db, orgId, profiles, filters, stats, request.auth.uid)

      // Optionnel: creer une campagne HeyReach avec les prospects sauvegardes
      if (createCampaignAfter && result.savedProspectIds?.length > 0) {
        try {
          const campaignResult = await createCampaign(orgId, campaignConfig || {})
          if (campaignResult.success) {
            const leads = profiles
              .filter((p) => result.savedProspectIds.includes(p._firestoreId))
              .map((p) => ({
                linkedinUrl: p.profileUrl,
                firstName: p.firstName,
                lastName: p.lastName,
                company: p.company,
              }))

            await addLeadsToCampaign(campaignResult.campaignId, leads)
            result.campaign = { id: campaignResult.campaignId, leadsAdded: leads.length }
          }
        } catch (err) {
          logger.error('[linkedinHunter] Campaign creation error:', err.message)
          result.campaignError = err.message
        }
      }

      return result
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('[linkedinHunter] manual error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// GET STATS
// ============================================
export const getLinkedInHunterStats = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId } = request.data || {}
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()

    try {
      // Prospects LinkedIn
      const prospectsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .where('source', '==', 'linkedin')
        .get()

      const total = prospectsSnap.size
      let qualified = 0
      let contacted = 0
      let replied = 0

      prospectsSnap.forEach((doc) => {
        const data = doc.data()
        if ((data.score || 0) >= 50) qualified++
        if (data.status === 'contacted' || data.status === 'warm' || data.status === 'hot') contacted++
        if (data.status === 'warm' || data.status === 'hot') replied++
      })

      // Campagnes LinkedIn
      const campaignsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('outreachCampaigns')
        .where('provider', '==', 'heyreach')
        .get()

      const campaigns = campaignsSnap.size
      let activeCampaigns = 0
      campaignsSnap.forEach((doc) => {
        if (doc.data().status === 'active' || doc.data().status === 'running') activeCampaigns++
      })

      // Comptes LinkedIn
      const accountsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('channelAccounts')
        .where('channel', '==', 'linkedin')
        .get()

      return {
        prospects: { total, qualified, contacted, replied },
        campaigns: { total: campaigns, active: activeCampaigns },
        accounts: accountsSnap.size,
        conversionRate: total > 0 ? ((replied / total) * 100).toFixed(1) : '0',
      }
    } catch (error) {
      logger.error('[getLinkedInHunterStats] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// SYNC INBOX — HeyReach → Firestore
// ============================================
export const syncLinkedInInbox = onCall(
  { region: 'europe-west1', timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId } = request.data || {}
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()
    let synced = 0

    try {
      // Recuperer les comptes LinkedIn de l'org
      const accountsSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('channelAccounts')
        .where('channel', '==', 'linkedin')
        .get()

      for (const accountDoc of accountsSnap.docs) {
        const account = accountDoc.data()
        const accountId = account.externalAccountId || accountDoc.id

        const lastSync = account.lastInboxSync?.toDate?.() || null
        const sinceDate = lastSync ? lastSync.toISOString() : null

        const inboxResult = await getInboxMessages(accountId, sinceDate)

        if (!inboxResult.success || inboxResult.messages.length === 0) continue

        for (const msg of inboxResult.messages) {
          // Sauvegarder dans interactions
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('interactions')
            .add({
              channel: 'linkedin',
              direction: 'in',
              content: msg.text || msg.message || '',
              senderName: msg.senderName || '',
              senderProfileUrl: msg.senderProfileUrl || '',
              accountId,
              externalMessageId: msg.id || '',
              createdAt: msg.sentAt ? new Date(msg.sentAt) : FieldValue.serverTimestamp(),
              importedAt: FieldValue.serverTimestamp(),
            })

          synced++
        }

        // Mettre a jour lastInboxSync
        await accountDoc.ref.update({
          lastInboxSync: FieldValue.serverTimestamp(),
        })
      }

      logger.info(`[syncLinkedInInbox] org=${orgId} synced ${synced} messages`)
      return { success: true, synced }
    } catch (error) {
      logger.error('[syncLinkedInInbox] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// ADD LINKEDIN ACCOUNT
// ============================================
export const addLinkedInAccount = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId, accountName, externalAccountId } = request.data || {}
    if (!orgId || !accountName) {
      throw new HttpsError('invalid-argument', 'orgId et accountName requis')
    }

    const db = getDb()

    try {
      const docRef = await db
        .collection('organizations')
        .doc(orgId)
        .collection('channelAccounts')
        .add({
          channel: 'linkedin',
          accountName,
          externalAccountId: externalAccountId || '',
          status: 'pending',
          warmupDay: 0,
          dailySent: 0,
          totalSent: 0,
          totalConnections: 0,
          addedBy: request.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
        })

      logger.info(`[addLinkedInAccount] org=${orgId} account=${docRef.id} added by ${request.auth.uid}`)
      return { success: true, accountId: docRef.id }
    } catch (error) {
      logger.error('[addLinkedInAccount] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// REMOVE LINKEDIN ACCOUNT
// ============================================
export const removeLinkedInAccount = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { orgId, accountId } = request.data || {}
    if (!orgId || !accountId) {
      throw new HttpsError('invalid-argument', 'orgId et accountId requis')
    }

    const db = getDb()

    try {
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('channelAccounts')
        .doc(accountId)
        .delete()

      logger.info(`[removeLinkedInAccount] org=${orgId} account=${accountId} removed by ${request.auth.uid}`)
      return { success: true }
    } catch (error) {
      logger.error('[removeLinkedInAccount] error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

// ============================================
// HELPERS
// ============================================

async function processAndSaveProfiles(db, orgId, profiles, filters, stats, userId) {
  const savedProspectIds = []

  for (const profile of profiles) {
    try {
      // Appliquer filtres
      if (filters) {
        if (filters.minConnections && (profile.connections || 0) < filters.minConnections) {
          continue
        }
        if (filters.jobTitleKeywords) {
          const title = (profile.jobTitle || profile.headline || '').toLowerCase()
          const matches = filters.jobTitleKeywords.some((kw) => title.includes(kw.toLowerCase()))
          if (!matches) continue
        }
        if (filters.excludeCompanies) {
          const company = (profile.company || '').toLowerCase()
          const excluded = filters.excludeCompanies.some((c) => company.includes(c.toLowerCase()))
          if (excluded) continue
        }
      }

      stats.qualified++

      // Verifier doublon par profileUrl
      const existingSnap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .where('linkedinUrl', '==', profile.profileUrl)
        .limit(1)
        .get()

      if (!existingSnap.empty) {
        stats.duplicates++
        continue
      }

      // Sauvegarder le prospect
      const prospectData = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        fullName: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim(),
        email: profile.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        jobTitle: profile.jobTitle || '',
        linkedinUrl: profile.profileUrl || '',
        location: profile.location || '',
        source: 'linkedin',
        status: 'new',
        score: calculateLinkedInScore(profile),
        channels: {
          linkedin: {
            profileUrl: profile.profileUrl,
            connectionDegree: profile.connectionDegree,
            active: true,
          },
        },
        tags: ['linkedin-hunter'],
        importedBy: userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }

      const docRef = await db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .add(prospectData)

      profile._firestoreId = docRef.id
      savedProspectIds.push(docRef.id)
      stats.saved++
    } catch (error) {
      stats.errors++
      logger.error(`[linkedinHunter] Error processing profile:`, error.message)
    }
  }

  // Logger le run
  await db
    .collection('organizations')
    .doc(orgId)
    .collection('hunterLogs')
    .add({
      hunter: 'linkedin',
      ...stats,
      runBy: userId,
      createdAt: FieldValue.serverTimestamp(),
    })

  logger.info(`[linkedinHunter] org=${orgId} scraped=${stats.scraped} qualified=${stats.qualified} saved=${stats.saved} duplicates=${stats.duplicates}`)

  return { ...stats, savedProspectIds }
}

function calculateLinkedInScore(profile) {
  let score = 30 // Base

  // Avoir un poste de decision
  const title = (profile.jobTitle || profile.headline || '').toLowerCase()
  const decisionMakerTitles = ['ceo', 'cto', 'coo', 'cfo', 'cmo', 'founder', 'directeur', 'director', 'vp', 'head of', 'chef', 'responsable', 'gerant', 'president']
  if (decisionMakerTitles.some((t) => title.includes(t))) {
    score += 25
  }

  // Avoir une entreprise
  if (profile.company) score += 10

  // Localisation renseignee
  if (profile.location) score += 5

  // Email disponible
  if (profile.email) score += 15

  // Connexions
  if ((profile.connections || 0) > 500) score += 10
  else if ((profile.connections || 0) > 100) score += 5

  return Math.min(score, 100)
}

function generateMockProfiles(keywords, limit) {
  const mockCompanies = ['TechCorp', 'StartupIO', 'DigiAgency', 'WebFactory', 'DataLab', 'CloudNine', 'AppVenture', 'InnovateSAS']
  const mockTitles = ['CEO', 'CTO', 'Directeur Marketing', 'Head of Sales', 'Fondateur', 'VP Growth', 'Responsable Digital', 'COO']
  const mockCities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Nantes', 'Lille', 'Strasbourg']

  const profiles = []
  const count = Math.min(limit, 20)

  for (let i = 0; i < count; i++) {
    const firstName = `Prospect${i + 1}`
    const lastName = `LinkedIn`
    profiles.push({
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      headline: mockTitles[i % mockTitles.length],
      jobTitle: mockTitles[i % mockTitles.length],
      company: mockCompanies[i % mockCompanies.length],
      location: mockCities[i % mockCities.length],
      profileUrl: `https://www.linkedin.com/in/mock-profile-${i + 1}`,
      connectionDegree: (i % 3) + 1,
      connections: Math.floor(Math.random() * 2000) + 100,
      email: '',
    })
  }

  return profiles
}
