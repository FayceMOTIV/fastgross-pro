/**
 * LinkedInCampaignCard — Carte campagne HeyReach + progress + controles
 */

import { useState } from 'react'
import {
  Play,
  Pause,
  Users,
  Send,
  UserCheck,
  MessageSquare,
  BarChart3,
  Loader2,
  Calendar,
} from 'lucide-react'

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  paused: { label: 'Pause', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  created: { label: 'Creee', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Terminee', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LinkedInCampaignCard({ campaign, onPause, onResume, onGetStats }) {
  const [toggling, setToggling] = useState(false)

  const status = statusConfig[campaign.status] || statusConfig.created
  const progress =
    campaign.leadsCount > 0 ? (campaign.sentCount / campaign.leadsCount) * 100 : 0

  const handleToggle = async () => {
    setToggling(true)
    try {
      if (campaign.status === 'active') {
        await onPause(campaign.id)
      } else {
        await onResume(campaign.id)
      }
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>Creee le {formatDate(campaign.createdAt)}</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-gray-600">Progression</span>
          <span className="font-medium text-gray-900">
            {campaign.sentCount || 0} / {campaign.leadsCount || 0} leads
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-blue-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Users className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{campaign.leadsCount || 0}</div>
          <div className="text-xs text-gray-500">Leads</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Send className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{campaign.sentCount || 0}</div>
          <div className="text-xs text-gray-500">Envoyes</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <UserCheck className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{campaign.connectedCount || 0}</div>
          <div className="text-xs text-gray-500">Connectes</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
          <div className="text-sm font-semibold text-gray-900">{campaign.repliedCount || 0}</div>
          <div className="text-xs text-gray-500">Reponses</div>
        </div>
      </div>

      {/* Rates */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>
          Taux connexion :{' '}
          <span className="font-medium text-gray-900">{campaign.connectionRate || 0}%</span>
        </span>
        <span>
          Taux reponse :{' '}
          <span className="font-medium text-gray-900">{campaign.replyRate || 0}%</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {(campaign.status === 'active' || campaign.status === 'paused') && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
              campaign.status === 'active'
                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : campaign.status === 'active' ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {campaign.status === 'active' ? 'Pause' : 'Reprendre'}
          </button>
        )}
        <button
          onClick={() => onGetStats?.(campaign.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>
    </div>
  )
}
