/**
 * False Positive Detector — Intent Hunter
 *
 * Verifie si un lead doit etre ignore avant tout contact.
 * Toutes les verifications sont executees en parallele via Promise.all().
 *
 * Checks :
 *   1. Domaine concurrent
 *   2. Profil media / journaliste
 *   3. Employe du client
 *   4. Client existant du client
 *   5. Blacklist globale FMF
 *   6. Bot / fake profile
 *   7. Mineur probable
 *   8. Cooldown 30 jours entre sequences
 */

import { getFirestore } from 'firebase-admin/firestore'
import { isGlobalBlacklisted } from '../compliance/rgpdEngine.js'

const getDb = () => getFirestore()

// ============================================
// INDIVIDUAL CHECKS
// ============================================

/**
 * Verifie si le domaine email est celui d'un concurrent
 */
function checkCompetitorDomain(domain, competitorDomains = []) {
  if (!domain || competitorDomains.length === 0) return false
  const normalized = domain.toLowerCase().trim()
  return competitorDomains.some(d => normalized === d.toLowerCase().trim() || normalized.endsWith('.' + d.toLowerCase().trim()))
}

/**
 * Detecte les profils media / journalistes / influenceurs
 * Risque : article negatif, prise de contact mal interpretee
 */
function checkMediaProfile(jobTitle, bio) {
  const mediaKeywords = [
    'journaliste', 'reporter', 'blogger', 'blogueur', 'bloggeur',
    'influenceur', 'influenceuse', 'redacteur', 'redactrice',
    'chroniqueur', 'editorialiste', 'presse', 'media',
    'journalist', 'editor', 'correspondent', 'columnist',
    'influencer', 'content creator', 'createur de contenu',
    'youtuber', 'podcasteur', 'podcasteuse'
  ]

  const text = `${jobTitle || ''} ${bio || ''}`.toLowerCase()
  return mediaKeywords.some(kw => text.includes(kw))
}

/**
 * Verifie si le lead est un employe du client FMF
 */
async function checkExistingEmployee(email, employeeDomains = []) {
  if (!email || employeeDomains.length === 0) return false
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return employeeDomains.some(d => domain === d.toLowerCase().trim())
}

/**
 * Verifie si le lead est deja un client existant du client FMF
 */
async function checkExistingClient(email, clientId) {
  if (!email || !clientId) return false

  const db = getDb()

  // Chercher dans les prospects existants de l'org avec statut "client"
  const snapshot = await db.collectionGroup('prospects')
    .where('email', '==', email.toLowerCase().trim())
    .where('status', 'in', ['client', 'converted', 'won'])
    .limit(1)
    .get()

  return !snapshot.empty
}

/**
 * Detecte les profils bot / fake
 * Criteres : compte < 7 jours, 0 posts, bio vide, username generique
 */
function checkBotProfile(lead) {
  let botScore = 0

  // Compte recent (< 7 jours)
  if (lead.accountAge !== undefined && lead.accountAge < 7) botScore += 3

  // Zero posts/contributions
  if (lead.postCount !== undefined && lead.postCount === 0) botScore += 2

  // Bio vide
  if (!lead.bio || lead.bio.trim().length === 0) botScore += 1

  // Username generique (pattern : lettres + chiffres aleatoires)
  if (lead.username) {
    const generic = /^[a-z]+\d{4,}$/i.test(lead.username)
    const tooRandom = /^[a-z0-9]{15,}$/i.test(lead.username)
    if (generic || tooRandom) botScore += 2
  }

  // Pas de photo de profil
  if (lead.hasProfilePicture === false) botScore += 1

  // Score >= 4 = probable bot
  return botScore >= 4
}

/**
 * Detecte les profils de mineurs probables (< 18 ans)
 */
function checkMinorProfile(bio, accountAge) {
  if (!bio) return false
  const text = bio.toLowerCase()

  const minorSignals = [
    'lyceen', 'lyceenne', 'college', 'collegien', 'collegienne',
    'seconde', 'premiere', 'terminale', '3eme', '4eme', '5eme', '6eme',
    '15 ans', '16 ans', '17 ans', '14 ans', '13 ans', '12 ans',
    'high school', 'teen', 'minor',
    'brevet des colleges', 'bac 2026', 'bac 2027'
  ]

  return minorSignals.some(signal => text.includes(signal))
}

/**
 * Verifie le cooldown entre deux sequences pour le meme lead
 * Empeche de recontacter un prospect trop vite
 */
async function checkCooldown(leadIdentifier, clientId, cooldownDays = 30) {
  if (!leadIdentifier) return false

  const db = getDb()
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - cooldownDays)

  // Chercher dans les deux collections Intent Hunter
  const collections = ['intentLeadsPro', 'intentLeadsParticuliers']

  for (const collection of collections) {
    // Par email
    if (leadIdentifier.email) {
      const snap = await db.collection(collection)
        .where('email', '==', leadIdentifier.email.toLowerCase().trim())
        .where('clientId', '==', clientId)
        .where('lastActivityAt', '>=', cooldownDate)
        .limit(1)
        .get()

      if (!snap.empty) return true
    }

    // Par telephone
    if (leadIdentifier.phone) {
      const snap = await db.collection(collection)
        .where('phone', '==', leadIdentifier.phone)
        .where('clientId', '==', clientId)
        .where('lastActivityAt', '>=', cooldownDate)
        .limit(1)
        .get()

      if (!snap.empty) return true
    }

    // Par username natif
    if (leadIdentifier.nativeContactId) {
      const snap = await db.collection(collection)
        .where('nativeContactId', '==', leadIdentifier.nativeContactId)
        .where('clientId', '==', clientId)
        .where('lastActivityAt', '>=', cooldownDate)
        .limit(1)
        .get()

      if (!snap.empty) return true
    }
  }

  return false
}

// ============================================
// MAIN DETECTOR
// ============================================

/**
 * Verifie si un lead doit etre ignore avant tout contact.
 * Toutes les verifications sont executees en parallele.
 *
 * @param {Object} lead - Lead detecte par un scraper
 * @param {Object} clientConfig - Configuration du client FMF
 * @param {string[]} clientConfig.competitorDomains - Domaines concurrents
 * @param {string[]} clientConfig.employeeDomains - Domaines internes du client
 * @param {string} clientConfig.clientId - ID du client FMF
 * @returns {Promise<{ isFalsePositive: boolean, reasons: string[] }>}
 */
export async function isFalsePositive(lead, clientConfig) {
  const domain = lead.email?.split('@')[1]

  const [
    competitorResult,
    mediaResult,
    employeeResult,
    existingClientResult,
    blacklistResult,
    botResult,
    minorResult,
    cooldownResult
  ] = await Promise.all([
    Promise.resolve(checkCompetitorDomain(domain, clientConfig.competitorDomains || [])),
    Promise.resolve(checkMediaProfile(lead.jobTitle, lead.bio)),
    checkExistingEmployee(lead.email, clientConfig.employeeDomains || []),
    checkExistingClient(lead.email, clientConfig.clientId),
    isGlobalBlacklisted(lead.email, lead.phone),
    Promise.resolve(checkBotProfile(lead)),
    Promise.resolve(checkMinorProfile(lead.bio, lead.accountAge)),
    checkCooldown(lead, clientConfig.clientId, 30)
  ])

  const reasons = [
    competitorResult && 'competitor',
    mediaResult && 'media_profile',
    employeeResult && 'existing_employee',
    existingClientResult && 'existing_client',
    blacklistResult && 'global_blacklist',
    botResult && 'bot_detected',
    minorResult && 'minor_profile',
    cooldownResult && 'in_cooldown'
  ].filter(Boolean)

  if (reasons.length > 0) {
    console.log(JSON.stringify({
      function: 'falsePositiveDetector.isFalsePositive',
      step: 'filtered',
      leadEmail: lead.email?.slice(0, 3) + '***',
      reasons,
      clientId: clientConfig.clientId
    }))
  }

  return {
    isFalsePositive: reasons.length > 0,
    reasons
  }
}
