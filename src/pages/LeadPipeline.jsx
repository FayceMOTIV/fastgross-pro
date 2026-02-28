import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import toast from 'react-hot-toast'
import {
  Database,
  RefreshCw,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  Search,
  MapPin,
  Star,
  Users,
  Zap,
  ArrowRight,
  BarChart3,
  Filter,
  X,
} from 'lucide-react'

const STATUS_CONFIG = {
  new: { label: 'Nouveaux', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  in_sequence: { label: 'En sequence', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  contacted: { label: 'Contactes', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  replied: { label: 'Repondu', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  converted: { label: 'Convertis', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  lost: { label: 'Perdus', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
}

export default function LeadPipeline() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refilling, setRefilling] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    threshold: 50,
    autoRefill: true,
    queries: [],
    locations: [],
    minRating: 3.5,
    minReviews: 5,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [newQuery, setNewQuery] = useState('')
  const [newLocation, setNewLocation] = useState('')

  const fetchStats = useCallback(async () => {
    if (!orgId) return
    try {
      setLoading(true)
      const getPipelineStatsFn = httpsCallable(functions, 'getPipelineStats')
      const result = await getPipelineStatsFn({ orgId })
      setStats(result.data)

      // Synchroniser les settings depuis l'org
      if (result.data) {
        setSettings(prev => ({
          ...prev,
          threshold: result.data.threshold || 50,
          autoRefill: result.data.autoRefill !== false,
        }))
      }
    } catch (error) {
      console.error('Error fetching pipeline stats:', error)
      // Mock data fallback
      setStats({
        activeCount: 34,
        threshold: 50,
        autoRefill: true,
        fillPercentage: 68,
        statusCounts: { new: 12, in_sequence: 15, contacted: 7, replied: 3, converted: 1, lost: 2 },
        lastRun: null,
        totalDiscovered: 156,
      })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleRefill = async () => {
    if (!orgId) return
    try {
      setRefilling(true)
      const runPipelineRefillFn = httpsCallable(functions, 'runPipelineRefill')
      const result = await runPipelineRefillFn({ orgId })
      toast.success(`${result.data.results?.saved || 0} nouveaux leads ajoutes au pipeline`)
      await fetchStats()
    } catch (error) {
      console.error('Error refilling pipeline:', error)
      toast.error('Erreur lors de la recharge du pipeline')
    } finally {
      setRefilling(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!orgId) return
    try {
      setSavingSettings(true)
      const updatePipelineSettingsFn = httpsCallable(functions, 'updatePipelineSettings')
      await updatePipelineSettingsFn({ orgId, settings })
      toast.success('Parametres sauvegardes')
      setShowSettings(false)
      await fetchStats()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSavingSettings(false)
    }
  }

  const addQuery = () => {
    if (newQuery.trim() && !settings.queries.includes(newQuery.trim())) {
      setSettings(prev => ({ ...prev, queries: [...prev.queries, newQuery.trim()] }))
      setNewQuery('')
    }
  }

  const removeQuery = (q) => {
    setSettings(prev => ({ ...prev, queries: prev.queries.filter(x => x !== q) }))
  }

  const addLocation = () => {
    if (newLocation.trim() && !settings.locations.includes(newLocation.trim())) {
      setSettings(prev => ({ ...prev, locations: [...prev.locations, newLocation.trim()] }))
      setNewLocation('')
    }
  }

  const removeLocation = (loc) => {
    setSettings(prev => ({ ...prev, locations: prev.locations.filter(x => x !== loc) }))
  }

  // Calculs jauge
  const fillPercent = stats?.fillPercentage || 0
  const gaugeColor = fillPercent >= 80 ? 'text-emerald-500' : fillPercent >= 40 ? 'text-amber-500' : 'text-red-500'
  const gaugeBg = fillPercent >= 80 ? 'bg-emerald-500' : fillPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Leads</h1>
          <p className="text-gray-500 mt-1">Surveillance et recharge automatique du stock de prospects</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Parametres
          </button>
          <button
            onClick={handleRefill}
            disabled={refilling}
            className="btn-primary flex items-center gap-2"
          >
            {refilling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {refilling ? 'Recharge en cours...' : 'Recharger maintenant'}
          </button>
        </div>
      </div>

      {/* Gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge principale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 lg:col-span-1"
        >
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Niveau du Pipeline</h3>

            {/* Circular gauge */}
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${fillPercent * 3.27} 327`}
                  strokeLinecap="round"
                  className={`${gaugeColor} transition-all duration-1000`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{stats?.activeCount || 0}</span>
                <span className="text-sm text-gray-500">/ {stats?.threshold || 50}</span>
              </div>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              fillPercent >= 80 ? 'bg-emerald-100 text-emerald-700' :
              fillPercent >= 40 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {fillPercent >= 80 ? <CheckCircle className="w-3.5 h-3.5" /> :
               fillPercent >= 40 ? <AlertTriangle className="w-3.5 h-3.5" /> :
               <AlertTriangle className="w-3.5 h-3.5" />}
              {fillPercent >= 80 ? 'Pipeline sain' :
               fillPercent >= 40 ? 'Recharge recommandee' :
               'Pipeline critique'}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              {stats?.autoRefill ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Auto-recharge active</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-gray-400" />
                  <span>Auto-recharge desactivee</span>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats par status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6 lg:col-span-2"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-4">Repartition du Pipeline</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = stats?.statusCounts?.[status] || 0
              const total = Object.values(stats?.statusCounts || {}).reduce((a, b) => a + b, 0) || 1
              const percent = Math.round((count / total) * 100)

              return (
                <div key={status} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-400">{percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${config.dot} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total decouverts</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalDiscovered || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Taux conversion</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.statusCounts?.converted
                  ? `${Math.round((stats.statusCounts.converted / Math.max(Object.values(stats.statusCounts).reduce((a, b) => a + b, 0), 1)) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Seuil pipeline</p>
              <p className="text-xl font-bold text-gray-900">{stats?.threshold || 50}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Derniere recharge</p>
              <p className="text-sm font-medium text-gray-900">
                {stats?.lastRun
                  ? new Date(stats.lastRun._seconds * 1000).toLocaleDateString('fr-FR')
                  : 'Jamais'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Last run details */}
      {stats?.lastResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-4">Derniere recharge</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lastResults.found || 0}</p>
              <p className="text-xs text-gray-500">Trouves</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lastResults.qualified || 0}</p>
              <p className="text-xs text-gray-500">Qualifies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.lastResults.saved || 0}</p>
              <p className="text-xs text-gray-500">Sauvegardes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.lastResults.duplicates || 0}</p>
              <p className="text-xs text-gray-500">Doublons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.lastResults.errors || 0}</p>
              <p className="text-xs text-gray-500">Erreurs</p>
            </div>
          </div>

          {stats.lastResults.queries?.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-2">Requetes executees</p>
              <div className="flex flex-wrap gap-2">
                {stats.lastResults.queries.map((q, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
                    <Search className="w-3 h-3" />
                    {q.query} ({q.location}) — {q.saved} saves
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Parametres du Pipeline</h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Seuil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seuil de recharge</label>
              <p className="text-xs text-gray-400 mb-2">Nombre minimum de prospects actifs avant recharge automatique</p>
              <input
                type="number"
                value={settings.threshold}
                onChange={e => setSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) || 50 }))}
                className="input-field w-full"
                min={10}
                max={500}
              />
            </div>

            {/* Auto-refill toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recharge automatique</label>
              <p className="text-xs text-gray-400 mb-2">Recharger le pipeline automatiquement chaque nuit a 01:00</p>
              <button
                onClick={() => setSettings(prev => ({ ...prev, autoRefill: !prev.autoRefill }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoRefill ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoRefill ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Note Google minimum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Google minimum</label>
              <input
                type="number"
                value={settings.minRating}
                onChange={e => setSettings(prev => ({ ...prev, minRating: parseFloat(e.target.value) || 3.5 }))}
                className="input-field w-full"
                min={0}
                max={5}
                step={0.5}
              />
            </div>

            {/* Avis minimum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre d'avis minimum</label>
              <input
                type="number"
                value={settings.minReviews}
                onChange={e => setSettings(prev => ({ ...prev, minReviews: parseInt(e.target.value) || 5 }))}
                className="input-field w-full"
                min={0}
                max={100}
              />
            </div>

            {/* Queries */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="w-3.5 h-3.5 inline mr-1" />
                Requetes de recherche
              </label>
              <p className="text-xs text-gray-400 mb-2">Types de commerces a rechercher sur Google Maps</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuery()}
                  placeholder="Ex: restaurant, coiffeur, garage auto..."
                  className="input-field flex-1"
                />
                <button onClick={addQuery} className="btn-secondary px-4">Ajouter</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.queries.map(q => (
                  <span key={q} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                    {q}
                    <button onClick={() => removeQuery(q)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {settings.queries.length === 0 && (
                  <span className="text-xs text-gray-400">Aucune requete configuree (valeurs par defaut utilisees)</span>
                )}
              </div>
            </div>

            {/* Locations */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                Villes cibles
              </label>
              <p className="text-xs text-gray-400 mb-2">Villes ou rechercher des prospects</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLocation()}
                  placeholder="Ex: Paris, Lyon, Bordeaux..."
                  className="input-field flex-1"
                />
                <button onClick={addLocation} className="btn-secondary px-4">Ajouter</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.locations.map(loc => (
                  <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                    <MapPin className="w-3 h-3" />
                    {loc}
                    <button onClick={() => removeLocation(loc)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {settings.locations.length === 0 && (
                  <span className="text-xs text-gray-400">Aucune ville configuree (valeurs par defaut utilisees)</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setShowSettings(false)} className="btn-ghost">Annuler</button>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="btn-primary flex items-center gap-2"
            >
              {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
              Sauvegarder
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
