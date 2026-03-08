import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  Search,
  Target,
  ArrowRight,
  TrendingUp,
  Calendar,
  MessageSquare,
  Crosshair,
  BarChart3,
  Zap,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'

// Mock stats for demo
const MOCK_STATS = {
  leadsPro: 342,
  leadsParticuliers: 187,
  tauxContact: 34.5,
  tauxReponse: 12.8,
  rdv: 18,
  leadsDetectes: 529,
}

export default function IntentHunterHome() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(MOCK_STATS)

  // In a real implementation, fetch from Firestore
  useEffect(() => {
    if (isDemo || !currentOrg?.id) return
    // TODO: fetch real stats from Firestore collection
    // For now, use mock data
  }, [currentOrg?.id, isDemo])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text">Intent Hunter</h1>
            <p className="text-sm text-text-muted">
              Detectez les signaux d'achat en temps reel
            </p>
          </div>
        </div>
      </motion.div>

      {/* Monthly summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-6 bg-gradient-to-br from-accent/5 via-purple-50/50 to-blue-50/30 border-accent/10"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-accent" />
          <span className="text-sm text-text-muted capitalize">
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-display font-bold text-accent">{stats.leadsPro}</p>
            <p className="text-sm text-text-muted mt-1">Leads Pro (B2B)</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-teal-600">{stats.leadsParticuliers}</p>
            <p className="text-sm text-text-muted mt-1">Leads Particuliers (B2C)</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-purple-600">{stats.tauxContact}%</p>
            <p className="text-sm text-text-muted mt-1">Taux de contact</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-emerald-600">{stats.rdv}</p>
            <p className="text-sm text-text-muted mt-1">RDV obtenus</p>
          </div>
        </div>
      </motion.div>

      {/* Two system cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* B2B Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            to="/app/intent-hunter/pro"
            className="block card p-6 hover:shadow-soft-md transition-all group border-l-4 border-l-accent"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                <Building2 className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-display font-bold text-text group-hover:text-accent transition-colors">
                  Systeme Pro (B2B)
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Detectez les entreprises qui montrent des signaux d'achat :
                  recrutements, appels d'offres, levees de fonds, nouveaux projets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-lg font-bold text-blue-700">{stats.leadsPro}</p>
                <p className="text-[10px] text-blue-600">Leads detectes</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <p className="text-lg font-bold text-purple-700">8</p>
                <p className="text-[10px] text-purple-600">Sources actives</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-lg font-bold text-emerald-700">BOAMP</p>
                <p className="text-[10px] text-emerald-600">Appels d'offres</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Search className="w-3.5 h-3.5" />
                <span>Recherche en langage naturel</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                Lancer
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* B2C Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Link
            to="/app/intent-hunter/particuliers"
            className="block card p-6 hover:shadow-soft-md transition-all group border-l-4 border-l-teal-500"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                <Users className="w-7 h-7 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-display font-bold text-text group-hover:text-teal-600 transition-colors">
                  Systeme Particuliers (B2C)
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Identifiez les particuliers avec des evenements de vie :
                  demenagement, mariage, naissance, construction, retraite.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-teal-50">
                <p className="text-lg font-bold text-teal-700">{stats.leadsParticuliers}</p>
                <p className="text-[10px] text-teal-600">Leads detectes</p>
              </div>
              <div className="p-3 rounded-lg bg-pink-50">
                <p className="text-lg font-bold text-pink-700">5</p>
                <p className="text-[10px] text-pink-600">Sources locales</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <p className="text-lg font-bold text-amber-700">Zones</p>
                <p className="text-[10px] text-amber-600">Ciblage geo</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Target className="w-3.5 h-3.5" />
                <span>Ciblage geographique + evenements</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-teal-600 group-hover:gap-2 transition-all">
                Lancer
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Stats link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          to="/app/intent-hunter/stats"
          className="card p-4 flex items-center justify-between hover:shadow-soft-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text">Statistiques Intent Hunter</h3>
              <p className="text-xs text-text-muted">
                Performance par source, taux de contact, evolution des scores
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
        </Link>
      </motion.div>

      {/* Bottom stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card p-4"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">{stats.leadsDetectes}</p>
              <p className="text-[10px] text-text-muted">Leads detectes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">{stats.tauxContact}%</p>
              <p className="text-[10px] text-text-muted">Taux contact</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">{stats.tauxReponse}%</p>
              <p className="text-[10px] text-text-muted">Taux reponse</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">{stats.rdv}</p>
              <p className="text-[10px] text-text-muted">RDV obtenus</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
