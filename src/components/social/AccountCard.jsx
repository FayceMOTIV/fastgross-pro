/**
 * AccountCard - Carte de compte Instagram avec status, limites, actions
 */

import {
  Instagram,
  Pause,
  Play,
  Trash2,
  Loader2,
  Shield,
  Clock,
  AlertTriangle,
  Ban,
} from 'lucide-react'

const statusConfig = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  paused: { label: 'Pause', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  warming_up: { label: 'Warmup', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  rate_limited: { label: 'Rate limit', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  banned: { label: 'Banni', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

export default function AccountCard({
  account,
  onToggleStatus,
  onRemove,
  toggling,
  removing,
}) {
  const status = statusConfig[account.status] || statusConfig.paused
  const dailyPercent = account.dailyLimit > 0
    ? Math.min(100, Math.round((account.dailySent / account.dailyLimit) * 100))
    : 0
  const hourlyPercent = account.hourlyLimit > 0
    ? Math.min(100, Math.round((account.hourlySent / account.hourlyLimit) * 100))
    : 0

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Jamais'
    const d = dateStr.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 3600000) return `il y a ${Math.round(diff / 60000)}min`
    if (diff < 86400000) return `il y a ${Math.round(diff / 3600000)}h`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">@{account.username}</p>
            <p className="text-xs text-gray-500">Jour {account.warmupDay || '?'} de warmup</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Daily Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">DMs aujourd'hui</span>
          <span className="font-medium text-gray-900">{account.dailySent || 0}/{account.dailyLimit || 30}</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              dailyPercent >= 90 ? 'bg-red-500' : dailyPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      </div>

      {/* Hourly Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Cette heure</span>
          <span className="font-medium text-gray-900">{account.hourlySent || 0}/{account.hourlyLimit || 4}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${hourlyPercent}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>Total: {account.totalSent || 0} envoyes</span>
        <span>{account.totalReplies || 0} reponses</span>
      </div>

      {/* Last activity */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
        <Clock className="w-3.5 h-3.5" />
        Derniere activite: {formatDate(account.lastActivity)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t">
        <button
          onClick={() => onToggleStatus(account.id, account.status)}
          disabled={toggling === account.id || account.status === 'banned'}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            account.status === 'active'
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          } disabled:opacity-50`}
        >
          {toggling === account.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : account.status === 'active' ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Activer
            </>
          )}
        </button>

        <button
          onClick={() => onRemove(account.id, account.username)}
          disabled={removing === account.id}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {removing === account.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Warnings */}
      {account.status === 'rate_limited' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Rate limite - pause automatique en cours
        </div>
      )}
      {account.status === 'banned' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <Ban className="w-3.5 h-3.5 flex-shrink-0" />
          Compte desactive par Instagram
        </div>
      )}
    </div>
  )
}
