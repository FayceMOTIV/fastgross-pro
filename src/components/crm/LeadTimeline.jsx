import {
  MessageSquare,
  ArrowRight,
  StickyNote,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Calendar,
  User,
} from 'lucide-react'

const typeConfig = {
  column_change: {
    icon: ArrowRight,
    color: 'text-blue-600 bg-blue-50',
    label: 'Changement colonne',
  },
  note: {
    icon: StickyNote,
    color: 'text-yellow-600 bg-yellow-50',
    label: 'Note',
  },
  manual_message: {
    icon: MessageSquare,
    color: 'text-purple-600 bg-purple-50',
    label: 'Message envoye',
  },
  email_sent: {
    icon: Mail,
    color: 'text-blue-600 bg-blue-50',
    label: 'Email envoye',
  },
  email_opened: {
    icon: Mail,
    color: 'text-emerald-600 bg-emerald-50',
    label: 'Email ouvert',
  },
  reply_received: {
    icon: MessageSquare,
    color: 'text-accent bg-accent/10',
    label: 'Reponse recue',
  },
  meeting_booked: {
    icon: Calendar,
    color: 'text-orange-600 bg-orange-50',
    label: 'RDV pris',
  },
  won: {
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-50',
    label: 'Gagne',
  },
  lost: {
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
    label: 'Perdu',
  },
  call: {
    icon: Phone,
    color: 'text-orange-600 bg-orange-50',
    label: 'Appel',
  },
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr.toDate?.() || new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'A l\'instant'
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function LeadTimeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <StickyNote className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">Aucune activite enregistree</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
      <div className="space-y-4">
        {events.map((event, i) => {
          const config = typeConfig[event.type] || {
            icon: User,
            color: 'text-gray-600 bg-gray-50',
            label: event.type,
          }
          const Icon = config.icon

          return (
            <div key={event.id || i} className="flex items-start gap-4 pl-0.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${config.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text">{config.label}</p>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {formatTimeAgo(event.createdAt)}
                  </span>
                </div>
                {event.content && (
                  <p className="text-sm text-text-muted mt-0.5">{event.content}</p>
                )}
                {event.from && event.to && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {event.from} → {event.to}
                  </p>
                )}
                {event.channel && (
                  <p className="text-xs text-text-muted mt-0.5 capitalize">
                    Canal: {event.channel}
                  </p>
                )}
                {event.userName && (
                  <p className="text-xs text-text-muted mt-0.5">Par {event.userName}</p>
                )}
                {event.isPinned && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] rounded font-medium">
                    Epingle
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
