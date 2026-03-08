/**
 * Conference Speakers Scanner — Signals Intelligence Layer
 * Discovers high-value leads from conference speaker lists.
 * Sources: Eventbrite API (French business events) + salons-online.com RSS
 *
 * Usage:
 *   scanConferenceSpeakers() -> saves to Firestore conferenceLeads collection
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

const EVENTBRITE_API = 'https://www.eventbriteapi.com/v3'
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN || ''
const SALONS_RSS_URL = 'https://www.salons-online.com/rss/salons-france.xml'

// French business event keyword patterns
const BUSINESS_EVENT_KEYWORDS = [
  'business',
  'entreprise',
  'entrepreneur',
  'startup',
  'marketing',
  'digital',
  'commerce',
  'vente',
  'b2b',
  'saas',
  'tech',
  'innovation',
  'croissance',
  'growth',
  'prospection',
  'relation client',
  'transformation',
  'management',
  'leadership',
  'conference',
  'sommet',
  'forum',
]

/**
 * Check if an event title/description suggests a French business event
 * @param {string} title - Event title
 * @returns {boolean}
 */
export function isFrenchBusinessEvent(title) {
  if (!title) return false
  const lower = title.toLowerCase()
  return BUSINESS_EVENT_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Format a date string to ISO date
 * @param {string} dateStr - Date string from API
 * @returns {string} ISO date string or original
 */
export function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toISOString()
  } catch {
    return dateStr
  }
}

/**
 * Extract speaker info from structured event content (description HTML)
 * Looks for patterns like "Speaker: Name - Company" or speaker list sections
 *
 * @param {string} structuredContent - HTML or plain text event description
 * @returns {Array} Extracted speakers [{name, company, role, source}]
 */
export function extractSpeakers(structuredContent) {
  if (!structuredContent) return []

  const speakers = []
  const text = typeof structuredContent === 'string' ? structuredContent : ''

  // Strip HTML tags for pattern matching
  const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  // Pattern 1: "Speaker: Nom Prenom - Societe" or "Intervenant: ..."
  const speakerPattern = /(?:speaker|intervenant|conf[eé]rencier|orateur|anim[eé] par)\s*[:—-]\s*([^,\n]+?)(?:\s*[-–—]\s*([^,\n]+))?(?:[,\n]|$)/gi
  let match
  while ((match = speakerPattern.exec(plainText)) !== null) {
    const name = (match[1] || '').trim()
    const company = (match[2] || '').trim()
    if (name && name.length > 2 && name.length < 60) {
      speakers.push({
        name,
        company: company || null,
        role: null,
        source: 'event_description',
      })
    }
  }

  // Pattern 2: "Prenom Nom, Role chez/at Company"
  const rolePattern = /([A-Z][a-zé]+ [A-Z][a-zé]+)\s*,\s*([\w\s]+?)\s+(?:chez|at|de|@)\s+([\w\s.]+)/g
  while ((match = rolePattern.exec(plainText)) !== null) {
    const name = (match[1] || '').trim()
    const role = (match[2] || '').trim()
    const company = (match[3] || '').trim()
    if (name && name.length > 2) {
      // Avoid duplicates
      const alreadyAdded = speakers.some((s) => s.name === name)
      if (!alreadyAdded) {
        speakers.push({
          name,
          company: company || null,
          role: role || null,
          source: 'event_description',
        })
      }
    }
  }

  // Pattern 3: bullet list items that look like "- Nom Prenom (Company)"
  const bulletPattern = /[-•*]\s*([A-Z][a-zéèê]+ [A-Z][a-zéèê]+)\s*\(([^)]+)\)/g
  while ((match = bulletPattern.exec(plainText)) !== null) {
    const name = (match[1] || '').trim()
    const company = (match[2] || '').trim()
    const alreadyAdded = speakers.some((s) => s.name === name)
    if (name && !alreadyAdded) {
      speakers.push({
        name,
        company: company || null,
        role: null,
        source: 'event_description',
      })
    }
  }

  return speakers
}

/**
 * Fetch French business events from Eventbrite API in the next 30 days
 * @returns {Promise<Array>} Events with extracted speakers
 */
async function fetchEventbriteEvents() {
  if (!EVENTBRITE_TOKEN) {
    logger.warn('EVENTBRITE_TOKEN not set, skipping Eventbrite scan')
    return []
  }

  const events = []
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const searchQueries = ['conference business france', 'salon entrepreneur paris', 'sommet digital marketing france']

  for (const query of searchQueries) {
    try {
      const response = await axios.get(`${EVENTBRITE_API}/events/search/`, {
        params: {
          q: query,
          'location.address': 'France',
          'start_date.range_start': now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          'start_date.range_end': in30Days.toISOString().replace(/\.\d{3}Z$/, 'Z'),
          sort_by: 'date',
          expand: 'venue,organizer',
        },
        headers: {
          Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
        },
        timeout: 15000,
      })

      const apiEvents = response.data?.events || []

      for (const event of apiEvents) {
        const title = event.name?.text || ''
        if (!isFrenchBusinessEvent(title)) continue

        const description = event.description?.html || event.description?.text || ''
        const speakers = extractSpeakers(description)

        events.push({
          eventId: event.id,
          title,
          description: (event.description?.text || '').slice(0, 500),
          url: event.url,
          startDate: formatDate(event.start?.utc),
          endDate: formatDate(event.end?.utc),
          venue: event.venue?.name || null,
          city: event.venue?.address?.city || null,
          organizer: event.organizer?.name || null,
          speakers,
          speakerCount: speakers.length,
          source: 'eventbrite',
          scannedAt: new Date().toISOString(),
        })
      }

      // Rate limit between queries
      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      if (err.response?.status === 401) {
        logger.error('Eventbrite API: invalid token')
        break
      }
      logger.warn(`Eventbrite search failed for "${query}":`, err.message)
    }
  }

  return events
}

/**
 * Parse salons-online.com RSS feed for upcoming French trade shows
 * @returns {Promise<Array>} Trade shows with basic info
 */
async function fetchSalonsOnlineRSS() {
  const events = []

  try {
    const response = await axios.get(SALONS_RSS_URL, {
      headers: {
        'User-Agent': 'FMF-Signals/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      timeout: 10000,
    })

    const $ = cheerio.load(response.data, { xmlMode: true })

    $('item').each((_, item) => {
      const $item = $(item)
      const title = $item.find('title').text().trim()
      const link = $item.find('link').text().trim()
      const description = $item.find('description').text().trim()
      const pubDate = $item.find('pubDate').text().trim()

      if (!isFrenchBusinessEvent(title) && !isFrenchBusinessEvent(description)) return

      // Try to extract speakers from description
      const speakers = extractSpeakers(description)

      events.push({
        eventId: `salons-${Buffer.from(title).toString('base64').slice(0, 16)}`,
        title,
        description: description.slice(0, 500),
        url: link || null,
        startDate: formatDate(pubDate),
        endDate: null,
        venue: null,
        city: null,
        organizer: null,
        speakers,
        speakerCount: speakers.length,
        source: 'salons-online',
        scannedAt: new Date().toISOString(),
      })
    })
  } catch (err) {
    logger.warn('salons-online.com RSS fetch failed:', err.message)
  }

  return events
}

/**
 * Main scanner: scans conference speakers from multiple sources
 * and saves leads to Firestore conferenceLeads collection
 *
 * @returns {Promise<Object>} Scan results summary
 */
export async function scanConferenceSpeakers() {
  logger.info('Conference Speakers Scanner: starting scan')

  const db = getDb()

  // Fetch from both sources in parallel
  const [eventbriteEvents, salonsEvents] = await Promise.all([
    fetchEventbriteEvents(),
    fetchSalonsOnlineRSS(),
  ])

  const allEvents = [...eventbriteEvents, ...salonsEvents]
  logger.info(`Found ${allEvents.length} business events (Eventbrite: ${eventbriteEvents.length}, Salons: ${salonsEvents.length})`)

  let savedEvents = 0
  let savedSpeakers = 0
  let skippedEvents = 0

  for (const event of allEvents) {
    try {
      // Check for duplicates by eventId
      const existingSnap = await db
        .collection('conferenceLeads')
        .where('eventId', '==', event.eventId)
        .limit(1)
        .get()

      if (!existingSnap.empty) {
        skippedEvents++
        continue
      }

      // Save event with speakers as a conference lead
      await db.collection('conferenceLeads').add({
        ...event,
        status: 'new',
        processed: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      savedEvents++
      savedSpeakers += event.speakerCount

      // Also create individual speaker leads if they have company info
      for (const speaker of event.speakers) {
        if (!speaker.company) continue

        // Dedup speakers by name + company
        const speakerExistingSnap = await db
          .collection('conferenceLeads')
          .where('speakerName', '==', speaker.name)
          .where('speakerCompany', '==', speaker.company)
          .limit(1)
          .get()

        if (!speakerExistingSnap.empty) continue

        await db.collection('conferenceLeads').add({
          type: 'speaker',
          speakerName: speaker.name,
          speakerCompany: speaker.company,
          speakerRole: speaker.role,
          eventTitle: event.title,
          eventDate: event.startDate,
          eventUrl: event.url,
          source: event.source,
          status: 'new',
          processed: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    } catch (err) {
      logger.warn(`Failed to save event "${event.title}":`, err.message)
    }
  }

  const summary = {
    totalEvents: allEvents.length,
    savedEvents,
    savedSpeakers,
    skippedEvents,
    sources: {
      eventbrite: eventbriteEvents.length,
      salonsOnline: salonsEvents.length,
    },
    scannedAt: new Date().toISOString(),
  }

  logger.info('Conference Speakers Scanner complete:', JSON.stringify(summary))

  return summary
}
