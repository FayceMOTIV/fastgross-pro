import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  ArrowLeft,
  Filter,
  Building2,
  FileText,
  Globe,
  Briefcase,
  TrendingUp,
  Database,
  Landmark,
  Newspaper,
  Users,
  RefreshCw,
  Download,
  CheckCircle,
  Crosshair,
} from 'lucide-react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'

import SourceCardPro from '@/components/intentHunterPro/SourceCardPro'
import LeadProCard from '@/components/intentHunterPro/LeadProCard'
import BOAMPCard from '@/components/intentHunterPro/BOAMPCard'

// Sources B2B
const PRO_SOURCES = [
  {
    id: 'boamp',
    name: 'BOAMP',
    description: "Appels d'offres publics",
    icon: Landmark,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    status: 'active',
    count: 45,
    planRequired: null,
  },
  {
    id: 'societe',
    name: 'Societe.com',
    description: 'Creations & modifications',
    icon: Building2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    status: 'active',
    count: 128,
    planRequired: null,
  },
  {
    id: 'sirene',
    name: 'SIRENE/INSEE',
    description: 'Registre officiel',
    icon: Database,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    status: 'active',
    count: 89,
    planRequired: null,
  },
  {
    id: 'pappers',
    name: 'Pappers',
    description: 'Donnees legales',
    icon: FileText,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    status: 'active',
    count: 67,
    planRequired: null,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Recrutements & posts',
    icon: Briefcase,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    status: 'active',
    count: 203,
    planRequired: 'Pro',
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    description: 'Etablissements locaux',
    icon: Globe,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    status: 'active',
    count: 156,
    planRequired: null,
  },
  {
    id: 'infogreffe',
    name: 'Infogreffe',
    description: 'Actes & comptes',
    icon: Newspaper,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    status: 'active',
    count: 34,
    planRequired: 'Pro',
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Enrichissement emails',
    icon: TrendingUp,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    status: 'locked',
    count: 0,
    planRequired: 'Enterprise',
  },
]

// Mock leads
const MOCK_LEADS = [
  {
    id: '1',
    score: 92,
    source: 'boamp',
    company: 'Mairie de Lyon',
    contact: 'Direction Informatique',
    position: 'DSI',
    intentSignal: "Appel d'offres: refonte site web municipal",
    channels: ['email', 'phone'],
    city: 'Lyon',
    sector: 'Administration',
    isBoamp: true,
    amount: 250000,
    deadline: '2026-04-15',
    reference: 'BOAMP-2026-45678',
    entity: 'Mairie de Lyon',
    officialContact: 'service-marches@lyon.fr',
    fullUrl: 'https://www.boamp.fr/avis/detail/26-45678',
    title: 'Refonte du portail web municipal et applications citoyennes',
  },
  {
    id: '2',
    score: 85,
    source: 'linkedin',
    company: 'TechVision SAS',
    contact: 'Sophie Martin',
    position: 'DRH',
    intentSignal: 'Recrute 3 devs React — projet interne en croissance',
    channels: ['email', 'phone', 'whatsapp'],
    city: 'Paris',
    sector: 'Tech',
    decisionMakers: 4,
  },
  {
    id: '3',
    score: 78,
    source: 'societe',
    company: 'GreenEnergy France',
    contact: 'Pierre Durand',
    position: 'CEO',
    intentSignal: 'Levee de fonds Serie A — 5M EUR',
    channels: ['email'],
    city: 'Bordeaux',
    sector: 'Energie',
  },
  {
    id: '4',
    score: 72,
    source: 'google_maps',
    company: 'Boulangerie Artisanale',
    contact: 'Jean Lefebvre',
    position: 'Gerant',
    intentSignal: 'Nouvelle ouverture — avis Google en hausse',
    channels: ['email', 'phone'],
    city: 'Toulouse',
    sector: 'Restauration',
  },
  {
    id: '5',
    score: 65,
    source: 'sirene',
    company: 'DataFlow SARL',
    contact: 'Marie Blanc',
    position: 'CTO',
    intentSignal: 'Creation recente — immatriculation SIRENE',
    channels: ['email', 'phone'],
    city: 'Nantes',
    sector: 'SaaS',
    decisionMakers: 2,
  },
  {
    id: '6',
    score: 88,
    source: 'boamp',
    company: 'Region Ile-de-France',
    contact: 'Service Achats',
    position: '',
    intentSignal: 'AO: plateforme de gestion RH regionale',
    channels: ['email'],
    city: 'Paris',
    sector: 'Administration',
    isBoamp: true,
    amount: 500000,
    deadline: '2026-05-01',
    reference: 'BOAMP-2026-56789',
    entity: 'Region Ile-de-France',
    officialContact: 'marches-publics@iledefrance.fr',
    fullUrl: 'https://www.boamp.fr/avis/detail/26-56789',
    title: "Mise en place d'une plateforme de gestion des ressources humaines",
  },
]

export default function IntentHunterPro() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: launchSearch, loading: searching } = useCloudFunction('launchIntentHunterPro')

  const [searchQuery, setSearchQuery] = useState('')
  const [leads, setLeads] = useState(MOCK_LEADS)
  const [sources, setSources] = useState(PRO_SOURCES)
  const [progress, setProgress] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [filterSource, setFilterSource] = useState('all')
  const [importedIds, setImportedIds] = useState(new Set())

  // Firestore listener for real-time results
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
    if (!searchQuery.trim()) {
      toast.error('Entrez une recherche')
      return
    }

    setIsScanning(true)
    setProgress(0)

    // Simulate progress
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
          orgId: currentOrg.id,
        })
      } else {
        // Demo: simulate delay
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
  }, [searchQuery, currentOrg?.id, isDemo, searchIntents])

  const handleImport = useCallback((lead) => {
    setImportedIds((prev) => new Set([...prev, lead.id]))
    toast.success(`${lead.company} importe dans vos prospects`)
  }, [])

  const handleIgnore = useCallback((lead) => {
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    toast('Lead ignore', { icon: '\u274C' })
  }, [])

  const handleViewDetails = useCallback((lead) => {
    toast(`Details: ${lead.company} — Score ${lead.score}`, { icon: '\uD83D\uDD0D' })
  }, [])

  // Filter leads
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
            <h1 className="text-xl font-display font-bold text-text">Intent Hunter Pro (B2B)</h1>
            <p className="text-sm text-text-muted">Signaux d'achat entreprises</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeads(MOCK_LEADS)}
            className="btn-ghost text-sm flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraichir
          </button>
        </div>
      </div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Entreprises qui cherchent a refaire leur site web, qui recrutent des devs..."
              className="input-field pl-11 w-full text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isScanning}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4" />
            )}
            Detecter
          </button>
        </div>

        {/* Progress bar */}
        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Analyse en cours...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-accent to-purple-500 h-2 rounded-full"
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
          <h2 className="section-title">Sources actives</h2>
          <span className="text-xs text-text-muted">
            {sources.filter((s) => s.status === 'active').length} / {sources.length} actives
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setFilterSource(filterSource === source.id ? 'all' : source.id)}
              className={`text-left ${filterSource === source.id ? 'ring-2 ring-accent rounded-xl' : ''}`}
            >
              <SourceCardPro source={source} />
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
            className="text-xs text-accent hover:underline"
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
              {importedIds.has(lead.id) ? (
                <div className="card p-4 bg-emerald-50/50 border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{lead.company} — Importe</span>
                  </div>
                </div>
              ) : lead.isBoamp ? (
                <BOAMPCard
                  lead={lead}
                  onImport={handleImport}
                  onIgnore={handleIgnore}
                  onViewDetails={handleViewDetails}
                />
              ) : (
                <LeadProCard
                  lead={lead}
                  onImport={handleImport}
                  onIgnore={handleIgnore}
                  onViewDetails={handleViewDetails}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLeads.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">Aucun lead trouve</p>
            <p className="text-xs text-text-muted mt-1">
              Lancez une recherche pour detecter des signaux d'achat
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
