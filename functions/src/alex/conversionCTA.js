/**
 * conversionCTA.js — Source unique CTA pour Conversion Actions
 *
 * Charge la conversionAction d'une org et genere le texte CTA
 * adapte au canal (WhatsApp, Email, SMS).
 */

import { getFirestore } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

// In-memory cache (5 min TTL)
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Charge la conversionAction d'une org (cache 5 min)
 */
export async function getConversionAction(orgId) {
  if (!orgId) return null

  const cacheKey = `ca_${orgId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  try {
    const orgSnap = await getDb().doc(`organizations/${orgId}`).get()
    if (!orgSnap.exists) return null

    const ca = orgSnap.data()?.conversionAction || null
    cache.set(cacheKey, { data: ca, ts: Date.now() })
    return ca
  } catch {
    return null
  }
}

/**
 * Genere le texte CTA adapte au canal
 * @param {object} conversionAction - Config conversionAction de l'org
 * @param {string} channel - whatsapp | email | sms
 * @param {string} orgSlug - Slug org pour URL landing page
 * @param {string} [prospectId] - ID prospect pour tracking
 * @returns {string} Texte CTA a appender au message
 */
export function buildCTAText(conversionAction, channel, orgSlug, prospectId) {
  if (!conversionAction) return ''

  const { type, label, ctaUrl, landingPageEnabled } = conversionAction

  switch (type) {
    case 'document_upload': {
      if (!landingPageEnabled || !orgSlug) return ''
      const baseUrl = process.env.APP_URL || 'https://face-media-factory.web.app'
      const url = prospectId
        ? `${baseUrl}/collect/${orgSlug}?p=${prospectId}`
        : `${baseUrl}/collect/${orgSlug}`

      if (channel === 'email') {
        return `\n\n${label || 'Deposez votre document ici'} :\n${url}`
      }
      return `\n\n${label || 'Deposez votre document ici'} : ${url}`
    }

    case 'booking': {
      if (!ctaUrl) return ''
      if (channel === 'email') {
        return `\n\nReservez votre creneau : ${ctaUrl}`
      }
      return `\n\nReservez ici : ${ctaUrl}`
    }

    case 'signup': {
      if (!ctaUrl) return ''
      return `\n\n${label || 'Inscrivez-vous'} : ${ctaUrl}`
    }

    case 'form_fill': {
      if (!ctaUrl) return ''
      return `\n\n${label || 'Remplissez le formulaire'} : ${ctaUrl}`
    }

    case 'custom': {
      if (!ctaUrl) return ''
      return `\n\n${label || 'En savoir plus'} : ${ctaUrl}`
    }

    case 'reply_positive':
    default:
      return ''
  }
}

/**
 * Genere un bouton HTML CTA pour les emails
 */
export function buildCTAButton(conversionAction, orgSlug, prospectId) {
  if (!conversionAction) return ''

  const ctaText = buildCTAText(conversionAction, 'email', orgSlug, prospectId)
  if (!ctaText) return ''

  // Extract URL from CTA text
  const urlMatch = ctaText.match(/https?:\/\/[^\s]+/)
  if (!urlMatch) return ''

  const url = urlMatch[0]
  const label = conversionAction.label || 'Passer a l\'action'

  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" style="display: inline-block; padding: 12px 28px; background: #4F6EF7; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
        ${label}
      </a>
    </div>
  `
}
