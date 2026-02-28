/**
 * ProspectTable - Table de prospects filtrable pour Social Outreach
 */

import { useState } from 'react'
import {
  Search,
  Filter,
  ChevronDown,
  Send,
  MessageCircle,
  ExternalLink,
  Mail,
  Phone,
  Users,
  Loader2,
  Instagram,
  Star,
} from 'lucide-react'

const platformIcons = {
  instagram: Instagram,
  tiktok: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.56a8.24 8.24 0 004.76 1.5v-3.4a4.85 4.85 0 01-1-.03z" />
    </svg>
  ),
  facebook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
}

const dmStatusConfig = {
  new: { label: 'Nouveau', color: 'bg-gray-100 text-gray-600' },
  contacted: { label: 'Contacte', color: 'bg-blue-100 text-blue-700' },
  replied: { label: 'Repondu', color: 'bg-purple-100 text-purple-700' },
  converted: { label: 'Converti', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Echoue', color: 'bg-red-100 text-red-700' },
}

const platformFilterOptions = [
  { value: 'all', label: 'Toutes' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
]

const statusFilterOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'contacted', label: 'Contactes' },
  { value: 'replied', label: 'Ont repondu' },
  { value: 'converted', label: 'Convertis' },
]

export default function ProspectTable({
  prospects,
  onSendDM,
  onSendWhatsApp,
  sendingDM,
  sendingWA,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [platformDropdown, setPlatformDropdown] = useState(false)
  const [statusDropdown, setStatusDropdown] = useState(false)

  const filtered = prospects.filter((p) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const match =
        p.username?.toLowerCase().includes(s) ||
        p.fullName?.toLowerCase().includes(s) ||
        p.full_name?.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) ||
        p.niche?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false
    if (statusFilter !== 'all' && p.dmStatus !== statusFilter) return false
    return true
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = dateStr.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const PlatformIcon = (platform) => {
    const Comp = platformIcons[platform]
    return Comp || Instagram
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, username, email, niche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Platform Filter */}
        <div className="relative">
          <button
            onClick={() => { setPlatformDropdown(!platformDropdown); setStatusDropdown(false) }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 text-sm">
              {platformFilterOptions.find(o => o.value === platformFilter)?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${platformDropdown ? 'rotate-180' : ''}`} />
          </button>
          {platformDropdown && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl border shadow-lg z-20">
              {platformFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPlatformFilter(opt.value); setPlatformDropdown(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                    platformFilter === opt.value ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => { setStatusDropdown(!statusDropdown); setPlatformDropdown(false) }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-700 text-sm">
              {statusFilterOptions.find(o => o.value === statusFilter)?.label}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${statusDropdown ? 'rotate-180' : ''}`} />
          </button>
          {statusDropdown && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl border shadow-lg z-20">
              {statusFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setStatusFilter(opt.value); setStatusDropdown(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                    statusFilter === opt.value ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Prospect</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plateforme</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucun prospect trouve</p>
                    <p className="text-sm mt-1">
                      {searchTerm || platformFilter !== 'all' || statusFilter !== 'all'
                        ? 'Modifiez vos filtres'
                        : 'Lancez un scan pour sourcer des prospects'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((prospect) => {
                  const Icon = PlatformIcon(prospect.platform)
                  const status = dmStatusConfig[prospect.dmStatus] || dmStatusConfig.new

                  return (
                    <tr key={prospect.id} className="hover:bg-gray-50">
                      {/* Prospect */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {(prospect.fullName || prospect.full_name || prospect.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {prospect.fullName || prospect.full_name || prospect.username}
                            </p>
                            <p className="text-sm text-gray-500">@{prospect.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700 capitalize">{prospect.platform}</span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        {prospect.score != null ? (
                          <div className="flex items-center gap-1.5">
                            <Star className={`w-4 h-4 ${
                              prospect.score >= 80 ? 'text-green-500' :
                              prospect.score >= 50 ? 'text-yellow-500' : 'text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              prospect.score >= 80 ? 'text-green-700' :
                              prospect.score >= 50 ? 'text-yellow-700' : 'text-gray-500'
                            }`}>
                              {prospect.score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Contact info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {prospect.email && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                              <Mail className="w-3 h-3" />
                              Email
                            </span>
                          )}
                          {prospect.phone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                              <Phone className="w-3 h-3" />
                              Tel
                            </span>
                          )}
                          {prospect.whatsappActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
                              <MessageCircle className="w-3 h-3" />
                              WA
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatDate(prospect.contactedAt || prospect.scrapedAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send Instagram DM */}
                          {prospect.platform === 'instagram' && prospect.dmStatus === 'new' && (
                            <button
                              onClick={() => onSendDM(prospect.id)}
                              disabled={sendingDM === prospect.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-pink-50 text-pink-700 rounded-lg text-xs font-medium hover:bg-pink-100 transition-colors disabled:opacity-50"
                            >
                              {sendingDM === prospect.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              DM
                            </button>
                          )}

                          {/* Send WhatsApp */}
                          {prospect.whatsappActive && prospect.whatsappStatus !== 'contacted' && (
                            <button
                              onClick={() => onSendWhatsApp(prospect.phone, null, prospect.id)}
                              disabled={sendingWA === prospect.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              {sendingWA === prospect.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5" />
                              )}
                              WA
                            </button>
                          )}

                          {/* External link */}
                          {prospect.username && (
                            <a
                              href={
                                prospect.platform === 'instagram'
                                  ? `https://instagram.com/${prospect.username}`
                                  : prospect.platform === 'tiktok'
                                  ? `https://tiktok.com/@${prospect.username}`
                                  : `https://facebook.com/${prospect.username}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
            {filtered.length} prospect{filtered.length > 1 ? 's' : ''}{' '}
            {filtered.length !== prospects.length && `(sur ${prospects.length} total)`}
          </div>
        )}
      </div>
    </div>
  )
}
