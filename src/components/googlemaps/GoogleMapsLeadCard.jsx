/**
 * GoogleMapsLeadCard — Carte lead Google Maps + infos + actions
 */

import { useState } from 'react'
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Star,
  MessageSquare,
  Bookmark,
  Loader2,
  ExternalLink,
  Zap,
} from 'lucide-react'

const scoreColors = {
  hot: 'bg-red-100 text-red-700',
  warm: 'bg-orange-100 text-orange-700',
  qualified: 'bg-green-100 text-green-700',
  cold: 'bg-blue-100 text-blue-700',
}

function getScoreLabel(score) {
  if (score >= 80) return { label: 'Hot', color: scoreColors.hot }
  if (score >= 60) return { label: 'Qualifie', color: scoreColors.qualified }
  if (score >= 40) return { label: 'Warm', color: scoreColors.warm }
  return { label: 'Cold', color: scoreColors.cold }
}

function renderStars(rating) {
  const stars = []
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
      )
    } else if (i === full && half) {
      stars.push(
        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-200" />
      )
    } else {
      stars.push(
        <Star key={i} className="w-3 h-3 text-gray-300" />
      )
    }
  }
  return stars
}

export default function GoogleMapsLeadCard({ lead, onEnrich, onSave, onStartSequence }) {
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)

  const scoreInfo = getScoreLabel(lead.score || 0)

  const handleEnrich = async () => {
    if (!onEnrich) return
    setEnriching(true)
    try {
      await onEnrich(lead.id)
    } finally {
      setEnriching(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(lead)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{lead.name}</h3>
          {lead.category && (
            <span className="text-xs text-gray-500">{lead.category}</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {lead.score != null && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${scoreInfo.color}`}
            >
              {lead.score} — {scoreInfo.label}
            </span>
          )}
          {lead.enriched && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Enrichi
            </span>
          )}
        </div>
      </div>

      {/* Rating */}
      {lead.rating != null && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">{renderStars(lead.rating)}</div>
          <span className="text-xs font-medium text-gray-700">{lead.rating}</span>
          <span className="text-xs text-gray-500">({lead.reviewCount || 0} avis)</span>
        </div>
      )}

      {/* Info rows */}
      <div className="space-y-1.5 mb-3">
        {lead.address && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.address}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
              {lead.phone}
            </a>
          </div>
        )}
        {lead.website && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 truncate"
            >
              {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
              {lead.email}
            </a>
          </div>
        )}
      </div>

      {/* Social links */}
      {lead.socialLinks && Object.keys(lead.socialLinks).length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {Object.entries(lead.socialLinks).map(([platform, handle]) => (
            <span
              key={platform}
              className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600"
            >
              {platform}: {handle}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!lead.enriched && onEnrich && (
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition disabled:opacity-50"
          >
            {enriching ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            Enrichir
          </button>
        )}
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Bookmark className="w-3 h-3" />
            )}
            Sauvegarder
          </button>
        )}
        {onStartSequence && (
          <button
            onClick={() => onStartSequence(lead)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <MessageSquare className="w-3 h-3" />
            Sequence
          </button>
        )}
      </div>
    </div>
  )
}
