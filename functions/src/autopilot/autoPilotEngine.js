/**
 * AutoPilot Engine - Revolutionary AI-Powered Client Acquisition Machine
 *
 * This is the brain of the AutoPilot system. It:
 * 1. Takes company profile + client avatar
 * 2. Searches and finds ideal prospects 24/7
 * 3. Scores and qualifies them automatically
 * 4. Generates personalized outreach
 * 5. Delivers warm prospects ready to work with you
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { sendEmail as sendEmailViaRouter } from '../email/emailRouter.js'
import { searchProspects as searchCSE } from '../scraping/googleCSE.js'

const getDb = () => getFirestore()

// AI Providers priority
const AI_PROVIDERS = ['groq', 'openrouter', 'gemini']

// ============================================
// Helper: Call AI Provider
// ============================================
async function callAI(prompt, maxTokens = 1000) {
  const providers = [
    {
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile'
    },
    {
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: 'nvidia/nemotron-nano-9b-v2:free'
    },
    {
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      key: process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash'
    }
  ]

  for (const provider of providers) {
    if (!provider.key) continue

    try {
      if (provider.name === 'gemini') {
        const response = await fetch(
          `${provider.url}?key=${provider.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens }
            })
          }
        )
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error.message || 'Gemini API error')
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Empty response from Gemini')
        return text
      } else {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.key}`,
            ...(provider.name === 'openrouter' && {
              'HTTP-Referer': 'https://face-media-factory.web.app',
              'X-Title': 'Face Media Factory'
            })
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
          })
        })
        const data = await response.json()
        if (data.error) {
          throw new Error(data.error.message || `${provider.name} API error`)
        }
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error(`Empty response from ${provider.name}`)
        return content
      }
    } catch (error) {
      console.warn(`AI provider ${provider.name} failed:`, error.message)
      continue
    }
  }

  throw new Error('All AI providers failed')
}

// ============================================
// Helper: Search Google for Prospects
// ============================================
async function searchGoogle(query, apiKey, cxId, num = 10) {
  // Try the CSE wrapper first (has caching, rate limiting, dedup)
  const cseResults = await searchCSE(query, { maxResults: num })
  if (cseResults.length > 0) return cseResults

  // Direct fallback if CSE wrapper returns empty
  if (!apiKey || !cxId) return []

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&num=${num}`
    )
    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Google search error:', error)
    return []
  }
}

// ============================================
// Helper: Extract Emails from Website
// ============================================
async function extractEmailsFromSite(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)' },
      signal: AbortSignal.timeout(5000)
    })
    const html = await response.text()

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [...new Set(html.match(emailRegex) || [])]

    // Filter out common non-prospect emails
    return emails.filter(email =>
      !email.includes('example') &&
      !email.includes('test@') &&
      !email.includes('noreply') &&
      !email.includes('support@') &&
      !email.includes('info@') &&
      !email.includes('contact@')
    ).slice(0, 3)
  } catch {
    return []
  }
}

// ============================================
// Helper: Extract Phone from Website
// ============================================
async function extractPhoneFromSite(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaceMediaBot/1.0)' },
      signal: AbortSignal.timeout(5000)
    })
    const html = await response.text()

    // French phone patterns
    const phoneRegex = /(?:\+33|0033|0)[1-9](?:[\s.-]?\d{2}){4}/g
    const phones = [...new Set(html.match(phoneRegex) || [])]

    return phones[0] || null
  } catch {
    return null
  }
}

// ============================================
// Generate AutoPilot Preview
// ============================================
export const generateAutoPilotPreview = onCall(
  { region: 'europe-west1', memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, companyProfile, clientAvatar } = request.data
    if (!orgId || !companyProfile || !clientAvatar) {
      throw new HttpsError('invalid-argument', 'Missing required data')
    }

    const db = getDb()

    // Get org's Google CSE config
    const configDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('autoPilotConfig')
      .doc('main')
      .get()

    const config = configDoc.exists ? configDoc.data() : {}
    const googleApiKey = config.googleCseApiKey || process.env.GOOGLE_CSE_API_KEY
    const googleCxId = config.googleCseCxId || process.env.GOOGLE_CSE_CX_ID

    // Build search queries based on avatar
    const searchQueries = []
    const { avatarTitle, avatarIndustry, avatarLocation, avatarKeywords } = clientAvatar

    // Combine keywords with location
    if (avatarKeywords && avatarKeywords.length > 0) {
      for (const keyword of avatarKeywords.slice(0, 3)) {
        searchQueries.push(`${keyword} ${avatarLocation || 'France'}`)
      }
    } else {
      searchQueries.push(`${avatarTitle} ${avatarIndustry} ${avatarLocation || 'France'}`)
    }

    // Search for real prospects
    const allResults = []
    for (const query of searchQueries) {
      const results = await searchGoogle(query, googleApiKey, googleCxId, 5)
      allResults.push(...results)
    }

    // Process results and generate AI analysis
    const prospects = []
    const processedDomains = new Set()

    for (const result of allResults.slice(0, 5)) {
      try {
        const url = new URL(result.link)
        const domain = url.hostname.replace(/^www\./, '')

        if (processedDomains.has(domain)) continue
        processedDomains.add(domain)

        // Extract contact info
        const [emails, phone] = await Promise.all([
          extractEmailsFromSite(result.link),
          extractPhoneFromSite(result.link)
        ])

        // Use AI to analyze the prospect
        const aiPrompt = `
Tu es un expert en prospection B2B. Analyse ce prospect potentiel:

ENTREPRISE CIBLE:
- Site: ${result.link}
- Titre: ${result.title}
- Description: ${result.snippet}

MON ENTREPRISE:
- Nom: ${companyProfile.companyName}
- Service: ${companyProfile.mainService}
- Proposition de valeur: ${companyProfile.uniqueValue}
- Resultats typiques: ${companyProfile.typicalResults}

AVATAR CLIENT IDEAL:
- Titre: ${avatarTitle}
- Industrie: ${avatarIndustry}
- Pain points: ${(clientAvatar.avatarPainPoints || []).join(', ')}
- Signaux d'achat: ${(clientAvatar.avatarSignals || []).join(', ')}

Reponds en JSON avec ce format exact:
{
  "matchScore": 85,
  "companyName": "Nom de l'entreprise",
  "painPoints": ["Pain point 1", "Pain point 2"],
  "personalizedHook": "Accroche personnalisee de 2-3 phrases",
  "recommendedChannel": "whatsapp|email|instagram",
  "urgencyLevel": "high|medium|low"
}
`

        let aiAnalysis
        try {
          const aiResponse = await callAI(aiPrompt, 500)
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
          aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch {
          aiAnalysis = {
            matchScore: 70,
            companyName: result.title.split(' - ')[0].split(' | ')[0],
            painPoints: ['Besoin de visibilite', 'Manque de clients'],
            personalizedHook: `Bonjour, j'ai decouvert ${domain} et je pense pouvoir vous aider avec ${companyProfile.mainService}.`,
            recommendedChannel: emails.length > 0 ? 'email' : (phone ? 'whatsapp' : 'instagram'),
            urgencyLevel: 'medium'
          }
        }

        prospects.push({
          id: `preview_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          url: result.link,
          domain,
          name: aiAnalysis?.companyName || result.title.split(' - ')[0],
          emails,
          phone,
          snippet: result.snippet,
          matchScore: aiAnalysis?.matchScore || 70,
          painPoints: aiAnalysis?.painPoints || [],
          personalizedHook: aiAnalysis?.personalizedHook || '',
          recommendedChannel: aiAnalysis?.recommendedChannel || 'email',
          urgencyLevel: aiAnalysis?.urgencyLevel || 'medium',
          status: 'preview'
        })
      } catch (error) {
        console.warn('Error processing result:', error.message)
      }
    }

    // Sort by match score
    prospects.sort((a, b) => b.matchScore - a.matchScore)

    // Generate projections
    const dailyTarget = config.prospectsPerDay || 20
    const avgMatchScore = prospects.length > 0
      ? Math.round(prospects.reduce((sum, p) => sum + p.matchScore, 0) / prospects.length)
      : 75

    const projections = {
      dailyProspects: dailyTarget,
      weeklyProspects: dailyTarget * 5, // Excluding weekends
      monthlyProspects: dailyTarget * 22,
      expectedResponses: Math.round(dailyTarget * 22 * 0.15), // 15% response rate
      expectedMeetings: Math.round(dailyTarget * 22 * 0.05), // 5% meeting rate
      avgMatchScore
    }

    return {
      success: true,
      prospects,
      projections,
      searchQueries
    }
  }
)

// ============================================
// Launch AutoPilot
// ============================================
export const launchAutoPilot = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, companyProfile, clientAvatar, channelSettings } = request.data
    if (!orgId || !companyProfile || !clientAvatar) {
      throw new HttpsError('invalid-argument', 'Missing required data')
    }

    const db = getDb()

    // Verify user belongs to org
    const memberDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('members')
      .doc(request.auth.uid)
      .get()

    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Not a member of this organization')
    }

    // Build keywords from avatar
    const keywords = []
    if (clientAvatar.avatarKeywords) {
      keywords.push(...clientAvatar.avatarKeywords)
    }
    if (clientAvatar.avatarTitle) {
      keywords.push(clientAvatar.avatarTitle)
    }
    if (clientAvatar.avatarIndustry) {
      keywords.push(clientAvatar.avatarIndustry)
    }

    // Save AutoPilot config
    const autoPilotConfig = {
      enabled: true,
      launchedAt: Timestamp.now(),
      launchedBy: request.auth.uid,

      // Company Profile
      companyProfile: {
        name: companyProfile.companyName,
        industry: companyProfile.industry,
        service: companyProfile.mainService,
        uniqueValue: companyProfile.uniqueValue,
        typicalResults: companyProfile.typicalResults,
        priceRange: companyProfile.priceRange,
        caseStudy: companyProfile.caseStudy
      },

      // Client Avatar
      clientAvatar: {
        title: clientAvatar.avatarTitle,
        industry: clientAvatar.avatarIndustry,
        size: clientAvatar.avatarSize,
        painPoints: clientAvatar.avatarPainPoints || [],
        signals: clientAvatar.avatarSignals || [],
        location: clientAvatar.avatarLocation || 'France',
        keywords: clientAvatar.avatarKeywords || []
      },

      // Channel Settings
      channels: {
        whatsapp: channelSettings?.whatsappEnabled ?? true,
        instagram: channelSettings?.instagramEnabled ?? true,
        email: channelSettings?.emailEnabled ?? true,
        linkedin: channelSettings?.linkedinEnabled ?? false
      },

      // Automation Settings
      prospectsPerDay: channelSettings?.prospectsPerDay || 20,
      autoSend: channelSettings?.autoSend ?? false,
      autoRespond: channelSettings?.autoRespond ?? false,

      // Search Config (for dailyAutoPilot)
      keywords: [...new Set(keywords)].slice(0, 10),
      location: clientAvatar.avatarLocation || 'France',
      sector: clientAvatar.avatarIndustry || 'general',

      // Stats
      stats: {
        totalProspects: 0,
        totalContacted: 0,
        totalResponses: 0,
        totalMeetings: 0,
        lastRunAt: null
      }
    }

    await db
      .collection('organizations')
      .doc(orgId)
      .collection('autoPilotConfig')
      .doc('main')
      .set(autoPilotConfig, { merge: true })

    // Also update the old autopilotConfig for backward compatibility with dailyAutoPilot
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('autopilotConfig')
      .doc('settings')
      .set({
        enabled: true,
        keywords: autoPilotConfig.keywords,
        location: autoPilotConfig.location,
        sector: autoPilotConfig.sector,
        emailsPerDay: autoPilotConfig.prospectsPerDay,
        pauseWeekends: true,
        senderName: companyProfile.companyName,
        updatedAt: Timestamp.now()
      }, { merge: true })

    // Log the launch
    await db.collection('organizations').doc(orgId).collection('autoPilotLogs').add({
      type: 'launch',
      message: 'AutoPilot launched successfully',
      config: {
        companyName: companyProfile.companyName,
        avatarTitle: clientAvatar.avatarTitle,
        channels: autoPilotConfig.channels,
        prospectsPerDay: autoPilotConfig.prospectsPerDay
      },
      createdAt: Timestamp.now(),
      createdBy: request.auth.uid
    })

    return {
      success: true,
      message: 'AutoPilot lance avec succes! Les premiers prospects arriveront demain matin.',
      config: autoPilotConfig
    }
  }
)

// ============================================
// Send AutoPilot Message
// ============================================
export const sendAutoPilotMessage = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, prospectId, message, channel } = request.data
    if (!orgId || !prospectId || !message) {
      throw new HttpsError('invalid-argument', 'Missing required data')
    }

    const db = getDb()

    // Get prospect
    const prospectDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .doc(prospectId)
      .get()

    if (!prospectDoc.exists) {
      throw new HttpsError('not-found', 'Prospect not found')
    }

    const prospect = prospectDoc.data()
    const effectiveChannel = channel || prospect.recommendedChannel || 'email'

    // Send via appropriate channel
    let result
    try {
      switch (effectiveChannel) {
        case 'whatsapp':
          if (!prospect.phone) {
            throw new Error('No phone number for WhatsApp')
          }
          // Call WhatsApp sender
          const evolutionUrl = process.env.EVOLUTION_API_URL
          const evolutionKey = process.env.EVOLUTION_API_KEY
          const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'facemedia'

          if (evolutionUrl && evolutionKey) {
            const response = await fetch(
              `${evolutionUrl}/message/sendText/${instanceName}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': evolutionKey
                },
                body: JSON.stringify({
                  number: prospect.phone.replace(/\D/g, ''),
                  text: message
                })
              }
            )
            result = await response.json()
          }
          break

        case 'email':
          if (!prospect.emails || prospect.emails.length === 0) {
            throw new Error('No email address')
          }
          // Send via emailRouter (Resend → SMTP fallback)
          const emailResult = await sendEmailViaRouter({
            to: prospect.emails[0],
            subject: `${prospect.businessName || prospect.name} - Collaboration`,
            html: formatProspectEmailHtml(message, prospect),
            text: message,
            orgId,
            prospectId
          })
          result = { sent: true, email: prospect.emails[0], provider: emailResult.provider, messageId: emailResult.messageId }
          break

        case 'instagram':
          // Instagram DM via existing infrastructure
          result = { queued: true, note: 'Instagram DM queued' }
          break

        default:
          throw new Error(`Unknown channel: ${effectiveChannel}`)
      }
    } catch (error) {
      throw new HttpsError('internal', `Failed to send message: ${error.message}`)
    }

    // Record conversation
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .doc(prospectId)
      .collection('conversations')
      .add({
        type: 'outbound',
        channel: effectiveChannel,
        message,
        sentAt: Timestamp.now(),
        sentBy: request.auth.uid,
        result
      })

    // Update prospect status
    await prospectDoc.ref.update({
      lastContactedAt: Timestamp.now(),
      lastContactChannel: effectiveChannel,
      status: 'contacted',
      updatedAt: Timestamp.now()
    })

    return { success: true, channel: effectiveChannel, result }
  }
)

// ============================================
// Helper: Format Prospect Email HTML
// ============================================
function formatProspectEmailHtml(message, prospect) {
  const paragraphs = message
    .split('\n')
    .filter((p) => p.trim())
    .map((p) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${paragraphs}
</body>
</html>`
}

// ============================================
// Schedule Meeting with Prospect
// ============================================
export const scheduleMeetingWithProspect = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, prospectId, meetingDate, meetingType, notes } = request.data
    if (!orgId || !prospectId) {
      throw new HttpsError('invalid-argument', 'Missing required data')
    }

    const db = getDb()

    // Get prospect
    const prospectDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .doc(prospectId)
      .get()

    if (!prospectDoc.exists) {
      throw new HttpsError('not-found', 'Prospect not found')
    }

    const prospect = prospectDoc.data()

    // Create meeting record
    const meeting = {
      prospectId,
      prospectName: prospect.name || prospect.contactName,
      prospectCompany: prospect.domain,
      prospectEmail: prospect.emails?.[0],
      prospectPhone: prospect.phone,

      scheduledAt: meetingDate ? Timestamp.fromDate(new Date(meetingDate)) : null,
      type: meetingType || 'discovery',
      status: 'scheduled',
      notes: notes || '',

      createdAt: Timestamp.now(),
      createdBy: request.auth.uid
    }

    const meetingRef = await db
      .collection('organizations')
      .doc(orgId)
      .collection('meetings')
      .add(meeting)

    // Update prospect
    await prospectDoc.ref.update({
      status: 'meeting_scheduled',
      meetingId: meetingRef.id,
      meetingScheduledAt: meeting.scheduledAt,
      updatedAt: Timestamp.now()
    })

    // Update AutoPilot stats
    const configRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('autoPilotConfig')
      .doc('main')

    await configRef.update({
      'stats.totalMeetings': FieldValue.increment(1)
    })

    // Send confirmation message if contact info available
    if (prospect.phone || (prospect.emails && prospect.emails.length > 0)) {
      const confirmationMessage = `Bonjour ${prospect.contactName || ''},

Merci pour votre interet! Je vous confirme notre rendez-vous${meetingDate ? ` le ${new Date(meetingDate).toLocaleDateString('fr-FR')}` : ''}.

${meetingType === 'call' ? 'Je vous appellerai au numero indique.' : 'Vous recevrez un lien de visio par email.'}

A bientot!`

      // Queue confirmation (don't wait)
      db.collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)
        .collection('conversations')
        .add({
          type: 'outbound',
          channel: prospect.phone ? 'whatsapp' : 'email',
          message: confirmationMessage,
          isConfirmation: true,
          sentAt: Timestamp.now(),
          sentBy: request.auth.uid
        })
    }

    return {
      success: true,
      meetingId: meetingRef.id,
      meeting
    }
  }
)

// ============================================
// Get AutoPilot Dashboard Stats
// ============================================
export const getAutoPilotDashboardStats = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId } = request.data
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'Missing orgId')
    }

    const db = getDb()

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get today's prospects
    const prospectsSnapshot = await db
      .collection('organizations')
      .doc(orgId)
      .collection('prospects')
      .where('createdAt', '>=', Timestamp.fromDate(today))
      .where('createdAt', '<', Timestamp.fromDate(tomorrow))
      .get()

    const prospects = prospectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Calculate stats
    const stats = {
      todayProspects: prospects.length,
      totalContacted: prospects.filter(p => p.status === 'contacted').length,
      positiveResponses: prospects.filter(p => p.responseType === 'positive').length,
      meetingsScheduled: prospects.filter(p => p.status === 'meeting_scheduled').length,
      conversionRate: prospects.length > 0
        ? Math.round((prospects.filter(p => p.responseType === 'positive').length / prospects.length) * 100)
        : 0
    }

    // Get hot prospects (positive responses not yet converted to meeting)
    const hotProspects = prospects
      .filter(p => p.responseType === 'positive' && p.status !== 'meeting_scheduled')
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 10)

    // Get recent conversations
    const conversationsQuery = await db
      .collectionGroup('conversations')
      .where('sentAt', '>=', Timestamp.fromDate(today))
      .orderBy('sentAt', 'desc')
      .limit(20)
      .get()

    const conversations = conversationsQuery.docs.map(doc => ({
      id: doc.id,
      prospectId: doc.ref.parent.parent.id,
      ...doc.data()
    }))

    // Get config
    const configDoc = await db
      .collection('organizations')
      .doc(orgId)
      .collection('autoPilotConfig')
      .doc('main')
      .get()

    const config = configDoc.exists ? configDoc.data() : null

    // Generate AI insight
    let aiInsight = null
    if (prospects.length > 0) {
      const avgScore = Math.round(
        prospects.reduce((sum, p) => sum + (p.matchScore || 70), 0) / prospects.length
      )

      if (stats.positiveResponses > 0) {
        aiInsight = {
          type: 'success',
          message: `Excellent! ${stats.positiveResponses} prospects ont repondu positivement aujourd'hui. Score moyen: ${avgScore}/100.`,
          recommendation: 'Planifiez des meetings rapidement pour maintenir l\'elan.'
        }
      } else if (stats.totalContacted > 0) {
        aiInsight = {
          type: 'info',
          message: `${stats.totalContacted} prospects contactes. En attente de reponses.`,
          recommendation: 'Les reponses arrivent generalement dans les 24-48h.'
        }
      } else {
        aiInsight = {
          type: 'action',
          message: `${stats.todayProspects} nouveaux prospects prets a etre contactes.`,
          recommendation: 'Commencez par les prospects avec le score le plus eleve.'
        }
      }
    }

    return {
      success: true,
      stats,
      hotProspects,
      conversations,
      config,
      aiInsight,
      isActive: config?.enabled ?? false
    }
  }
)

// ============================================
// Pause/Resume AutoPilot
// ============================================
export const toggleAutoPilot = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const { orgId, enabled } = request.data
    if (!orgId || typeof enabled !== 'boolean') {
      throw new HttpsError('invalid-argument', 'Missing required data')
    }

    const db = getDb()

    // Update both config locations
    await Promise.all([
      db
        .collection('organizations')
        .doc(orgId)
        .collection('autoPilotConfig')
        .doc('main')
        .update({ enabled, updatedAt: Timestamp.now() }),
      db
        .collection('organizations')
        .doc(orgId)
        .collection('autopilotConfig')
        .doc('settings')
        .update({ enabled, updatedAt: Timestamp.now() })
    ])

    // Log the change
    await db
      .collection('organizations')
      .doc(orgId)
      .collection('autoPilotLogs')
      .add({
        type: enabled ? 'resume' : 'pause',
        message: enabled ? 'AutoPilot resumed' : 'AutoPilot paused',
        createdAt: Timestamp.now(),
        createdBy: request.auth.uid
      })

    return { success: true, enabled }
  }
)
