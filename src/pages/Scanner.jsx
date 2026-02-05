import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanner } from '@/hooks/useCloudFunctions'
import { useClients } from '@/hooks/useFirestore'
import ProgressSteps from '@/components/ProgressSteps'
import toast from 'react-hot-toast'
import {
  Scan,
  Globe,
  Loader2,
  CheckCircle2,
  Target,
  Users,
  MessageSquare,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const scanSteps = [
  { label: 'Scraping du contenu', key: 'scraping' },
  { label: 'Analyse du positionnement', key: 'positioning' },
  { label: 'Identification du marché cible', key: 'market' },
  { label: 'Génération des arguments', key: 'arguments' },
  { label: 'Création du profil', key: 'profile' },
]

export default function Scanner() {
  const navigate = useNavigate()
  const { scan, scanResult, scanning, scanError } = useScanner()
  const { clients, add: addClient } = useClients()
  const [url, setUrl] = useState('')
  const [clientName, setClientName] = useState('')
  const [step, setStep] = useState('input') // input | scanning | result
  const [currentScanStep, setCurrentScanStep] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)

  // Simulate scan progress
  useEffect(() => {
    if (step !== 'scanning') {
      setCurrentScanStep(0)
      setScanProgress(0)
      return
    }

    const stepInterval = setInterval(() => {
      setCurrentScanStep(prev => {
        if (prev >= scanSteps.length - 1) {
          clearInterval(stepInterval)
          return prev
        }
        setScanProgress(0)
        return prev + 1
      })
    }, 2000)

    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + 10, 100))
    }, 200)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [step])

  const handleScan = async (e) => {
    e.preventDefault()
    if (!url) return

    setStep('scanning')
    try {
      // Create client first
      const clientId = await addClient({
        name: clientName || new URL(url.startsWith('http') ? url : `https://${url}`).hostname,
        url: url.startsWith('http') ? url : `https://${url}`,
        status: 'scanning',
      })

      // Launch scan
      await scan(url.startsWith('http') ? url : `https://${url}`, clientId)
      setStep('result')
      toast.success('Analyse terminée avec succès')
    } catch (err) {
      console.error('Scan error:', err)
      toast.error('Erreur lors de l\'analyse du site')
      setStep('input')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Scan className="w-8 h-8 text-brand-400" />
          Scanner
        </h1>
        <p className="text-dark-400 mt-1">
          Analysez le site d'un client pour générer son profil de prospection IA
        </p>
      </div>

      {/* Input step */}
      {step === 'input' && (
        <div className="max-w-2xl">
          <form onSubmit={handleScan} className="space-y-6">
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 text-brand-400">
                <Globe className="w-5 h-5" />
                <h2 className="font-display font-semibold text-white">Site web du client</h2>
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-2">Nom du client (optionnel)</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-field"
                  placeholder="Ex: Agence XYZ, Cabinet Martin..."
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-2">URL du site web</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-field text-lg"
                  placeholder="https://example.com"
                  required
                />
                <p className="text-xs text-dark-500 mt-2">
                  L'IA va analyser le site pour comprendre l'offre, le positionnement et le marché cible
                </p>
              </div>

              <button type="submit" className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Lancer l'analyse IA
              </button>
            </div>
          </form>

          {/* Recent scans */}
          {clients.length > 0 && (
            <div className="mt-8">
              <h3 className="section-title mb-4">Analyses récentes</h3>
              <div className="space-y-3">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="glass-card-hover p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => navigate(`/app/clients/${client.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-xs font-bold text-brand-400">
                        {client.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{client.name}</p>
                        <p className="text-xs text-dark-500">{client.url}</p>
                      </div>
                    </div>
                    <span className={client.status === 'scanned' ? 'badge-success' : 'badge-warning'}>
                      {client.status === 'scanned' ? 'Analysé' : 'En cours'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanning step */}
      {step === 'scanning' && (
        <div className="max-w-2xl">
          <div className="glass-card p-12 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-white">Analyse en cours...</h2>
              <p className="text-dark-400 mt-2">L'IA explore le site et génère le profil de prospection</p>
            </div>

            <div className="text-left max-w-sm mx-auto">
              <ProgressSteps
                steps={scanSteps.map((s, i) => ({
                  ...s,
                  progress: i === currentScanStep ? scanProgress : undefined
                }))}
                currentStep={currentScanStep}
              />
            </div>

            <p className="text-xs text-dark-500">
              Étape {currentScanStep + 1}/{scanSteps.length} — {scanSteps[currentScanStep]?.label}
            </p>
          </div>
        </div>
      )}

      {/* Result step */}
      {step === 'result' && scanResult && (
        <div className="max-w-3xl space-y-6">
          <div className="glass-card p-8 border-brand-500/20">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-brand-400" />
              <h2 className="text-xl font-display font-semibold text-white">
                Analyse terminée
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-medium text-white">Positionnement</h3>
                  </div>
                  <p className="text-sm text-dark-300">{scanResult.positioning || 'Analyse en cours...'}</p>
                </div>

                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-white">Persona idéal</h3>
                  </div>
                  <p className="text-sm text-dark-300">{scanResult.idealPersona || 'Analyse en cours...'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-medium text-white">Arguments clés</h3>
                  </div>
                  <ul className="text-sm text-dark-300 space-y-1">
                    {(scanResult.keyArguments || []).map((arg, i) => (
                      <li key={i}>• {arg}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-dark-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-medium text-white">Objections anticipées</h3>
                  </div>
                  <ul className="text-sm text-dark-300 space-y-1">
                    {(scanResult.objections || []).map((obj, i) => (
                      <li key={i}>• {obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate('/app/forgeur')}
                className="btn-primary flex items-center gap-2"
              >
                Générer les séquences
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep('input')} className="btn-secondary">
                Nouveau scan
              </button>
            </div>
          </div>
        </div>
      )}

      {scanError && (
        <div className="max-w-2xl bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          Erreur lors de l'analyse : {scanError.message}
        </div>
      )}
    </div>
  )
}
