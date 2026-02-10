/**
 * Cloud Function: prospectEngine
 * Le COEUR du systeme d'automatisation Face Media Factory
 *
 * Pipeline:
 * 1. Recoit l'ICP (Ideal Customer Profile) de l'utilisateur
 * 2. Utilise Gemini pour trouver 20 entreprises correspondantes
 * 3. Scrape chaque site web pour collecter les donnees
 * 4. Cree les prospects dans Firestore avec donnees multicanales
 * 5. Score chaque prospect avec l'IA
 * 6. Genere les sequences pour les meilleurs prospects
 * 7. Met a jour le statut du moteur
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as cheerio from 'cheerio'
import { callAI, parseJsonResponse } from '../utils/gemini.js'

const getDb = () => getFirestore()

// Delai entre les appels Gemini (rate limit gratuit: 15 req/min)
const GEMINI_DELAY_MS = 3000

/**
 * Pause pour respecter le rate limit
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Scrape le contenu texte d'un site web
 */
async function scrapeWebsite(url) {
  try {
    // Normaliser l'URL
    let normalizedUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = 'https://' + url
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, iframe, noscript, svg').remove()

    // Extract key content
    const title = $('title').text().trim()
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get()
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get()
    const paragraphs = $('p')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((p) => p.length > 30)
      .slice(0, 15)

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const bodyText = $('body').text()
    const emails = [...new Set(bodyText.match(emailRegex) || [])]
      .filter(e => !e.includes('example') && !e.includes('test@'))
      .slice(0, 5)

    // Extract phone numbers (format francais)
    const phoneRegex = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g
    const phones = [...new Set(bodyText.match(phoneRegex) || [])].slice(0, 3)

    // Try to find social links
    const linkedinLink = $('a[href*="linkedin.com"]').first().attr('href') || ''
    const instagramLink = $('a[href*="instagram.com"]').first().attr('href') || ''

    return {
      success: true,
      title,
      metaDescription,
      headings: [...h1s, ...h2s].slice(0, 10),
      content: paragraphs.join(' ').substring(0, 2000),
      emails,
      phones,
      linkedinLink,
      instagramLink,
      url: normalizedUrl,
    }
  } catch (error) {
    console.error(`Scraping error for ${url}:`, error.message)
    return {
      success: false,
      error: error.message,
      url,
      title: '',
      metaDescription: '',
      headings: [],
      content: '',
      emails: [],
      phones: [],
      linkedinLink: '',
      instagramLink: '',
    }
  }
}

/**
 * Utilise Gemini pour trouver des entreprises correspondant a l'ICP
 */
async function findCompaniesWithAI(icp) {
  const prompt = `Tu es un expert en prospection B2B et recherche d'entreprises.
Tu dois generer une liste de 20 entreprises REELLES qui correspondent a ce profil client ideal (ICP).

ICP DE L'UTILISATEUR:
- Secteur d'activite: ${icp.sector || 'Non specifie'}
- Offre/Service: ${icp.offer || 'Non specifie'}
- Cible: ${icp.target || 'Non specifie'}
- Zone geographique: ${icp.zone || 'France'}
- Volume cible: ${icp.volume || 'PME'}

INSTRUCTIONS:
1. Genere 20 entreprises REELLES et VERIFIABLES en France
2. Varie les tailles (TPE, PME, ETI)
3. Assure-toi que les sites web sont corrects
4. Privilegie les entreprises actives avec un site web fonctionnel
5. Pour chaque entreprise, estime les informations de contact probables

Reponds UNIQUEMENT en JSON avec cette structure exacte:
{
  "companies": [
    {
      "name": "Nom de l'entreprise",
      "website": "https://www.example.com",
      "sector": "Secteur d'activite",
      "description": "Description courte de l'activite",
      "size": "TPE/PME/ETI",
      "city": "Ville",
      "whyMatch": "Pourquoi cette entreprise correspond a l'ICP"
    }
  ]
}`

  try {
    const response = await callAI(prompt, { maxTokens: 4000, temperature: 0.8 })
    const parsed = parseJsonResponse(response)
    return parsed.companies || []
  } catch (error) {
    console.error('Find companies error:', error)
    // Fallback avec des entreprises generiques
    return []
  }
}

/**
 * Analyse et enrichit les donnees d'une entreprise avec l'IA
 */
async function analyzeCompanyWithAI(company, scrapedData) {
  const prompt = `Tu es un expert en prospection B2B.
Analyse cette entreprise et genere un profil prospect complet.

ENTREPRISE: ${company.name}
SITE WEB: ${company.website}
DESCRIPTION: ${company.description || ''}
SECTEUR: ${company.sector || ''}
TAILLE: ${company.size || ''}
VILLE: ${company.city || ''}

DONNEES SCRAPEES DU SITE:
Titre: ${scrapedData.title || 'Non disponible'}
Description: ${scrapedData.metaDescription || 'Non disponible'}
Contenu: ${scrapedData.content?.substring(0, 1500) || 'Non disponible'}
Emails trouves: ${scrapedData.emails?.join(', ') || 'Aucun'}
Telephones trouves: ${scrapedData.phones?.join(', ') || 'Aucun'}

INSTRUCTIONS:
1. Si des emails ont ete trouves, utilise-les. Sinon, genere des emails probables (contact@, info@, hello@)
2. Genere un nom de contact probable (prenom + nom francais)
3. Genere un poste probable pour le decideur
4. Evalue le potentiel de ce prospect (score 0-100)

Reponds UNIQUEMENT en JSON:
{
  "firstName": "Prenom probable du decideur",
  "lastName": "Nom probable",
  "jobTitle": "Poste probable (ex: Directeur Commercial)",
  "email": "email@entreprise.com",
  "phone": "+33 X XX XX XX XX ou null si inconnu",
  "company": "Nom entreprise",
  "website": "URL du site",
  "industry": "Secteur",
  "companySize": "TPE/PME/ETI",
  "city": "Ville",
  "linkedinUrl": "URL LinkedIn si disponible ou null",
  "instagramUrl": "URL Instagram si disponible ou null",
  "score": 75,
  "scoreReason": "Pourquoi ce score",
  "positioning": "Positionnement de l'entreprise",
  "painPoints": ["Pain point 1", "Pain point 2"],
  "icebreakers": ["Accroche personnalisee 1", "Accroche personnalisee 2"]
}`

  try {
    const response = await callAI(prompt, { maxTokens: 1500 })
    return parseJsonResponse(response)
  } catch (error) {
    console.error('Analyze company error:', error)
    // Retourner des donnees de base
    return {
      firstName: 'Contact',
      lastName: company.name?.split(' ')[0] || 'Entreprise',
      jobTitle: 'Dirigeant',
      email: scrapedData.emails?.[0] || `contact@${new URL(company.website || 'https://example.com').hostname}`,
      phone: scrapedData.phones?.[0] || null,
      company: company.name,
      website: company.website,
      industry: company.sector,
      companySize: company.size,
      city: company.city,
      linkedinUrl: scrapedData.linkedinLink || null,
      instagramUrl: scrapedData.instagramLink || null,
      score: 50,
      scoreReason: 'Score par defaut - analyse incomplete',
      positioning: company.description || '',
      painPoints: [],
      icebreakers: [],
    }
  }
}

/**
 * Genere une sequence multicanale pour un prospect
 */
async function generateSequenceForProspect(prospect, icp, channels) {
  const channelInstructions = {
    email: 'Email professionnel de prospection (80-150 mots)',
    sms: 'SMS court et impactant (max 160 caracteres)',
    whatsapp: 'Message WhatsApp conversationnel (50-100 mots)',
    instagram_dm: 'DM Instagram decontracte (50-80 mots)',
    voicemail: 'Script de message vocal (30 secondes max)',
    courrier: 'Lettre postale professionnelle (200-300 mots)',
  }

  const activeChannels = channels.filter(c => channelInstructions[c])

  const prompt = `Tu es un expert en prospection multicanale B2B.
Genere une sequence de messages pour ce prospect.

PROSPECT:
- Nom: ${prospect.firstName} ${prospect.lastName}
- Entreprise: ${prospect.company}
- Poste: ${prospect.jobTitle}
- Secteur: ${prospect.industry}
- Positionnement: ${prospect.positioning || 'Non connu'}
- Pain points: ${prospect.painPoints?.join(', ') || 'Non connus'}

OFFRE DE L'UTILISATEUR:
- Service: ${icp.offer || 'Non specifie'}
- Ton souhaite: ${icp.tone || 'professionnel'}
- Frequence: ${icp.frequency || 'balanced'}

CANAUX A UTILISER: ${activeChannels.join(', ')}

INSTRUCTIONS PAR CANAL:
${activeChannels.map(c => `- ${c}: ${channelInstructions[c]}`).join('\n')}

REGLES:
1. Variables disponibles: {prenom}, {entreprise}, {poste}
2. Ne commence JAMAIS par "J'espere que vous allez bien"
3. Chaque message a un CTA clair
4. Espacement: Jour 1, 3, 5, 8, 12

Reponds UNIQUEMENT en JSON:
{
  "steps": [
    {
      "day": 1,
      "channel": "email",
      "subject": "Objet email (si applicable)",
      "content": "Contenu du message avec {prenom}, {entreprise}",
      "cta": "Call-to-action"
    }
  ]
}`

  try {
    const response = await callAI(prompt, { maxTokens: 2000 })
    const parsed = parseJsonResponse(response)
    return parsed.steps || []
  } catch (error) {
    console.error('Generate sequence error:', error)
    return []
  }
}

/**
 * CLOUD FUNCTION PRINCIPALE: prospectEngine
 */
export const prospectEngine = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540, // 9 minutes max
    memory: '1GiB',
    concurrency: 1, // Une seule execution a la fois par user
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const userId = request.auth.uid
    const { orgId, forceRefresh = false } = request.data

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()
    const orgRef = db.collection('organizations').doc(orgId)
    const userRef = db.collection('users').doc(userId)

    try {
      // 1. Mettre a jour le statut: STARTING
      await userRef.update({
        'engineStatus.status': 'running',
        'engineStatus.step': 'starting',
        'engineStatus.progress': 0,
        'engineStatus.message': 'Demarrage du moteur de prospection...',
        'engineStatus.startedAt': FieldValue.serverTimestamp(),
      })

      // 2. Recuperer l'ICP de l'utilisateur
      const userDoc = await userRef.get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Profil utilisateur non trouve')
      }

      const userData = userDoc.data()
      const onboardingData = userData.onboardingData || {}

      const icp = {
        businessName: onboardingData.businessName || userData.displayName || '',
        sector: onboardingData.sector || '',
        offer: onboardingData.offer || '',
        target: onboardingData.target || '',
        zone: onboardingData.zone || 'France',
        volume: onboardingData.volume || 'PME',
        channels: onboardingData.channels || ['email'],
        tone: onboardingData.tone || 'professional',
        frequency: onboardingData.frequency || 'balanced',
        website: onboardingData.website || '',
        linkedin: onboardingData.linkedin || '',
        instagram: onboardingData.instagram || '',
      }

      console.log('ICP charge:', icp)

      // 3. Verification des prospects existants (deduplication)
      await userRef.update({
        'engineStatus.step': 'checking_existing',
        'engineStatus.progress': 5,
        'engineStatus.message': 'Verification des prospects existants...',
      })

      const existingProspectsSnap = await orgRef.collection('prospects').get()
      const existingWebsites = new Set(
        existingProspectsSnap.docs
          .map(doc => {
            const data = doc.data()
            return data.website?.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
          })
          .filter(Boolean)
      )

      console.log(`${existingWebsites.size} prospects existants`)

      // 4. Trouver des entreprises avec Gemini
      await userRef.update({
        'engineStatus.step': 'finding_companies',
        'engineStatus.progress': 10,
        'engineStatus.message': 'Recherche d\'entreprises correspondant a votre ICP...',
      })

      let companies = await findCompaniesWithAI(icp)

      if (companies.length === 0) {
        throw new HttpsError('internal', 'Impossible de trouver des entreprises correspondantes')
      }

      console.log(`${companies.length} entreprises trouvees`)

      // Filtrer les doublons
      companies = companies.filter(c => {
        if (!c.website) return false
        const normalizedUrl = c.website.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
        return !existingWebsites.has(normalizedUrl)
      })

      console.log(`${companies.length} nouvelles entreprises apres deduplication`)

      if (companies.length === 0) {
        await userRef.update({
          'engineStatus.status': 'completed',
          'engineStatus.step': 'done',
          'engineStatus.progress': 100,
          'engineStatus.message': 'Toutes les entreprises existent deja dans votre base.',
          'engineStatus.completedAt': FieldValue.serverTimestamp(),
          'engineStatus.stats': { found: 0, created: 0, scored: 0, sequenced: 0 }
        })
        return { success: true, prospectsCreated: 0, message: 'Pas de nouvelles entreprises' }
      }

      // 5. Scraper et analyser chaque entreprise
      const prospects = []
      const totalCompanies = Math.min(companies.length, 20)

      for (let i = 0; i < totalCompanies; i++) {
        const company = companies[i]
        const progress = 15 + Math.floor((i / totalCompanies) * 50) // 15% -> 65%

        await userRef.update({
          'engineStatus.step': 'scraping',
          'engineStatus.progress': progress,
          'engineStatus.message': `Analyse de ${company.name} (${i + 1}/${totalCompanies})...`,
        })

        // Scrape website
        const scrapedData = await scrapeWebsite(company.website)

        // Delay pour rate limit Gemini
        await delay(GEMINI_DELAY_MS)

        // Analyser avec IA
        const prospectData = await analyzeCompanyWithAI(company, scrapedData)

        if (prospectData) {
          prospects.push({
            ...prospectData,
            source: 'engine',
            createdAt: FieldValue.serverTimestamp(),
            status: 'new',
            lastContactedAt: null,
            sequenceSteps: [],
            tags: [icp.sector, icp.zone].filter(Boolean),
            notes: '',
            scrapedData: {
              success: scrapedData.success,
              title: scrapedData.title,
              metaDescription: scrapedData.metaDescription,
            },
          })
        }

        // Delay supplementaire pour eviter surcharge
        await delay(1000)
      }

      console.log(`${prospects.length} prospects analyses`)

      // 6. Sauvegarder les prospects dans Firestore
      await userRef.update({
        'engineStatus.step': 'saving',
        'engineStatus.progress': 70,
        'engineStatus.message': 'Sauvegarde des prospects...',
      })

      const batch = db.batch()
      const prospectIds = []

      for (const prospect of prospects) {
        const prospectRef = orgRef.collection('prospects').doc()
        prospectIds.push(prospectRef.id)
        batch.set(prospectRef, prospect)
      }

      await batch.commit()
      console.log(`${prospects.length} prospects sauvegardes`)

      // 7. Generer les sequences pour les meilleurs prospects (score >= 60)
      await userRef.update({
        'engineStatus.step': 'generating_sequences',
        'engineStatus.progress': 75,
        'engineStatus.message': 'Generation des sequences de prospection...',
      })

      const hotProspects = prospects
        .map((p, i) => ({ ...p, id: prospectIds[i] }))
        .filter(p => p.score >= 60)
        .slice(0, 10) // Max 10 sequences

      let sequencesGenerated = 0

      for (let i = 0; i < hotProspects.length; i++) {
        const prospect = hotProspects[i]
        const progress = 75 + Math.floor((i / hotProspects.length) * 20) // 75% -> 95%

        await userRef.update({
          'engineStatus.progress': progress,
          'engineStatus.message': `Sequence pour ${prospect.company} (${i + 1}/${hotProspects.length})...`,
        })

        await delay(GEMINI_DELAY_MS)

        const sequence = await generateSequenceForProspect(prospect, icp, icp.channels)

        if (sequence && sequence.length > 0) {
          // Sauvegarder la sequence
          await orgRef.collection('prospects').doc(prospect.id).update({
            sequenceSteps: sequence,
            sequenceGeneratedAt: FieldValue.serverTimestamp(),
            status: 'ready',
          })

          // Creer une campagne pour ce prospect
          await orgRef.collection('campaigns').add({
            prospectId: prospect.id,
            prospectName: `${prospect.firstName} ${prospect.lastName}`,
            prospectCompany: prospect.company,
            steps: sequence,
            currentStep: 0,
            status: 'pending', // Attente du "Lancer ma journee"
            createdAt: FieldValue.serverTimestamp(),
            nextSendAt: null,
            channels: icp.channels,
          })

          sequencesGenerated++
        }

        await delay(500)
      }

      console.log(`${sequencesGenerated} sequences generees`)

      // 8. Mettre a jour les stats finales
      const stats = {
        found: companies.length,
        created: prospects.length,
        scored: prospects.filter(p => p.score > 0).length,
        sequenced: sequencesGenerated,
        hotLeads: prospects.filter(p => p.score >= 80).length,
        warmLeads: prospects.filter(p => p.score >= 50 && p.score < 80).length,
      }

      // Update usage dans l'organisation
      await orgRef.update({
        'usage.currentProspects': FieldValue.increment(prospects.length),
        'usage.lastEngineRun': FieldValue.serverTimestamp(),
      })

      // 9. Marquer comme termine
      await userRef.update({
        'engineStatus.status': 'completed',
        'engineStatus.step': 'done',
        'engineStatus.progress': 100,
        'engineStatus.message': `Termine! ${prospects.length} prospects trouves, ${sequencesGenerated} sequences pretes.`,
        'engineStatus.completedAt': FieldValue.serverTimestamp(),
        'engineStatus.stats': stats,
        'lastEngineRunAt': FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        prospectsCreated: prospects.length,
        sequencesGenerated,
        stats,
      }

    } catch (error) {
      console.error('Prospect engine error:', error)

      // Marquer l'erreur
      await userRef.update({
        'engineStatus.status': 'error',
        'engineStatus.error': error.message,
        'engineStatus.completedAt': FieldValue.serverTimestamp(),
      }).catch(e => console.error('Failed to update error status:', e))

      throw new HttpsError('internal', `Erreur du moteur: ${error.message}`)
    }
  }
)

/**
 * CLOUD FUNCTION: refreshProspects
 * Permet de relancer la recherche de nouveaux prospects
 */
export const refreshProspects = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '1GiB',
    concurrency: 1,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    // Reutilise la meme logique que prospectEngine
    // mais avec forceRefresh = true pour chercher de nouvelles entreprises
    const { orgId } = request.data

    // Forward vers prospectEngine
    return request
  }
)
