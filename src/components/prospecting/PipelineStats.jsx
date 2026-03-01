import { ArrowRight } from 'lucide-react'

const STAGES = [
  { key: 'collected', label: 'Collectes', color: 'bg-blue-500' },
  { key: 'normalized', label: 'Normalises', color: 'bg-cyan-500' },
  { key: 'deduped', label: 'Dedupliques', color: 'bg-teal-500' },
  { key: 'enriched', label: 'Enrichis', color: 'bg-green-500' },
  { key: 'scored', label: 'Scores', color: 'bg-emerald-500' },
  { key: 'promoted', label: 'Promus', color: 'bg-indigo-500' },
]

export default function PipelineStats({ funnel, onRunPipeline, loading }) {
  if (!funnel) return null

  const maxValue = Math.max(...STAGES.map(s => funnel[s.key] || 0), 1)

  const formatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n || 0)
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Pipeline de traitement</h3>
        <button
          onClick={onRunPipeline}
          disabled={loading}
          className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
        >
          Lancer le pipeline
        </button>
      </div>

      {/* Funnel visualization */}
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const value = funnel[stage.key] || 0
          const width = Math.max(5, (value / maxValue) * 100)
          const prevValue = i > 0 ? (funnel[STAGES[i - 1].key] || 0) : value
          const dropRate = prevValue > 0 ? Math.round(((prevValue - value) / prevValue) * 100) : 0

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-600 text-right">{stage.label}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${stage.color} rounded-lg transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
                  {formatNumber(value)}
                </span>
              </div>
              {i > 0 && dropRate > 0 && (
                <span className="w-12 text-xs text-red-500 text-right">-{dropRate}%</span>
              )}
              {i === 0 && <span className="w-12" />}
            </div>
          )
        })}
      </div>

      {/* Rejected / Duplicates */}
      <div className="flex gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-gray-600">Rejetes: {formatNumber(funnel.rejected || 0)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-gray-600">Doublons: {formatNumber(funnel.duplicate || 0)}</span>
        </div>
      </div>
    </div>
  )
}
