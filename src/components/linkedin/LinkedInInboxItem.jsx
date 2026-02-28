/**
 * LinkedInInboxItem — Item inbox LinkedIn + classification + actions
 */

import {
  MessageSquare,
  ExternalLink,
  Check,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Mail,
} from 'lucide-react'

const sentimentConfig = {
  positive: { label: 'Positif', color: 'bg-green-100 text-green-700', icon: ThumbsUp },
  negative: { label: 'Negatif', color: 'bg-red-100 text-red-700', icon: ThumbsDown },
  neutral: { label: 'Neutre', color: 'bg-gray-100 text-gray-700', icon: Minus },
}

const classificationLabels = {
  interested: 'Interesse',
  not_interested: 'Pas interesse',
  meeting_request: 'Demande RDV',
  pricing_inquiry: 'Demande tarifs',
  unsubscribe: 'Desabonnement',
  callback_request: 'Rappel',
  question: 'Question',
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function LinkedInInboxItem({ message, onMarkAsRead, onReply }) {
  const sentiment = sentimentConfig[message.sentiment] || sentimentConfig.neutral
  const SentimentIcon = sentiment.icon
  const isUnread = message.status === 'unread'

  return (
    <div
      className={`p-4 rounded-xl border transition-shadow hover:shadow-sm ${
        isUnread ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
            {(message.prospectName || '?')[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{message.prospectName}</span>
              {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(message.receivedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sentiment.color}`}
          >
            <SentimentIcon className="w-3 h-3" />
            {sentiment.label}
          </span>
          {message.classification && classificationLabels[message.classification] && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {classificationLabels[message.classification]}
            </span>
          )}
        </div>
      </div>

      {/* Message body */}
      <div className="ml-10 mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">{message.message}</p>
      </div>

      {/* Actions */}
      <div className="ml-10 flex items-center gap-2">
        {isUnread && onMarkAsRead && (
          <button
            onClick={() => onMarkAsRead(message.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            <Check className="w-3 h-3" />
            Marquer lu
          </button>
        )}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <MessageSquare className="w-3 h-3" />
            Repondre
          </button>
        )}
        {message.prospectUrl && (
          <a
            href={message.prospectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            <ExternalLink className="w-3 h-3" />
            Profil
          </a>
        )}
      </div>
    </div>
  )
}
