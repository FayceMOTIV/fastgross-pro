/**
 * SignalBadges — Badges visuels signaux d'achat dans LeadDrawer et CRM
 */

const SIGNAL_COLORS = {
  tech_change: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔧' },
  competitor_issue: { bg: 'bg-red-100', text: 'text-red-700', icon: '⚠️' },
  seasonal: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '📅' },
  regulatory: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📋' },
  social_engagement: { bg: 'bg-green-100', text: 'text-green-700', icon: '👍' },
  hiring: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '👥' },
  pain_in_reviews: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⭐' },
  funding: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '💰' },
  growing_fast: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '📈' },
  new_company: { bg: 'bg-pink-100', text: 'text-pink-700', icon: '🆕' },
}

export default function SignalBadges({ signals = [], className = '' }) {
  if (!signals || signals.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {signals.map((signal, i) => {
        const colors = SIGNAL_COLORS[signal.type] || {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: '📡',
        }
        return (
          <div
            key={`${signal.type}-${i}`}
            className={`group relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            <span>{colors.icon}</span>
            <span>{signal.label || signal.type}</span>
            {signal.score && (
              <span className="opacity-60">+{signal.score}</span>
            )}

            {/* Tooltip */}
            {signal.snippet && (
              <div className="invisible group-hover:visible absolute bottom-full left-0 mb-1 z-50 w-64 p-2 rounded-lg bg-gray-900 text-white text-[11px] shadow-lg">
                {signal.snippet}
                {signal.source && (
                  <a
                    href={signal.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 text-indigo-300 hover:text-indigo-200 truncate"
                  >
                    Source
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
