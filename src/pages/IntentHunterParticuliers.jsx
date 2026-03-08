import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  ArrowLeft,
  Filter,
  Home,
  Heart,
  Baby,
  Hammer,
  GraduationCap,
  MapPin,
  ShoppingBag,
  FileSearch,
  RefreshCw,
  CheckCircle,
  Target,
} from 'lucide-react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'

import SourceCardParticuliers from '@/components/intentHunterParticuliers/SourceCardParticuliers'
import LeadParticulierCard from '@/components/intentHunterParticuliers/LeadParticulierCard'
import ZoneSelector from '@/components/intentHunterParticuliers/ZoneSelector'

// Sources B2C
const PARTICULIERS_SOURCES = [
  {
    id: 'leboncoin',
    name: 'Leboncoin',
    description: 'Annonces immobilieres',
    icon: ShoppingBag,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    status: 'active',
    count: 89,
  },
  {
    id: 'seloger',
    name: 'SeLoger',
    description: 'Recherches immobilieres',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    status: 'active',
    count: 67,
  },
  {
    id: 'pap',
    name: 'PAP',
    description: 'Particulier a particulier',
    icon: Home,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    status: 'active',
    count: 34,
  },
  {
    id: 'mairie',
    name: 'Mairies',
    description: 'Publications bans, permis',
    icon: MapPin,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    status: 'active',
    count: 56,
  },
  {
    id: 'permis_construire',
    name: 'Permis construire',
    description: 'Autorisations urbanisme',
    icon: Hammer,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    status: 'active',
    count: 23,
  },
  {
    id: 'mariage',
    name: 'Mariages',
    description: 'Publications bans',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    status: 'locked',
    count: 0,
    planRequired: 'Pro',
  },
]

// Mock leads B2C
const MOCK_LEADS = [
  {
    id: 'b2c-1',
    score: 88,
    source: 'leboncoin',
    name: 'Thomas Bernard',
    zone: 'Lyon 3e (5km)',
    intentSignal: 'Recherche appartement T4 — budget 400k',
    urgency: true,
    lifeEvent: 'demenagement',
    channels: ['email', 'phone', 'sms'],
  },
  {
    id: 'b2c-2',
    score: 82,
    source: 'mairie',
    name: 'Claire et Marc Dupont',
    zone: 'Bordeaux (10km)',
    intentSignal: 'Publication de bans — mariage prevu juin 2026',
    urgency: false,
    lifeEvent: 'mariage',
    channels: ['email'],
  },
  {
    id: 'b2c-3',
    score: 79,
    source: 'permis_construire',
    name: 'Famille Moreau',
    zone: 'Toulouse Nord (15km)',
    intentSignal: 'Permis de construire accorde — maison 150m2',
    urgency: false,
    lifeEvent: 'construction',
    channels: ['email', 'phone'],
  },
  {
    id: 'b2c-4',
    score: 75,
    source: 'seloger',
    name: 'Julie Martin',
    zone: 'Paris 11e (3km)',
    intentSignal: 'Recherche active studio/T2 — premier achat',
    urgency: true,
    lifeEvent: 'demenagement',
    channels: ['email', 'sms'],
  },
  {
    id: 'b2c-5',
    score: 68,
    source: 'mairie',
    name: 'Pierre et Anne Leroy',
    zone: 'Nantes (8km)',
    intentSignal: 'Declaration de naissance — fevrier 2026',
    urgency: false,
    lifeEvent: 'naissance',
    channels: ['email'],
  },
  {
    id: 'b2c-6',
    score: 64,
    source: 'pap',
    name: 'Michel Durand',
    zone: 'Nice (12km)',
    intentSignal: 'Mise en vente appartement — probable demenagement',
    urgency: false,
    lifeEvent: 'demenagement',
    channels: ['email', 'phone'],
  },
  {
    id: 'b2c-7',
    score: 90,
    source: 'leboncoin',
    name: 'Sarah Petit',
    zone: 'Marseille 8e (7km)',
    intentSignal: 'Recherche urgente maison avec jardin — mutation pro',
    urgency: true,
    lifeEvent: 'demenagement',
    channels: ['email', 'phone', 'sms', 'whatsapp'],
  },
]

export default function IntentHunterParticuliers() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: launchSearch, loading: searching } = useCloudFunction(
    'launchIntentHunterParticuliers'
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(15)
  const [leads, setLeads] = useState(MOCK_LEADS)
  const [sources, setSources] = useState(PARTICULIERS_SOURCES)
  const [progress, setProgress] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [filterSource, setFilterSource] = useState('all')
  const [contactedIds, setContactedIds] = useState(new Set())

  // Firestore listener
  useEffect(() => {
    if (isDemo || !currentOrg?.id) return

    const leadsRef = collection(db, 'organizations', currentOrg.id, 'intentHunterLeads')
    const q = query(leadsRef, orderBy('score', 'desc'), limit(50))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreLeads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      if (firestoreLeads.length > 0) {
        setLeads(firestoreLeads)
      }
    })

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && !city.trim()) {
      toast.error('Entrez une recherche ou selectionnez une zone')
      return
    }

    setIsScanning(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      if (!isDemo && currentOrg?.id) {
        await launchSearch({
          keywords: searchQuery.split(/[\s,]+/).filter(Boolean),
          zone: city ? `${city} (${radius}km)` : null,
          orgId: currentOrg.id,
        })
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      setProgress(100)
      toast.success('Recherche terminee')
    } catch (error) {
      toast.error('Erreur: ' + (error?.message || 'Echec de la recherche'))
    } finally {
      clearInterval(interval)
      setTimeout(() => {
        setIsScanning(false)
        setProgress(0)
      }, 500)
    }
  }, [searchQuery, city, radius, currentOrg?.id, isDemo, launchSearch])

  const handleContact = useCallback((lead) => {
    setContactedIds((prev) => new Set([...prev, lead.id]))
    toast.success(`Contact initie pour ${lead.name}`)
  }, [])

  const handleIgnore = useCallback((lead) => {
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    toast('Lead ignore', { icon: '\u274C' })
  }, [])

  const handleViewDetails = useCallback((lead) => {
    toast(`Details: ${lead.name} — Score ${lead.score}`, { icon: '\uD83D\uDD0D' })
  }, [])

  const filteredLeads =
    filterSource === 'all' ? leads : leads.filter((l) => l.source === filterSource)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/app/intent-hunter"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold text-text">
              Intent Hunter Particuliers (B2C)
            </h1>
            <p className="text-sm text-text-muted">Evenements de vie & signaux locaux</p>
          </div>
        </div>
        <button
          onClick={() => setLeads(MOCK_LEADS)}
          className="btn-ghost text-sm flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Rafraichir
        </button>
      </div>

      {/* Search + Zone selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4 space-y-3"
      >
        {/* NL Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Personnes qui demenagent, qui se marient, qui construisent..."
              className="input-field pl-11 w-full text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isScanning}
            className="btn-primary bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center gap-2 whitespace-nowrap"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            Detecter
          </button>
        </div>

        {/* Zone selector */}
        <ZoneSelector
          city={city}
          radius={radius}
          onCityChange={setCity}
          onRadiusChange={setRadius}
        />

        {/* Progress */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Analyse des sources locales...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Source grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Sources locales</h2>
          <span className="text-xs text-text-muted">
            {sources.filter((s) => s.status === 'active').length} / {sources.length} actives
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setFilterSource(filterSource === source.id ? 'all' : source.id)}
              className={`text-left ${filterSource === source.id ? 'ring-2 ring-teal-500 rounded-xl' : ''}`}
            >
              <SourceCardParticuliers source={source} />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-muted">
            {filteredLeads.length} leads {filterSource !== 'all' ? `(${filterSource})` : ''}
          </span>
        </div>
        {filterSource !== 'all' && (
          <button
            onClick={() => setFilterSource('all')}
            className="text-xs text-teal-600 hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredLeads.map((lead, index) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.03 }}
            >
              {contactedIds.has(lead.id) ? (
                <div className="card p-4 bg-teal-50/50 border-teal-200">
                  <div className="flex items-center gap-2 text-teal-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{lead.name} — Contact initie</span>
                  </div>
                </div>
              ) : (
                <LeadParticulierCard
                  lead={lead}
                  onContact={handleContact}
                  onIgnore={handleIgnore}
                  onViewDetails={handleViewDetails}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLeads.length === 0 && (
          <div className="text-center py-16">
            <FileSearch className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Aucun lead trouve</p>
            <p className="text-xs text-text-muted mt-1">
              Lancez une recherche avec une zone geographique
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
