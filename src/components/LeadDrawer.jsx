import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  X,
  Mail,
  Phone,
  Building2,
  Globe,
  Calendar,
  MessageSquare,
  Eye,
  MousePointerClick,
  Send,
  Edit3,
  Trash2,
  ExternalLink,
} from 'lucide-react'

const statusLabels = {
  new: { label: 'Nouveau', class: 'badge-info' },
  contacted: { label: 'Contacté', class: 'badge-warning' },
  opened: { label: 'A ouvert', class: 'badge-warning' },
  replied: { label: 'A répondu', class: 'badge-success' },
  converted: { label: 'Converti', class: 'badge-success' },
  lost: { label: 'Perdu', class: 'badge-danger' },
}

const scoreColor = (score) => {
  if (score >= 8) return 'text-brand-400 bg-brand-500/15'
  if (score >= 5) return 'text-amber-400 bg-amber-500/15'
  return 'text-dark-400 bg-dark-800'
}

export default function LeadDrawer({ lead, isOpen, onClose, activities = [] }) {
  if (!lead) return null

  const status = statusLabels[lead.status] || statusLabels.new

  // Mock timeline data
  const timeline = activities.length > 0 ? activities : [
    { type: 'created', label: 'Lead créé', date: lead.createdAt },
    ...(lead.status !== 'new' ? [{ type: 'email_sent', label: 'Email envoyé', date: lead.lastContactedAt }] : []),
    ...(lead.status === 'opened' || lead.status === 'replied' ? [{ type: 'email_opened', label: 'Email ouvert', date: new Date() }] : []),
    ...(lead.status === 'replied' ? [{ type: 'email_replied', label: 'Réponse reçue', date: new Date() }] : []),
  ].filter(Boolean)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-dark-900 border-l border-dark-800 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-dark-900/90 backdrop-blur-lg border-b border-dark-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost text-sm flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" />
                    Modifier
                  </button>
                  <button className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400/20 to-blue-400/20 flex items-center justify-center text-2xl font-display font-bold text-brand-400">
                  {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-display font-bold text-white">
                    {lead.firstName} {lead.lastName}
                  </h2>
                  {lead.jobTitle && (
                    <p className="text-sm text-dark-400">{lead.jobTitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <span className={status.class}>{status.label}</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${scoreColor(lead.score)}`}>
                  Score: {lead.score}/10
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Contact info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
                  Contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/30">
                    <Mail className="w-4 h-4 text-dark-500" />
                    <a href={`mailto:${lead.email}`} className="text-sm text-white hover:text-brand-400 transition-colors">
                      {lead.email}
                    </a>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/30">
                      <Phone className="w-4 h-4 text-dark-500" />
                      <a href={`tel:${lead.phone}`} className="text-sm text-white hover:text-brand-400 transition-colors">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/30">
                      <Building2 className="w-4 h-4 text-dark-500" />
                      <span className="text-sm text-white">{lead.company}</span>
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/30">
                      <Globe className="w-4 h-4 text-dark-500" />
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white hover:text-brand-400 transition-colors flex items-center gap-1"
                      >
                        {lead.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                  <Send className="w-4 h-4" />
                  Envoyer un email
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
                  Historique
                </h3>
                <div className="space-y-4">
                  {timeline.map((event, i) => {
                    const eventIcons = {
                      created: Calendar,
                      email_sent: Send,
                      email_opened: Eye,
                      email_clicked: MousePointerClick,
                      email_replied: MessageSquare,
                    }
                    const Icon = eventIcons[event.type] || Calendar

                    return (
                      <div key={i} className="flex gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-dark-500" />
                          </div>
                          {i < timeline.length - 1 && (
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-6 bg-dark-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm text-white">{event.label}</p>
                          {event.date && (
                            <p className="text-xs text-dark-500 mt-0.5">
                              {event.date?.toDate
                                ? formatDistanceToNow(event.date.toDate(), { addSuffix: true, locale: fr })
                                : event.date instanceof Date
                                ? formatDistanceToNow(event.date, { addSuffix: true, locale: fr })
                                : 'Date inconnue'}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
                    Notes
                  </h3>
                  <p className="text-sm text-dark-300 bg-dark-800/30 p-4 rounded-lg">
                    {lead.notes}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
