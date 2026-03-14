/**
 * llms.txt Generator — Module 7 (Alex V4 SHIELD)
 * Genere un fichier llms.txt optimise pour les LLM crawlers.
 *
 * Format llms.txt (proposal spec) :
 *   # Company Name
 *   > One-line description
 *   Detailed information about the company...
 *   ## Products/Services
 *   - [Product](url): description
 *   ## Contact
 *   ...
 *
 * Sources d'info : scrape du site web + meta tags + Schema.org + IA
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

// ─── Callable: generate llms.txt ─────────────────────────────────────

export const generateLlmsTxt = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, domain, companyName, customInfo } = request.data || {}
  if (!orgId || !domain) throw new HttpsError('invalid-argument', 'orgId et domain requis')

  const result = await generateLlmsContent(domain, companyName, customInfo)

  // Save to Firestore
  const db = getDb()
  await db.collection('organizations').doc(orgId).collection('llmsTxtGenerated').doc(domain.replace(/\./g, '_')).set({
    domain,
    content: result.content,
    sections: result.sections,
    generatedAt: FieldValue.serverTimestamp(),
  })

  logger.info(`llms.txt generated for ${domain} (${result.content.length} chars)`)
  return { success: true, ...result }
})

// ─── Core generation function ────────────────────────────────────────

export async function generateLlmsContent(domain, companyName, customInfo) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  // Fetch site data in parallel
  const [htmlData, robotsData] = await Promise.allSettled([
    fetchSiteInfo(cleanDomain),
    fetchExistingLlmsTxt(cleanDomain),
  ])

  const site = htmlData.status === 'fulfilled' ? htmlData.value : {}
  const existing = robotsData.status === 'fulfilled' ? robotsData.value : null

  // If llms.txt already exists, return it
  if (existing) {
    return {
      content: existing,
      alreadyExists: true,
      sections: [],
    }
  }

  // Build llms.txt from scraped data
  const name = companyName || site.title || cleanDomain
  const description = site.metaDescription || customInfo || ''

  const sections = []

  // Header section
  sections.push({
    type: 'header',
    content: `# ${name}\n\n> ${description || `Site web : ${cleanDomain}`}`,
  })

  // About section from scraped content
  if (site.mainContent) {
    sections.push({
      type: 'about',
      content: `## A propos\n\n${site.mainContent.substring(0, 500)}`,
    })
  }

  // Products/Services from navigation
  if (site.navLinks?.length > 0) {
    const links = site.navLinks
      .filter(l => l.text && l.href)
      .slice(0, 10)
      .map(l => `- [${l.text}](${l.href}): Page du site`)
      .join('\n')
    if (links) {
      sections.push({
        type: 'navigation',
        content: `## Pages principales\n\n${links}`,
      })
    }
  }

  // Schema.org info
  if (site.schemaData) {
    const schema = site.schemaData
    const schemaLines = []
    if (schema.name) schemaLines.push(`- Nom : ${schema.name}`)
    if (schema.description) schemaLines.push(`- Description : ${schema.description}`)
    if (schema.address) schemaLines.push(`- Adresse : ${typeof schema.address === 'string' ? schema.address : schema.address.streetAddress || ''}`)
    if (schema.telephone) schemaLines.push(`- Telephone : ${schema.telephone}`)
    if (schema.email) schemaLines.push(`- Email : ${schema.email}`)
    if (schema.openingHours) schemaLines.push(`- Horaires : ${Array.isArray(schema.openingHours) ? schema.openingHours.join(', ') : schema.openingHours}`)
    if (schemaLines.length > 0) {
      sections.push({
        type: 'schema',
        content: `## Informations entreprise\n\n${schemaLines.join('\n')}`,
      })
    }
  }

  // Social links
  if (site.socialLinks && Object.values(site.socialLinks).some(Boolean)) {
    const social = Object.entries(site.socialLinks)
      .filter(([, url]) => url)
      .map(([platform, url]) => `- [${platform}](${url})`)
      .join('\n')
    sections.push({
      type: 'social',
      content: `## Reseaux sociaux\n\n${social}`,
    })
  }

  // Tech stack info
  if (site.techStack?.length > 0) {
    sections.push({
      type: 'tech',
      content: `## Stack technique\n\n${site.techStack.join(', ')}`,
    })
  }

  // Contact
  if (customInfo) {
    sections.push({
      type: 'custom',
      content: `## Informations supplementaires\n\n${customInfo}`,
    })
  }

  // Optional: Use AI to enhance the content
  let aiEnhanced = null
  try {
    const { callAI } = await import('../ai/callAI.js')
    const rawContent = sections.map(s => s.content).join('\n\n')
    const aiPrompt = `Tu es un expert en SEO pour les LLM. Reformule ce fichier llms.txt pour qu'il soit optimal pour les AI crawlers (ChatGPT, Claude, Gemini). Le format doit etre Markdown propre. Garde le contenu factuel, pas de marketing exagere. Domaine: ${cleanDomain}

Contenu brut :
${rawContent}

Genere un llms.txt professionnel en francais. Commence directement par "# " suivi du nom.`

    aiEnhanced = await callAI(aiPrompt, 2000)
  } catch {
    // Fallback to raw content
  }

  const finalContent = aiEnhanced || sections.map(s => s.content).join('\n\n')

  return {
    content: finalContent,
    alreadyExists: false,
    sections: sections.map(s => s.type),
    domain: cleanDomain,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchSiteInfo(domain) {
  try {
    const response = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
      redirect: 'follow',
    })
    if (!response.ok) return {}

    const html = await response.text()

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    // Meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const metaDescription = descMatch ? descMatch[1].trim() : null

    // Navigation links
    const navLinks = []
    const navMatches = html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([^<]+)<\/a>/gi)
    for (const m of navMatches) {
      let href = m[1].trim()
      const text = m[2].trim()
      if (text.length < 2 || text.length > 50) continue
      if (href.startsWith('/')) href = `https://${domain}${href}`
      if (!href.startsWith('http')) continue
      if (navLinks.length < 15) navLinks.push({ href, text })
    }

    // Main text content (first 1000 chars of visible text)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyHtml = bodyMatch ? bodyMatch[1] : html
    const mainContent = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)

    // Schema.org JSON-LD — first structured object
    let schemaData = null
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch) {
      try {
        schemaData = JSON.parse(jsonLdMatch[1])
        if (schemaData['@graph']) schemaData = schemaData['@graph'][0] || schemaData
      } catch { /* malformed */ }
    }

    // Social links
    const socialLinks = {}
    const platforms = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com']
    for (const p of platforms) {
      const escaped = p.replace('.', '\\.')
      const match = html.match(new RegExp(`href=["'](https?://(?:www\\.)?${escaped}[^"']+)["']`, 'i'))
      if (match) socialLinks[p.replace('.com', '')] = match[1]
    }

    // Tech stack (basic detection)
    const techStack = []
    if (/wordpress|wp-content/i.test(html)) techStack.push('WordPress')
    if (/shopify/i.test(html)) techStack.push('Shopify')
    if (/__NEXT/i.test(html)) techStack.push('Next.js')
    if (/__NUXT/i.test(html)) techStack.push('Nuxt')
    if (/wix\.com/i.test(html)) techStack.push('Wix')
    if (/squarespace/i.test(html)) techStack.push('Squarespace')
    if (/webflow/i.test(html)) techStack.push('Webflow')
    if (/react/i.test(html)) techStack.push('React')
    if (/vue/i.test(html)) techStack.push('Vue.js')

    return { title, metaDescription, navLinks, mainContent, schemaData, socialLinks, techStack }
  } catch {
    return {}
  }
}

async function fetchExistingLlmsTxt(domain) {
  try {
    const response = await fetch(`https://${domain}/llms.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    })
    if (!response.ok) return null
    const content = await response.text()
    return content.length > 10 ? content : null
  } catch {
    return null
  }
}
