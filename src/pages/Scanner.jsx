import { useState, useEffect } from 'react'
import {
  Search,
  Globe,
  Mail,
  Phone,
  Building2,
  Users,
  Linkedin,
  Twitter,
  Instagram,
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  History,
  Target,
  Lightbulb,
  Code,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { checkQuota, incrementUsage } from '@/services/quotas'

// Mock scan data for demo/development
const generateMockScan = (url) => {
  const domain = new URL(url).hostname.replace('www.', '')
  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

  return {
    company_name: companyName,
    website: url,
    industry: ['SaaS', 'E-commerce', 'Conseil', 'Marketing', 'Technologie'][Math.floor(Math.random() * 5)],
    company_size: ['TPE (1-10)', 'PME (10-50)', 'ETI (50-250)', 'GE (250+)'][Math.floor(Math.random() * 4)],
    main_products: [
      'Solution CRM',
      'Plateforme marketing',
      'Outil de gestion',
      'Services de conseil',
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    pain_points: [
      'Acquisition client complexe',
      'Processus manuels chronophages',
      'Manque de visibilite sur les KPIs',
      'Difficulte a scaler',
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    tone: ['Professionnel', 'Decontracte', 'Technique', 'Innovant'][Math.floor(Math.random() * 4)],
    language: 'Francais',
    key_contacts: [
      {
        name: 'Jean Dupont',
        email: `contact@${domain}`,
        role: 'Directeur Commercial',
        verified: true,
      },
      {
        name: 'Marie Martin',
        email: `marie.martin@${domain}`,
        role: 'Responsable Marketing',
        verified: false,
      },
    ],
    social_links: {
      linkedin: `https://linkedin.com/company/${domain.split('.')[0]}`,
      twitter: `https://twitter.com/${domain.split('.')[0]}`,
    },
    technologies: ['React', 'Node.js', 'Google Analytics', 'HubSpot', 'Stripe'].slice(
      0,
      Math.floor(Math.random() * 4) + 1
    ),
    summary: `${companyName} est une entreprise ${['dynamique', 'innovante', 'en croissance'][Math.floor(Math.random() * 3)]} specialisee dans le domaine ${['du digital', 'des services B2B', 'de la technologie'][Math.floor(Math.random() * 3)]}. Leur approche ${['moderne', 'personnalisee', 'axee sur les resultats'][Math.floor(Math.random() * 3)]} leur permet de se demarquer sur leur marche.`,
    personalization_hooks: [
      `Felicitations pour votre presence sur ${domain} - votre positionnement sur le marche est clair et impactant.`,
      `J'ai remarque que vous utilisez ${['React', 'HubSpot', 'des outils modernes'][Math.floor(Math.random() * 3)]} - nous partageons cette vision tech-first.`,
      `Votre approche de l'${['acquisition client', 'experience utilisateur', 'innovation'][Math.floor(Math.random() * 3)]} m'a particulierement interpele.`,
    ],
    scannedAt: new Date().toISOString(),
  }
}

// Scan history item component
function ScanHistoryItem({ scan, onSelect }) {
  return (
    <button
      onClick={() => onSelect(scan)}
      className="w-full p-4 text-left bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
          <Globe className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{scan.company_name}</h4>
          <p className="text-sm text-gray-500 truncate">{scan.website}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {scan.industry}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(scan.scannedAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

// Scan result display
function ScanResult({ data, onAddProspect }) {
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{data.company_name}</h2>
                <a
                  href={data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-violet-600 hover:underline flex items-center gap-1"
                >
                  {data.website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <button
              onClick={onAddProspect}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter aux prospects
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Secteur</p>
            <p className="font-semibold text-gray-900">{data.industry}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Taille</p>
            <p className="font-semibold text-gray-900">{data.company_size}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Ton</p>
            <p className="font-semibold text-gray-900">{data.tone}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Langue</p>
            <p className="font-semibold text-gray-900">{data.language}</p>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Analyse IA</h3>
        </div>
        <p className="text-gray-700 leading-relaxed">{data.summary}</p>
      </div>

      {/* Grid with contacts, hooks, etc */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contacts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Contacts detectes</h3>
          </div>
          <div className="space-y-3">
            {data.key_contacts?.map((contact, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.role}</p>
                  <p className="text-sm text-violet-600">{contact.email}</p>
                </div>
                {contact.verified ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" />
                    Verifie
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    A verifier
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Personalization Hooks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Accroches personnalisees</h3>
          </div>
          <div className="space-y-3">
            {data.personalization_hooks?.map((hook, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-sm text-gray-700 italic">"{hook}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pain Points */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Pain points detectes</h3>
          </div>
          <div className="space-y-2">
            {data.pain_points?.map((pain, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <p className="text-sm text-gray-700">{pain}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technologies */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Technologies</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.technologies?.map((tech, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                {tech}
              </span>
            ))}
          </div>

          {/* Social Links */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3">Reseaux sociaux</p>
            <div className="flex gap-2">
              {data.social_links?.linkedin && (
                <a
                  href={data.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {data.social_links?.twitter && (
                <a
                  href={data.social_links.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {data.social_links?.instagram && (
                <a
                  href={data.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Scanner() {
  const { user } = useAuth()
  const { currentOrg } = useOrg()
  const [url, setUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [progress, setProgress] = useState(0)

  // Load scan history from localStorage for demo
  useEffect(() => {
    const saved = localStorage.getItem('fmf_scan_history')
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading scan history:', e)
      }
    }
  }, [])

  const handleScan = async (e) => {
    e.preventDefault()

    if (!url) {
      toast.error('Entrez une URL a analyser')
      return
    }

    // Validate URL
    let validUrl = url
    if (!url.startsWith('http')) {
      validUrl = 'https://' + url
    }

    try {
      new URL(validUrl)
    } catch {
      toast.error('URL invalide')
      return
    }

    // Check quota (mock for demo)
    if (user) {
      const quotaCheck = await checkQuota(user.uid, 'enrichments')
      if (!quotaCheck.allowed) {
        toast.error(quotaCheck.error)
        return
      }
    }

    setIsScanning(true)
    setProgress(0)
    setScanResult(null)

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 300)

    try {
      // In production, this would call the Cloud Function
      // For now, use mock data
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const result = generateMockScan(validUrl)
      setScanResult(result)

      // Save to history
      const newHistory = [result, ...scanHistory.slice(0, 9)]
      setScanHistory(newHistory)
      localStorage.setItem('fmf_scan_history', JSON.stringify(newHistory))

      // Increment usage
      if (user) {
        await incrementUsage(user.uid, 'enrichments')
      }

      setProgress(100)
      toast.success('Analyse terminee !')
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Erreur lors de l\'analyse')
    } finally {
      clearInterval(progressInterval)
      setIsScanning(false)
    }
  }

  const handleAddProspect = () => {
    if (!scanResult) return
    // In production, this would create a prospect in Firestore
    toast.success(`${scanResult.company_name} ajoute aux prospects !`)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900">Scanner</h1>
        <p className="text-gray-500 mt-1">Analysez un site web pour extraire des informations exploitables</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleScan} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemple.com"
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all text-gray-900 placeholder:text-gray-400"
              disabled={isScanning}
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-violet-200"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Analyser
              </>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {isScanning && (
          <div className="mt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Analyse en cours... Extraction des donnees et analyse IA
            </p>
          </div>
        )}
      </form>

      {/* Results or History */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scan History Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Historique</h3>
            </div>
            {scanHistory.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-xl text-center">
                <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun scan recent</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanHistory.map((scan, idx) => (
                  <ScanHistoryItem key={idx} scan={scan} onSelect={setScanResult} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Results Area */}
        <div className="lg:col-span-3">
          {scanResult ? (
            <ScanResult data={scanResult} onAddProspect={handleAddProspect} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pret a scanner</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Entrez l'URL d'un site web pour extraire automatiquement les informations de l'entreprise,
                les contacts, et des accroches personnalisees pour votre prospection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
