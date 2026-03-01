import { Activity, AlertTriangle, CheckCircle, Clock, Play, XCircle } from 'lucide-react'

const SOURCE_LABELS = {
  sirene: 'INSEE SIRENE',
  bodacc: 'BODACC',
  france_travail: 'France Travail',
  serp_hunting: 'SERP Hunting',
  new_domains: 'Nouveaux Domaines',
  competitor_reviews: 'Avis Concurrents',
}

const GROUP_LABELS = {
  registries: 'Registres Publics',
  intent: 'Signaux d\'Intention',
}

const HEALTH_STYLES = {
  healthy: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'OK' },
  degraded: { color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle, label: 'Degrade' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Critique' },
  never_run: { color: 'text-gray-400', bg: 'bg-gray-50', icon: Clock, label: 'Jamais execute' },
}

export default function SourceCard({ sourceId, stats, healthData, onTrigger, loading }) {
  const label = SOURCE_LABELS[sourceId] || sourceId
  const group = GROUP_LABELS[healthData?.group] || healthData?.group || ''
  const healthStyle = HEALTH_STYLES[healthData?.health] || HEALTH_STYLES.never_run
  const HealthIcon = healthStyle.icon

  const formatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n || 0)
  }

  const formatDate = (d) => {
    if (!d) return 'Jamais'
    const date = new Date(d)
    const now = new Date()
    const diff = now - date
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)}min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{label}</h4>
          <p className="text-xs text-gray-500">{group}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${healthStyle.bg} ${healthStyle.color}`}>
          <HealthIcon className="w-3 h-3" />
          {healthStyle.label}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{formatNumber(stats?.totalCollected)}</p>
          <p className="text-xs text-gray-500">Collectes</p>
        </div>
        <div>
          <p className="text-lg font-bold text-indigo-600">{formatNumber(stats?.totalPromoted)}</p>
          <p className="text-xs text-gray-500">Promus</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-700">{stats?.totalRuns || 0}</p>
          <p className="text-xs text-gray-500">Runs</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {formatDate(healthData?.lastRunAt || stats?.lastRunAt)}
        </div>

        <button
          onClick={() => onTrigger(sourceId)}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
        >
          <Play className="w-3 h-3" />
          Lancer
        </button>
      </div>

      {/* Estimated */}
      <div className="text-xs text-gray-400 text-center">
        ~{formatNumber(healthData?.estimatedLeadsPerMonth)}/mois
      </div>
    </div>
  )
}
