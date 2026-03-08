import { useState } from 'react'

const COLORS = {
  CRITIQUE: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-100', bar: 'bg-red-500' },
  LATENT: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-100', bar: 'bg-yellow-500' },
  MATURE: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-100', bar: 'bg-green-500' }
}

const LABELS = { CRITIQUE: 'Besoin urgent', LATENT: 'Besoin latent', MATURE: 'Deja digital' }
const DOTS = { CRITIQUE: 'bg-red-500', LATENT: 'bg-yellow-500', MATURE: 'bg-green-500' }

export default function DScoreWidget({ dScore }) {
  const [expanded, setExpanded] = useState(false)
  if (!dScore) return null

  const { dScore: score, urgency, summary, dimensions, topSignals } = dScore
  const c = COLORS[urgency] || COLORS.LATENT

  return (
    <div className={`rounded-xl border-2 p-4 ${c.bg} ${c.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className={`text-3xl font-black ${c.text}`}>{score}</div>
            <div className="text-xs text-gray-500">/ 100</div>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${c.badge} ${c.text}`}>
              <span className={`w-2 h-2 rounded-full ${DOTS[urgency]}`} />
              {LABELS[urgency]}
            </span>
            {summary && <p className="text-xs text-gray-600 mt-1 max-w-xs">{summary}</p>}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600">
          {expanded ? 'Moins' : 'Details'}
        </button>
      </div>

      {/* Barre de score */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div className={`h-2 rounded-full transition-all ${c.bar}`} style={{ width: `${score}%` }} />
      </div>

      {/* Signaux rapides */}
      <div className="flex flex-wrap gap-1 mb-2">
        {topSignals?.slice(0, 3).map((s, i) => (
          <span key={i} className="text-xs bg-white/60 px-2 py-0.5 rounded-full text-gray-600 border border-gray-200">
            {s.length > 40 ? s.slice(0, 40) + '...' : s}
          </span>
        ))}
      </div>

      {/* Detail dimensions */}
      {expanded && dimensions && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {Object.entries({
            website: 'Site web',
            googleMaps: 'Google Maps',
            social: 'Reseaux sociaux',
            recruitment: 'Recrutement',
            reviews: 'Avis'
          }).map(([key, label]) => {
            const dim = dimensions[key]
            if (!dim) return null
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className={`font-bold ${c.text}`}>{dim.score}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${c.bar}`} style={{ width: `${Math.min(dim.score * 2, 100)}%` }} />
                </div>
                {dim.signals?.slice(0, 2).map((s, i) => (
                  <p key={i} className="text-xs text-gray-500 mt-0.5">- {s}</p>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
