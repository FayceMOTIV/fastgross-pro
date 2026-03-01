/**
 * GoogleMapsSourcing — Page sourcing Google Maps interactive
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  MapPin,
  Search,
  RefreshCw,
  Users,
  Star,
  TrendingUp,
  Zap,
  Loader2,
  Download,
  Filter,
  CheckCircle,
  Flame,
} from 'lucide-react'
import useGoogleMapsSourcing from '../hooks/useGoogleMapsSourcing'
import { useOrg } from '../contexts/OrgContext'
import GoogleMapsLeadCard from '../components/googlemaps/GoogleMapsLeadCard'
import GoogleMapsFilters from '../components/googlemaps/GoogleMapsFilters'

export default function GoogleMapsSourcing() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const gmaps = useGoogleMapsSourcing(orgId)

  const searchResults = gmaps.search?.results || []
  const searching = gmaps.search?.searching || false
  const searchHistory = gmaps.search?.searchHistory || []
  const search = gmaps.search?.search
  const enrichLead = gmaps.search?.enrichLead
  const clearResults = gmaps.search?.clearResults
  const leads = gmaps.leads?.leads || []
  const qualifiedLeads = gmaps.leads?.qualifiedLeads || []
  const hotLeads = gmaps.leads?.hotLeads || []
  const enrichedLeads = gmaps.leads?.enrichedLeads || []
  const stats = gmaps.stats || {}
  const loading = gmaps.loading
  const refreshStats = gmaps.refreshAll
  const saveLead = async (lead) => {
    /* save via Firestore — not yet wired */
  }

  const [activeTab, setActiveTab] = useState('search')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState(10)
  const [limit, setLimit] = useState(50)
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Entrez un terme de recherche')
      return
    }
    if (!location.trim()) {
      toast.error('Entrez une ville ou localisation')
      return
    }
    try {
      await search({
        query: query.trim(),
        location: location.trim(),
        radius,
        limit,
        filters,
        enrichLeads: false,
      })
      toast.success('Recherche lancee')
    } catch (err) {
      toast.error(err.message || 'Erreur de recherche')
    }
  }

  const handleEnrich = async (leadId) => {
    try {
      await enrichLead(leadId)
      toast.success('Lead enrichi')
    } catch (err) {
      toast.error(err.message || 'Erreur enrichissement')
    }
  }

  const handleSave = async (lead) => {
    try {
      await saveLead(lead)
      toast.success('Lead sauvegarde')
    } catch (err) {
      toast.error(err.message || 'Erreur sauvegarde')
    }
  }

  const handleStartSequence = (lead) => {
    toast.success(`Sequence pour ${lead.name} (a implementer)`)
  }

  const displayedResults = activeTab === 'search' ? searchResults : leads

  const tabs = [
    { id: 'search', label: 'Recherche', count: searchResults.length },
    { id: 'leads', label: 'Prospects sauvegardes', count: leads.length },
    { id: 'history', label: 'Historique' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-red-500" />
              Google Maps Sourcing
            </h1>
            <p className="text-gray-500 mt-1">
              Scraping et enrichissement de prospects Google Maps
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalScraped || 0}</p>
            <p className="text-sm text-gray-500">Total scrapes</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalQualified || qualifiedLeads.length}
            </p>
            <p className="text-sm text-gray-500">Qualifies</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalHot || hotLeads.length}</p>
            <p className="text-sm text-gray-500">Hot leads</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalEnriched || enrichedLeads.length}
            </p>
            <p className="text-sm text-gray-500">Enrichis</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.conversionRate || 0}%</p>
            <p className="text-sm text-gray-500">Taux conversion</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Recherche</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Restaurant, Dentiste..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Ville / Localisation</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Paris, Lyon..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Rayon (km)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Limite</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={10}
                max={500}
                step={10}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition disabled:opacity-50 text-sm font-medium"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Rechercher
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Filter className="w-4 h-4" />
              Filtres
            </button>
            {searchResults.length > 0 && (
              <button
                onClick={clearResults}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm text-gray-600"
              >
                Effacer
              </button>
            )}
            <span className="text-xs text-gray-500 ml-auto">
              {searchResults.length > 0 && `${searchResults.length} resultats`}
            </span>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6">
            <GoogleMapsFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters({})}
            />
          </div>
        )}

        {/* Tabs Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Buttons */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count != null && tab.count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* ========== SEARCH RESULTS TAB ========== */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                {searchResults.length === 0 && !searching ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Lancez une recherche Google Maps</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Entrez un type de commerce et une ville
                    </p>
                  </div>
                ) : searching ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Recherche en cours...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((lead) => (
                      <GoogleMapsLeadCard
                        key={lead.id}
                        lead={lead}
                        onEnrich={handleEnrich}
                        onSave={handleSave}
                        onStartSequence={handleStartSequence}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== SAVED LEADS TAB ========== */}
            {activeTab === 'leads' && (
              <div className="space-y-4">
                {leads.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun prospect sauvegarde</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sauvegardez des leads depuis les resultats de recherche
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leads.map((lead) => (
                      <GoogleMapsLeadCard
                        key={lead.id}
                        lead={lead}
                        onEnrich={handleEnrich}
                        onStartSequence={handleStartSequence}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== HISTORY TAB ========== */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {searchHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun historique</p>
                  </div>
                ) : (
                  searchHistory.map((entry, i) => (
                    <div
                      key={entry.id || i}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm text-gray-900">{entry.query}</span>
                          <span className="text-xs text-gray-500">— {entry.location}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{entry.resultsCount || 0} resultats</span>
                          <span>{entry.qualifiedCount || 0} qualifies</span>
                          {entry.searchedAt && (
                            <span>
                              {new Date(entry.searchedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setQuery(entry.query)
                          setLocation(entry.location)
                          setActiveTab('search')
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Relancer
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
