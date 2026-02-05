import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PeriodComparison({ current, previous, label, format = 'number' }) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  const formatValue = (val) => {
    if (format === 'percent') return `${val}%`;
    if (format === 'currency') return `${val.toLocaleString('fr-FR')}€`;
    return val.toLocaleString('fr-FR');
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/30">
      <div>
        <p className="text-xs text-dark-500">{label}</p>
        <p className="text-xl font-display font-bold text-white mt-1">
          {formatValue(current)}
        </p>
      </div>
      <div className={`flex items-center gap-1 text-sm ${
        trend === 'up' ? 'text-brand-400' : trend === 'down' ? 'text-red-400' : 'text-dark-400'
      }`}>
        {trend === 'up' && <TrendingUp className="w-4 h-4" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4" />}
        {trend === 'neutral' && <Minus className="w-4 h-4" />}
        <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
      </div>
    </div>
  );
}
