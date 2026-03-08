import { MapPin, Mail, Phone, MessageSquare, Eye, XCircle, Send } from 'lucide-react'
import LifeEventBadge from './LifeEventBadge'
import UrgenceFlag from './UrgenceFlag'

const SCORE_COLORS = {
  high: { ring: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { ring: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  low: { ring: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-600' },
}

const SOURCE_BADGES = {
  leboncoin: { bg: 'bg-orange-100', color: 'text-orange-700', label: 'Leboncoin' },
  seloger: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'SeLoger' },
  pap: { bg: 'bg-indigo-100', color: 'text-indigo-700', label: 'PAP' },
  mairie: { bg: 'bg-red-100', color: 'text-red-700', label: 'Mairie' },
  permis_construire: { bg: 'bg-teal-100', color: 'text-teal-700', label: 'Permis' },
  mariage: { bg: 'bg-pink-100', color: 'text-pink-700', label: 'Mariage' },
  naissance: { bg: 'bg-sky-100', color: 'text-sky-700', label: 'Naissance' },
  demenagement: { bg: 'bg-violet-100', color: 'text-violet-700', label: 'Demenagement' },
  google_maps: { bg: 'bg-red-100', color: 'text-red-700', label: 'Google Maps' },
}

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
  sms: Phone,
  whatsapp: MessageSquare,
}

function ScoreCircle({ score }) {
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  const style = SCORE_COLORS[level]

  return (
    <div
      className={`w-12 h-12 rounded-full border-[3px] ${style.ring} ${style.bg} flex items-center justify-center flex-shrink-0`}
    >
      <span className={`text-sm font-bold ${style.text}`}>{score}</span>
    </div>
  )
}

export default function LeadParticulierCard({ lead, onContact, onIgnore, onViewDetails }) {
  const {
    score = 0,
    source = '',
    name = 'Particulier',
    zone = '',
    intentSignal = '',
    urgency = false,
    lifeEvent = null,
    channels = [],
  } = lead

  const sourceBadge = SOURCE_BADGES[source] || {
    bg: 'bg-gray-100',
    color: 'text-gray-700',
    label: source,
  }

  return (
    <div className="card p-4 hover:shadow-soft-md transition-all">
      <div className="flex items-start gap-3">
        <ScoreCircle score={score} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-text truncate">{name}</h4>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceBadge.bg} ${sourceBadge.color}`}
                >
                  {sourceBadge.label}
                </span>
                {urgency && <UrgenceFlag />}
              </div>
            </div>
          </div>

          {/* Zone */}
          {zone && (
            <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5 mb-2">
              <MapPin className="w-3 h-3" />
              <span>{zone}</span>
            </div>
          )}

          {/* Intent signal */}
          {intentSignal && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <p className="text-xs text-teal-600 font-medium truncate">{intentSignal}</p>
            </div>
          )}

          {/* Life event badge */}
          {lifeEvent && (
            <div className="mb-2">
              <LifeEventBadge event={lifeEvent} />
            </div>
          )}

          {/* Channels + Actions */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              {channels.map((channel) => {
                const Icon = CHANNEL_ICONS[channel] || Mail
                return (
                  <div
                    key={channel}
                    className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                    title={channel}
                  >
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onViewDetails?.(lead)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Voir details"
              >
                <Eye className="w-4 h-4 text-text-muted" />
              </button>
              <button
                onClick={() => onIgnore?.(lead)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Ignorer"
              >
                <XCircle className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={() => onContact?.(lead)}
                className="px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                Contacter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
