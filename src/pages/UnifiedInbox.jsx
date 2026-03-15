/**
 * UnifiedInbox — Vue unifiee de toutes les conversations (email, SMS, WhatsApp, IG)
 *
 * Liste gauche: conversations groupees par prospect (onSnapshot replyFeeds + interactions)
 * Droite: timeline chronologique + input reponse + suggestion IA
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  Mail, MessageSquare, Phone, Instagram, Linkedin, Search,
  Send, Sparkles, Loader2, ChevronRight, ArrowLeft, User,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CHANNEL_CONFIG = {
  email:     { icon: Mail,           label: 'Email',    color: 'text-indigo-500', bg: 'bg-indigo-50' },
  sms:       { icon: MessageSquare,  label: 'SMS',      color: 'text-teal-500',  bg: 'bg-teal-50' },
  whatsapp:  { icon: Phone,          label: 'WhatsApp', color: 'text-green-500', bg: 'bg-green-50' },
  instagram: { icon: Instagram,      label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-50' },
  linkedin:  { icon: Linkedin,       label: 'LinkedIn', color: 'text-blue-600',  bg: 'bg-blue-50' },
}

const CHANNEL_TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'whatsapp', label: 'WA' },
  { key: 'instagram', label: 'IG' },
]

function relativeTime(ts) {
  if (!ts) return ''
  const date = ts?.toDate ? ts.toDate() : new Date(ts)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'maintenant'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}j`
}

function ChannelBadge({ channel }) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.email
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${config.bg} ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

export default function UnifiedInbox() {
  const { currentOrg } = useOrg()
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProspectId, setSelectedProspectId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyChannel, setReplyChannel] = useState('email')
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const messagesEndRef = useRef(null)

  // Load interactions (real-time)
  useEffect(() => {
    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'interactions'),
      orderBy('createdAt', 'desc'),
      limit(500)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setInteractions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('UnifiedInbox listener error:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Group interactions by prospect
  const conversations = useMemo(() => {
    const map = new Map()

    for (const item of interactions) {
      const pid = item.prospectId
      if (!pid) continue

      const channel = item.channel || item.type?.replace('_sent', '').replace('_received', '') || 'email'

      // Channel filter
      if (channelFilter !== 'all' && channel !== channelFilter) continue

      if (!map.has(pid)) {
        map.set(pid, {
          prospectId: pid,
          prospectName: item.prospectName || item.contactName || pid,
          company: item.companyName || item.company || '',
          channels: new Set(),
          messages: [],
          lastActivity: item.createdAt || item.sentAt,
          hasUnread: item.direction === 'inbound' && !item.read,
        })
      }

      const conv = map.get(pid)
      conv.channels.add(channel)
      conv.messages.push({
        ...item,
        channel,
        time: item.createdAt || item.sentAt,
      })

      // Track if any inbound unread
      if (item.direction === 'inbound' && !item.read) {
        conv.hasUnread = true
      }
    }

    // Sort conversations by last activity
    const result = Array.from(map.values())
    result.sort((a, b) => {
      const ta = a.lastActivity?.toDate ? a.lastActivity.toDate() : new Date(a.lastActivity || 0)
      const tb = b.lastActivity?.toDate ? b.lastActivity.toDate() : new Date(b.lastActivity || 0)
      return tb - ta
    })

    return result
  }, [interactions, channelFilter])

  // Filter by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      c.prospectName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    )
  }, [conversations, searchQuery])

  // Selected conversation messages (chronological)
  const selectedMessages = useMemo(() => {
    if (!selectedProspectId) return []
    const conv = conversations.find(c => c.prospectId === selectedProspectId)
    if (!conv) return []
    return [...conv.messages].sort((a, b) => {
      const ta = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0)
      const tb = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0)
      return ta - tb
    })
  }, [selectedProspectId, conversations])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessages.length])

  // Send reply
  const handleSend = useCallback(async () => {
    if (!replyText.trim() || !selectedProspectId || !currentOrg?.id) return
    setSending(true)
    try {
      const fn = httpsCallable(functions, 'replyToProspect')
      await fn({
        orgId: currentOrg.id,
        prospectId: selectedProspectId,
        channel: replyChannel,
        message: replyText.trim(),
      })
      toast.success(`Message ${replyChannel} envoye`)
      setReplyText('')
    } catch (e) {
      toast.error(e.message || 'Erreur d\'envoi')
    } finally {
      setSending(false)
    }
  }, [replyText, selectedProspectId, replyChannel, currentOrg?.id])

  // AI suggestion
  const handleSuggest = useCallback(async () => {
    if (!selectedProspectId || !currentOrg?.id) return
    setSuggesting(true)
    try {
      const fn = httpsCallable(functions, 'suggestInboxReply')
      const result = await fn({
        orgId: currentOrg.id,
        prospectId: selectedProspectId,
        lastMessages: selectedMessages.slice(-5).map(m => ({
          direction: m.direction,
          message: m.message || m.text || m.replyText || '',
        })),
      })
      if (result.data?.suggestion) {
        setReplyText(result.data.suggestion)
        toast.success('Suggestion IA generee')
      }
    } catch (e) {
      toast.error('Erreur IA: ' + (e.message || 'inconnue'))
    } finally {
      setSuggesting(false)
    }
  }, [selectedProspectId, currentOrg?.id, selectedMessages])

  const selectedConv = conversations.find(c => c.prospectId === selectedProspectId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Channel Tabs + Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          {CHANNEL_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setChannelFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                channelFilter === tab.key
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="input-field pl-9 py-1.5 text-sm w-full"
          />
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left: Conversation list */}
        <div className={`w-80 flex-shrink-0 card overflow-hidden flex flex-col ${
          selectedProspectId ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">
              {filteredConversations.length} conversation{filteredConversations.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map(conv => (
              <button
                key={conv.prospectId}
                onClick={() => setSelectedProspectId(conv.prospectId)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${
                  selectedProspectId === conv.prospectId ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {conv.hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.prospectName}
                      </p>
                    </div>
                    {conv.company && (
                      <p className="text-xs text-gray-500 truncate">{conv.company}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">
                      {relativeTime(conv.lastActivity)}
                    </span>
                    <div className="flex gap-0.5">
                      {Array.from(conv.channels).slice(0, 3).map(ch => {
                        const config = CHANNEL_CONFIG[ch]
                        if (!config) return null
                        const Icon = config.icon
                        return <Icon key={ch} className={`w-3 h-3 ${config.color}`} />
                      })}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                Aucune conversation
              </div>
            )}
          </div>
        </div>

        {/* Right: Conversation detail */}
        <div className={`flex-1 card overflow-hidden flex flex-col ${
          !selectedProspectId ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedProspectId && selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setSelectedProspectId(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{selectedConv.prospectName}</p>
                  {selectedConv.company && (
                    <p className="text-xs text-gray-500">{selectedConv.company}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {Array.from(selectedConv.channels).map(ch => (
                    <ChannelBadge key={ch} channel={ch} />
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedMessages.map(msg => {
                  const isOutbound = msg.direction === 'outbound'
                  const text = msg.message || msg.text || msg.replyText || msg.subject || ''

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOutbound
                          ? 'bg-accent text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{text}</p>
                        <div className={`flex items-center gap-2 mt-1 ${
                          isOutbound ? 'justify-end' : 'justify-start'
                        }`}>
                          <ChannelBadge channel={msg.channel} />
                          <span className={`text-xs ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>
                            {relativeTime(msg.time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={replyChannel}
                    onChange={e => setReplyChannel(e.target.value)}
                    className="input-field py-1.5 text-xs w-auto"
                  >
                    {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSuggest}
                    disabled={suggesting}
                    className="btn-ghost text-xs flex items-center gap-1 px-3 py-1.5"
                  >
                    {suggesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Suggerer IA
                  </button>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Votre message..."
                    rows={2}
                    className="input-field flex-1 text-sm resize-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                    className="btn-primary px-4 self-end flex items-center gap-1.5"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Selectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
