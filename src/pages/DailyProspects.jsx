import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp, limit } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  RefreshCw, Calendar, Phone, Mail, Zap, Send,
  CheckCircle, Clock, AlertCircle, ExternalLink,
  Users, MessageSquare, Target, TrendingUp
} from 'lucide-react'

export default function DailyProspects() {
  const { currentOrg } = useOrg()
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({ total: 0, withPhone: 0, withEmail: 0, contacted: 0, ready: 0 })
  const [sending, setSending] = useState({})
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (currentOrg?.id) {
      loadProspects()
    }
  }, [selectedDate, currentOrg?.id])

  const loadProspects = async () => {
    if (!currentOrg?.id) return

    setLoading(true)
    try {
      // Query prospects from organization subcollection
      // The autopilot stores prospects with status: found, scraped, no_email, scored, ready
      const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')

      // Get prospects from selected date (using createdAt timestamp range)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const q = query(
        prospectsRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('createdAt', 'desc'),
        limit(100)
      )

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))

      setProspects(data)

      // Calculate stats
      const statsData = {
        total: data.length,
        withPhone: data.filter(p => p.phone).length,
        withEmail: data.filter(p => p.emails && p.emails.length > 0).length,
        contacted: data.filter(p => p.sentVia || p.status === 'contacted').length,
        ready: data.filter(p => p.status === 'ready').length
      }
      setStats(statsData)

    } catch (error) {
      console.error('Error loading prospects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendWhatsApp = async (prospect) => {
    if (!prospect.phone) {
      alert('Ce prospect n\'a pas de numero de telephone')
      return
    }

    if (!window.confirm(`Envoyer un message WhatsApp a ${prospect.name || prospect.contactName || 'ce prospect'} (${prospect.phone}) ?`)) {
      return
    }

    setSending(prev => ({ ...prev, [prospect.id]: true }))

    try {
      const sendWhatsApp = httpsCallable(functions, 'sendWhatsAppToProspect')

      await sendWhatsApp({
        prospectId: prospect.id,
        orgId: currentOrg.id
      })

      alert('Message WhatsApp envoye avec succes !')
      loadProspects()
    } catch (error) {
      console.error('WhatsApp send error:', error)
      alert('Erreur lors de l\'envoi: ' + error.message)
    } finally {
      setSending(prev => ({ ...prev, [prospect.id]: false }))
    }
  }

  const filteredProspects = statusFilter === 'all'
    ? prospects
    : prospects.filter(p => p.status === statusFilter)

  const getStatusBadge = (status) => {
    const badges = {
      found: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Trouve' },
      scraped: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Scrape' },
      no_email: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pas d\'email' },
      scored: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Score' },
      ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pret' },
      contacted: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Contacte' }
    }
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Daily Prospects
          </h1>
          <p className="text-gray-600 mt-1">
            Prospects generes par l'autopilot a 9h chaque jour
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 bg-transparent focus:ring-0 text-sm"
            />
          </div>

          <button
            onClick={loadProspects}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.withPhone}</p>
              <p className="text-xs text-gray-500">Avec phone</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.withEmail}</p>
              <p className="text-xs text-gray-500">Avec email</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
              <p className="text-xs text-gray-500">Prets</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.contacted}</p>
              <p className="text-xs text-gray-500">Contactes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'ready', 'scored', 'scraped', 'found', 'contacted'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === filter
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter === 'all' ? 'Tous' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Prospects List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-600">Chargement des prospects...</p>
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun prospect pour cette date
          </h3>
          <p className="text-gray-600 mb-4">
            L'autopilot tourne automatiquement chaque jour a 9h du matin.<br/>
            Les prospects apparaitront apres la prochaine execution.
          </p>
          <a
            href="/app/test-autopilot"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            <Zap className="w-4 h-4" />
            Tester l'autopilot manuellement
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProspects.map((prospect) => (
            <div
              key={prospect.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-6">
                {/* Info principale */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {prospect.name || prospect.contactName || prospect.domain || 'Prospect'}
                      </h3>
                      {prospect.url && (
                        <a
                          href={prospect.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {prospect.domain || prospect.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {prospect.score > 0 && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Score: {prospect.score}
                        </span>
                      )}
                      {getStatusBadge(prospect.status)}
                    </div>
                  </div>

                  {/* Snippet/Description */}
                  {prospect.snippet && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {prospect.snippet}
                    </p>
                  )}

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Phone className="w-3 h-3" />
                        Telephone
                      </div>
                      <p className="font-mono text-sm">
                        {prospect.phone ? (
                          <span className="text-green-600">{prospect.phone}</span>
                        ) : (
                          <span className="text-gray-400">Non trouve</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Mail className="w-3 h-3" />
                        Email
                      </div>
                      <p className="font-mono text-sm truncate">
                        {prospect.emails && prospect.emails.length > 0 ? (
                          <span className="text-green-600">{prospect.emails[0]}</span>
                        ) : (
                          <span className="text-gray-400">Non trouve</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Generated Email Preview */}
                  {prospect.generatedEmail && prospect.generatedEmail.subject && (
                    <div className="border border-indigo-100 bg-indigo-50/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Email genere par AI
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Sujet: {prospect.generatedEmail.subject}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {prospect.generatedEmail.body}
                      </p>
                    </div>
                  )}

                  {/* Score Details */}
                  {prospect.scoreDetails && Object.keys(prospect.scoreDetails).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {prospect.scoreDetails.hasWebsite && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                          Site web
                        </span>
                      )}
                      {prospect.scoreDetails.emailType && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                          Email {prospect.scoreDetails.emailType}
                        </span>
                      )}
                      {prospect.scoreDetails.hasVideo === false && (
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs">
                          Pas de video
                        </span>
                      )}
                      {prospect.scoreDetails.hasInstagram && (
                        <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded text-xs">
                          Instagram
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {prospect.phone && !prospect.sentVia && prospect.status !== 'contacted' ? (
                    <button
                      onClick={() => handleSendWhatsApp(prospect)}
                      disabled={sending[prospect.id]}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {sending[prospect.id] ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          WhatsApp
                        </>
                      )}
                    </button>
                  ) : prospect.sentVia ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Envoye
                    </div>
                  ) : !prospect.phone ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                      <Phone className="w-4 h-4" />
                      Pas de phone
                    </div>
                  ) : null}

                  {prospect.emails && prospect.emails.length > 0 && (
                    <a
                      href={`mailto:${prospect.emails[0]}?subject=${encodeURIComponent(prospect.generatedEmail?.subject || '')}&body=${encodeURIComponent(prospect.generatedEmail?.body || '')}`}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Comment ca marche ?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <strong>09:00 AM</strong> : L'autopilot tourne automatiquement (Cloud Scheduler)
          </li>
          <li className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <strong>Recherche</strong> : Google CSE selon mots-cles configures
          </li>
          <li className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <strong>Scraping</strong> : Extraction emails et telephones des sites
          </li>
          <li className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <strong>Scoring</strong> : Score automatique (video, site, etc.)
          </li>
          <li className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <strong>AI</strong> : Generation email personnalise
          </li>
          <li className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <strong>Vous</strong> : Reviewez et envoyez WhatsApp (1 clic)
          </li>
        </ul>
      </div>
    </div>
  )
}
