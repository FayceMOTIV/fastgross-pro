import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Mail,
  Eye,
  MousePointerClick,
  MessageSquare,
  UserPlus,
  Scan,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

const eventConfig = {
  email_sent: { icon: Mail, color: 'brand', label: 'Email envoyé' },
  email_opened: { icon: Eye, color: 'blue', label: 'Email ouvert' },
  email_clicked: { icon: MousePointerClick, color: 'amber', label: 'Lien cliqué' },
  email_replied: { icon: MessageSquare, color: 'green', label: 'Réponse reçue' },
  lead_added: { icon: UserPlus, color: 'purple', label: 'Nouveau lead' },
  scan_completed: { icon: Scan, color: 'brand', label: 'Scan terminé' },
  report_generated: { icon: FileText, color: 'purple', label: 'Rapport généré' },
  error: { icon: AlertCircle, color: 'red', label: 'Erreur' },
  success: { icon: CheckCircle, color: 'brand', label: 'Succès' },
}

export default function ActivityFeed({ activities = [], maxItems = 10 }) {
  const displayActivities = activities.slice(0, maxItems)

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-500 text-sm">Aucune activité récente</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {displayActivities.map((activity, i) => {
        const config = eventConfig[activity.type] || eventConfig.success
        const Icon = config.icon

        const timestamp = activity.timestamp?.toDate
          ? activity.timestamp.toDate()
          : activity.timestamp instanceof Date
          ? activity.timestamp
          : new Date(activity.timestamp)

        return (
          <div
            key={activity.id || i}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-800/30 transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-lg bg-${config.color}-500/10 flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-4 h-4 text-${config.color}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                {activity.message || config.label}
              </p>
              {activity.details && (
                <p className="text-xs text-dark-500 truncate mt-0.5">
                  {activity.details}
                </p>
              )}
            </div>
            <span className="text-xs text-dark-500 flex-shrink-0">
              {formatDistanceToNow(timestamp, { addSuffix: true, locale: fr })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
