/**
 * notificationTemplates — Templates riches pour notifications WhatsApp/Telegram
 * 4 types : hot_lead, meeting_booked, rescue_alert, daily_report
 */

/**
 * Score visuel avec barres emoji
 */
function scoreBar(score) {
  if (score >= 90) return '🔥🔥🔥🔥🔥'
  if (score >= 80) return '🔥🔥🔥🔥'
  if (score >= 70) return '🔥🔥🔥'
  if (score >= 60) return '🔥🔥'
  if (score >= 40) return '🔥'
  return '❄️'
}

function truncate(text, max = 120) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date()
  return d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Template : Lead chaud detecte
 */
export function hotLeadTemplate({ prospect, score, scoring, interactions, orgName, channel }) {
  const inbound = (interactions || [])
    .filter((i) => i.direction === 'in')
    .slice(0, 5)
  const outbound = (interactions || [])
    .filter((i) => i.direction === 'out')
    .slice(0, 3)

  const lines = [
    `🚨 *LEAD CHAUD DETECTE*`,
    `${scoreBar(score)} *Score: ${score}/100*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `👤 *${prospect.name || prospect.firstName || 'Inconnu'}*`,
  ]

  if (prospect.company) lines.push(`🏢 ${prospect.company}`)
  if (prospect.industry) lines.push(`📂 ${prospect.industry}`)
  if (prospect.phone) lines.push(`📞 ${prospect.phone}`)
  if (prospect.email) lines.push(`📧 ${prospect.email}`)
  if (prospect.website) lines.push(`🌐 ${prospect.website}`)

  lines.push('')

  if (scoring) {
    lines.push(`📊 *Analyse IA*`)
    if (scoring.intent) lines.push(`  ▸ Intent: ${scoring.intent}`)
    if (scoring.urgency) lines.push(`  ▸ Urgence: ${scoring.urgency}`)
    if (scoring.sentiment) lines.push(`  ▸ Sentiment: ${scoring.sentiment}`)
    if (scoring.cialdiniLever && scoring.cialdiniLever !== 'none') {
      lines.push(`  ▸ Levier Cialdini: ${scoring.cialdiniLever}`)
    }
    if (scoring.suggestedMethod && scoring.suggestedMethod !== 'none') {
      lines.push(`  ▸ Methode: ${scoring.suggestedMethod}`)
    }
    if (scoring.summary) lines.push(`  ▸ ${scoring.summary}`)
    lines.push('')
  }

  if (inbound.length > 0) {
    lines.push(`💬 *Derniers messages du prospect:*`)
    inbound.forEach((msg, i) => {
      lines.push(`  ${i + 1}. "${truncate(msg.message, 150)}"`)
    })
    lines.push('')
  }

  if (outbound.length > 0) {
    lines.push(`🤖 *Reponses Alex:*`)
    outbound.forEach((msg, i) => {
      lines.push(`  ${i + 1}. "${truncate(msg.message, 120)}"`)
    })
    lines.push('')
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (channel) lines.push(`📡 Canal: ${channel}`)
  lines.push(`🏷 ${orgName || 'Organisation'}`)
  lines.push(`⏰ ${formatDate()}`)
  lines.push('')
  lines.push(`⚡ *Action requise — Repondez dans les 15 min*`)

  if (prospect.phone) {
    lines.push(`📞 Appeler: ${prospect.phone}`)
  }

  return lines.join('\n')
}

/**
 * Template : RDV confirme
 */
export function meetingBookedTemplate({ prospect, meetingDate, meetingType, orgName }) {
  const lines = [
    `📅 *RDV CONFIRME*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `👤 *${prospect.name || 'Inconnu'}*`,
  ]

  if (prospect.company) lines.push(`🏢 ${prospect.company}`)
  if (prospect.phone) lines.push(`📞 ${prospect.phone}`)
  if (prospect.email) lines.push(`📧 ${prospect.email}`)

  lines.push('')
  lines.push(`📅 Date: ${meetingDate || 'A confirmer'}`)
  if (meetingType) lines.push(`📋 Type: ${meetingType}`)
  lines.push('')
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🏷 ${orgName || 'Organisation'}`)
  lines.push(`⏰ ${formatDate()}`)
  lines.push('')
  lines.push(`✅ *Preparez vos arguments de closing !*`)

  return lines.join('\n')
}

/**
 * Template : Alerte relance (rescue)
 */
export function rescueAlertTemplate({ prospect, daysSinceLastContact, lastMessage, orgName }) {
  const lines = [
    `⚠️ *RELANCE NECESSAIRE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `👤 *${prospect.name || 'Inconnu'}*`,
  ]

  if (prospect.company) lines.push(`🏢 ${prospect.company}`)
  lines.push(`📊 Score: ${prospect.alexScore || 0}/100`)
  lines.push(`⏳ Dernier contact: il y a ${daysSinceLastContact || '?'} jours`)

  if (lastMessage) {
    lines.push('')
    lines.push(`💬 Dernier message: "${truncate(lastMessage, 150)}"`)
  }

  lines.push('')
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🏷 ${orgName || 'Organisation'}`)
  lines.push(`⏰ ${formatDate()}`)
  lines.push('')
  lines.push(`🔄 *Alex va relancer automatiquement dans 2h*`)

  return lines.join('\n')
}

/**
 * Template : Rapport quotidien
 */
export function dailyReportTemplate({ stats, orgName, date }) {
  const s = stats || {}
  const convRate = s.totalContacted > 0
    ? ((s.replies / s.totalContacted) * 100).toFixed(1)
    : '0.0'

  const lines = [
    `📊 *RAPPORT QUOTIDIEN ALEX*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
    `📅 ${date || formatDate()}`,
    '',
    `📤 Messages envoyes: *${s.totalContacted || 0}*`,
    `📥 Reponses recues: *${s.replies || 0}*`,
    `📈 Taux de reponse: *${convRate}%*`,
    '',
    `🔥 Leads chauds: *${s.hotLeads || 0}*`,
    `📅 RDV pris: *${s.meetings || 0}*`,
    `🔄 Transferts: *${s.transfers || 0}*`,
    `⚠️ Relances planifiees: *${s.rescues || 0}*`,
  ]

  if (s.topChannel) {
    lines.push('')
    lines.push(`📡 Meilleur canal: *${s.topChannel}*`)
  }

  if (s.bestHour) {
    lines.push(`⏰ Meilleure heure: *${s.bestHour}h*`)
  }

  lines.push('')
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🏷 ${orgName || 'Organisation'}`)
  lines.push(`🤖 Alex — Face Media Factory`)

  return lines.join('\n')
}

export const NOTIFICATION_TYPES = {
  HOT_LEAD: 'hot_lead',
  MEETING_BOOKED: 'meeting_booked',
  RESCUE_ALERT: 'rescue_alert',
  DAILY_REPORT: 'daily_report',
}
