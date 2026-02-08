import { useState } from 'react'
import {
  X,
  Sparkles,
  Zap,
  Users,
  TrendingUp,
  Mail,
  Scan,
  Radar,
  FileCheck,
  Rocket,
  Target,
  Euro,
} from 'lucide-react'

// Configuration des bandeaux par page
const bannerConfig = {
  dashboard: {
    icon: Zap,
    title: 'Votre tableau de bord en temps reel',
    description:
      "Vue d'ensemble de votre prospection. Chaque prospect trouve, chaque email envoye, chaque reponse apparait automatiquement.",
    highlights: ['234 prospects', '22% de reponse', '13 750 EUR de CA'],
    gradient: 'from-brand-500/20 via-brand-500/10 to-purple-500/10',
    iconBg: 'bg-brand-500/20',
    iconColor: 'text-brand-400',
  },
  scanner: {
    icon: Scan,
    title: 'Le Scanner trouve vos futurs clients',
    description:
      "Entrez un secteur et une ville. L'outil cherche automatiquement des prospects qualifies, recupere leurs emails, et les ajoute a votre pipeline. Il tourne tout seul chaque jour.",
    highlights: ['Recherche auto', 'Extraction emails', 'Scoring', '0 effort'],
    gradient: 'from-brand-500/20 via-brand-500/10 to-blue-500/10',
    iconBg: 'bg-brand-500/20',
    iconColor: 'text-brand-400',
  },
  forgeur: {
    icon: Mail,
    title: 'Des emails personnalises, ecrits et envoyes pour vous',
    description:
      "Un email unique pour chaque prospect avec son nom, son entreprise, son secteur. Chaque message semble ecrit a la main. L'envoi est automatique.",
    highlights: ['Personnalisation auto', 'Templates intelligents', 'Relance J+5'],
    gradient: 'from-blue-500/20 via-blue-500/10 to-brand-500/10',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  radar: {
    icon: Radar,
    title: 'Suivez vos prospects sans effort',
    description:
      "Kanban automatique. Ceux qui ouvrent montent. Ceux qui repondent passent en 'Interesse'. Vous ne contactez QUE les prospects chauds.",
    highlights: ['Scoring auto', '+1 ouverture', '+3 clic', '+10 reponse'],
    gradient: 'from-amber-500/20 via-amber-500/10 to-brand-500/10',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  proof: {
    icon: FileCheck,
    title: 'Prouvez vos resultats en un clic',
    description:
      "Rapport PDF avec toutes vos stats. Taux d'ouverture, de reponse, clients convertis, CA genere.",
    highlights: ['PDF en 1 clic', 'Stats temps reel', 'Export pro'],
    gradient: 'from-purple-500/20 via-purple-500/10 to-brand-500/10',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
  },
  autopilot: {
    icon: Rocket,
    title: 'Votre commercial qui ne dort jamais',
    description:
      "Configurez votre niche une seule fois. Chaque jour a 9h l'outil trouve 30-50 prospects, envoie des emails, et vous notifie quand quelqu'un repond.",
    highlights: ['100% autonome', '30-50 prospects/jour', 'Vous ne gerez que les reponses'],
    gradient: 'from-brand-500/20 via-purple-500/10 to-blue-500/10',
    iconBg: 'bg-brand-500/20',
    iconColor: 'text-brand-400',
  },
  niche: {
    icon: Target,
    title: 'Definissez votre cible ideale',
    description:
      "Choisissez vos secteurs, vos villes, vos criteres. L'outil ne cherche que des prospects qui correspondent a votre offre.",
    highlights: ['Multi-secteurs', 'Multi-villes', 'Criteres precis'],
    gradient: 'from-amber-500/20 via-amber-500/10 to-brand-500/10',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  analytics: {
    icon: TrendingUp,
    title: "Vos performances en un coup d'oeil",
    description:
      "Suivez l'evolution de vos campagnes, identifiez ce qui fonctionne, optimisez votre approche.",
    highlights: ['Courbes de progression', 'Comparaison periodes', 'ROI calcule'],
    gradient: 'from-blue-500/20 via-blue-500/10 to-purple-500/10',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
}

export default function DemoBanner({ page, onHide }) {
  const [isVisible, setIsVisible] = useState(true)

  const config = bannerConfig[page]

  if (!config || !isVisible) return null

  const Icon = config.icon

  const handleHide = () => {
    setIsVisible(false)
    if (onHide) onHide()
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.gradient} border border-white/5 mb-8`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${config.iconBg} flex items-center justify-center`}
          >
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${config.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold text-white mb-2">
                  {config.title}
                </h2>
                <p className="text-sm sm:text-base text-dark-300 leading-relaxed max-w-2xl">
                  {config.description}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={handleHide}
                className="flex-shrink-0 p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Masquer le bandeau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Highlights */}
            <div className="flex flex-wrap gap-2 mt-4">
              {config.highlights.map((highlight, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs sm:text-sm font-medium text-white"
                >
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Badge discret "Donnees de demonstration"
export function DemoBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800/90 backdrop-blur-sm border border-dark-700 text-xs text-dark-400">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Donnees de demonstration</span>
    </div>
  )
}

// Badge AutoPilot pour la sidebar
export function AutoPilotBadge({ sentToday = 18, isActive = true }) {
  if (!isActive) return null

  return (
    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-[10px] font-medium text-brand-400">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
      Actif - {sentToday} envoyes
    </span>
  )
}
