/**
 * SignalsFeed.jsx — Feed temps reel des signaux detectes par les monitors
 */
import { useState, useMemo } from 'react';

const categoryColors = {
  website: 'bg-blue-100 text-blue-700',
  tech: 'bg-purple-100 text-purple-700',
  seo: 'bg-green-100 text-green-700',
  email: 'bg-yellow-100 text-yellow-700',
  ssl: 'bg-red-100 text-red-700',
  social: 'bg-pink-100 text-pink-700',
  financial: 'bg-emerald-100 text-emerald-700',
  reviews: 'bg-orange-100 text-orange-700',
  market: 'bg-indigo-100 text-indigo-700',
};

const statusLabels = {
  new: { label: 'Nouveau', dot: 'bg-blue-500' },
  linked: { label: 'Lie', dot: 'bg-green-500' },
  processed: { label: 'Traite', dot: 'bg-gray-400' },
};

export default function SignalsFeed({ signals = [], onSignalClick }) {
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const categories = useMemo(() => {
    const cats = new Set(signals.map((s) => s.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (filter !== 'all' && s.category !== filter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [signals, filter, statusFilter]);

  if (!signals.length) {
    return (
      <div className="card p-6 text-center text-gray-400">
        Aucun signal detecte. Lancez un scan ou attendez les monitors automatiques.
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Signaux ({filtered.length})
        </h3>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Toutes categories' : cat}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1"
          >
            <option value="all">Tous statuts</option>
            <option value="new">Nouveaux</option>
            <option value="linked">Lies</option>
            <option value="processed">Traites</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filtered.map((signal, i) => {
          const catColor = categoryColors[signal.category] || 'bg-gray-100 text-gray-700';
          const status = statusLabels[signal.status] || statusLabels.new;

          return (
            <div
              key={signal.id || i}
              onClick={() => onSignalClick?.(signal)}
              className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{signal.message}</p>
                  <p className="text-xs text-gray-400">{signal.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${catColor}`}>
                  {signal.category}
                </span>
                <span className="text-xs font-mono text-gray-500">+{signal.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
