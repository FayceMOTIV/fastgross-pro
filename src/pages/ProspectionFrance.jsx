import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Search,
  MapPin,
  Building2,
  Mail,
  Phone,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SECTORS = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'boulangerie', label: 'Boulangerie' },
  { id: 'traiteur', label: 'Traiteur' },
  { id: 'dentiste', label: 'Dentiste' },
  { id: 'coiffeur', label: 'Coiffeur' },
  { id: 'beaute', label: 'Beaute / Spa' },
  { id: 'garage', label: 'Garage auto' },
  { id: 'btp', label: 'BTP / Artisans' },
  { id: 'immobilier', label: 'Immobilier' },
  { id: 'avocat', label: 'Avocat' },
  { id: 'sport', label: 'Sport / Fitness' },
  { id: 'veterinaire', label: 'Veterinaire' },
  { id: 'pharmacie', label: 'Pharmacie' },
  { id: 'auto_ecole', label: 'Auto-ecole' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'photographe', label: 'Photographe' },
  { id: 'formation', label: 'Formation' },
]

const STEPS = [
  { id: 'sirene', label: 'Recherche SIRENE...' },
  { id: 'enrich', label: 'Enrichissement emails & telephones...' },
  { id: 'verify', label: 'Verification des emails...' },
  { id: 'import', label: 'Import dans le CRM...' },
]

export default function ProspectionFrance() {
  const [sector, setSector] = useState('')
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!sector || !city) {
      toast.error('Selectionnez un secteur et une ville')
      return
    }

    setLoading(true)
    setResults(null)
    setError(null)
    setCurrentStep(0)

    // Simuler la progression des etapes (la function fait tout d'un coup)
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 2) {
          clearInterval(stepTimer)
          return prev
        }
        return prev + 1
      })
    }, 3000)

    try {
      const fn = httpsCallable(functions, 'runProspectionFrance')
      const { data } = await fn({ sector, city, limit })

      clearInterval(stepTimer)
      setCurrentStep(STEPS.length - 1)

      if (data.success) {
        setResults(data)
        toast.success(`${data.imported} prospects importes dans le CRM`)
      }
    } catch (err) {
      clearInterval(stepTimer)
      setError(err.message || 'Erreur lors de la recherche')
      toast.error('Erreur: ' + (err.message || 'Recherche echouee'))
    } finally {
      setLoading(false)
      setTimeout(() => setCurrentStep(-1), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Prospection France
        </h2>
        <p className="text-text-muted text-sm mt-1">
          Sources officielles (SIRENE, INSEE) — 90% precision, gratuit
        </p>
      </div>

      {/* Formulaire de recherche */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Secteur */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Secteur d'activite</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="input-field w-full"
              disabled={loading}
            >
              <option value="">Choisir un secteur...</option>
              {SECTORS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Ville */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Ville</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lyon, Paris, Marseille..."
                className="input-field w-full pl-9"
                disabled={loading}
              />
            </div>
          </div>

          {/* Limite */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
              Limite : {limit} prospects
            </label>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full mt-2 accent-accent"
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>10</span>
              <span>200</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !sector || !city}
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Rechercher des prospects
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {loading && currentStep >= 0 && (
        <div className="card p-4">
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-3">
                {i < currentStep ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : i === currentStep ? (
                  <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  i <= currentStep ? 'text-text' : 'text-text-muted'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="card p-4 border-danger/20 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Resultats */}
      {results && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Users} label="Total importes" value={results.imported} />
            <StatCard icon={Mail} label="Avec email" value={results.stats.withEmail} color="text-green-500" />
            <StatCard icon={Phone} label="Avec telephone" value={results.stats.withPhone} color="text-blue-500" />
            <StatCard icon={Globe} label="Avec site web" value={results.stats.withWebsite} color="text-purple-500" />
            <StatCard icon={TrendingUp} label="Score >= 70" value={results.stats.highScore} color="text-orange-500" />
          </div>

          {/* Score moyen */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Score moyen</span>
              <span className={`text-lg font-bold ${
                results.stats.avgScore >= 70 ? 'text-green-500' :
                results.stats.avgScore >= 40 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {results.stats.avgScore}/100
              </span>
            </div>
            <div className="mt-2 h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  results.stats.avgScore >= 70 ? 'bg-green-500' :
                  results.stats.avgScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${results.stats.avgScore}%` }}
              />
            </div>
          </div>

          {/* Erreurs */}
          {results.errors?.length > 0 && (
            <div className="card p-4">
              <p className="text-sm text-text-muted mb-2">
                {results.errors.length} erreur(s) lors de l'enrichissement
              </p>
              <div className="space-y-1">
                {results.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-danger">{err.name}: {err.error}</p>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="card p-4 bg-accent/5 border-accent/20">
            <p className="text-sm text-text">
              {results.imported} prospects ont ete importes dans votre CRM.
              Rendez-vous dans l'onglet{' '}
              <a href="/app/crm" className="text-accent font-medium hover:underline">
                CRM
              </a>
              {' '}pour les contacter.
            </p>
          </div>
        </div>
      )}

      {/* Section International */}
      <div className="mt-8 pt-8 border-t border-border">
        <div className="card p-6 bg-surface/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-text-muted/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-text-muted" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-text">Prospection internationale</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-text-muted/10 text-text-muted uppercase">
                  Sur demande
                </span>
              </div>
              <p className="text-sm text-text-muted mb-3">
                Vous souhaitez prospecter des entreprises a l'etranger ?
                Contactez-nous pour activer ce module (Hunter.io, Apollo.io, LinkedIn).
              </p>
              <a
                href="mailto:contact@face-media-factory.com?subject=Activation%20prospection%20internationale"
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-text' }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
