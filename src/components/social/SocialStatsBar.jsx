export default function SocialStatsBar({ stats }) {
  if (!stats) return null

  const items = [
    { label: 'Signaux detectes', value: stats.totalSignals, icon: '📡', color: 'text-indigo-400' },
    { label: 'Leads generes', value: stats.totalLeads, icon: '🎯', color: 'text-blue-400' },
    { label: 'Actions realisees', value: stats.actionsDone, icon: '⚡', color: 'text-amber-400' },
    { label: 'Convertis', value: stats.converted, icon: '✅', color: 'text-emerald-400' },
    { label: 'Taux conversion', value: `${stats.conversionRate}%`, icon: '📈', color: 'text-purple-400' },
  ]

  return (
    <div className="border-b border-gray-800 bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <div>
                <div className={`text-sm font-semibold ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-gray-600">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
