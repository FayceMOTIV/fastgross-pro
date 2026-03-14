/**
 * OnboardingSniperWizard — Modal plein ecran pour l'onboarding Alex
 *
 * Se lance quand organizations/{orgId}/alexMemory/businessProfile n'existe pas.
 * Appelle les callables backend: startOnboardingSniper, answerOnboardingQuestion
 */
import { useState, useEffect } from 'react'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { useOrg } from '@/contexts/OrgContext'
import toast from 'react-hot-toast'
import {
  Target,
  Package,
  AlertTriangle,
  Users,
  MapPin,
  BarChart3,
  DollarSign,
  Building2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const CATEGORY_ICONS = {
  targeting: Target,
  offer: Package,
  market: AlertTriangle,
  volume: BarChart3,
  business: DollarSign,
}

export default function OnboardingSniperWizard({ onComplete }) {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const { call: startOnboarding } = useCloudFunction('startOnboardingSniper')
  const { call: answerQuestion } = useCloudFunction('answerOnboardingQuestion')
  const { call: refreshIntel } = useCloudFunction('refreshProductIntelligence')

  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [totalQuestions, setTotalQuestions] = useState(8)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [complete, setComplete] = useState(false)
  const [profile, setProfile] = useState(null)

  // Start onboarding session on mount
  useEffect(() => {
    if (!orgId) return
    let cancelled = false

    async function init() {
      try {
        const result = await startOnboarding({ orgId })
        if (cancelled) return
        if (result?.question) {
          setCurrentQuestion(result.question)
          setTotalQuestions(result.totalQuestions || 8)
          setCurrentIndex(result.currentIndex || 0)
        }
      } catch (err) {
        toast.error('Erreur demarrage onboarding: ' + err.message)
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [orgId])

  const handleSubmit = async () => {
    if (!answer.trim() || !currentQuestion) return

    setLoading(true)
    try {
      const result = await answerQuestion({
        orgId,
        questionId: currentQuestion.id,
        answer: answer.trim(),
      })

      if (result?.complete) {
        setComplete(true)
        setProfile(result.profile)
        // Trigger product intelligence refresh in background
        refreshIntel({ orgId }).catch(() => {})
        toast.success('Onboarding termine !')
      } else if (result?.question) {
        setCurrentQuestion(result.question)
        setCurrentIndex(result.currentIndex || currentIndex + 1)
        setAnswer('')
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const progress = totalQuestions > 0 ? Math.round(((currentIndex + (complete ? 1 : 0)) / totalQuestions) * 100) : 0
  const Icon = CATEGORY_ICONS[currentQuestion?.category] || Target

  if (initializing) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Preparation de l'onboarding...</p>
        </div>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alex est pret !</h2>
          <p className="text-gray-500 mb-6">
            Alex connait maintenant ton business par coeur. Il va commencer a trouver des prospects qualifies.
          </p>
          {profile && (
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
              {profile.idealClient && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700"><strong>Client ideal :</strong> {profile.idealClient}</p>
                </div>
              )}
              {profile.niche && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700"><strong>Niche :</strong> {profile.niche}</p>
                </div>
              )}
              {profile.geoZone && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700"><strong>Zone :</strong> {profile.geoZone}</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onComplete}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Commencer a prospecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Configuration Alex — {currentIndex + 1}/{totalQuestions}
          </p>
          <p className="text-xs text-indigo-600 font-semibold">{progress}%</p>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">
              {currentQuestion?.category || 'question'}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {currentQuestion?.question || 'Chargement...'}
          </h2>

          <div className="space-y-4">
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ta reponse..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              autoFocus
            />

            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {currentIndex < totalQuestions - 1 ? 'Suivant' : 'Terminer'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!currentQuestion?.required && (
              <button
                onClick={() => { setAnswer('(passe)'); setTimeout(handleSubmit, 50) }}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
              >
                Passer cette question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
