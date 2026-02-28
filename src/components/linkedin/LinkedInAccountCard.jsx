/**
 * LinkedInAccountCard — Carte compte LinkedIn + stats + actions
 */

import { useState } from 'react'
import {
  Linkedin,
  Pause,
  Play,
  Trash2,
  Loader2,
  TrendingUp,
  Users,
  Send,
  Clock,
  AlertTriangle,
} from 'lucide-react'

const statusConfig = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  paused: { label: 'Pause', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  warming_up: { label: 'Warmup', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  disconnected: { label: 'Deconnecte', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
}

export default function LinkedInAccountCard({ account, onRemove }) {
  const [removing, setRemoving] = useState(false)

  const status = statusConfig[account.status] || statusConfig.disconnected
  const dailyProgress = account.dailyLimit > 0 ? (account.dailySent / account.dailyLimit) * 100 : 0
  const progressColor =
    dailyProgress >= 90 ? 'bg-red-500' : dailyProgress >= 70 ? 'bg-yellow-500' : 'bg-blue-500'

  const handleRemove = async () => {
    if (!window.confirm(`Supprimer le compte "${account.name}" ?`)) return
    setRemoving(true)
    try {
      await onRemove(account.id)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Voir profil
            </a>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Warmup indicator */}
      {account.status === 'warming_up' && (
        <div className="flex items-center gap-2 text-xs bg-blue-50 rounded-lg px-3 py-2 mb-4">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-blue-700">
            Warmup jour {account.warmupDay || 1} — Limite progressive
          </span>
        </div>
      )}

      {/* Daily progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-600">Envois aujourd'hui</span>
          <span className="font-medium text-gray-900">
            {account.dailySent || 0} / {account.dailyLimit || 0}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(dailyProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Send className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{account.totalSent || 0}</div>
          <div className="text-xs text-gray-500">Envoyes</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Users className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{account.totalConnected || 0}</div>
          <div className="text-xs text-gray-500">Connectes</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <TrendingUp className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{account.replyRate || 0}%</div>
          <div className="text-xs text-gray-500">Reponses</div>
        </div>
      </div>

      {/* Error warning */}
      {account.status === 'error' && account.errorMessage && (
        <div className="flex items-center gap-2 text-xs bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span className="text-red-700">{account.errorMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleRemove}
          disabled={removing}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Supprimer
        </button>
      </div>
    </div>
  )
}
