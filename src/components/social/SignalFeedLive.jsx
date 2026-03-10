import { useState } from 'react'

const SOURCE_ICONS = {
  facebook_group: { icon: '👥', label: 'Facebook', color: 'text-blue-400' },
  linkedin_feed: { icon: '💡', label: 'LinkedIn', color: 'text-sky-400' },
  telegram_group: { icon: '✈️', label: 'Telegram', color: 'text-indigo-400' },
  bodacc_creation: { icon: '🏛️', label: 'BODACC', color: 'text-amber-400' },
  bodacc_radiation: { icon: '🏛️', label: 'BODACC', color: 'text-red-400' },
  france_travail: { icon: '💼', label: 'France Travail', color: 'text-emerald-400' },
  sitadel_permit: { icon: '🏗️', label: 'SITADEL', color: 'text-orange-400' },
  google_alerts: { icon: '🔔', label: 'Google Alerts', color: 'text-yellow-400' },
  rss_boamp: { icon: '📋', label: 'BOAMP', color: 'text-purple-400' },
  rss_batiactu: { icon: '🏠', label: 'Batiactu', color: 'text-teal-400' },
  rss_indeed_fr: { icon: '💼', label: 'Indeed', color: 'text-blue-300' },
  rss_fusac: { icon: '🤝', label: 'Fusacq', color: 'text-pink-400' },
  rss_decideurs: { icon: '📰', label: 'Decideurs', color: 'text-gray-300' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

function scoreColor(score) {
  if (score >= 80) return 'bg-red-500/20 text-red-400 border-red-500/30'
  if (score >= 60) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return 'bg-gray-700/50 text-gray-400 border-gray-600'
}

export default function SignalFeedLive({ signals = [] }) {
  const [expanded, setExpanded] = useState(null)

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Flux en direct</h3>
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📡</div>
          <p className="text-sm text-gray-500">En attente de signaux...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Flux en direct</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {signals.map(signal => {
          const src = SOURCE_ICONS[signal.source] || { icon: '📌', label: signal.source, color: 'text-gray-400' }
          const text = signal.text || signal.title || signal.signalText || ''
          const score = signal.intent_score || signal.intentScore || 0
          const keywords = signal.matched_keywords || signal.matchedKeywords || []
          const isExpanded = expanded === signal.id

          return (
            <div
              key={signal.id}
              className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-colors cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : signal.id)}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0">{src.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${src.color}`}>{src.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${scoreColor(score)}`}>
                      {score}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                      {timeAgo(signal.detected_at || signal.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {isExpanded ? text : text.slice(0, 120) + (text.length > 120 ? '...' : '')}
                  </p>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {keywords.slice(0, 3).map(kw => (
                        <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
