/**
 * AI Crawler Audit — Module 9 (Alex V4 SHIELD)
 * Checklist automatique : robots.txt, vitesse, SSR, meta tags, Schema.org
 *
 * Score 0-100 sur 6 dimensions :
 *  - robots.txt (15 pts) : exists, sitemap, AI bots allowed
 *  - Page Speed (20 pts) : performance score, FCP, LCP
 *  - SSR / Rendering (15 pts) : SSR framework, pre-rendered content
 *  - Meta Tags (20 pts) : title, description, OG, Twitter Card, canonical
 *  - Schema.org (15 pts) : JSON-LD presence, rich types
 *  - Accessibilite IA (15 pts) : llms.txt, structured headings, clean text
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { verifyOrgMembership } from '../utils/verifyOrgMembership.js'

const getDb = () => getFirestore()

// ─── Checklist items ─────────────────────────────────────────────────

const CHECKLIST = {
  robotsTxt: {
    weight: 15,
    items: [
      { id: 'robots_exists', label: 'robots.txt existe', points: 4 },
      { id: 'robots_sitemap', label: 'Sitemap declare dans robots.txt', points: 3 },
      { id: 'robots_no_block_all', label: 'Pas de Disallow: / global', points: 3 },
      { id: 'robots_ai_allowed', label: 'Bots IA non bloques (GPTBot, Claudebot)', points: 5 },
    ]
  },
  pageSpeed: {
    weight: 20,
    items: [
      { id: 'speed_score_50', label: 'Performance > 50', points: 5 },
      { id: 'speed_score_80', label: 'Performance > 80', points: 5 },
      { id: 'speed_fcp_ok', label: 'FCP < 3s', points: 5 },
      { id: 'speed_lcp_ok', label: 'LCP < 4s', points: 5 },
    ]
  },
  ssr: {
    weight: 15,
    items: [
      { id: 'ssr_detected', label: 'SSR / Pre-rendering detecte', points: 5 },
      { id: 'ssr_content_visible', label: 'Contenu visible sans JS', points: 5 },
      { id: 'ssr_framework', label: 'Framework SSR identifie', points: 5 },
    ]
  },
  metaTags: {
    weight: 20,
    items: [
      { id: 'meta_title', label: 'Title present', points: 3 },
      { id: 'meta_description', label: 'Meta description presente', points: 3 },
      { id: 'meta_og_title', label: 'og:title present', points: 3 },
      { id: 'meta_og_image', label: 'og:image present', points: 3 },
      { id: 'meta_og_desc', label: 'og:description present', points: 3 },
      { id: 'meta_canonical', label: 'Canonical URL presente', points: 3 },
      { id: 'meta_twitter_card', label: 'Twitter Card presente', points: 2 },
    ]
  },
  schemaOrg: {
    weight: 15,
    items: [
      { id: 'schema_exists', label: 'Schema.org JSON-LD detecte', points: 5 },
      { id: 'schema_org_type', label: 'Type Organization / LocalBusiness', points: 5 },
      { id: 'schema_rich', label: '3+ types Schema.org', points: 5 },
    ]
  },
  aiAccessibility: {
    weight: 15,
    items: [
      { id: 'ai_llmstxt', label: 'llms.txt present', points: 5 },
      { id: 'ai_headings', label: 'Structure H1-H3 coherente', points: 5 },
      { id: 'ai_text_ratio', label: 'Ratio texte/HTML > 15%', points: 5 },
    ]
  }
}

// ─── Callable: run audit ─────────────────────────────────────────────

export const runAiCrawlerAudit = onCall({
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise')

  const { orgId, domain, prospectId } = request.data || {}
  if (!orgId || !domain) throw new HttpsError('invalid-argument', 'orgId et domain requis')

  await verifyOrgMembership(request.auth.uid, orgId)

  const result = await runAudit(domain)

  // Save to Firestore
  const db = getDb()
  const auditRef = db.collection('organizations').doc(orgId).collection('aiCrawlerAudits').doc()
  await auditRef.set({
    ...result,
    domain,
    prospectId: prospectId || null,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Update prospect if provided
  if (prospectId) {
    await db.collection('organizations').doc(orgId).collection('prospects').doc(prospectId).update({
      aiCrawlerScore: result.score,
      aiCrawlerGrade: result.grade,
      aiCrawlerAuditedAt: FieldValue.serverTimestamp(),
    })
  }

  logger.info(`AI Crawler Audit: ${domain} → ${result.score}/100 (${result.grade})`)
  return { success: true, auditId: auditRef.id, ...result }
})

// ─── Core audit function ─────────────────────────────────────────────

export async function runAudit(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  // Run all checks in parallel
  const [robotsResult, htmlResult, speedResult, llmsTxtResult] = await Promise.allSettled([
    checkRobotsTxt(cleanDomain),
    fetchAndAnalyzeHtml(cleanDomain),
    checkPageSpeed(cleanDomain),
    checkLlmsTxt(cleanDomain),
  ])

  const robots = robotsResult.status === 'fulfilled' ? robotsResult.value : {}
  const html = htmlResult.status === 'fulfilled' ? htmlResult.value : {}
  const speed = speedResult.status === 'fulfilled' ? speedResult.value : {}
  const llmsTxt = llmsTxtResult.status === 'fulfilled' ? llmsTxtResult.value : { exists: false }

  // Build checklist results
  const checks = []
  let totalScore = 0

  // Robots.txt checks
  checks.push({ ...find('robots_exists'), passed: !!robots.exists })
  checks.push({ ...find('robots_sitemap'), passed: !!robots.sitemapUrl })
  checks.push({ ...find('robots_no_block_all'), passed: !robots.blocksAll })
  checks.push({ ...find('robots_ai_allowed'), passed: !robots.blocksAiBots })

  // Page speed checks
  const perfScore = speed.performance || 0
  checks.push({ ...find('speed_score_50'), passed: perfScore >= 50 })
  checks.push({ ...find('speed_score_80'), passed: perfScore >= 80 })
  checks.push({ ...find('speed_fcp_ok'), passed: (speed.fcpMs || 9999) < 3000 })
  checks.push({ ...find('speed_lcp_ok'), passed: (speed.lcpMs || 9999) < 4000 })

  // SSR checks
  checks.push({ ...find('ssr_detected'), passed: !!html.isSSR })
  checks.push({ ...find('ssr_content_visible'), passed: !!html.hasVisibleContent })
  checks.push({ ...find('ssr_framework'), passed: !!html.ssrFramework })

  // Meta tags checks
  checks.push({ ...find('meta_title'), passed: !!html.title })
  checks.push({ ...find('meta_description'), passed: !!html.metaDescription })
  checks.push({ ...find('meta_og_title'), passed: !!html.ogTitle })
  checks.push({ ...find('meta_og_image'), passed: !!html.ogImage })
  checks.push({ ...find('meta_og_desc'), passed: !!html.ogDescription })
  checks.push({ ...find('meta_canonical'), passed: !!html.canonical })
  checks.push({ ...find('meta_twitter_card'), passed: !!html.twitterCard })

  // Schema.org checks
  checks.push({ ...find('schema_exists'), passed: html.schemaTypes?.length > 0 })
  checks.push({ ...find('schema_org_type'), passed: html.schemaTypes?.some(t => /Organization|LocalBusiness|Company|Store|Restaurant/i.test(t)) })
  checks.push({ ...find('schema_rich'), passed: (html.schemaTypes?.length || 0) >= 3 })

  // AI Accessibility checks
  checks.push({ ...find('ai_llmstxt'), passed: llmsTxt.exists })
  checks.push({ ...find('ai_headings'), passed: html.hasGoodHeadings })
  checks.push({ ...find('ai_text_ratio'), passed: (html.textRatio || 0) > 15 })

  // Calculate score
  for (const check of checks) {
    if (check.passed) totalScore += check.points
  }

  const score = Math.min(totalScore, 100)
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F'
  const passed = checks.filter(c => c.passed).length
  const failed = checks.filter(c => !c.passed).length

  // Generate recommendations
  const recommendations = checks
    .filter(c => !c.passed)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      label: c.label,
      priority: c.points >= 5 ? 'haute' : 'moyenne',
      impact: `+${c.points} points`,
    }))

  return {
    score,
    grade,
    passed,
    failed,
    total: checks.length,
    checks,
    recommendations,
    details: {
      robots,
      speed: { performance: perfScore, fcpMs: speed.fcpMs, lcpMs: speed.lcpMs, fcpDisplay: speed.fcpDisplay, lcpDisplay: speed.lcpDisplay },
      ssr: { isSSR: html.isSSR, framework: html.ssrFramework, hasVisibleContent: html.hasVisibleContent },
      metaTags: { title: html.title, description: html.metaDescription, ogTitle: html.ogTitle, ogImage: html.ogImage, canonical: html.canonical },
      schemaOrg: { types: html.schemaTypes || [], count: html.schemaTypes?.length || 0 },
      aiAccess: { llmsTxt: llmsTxt.exists, textRatio: html.textRatio, headingStructure: html.hasGoodHeadings },
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function find(id) {
  for (const cat of Object.values(CHECKLIST)) {
    const item = cat.items.find(i => i.id === id)
    if (item) return item
  }
  return { id, label: id, points: 0 }
}

async function checkRobotsTxt(domain) {
  try {
    const response = await fetch(`https://${domain}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    })
    if (!response.ok) return { exists: false, blocksAll: false, blocksAiBots: false, sitemapUrl: null }

    const content = await response.text()
    const sitemapMatch = content.match(/Sitemap:\s*(.+)/i)
    const sitemapUrl = sitemapMatch ? sitemapMatch[1].trim() : null

    // Check if blocks all crawlers
    const blocksAll = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*$/m.test(content)

    // Check if AI bots are blocked
    const aiBotsPattern = /User-agent:\s*(GPTBot|ChatGPT-User|Google-Extended|Claudebot|CCBot|anthropic-ai|Bytespider|Amazonbot)/gi
    const aiBotMatches = [...content.matchAll(aiBotsPattern)]
    let blocksAiBots = false
    for (const match of aiBotMatches) {
      const afterAgent = content.substring(match.index + match[0].length, match.index + match[0].length + 200)
      if (/Disallow:\s*\/\s*$/m.test(afterAgent)) {
        blocksAiBots = true
        break
      }
    }

    // Parse disallow rules
    const disallowRules = [...content.matchAll(/^Disallow:\s*(.+)$/gm)].map(m => m[1].trim())
    const crawlDelayMatch = content.match(/Crawl-delay:\s*(\d+)/i)

    return {
      exists: true,
      sitemapUrl,
      blocksAll,
      blocksAiBots,
      aiBotsMentioned: aiBotMatches.map(m => m[1]),
      disallowCount: disallowRules.length,
      crawlDelay: crawlDelayMatch ? parseInt(crawlDelayMatch[1]) : null,
      stagingDetected: /staging|dev\.|preprod|test\./i.test(content),
    }
  } catch {
    return { exists: false, blocksAll: false, blocksAiBots: false, sitemapUrl: null }
  }
}

async function fetchAndAnalyzeHtml(domain) {
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

    // OG tags
    const ogTitle = /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i.test(html)
    const ogImage = /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i.test(html)
    const ogDescription = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i.test(html)

    // Twitter Card
    const twitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(html)

    // Canonical
    const canonical = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.test(html)

    // Schema.org JSON-LD
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    const schemaTypes = []
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<\/?script[^>]*>/gi, '')
        const parsed = JSON.parse(jsonContent)
        const extractTypes = (obj) => {
          if (obj['@type']) {
            const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']]
            types.forEach(t => { if (!schemaTypes.includes(t)) schemaTypes.push(t) })
          }
          if (obj['@graph'] && Array.isArray(obj['@graph'])) {
            obj['@graph'].forEach(extractTypes)
          }
        }
        extractTypes(parsed)
      } catch { /* malformed JSON-LD */ }
    }

    // SSR detection
    const isNextJS = html.includes('__NEXT_DATA__') || html.includes('/_next/')
    const isNuxt = html.includes('__NUXT__') || html.includes('/_nuxt/')
    const isGatsby = html.includes('___gatsby')
    const isRemix = html.includes('__remixContext')
    const isAstro = html.includes('astro-') || /<astro-island/i.test(html)
    const isSSR = isNextJS || isNuxt || isGatsby || isRemix || isAstro
    const ssrFramework = isNextJS ? 'Next.js' : isNuxt ? 'Nuxt' : isGatsby ? 'Gatsby' : isRemix ? 'Remix' : isAstro ? 'Astro' : null

    // Check if content is visible (not just empty shell)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : ''
    const textContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').trim()
    const hasVisibleContent = textContent.length > 200

    // Text to HTML ratio
    const textRatio = html.length > 0 ? Math.round((textContent.length / html.length) * 100) : 0

    // Heading structure
    const h1Count = (html.match(/<h1[\s>]/gi) || []).length
    const h2Count = (html.match(/<h2[\s>]/gi) || []).length
    const h3Count = (html.match(/<h3[\s>]/gi) || []).length
    const hasGoodHeadings = h1Count === 1 && h2Count >= 1 && h3Count >= 0

    return {
      title, metaDescription, ogTitle, ogImage, ogDescription, twitterCard, canonical,
      schemaTypes, isSSR, ssrFramework, hasVisibleContent, textRatio, hasGoodHeadings,
      headings: { h1: h1Count, h2: h2Count, h3: h3Count },
    }
  } catch {
    return {}
  }
}

async function checkPageSpeed(domain) {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || ''
  const keyParam = apiKey ? `&key=${apiKey}` : ''
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&category=performance${keyParam}`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    const data = await response.json()

    const performance = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100)
    const fcpMs = data.lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || null
    const lcpMs = data.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || null
    const fcpDisplay = data.lighthouseResult?.audits?.['first-contentful-paint']?.displayValue || null
    const lcpDisplay = data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue || null

    return { performance, fcpMs, lcpMs, fcpDisplay, lcpDisplay }
  } catch {
    return { performance: 0, fcpMs: null, lcpMs: null }
  }
}

async function checkLlmsTxt(domain) {
  try {
    const response = await fetch(`https://${domain}/llms.txt`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'FMF-Scanner/1.0 (+https://facemedia.tech)' },
    })
    if (!response.ok) return { exists: false }
    const content = await response.text()
    return { exists: content.length > 10, length: content.length }
  } catch {
    return { exists: false }
  }
}
