/**
 * LinkedIn Events Scraper — Intent Hunter Pro
 *
 * Scrapes LinkedIn event attendees via Apify. People who attend
 * B2B LinkedIn events are highly engaged professionals with
 * specific business interests — ideal prospects.
 *
 * Auth: APIFY_API_TOKEN
 * Rate limit: 5 req/min
 *
 * @module intentHunter/pro/scrapers/linkedinEventsScraper
 */

import axios from 'axios'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || ''
const ACTOR_ID = 'apify~linkedin-event-scraper'

const RATE_LIMIT_MS = 12000 // ~5 req/min

/**
 * Sleep with jitter to avoid thundering herd
 * @param {number} baseMs - Base delay in ms
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/**
 * Run an Apify actor and wait for results
 * @param {string} actorId - Apify actor ID
 * @param {object} input - Actor input payload
 * @returns {Promise<Array>} Dataset items
 */
const runActor = async (actorId, input) => {
  const response = await axios.post(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
    input,
    { timeout: 120000 }
  )
  const runId = response.data?.data?.id
  if (!runId) throw new Error('No run ID returned')

  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    )
    if (statusRes.data?.data?.status === 'SUCCEEDED') {
      const datasetId = statusRes.data?.data?.defaultDatasetId
      const itemsRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
      )
      return itemsRes.data || []
    }
    if (statusRes.data?.data?.status === 'FAILED') throw new Error('Actor run failed')
  }
  throw new Error('Actor run timeout')
}

/** B2B event types on LinkedIn */
const EVENT_TYPES = [
  'webinar', 'webinaire', 'conference', 'networking',
  'meetup', 'masterclass', 'atelier', 'workshop',
  'sommet', 'summit', 'salon', 'forum'
]

/** Job title patterns that indicate decision-making authority */
const DECISION_MAKER_TITLES = [
  'ceo', 'cto', 'cfo', 'cmo', 'coo', 'cro',
  'directeur', 'director', 'vp', 'vice president',
  'founder', 'fondateur', 'co-founder', 'co-fondateur',
  'gerant', 'president', 'head of', 'responsable',
  'manager', 'chef de', 'lead'
]

/**
 * Analyze attendee relevance to client keywords
 * @param {object} attendee - Attendee profile data
 * @param {Array<string>} keywords - Client keywords
 * @param {string} eventContext - Event name/description for context
 * @returns {{ matchCount: number, isDecisionMaker: boolean, signal: string }}
 */
const analyzeAttendeeIntent = (attendee, keywords, eventContext) => {
  const profileText = [
    attendee.headline || attendee.title || '',
    attendee.company || attendee.companyName || '',
    attendee.description || '',
    eventContext
  ].join(' ').toLowerCase()

  const matchedKeywords = keywords.filter((kw) => profileText.includes(kw.toLowerCase()))

  const headline = (attendee.headline || attendee.title || '').toLowerCase()
  const isDecisionMaker = DECISION_MAKER_TITLES.some((t) => headline.includes(t))

  const parts = []
  if (isDecisionMaker) parts.push('Decision-maker detecte')
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)
  parts.push(`Event LinkedIn: ${eventContext.slice(0, 100)}`)

  return {
    matchCount: matchedKeywords.length + (isDecisionMaker ? 1 : 0),
    isDecisionMaker,
    signal: parts.join(' — ')
  }
}

/**
 * Analyze event relevance to keywords
 * @param {string} text - Event name + description
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, isB2B: boolean, signal: string }}
 */
const analyzeEventRelevance = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedTypes = EVENT_TYPES.filter((t) => lower.includes(t))

  const isB2B = matchedTypes.length > 0 || matchedKeywords.length > 0

  return {
    matchCount: matchedKeywords.length + matchedTypes.length,
    isB2B,
    signal: matchedKeywords.length > 0
      ? `Event B2B: ${matchedKeywords.join(', ')}`
      : matchedTypes.length > 0
        ? `Event: ${matchedTypes.join(', ')}`
        : ''
  }
}

/**
 * Extract name parts from full name
 * @param {string} fullName
 * @returns {{ firstName: string|null, lastName: string|null }}
 */
const parseName = (fullName) => {
  if (!fullName) return { firstName: null, lastName: null }
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null
  }
}

/**
 * Scrape LinkedIn event attendees for B2B intent
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search events
 * @param {number} [config.maxResults=50] - Max total results
 * @param {Array<string>} [config.eventUrls] - Specific LinkedIn event URLs to scrape
 * @param {number} [config.maxEvents=5] - Max events to scan when searching
 * @returns {Promise<Array>} Standardized leads with eventAttendee: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    eventUrls = [],
    maxEvents = 5
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'linkedin_events_scraper_start',
    clientId,
    keywords,
    maxResults,
    eventUrlsCount: eventUrls.length,
    maxEvents,
    timestamp: Date.now()
  }))

  if (!APIFY_TOKEN) {
    console.log(JSON.stringify({
      event: 'linkedin_events_scraper_skip',
      reason: 'Missing APIFY_API_TOKEN',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    let allItems = []

    if (eventUrls.length > 0) {
      // Scrape specific event URLs provided by the user
      const items = await runActor(ACTOR_ID, {
        startUrls: eventUrls.map((url) => ({ url })),
        maxItems: Math.min(maxResults * 2, 100),
        scrapeAttendees: true
      })
      allItems = items
      await sleepWithJitter(RATE_LIMIT_MS)
    } else {
      // Search for events by keywords, then scrape attendees
      const searchQuery = keywords.join(' ')
      const items = await runActor(ACTOR_ID, {
        searchKeyword: searchQuery,
        maxItems: Math.min(maxResults * 2, 100),
        maxEvents,
        scrapeAttendees: true
      })
      allItems = items
      await sleepWithJitter(RATE_LIMIT_MS)
    }

    // Items can be either events with attendees nested, or flat attendee profiles
    for (const item of allItems) {
      if (leads.length >= maxResults) break

      try {
        // Case 1: Item is an event with attendees array
        if (item.attendees && Array.isArray(item.attendees)) {
          const eventName = item.eventName || item.name || item.title || ''
          const eventDesc = item.description || ''
          const eventText = `${eventName} ${eventDesc}`
          const eventRelevance = analyzeEventRelevance(eventText, keywords)

          if (!eventRelevance.isB2B && eventRelevance.matchCount === 0) continue

          for (const attendee of item.attendees) {
            if (leads.length >= maxResults) break

            try {
              const intent = analyzeAttendeeIntent(attendee, keywords, eventName)
              if (intent.matchCount === 0) continue

              const name = parseName(attendee.name || attendee.fullName || null)

              leads.push({
                source: 'linkedin_event',
                sourceUrl: item.eventUrl || item.url || 'https://www.linkedin.com/events/',
                sourcePublicStatement: `Participant: ${eventName} — ${attendee.headline || ''}`.slice(0, 500),
                platform: 'linkedin',
                firstName: attendee.firstName || name.firstName,
                lastName: attendee.lastName || name.lastName,
                email: null,
                phone: null,
                company: attendee.company || attendee.companyName || null,
                linkedinUrl: attendee.profileUrl || attendee.linkedinUrl || null,
                nativeContactId: attendee.profileId || attendee.profileUrl || null,
                intentSignal: intent.signal,
                intentKeywordsCount: intent.matchCount,
                urgencyDetected: false,
                budgetMentioned: false,
                eventAttendee: true,
                isDecisionMaker: intent.isDecisionMaker,
                postedAt: item.eventDate
                  ? new Date(item.eventDate).getTime()
                  : Date.now(),
                rawData: {
                  eventName,
                  eventDate: item.eventDate || item.date || null,
                  eventUrl: item.eventUrl || item.url || null,
                  attendeeHeadline: attendee.headline || attendee.title || null,
                  attendeeLocation: attendee.location || null,
                  attendeeConnections: attendee.connections || null,
                  eventOrganizer: item.organizer || item.organizerName || null,
                  eventAttendeeCount: item.attendeeCount || item.attendees?.length || null
                }
              })
            } catch (attendeeError) {
              console.log(JSON.stringify({
                event: 'linkedin_events_scraper_attendee_error',
                error: attendeeError.message,
                timestamp: Date.now()
              }))
            }
          }
        } else {
          // Case 2: Item is a flat attendee/profile with event context
          const eventName = item.eventName || item.event?.name || ''
          const intent = analyzeAttendeeIntent(item, keywords, eventName)

          if (intent.matchCount === 0) continue

          const name = parseName(item.name || item.fullName || null)

          leads.push({
            source: 'linkedin_event',
            sourceUrl: item.eventUrl || item.event?.url || 'https://www.linkedin.com/events/',
            sourcePublicStatement: `Participant: ${eventName} — ${item.headline || ''}`.slice(0, 500),
            platform: 'linkedin',
            firstName: item.firstName || name.firstName,
            lastName: item.lastName || name.lastName,
            email: null,
            phone: null,
            company: item.company || item.companyName || null,
            linkedinUrl: item.profileUrl || item.linkedinUrl || null,
            nativeContactId: item.profileId || item.profileUrl || null,
            intentSignal: intent.signal,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: false,
            budgetMentioned: false,
            eventAttendee: true,
            isDecisionMaker: intent.isDecisionMaker,
            postedAt: item.eventDate
              ? new Date(item.eventDate).getTime()
              : item.event?.date
                ? new Date(item.event.date).getTime()
                : Date.now(),
            rawData: {
              eventName,
              eventDate: item.eventDate || item.event?.date || null,
              eventUrl: item.eventUrl || item.event?.url || null,
              attendeeHeadline: item.headline || item.title || null,
              attendeeLocation: item.location || null,
              attendeeConnections: item.connections || null,
              profileId: item.profileId || null
            }
          })
        }
      } catch (itemError) {
        console.log(JSON.stringify({
          event: 'linkedin_events_scraper_item_error',
          error: itemError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'linkedin_events_scraper_complete',
      clientId,
      leadsFound: leads.length,
      rawItemsReceived: allItems.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'linkedin_events_scraper_fatal_error',
      clientId,
      error: error.message,
      timestamp: Date.now()
    }))
    return []
  }
}
