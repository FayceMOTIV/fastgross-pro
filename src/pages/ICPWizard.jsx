import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Send,
  Loader2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  MapPin,
  Briefcase,
  DollarSign,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'

import StrategyPreview from '@/components/campaign/StrategyPreview'

// Mock ICP conversation for demo
const DEMO_QUESTIONS = [
  'Quel est le secteur d\'activite de vos clients ideaux ?',
  'Quelle taille d\'entreprise ciblez-vous (TPE, PME, ETI, Grand Compte) ?',
  'Dans quelle zone geographique concentrez-vous vos efforts ?',
]

const DEMO_ICP = {
  sector: 'SaaS / Tech',
  companySize: 'PME (10-250 salaries)',
  jobTitles: ['CEO', 'CTO', 'Directeur Commercial'],
  geography: 'France metropolitaine',
  painPoints: ['Acquisition client trop chere', 'Pas de process de prospection structure'],
  budget: '500-5000 EUR/mois',
  decisionCriteria: ['ROI mesurable', 'Mise en place rapide', 'Support francais'],
  idealCompanyProfile: 'PME tech en croissance cherchant a structurer sa prospection',
  excludeCriteria: ['Entreprises < 5 salaries', 'Secteur public'],
  buyingSignals: ['Recrutement commercial', 'Levee de fonds recente', 'Nouvelle offre'],
}

export default function ICPWizard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId')

  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: clarifyICP, loading: clarifying } = useCloudFunction('clarifyICP')
  const { call: generateStrategy, loading: generatingStrategy } =
    useCloudFunction('generateCampaignStrategy')
  const { call: estimateProspects, loading: estimating } =
    useCloudFunction('estimateProspects')

  const [step, setStep] = useState('chat') // chat | review | strategy
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Decrivez votre client ideal en quelques phrases. Qui voulez-vous contacter ? Quel probleme resolvez-vous pour eux ?',
    },
  ])
  const [input, setInput] = useState('')
  const [round, setRound] = useState(0)
  const [icp, setIcp] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [activeCampaignId, setActiveCampaignId] = useState(campaignId)
  const chatEndRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Create campaign doc if needed
  const ensureCampaign = useCallback(async () => {
    if (activeCampaignId) return activeCampaignId

    if (isDemo) {
      const demoId = `demo-campaign-${Date.now()}`
      setActiveCampaignId(demoId)
      return demoId
    }

    const orgId = currentOrg?.id
    if (!orgId) return null

    const campaignsRef = collection(db, 'organizations', orgId, 'campaigns')
    const newDoc = doc(campaignsRef)
    await setDoc(newDoc, {
      name: 'Nouvelle campagne',
      status: 'draft',
      icpStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setActiveCampaignId(newDoc.id)
    return newDoc.id
  }, [activeCampaignId, currentOrg?.id, isDemo])

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || clarifying) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    try {
      const cId = await ensureCampaign()

      if (isDemo) {
        // Demo mode — simulate AI response
        await new Promise((r) => setTimeout(r, 1500))

        if (round < 2) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: DEMO_QUESTIONS[round] || 'Merci. Votre ICP est en cours de generation...',
            },
          ])
          setRound((r) => r + 1)
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'Parfait ! J\'ai assez d\'informations pour generer votre profil client ideal. Voici le resultat.',
            },
          ])
          setIcp(DEMO_ICP)
          setStep('review')
        }
        return
      }

      // Real mode — call Cloud Function
      const conversationHistory = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }))

      const result = await clarifyICP({
        orgId: currentOrg.id,
        campaignId: cId,
        userInput: userMessage,
        conversationHistory,
        round,
      })

      if (result.status === 'clarifying' && result.questions) {
        const questionsText = result.questions.join('\n\n')
        setMessages((prev) => [...prev, { role: 'assistant', content: questionsText }])
        setRound(result.round)
      } else if (result.status === 'complete' && result.icp) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.summary || 'Votre ICP est pret ! Voici le resultat.',
          },
        ])
        setIcp(result.icp)
        setStep('review')
      }
    } catch (error) {
      toast.error('Erreur: ' + (error?.message || 'Echec de la clarification'))
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desole, une erreur est survenue. Reessayez.' },
      ])
    }
  }, [input, clarifying, round, messages, currentOrg?.id, isDemo, ensureCampaign, clarifyICP])

  // Generate strategy
  const handleGenerateStrategy = useCallback(async () => {
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 2000))
        setStrategy({
          channels: [
            { name: 'email', priority: 1, dailyLimit: 50, role: 'Canal principal' },
            { name: 'linkedin', priority: 2, dailyLimit: 20, role: 'Warming social' },
            { name: 'sms', priority: 3, dailyLimit: 10, role: 'Relance rapide' },
          ],
          sequenceSteps: [
            { day: 0, channel: 'email', type: 'intro', description: 'Email de premier contact' },
            {
              day: 2,
              channel: 'linkedin',
              type: 'connect',
              description: 'Demande connexion LinkedIn',
            },
            {
              day: 4,
              channel: 'email',
              type: 'followup',
              description: 'Relance valeur ajoutee',
            },
            { day: 7, channel: 'sms', type: 'sms', description: 'SMS de relance' },
            { day: 10, channel: 'email', type: 'breakup', description: 'Dernier email' },
          ],
          tone: 'professionnel_decontracte',
          dailyTarget: 30,
          expectedReplyRate: 0.08,
          expectedMeetingRate: 0.02,
          tips: [
            'Personnalisez chaque premier email avec une reference specifique',
            'Envoyez les emails entre 9h et 11h pour maximiser les ouvertures',
          ],
        })
        setEstimate({
          total: 1250,
          existingInCRM: 89,
          newFromSources: 1161,
          bySource: { sirene: 450, linkedin: 380, google_maps: 220, societe_com: 111 },
          byChannel: { email: 1062, phone: 750, linkedin: 500, sms: 375 },
          confidence: 0.75,
        })
        setStep('strategy')
        return
      }

      const [stratResult, estResult] = await Promise.all([
        generateStrategy({ orgId: currentOrg.id, campaignId: activeCampaignId }),
        estimateProspects({ orgId: currentOrg.id, campaignId: activeCampaignId }),
      ])

      setStrategy(stratResult.strategy)
      setEstimate(estResult.estimate)
      setStep('strategy')
    } catch (error) {
      toast.error('Erreur generation strategie: ' + (error?.message || 'Echec'))
    }
  }, [isDemo, currentOrg?.id, activeCampaignId, generateStrategy, estimateProspects])

  // Launch campaign
  const handleLaunch = useCallback(() => {
    toast.success('Campagne creee avec succes !')
    navigate(
      `/app/campaigns${activeCampaignId ? `?id=${activeCampaignId}` : ''}`
    )
  }, [navigate, activeCampaignId])

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-text">Assistant Campagne</h1>
          <p className="text-sm text-text-muted">Creez votre campagne en 3 etapes</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { id: 'chat', label: 'Profil Client', icon: Target },
          { id: 'review', label: 'Validation ICP', icon: CheckCircle },
          { id: 'strategy', label: 'Strategie', icon: Sparkles },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-gray-200" />}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                step === s.id
                  ? 'bg-accent/10 text-accent'
                  : s.id === 'chat' ||
                      (s.id === 'review' && (step === 'review' || step === 'strategy')) ||
                      (s.id === 'strategy' && step === 'strategy')
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-text-muted'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step: Chat */}
      <AnimatePresence mode="wait">
        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card"
          >
            {/* Chat messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-md'
                        : 'bg-gray-100 text-text rounded-bl-md'
                    }`}
                  >
                    {msg.content.split('\n\n').map((p, j) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {clarifying && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Decrivez votre client ideal..."
                  className="input-field flex-1 text-sm"
                  disabled={clarifying}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || clarifying}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Round {round + 1}/3 — L'IA va affiner votre profil avec des questions ciblees
              </p>
            </div>
          </motion.div>
        )}

        {/* Step: Review ICP */}
        {step === 'review' && icp && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-text">Profil Client Ideal (ICP)</h2>
                  <p className="text-sm text-text-muted">Validez ou modifiez avant de continuer</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sector */}
                <div className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-text-muted uppercase">Secteur</span>
                  </div>
                  <p className="text-sm font-medium text-text">{icp.sector || '—'}</p>
                </div>

                {/* Company size */}
                <div className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Taille entreprise
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text">{icp.companySize || '—'}</p>
                </div>

                {/* Geography */}
                <div className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Zone geographique
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text">{icp.geography || '—'}</p>
                </div>

                {/* Budget */}
                <div className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-text-muted uppercase">Budget</span>
                  </div>
                  <p className="text-sm font-medium text-text">{icp.budget || '—'}</p>
                </div>

                {/* Job titles */}
                <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Postes cibles
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(icp.jobTitles || []).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pain points */}
                <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Points de douleur
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {(icp.painPoints || []).map((p, i) => (
                      <li key={i} className="text-sm text-text flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buying signals */}
                <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-text-muted uppercase">
                      Signaux d'achat
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(icp.buyingSignals || []).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('chat')}
                className="btn-ghost text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={handleGenerateStrategy}
                disabled={generatingStrategy || estimating}
                className="btn-primary flex items-center gap-2"
              >
                {generatingStrategy || estimating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generer la strategie
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Strategy */}
        {step === 'strategy' && strategy && (
          <motion.div
            key="strategy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <StrategyPreview
              strategy={strategy}
              estimate={estimate}
              icp={icp}
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('review')}
                className="btn-ghost text-sm flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour ICP
              </button>
              <button
                onClick={handleLaunch}
                className="btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Lancer la campagne
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
