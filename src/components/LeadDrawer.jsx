import { motion, AnimatePresence } from 'framer-motion'
import FocusTrap from 'focus-trap-react'
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
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  Check,
  XCircle,
} from 'lucide-react'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'

const statusLabels = {
  new: { label: 'Nouveau', class: 'badge-info' },
  contacted: { label: 'Contacte', class: 'badge-warning' },
  opened: { label: 'A ouvert', class: 'badge-warning' },
  replied: { label: 'A repondu', class: 'badge-success' },
  converted: { label: 'Converti', class: 'badge-success' },
  lost: { label: 'Perdu', class: 'badge-danger' },
  archived: { label: 'Archive', class: 'badge-danger' },
}

// Channel icon component
const ChannelIcon = ({ channel, className = "w-4 h-4" }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    facebook_dm: MessageSquare,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
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
        <FocusTrap
          focusTrapOptions={{
            allowOutsideClick: true,
            escapeDeactivates: true,
            returnFocusOnDeactivate: true,
          }}
        >
          <div>
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
              role="dialog"
              aria-modal="true"
              aria-label={`Détails du lead ${lead.firstName} ${lead.lastName}`}
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

              {/* Channels available */}
              {lead.channels && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
                    Canaux disponibles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(lead.channels).map(([channel, config]) => {
                      const style = CHANNEL_STYLES[channel]
                      if (!style) return null
                      const isAvailable = config?.available
                      return (
                        <div
                          key={channel}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                            isAvailable
                              ? `${style.bg} ${style.border}`
                              : 'bg-dark-800/30 border-dark-700'
                          }`}
                        >
                          <ChannelIcon channel={channel} className={`w-4 h-4 ${isAvailable ? style.color : 'text-dark-500'}`} />
                          <span className={`text-xs font-medium ${isAvailable ? 'text-white' : 'text-dark-500'}`}>
                            {style.label}
                          </span>
                          {isAvailable ? (
                            <Check className="w-3 h-3 text-brand-400" />
                          ) : (
                            <XCircle className="w-3 h-3 text-dark-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex gap-2">
                <button className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                  <Send className="w-4 h-4" />
                  Envoyer un email
                </button>
              </div>

              {/* Reply received */}
              {lead.reply && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-400" />
                    Reponse recue
                  </h3>
                  <div className={`p-4 rounded-xl border ${CHANNEL_STYLES[lead.reply.channel]?.bg || 'bg-brand-500/10'} ${CHANNEL_STYLES[lead.reply.channel]?.border || 'border-brand-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ChannelIcon
                        channel={lead.reply.channel}
                        className={`w-4 h-4 ${CHANNEL_STYLES[lead.reply.channel]?.color || 'text-brand-400'}`}
                      />
                      <span className={`text-sm font-medium ${CHANNEL_STYLES[lead.reply.channel]?.color || 'text-brand-400'}`}>
                        Via {CHANNEL_STYLES[lead.reply.channel]?.label || 'Email'}
                      </span>
                      <span className="text-xs text-dark-500 ml-auto">{lead.reply.timeAgo}</span>
                    </div>
                    <p className="text-sm text-white italic">"{lead.reply.content}"</p>
                  </div>
                </div>
              )}

              {/* Multichannel Sequence Timeline */}
              {lead.sequence?.steps && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">
                    Sequence multicanale
                  </h3>
                  <div className="relative">
                    {lead.sequence.steps.map((step, i) => {
                      const channelStyle = CHANNEL_STYLES[step.channel] || CHANNEL_STYLES.email
                      const isSent = step.status === 'sent'
                      const isCancelled = step.status === 'cancelled_reply'
                      const isPending = step.status === 'pending'

                      return (
                        <div key={i} className="flex gap-3 relative">
                          {/* Vertical line */}
                          {i < lead.sequence.steps.length - 1 && (
                            <div
                              className={`absolute top-10 left-4 w-0.5 h-8 ${
                                isSent ? channelStyle.bg.replace('/10', '/40') : 'bg-dark-700'
                              }`}
                            />
                          )}

                          {/* Icon */}
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSent ? channelStyle.bg :
                              isCancelled ? 'bg-dark-800 opacity-50' :
                              'bg-dark-800 border border-dashed border-dark-600'
                            } ${isSent ? `border ${channelStyle.border}` : ''}`}>
                              <ChannelIcon
                                channel={step.channel}
                                className={`w-4 h-4 ${
                                  isSent ? channelStyle.color :
                                  isCancelled ? 'text-dark-500' :
                                  'text-dark-500'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-6 ${isCancelled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isSent ? 'text-white' : 'text-dark-400'}`}>
                                {channelStyle.label}
                              </span>
                              <span className="text-xs text-dark-500">J+{step.day}</span>
                              {isSent && step.tracking?.opened && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">
                                  Lu
                                </span>
                              )}
                              {isSent && step.tracking?.delivered && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">
                                  Livre
                                </span>
                              )}
                              {isCancelled && (
                                <span className="px-1.5 py-0.5 rounded bg-dark-700 text-dark-400 text-xs line-through">
                                  Annule
                                </span>
                              )}
                            </div>
                            {step.label && (
                              <p className={`text-xs mt-0.5 ${isSent ? 'text-dark-400' : 'text-dark-500'}`}>
                                {step.label}
                              </p>
                            )}
                            {step.sentAt && (
                              <p className="text-xs text-dark-500 mt-1">
                                Envoye le {format(new Date(step.sentAt), 'd MMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Legacy Timeline (fallback) */}
              {!lead.sequence?.steps && timeline.length > 0 && (
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
              )}

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
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  )
}
