/**
 * WhatsApp Dashboard
 * Monitor WhatsApp automation - checker status, message stats, prospect list
 */

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  MessageCircle,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  TrendingUp,
  Users,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  Zap,
  Calendar,
  ArrowUpRight,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'

export default function WhatsAppDashboard() {
  const { currentOrg } = useOrg()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    withPhone: 0,
    whatsappActive: 0,
    contacted: 0,
    replied: 0,
    messagesSentToday: 0,
    conversionRate: 0,
  })
  const [prospects, setProspects] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [sendingTo, setSendingTo] = useState(null)

  const functions = getFunctions(undefined, 'europe-west1')

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!currentOrg?.id) return

    try {
      const getWhatsAppStats = httpsCallable(functions, 'getWhatsAppStats')
      const result = await getWhatsAppStats({ orgId: currentOrg.id })
      setStats(result.data)
    } catch (error) {
      console.error('Error fetching WhatsApp stats:', error)
      // Fallback to local calculation
      try {
        const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')

        const [withPhoneSnap, activeSnap, contactedSnap, repliedSnap] = await Promise.all([
          getDocs(query(prospectsRef, where('phone', '!=', null), limit(1000))),
          getDocs(query(prospectsRef, where('whatsappActive', '==', true), limit(1000))),
          getDocs(query(prospectsRef, where('whatsappStatus', '==', 'contacted'), limit(1000))),
          getDocs(query(prospectsRef, where('whatsappStatus', '==', 'replied'), limit(1000))),
        ])

        const contacted = contactedSnap.size
        const replied = repliedSnap.size

        setStats({
          withPhone: withPhoneSnap.size,
          whatsappActive: activeSnap.size,
          contacted,
          replied,
          messagesSentToday: 0,
          conversionRate: contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : 0,
        })
      } catch (err) {
        console.error('Fallback stats error:', err)
      }
    }
  }, [currentOrg?.id, functions])

  // Fetch prospects
  const fetchProspects = useCallback(async () => {
    if (!currentOrg?.id) return

    try {
      const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')
      let q = query(prospectsRef, where('phone', '!=', null), orderBy('phone'), limit(100))

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))

      setProspects(data)
    } catch (error) {
      console.error('Error fetching prospects:', error)
      toast.error('Erreur lors du chargement des prospects')
    }
  }, [currentOrg?.id])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchProspects()])
      setLoading(false)
    }
    loadData()
  }, [fetchStats, fetchProspects])

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchProspects()])
    setRefreshing(false)
    toast.success('Donnees actualisees')
  }

  // Send manual WhatsApp message
  const handleSendWhatsApp = async (prospect) => {
    if (!prospect.phone || !prospect.whatsappActive) {
      toast.error('Ce prospect ne peut pas recevoir de WhatsApp')
      return
    }

    setSendingTo(prospect.id)

    try {
      const sendWhatsAppManual = httpsCallable(functions, 'sendWhatsAppManual')

      // Default message
      const firstName = prospect.fullName?.split(' ')[0] || prospect.full_name?.split(' ')[0] || prospect.username || ''
      const message = `Salut ${firstName} !\n\nJ'ai vu ton profil et je pense que Face Media Factory pourrait t'interesser.\n\nOn automatise la prospection sur Instagram, TikTok et LinkedIn pour trouver des clients 24/7.\n\nTu veux en savoir plus ?\n\nFaical\nFace Media Factory`

      await sendWhatsAppManual({
        phone: prospect.phone,
        message,
        orgId: currentOrg.id,
        prospectId: prospect.id,
      })

      toast.success(`WhatsApp envoye a ${prospect.phone}`)

      // Refresh prospects to show updated status
      await fetchProspects()
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      toast.error("Erreur lors de l'envoi du WhatsApp")
    } finally {
      setSendingTo(null)
    }
  }

  // Filter prospects
  const filteredProspects = prospects.filter((p) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        p.phone?.toLowerCase().includes(search) ||
        p.username?.toLowerCase().includes(search) ||
        p.fullName?.toLowerCase().includes(search) ||
        p.full_name?.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }

    // Status filter
    switch (filter) {
      case 'verified':
        return p.whatsappStatus === 'verified'
      case 'contacted':
        return p.whatsappStatus === 'contacted'
      case 'replied':
        return p.whatsappStatus === 'replied'
      case 'no_whatsapp':
        return p.whatsappStatus === 'no_whatsapp'
      case 'unchecked':
        return !p.whatsappChecked
      default:
        return true
    }
  })

  const getStatusBadge = (status) => {
    const badges = {
      verified: { label: 'Verifie', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      contacted: { label: 'Contacte', color: 'bg-blue-100 text-blue-700', icon: Send },
      replied: { label: 'Repondu', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
      no_whatsapp: { label: 'Pas WA', color: 'bg-gray-100 text-gray-600', icon: XCircle },
      error: { label: 'Erreur', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    }
    return badges[status] || { label: 'Non verifie', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement WhatsApp...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-green-600" />
            WhatsApp Automation
          </h1>
          <p className="text-gray-500 mt-1">
            Verification et envoi automatise via Evolution API
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Phone}
          label="Avec telephone"
          value={stats.withPhone}
          color="indigo"
        />
        <StatCard
          icon={CheckCircle2}
          label="WhatsApp actif"
          value={stats.whatsappActive}
          color="green"
        />
        <StatCard
          icon={Send}
          label="Contactes"
          value={stats.contacted}
          color="blue"
        />
        <StatCard
          icon={MessageSquare}
          label="Reponses"
          value={stats.replied}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          label="Envoyes aujourd'hui"
          value={stats.messagesSentToday}
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Taux reponse"
          value={`${stats.conversionRate}%`}
          color="emerald"
        />
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Evolution API (Gratuit)</h3>
            <p className="text-green-700 text-sm mt-1">
              WhatsApp automation 100% gratuite via Evolution API self-hosted.
              Verification des numeros a 2h du matin, envois toutes les heures (max 10/h, 50/jour).
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                Checker: 2h quotidien
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                Sender: Horaire (9h-22h)
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                Limite: 10/h, 50/jour
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par telephone, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">
              {filter === 'all' ? 'Tous les statuts' : getStatusBadge(filter).label}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl border shadow-lg z-10">
              {[
                { value: 'all', label: 'Tous les statuts' },
                { value: 'verified', label: 'Verifies' },
                { value: 'contacted', label: 'Contactes' },
                { value: 'replied', label: 'Ont repondu' },
                { value: 'no_whatsapp', label: 'Sans WhatsApp' },
                { value: 'unchecked', label: 'Non verifies' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilter(option.value)
                    setFilterOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                    filter === option.value ? 'text-green-600 bg-green-50' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prospects Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Prospect
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Telephone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Statut WA
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Dernier contact
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucun prospect trouve</p>
                    <p className="text-sm mt-1">
                      {searchTerm || filter !== 'all'
                        ? 'Essayez de modifier vos filtres'
                        : 'Les prospects avec telephone apparaitront ici'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProspects.map((prospect) => {
                  const status = getStatusBadge(prospect.whatsappStatus)
                  const StatusIcon = status.icon

                  return (
                    <tr key={prospect.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                            {(prospect.fullName || prospect.full_name || prospect.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {prospect.fullName || prospect.full_name || prospect.username || 'Inconnu'}
                            </p>
                            <p className="text-sm text-gray-500">
                              @{prospect.username || 'N/A'} - {prospect.platform || 'Instagram'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 font-mono text-sm">{prospect.phone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {prospect.whatsappContactedAt ? (
                          <span className="text-sm text-gray-600">
                            {new Date(prospect.whatsappContactedAt.seconds * 1000).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleSendWhatsApp(prospect)}
                          disabled={
                            !prospect.whatsappActive ||
                            prospect.whatsappStatus === 'contacted' ||
                            sendingTo === prospect.id
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            prospect.whatsappActive && prospect.whatsappStatus !== 'contacted'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {sendingTo === prospect.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Envoi...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Envoyer
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredProspects.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            Affichage de {filteredProspects.length} prospect{filteredProspects.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
