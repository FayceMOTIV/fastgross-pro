const CRM_COLUMNS = [
  { id: 'detected', label: 'Detecte', color: 'bg-gray-400' },
  { id: 'warming', label: 'Warming', color: 'bg-yellow-400' },
  { id: 'contacted', label: 'Contacte', color: 'bg-blue-400' },
  { id: 'replied', label: 'Repondu', color: 'bg-purple-400' },
  { id: 'meeting', label: 'RDV', color: 'bg-orange-400' },
  { id: 'won', label: 'Gagne', color: 'bg-emerald-400' },
  { id: 'lost', label: 'Perdu', color: 'bg-red-400' },
]

export default function PipelineBar({ prospects = [] }) {
  const total = prospects.length || 1
  const counts = {}
  CRM_COLUMNS.forEach((col) => {
    counts[col.id] = prospects.filter((p) => p.crmColumn === col.id).length
  })

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {CRM_COLUMNS.map((col) => {
          const pct = (counts[col.id] / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={col.id}
              className={`${col.color} transition-all duration-300`}
              style={{ width: `${pct}%` }}
              title={`${col.label}: ${counts[col.id]}`}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {CRM_COLUMNS.filter((col) => counts[col.id] > 0).map((col) => (
          <div key={col.id} className="flex items-center gap-1 text-xs text-text-muted">
            <div className={`w-2 h-2 rounded-full ${col.color}`} />
            <span>
              {col.label}: {counts[col.id]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
