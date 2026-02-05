import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatsCard({ label, value, change, icon: Icon, format = 'number' }) {
  const formattedValue =
    format === 'percent' ? `${value}%` : format === 'currency' ? `${value}€` : value

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

  return (
    <div className="glass-card p-5 group hover:border-brand-500/20 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="stat-label">{label}</p>
          <p className="stat-value">{formattedValue}</p>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-medium ${
                trend === 'up'
                  ? 'text-brand-400'
                  : trend === 'down'
                  ? 'text-red-400'
                  : 'text-dark-400'
              }`}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend === 'neutral' && <Minus className="w-3 h-3" />}
              <span>
                {change > 0 ? '+' : ''}
                {change}% vs mois dernier
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
            <Icon className="w-5 h-5 text-brand-400" />
          </div>
        )}
      </div>
    </div>
  )
}
