import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FocusTrap from 'focus-trap-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
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
  Ban,
  StickyNote,
  Activity,
  TrendingUp,
  Linkedin,
  PauseCircle,
  PlayCircle,
} from 'lucide-react'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'
import ConversationTimeline from './ConversationTimeline'
import ManualReplyBox from './ManualReplyBox'
import toast from 'react-hot-toast'

const statusLabels = {
  new: { label: 'Nouveau', class: 'bg-blue-100 text-blue-700 border border-blue-200' },
  contacted: { label: 'Contacte', class: 'bg-amber-100 text-amber-700 border border-amber-200' },
  opened: { label: 'A ouvert', class: 'bg-amber-100 text-amber-700 border border-amber-200' },
  replied: {
    label: 'A repondu',
    class: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  converted: {
    label: 'Converti',
    class: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  lost: { label: 'Perdu', class: 'bg-red-100 text-red-700 border border-red-200' },
  archived: { label: 'Archive', class: 'bg-gray-100 text-gray-600 border border-gray-200' },
}

const CRM_COLUMN_LABELS = {
  NEW: { label: 'Nouveau', class: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Contacte', class: 'bg-amber-100 text-amber-700' },
  INTERESTED: { label: 'Interesse', class: 'bg-purple-100 text-purple-700' },
  MEETING: { label: 'RDV', class: 'bg-indigo-100 text-indigo-700' },
  SIGNED: { label: 'Signe', class: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'Perdu', class: 'bg-gray-100 text-gray-600' },
}

const ChannelIcon = ({ channel, className = 'w-4 h-4' }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    instagram: Instagram,
    facebook_dm: MessageSquare,
    linkedin: Linkedin,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
}

function scoreColor(score) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100'
  if (score >= 60) return 'text-amber-700 bg-amber-100'
  if (score >= 40) return 'text-orange-700 bg-orange-100'
  return 'text-gray-600 bg-gray-100'
}

function ScoreDetail({ score }) {
  const normalizedScore = score <= 10 ? score * 10 : score
  const pct = Math.min(100, Math.max(0, normalizedScore))
  const barColor =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
        ? 'bg-amber-500'
        : pct >= 40
          ? 'bg-orange-500'
          : 'bg-gray-400'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Score global</span>
        <span className={`text-sm font-bold px-2 py-0.5 rounded ${scoreColor(normalizedScore)}`}>
          {normalizedScore}/100
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function LeadDrawer({
  lead,
  isOpen,
  onClose,
  activities = [],
  onBlacklist,
  onNoteSave,
}) {
  const { currentOrg } = useOrg()
  const [notes, setNotes] = useState('')
  const [showBlacklistConfirm, setShowBlacklistConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [alexPaused, setAlexPaused] = useState(false)
  const notesTimerRef = useRef(null)

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || lead.agentNotes || '')
      setAlexPaused(lead.alexPaused === true)
      setActiveTab('details')
    }
  }, [lead])

  const toggleAlexPause = async () => {
    if (!currentOrg?.id || !lead?.id) return
    const newVal = !alexPaused
    setAlexPaused(newVal)
    try {
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'prospects', lead.id), {
        alexPaused: newVal,
      })
      toast.success(newVal ? 'Alex en pause' : 'Alex reactive')
    } catch (err) {
      setAlexPaused(!newVal)
      toast.error('Erreur: ' + err.message)
    }
  }

  // Auto-save notes with debounce
  const handleNotesChange = useCallback(
    (value) => {
      setNotes(value)
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
      notesTimerRef.current = setTimeout(() => {
        onNoteSave?.(lead?.id, value)
      }, 1500)
    },
    [lead, onNoteSave]
  )

  if (!lead) return null

  const status = statusLabels[lead.status] || statusLabels.new
  const crmCol = CRM_COLUMN_LABELS[lead.crmColumn] || null
  const normalizedScore = (lead.score ?? 0) <= 10 ? (lead.score ?? 0) * 10 : (lead.score ?? 0)

  const timeline =
    activities.length > 0
      ? activities
      : [
          { type: 'created', label: 'Lead cree', date: lead.createdAt },
          ...(lead.status !== 'new'
            ? [{ type: 'email_sent', label: 'Email envoye', date: lead.lastContactedAt }]
            : []),
          ...(lead.status === 'opened' || lead.status === 'replied'
            ? [{ type: 'email_opened', label: 'Email ouvert', date: new Date() }]
            : []),
          ...(lead.status === 'replied'
            ? [{ type: 'email_replied', label: 'Reponse recue', date: new Date() }]
            : []),
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
              className="fixed inset-0 z-40 bg-black/20"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white border-l border-gray-200 overflow-y-auto shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label={`Details du lead ${lead.firstName} ${lead.lastName}`}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost text-sm flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-2xl font-display font-bold text-indigo-600">
                    {lead.firstName?.charAt(0)}
                    {lead.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-display font-bold text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </h2>
                    {lead.jobTitle && <p className="text-sm text-gray-500">{lead.jobTitle}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {crmCol && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${crmCol.class}`}>
                      {crmCol.label}
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.class}`}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Alex Pause Badge + Tabs */}
              <div className="px-6 pt-3 pb-0 flex items-center gap-3 border-b border-gray-100">
                <button
                  onClick={toggleAlexPause}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    alexPaused
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                >
                  {alexPaused ? (
                    <>
                      <PauseCircle className="w-3.5 h-3.5" />
                      Alex en pause
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      Alex actif
                    </>
                  )}
                </button>
                <div className="flex-1" />
                {['details', 'conversation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 px-1 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'details' ? 'Details' : 'Conversation'}
                  </button>
                ))}
              </div>

              {/* Conversation Tab */}
              {activeTab === 'conversation' && (
                <div className="p-4 flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
                  <ConversationTimeline prospectId={lead.id} className="flex-1 overflow-y-auto" />
                  <ManualReplyBox prospect={lead} />
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="p-6 space-y-6">
                  {/* Score detail */}
                  <ScoreDetail score={lead.score ?? 0} />

                  {/* Contact info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Contact
                    </h3>
                    <div className="space-y-2">
                      <ContactRow icon={Mail} label={lead.email} href={`mailto:${lead.email}`} />
                      {lead.phone && (
                        <ContactRow icon={Phone} label={lead.phone} href={`tel:${lead.phone}`} />
                      )}
                      {lead.company && <ContactRow icon={Building2} label={lead.company} />}
                      {lead.website && (
                        <ContactRow
                          icon={Globe}
                          label={lead.website?.replace(/^https?:\/\//, '')}
                          href={lead.website}
                          external
                        />
                      )}
                      {lead.linkedin && (
                        <ContactRow
                          icon={Linkedin}
                          label="Profil LinkedIn"
                          href={lead.linkedin}
                          external
                        />
                      )}
                    </div>
                  </div>

                  {/* Channels available */}
                  {lead.channels && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                                  ? 'bg-white border-gray-200 shadow-sm'
                                  : 'bg-gray-50 border-gray-100'
                              }`}
                            >
                              <ChannelIcon
                                channel={channel}
                                className={`w-4 h-4 ${isAvailable ? 'text-indigo-500' : 'text-gray-300'}`}
                              />
                              <span
                                className={`text-xs font-medium ${isAvailable ? 'text-gray-700' : 'text-gray-400'}`}
                              >
                                {style.label}
                              </span>
                              {isAvailable ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-gray-300" />
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

                  {/* Blacklist button */}
                  <div className="space-y-2">
                    {!showBlacklistConfirm ? (
                      <button
                        onClick={() => setShowBlacklistConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        Blacklister ce contact
                      </button>
                    ) : (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-2">
                        <p className="text-xs text-red-700">
                          Conformement au RGPD, ce contact sera ajoute a la liste de suppression et
                          ne sera plus jamais contacte.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onBlacklist?.(lead.id)
                              setShowBlacklistConfirm(false)
                            }}
                            className="flex-1 text-xs py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => setShowBlacklistConfirm(false)}
                            className="flex-1 text-xs py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply received */}
                  {lead.reply && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Reponse recue
                      </h3>
                      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ChannelIcon
                            channel={lead.reply.channel}
                            className="w-4 h-4 text-indigo-500"
                          />
                          <span className="text-sm font-medium text-indigo-700">
                            Via {CHANNEL_STYLES[lead.reply.channel]?.label || 'Email'}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {lead.reply.timeAgo}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 italic">
                          &quot;{lead.reply.content}&quot;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Multichannel Sequence Timeline */}
                  {lead.sequence?.steps && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Sequence multicanale
                      </h3>
                      <div className="relative">
                        {lead.sequence.steps.map((step, i) => {
                          const channelStyle = CHANNEL_STYLES[step.channel] || CHANNEL_STYLES.email
                          const isSent = step.status === 'sent'
                          const isCancelled = step.status === 'cancelled_reply'

                          return (
                            <div key={i} className="flex gap-3 relative">
                              {i < lead.sequence.steps.length - 1 && (
                                <div
                                  className={`absolute top-10 left-4 w-0.5 h-8 ${
                                    isSent ? 'bg-indigo-200' : 'bg-gray-200'
                                  }`}
                                />
                              )}
                              <div className="relative z-10">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    isSent
                                      ? 'bg-indigo-100 border border-indigo-200'
                                      : isCancelled
                                        ? 'bg-gray-100 opacity-50'
                                        : 'bg-white border border-dashed border-gray-300'
                                  }`}
                                >
                                  <ChannelIcon
                                    channel={step.channel}
                                    className={`w-4 h-4 ${
                                      isSent ? 'text-indigo-600' : 'text-gray-400'
                                    }`}
                                  />
                                </div>
                              </div>
                              <div className={`flex-1 pb-6 ${isCancelled ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm font-medium ${isSent ? 'text-gray-900' : 'text-gray-400'}`}
                                  >
                                    {channelStyle.label}
                                  </span>
                                  <span className="text-xs text-gray-400">J+{step.day}</span>
                                  {isSent && step.tracking?.opened && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">
                                      Lu
                                    </span>
                                  )}
                                  {isSent && step.tracking?.delivered && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                                      Livre
                                    </span>
                                  )}
                                  {isCancelled && (
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs line-through">
                                      Annule
                                    </span>
                                  )}
                                </div>
                                {step.label && (
                                  <p
                                    className={`text-xs mt-0.5 ${isSent ? 'text-gray-500' : 'text-gray-400'}`}
                                  >
                                    {step.label}
                                  </p>
                                )}
                                {step.sentAt && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Envoye le{' '}
                                    {format(new Date(step.sentAt), 'd MMM yyyy', { locale: fr })}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Legacy Timeline */}
                  {!lead.sequence?.steps && timeline.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" />
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
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-gray-500" />
                                </div>
                                {i < timeline.length - 1 && (
                                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-6 bg-gray-200" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="text-sm text-gray-900">{event.label}</p>
                                {event.date && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {event.date?.toDate
                                      ? formatDistanceToNow(event.date.toDate(), {
                                          addSuffix: true,
                                          locale: fr,
                                        })
                                      : event.date instanceof Date
                                        ? formatDistanceToNow(event.date, {
                                            addSuffix: true,
                                            locale: fr,
                                          })
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

                  {/* Notes (auto-save) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <StickyNote className="w-4 h-4" />
                      Notes
                    </h3>
                    <textarea
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Ajoutez des notes sur ce prospect..."
                      rows={3}
                      className="input-field w-full text-sm resize-none"
                    />
                    <p className="text-[10px] text-gray-400">Sauvegarde automatique</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  )
}

function ContactRow({ icon: Icon, label, href, external }) {
  if (!label) return null

  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm text-gray-700 flex-1 truncate">{label}</span>
      {external && <ExternalLink className="w-3 h-3 text-gray-400" />}
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block"
      >
        {content}
      </a>
    )
  }

  return content
}
