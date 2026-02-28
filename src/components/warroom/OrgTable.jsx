/**
 * OrgTable — Table orgs triable + filtres
 */

import { useState, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Search,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react'

const statusConfig = {
  running: { label: 'Actif', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  paused: { label: 'Pause', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  idle: { label: 'Inactif', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const planLabels = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
  agency: 'Agency',
}

export default function OrgTable({ orgs = [], onToggleProspection }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('all')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...orgs]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          (o.name || '').toLowerCase().includes(q) ||
          (o.plan || '').toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.prospectionState === statusFilter)
    }

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? ''
      let bVal = b[sortKey] ?? ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [orgs, search, sortKey, sortDir, statusFilter])

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    )
  }

  const ThButton = ({ col, children }) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center gap-0.5 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-900"
    >
      {children}
      <SortIcon col={col} />
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une organisation..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'running', 'paused', 'idle', 'error'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Tous' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} orgs</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3">
                <ThButton col="name">Organisation</ThButton>
              </th>
              <th className="text-left px-4 py-3">
                <ThButton col="plan">Plan</ThButton>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Canaux
                </span>
              </th>
              <th className="text-right px-4 py-3">
                <ThButton col="dailySent">Envoyes/j</ThButton>
              </th>
              <th className="text-right px-4 py-3">
                <ThButton col="dailyBudget">Budget/j</ThButton>
              </th>
              <th className="text-right px-4 py-3">
                <ThButton col="replyRate">Reponses</ThButton>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </span>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((org) => {
              const st = statusConfig[org.prospectionState] || statusConfig.idle
              return (
                <tr key={org.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-900">{org.name}</div>
                    {org.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {org.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {planLabels[org.plan] || org.plan || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {org.activeChannels || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {org.dailySent || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-700">{org.dailyBudget || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {org.replyRate || 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {onToggleProspection && (
                      <button
                        onClick={() => onToggleProspection(org.id, org.prospectionState !== 'running')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                          org.prospectionState === 'running'
                            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {org.prospectionState === 'running' ? (
                          <>
                            <Pause className="w-3 h-3" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" /> Activer
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucune organisation trouvee
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
