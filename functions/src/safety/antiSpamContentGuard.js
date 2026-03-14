/**
 * Anti-Spam Content Guard — Scanne le contenu AVANT envoi
 *
 * Detecte les patterns spam dans subject + body :
 * - ALL CAPS, mots spam, liens raccourcis, HTML lourd, etc.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'

// ============================================
// SPAM WORD LIST (FR + EN)
// ============================================

const SPAM_WORDS = new Set([
  // FR
  'gratuit', 'promotion', 'urgent', 'offre limitee', 'cliquez ici', 'gagnez',
  'felicitations', 'cadeau', 'reduction', 'exceptionnelle', 'derniere chance',
  'achetez maintenant', 'bravo', 'meilleur prix', 'argent facile', 'sans engagement',
  'creditimmobilier', 'pret personnel', 'casino', 'loterie', 'jackpot',
  'viagra', 'pharmacie', 'medicament', 'regime miracle', 'perte de poids',
  'pas de risque', 'satisfait ou rembourse', '100% gratuit', 'prix imbattable',
  'exclusif', 'incroyable', 'sensationnel', 'fortune', 'milliardaire',
  // EN
  'free', 'click here', 'buy now', 'limited offer', 'act now', 'winner',
  'congratulations', 'make money', 'no risk', 'guarantee', 'lowest price',
  'order now', 'cash bonus', 'double your', 'earn extra', 'be your own boss',
  'work from home', 'get rich', 'incredible deal', 'amazing offer',
  'unsubscribe below', 'you have been selected',
])

const SHORT_LINK_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc',
  'lnkd.in', 'soo.gd', 'clck.ru', 'v.gd',
])

// ============================================
// CORE — scanEmailContent
// ============================================

/**
 * Scanne le contenu email pour detecter les patterns spam
 * @param {string} subject
 * @param {string} body — texte ou HTML
 * @returns {{ pass: boolean, score: number, issues: Array<{ rule: string, severity: string, detail: string }> }}
 */
export function scanEmailContent(subject, body) {
  const issues = []
  let score = 0 // 0 = clean, 100 = pure spam

  const subjectClean = (subject || '').trim()
  const bodyClean = (body || '').trim()
  const bodyText = stripHtml(bodyClean)

  // 1. ALL CAPS dans sujet
  if (subjectClean.length > 5 && subjectClean === subjectClean.toUpperCase() && /[A-Z]/.test(subjectClean)) {
    issues.push({ rule: 'all_caps_subject', severity: 'BLOCK', detail: 'Sujet entierement en majuscules' })
    score += 30
  }

  // 2. Exclamation marks excessifs
  const exclamationCount = (subjectClean.match(/!/g) || []).length + (bodyText.match(/!/g) || []).length
  if (exclamationCount > 3) {
    issues.push({ rule: 'excessive_exclamation', severity: 'WARNING', detail: `${exclamationCount} points d'exclamation` })
    score += 10
  }

  // 3. Mots spam
  const textLower = `${subjectClean} ${bodyText}`.toLowerCase()
  const foundSpamWords = []
  for (const word of SPAM_WORDS) {
    if (textLower.includes(word)) {
      foundSpamWords.push(word)
    }
  }
  if (foundSpamWords.length >= 3) {
    issues.push({ rule: 'spam_words', severity: 'BLOCK', detail: `${foundSpamWords.length} mots spam: ${foundSpamWords.slice(0, 5).join(', ')}` })
    score += 25
  } else if (foundSpamWords.length >= 1) {
    issues.push({ rule: 'spam_words', severity: 'WARNING', detail: `${foundSpamWords.length} mot(s) spam: ${foundSpamWords.join(', ')}` })
    score += 10
  }

  // 4. Liens — plus de 2
  const links = bodyClean.match(/https?:\/\/[^\s"'<>]+/gi) || []
  if (links.length > 2) {
    issues.push({ rule: 'too_many_links', severity: 'BLOCK', detail: `${links.length} liens detectes (max 2)` })
    score += 20
  }

  // 5. Liens raccourcis
  const shortLinks = links.filter(link => {
    try {
      const url = new URL(link)
      return SHORT_LINK_DOMAINS.has(url.hostname)
    } catch { return false }
  })
  if (shortLinks.length > 0) {
    issues.push({ rule: 'short_links', severity: 'BLOCK', detail: `${shortLinks.length} lien(s) raccourci(s) detecte(s)` })
    score += 25
  }

  // 6. Tracking pixel (img 1x1)
  const trackingPixels = bodyClean.match(/<img[^>]*(width\s*=\s*["']?1["']?|height\s*=\s*["']?1["']?)[^>]*>/gi) || []
  if (trackingPixels.length > 0) {
    issues.push({ rule: 'tracking_pixel', severity: 'BLOCK', detail: 'Image 1x1 (tracking pixel) detectee' })
    score += 15
  }

  // 7. HTML lourd
  const htmlSize = new TextEncoder().encode(bodyClean).length
  if (htmlSize > 5120) {
    issues.push({ rule: 'heavy_html', severity: 'WARNING', detail: `HTML lourd: ${Math.round(htmlSize / 1024)}KB (max 5KB)` })
    score += 10
  }

  // 8. Trop d'images
  const imageCount = (bodyClean.match(/<img\s/gi) || []).length
  if (imageCount > 3) {
    issues.push({ rule: 'too_many_images', severity: 'WARNING', detail: `${imageCount} images (max 3)` })
    score += 10
  }

  // 9. Email trop long
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length
  if (wordCount > 150) {
    issues.push({ rule: 'too_long', severity: 'WARNING', detail: `${wordCount} mots (max 150 pour cold email)` })
    score += 5
  }

  // 10. Ratio texte/HTML faible
  if (bodyClean.includes('<') && bodyText.length > 0) {
    const ratio = bodyText.length / bodyClean.length
    if (ratio < 0.3) {
      issues.push({ rule: 'low_text_ratio', severity: 'WARNING', detail: `Ratio texte/HTML: ${(ratio * 100).toFixed(0)}% (min 30%)` })
      score += 10
    }
  }

  score = Math.min(score, 100)

  const hasBlock = issues.some(i => i.severity === 'BLOCK')

  return {
    pass: !hasBlock && score < 50,
    score,
    issues,
    summary: hasBlock
      ? `BLOQUE — ${issues.filter(i => i.severity === 'BLOCK').length} violation(s) critique(s)`
      : score >= 50
        ? `RISQUE ELEVE — score spam ${score}/100`
        : `OK — score ${score}/100`,
  }
}

// ============================================
// HELPERS
// ============================================

function stripHtml(html) {
  return (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================
// INTERNAL — validateEmailContent
// ============================================

/**
 * Valide le contenu email — a appeler avant chaque envoi
 * Retourne true si OK, throw si bloque
 */
export function validateEmailContent(subject, body) {
  const result = scanEmailContent(subject, body)
  if (!result.pass) {
    const blockIssues = result.issues.filter(i => i.severity === 'BLOCK')
    if (blockIssues.length > 0) {
      throw new Error(`[AntiSpam] Email bloque: ${blockIssues.map(i => i.detail).join('; ')}`)
    }
  }
  return result
}

// ============================================
// CALLABLE — scanEmailContentFn
// ============================================

export const scanEmailContentFn = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { subject, body } = request.data || {}
  if (!subject && !body) {
    throw new HttpsError('invalid-argument', 'subject ou body requis')
  }

  return scanEmailContent(subject || '', body || '')
})
