import { Building2, Mail, Phone, MessageSquare, ExternalLink, Eye, XCircle } from 'lucide-react'
import ABMBadge from './ABMBadge'

const SCORE_COLORS = {
  high: { ring: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  medium: { ring: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  low: { ring: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-600' },
}

const SOURCE_BADGES = {
  boamp: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'BOAMP' },
  societe: { bg: 'bg-indigo-100', color: 'text-indigo-700', label: 'Societe.com' },
  google_maps: { bg: 'bg-red-100', color: 'text-red-700', label: 'Google Maps' },
  linkedin: { bg: 'bg-sky-100', color: 'text-sky-700', label: 'LinkedIn' },
  pappers: { bg: 'bg-violet-100', color: 'text-violet-700', label: 'Pappers' },
  infogreffe: { bg: 'bg-teal-100', color: 'text-teal-700', label: 'Infogreffe' },
  sirene: { bg: 'bg-emerald-100', color: 'text-emerald-700', label: 'SIRENE' },
  apify: { bg: 'bg-orange-100', color: 'text-orange-700', label: 'Apify' },
  hunter: { bg: 'bg-pink-100', color: 'text-pink-700', label: 'Hunter' },
}

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
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

export default function LeadProCard({ lead, onImport, onIgnore, onViewDetails }) {
  const {
    score = 0,
    source = '',
    company = 'Entreprise',
    contact = '',
    position = '',
    intentSignal = '',
    channels = [],
    decisionMakers = 0,
    city = '',
    sector = '',
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
                <h4 className="text-sm font-semibold text-text truncate">{company}</h4>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceBadge.bg} ${sourceBadge.color}`}
                >
                  {sourceBadge.label}
                </span>
              </div>
              {contact && (
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {contact} {position && `- ${position}`}
                </p>
              )}
            </div>
          </div>

          {/* Intent signal */}
          {intentSignal && (
            <div className="flex items-center gap-1.5 mt-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <p className="text-xs text-accent font-medium truncate">{intentSignal}</p>
            </div>
          )}

          {/* Location & sector */}
          {(city || sector) && (
            <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
              {city && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {city}
                </span>
              )}
              {sector && <span>{sector}</span>}
            </div>
          )}

          {/* ABM badge */}
          {decisionMakers > 1 && <ABMBadge count={decisionMakers} />}

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
                onClick={() => onImport?.(lead)}
                className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
