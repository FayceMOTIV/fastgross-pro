import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const STATUS_BADGES = {
  pending_first_action: { label: 'En attente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  first_action_done: { label: 'Action faite', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  first_action_failed: { label: 'Echec', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  converted: { label: 'Converti', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  dismissed: { label: 'Ignore', color: 'bg-gray-500/10 text-gray-500 border-gray-600' },
  new: { label: 'Nouveau', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

const SOURCE_LABELS = {
  facebook_group: { icon: '👥', name: 'Facebook' },
  linkedin_feed: { icon: '💡', name: 'LinkedIn' },
  telegram_group: { icon: '✈️', name: 'Telegram' },
  bodacc_creation: { icon: '🏛️', name: 'BODACC' },
  france_travail: { icon: '💼', name: 'France Travail' },
  sitadel_permit: { icon: '🏗️', name: 'SITADEL' },
}

export default function SocialLeadCard({ lead, orgId }) {
  const [loading, setLoading] = useState(null)
  const [showDmInput, setShowDmInput] = useState(false)
  const [dmText, setDmText] = useState('')

  const status = STATUS_BADGES[lead.status] || STATUS_BADGES.new
  const src = SOURCE_LABELS[lead.source] || { icon: '📌', name: lead.source }
  const score = lead.intentScore || 0

  const handleAction = async (action, customMessage) => {
    setLoading(action)
    try {
      const fn = httpsCallable(functions, 'socialManualAction')
      await fn({ action, leadId: lead.id, orgId, customMessage })
    } catch (err) {
      console.error('Action error:', err)
    }
    setLoading(null)
    setShowDmInput(false)
  }

  const handleSendDm = () => {
    const platform = lead.source?.includes('facebook') ? 'send_dm_facebook'
      : lead.source?.includes('linkedin') ? 'send_dm_linkedin' : null
    if (platform && dmText.trim()) {
      handleAction(platform, dmText.trim())
    }
  }

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/70 p-4 hover:border-gray-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{src.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white">
                {lead.contactName || 'Contact inconnu'}
              </h4>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{src.name}</p>
          </div>
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
          score >= 80 ? 'bg-red-500/10 text-red-400' :
          score >= 60 ? 'bg-orange-500/10 text-orange-400' :
          'bg-gray-700 text-gray-400'
        }`}>
          {score}
        </div>
      </div>

      {/* Signal text */}
      <p className="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-3">
        {lead.signalText || ''}
      </p>

      {/* Keywords */}
      {lead.matchedKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {lead.matchedKeywords.map(kw => (
            <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* SIREN */}
      {lead.siren && (
        <p className="text-[10px] text-gray-600 mb-3">SIREN: {lead.siren}</p>
      )}

      {/* Completed steps */}
      {lead.sequence?.completedSteps?.length > 0 && (
        <div className="mb-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <p className="text-[10px] text-gray-500 mb-1">Actions effectuees:</p>
          {lead.sequence.completedSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span>{step.success ? '✅' : '❌'}</span>
              <span>{step.channel || step.action}</span>
              {step.text && <span className="text-gray-600 truncate max-w-[200px]">— {step.text}</span>}
            </div>
          ))}
        </div>
      )}

      {/* DM Input */}
      {showDmInput && (
        <div className="mb-3 space-y-2">
          <textarea
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            placeholder="Message personnalise..."
            className="w-full p-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSendDm}
              disabled={!dmText.trim() || loading}
              className="flex-1 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-40 transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer DM'}
            </button>
            <button
              onClick={() => setShowDmInput(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {lead.status !== 'converted' && lead.status !== 'dismissed' && (
        <div className="flex gap-2">
          {lead.contactUrl && (
            <button
              onClick={() => setShowDmInput(!showDmInput)}
              className="flex-1 py-1.5 text-xs text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              💬 Envoyer DM
            </button>
          )}
          <button
            onClick={() => handleAction('mark_converted')}
            disabled={loading === 'mark_converted'}
            className="px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-lg transition-colors"
          >
            ✅
          </button>
          <button
            onClick={() => handleAction('dismiss')}
            disabled={loading === 'dismiss'}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
