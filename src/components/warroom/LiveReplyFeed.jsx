/**
 * LiveReplyFeed — Feed replies temps reel cross-org
 */

import {
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Linkedin,
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
} from 'lucide-react'

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Send,
}

const channelColors = {
  email: 'bg-blue-50 text-blue-700',
  sms: 'bg-green-50 text-green-700',
  whatsapp: 'bg-emerald-50 text-emerald-700',
  instagram: 'bg-pink-50 text-pink-700',
  linkedin: 'bg-sky-50 text-sky-700',
  twitter: 'bg-gray-50 text-gray-700',
}

const sentimentConfig = {
  positive: { icon: ThumbsUp, color: 'text-green-600' },
  negative: { icon: ThumbsDown, color: 'text-red-600' },
  neutral: { icon: Minus, color: 'text-gray-500' },
}

const classificationLabels = {
  interested: { label: 'Interesse', color: 'bg-green-100 text-green-700' },
  not_interested: { label: 'Pas interesse', color: 'bg-red-100 text-red-700' },
  meeting_request: { label: 'Demande RDV', color: 'bg-purple-100 text-purple-700' },
  pricing_inquiry: { label: 'Demande tarifs', color: 'bg-blue-100 text-blue-700' },
  unsubscribe: { label: 'Desabonnement', color: 'bg-gray-100 text-gray-700' },
  callback_request: { label: 'Rappel', color: 'bg-orange-100 text-orange-700' },
  question: { label: 'Question', color: 'bg-indigo-100 text-indigo-700' },
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'a l\'instant'
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export default function LiveReplyFeed({ replies = [], maxItems = 20 }) {
  const displayed = replies.slice(0, maxItems)

  return (
    <div className="space-y-2">
      {displayed.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          Aucune reponse recente
        </div>
      )}

      {displayed.map((reply) => {
        const ChannelIcon = channelIcons[reply.channel] || MessageSquare
        const channelColor = channelColors[reply.channel] || 'bg-gray-50 text-gray-700'
        const sentiment = sentimentConfig[reply.sentiment] || sentimentConfig.neutral
        const SentimentIcon = sentiment.icon
        const classification = classificationLabels[reply.classification]

        return (
          <div
            key={reply.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
          >
            {/* Sentiment indicator */}
            <div className="flex-shrink-0 mt-0.5">
              <SentimentIcon className={`w-4 h-4 ${sentiment.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900 truncate">
                  {reply.prospectName || 'Inconnu'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${channelColor}`}
                >
                  <ChannelIcon className="w-3 h-3" />
                  {reply.channel}
                </span>
                {classification && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${classification.color}`}
                  >
                    {classification.label}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-1">{reply.message}</p>

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(reply.receivedAt)}
                </span>
                {reply.orgName && (
                  <span className="truncate">{reply.orgName}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {replies.length > maxItems && (
        <div className="text-center text-xs text-gray-500 py-2">
          +{replies.length - maxItems} autres reponses
        </div>
      )}
    </div>
  )
}
