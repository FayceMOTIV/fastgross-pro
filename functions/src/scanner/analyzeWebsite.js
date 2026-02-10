import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'

// Get db lazily to avoid initialization order issues
const getDb = () => getFirestore()

/**
 * Cloud Function: scanWebsite
 * Analyse le site web d'un client et génère un profil de prospection
 */
export const scanWebsite = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez être connecté')
    }

    const { url, clientId } = request.data
    if (!url || !clientId) {
      throw new HttpsError('invalid-argument', 'URL et clientId requis')
    }

    try {
      // 1. Scrape the website
      const websiteContent = await scrapeWebsite(url)

      // 2. Analyze with Claude
      const analysis = await analyzeWithClaude(url, websiteContent)

      // 3. Save to Firestore
      const db = getDb()
      const scanRef = await db
        .collection('clients')
        .doc(clientId)
        .collection('scans')
        .add({
          url,
          ...analysis,
          createdAt: FieldValue.serverTimestamp(),
        })

      // Update client status
      await db.collection('clients').doc(clientId).update({
        status: 'scanned',
        lastScanId: scanRef.id,
        lastScanAt: FieldValue.serverTimestamp(),
        positioning: analysis.positioning,
        idealPersona: analysis.idealPersona,
      })

      return { scanId: scanRef.id, ...analysis }
    } catch (error) {
      console.error('Scan error:', error)
      throw new HttpsError('internal', `Erreur lors de l'analyse: ${error.message}`)
    }
  }
)

/**
 * Scrape le contenu texte d'un site web
 */
async function scrapeWebsite(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, iframe, noscript').remove()

    // Extract key content
    const title = $('title').text().trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get()
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get()
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((p) => p.length > 30)
      .slice(0, 20)

    // Get services/pricing if available
    const listItems = $('li')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((li) => li.length > 10 && li.length < 200)
      .slice(0, 15)

    return {
      title,
      metaDescription,
      headings: [...h1s, ...h2s].slice(0, 10),
      content: paragraphs.join('\n'),
      listItems: listItems.join('\n'),
      url,
    }
  } catch (error) {
    console.error('Scraping error:', error)
    return {
      title: '',
      metaDescription: '',
      headings: [],
      content: `Impossible de scraper ${url}. Analyse basée sur l'URL uniquement.`,
      listItems: '',
      url,
    }
  }
}

/**
 * Analyse le contenu avec Claude AI
 */
async function analyzeWithClaude(url, websiteContent) {
  const client = new Anthropic()

  const prompt = `Tu es un expert en stratégie commerciale et en prospection B2B. 
Analyse le contenu de ce site web et génère un profil de prospection complet.

SITE WEB: ${url}
TITRE: ${websiteContent.title}
META DESCRIPTION: ${websiteContent.metaDescription}
TITRES PRINCIPAUX: ${websiteContent.headings?.join(' | ')}
CONTENU: ${websiteContent.content?.substring(0, 3000)}
LISTES/SERVICES: ${websiteContent.listItems?.substring(0, 1000)}

Réponds UNIQUEMENT en JSON avec cette structure exacte:
{
  "positioning": "Description en 2-3 phrases du positionnement de cette entreprise",
  "idealPersona": "Description du client idéal de cette entreprise (secteur, taille, profil décideur)",
  "keyArguments": ["argument 1", "argument 2", "argument 3", "argument 4"],
  "objections": ["objection anticipée 1", "objection 2", "objection 3"],
  "tone": "Le ton recommandé pour prospecter les clients de cette entreprise (expert/amical/challenger)",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3"],
  "suggestedIcebreakers": [
    "Phrase d'accroche email 1 personnalisée",
    "Phrase d'accroche email 2 personnalisée",
    "Phrase d'accroche email 3 personnalisée"
  ],
  "marketInsight": "Un insight sur le marché de cette entreprise utile pour la prospection",
  "competitiveAngle": "L'angle concurrentiel à exploiter dans la prospection"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].text

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse AI response')
  }

  return JSON.parse(jsonMatch[0])
}
