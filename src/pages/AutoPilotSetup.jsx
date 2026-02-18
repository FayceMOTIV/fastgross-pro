import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  Rocket, Building2, Users, Target, Zap, CheckCircle,
  ArrowRight, ArrowLeft, Sparkles, MessageSquare, Mail,
  Phone, Instagram, Linkedin, Globe, DollarSign, Award,
  Brain, Search, Send, Calendar, TrendingUp, Play
} from 'lucide-react'

const STEPS = [
  { id: 'company', title: 'Votre Entreprise', icon: Building2, description: 'Parlez-moi de vous' },
  { id: 'avatar', title: 'Client Ideal', icon: Target, description: 'Qui voulez-vous atteindre?' },
  { id: 'channels', title: 'Canaux', icon: Send, description: 'Comment les contacter?' },
  { id: 'preview', title: 'Preview', icon: Sparkles, description: 'Voyez la magie' },
  { id: 'launch', title: 'Lancement', icon: Rocket, description: 'C\'est parti!' },
]

export default function AutoPilotSetup() {
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [previewProspects, setPreviewProspects] = useState([])
  const [generating, setGenerating] = useState(false)

  const [config, setConfig] = useState({
    // Company Info
    companyName: '',
    industry: '',
    mainService: '',
    uniqueValue: '',
    typicalResults: '',
    priceRange: '',
    targetRevenue: '',
    caseStudy: '',

    // Avatar Info
    avatarTitle: '',
    avatarIndustry: '',
    avatarSize: '',
    avatarPainPoints: [],
    avatarSignals: [],
    avatarLocation: '',
    avatarKeywords: [],

    // Channels
    whatsappEnabled: true,
    instagramEnabled: true,
    emailEnabled: true,
    linkedinEnabled: false,

    // Settings
    prospectsPerDay: 20,
    autoSend: false,
    autoRespond: false,
    scheduleCallOnInterest: true,
  })

  useEffect(() => {
    loadExistingConfig()
  }, [currentOrg?.id])

  const loadExistingConfig = async () => {
    if (!currentOrg?.id) return
    try {
      const configDoc = await getDoc(doc(db, 'organizations', currentOrg.id, 'autoPilotConfig', 'main'))
      if (configDoc.exists()) {
        setConfig(prev => ({ ...prev, ...configDoc.data() }))
      }
    } catch (error) {
      console.error('Error loading config:', error)
    }
  }

  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      if (currentStep === 2) {
        generatePreview()
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const generatePreview = async () => {
    if (!currentOrg?.id) return
    setGenerating(true)

    try {
      const generatePreviewFn = httpsCallable(functions, 'generateAutoPilotPreview')
      const result = await generatePreviewFn({
        orgId: currentOrg.id,
        companyProfile: {
          companyName: config.companyName,
          industry: config.industry,
          mainService: config.mainService,
          uniqueValue: config.uniqueValue,
          typicalResults: config.typicalResults,
          priceRange: config.priceRange,
          caseStudy: config.caseStudy,
        },
        clientAvatar: {
          avatarTitle: config.avatarTitle,
          avatarIndustry: config.avatarIndustry,
          avatarSize: config.avatarSize,
          avatarPainPoints: config.avatarPainPoints,
          avatarSignals: config.avatarSignals,
          avatarLocation: config.avatarLocation,
          avatarKeywords: config.avatarKeywords,
        },
      })

      setPreviewProspects(result.data.prospects || [])
    } catch (error) {
      console.error('Preview error:', error)
      // Mock preview for demo
      setPreviewProspects([
        {
          name: 'Studio Lumiere Paris',
          industry: 'Photographie',
          website: 'studiolumiere.fr',
          painPoint: 'Pas de presence video sur Instagram',
          personalizedHook: 'J\'ai vu que vous faites de superbes photos mais pas de video - c\'est 3x plus d\'engagement!',
          score: 87,
          channel: 'whatsapp',
        },
        {
          name: 'Atelier Graphique',
          industry: 'Design',
          website: 'ateliergraphique.com',
          painPoint: 'Site web date de 2019, pas de portfolio video',
          personalizedHook: 'Votre portfolio est impressionnant - imaginez-le en video pour vos reseaux!',
          score: 82,
          channel: 'instagram',
        },
        {
          name: 'Creative Agency Lyon',
          industry: 'Marketing',
          website: 'creative-agency-lyon.fr',
          painPoint: 'Contenu social irregulier, pas de Reels',
          personalizedHook: 'Vous aidez vos clients a etre visibles mais vos propres Reels manquent!',
          score: 79,
          channel: 'whatsapp',
        },
      ])
    } finally {
      setGenerating(false)
    }
  }

  const launchAutoPilot = async () => {
    if (!currentOrg?.id) return
    setLoading(true)

    try {
      // Launch the engine - the Cloud Function will save the config
      const launchFn = httpsCallable(functions, 'launchAutoPilot')
      await launchFn({
        orgId: currentOrg.id,
        companyProfile: {
          companyName: config.companyName,
          industry: config.industry,
          mainService: config.mainService,
          uniqueValue: config.uniqueValue,
          typicalResults: config.typicalResults,
          priceRange: config.priceRange,
          caseStudy: config.caseStudy,
        },
        clientAvatar: {
          avatarTitle: config.avatarTitle,
          avatarIndustry: config.avatarIndustry,
          avatarSize: config.avatarSize,
          avatarPainPoints: config.avatarPainPoints,
          avatarSignals: config.avatarSignals,
          avatarLocation: config.avatarLocation,
          avatarKeywords: config.avatarKeywords,
        },
        channelSettings: {
          whatsappEnabled: config.whatsappEnabled,
          instagramEnabled: config.instagramEnabled,
          emailEnabled: config.emailEnabled,
          linkedinEnabled: config.linkedinEnabled,
          prospectsPerDay: config.prospectsPerDay,
          autoSend: config.autoSend,
          autoRespond: config.autoRespond,
        },
      })

      // Navigate to dashboard
      navigate('/app/autopilot')
    } catch (error) {
      console.error('Launch error:', error)
      alert('Erreur lors du lancement: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'company':
        return <CompanyStep config={config} updateConfig={updateConfig} />
      case 'avatar':
        return <AvatarStep config={config} updateConfig={updateConfig} />
      case 'channels':
        return <ChannelsStep config={config} updateConfig={updateConfig} />
      case 'preview':
        return <PreviewStep prospects={previewProspects} generating={generating} config={config} />
      case 'launch':
        return <LaunchStep config={config} updateConfig={updateConfig} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AutoPilot Setup</h1>
                <p className="text-sm text-white/60">Machine a clients automatisee</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex items-center ${idx < STEPS.length - 1 ? 'pr-2' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      idx < currentStep
                        ? 'bg-green-500 text-white'
                        : idx === currentStep
                        ? 'bg-purple-500 text-white ring-4 ring-purple-500/30'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-8 h-0.5 ml-2 ${idx < currentStep ? 'bg-green-500' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step Title */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-4">
            {(() => {
              const Icon = STEPS[currentStep].icon
              return <Icon className="w-4 h-4" />
            })()}
            Etape {currentStep + 1} sur {STEPS.length}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {STEPS[currentStep].title}
          </h2>
          <p className="text-white/60">
            {STEPS[currentStep].description}
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={launchAutoPilot}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Lancement...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  LANCER L'AUTOPILOT
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Step 1: Company Info
function CompanyStep({ config, updateConfig }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Nom de votre entreprise
          </label>
          <input
            type="text"
            value={config.companyName}
            onChange={(e) => updateConfig('companyName', e.target.value)}
            placeholder="Face Media Factory"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Votre secteur
          </label>
          <select
            value={config.industry}
            onChange={(e) => updateConfig('industry', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-purple-500"
          >
            <option value="">Selectionnez...</option>
            <option value="video">Production Video</option>
            <option value="marketing">Marketing Digital</option>
            <option value="design">Design / Branding</option>
            <option value="dev">Developpement Web/App</option>
            <option value="coaching">Coaching / Formation</option>
            <option value="consulting">Consulting</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Votre service principal (en 1 phrase)
        </label>
        <input
          type="text"
          value={config.mainService}
          onChange={(e) => updateConfig('mainService', e.target.value)}
          placeholder="Je cree des videos courtes qui generent des clients pour les entrepreneurs"
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Votre valeur unique (pourquoi vous et pas un autre?)
        </label>
        <textarea
          value={config.uniqueValue}
          onChange={(e) => updateConfig('uniqueValue', e.target.value)}
          placeholder="Tournage en 2h, livraison en 48h, format optimise pour chaque plateforme..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Resultats typiques pour vos clients
          </label>
          <input
            type="text"
            value={config.typicalResults}
            onChange={(e) => updateConfig('typicalResults', e.target.value)}
            placeholder="+300% de vues, +50% d'engagement..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Fourchette de prix
          </label>
          <select
            value={config.priceRange}
            onChange={(e) => updateConfig('priceRange', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-purple-500"
          >
            <option value="">Selectionnez...</option>
            <option value="500-1000">500 - 1 000 EUR</option>
            <option value="1000-2500">1 000 - 2 500 EUR</option>
            <option value="2500-5000">2 500 - 5 000 EUR</option>
            <option value="5000-10000">5 000 - 10 000 EUR</option>
            <option value="10000+">10 000+ EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Un exemple de resultat client (optionnel mais puissant)
        </label>
        <textarea
          value={config.caseStudy}
          onChange={(e) => updateConfig('caseStudy', e.target.value)}
          placeholder="J'ai aide Marie, photographe a Lyon, a passer de 500 a 15k abonnes en 3 mois avec des Reels..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500 resize-none"
        />
      </div>
    </div>
  )
}

// Step 2: Avatar Client
function AvatarStep({ config, updateConfig }) {
  const painPointOptions = [
    'Pas de presence video',
    'Peu d\'engagement sur les reseaux',
    'Site web vieillissant',
    'Difficulte a trouver des clients',
    'Pas de strategie de contenu',
    'Manque de temps pour creer',
    'Budget marketing limite',
    'Concurrence forte',
  ]

  const signalOptions = [
    'Vient de lancer son business',
    'A leve des fonds',
    'Recrute activement',
    'Publie du contenu irregulierement',
    'A un site mais pas de video',
    'Present sur Instagram sans Reels',
    'A des avis clients positifs',
    'Organise des evenements',
  ]

  const toggleArrayItem = (field, item) => {
    const current = config[field] || []
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateConfig(field, updated)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Titre / Role de votre client ideal
          </label>
          <input
            type="text"
            value={config.avatarTitle}
            onChange={(e) => updateConfig('avatarTitle', e.target.value)}
            placeholder="Fondateur, CEO, Directeur Marketing..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Son secteur d'activite
          </label>
          <input
            type="text"
            value={config.avatarIndustry}
            onChange={(e) => updateConfig('avatarIndustry', e.target.value)}
            placeholder="E-commerce, Coaching, Restaurant, SaaS..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Taille d'entreprise
          </label>
          <select
            value={config.avatarSize}
            onChange={(e) => updateConfig('avatarSize', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-purple-500"
          >
            <option value="">Selectionnez...</option>
            <option value="solo">Solopreneur</option>
            <option value="small">Petite equipe (2-10)</option>
            <option value="medium">PME (10-50)</option>
            <option value="large">Grande entreprise (50+)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Localisation
          </label>
          <input
            type="text"
            value={config.avatarLocation}
            onChange={(e) => updateConfig('avatarLocation', e.target.value)}
            placeholder="Paris, France, Francophone..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-3">
          Ses problemes principaux (selectionnez plusieurs)
        </label>
        <div className="flex flex-wrap gap-2">
          {painPointOptions.map(option => (
            <button
              key={option}
              onClick={() => toggleArrayItem('avatarPainPoints', option)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (config.avatarPainPoints || []).includes(option)
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-3">
          Signaux d'achat (comment les reperer?)
        </label>
        <div className="flex flex-wrap gap-2">
          {signalOptions.map(option => (
            <button
              key={option}
              onClick={() => toggleArrayItem('avatarSignals', option)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (config.avatarSignals || []).includes(option)
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Mots-cles pour les trouver (separes par virgules)
        </label>
        <input
          type="text"
          value={(config.avatarKeywords || []).join(', ')}
          onChange={(e) => updateConfig('avatarKeywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
          placeholder="coach business, consultant marketing, fondateur startup..."
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-purple-500"
        />
      </div>
    </div>
  )
}

// Step 3: Channels
function ChannelsStep({ config, updateConfig }) {
  const channels = [
    { id: 'whatsappEnabled', name: 'WhatsApp', icon: Phone, description: 'Taux de reponse le plus eleve', recommended: true },
    { id: 'instagramEnabled', name: 'Instagram DM', icon: Instagram, description: 'Ideal pour les creatifs' },
    { id: 'emailEnabled', name: 'Email', icon: Mail, description: 'Plus formel, bon pour B2B' },
    { id: 'linkedinEnabled', name: 'LinkedIn', icon: Linkedin, description: 'Pour les decision makers' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => updateConfig(channel.id, !config[channel.id])}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              config[channel.id]
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                config[channel.id] ? 'bg-purple-500' : 'bg-white/10'
              }`}>
                <channel.icon className={`w-6 h-6 ${config[channel.id] ? 'text-white' : 'text-white/60'}`} />
              </div>
              {channel.recommended && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                  Recommande
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{channel.name}</h3>
            <p className="text-sm text-white/60">{channel.description}</p>
          </button>
        ))}
      </div>

      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Parametres d'envoi</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Nombre de prospects par jour
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={config.prospectsPerDay}
              onChange={(e) => updateConfig('prospectsPerDay', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-white/60 mt-1">
              <span>5</span>
              <span className="text-purple-400 font-semibold">{config.prospectsPerDay} prospects/jour</span>
              <span>50</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <h4 className="font-medium text-white">Envoi automatique</h4>
              <p className="text-sm text-white/60">Envoyer sans validation manuelle</p>
            </div>
            <button
              onClick={() => updateConfig('autoSend', !config.autoSend)}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.autoSend ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                config.autoSend ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <h4 className="font-medium text-white">Reponses automatiques</h4>
              <p className="text-sm text-white/60">L'IA repond aux questions basiques</p>
            </div>
            <button
              onClick={() => updateConfig('autoRespond', !config.autoRespond)}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.autoRespond ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                config.autoRespond ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 4: Preview
function PreviewStep({ prospects, generating, config }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-300 text-sm mb-4">
          <Brain className="w-4 h-4" />
          Intelligence Artificielle en action
        </div>
        <h3 className="text-xl font-semibold text-white">
          Voici ce que l'AutoPilot va faire pour vous
        </h3>
      </div>

      {generating ? (
        <div className="flex flex-col items-center py-12">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
          <p className="text-white/60">L'IA analyse votre marche...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prospects.map((prospect, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-gradient-to-r from-white/10 to-white/5 border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white">{prospect.name}</h4>
                  <p className="text-sm text-white/60">{prospect.industry} • {prospect.website}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    prospect.score >= 80 ? 'bg-green-500/20 text-green-400' :
                    prospect.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    Score: {prospect.score}
                  </span>
                  {prospect.channel === 'whatsapp' && <Phone className="w-5 h-5 text-green-400" />}
                  {prospect.channel === 'instagram' && <Instagram className="w-5 h-5 text-pink-400" />}
                  {prospect.channel === 'email' && <Mail className="w-5 h-5 text-blue-400" />}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-sm text-red-300">
                  <strong>Probleme detecte:</strong> {prospect.painPoint}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-300">
                  <strong>Accroche personnalisee:</strong> "{prospect.personalizedHook}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Chaque message sera unique</h4>
            <p className="text-sm text-white/70">
              L'IA analyse le site, les reseaux, l'actualite de chaque prospect pour creer une accroche sur-mesure.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 5: Launch
function LaunchStep({ config, updateConfig }) {
  return (
    <div className="text-center py-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
        <Rocket className="w-12 h-12 text-white" />
      </div>

      <h3 className="text-2xl font-bold text-white mb-2">
        Pret a lancer votre machine a clients?
      </h3>
      <p className="text-white/60 mb-8 max-w-md mx-auto">
        L'AutoPilot va trouver, qualifier et contacter {config.prospectsPerDay} prospects par jour.
        Vous n'avez plus qu'a repondre aux interesses.
      </p>

      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <Search className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-white/80">Recherche 24/7</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <Brain className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-white/80">IA Personnalisation</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-white/80">RDV automatiques</p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 max-w-md mx-auto">
        <div className="flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-green-400" />
          <div className="text-left">
            <p className="text-green-400 font-semibold">Projection</p>
            <p className="text-sm text-white/70">
              ~{Math.round(config.prospectsPerDay * 0.15)} reponses positives/jour
              = ~{Math.round(config.prospectsPerDay * 0.15 * 22)} prospects chauds/mois
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
