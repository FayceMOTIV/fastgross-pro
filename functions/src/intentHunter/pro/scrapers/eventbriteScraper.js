/**
 * Eventbrite Scraper — Intent Hunter Pro
 *
 * Searches Eventbrite API for B2B events and extracts attendee/organizer
 * data as leads. People attending business events have high buying intent
 * for professional tools and services.
 *
 * Auth: EVENTBRITE_API_KEY
 * Rate limit: 20 req/min
 * API: https://www.eventbriteapi.com/v3/
 *
 * @module intentHunter/pro/scrapers/eventbriteScraper
 */

import axios from 'axios'

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY || ''
const BASE_URL = 'https://www.eventbriteapi.com/v3'

const RATE_LIMIT_MS = 3000 // ~20 req/min

/** B2B event categories on Eventbrite */
const B2B_CATEGORY_IDS = [
  '101', // Business & Professional
  '102', // Science & Technology
  '199'  // Other (often includes B2B meetups)
]

/** B2B event format IDs */
const B2B_FORMAT_IDS = [
  '1',  // Conference
  '2',  // Seminar
  '3',  // Expo
  '4',  // Convention
  '9',  // Networking
  '12'  // Rally
]

/**
 * Sleep with jitter to avoid thundering herd
 * @param {number} baseMs - Base delay in ms
 * @returns {Promise<void>}
 */
const sleepWithJitter = (baseMs) => {
  const jitter = Math.floor(Math.random() * baseMs * 0.3)
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter))
}

/** Intent patterns in event descriptions */
const INTENT_PATTERNS = [
  'networking', 'mise en relation', 'rencontre', 'afterwork',
  'masterclass', 'atelier', 'workshop', 'formation',
  'conference', 'sommet', 'summit', 'pitch',
  'startup', 'entrepreneur', 'business', 'b2b'
]

const URGENCY_PATTERNS = [
  'places limitees', 'derniers jours', 'bientot complet',
  'limited spots', 'selling fast', 'last chance'
]

/**
 * Search Eventbrite for B2B events matching keywords
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @param {string} [options.location] - Location filter
 * @param {number} [options.pageSize] - Results per page
 * @returns {Promise<Array>} Event objects
 */
const searchEvents = async (query, options = {}) => {
  const params = {
    q: query,
    'location.address': options.location || 'France',
    'categories': B2B_CATEGORY_IDS.join(','),
    'start_date.keyword': 'this_month',
    'sort_by': 'date',
    'expand': 'organizer,venue',
    'page_size': options.pageSize || 20
  }

  const response = await axios.get(`${BASE_URL}/events/search/`, {
    params,
    headers: { Authorization: `Bearer ${EVENTBRITE_API_KEY}` },
    timeout: 15000
  })

  return response.data?.events || []
}

/**
 * Get event attendees (requires organizer access, graceful fallback)
 * @param {string} eventId - Eventbrite event ID
 * @returns {Promise<Array>} Attendee objects
 */
const getEventAttendees = async (eventId) => {
  try {
    const response = await axios.get(`${BASE_URL}/events/${eventId}/attendees/`, {
      params: { status: 'attending' },
      headers: { Authorization: `Bearer ${EVENTBRITE_API_KEY}` },
      timeout: 10000
    })
    return response.data?.attendees || []
  } catch (err) {
    // 403 is expected — we only get attendees for events we organize
    if (err.response?.status === 403 || err.response?.status === 401) {
      return []
    }
    throw err
  }
}

/**
 * Analyze B2B intent from event data
 * @param {string} text - Event name + description
 * @param {Array<string>} keywords - Client keywords
 * @returns {{ matchCount: number, urgency: boolean, signal: string }}
 */
const analyzeEventIntent = (text, keywords) => {
  const lower = (text || '').toLowerCase()
  const matchedKeywords = keywords.filter((kw) => lower.includes(kw.toLowerCase()))
  const matchedPatterns = INTENT_PATTERNS.filter((p) => lower.includes(p))
  const urgency = URGENCY_PATTERNS.some((p) => lower.includes(p))

  const parts = []
  if (matchedPatterns.length > 0) parts.push(`Event B2B: ${matchedPatterns.slice(0, 3).join(', ')}`)
  if (matchedKeywords.length > 0) parts.push(`Mots-cles: ${matchedKeywords.join(', ')}`)
  if (urgency) parts.push('[PLACES LIMITEES]')

  return {
    matchCount: matchedKeywords.length + matchedPatterns.length,
    urgency,
    signal: parts.join(' — ') || 'Evenement B2B detecte'
  }
}

/**
 * Scrape Eventbrite for B2B events and attendees
 * @param {object} config - Scraper configuration
 * @param {string} config.clientId - Organization ID
 * @param {Array<string>} config.keywords - Keywords to search
 * @param {number} [config.maxResults=50] - Max total results
 * @param {string} [config.location] - Location filter (e.g., "Paris, France")
 * @param {number} [config.maxEvents=15] - Max events to scan for attendees
 * @returns {Promise<Array>} Standardized leads with eventSource: true
 */
export const scrape = async (config) => {
  const {
    clientId,
    keywords = [],
    maxResults = 50,
    location = 'France',
    maxEvents = 15
  } = config
  const leads = []

  console.log(JSON.stringify({
    event: 'eventbrite_scraper_start',
    clientId,
    keywords,
    maxResults,
    location,
    maxEvents,
    timestamp: Date.now()
  }))

  if (!EVENTBRITE_API_KEY) {
    console.log(JSON.stringify({
      event: 'eventbrite_scraper_skip',
      reason: 'Missing EVENTBRITE_API_KEY',
      timestamp: Date.now()
    }))
    return []
  }

  try {
    const query = keywords.join(' ')
    const events = await searchEvents(query, { location, pageSize: Math.min(maxEvents * 2, 50) })
    const eventsToScan = events.slice(0, maxEvents)

    await sleepWithJitter(RATE_LIMIT_MS)

    for (const evt of eventsToScan) {
      if (leads.length >= maxResults) break

      try {
        const eventName = evt.name?.text || evt.name?.html || ''
        const eventDesc = evt.description?.text || evt.summary || ''
        const fullText = `${eventName} ${eventDesc}`
        const intent = analyzeEventIntent(fullText, keywords)

        if (intent.matchCount === 0) continue

        // First, create a lead from the organizer (always available)
        const organizer = evt.organizer || {}
        if (organizer.name) {
          leads.push({
            source: 'eventbrite_organizer',
            sourceUrl: evt.url || `https://www.eventbrite.com/e/${evt.id}`,
            sourcePublicStatement: `Organisateur: ${organizer.name} — ${eventName}`.slice(0, 500),
            platform: 'eventbrite',
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            company: organizer.name || null,
            linkedinUrl: null,
            nativeContactId: organizer.id || null,
            intentSignal: `Organisateur B2B — ${intent.signal}`,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: intent.urgency,
            budgetMentioned: false,
            eventSource: true,
            postedAt: evt.start?.utc
              ? new Date(evt.start.utc).getTime()
              : Date.now(),
            rawData: {
              eventId: evt.id,
              eventName,
              eventDate: evt.start?.utc || null,
              eventEndDate: evt.end?.utc || null,
              venue: evt.venue?.name || evt.venue?.address?.city || null,
              organizerId: organizer.id,
              organizerUrl: organizer.url || null,
              isOnline: evt.online_event || false,
              isFree: evt.is_free || false,
              capacity: evt.capacity || null
            }
          })
        }

        if (leads.length >= maxResults) break

        // Try to get attendees (will gracefully fail with 403 for events we don't own)
        const attendees = await getEventAttendees(evt.id)
        await sleepWithJitter(RATE_LIMIT_MS)

        for (const attendee of attendees) {
          if (leads.length >= maxResults) break

          const profile = attendee.profile || {}
          const firstName = profile.first_name || null
          const lastName = profile.last_name || null
          const email = profile.email || null
          const company = profile.company || profile.job_title || null

          leads.push({
            source: 'eventbrite_attendee',
            sourceUrl: evt.url || `https://www.eventbrite.com/e/${evt.id}`,
            sourcePublicStatement: `Participant: ${eventName}`.slice(0, 500),
            platform: 'eventbrite',
            firstName,
            lastName,
            email,
            phone: profile.cell_phone || null,
            company,
            linkedinUrl: null,
            nativeContactId: attendee.id || email || null,
            intentSignal: `Participant event B2B — ${intent.signal}`,
            intentKeywordsCount: intent.matchCount,
            urgencyDetected: false,
            budgetMentioned: false,
            eventSource: true,
            postedAt: attendee.created
              ? new Date(attendee.created).getTime()
              : Date.now(),
            rawData: {
              eventId: evt.id,
              eventName,
              eventDate: evt.start?.utc || null,
              attendeeId: attendee.id,
              ticketClass: attendee.ticket_class_name || null,
              jobTitle: profile.job_title || null,
              status: attendee.status || 'attending'
            }
          })
        }

        await sleepWithJitter(RATE_LIMIT_MS)
      } catch (eventError) {
        console.log(JSON.stringify({
          event: 'eventbrite_scraper_event_error',
          eventId: evt.id,
          error: eventError.message,
          timestamp: Date.now()
        }))
      }
    }

    console.log(JSON.stringify({
      event: 'eventbrite_scraper_complete',
      clientId,
      leadsFound: leads.length,
      eventsScanned: eventsToScan.length,
      timestamp: Date.now()
    }))

    return leads
  } catch (error) {
    console.log(JSON.stringify({
      event: 'eventbrite_scraper_fatal_error',
      clientId,
      error: error.message,
      status: error.response?.status || null,
      timestamp: Date.now()
    }))
    return []
  }
}
